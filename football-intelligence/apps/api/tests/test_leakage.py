from datetime import UTC, datetime, timedelta

import pytest

from app.ingestion.quality import LeakageDetected, assert_point_in_time, data_freshness_score
from app.models.backtesting import BacktestRow, walk_forward


def test_feature_from_future_is_critical_leakage() -> None:
    prediction_at = datetime(2026, 8, 21, tzinfo=UTC)
    with pytest.raises(LeakageDetected):
        assert_point_in_time(prediction_at + timedelta(seconds=1), prediction_at)


def test_freshness_score_uses_point_in_time_data() -> None:
    prediction_at = datetime(2026, 8, 21, tzinfo=UTC)
    assert data_freshness_score(prediction_at - timedelta(minutes=10), prediction_at, 3600) > 80


def test_walk_forward_rejects_future_feature() -> None:
    fixture_at = datetime(2026, 8, 21, tzinfo=UTC)
    row = BacktestRow(
        fixture_at=fixture_at, feature_at=fixture_at + timedelta(minutes=1),
        probability=0.6, outcome=1, placed_odds=2.0, closing_odds=1.9,
    )
    with pytest.raises(LeakageDetected):
        walk_forward([row], lambda value: value.probability)

