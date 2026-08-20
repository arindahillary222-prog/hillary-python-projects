from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class PlayerAvailability:
    """Timestamp-safe player input; scores are transparent, not learned claims."""

    player_id: str
    position: str
    expected_minutes: float
    contribution_score: float
    replacement_score: float
    availability_probability: float


@dataclass(frozen=True)
class LineupImpact:
    player_impact_score: float
    replacement_quality_score: float
    net_team_impact: float
    certainty: float


def assess_lineup_impact(players: list[PlayerAvailability]) -> LineupImpact:
    """Aggregate a lineup adjustment without inventing a probability from a missing-player count.

    ``contribution_score`` and ``replacement_score`` are externally-derived 0–100 values.
    The returned net impact is percentage points of team-strength pressure, not win probability.
    """
    if not players:
        return LineupImpact(0.0, 100.0, 0.0, 0.0)
    for player in players:
        scores = (player.expected_minutes, player.contribution_score, player.replacement_score, player.availability_probability)
        if any(not 0 <= score <= 100 for score in scores):
            raise ValueError("Lineup inputs must be scores from 0 to 100.")
    weighted_minutes = sum(player.expected_minutes for player in players)
    if weighted_minutes == 0:
        return LineupImpact(0.0, 100.0, 0.0, 0.0)
    impact = sum(player.contribution_score * player.expected_minutes for player in players) / weighted_minutes
    replacement = sum(player.replacement_score * player.expected_minutes for player in players) / weighted_minutes
    certainty = sum(player.availability_probability * player.expected_minutes for player in players) / weighted_minutes
    net_impact = sum(
        max(0.0, player.contribution_score - player.replacement_score)
        * (1 - player.availability_probability / 100)
        * (player.expected_minutes / weighted_minutes)
        for player in players
    )
    return LineupImpact(round(impact, 2), round(replacement, 2), round(net_impact, 2), round(certainty, 2))
