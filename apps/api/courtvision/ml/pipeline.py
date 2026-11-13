from dataclasses import dataclass

import numpy as np
import pandas as pd
from sklearn.metrics import brier_score_loss, log_loss

FEATURE_COLUMNS = [
    "score_differential",
    "seconds_remaining",
    "possession_home",
    "home_strength",
    "away_strength",
]
REQUIRED_COLUMNS = ["game_id", "game_date", "home_won", *FEATURE_COLUMNS]


@dataclass(frozen=True)
class DatasetSplit:
    train: pd.DataFrame
    validation: pd.DataFrame
    test: pd.DataFrame


def validate_training_frame(frame: pd.DataFrame) -> pd.DataFrame:
    missing = sorted(set(REQUIRED_COLUMNS) - set(frame.columns))
    if missing:
        raise ValueError(f"Missing required training columns: {', '.join(missing)}")
    if frame.empty:
        raise ValueError("Training frame is empty")

    validated = frame.copy()
    validated["game_date"] = pd.to_datetime(validated["game_date"], utc=True, errors="raise")
    if not validated["home_won"].isin([0, 1, False, True]).all():
        raise ValueError("home_won must be binary")
    if (validated["seconds_remaining"] < 0).any() or (validated["seconds_remaining"] > 3600).any():
        raise ValueError("seconds_remaining must be between 0 and 3600")
    if validated[FEATURE_COLUMNS].isnull().any().any():
        raise ValueError("Approved features may not contain null values")
    return validated.sort_values(["game_date", "game_id"], kind="stable").reset_index(drop=True)


def chronological_game_split(
    frame: pd.DataFrame, train_fraction: float = 0.7, validation_fraction: float = 0.15
) -> DatasetSplit:
    if not 0 < train_fraction < 1 or not 0 < validation_fraction < 1:
        raise ValueError("Split fractions must be between zero and one")
    if train_fraction + validation_fraction >= 1:
        raise ValueError("Train and validation fractions must leave a test partition")

    validated = validate_training_frame(frame)
    games = validated[["game_id", "game_date"]].drop_duplicates("game_id").sort_values("game_date")
    if len(games) < 3:
        raise ValueError("At least three games are required for chronological splitting")
    train_end = max(1, int(len(games) * train_fraction))
    validation_end = max(train_end + 1, int(len(games) * (train_fraction + validation_fraction)))
    validation_end = min(validation_end, len(games) - 1)
    train_ids = set(games.iloc[:train_end]["game_id"])
    validation_ids = set(games.iloc[train_end:validation_end]["game_id"])
    test_ids = set(games.iloc[validation_end:]["game_id"])
    return DatasetSplit(
        train=validated[validated["game_id"].isin(train_ids)].copy(),
        validation=validated[validated["game_id"].isin(validation_ids)].copy(),
        test=validated[validated["game_id"].isin(test_ids)].copy(),
    )


def evaluate_probabilities(labels: pd.Series | np.ndarray, probabilities: np.ndarray) -> dict[str, float]:
    values = np.asarray(probabilities, dtype=float)
    if np.isnan(values).any() or (values < 0).any() or (values > 1).any():
        raise ValueError("Probabilities must be finite values between zero and one")
    return {
        "brier_score": round(float(brier_score_loss(labels, values)), 6),
        "log_loss": round(float(log_loss(labels, values, labels=[0, 1])), 6),
    }
