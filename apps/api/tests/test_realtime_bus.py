from collections.abc import Iterable

import pytest

from courtvision.realtime import (
    EventBusMessageError,
    EventBusUnavailable,
    PublishedGameEvent,
    RedisGameEventBus,
)
from courtvision.schemas import GameEvent


def game_event(sequence: int = 7) -> GameEvent:
    return GameEvent(
        id=f"event-{sequence}",
        sequence=sequence,
        period=4,
        clock="01:24",
        event_type="shot",
        description="Three-point field goal",
        home_score=101,
        away_score=99,
        home_win_probability=0.72,
    )


class FakePubSub:
    def __init__(self, messages: Iterable[dict[str, object] | None]) -> None:
        self.messages = iter(messages)
        self.subscribed: list[str] = []
        self.unsubscribed: list[str] = []
        self.closed = False

    async def subscribe(self, *channels: str) -> object:
        self.subscribed.extend(channels)
        return None

    async def unsubscribe(self, *channels: str) -> object:
        self.unsubscribed.extend(channels)
        return None

    async def get_message(
        self, *, ignore_subscribe_messages: bool, timeout: float
    ) -> dict[str, object] | None:
        assert ignore_subscribe_messages is True
        assert timeout == 1.0
        return next(self.messages)

    async def aclose(self) -> None:
        self.closed = True


class FakeRedis:
    def __init__(self, messages: Iterable[dict[str, object] | None] = ()) -> None:
        self.pubsub_client = FakePubSub(messages)
        self.published: list[tuple[str, str]] = []
        self.closed = False
        self.publish_error: Exception | None = None

    async def publish(self, channel: str, message: str) -> int:
        if self.publish_error:
            raise self.publish_error
        self.published.append((channel, message))
        return 2

    def pubsub(self) -> FakePubSub:
        return self.pubsub_client

    async def aclose(self) -> None:
        self.closed = True


@pytest.mark.asyncio
async def test_publish_uses_versioned_game_channel_and_contract():
    redis = FakeRedis()
    bus = RedisGameEventBus(redis)

    subscribers = await bus.publish("game-123", game_event())

    assert subscribers == 2
    channel, payload = redis.published[0]
    assert channel == "courtvision:games:game-123:events"
    message = PublishedGameEvent.model_validate_json(payload)
    assert message.schema_version == 1
    assert message.game_id == "game-123"
    assert message.event.sequence == 7


@pytest.mark.asyncio
async def test_subscribe_validates_and_closes_pubsub():
    payload = PublishedGameEvent(
        game_id="game-123",
        event=game_event(8),
        published_at="2026-11-12T20:00:00Z",
    ).model_dump_json()
    redis = FakeRedis([{"type": "message", "data": payload.encode()}])
    bus = RedisGameEventBus(redis, channel_prefix="cv")

    stream = bus.subscribe("game-123")
    message = await anext(stream)
    await stream.aclose()

    assert message.event.sequence == 8
    assert redis.pubsub_client.subscribed == ["cv:games:game-123:events"]
    assert redis.pubsub_client.unsubscribed == ["cv:games:game-123:events"]
    assert redis.pubsub_client.closed is True


@pytest.mark.asyncio
async def test_subscribe_rejects_invalid_payload():
    redis = FakeRedis([{"type": "message", "data": b"{}"}])
    bus = RedisGameEventBus(redis)

    with pytest.raises(EventBusMessageError, match="failed validation"):
        await anext(bus.subscribe("game-123"))


@pytest.mark.asyncio
async def test_publish_wraps_redis_outage():
    redis = FakeRedis()
    redis.publish_error = OSError("offline")
    bus = RedisGameEventBus(redis)

    with pytest.raises(EventBusUnavailable, match="publish failed"):
        await bus.publish("game-123", game_event())


@pytest.mark.asyncio
async def test_bus_close_releases_redis_client():
    redis = FakeRedis()
    bus = RedisGameEventBus(redis)

    await bus.close()

    assert redis.closed is True
