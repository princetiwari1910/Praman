from __future__ import annotations

# Wallet data for fixture addresses – ALL DATA IS FAKE
# Commented paths/details point to synthetic data only.

# Synthetic clean wallet
_CLEAN_WALLET = {
    "address": "0x1111111111111111111111111111111111111111",
    "account_age_days": 30,
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

# Synthetic high-risk wallet
_HIGH_RISK_WALLET = {
    "address": "0x2222222222222222222222222222222222222222",
    "account_age_days": 180,
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

# Default wallet data for any other valid address
_DEFAULT_WALLET = {
    "account_age_days": 30,
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
