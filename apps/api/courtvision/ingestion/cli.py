import argparse
import asyncio
import json
from uuid import UUID

from courtvision.config import get_settings
from courtvision.database import SessionLocal
from courtvision.ingestion.repository import SQLAlchemyIngestionRepository
from courtvision.ingestion.service import IngestionService
from courtvision.providers.balldontlie import BallDontLieProvider


async def run(game_id: UUID, external_game_id: str) -> None:
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
        async with SessionLocal() as session:
            service = IngestionService(SQLAlchemyIngestionRepository(session))
            result = await service.ingest_game(
                provider, game_id=game_id, game_external_id=external_game_id
            )
            print(json.dumps(result.__dict__, indent=2))
    finally:
        await provider.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest one provider play-by-play snapshot")
    parser.add_argument("--game-id", type=UUID, required=True, help="CourtVision game UUID")
    parser.add_argument("--external-game-id", required=True, help="Provider game identifier")
    arguments = parser.parse_args()
    asyncio.run(run(arguments.game_id, arguments.external_game_id))


if __name__ == "__main__":
    main()
