from __future__ import annotations

from typing import Optional

from .sanctions import is_sanctioned

# Rule codes and weights
SANCTIONS_MATCH_WEIGHT = 60
MIXER_EXPOSURE_WEIGHT = 27
HIGH_VELOCITY_WEIGHT = 15
NEW_WALLET_WEIGHT = 12
RISKY_COUNTERPARTY_WEIGHT = 8


def rule_sanctions_match(wallet_data: dict, sanctioned: bool) -> Optional[dict]:
    """Rule: SANCTIONS_MATCH – address appears on sanctions lists."""
    if sanctioned:
        return {
            "code": "SANCTIONS_MATCH",
            "title": "Sanctions Match",
            "weight": SANCTIONS_MATCH_WEIGHT,
            "detail": "Address found on sanctions list",
        }
    return None


def rule_mixer_exposure(wallet_data: dict, sanctioned: bool) -> Optional[dict]:
    """Rule: MIXER_EXPOSURE – address interacts with known mixing service clusters."""
    mixer_share = wallet_data.get("mixer_share_pct", 0)
    if mixer_share and mixer_share > 20:  # threshold for mixer exposure
        return {
            "code": "MIXER_EXPOSURE",
            "title": "Mixer Exposure",
            "weight": MIXER_EXPOSURE_WEIGHT,
            "detail": f"Mixer share: {mixer_share:.0f}%",
        }
    return None


def rule_high_velocity(wallet_data: dict, sanctioned: bool) -> Optional[dict]:
    """Rule: HIGH_VELOCITY – high transaction count in 30d."""
    tx_count = wallet_data.get("tx_count_30d", 0)
    if tx_count and tx_count > 100:  # threshold for high velocity
        return {
            "code": "HIGH_VELOCITY",
            "title": "High Velocity",
            "weight": HIGH_VELOCITY_WEIGHT,
            "detail": f"{tx_count} transactions in last 30 days",
        }
    return None


def rule_new_wallet(wallet_data: dict, sanctioned: bool) -> Optional[dict]:
    """Rule: NEW_WALLET – recently created account."""
    account_age = wallet_data.get("account_age_days", 999)
    if account_age and account_age < 90:  # newly created
        return {
            "code": "NEW_WALLET",
            "title": "New Wallet",
            "weight": NEW_WALLET_WEIGHT,
            "detail": f"Account age is {account_age} days",
        }
    return None


def rule_risky_counterparty(wallet_data: dict, sanctioned: bool) -> Optional[dict]:
    """Rule: RISKY_COUNTERPARTY – address interacts with high-risk counterparties."""
    if sanctioned:
        return None
    counterparties = wallet_data.get("counterparties", [])
    if counterparties:
        for cp in counterparties:
            if cp.get("risk") in ("high", "medium"):
                return {
                    "code": "RISKY_COUNTERPARTY",
                    "title": "Risky Counterparty",
                    "weight": RISKY_COUNTERPARTY_WEIGHT,
                    "detail": f"Address interacts with {cp.get('label', 'counterparty')} (risk: {cp.get('risk')})",
                }
    return None
