from __future__ import annotations

from dataclasses import dataclass
from math import isfinite

from app.models.market import effective_decimal_odds
from app.models.quant import QuantitativeInputError


@dataclass(frozen=True)
class Settlement:
    market: str
    selection: str
    outcome: str
    gross_payout: float
    tax_withheld: float
    net_payout: float
    net_profit: float
    rule_version: str


def _validate_inputs(decimal_odds: float, stake: float, home_goals: int, away_goals: int) -> None:
    if not isfinite(decimal_odds) or decimal_odds <= 1 or not isfinite(stake) or stake <= 0:
        raise QuantitativeInputError("Stake must be positive and decimal odds must exceed one.")
    if home_goals < 0 or away_goals < 0:
        raise QuantitativeInputError("Goals must be non-negative.")


def _outcome_from_result(result: float) -> str:
    if result > 1e-9:
        return "WIN"
    if result < -1e-9:
        return "LOSS"
    return "PUSH"


def _split_asian_line(line: float) -> tuple[float, ...]:
    quarter = round(line * 4)
    if abs((line * 4) - quarter) > 1e-8:
        raise QuantitativeInputError("Asian lines must be in quarter-goal increments.")
    if abs(quarter) % 2 == 1:
        lower = (quarter - 1) / 4
        upper = (quarter + 1) / 4
        return lower, upper
    return (line,)


def _settle_parts(part_outcomes: tuple[str, ...], decimal_odds: float, stake: float, tax_rate: float) -> tuple[str, float, float, float, float]:
    part_stake = stake / len(part_outcomes)
    gross_payout = sum(
        part_stake * decimal_odds if outcome == "WIN" else part_stake if outcome == "PUSH" else 0
        for outcome in part_outcomes
    )
    if part_outcomes == ("WIN",):
        label = "WIN"
    elif part_outcomes == ("LOSS",):
        label = "LOSS"
    elif part_outcomes == ("PUSH",):
        label = "PUSH"
    elif all(outcome in {"WIN", "PUSH"} for outcome in part_outcomes):
        label = "HALF_WIN"
    elif all(outcome in {"LOSS", "PUSH"} for outcome in part_outcomes):
        label = "HALF_LOSS"
    else:
        label = "SPLIT"
    taxable_winnings = max(0.0, gross_payout - stake)
    tax = taxable_winnings * tax_rate
    net_payout = gross_payout - tax
    return label, gross_payout, tax, net_payout, net_payout - stake


def _finish(*, market: str, selection: str, part_outcomes: tuple[str, ...], decimal_odds: float, stake: float, tax_rate: float, rule_version: str) -> Settlement:
    outcome, gross_payout, tax, net_payout, net_profit = _settle_parts(part_outcomes, decimal_odds, stake, tax_rate)
    return Settlement(
        market=market,
        selection=selection,
        outcome=outcome,
        gross_payout=round(gross_payout, 2),
        tax_withheld=round(tax, 2),
        net_payout=round(net_payout, 2),
        net_profit=round(net_profit, 2),
        rule_version=rule_version,
    )


def void_settlement(*, market: str, selection: str, stake: float, rule_version: str) -> Settlement:
    if not isfinite(stake) or stake <= 0:
        raise QuantitativeInputError("Stake must be positive.")
    return Settlement(market, selection, "VOID", round(stake, 2), 0.0, round(stake, 2), 0.0, rule_version)


