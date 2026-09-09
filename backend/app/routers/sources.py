from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field, HttpUrl

from app.db import get_supabase
from app.deps import CurrentUser, require_roles
from app.services.ingest import process_source
from app.services.scrape import validate_public_url, normalize_url

router = APIRouter(prefix="/sources", tags=["sources"])


class SourceCreate(BaseModel):
    url: HttpUrl
    project_id: str = Field(min_length=2, max_length=64)


class SourceOut(BaseModel):
    id: str
    job_id: str | None = None
    project_id: str
    url: str
    title: str | None = None
    status: str
    stage: int
    error: str | None = None
    extraction_report: dict | None = None


@router.post("", response_model=SourceOut)
async def create_source(
    body: SourceCreate,
    background: BackgroundTasks,
    user: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    url = validate_public_url(normalize_url(str(body.url)))
    client = get_supabase()
    project = client.table("projects").select("id").eq("id", body.project_id).limit(1).execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    result = client.rpc("register_source", {"p_project": body.project_id, "p_url": url, "p_user": user.id}).execute().data
    if result["start"]:
        background.add_task(process_source, result["source"]["id"], result["job_id"], url, body.project_id)
    return SourceOut(**result["source"], job_id=result["job_id"])



@router.get("/{source_id}", response_model=SourceOut)
def get_source(source_id: str, _: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))]):
    result = get_supabase().table("sources").select("*").eq("id", source_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Fonte não encontrada.")
    row = result.data[0]
    job = (
        get_supabase()
        .table("ingestion_jobs")
        .select("id")
        .eq("source_id", source_id)
        .limit(1)
        .execute()
    ).data
    return SourceOut(**row, job_id=job[0]["id"] if job else None)

