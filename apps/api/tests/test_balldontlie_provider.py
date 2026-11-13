import httpx
import pytest

from courtvision.providers.balldontlie import BallDontLieProvider
from courtvision.providers.http import ResilientJSONClient


@pytest.mark.asyncio
async def test_free_provider_maps_players_games_and_unavailable_shots() -> None:
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "test-key"
        if request.url.path == "/v1/players":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 101,
                            "first_name": "A'ja",
                            "last_name": "Wilson",
                            "position": "F",
                            "jersey_number": "22",
                            "team": {
                                "id": 1,
                                "abbreviation": "LVA",
                                "city": "Las Vegas",
                                "name": "Aces",
                            },
                        }
                    ],
                    "meta": {"per_page": 25},
                },
            )
        if request.url.path == "/v1/games":
            return httpx.Response(
                200,
                json={
                    "data": [
                        {
                            "id": 9001,
                            "date": "2026-11-12",
                            "status": "Final",
                            "status_state": "final",
                            "home_team_score": 111,
                            "visitor_team_score": 104,
                            "home_team": {
                                "id": 1,
                                "abbreviation": "LAL",
                                "city": "Los Angeles",
                                "name": "Lakers",
                            },
                            "visitor_team": {
                                "id": 2,
                                "abbreviation": "GSW",
                                "city": "Golden State",
                                "name": "Warriors",
                            },
                        }
                    ],
                    "meta": {},
                },
            )
        raise AssertionError(f"unexpected request: {request.url}")

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler), base_url="https://provider.test"
    ) as client:
        provider = BallDontLieProvider(
            api_key="test-key", client=client, requests_per_minute=1_000_000
        )
        player_page = await provider.players(None, 1, 25)
        game_page = await provider.games(1, 25)
        shots = await provider.shots("101", "2026-27")

    assert player_page.data[0].name == "A'ja Wilson"
    assert player_page.provenance.is_demo is False
    assert game_page.data[0].home.score == 111
    assert game_page.data[0].status == "final"
    assert shots.available is False
    assert shots.shots == []


@pytest.mark.asyncio
async def test_json_client_honors_retry_after() -> None:
    responses = iter(
        [
            httpx.Response(429, headers={"Retry-After": "0"}),
            httpx.Response(200, json={"data": []}),
        ]
    )
    sleeps: list[float] = []

    def handler(_: httpx.Request) -> httpx.Response:
        return next(responses)

    async def no_sleep(seconds: float) -> None:
        sleeps.append(seconds)

    async with httpx.AsyncClient(
        transport=httpx.MockTransport(handler), base_url="https://provider.test"
    ) as client:
        api = ResilientJSONClient(
            api_key="test-key",
            base_url="https://provider.test",
            requests_per_minute=1_000_000,
            timeout_seconds=1,
            client=client,
            sleep=no_sleep,
        )
        payload = await api.get("/v1/games")

    assert payload == {"data": []}
    assert 0 in sleeps


def test_provider_maps_in_progress_status_to_live() -> None:
    assert BallDontLieProvider._game_status({"status_state": "in_progress"}) == "live"
