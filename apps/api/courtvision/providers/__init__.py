from courtvision.config import Settings
from courtvision.providers.base import BasketballDataProvider
from courtvision.providers.demo import DemoProvider


def create_provider(settings: Settings) -> BasketballDataProvider:
    if settings.data_provider == "demo":
        return DemoProvider()
    raise RuntimeError(
        f"Provider '{settings.data_provider}' requires credentials and an enabled adapter. "
        "Use COURTVISION_DATA_PROVIDER=demo until configured."
    )


__all__ = ["BasketballDataProvider", "create_provider"]
