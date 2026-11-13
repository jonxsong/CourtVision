import math

from courtvision.schemas import FeatureVector, WinProbability


def baseline_probability(features: FeatureVector) -> WinProbability:
    """Transparent demo baseline; not presented as a validated production model."""
    time_scale = max(0.25, math.sqrt(features.seconds_remaining / 2880))
    strength_edge = (features.home_strength - features.away_strength) * 2.4
    possession_edge = 0.35 if features.possession_home else -0.35
    logit = (features.score_differential / (6.5 * time_scale)) + strength_edge + possession_edge
    probability = 1 / (1 + math.exp(-max(-12, min(12, logit))))
    return WinProbability(
        home_win_probability=round(probability, 4),
        model="transparent-demo-baseline-v1",
        explanation=[
            f"Home score differential: {features.score_differential:+d}",
            f"Game time remaining: {features.seconds_remaining} seconds",
            "Possession proxy is included with a small fixed weight.",
            "Pregame strength contributes less than the live score as the game progresses.",
        ],
        is_validated=False,
    )
