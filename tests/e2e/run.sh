#!/usr/bin/env bash
# kind-based e2e for the serving path: build the serving image, load it into
# a throwaway kind cluster with fixture Gold mounted from a ConfigMap, then
# run the Playwright specs (API + browser) against a port-forward.
#
# Local `make e2e` and the CI e2e job both run exactly this script.
# Requires docker, kind, kubectl and node/npm — it fails fast if one is
# missing and never installs tools itself. Set KEEP_CLUSTER=1 to keep the
# cluster around for debugging.
set -euo pipefail

E2E_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$E2E_DIR/../.." && pwd)"
CLUSTER="${E2E_CLUSTER:-econ-e2e-$$}"
CTX="kind-$CLUSTER"
IMAGE="econ-monitor:e2e"
PORT="${E2E_PORT:-18080}"
PF=""

for tool in docker kind kubectl node npm curl; do
  command -v "$tool" >/dev/null 2>&1 \
    || { echo "[e2e] FAIL: '$tool' not found — e2e needs docker + kind + kubectl + node" >&2; exit 1; }
done

cleanup() {
  status=$?
  [ -n "$PF" ] && kill "$PF" 2>/dev/null || true
  if [ "${KEEP_CLUSTER:-0}" = "1" ]; then
    echo "[e2e] KEEP_CLUSTER=1 — cluster kept, inspect with: kubectl --context $CTX get all"
  else
    kind delete cluster --name "$CLUSTER" >/dev/null 2>&1 || true
  fi
  exit "$status"
}
trap cleanup EXIT

echo "[e2e] image: $IMAGE  cluster: $CLUSTER  port: $PORT"

# 1) Serving image into a fresh single-node cluster (no registry: kind load).
docker build -t "$IMAGE" "$ROOT"
kind create cluster --name "$CLUSTER" --config "$E2E_DIR/kind-config.yaml" --wait 120s
kind load docker-image "$IMAGE" --name "$CLUSTER"

# 2) Fixture Gold as a ConfigMap + the serving stack (e2e overlay of deploy/base).
# mock-exception: GOLD-01 — 배치 경로 부재(원장 R1)로 서빙 입력 Gold를 배치 산출물로 만들 수 없어 커밋된 픽스처로 채움 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap gold-fixtures --from-file="$E2E_DIR/fixtures/gold"
kubectl --context "$CTX" apply -k "$E2E_DIR/k8s"
if ! kubectl --context "$CTX" rollout status deployment/econ-serving --timeout=120s; then
  echo "[e2e] FAIL: serving rollout not ready — pod state follows" >&2
  kubectl --context "$CTX" describe pods -l app=econ-serving >&2 || true
  kubectl --context "$CTX" logs -l app=econ-serving --tail=100 >&2 || true
  exit 1
fi

# 3) Reach the in-cluster Service from the host.
kubectl --context "$CTX" port-forward service/econ-serving "$PORT:8080" >/dev/null &
PF=$!
curl -sf --retry 20 --retry-delay 1 --retry-connrefused \
  "http://127.0.0.1:$PORT/api/health" >/dev/null

# 4) Playwright specs against the forwarded endpoint.
cd "$E2E_DIR"
npm ci
if [ "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-0}" != "1" ]; then
  npx playwright install --with-deps chromium
fi
BASE_URL="http://127.0.0.1:$PORT" npx playwright test

echo "[e2e] OK: fixture Gold -> in-cluster serving -> API + browser"
