from __future__ import annotations

import os

os.environ["API_KEYS"] = "test-key"
os.environ["USE_FIXTURES"] = "true"


def reset_state():
    """Reset state before each test."""
    from app.state import usage, reports
    usage.clear()
    reports.clear()


import pytest

@pytest.fixture(autouse=True)
def state_reset():
    """Reset usage and reports before each test."""
    reset_state()
