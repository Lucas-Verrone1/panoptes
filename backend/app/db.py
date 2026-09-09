from functools import lru_cache

from fastapi import HTTPException
from supabase import Client, create_client

from app.config import settings


@lru_cache
def get_supabase() -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=503,
            detail="Supabase não configurado. Preencha SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no backend/.env",
        )
    return create_client(settings.supabase_url, settings.supabase_service_role_key)
