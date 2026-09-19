#!/usr/bin/env bash
# kind-based e2e for two paths in one throwaway cluster:
#
#   * serving — build the serving image, mount fixture Gold from a ConfigMap and
#     run the Playwright specs (API + browser) against a port-forward.
#   * ingestion batch — build the batch image, point the real collection CLI at
#     an in-cluster feed double and run one cycle as a Job, then pull the Bronze
#     it wrote back out to the host for the specs to assert on. Two more Bronze
#     roots are produced next to it, each by the same CLI against the same double:
#     a fault-injection cycle (scenario 6) and three sequential cycles whose
#     upstream changes between them (scenario 7). Their Job logs are exported too
#     — the failure/duplicate/dedup counts the specs assert on are printed there.
#   * analysis batch — one more collection cycle produces the analysis corpus in
#     its own lake root, then the real analysis CLI runs against an in-cluster
#     chat-completions double and writes Silver. A second pass re-runs it with a
#     revised response set and a bumped analyzer version (scenario 6 of the
#     analysis doc), so the first Silver is exported *between* the two — the
#     re-analysis replaces the dataset rather than appending to it.
#   * aggregation batch — the medallion's third stage. A dedicated corpus (two KR
#     sources + one US source) runs collection -> analysis -> aggregation in its
#     own lake root, and the Gold it produces is pulled back to the host. The
#     whole thing runs a second time against an upstream whose volume is skewed on
#     one source only, so the two Golds differ in collection volume and nothing
#     else — that pair is what scenario 1 of the aggregation-viz doc compares.
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

# Run one batch Job (ingestion or analysis) to completion and keep its log — the
# specs assert on the counts it prints (failed_sources, duplicates_skipped, bodies
# new/deduplicated; low_confidence, unanalyzed, model calls), so a lost log is a
# lost observation, not just missing debug output.
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

# Copy a dataset off the PVC through the shell Pod. The Job's own container is gone
# by now, so the claim is the only place the records still exist. The layer is a
# parameter because analysis writes Silver next to the Bronze the collection wrote.
export_lake() {
  src_root="$1"; layer="$2"; dest="$3"; shift 3
  mkdir -p "$dest"
  for dataset in "$@"; do
    kubectl --context "$CTX" exec "$SHELL_POD" -- cat "$src_root/$layer/$dataset.jsonl" \
      > "$dest/$dataset.jsonl"
    [ -s "$dest/$dataset.jsonl" ] \
      || { echo "[e2e] FAIL: $src_root/$layer/$dataset.jsonl came back empty" >&2; exit 1; }
  done
}

echo "[e2e] images: $IMAGE, $BATCH_IMAGE  cluster: $CLUSTER  port: $PORT"

# 1) Both images into a fresh single-node cluster (no registry: kind load).
docker build -t "$IMAGE" "$ROOT"
docker build -f "$ROOT/Dockerfile.batch" -t "$BATCH_IMAGE" "$ROOT"
kind create cluster --name "$CLUSTER" --config "$E2E_DIR/kind-config.yaml" --wait 120s
kind load docker-image "$IMAGE" "$BATCH_IMAGE" --name "$CLUSTER"

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

# 4) Ingestion batch: the real collection CLI, one cycle, against a feed double.
# The double has to answer before the Job starts — `econ-ingestion` isolates a
# source it cannot fetch instead of failing, so a Job that runs too early would
# "succeed" with an empty Bronze and the specs would report a data problem
# rather than a startup ordering one.
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

# Bronze lives on the Job's PVC; a Job's container is gone once it finishes, so
# every export below reads the claim through this shell Pod.
SHELL_POD="$(kubectl --context "$CTX" get pod -l app=econ-bronze-shell \
  -o jsonpath='{.items[0].metadata.name}')"

INGEST_LOG="$(run_batch_job econ-e2e-ingest "$E2E_DIR/k8s/batch/ingest-job.yaml")"
# A source the CLI cannot reach is isolated, not fatal — correct for production,
# but here it would quietly shrink Bronze and surface as a puzzling spec failure.
# This guard is for the *healthy* cycle only; the fault-injection cycle below
# expects a non-empty failed_sources and must not be held to it.
case "$INGEST_LOG" in
  *"failed_sources=[]"*) ;;
  *) echo "[e2e] FAIL: a feed source did not answer — feed double unready or unreachable" >&2
     exit 1 ;;
