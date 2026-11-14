from __future__ import annotations

import os
import time as _time

from . import sanctions
from .sanctions import is_sanctioned
from . import live
from . import rules
from .fixtures import _CLEAN_WALLET, _HIGH_RISK_WALLET, _DEFAULT_WALLET

# Rule codes and weights for both live and fixture modes
SANCTIONS_MATCH_WEIGHT = 60
NEW_WALLET_WEIGHT = 12
HIGH_VELOCITY_WEIGHT = 15
RISKY_COUNTERPARTY_WEIGHT = 8
MIXER_EXPOSURE_WEIGHT = 27

# BANDS defined once and used everywhere
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
    return "low"


def _is_synthetic_address(address: str) -> bool:
    """Check if address is a synthetic fixture address."""
    addr = address.lower()
    return addr in {
        "0x1111111111111111111111111111111111111111",
        "0x2222222222222222222222222222222222222222",
    }


def compute_score_and_data(
    address: str,
    wallet_data: dict,
    sanctioned: bool,
    live_mode: bool = False,
) -> dict:
    """Compute risk score and return data dict with mode and reasons.

    If live_mode is True and wallet_data has live-sourced fields, use live reasons.
    Otherwise use fixture reasons from wallet_data.
    """
    total = 0
    reasons: list = []

    # SANCTIONS_MATCH – only if sanctioned
    if sanctioned and is_sanctioned(address):
        total += SANCTIONS_MATCH_WEIGHT
        reasons.append(
            {
                "code": "SANCTIONS_MATCH",
                "title": "Sanctions Match",
                "weight": SANCTIONS_MATCH_WEIGHT,
                "detail": "Address found on sanctions list",
            }
        )

    if live_mode:
        # LIVE MODE reasons (no MIXER_EXPOSURE)
        # NEW_WALLET – if age < 30 days or no transactions
        account_age = wallet_data.get("account_age_days")
        tx_count = wallet_data.get("tx_count", 0)

        if account_age is not None and account_age < 30:
            total += NEW_WALLET_WEIGHT
            reasons.append(
                {
                    "code": "NEW_WALLET",
                    "title": "New Wallet",
                    "weight": NEW_WALLET_WEIGHT,
                    "detail": f"Account age is {account_age} days",
                }
            )
        elif tx_count is None or tx_count == 0:
            total += NEW_WALLET_WEIGHT
            reasons.append(
                {
                    "code": "NEW_WALLET",
                    "title": "New Wallet",
                    "weight": NEW_WALLET_WEIGHT,
                    "detail": "No transactions found",
                }
            )

        # HIGH_VELOCITY – if max in 24h >= 50
        max_24h = wallet_data.get("max_24h_tx", 0)
        if max_24h and max_24h >= 50:
            total += HIGH_VELOCITY_WEIGHT
            reasons.append(
                {
                    "code": "HIGH_VELOCITY",
                    "title": "High Velocity",
                    "weight": HIGH_VELOCITY_WEIGHT,
                    "detail": f"{max_24h} transactions in last 24 hours",
                }
            )

        # RISKY_COUNTERPARTY – if at least one sanctioned counterparty
        counterparties = wallet_data.get("counterparties", [])
        if counterparties:
            for cp in counterparties:
                # In live mode, counterparties are addresses; check sanctions
                cp_addr = cp if isinstance(cp, str) else cp.get("address", "").lower()
                if cp_addr and sanctions.is_sanctioned(cp_addr):
                    total += RISKY_COUNTERPARTY_WEIGHT
                    reasons.append(
                        {
                            "code": "RISKY_COUNTERPARTY",
                            "title": "Risky Counterparty",
                            "weight": RISKY_COUNTERPARTY_WEIGHT,
                            "detail": f"Address interacts with sanctioned counterparty {cp_addr}",
                        }
                    )
                    break
    else:
        # FIXTURE MODE reasons
        # MIXER_EXPOSURE – if mixer share is high
        mixer_share = wallet_data.get("mixer_share_pct", 0)
        if mixer_share and mixer_share > 20:
            total += MIXER_EXPOSURE_WEIGHT
            reasons.append(
                {
                    "code": "MIXER_EXPOSURE",
                    "title": "Mixer Exposure",
                    "weight": MIXER_EXPOSURE_WEIGHT,
                    "detail": f"Mixer share: {mixer_share:.0f}%",
                }
            )

        # HIGH_VELOCITY – if tx count > 100
        tx_count = wallet_data.get("tx_count_30d", 0)
        if tx_count and tx_count > 100:
            total += HIGH_VELOCITY_WEIGHT
            reasons.append(
                {
                    "code": "HIGH_VELOCITY",
                    "title": "High Velocity",
                    "weight": HIGH_VELOCITY_WEIGHT,
                    "detail": f"{tx_count} transactions in last 30 days",
                }
            )

        # NEW_WALLET – if account age < 90 days
        account_age = wallet_data.get("account_age_days", 999)
        if account_age and account_age < 90:
            total += NEW_WALLET_WEIGHT
            reasons.append(
                {
                    "code": "NEW_WALLET",
                    "title": "New Wallet",
                    "weight": NEW_WALLET_WEIGHT,
                    "detail": f"Account age is {account_age} days",
                }
            )

        # RISKY_COUNTERPARTY – if has risky counterparties (skipped when sanctioned)
        if not sanctioned:
            if rules.rule_risky_counterparty(wallet_data, sanctioned):
                total += RISKY_COUNTERPARTY_WEIGHT
                reasons.append(
                    {
                        "code": "RISKY_COUNTERPARTY",
                        "title": "Risky Counterparty",
                        "weight": RISKY_COUNTERPARTY_WEIGHT,
                        "detail": "Address interacts with risky counterparty",
                    }
                )

    score = min(100, total)
    band = band_for(score)

    return {
        "score": score,
        "band": band,
        "reasons": reasons,
        "live_mode": live_mode,
    }


