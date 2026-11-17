from __future__ import annotations

import hashlib
import logging
import json
import os
import traceback
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
from app.routers.auth import router as auth_router
from app.auth.db import init_db
from app.engine.sanctions import info as sanctions_info


def safe_write_text(path: Path, content: str) -> bool:
    """Write text to a file, creating parent dirs if needed.

    Returns True on success, False on failure (logs warning, does not raise).
    """
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(content, encoding="utf-8")
        return True
    except (OSError, PermissionError):
        logging.getLogger(__name__).warning(
            "Failed to write %s", path, exc_info=True
        )
        return False


def load_config():
    """Load thresholds config from JSON file."""
    config_path = Path(__file__).resolve().parent.parent / "app" / "config" / "thresholds.json"
    with open(config_path) as f:
        return json.load(f)


config = load_config()

async def lifespan(app: FastAPI):
    # Initialize Auth DB
    init_db()

    # Mode
    use_live = os.getenv("USE_FIXTURES", "false").lower() == "false"
    etherscan_key = os.getenv("ETHERSCAN_API_KEY")
    mode = "live" if use_live and etherscan_key else "fixture"
    
    # Quota
    quota = int(os.getenv("QUOTA", "100"))
    
    # API keys configured
    api_keys_env = os.getenv("API_KEYS", "")
    api_keys = [k.strip() for k in api_keys_env.split(",") if k.strip()]
    num_keys = len(api_keys)
    
    # Sanctions info
    from app.engine.sanctions import info as sanctions_info
    sanctions = sanctions_info()
    sanctions_count = sanctions.get("count", 0)
    using_sample = sanctions.get("using_sample", False)
    
    # Etherscan key status
    etherscan_status = "etherscan_key: set" if etherscan_key else "etherscan_key: missing"
    
    with open("/tmp/startup_log.txt", "w") as f:
        f.write(f"mode={mode} quota={quota} keys={num_keys} sanctions_count={sanctions_count} using_sample={using_sample} {etherscan_status}\n")
    
    yield  # Wait for app to shut down

app = FastAPI(
    title="Tathya B2B Financial Risk Intelligence API",
    description="Explainable risk screening for crypto and fintech. Facts Behind Every Risk.",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS configuration
default_cors_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "https://praman.princetiwari.tech",
    "https://tathya.princetiwari.tech",
    "https://praman-kljk.onrender.com",
]
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
extra_origins = [o.strip() for o in allowed_origins_env.split(",") if o.strip()]
allow_origins = default_cors_origins + extra_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization", "Accept", "X-Request-ID"],
    expose_headers=["X-Report-SHA256", "X-Request-ID"],
)


# X-Request-ID middleware – adds X-Request-ID header to every response
@app.middleware("http")
async def add_request_id(request: Request, call_next):
    # Generate 12 hex character request ID
    request_id = os.getenv("REQUEST_ID") or ""
    if not request_id:
        import uuid
        request_id = uuid.uuid4().hex[:12]
    response = await call_next(request)
    response.headers["X-Request-ID"] = request_id
    return response

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
    # Log full traceback with X-Request-ID
    request_id = getattr(request, "headers", {}).get("x-request-id", "unknown")
    logging.getLogger(__name__).exception(
        "Internal server error (request_id: %s)", request_id
    )
    err_msg = str(exc) if str(exc) else "Unexpected server error"
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"error": "internal_error", "message": err_msg},
        media_type="application/json",
    )


@app.on_event("startup")
async def print_startup_info():
    # Mode
    use_live = os.getenv("USE_FIXTURES", "false").lower() == "false"
    etherscan_key = os.getenv("ETHERSCAN_API_KEY")
    mode = "live" if use_live and etherscan_key else "fixture"
    
    # Quota
    quota = int(os.getenv("QUOTA", "100"))
    
    # API keys configured
    api_keys_env = os.getenv("API_KEYS", "")
    api_keys = [k.strip() for k in api_keys_env.split(",") if k.strip()]
    num_keys = len(api_keys)
    
    # Sanctions info
    from app.engine.sanctions import info as sanctions_info
    sanctions = sanctions_info()
    sanctions_count = sanctions.get("count", 0)
    using_sample = sanctions.get("using_sample", False)
    
    # Etherscan key status
    etherscan_status = "etherscan_key: set" if etherscan_key else "etherscan_key: missing"
    
    with open("/tmp/startup_log.txt", "w") as f:
        f.write(f"mode={mode} quota={quota} keys={num_keys} sanctions_count={sanctions_count} using_sample={using_sample} {etherscan_status}\n")

