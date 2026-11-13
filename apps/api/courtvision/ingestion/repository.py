import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.ext.asyncio import AsyncSession

from courtvision.ingestion.contracts import IngestionBatch, NormalizedEvent
from courtvision.ingestion.service import UpsertResult
from courtvision.models import (
    DataSource,
    Game,
    IngestionJob,
    IngestionStatus,
    PlayByPlayEvent,
)


class SQLAlchemyIngestionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def begin_batch(self, batch: IngestionBatch) -> str:
        source = await self.session.scalar(
            select(DataSource).where(DataSource.slug == batch.provider_slug)
        )
        if source is None:
            source = DataSource(
                slug=batch.provider_slug,
                name=batch.provider_slug.replace("-", " ").title(),
                is_demo=False,
                metadata_json={"provider_version": batch.provider_version},
            )
            self.session.add(source)
            await self.session.flush()

        job = IngestionJob(
            source_id=source.id,
            kind="play_by_play",
            provider_version=batch.provider_version,
            target_external_id=batch.game_external_id,
            cursor=batch.cursor,
            batch_checksum=batch.checksum,
            status=IngestionStatus.running,
            started_at=datetime.now(UTC),
            rows_received=len(batch.events),
            metadata_json={"fetched_at": batch.fetched_at.isoformat()},
        )
        self.session.add(job)
        await self.session.commit()
        return str(job.id)

    async def upsert_events(
        self,
        job_id: str,
        game_id: uuid.UUID,
        batch: IngestionBatch,
        events: list[NormalizedEvent],
    ) -> UpsertResult:
        job = await self.session.get(IngestionJob, uuid.UUID(job_id))
        if job is None:
            raise ValueError("ingestion job does not exist")
        if await self.session.get(Game, game_id) is None:
            raise ValueError("target game does not exist")

        external_ids = [event.external_event_id for event in events]
        existing_rows = await self.session.execute(
            select(PlayByPlayEvent.external_event_id, PlayByPlayEvent.checksum).where(
                PlayByPlayEvent.source_id == job.source_id,
                PlayByPlayEvent.external_event_id.in_(external_ids),
            )
        )
        existing = dict(existing_rows.all())
        inserted = updated = unchanged = 0

        for event in events:
            if existing.get(event.external_event_id) == event.checksum:
                unchanged += 1
                continue
            is_update = event.external_event_id in existing
            values = {
                "id": uuid.uuid4(),
                "game_id": game_id,
                "source_id": job.source_id,
                "external_event_id": event.external_event_id,
                "sequence": event.sequence,
                "period": event.period,
                "clock_seconds": event.clock_seconds,
                "event_type": event.event_type,
                "description": event.description,
                "home_score": event.home_score,
                "away_score": event.away_score,
                "occurred_at": event.occurred_at,
                "checksum": event.checksum,
                "ingestion_job_id": job.id,
                "payload": event.payload,
            }
            statement = postgres_insert(PlayByPlayEvent).values(**values)
            update_values = {key: value for key, value in values.items() if key != "id"}
            update_values["updated_at"] = datetime.now(UTC)
            statement = statement.on_conflict_do_update(
                index_elements=[
                    PlayByPlayEvent.source_id,
                    PlayByPlayEvent.external_event_id,
                ],
                set_=update_values,
            )
            await self.session.execute(statement)
            if is_update:
                updated += 1
            else:
                inserted += 1

        await self.session.commit()
        return UpsertResult(inserted=inserted, updated=updated, unchanged=unchanged)

    async def complete_job(self, job_id: str, result: UpsertResult) -> None:
        job = await self.session.get(IngestionJob, uuid.UUID(job_id))
        if job is None:
            raise ValueError("ingestion job does not exist")
        job.status = IngestionStatus.succeeded
        job.finished_at = datetime.now(UTC)
        job.rows_inserted = result.inserted
        job.rows_updated = result.updated
        job.rows_unchanged = result.unchanged
        job.rows_processed = result.inserted + result.updated + result.unchanged
        await self.session.commit()

    async def fail_job(self, job_id: str, error: str) -> None:
        await self.session.rollback()
        job = await self.session.get(IngestionJob, uuid.UUID(job_id))
        if job is None:
            return
        job.status = IngestionStatus.failed
        job.finished_at = datetime.now(UTC)
        job.error = error[:4000]
        await self.session.commit()
