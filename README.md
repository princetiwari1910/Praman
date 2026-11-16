# Praman

Explainable risk screening for crypto and fintech. Every risk score comes with proof (the reason codes behind the score). Praman evaluates wallet addresses against deterministic risk rules, providing transparent breakdown of risk factors, counterfactual analysis, and fund-flow graph visualization. It never holds or moves funds.

## What Works Today

- **Rules-based scoring over sample data:** Deterministic scoring across preset fixtures (`0x1111...1111` for low risk, `0x2222...2222` for severe risk) and fallback rules for arbitrary valid addresses.
- **Optional sanctions list loaded from a user-supplied file:** Configurable sanctions screening with support for custom JSON sanctions lists (falls back to `sanctions_sample.json`).
- **Local testnet-style attestation demo:** In-process Hardhat contract demo (`AttestationRegistry.sol`) that records report data hashes on a local test network.
- **Draft case-summary PDF that a human reviews:** Downloadable draft PDF report summarizing wallet risks, with human analyst decision tracking (`approved`, `rejected`, `needs_review`).

## Honest Limitations

- **Sample data by default:** The demo uses sample data unless live mode is enabled with an Etherscan API key.
- **Rules, not machine learning:** Scoring is calculated strictly from deterministic heuristics and integer rule weights, not predictive machine learning models.
- **No accuracy claim:** There is no accuracy claim; scores reflect synthetic fixture rules rather than real-world benchmark evaluations.
- **Not legal advice:** Risk indicators and scores are informational only and do not constitute legal advice or regulatory guidance.
- **Not affiliated with any government body:** Praman is an independent open-source project and is not affiliated with, endorsed by, or connected to any government agency.
- **Not a compliance product:** Praman is an experimental screening and drafting prototype. It is not an automated decision system; a human compliance officer always makes final determinations.

## Architecture

```
+--------------------------------------------------------------+
|                    React Frontend (Vite)                     |
|           Single Wallet Screening / Batch CSV / Demo         |
+------------------------------+-------------------------------+
                               | HTTP / JSON (/v1/*)
                               v
+--------------------------------------------------------------+
|                     FastAPI Backend                          |
|   Rules Engine · PDF Generator · Audit Log · Sanctions Cache |
+------------------------------+-------------------------------+
                               | Attestation Hash
                               v
+--------------------------------------------------------------+
|                 Hardhat Local Contracts                      |
|      AttestationRegistry.sol (in-process Hardhat network)    |
+--------------------------------------------------------------+
```

- **FastAPI backend (`backend/`):** Python application providing `/v1` endpoints for risk scoring, counterfactual explanations, batch CSV screening, PDF report generation, and audit logging.
- **React frontend (`frontend/`):** Single-page web application built with Vite, Tailwind CSS, Lucide icons, and D3 force graph.
- **Hardhat local contracts (`contracts/`):** Smart contracts including `AttestationRegistry.sol` for local in-process attestation verification.

## Quick Start

### One-Command Demo
Since `demo.sh` exists in the repository root:
```bash
bash demo.sh
```

### Manual Component Setup

**1. Backend** (from `backend/README.md`):
```bash
source .venv/bin/activate
pip install -r backend/requirements.txt
cd backend && uvicorn app.main:app --reload --port 8000
```

**2. Frontend** (from `frontend/package.json`):
```bash
cd frontend
npm install
npm run demo
```

**3. Contracts** (from `contracts/README.md`):
```bash
cd contracts
npx hardhat compile
REPORT_HASH=0000000000000000000000000000000000000000000000000000000000000000 BAND=low npx hardhat run scripts/demo-attest.js --network hardhat
```

### Running Tests

- **Backend tests** (from `backend/README.md`):
  ```bash
  cd backend && python -m pytest
  ```
- **Contract tests** (from `contracts/README.md`):
  ```bash
  cd contracts && npx hardhat test
  ```
- **Frontend build & lint** (from `frontend/package.json`):
  ```bash
  cd frontend && npm run build
  cd frontend && npm run lint
  ```

## API Summary Table

All endpoints below are defined in `docs/api-contract.md`:

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/v1/health` | Service status, mode (`fixture`/`live`), and sanctions source | No |
| `GET` | `/v1/config` | Configured risk score bands and sanctions source | Yes (`X-API-Key`) |
| `GET` | `/v1/risk/{chain}/{address}` | Risk score, band, reasons, and counterparty graph | Yes (`X-API-Key`) |
| `GET` | `/v1/explain/{chain}/{address}` | Score breakdown, next-band gap, and counterfactuals | Yes (`X-API-Key`) |
| `GET` | `/v1/usage` | Screening quota usage statistics (100 checks quota) | Yes (`X-API-Key`) |
| `POST` | `/v1/batch` | Batch CSV screening for up to 50 addresses | Yes (`X-API-Key`) |
| `POST` | `/v1/reports` | Generate a draft PDF report, returns `report_id` and `sha256` | Yes (`X-API-Key`) |
| `GET` | `/v1/reports/{report_id}/pdf` | Download generated PDF case summary | Yes (`X-API-Key`) |
| `GET` | `/v1/reports/{report_id}/approval` | Get analyst approval status (decision or `pending`) | Yes (`X-API-Key`) |
| `POST` | `/v1/reports/{report_id}/approve` | Record human analyst decision (`approved`/`rejected`/`needs_review`) | Yes (`X-API-Key`) |
| `POST` | `/v1/feedback` | Record analyst verdict feedback (`true_positive`/`false_positive`/`unsure`) | Yes (`X-API-Key`) |
| `GET` | `/v1/audit/verify` | Verify SHA-256 audit trail chain integrity | Yes (`X-API-Key`) |
| `POST` | `/v1/dev/reset` | Reset demo state (active only when `DEMO_MODE=true`) | Yes (`X-API-Key`) |

## Security Notes

- **No secrets committed:** No private keys, production credentials, or real user records are stored in this repository. Local configurations use git-ignored `.env` files.
- **Synthetic fixtures:** All demo wallet histories, counterparties, and sample sanctions entries are synthetic test fixtures.
- **DEMO_MODE:** The development reset endpoint (`POST /v1/dev/reset`) is strictly conditional on the `DEMO_MODE` environment variable. Never enable `DEMO_MODE` on a public server.

## Status

Early prototype built for Bengaluru Tech Summit 2026.
