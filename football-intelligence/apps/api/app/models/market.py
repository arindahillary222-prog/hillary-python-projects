from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from math import isfinite, sqrt
from statistics import fmean, pstdev
from typing import Sequence

from app.models.quant import QuantitativeInputError


@dataclass(frozen=True)
class DevigResult:
    """A transparent comparison of multiple de-vigging assumptions."""

    multiplicative: tuple[float, ...]
    power: tuple[float, ...]
    shin: tuple[float, ...]
    additive: tuple[float, ...] | None
    method_dispersion: float


@dataclass(frozen=True)
class MarketQuote:
    probabilities: tuple[float, ...]
    calibration_score: float
    liquidity_score: float
    freshness_score: float
    sharpness_score: float
    margin: float


@dataclass(frozen=True)
class MarketConsensus:
    weighted: tuple[float, ...]
    unweighted: tuple[float, ...]
    source_count: int
    dispersion: float


@dataclass(frozen=True)
class TaxRule:
    jurisdiction: str
    rate: float
    effective_from: datetime
    effective_to: datetime | None = None
    tax_base: str = "NET_WINNINGS"
    source_reference: str | None = None

    def applies_at(self, when: datetime) -> bool:
        when = _as_utc(when)
        return when >= _as_utc(self.effective_from) and (self.effective_to is None or when < _as_utc(self.effective_to))


@dataclass(frozen=True)
class PriceFreshness:
    observed_at: datetime
    expires_at: datetime
    is_current: bool
    age_seconds: float


def _as_utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _validate_odds(decimal_odds: Sequence[float]) -> tuple[float, ...]:
    values = tuple(float(odd) for odd in decimal_odds)
    if len(values) < 2 or any(not isfinite(odd) or odd <= 1 for odd in values):
        raise QuantitativeInputError("Provide at least two finite decimal odds greater than one.")
    return values


def _normalise(values: Sequence[float]) -> tuple[float, ...]:
    total = sum(values)
    if total <= 0 or any(not isfinite(value) or value < 0 for value in values):
        raise QuantitativeInputError("Probabilities must have positive finite mass.")
    return tuple(value / total for value in values)


def devig_multiplicative(decimal_odds: Sequence[float]) -> tuple[float, ...]:
    odds = _validate_odds(decimal_odds)
    return _normalise(tuple(1 / odd for odd in odds))


def devig_power(decimal_odds: Sequence[float], *, tolerance: float = 1e-12) -> tuple[float, ...]:
    """Solve sum(implied_probability ** k) = 1 using a bounded bisection search."""
    odds = _validate_odds(decimal_odds)
    implied = tuple(1 / odd for odd in odds)
    if abs(sum(implied) - 1) <= tolerance:
        return implied
    lower, upper = 0.01, 16.0
    for _ in range(160):
        exponent = (lower + upper) / 2
        total = sum(value**exponent for value in implied)
        if total > 1:
            lower = exponent
        else:
            upper = exponent
    return _normalise(tuple(value ** ((lower + upper) / 2) for value in implied))


def devig_shin(decimal_odds: Sequence[float], *, tolerance: float = 1e-12) -> tuple[float, ...]:
    """Shin de-vigging with the insider parameter solved numerically.

    The formula is intentionally kept here, rather than hidden in a provider adapter,
    so a stored market probability can always be reproduced from stored odds.
    """
    odds = _validate_odds(decimal_odds)
    implied = tuple(1 / odd for odd in odds)
    overround = sum(implied)
    if abs(overround - 1) <= tolerance:
        return implied

    def probabilities(z: float) -> tuple[float, ...]:
        denominator = 2 * (1 - z)
        if denominator <= 0:
            return devig_multiplicative(odds)
        return tuple(
            (sqrt((z * z) + (4 * (1 - z) * ((value * value) / overround))) - z) / denominator
            for value in implied
        )

    lower, upper = 0.0, 0.999999
    for _ in range(160):
        z = (lower + upper) / 2
        if sum(probabilities(z)) > 1:
            lower = z
        else:
            upper = z
    result = probabilities((lower + upper) / 2)
    return _normalise(result)


def devig_additive(decimal_odds: Sequence[float]) -> tuple[float, ...] | None:
    """Return None when additive de-vigging would create an invalid probability."""
    odds = _validate_odds(decimal_odds)
    implied = tuple(1 / odd for odd in odds)
    adjustment = (sum(implied) - 1) / len(implied)
    adjusted = tuple(value - adjustment for value in implied)
    if any(value <= 0 for value in adjusted):
        return None
    return _normalise(adjusted)


