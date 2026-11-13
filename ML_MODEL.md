# Win probability model

CourtVision currently ships a transparent deterministic baseline for interface development. It is explicitly returned with `is_validated: false` and must not be described as an NBA prediction model.

## Target production pipeline

### Unit of observation

One row per normalized play-by-play event. The target is whether the home team eventually wins.

### Timestamp-available features

- score differential;
- regulation/overtime seconds remaining;
- home/away possession or documented proxy;
- period and timeout state when reliably available;
- pregame team strength calculated strictly from games completed before tipoff;
- optional lineup features only when substitution ordering is reliable.

No final box-score value, future event, end-of-season rating, or corrected postgame field may enter a live feature row.

### Split

Use a chronological train/validation/test split by game date. All rows from one game belong to one partition. Hyperparameters and calibrators use validation only; the test set is opened once for the version report.

### Models

1. score/time logistic baseline;
2. regularized logistic regression with all approved features;
3. XGBoost candidate;
4. isotonic or sigmoid calibration fitted on validation predictions.

The boosted candidate ships only if it beats the appropriate baseline on held-out Brier score and log loss without unacceptable reliability degradation.

### Evaluation

- Brier score;
- log loss;
- calibration intercept/slope;
- reliability diagram by probability decile;
- performance by quarter and score margin;
- bootstrap confidence intervals by game, not event row.

### Artifacts

Each `MLModelVersion` records the training cutoff, feature schema, evaluation metrics, artifact URI, and active status. Joblib files are immutable and addressed by content hash. Deployment verifies the expected feature-schema hash before loading.

## Current baseline

`services/win_probability.py` uses a bounded logistic expression over score differential, time remaining, possession proxy, and fictional strength inputs. It exists to test API/UI contracts and replay behavior only. There is no performance claim because no licensed historical corpus has been trained or evaluated.
