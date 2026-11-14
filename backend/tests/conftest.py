from __future__ import annotations

import os
import pathlib

os.environ["API_KEYS"] = "test-key"
os.environ["USE_FIXTURES"] = "true"

_PROJECT_ROOT = pathlib.Path(__file__).parent.parent


def reset_state():
    """Reset state before each test."""
    from app.state import usage, reports
    usage.clear()
    reports.clear()
    # Clear audit log
    audit_log = _PROJECT_ROOT / "audit" / "audit.log"
    if audit_log.exists():
        audit_log.unlink()


import pytest

@pytest.fixture(autouse=True)
def state_reset():
    """Reset usage and reports before each test."""
    reset_state()
