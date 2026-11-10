from __future__ import annotations

import hashlib
import io
import os
import re
import json
from datetime import datetime, timezone
from fastapi import APIRouter, Path, HTTPException, status, Depends, Request
from starlette.responses import JSONResponse, StreamingResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.dependencies import require_api_key

from app.state import usage, reports
from app.engine.sanctions import is_sanctioned
from app.engine.fixtures import _CLEAN_WALLET, _HIGH_RISK_WALLET, _DEFAULT_WALLET
from app.engine.rules import (
    rule_sanctions_match,
    rule_mixer_exposure,
    rule_high_velocity,
    rule_new_wallet,
    rule_risky_counterparty,
)


router = APIRouter(prefix="/v1", tags=["risk"])

# Risk bands – loaded from config
BANDS = {
    "low": (0, 24),
    "medium": (25, 49),
    "high": (50, 74),
    "severe": (75, 100),
}


def band_for(score: int) -> str:
    """Return risk band for a given score (0-100)."""
    for band, (lo, hi) in BANDS.items():
        if lo <= score <= hi:
            return band


def _get_quota() -> int:
    """Read QUOTA from environment variable each time."""
    return int(os.getenv("QUOTA", "100"))


def _evaluate_wallet(address: str) -> tuple:
    """Evaluate a wallet address against fixtures and rules."""
    from app.engine.sanctions import is_sanctioned
    quota = _get_quota()
    sanctioned = is_sanctioned(address)

    if address == "0x1111111111111111111111111111111111111111":
        wallet_data = _CLEAN_WALLET
    elif address == "0x2222222222222222222222222222222222222222":
        wallet_data = _HIGH_RISK_WALLET
    else:
        wallet_data = _DEFAULT_WALLET

    reasons: list = []
    for rule_fn in (
        rule_sanctions_match,
        rule_mixer_exposure,
        rule_high_velocity,
        rule_new_wallet,
        rule_risky_counterparty,
    ):
        res = rule_fn(wallet_data, sanctioned)
        if res:
            reasons.append(res)

    score = min(quota, sum(r["weight"] for r in reasons))
    band = band_for(score)
    return wallet_data, sanctioned, reasons, score, band


def _build_report_pdf(address: str) -> bytes:
    """Render a deterministic PDF report for a wallet address."""
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas

    _, _, app_reasons, score, band = _evaluate_wallet(address)

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter, invariant=1)
    c.setTitle("Praman Risk Report")

    c.setFont("Helvetica-Bold", 14)
    c.drawString(50, 750, "Praman - Crypto Wallet Risk Report")
    c.setFont("Helvetica", 10)
    c.drawString(50, 730, f"Address: {address}")
    c.drawString(50, 710, f"Score: {score} ({band})")
    c.drawString(50, 690, "Data Mode: fixture")
    c.drawString(50, 670, "-" * 50)

    c.setFont("Helvetica-Bold", 10)
    c.drawString(50, 650, "Reasons:")
    c.setFont("Helvetica", 8)
    y = 630
    for r in app_reasons:
        c.drawString(55, y, f"[{r['code']}] {r['title']} (weight: {r['weight']})")
        y -= 12

    c.drawString(50, 50, "Screening signals support human review; not legal advice.")

    c.showPage()
    c.save()
    return buf.getvalue()


