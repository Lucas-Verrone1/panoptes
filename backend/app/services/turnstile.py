import httpx

from app.config import settings


async def verify_turnstile(token: str | None) -> bool:
    if not settings.turnstile_secret:
        return True
    if not token:
        return False
    async with httpx.AsyncClient(timeout=10) as client:
        response = await client.post(
            "https://challenges.cloudflare.com/turnstile/v0/siteverify",
            data={"secret": settings.turnstile_secret, "response": token},
        )
        payload = response.json()
    return bool(payload.get("success"))
