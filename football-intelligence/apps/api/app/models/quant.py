from __future__ import annotations

from dataclasses import dataclass
from math import exp, factorial, isfinite
from statistics import fmean, pstdev
from typing import Iterable, Sequence


class QuantitativeInputError(ValueError):
    pass


@dataclass(frozen=True)
class ScoreMatrix:
    home_win: float
    draw: float
    away_win: float
    over_2_5: float
    under_2_5: float
    btts: float
    home_double_chance: float
    away_double_chance: float
    home_draw_no_bet: float
    away_draw_no_bet: float
    cells: tuple[tuple[float, ...], ...]


@dataclass(frozen=True)
class DecisionEvaluation:
    state: str
    reasons: tuple[str, ...]
    expected_value: float | None
    fair_odds: float | None
    opportunity_score: float


def _poisson(k: int, rate: float) -> float:
    if rate < 0 or not isfinite(rate):
        raise QuantitativeInputError("Goal intensity must be finite and non-negative.")
    return exp(-rate) * rate**k / factorial(k)


def _dixon_coles_tau(home_goals: int, away_goals: int, home_rate: float, away_rate: float, rho: float) -> float:
    if (home_goals, away_goals) == (0, 0):
        return 1 - (home_rate * away_rate * rho)
    if (home_goals, away_goals) == (0, 1):
        return 1 + (home_rate * rho)
    if (home_goals, away_goals) == (1, 0):
        return 1 + (away_rate * rho)
    if (home_goals, away_goals) == (1, 1):
        return 1 - rho
    return 1.0


