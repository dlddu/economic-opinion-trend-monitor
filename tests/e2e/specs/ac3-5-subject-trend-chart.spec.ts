// 검증 AC: AC3.5
//
// AC3.5 "서술 대상별 추세 시계열 시각화" — docs/econ-opinion-monitor-prd-aggregation-viz.md
// 검증 방법(AC 본문): "차트가 집계 데이터와 일치하고, 대상 선택·비교가 동작하는지 확인한다."
//
// 그 문장의 세 낱말을 그대로 나눠 단언한다.
//   1) **차트 ↔ 집계 일치** — 그려진 폴리라인의 점이 서빙 API가 내려준 시리즈의
//      점과 개수·위치 모두 대응한다. 특히 어떤 대상이 빠진 버킷은 **빈 채로**
//      남아야 한다. 결측을 앞으로 당기면 선은 그럴듯하지만 시점이 어긋난다.
//   2) **대상 선택** — 비교 목록에서 다른 대상을 고르면 강조 시리즈와 현재 점유율이
//      그 대상으로 바뀌고, 같은 선택을 API에 직접 물어봐도 같은 답이 온다.
//   3) **상위 대상 비교** — 둘 이상의 시리즈가 **하나의 공통 스케일** 위에 함께
//      그려진다. 시리즈마다 자기 최대값으로 정규화하면 겹쳐 놓아도 대조가 안 된다.
//
// 기대값은 상수로 박지 않는다(ac3-6·ac3-7·ac3-8이 세운 관례). 서빙 API가 내려주는
// 값을 먼저 읽고 화면과 대조하므로, 픽스처를 바꿔도 이 테스트는 여전히 옳고 화면이
// 집계에서 어긋나는 순간에만 깨진다. 공통 스케일 판정도 구현 공식을 베끼지 않는다 —
// share → y 가 **하나의 감소하는 1차식**인지만 본다(모든 점 쌍의 기울기가 같은가).
//
// 단언하지 않는 것: 시계열 버킷을 만들어내는 집계 로직(AC3.3)과 서술 대상 키 통합
// (AC3.2), 정규화 계산의 견고성(AC3.1). 이 하네스는 픽스처 Gold를 마운트하므로 집계
// 로직을 관측하지 못한다. 여기서 집계값은 화면이 따라야 할 기준으로만 쓴다.

import { expect, test } from "@playwright/test";

interface TrendPoint {
  time_bucket: string;
  normalized_share: number;
  raw_count: number;
}

interface TrendSeries {
  subject: string;
  selected: boolean;
  latest_share: number;
  delta: number;
  points: TrendPoint[];
}

interface TrendBody {
  axis: string;
  subject: string;
  basis: { bucket_unit: string; normalized: boolean; buckets: string[] };
  series: TrendSeries[];
}

/** 폴리라인의 `points` 속성을 좌표쌍으로 읽는다. */
async function polylinePoints(
  line: import("@playwright/test").Locator,
): Promise<{ x: number; y: number }[]> {
  const raw = (await line.getAttribute("points")) ?? "";
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
}

test("api: trend serves a real time series, not a single-bucket stub", async ({ request }) => {
  const res = await request.get("/api/trend?axis=KR");
  expect(res.status()).toBe(200);
  const body: TrendBody = await res.json();

  // (1) 시계열이려면 버킷이 둘 이상이어야 한다. 하나뿐이면 아래 단언이 전부 공허하다.
  expect(body.basis.buckets.length, "버킷이 하나뿐이면 '추세'가 아니다").toBeGreaterThan(1);
  expect(body.basis.bucket_unit).not.toBe("");
  expect(body.basis.normalized).toBe(true);

  // (2) 공통 x축은 정렬돼 있고 중복이 없다.
  expect([...body.basis.buckets].sort()).toEqual(body.basis.buckets);
  expect(new Set(body.basis.buckets).size).toBe(body.basis.buckets.length);

  // (3) 비교 대상이 함께 온다 — 한 대상만 오면 "상위 대상 비교"가 성립하지 않는다.
  expect(body.series.length).toBeGreaterThan(1);
  expect(body.series.filter((s) => s.selected)).toHaveLength(1);
  expect(body.subject).toBe(body.series.find((s) => s.selected)!.subject);

  // (4) 각 시리즈의 점은 버킷 순이고, 공통 x축 위의 버킷만 쓴다.
  for (const series of body.series) {
    expect(series.points.length, `${series.subject} 시리즈가 비어 있다`).toBeGreaterThan(0);
    const buckets = series.points.map((p) => p.time_bucket);
    expect(buckets, `${series.subject} 시리즈가 버킷 순이 아니다`).toEqual([...buckets].sort());
    for (const bucket of buckets) {
      expect(body.basis.buckets).toContain(bucket);
    }
    // 헤드라인 수치는 가장 최근 점에서 온다 — 차트와 옆의 지표가 다른 말을 하면 안 된다.
    expect(series.latest_share).toBeCloseTo(series.points[series.points.length - 1].normalized_share, 6);
  }
});

