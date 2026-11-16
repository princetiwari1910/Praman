from __future__ import annotations

import json
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

client = TestClient(app)


def test_severe_fixture_and_explain():
    """Valid API key returns high-risk fixture data (severe band, 0x2222...)."""
    response = client.get(
        "/v1/risk/ethereum/0x2222222222222222222222222222222222222222",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data_mode"] == "fixture"
    assert data["score"] == 87
    assert data["band"] == "severe"
    assert data["sanctions_hit"] is True
    assert data["score"] == min(100, sum(r["weight"] for r in data["reasons"]))
    assert data["generated_at"] != "2024-01-15T10:30:00Z"


def test_missing_api_key_returns_401():
    """Missing or wrong API key returns 401."""
    response = client.get(
        "/v1/risk/ethereum/0x1111111111111111111111111111111111111111",
    )
    assert response.status_code == 401


def test_invalid_address_format_returns_400():
    """Invalid address format (not 0x + 40 hex) returns 400."""
    response = client.get(
        "/v1/risk/ethereum/0xabc",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 400


def test_unknown_report_returns_404():
    """Unknown report ID returns 404."""
    response = client.get(
        "/v1/reports/doesnotexist.pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 404


def test_quota_exceeded_returns_429():
    """When checks_used >= QUOTA, /v1/risk returns 429 without making 100 calls."""
    with patch.dict(os.environ, {"QUOTA": "1"}):
        from app.state import usage
        usage["test-key"] = 1

        response = client.get(
            "/v1/risk/ethereum/0x1111111111111111111111111111111111111111",
            headers={"X-API-Key": "test-key"},
        )
        assert response.status_code == 429
        data = response.json()
        assert data["error"] == "quota_exceeded"
        assert "Quota reached" in data["message"]


def test_report_pdf_and_evidence():
    """POST /v1/reports returns 201, PDF endpoint returns %PDF, evidence returns v1 format."""
    post_resp = client.post(
        "/v1/reports",
        json={"address": "0x1111111111111111111111111111111111111111", "chain": "Ethereum"},
        headers={"X-API-Key": "test-key"},
    )
    assert post_resp.status_code == 201
    report_id = post_resp.json()["report_id"]

    # PDF endpoint returns %PDF
    get_resp = client.get(
        f"/v1/reports/{report_id}/pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert get_resp.status_code == 200
    assert get_resp.text.startswith("%PDF")

    # Evidence endpoint returns v1 format
    ev_resp = client.get(
        f"/v1/reports/{report_id}/evidence",
        headers={"X-API-Key": "test-key"},
    )
    assert ev_resp.status_code == 200
    ev_data = ev_resp.json()
    assert ev_data["format"] == "praman-evidence-v1"
    assert "report" in ev_data
    assert "sha256" in ev_data
    assert "canonicalization" in ev_data


def test_batch_returns_422_when_no_file():
    """POST /v1/batch returns 422 when no file uploaded."""
    resp = client.post("/v1/batch", headers={"X-API-Key": "test-key"})
    assert resp.status_code == 422


def test_error_shape_health_feedback_audit():
    """Error responses have exactly {error, message} shape. Health OK without key."""
    from fastapi.testclient import TestClient
    from app.main import app

    client2 = TestClient(app)

    # Test 401 missing key
    response = client2.get(
        "/v1/risk/ethereum/0x1111111111111111111111111111111111111111",
        headers={},
    )
    assert response.status_code == 401
    data = response.json()
    assert "error" in data
    assert "message" in data
    assert isinstance(data, dict)
    assert len(data) == 2

    # Test 400 invalid address
    response = client2.get(
        "/v1/risk/ethereum/0xabc",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 400
    data = response.json()
    assert "error" in data
    assert "message" in data
    assert isinstance(data, dict)
    assert len(data) == 2

    # Test 404 unknown report id
    response = client2.get(
        "/v1/reports/doesnotexist.pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "message" in data
    assert isinstance(data, dict)
    assert len(data) == 2

    # Health check returns ok without authentication
    response = client2.get("/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "data_mode" in data
    assert "quota" in data