def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["provider"] == "demo"


def test_players_are_labeled_demo_data(client):
    response = client.get("/api/v1/players")
    assert response.status_code == 200
    payload = response.json()
    assert payload["meta"]["total"] == 6
    assert payload["provenance"]["is_demo"] is True


def test_player_search_and_profile(client):
    response = client.get("/api/v1/players", params={"q": "Avery"})
    assert [player["name"] for player in response.json()["data"]] == ["Miles Avery"]
    profile = client.get("/api/v1/players/p-miles-avery")
    assert profile.status_code == 200
    assert profile.json()["metrics"][3]["key"] == "ts"


def test_missing_player_is_404(client):
    assert client.get("/api/v1/players/missing").status_code == 404


def test_replay_events_are_ordered(client):
    response = client.get("/api/v1/games/game-orb-pin-001")
    assert response.status_code == 200
    events = response.json()["events"]
    assert [event["sequence"] for event in events] == sorted(event["sequence"] for event in events)
    assert events[-1]["home_win_probability"] == 1


def test_shots_are_deterministic(client):
    first = client.get("/api/v1/shots", params={"player_id": "p-miles-avery"}).json()
    second = client.get("/api/v1/shots", params={"player_id": "p-miles-avery"}).json()
    assert first["shots"] == second["shots"]
    assert len(first["shots"]) == 72


def test_analyst_separates_facts_and_interpretation(client):
    response = client.post(
        "/api/v1/insights/query",
        json={"question": "What drives this scoring profile?", "player_ids": ["p-miles-avery"]},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["facts"]
    assert payload["interpretation"]
    assert payload["is_demo"] is True
