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
CHAIN_LOG_DIR="$E2E_DIR/.artifacts/batch-chains"
LLM_CALL_DIR="$E2E_DIR/.artifacts/llm-calls"
LLM_DOUBLE_LOG="$E2E_DIR/.artifacts/llm-double.log"
PW_SETUP_LOG="$E2E_DIR/.artifacts/playwright-setup.log"
KIND_CREATE_LOG="$E2E_DIR/.artifacts/kind-create.log"
RUNLOG_OPS_DIR="$E2E_DIR/.artifacts/runlog-ops"
LINKS_BRONZE_DIR="$E2E_DIR/.artifacts/bronze-links"
LINKS_SILVER_DIR="$E2E_DIR/.artifacts/silver-links"
LINKS_CALL_DIR="$E2E_DIR/.artifacts/llm-calls-links"
LINKS_RUNLOG_DIR="$E2E_DIR/.artifacts/runlog-links"
PF=""
BG_PIDS=()

for tool in docker kind kubectl node npm curl; do
  command -v "$tool" >/dev/null 2>&1 \
    || { echo "[e2e] FAIL: '$tool' not found — e2e needs docker + kind + kubectl + node" >&2; exit 1; }
done

cleanup() {
  status=$?
  [ -n "$PF" ] && kill "$PF" 2>/dev/null || true
  # `${a[@]+…}`: an empty array under `set -u` is an error on bash 3.2 (macOS).
  for pid in ${BG_PIDS[@]+"${BG_PIDS[@]}"}; do kill "$pid" 2>/dev/null || true; done
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

run_batch_job_expecting_failure() {
  job="$1"; manifest="$2"
  kubectl --context "$CTX" apply -f "$manifest"
  if ! kubectl --context "$CTX" wait --for=condition=failed "job/$job" --timeout=300s; then
    echo "[e2e] FAIL: $job did not fail — the analysis stage was supposed to stop here" >&2
    kubectl --context "$CTX" describe "job/$job" >&2 || true
    kubectl --context "$CTX" logs "job/$job" --tail=100 >&2 || true
    exit 1
  fi
  mkdir -p "$LOG_DIR"
  kubectl --context "$CTX" logs "job/$job" > "$LOG_DIR/$job.log"
  cat "$LOG_DIR/$job.log"
}

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

# Partitioned and object datasets come back as one JSONL per dataset, so specs read
# them like any other.
export_parts() {
  src_root="$1"; layer="$2"; dest="$3"; dataset="$4"; glob="$5"
  mkdir -p "$dest"
  kubectl --context "$CTX" exec "$SHELL_POD" -- \
    sh -c 'cd "$1" && cat $2' _ "$src_root/$layer/$dataset" "$glob" > "$dest/$dataset.jsonl"
  [ -s "$dest/$dataset.jsonl" ] \
    || { echo "[e2e] FAIL: $src_root/$layer/$dataset/ came back empty" >&2; exit 1; }
}

export_news_item() { export_parts "$1" bronze "$2" news_item '*=*/*=*/*=*/*=*/data.jsonl'; }
export_news_body() { export_parts "$1" bronze "$2" news_body '*=*/*.json'; }
export_analysis() { export_parts "$1" silver "$2" analysis '*=*/*=*/*=*/*=*/data.jsonl'; }
export_pipeline_run() { export_parts "$1" silver "$2" pipeline_run '*=*/*.json'; }
export_llm_call() { export_parts "$1" silver "$2" llm_call '*=*/*.json'; }

echo "[e2e] images: $IMAGE, $BATCH_IMAGE  cluster: $CLUSTER  port: $PORT"

mkdir -p "$E2E_DIR/.artifacts"

# 0) Playwright setup in the background.
PW_SETUP_PID=""
PW_SETUP_RC="${E2E_PLAYWRIGHT_SETUP_RC:-}"
if [ -n "$PW_SETUP_RC" ]; then
  PW_SETUP_LOG="${PW_SETUP_RC%.rc}.log"
  echo "[e2e] Playwright setup started by the caller — waiting on $PW_SETUP_RC before the specs"
else
  bash "$E2E_DIR/playwright-setup.sh" </dev/null >"$PW_SETUP_LOG" 2>&1 &
  PW_SETUP_PID=$!
  BG_PIDS+=("$PW_SETUP_PID")
fi

# 1) Both images into a fresh single-node cluster (no registry: kind load).
KIND_PID=""
if [ "${E2E_REUSE_CLUSTER:-0}" = "1" ]; then
  kind get clusters 2>/dev/null | grep -qx "$CLUSTER" \
    || { echo "[e2e] FAIL: E2E_REUSE_CLUSTER=1 but kind cluster '$CLUSTER' does not exist" >&2; exit 1; }
  echo "[e2e] reusing kind cluster $CLUSTER"
else
  kind create cluster --name "$CLUSTER" --config "$E2E_DIR/kind-config.yaml" \
    </dev/null >"$KIND_CREATE_LOG" 2>&1 &
  KIND_PID=$!
  BG_PIDS+=("$KIND_PID")
fi

if [ "${SKIP_BUILD:-0}" = "1" ]; then
  for image in "$IMAGE" "$BATCH_IMAGE"; do
    docker image inspect "$image" >/dev/null 2>&1 \
      || { echo "[e2e] FAIL: SKIP_BUILD=1 but $image is not in the local docker image store" >&2; exit 1; }
  done
  echo "[e2e] SKIP_BUILD=1 — using prebuilt $IMAGE, $BATCH_IMAGE"
else
  docker build -t "$IMAGE" "$ROOT"
  docker build -f "$ROOT/Dockerfile.batch" -t "$BATCH_IMAGE" "$ROOT"
fi

if [ -n "$KIND_PID" ]; then
  if ! wait "$KIND_PID"; then
    cat "$KIND_CREATE_LOG" >&2
    echo "[e2e] FAIL: kind create cluster failed" >&2
    exit 1
  fi
  cat "$KIND_CREATE_LOG"
fi
kind load docker-image "$IMAGE" "$BATCH_IMAGE" --name "$CLUSTER"

# 2) Fixture Gold as a ConfigMap + the serving stack and the batch harness (e2e overlay of deploy/base).
# mock-exception: GOLD-01 — 집계 배치는 e2e 안에 섰지만(run_aggregation_stack) 서빙 입력을 아직 그 파이프라인 Gold로 잇지 않아(원장 R3) 커밋된 픽스처로 채움 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap gold-fixtures --from-file="$E2E_DIR/fixtures/gold"
# mock-exception: FEED-02 — 실 RSS/Atom 상류는 가용성·내용이 매 순간 달라 결정적 단정이 불가능해 고정 피드 픽스처를 주입한다 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap feed-fixtures --from-file="$E2E_DIR/fixtures/feeds"
# 분석 배치의 상류 더블이 돌려줄 응답. 더블 Deployment가 이 ConfigMap을 마운트하므로 apply 전에
# 만들어 둔다 — 없으면 Pod가 볼륨을 못 붙여 영영 Ready가 되지 않는다.
# mock-exception: LLM-02 — 실 chat-completions 응답은 비결정적이라 기사별 고정 응답 픽스처를 주입한다 — docs/econ-opinion-monitor-e2e-mocking-policy.md
kubectl --context "$CTX" create configmap llm-fixtures --from-file="$E2E_DIR/fixtures/llm"
# 4f 의 롤업 체인이 쓰는 하네스 스크립트. 체인들이 동시에 돌므로 여기서 미리 만든다.
kubectl --context "$CTX" create configmap rollup-timeshift \
  --from-file="$E2E_DIR/tools/timeshift_bronze.py"
kubectl --context "$CTX" apply -k "$E2E_DIR/k8s"
kubectl --context "$CTX" apply -k "$E2E_DIR/k8s/batch"

if ! kubectl --context "$CTX" rollout status deployment/econ-serving --timeout=120s; then
  echo "[e2e] FAIL: serving rollout not ready — pod state follows" >&2
  kubectl --context "$CTX" describe pods -l app=econ-serving >&2 || true
  kubectl --context "$CTX" logs -l app=econ-serving --tail=100 >&2 || true
  exit 1
fi
kubectl --context "$CTX" rollout status deployment/econ-feed-double --timeout=120s
kubectl --context "$CTX" rollout status deployment/econ-llm-double --timeout=120s
kubectl --context "$CTX" rollout status deployment/econ-bronze-shell --timeout=120s

# 3) Reach the in-cluster Service from the host.
kubectl --context "$CTX" port-forward service/econ-serving "$PORT:8080" >/dev/null &
PF=$!
curl -sf --retry 20 --retry-delay 1 --retry-connrefused \
  "http://127.0.0.1:$PORT/api/health" >/dev/null

SHELL_POD="$(kubectl --context "$CTX" get pod -l app=econ-bronze-shell \
  -o jsonpath='{.items[0].metadata.name}')"

# 4) Batch Jobs — one chain per data root. A chain must not read another's root.
#
# 4a) Ingestion batch: the real collection CLI, one cycle, against a feed double.
chain_ingest() {
  local log
  log="$(run_batch_job econ-e2e-ingest "$E2E_DIR/k8s/batch/ingest-job.yaml")"
  # A source the CLI cannot reach is isolated, not fatal — correct for production,
  # but here it would quietly shrink Bronze and surface as a puzzling spec failure.
  case "$log" in
    *"failed_sources=[]"*) ;;
    *) echo "[e2e] FAIL: a feed source did not answer — feed double unready or unreachable" >&2
       exit 1 ;;
  esac
  export_news_item /data "$BRONZE_DIR"
  export_news_body /data "$BRONZE_DIR"
  echo "[e2e] bronze exported -> $BRONZE_DIR"
}

