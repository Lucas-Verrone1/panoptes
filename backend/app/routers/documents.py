from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("")
def list_documents(_: Annotated[CurrentUser, Depends(get_current_user)], project_id: str | None = None):
    query = get_supabase().table("documents").select("*").order("updated_at", desc=True)
    if project_id:
        query = query.eq("project_id", project_id)
    return query.execute().data or []


@router.get("/{document_id}")
def get_document(document_id: str, _: Annotated[CurrentUser, Depends(get_current_user)]):
    result = (
        get_supabase()
        .table("documents")
        .select("*,document_chunks(id,chunk_index,content,source_url)")
        .eq("id", document_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Documentação não encontrada.")
    return result.data[0]