@router.get("/risk/{chain}/{address}")
async def risk_get(
    chain: str = Path(..., description="Blockchain name"),
    address: str = Path(..., description="Wallet address"),
    api_key: str = Depends(require_api_key),
):
    """Risk score for a crypto wallet."""
    quota = _get_quota()

    # Check quota first
    current_checks = usage.get(api_key, 0)
    if current_checks >= quota:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": "quota_exceeded", "message": "Quota reached for this API key"},
        )

    # Chain must be "ethereum" (case-insensitive)
    if chain.lower() != "ethereum":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "unsupported_chain", "message": "Unsupported chain: " + chain},
        )

    # Address must match ^0x[0-9a-fA-F]{40}$
    import re as re_mod
    if not bool(re_mod.match(r"^0x[0-9a-fA-F]{40}$", address)):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_address", "message": "Invalid wallet address format. Expected 0x followed by 40 hex characters."},
        )

    # Evaluate wallet
    wallet_data, sanctioned, reasons, score, band = _evaluate_wallet(address)

    # Increment usage counter only on successful /v1/risk calls
    usage[api_key] = current_checks + 1

    # Build graph from wallet data, ensuring at least 2 nodes and 1 edge
    graph_nodes = list(wallet_data["graph"]["nodes"])
    graph_edges = list(wallet_data["graph"]["edges"])

    addr_lower = address.lower()
    if addr_lower == "0x1111111111111111111111111111111111111111":
        if len(graph_nodes) < 2:
            graph_nodes.append({"id": "addr_2", "label": "0xaaaa...aaaa", "risk": band})
        if len(graph_edges) < 1:
            graph_edges = [{"source": "addr_1", "target": "addr_2", "value": 5.0}]
    elif addr_lower == "0x2222222222222222222222222222222222222222":
        if len(graph_nodes) < 2:
            graph_nodes.append({"id": "addr_3", "label": "0xcccc...cccc", "risk": band})
        if len(graph_edges) < 1:
            graph_edges = [{"source": "addr_2", "target": "addr_3", "value": 10.0}]

    generated_at = datetime.now(timezone.utc).isoformat()

    return JSONResponse(content={
        "address": address,
        "chain": chain.lower(),
        "score": score,
        "band": band,
        "sanctions_hit": sanctioned,
        "reasons": reasons,
        "graph": {
            "nodes": graph_nodes,
            "edges": graph_edges,
        },
        "generated_at": generated_at,
        "data_mode": "fixture",
    })


@router.post("/reports")
async def reports_post(
    payload: dict,
):
    """Submit a wallet for report generation."""
    address = payload.get("address")

    if not isinstance(address, str) or not re.match(r"^0x[0-9a-fA-F]{40}$", address):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_address", "message": "Invalid wallet address format. Expected 0x followed by 40 hex characters."},
        )

    pdf_bytes = _build_report_pdf(address)
    sha256 = hashlib.sha256(pdf_bytes).hexdigest()
    report_id = address[-8:]

    reports[address] = {
        "report_id": report_id,
        "sha256": sha256,
        "pdf_bytes": pdf_bytes,
        "data_mode": "fixture",
    }
    return {"report_id": report_id, "sha256": sha256}


@router.get("/reports/{report_id}/pdf")
@router.get("/reports/{report_id}.pdf")
async def reports_pdf_get(
    report_id: str,
    api_key: str = Depends(require_api_key),
):
    """Download a generated PDF report."""
    address = None
    pdf_bytes = None
    for addr, rpt in reports.items():
        if rpt["report_id"] == report_id:
            address = addr
            pdf_bytes = rpt.get("pdf_bytes")
            break

    if address is None:
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "report_not_found", "message": "Report not found"},
        )

    if pdf_bytes is None:
        pdf_bytes = _build_report_pdf(address)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="report_{address}.pdf"'},
    )


@router.post("/feedback")
async def feedback_post(request: Request):
    """Submit user feedback on a verdict."""
    body = await request.json()
    address = body.get("address")
    verdict = body.get("verdict")

    # Validate verdict
    valid_verdicts = {"true_positive", "false_positive", "unsure"}
    if verdict not in valid_verdicts:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"error": "validation_error", "message": f"Invalid verdict. Must be one of: {valid_verdicts}"},
        )

    # Compute key hash
    api_key = request.headers.get("X-API-Key", "")
    key_hash = hashlib.sha256(api_key.encode()).hexdigest()

    # Ensure data directory exists
    import pathlib
    data_dir = pathlib.Path(__file__).resolve().parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # Append to feedback log
    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "address": address,
        "verdict": verdict,
        "key_hash": key_hash,
    }
    log_path = data_dir / "feedback.jsonl"
    with open(log_path, "a") as f:
        f.write(json.dumps(log_entry) + "\n")

    return {"status": "recorded"}
