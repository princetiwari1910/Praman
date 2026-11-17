import pytest
from starlette.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_public_demo_screen_without_api_key():
    # Clean address
    res = client.get("/v1/demo/screen/ethereum/0x1111111111111111111111111111111111111111")
    assert res.status_code == 200
    data = res.json()
    assert data["address"] == "0x1111111111111111111111111111111111111111"
    assert data["score"] == 12
    assert data["band"] == "low"
    assert data["is_public_demo"] is True
    assert data["data_mode"] == "fixture"
    assert "reasons" in data
    assert "graph" in data

def test_public_demo_high_risk_screen():
    # High-risk address
    res = client.get("/v1/demo/screen/ethereum/0x2222222222222222222222222222222222222222")
    assert res.status_code == 200
    data = res.json()
    assert data["score"] == 87
    assert data["band"] == "severe"
    assert data["sanctions_hit"] is True

def test_public_demo_validation_errors():
    # Invalid chain
    res = client.get("/v1/demo/screen/solana/0x1111111111111111111111111111111111111111")
    assert res.status_code == 400
    assert res.json()["error"] == "unsupported_chain"

    # Invalid address format
    res = client.get("/v1/demo/screen/ethereum/invalid_address")
    assert res.status_code == 400
    assert res.json()["error"] == "invalid_address"

def test_public_demo_explain_and_pdf():
    # Explain
    exp_res = client.get("/v1/demo/explain/ethereum/0x1111111111111111111111111111111111111111")
    assert exp_res.status_code == 200
    exp_data = exp_res.json()
    assert exp_data["is_public_demo"] is True

    # PDF
    pdf_res = client.get("/v1/demo/reports/ethereum/0x1111111111111111111111111111111111111111/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF")

def test_protected_routes_still_require_api_key():
    # Regular /v1/risk still strictly requires API key
    res = client.get("/v1/risk/ethereum/0x1111111111111111111111111111111111111111")
    assert res.status_code == 401
    assert res.json()["error"] == "unauthorized"
