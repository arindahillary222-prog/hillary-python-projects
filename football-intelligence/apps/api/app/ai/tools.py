from __future__ import annotations

from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any

from app.demo import demo_fixture
from app.services.offer_evaluation import (
    TAX_POLICY_LABEL,
    calculate_potential_payout,
    evaluate_manual_offer,
)


@dataclass(frozen=True)
class ToolContext:
    fixture_id: str = "demo-ars-che"
    weekly_bankroll_ugx: float = 100_000
    selected_market: str | None = None
    selected_chart: str | None = None
    last_decimal_odds: float | None = None
    last_stake_ugx: float | None = None


@dataclass(frozen=True)
class ToolOutcome:
    name: str
    data: dict[str, Any]
    evidence: tuple[dict[str, Any], ...] = ()
    decision: str | None = None
    reasons: tuple[str, ...] = ()
    calculation: dict[str, float] | None = None
    context_updates: dict[str, Any] = field(default_factory=dict)


def _evidence(label: str, source: str, status: str, updated_at: datetime | None = None) -> dict[str, Any]:
    return {
        "label": label,
        "source": source,
        "status": status,
        "updated_at": updated_at.isoformat() if updated_at else None,
    }


def _fixture_or_unavailable(fixture_id: str | None) -> tuple[Any | None, ToolOutcome | None]:
    fixture = demo_fixture()
    requested_id = fixture_id or fixture.id
    if requested_id == fixture.id:
        return fixture, None
    return None, ToolOutcome(
        name="fixture_lookup",
        data={
            "status": "UNAVAILABLE",
            "fixture_id": requested_id,
            "reason": "No server-side model record exists for this fixture yet. The assistant will not substitute schedule-only data for a prediction.",
        },
        evidence=(_evidence("Fixture model record", "Arawee/Mayeku-Sportz", "UNAVAILABLE"),),
    )


def _fixture_summary(fixture: Any) -> dict[str, Any]:
    return {
        "fixture_id": fixture.id,
        "competition": fixture.competition,
        "home_team": fixture.home_team,
        "away_team": fixture.away_team,
        "kickoff_at": fixture.kickoff_at.isoformat(),
        "status": fixture.status,
        "data_status": "DEMO",
    }


def _prediction(fixture: Any) -> dict[str, Any]:
    prediction = fixture.prediction
    return {
        "fixture_id": fixture.id,
        "market": prediction.market,
        "selection": prediction.selection,
        "model_probability": prediction.probability,
        "football_model_probability": prediction.football_model_probability,
        "market_probability": prediction.market_probability,
        "final_calibrated_probability": prediction.final_calibrated_probability,
        "conservative_probability": prediction.conservative_probability,
        "fair_odds": prediction.fair_odds,
        "uncertainty_low": prediction.uncertainty_low,
        "uncertainty_high": prediction.uncertainty_high,
        "reliability": prediction.reliability,
        "agreement": prediction.agreement,
        "decision": prediction.decision,
        "reasons": prediction.reasons,
        "model_version": prediction.model_version,
        "data_status": "DEMO",
    }


def _unavailable(name: str, reason: str) -> ToolOutcome:
    return ToolOutcome(
        name=name,
        data={"status": "UNAVAILABLE", "reason": reason},
        evidence=(_evidence(name.replace("_", " ").title(), "Authorised provider", "UNAVAILABLE"),),
    )


