# Praman B2B Crypto Wallet Risk Screening API

## API Contract

### Base URL
`/v1/risk/{chain}/{address}`

### Authentication
All protected endpoints require `X-API-Key` header.

### Rate Limits
- Fixed quota of 100 checks per API key.

### Endpoints

#### GET /v1/risk/{chain}/{address}
Return risk score and details for a crypto wallet.

**Response (200):**
```json
{
  "address": "0x...",
  "chain": "ethereum",
  "score": 87,
  "band": "severe",
  "sanctions_hit": true,
  "reasons": [
    {"code": "SANCTIONS_MATCH", "title": "Sanctions Match", "weight": 60, "detail": "Fake demo entry..."},
    {"code": "MIXER_EXPOSURE", "title": "Mixer Exposure", "weight": 27, "detail": "Address interacts with known mixing service clusters"}
  ],
  "graph": {"nodes": [{"id": "addr_1", "label": "0x...", "risk": "severe"}], "edges": []},
  "generated_at": "2024-01-15T10:30:00Z",
  "data_mode": "fixture"
}
```

**Risk Bands:**
| Band | Score Range |
|------|-------------|
| low | 0 – 24 |
| medium | 25 – 49 |
| high | 50 – 74 |
| severe | 75 – 100 |

**Rule Codes and Weights:**
| Code | Weight | Description |
|------|--------|-------------|
| `SANCTIONS_MATCH` | 60 | Address appears on sanctions lists |
| `MIXER_EXPOSURE` | 27 | Address interacts with mixing service clusters |
| `HIGH_VELOCITY` | 15 | High transaction count in 30 days |
| `NEW_WALLET` | 12 | Recently created account |
| `RISKY_COUNTERPARTY` | 8 | Interacts with high/medium risk counterparties |

#### GET /v1/config
Return the four risk bands from thresholds.json.

**Authentication:** Requires `X-API-Key` header.

**Response (200):**
```json
{
  "bands": {
    "low": "0–24",
    "medium": "25–49",
    "high": "50–74",
    "severe": "75–100"
  },
  "sanctions": {
    "source": "sanctions_sample.json",
    "count": 1,
    "loaded_at": "<timestamp>",
    "using_sample": true
  }
}
```


#### GET /v1/health
No authentication required.

