# Deployment

The development topology uses four containers: web, API, PostgreSQL, and Redis. This is not yet a production deployment claim.

## Build

```bash
docker compose build
docker compose up -d
docker compose ps
```

## Required production changes

- managed PostgreSQL with encrypted backups and point-in-time recovery;
- managed Redis with authentication/TLS or a private network;
- separate migration and runtime database roles;
- HTTPS termination and secure WebSockets;
- trusted proxy configuration and IP-aware request limiting;
- non-wildcard CORS;
- secret manager for provider and OpenAI keys;
- worker process for ingestion/schedules;
- OpenTelemetry exporter and centralized JSON logs;
- health/readiness split and dependency probes;
- image scanning, pinned base-image digests, and automated dependency review.

## Environment variables

See `.env.example`. Browser-visible variables must never contain secrets. `NEXT_PUBLIC_API_URL` is safe because it contains only a public service URL.

## Release order

1. build immutable images;
2. run tests and security checks;
3. back up database;
4. run Alembic migrations with the migration role;
5. deploy API and verify readiness;
6. deploy web;
7. start workers;
8. smoke-test demo/provider health and rollback if contracts fail.

## Targets not yet measured

The repository must not claim cached p95 below 200 ms, Lighthouse 90+, or 80% critical coverage until those benchmarks run in a representative release environment. They remain release gates in [ROADMAP.md](ROADMAP.md).