# 4b) Fault-injection cycle (…-test-ingestion.md#시나리오 6).
chain_faults() {
  local log
  log="$(run_batch_job econ-e2e-ingest-faults "$E2E_DIR/k8s/batch/ingest-job-faults.yaml")"
  case "$log" in
    *"failed_sources=[]"*)
      echo "[e2e] FAIL: the fault-injection cycle isolated no source — the double served" \
           "the broken paths successfully, so scenario 6 has nothing to observe" >&2
      exit 1 ;;
  esac
  export_news_item /data/faults "$FAULTS_DIR"
  export_news_body /data/faults "$FAULTS_DIR"
  echo "[e2e] bronze (faults) exported -> $FAULTS_DIR"
}

# 4c) Three sequential cycles (…-test-ingestion.md#시나리오 7).
chain_cycles() {
  for cycle in 1 2 3; do
    run_batch_job "econ-e2e-ingest-cycle$cycle" "$E2E_DIR/k8s/batch/ingest-job-cycle$cycle.yaml" \
      >/dev/null
    export_news_item /data/cycles "$CYCLES_DIR/cycle$cycle"
    export_news_body /data/cycles "$CYCLES_DIR/cycle$cycle"
  done
  echo "[e2e] bronze (3 cycles) exported -> $CYCLES_DIR"
}

