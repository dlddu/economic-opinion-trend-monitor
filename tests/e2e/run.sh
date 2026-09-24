#!/usr/bin/env bash
# kind-based e2e: the serving stack plus the ingestion, analysis and aggregation
# batches, all in one throwaway kind cluster, with the Playwright specs at the end.
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
BATCH_IMAGE="econ-monitor-batch:e2e"
PORT="${E2E_PORT:-18080}"
BRONZE_DIR="$E2E_DIR/.artifacts/bronze"
FAULTS_DIR="$E2E_DIR/.artifacts/bronze-faults"
CYCLES_DIR="$E2E_DIR/.artifacts/bronze-cycles"
ANALYSIS_BRONZE_DIR="$E2E_DIR/.artifacts/bronze-analysis"
SILVER_DIR="$E2E_DIR/.artifacts/silver"
SILVER_V2_DIR="$E2E_DIR/.artifacts/silver-v2"
AGG_BRONZE_DIR="$E2E_DIR/.artifacts/bronze-agg"
AGG_SILVER_DIR="$E2E_DIR/.artifacts/silver-agg"
GOLD_DIR="$E2E_DIR/.artifacts/gold"
GOLD_SKEW_DIR="$E2E_DIR/.artifacts/gold-skew"
ROLLUP_BRONZE_DIR="$E2E_DIR/.artifacts/bronze-rollup"
ROLLUP_SILVER_DIR="$E2E_DIR/.artifacts/silver-rollup"
ROLLUP_GOLD_DIR="$E2E_DIR/.artifacts/gold-rollup"
LOG_DIR="$E2E_DIR/.artifacts/ingest-logs"
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

run_batch_job() {
  job="$1"; manifest="$2"
  kubectl --context "$CTX" apply -f "$manifest"
  if ! kubectl --context "$CTX" wait --for=condition=complete "job/$job" --timeout=300s; then
    echo "[e2e] FAIL: $job did not complete — job state and logs follow" >&2
    kubectl --context "$CTX" describe "job/$job" >&2 || true
    kubectl --context "$CTX" logs "job/$job" --tail=100 >&2 || true
    exit 1
  fi
  mkdir -p "$LOG_DIR"
  kubectl --context "$CTX" logs "job/$job" > "$LOG_DIR/$job.log"
  cat "$LOG_DIR/$job.log"
}

# A dataset is its unpartitioned file plus, for partitioned ones (news_item, analysis),
# every <dataset>/date=…/hour=…/data.jsonl — exported as one flat JSONL, oldest first,
# the same order econ_core's read_records returns.
export_lake() {
  src_root="$1"; layer="$2"; dest="$3"; shift 3
  mkdir -p "$dest"
  for dataset in "$@"; do
    kubectl --context "$CTX" exec "$SHELL_POD" -- sh -c '
      base="$1"
      [ -f "$base.jsonl" ] && cat "$base.jsonl"
      [ -d "$base" ] && find "$base" -name data.jsonl | sort | xargs -r cat
      true' export_lake "$src_root/$layer/$dataset" > "$dest/$dataset.jsonl"
    [ -s "$dest/$dataset.jsonl" ] \
      || { echo "[e2e] FAIL: $src_root/$layer/$dataset came back empty" >&2; exit 1; }
  done
}

echo "[e2e] images: $IMAGE, $BATCH_IMAGE  cluster: $CLUSTER  port: $PORT"

# 1) Both images into a fresh single-node cluster (no registry: kind load).
docker build -t "$IMAGE" "$ROOT"
docker build -f "$ROOT/Dockerfile.batch" -t "$BATCH_IMAGE" "$ROOT"
kind create cluster --name "$CLUSTER" --config "$E2E_DIR/kind-config.yaml" --wait 120s
kind load docker-image "$IMAGE" "$BATCH_IMAGE" --name "$CLUSTER"

# 2) Fixture Gold as a ConfigMap + the serving stack (e2e overlay of deploy/base).
# mock-exception: GOLD-01 — 집계 배치는 e2e 안에 섰지만(run_aggregation_stack) 서빙 입력을 아직 그 파이프라인 Gold로 잇지 않아(원장 R3) 커밋된 픽스처로 채움 — docs/econ-opinion-monitor-e2e-mocking-policy.md
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

# 4) Ingestion batch: the real collection CLI, one cycle, against a feed double.
# mock-exception: FEED-02 — 실 RSS/Atom 상류는 가용성·내용이 매 순간 달라 결정적 단정이 불가능해 고정 피드 픽스처를 주입한다 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap feed-fixtures --from-file="$E2E_DIR/fixtures/feeds"
# 분석 배치의 상류 더블이 돌려줄 응답. 더블 Deployment가 이 ConfigMap을 마운트하므로 apply 전에
# 만들어 둔다 — 없으면 Pod가 볼륨을 못 붙여 영영 Ready가 되지 않는다.
# mock-exception: LLM-02 — 실 chat-completions 응답은 비결정적이라 기사별 고정 응답 픽스처를 주입한다 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap llm-fixtures --from-file="$E2E_DIR/fixtures/llm"
kubectl --context "$CTX" apply -k "$E2E_DIR/k8s/batch"
kubectl --context "$CTX" rollout status deployment/econ-feed-double --timeout=120s
kubectl --context "$CTX" rollout status deployment/econ-llm-double --timeout=120s
kubectl --context "$CTX" rollout status deployment/econ-bronze-shell --timeout=120s

