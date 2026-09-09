from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user
from app.services.gemini import embed_texts, generate_answer

router = APIRouter(prefix="/ai", tags=["ai"])


class ChatBody(BaseModel):
    question: str = Field(min_length=3, max_length=2000)
    project_id: str
    session_id: str | None = Field(default=None, max_length=128)


class FeedbackBody(BaseModel):
    project_id: str
    rating: Literal["positive", "negative"]
    message_excerpt: str | None = None


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
        context = "\n\n".join(item["content"] for item in rows)
        try:
            answer = generate_answer(body.question, context, project.data[0]["name"])
        except Exception as exc:
            raise HTTPException(status_code=503, detail=f"Falha ao gerar resposta com o Gemini. ({exc})")
        sources = list({item.get("source_url") or "Documentação indexada" for item in rows})
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
