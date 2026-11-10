# Praman backend

Setup (project venv at the repo root):

    source ../.venv/bin/activate
    pip install -r requirements.txt

Run the server (127.0.0.1 only):

    cd backend && uvicorn app.main:app --reload --port 8000

Run tests:

    cd backend && python -m pytest

Config: copy ../.env.example to backend/.env (git-ignored). All data is fixture data (fake).
