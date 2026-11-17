from __future__ import annotations

import json
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

        conn.execute("""
            CREATE TABLE IF NOT EXISTS investigations (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                address TEXT NOT NULL,
                chain TEXT NOT NULL,
                score INTEGER NOT NULL,
                band TEXT NOT NULL,
                sanctions_hit INTEGER NOT NULL DEFAULT 0,
                data_mode TEXT NOT NULL,
                reasons_json TEXT NOT NULL,
                graph_json TEXT,
                report_sha256 TEXT,
                notes TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
        """)
        conn.execute("CREATE INDEX IF NOT EXISTS idx_investigations_user ON investigations(user_id);")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_investigations_created ON investigations(created_at DESC);")
        conn.commit()

        # Idempotent migration from legacy praman.db if it exists
        if LEGACY_DB_PATH.exists():
            try:
                legacy_conn = sqlite3.connect(str(LEGACY_DB_PATH))
                legacy_conn.row_factory = sqlite3.Row
                cursor = legacy_conn.execute("SELECT * FROM users")
                legacy_users = cursor.fetchall()
                for u in legacy_users:
                    conn.execute(
                        """
                        INSERT OR IGNORE INTO users (
                            id, email, password_hash, password_salt, full_name,
                            avatar_url, auth_provider, google_id, created_at, last_login_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        """,
                        (
                            u["id"],
                            u["email"],
                            u["password_hash"],
                            u["password_salt"],
                            u["full_name"],
                            u["avatar_url"],
                            u["auth_provider"],
                            u["google_id"],
                            u["created_at"],
                            u["last_login_at"],
                        ),
                    )
                conn.commit()
                legacy_conn.close()
            except Exception:
                # If legacy DB has different schema or cannot be read, ignore without breaking
                pass


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


def create_investigation(
    user_id: str,
    address: str,
    chain: str,
    score: int,
    band: str,
    sanctions_hit: bool,
    data_mode: str,
    reasons: list,
    graph: dict | None = None,
    report_sha256: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    inv_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    reasons_str = json.dumps(reasons)
    graph_str = json.dumps(graph) if graph else None

    with get_db_connection() as conn:
        conn.execute(
            """
            INSERT INTO investigations (
                id, user_id, address, chain, score, band, sanctions_hit,
                data_mode, reasons_json, graph_json, report_sha256, notes, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                inv_id,
                user_id,
                address.strip().lower(),
                chain.strip().lower(),
                score,
                band.strip().lower(),
                1 if sanctions_hit else 0,
                data_mode.strip(),
                reasons_str,
                graph_str,
                report_sha256,
                notes,
                now,
            ),
        )
        conn.commit()

    return get_investigation_by_id(inv_id, user_id)  # type: ignore[return-value]


def list_investigations_by_user(user_id: str, limit: int = 50) -> list[dict[str, Any]]:
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM investigations WHERE user_id = ? ORDER BY created_at DESC LIMIT ?",
            (user_id, limit),
        )
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["sanctions_hit"] = bool(d["sanctions_hit"])
            try:
                d["reasons"] = json.loads(d["reasons_json"])
            except Exception:
                d["reasons"] = []
            try:
                d["graph"] = json.loads(d["graph_json"]) if d["graph_json"] else None
            except Exception:
                d["graph"] = None
            d.pop("reasons_json", None)
            d.pop("graph_json", None)
            result.append(d)
        return result


def get_investigation_by_id(investigation_id: str, user_id: str) -> dict[str, Any] | None:
    with get_db_connection() as conn:
        cursor = conn.execute(
            "SELECT * FROM investigations WHERE id = ? AND user_id = ?",
            (investigation_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return None
        d = dict(row)
        d["sanctions_hit"] = bool(d["sanctions_hit"])
        try:
            d["reasons"] = json.loads(d["reasons_json"])
        except Exception:
            d["reasons"] = []
        try:
            d["graph"] = json.loads(d["graph_json"]) if d["graph_json"] else None
        except Exception:
            d["graph"] = None
        d.pop("reasons_json", None)
        d.pop("graph_json", None)
        return d


def delete_investigation(investigation_id: str, user_id: str) -> bool:
    with get_db_connection() as conn:
        cursor = conn.execute(
            "DELETE FROM investigations WHERE id = ? AND user_id = ?",
            (investigation_id, user_id),
        )
        conn.commit()
        return cursor.rowcount > 0