def settle_full_time(
    *, market: str, selection: str, decimal_odds: float, stake: float, home_goals: int,
    away_goals: int, tax_rate: float = 0.15, rule_version: str = "standard-90-min-v1", void: bool = False,
) -> Settlement:
    """Settle standard regulation-time football markets, including Asian quarter lines.

    Extra time is deliberately excluded. Callers must select a distinct rule version if
    an operator's market includes extra time; this function must not infer it.
    """
    _validate_inputs(decimal_odds, stake, home_goals, away_goals)
    if not 0 <= tax_rate < 1:
        raise QuantitativeInputError("Tax rate must be in [0, 1).")
    if void:
        return void_settlement(market=market, selection=selection, stake=stake, rule_version=rule_version)

    market_key = market.upper().replace(" ", "_")
    selection_key = selection.upper().replace(" ", "_")
    goal_difference = home_goals - away_goals
    total_goals = home_goals + away_goals

    if market_key == "1X2":
        mapping = {"HOME": goal_difference > 0, "DRAW": goal_difference == 0, "AWAY": goal_difference < 0}
        if selection_key not in mapping:
            raise QuantitativeInputError("1X2 selection must be HOME, DRAW, or AWAY.")
        return _finish(market=market, selection=selection, part_outcomes=("WIN" if mapping[selection_key] else "LOSS",), decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    if market_key in {"DOUBLE_CHANCE", "DOUBLECHANCE"}:
        mapping = {"1X": goal_difference >= 0, "X2": goal_difference <= 0, "12": goal_difference != 0}
        if selection_key not in mapping:
            raise QuantitativeInputError("Double Chance selection must be 1X, X2, or 12.")
        return _finish(market=market, selection=selection, part_outcomes=("WIN" if mapping[selection_key] else "LOSS",), decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    if market_key in {"DRAW_NO_BET", "DNB"}:
        if selection_key not in {"HOME", "AWAY"}:
            raise QuantitativeInputError("Draw No Bet selection must be HOME or AWAY.")
        result = goal_difference if selection_key == "HOME" else -goal_difference
        return _finish(market=market, selection=selection, part_outcomes=(_outcome_from_result(result),), decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    if market_key in {"BTTS", "BOTH_TEAMS_TO_SCORE"}:
        if selection_key not in {"YES", "NO"}:
            raise QuantitativeInputError("BTTS selection must be YES or NO.")
        both_scored = home_goals > 0 and away_goals > 0
        won = both_scored if selection_key == "YES" else not both_scored
        return _finish(market=market, selection=selection, part_outcomes=("WIN" if won else "LOSS",), decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    if market_key in {"OVER_UNDER", "TOTALS", "ASIAN_TOTALS"}:
        direction, line = _parse_total_selection(selection)
        outcomes = tuple(_outcome_from_result((total_goals - split_line) if direction == "OVER" else (split_line - total_goals)) for split_line in _split_asian_line(line))
        return _finish(market=market, selection=selection, part_outcomes=outcomes, decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    if market_key in {"ASIAN_HANDICAP", "HANDICAP"}:
        team, handicap = _parse_handicap_selection(selection)
        team_result = goal_difference if team == "HOME" else -goal_difference
        outcomes = tuple(_outcome_from_result(team_result + split_handicap) for split_handicap in _split_asian_line(handicap))
        return _finish(market=market, selection=selection, part_outcomes=outcomes, decimal_odds=decimal_odds, stake=stake, tax_rate=tax_rate, rule_version=rule_version)

    raise QuantitativeInputError(f"Unsupported settlement market: {market}.")


def _parse_total_selection(selection: str) -> tuple[str, float]:
    parts = selection.upper().replace("_", " ").split()
    if len(parts) != 2 or parts[0] not in {"OVER", "UNDER"}:
        raise QuantitativeInputError("Totals selection must be formatted as 'OVER 2.5' or 'UNDER 2.25'.")
    try:
        return parts[0], float(parts[1])
    except ValueError as error:
        raise QuantitativeInputError("Totals line must be numeric.") from error


def _parse_handicap_selection(selection: str) -> tuple[str, float]:
    parts = selection.upper().replace("_", " ").split()
    if len(parts) != 2 or parts[0] not in {"HOME", "AWAY"}:
        raise QuantitativeInputError("Handicap selection must be formatted as 'HOME -0.25' or 'AWAY +1.5'.")
    try:
        return parts[0], float(parts[1])
    except ValueError as error:
        raise QuantitativeInputError("Handicap line must be numeric.") from error
