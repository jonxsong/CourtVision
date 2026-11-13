# API

The FastAPI service publishes OpenAPI at `/docs` and `/openapi.json`. Default base path: `/api/v1`.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Version, provider, and process health |
| GET | `/api/v1/players` | Paginated directory; optional `q` |
| GET | `/api/v1/players/{id}` | Player profile for `season` |
| GET | `/api/v1/games` | Paginated schedule/results |
| GET | `/api/v1/games/{id}` | Game, ordered events, leaders |
| GET | `/api/v1/shots` | Shot dataset by player and season |
| POST | `/api/v1/predictions/baseline` | Transparent, unvalidated baseline probability |
| POST | `/api/v1/insights/query` | Grounded response using real NBA player metrics |
| WS | `/api/v1/ws/games/{id}` | Snapshot, Redis fan-out, gap recovery, polling fallback, and replay |

## WebSocket protocol

The server opens with a complete `snapshot` containing `last_sequence`. Clients may send `{"type":"replay","after_sequence":9}` to receive ordered `event` messages followed by `replay_complete`, or `{"type":"ping"}` for a `pong`. Versioned Redis messages fan out new events across API instances. A sequence gap triggers a database/provider snapshot recovery instead of speculative state; a Redis outage emits a recoverable `transport` message and switches the connection to polling. Idle connections receive a heartbeat with the active transport. A reconnecting client should discard local speculative state, apply the new snapshot, then resume after its sequence.

## Pagination

List responses contain:

```json
{
  "data": [],
  "meta": { "page": 1, "page_size": 24, "total": 0 },
  "provenance": {
    "provider": "nba_stats",
    "is_demo": false,
    "fetched_at": "2026-11-13T04:19:43Z",
    "note": "Real NBA roster and current-season statistics from the latest refresh."
  }
}
```

## Errors

Validation failures use FastAPI's 422 problem detail. Missing resources return 404. An adapter that is named but not configured fails application startup; it never falls back to invented records.

The default `nba_snapshot` adapter serves the committed real NBA player, game, and shot snapshots without requiring a paid key. When the free BALLDONTLIE adapter is active, `/players` and `/games` return live provider data. Fields unavailable from a provider remain empty or explicitly unavailable; the API never substitutes invented values.

## Security contract

- CORS accepts only configured origins.
- Browser clients never receive provider or OpenAI credentials.
- Inputs are length/range constrained by Pydantic.
- Database access uses SQLAlchemy parameters.
- AI tools will expose fixed typed operations, not SQL text.
- Public rate limits and trusted proxy handling are required before internet deployment.

## Versioning

Breaking response changes require a new URL version. Additive fields may be introduced within `v1`. Provider-specific fields belong in internal/raw payloads, not public response schemas.
