from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from app.db import get_supabase
from app.deps import CurrentUser, get_current_user
from app.security import create_access_token, verify_password
from app.services.turnstile import verify_turnstile

router = APIRouter(prefix="/auth", tags=["auth"])


class LoginBody(BaseModel):
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=3, max_length=128)
    captcha_token: str | None = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, value: str) -> str:
        email = value.strip().lower()
        local_part, separator, domain = email.partition("@")
        if not separator or not local_part or "." not in domain or " " in email:
            raise ValueError("Informe um e-mail válido.")
        return email


class SessionOut(BaseModel):
    token: str
    name: str
    email: str
    role: Literal["admin", "moderator", "user"]


@router.post("/login", response_model=SessionOut)
async def login(body: LoginBody):
    if not await verify_turnstile(body.captcha_token):
        raise HTTPException(status_code=400, detail="Captcha inválido. Atualize a verificação e tente de novo.")
    client = get_supabase()
    result = client.table("profiles").select("*").eq("email", body.email).limit(1).execute()
    user = result.data[0] if result.data else None
    if not user or not verify_password(body.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos.")
    token = create_access_token(user["id"], user["email"], user["role"], user["name"])
    return SessionOut(token=token, name=user["name"], email=user["email"], role=user["role"])


@router.get("/me", response_model=SessionOut)
def me(user: Annotated[CurrentUser, Depends(get_current_user)]):
    return SessionOut(token="", name=user.name, email=user.email, role=user.role)
