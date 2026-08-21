from __future__ import annotations

import re
from dataclasses import dataclass

from app.models.quant import QuantitativeInputError
from app.schemas import FixtureSummary
from app.services.offer_evaluation import (
    TAX_POLICY_LABEL,
    calculate_potential_payout,
    evaluate_manual_offer,
)


_ODDS_PATTERN = re.compile(r"\b(?:at|odds?\s*(?:of|is|=)?|@)\s*([1-9]\d*(?:\.\d+)?)\b", re.IGNORECASE)
_UGX_PREFIX_PATTERN = re.compile(r"\b(?:ugx|ush|shs)\s*([0-9][0-9,]*(?:\.\d+)?)\b", re.IGNORECASE)
_UGX_SUFFIX_PATTERN = re.compile(r"\b([0-9][0-9,]*(?:\.\d+)?)\s*(?:ugx|ush|shs)\b", re.IGNORECASE)


@dataclass(frozen=True)
class AssistantResult:
    answer: str
    facts: tuple[str, ...]
    decision: str | None
    reasons: tuple[str, ...]
    calculation: dict[str, float] | None = None
    data_status: str = "DEMO_ONLY"


def _read_odds(question: str) -> float | None:
    match = _ODDS_PATTERN.search(question)
    if not match:
        return None
    value = float(match.group(1))
    return value if value > 1 else None


def _read_stake(question: str) -> float | None:
    match = _UGX_PREFIX_PATTERN.search(question) or _UGX_SUFFIX_PATTERN.search(question)
    return float(match.group(1).replace(",", "")) if match else None


def _money(value: float) -> str:
    return f"UGX {value:,.0f}"


def _price_answer(fixture: FixtureSummary, decimal_odds: float, stake_ugx: float | None, weekly_bankroll_ugx: float) -> AssistantResult:
    evaluation = evaluate_manual_offer(
        fixture,
        decimal_odds=decimal_odds,
        weekly_bankroll_ugx=weekly_bankroll_ugx,
        fractional_kelly_fraction=0.10,
    )
    result = evaluation.decision
    facts = [
        f"Current fixture: {fixture.home_team} vs {fixture.away_team} (DEMO data).",
        f"Manual price entered: {decimal_odds:.2f}; it is evaluated locally and no bookmaker is contacted.",
        f"System state: {result.state}. Minimum acceptable odds: {result.minimum_acceptable_odds:.2f}." if result.minimum_acceptable_odds else "No current price threshold is available.",
        f"Conservative net EV: {(result.conservative_net_expected_value or 0) * 100:+.1f}% using the {TAX_POLICY_LABEL}.",
    ]
    calculation: dict[str, float] = {
        "decimal_odds": decimal_odds,
        "net_expected_value_percent": round((result.net_expected_value or 0) * 100, 1),
        "conservative_net_expected_value_percent": round((result.conservative_net_expected_value or 0) * 100, 1),
        "minimum_acceptable_odds": round(result.minimum_acceptable_odds or 0, 3),
        "suggested_max_stake_ugx": round(weekly_bankroll_ugx * evaluation.suggested_stake_fraction, 0),
    }
    payout_sentence = ""
    if stake_ugx is not None:
        payout = calculate_potential_payout(stake_ugx=stake_ugx, decimal_odds=decimal_odds)
        conservative_ev = result.conservative_net_expected_value or 0
        expected_net_profit = stake_ugx * conservative_ev
        expected_net_return = stake_ugx + expected_net_profit
        calculation.update({
            "stake_ugx": stake_ugx,
            "gross_return_ugx": round(payout.gross_return_ugx, 2),
            "gross_profit_ugx": round(payout.gross_profit_ugx, 2),
            "estimated_tax_ugx": round(payout.estimated_tax_ugx, 2),
            "potential_net_return_ugx": round(payout.potential_net_return_ugx, 2),
            "potential_net_profit_ugx": round(payout.potential_net_profit_ugx, 2),
            "conservative_expected_net_return_ugx": round(expected_net_return, 2),
            "conservative_expected_net_profit_ugx": round(expected_net_profit, 2),
        })
        facts.extend((
            f"If a { _money(stake_ugx) } ticket wins, potential gross return is {_money(payout.gross_return_ugx)}.",
            f"Estimated tax is {_money(payout.estimated_tax_ugx)}; potential net return is {_money(payout.potential_net_return_ugx)}.",
            f"For the current demo selection only, conservative expected net return is {_money(expected_net_return)} (expected profit {_money(expected_net_profit)}).",
        ))
        payout_sentence = " Payout figures are hypothetical; expected figures only apply if this is the current terminal selection."
    answer = (
        f"At {decimal_odds:.2f}, the system marks this manual price {result.state}. "
        f"The decision is based on the current fixture gates, its conservative probability and the configured tax rule—not a claim that the price is live or guaranteed."
        f"{payout_sentence}"
    )
    return AssistantResult(answer, tuple(facts), result.state, result.reasons, calculation)