SHELL_POD="$(kubectl --context "$CTX" get pod -l app=econ-bronze-shell \
  -o jsonpath='{.items[0].metadata.name}')"

INGEST_LOG="$(run_batch_job econ-e2e-ingest "$E2E_DIR/k8s/batch/ingest-job.yaml")"
# A source the CLI cannot reach is isolated, not fatal — correct for production,
# but here it would quietly shrink Bronze and surface as a puzzling spec failure.
case "$INGEST_LOG" in
  *"failed_sources=[]"*) ;;
  *) echo "[e2e] FAIL: a feed source did not answer — feed double unready or unreachable" >&2
     exit 1 ;;
esac
export_lake /data bronze "$BRONZE_DIR" news_item news_body
echo "[e2e] bronze exported -> $BRONZE_DIR"

# 4b) Fault-injection cycle (…-test-ingestion.md#시나리오 6).
FAULTS_LOG="$(run_batch_job econ-e2e-ingest-faults "$E2E_DIR/k8s/batch/ingest-job-faults.yaml")"
case "$FAULTS_LOG" in
  *"failed_sources=[]"*)
    echo "[e2e] FAIL: the fault-injection cycle isolated no source — the double served" \
         "the broken paths successfully, so scenario 6 has nothing to observe" >&2
    exit 1 ;;
esac
export_lake /data/faults bronze "$FAULTS_DIR" news_item news_body
echo "[e2e] bronze (faults) exported -> $FAULTS_DIR"

# 4c) Three sequential cycles (…-test-ingestion.md#시나리오 7).
for cycle in 1 2 3; do
  run_batch_job "econ-e2e-ingest-cycle$cycle" "$E2E_DIR/k8s/batch/ingest-job-cycle$cycle.yaml" \
    >/dev/null
  export_lake /data/cycles bronze "$CYCLES_DIR/cycle$cycle" news_item news_body
done
echo "[e2e] bronze (3 cycles) exported -> $CYCLES_DIR"

# 4d) Analysis batch (…-test-analysis.md#시나리오 1·2·3·6).
ANALYSIS_INGEST_LOG="$(run_batch_job econ-e2e-ingest-analysis \
  "$E2E_DIR/k8s/batch/ingest-job-analysis.yaml")"
case "$ANALYSIS_INGEST_LOG" in
  *"failed_sources=[]"*) ;;
  *) echo "[e2e] FAIL: the analysis corpus feed did not answer — the analysis specs would" \
          "report a judgement problem rather than a collection one" >&2
     exit 1 ;;
esac
export_lake /data/analysis bronze "$ANALYSIS_BRONZE_DIR" news_item news_body
echo "[e2e] bronze (analysis corpus) exported -> $ANALYSIS_BRONZE_DIR"

ANALYZE_LOG="$(run_batch_job econ-e2e-analyze "$E2E_DIR/k8s/batch/analyze-job.yaml")"
case "$ANALYZE_LOG" in
  *"failed=0"*) ;;
  *) echo "[e2e] FAIL: a model call failed — the LLM double has no canned reply for some" \
          "article (see fixtures/llm/responses.json) or is unreachable" >&2
     exit 1 ;;
esac
export_lake /data/analysis silver "$SILVER_DIR" analysis
echo "[e2e] silver exported -> $SILVER_DIR"

ANALYZE_V2_LOG="$(run_batch_job econ-e2e-analyze-v2 "$E2E_DIR/k8s/batch/analyze-job-v2.yaml")"
case "$ANALYZE_V2_LOG" in
  *"failed=0"*) ;;
  *) echo "[e2e] FAIL: a model call failed during re-analysis — the v2 response set is" \
          "incomplete or the double is unreachable" >&2
     exit 1 ;;
esac
export_lake /data/analysis silver "$SILVER_V2_DIR" analysis
echo "[e2e] silver (re-analysis) exported -> $SILVER_V2_DIR"

