import re
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user, require_roles

router = APIRouter(prefix="/projects", tags=["projects"])


class ProjectCreate(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    description: str = Field(default="", max_length=500)
    source: str = Field(default="URL", min_length=1, max_length=500)
    branch: str = Field(default="main", min_length=1, max_length=120)
    id: str | None = Field(default=None, min_length=2, max_length=64)

    @field_validator("id")
    @classmethod
    def normalize_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = re.sub(r"[^a-z0-9-_]+", "-", value.strip().lower())
        cleaned = cleaned.strip("-")
        if not cleaned:
            raise ValueError("O identificador do projeto deve conter letras ou números.")
        return cleaned


class ProjectOut(BaseModel):
    id: str
    name: str
    description: str
    source: str
    branch: str
    status: str
    files: int = 0
    updated: str


def _format_updated(value: str | None) -> str:
    if not value:
        return "Agora"
    try:
        updated_at = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except Exception:
        return value

    now = datetime.now(updated_at.tzinfo or timezone.utc)
    delta = now - updated_at
    if delta.days == 0:
        if delta.seconds < 3600:
            minutes = max(1, int(delta.seconds / 60))
            return f"Há {minutes} min"
        hours = max(1, int(delta.seconds / 3600))
        return f"Há {hours} h"
    return updated_at.strftime("%d/%m/%Y %H:%M")


def _project_to_out(row: dict) -> ProjectOut:
    files = 0
    documents = get_supabase().table("documents").select("id").eq("project_id", row["id"]).execute().data or []
    files = len(documents)
    return ProjectOut(
        id=row["id"],
        name=row["name"],
        description=row.get("description") or "",
        source=row.get("source") or "URL",
        branch=row.get("branch") or "main",
        status=row.get("status") or "Indexado",
        files=files,
        updated=_format_updated(row.get("updated_at")),
    )


@router.get("", response_model=list[ProjectOut])
def list_projects(_: Annotated[CurrentUser, Depends(get_current_user)]):
    result = get_supabase().table("projects").select("*").order("updated_at", desc=True).execute()
    return [_project_to_out(row) for row in (result.data or [])]


@router.get("/{project_id}", response_model=ProjectOut)
def get_project(project_id: str, _: Annotated[CurrentUser, Depends(get_current_user)]):
    result = get_supabase().table("projects").select("*").eq("id", project_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return _project_to_out(result.data[0])


@router.post("", response_model=ProjectOut)
def create_project(
    body: ProjectCreate,
    _: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    client = get_supabase()
    project_id = body.id or re.sub(r"[^a-z0-9-]+", "-", body.name.strip().lower())
    project_id = project_id.strip("-")
    if not project_id:
        raise HTTPException(status_code=400, detail="Informe um nome válido para o projeto.")

    existing = client.table("projects").select("id").eq("id", project_id).limit(1).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Já existe um projeto com este identificador.")

    inserted = client.table("projects").insert(
        {
            "id": project_id,
            "name": body.name.strip(),
            "description": body.description.strip(),
            "source": body.source.strip() or "URL",
            "branch": body.branch.strip() or "main",
            "status": "Indexado",
        }
    ).execute()

    if not inserted.data:
        raise HTTPException(status_code=500, detail="Não foi possível criar o projeto.")

    return _project_to_out(inserted.data[0])
