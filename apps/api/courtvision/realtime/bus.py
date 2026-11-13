import asyncio
from collections.abc import AsyncIterator
from datetime import UTC, datetime
from typing import Literal, Protocol, cast

from pydantic import BaseModel, ValidationError
from redis.asyncio import Redis
from redis.exceptions import RedisError

from courtvision.schemas import GameEvent


class EventBusUnavailable(RuntimeError):
    """Raised when Redis cannot publish or consume live events."""


class EventBusMessageError(RuntimeError):
    """Raised when a live event does not match the versioned contract."""


class PublishedGameEvent(BaseModel):
    schema_version: Literal[1] = 1
    game_id: str
    event: GameEvent
    published_at: datetime


class PubSubClient(Protocol):
    async def subscribe(self, *channels: str) -> object: ...

    async def unsubscribe(self, *channels: str) -> object: ...

    async def get_message(
        self, *, ignore_subscribe_messages: bool, timeout: float
    ) -> dict[str, object] | None: ...

    async def aclose(self) -> None: ...


class RedisClient(Protocol):
    async def publish(self, channel: str, message: str) -> int: ...

    def pubsub(self) -> PubSubClient: ...

    async def aclose(self) -> None: ...


class RedisGameEventBus:
    """Versioned Redis Pub/Sub transport for normalized game events.

    PostgreSQL remains authoritative. Pub/Sub only signals connected API
    instances; consumers must use sequence numbers to detect gaps and obtain a
    fresh provider/database snapshot when one occurs.
    """

    def __init__(self, redis: RedisClient, *, channel_prefix: str = "courtvision") -> None:
        self._redis = redis
        self._channel_prefix = channel_prefix.rstrip(":")

    @classmethod
    def from_url(
        cls, redis_url: str, *, channel_prefix: str = "courtvision"
    ) -> "RedisGameEventBus":
        client = Redis.from_url(
            redis_url,
            decode_responses=False,
            socket_connect_timeout=1,
            socket_timeout=2,
            health_check_interval=30,
        )
        return cls(cast(RedisClient, client), channel_prefix=channel_prefix)

    def channel(self, game_id: str) -> str:
        if not game_id or any(character.isspace() for character in game_id):
            raise ValueError("game_id must be non-empty and contain no whitespace")
        return f"{self._channel_prefix}:games:{game_id}:events"

    async def publish(self, game_id: str, event: GameEvent) -> int:
        message = PublishedGameEvent(
            game_id=game_id,
            event=event,
            published_at=datetime.now(UTC),
        )
        try:
            return await self._redis.publish(self.channel(game_id), message.model_dump_json())
        except (RedisError, OSError) as error:
            raise EventBusUnavailable("Redis event publish failed") from error

    async def subscribe(self, game_id: str) -> AsyncIterator[PublishedGameEvent]:
        channel = self.channel(game_id)
        pubsub = self._redis.pubsub()
        try:
            await pubsub.subscribe(channel)
            while True:
                message = await pubsub.get_message(
                    ignore_subscribe_messages=True,
                    timeout=1.0,
                )
                if message is None:
                    await asyncio.sleep(0)
                    continue
                payload = message.get("data")
                if not isinstance(payload, (bytes, str)):
                    raise EventBusMessageError("Redis event payload is not text")
                try:
                    published = PublishedGameEvent.model_validate_json(payload)
                except ValidationError as error:
                    raise EventBusMessageError("Redis event payload failed validation") from error
                if published.game_id != game_id:
                    raise EventBusMessageError("Redis event payload game does not match channel")
                yield published
        except (RedisError, OSError) as error:
            raise EventBusUnavailable("Redis event subscription failed") from error
        finally:
            try:
                await pubsub.unsubscribe(channel)
            finally:
                await pubsub.aclose()

    async def close(self) -> None:
        await self._redis.aclose()
