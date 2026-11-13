import asyncio
import json
from datetime import datetime
from zoneinfo import ZoneInfo

from courtvision.config import get_settings
from courtvision.providers.balldontlie import BallDontLieProvider


async def check() -> None:
    settings = get_settings()
    if not settings.balldontlie_api_key:
        raise RuntimeError("COURTVISION_BALLDONTLIE_API_KEY is not configured")
    provider = BallDontLieProvider(
        api_key=settings.balldontlie_api_key,
        base_url=settings.balldontlie_base_url,
        timeout_seconds=settings.provider_timeout_seconds,
        requests_per_minute=min(settings.request_rate_limit_per_minute, 5),
    )
    try:
        games = await provider.games(page=1, page_size=25)
        print(
            json.dumps(
                {
                    "provider": provider.slug,
                    "authenticated": True,
                    "date": datetime.now(ZoneInfo("America/New_York")).date().isoformat(),
                    "games_returned": len(games.data),
                    "demo_data": games.provenance.is_demo,
                },
                indent=2,
            )
        )
    finally:
        await provider.close()


if __name__ == "__main__":
    asyncio.run(check())