# 4d) Analysis batch (…-test-analysis.md#시나리오 1·2·3·6).
chain_analysis() {
  local log
  log="$(run_batch_job econ-e2e-ingest-analysis "$E2E_DIR/k8s/batch/ingest-job-analysis.yaml")"
  case "$log" in
    *"failed_sources=[]"*) ;;
    *) echo "[e2e] FAIL: the analysis corpus feed did not answer — the analysis specs would" \
            "report a judgement problem rather than a collection one" >&2
       exit 1 ;;
  esac
  export_news_item /data/analysis "$ANALYSIS_BRONZE_DIR"
  export_news_body /data/analysis "$ANALYSIS_BRONZE_DIR"
  echo "[e2e] bronze (analysis corpus) exported -> $ANALYSIS_BRONZE_DIR"

  log="$(run_batch_job econ-e2e-analyze "$E2E_DIR/k8s/batch/analyze-job.yaml")"
  case "$log" in
    *"failed=0"*) ;;
    *) echo "[e2e] FAIL: a model call failed — the LLM double has no canned reply for some" \
            "article (see fixtures/llm/responses.json) or is unreachable" >&2
       exit 1 ;;
  esac
  export_analysis /data/analysis "$SILVER_DIR"
  echo "[e2e] silver exported -> $SILVER_DIR"

  log="$(run_batch_job econ-e2e-analyze-v2 "$E2E_DIR/k8s/batch/analyze-job-v2.yaml")"
  case "$log" in
    *"failed=0"*) ;;
    *) echo "[e2e] FAIL: a model call failed during re-analysis — the v2 response set is" \
            "incomplete or the double is unreachable" >&2
       exit 1 ;;
  esac
  export_analysis /data/analysis "$SILVER_V2_DIR"
  echo "[e2e] silver (re-analysis) exported -> $SILVER_V2_DIR"
}

