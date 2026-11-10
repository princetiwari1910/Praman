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

#### POST /v1/reports
Submit a wallet for report generation.

**Response (200):**
```json
{"report_id": "last8chars_of_address", "sha256": "hex_sha256_of_pdf"}
```

#### GET /v1/reports/{report_id}/pdf
Download a generated PDF report.

**Response:** `application/pdf` file starting with `%PDF`.

#### POST /v1/feedback
Submit user feedback on a verdict.

**Response (200):**
```json
{"status": "recorded"}
```

#### GET /v1/usage
Usage statistics – counts real `/v1/risk` calls for the current API key, quota fixed at 100.

**Response:**
```json
{"checks_used": 1, "quota": 100, "plan": "free"}
```

### Error Responses
All errors return exactly `{"error": "<code>", "message": "<text>"}`:

| Status | Error Code | Example |
|--------|-----------|---------|
| 401 | `unauthorized` | Missing or invalid API key |
| 400 | `invalid_address` | Address not matching `0x + 40 hex` |
| 404 | `report_not_found` | Unknown report ID |
| 422 | `validation_error` | Pydantic validation failure |
| 400 | `unsupported_chain` | Chain other than `ethereum` |
