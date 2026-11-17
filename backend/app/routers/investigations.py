from __future__ import annotations

import re
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from app.auth.db import (
    create_investigation,
    list_investigations_by_user,
    get_investigation_by_id,
    delete_investigation,
)
from app.routers.auth import get_current_user

investigations_router = APIRouter(prefix="/v1/investigations", tags=["investigations"])

ADDRESS_REGEX = re.compile(r"^0x[0-9a-fA-F]{40}$")


class SaveInvestigationRequest(BaseModel):
    address: str = Field(..., description="Ethereum wallet address")
    chain: str = Field(default="ethereum", description="Blockchain name")
    score: int = Field(..., ge=0, le=100, description="Risk score 0-100")
    band: str = Field(..., description="Risk band: low, medium, high, severe")
    sanctions_hit: bool = Field(default=False)
    data_mode: str = Field(default="fixture", description="fixture or live")
    reasons: list[dict[str, Any]] = Field(default_factory=list)
    graph: dict[str, Any] | None = None
    report_sha256: str | None = None
    notes: str | None = None


@investigations_router.post("", status_code=status.HTTP_201_CREATED)
async def save_investigation(
    req: SaveInvestigationRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Save an investigation to the authenticated user's private account history."""
    clean_addr = req.address.strip()
    if not ADDRESS_REGEX.match(clean_addr):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "invalid_address", "message": "Invalid wallet address format."},
        )

    investigation = create_investigation(
        user_id=current_user["id"],
        address=clean_addr,
        chain=req.chain.strip().lower(),
        score=req.score,
        band=req.band.strip().lower(),
        sanctions_hit=req.sanctions_hit,
        data_mode=req.data_mode.strip(),
        reasons=req.reasons,
        graph=req.graph,
        report_sha256=req.report_sha256,
        notes=req.notes,
    )
    return {"investigation": investigation}


@investigations_router.get("")
async def get_my_investigations(
    limit: int = 50,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Retrieve all saved investigations for the authenticated user."""
    safe_limit = max(1, min(limit, 100))
    investigations = list_investigations_by_user(current_user["id"], limit=safe_limit)
    return {"investigations": investigations, "count": len(investigations)}


@investigations_router.get("/{investigation_id}")
async def get_single_investigation(
    investigation_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Retrieve a single saved investigation owned by the authenticated user."""
    inv = get_investigation_by_id(investigation_id, current_user["id"])
    if not inv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Investigation not found or unauthorized"},
        )
    return {"investigation": inv}


@investigations_router.delete("/{investigation_id}")
async def remove_investigation(
    investigation_id: str,
    current_user: dict[str, Any] = Depends(get_current_user),
):
    """Delete a saved investigation owned by the authenticated user."""
    deleted = delete_investigation(investigation_id, current_user["id"])
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "not_found", "message": "Investigation not found or unauthorized"},
        )
    return {"status": "deleted", "id": investigation_id}
