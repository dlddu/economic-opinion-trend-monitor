// 검증 시나리오: econ-opinion-monitor-test-pipeline-ops.md#시나리오 2

import { expect, test } from "@playwright/test";
import { createHash } from "node:crypto";

import { type LlmCall, byOutcome, callsOfRun, llmCalls, receivedDigests } from "../lib/calllog";
import { MODEL_CALLS } from "../lib/llmdouble";

const OBSERVED_RUN = "e2e-calls-run-2";
const SEED_RUN = "e2e-calls-run-1";
const REPROCESS_RUN = "e2e-calls-run-3";

/** 제품의 `econ_core.calllog.prompt_digest` 와 같은 정의: system, NUL, user. */
function promptDigest(call: LlmCall): string {
  return createHash("sha256")
    .update(Buffer.concat([
      Buffer.from(call.prompt_system, "utf-8"),
      Buffer.from([0]),
      Buffer.from(call.prompt_user, "utf-8"),
    ]))
    .digest("hex");
}

test("pipeline-ops: one observed run records all four call outcomes with their evidence", () => {
  const observed = callsOfRun(llmCalls(), OBSERVED_RUN);
  const grouped = byOutcome(observed);

  // 네 갈래가 **모두** 있어야 한다. 하나라도 비면 픽스처나 주기 구성이 어긋난 것이고, 그때
  // 나머지 단정은 조용히 통과하므로 여기서 먼저 끊는다.
  expect([...grouped.keys()].sort()).toEqual(
    ["call_failed", "parse_failed", "parsed", "reused"],
  );

  for (const call of observed) {
    expect(call.run_id).toBe(OBSERVED_RUN);
    expect(call.call_model).toBe(MODEL_CALLS);
    expect(call.record_id).not.toBe("");
    expect(call.source_url).not.toBe("");
    expect(call.analyzer_version).toBe("llm-v3");
    expect(promptDigest(call)).toBe(call.prompt_sha256);
  }

  for (const call of grouped.get("parsed") ?? []) {
    expect(call.response_raw).not.toBeNull();
    expect(call.call_failure_reason).toBeNull();
    expect(call.call_attempt_count).toBe(1);
  }

  // 파싱 실패: 응답은 **왔고**(원문이 있다) 왜 못 썼는지가 남는다 — 호출 실패와의 차이다.
  for (const call of grouped.get("parse_failed") ?? []) {
    expect(call.response_raw).not.toBeNull();
    expect(call.call_failure_reason).toBeTruthy();
    expect(call.call_attempt_count).toBe(1);
  }

  for (const call of grouped.get("call_failed") ?? []) {
    expect(call.response_raw).toBeNull();
    expect(call.call_failure_reason).toBeTruthy();
    expect(call.call_attempt_count).toBe(1);
  }
});

test("pipeline-ops: recorded prompts equal the bytes the model double received", () => {
  const all = llmCalls();
  const observed = callsOfRun(all, OBSERVED_RUN);
  const sent = observed.filter((call) => call.call_outcome !== "reused");
  const received = receivedDigests(MODEL_CALLS);

  const receivedSet = new Set(received);
  for (const call of sent) {
    expect(receivedSet.has(call.prompt_sha256)).toBe(true);
  }

  // 그리고 더블이 받은 **건수**가 세 실행이 전송한 기록 수와 정확히 같다. 이 등식이 깨지는
  // 방향은 둘 다 실제 결함이다: 적으면 기록이 보내지 않은 호출을 지어낸 것이고, 많으면 제품이
  // 기록하지 않은 호출을 보낸 것이다. 재사용 기록이 전송 0건이라는 사실도 여기서 고정된다.
  const transmitted = all.filter((call) => call.call_outcome !== "reused").length;
  expect(received.length).toBe(transmitted);
});

test("pipeline-ops: a reused reply sends nothing and names the call it replays", () => {
  const all = llmCalls();
  const reused = callsOfRun(all, OBSERVED_RUN).filter((c) => c.call_outcome === "reused");
  expect(reused.length).toBeGreaterThan(0);

  const byId = new Map(all.map((call) => [call.call_id, call]));
  for (const call of reused) {
    expect(call.call_attempt_count).toBe(0);
    expect(call.duration_ms).toBe(0);
    expect(call.response_raw).not.toBeNull();

    expect(call.reused_from_call_id).not.toBeNull();
    const origin = byId.get(call.reused_from_call_id as string);
    expect(origin).toBeDefined();
    expect(origin?.run_id).toBe(SEED_RUN);
    expect(origin?.record_id).not.toBe(call.record_id);
    expect(origin?.prompt_sha256).toBe(call.prompt_sha256);
    expect(origin?.response_raw).toBe(call.response_raw);
  }
});

test("pipeline-ops: a version bump adds call records and leaves the earlier ones intact", () => {
  const all = llmCalls();
  const before = callsOfRun(all, SEED_RUN).concat(callsOfRun(all, OBSERVED_RUN));
  const after = callsOfRun(all, REPROCESS_RUN);

  expect(after.length).toBeGreaterThan(0);
  expect(new Set(after.map((call) => call.analyzer_version))).toEqual(new Set(["llm-v4"]));
  expect(new Set(before.map((call) => call.analyzer_version))).toEqual(new Set(["llm-v3"]));

  const survivingIds = new Set(all.map((call) => call.call_id));
  for (const call of before) {
    expect(survivingIds.has(call.call_id)).toBe(true);
  }

  const reprocessedRecordIds = new Set(after.map((call) => call.record_id));
  const carriedOver = before.filter((call) => reprocessedRecordIds.has(call.record_id));
  expect(carriedOver.length).toBeGreaterThan(0);
});