# 4e) Per-article model call log (…-test-pipeline-ops.md#시나리오 2).
chain_llm_calls() {
  local log
  run_batch_job econ-e2e-ingest-calls1 "$E2E_DIR/k8s/batch/ingest-job-calls1.yaml" >/dev/null

  # Cycle 1: one article answers, one reply will not parse, one title the double does not
  # know. Two failures are the *expected* state here, so this chain guards on the count
  # rather than on `failed=0` — a green `failed=0` would mean the branches never happened.
  log="$(run_batch_job econ-e2e-analyze-calls1 "$E2E_DIR/k8s/batch/analyze-job-calls1.yaml")"
  case "$log" in
    *"failed=2"*) ;;
    *) echo "[e2e] FAIL: cycle 1 did not produce exactly the two intended failures — the" \
            "double's response table drifted from llm_calls_cycle1.rss.xml" >&2
       exit 1 ;;
  esac

  run_batch_job econ-e2e-ingest-calls2 "$E2E_DIR/k8s/batch/ingest-job-calls2.yaml" >/dev/null

  # Cycle 2 is the run the spec reads. `reused=1` is the load-bearing part: without it the
  # cache did not carry across runs and the scenario's "already answered earlier" branch is
  # missing, which a record-shape assertion alone would not notice.
  log="$(run_batch_job econ-e2e-analyze-calls2 "$E2E_DIR/k8s/batch/analyze-job-calls2.yaml")"
  case "$log" in
    *"reused=1"*) ;;
    *) echo "[e2e] FAIL: cycle 2 reused no earlier reply — the two cycles' prompts are not" \
            "byte-identical (titles/bodies drifted between the two feed fixtures)" >&2
       exit 1 ;;
  esac

  run_batch_job econ-e2e-analyze-calls-v2 "$E2E_DIR/k8s/batch/analyze-job-calls-v2.yaml" >/dev/null

  export_llm_call /data/llm-calls "$LLM_CALL_DIR"
  kubectl --context "$CTX" logs deploy/econ-llm-double --tail=-1 > "$LLM_DOUBLE_LOG"
  [ -s "$LLM_DOUBLE_LOG" ] \
    || { echo "[e2e] FAIL: the llm double logged nothing — no request digests to check the" \
              "recorded prompts against" >&2; exit 1; }
  echo "[e2e] llm call log exported -> $LLM_CALL_DIR"
}

