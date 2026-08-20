from __future__ import annotations

from datetime import datetime

from .base import HttpProvider, ProviderError


class OpenMeteoWeatherProvider(HttpProvider):
    """Forecast-only adapter. Actual post-match weather is kept separate in storage."""

    provider_name = "open_meteo"

    def __init__(self) -> None:
        super().__init__("https://api.open-meteo.com/v1")

    async def probe(self) -> None:
        await self.forecast(latitude=51.5072, longitude=-0.1276)

    async def forecast(self, *, latitude: float, longitude: float, kickoff_at: datetime | None = None) -> dict:
        if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
            raise ProviderError("Venue coordinates are outside valid WGS84 bounds.")
        params = {
            "latitude": latitude,
            "longitude": longitude,
            "hourly": "temperature_2m,relative_humidity_2m,precipitation,rain,snowfall,wind_speed_10m,wind_gusts_10m",
            "timezone": "UTC",
        }
        payload = await self.get_json("forecast", params=params)
        if not isinstance(payload, dict):
            raise ProviderError("Weather provider returned an unexpected payload.")
        return {"forecast": payload, "requested_kickoff_at": kickoff_at.isoformat() if kickoff_at else None}
