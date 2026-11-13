"""Add ingestion provenance and idempotency metadata."""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20261112_0002"
down_revision: str | None = "20261112_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("ingestion_jobs", sa.Column("provider_version", sa.String(40)))
    op.add_column("ingestion_jobs", sa.Column("target_external_id", sa.String(160)))
    op.add_column("ingestion_jobs", sa.Column("batch_checksum", sa.String(64)))
    op.add_column(
        "ingestion_jobs", sa.Column("rows_received", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "ingestion_jobs", sa.Column("rows_inserted", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "ingestion_jobs", sa.Column("rows_updated", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "ingestion_jobs", sa.Column("rows_unchanged", sa.Integer(), nullable=False, server_default="0")
    )
    op.add_column(
        "ingestion_jobs",
        sa.Column("metadata_json", sa.JSON(), nullable=False, server_default=sa.text("'{}'::json")),
    )
    op.create_index("ix_ingestion_jobs_target_external_id", "ingestion_jobs", ["target_external_id"])
    op.create_index("ix_ingestion_jobs_batch_checksum", "ingestion_jobs", ["batch_checksum"])

    op.add_column("play_by_play_events", sa.Column("checksum", sa.String(64)))
    op.add_column("play_by_play_events", sa.Column("ingestion_job_id", sa.UUID()))
    op.create_index("ix_play_by_play_events_checksum", "play_by_play_events", ["checksum"])
    op.create_foreign_key(
        "fk_play_by_play_events_ingestion_job",
        "play_by_play_events",
        "ingestion_jobs",
        ["ingestion_job_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_play_by_play_events_ingestion_job", "play_by_play_events", type_="foreignkey"
    )
    op.drop_index("ix_play_by_play_events_checksum", table_name="play_by_play_events")
    op.drop_column("play_by_play_events", "ingestion_job_id")
    op.drop_column("play_by_play_events", "checksum")

    op.drop_index("ix_ingestion_jobs_batch_checksum", table_name="ingestion_jobs")
    op.drop_index("ix_ingestion_jobs_target_external_id", table_name="ingestion_jobs")
    op.drop_column("ingestion_jobs", "metadata_json")
    op.drop_column("ingestion_jobs", "rows_unchanged")
    op.drop_column("ingestion_jobs", "rows_updated")
    op.drop_column("ingestion_jobs", "rows_inserted")
    op.drop_column("ingestion_jobs", "rows_received")
    op.drop_column("ingestion_jobs", "batch_checksum")
    op.drop_column("ingestion_jobs", "target_external_id")
    op.drop_column("ingestion_jobs", "provider_version")
