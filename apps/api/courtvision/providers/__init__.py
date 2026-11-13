from courtvision.config import Settings
from courtvision.providers.balldontlie import BallDontLieProvider
from courtvision.providers.base import BasketballDataProvider
from courtvision.providers.demo import DemoProvider


def create_provider(settings: Settings) -> BasketballDataProvider:
    if settings.data_provider == "demo":
        return DemoProvider()
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
        "Use COURTVISION_DATA_PROVIDER=demo until configured."
    )


__all__ = ["BasketballDataProvider", "create_provider"]
