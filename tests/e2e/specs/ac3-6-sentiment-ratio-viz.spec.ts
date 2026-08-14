// 검증 AC: AC3.6
//
// AC3.6 "분위기 비율 시각화" — docs/econ-opinion-monitor-prd-aggregation-viz.md
// 검증 방법(AC 본문): "분위기 비율 시각화가 집계값과 일치하는지 확인한다."
//
// 따라서 기대값을 상수로 박지 않는다. 같은 spec 안에서 서빙 API가 내려주는
// **집계값**을 먼저 읽고, 화면에 그려진 스택바의 실제 폭을 읽어 둘을 대조한다.
// 픽스처를 바꿔도 이 테스트는 여전히 옳고, 시각화가 집계에서 어긋나는 순간에만
// 깨진다.
//
// 비교는 구현 공식을 베끼지 않는 형태로 한다: 화면은 분위기 4분류를 "분석 완료분
// 기준"으로 스케일해 그리므로(화면 주석: "분위기 합은 분석 완료분 기준입니다")
// 폭의 절댓값은 집계값과 다르다. 대신 **4분류 사이의 비례**가 집계값의 비례와
// 같은지, 그리고 전체 바가 100%를 이루는지를 본다 — 스케일 상수를 몰라도 성립하는
// 성질이다.
//
// 단언하지 않는 것: 분위기 분포를 만들어내는 집계 로직 자체(AC3.4)와 미분석 분리
// 규칙의 정합성(AC3.4). 여기서 미분석 값은 스케일과 무관한 대조군으로만 쓴다.

import { expect, test } from "@playwright/test";

const SEGMENTS = [
  { cls: "s-pos", key: "positive", label: "긍정" },
  { cls: "s-neu", key: "neutral", label: "중립" },
  { cls: "s-neg", key: "negative", label: "부정" },
  { cls: "s-mix", key: "mixed", label: "혼합" },
] as const;

/** 스택바 세그먼트의 렌더된 폭(%)을 읽는다. */
async function renderedWidth(
  bar: import("@playwright/test").Locator,
  cls: string,
): Promise<number> {
  const raw = await bar.locator(`i.${cls}`).evaluate((el) => (el as HTMLElement).style.width);
  return Number.parseFloat(raw);
}

test("web: sentiment bar mirrors the aggregated distribution", async ({ page, request }) => {
  const api = await (await request.get("/api/dashboard?axis=KR")).json();
  const agg: Record<string, number> = api.sentiment;

  await page.goto("/");
  const bar = page.locator(".sentbar");
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

  // (1) 4분류의 상대 비율이 집계값의 상대 비율과 일치한다 — 스케일 상수와 무관.
  for (const seg of SEGMENTS) {
    expect(
      widths[seg.key] / renderedAnalyzed,
      `${seg.label} 세그먼트 비율이 집계값과 어긋남`,
    ).toBeCloseTo(agg[seg.key] / aggAnalyzed, 2);
  }

  // (2) 미분석은 스케일 대상이 아니므로 집계값이 그대로 폭이 된다.
  expect(unanalyzedWidth).toBeCloseTo(agg.unanalyzed * 100, 1);

  // (3) 바 전체가 100%를 채운다 — 분위기 비율이 미분석과 함께 하나의 전체를 이룬다.
  expect(renderedAnalyzed + unanalyzedWidth).toBeCloseTo(100, 1);
});

test("web: sentiment legend labels every class with its rendered share", async ({ page }) => {
  await page.goto("/");
  const bar = page.locator(".sentbar");
  const legend = page.locator(".legend").first();
  await expect(legend).toBeVisible();

  const legendText = (await legend.textContent()) ?? "";

  // 범례가 말하는 수치와 실제로 그려진 폭이 어긋나지 않는다. 범례는 정수로
  // 반올림해 표기하므로 폭과 1%p 이내면 같은 값을 말하는 것으로 본다 —
  // 문자열을 그대로 맞추면 두 번 반올림한 경계값에서 헛되이 깨진다.
  for (const seg of [...SEGMENTS, { cls: "s-na", key: "unanalyzed", label: "미분석" }]) {
    const width = await renderedWidth(bar, seg.cls);
    const shown = new RegExp(`${seg.label}\\s+(\\d+)%`).exec(legendText);
    expect(shown, `범례에 "${seg.label} N%" 항목이 없음 (범례: ${legendText})`).not.toBeNull();
    expect(
      Math.abs(Number(shown![1]) - width),
      `${seg.label} 범례 수치(${shown![1]}%)가 그려진 폭(${width}%)과 어긋남`,
    ).toBeLessThanOrEqual(1);
  }
});
