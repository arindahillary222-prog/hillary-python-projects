from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Sequence

from app.ingestion.quality import assert_point_in_time


@dataclass(frozen=True)
class BacktestRow:
    fixture_at: datetime
    feature_at: datetime
    probability: float
    outcome: int
    placed_odds: float | None
    closing_odds: float | None


def walk_forward(rows: Sequence[BacktestRow], scorer: Callable[[BacktestRow], float]) -> dict[str, float | int]:
    ordered = sorted(rows, key=lambda row: row.fixture_at)
    if not ordered:
        raise ValueError("Backtest rows are required.")
    brier = 0.0
    clv_values: list[float] = []
    for row in ordered:
        assert_point_in_time(row.feature_at, row.fixture_at)
        probability = scorer(row)
        if not 0 <= probability <= 1:
            raise ValueError("Scorer must return probability in [0, 1].")
        brier += (probability - row.outcome) ** 2
        if row.placed_odds and row.closing_odds:
            clv_values.append((row.placed_odds / row.closing_odds) - 1)
    return {"n": len(ordered), "brier_score": brier / len(ordered), "mean_clv": sum(clv_values) / len(clv_values) if clv_values else 0.0}


if __name__ == "__main__":
    print("Backtesting requires persisted point-in-time snapshots; random shuffling is prohibited.")

