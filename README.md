# TATHYA

> **Financial Risk Intelligence — Facts Behind Every Risk.**  
> *तथ्य — Facts, truth, and evidence.*  
> Explainable risk screening for crypto and fintech. Every risk score comes with proof.

Tathya evaluates wallet addresses against deterministic risk rules, providing transparent breakdowns of risk factors, counterfactual analysis, fund-flow graph visualizations, verifiable evidence packs, and tamper-evident audit trails. It never holds or moves funds.

🌐 **Live Application:** [https://praman.princetiwari.tech](https://praman.princetiwari.tech)  
🚀 **Interactive Demo:** [https://praman.princetiwari.tech/demo](https://praman.princetiwari.tech/demo)  
⚡ **API Endpoint:** [https://praman-kljk.onrender.com](https://praman-kljk.onrender.com)

---

## Product Architecture

- **Tathya Risk Engine:** Deterministic, rules-based heuristic scoring engine that evaluates addresses without opaque black-box models.
- **Tathya API:** Enterprise REST interface providing `/v1/risk`, `/v1/explain`, `/v1/batch`, and `/v1/reports` endpoints.
- **Tathya Intelligence:** Curated sanctions intelligence, mixer cluster detection, entity tagging, and graph-traversal exposure signals.
- **Tathya Evidence Reports:** Downloadable, cryptographically signed PDF case memos and JSON evidence packs with SHA-256 canonical digests.
- **Tathya Verify:** Independent offline verification script (`python scripts/verify_evidence.py`) and SHA-256 hash-chained audit verification.

---

## What Works Today

- **User Authentication:** 
  - One-click **"Continue with Google"** OAuth 2.0 authentication powered by Google Identity Services.
  - Standard **Email & Password** registration and sign-in with salted `PBKDF2-HMAC-SHA256` password hashing.
  - Secure `HS256` JWT session management with persistent SQLite user database.
  - User profile badge and avatar display with sign-out controls.
- **Rules-Based Risk Scoring:** Deterministic scoring across preset fixtures (`0x1111...1111` for low risk, `0x2222...2222` for severe risk) with automatic fallback rules for arbitrary addresses.
- **Explainable Reasons & Counterfactuals:** Every score explains exact weights and rule hits (`SANCTIONS_MATCH`, `MIXER_EXPOSURE`, `HIGH_VELOCITY`, `NEW_WALLET`, `RISKY_COUNTERPARTY`) plus "what if" explanations showing point gaps to neighboring risk bands.
- **Interactive Fund-Flow Graph:** Interactive D3.js force-directed graph illustrating wallet counterparties and exposure levels.
- **Verifiable Evidence Packs:** One-click download of cryptographically canonicalized JSON evidence packs, verifiable offline without trusting the server via `python scripts/verify_evidence.py`.
- **Draft Case-Summary PDF:** ReportLab-generated compliance memo summarizing risk breakdown, counterparty flows, and human analyst review decisions (`approved`, `rejected`, `needs_review`).
- **Batch CSV Screening:** Multi-address CSV upload screening up to 50 addresses per batch.
- **Tamper-Evident Audit Trail:** Append-only SHA-256 hash-chained audit log with cryptographic integrity verification (`GET /v1/audit/verify`).
- **Local Smart Contract Attestation:** In-process Hardhat contract demo (`AttestationRegistry.sol`) demonstrating on-chain risk band recording.

---

## Honest Limitations

- **Sample data by default:** The demo uses sample data fixtures unless live mode is enabled with an Etherscan API key.
- **Rules, not machine learning:** Scoring is calculated strictly from deterministic heuristics and integer rule weights, not opaque black-box machine learning models.
- **No accuracy claim:** There is no accuracy claim; scores reflect synthetic fixture rules rather than real-world benchmark evaluations.
- **Not legal advice:** Risk indicators and scores are informational only and do not constitute legal advice or regulatory guidance.
- **Not affiliated with any government body:** Tathya is an independent open-source project and is not affiliated with, endorsed by, or connected to any government agency.
- **Not a compliance product:** Tathya is an experimental screening and drafting prototype. It is not an automated decision system; a human compliance officer always makes final determinations.

---

## Architecture

```
                                  +---------------------------------------+
                                  |         Production Domain             |
                                  |     praman.princetiwari.tech          |
                                  +-------------------+-------------------+
                                                      |
                                                      v
                                  +---------------------------------------+
                                  |       Vite + React 19 Frontend        |
                                  |  Landing · Demo · AuthModal · D3.js   |
                                  +-------------------+-------------------+
                                                      |
                     +--------------------------------+-------------------------------+
                     |                                                                |
                     | Same-origin /v1/* Rewrite                                      | Client-Side SDK
                     v                                                                v
+--------------------------------------------------------------+    +------------------------------------+
|                   Tathya FastAPI Backend Web Service         |    |      Google Identity Services      |
|              https://praman-kljk.onrender.com                |    |         (OAuth 2.0 Auth)           |
+------------------------------+-------------------------------+    +------------------------------------+
|  • Auth Router (/v1/auth)    |  • SQLite User Store (tathya.db)
|  • Tathya Risk Engine        |  • Hash-Chained Audit Trail
|  • ReportLab PDF Generator   |  • Sanctions File Cache
+------------------------------+-------------------------------+
                               | Attestation Hash
                               v
+--------------------------------------------------------------+
|                    Hardhat Smart Contracts                   |
|       AttestationRegistry.sol (Local in-process demo)        |
+--------------------------------------------------------------+
```

### Component Directory Structure
- **`frontend/`:** React 19 + TypeScript SPA styled with Tailwind CSS, Lucide icons, Framer Motion, and Syne / DM Mono typography.
- **`backend/`:** Python FastAPI application serving API routes, authentication logic, scoring engines, and cryptographic evidence generators.
- **`contracts/`:** Solidity smart contracts and Hardhat tasks demonstrating on-chain risk attestation.
- **`docs/`:** Formal API specifications and architectural documentation.

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Default |
|---|---|---|
| `API_KEYS` | Comma-separated list of accepted `X-API-Key` headers | Required |
| `JWT_SECRET` | Secret key used to sign and verify user session JWTs | `tathya-secret-key-change-in-production-2026` |
| `USE_FIXTURES` | Set `true` to use synthetic fixtures, `false` for live queries | `true` |
| `ETHERSCAN_API_KEY` | Etherscan API key for live wallet transaction lookups | Optional |
| `QUOTA` | Maximum allowed screening calls per API key | `100` |

### Frontend (`frontend/.env.local`)
| Variable | Description | Default |
|---|---|---|
| `VITE_API_BASE_URL` | Base URL for FastAPI backend (empty in prod for same-origin proxy) | `""` |
| `VITE_API_KEY` | Tathya API key for screening endpoints | Required |
| `VITE_GOOGLE_CLIENT_ID` | Google Cloud OAuth 2.0 Web Client ID | Optional |

---

## Quick Start

### One-Command Demo
```bash
bash demo.sh
```

### Manual Component Setup

**1. Backend**
```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000
```

**2. Frontend**
```bash
cd frontend
npm install
npm run demo
```

**3. Contracts**
```bash
cd contracts
npx hardhat compile
REPORT_HASH=0000000000000000000000000000000000000000000000000000000000000000 BAND=low npx hardhat run scripts/demo-attest.js --network hardhat
```

---

## Running Tests

- **Backend tests:**
  ```bash
  PYTHONPATH=backend python -m pytest backend/tests
  ```
- **Contract tests:**
  ```bash
  cd contracts && npx hardhat test
  ```
- **Frontend build & lint:**
  ```bash
  cd frontend && npm run build
  cd frontend && npm run lint
  ```

---

## API Summary Table

All endpoints below are available under `/v1/*`:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/v1/auth/register` | Register new account with email & password | No |
| `POST` | `/v1/auth/login` | Log in with email & password; returns JWT | No |
| `POST` | `/v1/auth/google` | Authenticate Google OAuth ID token; returns JWT | No |
| `GET` | `/v1/auth/me` | Fetch authenticated user profile | Bearer Token |
| `GET` | `/v1/health` | Service status, mode (`fixture`/`live`), and quota | No |
| `GET` | `/v1/config` | Configured risk score bands and sanctions source | `X-API-Key` |
| `GET` | `/v1/risk/{chain}/{address}` | Risk score, band, reasons, and counterparty graph | `X-API-Key` |
| `GET` | `/v1/explain/{chain}/{address}` | Score breakdown, next-band gap, and counterfactuals | `X-API-Key` |
| `GET` | `/v1/usage` | Screening quota usage statistics (100 checks quota) | `X-API-Key` |
| `POST` | `/v1/batch` | Batch CSV screening for up to 50 addresses | `X-API-Key` |
| `POST` | `/v1/reports` | Generate a draft PDF report, returns `report_id` and `sha256` | `X-API-Key` |
| `GET` | `/v1/reports/{report_id}/pdf` | Download generated PDF case summary | `X-API-Key` |
| `GET` | `/v1/reports/{report_id}/summary` | Text summary with headline, paragraphs, and steps | `X-API-Key` |
| `GET` | `/v1/reports/{report_id}/evidence`| Cryptographic evidence pack (JSON) | `X-API-Key` |
| `GET` | `/v1/reports/{report_id}/approval` | Get analyst approval status (decision or `pending`) | `X-API-Key` |
| `POST` | `/v1/reports/{report_id}/approve` | Record human analyst decision (`approved`/`rejected`/`needs_review`) | `X-API-Key` |
| `POST` | `/v1/feedback` | Record analyst verdict feedback (`true_positive`/`false_positive`/`unsure`) | `X-API-Key` |
| `GET` | `/v1/audit/entries` | Paginated audit log entries | `X-API-Key` |
| `GET` | `/v1/audit/verify` | Verify SHA-256 audit trail chain integrity | `X-API-Key` |
| `POST` | `/v1/dev/reset` | Reset demo state (active only when `DEMO_MODE=true`) | `X-API-Key` |

---

## Security Notes

- **No secrets committed:** No private keys, production credentials, or real user records are stored in this repository. Local configurations use git-ignored `.env` files.
- **Salted Password Hashing:** User passwords are stored using salted `PBKDF2-HMAC-SHA256` with 100,000 iterations and constant-time equality checks.
- **Synthetic fixtures:** All demo wallet histories, counterparties, and sample sanctions entries are synthetic test fixtures.
- **DEMO_MODE:** The development reset endpoint (`POST /v1/dev/reset`) is strictly conditional on the `DEMO_MODE` environment variable. Never enable `DEMO_MODE` on a public server.

---

## Status

Active prototype deployed live at **[https://praman.princetiwari.tech](https://praman.princetiwari.tech)**.
