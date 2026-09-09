from typing import Annotated, Literal

from fastapi import Depends, Header, HTTPException
from jwt import InvalidTokenError
from pydantic import BaseModel

from app.db import get_supabase
from app.security import decode_access_token

Role = Literal["admin", "moderator", "user"]


class CurrentUser(BaseModel):
    id: str
    email: str
    name: str
    role: Role


def get_current_user(authorization: Annotated[str | None, Header()] = None) -> CurrentUser:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Token ausente.")
    token = authorization.split(" ", 1)[1]
    try:
        payload = decode_access_token(token)
        user_id = payload["sub"]
        result = (
            get_supabase()
            .table("profiles")
            .select("id,email,name,role")
            .eq("id", user_id)
            .limit(1)
            .execute()
        )
        if not result.data:
            raise InvalidTokenError("user not found")
        return CurrentUser(**result.data[0])
    except (InvalidTokenError, KeyError, TypeError):
        raise HTTPException(status_code=401, detail="Token inválido ou expirado.")


def require_roles(*roles: Role):
    def checker(user: Annotated[CurrentUser, Depends(get_current_user)]) -> CurrentUser:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Perfil sem permissão para esta ação.")
        return user

    return checker


def seed_demo_users() -> None:
    from app.config import settings
    if not settings.seed_demo_accounts:
        return
    try:
        client = get_supabase()
    except HTTPException:
        return
    from app.security import hash_password

    existing = client.table("profiles").select("email").limit(1).execute()
    if existing.data:
        return
    rows = [
        {
            "email": "admin@panoptes.local",
            "name": "Victor",
            "role": "admin",
            "password_hash": hash_password("admin123"),
        },
        {
            "email": "moderador@panoptes.local",
            "name": "Marina",
            "role": "moderator",
            "password_hash": hash_password("mod123"),
        },
        {
            "email": "usuario@panoptes.local",
            "name": "Lucas",
            "role": "user",
            "password_hash": hash_password("user123"),
        },
    ]
    client.table("profiles").insert(rows).execute()
