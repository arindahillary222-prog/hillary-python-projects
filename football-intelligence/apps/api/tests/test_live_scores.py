import asyncio
from datetime import UTC, datetime, timedelta

from app.services.live_scores import SportmonksLiveFeed


class StubProvider:
    def __init__(self) -> None:
        self.calls = 0

    async def latest_livescores(self) -> dict:
        self.calls += 1
        return {
            "data": [
                {
                    "id": 123,
                    "name": "Arsenal vs Chelsea",
                    "state_id": 5,
                    "starting_at": "2026-08-21 15:00:00",
                    "last_processed_at": "2026-08-21 15:01:00",
                    "scores": [{"score": {"goals": 1}}],
                    "events": [{"type": "goal"}],
                }
            ]
        }


def test_live_feed_normalises_and_caches_provider_response() -> None:
    provider = StubProvider()
    feed = SportmonksLiveFeed(provider)
    now = datetime(2026, 8, 21, tzinfo=UTC)
    first = asyncio.run(feed.latest(now=now))
    second = asyncio.run(feed.latest(now=now + timedelta(seconds=9)))
    assert provider.calls == 1
    assert first == second
    assert first.updates[0].fixture_id == 123
    assert first.updates[0].event_count == 1


def test_live_feed_refreshes_after_cache_window() -> None:
    provider = StubProvider()
    feed = SportmonksLiveFeed(provider)
    now = datetime(2026, 8, 21, tzinfo=UTC)
    asyncio.run(feed.latest(now=now))
    asyncio.run(feed.latest(now=now + timedelta(seconds=10)))
    assert provider.calls == 2
