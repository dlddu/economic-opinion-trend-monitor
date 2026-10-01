// LLM 더블이 서빙하는 응답 픽스처를 spec 쪽에서도 읽는다. 기대값을 상수로 박지 않기
// 위해서다 — "이 기사에 대해 모델이 무엇이라 답했는가"는 `fixtures/llm/responses.json` 이
// 정하므로, 단정은 거기서 유도해야 픽스처를 바꿔도 여전히 옳다. `lib/feeds.ts` 가 피드 더블의
// 픽스처에 대해 하는 일과 같은 자리다.
//
// **무엇을 단정하지 않는가**: 모델의 판단이 옳은가(의미적 품질)는 여기서 보지 않는다. 그건
// 오프라인 골든 평가의 몫이고(doc-tracker 「예외 후보 중 미등재」), 이 층이 보는 것은 모델이
// 무엇이라 답했든 그 값이 **손실·왜곡 없이 Silver까지 전달되는가**라는 계약이다.
//
// `extends` 해석이 더블(python)과 여기(TypeScript) 양쪽에 있다. 한 단계만 따라가는 규칙이라
// 다섯 줄이고, 대신 spec이 더블을 거치지 않고도 같은 기대값을 읽을 수 있다.

import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.resolve(__dirname, "..", "fixtures", "llm", "responses.json");

/** 1차 분석이 고르는 응답 묶음 — `k8s/batch/analyze-job.yaml` 의 `ECON_LLM_MODEL` 과 같아야 한다. */
export const MODEL_V1 = "e2e-llm-v1";
/** 재분석이 고르는 묶음 — `k8s/batch/analyze-job-v2.yaml` 의 `ECON_LLM_MODEL` 과 같아야 한다. */
export const MODEL_V2 = "e2e-llm-v2";
/** 집계 묶음이 고르는 묶음 — `k8s/batch/analyze-job-agg.yaml` 의 `ECON_LLM_MODEL` 과 같아야 한다. */
export const MODEL_AGG = "e2e-llm-agg";
/** 호출 기록 묶음이 고르는 묶음 — `k8s/batch/analyze-job-calls*.yaml` 의 `ECON_LLM_MODEL` 과 같아야 한다. */
export const MODEL_CALLS = "e2e-llm-calls";

/** 더블이 한 기사에 대해 돌려주는 응답 — 제품이 기대하는 모델 응답 스키마 그대로다. */
export type CannedReply = {
  target_countries: string[];
  narrative_subjects: string[];
  subject_categories?: string[];
  // 판단을 유보한 응답(`analyzable: false`)은 분위기를 비워 둔다. 제품 경로도 그 경우
  // sentiment 를 읽기 전에 unanalyzed 로 끊으므로(`analyze_llm`), 여기서도 null 을 허용해야
  // 픽스처와 타입이 어긋나지 않는다.
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  analyzable: boolean;
  confidence: number;
};

type Fixture = {
  models: Record<string, { extends?: string; responses?: Record<string, CannedReply> }>;
};

/** 한 모델 이름이 고르는 응답 묶음(제목 -> 응답). `extends` 는 한 단계만 따라간다. */
export function cannedReplies(model: string): Map<string, CannedReply> {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8")) as Fixture;
  const spec = fixture.models[model];
  if (!spec) throw new Error(`responses.json 에 모델 ${model} 의 응답 묶음이 없다`);
  const merged = new Map<string, CannedReply>();
  if (spec.extends) {
    const parent = fixture.models[spec.extends];
    if (!parent) throw new Error(`모델 ${model} 이 없는 묶음 ${spec.extends} 를 extends 한다`);
    for (const [title, reply] of Object.entries(parent.responses ?? {})) merged.set(title, reply);
  }
  for (const [title, reply] of Object.entries(spec.responses ?? {})) merged.set(title, reply);
  return merged;
}

/** 제목 하나의 응답. 없으면 조용히 undefined 를 주지 않고 끊는다(픽스처 누락을 드러낸다). */
export function cannedReply(model: string, title: string): CannedReply {
  const found = cannedReplies(model).get(title);
  if (!found) throw new Error(`모델 ${model} 묶음에 제목 ${JSON.stringify(title)} 의 응답이 없다`);
  return found;
}

/** 응답 표의 값을 **해석하지 않고** 그대로 읽는다. */
export function rawReplyValue(model: string, title: string): unknown {
  const fixture = JSON.parse(readFileSync(FIXTURE, "utf-8")) as {
    models: Record<string, { extends?: string; responses?: Record<string, unknown> }>;
  };
  const spec = fixture.models[model];
  if (!spec) throw new Error(`responses.json 에 모델 ${model} 의 응답 묶음이 없다`);
  const own = spec.responses ?? {};
  if (title in own) return own[title];
  const parent = spec.extends ? fixture.models[spec.extends]?.responses ?? {} : {};
  if (title in parent) return parent[title];
  throw new Error(`모델 ${model} 묶음에 제목 ${JSON.stringify(title)} 의 응답이 없다`);
}

/** 응답 표에 **없는** 제목인지 — 더블이 404 로 끊고 제품이 `call_failed` 로 기록하는 갈래. */
export function hasCannedReply(model: string, title: string): boolean {
  try {
    rawReplyValue(model, title);
    return true;
  } catch {
    return false;
  }
}
