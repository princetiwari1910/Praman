from __future__ import annotations

import collections
import re
import time
from datetime import datetime, timezone
from typing import DefaultDict, Deque
from fastapi import APIRouter, Path as _FastAPIPath, Request, status
from starlette.responses import JSONResponse, Response

from app.engine.scoring import evaluate_wallet, band_for
from app.routers.risk import _build_report_pdf

demo_router = APIRouter(prefix="/v1/demo", tags=["public-demo"])

# ── Abuse Prevention: In-memory IP rate limiter ──────────────────────────────
# Limit: 30 requests per 60 seconds per IP
RATE_LIMIT_WINDOW = 60.0
RATE_LIMIT_MAX_REQUESTS = 30
_client_requests: DefaultDict[str, Deque[float]] = collections.defaultdict(collections.deque)

ADDRESS_REGEX = re.compile(r"^0x[0-9a-fA-F]{40}$")


def _is_rate_limited(ip: str) -> bool:
    now = time.time()
    queue = _client_requests[ip]
    while queue and (now - queue[0]) > RATE_LIMIT_WINDOW:
        queue.popleft()
    if len(queue) >= RATE_LIMIT_MAX_REQUESTS:
        return True
    queue.append(now)
    return False


def _get_client_ip(request: Request) -> str:
    # Check X-Forwarded-For if behind reverse proxy / Cloudflare
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@demo_router.get("/screen/{chain}/{address}")
async def demo_screen_get(
    request: Request,
    chain: str = _FastAPIPath(..., description="Blockchain name"),
    address: str = _FastAPIPath(..., description="Ethereum wallet address"),
):
    """
    Public demo wallet screening endpoint.
    Accessible without an API key or account for testing and evaluation.
    Subject to IP-based rate limiting (30 requests/min).
    """
    client_ip = _get_client_ip(request)
    if _is_rate_limited(client_ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={
                "error": "rate_limited",
                "message": "Demo rate limit exceeded. Please wait a minute or create an account for unlimited access.",
            },
        )

    if chain.lower() != "ethereum":
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "unsupported_chain", "message": f"Unsupported chain: {chain}. Demo currently supports ethereum."},
        )

    clean_addr = address.strip()
    if not ADDRESS_REGEX.match(clean_addr):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_address", "message": "Invalid wallet address format. Expected 0x followed by 40 hex characters."},
        )

    # Evaluate wallet safely
    try:
        evaluation = evaluate_wallet(clean_addr, live_mode=False)
    except Exception as exc:
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"error": "evaluation_error", "message": f"Demo screening error: {str(exc)}"},
        )

    return JSONResponse(
        content={
            "address": evaluation["address"],
            "chain": chain.lower(),
            "score": evaluation["score"],
            "band": evaluation["band"],
            "sanctions_hit": evaluation.get("sanctions_hit", False),
            "reasons": evaluation.get("reasons", []),
            "graph": evaluation.get("graph", {"nodes": [], "edges": []}),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "data_mode": evaluation.get("data_mode", "fixture"),
            "data_note": evaluation.get("data_note", "Demo data. Signals support human review; not legal advice."),
            "is_public_demo": True,
            "notice": "Tathya Public Demo. Screening results are explainable risk signals for evaluation.",
        }
    )


@demo_router.get("/explain/{chain}/{address}")
async def demo_explain_get(
    request: Request,
    chain: str = _FastAPIPath(..., description="Blockchain name"),
    address: str = _FastAPIPath(..., description="Wallet address"),
):
    """Public demo explainability endpoint."""
    client_ip = _get_client_ip(request)
    if _is_rate_limited(client_ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": "rate_limited", "message": "Demo rate limit exceeded."},
        )

    if chain.lower() != "ethereum" or not ADDRESS_REGEX.match(address.strip()):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_request", "message": "Invalid chain or address format"},
        )

    clean_addr = address.strip()
    evaluation = evaluate_wallet(clean_addr, live_mode=False)
    reasons = evaluation.get("reasons", [])
    counterfactuals = []
    for reason in reasons:
        remaining_weights = sum(r["weight"] for r in reasons if r is not reason)
        remaining_score = min(100, remaining_weights)
        band_without = band_for(remaining_score)
        counterfactuals.append({
            "without_code": reason["code"],
            "score_without": remaining_score,
            "band_without": band_without,
        })

    return JSONResponse(content={
        "address": evaluation["address"],
        "chain": evaluation.get("chain", "ethereum"),
        "score": evaluation["score"],
        "band": evaluation["band"],
        "data_mode": evaluation.get("data_mode", "fixture"),
        "counterfactuals": counterfactuals,
        "is_public_demo": True,
    })


@demo_router.get("/reports/{chain}/{address}/pdf")
async def demo_report_pdf_get(
    request: Request,
    chain: str = _FastAPIPath(..., description="Blockchain name"),
    address: str = _FastAPIPath(..., description="Wallet address"),
):
    """Public demo PDF report generation."""
    client_ip = _get_client_ip(request)
    if _is_rate_limited(client_ip):
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content={"error": "rate_limited", "message": "Demo rate limit exceeded."},
        )

    if chain.lower() != "ethereum" or not ADDRESS_REGEX.match(address.strip()):
        return JSONResponse(
            status_code=status.HTTP_400_BAD_REQUEST,
            content={"error": "invalid_request", "message": "Invalid chain or address format"},
        )

    clean_addr = address.strip()
    evaluation = evaluate_wallet(clean_addr, live_mode=False)
    gen_at = datetime.now(timezone.utc).isoformat()
    pdf_bytes = _build_report_pdf(clean_addr, evaluation, gen_at)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="tathya-demo-report-{clean_addr[:10]}.pdf"',
            "Content-Type": "application/pdf",
        },
    )
