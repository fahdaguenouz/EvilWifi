from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    app_name: str = "WiFiTwin"
    environment: str = "development"

    database_url: str = "sqlite:///./wifitwin.db"

    lab_mode: bool = True
    authorization_required: bool = True

settings = Settings()
