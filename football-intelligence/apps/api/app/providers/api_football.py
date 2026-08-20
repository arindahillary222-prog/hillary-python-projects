from __future__ import annotations

from datetime import date

from .base import HttpProvider, ProviderError


class ApiFootballProvider(HttpProvider):
    """Secondary API-Football v3 adapter, isolated from core domain logic."""

    provider_name = "api_football"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ProviderError("API-Football key is not configured.")
        super().__init__("https://v3.football.api-sports.io", {"x-apisports-key": api_key})

    async def probe(self) -> None:
        await self.get_json("status")

    async def fixtures_on(self, fixture_date: date, league: int | None = None, season: int | None = None) -> dict:
        params: dict[str, str | int] = {"date": fixture_date.isoformat()}
        if league is not None:
            params["league"] = league
        if season is not None:
            params["season"] = season
        payload = await self.get_json("fixtures", params=params)
        return payload if isinstance(payload, dict) else {"response": payload}

    async def fixture_detail(self, fixture_id: int) -> dict:
        if fixture_id <= 0:
            raise ProviderError("Fixture id must be positive.")
        fixture = await self.get_json("fixtures", params={"id": fixture_id})
        lineups = await self.get_json("fixtures/lineups", params={"fixture": fixture_id})
        injuries = await self.get_json("injuries", params={"fixture": fixture_id})
        return {"fixture": fixture, "lineups": lineups, "injuries": injuries}

