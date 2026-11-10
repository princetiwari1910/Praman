from __future__ import annotations

import json
import os
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch

from app.main import app

client = TestClient(app)


def test_risk_severe_fixture():
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
    # Score must equal min(100, sum of reason weights)
    assert data["score"] == min(100, sum(r["weight"] for r in data["reasons"]))
    # generated_at must not be the static 2024 string
    assert data["generated_at"] != "2024-01-15T10:30:00Z"


def test_risk_quota_exceeded():
    """When checks_used >= QUOTA, /v1/risk returns 429 without making 100 calls."""
    # Set QUOTA to 1 via environment and set checks_used to 1 directly
    with patch.dict(os.environ, {"QUOTA": "1"}):
        # Set the usage counter to 1 (quota) for test-key
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


def test_risk_missing_key():
    """Missing or wrong API key returns 401."""
    response = client.get(
        "/v1/risk/ethereum/0x1111111111111111111111111111111111111111",
    )
    assert response.status_code == 401


def test_risk_invalid_address_format():
    """Invalid address format (not 0x + 40 hex) returns 400."""
    response = client.get(
        "/v1/risk/ethereum/0xabc",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 400


def test_risk_unknown_report_id():
    """Unknown report ID returns 404."""
    response = client.get(
        "/v1/reports/doesnotexist.pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 404


def test_pdf_return_type():
    """PDF endpoint returns application/pdf and starts with %PDF."""
    # Create a report first
    post_resp = client.post(
        "/v1/reports",
        json={"address": "0x1111111111111111111111111111111111111111", "chain": "Ethereum"},
        headers={"X-API-Key": "test-key"},
    )
    report_id = post_resp.json()["report_id"]

    # Get the PDF
    get_resp = client.get(
        f"/v1/reports/{report_id}/pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert get_resp.status_code == 200
    assert get_resp.headers.get("content-type", "").startswith("application/pdf")
    assert get_resp.text.startswith("%PDF")


def test_unknown_valid_address_returns_200_low():
    """Any valid 0x+40hex address other than the two fixtures returns 200 low."""
    response = client.get(
        "/v1/risk/ethereum/0x3333333333333333333333333333333333333333",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["data_mode"] == "fixture"
    assert data["score"] == 20
    assert data["band"] == "low"
    # Score must equal min(100, sum of reason weights)
    assert data["score"] == min(100, sum(r["weight"] for r in data["reasons"]))
    # generated_at must not be the static 2024 string
    assert data["generated_at"] != "2024-01-15T10:30:00Z"


def test_error_shape_has_error_and_message():
    """Error responses have exactly {error, message} shape."""
    # Test 401 missing key
    response = client.get(
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
    response = client.get(
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
    response = client.get(
        "/v1/reports/doesnotexist.pdf",
        headers={"X-API-Key": "test-key"},
    )
    assert response.status_code == 404
    data = response.json()
    assert "error" in data
    assert "message" in data
    assert isinstance(data, dict)
    assert len(data) == 2
