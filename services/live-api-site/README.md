# CourtVision Live Data Worker

Server-side score service for the public CourtVision experience. The Worker keeps the provider credential out of browser code, normalizes the free game feed, enforces a single allowed browser origin, and caches successful responses for 60 seconds.

Routes:

- `GET /health`
- `GET /api/games`

Hosted secrets are configured through Sites and never committed. Local tests use synthetic provider responses.
