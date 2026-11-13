.PHONY: dev api web test check up down migrate seed

dev:
	docker compose up --build

api:
	cd apps/api && uvicorn courtvision.main:app --reload --port 8000

web:
	pnpm --filter @courtvision/web dev

test:
	pnpm test

check:
	pnpm check

up:
	docker compose up --build -d

down:
	docker compose down

migrate:
	cd apps/api && alembic upgrade head

seed:
	cd apps/api && python -m courtvision.cli seed
