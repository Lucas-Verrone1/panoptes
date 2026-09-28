import re
import asyncio
import logging
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user
from app.services.gemini import embed_texts, generate_answer, transcribe_audio

router = APIRouter(prefix="/ai", tags=["ai"])
MAX_TRANSCRIPTION_AUDIO_BYTES = 12 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {"audio/aac", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/webm"}


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


def _source_label(item: dict) -> str:
    if item.get("source_type") == "zendesk":
        metadata = item.get("source_metadata") or {}
        ticket_number = metadata.get("ticket_number") or metadata.get("ticket_id")
        subject = metadata.get("ticket_subject") or item.get("document_title") or "Chamado Zendesk"
        return f"Zendesk #{ticket_number} · {subject}" if ticket_number else f"Zendesk · {subject}"
    return item.get("source_url") or item.get("document_title") or "Documentação indexada"


@router.post("/transcribe")
async def transcribe_voice_message(
    audio: Annotated[UploadFile, File()],
    _: Annotated[CurrentUser, Depends(get_current_user)],
):
    mime_type = (audio.content_type or "").split(";", maxsplit=1)[0].strip().lower()
    if mime_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(status_code=415, detail="Formato de áudio não suportado pelo navegador.")

    audio_bytes = await audio.read(MAX_TRANSCRIPTION_AUDIO_BYTES + 1)
    if len(audio_bytes) > MAX_TRANSCRIPTION_AUDIO_BYTES:
        raise HTTPException(status_code=413, detail="A gravação excede o limite de 12 MB.")
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="A gravação está vazia.")

    try:
        transcript = await asyncio.to_thread(transcribe_audio, audio_bytes, mime_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logging.getLogger(__name__).exception("Falha na transcrição de áudio")
        raise HTTPException(status_code=503, detail="Não foi possível transcrever o áudio agora.") from exc
    finally:
        await audio.close()

    return {"transcript": transcript}


@router.post("/chat")
def chat(body: ChatBody, user: Annotated[CurrentUser, Depends(get_current_user)]):
    client = get_supabase()
    project = client.table("projects").select("id,name").eq("id", body.project_id).limit(1).execute()
    if not project.data:
        raise HTTPException(status_code=404, detail="Projeto não encontrado.")
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
            detail=f"Não foi possível consultar o índice. Confira GEMINI_API_KEY e o schema SQL. ({exc})",
        )
    rows = matches.data or []
    if not rows:
        answer = (
            "Não encontrei trechos indexados neste projeto. "
            "Cadastre uma URL na área de Fontes e aguarde a indexação."
        )
        sources: list[str] = []
    else:
        context = "\n\n".join(
            f"[FONTE: {_source_label(item)}]\n{item['content']}" for item in rows
        )
        try:
            answer = generate_answer(
                body.question,
                context,
                project.data[0]["name"],
                assistant_config=body.assistant,
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Falha ao gerar resposta com o Gemini. ({exc})")
        sources = list(dict.fromkeys(_source_label(item) for item in rows))
    client.table("chat_messages").insert(
        [
            {"user_id": user.id, "project_id": body.project_id, "role": "user", "content": body.question, "sources": [], "session_id": body.session_id},
            {
                "user_id": user.id,
                "project_id": body.project_id,
                "role": "assistant",
                "content": answer,
                "sources": sources,
                "session_id": body.session_id,
            },
        ]
    ).execute()
    return {"answer": answer, "sources": sources}


@router.get("/conversations")
def list_conversations(
    project_id: Annotated[str, Query(...)],
    user: Annotated[CurrentUser, Depends(get_current_user)],
):
    rows = (
        get_supabase()
        .table("chat_messages")
        .select("id,session_id,role,content,sources,created_at")
        .eq("user_id", user.id)
        .eq("project_id", project_id)
        .order("created_at", desc=False)
        .execute()
        .data
        or []
    )

    grouped: dict[str, list[dict]] = {}
    for row in rows:
        session_id = (row.get("session_id") or f"legacy-{row['id']}")
        grouped.setdefault(session_id, []).append(row)

    conversations: list[dict] = []
    for session_id, items in grouped.items():
        messages = [
            {
                "role": item["role"],
                "content": item["content"],
                "sources": item.get("sources") or [],
            }
            for item in items
        ]
        first_user_message = next((item["content"] for item in items if item["role"] == "user"), "Nova conversa")
        title = re.sub(r"\s+", " ", first_user_message).strip()
        if len(title) > 28:
            title = f"{title[:28].rstrip()}…"

        conversations.append({"id": session_id, "title": title or "Nova conversa", "messages": messages})

    return conversations


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
