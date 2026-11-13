import enum
import uuid
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    JSON,
    Boolean,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class GameStatus(str, enum.Enum):
    scheduled = "scheduled"
    live = "live"
    final = "final"
    postponed = "postponed"


class IngestionStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class Identified:
    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow
    )


class DataSource(Identified, Base):
    __tablename__ = "data_sources"
    slug: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    name: Mapped[str] = mapped_column(String(100))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    terms_url: Mapped[str | None] = mapped_column(String(500))
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)


class Team(Identified, Base):
    __tablename__ = "teams"
    external_ids: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    abbreviation: Mapped[str] = mapped_column(String(4), unique=True, index=True)
    city: Mapped[str] = mapped_column(String(80))
    name: Mapped[str] = mapped_column(String(80))
    conference: Mapped[str | None] = mapped_column(String(20))


class Player(Identified, Base):
    __tablename__ = "players"
    external_ids: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80), index=True)
    position: Mapped[str | None] = mapped_column(String(20))
    height_inches: Mapped[int | None] = mapped_column(Integer)
    weight_lbs: Mapped[int | None] = mapped_column(Integer)
    birth_date: Mapped[date | None] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)


class Season(Identified, Base):
    __tablename__ = "seasons"
    year_start: Mapped[int] = mapped_column(Integer, unique=True, index=True)
    label: Mapped[str] = mapped_column(String(10), unique=True)
    starts_on: Mapped[date | None] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)


class PlayerTeamMembership(Identified, Base):
    __tablename__ = "player_team_memberships"
    __table_args__ = (UniqueConstraint("player_id", "team_id", "season_id"),)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id", ondelete="CASCADE"))
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id", ondelete="CASCADE"))
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id", ondelete="CASCADE"))
    jersey_number: Mapped[str | None] = mapped_column(String(4))


class Game(Identified, Base):
    __tablename__ = "games"
    __table_args__ = (Index("ix_games_season_tipoff", "season_id", "tipoff_at"),)
    external_ids: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"))
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id"))
    tipoff_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    status: Mapped[GameStatus] = mapped_column(Enum(GameStatus), index=True)
    venue: Mapped[str | None] = mapped_column(String(160))
    is_demo: Mapped[bool] = mapped_column(Boolean, default=False)
    participants: Mapped[list["GameParticipant"]] = relationship(back_populates="game")


class GameParticipant(Identified, Base):
    __tablename__ = "game_participants"
    __table_args__ = (
        UniqueConstraint("game_id", "team_id"),
        UniqueConstraint("game_id", "is_home"),
    )
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    is_home: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[int | None] = mapped_column(Integer)
    game: Mapped[Game] = relationship(back_populates="participants")


class PlayerBoxScore(Identified, Base):
    __tablename__ = "player_box_scores"
    __table_args__ = (UniqueConstraint("game_id", "player_id", "team_id"),)
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    seconds_played: Mapped[int] = mapped_column(Integer, default=0)
    points: Mapped[int] = mapped_column(Integer, default=0)
    rebounds: Mapped[int] = mapped_column(Integer, default=0)
    assists: Mapped[int] = mapped_column(Integer, default=0)
    steals: Mapped[int] = mapped_column(Integer, default=0)
    blocks: Mapped[int] = mapped_column(Integer, default=0)
    turnovers: Mapped[int] = mapped_column(Integer, default=0)
    field_goals_made: Mapped[int] = mapped_column(Integer, default=0)
    field_goals_attempted: Mapped[int] = mapped_column(Integer, default=0)
    threes_made: Mapped[int] = mapped_column(Integer, default=0)
    threes_attempted: Mapped[int] = mapped_column(Integer, default=0)
    free_throws_made: Mapped[int] = mapped_column(Integer, default=0)
    free_throws_attempted: Mapped[int] = mapped_column(Integer, default=0)


class PlayByPlayEvent(Identified, Base):
    __tablename__ = "play_by_play_events"
    __table_args__ = (
        UniqueConstraint("source_id", "external_event_id"),
        Index("ix_events_game_sequence", "game_id", "sequence"),
    )
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"))
    external_event_id: Mapped[str] = mapped_column(String(120))
    sequence: Mapped[int] = mapped_column(Integer)
    period: Mapped[int] = mapped_column(Integer)
    clock_seconds: Mapped[int] = mapped_column(Integer)
    event_type: Mapped[str] = mapped_column(String(60), index=True)
    description: Mapped[str] = mapped_column(Text)
    home_score: Mapped[int] = mapped_column(Integer)
    away_score: Mapped[int] = mapped_column(Integer)
    team_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("teams.id"))
    player_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("players.id"))
    occurred_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    checksum: Mapped[str | None] = mapped_column(String(64), index=True)
    ingestion_job_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("ingestion_jobs.id", ondelete="SET NULL")
    )
    payload: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)


