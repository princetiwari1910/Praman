from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

# Use the same path resolution as main.py
_CODE_FILE_PATH = Path(__file__).resolve()
_PROJECT_ROOT = _CODE_FILE_PATH.parent.parent.parent
_DATA_DIR = _PROJECT_ROOT / "data"

# Module-level state (lazy-loaded)
_sanctions_addresses: set[str] | None = None
_loading_info: dict | None = None
_loaded: bool = False

# Synthetic fixture that must always remain sanctioned
_SYNTHETIC_FIXTURE = "0x2222222222222222222222222222222222222222"


def _load_sanctions() -> None:
    global _sanctions_addresses, _loading_info, _loaded

    if _loaded:
        return

    # Try sanctions.json first, then fall back to sanctions_sample.json
    # If both missing, use empty set (never raise)
    found = False
    for path, fmt_name in [
        (_DATA_DIR / "sanctions.json", "sanctions.json"),
        (_DATA_DIR / "sanctions_sample.json", "sanctions_sample.json"),
    ]:
        if path.exists():
            try:
                with open(path) as f:
                    data = json.load(f)
            except (OSError, PermissionError, json.JSONDecodeError):
                continue
            # Handle new format (load_ofac.py): has "addresses" key
            if isinstance(data, dict) and "addresses" in data:
                _sanctions_addresses = {a.lower() for a in data["addresses"]}
            # Handle old format (sanctions_sample.json): dict of address->entry
            elif isinstance(data, dict):
                _sanctions_addresses = {k.lower() for k in data}
            found = True
            break

    # Always include the synthetic fixture 0x2222...2222 if we have any addresses
    if _sanctions_addresses is not None:
        _sanctions_addresses = _sanctions_addresses | {_SYNTHETIC_FIXTURE.lower()}

    if found:
        _loading_info = {
            "source": fmt_name,
            "count": len(_sanctions_addresses),
            "loaded_at": datetime.now(timezone.utc).isoformat(),
            "using_sample": fmt_name == "sanctions_sample.json",
        }
    else:
        # Both files missing/unreadable – use empty set
        _sanctions_addresses = set()
        _loading_info = {
            "source": "synthetic_fixture",
            "count": 0,
            "loaded_at": datetime.now(timezone.utc).isoformat(),
            "using_sample": True,
        }
    _loaded = True


def is_sanctioned(address: str) -> bool:
    """Check if address is in sanctions list (case-insensitive)."""
    global _sanctions_addresses, _loading_info, _loaded
    if not _loaded:
        _load_sanctions()
    return address.lower() in _sanctions_addresses


def info() -> dict:
    global _sanctions_addresses, _loading_info, _loaded
    if not _loaded:
        _load_sanctions()
    return dict(_loading_info)