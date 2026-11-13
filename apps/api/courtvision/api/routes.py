from typing import Annotated, cast

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from courtvision.providers.base import BasketballDataProvider
from courtvision.schemas import (
    AnalystAnswer,
    AnalystQuestion,
    Citation,
    FeatureVector,
    GameDetail,
    GamePage,
    PlayerPage,
    PlayerProfile,
    ShotDataset,
    WinProbability,
)
from courtvision.services.win_probability import baseline_probability

router = APIRouter(prefix="/api/v1")


def provider(request: Request) -> BasketballDataProvider:
    return cast(BasketballDataProvider, request.app.state.provider)


Provider = Annotated[BasketballDataProvider, Depends(provider)]


@router.get("/players", response_model=PlayerPage)
async def list_players(
    data: Provider,
    q: str | None = Query(default=None, max_length=100),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
) -> PlayerPage:
    return await data.players(q, page, page_size)


@router.get("/players/{player_id}", response_model=PlayerProfile)
async def get_player(player_id: str, data: Provider, season: str = "2025-26") -> PlayerProfile:
    result = await data.player(player_id, season)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Player not found")
    return result


@router.get("/games", response_model=GamePage)
async def list_games(
    data: Provider,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=24, ge=1, le=100),
) -> GamePage:
    return await data.games(page, page_size)


@router.get("/games/{game_id}", response_model=GameDetail)
async def get_game(game_id: str, data: Provider) -> GameDetail:
    result = await data.game(game_id)
    if not result:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Game not found")
    return result


@router.get("/shots", response_model=ShotDataset)
async def list_shots(
    data: Provider, player_id: str | None = None, season: str = "2025-26"
) -> ShotDataset:
    return await data.shots(player_id, season)


@router.post("/predictions/baseline", response_model=WinProbability)
async def predict_baseline(features: FeatureVector) -> WinProbability:
    return baseline_probability(features)


@router.post("/insights/query", response_model=AnalystAnswer)
async def query_analyst(question: AnalystQuestion, data: Provider) -> AnalystAnswer:
    if not data.is_demo:
        raise HTTPException(status_code=501, detail="Agent integration is not configured")
    profile = await data.player(question.player_ids[0] if question.player_ids else "p-miles-avery", question.season)
    if not profile:
        raise HTTPException(status_code=404, detail="Requested context was not found")
    points = next(metric for metric in profile.metrics if metric.key == "ppg")
    efficiency = next(metric for metric in profile.metrics if metric.key == "ts")
    return AnalystAnswer(
        answer=(
            f"In the deterministic demo dataset, {profile.name} combines a high scoring load "
            f"({points.value:.1f} points per game) with {efficiency.value:.1f}% true shooting."
        ),
        facts=[
            Citation(label="Points per game", value=f"{points.value:.1f}", sample_size=f"{profile.games_played} games"),
            Citation(label="True shooting", value=f"{efficiency.value:.1f}%", sample_size=f"{profile.games_played} games"),
        ],
        interpretation="The efficiency result appears to come from a strong rim and three-point profile; this is interpretation, not an observed causal claim.",
        season=profile.season,
        is_demo=True,
        limitations=["Synthetic fixture data", "No external model call", "Not representative of an NBA player"],
    )
