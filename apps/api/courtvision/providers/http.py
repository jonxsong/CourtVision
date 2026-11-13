import asyncio
from collections.abc import Awaitable, Callable
from time import monotonic

import httpx


class ProviderError(RuntimeError):
    pass


class ProviderAuthenticationError(ProviderError):
    pass


class RequestIntervalLimiter:
    def __init__(
        self,
        requests_per_minute: int,
        *,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        if requests_per_minute < 1:
            raise ValueError("requests_per_minute must be positive")
        self.interval = 60 / requests_per_minute
        self.sleep = sleep
        self._next_request = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self) -> None:
        async with self._lock:
            now = monotonic()
            if now < self._next_request:
                await self.sleep(self._next_request - now)
            self._next_request = monotonic() + self.interval


class ResilientJSONClient:
    def __init__(
        self,
        *,
        api_key: str,
        base_url: str,
        requests_per_minute: int,
        timeout_seconds: float,
        client: httpx.AsyncClient | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
        max_attempts: int = 3,
    ) -> None:
        if not api_key.strip():
            raise ValueError("provider API key is required")
        self._api_key = api_key
        self._sleep = sleep
        self._max_attempts = max_attempts
        self._limiter = RequestIntervalLimiter(requests_per_minute, sleep=sleep)
        self._owns_client = client is None
        self._client = client or httpx.AsyncClient(
            base_url=base_url,
            headers={"Accept": "application/json"},
            timeout=timeout_seconds,
        )

    async def get(self, path: str, params: dict[str, object] | None = None) -> dict[str, object]:
        for attempt in range(self._max_attempts):
            await self._limiter.acquire()
            query = (
                {key: str(value) for key, value in params.items() if value is not None}
                if params
                else None
            )
            response = await self._client.get(
                path, params=query, headers={"Authorization": self._api_key}
            )
            if response.status_code in {401, 403}:
                raise ProviderAuthenticationError("provider rejected the configured API key")
            if response.status_code == 429 or response.status_code >= 500:
                if attempt == self._max_attempts - 1:
                    raise ProviderError(
                        f"provider request failed after {self._max_attempts} attempts "
                        f"with status {response.status_code}"
                    )
                retry_after = response.headers.get("Retry-After")
                delay = float(retry_after) if retry_after else 0.5 * (2**attempt)
                await self._sleep(max(0, delay))
                continue
            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as error:
                raise ProviderError(f"provider request failed with status {response.status_code}") from error
            payload = response.json()
            if not isinstance(payload, dict):
                raise ProviderError("provider returned a non-object JSON payload")
            return payload
        raise ProviderError("provider request exhausted its retry budget")

    async def close(self) -> None:
        if self._owns_client:
            await self._client.aclose()
