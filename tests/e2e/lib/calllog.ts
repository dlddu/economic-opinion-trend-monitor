// 분석 배치가 레이크에 적재한 **기사별 모델 호출 기록**(`silver/llm_call`)을 읽는다.
// run.sh 가 객체 데이터셋을 JSONL 한 벌로 반출하고($E2E_LLM_CALL_DIR), 더블이 stderr 에
// 남긴 수신 요청 digest 를 함께 반출한다($E2E_LLM_DOUBLE_LOG).
//
// 왜 두 벌인가: 「기록된 프롬프트가 실제로 전송된 것과 같은가」(`…-test-pipeline-ops.md#시나리오 2`)
// 는 기록만 봐서는 판정할 수 없다. 기록을 만든 쪽과 프롬프트를 만든 쪽이 같은 코드라,
// 기록을 픽스처에서 재구성해 대조하면 언제나 참인 단정이 된다. 수신 측(더블)이 받은 바이트로
// 계산한 digest 만이 그 단정을 거짓이 될 수 있게 만든다.

import { readFileSync } from "node:fs";
import path from "node:path";

/** 호출 기록 한 건 — `contracts/silver/llm_call.avsc` 의 필드 이름을 그대로 쓴다. */
export type LlmCall = {
  call_id: string;
  run_id: string;
  record_id: string;
  source_url: string;
  analyzer_version: string;
  call_model: string;
  call_temperature: number | null;
  prompt_system: string;
  prompt_user: string;
  prompt_sha256: string;
  response_raw: string | null;
  call_outcome: "parsed" | "parse_failed" | "call_failed" | "reused";
  call_failure_reason: string | null;
  call_attempt_count: number;
  called_at: string;
  duration_ms: number;
  reused_from_call_id: string | null;
};

function need(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} 이 비어 있다 — 호출 기록 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 레이크의 호출 기록이 호스트로 반출된다.",
    );
  }
  return value;
}

/** 반출된 호출 기록 전건. 비어 있으면 조용히 빈 배열을 주지 않고 예외로 끊는다. */
export function llmCalls(): LlmCall[] {
  const file = path.join(need("E2E_LLM_CALL_DIR"), "llm_call.jsonl");
  const rows = readFileSync(file, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as LlmCall);
  if (rows.length === 0) {
    throw new Error(`${file} 에 호출 기록이 한 건도 없다 — 분석 배치가 호출을 하지 않았다`);
  }
  return rows;
}

/** 한 실행(`ECON_RUN_ID`)이 남긴 기록만. */
export function callsOfRun(calls: LlmCall[], runId: string): LlmCall[] {
  return calls.filter((call) => call.run_id === runId);
}

/** 갈래별로 모은다. 없는 갈래는 키 자체가 없다 — 단정이 「0건」과 「없음」을 구별하게. */
export function byOutcome(calls: LlmCall[]): Map<LlmCall["call_outcome"], LlmCall[]> {
  const grouped = new Map<LlmCall["call_outcome"], LlmCall[]>();
  for (const call of calls) {
    const bucket = grouped.get(call.call_outcome);
    if (bucket) bucket.push(call);
    else grouped.set(call.call_outcome, [call]);
  }
  return grouped;
}

/**
 * 더블이 **실제로 받은** 요청들의 프롬프트 digest — 한 모델 묶음 것만.
 *
 * 더블은 모든 배치 체인을 동시에 섬기므로 모델 이름으로 거르지 않으면 다른 묶음의 호출이
 * 섞여 건수 단정이 무의미해진다. 순서는 보장하지 않으므로 집합이 아니라 **배열**로 준다 —
 * 「전송 건수」를 세는 쪽이 중복을 잃지 않아야 하기 때문이다(같은 프롬프트를 두 번 보낼 수 있다).
 */
export function receivedDigests(model: string): string[] {
  const raw = readFileSync(need("E2E_LLM_DOUBLE_LOG"), "utf-8");
  const pattern = /received model=(\S+) prompt_sha256=([0-9a-f]{64})/g;
  const digests: string[] = [];
  for (const match of raw.matchAll(pattern)) {
    if (match[1] === model) digests.push(match[2]);
  }
  if (digests.length === 0) {
    throw new Error(
      `더블 로그에 model=${model} 의 수신 기록이 없다 — 이 묶음의 분석 Job 이 더블에 닿지 않았다`,
    );
  }
  return digests;
}
