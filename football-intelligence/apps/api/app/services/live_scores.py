from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol

from app.providers.base import ProviderError


LIVE_SCORE_CACHE_SECONDS = 10


class LatestScoresProvider(Protocol):
    async def latest_livescores(self) -> dict[str, Any]: ...


@dataclass(frozen=True)
class LiveScoreUpdate:
    fixture_id: int
    name: str
    state_id: int | None
    starting_at: str | None
    last_processed_at: str | None
    score_count: int
    event_count: int


@dataclass(frozen=True)
class LiveScoreSnapshot:
    checked_at: datetime
    updates: tuple[LiveScoreUpdate, ...]


def _as_records(payload: dict[str, Any]) -> list[dict[str, Any]]:
    data = payload.get("data", [])
    if isinstance(data, dict):
        return [data]
    return [item for item in data if isinstance(item, dict)] if isinstance(data, list) else []


def _as_count(value: object) -> int:
    return len(value) if isinstance(value, list) else 0


def normalise_latest_livescores(payload: dict[str, Any], *, checked_at: datetime) -> LiveScoreSnapshot:
    """Expose a small safe match-update shape, never a raw provider response."""
    updates = []
    for record in _as_records(payload):
        fixture_id = record.get("id")
        if not isinstance(fixture_id, int):
            continue
        updates.append(
            LiveScoreUpdate(
                fixture_id=fixture_id,
                name=str(record.get("name") or "Unnamed fixture"),
                state_id=record.get("state_id") if isinstance(record.get("state_id"), int) else None,
                starting_at=record.get("starting_at") if isinstance(record.get("starting_at"), str) else None,
                last_processed_at=record.get("last_processed_at") if isinstance(record.get("last_processed_at"), str) else None,
                score_count=_as_count(record.get("scores")),
                event_count=_as_count(record.get("events")),
            )
        )
    return LiveScoreSnapshot(checked_at=checked_at, updates=tuple(updates))


class SportmonksLiveFeed:
    """Coalesce browser requests into one safe Sportmonks read per 10 seconds."""

    def __init__(self, provider: LatestScoresProvider, *, cache_seconds: int = LIVE_SCORE_CACHE_SECONDS) -> None:
        if cache_seconds <= 0:
            raise ValueError("Live-score cache duration must be positive.")
        self.provider = provider
        self.cache_seconds = cache_seconds
        self._lock = asyncio.Lock()
        self._snapshot: LiveScoreSnapshot | None = None

    async def latest(self, *, now: datetime | None = None) -> LiveScoreSnapshot:
        checked_at = now or datetime.now(UTC)
        if self._is_fresh(checked_at):
            return self._snapshot  # type: ignore[return-value]
        async with self._lock:
            checked_at = now or datetime.now(UTC)
            if self._is_fresh(checked_at):
                return self._snapshot  # type: ignore[return-value]
            try:
                payload = await self.provider.latest_livescores()
            except ProviderError:
                raise
            self._snapshot = normalise_latest_livescores(payload, checked_at=checked_at)
            return self._snapshot

    def _is_fresh(self, now: datetime) -> bool:
        return self._snapshot is not None and now < self._snapshot.checked_at + timedelta(seconds=self.cache_seconds)
