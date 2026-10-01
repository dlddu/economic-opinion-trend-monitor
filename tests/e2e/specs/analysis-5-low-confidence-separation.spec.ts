// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 5
//
// 기대 결과의 뒤 절이 집계를 요구하므로 이 시나리오도 집계 묶음에서 닫힌다.
//
// 두 사전 조건은 **서로 다른 경로로** 같은 상태에 도달한다. 본문이 없는 관측은 모델을 부르지도
// 않고(`analyze_llm` 이 body 없으면 즉시 반환), 모호한 기사는 모델이 답하되 판단을 유보한다
// (`analyzable: false`). 둘을 한 기사로 겸하면 "미분석이 두 경로 모두에서 나온다"가 관측되지
// 않으므로 픽스처에서 갈라 두었다.
//
// **경계 하나를 명시한다**: 오늘 Gold 계약에는 저신뢰 축이 없다(`AxisSentiment.distribution` 은
// `unanalyzed` 만 별도 항목으로 싣는다). 그래서 "집계에서 구분된다"는 **미분석**에 대해 단정하고,
// 저신뢰는 Silver 의 `analysis_status` 와 분석 Job 의 집계에서 "표시된다"를 단정한다. 저신뢰를
// 집계에서도 가르려면 Gold 계약(`contracts/`)부터 바뀌어야 한다.

import { expect, test } from "@playwright/test";

import { CELL_SEP, aggByTitle, aggItems, axisSentiments, crossTab } from "../lib/gold";
import { MODEL_AGG, cannedReply } from "../lib/llmdouble";
import { analysisSummary, analyzedTitled } from "../lib/silver";

/** 본문이 잡히지 않은 관측 — `<description>` 이 없는 기사(`fixtures/feeds/agg_kr_wire.rss.xml`). */
const NO_BODY = "본문 없는 속보";
const AMBIGUOUS = "해석이 엇갈리는 지표 발표";
const LOW_CONFIDENCE = "US jobs data beats expectations";

const AGG_JOB = "econ-e2e-analyze-agg";

test("analysis: an article with no body is left unanalyzed instead of force-filled", () => {
  const { item, analysis } = analyzedTitled(aggByTitle(), NO_BODY);

  expect(item.body_available).toBe(false);
  expect(analysis.analysis_status).toBe("unanalyzed");
  expect(analysis.sentiment).toBeNull();
  expect(analysis.target_countries).toEqual([]);
  expect(analysis.narrative_subjects).toEqual([]);
});

test("analysis: an article the model declines to judge is unanalyzed, not a forced label", () => {
  const { item, analysis } = analyzedTitled(aggByTitle(), AMBIGUOUS);

  // 본문은 있다 — 미분석의 원인이 수집 결손이 아니라 모델의 판단 유보임을 가른다.
  expect(item.body_available).toBe(true);
  expect(cannedReply(MODEL_AGG, AMBIGUOUS).analyzable).toBe(false);
  expect(analysis.analysis_status).toBe("unanalyzed");
  expect(analysis.sentiment).toBeNull();
});

test("analysis: a low-confidence reply keeps its label and is marked, not dropped", () => {
  const { analysis } = analyzedTitled(aggByTitle(), LOW_CONFIDENCE);
  const canned = cannedReply(MODEL_AGG, LOW_CONFIDENCE);

  // 픽스처가 임계 아래이기를 먼저 확인한다(픽스처가 낡으면 이 단정은 헛돈다).
  expect(canned.confidence).toBeLessThan(0.6);
  expect(analysis.analysis_status).toBe("low_confidence");
  expect(analysis.sentiment).toBe(canned.sentiment);
  expect(analysis.confidence).toBeCloseTo(canned.confidence, 6);
});