# 4e) Aggregation batch (…-test-analysis.md#시나리오 4·5,
# …-test-aggregation-viz.md#시나리오 1·2·4).
run_aggregation_stack() {
  suffix="$1"; root="$2"; label="$3"
  ingest_log="$(run_batch_job "econ-e2e-ingest-agg$suffix" \
    "$E2E_DIR/k8s/batch/ingest-job-agg$suffix.yaml")"
  case "$ingest_log" in
    *"failed_sources=[]"*) ;;
    *) echo "[e2e] FAIL: a source of the $label aggregation corpus did not answer — the" \
            "aggregation specs would report a normalization problem rather than a" \
            "collection one" >&2
       exit 1 ;;
  esac
  analyze_log="$(run_batch_job "econ-e2e-analyze-agg$suffix" \
    "$E2E_DIR/k8s/batch/analyze-job-agg$suffix.yaml")"
  case "$analyze_log" in
    *"failed=0"*) ;;
    *) echo "[e2e] FAIL: a model call failed while analyzing the $label corpus — the LLM" \
            "double has no canned reply for some article (see fixtures/llm/responses.json," \
            "bundle e2e-llm-agg) or is unreachable" >&2
       exit 1 ;;
  esac
  # An empty Gold is a wiring failure, not a data story: the CLI exits 0 even when the
  # join finds nothing, and a spec asserting on zero rows reads as "aggregation is
  # wrong" rather than "aggregation had no input".
  aggregate_log="$(run_batch_job "econ-e2e-aggregate$suffix" \
    "$E2E_DIR/k8s/batch/aggregate-job$suffix.yaml")"
  case "$aggregate_log" in
    *"wrote 0 subject_trend"* | *"+ 0 axis_sentiment"*)
      echo "[e2e] FAIL: the $label aggregation wrote an empty Gold — Silver did not join" \
           "back to Bronze on record_id, so there is nothing for the specs to observe" >&2
      exit 1 ;;
  esac
  echo "[e2e] aggregation ($label) done in $root"
}

run_aggregation_stack "" /data/aggregation baseline
export_lake /data/aggregation bronze "$AGG_BRONZE_DIR" news_item
export_lake /data/aggregation silver "$AGG_SILVER_DIR" analysis
export_lake /data/aggregation gold "$GOLD_DIR" subject_trend axis_sentiment
echo "[e2e] gold exported -> $GOLD_DIR"

run_aggregation_stack "-skew" /data/aggregation-skew skewed
export_lake /data/aggregation-skew gold "$GOLD_SKEW_DIR" subject_trend axis_sentiment
echo "[e2e] gold (skewed volume) exported -> $GOLD_SKEW_DIR"

# 4f) Rollup root (…-test-aggregation-viz.md#시나리오 3).
kubectl --context "$CTX" create configmap rollup-timeshift \
  --from-file="$E2E_DIR/tools/timeshift_bronze.py"
run_batch_job econ-e2e-timeshift-rollup "$E2E_DIR/k8s/batch/timeshift-job.yaml"
ROLLUP_LOG="$(run_batch_job econ-e2e-aggregate-rollup "$E2E_DIR/k8s/batch/aggregate-job-rollup.yaml")"
case "$ROLLUP_LOG" in
  *"wrote 0 subject_trend"* | *"+ 0 axis_sentiment"*)
    echo "[e2e] FAIL: the rollup aggregation wrote an empty Gold — the re-stamped corpus did" \
         "not join back on record_id, so scenario 3 has nothing to observe" >&2
    exit 1 ;;
esac
export_lake /data/aggregation-rollup bronze "$ROLLUP_BRONZE_DIR" news_item
export_lake /data/aggregation-rollup silver "$ROLLUP_SILVER_DIR" analysis
export_lake /data/aggregation-rollup gold "$ROLLUP_GOLD_DIR" subject_trend axis_sentiment
echo "[e2e] gold (multi-bucket rollup) exported -> $ROLLUP_GOLD_DIR"

# 5) Playwright specs against the forwarded endpoint + the exported Bronze.
cd "$E2E_DIR"
npm ci
if [ "${PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD:-0}" != "1" ]; then
  npx playwright install --with-deps chromium
fi
BASE_URL="http://127.0.0.1:$PORT" \
  E2E_BRONZE_DIR="$BRONZE_DIR" \
  E2E_BRONZE_FAULTS_DIR="$FAULTS_DIR" \
  E2E_BRONZE_CYCLES_DIR="$CYCLES_DIR" \
  E2E_BRONZE_ANALYSIS_DIR="$ANALYSIS_BRONZE_DIR" \
  E2E_SILVER_DIR="$SILVER_DIR" \
  E2E_SILVER_V2_DIR="$SILVER_V2_DIR" \
  E2E_BRONZE_AGG_DIR="$AGG_BRONZE_DIR" \
  E2E_SILVER_AGG_DIR="$AGG_SILVER_DIR" \
  E2E_GOLD_DIR="$GOLD_DIR" \
  E2E_GOLD_SKEW_DIR="$GOLD_SKEW_DIR" \
  E2E_BRONZE_ROLLUP_DIR="$ROLLUP_BRONZE_DIR" \
  E2E_SILVER_ROLLUP_DIR="$ROLLUP_SILVER_DIR" \
  E2E_GOLD_ROLLUP_DIR="$ROLLUP_GOLD_DIR" \
  E2E_INGEST_LOG_DIR="$LOG_DIR" \
  npx playwright test

echo "[e2e] OK: fixture Gold -> in-cluster serving -> API + browser"
echo "[e2e] OK: feed double -> in-cluster ingestion batch -> Bronze"
echo "[e2e] OK: fault injection + 3 sequential cycles -> Bronze + Job logs"
echo "[e2e] OK: llm double -> in-cluster analysis batch -> Silver (+ re-analysis)"
echo "[e2e] OK: aggregation batch -> pipeline-produced Gold (baseline + skewed volume)"
echo "[e2e] OK: re-stamped collection times -> aggregation -> multi-bucket Gold (hour/day/week)"
