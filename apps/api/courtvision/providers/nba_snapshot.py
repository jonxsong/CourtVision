import json
import os
from datetime import UTC, datetime
from functools import lru_cache
from pathlib import Path
from typing import Any, cast

from courtvision.providers.base import BasketballDataProvider
from courtvision.schemas import (
    GameDetail,
    GamePage,
    GameSummary,
    GameTeam,
    Metric,
    PageMeta,
    PlayerPage,
    PlayerProfile,
    PlayerSummary,
    Provenance,
    Shot,
    ShotDataset,
    TeamSummary,
)

REPO_ROOT = Path(__file__).parents[4]
CONTAINER_SNAPSHOT_ROOT = os.getenv("COURTVISION_SNAPSHOT_ROOT")
if CONTAINER_SNAPSHOT_ROOT:
    snapshot_root = Path(CONTAINER_SNAPSHOT_ROOT)
    PLAYER_SNAPSHOT = snapshot_root / "nba-players.json"
    SHOT_SNAPSHOT_DIR = snapshot_root / "shots"
    GAME_SNAPSHOT = snapshot_root / "live-games.json"
else:
    PLAYER_SNAPSHOT = REPO_ROOT / "apps" / "web" / "public" / "data" / "nba-players.json"
    SHOT_SNAPSHOT_DIR = REPO_ROOT / "apps" / "web" / "public" / "data" / "shots"
    GAME_SNAPSHOT = REPO_ROOT / "apps" / "web" / "lib" / "live-games.json"


def _datetime(value: object) -> datetime:
    text = str(value or "").replace("Z", "+00:00")
    if not text:
        return datetime.now(UTC)
    parsed = datetime.fromisoformat(text)
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)


@lru_cache(maxsize=1)
def _players_payload() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(PLAYER_SNAPSHOT.read_text(encoding="utf-8")))


@lru_cache(maxsize=1)
def _games_payload() -> dict[str, Any]:
    return cast(dict[str, Any], json.loads(GAME_SNAPSHOT.read_text(encoding="utf-8")))


def _percentile(players: list[dict[str, Any]], key: str, value: float) -> int:
    values = sorted(float(player.get("stats", {}).get(key) or 0) for player in players)
    if not values:
        return 0
    below_or_equal = sum(candidate <= value for candidate in values)
    return round(100 * below_or_equal / len(values))