**Response (200):**
```json
{
  "status": "ok",
  "data_mode": "fixture" or "live",
  "quota": <QUOTA>
}

data_mode is "fixture" unless `USE_FIXTURES` is `"false"` and a live fetch is configured. No usage counting, no audit entry.

#### POST /v1/dev/reset
**Authentication:** Requires `X-API-Key` header.

Only when `DEMO_MODE` is `"true"`:
- Clears in-memory usage, reports, and approvals
- Truncates the audit log file and `approvals.jsonl`
- Returns `{"status":"reset"}`

When `DEMO_MODE` is not `"true"`: returns 404 `{"error":"not_found","message":"Not found"}` in the standard error shape.

#### POST /v1/batch#### POST /v1/batch
Process a CSV file of wallet addresses.

**Authentication:** Requires `X-API-Key` header.

**Request:** Multipart form-data with a CSV file field named `address`. The CSV must contain an `address` column.

**Response (200):** Flat JSON list, one item per row in order.

- **Valid row:** `{ "address": "0x...", "score": 87, "band": "severe", "sanctions_hit": true, "top_reason_code": "SANCTIONS_MATCH" }`
- **Invalid row:** `{ "address": "0xabc", "error": { "error": "invalid_address", "message": "Address must be 0x followed by 40 hex characters." } }`

- Maximum 50 rows; exceeding returns 422 `too_many_rows`.
- Only valid rows count toward the quota; usage increments by the number of valid rows.

#### POST /v1/feedback
Submit user feedback on a verdict.

**Authentication:** Requires `X-API-Key` header.

**Request Body:**
```json
{
  "address": "0x...",
  "verdict": "true_positive"
}
```

**Response (200):**
```json
{"status": "recorded"}
```

- Valid verdicts: `true_positive`, `false_positive`, `unsure`.
- Invalid verdict returns 422 `validation_error`.

#### POST /v1/reports
Submit a wallet for report generation.

**Authentication:** Requires `X-API-Key` header.

**Request Body:**
```json
{
  "address": "0x...",
  "chain": "ethereum"
}
```

**Response (201):**
```json
{
  "report_id": "a1b2c3d4e5f6a7b8",
  "sha256": "hex_sha256_of_pdf"
}
```

- `report_id` is a random 16-hex-character ID (e.g., `uuid.uuid4().hex[:16]`).
- Two reports for the same address will have different IDs.
- Unknown/invalid address returns 400 `invalid_address`.

#### GET /v1/reports/{report_id}/pdf
Download a generated PDF report.

**Response:** `application/pdf` file starting with `%PDF`.
- Two URL styles supported: `/v1/reports/{report_id}.pdf` and `/v1/reports/{report_id}/pdf`.
- Unknown report ID returns 404 `report_not_found`.

#### GET /v1/reports/{report_id}/approval
Get approval status for a report.

**Authentication:** Requires `X-API-Key` header.

**Response (200):**
```json
{
  "ts": "2024-01-15T10:30:00Z",
  "report_id": "a1b2c3d4e5f6a7b8",
  "report_sha256": "hex_sha256",
  "decision": "approved",
  "analyst_name": "Alice",
  "note": "Looks safe"
}
```

- If no approval exists, returns `{"decision": "pending"}`.
- Unknown report ID returns 404 `report_not_found`.

#### POST /v1/reports/{report_id}/approve
Approve or reject a report.

**Authentication:** Requires `X-API-Key` header.

**Request Body:**
```json
{
  "analyst_name": "Alice",
  "decision": "approved",
  "note": "Looks safe"
}
```

**Response (201):**
```json
{
  "report_id": "a1b2c3d4e5f6a7b8",
  "decision": "approved",
  "analyst_name": "Alice",
  "decided_at": "2024-01-15T10:30:00Z",
  "report_sha256": "hex_sha256"
}
```

- Unknown report ID returns 404 `report_not_found`.
- Invalid `analyst_name` (not 1-80 chars) or invalid `decision` returns 422 `validation_error`.

#### GET /v1/usage
Usage statistics – counts real `/v1/risk` calls for the current API key, quota fixed at 100.

**Authentication:** Requires `X-API-Key` header.

**Response:**
```json
{"checks_used": 1, "quota": 100, "plan": "free"}
```

#### GET /v1/explain/{chain}/{address}
Explain risk for an address without consuming quota or writing audit.

**Authentication:** Requires `X-API-Key` header.

**Response (200):**
```json
{
  "address": "0x...",
  "chain": "ethereum",
  "score": 87,
  "band": "severe",
  "data_mode": "fixture",
  "band_gap": {
    "next_band": "severe",
    "points_needed": null
  },
  "counterfactuals": [
    {"without_code": "SANCTIONS_MATCH", "score_without": 27, "band_without": "medium"},
    {"without_code": "MIXER_EXPOSURE", "score_without": 60, "band_without": "high"}
  ]
}
```

- **band_gap**: `next_band` is the next higher band; `points_needed` is the score difference to reach it. `null` if already `severe`.
- **counterfactuals**: Each reason removed in turn; score recomputed as `min(100, sum of remaining weights)`; band determined by `BANDS`.

#### GET /v1/audit/verify
Verify the audit log chain integrity.

**Authentication:** Requires `X-API-Key` header.

**Response (200):**
```json
{
  "valid": true,
  "entries": 2
}
```
Missing or empty log returns `{"valid": true, "entries": 0}`.

### Error Responses
All errors return exactly `{"error": "<code>", "message": "<text>"}`:

| Status | Error Code | Example |
|--------|-----------|---------|
| 401 | `unauthorized` | Missing or invalid API key |
| 400 | `invalid_address` | Address not matching `0x + 40 hex` |
| 400 | `unsupported_chain` | Chain other than `ethereum` |
| 429 | `quota_exceeded` | Checks exceeded for this API key |
| 422 | `validation_error` | Pydantic validation failure (e.g., bad decision, missing fields) |
| 404 | `report_not_found` | Unknown report ID |
| 500 | `internal_error` | Unexpected server error |

### CORS
- `expose_headers=["X-Report-SHA256", "X-Request-ID"]`
- Allowed origins: `http://localhost:5173`, `http://127.0.0.1:5173`, `http://127.0.0.1:3000`

### PDF Footer
The PDF report includes the footer text: `"DRAFT: not a compliance decision; requires review by a human compliance officer."` on the single-page report.