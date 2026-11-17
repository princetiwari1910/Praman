from __future__ import annotations

import sqlite3
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "tathya.db"
LEGACY_DB_PATH = DB_DIR / "praman.db"


def get_db_connection() -> sqlite3.Connection:
    DB_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists() and LEGACY_DB_PATH.exists():
        try:
            shutil.copy2(LEGACY_DB_PATH, DB_PATH)
        except Exception:
            pass
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_db_connection() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password_hash TEXT,
                password_salt TEXT,
                full_name TEXT,
                avatar_url TEXT,
                auth_provider TEXT NOT NULL,
                google_id TEXT,
                created_at TEXT NOT NULL,
                last_login_at TEXT NOT NULL
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);")
        conn.commit()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM users WHERE email = ? COLLATE NOCASE", (email.strip().lower(),))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def get_user_by_google_id(google_id: str) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        cursor = conn.execute("SELECT * FROM users WHERE google_id = ?", (google_id,))
        row = cursor.fetchone()
        return dict(row) if row else None


def create_user(
    email: str,
    password_hash: str | None = None,
    password_salt: str | None = None,
    full_name: str | None = None,
    avatar_url: str | None = None,
    auth_provider: str = "email",
    google_id: str | None = None,
) -> dict[str, Any]:
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    clean_email = email.strip().lower()

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO users (
                id, email, password_hash, password_salt, full_name,
                avatar_url, auth_provider, google_id, created_at, last_login_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user_id,
                clean_email,
                password_hash,
                password_salt,
                full_name.strip() if full_name else None,
                avatar_url,
                auth_provider,
                google_id,
                now,
                now,
            ),
        )
        conn.commit()

    return get_user_by_id(user_id)  # type: ignore[return-value]


def update_last_login(user_id: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with get_db_connection() as conn:
        conn.execute("UPDATE users SET last_login_at = ? WHERE id = ?", (now, user_id))
        conn.commit()


def upsert_google_user(
    email: str,
    google_id: str,
    full_name: str | None = None,
    avatar_url: str | None = None,
) -> dict[str, Any]:
    clean_email = email.strip().lower()
    existing = get_user_by_email(clean_email)
    now = datetime.now(timezone.utc).isoformat()

    with get_db_connection() as conn:
        if existing:
            conn.execute(
                """
                UPDATE users
                SET google_id = ?, full_name = COALESCE(?, full_name),
                    avatar_url = COALESCE(?, avatar_url), last_login_at = ?
                WHERE id = ?
                """,
                (google_id, full_name, avatar_url, now, existing["id"]),
            )
            conn.commit()
            return get_user_by_id(existing["id"])  # type: ignore[return-value]
        else:
            return create_user(
                email=clean_email,
                full_name=full_name,
                avatar_url=avatar_url,
                auth_provider="google",
                google_id=google_id,
            )
