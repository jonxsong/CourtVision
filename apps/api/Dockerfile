FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 COURTVISION_SNAPSHOT_ROOT=/app/nba-data
COPY apps/api/pyproject.toml ./
COPY apps/api/courtvision ./courtvision
COPY apps/api/alembic.ini ./
COPY apps/api/migrations ./migrations
COPY apps/web/public/data/nba-players.json ./nba-data/nba-players.json
COPY apps/web/public/data/shots ./nba-data/shots
COPY apps/web/lib/live-games.json ./nba-data/live-games.json
RUN pip install --no-cache-dir .
EXPOSE 8000
CMD ["uvicorn", "courtvision.main:app", "--host", "0.0.0.0", "--port", "8000"]
