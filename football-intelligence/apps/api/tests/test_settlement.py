import pytest

from app.models.settlement import settle_full_time, void_settlement


def test_1x2_uses_regulation_time_result_and_withholds_tax_once() -> None:
    settlement = settle_full_time(
        market="1X2", selection="HOME", decimal_odds=2.0, stake=100,
        home_goals=2, away_goals=1, tax_rate=0.15,
    )
    assert settlement.outcome == "WIN"
    assert settlement.gross_payout == 200
    assert settlement.tax_withheld == 15
    assert settlement.net_payout == 185
    assert settlement.net_profit == 85


def test_draw_no_bet_pushes_and_btts_settles() -> None:
    dnb = settle_full_time(market="DNB", selection="HOME", decimal_odds=1.8, stake=100, home_goals=1, away_goals=1)
    btts = settle_full_time(market="BTTS", selection="NO", decimal_odds=1.9, stake=100, home_goals=0, away_goals=2)
    assert dnb.outcome == "PUSH"
    assert dnb.net_payout == 100
    assert btts.outcome == "WIN"


def test_asian_quarter_lines_return_half_win_and_half_loss() -> None:
    half_win = settle_full_time(
        market="ASIAN_HANDICAP", selection="HOME -0.75", decimal_odds=2.0, stake=100, home_goals=1, away_goals=0,
    )
    half_loss = settle_full_time(
        market="ASIAN_TOTALS", selection="OVER 2.25", decimal_odds=2.0, stake=100, home_goals=1, away_goals=1,
    )
    assert half_win.outcome == "HALF_WIN"
    assert half_win.gross_payout == 150
    assert half_loss.outcome == "HALF_LOSS"
    assert half_loss.gross_payout == 50


def test_standard_over_under_and_void_are_explicit() -> None:
    total = settle_full_time(market="OVER_UNDER", selection="UNDER 2.5", decimal_odds=1.8, stake=100, home_goals=1, away_goals=1)
    void = void_settlement(market="1X2", selection="HOME", stake=100, rule_version="operator-v1")
    assert total.outcome == "WIN"
    assert void.outcome == "VOID"
    assert void.net_profit == 0
