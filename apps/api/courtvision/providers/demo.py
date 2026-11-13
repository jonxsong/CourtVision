import math
import random
from datetime import UTC, datetime

from courtvision.providers.base import BasketballDataProvider
from courtvision.schemas import (
    GameDetail,
    GameEvent,
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

ORBIT = TeamSummary(id="team-orbit", abbreviation="ORB", city="Oakland", name="Orbit")
PINNACLE = TeamSummary(id="team-pinnacle", abbreviation="PIN", city="Portland", name="Pinnacle")
SOL = TeamSummary(id="team-sol", abbreviation="SOL", city="San Diego", name="Sol")
SOUND = TeamSummary(id="team-sound", abbreviation="SND", city="Seattle", name="Sound")

PLAYERS = [
    PlayerSummary(
        id="p-miles-avery", slug="miles-avery", name="Miles Avery", initials="MA",
        position="G", number="0", team=ORBIT,
    ),
    PlayerSummary(
        id="p-jonah-ellis", slug="jonah-ellis", name="Jonah Ellis", initials="JE",
        position="F", number="24", team=PINNACLE,
    ),
    PlayerSummary(
        id="p-darius-cole", slug="darius-cole", name="Darius Cole", initials="DC",
        position="G", number="3", team=SOL,
    ),
    PlayerSummary(
        id="p-leon-park", slug="leon-park", name="Leon Park", initials="LP",
        position="C", number="11", team=SOUND,
    ),
    PlayerSummary(
        id="p-isaiah-reed", slug="isaiah-reed", name="Isaiah Reed", initials="IR",
        position="F", number="7", team=ORBIT,
    ),
    PlayerSummary(
        id="p-noah-bennett", slug="noah-bennett", name="Noah Bennett", initials="NB",
        position="G", number="13", team=PINNACLE,
    ),
]


def _provenance() -> Provenance:
    return Provenance(
        provider="CourtVision deterministic fixtures",
        is_demo=True,
        fetched_at=datetime.now(UTC),
        note="Synthetic teams, players, games, and events for product demonstration only.",
    )


def _metrics(index: int) -> list[Metric]:
    values = [
        ("ppg", "Points", 27.4 - index * 1.7, "PPG", 91 - index * 5, "Points scored per game."),
        ("apg", "Assists", 7.8 - index * 0.5, "APG", 88 - index * 4, "Assists credited per game."),
        ("rpg", "Rebounds", 5.6 + index * 0.8, "RPG", 63 + index * 4, "Rebounds collected per game."),
        ("ts", "True shooting", 64.2 - index * 1.3, "%", 94 - index * 6, "PTS / (2 × (FGA + 0.44 × FTA))."),
        ("usage", "Usage", 30.1 - index * 0.7, "%", 89 - index * 4, "Estimated share of team plays used while on court."),
        ("tov", "Turnover rate", 10.8 + index * 0.6, "%", 74 - index * 3, "Turnovers per 100 individual plays."),
    ]
    return [
        Metric(key=k, label=label, value=round(v, 1), display=f"{v:.1f}{unit}", percentile=p, definition=d)
        for k, label, v, unit, p, d in values
    ]


def _profile(player: PlayerSummary) -> PlayerProfile:
    index = PLAYERS.index(player)
    zones: list[dict[str, str | int | float]] = [
        {"zone": "Rim", "attempts": 191 - index * 7, "fg_pct": 68.4 - index},
        {"zone": "Short mid", "attempts": 72 + index * 4, "fg_pct": 46.1 + index * 0.4},
        {"zone": "Long mid", "attempts": 89 - index * 3, "fg_pct": 43.7 - index * 0.5},
        {"zone": "Corner 3", "attempts": 84 + index * 2, "fg_pct": 41.8 - index * 0.7},
        {"zone": "Above break 3", "attempts": 267 - index * 9, "fg_pct": 39.6 - index * 0.8},
    ]
    similar_players: list[dict[str, str | float]] = []
    for i, other in enumerate(PLAYERS):
        if other.id != player.id:
            similar_players.append(
                {
                    "id": other.id,
                    "name": other.name,
                    "similarity": round(0.92 - abs(i - index) * 0.05, 2),
                }
            )
    similar_players = similar_players[:3]
    return PlayerProfile(
        **player.model_dump(),
        season="2025-26",
        bio={"height": f"{6 + index // 3}'{3 + index % 4}\"", "weight": f"{195 + index * 11} lb", "experience": f"{3 + index} seasons"},
        games_played=64 - index,
        minutes_per_game=35.2 - index * 0.4,
        metrics=_metrics(index),
        trend=[
            {"season": "2022-23", "points": 20.8 - index, "true_shooting": 58.3 - index * 0.5},
            {"season": "2023-24", "points": 23.6 - index, "true_shooting": 60.5 - index * 0.5},
            {"season": "2024-25", "points": 25.9 - index, "true_shooting": 62.1 - index * 0.6},
            {"season": "2025-26", "points": 27.4 - index * 1.7, "true_shooting": 64.2 - index * 1.3},
        ],
        zones=zones,
        similar_players=similar_players,
        provenance=_provenance(),
    )


GAME_SUMMARIES = [
    GameSummary(
        id="game-orb-pin-001", tipoff_at=datetime(2026, 3, 18, 2, 0, tzinfo=UTC), status="final",
        home=GameTeam(team=ORBIT, score=118, record="42–24"),
        away=GameTeam(team=PINNACLE, score=114, record="39–27"),
        venue="The Foundry", headline="Orbit close on a 14–5 run", is_demo=True,
    ),
    GameSummary(
        id="game-sol-snd-002", tipoff_at=datetime(2026, 3, 17, 23, 30, tzinfo=UTC), status="final",
        home=GameTeam(team=SOL, score=101, record="31–35"),
        away=GameTeam(team=SOUND, score=109, record="45–21"),
        venue="Pacific Forum", headline="Sound defense controls the fourth", is_demo=True,
    ),
    GameSummary(
        id="game-pin-snd-003", tipoff_at=datetime(2026, 3, 21, 2, 0, tzinfo=UTC), status="scheduled",
        home=GameTeam(team=PINNACLE, score=0, record="39–27"),
        away=GameTeam(team=SOUND, score=0, record="45–21"),
        venue="Rose Pavilion", headline="Top-four seeds meet in Portland", is_demo=True,
    ),
]


EVENTS = [
    GameEvent(id="e1", sequence=1, period=1, clock="12:00", event_type="period_start", description="Opening tip", home_score=0, away_score=0, home_win_probability=.56),
    GameEvent(id="e2", sequence=2, period=1, clock="9:42", event_type="three", description="Avery pulls up from 27 feet", home_score=8, away_score=4, home_win_probability=.61),
    GameEvent(id="e3", sequence=3, period=1, clock="4:18", event_type="run", description="Pinnacle answers with an 11–2 run", home_score=16, away_score=21, home_win_probability=.43, is_key_event=True),
    GameEvent(id="e4", sequence=4, period=2, clock="6:51", event_type="dunk", description="Reed finishes through contact", home_score=45, away_score=43, home_win_probability=.58),
    GameEvent(id="e5", sequence=5, period=2, clock="0:00", event_type="period_end", description="Halftime", home_score=57, away_score=58, home_win_probability=.51),
    GameEvent(id="e6", sequence=6, period=3, clock="7:09", event_type="three", description="Ellis hits consecutive corner threes", home_score=66, away_score=73, home_win_probability=.32, is_key_event=True),
    GameEvent(id="e7", sequence=7, period=3, clock="1:12", event_type="run", description="Orbit pressure forces three straight turnovers", home_score=84, away_score=82, home_win_probability=.64, is_key_event=True),
    GameEvent(id="e8", sequence=8, period=4, clock="8:33", event_type="lead_change", description="Bennett floater gives Pinnacle the lead", home_score=94, away_score=95, home_win_probability=.45),
    GameEvent(id="e9", sequence=9, period=4, clock="2:04", event_type="three", description="Avery relocates and hits from the wing", home_score=111, away_score=108, home_win_probability=.79, is_key_event=True),
    GameEvent(id="e10", sequence=10, period=4, clock="0:18", event_type="free_throw", description="Reed makes both to seal it", home_score=118, away_score=112, home_win_probability=.98),
    GameEvent(id="e11", sequence=11, period=4, clock="0:00", event_type="final", description="Final", home_score=118, away_score=114, home_win_probability=1),
]


class DemoProvider(BasketballDataProvider):
    slug = "demo"
    is_demo = True

    async def players(self, query: str | None, page: int, page_size: int) -> PlayerPage:
        found = PLAYERS
        if query:
            needle = query.casefold()
            found = [p for p in found if needle in p.name.casefold() or needle in p.team.name.casefold()]
        start = (page - 1) * page_size
        return PlayerPage(
            data=found[start : start + page_size],
            meta=PageMeta(page=page, page_size=page_size, total=len(found)),
            provenance=_provenance(),
        )

    async def player(self, player_id: str, season: str) -> PlayerProfile | None:
        player = next((p for p in PLAYERS if p.id == player_id or p.slug == player_id), None)
        return _profile(player) if player else None

    async def games(self, page: int, page_size: int) -> GamePage:
        start = (page - 1) * page_size
        return GamePage(
            data=GAME_SUMMARIES[start : start + page_size],
            meta=PageMeta(page=page, page_size=page_size, total=len(GAME_SUMMARIES)),
            provenance=_provenance(),
        )

    async def game(self, game_id: str) -> GameDetail | None:
        game = next((g for g in GAME_SUMMARIES if g.id == game_id), None)
        if not game:
            return None
        events = EVENTS if game.id == "game-orb-pin-001" else []
        return GameDetail(
            **game.model_dump(),
            events=events,
            leaders=[
                {"player": "Miles Avery", "team": "ORB", "points": 34, "rebounds": 6, "assists": 9},
                {"player": "Jonah Ellis", "team": "PIN", "points": 29, "rebounds": 8, "assists": 4},
            ],
            provenance=_provenance(),
        )

    async def shots(self, player_id: str | None, season: str) -> ShotDataset:
        rng = random.Random(f"courtvision:{player_id or 'all'}:{season}")
        pool = [p for p in PLAYERS if not player_id or p.id == player_id or p.slug == player_id]
        shots: list[Shot] = []
        for player in pool:
            for i in range(72):
                angle = rng.uniform(-math.pi / 2, math.pi / 2)
                distance = min(29, max(1.5, rng.gauss(18, 8)))
                x = math.sin(angle) * distance
                y = math.cos(angle) * distance
                is_three = distance >= 22 and (abs(x) > 8 or y > 14)
                make_chance = max(.28, .70 - distance * .014)
                shots.append(
                    Shot(
                        id=f"shot-{player.id}-{i}", player_id=player.id, player_name=player.name,
                        game_id="game-orb-pin-001", x=round(x, 2), y=round(y, 2),
                        distance=round(distance, 1), made=rng.random() < make_chance,
                        points=3 if is_three else 2,
                        zone="Rim" if distance < 5 else "Mid-range" if not is_three else "Three",
                    )
                )
        return ShotDataset(season=season, shots=shots, provenance=_provenance())
