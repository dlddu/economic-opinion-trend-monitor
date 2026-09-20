// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 3
//
// 라벨의 **정확도**는 이 층이 보지 않는다 — 어떤 기사가 긍정인가는 실 모델의 판단이고 그
// 품질은 오프라인 골든 평가가 잰다(doc-tracker 「예외 후보 중 미등재」). 여기서 보는 것은
// 네 값이 열거형으로 온전히 살아 Silver 에 닿는가, 그리고 네 값이 실제로 모두 관측되는가다.

import { expect, test } from "@playwright/test";

import { MODEL_V1, cannedReply } from "../lib/llmdouble";
import { analyzedByTitle, analyzedTitled } from "../lib/silver";

const LABELS = ["positive", "neutral", "negative", "mixed"];

// 시나리오가 이름을 대어 요구하는 두 경계 사례(`fixtures/feeds/analysis_corpus.rss.xml`).
const OPPOSING_TONES = "US CPI 둔화에도 서비스 물가 반등 — 엇갈린 신호";
const NO_TONE = "전기요금 조정안 발표 예정";

test("analysis: each article's sentiment reaches Silver exactly as the model labelled it", () => {
  const joined = analyzedByTitle();
  for (const [title, { analysis }] of joined) {
    expect(analysis.sentiment, title).toBe(cannedReply(MODEL_V1, title).sentiment);
    // 분석된 레코드에 라벨이 비어 있으면 강제 채움이 아니라 누락이다(미분석은 시나리오 5 소관).
    expect(analysis.analysis_status, title).toBe("analyzed");
  }
});

test("analysis: all four sentiment classes are actually observed", () => {
  const observed = new Set(
    [...analyzedByTitle().values()].map(({ analysis }) => analysis.sentiment),
  );
  expect(observed).toEqual(new Set(LABELS));
});

test("analysis: opposing tones classify as mixed, an absent tone as neutral", () => {
  const joined = analyzedByTitle();
  expect(analyzedTitled(joined, OPPOSING_TONES).analysis.sentiment).toBe("mixed");
  expect(analyzedTitled(joined, NO_TONE).analysis.sentiment).toBe("neutral");
});