def poisson_dixon_coles(home_rate: float, away_rate: float, rho: float = -0.08, max_goals: int = 10) -> ScoreMatrix:
    """Build a normalized, reproducible score matrix and derived core markets."""
    if max_goals < 4:
        raise QuantitativeInputError("max_goals must cover the requested goal markets.")
    cells: list[list[float]] = []
    for home_goals in range(max_goals + 1):
        row = []
        for away_goals in range(max_goals + 1):
            probability = _poisson(home_goals, home_rate) * _poisson(away_goals, away_rate)
            probability *= _dixon_coles_tau(home_goals, away_goals, home_rate, away_rate, rho)
            row.append(max(0.0, probability))
        cells.append(row)
    total = sum(sum(row) for row in cells)
    if total <= 0:
        raise QuantitativeInputError("Score matrix has no probability mass.")
    normalised = tuple(tuple(value / total for value in row) for row in cells)
    home_win = sum(normalised[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h > a)
    draw = sum(normalised[g][g] for g in range(max_goals + 1))
    away_win = sum(normalised[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h < a)
    over_2_5 = sum(normalised[h][a] for h in range(max_goals + 1) for a in range(max_goals + 1) if h + a >= 3)
    btts = sum(normalised[h][a] for h in range(1, max_goals + 1) for a in range(1, max_goals + 1))
    decisive_total = home_win + away_win
    return ScoreMatrix(
        home_win=home_win,
        draw=draw,
        away_win=away_win,
        over_2_5=over_2_5,
        under_2_5=1 - over_2_5,
        btts=btts,
        home_double_chance=home_win + draw,
        away_double_chance=away_win + draw,
        home_draw_no_bet=home_win / decisive_total,
        away_draw_no_bet=away_win / decisive_total,
        cells=normalised,
    )


def elo_expected(home_elo: float, away_elo: float, home_advantage: float = 55.0) -> float:
    return 1 / (1 + 10 ** ((away_elo - (home_elo + home_advantage)) / 400))


def remove_overround(decimal_odds: Sequence[float]) -> tuple[float, ...]:
    if len(decimal_odds) < 2 or any(not isfinite(odd) or odd <= 1 for odd in decimal_odds):
        raise QuantitativeInputError("Provide at least two finite decimal odds greater than one.")
    raw = [1 / odd for odd in decimal_odds]
    margin = sum(raw)
    return tuple(value / margin for value in raw)


def expected_value(probability: float, decimal_odds: float) -> float:
    if not 0 <= probability <= 1 or not isfinite(decimal_odds) or decimal_odds <= 1:
        raise QuantitativeInputError("Probability must be in [0, 1] and odds must be decimal odds above one.")
    return probability * decimal_odds - 1


def fair_odds(probability: float) -> float | None:
    return None if probability <= 0 else 1 / probability


def fractional_kelly(probability: float, decimal_odds: float, fraction: float = 0.10, cap: float = 0.02) -> float:
    if not 0 <= fraction <= 1 or not 0 <= cap <= 1:
        raise QuantitativeInputError("Kelly fraction and cap must be in [0, 1].")
    b = decimal_odds - 1
    full_kelly = ((b * probability) - (1 - probability)) / b
    return max(0.0, min(cap, full_kelly * fraction))


def model_agreement(probabilities: Iterable[float]) -> float:
    values = tuple(probabilities)
    if len(values) < 2 or any(not 0 <= value <= 1 for value in values):
        raise QuantitativeInputError("At least two probabilities in [0, 1] are required.")
    # A 0.25 population standard deviation is maximal practical disagreement.
    return max(0.0, min(100.0, 100 * (1 - (pstdev(values) / 0.25))))


def reliability_score(
    *, calibration: float, agreement: float, completeness: float, freshness: float,
    lineup_certainty: float, corroboration: float, stability: float, sample_size: float,
) -> float:
    values = (calibration, agreement, completeness, freshness, lineup_certainty, corroboration, stability, sample_size)
    if any(not 0 <= value <= 100 for value in values):
        raise QuantitativeInputError("Reliability components must be scored from 0 to 100.")
    weights = (0.20, 0.16, 0.16, 0.12, 0.12, 0.08, 0.08, 0.08)
    return round(sum(value * weight for value, weight in zip(values, weights, strict=True)), 2)


def evaluate_decision(
    *, probability: float, offered_odds: float | None, reliability: float, agreement: float,
    completeness: float, freshness: float, lineup_certainty: float, uncertainty_width: float,
    unresolved_critical_intelligence: bool, min_ev: float = 0.03, min_reliability: float = 70,
    min_agreement: float = 65, min_completeness: float = 80, min_freshness: float = 70,
    min_lineup_certainty: float = 55, max_uncertainty_width: float = 0.18,
) -> DecisionEvaluation:
    if not 0 < probability < 1:
        raise QuantitativeInputError("Decision probabilities must be strictly between zero and one.")
    reasons: list[str] = []
    watchable = False
    if completeness < min_completeness:
        reasons.append("INSUFFICIENT_DATA")
        watchable = True
    if freshness < min_freshness:
        reasons.append("STALE_DATA")
        watchable = True
    if lineup_certainty < min_lineup_certainty:
        reasons.append("LINEUPS_UNCERTAIN")
        watchable = True
    if unresolved_critical_intelligence:
        reasons.append("UNRESOLVED_INTELLIGENCE")
        watchable = True
    if agreement < min_agreement:
        reasons.append("MODELS_DISAGREE")
    if reliability < min_reliability:
        reasons.append("RELIABILITY_INADEQUATE")
    if uncertainty_width > max_uncertainty_width:
        reasons.append("UNCERTAINTY_TOO_WIDE")

    ev = None if offered_odds is None else expected_value(probability, offered_odds)
    if offered_odds is None:
        reasons.append("PRICE_REQUIRED")
        watchable = True
    elif ev < min_ev:
        reasons.append("POOR_PRICE")

    hard_fail = {"MODELS_DISAGREE", "RELIABILITY_INADEQUATE", "UNCERTAINTY_TOO_WIDE", "POOR_PRICE"}
    state = "QUALIFIED" if not reasons else ("WATCH" if watchable and not any(reason in hard_fail for reason in reasons) else "NO_BET")
    opportunity = max(0.0, min(100.0, (max(ev or 0, 0) * 400) + (reliability * 0.35) + (agreement * 0.15) + (completeness * 0.1)))
    return DecisionEvaluation(state, tuple(reasons), ev, fair_odds(probability), round(opportunity, 2))


def calibration_buckets(predictions: Sequence[float], outcomes: Sequence[int]) -> list[dict[str, float | int | str]]:
    if len(predictions) != len(outcomes):
        raise QuantitativeInputError("Predictions and outcomes must have the same length.")
    bins = [(0.50, 0.55), (0.55, 0.60), (0.60, 0.65), (0.65, 0.70), (0.70, 0.75), (0.75, 0.80), (0.80, 0.85), (0.85, 0.90), (0.90, 0.95), (0.95, 1.001)]
    result = []
    for lower, upper in bins:
        selected = [(p, y) for p, y in zip(predictions, outcomes, strict=True) if lower <= p < upper]
        if not selected:
            continue
        average_prediction = fmean(p for p, _ in selected)
        outcome_frequency = fmean(y for _, y in selected)
        result.append({"bucket": f"{lower:.0%}–{min(upper, 1):.0%}", "n": len(selected), "predicted": average_prediction, "actual": outcome_frequency, "gap": outcome_frequency - average_prediction})
    return result
