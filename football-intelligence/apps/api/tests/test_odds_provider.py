import asyncio
from datetime import UTC, datetime
from typing import Any

from app.providers.odds import TheOddsApiProvider


def test_probe_uses_v4_sports_catalogue_with_private_key_parameter() -> None:
    provider = TheOddsApiProvider("test-key")
    calls: list[tuple[str, dict[str, Any] | None]] = []

    async def fake_get_json(path: str, *, params: dict[str, Any] | None = None) -> list[dict]:
        calls.append((path, params))
        return []

    provider.get_json = fake_get_json  # type: ignore[method-assign]
    asyncio.run(provider.probe())
    assert provider.base_url == "https://api.the-odds-api.com/v4"
    assert calls == [("sports", {"apiKey": "test-key"})]


def test_odds_and_history_use_v4_paths_and_decimal_prices() -> None:
    provider = TheOddsApiProvider("test-key")
    calls: list[tuple[str, dict[str, Any] | None]] = []

    async def fake_get_json(path: str, *, params: dict[str, Any] | None = None) -> dict[str, list[object]]:
        calls.append((path, params))
        return {"data": []}

    provider.get_json = fake_get_json  # type: ignore[method-assign]
    asyncio.run(provider.odds("soccer_epl", regions=("eu", "uk"), markets=("h2h",)))
    asyncio.run(provider.historical_odds("soccer_epl", datetime(2026, 8, 21, tzinfo=UTC)))
    assert calls[0] == (
        "sports/soccer_epl/odds",
        {"regions": "eu,uk", "markets": "h2h", "oddsFormat": "decimal", "apiKey": "test-key"},
    )
    assert calls[1][0] == "historical/sports/soccer_epl/odds"
    assert calls[1][1]["apiKey"] == "test-key"
