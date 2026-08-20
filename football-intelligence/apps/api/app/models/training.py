from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Sequence

import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, log_loss

from app.ingestion.quality import assert_point_in_time


@dataclass(frozen=True)
class TrainingRow:
    fixture_at: datetime
    feature_at: datetime
    features: tuple[float, ...]
    target_home_win: int


@dataclass(frozen=True)
class TrainedBaseline:
    model: CalibratedClassifierCV
    brier_score: float
    log_loss_score: float
    train_size: int
    validation_size: int


def train_chronological_baseline(rows: Sequence[TrainingRow], cutoff: datetime) -> TrainedBaseline:
    if len(rows) < 30:
        raise ValueError("At least 30 chronologically valid rows are required for a baseline model.")
    for row in rows:
        assert_point_in_time(row.feature_at, row.fixture_at)
    ordered = sorted(rows, key=lambda row: row.fixture_at)
    train = [row for row in ordered if row.fixture_at < cutoff]
    validation = [row for row in ordered if row.fixture_at >= cutoff]
    if len(train) < 20 or len(validation) < 10:
        raise ValueError("Chronological split needs at least 20 train and 10 validation records.")
    train_x = np.asarray([row.features for row in train])
    train_y = np.asarray([row.target_home_win for row in train])
    valid_x = np.asarray([row.features for row in validation])
    valid_y = np.asarray([row.target_home_win for row in validation])
    if len(np.unique(train_y)) < 2:
        raise ValueError("Training data needs both classes.")
    calibrated = CalibratedClassifierCV(LogisticRegression(max_iter=2000, class_weight="balanced"), method="sigmoid", cv=3)
    calibrated.fit(train_x, train_y)
    probabilities = calibrated.predict_proba(valid_x)[:, 1]
    return TrainedBaseline(
        model=calibrated,
        brier_score=float(brier_score_loss(valid_y, probabilities)),
        log_loss_score=float(log_loss(valid_y, probabilities, labels=[0, 1])),
        train_size=len(train), validation_size=len(validation),
    )


if __name__ == "__main__":
    print("Training requires timestamp-safe rows supplied by the ingestion repository.")