class ShotAttempt(Identified, Base):
    __tablename__ = "shot_attempts"
    __table_args__ = (Index("ix_shots_player_season", "player_id", "season_id"),)
    event_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("play_by_play_events.id"))
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"), index=True)
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id"))
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id"))
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    x_feet: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    y_feet: Mapped[Decimal | None] = mapped_column(Numeric(6, 2))
    distance_feet: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    made: Mapped[bool] = mapped_column(Boolean)
    points: Mapped[int] = mapped_column(Integer)
    zone: Mapped[str | None] = mapped_column(String(80), index=True)


class PlayerSeasonStat(Identified, Base):
    __tablename__ = "player_season_stats"
    __table_args__ = (UniqueConstraint("player_id", "team_id", "season_id"),)
    player_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("players.id"), index=True)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"))
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id"), index=True)
    games_played: Mapped[int] = mapped_column(Integer)
    minutes: Mapped[Decimal] = mapped_column(Numeric(8, 1))
    totals: Mapped[dict[str, object]] = mapped_column(JSON)
    derived: Mapped[dict[str, object]] = mapped_column(JSON)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"))


class TeamSeasonStat(Identified, Base):
    __tablename__ = "team_season_stats"
    __table_args__ = (UniqueConstraint("team_id", "season_id"),)
    team_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("teams.id"), index=True)
    season_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("seasons.id"))
    games_played: Mapped[int] = mapped_column(Integer)
    totals: Mapped[dict[str, object]] = mapped_column(JSON)
    derived: Mapped[dict[str, object]] = mapped_column(JSON)
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"))


class IngestionJob(Identified, Base):
    __tablename__ = "ingestion_jobs"
    source_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("data_sources.id"), index=True)
    kind: Mapped[str] = mapped_column(String(80))
    provider_version: Mapped[str | None] = mapped_column(String(40))
    target_external_id: Mapped[str | None] = mapped_column(String(160), index=True)
    cursor: Mapped[str | None] = mapped_column(String(500))
    batch_checksum: Mapped[str | None] = mapped_column(String(64), index=True)
    status: Mapped[IngestionStatus] = mapped_column(Enum(IngestionStatus), index=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    rows_processed: Mapped[int] = mapped_column(Integer, default=0)
    rows_received: Mapped[int] = mapped_column(Integer, default=0)
    rows_inserted: Mapped[int] = mapped_column(Integer, default=0)
    rows_updated: Mapped[int] = mapped_column(Integer, default=0)
    rows_unchanged: Mapped[int] = mapped_column(Integer, default=0)
    metadata_json: Mapped[dict[str, object]] = mapped_column(JSON, default=dict)
    error: Mapped[str | None] = mapped_column(Text)


class MLModelVersion(Identified, Base):
    __tablename__ = "ml_model_versions"
    name: Mapped[str] = mapped_column(String(100), index=True)
    version: Mapped[str] = mapped_column(String(80))
    trained_through: Mapped[date] = mapped_column(Date)
    feature_schema: Mapped[dict[str, object]] = mapped_column(JSON)
    metrics: Mapped[dict[str, object]] = mapped_column(JSON)
    artifact_uri: Mapped[str] = mapped_column(String(500))
    is_active: Mapped[bool] = mapped_column(Boolean, default=False)
    __table_args__ = (UniqueConstraint("name", "version"),)


class WinProbabilityPrediction(Identified, Base):
    __tablename__ = "win_probability_predictions"
    __table_args__ = (
        UniqueConstraint("game_id", "event_id", "model_version_id"),
        Index("ix_predictions_game_created", "game_id", "created_at"),
    )
    game_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("games.id", ondelete="CASCADE"))
    event_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("play_by_play_events.id"))
    model_version_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ml_model_versions.id"))
    home_win_probability: Mapped[Decimal] = mapped_column(Numeric(6, 5))
    features: Mapped[dict[str, object]] = mapped_column(JSON)
    explanation: Mapped[dict[str, object]] = mapped_column(JSON)
