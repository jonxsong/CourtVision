from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field


class Provenance(BaseModel):
    provider: str
    is_demo: bool
    fetched_at: datetime
    note: str


class TeamSummary(BaseModel):
    id: str
    abbreviation: str
    city: str
    name: str


class Metric(BaseModel):
    key: str
    label: str
    value: float
    display: str
    percentile: int = Field(ge=0, le=100)
    definition: str


class PlayerSummary(BaseModel):
    id: str
    slug: str
    name: str
    initials: str
    position: str
    number: str
    team: TeamSummary
    active: bool = True


class PlayerProfile(PlayerSummary):
    season: str
    bio: dict[str, str]
    games_played: int
    minutes_per_game: float
    metrics: list[Metric]
    trend: list[dict[str, str | float]]
    zones: list[dict[str, str | int | float]]
    similar_players: list[dict[str, str | float]]
    provenance: Provenance


class GameTeam(BaseModel):
    team: TeamSummary
    score: int
    record: str


class GameSummary(BaseModel):
    id: str
    tipoff_at: datetime
    status: Literal["scheduled", "live", "final", "postponed"]
    home: GameTeam
    away: GameTeam
    venue: str
    headline: str
    is_demo: bool


class GameEvent(BaseModel):
    id: str
    sequence: int
    period: int
    clock: str
    event_type: str
    description: str
    home_score: int
    away_score: int
    home_win_probability: float = Field(ge=0, le=1)
    is_key_event: bool = False


class GameDetail(GameSummary):
    events: list[GameEvent]
    leaders: list[dict[str, str | int | float]]
    provenance: Provenance


class Shot(BaseModel):
    id: str
    player_id: str
    player_name: str
    game_id: str
    x: float
    y: float
    distance: float
    made: bool
    points: Literal[2, 3]
    zone: str


class ShotDataset(BaseModel):
    season: str
    shots: list[Shot]
    provenance: Provenance
    available: bool = True
    unavailable_reason: str | None = None


class PageMeta(BaseModel):
    page: int
    page_size: int
    total: int


class PlayerPage(BaseModel):
    data: list[PlayerSummary]
    meta: PageMeta
    provenance: Provenance


class GamePage(BaseModel):
    data: list[GameSummary]
    meta: PageMeta
    provenance: Provenance


class HealthResponse(BaseModel):
    status: Literal["ok", "degraded"]
    version: str
    provider: str
    time: datetime


class AnalystQuestion(BaseModel):
    question: str = Field(min_length=3, max_length=500)
    player_ids: list[str] = Field(default_factory=list, max_length=4)
    game_id: str | None = None
    season: str = "2025-26"


class Citation(BaseModel):
    label: str
    value: str
    sample_size: str


class AnalystAnswer(BaseModel):
    answer: str
    facts: list[Citation]
    interpretation: str
    season: str
    is_demo: bool
    limitations: list[str]


class FeatureVector(BaseModel):
    score_differential: int
    seconds_remaining: int = Field(ge=0, le=3600)
    possession_home: bool
    home_strength: float
    away_strength: float


class WinProbability(BaseModel):
    home_win_probability: float = Field(ge=0, le=1)
    model: str
    explanation: list[str]
    is_validated: bool
    evaluated_through: date | None = None
