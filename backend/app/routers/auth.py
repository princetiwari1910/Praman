from __future__ import annotations

import re
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, EmailStr, Field

from app.auth.db import (
    create_user,
    get_user_by_email,
    get_user_by_id,
    update_last_login,
    upsert_google_user,
)
from app.auth.security import (
    create_access_token,
    decode_access_token,
    hash_password,
    verify_google_id_token,
    verify_password,
)

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str | None = None
    avatar_url: str | None = None
    auth_provider: str
    created_at: str
    last_login_at: str


class AuthResponse(BaseModel):
    user: UserOut
    token: str


class RegisterRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., min_length=6, max_length=128, description="Password, at least 6 characters")
    full_name: str | None = Field(default=None, max_length=100)


class LoginRequest(BaseModel):
    email: str = Field(..., description="User's email address")
    password: str = Field(..., description="User's password")


class GoogleAuthRequest(BaseModel):
    credential: str = Field(..., description="Google ID Token from Google Identity Services")


EMAIL_REGEX = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def sanitize_user(user: dict[str, Any]) -> UserOut:
    return UserOut(
        id=user["id"],
        email=user["email"],
        full_name=user.get("full_name"),
        avatar_url=user.get("avatar_url"),
        auth_provider=user["auth_provider"],
        created_at=user["created_at"],
        last_login_at=user["last_login_at"],
    )


async def get_current_user(authorization: str | None = Header(default=None)) -> dict[str, Any]:
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Missing Authorization header"},
        )

    parts = authorization.split(" ")
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Invalid Authorization header format. Expected Bearer <token>"},
        )

    token = parts[1]
    payload = decode_access_token(token)
    if not payload or not payload.get("sub"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Token expired or invalid"},
        )

    user = get_user_by_id(payload["sub"])
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "User not found"},
        )

    return user


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(req: RegisterRequest) -> AuthResponse:
    clean_email = req.email.strip().lower()
    if not EMAIL_REGEX.match(clean_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "bad_request", "message": "Please enter a valid email address"},
        )

    if len(req.password) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "bad_request", "message": "Password must be at least 6 characters"},
        )

    existing = get_user_by_email(clean_email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "conflict", "message": "An account with this email already exists"},
        )

    pwd_hash, salt = hash_password(req.password)
    user = create_user(
        email=clean_email,
        password_hash=pwd_hash,
        password_salt=salt,
        full_name=req.full_name,
        auth_provider="email",
    )
    token = create_access_token(user["id"], user["email"])
    return AuthResponse(user=sanitize_user(user), token=token)


@router.post("/login", response_model=AuthResponse)
async def login(req: LoginRequest) -> AuthResponse:
    clean_email = req.email.strip().lower()
    user = get_user_by_email(clean_email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Invalid email or password"},
        )

    if not user.get("password_hash") or not user.get("password_salt"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": "bad_request",
                "message": "This account was created via Google. Please use 'Continue with Google'.",
            },
        )

    if not verify_password(req.password, user["password_salt"], user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Invalid email or password"},
        )

    update_last_login(user["id"])
    refreshed_user = get_user_by_id(user["id"]) or user
    token = create_access_token(refreshed_user["id"], refreshed_user["email"])
    return AuthResponse(user=sanitize_user(refreshed_user), token=token)


@router.post("/google", response_model=AuthResponse)
async def google_auth(req: GoogleAuthRequest) -> AuthResponse:
    google_data = await verify_google_id_token(req.credential)
    if not google_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Google verification failed or token expired"},
        )

    user = upsert_google_user(
        email=google_data["email"],
        google_id=google_data["google_id"],
        full_name=google_data.get("name"),
        avatar_url=google_data.get("picture"),
    )
    token = create_access_token(user["id"], user["email"])
    return AuthResponse(user=sanitize_user(user), token=token)


@router.get("/me")
async def get_me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": sanitize_user(user)}
