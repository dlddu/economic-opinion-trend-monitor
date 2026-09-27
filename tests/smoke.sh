#!/usr/bin/env bash
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

(
  cd "$ROOT/python"
  # mock-exception: FEED-01 — 실 RSS/Atom 피드는 가용성·내용이 매 순간 달라 결정적 단정이 불가해 페이크 수집원에 고정 — docs/econ-opinion-monitor-e2e-mocking-policy.md
  uv run --quiet python -m econ_ingestion --source fake --data "$DATA" --cycle 2026-06-23T14:00
  # mock-exception: LLM-01 — 실 chat-completions 호출은 API 키·과금·네트워크가 필요하고 비결정적이라 페이크 분석기에 고정 — docs/econ-opinion-monitor-e2e-mocking-policy.md
  uv run --quiet python -m econ_analysis --analyzer fake --data "$DATA"
  uv run --quiet python -m econ_aggregation --data "$DATA"
)
test -s "$DATA/gold/subject_trend.jsonl" || { echo "[smoke] FAIL: no Gold produced"; exit 1; }

(cd "$ROOT/go" && go build -o bin/serving ./cmd/serving)
"$ROOT/go/bin/serving" -addr ":$PORT" -data "$DATA" -web "$DATA/no-web" &
SRV=$!

body="$(curl -s --retry 20 --retry-delay 1 --retry-connrefused "http://127.0.0.1:$PORT/api/dashboard?axis=KR")"
echo "$body" | grep -q '한국은행 기준금리' || { echo "[smoke] FAIL: subject missing in response"; echo "$body"; exit 1; }
echo "$body" | grep -q '"normalized":true' || { echo "[smoke] FAIL: normalized flag missing"; echo "$body"; exit 1; }

echo "[smoke] OK: Python Gold -> Go API end to end"
