import asyncio
from datetime import date
from typing import Any

from app.providers.api_football import RapidApiFootballProvider


def test_rapidapi_adapter_uses_rapid_proxy_and_required_headers() -> None:
    provider = RapidApiFootballProvider("test-rapidapi-key")
    assert provider.base_url == "https://api-football-v1.p.rapidapi.com/v3"
    assert provider.headers == {
        "x-rapidapi-host": "api-football-v1.p.rapidapi.com",
        "x-rapidapi-key": "test-rapidapi-key",
    }


def test_rapidapi_adapter_reuses_fixture_contract() -> None:
    provider = RapidApiFootballProvider("test-rapidapi-key")
    calls: list[tuple[str, dict[str, Any] | None]] = []

    async def fake_get_json(path: str, *, params: dict[str, Any] | None = None) -> dict[str, list[object]]:
        calls.append((path, params))
        return {"response": []}

    provider.get_json = fake_get_json  # type: ignore[method-assign]
    asyncio.run(provider.fixtures_on(date(2026, 8, 21), league=39, season=2026))
    assert calls == [("fixtures", {"date": "2026-08-21", "league": 39, "season": 2026})]
