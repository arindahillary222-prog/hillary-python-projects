from __future__ import annotations

from datetime import datetime

from .base import HttpProvider, ProviderError


class TheOddsApiProvider(HttpProvider):
    provider_name = "the_odds_api"

    def __init__(self, api_key: str) -> None:
        if not api_key:
            raise ProviderError("The Odds API key is not configured.")
        self.api_key = api_key
        super().__init__("https://api.the-odds-api.com/v4")

    def _params(self, values: dict[str, str]) -> dict[str, str]:
        # The Odds API v4 authenticates with the `apiKey` query parameter.
        return {**values, "apiKey": self.api_key}

    async def probe(self) -> None:
        # The sports catalogue is a documented zero-credit validation request.
        await self.get_json("sports", params=self._params({}))

    async def in_season_sports(self) -> list[dict]:
        payload = await self.get_json("sports", params=self._params({}))
        return payload if isinstance(payload, list) else list(payload.get("data", []))

    async def odds(
        self,
        sport_key: str,
        *,
        regions: tuple[str, ...] = ("eu",),
        markets: tuple[str, ...] = ("h2h", "totals"),
    ) -> list[dict]:
        if not sport_key:
            raise ProviderError("An Odds API sport key is required.")
        payload = await self.get_json(
            f"sports/{sport_key}/odds",
            params=self._params({"regions": ",".join(regions), "markets": ",".join(markets), "oddsFormat": "decimal"}),
        )
        return payload if isinstance(payload, list) else list(payload.get("data", []))

    async def historical_odds(self, sport_key: str, at: datetime) -> dict:
        # Historical calls are isolated so they cannot leak into pre-kickoff feature generation.
        payload = await self.get_json(
            f"historical/sports/{sport_key}/odds",
            params=self._params({"date": at.isoformat()}),
        )
        return payload if isinstance(payload, dict) else {"data": payload}
