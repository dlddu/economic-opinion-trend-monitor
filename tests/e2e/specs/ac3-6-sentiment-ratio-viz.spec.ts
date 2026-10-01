// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 6
//
// 기대값을 상수로 박지 않는다. 같은 spec 안에서 서빙 API가 내려주는
// **집계값**을 먼저 읽고, 화면에 그려진 스택바의 실제 폭을 읽어 둘을 대조한다.
// 픽스처를 바꿔도 이 테스트는 여전히 옳고, 시각화가 집계에서 어긋나는 순간에만
// 깨진다.
//
// 비교는 구현 공식을 베끼지 않는 형태로 한다: 화면은 분위기 4분류를 분석 완료분
// 기준으로 스케일해 그리므로 폭의 절댓값은 집계값과 다르다. 대신 **4분류 사이의
// 비례**가 집계값의 비례와 같은지, 그리고 전체 바가 100%를 이루는지를 본다 —
// 스케일 상수를 몰라도 성립하는 성질이다.
//
// 단언하지 않는 것: 분위기 분포를 만들어내는 집계 로직 자체와 미분석 분리 규칙의 정합성
// (aggregation-4 · analysis-5 의 몫). 여기서 미분석 값은 스케일과 무관한 대조군으로만 쓴다.

import { expect, test } from "@playwright/test";

const SEGMENTS = [
  { cls: "s-pos", key: "positive", label: "긍정" },
  { cls: "s-neu", key: "neutral", label: "중립" },
  { cls: "s-neg", key: "negative", label: "부정" },
  { cls: "s-mix", key: "mixed", label: "혼합" },
] as const;

async function renderedWidth(
  bar: import("@playwright/test").Locator,
  cls: string,
): Promise<number> {
  const raw = await bar.locator(`i.${cls}`).evaluate((el) => (el as HTMLElement).style.width);
  return Number.parseFloat(raw);
}

async function krDistribution(
  request: import("@playwright/test").APIRequestContext,
): Promise<Record<string, number>> {
  const api = await (await request.get("/api/sentiment?axis=KR")).json();
  const row = api.by_axis.find((r: { axis: string }) => r.axis === "KR");
  expect(row?.present, "KR 축 분위기 집계가 응답에 없음").toBe(true);
  return row.distribution;
}

test("web: sentiment bar mirrors the aggregated distribution", async ({ page, request }) => {
  const agg = await krDistribution(request);

  await page.goto("/sentiment");
  const bar = page.locator('.sent-axisrow[data-axis="KR"] .sentbar');
  await expect(bar).toBeVisible();

  const widths: Record<string, number> = {};
  for (const seg of SEGMENTS) {
    widths[seg.key] = await renderedWidth(bar, seg.cls);
  }
  const unanalyzedWidth = await renderedWidth(bar, "s-na");

  const renderedAnalyzed = SEGMENTS.reduce((sum, s) => sum + widths[s.key], 0);
  const aggAnalyzed = SEGMENTS.reduce((sum, s) => sum + agg[s.key], 0);
  expect(renderedAnalyzed).toBeGreaterThan(0);
  expect(aggAnalyzed).toBeGreaterThan(0);

  for (const seg of SEGMENTS) {
    expect(
      widths[seg.key] / renderedAnalyzed,
      `${seg.label} 세그먼트 비율이 집계값과 어긋남`,
    ).toBeCloseTo(agg[seg.key] / aggAnalyzed, 2);
  }

  // 미분석은 스케일 대상이 아니므로 집계값이 그대로 폭이 된다.
  expect(unanalyzedWidth).toBeCloseTo(agg.unanalyzed * 100, 1);

  expect(renderedAnalyzed + unanalyzedWidth).toBeCloseTo(100, 1);
});

test("web: sentiment figures label every class with its aggregated share", async ({
  page,
  request,
}) => {
  const agg = await krDistribution(request);

  await page.goto("/sentiment");
  const kv = page.locator(".sent-donut-kv");
  await expect(kv).toBeVisible();

  // 도넛 옆 수치는 분석 완료분 기준 비율이고, 미분석은 전체 대비로 따로 적힌다 —
  // 두 기준이 섞이지 않았는지까지 집계값과 대조한다.
  for (const seg of SEGMENTS) {
    const shown = kv.locator(`.v[data-cls="${seg.cls}"]`);
    await expect(shown, `${seg.label} 수치가 집계값과 어긋남`).toHaveText(
      `${(agg[seg.key] * 100).toFixed(1)}%`,
    );
  }
  // `.sent-na` 의 첫 <b> 가 미분석 비율이다(둘째 <b> 는 해설 문구 「분석 완료분」).
  await expect(page.locator(".sent-na b").first()).toHaveText(
    `${(agg.unanalyzed * 100).toFixed(1)}%`,
  );
});