# 4f) Record <-> run <-> call links (…-test-pipeline-ops.md#시나리오 3).
#
# A dedicated root again, for the reason the fixtures README gives: the assertions here are
# about *which rows a run made* and *which version a row carries*, and both are counts over
# the whole root — another bundle's cycles landing in it would make every one of them read
# a different corpus than the one this scenario describes.
chain_record_links() {
  local log

  # Cycle 1: the desk pair (answered / low confidence) plus the wire pair (one with no body,
  # one that cycle 2 re-observes). Every call here succeeds — the failing branch lives in
  # cycle 2 so that no record is left on the retry list (see the wire fixture header).
  run_batch_job econ-e2e-ingest-links1 "$E2E_DIR/k8s/batch/ingest-job-links1.yaml" >/dev/null
  log="$(run_batch_job econ-e2e-analyze-links1 "$E2E_DIR/k8s/batch/analyze-job-links1.yaml")"
  case "$log" in
    *"low_confidence=1 unanalyzed=1"*) ;;
    *) echo "[e2e] FAIL: cycle 1 did not produce one low-confidence and one unanalyzed row —" \
            "the response table drifted from the cycle-1 desk/wire fixtures" >&2
       exit 1 ;;
  esac

  # Cycle 2 re-observes the wire pair and adds the article the double has no reply for.
  # `reused=1` is load-bearing: without it the corpus has no row whose call record names an
  # *earlier* call, and "a replayed reply reaches the original call record" passes vacuously.
  # `failed=1` is equally deliberate — it is the only row that is unanalyzed *with* a call,
  # which is what keeps the call_id/no_call_reason exclusion from being one-sided.
  run_batch_job econ-e2e-ingest-links2 "$E2E_DIR/k8s/batch/ingest-job-links2.yaml" >/dev/null
  log="$(run_batch_job econ-e2e-analyze-links2 "$E2E_DIR/k8s/batch/analyze-job-links2.yaml")"
  case "$log" in
    *"failed=1 reused=1"*) ;;
    *) echo "[e2e] FAIL: cycle 2 did not produce exactly one failed and one replayed call —" \
            "either the two wire fixtures' shared articles drifted apart (no cache hit) or" \
            "the double grew a reply for the article that is supposed to 404" >&2
       exit 1 ;;
  esac

  # The scoped reprocess. `coexisting` is the word the product prints when a scope was given,
  # and it is exactly the precondition scenario 3 names: without it the rewrite is `in place`
  # and the llm-v1 rows are gone, leaving nothing to compare the two versions with.
  log="$(run_batch_job econ-e2e-analyze-links-v2 "$E2E_DIR/k8s/batch/analyze-job-links-v2.yaml")"
  case "$log" in
    *"(coexisting, pruned=0)"*) ;;
    *) echo "[e2e] FAIL: the scoped reprocess did not write coexisting rows — the earlier" \
            "analyzer version was overwritten and the two-version comparison has one side" >&2
       exit 1 ;;
  esac

  export_news_item /data/record-links "$LINKS_BRONZE_DIR"
  export_news_body /data/record-links "$LINKS_BRONZE_DIR"
  export_analysis /data/record-links "$LINKS_SILVER_DIR"
  export_llm_call /data/record-links "$LINKS_CALL_DIR"
  export_pipeline_run /data/record-links "$LINKS_RUNLOG_DIR"
  echo "[e2e] record-link corpus exported -> $LINKS_SILVER_DIR"
}

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

# Baseline aggregation, then 4f) the rollup root (…-test-aggregation-viz.md#시나리오 3) — it must follow it.
chain_aggregation() {
  run_aggregation_stack "" /data/aggregation baseline
  export_news_item /data/aggregation "$AGG_BRONZE_DIR"
  export_analysis /data/aggregation "$AGG_SILVER_DIR"
  export_lake /data/aggregation gold "$GOLD_DIR" subject_trend axis_sentiment
  echo "[e2e] gold exported -> $GOLD_DIR"

  local log
  run_batch_job econ-e2e-timeshift-rollup "$E2E_DIR/k8s/batch/timeshift-job.yaml"
  log="$(run_batch_job econ-e2e-aggregate-rollup "$E2E_DIR/k8s/batch/aggregate-job-rollup.yaml")"
  case "$log" in
    *"wrote 0 subject_trend"* | *"+ 0 axis_sentiment"*)
      echo "[e2e] FAIL: the rollup aggregation wrote an empty Gold — the re-stamped corpus did" \
           "not join back on record_id, so scenario 3 has nothing to observe" >&2
      exit 1 ;;
  esac
  export_news_item /data/aggregation-rollup "$ROLLUP_BRONZE_DIR"
  export_analysis /data/aggregation-rollup "$ROLLUP_SILVER_DIR"
  export_lake /data/aggregation-rollup gold "$ROLLUP_GOLD_DIR" subject_trend axis_sentiment
  echo "[e2e] gold (multi-bucket rollup) exported -> $ROLLUP_GOLD_DIR"
}