class NBASnapshotProvider(BasketballDataProvider):
    """Committed, refreshable snapshots containing only real NBA provider data."""

    slug = "nba_snapshot"
    is_demo = False

    @staticmethod
    def _provenance(payload: dict[str, Any], note: str) -> Provenance:
        return Provenance(
            provider=str(payload.get("provider", "NBA Stats")),
            is_demo=False,
            fetched_at=_datetime(payload.get("fetchedAt")),
            note=note,
        )

    @staticmethod
    def _team(raw: dict[str, Any]) -> TeamSummary:
        return TeamSummary(
            id=str(raw.get("id", "unknown")),
            abbreviation=str(raw.get("abbreviation", "—")),
            city=str(raw.get("city", "")),
            name=str(raw.get("name", "Unknown")),
        )

    def _player_summary(self, raw: dict[str, Any]) -> PlayerSummary:
        return PlayerSummary(
            id=str(raw["id"]),
            slug=str(raw["slug"]),
            name=str(raw["name"]),
            initials=str(raw["initials"]),
            position=str(raw.get("position") or "—"),
            number=str(raw.get("number") or "—"),
            team=self._team(raw.get("team", {})),
            active=bool(raw.get("active", True)),
        )

    @staticmethod
    def _metric(
        players: list[dict[str, Any]],
        stats: dict[str, Any],
        key: str,
        source_key: str,
        label: str,
        suffix: str,
        definition: str,
        multiplier: float = 1,
    ) -> Metric:
        value = float(stats.get(source_key) or 0) * multiplier
        percentile_value = value / multiplier if multiplier else value
        return Metric(
            key=key,
            label=label,
            value=round(value, 1),
            display=f"{value:.1f}{suffix}",
            percentile=_percentile(players, source_key, percentile_value),
            definition=definition,
        )

    def _game_summary(self, raw: dict[str, Any]) -> GameSummary:
        home = raw.get("home", {})
        away = raw.get("away", {})
        return GameSummary(
            id=str(raw["id"]),
            tipoff_at=_datetime(raw.get("tipoffAt")),
            status=str(raw.get("status", "scheduled")),
            home=GameTeam(
                team=self._team(home.get("team", {})),
                score=int(home.get("score") or 0),
                record=str(home.get("record") or "—"),
            ),
            away=GameTeam(
                team=self._team(away.get("team", {})),
                score=int(away.get("score") or 0),
                record=str(away.get("record") or "—"),
            ),
            venue=str(raw.get("venue") or "Venue unavailable"),
            headline=str(raw.get("headline") or "NBA game"),
            is_demo=False,
        )

    async def players(self, query: str | None, page: int, page_size: int) -> PlayerPage:
        payload = _players_payload()
        players = payload.get("players", [])
        if query:
            needle = query.casefold()
            players = [
                player
                for player in players
                if needle in str(player.get("name", "")).casefold()
                or needle in str(player.get("team", {}).get("name", "")).casefold()
                or needle in str(player.get("team", {}).get("abbreviation", "")).casefold()
            ]
        start = (page - 1) * page_size
        return PlayerPage(
            data=[self._player_summary(player) for player in players[start : start + page_size]],
            meta=PageMeta(page=page, page_size=page_size, total=len(players)),
            provenance=self._provenance(
                payload, "Real NBA roster and current-season statistics from the latest refresh."
            ),
        )

    async def player(self, player_id: str, season: str) -> PlayerProfile | None:
        payload = _players_payload()
        players = payload.get("players", [])
        raw = next(
            (
                player
                for player in players
                if str(player.get("id")) == player_id or str(player.get("slug")) == player_id
            ),
            None,
        )
        if not raw:
            return None
        summary = self._player_summary(raw)
        stats = raw.get("stats", {})
        metrics = [
            self._metric(players, stats, "ppg", "points", "Points", " PPG", "Points per game."),
            self._metric(players, stats, "apg", "assists", "Assists", " APG", "Assists per game."),
            self._metric(players, stats, "rpg", "rebounds", "Rebounds", " RPG", "Rebounds per game."),
            self._metric(
                players,
                stats,
                "ts",
                "trueShootingPct",
                "True shooting",
                "%",
                "Scoring efficiency including two-pointers, three-pointers, and free throws.",
                100,
            ),
            self._metric(
                players,
                stats,
                "usage",
                "usagePct",
                "Usage",
                "%",
                "Estimated share of team possessions used while on court.",
                100,
            ),
            self._metric(
                players,
                stats,
                "net_rating",
                "netRating",
                "Net rating",
                "",
                "Team point differential per 100 possessions while on court.",
            ),
        ]
        return PlayerProfile(
            **summary.model_dump(),
            season=str(raw.get("season") or payload.get("season") or season),
            bio={str(key): str(value) for key, value in raw.get("bio", {}).items()},
            games_played=int(stats.get("gamesPlayed") or 0),
            minutes_per_game=float(stats.get("minutes") or 0),
            metrics=metrics,
            trend=[],
            zones=[],
            similar_players=[],
            provenance=self._provenance(
                payload, "Real NBA current-season base and advanced statistics."
            ),
        )

    async def games(self, page: int, page_size: int) -> GamePage:
        payload = _games_payload()
        games = payload.get("games", [])
        start = (page - 1) * page_size
        return GamePage(
            data=[self._game_summary(game) for game in games[start : start + page_size]],
            meta=PageMeta(page=page, page_size=page_size, total=len(games)),
            provenance=self._provenance(payload, "Real NBA schedule and score snapshot."),
        )

    async def game(self, game_id: str) -> GameDetail | None:
        payload = _games_payload()
        raw = next(
            (game for game in payload.get("games", []) if str(game.get("id")) == game_id),
            None,
        )
        if not raw:
            return None
        game = self._game_summary(raw)
        return GameDetail(
            **game.model_dump(),
            events=[],
            leaders=[],
            provenance=self._provenance(
                payload, "Real score and status; unavailable play-by-play is not fabricated."
            ),
        )

    async def shots(self, player_id: str | None, season: str) -> ShotDataset:
        payload = _players_payload()
        selected_id = player_id or str(payload.get("players", [{}])[0].get("id", ""))
        shot_file = SHOT_SNAPSHOT_DIR / f"{selected_id}.json"
        if not shot_file.exists():
            return ShotDataset(
                season=str(payload.get("season") or season),
                shots=[],
                available=False,
                unavailable_reason="No real shot coordinates are available for this player.",
                provenance=self._provenance(payload, "No shot values were fabricated."),
            )
        shot_payload = json.loads(shot_file.read_text(encoding="utf-8"))
        shots = [
            Shot(
                id=str(raw["id"]),
                player_id=str(raw["playerId"]),
                player_name=str(raw["playerName"]),
                game_id=str(raw["gameId"]),
                x=float(raw["x"]),
                y=float(raw["y"]),
                distance=float(raw["distance"]),
                made=bool(raw["made"]),
                points=int(raw["points"]),
                zone=str(raw["zone"]),
            )
            for raw in shot_payload.get("shots", [])
        ]
        return ShotDataset(
            season=str(shot_payload.get("season") or season),
            shots=shots,
            provenance=self._provenance(
                shot_payload, "Real regular-season field-goal attempts from NBA Stats."
            ),
        )
