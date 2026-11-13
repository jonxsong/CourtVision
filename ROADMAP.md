# Roadmap

Status as of November 12, 2026.

## Phase 1 — Foundation

- [x] pnpm monorepo
- [x] Next.js product shell and primary routes
- [x] FastAPI typed HTTP API
- [x] normalized SQLAlchemy schema
- [x] initial Alembic migration
- [x] deterministic data provider
- [x] Docker Compose topology
- [x] local test/lint/type/build checks
- [x] 84% branch-aware coverage across critical backend business logic
- [ ] migration replay against containerized PostgreSQL
- [ ] CI result captured on GitHub

## Phase 2 — Analytics

- [x] Player DNA summary and metric definitions
- [x] Comparison Lab
- [x] custom SVG shot chart
- [x] made/missed and player filtering
- [x] season trends and zone breakdown
- [x] historical game event timeline
- [ ] URL-persist all interactive filters
- [ ] canvas/WebGL fallback benchmark for large shot sets
- [ ] league/era normalization using licensed data

## Phase 3 — Real time

- [x] normalized ordered event contract
- [x] historical replay interaction
- [x] WebSocket snapshot/replay/heartbeat protocol
- [x] provider-neutral ingestion contracts and checksummed job provenance
- [x] idempotent event upserts under duplicate/reordered batches
- [x] authenticated BALLDONTLIE free-tier adapter and score snapshot
- [ ] recurring ingestion scheduler
- [ ] Redis Pub/Sub implementation
- [ ] Redis fan-out, multi-instance gap recovery, and polling fallback
- [x] credentialed free schedule/score provider
- [ ] premium live play-by-play provider and redistribution-rights confirmation

## Phase 4 — Machine learning

- [x] transparent unvalidated interface baseline
- [x] leakage and evaluation specification
- [x] reproducible chronological split, calibration, and evaluation pipeline
- [ ] licensed historical event dataset
- [ ] provider-specific feature materialization job
- [ ] XGBoost candidate and probability calibration
- [ ] artifact registry integration and model card

## Phase 5 — AI and production

- [x] grounded answer UX and fact/interpretation separation
- [x] no-generated-SQL architecture decision
- [ ] typed statistical retrieval package
- [ ] MCP server
- [ ] OpenAI Agents SDK orchestration
- [ ] Redis-backed rate limits and timeouts
- [ ] OpenTelemetry export
- [ ] security, accessibility, Lighthouse, and load benchmarks

## Release gates

- migrations run forward from an empty database and through one rollback rehearsal;
- [x] ingestion is idempotent under duplicated/reordered fixture events;
- model beats a baseline on sealed chronological test data;
- critical backend business logic coverage is at least 80%;
- representative production pages reach Lighthouse performance 90+;
- cached API p95 is below 200 ms under a published local benchmark;
- licensed-provider terms are recorded for the deployed use case.
