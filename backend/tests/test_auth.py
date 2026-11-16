import pytest
from starlette.testclient import TestClient
from app.main import app
from app.auth.db import init_db

@pytest.fixture(autouse=True)
def setup_auth_db():
    init_db()
    from app.auth.db import get_db_connection
    with get_db_connection() as conn:
        conn.execute("DELETE FROM users WHERE email LIKE '%@example.com';")
        conn.commit()

def test_register_and_login_flow():
    client = TestClient(app)
    
    # 1. Register a new user
    email = "testuser@example.com"
    password = "secretpassword123"
    reg_resp = client.post(
        "/v1/auth/register",
        json={"email": email, "password": password, "full_name": "Test User"},
    )
    assert reg_resp.status_code == 201
    reg_data = reg_resp.json()
    assert "token" in reg_data
    assert reg_data["user"]["email"] == email
    assert reg_data["user"]["full_name"] == "Test User"
    assert reg_data["user"]["auth_provider"] == "email"

    # 2. Cannot register with same email again
    dup_resp = client.post(
        "/v1/auth/register",
        json={"email": email, "password": "otherpassword"},
    )
    assert dup_resp.status_code == 409

    # 3. Login with correct password
    login_resp = client.post(
        "/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["token"]
    assert token

    # 4. Login with wrong password
    bad_login = client.post(
        "/v1/auth/login",
        json={"email": email, "password": "wrongpassword"},
    )
    assert bad_login.status_code == 401

    # 5. Access /v1/auth/me with Bearer token
    me_resp = client.get(
        "/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me_resp.status_code == 200
    assert me_resp.json()["user"]["email"] == email

    # 6. Access /v1/auth/me without token fails
    no_auth_resp = client.get("/v1/auth/me")
    assert no_auth_resp.status_code == 401
