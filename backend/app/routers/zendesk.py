import asyncio
from datetime import datetime, timezone
from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from app.config import settings
from app.db import get_supabase
from app.deps import CurrentUser, get_current_user, require_roles
from app.services.chunking import chunk_text
from app.services.gemini import embed_texts, summarize_source
from app.services.ingest import deliver_pending_events

router = APIRouter(prefix="/zendesk", tags=["zendesk"])
KnowledgeStatus = Literal["new", "approved", "indexed", "rejected"]


class ZendeskStatusOut(BaseModel):
    configured: bool
    mode: str
    message: str


class ZendeskTicketOut(BaseModel):
    id: str
    project_id: str
    external_id: str
    ticket_number: str
    subject: str
    description: str = ""
    resolution: str = ""
    ticket_status: str = "solved"
    knowledge_status: KnowledgeStatus
    url: str | None = None
    created_at_zendesk: str | None = None
    solved_at: str | None = None
    synced_at: str | None = None
    approved_at: str | None = None
    indexed_at: str | None = None
    document_id: str | None = None
    metadata: dict = Field(default_factory=dict)


class DemoTicketBody(BaseModel):
    project_id: str


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _ensure_project(project_id: str) -> dict:
    rows = get_supabase().table("projects").select("id,name").eq("id", project_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return rows[0]


def _get_ticket(ticket_id: str) -> dict:
    rows = get_supabase().table("zendesk_tickets").select("*").eq("id", ticket_id).limit(1).execute().data or []
    if not rows:
        raise HTTPException(status_code=404, detail="Chamado Zendesk não encontrado.")
    return rows[0]


def _source_metadata(ticket: dict) -> dict:
    return {
        "provider": "zendesk",
        "panoptes_ticket_id": ticket.get("id"),
        "ticket_id": ticket.get("external_id"),
        "ticket_number": ticket.get("ticket_number"),
        "ticket_subject": ticket.get("subject"),
        "ticket_url": ticket.get("url"),
        "ticket_created_at": ticket.get("created_at_zendesk"),
        "ticket_solved_at": ticket.get("solved_at"),
    }


def _ticket_text(ticket: dict) -> str:
    parts = [f"Chamado Zendesk #{ticket['ticket_number']}: {ticket['subject']}"]
    if ticket.get("description"):
        parts.append(f"Descrição do problema:\n{ticket['description'].strip()}")
    if ticket.get("resolution"):
        parts.append(f"Solução validada:\n{ticket['resolution'].strip()}")
    return "\n\n".join(parts).strip()


@router.get("/status", response_model=ZendeskStatusOut)
def zendesk_status(_: Annotated[CurrentUser, Depends(get_current_user)]):
    configured = bool(settings.zendesk_subdomain and settings.zendesk_email and settings.zendesk_api_token)
    return ZendeskStatusOut(
        configured=configured,
        mode="ready" if configured else "prepared",
        message=(
            "Credenciais detectadas. A sincronização aguarda a regra de associação entre tickets e projetos."
            if configured else "Integração preparada; a API do Zendesk ainda não está conectada."
        ),
    )


@router.get("/tickets", response_model=list[ZendeskTicketOut])
def list_tickets(
    project_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
    status: KnowledgeStatus | None = None,
    q: str | None = Query(default=None, max_length=200),
):
    _ensure_project(project_id)
    query = get_supabase().table("zendesk_tickets").select("*").eq("project_id", project_id)
    if user.role == "user":
        query = query.eq("knowledge_status", "indexed")
    elif status:
        query = query.eq("knowledge_status", status)
    rows = query.order("solved_at", desc=True).order("synced_at", desc=True).execute().data or []
    term = (q or "").strip().lower()
    if term:
        rows = [row for row in rows if term in " ".join(str(row.get(key) or "") for key in ("ticket_number", "subject", "description", "resolution")).lower()]
    return [ZendeskTicketOut(**row) for row in rows]


@router.post("/demo-ticket", response_model=ZendeskTicketOut)
def create_demo_ticket(
    body: DemoTicketBody,
    _: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    project = _ensure_project(body.project_id)
    suffix = str(uuid4().int)[-6:]
    now = _now()
    row = {
        "project_id": body.project_id,
        "external_id": f"demo-{suffix}",
        "ticket_number": suffix,
        "subject": "Falha ao processar documento no Panoptes",
        "description": "O usuário informou que um documento foi enviado, porém a informação não aparecia nas respostas do assistente.",
        "resolution": "Foi validado que o documento precisa concluir a etapa de indexação antes de ser consultado pela IA. Após a indexação, o conteúdo passa a fazer parte do contexto RAG do projeto.",
        "ticket_status": "solved",
        "knowledge_status": "new",
        "created_at_zendesk": now,
        "solved_at": now,
        "synced_at": now,
        "metadata": {"demo": True, "project_name": project["name"]},
    }
    rows = get_supabase().table("zendesk_tickets").insert(row).execute().data or []
    return ZendeskTicketOut(**rows[0])


@router.post("/tickets/{ticket_id}/approve", response_model=ZendeskTicketOut)
def approve_ticket(
    ticket_id: str,
    user: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    ticket = _get_ticket(ticket_id)
    if ticket["knowledge_status"] == "indexed":
        return ZendeskTicketOut(**ticket)
    rows = get_supabase().table("zendesk_tickets").update({
        "knowledge_status": "approved", "approved_at": _now(), "approved_by": user.id,
    }).eq("id", ticket_id).execute().data or []
    return ZendeskTicketOut(**rows[0])


@router.post("/tickets/{ticket_id}/reject", response_model=ZendeskTicketOut)
def reject_ticket(
    ticket_id: str,
    _: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    ticket = _get_ticket(ticket_id)
    if ticket["knowledge_status"] == "indexed":
        raise HTTPException(status_code=409, detail="Um chamado indexado não pode ser rejeitado sem remover o conhecimento associado.")
    rows = get_supabase().table("zendesk_tickets").update({
        "knowledge_status": "rejected", "approved_at": None, "approved_by": None,
    }).eq("id", ticket_id).execute().data or []
    return ZendeskTicketOut(**rows[0])


@router.post("/tickets/{ticket_id}/index", response_model=ZendeskTicketOut)
async def index_ticket(
    ticket_id: str,
    _: Annotated[CurrentUser, Depends(require_roles("admin", "moderator"))],
):
    client = get_supabase()
    ticket = _get_ticket(ticket_id)
    if ticket.get("knowledge_status") not in {"approved", "indexed"}:
        raise HTTPException(status_code=409, detail="Aprove o chamado antes de indexá-lo para a IA.")
    _ensure_project(ticket["project_id"])
    text = _ticket_text(ticket)
    if not ticket.get("resolution", "").strip():
        raise HTTPException(status_code=400, detail="O chamado precisa ter uma solução antes de ser indexado.")
    chunks = chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="O chamado não possui conteúdo suficiente para indexação.")
    try:
        embeddings = await asyncio.to_thread(embed_texts, chunks)
        summary = await asyncio.to_thread(summarize_source, ticket["subject"], text)
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Falha ao gerar embeddings para o chamado. ({exc})") from exc

    metadata = _source_metadata(ticket)
    source_url = ticket.get("url") or f"zendesk://ticket/{ticket['ticket_number']}"
    existing = client.table("documents").select("id").eq("project_id", ticket["project_id"]).eq("source_type", "zendesk").eq("external_ref", ticket["ticket_number"]).limit(1).execute().data or []
    document_payload = {
        "project_id": ticket["project_id"], "title": f"Zendesk #{ticket['ticket_number']} — {ticket['subject']}",
        "summary": summary, "source_url": source_url, "generated_by_ai": False, "version": "1.0",
        "full_text": text, "source_type": "zendesk", "external_ref": ticket["ticket_number"],
        "source_metadata": metadata, "updated_at": _now(),
    }
    if existing:
        document_id = existing[0]["id"]
        client.table("documents").update(document_payload).eq("id", document_id).execute()
        client.table("document_chunks").delete().eq("document_id", document_id).execute()
    else:
        rows = client.table("documents").insert(document_payload).execute().data or []
        document_id = rows[0]["id"]
    chunk_rows = [{
        "document_id": document_id, "project_id": ticket["project_id"], "chunk_index": index,
        "content": chunk, "source_url": source_url, "source_type": "zendesk",
        "source_metadata": metadata, "embedding": vector,
    } for index, (chunk, vector) in enumerate(zip(chunks, embeddings))]
    client.table("document_chunks").insert(chunk_rows).execute()
    indexed_at = _now()
    rows = client.table("zendesk_tickets").update({
        "knowledge_status": "indexed", "indexed_at": indexed_at, "document_id": document_id,
    }).eq("id", ticket_id).execute().data or []
    client.table("ingestion_events").insert({
        "document_id": document_id,
        "payload": {"event": "source.ingested", "sourceId": f"zendesk:{ticket_id}", "projectId": ticket["project_id"], "documentId": document_id, "title": document_payload["title"], "url": source_url, "chunkCount": len(chunk_rows)},
    }).execute()
    await deliver_pending_events()
    return ZendeskTicketOut(**rows[0])