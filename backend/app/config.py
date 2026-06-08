import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Catalog Curator Assistant"
    LOG_LEVEL: str = "INFO"
    PORT: int = 8000
    
    # Database Settings
    # Supports both local and Docker Compose connections
    DATABASE_URL: str = "postgresql://postgres:postgres@db:5432/catalog_db"
    
    # AI Settings
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    
    # Specified Models
    GENERATION_MODEL: str = "openai/gpt-4o-mini"
    EMBEDDING_MODEL: str = "openai/text-embedding-3-small"
    
    # API Timeout (Seconds)
    LLM_TIMEOUT: float = 120.0

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