test("analysis: the batch counts both markers instead of hiding them in the records", () => {
  const summary = analysisSummary(AGG_JOB);
  const records = [...aggByTitle().values()].map(({ analysis }) => analysis);

  const unanalyzed = records.filter((a) => a.analysis_status === "unanalyzed").length;
  const low = records.filter((a) => a.analysis_status === "low_confidence").length;

  expect(summary.unanalyzed).toBe(unanalyzed);
  expect(summary.lowConfidence).toBe(low);
  // 두 표시가 실제로 관측된다 — 0이면 픽스처가 사전 조건을 더 이상 만들지 않는 것이다.
  expect(unanalyzed).toBeGreaterThanOrEqual(2);
  expect(low).toBeGreaterThanOrEqual(1);
  // 본문 없는 기사는 모델까지 가지 않는다: 시도 건수는 본문이 있는 관측 수와 같고, 실패는 0이다
  // (실패로 인한 미분석이 섞이면 "모델이 유보했다"와 구별되지 않는다).
  expect(summary.attempted).toBe(aggItems().filter((item) => item.body_available).length);
  expect(summary.failed).toBe(0);
});

test("analysis: aggregation separates the unanalyzed from the analyzed items", () => {
  const items = aggItems();
  const joined = aggByTitle();
  const byRecord = new Map(
    [...joined.values()].map(({ item, analysis }) => [item.record_id, analysis]),
  );

  for (const row of axisSentiments()) {
    const inAxis = items.filter((item) => item.axis === row.axis);
    const unanalyzed = inAxis.filter(
      (item) => byRecord.get(item.record_id)?.analysis_status === "unanalyzed",
    );

    expect(row.analyzed_total, row.axis).toBe(inAxis.length - unanalyzed.length);
    expect(row.distribution.unanalyzed, row.axis).toBeCloseTo(unanalyzed.length / inAxis.length, 3);
  }

  // 미분석은 서술 대상 집계에도 끼어들지 않는다. 축의 교차표 총합은 **분석된 기사가 단
  // 서술 대상 수**와 같아야 한다 — 미분석이 한 건이라도 세어졌다면 총합이 그만큼 커진다.
  const counts = crossTab();
  for (const title of [NO_BODY, AMBIGUOUS]) {
    const { item } = analyzedTitled(joined, title);
    const mentionsInAxis = items
      .filter((other) => other.axis === item.axis)
      .reduce((sum, other) => sum + (byRecord.get(other.record_id)?.narrative_subjects.length ?? 0), 0);
    // 두 합의 기준은 **축**이다. 왼쪽(`mentionsInAxis`)이 축 전체 합이므로 오른쪽도 축 전체
    // 합이어야 대조가 성립한다 — 셀을 (축, 버킷)으로 더 자르면 "축의 모든 관측이 한 버킷을
    // 공유한다"를 암묵 전제로 깔고, 그 전제가 깨지는 순간 미분석 누수와 무관하게 0이 된다.
    // 축 경계는 구분자까지 붙여 정확히 끊는다(맨 `startsWith(axis)` 는 축 이름이 다른 축의
    // 접두사일 때 옆 축을 끌어온다).
    const tabulated = [...counts.entries()]
      .filter(([key]) => key.startsWith(`${item.axis}${CELL_SEP}`))
      .reduce((sum, [, n]) => sum + n, 0);
    expect(tabulated, title).toBe(mentionsInAxis);
    expect(byRecord.get(item.record_id)?.narrative_subjects, title).toEqual([]);
  }
});

test("analysis: the unanalyzed items do not dilute the sentiment ratios", () => {
  const items = aggItems();
  const joined = aggByTitle();
  const byRecord = new Map(
    [...joined.values()].map(({ item, analysis }) => [item.record_id, analysis]),
  );

  // 미분석이 섞인 축을 고른다 — 그 축에서만 "분모가 전체인가 분석분인가"가 갈린다.
  const rows = axisSentiments().filter((row) => row.distribution.unanalyzed > 0);
  expect(rows.length).toBeGreaterThan(0);

  for (const row of rows) {
    const inAxis = items.filter((item) => item.axis === row.axis);
    const analyzed = inAxis.filter(
      (item) => byRecord.get(item.record_id)?.analysis_status !== "unanalyzed",
    );
    const positives = analyzed.filter(
      (item) => byRecord.get(item.record_id)?.sentiment === "positive",
    ).length;

    expect(row.distribution.positive, row.axis).toBeCloseTo(positives / analyzed.length, 3);
    // 분자가 0이면 두 분모가 같은 0을 주므로 가르지 못한다 — 그때는 이 대조를 건너뛴다.
    if (positives > 0) {
      expect(row.distribution.positive, row.axis).not.toBeCloseTo(positives / inAxis.length, 3);
    }
  }
});
