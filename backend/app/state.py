from __future__ import annotations

QUOTA = 100

# Per-API-key usage counter and stored report results.
# Keys are the API key string; values are int (counts) or dict (fixture result).
usage: dict[str, int] = {}
reports: dict[str, dict] = {}


def reset() -> None:
    """Clear usage and reports – called before/after each test."""
    usage.clear()
    reports.clear()
