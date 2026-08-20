from __future__ import annotations

from datetime import datetime

from .base import HttpProvider, ProviderError


class TheOddsApiProvider(HttpProvider):
    provider_name = "the_odds_api"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ProviderError("The Odds API key is not configured.")
        super().__init__("https://api.theoddsapi.com", {"x-api-key": api_key})

    async def probe(self) -> None:
        await self.get_json("sports/")

    async def odds(self, sport_key: str, *, markets: tuple[str, ...] = ("h2h", "totals")) -> list[dict]:
        payload = await self.get_json(
            "odds/",
            params={"sport_key": sport_key, "markets": ",".join(markets), "oddsFormat": "decimal"},
        )
        return payload if isinstance(payload, list) else list(payload.get("data", []))

    async def historical_odds(self, sport_key: str, at: datetime) -> dict:
        # Historical calls are isolated so they cannot leak into pre-kickoff feature generation.
        payload = await self.get_json("historical/odds", params={"sport_key": sport_key, "date": at.isoformat()})
        return payload if isinstance(payload, dict) else {"data": payload}

