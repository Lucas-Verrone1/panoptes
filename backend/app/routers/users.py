from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.db import get_supabase
from app.deps import CurrentUser, require_roles
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])

ROLE_IN = Literal["admin", "moderator", "user"]


class UserOut(BaseModel):
    id: str
    name: str
    email: str
    role: ROLE_IN


class CreateUserBody(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    role: ROLE_IN = "user"

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        requirements = (
            any(character.islower() for character in value),
            any(character.isupper() for character in value),
            any(character.isdigit() for character in value),
            any(not character.isalnum() and not character.isspace() for character in value),
        )
        if not all(requirements):
            raise ValueError("A senha deve conter maiúscula, minúscula, número e símbolo.")
        return value


@router.get("", response_model=list[UserOut])
def list_users(_: Annotated[CurrentUser, Depends(require_roles("admin"))]):
    result = get_supabase().table("profiles").select("id,name,email,role").order("created_at").execute()
    return result.data or []


@router.post("", response_model=UserOut)
def create_user(body: CreateUserBody, _: Annotated[CurrentUser, Depends(require_roles("admin"))]):
    client = get_supabase()
    exists = client.table("profiles").select("id").eq("email", str(body.email).lower()).limit(1).execute()
    if exists.data:
        raise HTTPException(status_code=409, detail="Já existe um usuário com este e-mail.")
    inserted = (
        client.table("profiles")
        .insert(
            {
                "name": body.name.strip(),
                "email": str(body.email).lower(),
                "password_hash": hash_password(body.password),
                "role": body.role,
            }
        )
        .execute()
    )
    row = inserted.data[0]
    return UserOut(id=row["id"], name=row["name"], email=row["email"], role=row["role"])
