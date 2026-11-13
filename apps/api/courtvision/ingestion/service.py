from dataclasses import dataclass
from typing import Protocol
from uuid import UUID

from courtvision.ingestion.contracts import IngestionBatch, NormalizedEvent


@dataclass(frozen=True)
class UpsertResult:
    inserted: int
    updated: int
    unchanged: int


@dataclass(frozen=True)
class IngestionResult:
    job_id: str
    batch_checksum: str
    received: int
    inserted: int
    updated: int
    unchanged: int


class EventIngestionProvider(Protocol):
    async def plays(self, game_external_id: str) -> IngestionBatch: ...


class IngestionRepository(Protocol):
    async def begin_batch(self, batch: IngestionBatch) -> str: ...

    async def upsert_events(
        self, job_id: str, game_id: UUID, batch: IngestionBatch, events: list[NormalizedEvent]
    ) -> UpsertResult: ...

    async def complete_job(self, job_id: str, result: UpsertResult) -> None: ...

    async def fail_job(self, job_id: str, error: str) -> None: ...


class IngestionService:
    def __init__(self, repository: IngestionRepository) -> None:
        self.repository = repository

    async def ingest_game(
        self, provider: EventIngestionProvider, *, game_id: UUID, game_external_id: str
    ) -> IngestionResult:
        batch = await provider.plays(game_external_id)
        if batch.game_external_id != game_external_id:
            raise ValueError("provider returned a batch for a different game")

        job_id = await self.repository.begin_batch(batch)
        try:
            upsert = await self.repository.upsert_events(
                job_id, game_id, batch, batch.ordered_events
            )
            await self.repository.complete_job(job_id, upsert)
        except Exception as error:
            await self.repository.fail_job(job_id, str(error))
            raise

        return IngestionResult(
            job_id=job_id,
            batch_checksum=batch.checksum,
            received=len(batch.events),
            inserted=upsert.inserted,
            updated=upsert.updated,
            unchanged=upsert.unchanged,
        )
