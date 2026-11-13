# Development

## Prerequisites

- Node.js 24+
- pnpm 11+
- Python 3.11+
- Docker with Compose
- Git

## Install

```bash
pnpm install
python -m venv .venv
.venv\Scripts\python -m pip install -e "apps/api[dev]"
```

Use `.venv/bin/python` instead on macOS or Linux.

## Run

```bash
docker compose up --build
```

For a faster native loop, run `pnpm dev` and `uvicorn courtvision.main:app --reload --port 8000` from `apps/api`.

## Free live-data adapter

The default `nba_snapshot` provider reads the committed, refreshable real NBA data under `apps/web/public/data`, so local development starts without a paid key.

Put the provider key in the ignored `.env` file—never source control:

```env
COURTVISION_DATA_PROVIDER=balldontlie
COURTVISION_BALLDONTLIE_API_KEY=your_key
```

Validate authentication without printing the key:

```bash
.venv\Scripts\python -m courtvision.providers.check
```

Generate a browser-safe score snapshot for the static Site:

```bash
.venv\Scripts\python -m courtvision.providers.snapshot
```

## Quality gates

```bash
pnpm --filter @courtvision/web lint
pnpm --filter @courtvision/web typecheck
pnpm --filter @courtvision/web test
pnpm --filter @courtvision/web build

.venv\Scripts\python -m coverage run --rcfile apps/api/pyproject.toml -m pytest apps/api/tests
.venv\Scripts\python -m coverage report --rcfile apps/api/pyproject.toml
.venv\Scripts\python -m ruff check apps/api/courtvision apps/api/tests
.venv\Scripts\python -m mypy --config-file apps/api/pyproject.toml apps/api/courtvision
```

## Conventions

- Keep TypeScript strict; do not use `any` to bypass a contract.
- Parse external data at the provider boundary.
- Keep vendor fields out of public schemas.
- Put formulas in tested service functions and document source/interpretation.
- Every real statistic must include provenance, season, and sample size.
- Never invent a value when an NBA provider field is unavailable.
- Prefer server components; use client components only for interaction/state.
- Honor reduced motion and preserve visible focus states.

## Adding a provider

1. implement `BasketballDataProvider`;
2. add credential validation in settings;
3. add contract fixtures and failure tests;
4. map external IDs to stable UUID entities;
5. document terms, rate limits, and field coverage;
6. add adapter selection without an invented-data fallback.
