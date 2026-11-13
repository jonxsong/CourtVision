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
| POST | `/api/v1/predictions/baseline` | Transparent, unvalidated demo probability |
| POST | `/api/v1/insights/query` | Grounded demo retrieval response |

## Pagination

List responses contain:

```json
{
  "data": [],
  "meta": { "page": 1, "page_size": 24, "total": 0 },
  "provenance": {
    "provider": "CourtVision deterministic fixtures",
    "is_demo": true,
    "fetched_at": "2026-11-12T00:00:00Z",
    "note": "Synthetic teams, players, games, and events for product demonstration only."
  }
}
```

## Errors

Validation failures use FastAPI's 422 problem detail. Missing resources return 404. An adapter that is named but not configured fails application startup; it never falls back silently to demo data.

## Security contract

- CORS accepts only configured origins.
- Browser clients never receive provider or OpenAI credentials.
- Inputs are length/range constrained by Pydantic.
- Database access uses SQLAlchemy parameters.
- AI tools will expose fixed typed operations, not SQL text.
- Public rate limits and trusted proxy handling are required before internet deployment.

## Versioning

Breaking response changes require a new URL version. Additive fields may be introduced within `v1`. Provider-specific fields belong in internal/raw payloads, not public response schemas.
