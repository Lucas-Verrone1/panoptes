from app.services.gemini import build_answer_prompt, sanitize_answer


def test_sanitize_answer_removes_noise_and_normalizes_spacing():
    raw = "\n\nResposta:\n\n**Panoptes**\n\nEsse recurso permite a busca em documentos.\n\nEsse recurso permite a busca em documentos.\n\n---\n\n- item 1\n- item 2\n"

    cleaned = sanitize_answer(raw)

    assert "Resposta:" not in cleaned
    assert "**Panoptes**" not in cleaned
    assert "---" not in cleaned
    assert cleaned.count("Esse recurso permite a busca em documentos.") == 1
    assert "item 1" in cleaned
    assert "item 2" in cleaned
    assert cleaned.strip().startswith("Esse recurso permite a busca em documentos.")


def test_build_answer_prompt_includes_structured_output_instructions():
    prompt = build_answer_prompt(
        question="Como funciona a autenticação das APIs?",
        context="Contexto de exemplo",
        project_name="Protheus TCC",
        assistant_config=None,
    )

    assert "Resumo" in prompt
    assert "Pontos principais" in prompt
    assert "Use listas curtas" in prompt
    assert "Protheus TCC" in prompt
