import hashlib
import json
from datetime import datetime

from pydantic import BaseModel, Field, model_validator


def canonical_checksum(value: object) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":"), default=str).encode()
    return hashlib.sha256(encoded).hexdigest()


class NormalizedEvent(BaseModel):
    external_event_id: str = Field(min_length=1, max_length=120)
    sequence: int = Field(ge=0)
    period: int = Field(ge=0)
    clock_seconds: int = Field(ge=0)
    event_type: str = Field(min_length=1, max_length=60)
    description: str
    home_score: int = Field(ge=0)
    away_score: int = Field(ge=0)
    external_team_id: str | None = None
    external_player_ids: list[str] = Field(default_factory=list)
    occurred_at: datetime | None = None
    checksum: str = Field(min_length=64, max_length=64)
    payload: dict[str, object] = Field(default_factory=dict)


class IngestionBatch(BaseModel):
    provider_slug: str
    provider_version: str
    game_external_id: str
    fetched_at: datetime
    events: list[NormalizedEvent]
    cursor: str | None = None

    @model_validator(mode="after")
    def unique_event_ids(self) -> "IngestionBatch":
        identifiers = [event.external_event_id for event in self.events]
        if len(identifiers) != len(set(identifiers)):
            raise ValueError("provider batch contains duplicate external event IDs")
        return self

    @property
    def checksum(self) -> str:
        return canonical_checksum(
            {
                "provider": self.provider_slug,
                "version": self.provider_version,
                "game": self.game_external_id,
                "events": [event.model_dump(mode="json") for event in self.ordered_events],
            }
        )

    @property
    def ordered_events(self) -> list[NormalizedEvent]:
        return sorted(self.events, key=lambda event: (event.sequence, event.external_event_id))
