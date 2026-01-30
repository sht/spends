from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///./spends_tracker.db"
    host: str = "127.0.0.1"
    port: int = 8000
    debug: bool = False
    frontend_url: str = "http://localhost:3000"

    class Config:
        env_file = ".env"


settings = Settings()