#!/bin/bash
kill -9 $(lsof -ti :8000) $(lsof -ti :5173) 2>/dev/null
cd "$HOME/Praman/backend" || exit 1
source ../.venv/bin/activate
unset API_KEYS
rm -f app/audit/audit.log audit/audit.log data/approvals.jsonl data/feedback.jsonl
QUOTA=1000 uvicorn app.main:app --port 8000 &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd "$HOME/Praman/frontend" || exit 1
npm run demo
