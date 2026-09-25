// 검증 시나리오: econ-opinion-monitor-test-pipeline-ops.md#시나리오 2
//
// 시나리오의 세 실행 단계를 하네스가 이렇게 세운다(`run.sh` 의 `chain_llm_calls`):
//   (1) 주기 1 수집 + 분석 — 정상 1 · 파싱 실패 1 · 호출 실패 1 을 만들고 응답 캐시를 채운다.
//       그 정상 1건이 시나리오의 사전 조건 「이전 실행에서 이미 응답을 받은 기사」다.
//   (2) 주기 2 수집(같은 세 건 재관측 + 신규 1건) + **같은 버전** 분석 — 네 갈래가 한 실행 안에
//       선다. 이 실행(`e2e-calls-run-2`)이 이 spec 의 관측 대상이다.
//   (3) `--analyzer-version llm-v2` 재처리 — 새 버전 기록이 더해지고 이전 버전이 남는지를 본다.
//
// **프롬프트 바이트 동일을 왜 더블 로그로 재는가**: 기록을 만든 쪽과 프롬프트를 만든 쪽이 같은
// 제품 코드다. 기록된 프롬프트를 픽스처에서 재구성해 대조하면 제품이 무엇을 보냈든 통과하는
// 단정이 된다. 더블이 **받은 바이트**로 계산한 digest 와 대조해야 거짓이 될 수 있다.
//
// 그 대조에서 주의할 점 하나: 재사용 기록의 digest 도 로그에 **있다** — 그 원본이 주기 1에서
// 이미 같은 프롬프트를 보냈기 때문이다. 그래서 「재사용은 아무것도 전송하지 않았다」는 digest
// 유무가 아니라 **수신 건수 = 재사용 아닌 기록 수** 라는 등식으로만 falsifiable 하다.

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
    // 실행 ID·모델·재시도 횟수는 갈래와 무관하게 모든 기록이 가진다(기대 결과 문면).
    expect(call.run_id).toBe(OBSERVED_RUN);
    expect(call.call_model).toBe(MODEL_CALLS);
    expect(call.record_id).not.toBe("");
    expect(call.source_url).not.toBe("");
    expect(call.analyzer_version).toBe("llm-v1");
    expect(promptDigest(call)).toBe(call.prompt_sha256);
  }

  // 정상: 응답 원문이 있고 실패 사유가 없다.
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

  // 호출 실패: 응답이 아예 없고(원문 null) 오류 사유가 남는다.
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

  // 전송한 모든 기록의 프롬프트가 수신 측 digest 집합에 있다.
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
    // 보낸 것이 없으므로 시도 0회, 소요 0ms — 계약이 그렇게 정의한다.
    expect(call.call_attempt_count).toBe(0);
    expect(call.duration_ms).toBe(0);
    expect(call.response_raw).not.toBeNull();

    // 원 호출을 가리키고, 그 원 호출은 **이전 실행**의 실재하는 기록이다.
    expect(call.reused_from_call_id).not.toBeNull();
    const origin = byId.get(call.reused_from_call_id as string);
    expect(origin).toBeDefined();
    expect(origin?.run_id).toBe(SEED_RUN);
    // 재사용이 성립한 이유: 다른 레코드인데 프롬프트가 바이트 동일하다.
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
  expect(new Set(after.map((call) => call.analyzer_version))).toEqual(new Set(["llm-v2"]));
  expect(new Set(before.map((call) => call.analyzer_version))).toEqual(new Set(["llm-v1"]));

  // 재처리는 이전 버전의 기록을 **하나도** 지우지 않는다 — 호출 기록은 call_id 를 키로
  // append-only 로 적재되므로(put_object 가 교체를 거부한다) 이 단정이 그 성질을 잰다.
  const survivingIds = new Set(all.map((call) => call.call_id));
  for (const call of before) {
    expect(survivingIds.has(call.call_id)).toBe(true);
  }

  // 같은 Bronze 레코드가 두 버전의 기록을 나란히 갖는다(이전 버전이 덮이지 않았다는 뜻).
  const reprocessedRecordIds = new Set(after.map((call) => call.record_id));
  const carriedOver = before.filter((call) => reprocessedRecordIds.has(call.record_id));
  expect(carriedOver.length).toBeGreaterThan(0);
});