def answer_question(*, question: str, fixture: FixtureSummary, weekly_bankroll_ugx: float) -> AssistantResult:
    """Answer a limited set of football-intelligence questions without an LLM.

    The classification is intentionally explicit and conservative. Any request for a
    live fact receives an unavailable response until an authorised provider supplies it.
    """
    normalised = question.casefold().strip()
    decimal_odds = _read_odds(question)
    stake_ugx = _read_stake(question)

    if decimal_odds is not None:
        try:
            return _price_answer(fixture, decimal_odds, stake_ugx, weekly_bankroll_ugx)
        except QuantitativeInputError as error:
            return AssistantResult(str(error), (), None, ())

    if any(term in normalised for term in ("live", "happening", "score", "xg", "lineup", "injury", "injuries", "news today")):
        return AssistantResult(
            "Live data is unavailable. No authorised score, lineup, injury, odds or news provider is connected, so I will not invent an update.",
            (
                f"Fixture context: {fixture.home_team} vs {fixture.away_team}.",
                "Data status: DEMO / LIVE UNAVAILABLE.",
                "Connect an authorised provider before relying on live match information.",
            ),
            fixture.prediction.decision,
            tuple(fixture.prediction.reasons),
            data_status="LIVE_UNAVAILABLE",
        )

    if any(term in normalised for term in ("why", "explain", "watch", "no bet", "qualified", "decision")):
        return AssistantResult(
            f"The current decision is {fixture.prediction.decision}. It is waiting for stronger data and a current manually entered price before it can qualify anything.",
            (
                f"Reasons: {', '.join(fixture.prediction.reasons)}.",
                f"Reliability: {fixture.prediction.reliability:.0f}/100; data completeness: {fixture.data_health.completeness:.0f}%.",
                f"Conservative probability: {(fixture.prediction.conservative_probability or fixture.prediction.probability) * 100:.1f}%.",
                "This is deterministic DEMO data, not a live recommendation.",
            ),
            fixture.prediction.decision,
            tuple(fixture.prediction.reasons),
        )

    if any(term in normalised for term in ("best bet", "best bets", "week", "strongest", "recommend")):
        return AssistantResult(
            "There are no qualified opportunities. The system is intentionally abstaining until data, lineup and price gates pass.",
            (
                "Qualified opportunities: 0.",
                f"Watch list: {fixture.home_team} vs {fixture.away_team}.",
                "No fictional ranking is substituted for missing live data.",
            ),
            fixture.prediction.decision,
            tuple(fixture.prediction.reasons),
        )

    return AssistantResult(
        "I can explain the current decision, check a manual decimal price, calculate a hypothetical UGX payout, or state whether live information is available.",
        (
            "Try: “Why WATCH?”",
            "Try: “Arsenal at 2.20, UGX 10,000”.",
            "Try: “What is happening live?”",
            "All current fixture information is labelled DEMO until authorised providers are connected.",
        ),
        fixture.prediction.decision,
        tuple(fixture.prediction.reasons),
    )
