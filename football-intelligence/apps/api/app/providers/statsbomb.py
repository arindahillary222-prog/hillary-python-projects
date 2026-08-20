from __future__ import annotations

from typing import Any

from .base import HttpProvider


class StatsBombOpenDataProvider(HttpProvider):
    """Development/research importer for the official StatsBomb Open Data repository."""

    provider_name = "statsbomb_open_data"

    def __init__(self) -> None:
        super().__init__("https://raw.githubusercontent.com/statsbomb/open-data/master/data")

    async def probe(self) -> None:
        await self.competitions()

    async def competitions(self) -> list[dict[str, Any]]:
        payload = await self.get_json("competitions.json")
        return payload if isinstance(payload, list) else []

    async def matches(self, competition_id: int, season_id: int) -> list[dict[str, Any]]:
        payload = await self.get_json(f"matches/{competition_id}/{season_id}.json")
        return payload if isinstance(payload, list) else []

    async def events(self, match_id: int) -> list[dict[str, Any]]:
        payload = await self.get_json(f"events/{match_id}.json")
        return payload if isinstance(payload, list) else []

    async def lineups(self, match_id: int) -> list[dict[str, Any]]:
        payload = await self.get_json(f"lineups/{match_id}.json")
        return payload if isinstance(payload, list) else []