chain_aggregation_skew() {
  run_aggregation_stack "-skew" /data/aggregation-skew skewed
  export_lake /data/aggregation-skew gold "$GOLD_SKEW_DIR" subject_trend axis_sentiment
  echo "[e2e] gold (skewed volume) exported -> $GOLD_SKEW_DIR"
}

mkdir -p "$CHAIN_LOG_DIR"
CHAINS=(ingest faults cycles analysis llm_calls record_links aggregation aggregation_skew)
CHAIN_PIDS=()  # same index as CHAINS — no associative arrays, bash 3.2 has none
for chain in "${CHAINS[@]}"; do
  ( "chain_$chain" ) </dev/null >"$CHAIN_LOG_DIR/$chain.log" 2>&1 &
  CHAIN_PIDS+=("$!")
  BG_PIDS+=("$!")
done
failed_chains=()
for idx in "${!CHAINS[@]}"; do
  chain="${CHAINS[$idx]}"
  if wait "${CHAIN_PIDS[$idx]}"; then
    echo "[e2e] ── batch chain '$chain' ok ──"
  else
    failed_chains+=("$chain")
    echo "[e2e] ── batch chain '$chain' FAILED ──" >&2
  fi
  cat "$CHAIN_LOG_DIR/$chain.log"
done
if [ "${#failed_chains[@]}" -gt 0 ]; then
  echo "[e2e] FAIL: batch chain(s) failed: ${failed_chains[*]} — their logs are above" >&2
  exit 1
fi

# 4g) Pipeline-ops root (…-test-pipeline-ops.md#시나리오 1).
OPS_INGEST_LOG="$(run_batch_job econ-e2e-ingest-ops "$E2E_DIR/k8s/batch/ingest-job-ops.yaml")"
case "$OPS_INGEST_LOG" in
  *"failed_sources=['e2e-ops-down']"*) ;;
  *) echo "[e2e] FAIL: the pipeline-ops collection isolated no source — the feed double" \
          "served /__fail__/ successfully, so the run record carries no source failure" >&2
     exit 1 ;;
esac
OPS_ANALYZE_LOG="$(run_batch_job econ-e2e-analyze-ops "$E2E_DIR/k8s/batch/analyze-job-ops.yaml")"
case "$OPS_ANALYZE_LOG" in
  *"failed=0"*) ;;
  *) echo "[e2e] FAIL: a model call failed in the pipeline-ops run that is supposed to" \
          "succeed — the LLM double has no canned reply for some article (see" \
          "fixtures/llm/responses.json, bundle e2e-llm-agg) or is unreachable" >&2
     exit 1 ;;
esac
OPS_AGGREGATE_LOG="$(run_batch_job econ-e2e-aggregate-ops "$E2E_DIR/k8s/batch/aggregate-job-ops.yaml")"
case "$OPS_AGGREGATE_LOG" in
  *"wrote 0 subject_trend"* | *"+ 0 axis_sentiment"*)
    echo "[e2e] FAIL: the pipeline-ops aggregation wrote an empty Gold — the stage would" \
         "book zero served rows and the meshing assertion would compare 0 to 0" >&2
    exit 1 ;;
esac

run_batch_job econ-e2e-ingest-ops-2 "$E2E_DIR/k8s/batch/ingest-job-ops-2.yaml" >/dev/null
OPS_STOPPED_LOG="$(run_batch_job_expecting_failure econ-e2e-analyze-ops-stopped \
  "$E2E_DIR/k8s/batch/analyze-job-ops-stopped.yaml")"
