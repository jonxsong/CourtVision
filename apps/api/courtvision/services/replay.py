from dataclasses import dataclass

from courtvision.schemas import GameEvent


class ReplayInvariantError(ValueError):
    """Raised when a provider violates the normalized replay contract."""


@dataclass(frozen=True)
class ReplayBuffer:
    events: tuple[GameEvent, ...]

    @classmethod
    def from_events(cls, events: list[GameEvent]) -> "ReplayBuffer":
        by_id: dict[str, GameEvent] = {}
        sequences: dict[int, str] = {}
        for event in events:
            existing = by_id.get(event.id)
            if existing and existing != event:
                raise ReplayInvariantError(f"Conflicting duplicate event id: {event.id}")
            other_id = sequences.get(event.sequence)
            if other_id and other_id != event.id:
                raise ReplayInvariantError(f"Sequence {event.sequence} belongs to multiple events")
            by_id[event.id] = event
            sequences[event.sequence] = event.id
        ordered = tuple(sorted(by_id.values(), key=lambda event: event.sequence))
        return cls(events=ordered)

    @property
    def last_sequence(self) -> int:
        return self.events[-1].sequence if self.events else 0

    def after(self, sequence: int) -> tuple[GameEvent, ...]:
        return tuple(event for event in self.events if event.sequence > sequence)
