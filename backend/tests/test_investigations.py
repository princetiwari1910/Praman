import pytest
from starlette.testclient import TestClient
from app.main import app
from app.auth.db import init_db, get_db_connection

client = TestClient(app)

@pytest.fixture(autouse=True)
def clean_db():
    init_db()
    with get_db_connection() as conn:
        conn.execute("DELETE FROM investigations;")
        conn.execute("DELETE FROM users WHERE email LIKE '%@example.com';")
        conn.commit()


def test_investigations_lifecycle_and_user_isolation():
    # 1. Register User A
    user_a_resp = client.post(
        "/v1/auth/register",
        json={"email": "alice@example.com", "password": "password123", "full_name": "Alice"},
    )
    assert user_a_resp.status_code == 201
    token_a = user_a_resp.json()["token"]

    # 2. Register User B
    user_b_resp = client.post(
        "/v1/auth/register",
        json={"email": "bob@example.com", "password": "password123", "full_name": "Bob"},
    )
    assert user_b_resp.status_code == 201
    token_b = user_b_resp.json()["token"]

    # 3. Unauthenticated save fails
    unauth_resp = client.post(
        "/v1/investigations",
        json={
            "address": "0x1111111111111111111111111111111111111111",
            "score": 12,
            "band": "low",
            "data_mode": "fixture",
        },
    )
    assert unauth_resp.status_code == 401

    # 4. User A saves an investigation
    save_resp = client.post(
        "/v1/investigations",
        headers={"Authorization": f"Bearer {token_a}"},
        json={
            "address": "0x1111111111111111111111111111111111111111",
            "chain": "ethereum",
            "score": 12,
            "band": "low",
            "sanctions_hit": False,
            "data_mode": "fixture",
            "reasons": [{"code": "NEW_WALLET", "weight": 12, "description": "Wallet active < 30 days"}],
            "graph": {"nodes": [], "edges": []},
            "report_sha256": "abcdef123456",
            "notes": "Verified clean test address",
        },
    )
    assert save_resp.status_code == 201
    inv_data = save_resp.json()["investigation"]
    inv_id = inv_data["id"]
    assert inv_data["address"] == "0x1111111111111111111111111111111111111111"
    assert inv_data["score"] == 12
    assert inv_data["notes"] == "Verified clean test address"

    # 5. User A lists investigations -> finds 1 item
    list_a = client.get("/v1/investigations", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a.status_code == 200
    assert list_a.json()["count"] == 1
    assert list_a.json()["investigations"][0]["id"] == inv_id

    # 6. User B lists investigations -> finds 0 items (user isolation)
    list_b = client.get("/v1/investigations", headers={"Authorization": f"Bearer {token_b}"})
    assert list_b.status_code == 200
    assert list_b.json()["count"] == 0

    # 7. User B tries to read User A's investigation -> 404 Not Found
    get_b = client.get(f"/v1/investigations/{inv_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert get_b.status_code == 404

    # 8. User B tries to delete User A's investigation -> 404 Not Found
    del_b = client.delete(f"/v1/investigations/{inv_id}", headers={"Authorization": f"Bearer {token_b}"})
    assert del_b.status_code == 404

    # 9. User A reopens single investigation -> 200 OK
    get_a = client.get(f"/v1/investigations/{inv_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert get_a.status_code == 200
    assert get_a.json()["investigation"]["id"] == inv_id

    # 10. User A deletes investigation -> 200 OK
    del_a = client.delete(f"/v1/investigations/{inv_id}", headers={"Authorization": f"Bearer {token_a}"})
    assert del_a.status_code == 200

    # 11. Investigation is now gone
    list_a_after = client.get("/v1/investigations", headers={"Authorization": f"Bearer {token_a}"})
    assert list_a_after.json()["count"] == 0
