from courtvision.schemas import FeatureVector
from courtvision.services.win_probability import baseline_probability


def vector(score: int, seconds: int, possession: bool = True) -> FeatureVector:
    return FeatureVector(
        score_differential=score,
        seconds_remaining=seconds,
        possession_home=possession,
        home_strength=.55,
        away_strength=.5,
    )


def test_lead_increases_probability():
    assert baseline_probability(vector(8, 300)).home_win_probability > baseline_probability(vector(-8, 300)).home_win_probability


def test_same_lead_is_more_decisive_late():
    assert baseline_probability(vector(6, 30)).home_win_probability > baseline_probability(vector(6, 1800)).home_win_probability


def test_baseline_is_explicitly_unvalidated():
    result = baseline_probability(vector(0, 2880))
    assert result.is_validated is False
    assert "demo" in result.model
