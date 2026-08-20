from math import isclose

import pytest

from app.models.quant import (
    QuantitativeInputError,
    elo_expected,
    evaluate_decision,
    expected_value,
    fractional_kelly,
    poisson_dixon_coles,
    remove_overround,
)


def test_poisson_dixon_coles_matrix_is_normalised() -> None:
    matrix = poisson_dixon_coles(1.45, 1.10)
    assert isclose(sum(sum(row) for row in matrix.cells), 1.0, abs_tol=1e-9)
    assert isclose(matrix.home_win + matrix.draw + matrix.away_win, 1.0, abs_tol=1e-9)
    assert 0 < matrix.over_2_5 < 1
    assert 0 < matrix.btts < 1
    assert matrix.home_double_chance == pytest.approx(matrix.home_win + matrix.draw)
    assert matrix.under_2_5 == pytest.approx(1 - matrix.over_2_5)


def test_elo_home_advantage_increases_expected_score() -> None:
    assert elo_expected(1500, 1500, 55) > 0.5


def test_overround_and_ev() -> None:
    fair = remove_overround((2.0, 3.5, 4.0))
    assert isclose(sum(fair), 1.0)
    assert isclose(expected_value(0.75, 1.5), 0.125)


def test_invalid_odds_are_rejected() -> None:
    with pytest.raises(QuantitativeInputError):
        remove_overround((1.0, 2.0))


def test_fractional_kelly_is_capped() -> None:
    assert fractional_kelly(0.80, 2.0, fraction=0.25, cap=0.02) == 0.02


def test_no_bet_for_negative_value() -> None:
    decision = evaluate_decision(
        probability=0.60, offered_odds=1.20, reliability=90, agreement=90,
        completeness=98, freshness=98, lineup_certainty=90, uncertainty_width=0.05,
        unresolved_critical_intelligence=False,
    )
    assert decision.state == "NO_BET"
    assert "POOR_PRICE" in decision.reasons


def test_watch_when_waiting_for_lineups_and_price() -> None:
    decision = evaluate_decision(
        probability=0.55, offered_odds=None, reliability=80, agreement=80,
        completeness=90, freshness=90, lineup_certainty=40, uncertainty_width=0.10,
        unresolved_critical_intelligence=False,
    )
    assert decision.state == "WATCH"
    assert {"LINEUPS_UNCERTAIN", "PRICE_REQUIRED"}.issubset(decision.reasons)
