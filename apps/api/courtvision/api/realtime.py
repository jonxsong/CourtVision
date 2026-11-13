import asyncio
from contextlib import suppress
from dataclasses import dataclass
from typing import cast

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from courtvision.providers.base import BasketballDataProvider
from courtvision.realtime import (
    EventBusMessageError,
    EventBusUnavailable,
    GameEventBus,
    PublishedGameEvent,
)
from courtvision.schemas import GameEvent
from courtvision.services.replay import ReplayBuffer, ReplayInvariantError

router = APIRouter()


@dataclass(frozen=True)
class StreamUnavailable:
    reason: str


def _event_payload(event: GameEvent) -> dict[str, object]:
    return cast(dict[str, object], event.model_dump(mode="json"))


async def _forward_bus_events(
    event_bus: GameEventBus,
    game_id: str,
    queue: asyncio.Queue[PublishedGameEvent | StreamUnavailable],
) -> None:
    try:
        async for message in event_bus.subscribe(game_id):
            await queue.put(message)
    except (EventBusUnavailable, EventBusMessageError) as error:
        await queue.put(StreamUnavailable(str(error)))


async def _send_snapshot(
    websocket: WebSocket, game_id: str, replay: ReplayBuffer, *, is_demo: bool
) -> None:
    await websocket.send_json(
        {
            "type": "snapshot",
            "game_id": game_id,
            "last_sequence": replay.last_sequence,
            "events": [_event_payload(event) for event in replay.events],
            "is_demo": is_demo,
        }
    )


async def _fresh_replay(
    provider: BasketballDataProvider, game_id: str
) -> tuple[ReplayBuffer, bool] | None:
    game = await provider.game(game_id)
    if not game:
        return None
    try:
        return ReplayBuffer.from_events(game.events), game.is_demo
    except ReplayInvariantError:
        return None


@router.websocket("/api/v1/ws/games/{game_id}")
async def game_replay_socket(websocket: WebSocket, game_id: str) -> None:
    allowed_origins: list[str] = websocket.app.state.allowed_origins
    origin = websocket.headers.get("origin")
    if origin and origin not in allowed_origins:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    provider: BasketballDataProvider = websocket.app.state.provider
    game = await provider.game(game_id)
    if not game:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION, reason="Game not found")
        return
    try:
        replay = ReplayBuffer.from_events(game.events)
    except ReplayInvariantError:
        await websocket.close(code=status.WS_1011_INTERNAL_ERROR, reason="Invalid event stream")
        return

    await websocket.accept()
    await _send_snapshot(websocket, game_id, replay, is_demo=game.is_demo)

    event_bus: GameEventBus = websocket.app.state.event_bus
    poll_interval: float = websocket.app.state.live_poll_interval_seconds
    heartbeat_interval: float = websocket.app.state.websocket_heartbeat_seconds
    event_queue: asyncio.Queue[PublishedGameEvent | StreamUnavailable] = asyncio.Queue()
    bus_task = asyncio.create_task(_forward_bus_events(event_bus, game_id, event_queue))
    receive_task = asyncio.create_task(websocket.receive_json())
    queue_task = asyncio.create_task(event_queue.get())
    transport: str = "redis"

    try:
        while True:
            timeout = heartbeat_interval if transport == "redis" else poll_interval
            done, _ = await asyncio.wait(
                {receive_task, queue_task}, timeout=timeout, return_when=asyncio.FIRST_COMPLETED
            )

            if not done:
                if transport == "polling":
                    refreshed = await _fresh_replay(provider, game_id)
                    if refreshed:
                        fresh_replay, is_demo = refreshed
                        new_events = fresh_replay.after(replay.last_sequence)
                        if new_events:
                            expected = replay.last_sequence + 1
                            if new_events[0].sequence == expected:
                                for event in new_events:
                                    await websocket.send_json(
                                        {"type": "event", "event": _event_payload(event)}
                                    )
                                replay = fresh_replay
                            else:
                                await _send_snapshot(
                                    websocket, game_id, fresh_replay, is_demo=is_demo
                                )
                                replay = fresh_replay
                await websocket.send_json(
                    {
                        "type": "heartbeat",
                        "last_sequence": replay.last_sequence,
                        "transport": transport,
                    }
                )
                continue

            if receive_task in done:
                message = receive_task.result()
                message_type = message.get("type")
                if message_type == "ping":
                    await websocket.send_json(
                        {
                            "type": "pong",
                            "last_sequence": replay.last_sequence,
                        }
                    )
                elif message_type == "replay":
                    after_sequence = max(0, int(message.get("after_sequence", 0)))
                    for event in replay.after(after_sequence):
                        await websocket.send_json(
                            {"type": "event", "event": _event_payload(event)}
                        )
                    await websocket.send_json(
                        {"type": "replay_complete", "last_sequence": replay.last_sequence}
                    )
                else:
                    await websocket.send_json(
                        {"type": "error", "code": "unsupported_message", "recoverable": True}
                    )
                receive_task = asyncio.create_task(websocket.receive_json())

            if queue_task in done:
                bus_message = queue_task.result()
                if isinstance(bus_message, StreamUnavailable):
                    transport = "polling"
                    await websocket.send_json(
                        {
                            "type": "transport",
                            "mode": "polling",
                            "reason": "event_bus_unavailable",
                            "recoverable": True,
                        }
                    )
                else:
                    event = bus_message.event
                    if event.sequence > replay.last_sequence:
                        expected_sequence = replay.last_sequence + 1
                        if event.sequence == expected_sequence:
                            replay = ReplayBuffer.from_events([*replay.events, event])
                            await websocket.send_json(
                                {"type": "event", "event": _event_payload(event)}
                            )
                        else:
                            refreshed = await _fresh_replay(provider, game_id)
                            if refreshed and refreshed[0].last_sequence >= event.sequence:
                                replay, is_demo = refreshed
                                await _send_snapshot(
                                    websocket, game_id, replay, is_demo=is_demo
                                )
                            else:
                                transport = "polling"
                                bus_task.cancel()
                                await websocket.send_json(
                                    {
                                        "type": "gap",
                                        "expected_sequence": expected_sequence,
                                        "received_sequence": event.sequence,
                                        "transport": "polling",
                                        "recoverable": True,
                                    }
                                )
                queue_task = asyncio.create_task(event_queue.get())
    except WebSocketDisconnect:
        return
    finally:
        for task in (receive_task, queue_task, bus_task):
            task.cancel()
        with suppress(asyncio.CancelledError):
            await asyncio.gather(receive_task, queue_task, bus_task, return_exceptions=True)
