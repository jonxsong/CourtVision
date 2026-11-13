from datetime import UTC, datetime
from uuid import UUID

import pytest
from pydantic import ValidationError

from courtvision.ingestion.contracts import IngestionBatch, NormalizedEvent, canonical_checksum
from courtvision.ingestion.service import IngestionService, UpsertResult


def event(identifier: str, sequence: int, description: str) -> NormalizedEvent:
    payload = {"id": identifier, "order": sequence, "text": description}
    return NormalizedEvent(
        external_event_id=identifier,
        sequence=sequence,
        period=1,
        clock_seconds=720 - sequence,
        event_type="shot",
        description=description,
        home_score=sequence * 2,
        away_score=0,
        checksum=canonical_checksum(payload),
        payload=payload,
    )


class FixtureProvider:
    def __init__(self, events: list[NormalizedEvent]) -> None:
        self.events = events

    async def plays(self, game_external_id: str) -> IngestionBatch:
        return IngestionBatch(
            provider_slug="fixture",
            provider_version="v1",
            game_external_id=game_external_id,
            fetched_at=datetime.now(UTC),
            events=self.events,
        )


class MemoryRepository:
    def __init__(self) -> None:
        self.checksums: dict[str, str] = {}
        self.jobs = 0

    async def begin_batch(self, batch: IngestionBatch) -> str:
        self.jobs += 1
        return str(self.jobs)

    async def upsert_events(self, job_id, game_id, batch, events) -> UpsertResult:
        inserted = updated = unchanged = 0
        for item in events:
            previous = self.checksums.get(item.external_event_id)
            if previous is None:
                inserted += 1
            elif previous == item.checksum:
                unchanged += 1
            else:
                updated += 1
            self.checksums[item.external_event_id] = item.checksum
        return UpsertResult(inserted, updated, unchanged)

    async def complete_job(self, job_id: str, result: UpsertResult) -> None:
        return None

    async def fail_job(self, job_id: str, error: str) -> None:
        return None


@pytest.mark.asyncio
async def test_reordered_duplicate_batches_are_idempotent() -> None:
    repository = MemoryRepository()
    service = IngestionService(repository)
    game_id = UUID("4b33594d-d731-4402-a7ea-2b0eb68c15e2")

    first = await service.ingest_game(
        FixtureProvider([event("two", 2, "Second"), event("one", 1, "First")]),
        game_id=game_id,
        game_external_id="game-1",
    )
    second = await service.ingest_game(
        FixtureProvider([event("one", 1, "First"), event("two", 2, "Second")]),
        game_id=game_id,
        game_external_id="game-1",
    )

    assert (first.inserted, first.updated, first.unchanged) == (2, 0, 0)
    assert (second.inserted, second.updated, second.unchanged) == (0, 0, 2)
    assert first.batch_checksum == second.batch_checksum


def test_duplicate_ids_inside_one_batch_are_rejected() -> None:
    duplicate = event("same", 1, "Same")
    with pytest.raises(ValidationError, match="duplicate external event IDs"):
        IngestionBatch(
            provider_slug="fixture",
            provider_version="v1",
            game_external_id="game-1",
            fetched_at=datetime.now(UTC),
            events=[duplicate, duplicate],
        )