esac
export_lake /data bronze "$BRONZE_DIR" news_item news_body
echo "[e2e] bronze exported -> $BRONZE_DIR"

# 4b) Fault injection (…-test-ingestion.md#시나리오 6): one more cycle against the
# same double, this time through its failure/flaky/slow paths. Writes to its own
# data root so the healthy cycle's Bronze — what specs 2..5 assert on — is untouched.
FAULTS_LOG="$(run_batch_job econ-e2e-ingest-faults "$E2E_DIR/k8s/batch/ingest-job-faults.yaml")"
case "$FAULTS_LOG" in
  *"failed_sources=[]"*)
    echo "[e2e] FAIL: the fault-injection cycle isolated no source — the double served" \
         "the broken paths successfully, so scenario 6 has nothing to observe" >&2
    exit 1 ;;
esac
export_lake /data/faults bronze "$FAULTS_DIR" news_item news_body
echo "[e2e] bronze (faults) exported -> $FAULTS_DIR"

# 4c) Three sequential cycles (…-test-ingestion.md#시나리오 7). news_item is
# rewritten every cycle by the store, so the per-cycle snapshot has to be taken between
# runs — the final file only holds cycle 3. news_body accumulates, which is the
# point: unchanged bodies must not be re-stored and an edited one must append.
for cycle in 1 2 3; do
  run_batch_job "econ-e2e-ingest-cycle$cycle" "$E2E_DIR/k8s/batch/ingest-job-cycle$cycle.yaml" \
    >/dev/null
  export_lake /data/cycles bronze "$CYCLES_DIR/cycle$cycle" news_item news_body
done
echo "[e2e] bronze (3 cycles) exported -> $CYCLES_DIR"

# 4d) Analysis batch (…-test-analysis.md#시나리오 1·2·3·6): one more collection cycle
# builds the analysis corpus in its own lake root, then the real analysis CLI runs
# against the in-cluster chat-completions double and writes Silver beside it.
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

# A canned reply the double does not have is a 404, which the CLI degrades to one
# unanalyzed record and *counts*. Without this guard a stale fixture would quietly
# turn into "the model declined to judge" — a data story, not the missing-fixture
# story it actually is.
ANALYZE_LOG="$(run_batch_job econ-e2e-analyze "$E2E_DIR/k8s/batch/analyze-job.yaml")"
case "$ANALYZE_LOG" in
  *"failed=0"*) ;;
  *) echo "[e2e] FAIL: a model call failed — the LLM double has no canned reply for some" \
          "article (see fixtures/llm/responses.json) or is unreachable" >&2
     exit 1 ;;
esac
# Re-analysis replaces this dataset, so the first pass has to be taken off the PVC
# *now* — scenario 6 compares the two.
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
# …-test-aggregation-viz.md#시나리오 1·2·4). The third medallion stage: this is where
# `python/packages/aggregation` runs for the first time in e2e — until now serving was
# fed hand-written fixture Gold, so normalization, cross-dimension counting and the
# sentiment ratios never executed.
#
# The corpus is its own (two KR sources so the *within-source-then-average*
# normalization has something to average, one US source so the axis dimension actually
# crosses), and it runs twice: once as the baseline, once against an upstream whose
# volume is inflated on one KR source only. Two completed lake roots, not two passes
# over one — `write_records` replaces a dataset, so a second pass in the same root
# would erase the baseline the comparison needs.
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
  E2E_INGEST_LOG_DIR="$LOG_DIR" \
  npx playwright test

echo "[e2e] OK: fixture Gold -> in-cluster serving -> API + browser"
echo "[e2e] OK: feed double -> in-cluster ingestion batch -> Bronze"
echo "[e2e] OK: fault injection + 3 sequential cycles -> Bronze + Job logs"
echo "[e2e] OK: llm double -> in-cluster analysis batch -> Silver (+ re-analysis)"
echo "[e2e] OK: aggregation batch -> pipeline-produced Gold (baseline + skewed volume)"
