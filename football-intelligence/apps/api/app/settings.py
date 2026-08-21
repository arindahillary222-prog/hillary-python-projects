from functools import lru_cache
from pathlib import Path

from pydantic import AnyHttpUrl, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[3]
API_ROOT = Path(__file__).resolve().parents[1]


class Settings(BaseSettings):
    """Configuration is environment-only; secrets never leave server code."""

    # Support the compose-level secret file and the API-local file used for a
    # standalone deployment. Both paths are ignored by Git.
    model_config = SettingsConfigDict(env_file=(PROJECT_ROOT / ".env", API_ROOT / ".env"), extra="ignore")

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
    gemini_api_key: SecretStr | None = None
    # Gemini now requires the current Flash model for new API keys.
    gemini_model: str = "gemini-3.6-flash"
    gemini_fallback_model: str = "gemini-3.1-flash-lite"
    gemini_api_base_url: AnyHttpUrl = "https://generativelanguage.googleapis.com"
    assistant_max_tool_rounds: int = 4


@lru_cache
def get_settings() -> Settings:
    return Settings()
