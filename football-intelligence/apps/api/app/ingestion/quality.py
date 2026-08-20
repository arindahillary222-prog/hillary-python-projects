from __future__ import annotations

from datetime import datetime
from typing import Iterable


class LeakageDetected(ValueError):
    """A critical guard: an event cannot be used before it existed."""


def assert_point_in_time(feature_timestamp: datetime, prediction_timestamp: datetime) -> None:
    if feature_timestamp.tzinfo is None or prediction_timestamp.tzinfo is None:
        raise LeakageDetected("All feature and prediction timestamps must be timezone-aware.")
    if feature_timestamp > prediction_timestamp:
        raise LeakageDetected("Critical temporal leakage: feature is newer than prediction timestamp.")


def data_freshness_score(observed_at: datetime, reference_at: datetime, max_age_seconds: int) -> float:
    assert_point_in_time(observed_at, reference_at)
    age = (reference_at - observed_at).total_seconds()
    return round(max(0.0, min(100.0, 100 * (1 - age / max_age_seconds))), 2)


def duplicate_keys(values: Iterable[str]) -> set[str]:
    seen: set[str] = set()
    duplicates: set[str] = set()
    for value in values:
        if value in seen:
            duplicates.add(value)
        seen.add(value)
    return duplicates

