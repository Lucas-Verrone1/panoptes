import re
import time

from google import genai
from google.genai import types

from app.config import settings

_client: genai.Client | None = None


def gemini_client() -> genai.Client:
    global _client
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY não configurada.")
    if _client is None:
        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def sanitize_answer(answer: str) -> str:
    if not answer:
        return ""

    cleaned = answer.strip()
    cleaned = re.sub(r"(?i)^\s*(resposta|answer)\s*:\s*", "", cleaned, count=1)
    cleaned = re.sub(r"(?m)^\s*#+\s*", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*+]\s*", "- ", cleaned)
    cleaned = re.sub(r"(?<!\*)\*{1,3}([^\n*]+?)\*{1,3}(?!\*)", r"\1", cleaned)
    cleaned = re.sub(r"(?<!_)_{1,2}([^_\n]+?)_{1,2}(?!_)", r"\1", cleaned)
    cleaned = re.sub(r"(?s)`([^`]+)`", r"\1", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*]\s*(?:[0-9]+\.\s*)?", "- ", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*]\s*[-*]\s*[-*]+\s*$", "", cleaned)
    cleaned = re.sub(r"(?m)^\s*[-*]\s*(?:---|___)\s*$", "", cleaned)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)

    paragraphs: list[str] = []
    seen: set[str] = set()
    for paragraph in re.split(r"\n\s*\n", cleaned):
        candidate = re.sub(r"\s+", " ", paragraph.strip())
        if not candidate:
            continue
        candidate = candidate.strip(" -•")
        if not candidate:
            continue
        candidate = re.sub(r"(?i)^(?:resposta|answer)\s*[:\-]\s*", "", candidate)
        candidate = re.sub(r"(?i)^(?:segue abaixo|a seguir|observação|nota)\s*[:\-]?\s*", "", candidate)
        normalized = re.sub(r"\s+", " ", candidate.lower())
        if normalized in seen:
            continue
        seen.add(normalized)
        paragraphs.append(candidate)

    return "\n\n".join(paragraphs).strip()


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


def build_answer_prompt(question: str, context: str, project_name: str, assistant_config: object | None = None) -> str:
    response_style = getattr(assistant_config, 'response_style', 'direct')
    handoff_enabled = getattr(assistant_config, 'handoff_enabled', True)
    handoff_text = (getattr(assistant_config, 'handoff_text', '') or '').strip()
    custom_prompt = (getattr(assistant_config, 'custom_prompt', '') or '').strip()

    style_instruction = {
        'direct': (
            'Responda de forma natural, direta e conversacional. Para perguntas simples, dê a resposta em 1 a 3 frases, '
            'sem criar seções, resumo ou conclusão. Use listas apenas quando elas realmente ajudarem a organizar a resposta.'
        ),
        'patient': (
            'Responda de forma natural, paciente e didática. Explique o necessário em linguagem simples e use passos ou listas '
            'somente quando isso facilitar a compreensão. Evite criar seções artificiais em perguntas simples.'
        ),
        'technical': (
            'Responda com rigor técnico, precisão e nomenclatura correta. Seja objetivo nas perguntas simples; em perguntas '
            'complexas, organize a resposta com pequenos blocos, listas, exemplos ou passos quando forem úteis.'
        ),
    }.get(response_style, 'Responda de forma natural, direta, clara e conversacional.')

    handoff_instruction = (
        'Quando a pergunta exigir uma ação humana, decisão de negócio, aprovação ou encaminhamento, informe isso de forma clara e indique o próximo passo.'
        if handoff_enabled else 'Nunca sugira hand-offs ou encaminhamentos. Responda somente com o conteúdo disponível.'
    )
    if handoff_text:
        handoff_instruction = f"{handoff_instruction} {handoff_text}"

    return (
        "Você é o assistente do Panoptes. Responda em português, com clareza, "
        f"somente com base no contexto indexado do projeto {project_name}. "
        "A consulta à web é permitida apenas na etapa de ingestão das documentações. "
        "Depois da ingestão, você deve responder somente com as informações já anexadas ao banco e com o contexto fornecido abaixo. "
        "Se a informação não estiver no contexto, diga que não encontrou na base de conhecimento cadastrada. "
        f"{style_instruction} "
        f"{handoff_instruction} "
        f"{custom_prompt} "
        "Converse como um assistente de chat moderno. Não use obrigatoriamente títulos como 'Resumo', 'Pontos principais' ou 'Conclusão'. "
        "Adapte o formato à pergunta: para perguntas factuais ou curtas, responda diretamente; para procedimentos, use passos numerados; "
        "para comparações ou múltiplos itens, use listas ou uma estrutura curta quando isso melhorar a leitura. "
        "Não repita a pergunta nem a mesma informação em formatos diferentes. Mantenha a resposta proporcional à complexidade do pedido. "
        "Quando a base de conhecimento trouxer a resposta, responda com segurança e clareza; quando ela não trouxer, diga explicitamente que não encontrou essa informação nas fontes cadastradas do projeto.\n\n"
        f"[CONTEXTO]\n{context}\n\n[PERGUNTA]\n{question}"
    )


def generate_answer(question: str, context: str, project_name: str, assistant_config: object | None = None) -> str:
    client = gemini_client()
    preferred_model = (getattr(assistant_config, 'preferred_model', '') or '').strip()
    prompt = build_answer_prompt(question, context, project_name, assistant_config)
    models = [preferred_model] if preferred_model else [settings.gemini_model]
    if settings.gemini_fallback_model and settings.gemini_fallback_model not in models:
        models.append(settings.gemini_fallback_model)
    last_error: Exception | None = None
    for model in models:
        for attempt in range(max(1, settings.gemini_max_retries)):
            try:
                result = client.models.generate_content(model=model, contents=prompt)
                return sanitize_answer(result.text or "")
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
        summary = sanitize_answer(result.text or "")
        return summary or _fallback_summary(text)
    except Exception:
        return _fallback_summary(text)


def _fallback_summary(text: str) -> str:
    sentences = [sentence.strip() for sentence in text.replace("\n", " ").split(".") if sentence.strip()]
    summary = " ".join(". ".join(sentences[:4])[:1000].split())
    if not summary:
        return "Resumo indisponível."
    return sanitize_answer(summary + ".")
