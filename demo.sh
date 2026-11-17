#!/bin/bash
kill -9 $(lsof -ti :8000) $(lsof -ti :5173) 2>/dev/null
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/backend" || exit 1
source "$SCRIPT_DIR/.venv/bin/activate" 2>/dev/null || source ../.venv/bin/activate 2>/dev/null
unset API_KEYS
rm -f app/audit/audit.log audit/audit.log data/approvals.jsonl data/feedback.jsonl
QUOTA=1000 uvicorn app.main:app --port 8000 &
BACK=$!
trap 'kill $BACK 2>/dev/null' EXIT
cd "$SCRIPT_DIR/frontend" || exit 1
npm run demo
