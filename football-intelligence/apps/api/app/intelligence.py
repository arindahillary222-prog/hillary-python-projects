from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from enum import StrEnum
from typing import Iterable


class SourceTier(StrEnum):
    A = "A"
    B = "B"
    C = "C"
    D = "D"


class IntelligenceStatus(StrEnum):
    UNCONFIRMED = "UNCONFIRMED"
    LIKELY = "LIKELY"
    CONFIRMED = "CONFIRMED"


@dataclass(frozen=True)
class Evidence:
    event_type: str
    entity_id: str
    source_name: str
    source_url: str
    source_tier: SourceTier
    observed_at: datetime
    independent_source_key: str
    confidence: float


@dataclass(frozen=True)
class Corroboration:
    status: IntelligenceStatus
    score: float
    source_count: int
    can_adjust_model: bool


def assess_corroboration(evidence: Iterable[Evidence]) -> Corroboration:
    """Tier-D signals never produce an automatic model adjustment.

    One Tier A source confirms. Two independent Tier B-or-stronger sources are likely.
    """
    items = tuple(evidence)
    if not items:
        return Corroboration(IntelligenceStatus.UNCONFIRMED, 0.0, 0, False)
    for item in items:
        if item.observed_at.tzinfo is None:
            raise ValueError("Intelligence evidence requires a timezone-aware timestamp.")
        if not 0 <= item.confidence <= 100:
            raise ValueError("Evidence confidence must be 0–100.")
    independent = {item.independent_source_key for item in items}
    tiers = {item.source_tier for item in items}
    tier_weights = {SourceTier.A: 1.0, SourceTier.B: 0.7, SourceTier.C: 0.35, SourceTier.D: 0.1}
    score = min(100.0, sum(tier_weights[item.source_tier] * item.confidence for item in items) / max(1, len(items)))
    official = SourceTier.A in tiers
    strong_independent = {item.independent_source_key for item in items if item.source_tier in {SourceTier.A, SourceTier.B}}
    if official:
        return Corroboration(IntelligenceStatus.CONFIRMED, round(score, 2), len(independent), True)
    if len(strong_independent) >= 2:
        return Corroboration(IntelligenceStatus.LIKELY, round(score, 2), len(independent), True)
    return Corroboration(IntelligenceStatus.UNCONFIRMED, round(score, 2), len(independent), False)


def demo_evidence() -> list[Evidence]:
    """Explicitly synthetic UI fixture; no real-world claim is represented as live intelligence."""
    return [Evidence(
        event_type="LINEUP_CHANGE", entity_id="demo-ars-che", source_name="DEMO — synthetic event",
        source_url="https://example.invalid/demo", source_tier=SourceTier.D,
        observed_at=datetime.now(UTC), independent_source_key="demo", confidence=0,
    )]
