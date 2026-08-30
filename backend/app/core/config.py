from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "WiFiTwin"
    environment: str = "development"

    database_url: str = "sqlite:///./wifitwin.db"

    lab_mode: bool = True
    authorization_required: bool = True

    class Config:
        env_file = ".env"


settings = Settings()