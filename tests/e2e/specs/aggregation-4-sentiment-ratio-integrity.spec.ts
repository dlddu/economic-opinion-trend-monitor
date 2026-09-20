// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 4
//
// 비율의 정합성은 두 가지를 함께 요구한다 — 네 분위기가 하나의 분포를 이루는가(합 1), 그리고 그
// 분포가 **무엇을 분모로 쓰는가**. 미분석을 분모에 섞으면 합은 1보다 작아지고, 반대로 미분석을
// 조용히 버리면 "얼마나 판단되지 않았는가"가 사라진다. 제품은 둘 다 피한다: 네 분위기는 분석된
// 건수 대비로 합이 1이 되고, 미분석은 **전체 대비 별도 항목**(`distribution.unanalyzed`)으로
// 남는다. 이 spec 이 그 두 성질을 각각 단정한다.
//
// **저신뢰의 자리를 밝혀 둔다**: 오늘 Gold 계약에는 저신뢰 축이 없어(`AxisSentiment` 는
// `unanalyzed` 만 싣는다) 저신뢰 레코드는 라벨을 유지한 채 분석분에 포함된다. 기대 결과의
// "분리되거나 별도 항목으로 표시"는 **미분석**에 대해 성립하며, 저신뢰가 표시되는 자리는
// Silver 의 `analysis_status` 다(`…-test-analysis.md#시나리오 5` 가 그쪽을 본다). 저신뢰를
// 집계에서도 가르는 것은 제품 계약의 변경이라 이 루프의 산출물 경계 밖이다.

import { expect, test } from "@playwright/test";

import { aggByTitle, aggItems, axisSentiments } from "../lib/gold";

const SENTIMENTS = ["positive", "neutral", "negative", "mixed"] as const;

/** 축 -> 그 축의 (Bronze 관측, Silver 분석) 목록. 기대값을 원천에서 다시 만든다. */
function byAxis(): Map<string, { status: string; sentiment: string | null }[]> {
  const joined = aggByTitle();
  const byRecord = new Map(
    [...joined.values()].map(({ item, analysis }) => [item.record_id, analysis]),
  );
  const grouped = new Map<string, { status: string; sentiment: string | null }[]>();
  for (const item of aggItems()) {
    const analysis = byRecord.get(item.record_id);
    if (!analysis) throw new Error(`Bronze 레코드 ${item.record_id} 의 Silver 분석이 없다`);
    const bucket = grouped.get(item.axis) ?? [];
    bucket.push({ status: analysis.analysis_status, sentiment: analysis.sentiment });
    grouped.set(item.axis, bucket);
  }
  return grouped;
}

test("aggregation: the corpus really mixes analyzed, low-confidence and unanalyzed items", () => {
  const statuses = [...byAxis().values()].flat().map((record) => record.status);

  // 사전 조건이 실제로 성립하는지 먼저 본다 — 섞이지 않은 corpus 위에서는 아래 단정들이
  // 통과하면서 시나리오가 요구한 상황을 한 번도 만들지 않는다.
  expect(statuses).toContain("analyzed");
  expect(statuses).toContain("low_confidence");
  expect(statuses).toContain("unanalyzed");
});

test("aggregation: the four sentiment shares form one distribution per axis", () => {
  for (const row of axisSentiments()) {
    if (row.analyzed_total === 0) continue; // 분석분이 없으면 분포 자체가 없다.
    const sum = SENTIMENTS.reduce((acc, key) => acc + row.distribution[key], 0);
    expect(sum, row.axis).toBeCloseTo(1, 3);
    for (const key of SENTIMENTS) {
      expect(row.distribution[key], `${row.axis}/${key}`).toBeGreaterThanOrEqual(0);
      expect(row.distribution[key], `${row.axis}/${key}`).toBeLessThanOrEqual(1);
    }
  }
});

test("aggregation: each sentiment share equals an independent recount over analyzed items", () => {
  const grouped = byAxis();

  for (const row of axisSentiments()) {
    const records = grouped.get(row.axis);
    expect(records, row.axis).toBeDefined();
    const analyzed = records!.filter((record) => record.status !== "unanalyzed");
    expect(row.analyzed_total, row.axis).toBe(analyzed.length);

    for (const key of SENTIMENTS) {
      const n = analyzed.filter((record) => record.sentiment === key).length;
      expect(row.distribution[key], `${row.axis}/${key}`).toBeCloseTo(
        analyzed.length === 0 ? 0 : n / analyzed.length,
        3,
      );
    }
  }
});

test("aggregation: unanalyzed items are kept out of the ratios and reported separately", () => {
  const grouped = byAxis();
  const withUnanalyzed = [...grouped.entries()].filter(([, records]) =>
    records.some((record) => record.status === "unanalyzed"),
  );
  // 미분석이 하나도 없으면 "분리"가 관측되지 않는다.
  expect(withUnanalyzed.length).toBeGreaterThan(0);

  for (const [axis, records] of withUnanalyzed) {
    const row = axisSentiments().find((candidate) => candidate.axis === axis);
    expect(row, axis).toBeDefined();
    const unanalyzed = records.filter((record) => record.status === "unanalyzed").length;

    // ⑴ 분모에서 빠진다.
    expect(row!.analyzed_total, axis).toBe(records.length - unanalyzed);
    expect(row!.analyzed_total, axis).toBeLessThan(records.length);
    // ⑵ 사라지지 않고 전체 대비 별도 항목으로 실린다.
    expect(row!.distribution.unanalyzed, axis).toBeCloseTo(unanalyzed / records.length, 3);
    expect(row!.distribution.unanalyzed, axis).toBeGreaterThan(0);
  }
});

test("aggregation: a low-confidence item keeps its label inside the analyzed ratios", () => {
  const grouped = byAxis();
  const entries = [...grouped.entries()].filter(([, records]) =>
    records.some((record) => record.status === "low_confidence"),
  );
  expect(entries.length).toBeGreaterThan(0);

  for (const [axis, records] of entries) {
    const row = axisSentiments().find((candidate) => candidate.axis === axis);
    expect(row, axis).toBeDefined();
    // 저신뢰는 미분석이 아니다 — 라벨이 있으므로 분석분에 들어가고, 그 사실이 비율에 보인다.
    const low = records.filter((record) => record.status === "low_confidence");
    for (const record of low) {
      expect(record.sentiment, axis).not.toBeNull();
      expect(row!.distribution[record.sentiment as (typeof SENTIMENTS)[number]], axis).toBeGreaterThan(0);
    }
  }
});
