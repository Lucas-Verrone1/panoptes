import httpx
import asyncio
from uuid import uuid4

from app.config import settings


async def notify_source_ingested(payload: dict) -> None:
    if not settings.n8n_webhook_url:
        return
    headers = {"Content-Type": "application/json"}
    if settings.n8n_webhook_secret:
        headers["X-Panoptes-Webhook-Secret"] = settings.n8n_webhook_secret
    event = {"eventId": str(uuid4()), **payload}
    last_error: Exception | None = None
    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=settings.n8n_timeout_seconds) as client:
                response = await client.post(settings.n8n_webhook_url, json=event, headers=headers)
                response.raise_for_status()
            return
        except (httpx.HTTPError, OSError) as exc:
            last_error = exc
            if attempt < 2:
                await asyncio.sleep(2**attempt)
    if last_error:
        raise last_error