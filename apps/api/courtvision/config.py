from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="COURTVISION_", env_file=".env", extra="ignore", case_sensitive=False
    )

    env: Literal["development", "test", "production"] = "development"
    database_url: str = "postgresql+asyncpg://courtvision:courtvision@localhost:5432/courtvision"
    redis_url: str = "redis://localhost:6379/0"
    redis_channel_prefix: str = "courtvision"
    live_poll_interval_seconds: float = Field(default=5.0, ge=0.1, le=60)
    websocket_heartbeat_seconds: float = Field(default=20.0, ge=1, le=120)
    cors_origins: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    data_provider: Literal["demo", "balldontlie", "sportradar"] = "demo"
    balldontlie_api_key: str | None = None
    balldontlie_base_url: str = "https://api.balldontlie.io"
    provider_timeout_seconds: float = 20.0
    log_level: str = "INFO"
    openai_api_key: str | None = None
    request_rate_limit_per_minute: int = 120


@lru_cache
def get_settings() -> Settings:
    return Settings()
