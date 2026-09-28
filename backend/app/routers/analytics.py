from typing import Annotated

from fastapi import APIRouter, Depends

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user

router = APIRouter(prefix="/analytics", tags=["analytics"])


def _safe_title(value: str | None, fallback: str) -> str:
    return value.strip() if value and value.strip() else fallback


@router.get("")
def get_analytics(_: Annotated[CurrentUser, Depends(get_current_user)]):
    client = get_supabase()

    projects = client.table("projects").select("id,name,status,updated_at").order("updated_at", desc=True).execute().data or []
    documents = client.table("documents").select("id,title,summary,project_id,updated_at,source_url").order("updated_at", desc=True).execute().data or []
    sources = client.table("sources").select("id,title,status,project_id,created_at,url").order("created_at", desc=True).execute().data or []
    feedback = client.table("ai_feedback").select("id,rating,project_id,created_at").order("created_at", desc=True).execute().data or []
    chat_messages = client.table("chat_messages").select("id,project_id,role,created_at").order("created_at", desc=True).execute().data or []
    ingestion_jobs = client.table("ingestion_jobs").select("id,status,stage,project_id,source_id").order("created_at", desc=True).execute().data or []

    projects_by_id = {project["id"]: project for project in projects}

    document_counts_by_project: dict[str, int] = {}
    source_counts_by_project: dict[str, int] = {}
    status_counts = {"Indexado": 0, "Processando": 0, "Falha": 0}

    for project in projects:
        status = project.get("status") or "Indexado"
        status_counts[status] = status_counts.get(status, 0) + 1

    for document in documents:
        project_id = document.get("project_id") or "sem-projeto"
        document_counts_by_project[project_id] = document_counts_by_project.get(project_id, 0) + 1

    for source in sources:
        project_id = source.get("project_id") or "sem-projeto"
        source_counts_by_project[project_id] = source_counts_by_project.get(project_id, 0) + 1

    indexed_sources = sum(1 for source in sources if (source.get("status") or "").lower() == "indexed")
    positive_feedback = sum(1 for item in feedback if item.get("rating") == "positive")
    negative_feedback = len(feedback) - positive_feedback
    pending_jobs = sum(1 for job in ingestion_jobs if (job.get("status") or "").lower() not in {"indexed", "failed"})

    project_activity = []
    for project in projects:
        project_id = project["id"]
        project_activity.append(
            {
                "id": project_id,
                "name": project.get("name") or "Projeto sem nome",
                "status": project.get("status") or "Indexado",
                "documents": document_counts_by_project.get(project_id, 0),
                "sources": source_counts_by_project.get(project_id, 0),
                "updated_at": project.get("updated_at"),
            }
        )

    project_activity.sort(key=lambda item: (item["status"] != "Indexado", -item["documents"], item["name"]))

    recent_sources = []
    for source in sources[:6]:
        project_name = projects_by_id.get(source.get("project_id"), {}).get("name") or "Projeto sem nome"
        recent_sources.append(
            {
                "title": _safe_title(source.get("title"), source.get("url") or "Fonte sem título"),
                "status": source.get("status") or "pending",
                "project": project_name,
                "created_at": source.get("created_at"),
            }
        )

    recent_documents = []
    for document in documents[:6]:
        project_name = projects_by_id.get(document.get("project_id"), {}).get("name") or "Projeto sem nome"
        recent_documents.append(
            {
                "title": _safe_title(document.get("title"), "Documento sem título"),
                "summary": document.get("summary") or "Sem resumo disponível.",
                "project": project_name,
                "updated_at": document.get("updated_at"),
                "source_url": document.get("source_url"),
            }
        )

    status_distribution = [
        {"label": "Indexado", "value": status_counts.get("Indexado", 0), "color": "var(--success)"},
        {"label": "Processando", "value": status_counts.get("Processando", 0), "color": "var(--warning)"},
        {"label": "Falha", "value": status_counts.get("Falha", 0), "color": "var(--danger)"},
    ]

    feedback_breakdown = [
        {"label": "Positivo", "value": positive_feedback, "color": "var(--success)", "percentage": round((positive_feedback / len(feedback) * 100), 1) if feedback else 0},
        {"label": "Negativo", "value": negative_feedback, "color": "var(--danger)", "percentage": round((negative_feedback / len(feedback) * 100), 1) if feedback else 0},
    ]

    return {
        "metrics": [
            {
                "label": "Documentos indexados",
                "value": len(documents),
                "helper": f"{indexed_sources} fontes concluídas",
                "icon": "file-text",
                "tone": "accent",
            },
            {
                "label": "Fontes monitoradas",
                "value": len(sources),
                "helper": f"{pending_jobs} em processamento",
                "icon": "database",
                "tone": "info",
            },
            {
                "label": "Projetos ativos",
                "value": len(projects),
                "helper": f"{len(chat_messages)} mensagens registradas",
                "icon": "folder-git-2",
                "tone": "success",
            },
            {
                "label": "Feedback de IA",
                "value": len(feedback),
                "helper": f"{positive_feedback} positivos / {negative_feedback} negativos",
                "icon": "messages-square",
                "tone": "warning",
            },
        ],
        "projectStatus": status_distribution,
        "projectActivity": project_activity,
        "recentSources": recent_sources,
        "recentDocuments": recent_documents,
        "feedbackBreakdown": feedback_breakdown,
        "activitySummary": {
            "documents": len(documents),
            "sources": len(sources),
            "projects": len(projects),
            "messages": len(chat_messages),
            "indexedSources": indexed_sources,
            "pendingJobs": pending_jobs,
        },
    }
