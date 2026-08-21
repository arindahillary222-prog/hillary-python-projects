from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class DataHealth(BaseModel):
    status: Literal["GREEN", "AMBER", "RED"]
    completeness: float = Field(ge=0, le=100)
    freshness: float = Field(ge=0, le=100)
    source: str
    updated_at: datetime


class PredictionSummary(BaseModel):
    market: str
    selection: str
    probability: float = Field(gt=0, lt=1)
    football_model_probability: float | None = Field(default=None, gt=0, lt=1)
    market_probability: float | None = Field(default=None, gt=0, lt=1)
    final_calibrated_probability: float | None = Field(default=None, gt=0, lt=1)
    conservative_probability: float | None = Field(default=None, gt=0, lt=1)
    market_residual: float | None = None
    devig_method_dispersion: float | None = Field(default=None, ge=0)
    fair_odds: float
    uncertainty_low: float = Field(ge=0, le=1)
    uncertainty_high: float = Field(ge=0, le=1)
    reliability: float = Field(ge=0, le=100)
    agreement: float = Field(ge=0, le=100)
    decision: Literal["QUALIFIED", "WATCH", "NO_BET"]
    reasons: list[str]
    model_version: str


class FixtureSummary(BaseModel):
    id: str
    competition: str
    kickoff_at: datetime
    home_team: str
    away_team: str
    status: str
    data_health: DataHealth
    prediction: PredictionSummary
    demo: bool = True


class OfferRequest(BaseModel):
    decimal_odds: float = Field(gt=1, le=1000)
    weekly_bankroll_ugx: float = Field(default=100_000, ge=0, le=10_000_000_000)
    fractional_kelly: float = Field(default=0.10, ge=0, le=0.25)
    observed_at: datetime | None = None


class OfferEvaluation(BaseModel):
    fixture_id: str
    decision: Literal["QUALIFIED", "WATCH", "NO_BET"]
    reasons: list[str]
    expected_value_percent: float | None
    net_expected_value_percent: float | None = None
    conservative_net_expected_value_percent: float | None = None
    effective_odds: float | None = None
    minimum_acceptable_odds: float | None = None
    price_current: bool = False
    price_expires_at: datetime | None = None
    tax_rate_percent: float | None = None
    fair_odds: float
    suggested_max_stake_ugx: float
    disclaimer: str


class AssistantQueryRequest(BaseModel):
    question: str = Field(min_length=1, max_length=800)
    fixture_id: str = "demo-ars-che"
    weekly_bankroll_ugx: float = Field(default=100_000, ge=0, le=10_000_000_000)
    conversation_id: str | None = Field(default=None, max_length=128)
    current_page: str = Field(default="desk", max_length=80)
    selected_market: str | None = Field(default=None, max_length=80)
    selected_chart: str | None = Field(default=None, max_length=80)


class AssistantCalculation(BaseModel):
    decimal_odds: float | None = None
    stake_ugx: float | None = None
    gross_return_ugx: float | None = None
    gross_profit_ugx: float | None = None
    estimated_tax_ugx: float | None = None
    potential_net_return_ugx: float | None = None
    potential_net_profit_ugx: float | None = None
    conservative_expected_net_return_ugx: float | None = None
    conservative_expected_net_profit_ugx: float | None = None
    net_expected_value_percent: float | None = None
    conservative_net_expected_value_percent: float | None = None
    minimum_acceptable_odds: float | None = None
    suggested_max_stake_ugx: float | None = None


class AssistantEvidence(BaseModel):
    label: str
    source: str
    status: Literal["CURRENT", "DEMO", "UNAVAILABLE"]
    updated_at: datetime | None = None


class AssistantContext(BaseModel):
    fixture_id: str | None = None
    selected_market: str | None = None
    selected_chart: str | None = None
    last_decimal_odds: float | None = None
    last_stake_ugx: float | None = None


class AssistantResponse(BaseModel):
    mode: Literal["DEMO", "LIVE"]
    data_status: Literal["DEMO_ONLY", "LIVE_UNAVAILABLE", "CURRENT"]
    answer: str
    facts: list[str]
    decision: Literal["QUALIFIED", "WATCH", "NO_BET"] | None = None
    reasons: list[str]
    calculation: AssistantCalculation | None = None
    suggestions: list[str]
    disclaimer: str
    provider: Literal["GEMINI", "DETERMINISTIC"] = "DETERMINISTIC"
    conversation_id: str | None = None
    evidence: list[AssistantEvidence] = Field(default_factory=list)
    context: AssistantContext = Field(default_factory=AssistantContext)
    tools_used: list[str] = Field(default_factory=list)


class LiveScoreUpdate(BaseModel):
    fixture_id: int
    name: str
    state_id: int | None = None
    starting_at: str | None = None
    last_processed_at: str | None = None
    score_count: int = Field(ge=0)
    event_count: int = Field(ge=0)


class LiveScoreResponse(BaseModel):
    mode: Literal["LIVE"]
    provider: Literal["sportmonks"]
    data_status: Literal["CURRENT"]
    checked_at: datetime
    cache_seconds: int
    updates: list[LiveScoreUpdate]
    notice: str
