import numpy as np
import pandas as pd
import pytest

from courtvision.ml.pipeline import (
    chronological_game_split,
    evaluate_probabilities,
    validate_training_frame,
)
from courtvision.ml.train import train


def training_frame(games: int = 10) -> pd.DataFrame:
    rows = []
    for game in range(games):
        for event in range(3):
            rows.append(
                {
                    "game_id": f"game-{game}",
                    "game_date": (
                        pd.Timestamp("2025-01-01") + pd.Timedelta(days=game)
                    ).date().isoformat(),
                    "home_won": game % 2,
                    "score_differential": event - 1,
                    "seconds_remaining": 1800 - event * 300,
                    "possession_home": event % 2 == 0,
                    "home_strength": .55,
                    "away_strength": .5,
                }
            )
    return pd.DataFrame(rows)


def test_split_is_chronological_and_keeps_games_together():
    split = chronological_game_split(training_frame())
    train_ids = set(split.train["game_id"])
    validation_ids = set(split.validation["game_id"])
    test_ids = set(split.test["game_id"])
    assert train_ids.isdisjoint(validation_ids | test_ids)
    assert validation_ids.isdisjoint(test_ids)
    assert split.train["game_date"].max() < split.validation["game_date"].min()
    assert split.validation["game_date"].max() < split.test["game_date"].min()


def test_validation_rejects_postgame_or_missing_shape():
    frame = training_frame()
    frame.loc[0, "seconds_remaining"] = -1
    with pytest.raises(ValueError, match="seconds_remaining"):
        validate_training_frame(frame)


def test_evaluation_returns_brier_and_log_loss():
    metrics = evaluate_probabilities(pd.Series([0, 1, 1, 0]), np.array([.1, .8, .7, .2]))
    assert metrics["brier_score"] == pytest.approx(.045)
    assert metrics["log_loss"] > 0


def test_evaluation_rejects_invalid_probabilities():
    with pytest.raises(ValueError, match="between zero and one"):
        evaluate_probabilities(pd.Series([0, 1]), np.array([-.1, 1.1]))


def test_training_writes_versioned_artifact_and_report(tmp_path):
    source = tmp_path / "events.csv"
    output = tmp_path / "artifacts"
    training_frame(games=70).to_csv(source, index=False)
    report = train(source, output)
    assert report["version"].startswith("wp-")
    assert report["games"] == {"train": 49, "validation": 10, "test": 11}
    assert (output / f"{report['version']}.joblib").exists()
    assert (output / f"{report['version']}.json").exists()
