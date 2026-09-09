from datetime import datetime, timezone

from app.db import get_supabase
from app.services.chunking import chunk_text
from app.services.gemini import embed_texts, summarize_source
from app.services.n8n import notify_source_ingested
from app.services.scrape import scrape_url


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _update_source(source_id: str, **fields) -> None:
    fields["updated_at"] = _now()
    get_supabase().table("sources").update(fields).eq("id", source_id).execute()


def _update_job(job_id: str, **fields) -> None:
    fields["updated_at"] = _now()
    get_supabase().table("ingestion_jobs").update(fields).eq("id", job_id).execute()


async def process_source(source_id: str, job_id: str, url: str, project_id: str) -> None:
    import asyncio
    import hashlib
    import logging
    client = get_supabase()
    # Compare-and-set prevents two workers from starting the same queued job.
    claimed = client.table("ingestion_jobs").update({"status": "scraping", "updated_at": _now()}).eq("id", job_id).eq("status", "pending").execute()
    if not claimed.data:
        return
    try:
        _update_source(source_id, status="scraping", stage=2, error=None)
        scraped = await scrape_url(url)
        _update_source(source_id, extraction_report=scraped["report"])
        entries = [(chunk, page["url"]) for page in scraped["pages"] for chunk in chunk_text(page["text"])]
        chunks = [text for text, _ in entries]
        if not chunks:
            raise ValueError("Nenhum trecho útil para indexar")
        summary = await asyncio.to_thread(summarize_source, scraped["title"], scraped["text"])
        _update_source(source_id, status="embedding", stage=5)
        _update_job(job_id, status="embedding", stage=5)
        embeddings = await asyncio.to_thread(embed_texts, chunks)
        if len(embeddings) != len(chunks) or any(len(vector) != 768 for vector in embeddings):
            raise ValueError("Quantidade ou dimensão dos embeddings inválida")
        rows = [{"chunk_index": i, "content": text, "source_url": origin, "embedding": vector}
                for i, ((text, origin), vector) in enumerate(zip(entries, embeddings))]
        client.rpc("publish_source", {"p_source": source_id, "p_job": job_id,
            "p_title": scraped["title"], "p_url": scraped["url"], "p_summary": summary,
            "p_text": scraped["text"], "p_hash": hashlib.sha256(scraped["text"].encode()).hexdigest(),
            "p_report": scraped["report"], "p_chunks": rows}).execute()
    except Exception as exc:
        logging.exception("Falha na ingestão %s", job_id)
        _update_source(source_id, status="failed", error=str(exc)[:500])
        _update_job(job_id, status="failed", error=str(exc)[:500])
        return
    await deliver_pending_events()


async def deliver_pending_events() -> None:
    import logging
    from app.config import settings
    if not settings.n8n_webhook_url:
        return
    client = get_supabase()
    events = client.table("ingestion_events").select("*").is_("delivered_at", "null").limit(100).execute().data or []
    for event in events:
        fields = {"attempts": event["attempts"] + 1}
        try:
            await notify_source_ingested({**event["payload"], "eventId": event["id"]})
            fields.update(delivered_at=_now(), last_error=None)
        except Exception as exc:
            fields["last_error"] = str(exc)[:500]
            logging.exception("Falha ao entregar evento %s", event["id"])
        client.table("ingestion_events").update(fields).eq("id", event["id"]).execute()


async def recover_pending_sources() -> None:
    result = (
        get_supabase()
        .table("ingestion_jobs")
        .select("id,source_id,project_id,status,sources(url)")
        .eq("status", "pending")
        .execute()
    )
    for job in result.data or []:
        source = job.get("sources") or {}
        if source.get("url"):
            await process_source(job["source_id"], job["id"], source["url"], job["project_id"])

    await deliver_pending_events()
