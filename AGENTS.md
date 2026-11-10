AGENTS.md — Praman B2B Crypto Wallet Risk Screening API

This file guides agents (AI code assistants) working on the Praman project.

RULES
1. Python 3.11+ only.
2. Use FastAPI framework exclusively.
3. Type hints everywhere (function signatures, Pydantic models, dependencies).
4. No hardcoded secrets — use .env file (see .env.example).
5. Every endpoint must be covered by pytest.
6. Never invent data in live responses — fixture mode must be clearly labelled with data_mode: "fixture".
7. After every change: run `cd /backend && python -m pytest` to verify tests pass.
8. To start the server: `cd /backend && uvicorn app.main:app --reload --host 127.0.0.1 --port 8000`. Run tests: `cd /backend && python -m pytest`.
9. CORS allowed origins: http://127.0.0.1:5173 and http://127.0.0.1:3000.

FILE LOCATIONS
- /backend — all Python source
- /docs/api-contract.md — API contract definition
- / .env — environment variables (never commit)
- / .gitignore — git exclusions

AFTER EVERY CHANGE
1. Run tests: cd /backend && python -m pytest
2. Verify: open http://localhost:8000/docs in browser
3. Check: X-API-Key header required on all protected endpoints

RULES STEP 9: The server binds to localhost (127.0.0.1) only.
