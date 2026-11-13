import re
from datetime import UTC, datetime

import httpx

from courtvision.ingestion.contracts import (
    IngestionBatch,
    NormalizedEvent,
    canonical_checksum,
)
from courtvision.providers.base import BasketballDataProvider
from courtvision.providers.http import ResilientJSONClient
from courtvision.schemas import (
    GameDetail,
    GamePage,
    GameSummary,
    GameTeam,
    PageMeta,
    PlayerPage,
    PlayerProfile,
    PlayerSummary,
    Provenance,
    ShotDataset,
    TeamSummary,
)


def _slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def _clock_seconds(value: object) -> int:
    if value in {None, ""}:
        return 0
    text = str(value)
    if ":" in text:
        minutes, seconds = text.split(":", 1)
        return int(minutes) * 60 + int(float(seconds))
    return int(float(text))


def _datetime(value: object) -> datetime:
    if not value:
        return datetime.now(UTC)
    text = str(value).replace("Z", "+00:00")
    parsed = datetime.fromisoformat(text)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


def _integer(value: object) -> int:
    return int(str(value or 0))


class BallDontLieProvider(BasketballDataProvider):
    slug = "balldontlie"
    is_demo = False

    def __init__(
        self,
        *,
        api_key: str,
        base_url: str = "https://api.balldontlie.io",
        timeout_seconds: float = 20,
        requests_per_minute: int = 5,
        client: httpx.AsyncClient | None = None,
    ) -> None:
        self.api = ResilientJSONClient(
            api_key=api_key,
            base_url=base_url,
            requests_per_minute=requests_per_minute,
            timeout_seconds=timeout_seconds,
            client=client,
        )

    def _provenance(self, note: str) -> Provenance:
        return Provenance(
            provider="BALLDONTLIE NBA API",
            is_demo=False,
            fetched_at=datetime.now(UTC),
            note=note,
        )

    @staticmethod
    def _team(raw: dict[str, object]) -> TeamSummary:
        return TeamSummary(
            id=str(raw.get("id", "unknown")),
            abbreviation=str(raw.get("abbreviation", "—")),
            city=str(raw.get("city", "")),
            name=str(raw.get("name", raw.get("full_name", "Unknown"))),
        )

    def _player(self, raw: dict[str, object]) -> PlayerSummary:
        first = str(raw.get("first_name", ""))
        last = str(raw.get("last_name", ""))
        name = f"{first} {last}".strip()
        raw_team = raw.get("team")
        team = self._team(raw_team if isinstance(raw_team, dict) else {})
        return PlayerSummary(
            id=str(raw.get("id", "unknown")),
            slug=f"{_slug(name)}-{raw.get('id', 'unknown')}",
            name=name or "Unknown player",
            initials=f"{first[:1]}{last[:1]}".upper(),
            position=str(raw.get("position", "—")) or "—",
            number=str(raw.get("jersey_number", "—")) or "—",
            team=team,
            active=bool(raw.get("active", True)),
        )

    @staticmethod
    def _game_status(raw: dict[str, object]) -> str:
        if raw.get("postponed"):
            return "postponed"
        state = str(raw.get("status_state", raw.get("status", ""))).lower()
        if state in {"final", "closed"}:
            return "final"
        if state in {"inprogress", "live"} or "qtr" in state or state == "halftime":
            return "live"
        return "scheduled"

    def _game(self, raw: dict[str, object]) -> GameSummary:
        home_raw = raw.get("home_team")
        away_raw = raw.get("visitor_team")
        home = self._team(home_raw if isinstance(home_raw, dict) else {})
        away = self._team(away_raw if isinstance(away_raw, dict) else {})
        status = self._game_status(raw)
        return GameSummary(
            id=str(raw.get("id", "unknown")),
            tipoff_at=_datetime(raw.get("datetime") or raw.get("date")),
            status=status,
            home=GameTeam(team=home, score=_integer(raw.get("home_team_score")), record="—"),
            away=GameTeam(team=away, score=_integer(raw.get("visitor_team_score")), record="—"),
            venue=str(raw.get("venue", "Venue unavailable")),
            headline=f"{away.abbreviation} at {home.abbreviation} · {str(raw.get('status', status))}",
            is_demo=False,
        )

    async def _page(
        self, path: str, *, page: int, page_size: int, params: dict[str, object] | None = None
    ) -> tuple[list[dict[str, object]], int]:
        query = dict(params or {})
        query["per_page"] = page_size
        payload: dict[str, object] = {}
        for current in range(1, page + 1):
            payload = await self.api.get(path, query)
            if current < page:
                meta = payload.get("meta")
                cursor = meta.get("next_cursor") if isinstance(meta, dict) else None
                if cursor is None:
                    return [], (page - 1) * page_size
                query["cursor"] = cursor
        raw_data = payload.get("data", [])
        data = [item for item in raw_data if isinstance(item, dict)] if isinstance(raw_data, list) else []
        meta = payload.get("meta")
        has_next = isinstance(meta, dict) and meta.get("next_cursor") is not None
        approximate_total = (page - 1) * page_size + len(data) + (1 if has_next else 0)
        return data, approximate_total

    async def players(self, query: str | None, page: int, page_size: int) -> PlayerPage:
        raw, total = await self._page(
            "/v1/players", page=page, page_size=page_size, params={"search": query} if query else None
        )
        return PlayerPage(
            data=[self._player(player) for player in raw],
            meta=PageMeta(page=page, page_size=page_size, total=total),
            provenance=self._provenance("Free-tier player directory; totals are cursor-based estimates."),
        )

    async def player(self, player_id: str, season: str) -> PlayerProfile | None:
        payload = await self.api.get(f"/v1/players/{player_id}")
        raw = payload.get("data")
        if not isinstance(raw, dict):
            return None
        player = self._player(raw)
        return PlayerProfile(
            **player.model_dump(),
            season=season,
            bio={
                "height": str(raw.get("height", "Unavailable")),
                "weight": str(raw.get("weight", "Unavailable")),
                "experience": "Unavailable on free tier",
            },
            games_played=0,
            minutes_per_game=0,
            metrics=[],
            trend=[],
            zones=[],
            similar_players=[],
            provenance=self._provenance(
                "Identity and roster data are live; statistical profiles require a paid feed."
            ),
        )

    async def games(self, page: int, page_size: int) -> GamePage:
        raw, total = await self._page("/v1/games", page=page, page_size=page_size)
        return GamePage(
            data=[self._game(game) for game in raw],
            meta=PageMeta(page=page, page_size=page_size, total=total),
            provenance=self._provenance("Free-tier schedule and real-time game scores."),
        )

    async def game(self, game_id: str) -> GameDetail | None:
        payload = await self.api.get(f"/v1/games/{game_id}")
        raw = payload.get("data")
        if not isinstance(raw, dict):
            return None
        game = self._game(raw)
        return GameDetail(
            **game.model_dump(),
            events=[],
            leaders=[],
            provenance=self._provenance(
                "Live score is available; play-by-play and leaders are unavailable on the free tier."
            ),
        )

    async def shots(self, player_id: str | None, season: str) -> ShotDataset:
        return ShotDataset(
            season=season,
            shots=[],
            available=False,
            unavailable_reason="BALLDONTLIE shot charts require the NBA GOAT tier.",
            provenance=self._provenance("No coordinates were requested or imputed."),
        )

    async def plays(self, game_external_id: str) -> IngestionBatch:
        payload = await self.api.get("/v1/plays", {"game_id": game_external_id})
        raw_data = payload.get("data", [])
        raw_events = [item for item in raw_data if isinstance(item, dict)] if isinstance(raw_data, list) else []
        events: list[NormalizedEvent] = []
        for raw in raw_events:
            sequence = int(raw.get("order") or 0)
            team = raw.get("team")
            participants = raw.get("participants")
            occurred = raw.get("wallclock")
            events.append(
                NormalizedEvent(
                    external_event_id=str(raw.get("id") or f"{game_external_id}:{sequence}"),
                    sequence=sequence,
                    period=int(raw.get("period") or 0),
                    clock_seconds=_clock_seconds(raw.get("clock")),
                    event_type=str(raw.get("type") or "unknown").lower(),
                    description=str(raw.get("text") or ""),
                    home_score=int(raw.get("home_score") or 0),
                    away_score=int(raw.get("away_score") or 0),
                    external_team_id=(
                        str(team.get("id")) if isinstance(team, dict) and team.get("id") else None
                    ),
                    external_player_ids=(
                        [str(player_id) for player_id in participants]
                        if isinstance(participants, list)
                        else []
                    ),
                    occurred_at=_datetime(occurred) if occurred else None,
                    checksum=canonical_checksum(raw),
                    payload=raw,
                )
            )
        return IngestionBatch(
            provider_slug=self.slug,
            provider_version="v1",
            game_external_id=game_external_id,
            fetched_at=datetime.now(UTC),
            events=events,
        )

    async def close(self) -> None:
        await self.api.close()
