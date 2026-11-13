import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, status

from courtvision.providers.base import BasketballDataProvider
from courtvision.services.replay import ReplayBuffer, ReplayInvariantError

router = APIRouter()


def _event_payload(event) -> dict[str, object]:
    return event.model_dump(mode="json")


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
    await websocket.send_json(
        {
            "type": "snapshot",
            "game_id": game_id,
            "last_sequence": replay.last_sequence,
            "events": [_event_payload(event) for event in replay.events],
            "is_demo": game.is_demo,
        }
    )

    try:
        while True:
            try:
                message = await asyncio.wait_for(websocket.receive_json(), timeout=20)
            except TimeoutError:
                await websocket.send_json({"type": "heartbeat", "last_sequence": replay.last_sequence})
                continue
            message_type = message.get("type")
            if message_type == "ping":
                await websocket.send_json({"type": "pong", "last_sequence": replay.last_sequence})
            elif message_type == "replay":
                after_sequence = max(0, int(message.get("after_sequence", 0)))
                for event in replay.after(after_sequence):
                    await websocket.send_json({"type": "event", "event": _event_payload(event)})
                await websocket.send_json(
                    {"type": "replay_complete", "last_sequence": replay.last_sequence}
                )
            else:
                await websocket.send_json(
                    {"type": "error", "code": "unsupported_message", "recoverable": True}
                )
    except WebSocketDisconnect:
        return
