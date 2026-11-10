from __future__ import annotations

import os
from pathlib import Path
from fastapi import Header, HTTPException
from starlette import status
from dotenv import load_dotenv


def load_env():
    """Load .env file at request time, not import time."""
    _dotenv_path = Path(__file__).resolve().parent.parent / ".env"
    load_dotenv(dotenv_path=_dotenv_path, override=False)


def require_api_key(x_api_key: str | None = Header(default=None)):
    """Validate X-API-Key header. Raises HTTPException 401 on missing/wrong key."""
    load_env()
    api_keys = os.getenv("API_KEYS", "").split(",")
    api_keys = [k.strip() for k in api_keys if k.strip()]

    if not api_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "API keys not configured"},
        )

    if not x_api_key or x_api_key not in api_keys:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "unauthorized", "message": "Invalid or missing API key"},
        )

    return x_api_key
