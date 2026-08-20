from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.quant import elo_expected, evaluate_decision, model_agreement, poisson_dixon_coles, reliability_score
from app.schemas import DataHealth, FixtureSummary, PredictionSummary


def demo_fixture() -> FixtureSummary:
    """A labelled sample generated from deterministic inputs, never presented as live advice."""
    score_model = poisson_dixon_coles(home_rate=1.42, away_rate=1.05)
    elo_model = elo_expected(home_elo=1815, away_elo=1790)
    xg_model = 0.485
    probabilities = (score_model.home_win, elo_model, xg_model)
    probability = sum(probabilities) / len(probabilities)
    agreement = model_agreement(probabilities)
    reliability = reliability_score(
        calibration=72, agreement=agreement, completeness=78, freshness=86,
        lineup_certainty=42, corroboration=90, stability=74, sample_size=68,
    )
    decision = evaluate_decision(
        probability=probability, offered_odds=None, reliability=reliability, agreement=agreement,
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
            market="1X2", selection="Arsenal", probability=round(probability, 3), fair_odds=round(1 / probability, 2),
            uncertainty_low=round(max(0, probability - 0.085), 3), uncertainty_high=round(min(1, probability + 0.085), 3),
            reliability=reliability, agreement=round(agreement, 1), decision=decision.state,
            reasons=list(decision.reasons), model_version="demo-quant-v0.1",
        ),
    )
