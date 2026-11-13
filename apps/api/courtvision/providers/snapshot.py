import asyncio
import json
from datetime import UTC, datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from courtvision.config import get_settings
from courtvision.providers.balldontlie import BallDontLieProvider


async def snapshot() -> None:
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
        page = await provider.games(page=1, page_size=25)
        payload = {
            "provider": provider.slug,
            "fetchedAt": datetime.now(UTC).isoformat(),
            "gameDate": datetime.now(ZoneInfo("America/New_York")).date().isoformat(),
            "games": [
                {
                    "id": game.id,
                    "tipoffAt": game.tipoff_at.isoformat(),
                    "status": game.status,
                    "home": {
                        "team": game.home.team.model_dump(),
                        "score": game.home.score,
                        "record": game.home.record,
                    },
                    "away": {
                        "team": game.away.team.model_dump(),
                        "score": game.away.score,
                        "record": game.away.record,
                    },
                    "venue": game.venue,
                    "headline": game.headline,
                    "isDemo": False,
                }
                for game in page.data
            ],
        }
        output = Path(__file__).parents[4] / "apps" / "web" / "lib" / "live-games.json"
        output.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"output": str(output), "games": len(page.data)}))
    finally:
        await provider.close()


if __name__ == "__main__":
    asyncio.run(snapshot())