def devig_all(decimal_odds: Sequence[float]) -> DevigResult:
    multiplicative = devig_multiplicative(decimal_odds)
    power = devig_power(decimal_odds)
    shin = devig_shin(decimal_odds)
    additive = devig_additive(decimal_odds)
    methods = (multiplicative, power, shin, *(() if additive is None else (additive,)))
    dispersion = max(pstdev(values) for values in zip(*methods, strict=True))
    return DevigResult(
        multiplicative=multiplicative,
        power=power,
        shin=shin,
        additive=additive,
        method_dispersion=round(dispersion, 8),
    )


def weighted_market_consensus(quotes: Sequence[MarketQuote]) -> MarketConsensus:
    if not quotes:
        raise QuantitativeInputError("At least one market quote is required.")
    selection_count = len(quotes[0].probabilities)
    if selection_count < 2 or any(len(quote.probabilities) != selection_count for quote in quotes):
        raise QuantitativeInputError("All market quotes must describe the same selections.")

    for quote in quotes:
        if any(not 0 <= value <= 1 for value in quote.probabilities) or abs(sum(quote.probabilities) - 1) > 1e-6:
            raise QuantitativeInputError("Each quote must contain a complete probability distribution.")
        scores = (quote.calibration_score, quote.liquidity_score, quote.freshness_score, quote.sharpness_score)
        if any(not 0 <= score <= 100 for score in scores) or not 0 <= quote.margin < 1:
            raise QuantitativeInputError("Market quote scores must be 0–100 and margin must be below one.")

    weights = tuple(
        max(0.0001, (quote.calibration_score / 100) * (quote.liquidity_score / 100) * (quote.freshness_score / 100)
            * (quote.sharpness_score / 100) / max(quote.margin, 0.005))
        for quote in quotes
    )
    weighted = _normalise(tuple(sum(quote.probabilities[index] * weight for quote, weight in zip(quotes, weights, strict=True)) for index in range(selection_count)))
    unweighted = _normalise(tuple(fmean(quote.probabilities[index] for quote in quotes) for index in range(selection_count)))
    dispersion = max(pstdev(quote.probabilities[index] for quote in quotes) for index in range(selection_count))
    return MarketConsensus(weighted=weighted, unweighted=unweighted, source_count=len(quotes), dispersion=round(dispersion, 8))


def residual_edge(football_model_probability: float, market_probability: float) -> float:
    if not 0 <= football_model_probability <= 1 or not 0 <= market_probability <= 1:
        raise QuantitativeInputError("Probabilities must be in [0, 1].")
    return football_model_probability - market_probability


def effective_decimal_odds(decimal_odds: float, tax_rate: float) -> float:
    if not isfinite(decimal_odds) or decimal_odds <= 1 or not 0 <= tax_rate < 1:
        raise QuantitativeInputError("Decimal odds must exceed one and tax rate must be in [0, 1).")
    return 1 + ((decimal_odds - 1) * (1 - tax_rate))


def net_expected_value(probability: float, decimal_odds: float, tax_rate: float) -> float:
    if not 0 <= probability <= 1:
        raise QuantitativeInputError("Probability must be in [0, 1].")
    return (probability * effective_decimal_odds(decimal_odds, tax_rate)) - 1


def minimum_acceptable_odds(probability: float, tax_rate: float, *, minimum_net_ev: float = 0.03) -> float:
    if not 0 < probability <= 1 or not 0 <= tax_rate < 1 or minimum_net_ev <= -1:
        raise QuantitativeInputError("Probability, tax rate, and minimum net EV are invalid.")
    return 1 + ((((1 + minimum_net_ev) / probability) - 1) / (1 - tax_rate))


def price_freshness(observed_at: datetime, *, ttl_seconds: int, now: datetime | None = None) -> PriceFreshness:
    if ttl_seconds <= 0:
        raise QuantitativeInputError("Price TTL must be positive.")
    reference = _as_utc(now or datetime.now(UTC))
    observed = _as_utc(observed_at)
    expires = observed + timedelta(seconds=ttl_seconds)
    age = max(0.0, (reference - observed).total_seconds())
    return PriceFreshness(observed_at=observed, expires_at=expires, is_current=reference <= expires, age_seconds=age)
