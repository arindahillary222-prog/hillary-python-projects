from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.market import devig_all, residual_edge
from app.models.quant import elo_expected, evaluate_decision, model_agreement, poisson_dixon_coles, reliability_score
from app.schemas import DataHealth, FixtureSummary, PredictionSummary


def demo_fixture() -> FixtureSummary:
    """A labelled sample generated from deterministic inputs, never presented as live advice."""
    score_model = poisson_dixon_coles(home_rate=1.42, away_rate=1.05)
    elo_model = elo_expected(home_elo=1815, away_elo=1790)
    xg_model = 0.485
    probabilities = (score_model.home_win, elo_model, xg_model)
    football_model_probability = sum(probabilities) / len(probabilities)
    devig = devig_all((2.12, 3.55, 4.10))
    market_probability = devig.power[0]
    # Demo only: this is a visible reproducible blend, not a validated production ensemble.
    final_calibrated_probability = (football_model_probability * 0.65) + (market_probability * 0.35)
    uncertainty_low = max(0, final_calibrated_probability - 0.085)
    uncertainty_high = min(1, final_calibrated_probability + 0.085)
    conservative_probability = uncertainty_low
    agreement = model_agreement(probabilities)
    reliability = reliability_score(
        calibration=72, agreement=agreement, completeness=78, freshness=86,
        lineup_certainty=42, corroboration=90, stability=74, sample_size=68,
    )
    decision = evaluate_decision(
        probability=conservative_probability, offered_odds=None, reliability=reliability, agreement=agreement,
        completeness=78, freshness=86, lineup_certainty=42, uncertainty_width=0.17,
        unresolved_critical_intelligence=False,
    )
    now = datetime.now(UTC)
    return FixtureSummary(
        id="demo-ars-che",
        competition="Premier League",
        kickoff_at=now + timedelta(days=3),
        home_team="Arsenal",
        away_team="Chelsea",
        status="SCHEDULED",
        data_health=DataHealth(status="AMBER", completeness=78, freshness=86, source="DEMO · StatsBomb-shaped sample", updated_at=now),
        prediction=PredictionSummary(
            market="1X2", selection="Arsenal", probability=round(final_calibrated_probability, 3),
            football_model_probability=round(football_model_probability, 3),
            market_probability=round(market_probability, 3),
            final_calibrated_probability=round(final_calibrated_probability, 3),
            conservative_probability=round(conservative_probability, 3),
            market_residual=round(residual_edge(football_model_probability, market_probability), 4),
            devig_method_dispersion=devig.method_dispersion,
            fair_odds=round(1 / final_calibrated_probability, 2),
            uncertainty_low=round(uncertainty_low, 3), uncertainty_high=round(uncertainty_high, 3),
            reliability=reliability, agreement=round(agreement, 1), decision=decision.state,
            reasons=list(decision.reasons), model_version="demo-quant-v0.1",
        ),
    )
