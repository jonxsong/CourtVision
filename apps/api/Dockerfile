FROM python:3.11-slim AS runtime
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY apps/api/pyproject.toml ./
COPY apps/api/courtvision ./courtvision
COPY apps/api/alembic.ini ./
COPY apps/api/migrations ./migrations
RUN pip install --no-cache-dir .
EXPOSE 8000
CMD ["uvicorn", "courtvision.main:app", "--host", "0.0.0.0", "--port", "8000"]
