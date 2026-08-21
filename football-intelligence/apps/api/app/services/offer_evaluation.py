from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from math import isfinite

from app.models.market import PriceFreshness, price_freshness
from app.models.quant import DecisionEvaluation, QuantitativeInputError, evaluate_decision, fractional_kelly
from app.schemas import FixtureSummary


CONFIGURED_TAX_RATE = 0.15
MANUAL_PRICE_TTL_SECONDS = 300
TAX_POLICY_LABEL = "configured 15% demo net-winnings tax rule"


@dataclass(frozen=True)
class ManualOfferEvaluation:
    decision: DecisionEvaluation
    price: PriceFreshness
    suggested_stake_fraction: float


@dataclass(frozen=True)
class PotentialPayout:
    stake_ugx: float
    decimal_odds: float
    gross_return_ugx: float
    gross_profit_ugx: float
    estimated_tax_ugx: float
    potential_net_return_ugx: float
    potential_net_profit_ugx: float


def evaluate_manual_offer(
    fixture: FixtureSummary,
    *,
    decimal_odds: float,
    weekly_bankroll_ugx: float,
    fractional_kelly_fraction: float,
    observed_at: datetime | None = None,
    now: datetime | None = None,
) -> ManualOfferEvaluation:
    """Evaluate a manually observed price without contacting any bookmaker."""
    prediction = fixture.prediction
    price = price_freshness(
        observed_at or now or datetime.now(UTC),
        ttl_seconds=MANUAL_PRICE_TTL_SECONDS,
        now=now,
    )
    conservative_probability = prediction.conservative_probability or prediction.probability
    decision = evaluate_decision(
        probability=prediction.final_calibrated_probability or prediction.probability,
        offered_odds=decimal_odds,
        reliability=prediction.reliability,
        agreement=prediction.agreement,
        completeness=fixture.data_health.completeness,
        freshness=fixture.data_health.freshness,
        lineup_certainty=42,
        uncertainty_width=prediction.uncertainty_high - prediction.uncertainty_low,
        unresolved_critical_intelligence=False,
        conservative_probability=conservative_probability,
        tax_rate=CONFIGURED_TAX_RATE,
        price_current=price.is_current,
    )
    suggested_stake_fraction = fractional_kelly(
        conservative_probability,
        decimal_odds,
        fractional_kelly_fraction,
    )
    return ManualOfferEvaluation(
        decision=decision,
        price=price,
        suggested_stake_fraction=suggested_stake_fraction,
    )


def calculate_potential_payout(*, stake_ugx: float, decimal_odds: float) -> PotentialPayout:
    """Calculate a hypothetical payout using the configured tax policy.

    This is intentionally separate from expected value: it describes what a manual
    winning ticket could return, not a predicted or guaranteed outcome.
    """
    if not isfinite(stake_ugx) or stake_ugx <= 0:
        raise QuantitativeInputError("Stake must be a positive finite amount.")
    if not isfinite(decimal_odds) or decimal_odds <= 1:
        raise QuantitativeInputError("Decimal odds must be greater than one.")
    gross_return = stake_ugx * decimal_odds
    gross_profit = gross_return - stake_ugx
    estimated_tax = gross_profit * CONFIGURED_TAX_RATE
    potential_net_return = gross_return - estimated_tax
    return PotentialPayout(
        stake_ugx=stake_ugx,
        decimal_odds=decimal_odds,
        gross_return_ugx=gross_return,
        gross_profit_ugx=gross_profit,
        estimated_tax_ugx=estimated_tax,
        potential_net_return_ugx=potential_net_return,
        potential_net_profit_ugx=potential_net_return - stake_ugx,
    )
