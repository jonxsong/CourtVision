# Deployment

## Public Sites topology

- Canonical UI: `https://courtvision.jonzhang.dev`
- Sites platform URL: `https://courtvision-analytics.perkyaisle4.chatgpt.site`
- Live data Worker: `https://courtvision-live-data.perkyaisle4.chatgpt.site`

The UI is a static Next.js export that hydrates live data and Ask CV client components. The Worker owns the BALLDONTLIE and OpenAI credentials, normalizes public responses, permits the CourtVision origin, coalesces concurrent refreshes, caches successful NBA data, and serves the last-known-good payload when a data provider fails. Ask CV responses are private/no-store, never cached by the browser or CDN, and limited per client to bound public API usage.

The development topology uses four containers: web, API, PostgreSQL, and Redis. The live-score path is deployed and production-verified; the complete container topology is not yet a production deployment claim.

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

See `.env.example`. Browser-visible variables must never contain secrets. `NEXT_PUBLIC_SITE_URL` defines the canonical public origin and `NEXT_PUBLIC_API_URL` contains only a public service URL.

Hosted Worker secrets are configured as `COURTVISION_BALLDONTLIE_API_KEY` and `COURTVISION_OPENAI_API_KEY`. Neither value belongs in source, the static export, or `.openai/hosting.json`.

## Release order

1. build immutable images;
2. run tests and security checks;
3. back up database;
4. run Alembic migrations with the migration role;
5. deploy API and verify readiness;
6. deploy web;
7. start workers;
8. smoke-test provider health and rollback if contracts fail.

## Verified release checks

- GitHub Actions CI passes on `main` for web lint, typecheck, tests, and build plus API lint, strict typing, tests, and coverage.
- The public score surface hydrates through the hosted Worker and retains a static last-known-good snapshot during upstream errors.
- The production page was checked for live refresh and horizontal overflow after the responsive fix.
- The optimized static build scores 100 for Lighthouse accessibility, best practices, and SEO with 0 CLS; the uncompressed local performance score is 83.
- `pnpm benchmark:live-api -- 50` enforces the 200 ms cached p95 target and currently fails honestly (109.6 ms p50, 428.5 ms p95 in the latest run).

## Targets not yet measured

Production Lighthouse performance 90+ and cached API p95 below 200 ms remain unmet release gates. Critical backend coverage is currently 83%. See [ROADMAP.md](ROADMAP.md) for the measured status.
