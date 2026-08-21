import asyncio
from typing import Any

from app.providers.sportmonks import SportmonksProvider


def test_probe_uses_lightweight_latest_endpoint() -> None:
    provider = SportmonksProvider("test-token")
    calls: list[tuple[str, dict[str, Any] | None]] = []

    async def fake_get_json(path: str, *, params: dict[str, Any] | None = None) -> dict[str, list[object]]:
        calls.append((path, params))
        return {"data": []}

    provider.get_json = fake_get_json  # type: ignore[method-assign]
    asyncio.run(provider.probe())
    assert calls == [("livescores/latest", None)]


def test_live_endpoints_request_only_documented_includes() -> None:
    provider = SportmonksProvider("test-token")
    calls: list[tuple[str, dict[str, Any] | None]] = []

    async def fake_get_json(path: str, *, params: dict[str, Any] | None = None) -> dict[str, list[object]]:
        calls.append((path, params))
        return {"data": []}

    provider.get_json = fake_get_json  # type: ignore[method-assign]
    asyncio.run(provider.latest_livescores())
    asyncio.run(provider.inplay_livescores())
    assert calls == [
        ("livescores/latest", {"include": "scores;participants;state"}),
        ("livescores/inplay", {"include": "scores;participants;state;events;lineups;statistics"}),
    ]
