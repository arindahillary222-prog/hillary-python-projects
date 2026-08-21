from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    """Configuration is environment-only; secrets never leave server code."""

    model_config = SettingsConfigDict(env_file=PROJECT_ROOT / ".env", extra="ignore")

    app_env: str = "development"
    web_origin: AnyHttpUrl = "http://localhost:3000"
    database_url: str | None = None
    redis_url: str = "redis://localhost:6379/0"
    sportmonks_token: SecretStr | None = None
    api_football_key: SecretStr | None = None
    rapidapi_key: SecretStr | None = None
    the_odds_api_key: SecretStr | None = None
    weather_api_key: SecretStr | None = None
    sentry_dsn: SecretStr | None = None


@lru_cache
def get_settings() -> Settings:
    return Settings()
