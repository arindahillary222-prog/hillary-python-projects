from __future__ import annotations

from datetime import date

from .base import HttpProvider, ProviderError


class SportmonksProvider(HttpProvider):
    """Sportmonks Football API v3 adapter; never called without a server-side token."""

    provider_name = "sportmonks"

    def __init__(self, token: str) -> None:
        if not token:
            raise ProviderError("Sportmonks token is not configured.")
        super().__init__("https://api.sportmonks.com/v3/football", {"Authorization": token})

    async def probe(self) -> None:
        # `latest` is intentionally cheap and valid even when there are no live games.
        await self.get_json("livescores/latest")

    async def latest_livescores(self) -> dict:
        """Return only changes from the latest Sportmonks live-score window."""
        payload = await self.get_json(
            "livescores/latest",
            params={"include": "scores;participants;state"},
        )
        return payload if isinstance(payload, dict) else {"data": payload}

    async def inplay_livescores(self) -> dict:
        """Return the current live fixtures with the match-centre fields we display."""
        payload = await self.get_json(
            "livescores/inplay",
            params={"include": "scores;participants;state;events;lineups;statistics"},
        )
        return payload if isinstance(payload, dict) else {"data": payload}

    async def fixtures_on(self, fixture_date: date) -> dict:
        # Current v3 documentation: /fixtures/date/{YYYY-MM-DD}; enrich explicitly via include.
        payload = await self.get_json(
            f"fixtures/date/{fixture_date.isoformat()}",
            params={"include": "participants;state;league;season;venue;referees"},
        )
        return payload if isinstance(payload, dict) else {"data": payload}

    async def fixture_detail(self, fixture_id: int) -> dict:
        if fixture_id <= 0:
            raise ProviderError("Fixture id must be positive.")
        payload = await self.get_json(
            f"fixtures/{fixture_id}",
            params={"include": "participants;scores;events;lineups;statistics;expectedLineups;sidelined;xGFixture;weatherReport"},
        )
        return payload if isinstance(payload, dict) else {"data": payload}
