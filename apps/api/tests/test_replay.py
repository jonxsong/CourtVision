import asyncio
from datetime import UTC, datetime

import pytest

from courtvision.main import app
from courtvision.realtime import EventBusUnavailable, PublishedGameEvent
from courtvision.schemas import GameEvent
from courtvision.services.replay import ReplayBuffer, ReplayInvariantError


def event(event_id: str, sequence: int, description: str = "Event") -> GameEvent:
    return GameEvent(
        id=event_id,
        sequence=sequence,
        period=1,
        clock="10:00",
        event_type="test",
        description=description,
        home_score=0,
        away_score=0,
        home_win_probability=.5,
    )


def test_replay_sorts_and_deduplicates_identical_events():
    second = event("second", 2)
    replay = ReplayBuffer.from_events([second, event("first", 1), second])
    assert [item.id for item in replay.events] == ["first", "second"]
    assert replay.last_sequence == 2


def test_replay_rejects_conflicting_duplicate_ids():
    with pytest.raises(ReplayInvariantError, match="Conflicting duplicate"):
        ReplayBuffer.from_events([event("same", 1), event("same", 1, "Changed")])


def test_replay_rejects_sequence_collision():
    with pytest.raises(ReplayInvariantError, match="multiple events"):
        ReplayBuffer.from_events([event("one", 1), event("two", 1)])


def test_replay_cursor_returns_only_new_events():
    replay = ReplayBuffer.from_events([event("one", 1), event("two", 2), event("three", 3)])
    assert [item.id for item in replay.after(1)] == ["two", "three"]


def test_websocket_snapshot_replay_and_heartbeat(client):
    with client.websocket_connect("/api/v1/ws/games/game-orb-pin-001") as socket:
        snapshot = socket.receive_json()
        assert snapshot["type"] == "snapshot"
        assert snapshot["last_sequence"] == 11
        assert snapshot["is_demo"] is True

        socket.send_json({"type": "replay", "after_sequence": 9})
        assert socket.receive_json()["event"]["sequence"] == 10
        assert socket.receive_json()["event"]["sequence"] == 11
        assert socket.receive_json() == {"type": "replay_complete", "last_sequence": 11}

        socket.send_json({"type": "ping"})
        assert socket.receive_json() == {"type": "pong", "last_sequence": 11}


class OneEventBus:
    def __init__(self, published: PublishedGameEvent) -> None:
        self.published = published

    async def publish(self, game_id, live_event):
        return 1

    async def subscribe(self, game_id):
        assert game_id == self.published.game_id
        yield self.published
        await asyncio.Event().wait()


class FailingEventBus:
    async def publish(self, game_id, live_event):
        return 0

    async def subscribe(self, game_id):
        raise EventBusUnavailable("offline")
        if False:
            yield


def published_event(sequence: int) -> PublishedGameEvent:
    return PublishedGameEvent(
        game_id="game-orb-pin-001",
        event=event(f"live-{sequence}", sequence, "Live update"),
        published_at=datetime.now(UTC),
    )


def test_websocket_forwards_contiguous_redis_event(client):
    app.state.event_bus = OneEventBus(published_event(12))

    with client.websocket_connect("/api/v1/ws/games/game-orb-pin-001") as socket:
        assert socket.receive_json()["type"] == "snapshot"
        message = socket.receive_json()

        assert message["type"] == "event"
        assert message["event"]["sequence"] == 12


def test_websocket_switches_to_polling_when_redis_is_unavailable(client):
    app.state.event_bus = FailingEventBus()

    with client.websocket_connect("/api/v1/ws/games/game-orb-pin-001") as socket:
        assert socket.receive_json()["type"] == "snapshot"
        message = socket.receive_json()

        assert message == {
            "type": "transport",
            "mode": "polling",
            "reason": "event_bus_unavailable",
            "recoverable": True,
        }


def test_websocket_detects_sequence_gap_before_forwarding(client):
    app.state.event_bus = OneEventBus(published_event(13))

    with client.websocket_connect("/api/v1/ws/games/game-orb-pin-001") as socket:
        assert socket.receive_json()["type"] == "snapshot"
        message = socket.receive_json()

        assert message == {
            "type": "gap",
            "expected_sequence": 12,
            "received_sequence": 13,
            "transport": "polling",
            "recoverable": True,
        }
