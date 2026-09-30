from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        extra="ignore",
    )

    supabase_url: str = ""
    supabase_service_role_key: str = ""
    jwt_secret: str = "change-me-in-production-use-32-bytes-minimum"
    jwt_expire_minutes: int = 720
    cors_origins: str = "http://localhost:3000"
    turnstile_secret: str = ""
    gemini_api_key: str = ""
    gemini_model: str = "gemini-3.6-flash"
    gemini_fallback_model: str = ""
    gemini_max_retries: int = 3
    embedding_model: str = "gemini-embedding-001"
    n8n_webhook_url: str = ""
    n8n_webhook_secret: str = ""
    n8n_timeout_seconds: float = 10.0
    scrape_max_pages: int = 1
    github_max_files: int = 60
    scrape_max_characters: int = 500_000
    upload_max_bytes: int = 8 * 1024 * 1024
    upload_max_text_chars: int = 250_000
    zendesk_subdomain: str = ""
    zendesk_email: str = ""
    zendesk_api_token: str = ""


settings = Settings()