case "$OPS_STOPPED_LOG" in
  *"model calls failed"*) ;;
  *) echo "[e2e] FAIL: econ-e2e-analyze-ops-stopped failed for some other reason than the" \
          "injected outage — the stage record would name a different cause" >&2
     exit 1 ;;
esac

OPS_JOBS="econ-e2e-ingest-ops econ-e2e-analyze-ops econ-e2e-aggregate-ops \
econ-e2e-ingest-ops-2 econ-e2e-analyze-ops-stopped"
# shellcheck disable=SC2086 # the job names are a deliberate word list, not one argument
kubectl --context "$CTX" delete job $OPS_JOBS --wait=true
# shellcheck disable=SC2086
surviving="$(kubectl --context "$CTX" get job $OPS_JOBS \
  --ignore-not-found -o name 2>/dev/null | grep -c . || true)"
if [ "$surviving" != "0" ]; then
  echo "[e2e] FAIL: $surviving pipeline-ops Job(s) survived the delete — the scheduler" \
       "history was not cleared, so the export below proves nothing" >&2
  exit 1
fi
export_pipeline_run /data/pipeline-ops "$RUNLOG_OPS_DIR"
echo "[e2e] pipeline_run exported after deleting its Jobs -> $RUNLOG_OPS_DIR"

# 5) Playwright specs against the forwarded endpoint + the exported Bronze.
pw_wait_start=$SECONDS
if [ -n "$PW_SETUP_PID" ]; then
  if wait "$PW_SETUP_PID"; then pw_status=0; else pw_status=$?; fi
else
  timeout 600 bash -c 'until [ -f "$1" ]; do sleep 1; done' _ "$PW_SETUP_RC" \
    || { echo "[e2e] FAIL: $PW_SETUP_RC did not appear within 600s" >&2; exit 1; }
  pw_status="$(cat "$PW_SETUP_RC")"
fi
if [ "$pw_status" != "0" ]; then
  cat "$PW_SETUP_LOG" >&2
  echo "[e2e] FAIL: Playwright setup (npm ci / playwright install) failed — log above" >&2
  exit 1
fi
tail -n 5 "$PW_SETUP_LOG"
echo "[e2e] Playwright setup ready (waited $((SECONDS - pw_wait_start))s)"
cd "$E2E_DIR"
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
  E2E_RUNLOG_OPS_DIR="$RUNLOG_OPS_DIR" \
  E2E_LLM_CALL_DIR="$LLM_CALL_DIR" \
  E2E_BRONZE_LINKS_DIR="$LINKS_BRONZE_DIR" \
  E2E_SILVER_LINKS_DIR="$LINKS_SILVER_DIR" \
  E2E_LLM_CALL_LINKS_DIR="$LINKS_CALL_DIR" \
  E2E_RUNLOG_LINKS_DIR="$LINKS_RUNLOG_DIR" \
  E2E_LLM_DOUBLE_LOG="$LLM_DOUBLE_LOG" \
  npx playwright test

echo "[e2e] OK: fixture Gold -> in-cluster serving -> API + browser"
echo "[e2e] OK: feed double -> in-cluster ingestion batch -> Bronze"
echo "[e2e] OK: fault injection + 3 sequential cycles -> Bronze + Job logs"
echo "[e2e] OK: llm double -> in-cluster analysis batch -> Silver (+ re-analysis)"
echo "[e2e] OK: aggregation batch -> pipeline-produced Gold (baseline + skewed volume)"
echo "[e2e] OK: two collection cycles + a version bump -> per-article model call log"
echo "[e2e] OK: re-stamped collection times -> aggregation -> multi-bucket Gold (hour/day/week)"
echo "[e2e] OK: two pipeline runs (one whole, one stopped in analysis) -> pipeline_run records"
echo "[e2e] OK: two cycles + a scoped reprocess -> rows, runs and calls that name each other"
