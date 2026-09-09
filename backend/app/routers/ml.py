from typing import Annotated

from fastapi import APIRouter, Depends
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.db import get_supabase
from app.deps import CurrentUser, require_roles

router = APIRouter(prefix="/ml", tags=["ml"])


@router.get("/gaps")
def detect_gaps(_: Annotated[CurrentUser, Depends(require_roles("admin"))]):
    client = get_supabase()
    questions = (
        client.table("chat_messages")
        .select("content,project_id")
        .eq("role", "user")
        .order("created_at", desc=True)
        .limit(40)
        .execute()
        .data
        or []
    )
    chunks = client.table("document_chunks").select("content,project_id").limit(200).execute().data or []
    if not questions or not chunks:
        return {
            "gaps": [
                {
                    "title": "Ainda há pouca evidência",
                    "detail": "Cadastre fontes e gere perguntas no assistente para o modelo identificar lacunas.",
                    "score": None,
                }
            ]
        }

    corpus = [item["content"] for item in chunks]
    vectorizer = TfidfVectorizer(max_features=4000)
    chunk_matrix = vectorizer.fit_transform(corpus)
    gaps = []
    for question in questions:
        query = vectorizer.transform([question["content"]])
        scores = cosine_similarity(query, chunk_matrix)[0]
        best = float(scores.max()) if len(scores) else 0.0
        if best < 0.18:
            gaps.append(
                {
                    "title": question["content"][:90],
                    "detail": f"Baixa cobertura documental no projeto {question['project_id']}.",
                    "score": round(best, 3),
                }
            )
    unique = []
    seen = set()
    for gap in gaps:
        key = gap["title"]
        if key in seen:
            continue
        seen.add(key)
        unique.append(gap)
    return {"gaps": unique[:8] or [{"title": "Cobertura adequada", "detail": "Nenhum gap evidente nas perguntas recentes.", "score": 1}]}
