# Praman — Pitch Outline (Ten Slides)

> **Tagline:** Explainable risk screening for crypto and fintech.  
> **Core idea:** Every risk score comes with proof (the explicit reason codes behind the score).

---

## Slide 1: Problem
- Small and mid-size crypto exchanges, OTC desks, and fintechs must screen wallets before onboarding or settling transfers.
- Enterprise screening tools are priced and structured for Tier-1 banks, require lengthy procurement, and often output a single opaque score with no explanation.
- Building in-house requires maintaining entity labels, graph traversal, and audit logs — pulling engineers away from core product work.

## Slide 2: Solution
- **Praman** is a B2B REST API (`GET /v1/risk/{chain}/{address}`) that screens crypto wallets and returns:
  - A **0–100 risk score** and risk band (`low`, `medium`, `high`, `severe`).
  - **Weighted reason codes** (`code`, `title`, `weight`, `detail`) that visibly sum to the score.
  - A **fund-flow graph** (`nodes`, `edges`) and a **downloadable PDF case summary** with SHA-256 hash.

## Slide 3: Live Demo
- Walkthrough at `http://127.0.0.1:5173/demo` (demo runs on sample fixture data; live mode uses a free Etherscan key):
  - Screen `0x2222222222222222222222222222222222222222` → score `87` (`severe`), `sanctions_hit: true`, `SANCTIONS_MATCH (+60) + MIXER_EXPOSURE (+27)`.
  - Screen `0x1111111111111111111111111111111111111111` → score `12` (`low`), `sanctions_hit: false`, `NEW_WALLET (+12)`.
  - Generate PDF report (`POST /v1/reports`) and inspect the API-returned SHA-256 digest + Hardhat local testnet attestation commands.

## Slide 4: How Scoring Works
- In the demo, scores come from **deterministic rules over fixture data**: `score = min(100, sum of triggered rule weights)`.
- Current rule weights in the engine:
  - `SANCTIONS_MATCH`: `60`
  - `MIXER_EXPOSURE`: `27`
  - `HIGH_VELOCITY`: `15`
  - `NEW_WALLET`: `12`
  - `RISKY_COUNTERPARTY`: `8`
- Risk bands: `low` (0–24), `medium` (25–49), `high` (50–74), `severe` (75–100).
- Any ML component explored alongside the rule engine is trained on **synthetic data only**; no predictive benchmark or classification figure is claimed until real labeled data exists.

## Slide 5: Explainability & Human Review
- Analysts should never have to guess why a wallet was flagged.
- Every API response ties the final score directly to explicit rule weights and human-readable details.
- Built-in analyst feedback (`POST /v1/feedback`: true positive, false positive, unsure) and audit verification (`GET /v1/audit/verify`) support human-in-the-loop review.

## Slide 6: India-First Focus
- Built with Indian crypto platforms, cross-border fintechs, and Web3 teams in mind (starting out of Bengaluru).
- Designed as a **screening and case-drafting tool**: it surfaces signals and drafts summaries, while your compliance officer stays responsible for final decisions and regulatory filings.
- Praman is not legal advice and is not affiliated with any government body.

## Slide 7: Business Model Hypotheses
*(Hypotheses to validate with design partners — not finalized pricing)*
- **Tiered API subscription:** Monthly base fee tied to screening quota (`checks_used / 100` in the current demo tier).
- **Usage-based overage:** Per-check metering beyond base quota.
- **Workflow add-ons:** Batch CSV screening, PDF case report generation, and optional audit attestation workflows.

## Slide 8: Pilot Offer
- **Free Design Partner Pilot:**
  - Dedicated API key (`X-API-Key`) and access to the `/demo` dashboard + batch CSV screening.
  - Direct channel with the engineering team to adapt reason codes and reporting formats to your workflow.
  - No commitment required; regular feedback sessions.
  - Contact: `design-partners@example.com`.

## Slide 9: Roadmap
- **Now (demo prototype):** Fixture-backed deterministic rules API, PDF case summaries, CSV batch UI, and local Hardhat attestation demo (`Testnet demo`).
- **Next:** Live mode via a free Etherscan key, automated entity/sanctions list updates, and persistent audit logging.
- **Later:** Multi-chain support beyond Ethereum, webhook alerts for batch jobs, and case-management integrations.

## Slide 10: Ask
- **Design partners:** Looking for compliance leads and founders at crypto and fintech teams to test the API in a free pilot and tell us what is missing.
- **Feedback:** Introductions to compliance officers, MLROs, and fintech builders at Bengaluru Tech Summit.
