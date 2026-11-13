from collections.abc import AsyncIterator, Awaitable, Callable
from contextlib import asynccontextmanager
from datetime import UTC, datetime
from time import perf_counter

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.responses import Response

from courtvision import __version__
from courtvision.api.realtime import router as realtime_router
from courtvision.api.routes import router
from courtvision.config import get_settings
from courtvision.logging import configure_logging
from courtvision.providers import create_provider
from courtvision.realtime import RedisGameEventBus
from courtvision.schemas import HealthResponse

settings = get_settings()
configure_logging(settings.log_level)
logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    app.state.provider = create_provider(settings)
    event_bus = RedisGameEventBus.from_url(
        settings.redis_url, channel_prefix=settings.redis_channel_prefix
    )
    app.state.event_bus = event_bus
    app.state.live_poll_interval_seconds = settings.live_poll_interval_seconds
    app.state.websocket_heartbeat_seconds = settings.websocket_heartbeat_seconds
    logger.info("application_started", version=__version__, provider=settings.data_provider)
    try:
        yield
    finally:
        close = getattr(app.state.provider, "close", None)
        if close:
            await close()
        await event_bus.close()
        logger.info("application_stopped")


app = FastAPI(
    title="CourtVision API",
    version=__version__,
    description="Typed basketball analytics API backed exclusively by real NBA data.",
    lifespan=lifespan,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "Authorization"],
)
app.state.allowed_origins = settings.cors_origins


@app.middleware("http")
async def request_logging(
    request: Request, call_next: Callable[[Request], Awaitable[Response]]
) -> Response:
    started = perf_counter()
    response = await call_next(request)
    logger.info(
        "http_request",
        method=request.method,
        path=request.url.path,
        status_code=response.status_code,
        duration_ms=round((perf_counter() - started) * 1000, 2),
    )
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response


@app.get("/health", response_model=HealthResponse, tags=["system"])
async def health() -> HealthResponse:
    return HealthResponse(
        status="ok", version=__version__, provider=settings.data_provider, time=datetime.now(UTC)
    )


app.include_router(router)
app.include_router(realtime_router)
