from __future__ import annotations

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Any
import httpx

JWT_SECRET = os.getenv("JWT_SECRET", "tathya-secret-key-change-in-production-2026")
JWT_ALGORITHM = "HS256"


def hash_password(password: str) -> tuple[str, str]:
    """Hash password with PBKDF2-HMAC-SHA256 and a random 16-byte salt."""
    salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return key.hex(), salt


def verify_password(password: str, salt: str, password_hash: str) -> bool:
    """Verify password against salt and hash using constant-time comparison."""
    if not salt or not password_hash:
        return False
    key = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100_000)
    return secrets.compare_digest(key.hex(), password_hash)


def _b64encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def _b64decode(data_str: str) -> bytes:
    padding = "=" * (4 - (len(data_str) % 4))
    return base64.urlsafe_b64decode(data_str + padding)


def create_access_token(user_id: str, email: str, expires_in_seconds: int = 86400 * 7) -> str:
    """Create a compact standard JWT with HS256 signature."""
    now = int(time.time())
    header = {"typ": "JWT", "alg": JWT_ALGORITHM}
    payload = {
        "sub": user_id,
        "email": email,
        "iat": now,
        "exp": now + expires_in_seconds,
    }

    header_bytes = json.dumps(header, separators=(",", ":")).encode("utf-8")
    payload_bytes = json.dumps(payload, separators=(",", ":")).encode("utf-8")

    segment1 = _b64encode(header_bytes)
    segment2 = _b64encode(payload_bytes)

    signing_input = f"{segment1}.{segment2}".encode("utf-8")
    sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    segment3 = _b64encode(sig)

    return f"{segment1}.{segment2}.{segment3}"


def decode_access_token(token: str) -> dict[str, Any] | None:
    """Verify signature and expiration of JWT. Returns payload dict or None."""
    parts = token.split(".")
    if len(parts) != 3:
        return None

    segment1, segment2, segment3 = parts
    signing_input = f"{segment1}.{segment2}".encode("utf-8")

    expected_sig = hmac.new(JWT_SECRET.encode("utf-8"), signing_input, hashlib.sha256).digest()
    actual_sig = _b64decode(segment3)

    if not secrets.compare_digest(expected_sig, actual_sig):
        return None

    try:
        payload_bytes = _b64decode(segment2)
        payload = json.loads(payload_bytes.decode("utf-8"))
    except Exception:
        return None

    now = int(time.time())
    if "exp" in payload and payload["exp"] < now:
        return None

    return payload


async def verify_google_id_token(credential: str) -> dict[str, Any] | None:
    """
    Verify Google OAuth2 ID Token by querying Google's tokeninfo endpoint.
    Returns token payload containing email, name, picture, sub if valid.
    """
    if not credential or not isinstance(credential, str):
        return None

    url = f"https://oauth2.googleapis.com/tokeninfo?id_token={credential.strip()}"
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                return None
            data = resp.json()

            # Ensure email is present and verified
            if not data.get("email"):
                return None

            return {
                "google_id": data.get("sub"),
                "email": data.get("email"),
                "name": data.get("name"),
                "picture": data.get("picture"),
                "email_verified": data.get("email_verified") in (True, "true"),
            }
    except Exception:
        return None