class FootballToolRegistry:
    """Read-only application tools exposed to the language model.

    Each tool returns a labelled snapshot. Missing provider data stays unavailable;
    none of these tools create scores, odds, injuries, or player statistics.
    """

    def definitions(self) -> list[dict[str, Any]]:
        fixture_property = {"fixture_id": {"type": "string", "description": "Arawee fixture id when known."}}
        money_properties = {
            **fixture_property,
            "decimal_odds": {"type": "number", "description": "Current manually observed decimal odds, greater than 1."},
            "stake_ugx": {"type": "number", "description": "Optional stake in UGX."},
        }

        def definition(name: str, description: str, properties: dict[str, Any] | None = None, required: list[str] | None = None) -> dict[str, Any]:
            return {
                "type": "function",
                "name": name,
                "description": description,
                "parameters": {"type": "object", "properties": properties or fixture_property, "required": required or []},
            }

        return [
            definition("get_weekly_matches", "Retrieve matches with server-side model records for the current week."),
            definition("get_match_details", "Retrieve fixture identity, kickoff and data status for a match."),
            definition("get_match_prediction", "Retrieve the model, calibrated and conservative probabilities plus decision gates."),
            definition("get_current_odds", "Retrieve authorised current odds only. Never estimate missing odds."),
            definition("get_market_consensus", "Retrieve the current market consensus only when an odds provider exists."),
            definition("evaluate_entered_odds", "Evaluate a manually entered decimal price with deterministic EV and tax logic.", money_properties, ["decimal_odds"]),
            definition("calculate_payout", "Calculate gross return, tax and net profit from a stake and decimal odds.", money_properties, ["decimal_odds", "stake_ugx"]),
            definition("calculate_net_profit", "Calculate potential net return and net profit using the configured tax rule.", money_properties, ["decimal_odds", "stake_ugx"]),
            definition("calculate_tax", "Calculate the configured estimated tax on a hypothetical winning ticket.", money_properties, ["decimal_odds", "stake_ugx"]),
            definition("compare_bets", "Compare explicitly supplied candidates with deterministic evaluation.", {"candidates": {"type": "array", "items": {"type": "object"}, "description": "Candidates containing fixture_id, decimal_odds and optional stake_ugx."}}, ["candidates"]),
            definition("get_recommended_market", "Retrieve the current model selection and its status; it is not a live betting instruction."),
            definition("get_minimum_acceptable_odds", "Retrieve the tax-adjusted minimum acceptable decimal price from the engine."),
            definition("get_live_match_state", "Retrieve authorised score, minute and match status. Return unavailable if no live provider is configured."),
            definition("get_live_statistics", "Retrieve authorised live statistics such as shots and possession."),
            definition("get_probability_history", "Retrieve the model probability ledger for the selected fixture."),
            definition("get_xg", "Retrieve authorised xG/xGA data. Never infer xG from a score."),
            definition("get_lineups", "Retrieve lineup confirmation state from authorised sources."),
            definition("get_injuries", "Retrieve current injury data from authorised sources."),
            definition("get_player_status", "Retrieve the status of a named player only when a provider supplies it.", {**fixture_property, "player_name": {"type": "string"}}),
            definition("get_intelligence_feed", "Retrieve timestamped, corroborated intelligence items."),
            definition("get_prediction_history", "Retrieve the prediction ledger and reasons for changes."),
            definition("get_bankroll", "Retrieve the current session bankroll context; no persistent personal bankroll is assumed."),
            definition("get_recent_bets", "Retrieve recorded bets only when a user ledger is connected."),
            definition("get_model_health", "Retrieve model health, calibration state and recommendation controls."),
            definition("get_data_health", "Retrieve model data freshness and completeness."),
            definition("explain_decision", "Retrieve deterministic decision reasons and qualification blockers."),
        ]

    async def execute(self, name: str, arguments: dict[str, Any], context: ToolContext) -> ToolOutcome:
        fixture_id = str(arguments.get("fixture_id") or context.fixture_id)
        fixture, unavailable = _fixture_or_unavailable(fixture_id)
        if unavailable is not None and name not in {"get_weekly_matches", "get_bankroll", "get_recent_bets", "get_model_health"}:
            return ToolOutcome(name=name, data=unavailable.data, evidence=unavailable.evidence)

        if name == "get_weekly_matches":
            demo = demo_fixture()
            return ToolOutcome(name, {"status": "DEMO", "matches": [_fixture_summary(demo)], "qualified_count": 0}, (_evidence("Weekly model list", "Arawee/Mayeku-Sportz", "DEMO", demo.data_health.updated_at),))
        if name in {"get_match_details"}:
            return ToolOutcome(name, _fixture_summary(fixture), (_evidence("Fixture model record", fixture.data_health.source, "DEMO", fixture.data_health.updated_at),))
        if name in {"get_match_prediction", "get_recommended_market"}:
            return ToolOutcome(name, _prediction(fixture), (_evidence("Prediction engine", fixture.prediction.model_version, "DEMO", fixture.data_health.updated_at),), fixture.prediction.decision, tuple(fixture.prediction.reasons))
        if name in {"get_data_health"}:
            return ToolOutcome(name, {"status": fixture.data_health.status, "completeness": fixture.data_health.completeness, "freshness": fixture.data_health.freshness, "source": fixture.data_health.source, "updated_at": fixture.data_health.updated_at.isoformat(), "data_status": "DEMO"}, (_evidence("Data health", fixture.data_health.source, "DEMO", fixture.data_health.updated_at),))
        if name in {"explain_decision"}:
            return ToolOutcome(name, {"fixture_id": fixture.id, "decision": fixture.prediction.decision, "reasons": fixture.prediction.reasons, "explanation": "Qualification is blocked until all deterministic data, lineup and price gates pass."}, (_evidence("Decision gates", fixture.prediction.model_version, "DEMO", fixture.data_health.updated_at),), fixture.prediction.decision, tuple(fixture.prediction.reasons))
        if name == "get_minimum_acceptable_odds":
            evaluation = evaluate_manual_offer(fixture, decimal_odds=2.0, weekly_bankroll_ugx=context.weekly_bankroll_ugx, fractional_kelly_fraction=0.10)
            decision = evaluation.decision
            return ToolOutcome(name, {"fixture_id": fixture.id, "minimum_acceptable_odds": decision.minimum_acceptable_odds, "conservative_probability": fixture.prediction.conservative_probability, "tax_policy": TAX_POLICY_LABEL, "data_status": "DEMO"}, (_evidence("Decision engine", fixture.prediction.model_version, "DEMO", fixture.data_health.updated_at),), decision.state, tuple(decision.reasons))
        if name in {"evaluate_entered_odds", "calculate_payout", "calculate_net_profit", "calculate_tax"}:
            odds = _number(arguments.get("decimal_odds"), context.last_decimal_odds)
            stake = _number(arguments.get("stake_ugx"), context.last_stake_ugx)
            if odds is None or odds <= 1:
                return _unavailable(name, "A decimal price greater than 1 is required for this deterministic calculation.")
            if name == "evaluate_entered_odds":
                evaluation = evaluate_manual_offer(fixture, decimal_odds=odds, weekly_bankroll_ugx=context.weekly_bankroll_ugx, fractional_kelly_fraction=0.10)
                decision = evaluation.decision
                calculation = {
                    "decimal_odds": odds,
                    "net_expected_value_percent": round((decision.net_expected_value or 0) * 100, 1),
                    "conservative_net_expected_value_percent": round((decision.conservative_net_expected_value or 0) * 100, 1),
                    "minimum_acceptable_odds": round(decision.minimum_acceptable_odds or 0, 3),
                    "suggested_max_stake_ugx": round(context.weekly_bankroll_ugx * evaluation.suggested_stake_fraction, 0),
                }
                return ToolOutcome(name, {**calculation, "fixture_id": fixture.id, "decision": decision.state, "reasons": decision.reasons, "price_current": evaluation.price.is_current, "tax_policy": TAX_POLICY_LABEL}, (_evidence("Manual price evaluator", fixture.prediction.model_version, "DEMO", fixture.data_health.updated_at),), decision.state, tuple(decision.reasons), calculation, {"last_decimal_odds": odds})
            if stake is None or stake <= 0:
                return _unavailable(name, "A positive stake in UGX is required for this calculation.")
            payout = calculate_potential_payout(stake_ugx=stake, decimal_odds=odds)
            calculation = {
                "decimal_odds": odds, "stake_ugx": stake, "gross_return_ugx": round(payout.gross_return_ugx, 2),
                "gross_profit_ugx": round(payout.gross_profit_ugx, 2), "estimated_tax_ugx": round(payout.estimated_tax_ugx, 2),
                "potential_net_return_ugx": round(payout.potential_net_return_ugx, 2), "potential_net_profit_ugx": round(payout.potential_net_profit_ugx, 2),
            }
            return ToolOutcome(name, {**calculation, "tax_policy": TAX_POLICY_LABEL, "hypothetical": True}, (_evidence("Payout calculator", "Arawee/Mayeku-Sportz", "DEMO"),), calculation=calculation, context_updates={"last_decimal_odds": odds, "last_stake_ugx": stake})
        if name == "compare_bets":
            candidates = arguments.get("candidates")
            if not isinstance(candidates, list) or len(candidates) < 2:
                return _unavailable(name, "Provide at least two fully specified candidates to compare.")
            comparisons: list[dict[str, Any]] = []
            for candidate in candidates[:5]:
                if not isinstance(candidate, dict):
                    continue
                odds = _number(candidate.get("decimal_odds"), None)
                if odds is None or odds <= 1:
                    continue
                candidate_fixture, candidate_missing = _fixture_or_unavailable(candidate.get("fixture_id"))
                if candidate_missing:
                    comparisons.append({"status": "UNAVAILABLE", "fixture_id": candidate.get("fixture_id")})
                    continue
                evaluated = evaluate_manual_offer(candidate_fixture, decimal_odds=odds, weekly_bankroll_ugx=context.weekly_bankroll_ugx, fractional_kelly_fraction=0.10)
                comparisons.append({"fixture_id": candidate_fixture.id, "decimal_odds": odds, "decision": evaluated.decision.state, "conservative_net_expected_value_percent": round((evaluated.decision.conservative_net_expected_value or 0) * 100, 1), "minimum_acceptable_odds": evaluated.decision.minimum_acceptable_odds})
            comparisons.sort(key=lambda item: item.get("conservative_net_expected_value_percent", -999), reverse=True)
            return ToolOutcome(name, {"comparisons": comparisons, "note": "Only complete server-side model records can be compared."}, (_evidence("Comparison engine", "Arawee/Mayeku-Sportz", "DEMO", fixture.data_health.updated_at),))
        if name in {"get_current_odds", "get_market_consensus"}:
            return _unavailable(name, "No independent current-odds provider is configured. A manual observed price can still be evaluated deterministically.")
        if name in {"get_live_match_state", "get_live_statistics", "get_xg"}:
            return _unavailable(name, "No authorised live-score or statistics provider is configured for this server-side fixture record.")
        if name in {"get_lineups", "get_injuries", "get_player_status"}:
            return _unavailable(name, "No authorised lineup, injury or player-status provider is configured for this fixture record.")
        if name == "get_intelligence_feed":
            return _unavailable(name, "No timestamped, corroborated intelligence feed is configured for this fixture record.")
        if name in {"get_probability_history", "get_prediction_history"}:
            return ToolOutcome(name, {"fixture_id": fixture.id, "history": [{"at": fixture.data_health.updated_at.isoformat(), "probability": fixture.prediction.probability, "decision": fixture.prediction.decision, "reason": "Initial timestamp-safe demo model run."}], "data_status": "DEMO"}, (_evidence("Prediction ledger", fixture.prediction.model_version, "DEMO", fixture.data_health.updated_at),))
        if name == "get_bankroll":
            return ToolOutcome(name, {"weekly_bankroll_ugx": context.weekly_bankroll_ugx, "source": "request context", "persistent_ledger_connected": False}, (_evidence("Bankroll context", "Request-scoped", "DEMO"),))
        if name == "get_recent_bets":
            return _unavailable(name, "No authenticated personal bet ledger is connected.")
        if name == "get_model_health":
            return ToolOutcome(name, {"mode": "DEMO", "model_version": fixture.prediction.model_version, "shadow_mode": True, "calibration": "pending historical validation", "recommendations_enabled": False, "live_recommendations_enabled": False}, (_evidence("Model health", "Arawee/Mayeku-Sportz", "DEMO", fixture.data_health.updated_at),))
        return _unavailable(name, "The requested application tool is not available.")


def _number(value: Any, fallback: float | None) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value.replace(",", "").strip())
        except ValueError:
            return fallback
    return fallback