# ============================================================
# Include routers
# ============================================================

app.include_router(auth_router)
app.include_router(risk_router, dependencies=[Depends(require_api_key)])


# ============================================================
# Root health check
# ============================================================

@app.get("/health")
async def health_root():
    """Health check without authentication — root level."""
    from app.state import QUOTA
    return {
        "status": "ok",
        "data_mode": "fixture",
        "quota": QUOTA,
        "version": "v1.1-fix",
    }


@app.get("/")
async def root():
    return {"status": "ok", "message": "Tathya API is running"}


# /v1/health – no auth required
@app.get("/v1/health", include_in_schema=False)
async def health_endpoint():
    """Health check without authentication."""
    from app.state import QUOTA
    use_live = os.getenv("USE_FIXTURES", "false").lower() == "false"
    etherscan_key = os.getenv("ETHERSCAN_API_KEY")
    data_mode = "live" if use_live and etherscan_key else "fixture"
    return {
        "status": "ok",
        "data_mode": data_mode,
        "quota": QUOTA,
    }

# ============================================================

@app.get("/v1/config")
async def config_endpoint(request: Request, api_key: str = Depends(require_api_key)):
    """Configuration – risk bands, auth required."""
    from app.engine.sanctions import info as sanctions_info
    return {"bands": config, "sanctions": sanctions_info()}


# ============================================================
# /v1/usage – usage statistics
# ============================================================

@app.get("/v1/usage")
async def usage_endpoint(api_key: str = Depends(require_api_key)):
    """Usage statistics – counts real /v1/risk calls for the current API key."""
    from app.state import usage, QUOTA
    used = min(usage.get(api_key, 0), QUOTA)
    plan = "free" if os.getenv("USE_FIXTURES", "false").lower() == "true" else "paid"
    return {"checks_used": used, "quota": QUOTA, "plan": plan}


# /v1/dev/reset – conditional on DEMO_MODE
@app.post("/v1/dev/reset")
async def dev_reset(request: Request):
    """Development reset endpoint. Only active when DEMO_MODE=true."""
    demo_mode = os.getenv("DEMO_MODE", "false")
    api_key = request.headers.get("X-API-Key", "")
    
    if demo_mode != "true":
        return JSONResponse(
            status_code=status.HTTP_404_NOT_FOUND,
            content={"error": "not_found", "message": "Not found"},
            media_type="application/json",
        )
    
    # Auth check
    if not api_key:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={"error": "unauthorized", "message": "Invalid or missing API key"},
            media_type="application/json",
        )
    
    # Clear in-memory state
    from app.state import usage, reports, reset
    reset()
    
    # Truncate audit log file (resilient)
    project_root = Path(__file__).resolve().parent.parent
    audit_log = project_root / "audit" / "audit.log"
    safe_write_text(audit_log, "")
    
    # Truncate approvals.jsonl (resilient)
    approvals_log = project_root / "data" / "approvals.jsonl"
    safe_write_text(approvals_log, "")
    
    return {"status": "reset"}

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

    # Append to feedback log (resilient)
    log_entry = {
        "ts": datetime.now(timezone.utc).isoformat(),
        "address": address,
        "verdict": verdict,
        "key_hash": key_hash,
    }
    log_path = data_dir / "feedback.jsonl"
    safe_write_text(log_path, "")

    # The actual append - we need to handle this differently since safe_write_text
    # overwrites. Append by reading existing content first.
    existing = ""
    try:
        existing = log_path.read_text(encoding="utf-8")
    except (OSError, PermissionError):
        existing = ""
    appended = existing + json.dumps(log_entry) + "\n"
    safe_write_text(log_path, appended)

    return {"status": "recorded"}
