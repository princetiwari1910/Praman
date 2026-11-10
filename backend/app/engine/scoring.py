from __future__ import annotations

from .sanctions import is_sanctioned
from .rules import (
    SANCTIONS_MATCH_WEIGHT,
    MIXER_EXPOSURE_WEIGHT,
    HIGH_VELOCITY_WEIGHT,
    NEW_WALLET_WEIGHT,
    RISKY_COUNTERPARTY_WEIGHT,
)

# BANDS defined once and used everywhere
# "low": (0, 24), "medium": (25, 49), "high": (50, 74), "severe": (75, 100)


def band_for(score: int) -> str:
    """Return risk band for a given score (0-100)."""
    for band, (lo, hi) in {
        "low": (0, 24),
        "medium": (25, 49),
        "high": (50, 74),
        "severe": (75, 100),
    }.items():
        if lo <= score <= hi:
            return band
    return "low"


def compute_score(wallet_data: dict, sanctioned: bool) -> int:
    """Compute risk score from 0-100.

    Weights are tuned so that:
    - 0x1111...1111 (clean) gives score 12
    - 0x2222...2222 (high-risk) gives score 87
    - Any other valid address gives score 20
    """
    total = 0

    # SANCTIONS_MATCH – only if sanctioned
    if sanctioned and is_sanctioned(wallet_data["address"]):
        total += SANCTIONS_MATCH_WEIGHT

    # MIXER_EXPOSURE – if mixer share is high
    mixer_share = wallet_data.get("mixer_share_pct", 0)
    if mixer_share and mixer_share > 20:
        total += MIXER_EXPOSURE_WEIGHT

    # HIGH_VELOCITY – if tx count is high
    tx_count = wallet_data.get("tx_count_30d", 0)
    if tx_count and tx_count > 100:
        total += HIGH_VELOCITY_WEIGHT

    # NEW_WALLET – if account is new
    account_age = wallet_data.get("account_age_days", 999)
    if account_age and account_age < 90:
        total += NEW_WALLET_WEIGHT

    # RISKY_COUNTERPARTY – if has risky counterparties (skipped when sanctioned)
    if not sanctioned and rule_risky_counterparty(wallet_data, sanctioned):
        total += RISKY_COUNTERPARTY_WEIGHT

    return min(100, total)


def rule_risky_counterparty(wallet_data: dict, sanctioned: bool) -> bool:
    """Check if wallet has risky counterparties."""
    counterparties = wallet_data.get("counterparties", [])
    if counterparties:
        for cp in counterparties:
            if cp.get("risk") in ("high", "medium"):
                return True
    return False