test("web: the chart plots the aggregated series on one shared scale", async ({ page, request }) => {
  const api: TrendBody = await (await request.get("/api/trend?axis=KR")).json();

  await page.goto("/trend");
  // 실화면이어야 아래 단언이 의미를 갖는다 — 스텁 응답을 덤프하던 플레이스홀더가
  // 아니라는 것부터 확인한다.
  await expect(page.getByText("플레이스홀더")).toHaveCount(0);
  await expect(page.getByText("The web build was not found")).toHaveCount(0);

  const lines = page.locator("polyline.tseries");
  await expect(lines).toHaveCount(api.series.length);

  // 공통 x축: 버킷 눈금이 API가 준 순서 그대로 있고, 모든 시리즈가 그 x좌표를 쓴다.
  const ticks = page.locator(".trend-x text");
  expect(
    await ticks.evaluateAll((els) => els.map((el) => el.getAttribute("data-bucket"))),
  ).toEqual(api.basis.buckets);
  const tickX = new Map(
    await ticks.evaluateAll((els) =>
      els.map((el) => [el.getAttribute("data-bucket")!, Number(el.getAttribute("x"))] as const),
    ),
  );

  const plotted: { share: number; y: number }[] = [];
  for (const series of api.series) {
    const line = page.locator(`polyline.tseries[data-subject="${series.subject}"]`);
    await expect(line, `${series.subject} 시리즈가 그려지지 않았다`).toHaveCount(1);
    const drawn = await polylinePoints(line);

    // 점 개수가 집계와 같다 = 없는 버킷을 메우지도, 있는 버킷을 빠뜨리지도 않았다.
    expect(drawn.length, `${series.subject} 점 개수가 집계와 다르다`).toBe(series.points.length);
    series.points.forEach((point, i) => {
      expect(drawn[i].x, `${series.subject} ${point.time_bucket} 점이 다른 시점에 찍혔다`).toBeCloseTo(
        tickX.get(point.time_bucket)!,
        3,
      );
      plotted.push({ share: point.normalized_share, y: drawn[i].y });
    });
  }

  // 공통 스케일: 모든 시리즈의 모든 점에서 share → y 가 같은 1차식이어야 한다.
  // 시리즈마다 자기 최대값으로 나눴다면 기울기가 갈려 여기서 깨진다.
  const distinct = new Set(plotted.map((p) => p.share));
  expect(distinct.size, "픽스처의 비율이 모두 같아 스케일 구분이 불가능하다").toBeGreaterThan(1);

  const slopes: number[] = [];
  for (let i = 0; i < plotted.length; i += 1) {
    for (let j = i + 1; j < plotted.length; j += 1) {
      if (plotted[i].share !== plotted[j].share) {
        slopes.push((plotted[i].y - plotted[j].y) / (plotted[i].share - plotted[j].share));
      }
    }
  }
  for (const slope of slopes) {
    expect(slope, "시리즈가 공통 스케일을 따르지 않는다").toBeCloseTo(slopes[0], 3);
  }
  expect(slopes[0], "비율이 클수록 위에 그려져야 한다").toBeLessThan(0);
});

test("web: picking another subject moves the focus, and the API agrees", async ({
  page,
  request,
}) => {
  const initial: TrendBody = await (await request.get("/api/trend?axis=KR")).json();
  const other = initial.series.find((s) => !s.selected)!;

  await page.goto("/trend");
  await expect(page.locator('polyline.tseries[data-selected="true"]')).toHaveAttribute(
    "data-subject",
    initial.subject,
  );

  await page.locator(`.trend-pick-item[data-subject="${other.subject}"]`).click();

  // 강조 시리즈가 고른 대상으로 옮겨 간다.
  await expect(page.locator('polyline.tseries[data-selected="true"]')).toHaveAttribute(
    "data-subject",
    other.subject,
  );
  await expect(page.locator(".trend-pick-item[data-selected='true']")).toHaveAttribute(
    "data-subject",
    other.subject,
  );

  // 같은 선택을 API에 직접 물어봐도 같은 답이 오고, 화면의 현재 점유율이 그 값이다.
  const picked: TrendBody = await (
    await request.get(`/api/trend?axis=KR&subject=${encodeURIComponent(other.subject)}`)
  ).json();
  expect(picked.subject).toBe(other.subject);
  const focused = picked.series.find((s) => s.selected)!;
  await expect(page.locator(".trend-metric .mv")).toHaveText(
    `${(focused.latest_share * 100).toFixed(1)}%`,
  );

  // 선택은 URL에 남는다 — 대시보드가 이 링크로 대상을 넘겨주기 때문이다.
  expect(new URL(page.url()).searchParams.get("subject")).toBe(other.subject);
});
