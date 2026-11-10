from __future__ import annotations

import hashlib
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from fastapi import FastAPI, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import HTTPException, RequestValidationError
from starlette import status
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.state import usage, reports, reset
from app.dependencies import require_api_key
from app.routers.risk import router as risk_router


def load_config():
    """Load thresholds config from JSON file."""
    config_path = Path(__file__).resolve().parent.parent / "app" / "config" / "thresholds.json"
    with open(config_path) as f:
        return json.load(f)


config = load_config()

app = FastAPI(title="Praman B2B Crypto Wallet Risk Screening API", version="0.1.0")

# CORS – only the dev fronts
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# Global error handlers – every error returns {"error": "<code>", "message": "<text>"}
# Handlers are ordered from most specific to most generic
# ============================================================

@app.exception_handler(HTTPException)
def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTPExceptions – return consistent JSON error format."""
    if isinstance(exc.detail, dict) and set(exc.detail.keys()) <= {"error", "message"}:
        return JSONResponse(
            status_code=exc.status_code,
            content=exc.detail,
            media_type="application/json",
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "unauthorized", "message": str(exc.detail)},
        media_type="application/json",
    )


@app.exception_handler(RequestValidationError)
def validation_exception_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"error": "validation_error", "message": str(exc)},
        media_type="application/json",
    )


@app.exception_handler(StarletteHTTPException)
def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": "not_found", "message": "Route not found"},
        media_type="application/json",
    )


@app.exception_handler(Exception)
def generic_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal_error", "message": str(exc)},
        media_type="application/json",
    )


# ============================================================
# Include the risk router with require_api_key dependency
# ============================================================

app.include_router(risk_router, dependencies=[Depends(require_api_key)])


# ============================================================
# Root health check
# ============================================================

@app.get("/")
async def root():
    return {"status": "ok", "message": "Praman API is running"}


# ============================================================
# /v1/config – returns the four bands from thresholds.json
# ============================================================

@app.get("/v1/config")
async def config_endpoint(request: Request, api_key: str = Depends(require_api_key)):
    """Configuration – risk bands, auth required."""
    return {"bands": config}


# ============================================================
# /v1/usage – usage statistics
# ============================================================

@app.get("/v1/usage")
async def usage_endpoint(api_key: str = Depends(require_api_key)):
    """Usage statistics – counts real /v1/risk calls for the current API key, quota fixed at 100."""
    from app.state import usage
    used = min(usage.get(api_key, 0), 100)
    quota = 100
    plan = "free" if os.getenv("USE_FIXTURES", "false").lower() == "true" else "paid"
    return {"checks_used": used, "quota": quota, "plan": plan}


# ============================================================
# POST /v1/feedback
# ============================================================

@app.post("/v1/feedback")
async def feedback_endpoint(request: Request):
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

    # Ensure data directory exists – use backend/data relative to project root
    project_root = Path(__file__).resolve().parent.parent
    data_dir = project_root / "data"
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
