from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx


class ProviderError(RuntimeError):
    pass


@dataclass(frozen=True)
class ProviderHealth:
    provider: str
    healthy: bool
    checked_at: datetime
    detail: str


class HttpProvider:
    provider_name = "unnamed"

    def __init__(self, base_url: str, headers: dict[str, str] | None = None) -> None:
        self.base_url = base_url.rstrip("/")
        self.headers = headers or {}

    async def get_json(self, path: str, *, params: dict[str, Any] | None = None) -> dict[str, Any] | list[Any]:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=False) as client:
                response = await client.get(f"{self.base_url}/{path.lstrip('/')}", headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ProviderError(f"{self.provider_name} request failed safely: {type(error).__name__}") from error

    async def health(self) -> ProviderHealth:
        try:
            await self.probe()
            return ProviderHealth(self.provider_name, True, datetime.now(UTC), "available")
        except ProviderError as error:
            return ProviderHealth(self.provider_name, False, datetime.now(UTC), str(error))

    async def probe(self) -> None:
        raise NotImplementedError

