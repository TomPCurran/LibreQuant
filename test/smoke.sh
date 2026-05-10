#!/usr/bin/env bash
# Local developer machine only — not for CI.
# Requires Docker (Compose v2) and a Next.js dev server on http://127.0.0.1:3000 (start separately).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

cleanup() {
  docker compose down >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "[smoke] Starting Docker Compose (--wait)..."
docker compose up -d --wait

failures=0

check() {
  local name="$1"
  shift
  if "$@"; then
    echo "[smoke] OK  $name"
  else
    echo "[smoke] FAIL $name" >&2
    failures=$((failures + 1))
  fi
}

check "Next.js root (ensure npm run dev in librequant on :3000)" \
  curl -sf --connect-timeout 2 "http://127.0.0.1:3000/" -o /dev/null

check "Jupyter API status" \
  curl -sf "http://127.0.0.1:8888/api/status?token=devtoken" -o /dev/null

check "MLflow health" \
  curl -sf "http://127.0.0.1:5000/health" -o /dev/null

check "MLflow experiments search (POST)" \
  curl -sf -X POST -H "Content-Type: application/json" \
    -d '{"max_results":1}' \
    "http://127.0.0.1:5000/api/2.0/mlflow/experiments/search" -o /dev/null

if [[ "$failures" -eq 0 ]]; then
  echo "[smoke] PASS (all checks succeeded)"
  exit 0
fi
echo "[smoke] FAIL ($failures check(s) failed)"
exit 1
