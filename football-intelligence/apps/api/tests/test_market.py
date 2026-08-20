from datetime import UTC, datetime, timedelta
from math import isclose

import pytest

from app.models.market import (
    MarketQuote,
    TaxRule,
    devig_all,
    effective_decimal_odds,
    minimum_acceptable_odds,
    net_expected_value,
    price_freshness,
    weighted_market_consensus,
)
from app.models.quant import QuantitativeInputError


def test_all_devig_methods_produce_complete_distributions() -> None:
    result = devig_all((2.02, 3.65, 4.40))
    for probabilities in (result.multiplicative, result.power, result.shin):
        assert isclose(sum(probabilities), 1.0, abs_tol=1e-9)
        assert all(0 < probability < 1 for probability in probabilities)
    assert result.additive is not None
    assert isclose(sum(result.additive), 1.0, abs_tol=1e-9)
    assert result.method_dispersion >= 0


def test_weighted_consensus_respects_quality_and_stays_normalised() -> None:
    consensus = weighted_market_consensus((
        MarketQuote((0.55, 0.25, 0.20), 90, 90, 95, 95, 0.03),
        MarketQuote((0.35, 0.30, 0.35), 50, 20, 30, 20, 0.10),
    ))
    assert isclose(sum(consensus.weighted), 1.0, abs_tol=1e-9)
    assert consensus.weighted[0] > consensus.unweighted[0]
    assert consensus.source_count == 2


def test_uganda_tax_math_and_minimum_price_are_consistent() -> None:
    assert effective_decimal_odds(2.0, 0.15) == pytest.approx(1.85)
    assert net_expected_value(0.60, 2.0, 0.15) == pytest.approx(0.11)
    minimum = minimum_acceptable_odds(0.60, 0.15, minimum_net_ev=0.03)
    assert net_expected_value(0.60, minimum, 0.15) == pytest.approx(0.03)


def test_price_expiry_and_effective_dated_tax_rule_are_timestamped() -> None:
    observed = datetime(2026, 8, 21, tzinfo=UTC)
    current = price_freshness(observed, ttl_seconds=60, now=observed + timedelta(seconds=59))
    expired = price_freshness(observed, ttl_seconds=60, now=observed + timedelta(seconds=61))
    rule = TaxRule("UG", 0.15, observed, observed + timedelta(days=1))
    assert current.is_current is True
    assert expired.is_current is False
    assert rule.applies_at(observed + timedelta(hours=12)) is True
    assert rule.applies_at(observed + timedelta(days=2)) is False


def test_invalid_market_quotes_are_rejected() -> None:
    with pytest.raises(QuantitativeInputError):
        weighted_market_consensus((MarketQuote((0.6, 0.5), 90, 90, 90, 90, 0.02),))
