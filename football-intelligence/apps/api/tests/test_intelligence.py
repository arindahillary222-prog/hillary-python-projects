from datetime import UTC, datetime

import pytest

from app.ingestion.entities import EntityAlias, EntityResolutionError, EntityResolver
from app.intelligence import Evidence, IntelligenceStatus, SourceTier, assess_corroboration
from app.models.lineups import PlayerAvailability, assess_lineup_impact
from app.storage.statsbomb import canonical_uuid


def test_entity_resolution_requires_explicit_provider_mapping() -> None:
    resolver = EntityResolver([EntityAlias("sportmonks", "42", "team-arsenal", "Arsenal")])
    assert resolver.resolve("SPORTMONKS", "42") == "team-arsenal"
    with pytest.raises(EntityResolutionError):
        resolver.resolve("api_football", "42")


def test_entity_resolution_refuses_ambiguous_name_mapping() -> None:
    resolver = EntityResolver([
        EntityAlias("one", "1", "team-one", "United"),
        EntityAlias("two", "2", "team-two", "United"),
    ])
    with pytest.raises(EntityResolutionError):
        resolver.resolve_label("United")


def test_tier_d_rumour_never_auto_adjusts_model() -> None:
    result = assess_corroboration([Evidence(
        event_type="PLAYER_INJURY", entity_id="player-1", source_name="fan account", source_url="https://example.test",
        source_tier=SourceTier.D, observed_at=datetime.now(UTC), independent_source_key="fan-1", confidence=90,
    )])
    assert result.status == IntelligenceStatus.UNCONFIRMED
    assert result.can_adjust_model is False


def test_two_independent_tier_b_sources_are_likely() -> None:
    observed_at = datetime.now(UTC)
    result = assess_corroboration([
        Evidence("PLAYER_INJURY", "player-1", "journalist 1", "https://one.test", SourceTier.B, observed_at, "one", 80),
        Evidence("PLAYER_INJURY", "player-1", "journalist 2", "https://two.test", SourceTier.B, observed_at, "two", 80),
    ])
    assert result.status == IntelligenceStatus.LIKELY
    assert result.can_adjust_model is True


def test_key_player_loss_has_more_effect_than_reserve_loss() -> None:
    impact = assess_lineup_impact([
        PlayerAvailability("goalkeeper", "GK", 90, 92, 48, 0),
        PlayerAvailability("reserve", "MF", 20, 35, 32, 0),
    ])
    assert impact.net_team_impact > 30
    assert impact.certainty == 0


def test_provider_import_ids_are_deterministic_and_namespaced() -> None:
    assert canonical_uuid("fixture", "100") == canonical_uuid("fixture", "100")
    assert canonical_uuid("fixture", "100") != canonical_uuid("team", "100")
