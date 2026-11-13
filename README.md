<div align="center">

# COURTVISION

### See the game beyond the box score.

**A production-oriented basketball intelligence platform for possessions, players, shots, and the context connecting them.**

[![Web](https://img.shields.io/badge/Next.js-16-0b0b0a?style=flat-square&logo=nextdotjs)](apps/web)
[![API](https://img.shields.io/badge/FastAPI-typed-05998b?style=flat-square&logo=fastapi)](apps/api)
[![Python](https://img.shields.io/badge/Python-3.11+-3776ab?style=flat-square&logo=python&logoColor=white)](apps/api/pyproject.toml)
[![Tests](https://img.shields.io/badge/tests-23_passing-66c78f?style=flat-square)](#verification)
[![Data](https://img.shields.io/badge/default_data-deterministic_fixtures-ff6529?style=flat-square)](DATA_SOURCES.md)

</div>

---

CourtVision is not a generic stats dashboard and it does not manufacture NBA data. It is a full-stack product foundation built around transparent provenance, normalized game events, reproducible analytics, and a premium editorial interface. The repository runs end-to-end without paid credentials using explicitly labeled fictional teams, players, games, and shots.

![CourtVision architecture](docs/architecture.svg)

## What works today

| Surface | Experience | Status |
|---|---|:---:|
| `/` | Editorial intelligence homepage | ✅ |
| `/players` | Searchable player directory | ✅ |
| `/players/[id]` | Player DNA, percentiles, trends, zones | ✅ |
| `/compare` | Interactive side-by-side comparison lab | ✅ |
| `/games` | Game slate and historical results | ✅ |
| `/games/[id]` | Win-probability view and historical replay | ✅ |
| `/shots` | Interactive SVG shot explorer | ✅ |
| `/insights` | Grounded-analysis UX with fact/interpretation separation | ✅ demo retrieval |
| FastAPI | Typed players, games, shots, replay, and baseline endpoints | ✅ |
| PostgreSQL | Normalized schema and initial Alembic migration | ✅ |
| Replay WebSocket | Snapshot, heartbeat, ordered resume | ✅ historical demo |
| Redis/live provider | Multi-instance Pub/Sub and licensed live feed | planned |
| ML | Transparent demo baseline + chronological training pipeline | ✅ unvalidated |
| Trained XGBoost + calibration | Needs licensed historical play-by-play corpus | blocked by data |
| OpenAI Agents + MCP | Typed tool boundary designed; production integration | planned |

> [!IMPORTANT]
> Every populated screen currently uses **deterministic synthetic fixtures**. CourtVision never presents those values as NBA statistics. Production ingestion should use a licensed provider such as Sportradar or a provider whose terms explicitly cover the intended product.

## The product idea

CourtVision treats basketball as a connected event system:

- Player DNA explains production, efficiency, shot shape, and comparable profiles.
- Comparison Lab keeps season, pace, sample size, and normalization visible.
- Game Intelligence connects probability movement to ordered play-by-play events.
- Shot Explorer renders actual coordinates when a provider supplies them and shows an unavailable state otherwise.
- Ask CourtVision is a statistical research interface—not an unrestricted SQL or chat surface.

## Start locally

### One command with Docker

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- API: http://localhost:8000
- OpenAPI: http://localhost:8000/docs
- Health: http://localhost:8000/health

### Native development

Requirements: Node 24+, pnpm 11+, Python 3.11+, PostgreSQL 16, Redis 7.

```bash
pnpm install
python -m venv .venv

# Windows
.venv\Scripts\python -m pip install -e "apps/api[dev]"

# macOS/Linux
.venv/bin/python -m pip install -e "apps/api[dev]"

pnpm dev
```

Run the API separately:

```bash
cd apps/api
uvicorn courtvision.main:app --reload --port 8000
```

## Repository map

```text
CourtVision/
├── apps/
│   ├── web/                 # Next.js App Router product UI
│   └── api/                 # FastAPI, providers, models, migrations
├── docs/                    # Rendered/editable architecture assets
├── .github/workflows/       # CI checks
├── docker-compose.yml       # Web + API + PostgreSQL + Redis
├── ARCHITECTURE.md
├── DATA_SOURCES.md
├── DATABASE.md
├── API.md
├── ML_MODEL.md
├── DEVELOPMENT.md
├── DEPLOYMENT.md
└── ROADMAP.md
```

## Verification

Current local checkpoint:

- Next.js production build: pass
- ESLint with zero warnings: pass
- TypeScript strict check: pass
- Vitest: 4 tests pass
- Pytest: 19 tests pass
- Ruff: pass
- mypy strict: pass

These are measured local results, not CI claims. Lighthouse, container integration, coverage percentage, migration replay against PostgreSQL, and latency targets remain to be measured before a production release.

```bash
pnpm lint
pnpm typecheck
pnpm test:web
.venv\Scripts\python -m pytest apps/api/tests
.venv\Scripts\python -m ruff check apps/api/courtvision apps/api/tests
.venv\Scripts\python -m mypy --config-file apps/api/pyproject.toml apps/api/courtvision
pnpm build
```

## Design principles

The visual system uses near-black, warm off-white, and restrained basketball orange. Dense analytical surfaces are separated by editorial whitespace; animation is purposeful and reduced-motion aware. All primary actions are keyboard reachable, SVG charts have accessible labels, and loading/error/empty states are first-class.

## Documentation

- [Architecture](ARCHITECTURE.md) — service boundaries, data flow, and decisions
- [Data sources](DATA_SOURCES.md) — terms, coverage, risks, and provider strategy
- [Database](DATABASE.md) — entities, constraints, provenance, and query paths
- [API](API.md) — HTTP contracts and error behavior
- [ML model](ML_MODEL.md) — leakage rules, evaluation, and current limitations
- [Development](DEVELOPMENT.md) — local workflow and quality gates
- [Deployment](DEPLOYMENT.md) — container topology and production requirements
- [Roadmap](ROADMAP.md) — honest phase status and next milestones

## License and data notice

Source licensing has not yet been selected. NBA names, marks, statistics, and game accounts may carry separate rights and use restrictions. The repository includes no scraped NBA dataset and should not be deployed with NBA data until provider and redistribution rights are confirmed.

<div align="center"><sub>Built to make the evidence as compelling as the story.</sub></div>
