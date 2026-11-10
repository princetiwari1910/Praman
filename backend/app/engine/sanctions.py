from __future__ import annotations

# Sanctions check – synthetic check for known addresses
# In production, this would load from a JSON file or external service

_SANCTIONED_ADDRESSES = {
    "0x2222222222222222222222222222222222222222",
}

def is_sanctioned(address: str) -> bool:
    """Check if address is in sanctions list (case-insensitive)."""
    return address.lower() in {k.lower() for k in _SANCTIONED_ADDRESSES}
