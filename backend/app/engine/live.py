from __future__ import annotations

import json
import logging
import os
import time
from pathlib import Path
from typing import Optional

import httpx

from .sanctions import is_sanctioned

logger = logging.getLogger(__name__)
logger.setLevel(logging.WARNING)
for _h in logger.handlers:
    _h.setLevel(logging.WARNING)
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("httpcore").setLevel(logging.WARNING)

# Etherscan V2 API base URL
_ETHERSCAN_V2_BASE = "https://api.etherscan.io/v2/api"

# Synthetic fixture addresses that should always use fixture mode
_SYNTHETIC_ADDRESSES = {
    "0x1111111111111111111111111111111111111111",
    "0x2222222222222222222222222222222222222222",
}


class LiveError(Exception):
    """Raised when live Etherscan lookup fails."""

    def __init__(self, code: str, message: str):
        self.code = code
        self.message = message
        super().__init__(f"[{code}] {message}")


# Cache directory
_CACHE_DIR = Path(__file__).resolve().parent.parent / "data" / ".cache"


def _ensure_cache_dir() -> None:
    """Ensure the cache directory exists."""
    _CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _cache_path(address: str) -> Path:
    """Get the cache file path for an address."""
    return _CACHE_DIR / f"{address.lower().replace('0x', '')}.json"


def _read_cache(address: str) -> Optional[dict]:
    """Read cached raw Etherscan response if within 24 hours."""
    cp = _cache_path(address)
    if not cp.exists():
        return None
    try:
        mtime = cp.stat().st_mtime
        if time.time() - mtime > 24 * 3600:
            return None
        with open(cp) as f:
            return json.load(f)
    except (json.JSONDecodeError, OSError):
        return None


def _write_cache(address: str, data: dict) -> None:
    """Write raw Etherscan response to cache."""
    _ensure_cache_dir()
    cp = _cache_path(address)
    with open(cp, "w") as f:
        json.dump(data, f)


def fetch_wallet(address: str) -> dict:
    """Fetch wallet transaction data from Etherscan V2 API.

    Returns parsed wallet data dict on success.
    Raises LiveError on failure with one of: no_key, rate_limited, upstream_error, timeout.

    The API key must NEVER appear in exception messages, log lines or API response.
    """
    # Check if this is a synthetic fixture address – always use fixture mode
    if address.lower() in _SYNTHETIC_ADDRESSES:
        raise LiveError("fixture", f"Address {address} is a synthetic fixture; use fixture data")

    # Check for API key
    api_key = os.getenv("ETHERSCAN_API_KEY")
    if not api_key:
        raise LiveError("no_key", "Etherscan API key not configured")

    # Check cache first
    cached = _read_cache(address)
    if cached is not None:
        return cached

    # Build Etherscan V2 API parameters for txlist
    params = {
        "chainid": "1",
        "module": "account",
        "action": "txlist",
        "address": address,
        "startblock": "0",
        "endblock": "99999999",
        "page": "1",
        "offset": "1000",
        "sort": "desc",
        "apikey": api_key,
    }

    try:
        with httpx.Client(timeout=8.0) as client:
            response = client.get(_ETHERSCAN_V2_BASE, params=params, timeout=8.0)
            response.raise_for_status()
            data = response.json()
    except httpx.TimeoutException:
        raise LiveError("timeout", "Etherscan request timed out")
    except httpx.HTTPStatusError as e:
        # Parse error response to determine error code
        try:
            err_data = e.response.json()
            error_status = err_data.get("status", "")
            if error_status == "0":
                # Check if it's "No transactions found" which is not an error per se
                message = err_data.get("message", "")
                if "No transactions found" in message:
                    # This is not an error; return empty data
                    _write_cache(address, {})
                    return {}
                raise LiveError("upstream_error", f"Etherscan returned error: {message}")
            # Map other Etherscan errors
            raise LiveError("upstream_error", f"Etherscan API error")
        except (json.JSONDecodeError, ValueError):
            raise LiveError("upstream_error", "Etherscan returned invalid response")
    except httpx.RequestError as e:
        # Network-level error – don't leak the API key in the message
        raise LiveError("upstream_error", "Etherskin request failed")

    # Validate response structure
    if not isinstance(data, dict) or data.get("status") != "1":
        message = data.get("message", "Unknown Etherscan error") if isinstance(data, dict) else "Invalid response"
        raise LiveError("upstream_error", f"Etherscan API error: {message}")

    # Cache the raw result
    _write_cache(address, data)

    # Parse the transaction list and compute wallet data
    result = _parse_etherscan_response(data)
    return result


def _parse_etherscan_response(data: dict) -> dict:
    """Parse Etherscan V2 txlist response into wallet data dict."""
    result = {
        "address": data.get("address", ""),
        "txs": [],
        "tx_count": 0,
        "tx_count_capped": False,
        "account_age_days": None,
        "mixer_share_pct": 0.0,
        "counterparties": [],
        "max_24h_tx": 0,
        "hourly_txs": [],
    }

    txs = data.get("result", [])
    if not isinstance(txs, list):
        return result

    result["txs"] = txs
    result["tx_count"] = len(txs)

    # Cap tx count at 1000
    if result["tx_count"] > 1000:
        result["tx_count_capped"] = True
        result["tx_count"] = 1000

    if not txs:
        return result

    # Compute wallet age from oldest transaction
    # timestamps are in seconds since epoch
    timestamps = []
    for tx in txs:
        try:
            ts = int(tx.get("timeStamp", "0"))
            if ts > 0:
                timestamps.append(ts)
        except (ValueError, TypeError):
            continue

    if timestamps:
        oldest = min(timestamps)
        now = int(time.time())
        result["account_age_days"] = max(1, (now - oldest) // 86400)

    # Compute max transactions in any 24-hour window and hourly distribution
    if timestamps:
        sorted_timestamps = sorted(timestamps)
        # Count transactions per hour
        hour_counts = {}
        for ts in sorted_timestamps:
            hour_key = ts // 3600  # truncate to hour
            hour_counts[hour_key] = hour_counts.get(hour_key, 0) + 1

        # Find max in any 24-hour window (24 * 3600 seconds)
        window_size = 24 * 3600
        max_24h = 0
        for i, ts in enumerate(sorted_timestamps):
            window_end = ts + window_size
            # Count how many txs fall within this window
            count = sum(1 for t in sorted_timestamps if ts <= t <= window_end)
            max_24h = max(max_24h, count)

        result["max_24h_tx"] = max_24h
        result["hourly_txs"] = dict(sorted(hour_counts.items()))

    # Identify unique counterparties (to addresses)
    seen_to = set()
    for tx in txs:
        to_addr = tx.get("to", "").lower()
        if to_addr and to_addr != address.lower():
            seen_to.add(to_addr)

    result["counterparties"] = sorted(seen_to)

    # Compute mixer share percentage (simple heuristic: ratio of internal txs to total)
    # In a real implementation, this would analyze tx data more carefully
    # For now, use a placeholder based on tx characteristics
    mixer_txs = sum(1 for tx in txs if tx.get("isError") == "0" and tx.get("value", "0") != "0")
    if len(txs) > 0:
        result["mixer_share_pct"] = min(100.0, mixer_txs / len(txs) * 100)

    return result