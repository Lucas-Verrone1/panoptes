from contextlib import asynccontextmanager

import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from postgrest.exceptions import APIError
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import ai, analytics, auth, documents, ml, projects, sources, users, zendesk
from app.services.ingest import recover_pending_sources


@asynccontextmanager
async def lifespan(_: FastAPI):
    try:
        await recover_pending_sources()
    except Exception:
        pass
    yield


app = FastAPI(title="Panoptes API", version="0.1.0", lifespan=lifespan)
@app.exception_handler(APIError)
async def database_error_handler(request: Request, exc: APIError):
    logging.getLogger(__name__).error("Database failure on %s: %s", request.url.path, exc.code)
    missing_schema = str(exc.code) in {"42703", "42P01", "42883", "PGRST202", "PGRST204", "PGRST205"}
    detail = (
        "O banco está com o schema desatualizado. Execute as migrações pendentes em backend/sql/migrations no SQL Editor do Supabase e tente novamente."
        if missing_schema else "Não foi possível concluir a operação no banco de dados. Consulte o log do backend."
    )
    return JSONResponse(status_code=503, content={"detail": detail})


origins = [item.strip() for item in settings.cors_origins.split(",") if item.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins or ["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(projects.router)
app.include_router(sources.router)
app.include_router(documents.router)
app.include_router(ai.router)
app.include_router(analytics.router)
app.include_router(ml.router)
app.include_router(zendesk.router)


@app.get("/health")
def health():
    return {
        "ok": True,
        "supabase": bool(settings.supabase_url and settings.supabase_service_role_key),
        "gemini": bool(settings.gemini_api_key),
        "turnstile": bool(settings.turnstile_secret),
        "n8n": bool(settings.n8n_webhook_url),
        "zendesk": bool(settings.zendesk_subdomain and settings.zendesk_email and settings.zendesk_api_token),
        "gemini_model": settings.gemini_model,
    }
