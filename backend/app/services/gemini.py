from google import genai
from google.genai import types
import time

from app.config import settings

_client: genai.Client | None = None


def gemini_client() -> genai.Client:
    global _client
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada.")
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def embed_texts(texts: list[str]) -> list[list[float]]:
    client = gemini_client()
    vectors: list[list[float]] = []
    for text in texts:
        result = client.models.embed_content(
            model=settings.embedding_model,
            contents=text[:8000],
            config=types.EmbedContentConfig(output_dimensionality=768),
        )
        embedding = result.embeddings[0].values
        vectors.append(list(embedding))
    return vectors


def generate_answer(question: str, context: str, project_name: str) -> str:
    client = gemini_client()
    prompt = (
        "Você é o assistente do Panoptes. Responda em português, com clareza, "
        f"somente com base no contexto do projeto {project_name}. "
        "Se a informação não estiver no contexto, diga que não encontrou na documentação cadastrada.\n\n"
        f"[CONTEXTO]\n{context}\n\n[PERGUNTA]\n{question}"
    )
    models = [settings.gemini_model]
    if settings.gemini_fallback_model and settings.gemini_fallback_model not in models:
        models.append(settings.gemini_fallback_model)
    last_error: Exception | None = None
    for model in models:
        for attempt in range(max(1, settings.gemini_max_retries)):
            try:
                result = client.models.generate_content(model=model, contents=prompt)
                return (result.text or "").strip()
            except Exception as exc:
                last_error = exc
                error_text = str(exc)
                transient = any(code in error_text for code in ("429", "500", "502", "503", "504"))
                if not transient or attempt == settings.gemini_max_retries - 1:
                    break
                time.sleep(2**attempt)
    if last_error:
        raise last_error
    raise RuntimeError("O Gemini não retornou uma resposta.")


def summarize_source(title: str, text: str) -> str:
    try:
        client = gemini_client()
        result = client.models.generate_content(
            model=settings.gemini_model,
            contents=(
                "Você é responsável por produzir um resumo factual de uma página de documentação. "
                "Responda em português, usando somente o texto fornecido e sem inventar informações. "
                "Escreva entre 4 e 6 frases em um único parágrafo, cobrindo, quando existirem: "
                "objetivo, funcionalidades ou conceitos principais, procedimentos/regras, integrações, "
                "parâmetros, limitações e público-alvo. Ignore menus, navegação, rodapés, cookies e frases repetidas. "
                f"Título da página: {title}\n\nTexto extraído:\n{text[:12000]}"
            ),
        )
        summary = " ".join((result.text or "").split())
        return summary or _fallback_summary(text)
    except Exception:
        return _fallback_summary(text)


def _fallback_summary(text: str) -> str:
    sentences = [sentence.strip() for sentence in text.replace("\n", " ").split(".") if sentence.strip()]
    return " ".join(". ".join(sentences[:4])[:1000].split()) + ("." if sentences else "Resumo indisponível.")