def evaluate_wallet(
    address: str,
    live_mode: bool = False,
) -> dict:
    """Evaluate a wallet address and return risk data dict.

    In live mode, fetches data from Etherscan via live.fetch_wallet().
    Falls back to fixture data if live fetch fails.
    """
    # Determine if we should use live mode
    use_live = (
        live_mode
        and os.getenv("USE_FIXTURES", "false").lower() == "false"
        and live.fetch_wallet is not None
        and not _is_synthetic_address(address)
    )

    wallet_data: dict
    if use_live:
        try:
            wallet_data = live.fetch_wallet(address)
        except live.LiveError as e:
            # Fall back to fixture data
            fallback = _fixture_data_for_address(address)
            return {
                **fallback,
                "score": fallback["score"],
                "band": fallback["band"],
                "reasons": fallback["reasons"],
                "sanctions_hit": fallback.get("sanctions_hit", False),
                "data_mode": "fixture",
                "data_note": f"Live lookup failed ({e.code}); showing fixture data.",
            }
    else:
        # Use fixture data
        wallet_data = _fixture_data_for_address(address)

    # Determine sanctioned status
    sanctioned = sanctions.is_sanctioned(address)

    # Compute score and reasons
    result = compute_score_and_data(address, wallet_data, sanctioned, live_mode=use_live)
    result["data_mode"] = "live" if use_live else "fixture"
    result["address"] = address
    result["sanctions_hit"] = sanctioned

    # Build graph data
    result = _build_graph(result, wallet_data, sanctioned)

    return result


def _fixture_data_for_address(address: str) -> dict:
    """Return fixture wallet data for a given address."""
    if address == "0x1111111111111111111111111111111111111111":
        return {
            "address": address,
            "account_age_days": 30,
            "tx_count": 12,
            "tx_count_30d": 12,
            "mixer_share_pct": 0.0,
            "counterparties": [
                {"id": "addr_1", "label": "0x1111...1111", "risk": "low", "volume": 5.0},
            ],
            "graph": {
                "nodes": [
                    {"id": "addr_1", "label": "0x1111...1111", "risk": "low"},
                    {"id": "addr_2", "label": "0xaaaa...aaaa", "risk": "low"},
                ],
                "edges": [{"source": "addr_1", "target": "addr_2", "value": 5.0}],
            },
            "data_mode": "fixture",
        }
    elif address == "0x2222222222222222222222222222222222222222":
        return {
            "address": address,
            "account_age_days": 180,
            "tx_count": 45,
            "tx_count_30d": 45,
            "mixer_share_pct": 35.0,
            "counterparties": [
                {"id": "addr_2", "label": "0x2222...2222", "risk": "high", "volume": 50.0},
                {"id": "addr_3", "label": "0x3333...3333", "risk": "medium", "volume": 15.0},
            ],
            "graph": {
                "nodes": [
                    {"id": "addr_2", "label": "0x2222...2222", "risk": "high"},
                    {"id": "addr_3", "label": "0x3333...3333", "risk": "medium"},
                ],
                "edges": [{"source": "addr_2", "target": "addr_3", "value": 10.0}],
            },
            "data_mode": "fixture",
        }
    else:
        return {
            "address": address,
            "account_age_days": 30,
            "tx_count": 30,
            "tx_count_30d": 30,
            "mixer_share_pct": 5.0,
            "counterparties": [
                {"id": "addr_4", "label": "random_address", "risk": "medium", "volume": 10.0},
            ],
            "graph": {
                "nodes": [
                    {"id": "addr_4", "label": "random_address", "risk": "medium"},
                    {"id": "addr_5", "label": "0xbbbb...bbbb", "risk": "medium"},
                ],
                "edges": [{"source": "addr_4", "target": "addr_5", "value": 10.0}],
            },
            "data_mode": "fixture",
        }


def _build_graph(
    result: dict,
    wallet_data: dict,
    sanctioned: bool,
) -> dict:
    """Build graph data for the risk report.

    Includes target node plus up to 8 counterparties with most transactions.
    Node risk: 100 for sanctioned address, else 0.
    Edge value = tx count between nodes.
    """
    # Determine target risk risk
    target_risk = 100 if sanctioned else 0

    # Start with target node
    nodes = [{"id": result["address"], "label": result["address"], "risk": target_risk}]
    edges = []

    # Get counterparties from wallet data
    counterparties = wallet_data.get("counterparties", []) if isinstance(wallet_data, dict) else []

    # If we have counterparties, add up to 8 with most transactions
    if counterparties:
        # Sort counterparties by volume (or use whatever ordering is available)
        sorted_cps = sorted(counterparties, key=lambda cp: cp.get("volume", 0), reverse=True)
        for cp in sorted_cps[:8]:
            cp_label = cp.get("label", cp.get("address", "counterparty"))
            cp_risk = 100 if sanctioned else 0
            # Find edge value (tx count) – default to 1
            edge_value = cp.get("volume", 1)
            nodes.append({"id": cp_label, "label": cp_label, "risk": cp_risk})
            edges.append(
                {"source": result["address"], "target": cp_label, "value": edge_value}
            )

    # If no counterparties, ensure at least 2 nodes
    if len(nodes) < 2:
        # Add a dummy node
        nodes.append({"id": "addr_2", "label": "0xaaaa...aaaa", "risk": 0})
    if len(edges) < 1:
        edges = [{"source": result["address"], "target": nodes[1]["id"], "value": 1}]

    result["graph"] = {"nodes": nodes, "edges": edges}
    return result