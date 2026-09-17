#!/usr/bin/env bash
# Cross-language smoke test: the Python batch writes Gold into a throwaway lake,
# then the Go serving reads that Gold and serves it through the dashboard API.
# Asserts a Python-produced subject flows all the way to the Go HTTP response.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DATA="$(mktemp -d)"
PORT="${SMOKE_PORT:-8077}"
SRV=""

cleanup() {
  [ -n "$SRV" ] && kill "$SRV" 2>/dev/null || true
  rm -rf "$DATA"
}
trap cleanup EXIT

echo "[smoke] lake: $DATA  port: $PORT"

# 1) Python: fake ingestion -> analysis -> aggregation into the temp lake.
(
  cd "$ROOT/python"
  # Pinned to the deterministic fake source: the operational default is now the
  # real RSS/Atom feed, but the smoke must stay offline and deterministic.
  # mock-exception: FEED-01 — 실 RSS/Atom 피드는 가용성·내용이 매 순간 달라 결정적 단정이 불가해 페이크 수집원에 고정 — docs/econ-opinion-monitor-e2e-mocking-policy.md
  uv run --quiet python -m econ_ingestion --source fake --data "$DATA" --cycle 2026-06-23T14:00
  # Pinned to the deterministic fake analyzer for the same reason: the operational
  # default is now the real chat-completions model, which needs ECON_LLM_API_KEY and
  # the network. Without this pin the smoke would exit 2 on an unconfigured runner.
  # mock-exception: LLM-01 — 실 chat-completions 호출은 API 키·과금·네트워크가 필요하고 비결정적이라 페이크 분석기에 고정 — docs/econ-opinion-monitor-e2e-mocking-policy.md
  uv run --quiet python -m econ_analysis --analyzer fake --data "$DATA"
  uv run --quiet python -m econ_aggregation --data "$DATA"
)
test -s "$DATA/gold/subject_trend.jsonl" || { echo "[smoke] FAIL: no Gold produced"; exit 1; }

# 2) Go: build and serve against that lake.
(cd "$ROOT/go" && go build -o bin/serving ./cmd/serving)
"$ROOT/go/bin/serving" -addr ":$PORT" -data "$DATA" -web "$DATA/no-web" &
SRV=$!

# 3) Assert the Python-produced subject reached the Go dashboard response.
body="$(curl -s --retry 20 --retry-delay 1 --retry-connrefused "http://127.0.0.1:$PORT/api/dashboard?axis=KR")"
echo "$body" | grep -q '한국은행 기준금리' || { echo "[smoke] FAIL: subject missing in response"; echo "$body"; exit 1; }
echo "$body" | grep -q '"normalized":true' || { echo "[smoke] FAIL: normalized flag missing"; echo "$body"; exit 1; }

echo "[smoke] OK: Python Gold -> Go API end to end"
