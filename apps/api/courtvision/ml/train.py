import argparse
import hashlib
import json
from datetime import UTC, datetime
from pathlib import Path

import joblib
import pandas as pd
from sklearn.calibration import CalibratedClassifierCV
from sklearn.frozen import FrozenEstimator
from sklearn.linear_model import LogisticRegression

from courtvision.ml.pipeline import (
    FEATURE_COLUMNS,
    chronological_game_split,
    evaluate_probabilities,
)


def _artifact_version(source: Path, frame: pd.DataFrame) -> str:
    digest = hashlib.sha256()
    digest.update(source.read_bytes())
    digest.update("|".join(FEATURE_COLUMNS).encode())
    digest.update(str(len(frame)).encode())
    return f"wp-{datetime.now(UTC):%Y%m%d}-{digest.hexdigest()[:10]}"


def train(input_path: Path, output_dir: Path) -> dict[str, object]:
    frame = pd.read_csv(input_path)
    split = chronological_game_split(frame)
    model = LogisticRegression(max_iter=1000, random_state=42)
    model.fit(split.train[FEATURE_COLUMNS], split.train["home_won"])
    calibrator = CalibratedClassifierCV(FrozenEstimator(model), method="sigmoid")
    calibrator.fit(split.validation[FEATURE_COLUMNS], split.validation["home_won"])

    baseline_probability = split.test["home_won"].mean()
    baseline_predictions = pd.Series(baseline_probability, index=split.test.index).to_numpy()
    predictions = calibrator.predict_proba(split.test[FEATURE_COLUMNS])[:, 1]
    baseline_metrics = evaluate_probabilities(split.test["home_won"], baseline_predictions)
    model_metrics = evaluate_probabilities(split.test["home_won"], predictions)
    version = _artifact_version(input_path, frame)
    report: dict[str, object] = {
        "version": version,
        "trained_at": datetime.now(UTC).isoformat(),
        "trained_through": split.train["game_date"].max().isoformat(),
        "features": FEATURE_COLUMNS,
        "rows": {"train": len(split.train), "validation": len(split.validation), "test": len(split.test)},
        "games": {
            "train": int(split.train["game_id"].nunique()),
            "validation": int(split.validation["game_id"].nunique()),
            "test": int(split.test["game_id"].nunique()),
        },
        "baseline": baseline_metrics,
        "model": model_metrics,
        "beats_baseline": (
            model_metrics["brier_score"] < baseline_metrics["brier_score"]
            and model_metrics["log_loss"] < baseline_metrics["log_loss"]
        ),
    }
    output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(calibrator, output_dir / f"{version}.joblib")
    (output_dir / f"{version}.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description="Train CourtVision's calibrated logistic baseline")
    parser.add_argument("--input", type=Path, required=True, help="Validated event-level CSV")
    parser.add_argument("--output", type=Path, default=Path("artifacts"))
    args = parser.parse_args()
    report = train(args.input, args.output)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
