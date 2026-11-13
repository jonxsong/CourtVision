from courtvision.config import Settings
from courtvision.providers.balldontlie import BallDontLieProvider
from courtvision.providers.base import BasketballDataProvider
from courtvision.providers.nba_snapshot import NBASnapshotProvider


def create_provider(settings: Settings) -> BasketballDataProvider:
    if settings.data_provider == "nba_snapshot":
        return NBASnapshotProvider()
    if settings.data_provider == "balldontlie":
        if not settings.balldontlie_api_key:
            raise RuntimeError(
                "COURTVISION_BALLDONTLIE_API_KEY is required when the data provider is balldontlie"
            )
        return BallDontLieProvider(
            api_key=settings.balldontlie_api_key,
            base_url=settings.balldontlie_base_url,
            timeout_seconds=settings.provider_timeout_seconds,
            requests_per_minute=min(settings.request_rate_limit_per_minute, 5),
        )
    raise RuntimeError(
        f"Provider '{settings.data_provider}' requires credentials and an enabled adapter. "
        "Use COURTVISION_DATA_PROVIDER=nba_snapshot for the committed real-data snapshot."
    )


__all__ = ["BasketballDataProvider", "create_provider"]
