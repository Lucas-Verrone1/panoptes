from typing import Annotated, Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user
from app.services.gemini import embed_texts, generate_answer

router = APIRouter(prefix="/ai", tags=["ai"])


class AssistantConfigBody(BaseModel):
    response_style: Literal["direct", "patient", "technical"] = "direct"
    handoff_enabled: bool = True
    handoff_text: str | None = Field(default=None, max_length=1000)
    preferred_model: str | None = Field(default=None, max_length=128)
    custom_prompt: str | None = Field(default=None, max_length=2000)


class ChatBody(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    project_id: str
    session_id: str | None = Field(default=None, max_length=128)
    assistant: AssistantConfigBody | None = None


class FeedbackBody(BaseModel):
    project_id: str
    rating: Literal["positive", "negative"]
    message_excerpt: str | None = None


class SourceReference(BaseModel):
    kind: Literal["document", "zendesk"] = "document"
    label: str
    title: str
    url: str | None = None
    document_id: str | None = None
    ticket_number: str | None = None
    ticket_date: str | None = None


class ConversationSummary(BaseModel):
    id: str
    title: str
    message_count: int
    updated_at: str | None = None
    questions: list[str] = Field(default_factory=list)


class ChatMessageOut(BaseModel):
    id: str
    role: Literal["user", "assistant"]
    content: str
    sources: list[SourceReference] = Field(default_factory=list)
    created_at: str | None = None


class ConversationOut(BaseModel):
    id: str
    title: str
    messages: list[ChatMessageOut]


def _conversation_title(text: str) -> str:
    clean = " ".join((text or "").split()).strip()
    if not clean:
        return "Conversa sem título"
    return f"{clean[:46].rstrip()}…" if len(clean) > 46 else clean


def _ensure_project(project_id: str) -> dict:
    result = get_supabase().table("projects").select("id,name").eq("id", project_id).limit(1).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
    return result.data[0]


def _normalize_stored_sources(value: object) -> list[SourceReference]:
    if not isinstance(value, list):
        return []
    normalized: list[SourceReference] = []
    for item in value:
        if isinstance(item, str):
            normalized.append(SourceReference(kind="document", label="Documentação", title=item, url=item if "://" in item else None))
            continue
        if not isinstance(item, dict):
            continue
        try:
            normalized.append(SourceReference(**item))
        except Exception:
            title = str(item.get("title") or item.get("label") or "Fonte indexada")
            normalized.append(SourceReference(kind="document", label="Documentação", title=title))
    return normalized


def _build_source_references(rows: list[dict]) -> list[SourceReference]:
    sources: list[SourceReference] = []
    seen: set[tuple[str, str]] = set()
    for item in rows:
        source_type = item.get("source_type") or "document"
        metadata = item.get("source_metadata") or {}
        document_id = str(item.get("document_id") or "") or None
        if source_type == "zendesk":
            ticket_number = str(metadata.get("ticket_number") or metadata.get("ticket_id") or "").strip() or None
            key = ("zendesk", ticket_number or document_id or str(item.get("source_url") or ""))
            if key in seen:
                continue
            seen.add(key)
            sources.append(
                SourceReference(
                    kind="zendesk",
                    label="Respondida no Zendesk",
                    title=str(metadata.get("ticket_subject") or item.get("document_title") or "Chamado Zendesk"),
                    url=metadata.get("ticket_url") or item.get("source_url"),
                    document_id=document_id,
                    ticket_number=ticket_number,
                    ticket_date=metadata.get("ticket_solved_at") or metadata.get("ticket_created_at"),
                )
            )
        else:
            title = str(item.get("document_title") or item.get("source_url") or "Documentação indexada")
            key = ("document", document_id or title)
            if key in seen:
                continue
            seen.add(key)
            sources.append(
                SourceReference(
                    kind="document",
                    label="Documentação",
                    title=title,
                    url=item.get("source_url"),
                    document_id=document_id,
                )
            )
        if len(sources) >= 4:
            break
    return sources


def _context_from_rows(rows: list[dict]) -> str:
    blocks: list[str] = []
    for item in rows:
        source_type = item.get("source_type") or "document"
        metadata = item.get("source_metadata") or {}
        if source_type == "zendesk":
            ticket = metadata.get("ticket_number") or metadata.get("ticket_id") or "sem número"
            subject = metadata.get("ticket_subject") or item.get("document_title") or "Chamado Zendesk"
            source_name = f"Zendesk — Chamado #{ticket}: {subject}"
        else:
            source_name = f"Documentação — {item.get('document_title') or item.get('source_url') or 'Fonte indexada'}"
        blocks.append(f"[FONTE: {source_name}]\n{item.get('content') or ''}")
    return "\n\n".join(blocks)


@router.get("/conversations", response_model=list[ConversationSummary])
def list_conversations(
    project_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _ensure_project(project_id)
    rows = (
        get_supabase()
        .table("chat_messages")
        .select("id,role,content,session_id,created_at")
        .eq("project_id", project_id)
        .eq("user_id", user.id)
        .order("created_at")
        .execute()
        .data
        or []
    )

    grouped: dict[str, dict] = {}
    for row in rows:
        session_id = row.get("session_id")
        if not session_id:
            continue

        item = grouped.setdefault(
            session_id,
            {
                "id": session_id,
                "title": "Nova conversa",
                "message_count": 0,
                "updated_at": row.get("created_at"),
                "questions": [],
            },
        )
        item["message_count"] += 1
        item["updated_at"] = row.get("created_at") or item["updated_at"]
        if row.get("role") == "user":
            question = (row.get("content") or "").strip()
            if question:
                item["questions"].append(question)
                if item["title"] == "Nova conversa":
                    item["title"] = _conversation_title(question)

    return sorted(
        [ConversationSummary(**item) for item in grouped.values()],
        key=lambda item: item.updated_at or "",
        reverse=True,
    )


@router.get("/conversations/{session_id}", response_model=ConversationOut)
def get_conversation(
    session_id: str,
    project_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    _ensure_project(project_id)
    rows = (
        get_supabase()
        .table("chat_messages")
        .select("id,role,content,sources,created_at,session_id")
        .eq("project_id", project_id)
        .eq("user_id", user.id)
        .eq("session_id", session_id)
        .order("created_at")
        .execute()
        .data
        or []
    )
    if not rows:
        raise HTTPException(status_code=404, detail="Conversa não encontrada.")

    first_question = next(
        ((row.get("content") or "") for row in rows if row.get("role") == "user"),
        "Conversa",
    )
    messages = [
        ChatMessageOut(
            id=row["id"],
            role=row["role"],
            content=row.get("content") or "",
            sources=_normalize_stored_sources(row.get("sources")),
            created_at=row.get("created_at"),
        )
        for row in rows
    ]
    return ConversationOut(id=session_id, title=_conversation_title(first_question), messages=messages)


@router.delete("/conversations/{session_id}")
def delete_conversation(
    session_id: str,
    project_id: str,
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    get_supabase().table("chat_messages").delete().eq("project_id", project_id).eq("user_id", user.id).eq(
        "session_id", session_id
    ).execute()
    return {"ok": True}


@router.post("/chat")
def chat(body: ChatBody, user: Annotated[CurrentUser, Depends(get_current_user)]):
    client = get_supabase()
    project = _ensure_project(body.project_id)
    session_id = (body.session_id or "").strip() or str(uuid4())

    try:
        query_vector = embed_texts([body.question])[0]
        matches = client.rpc(
            "match_chunks",
            {
                "query_embedding": query_vector,
                "match_project_id": body.project_id,
                "match_count": 6,
            },
        ).execute()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Não foi possível consultar o índice. Confira GEMINI_API_KEY e as migrações SQL. ({exc})",
        )

    rows = matches.data or []
    if not rows:
        answer = (
            "Não encontrei trechos indexados neste projeto. "
            "Cadastre uma fonte ou aprove um chamado do Zendesk para a base de conhecimento."
        )
        sources: list[SourceReference] = []
    else:
        context = _context_from_rows(rows)
        try:
            answer = generate_answer(
                body.question,
                context,
                project["name"],
                assistant_config=body.assistant,
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Falha ao gerar resposta com o Gemini. ({exc})")
        sources = _build_source_references(rows)

    serialized_sources = [source.model_dump(mode="json") for source in sources]
    inserted_messages = client.table("chat_messages").insert(
        [
            {
                "user_id": user.id,
                "project_id": body.project_id,
                "role": "user",
                "content": body.question,
                "sources": [],
                "session_id": session_id,
            },
            {
                "user_id": user.id,
                "project_id": body.project_id,
                "role": "assistant",
                "content": answer,
                "sources": serialized_sources,
                "session_id": session_id,
            },
        ]
    ).execute().data or []

    assistant_message = next((message for message in inserted_messages if message.get("role") == "assistant"), None)
    if assistant_message and rows:
        relation_rows: list[dict] = []
        seen_relations: set[tuple[str, str]] = set()
        for item in rows:
            source_type = item.get("source_type") or "document"
            metadata = item.get("source_metadata") or {}
            document_id = str(item.get("document_id") or "") or None
            zendesk_ticket_id = metadata.get("panoptes_ticket_id") if source_type == "zendesk" else None
            relation_key = (source_type, document_id or str(zendesk_ticket_id or item.get("source_url") or ""))
            if relation_key in seen_relations:
                continue
            seen_relations.add(relation_key)
            relation_rows.append({
                "chat_message_id": assistant_message["id"],
                "project_id": body.project_id,
                "source_type": source_type,
                "document_id": document_id,
                "zendesk_ticket_id": zendesk_ticket_id,
                "source_title": str(item.get("document_title") or metadata.get("ticket_subject") or item.get("source_url") or "Fonte indexada"),
                "source_url": metadata.get("ticket_url") or item.get("source_url"),
                "similarity": item.get("similarity"),
            })
        if relation_rows:
            try:
                client.table("chat_message_sources").insert(relation_rows).execute()
            except Exception:
                # A resposta continua disponível mesmo se a tabela de rastreabilidade ainda não tiver sido migrada.
                pass

    return {"answer": answer, "sources": serialized_sources, "session_id": session_id}


@router.post("/feedback")
def feedback(body: FeedbackBody, user: Annotated[CurrentUser, Depends(get_current_user)]):
    get_supabase().table("ai_feedback").insert(
        {
            "user_id": user.id,
            "project_id": body.project_id,
            "rating": body.rating,
            "message_excerpt": (body.message_excerpt or "")[:280],
        }
    ).execute()
    return {"ok": True}
