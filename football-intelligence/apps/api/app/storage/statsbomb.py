from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, time
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine


NAMESPACE = uuid.UUID("1ed9b31c-b28f-458e-aaf4-03a4b47d223b")


def canonical_uuid(kind: str, provider_id: str) -> str:
    """Stable IDs make repeated imports idempotent and auditable."""
    return str(uuid.uuid5(NAMESPACE, f"statsbomb:{kind}:{provider_id}"))


class StatsBombRepository:
    """Persist validated StatsBomb match records through parameterized SQL only."""

    def __init__(self, database_url: str) -> None:
        self.engine: Engine = create_engine(database_url, pool_pre_ping=True)

    def upsert_matches(self, matches: list[dict[str, Any]]) -> int:
        count = 0
        with self.engine.begin() as connection:
            for match in matches:
                self._upsert_match(connection, match)
                count += 1
        return count

    @staticmethod
    def _kickoff_at(match: dict[str, Any]) -> datetime:
        date_value = str(match.get("match_date", ""))
        kick_off = str(match.get("kick_off", "00:00:00"))
        try:
            return datetime.combine(datetime.fromisoformat(date_value).date(), time.fromisoformat(kick_off), tzinfo=UTC)
        except ValueError as error:
            raise ValueError(f"StatsBomb match {match.get('match_id')} has invalid kickoff fields.") from error

    @staticmethod
    def _team(match: dict[str, Any], key: str) -> tuple[str, str]:
        team = match.get(key) or {}
        provider_id = str(team.get("home_team_id") or team.get("away_team_id") or team.get("id") or "")
        name = str(team.get("home_team_name") or team.get("away_team_name") or team.get("name") or "").strip()
        if not provider_id or not name:
            raise ValueError(f"StatsBomb match {match.get('match_id')} has incomplete {key} mapping.")
        return provider_id, name

    def _upsert_match(self, connection: Any, match: dict[str, Any]) -> None:
        match_id = str(match.get("match_id") or "")
        competition = match.get("competition") or {}
        season = match.get("season") or {}
        competition_id = str(competition.get("competition_id") or "")
        competition_name = str(competition.get("competition_name") or "").strip()
        season_id = str(season.get("season_id") or "")
        season_name = str(season.get("season_name") or "").strip()
        if not all((match_id, competition_id, competition_name, season_id, season_name)):
            raise ValueError("StatsBomb match requires match, competition, and season identifiers.")
        home_provider_id, home_name = self._team(match, "home_team")
        away_provider_id, away_name = self._team(match, "away_team")
        competition_uuid = canonical_uuid("competition", competition_id)
        season_uuid = canonical_uuid("season", season_id)
        home_uuid = canonical_uuid("team", home_provider_id)
        away_uuid = canonical_uuid("team", away_provider_id)
        fixture_uuid = canonical_uuid("fixture", match_id)
        now = datetime.now(UTC)
        raw = json.dumps(match, separators=(",", ":"))
        competition_uuid = str(connection.execute(text("""
            insert into public.competitions (id, canonical_code, name, provider_metadata)
            values (:id, :code, :name, cast(:raw as jsonb))
            on conflict (canonical_code) do update set name = excluded.name, provider_metadata = excluded.provider_metadata, updated_at = now()
            returning id
        """), {"id": competition_uuid, "code": f"statsbomb:{competition_id}", "name": competition_name, "raw": json.dumps(competition)}).scalar_one())
        season_uuid = str(connection.execute(text("""
            insert into public.seasons (id, competition_id, name, provider_metadata)
            values (:id, :competition_id, :name, cast(:raw as jsonb))
            on conflict (competition_id, name) do update set provider_metadata = excluded.provider_metadata
            returning id
        """), {"id": season_uuid, "competition_id": competition_uuid, "name": season_name, "raw": json.dumps(season)}).scalar_one())
        resolved_teams: dict[str, str] = {}
        for team_uuid, provider_id, name in ((home_uuid, home_provider_id, home_name), (away_uuid, away_provider_id, away_name)):
            team_uuid = str(connection.execute(text("""
                insert into public.teams (id, canonical_name, metadata)
                values (:id, :name, cast(:raw as jsonb))
                on conflict (canonical_name) do update set metadata = excluded.metadata, updated_at = now()
                returning id
            """), {"id": team_uuid, "name": name, "raw": json.dumps({"provider": "statsbomb", "provider_id": provider_id})}).scalar_one())
            resolved_teams[provider_id] = team_uuid
            connection.execute(text("""
                insert into public.provider_entities (provider, entity_type, provider_entity_id, canonical_entity_id)
                values ('statsbomb', 'team', :provider_id, :canonical_id)
                on conflict (provider, entity_type, provider_entity_id) do update set canonical_entity_id = excluded.canonical_entity_id
            """), {"provider_id": provider_id, "canonical_id": team_uuid})
        home_uuid = resolved_teams[home_provider_id]
        away_uuid = resolved_teams[away_provider_id]
        kickoff = self._kickoff_at(match)
        connection.execute(text("""
            insert into public.fixtures (
              id, competition_id, season_id, home_team_id, away_team_id, provider_fixture_id,
              round_name, venue_name, referee_name, kickoff_at, status, home_goals, away_goals,
              source, source_event_at, ingested_at, updated_at, raw_payload
            ) values (
              :id, :competition_id, :season_id, :home_team_id, :away_team_id, :provider_fixture_id,
              :round_name, :venue_name, :referee_name, :kickoff_at, 'FINISHED', :home_goals, :away_goals,
              'statsbomb', :source_event_at, :now, :now, cast(:raw as jsonb)
            ) on conflict (source, provider_fixture_id) do update set
              home_goals = excluded.home_goals, away_goals = excluded.away_goals, updated_at = excluded.updated_at,
              source_event_at = excluded.source_event_at, raw_payload = excluded.raw_payload
        """), {
            "id": fixture_uuid, "competition_id": competition_uuid, "season_id": season_uuid,
            "home_team_id": home_uuid, "away_team_id": away_uuid, "provider_fixture_id": match_id,
            "round_name": str(match.get("competition_stage", {}).get("name") or ""),
            "venue_name": str(match.get("stadium", {}).get("name") or "") or None,
            "referee_name": str(match.get("referee", {}).get("name") or "") or None,
            "kickoff_at": kickoff, "home_goals": match.get("home_score"), "away_goals": match.get("away_score"),
            "source_event_at": kickoff, "now": now, "raw": raw,
        })
        connection.execute(text("""
            insert into public.provider_entities (provider, entity_type, provider_entity_id, canonical_entity_id)
            values ('statsbomb', 'fixture', :provider_id, :canonical_id)
            on conflict (provider, entity_type, provider_entity_id) do update set canonical_entity_id = excluded.canonical_entity_id
        """), {"provider_id": match_id, "canonical_id": fixture_uuid})
