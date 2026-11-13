def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["provider"] == "nba_snapshot"


def test_players_are_real_nba_data(client):
    response = client.get("/api/v1/players")
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["total"] >= 500
    assert payload["provenance"]["is_demo"] is False


def test_player_search_and_profile(client):
    response = client.get("/api/v1/players", params={"q": "Luka Dončić"})
    assert [player["name"] for player in response.json()["data"]] == ["Luka Dončić"]
    profile = client.get("/api/v1/players/1629029")
    assert profile.status_code == 200
    assert profile.json()["metrics"][3]["key"] == "ts"


def test_missing_player_is_404(client):
    assert client.get("/api/v1/players/missing").status_code == 404


def test_replay_events_are_ordered(client):
    game_id = client.get("/api/v1/games").json()["data"][0]["id"]
    response = client.get(f"/api/v1/games/{game_id}")
    assert response.status_code == 200
    events = response.json()["events"]
    assert [event["sequence"] for event in events] == sorted(event["sequence"] for event in events)
    assert events == []


def test_shots_are_real_and_stable(client):
    first = client.get("/api/v1/shots", params={"player_id": "1629029"}).json()
    second = client.get("/api/v1/shots", params={"player_id": "1629029"}).json()
    assert first["shots"] == second["shots"]
    assert len(first["shots"]) > 200
    assert first["provenance"]["is_demo"] is False


def test_analyst_separates_facts_and_interpretation(client):
    response = client.post(
        "/api/v1/insights/query",
        json={"question": "What drives this scoring profile?", "player_ids": ["1629029"]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["facts"]
    assert payload["interpretation"]
    assert payload["is_demo"] is False
