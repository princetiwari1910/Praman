#!/usr/bin/env bash
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail=0
step() { echo; echo "== $1"; }
ok() { echo "PASS: $1"; }
bad() { echo "FAIL: $1"; fail=1; }

step "stray folder"
if [ -d "$HOME/Pramaan" ]; then bad "~/Pramaan exists"; else ok "no ~/Pramaan"; fi

step "backend tests"
( cd "$ROOT/backend" && source ../.venv/bin/activate && unset API_KEYS && rm -f audit/audit.log data/approvals.jsonl data/feedback.jsonl && python -m pytest -q ) && ok "pytest" || bad "pytest"
n=$(grep -c "def test_" "$ROOT/backend/tests/test_risk.py")
if [ "$n" -eq 8 ]; then ok "8 tests"; else bad "test count is $n"; fi

step "contracts"
( cd "$ROOT/contracts" && npx hardhat test ) && ok "hardhat" || bad "hardhat"

step "frontend build"
( cd "$ROOT/frontend" && npm run build ) && ok "frontend build" || bad "frontend build"

step "banned claims"
if grep -rniE "zero-knowledge|zk|guaranteed|forensic|FIU-compliant|certified|trusted by|customers" "$ROOT/frontend/src" "$ROOT/docs"; then bad "banned claim found"; else ok "no banned claims"; fi

step "bad strings"
if grep -rn "0\.0\.0\.0" "$ROOT/README.md" "$ROOT/backend/README.md" "$ROOT/docs" "$ROOT/AGENTS.md" 2>/dev/null; then bad "0.0.0.0 in repo docs"; else ok "no 0.0.0.0 in docs"; fi
if grep -rn "test-key" "$ROOT/frontend/src"; then bad "test-key in frontend src"; else ok "no test-key in src"; fi

step "tracked secrets"
tracked=$(cd "$ROOT" && git ls-files | grep -E "(^|/)\.env($|\.local)|\.jsonl$|\.log$|node_modules|\.venv")
if [ -z "$tracked" ]; then ok "no secrets tracked"; else echo "$tracked"; bad "tracked secrets"; fi

echo
if [ $fail -eq 0 ]; then echo "ALL CHECKS PASSED"; else echo "SOME CHECKS FAILED"; fi
exit $fail