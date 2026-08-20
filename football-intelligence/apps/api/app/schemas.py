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


class OfferEvaluation(BaseModel):
    fixture_id: str
    decision: Literal["QUALIFIED", "WATCH", "NO_BET"]
    reasons: list[str]
    expected_value_percent: float | None
    fair_odds: float
    suggested_max_stake_ugx: float
    disclaimer: str

