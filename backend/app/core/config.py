from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "WiFiTwin"
    environment: str = "development"

    database_url: str = "sqlite:///./wifitwin.db"

    lab_mode: bool = True
    authorization_required: bool = True

    # Comma-separated list of allowed CORS origins. Defaults to the local Vite dev server.
    # In production, set this to your exact frontend origin(s), e.g. "https://lab.example.com".
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
