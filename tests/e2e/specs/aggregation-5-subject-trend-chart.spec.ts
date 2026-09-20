// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 5
//
// 기대 결과의 세 절을 각각 한 테스트로 단언한다.
//   (1) 차트 값 ↔ 집계   — 그려진 점의 높이가 `/api/trend` 가 내려준 정규화 점유율과
//                          하나의 선형 스케일로 대응한다.
//   (2) 상위 대상 비교   — 비교 표가 같은 응답의 순위·값을 그대로 말한다.
//   (3) 대상 선택        — 표의 다른 행을 고르면 선택이 API 를 거쳐 되돌아와 차트의
//                          강조와 헤드라인 지표가 그 대상으로 옮겨간다.
//
// 기대값을 상수로 박지 않는다. 픽스처 Gold 를 그대로 베끼면 픽스처가 바뀔 때마다
// 테스트가 헛되이 깨지고, 반대로 화면이 집계에서 어긋나도 잡지 못한다. 그래서 같은
// spec 안에서 서빙 API 를 먼저 읽고 화면이 그린 것과 대조한다.
//
// 비교는 **구현 공식을 베끼지 않는 형태**로 한다. 화면은 점유율을 자기 뷰박스 좌표로
// 옮겨 그리므로 y 의 절댓값은 집계값과 무관한 수다. 대신 "0선에서 잰 높이 ÷ 점유율"
// 이 모든 계열·모든 점에서 같은 상수인지를 본다 — 스케일 상수와 도면 크기를 몰라도
// 성립하는 성질이고, 어느 한 점이 다른 값으로 그려지는 순간에만 깨진다.
//
// 단언하지 않는 것:
//   - 정규화·집계 로직 자체(AC3.1/3.2). 이 하네스는 픽스처 Gold 를 마운트하므로
//     집계 계산을 관측하지 못한다. 그 층은 aggregation-1·2·4 가 파이프라인 산출
//     Gold 로 본다.
//   - **다중 시간 버킷 위의 x축 렌더**. 공유 픽스처 Gold 는 `tests/e2e/fixtures/README.md`
//     의 명시적 관례대로 모든 레코드가 같은 `time_bucket` 이라(대시보드 spec 들이 같은
//     픽스처를 쓰므로 묵은 버킷을 넣지 않는다), 이 spec 이 관측하는 시계열은 버킷 1개다.
//     "같은 버킷은 어느 계열에서도 같은 x" 단언은 버킷이 늘어나는 날 그대로 살아나도록
//     버킷 수에 독립적으로 썼다. 다중 버킷 관측은 전용 서빙 인스턴스가 필요한 별도
//     슬라이스다(doc-tracker 「공백 해소 경로」).
//   - 일·주 롤업 합산(시나리오 3). 집계가 `hour` 버킷만 산출해 관측 대상이 없고,
//     doc-tracker 의 구현 대기 표에 등재돼 있다.

import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";

type TrendPoint = {
  time_bucket: string;
  normalized_share: number;
  raw_count: number;
};

type TrendSeries = {
  subject: string;
  selected: boolean;
  latest_share: number;
  delta: number;
  points: TrendPoint[];
};

type TrendBody = {
  axis: string;
  subject: string;
  basis: {
    bucket_unit: string;
    first_bucket: string;
    latest_bucket: string;
    buckets: string[];
    normalized: boolean;
  };
  series: TrendSeries[];
};

/** 화면이 기본으로 여는 축. `/trend` 는 KR 로 시작하므로 API 도 같은 축으로 묻는다. */
const AXIS = "KR";

async function fetchTrend(request: APIRequestContext, subject?: string): Promise<TrendBody> {
  const query = subject ? `&subject=${encodeURIComponent(subject)}` : "";
  const res = await request.get(`/api/trend?axis=${AXIS}${query}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as TrendBody;
}

/** `points="x,y x,y …"` 를 좌표 목록으로. */
function parsePoints(raw: string): { x: number; y: number }[] {
  return raw
    .trim()
    .split(/\s+/)
    .filter((pair) => pair.length > 0)
    .map((pair) => {
      const [x, y] = pair.split(",");
      return { x: Number(x), y: Number(y) };
    });
}

/** 0% 격자선의 y. 높이는 여기서 재야 "값 0 = 바닥"이 성립한다. */
async function baselineY(page: Page): Promise<number> {
  const zero = page.locator(".trend-chart .gridline.zero");
  await expect(zero).toHaveCount(1);
  return Number(await zero.getAttribute("y1"));
}

function pctText(share: number): string {
  return `${(share * 100).toFixed(1)}%`;
}

/** 비교 표의 `구간 평균` — 그려진 구간의 버킷 값 평균(화면과 같은 계산·같은 순서). */
function windowMean(series: TrendSeries): number {
  if (series.points.length === 0) return 0;
  return series.points.reduce((sum, p) => sum + p.normalized_share, 0) / series.points.length;
}

function deltaText(delta: number): string {
  if (delta > 0) return `▲ ${delta.toFixed(1)}%p`;
  if (delta < 0) return `▼ ${Math.abs(delta).toFixed(1)}%p`;
  return "–";
}

test("web: every drawn point sits at its aggregated share on one shared scale", async ({
  page,
  request,
}) => {
  const api = await fetchTrend(request);
  expect(api.basis.normalized, "추세가 정규화 비율로 그려진다는 사실이 응답에 없다").toBe(true);
  expect(api.series.length, "그릴 계열이 없다").toBeGreaterThan(0);

  // 점유율이 전부 같으면 "높이 ↔ 값" 대응은 아무것도 증명하지 못한다 — 먼저 막는다.
  const shares = api.series.flatMap((s) => s.points.map((p) => p.normalized_share));
  expect(
    new Set(shares).size,
    "모든 점의 점유율이 같아 스케일 대응을 검증할 수 없다",
  ).toBeGreaterThan(1);

  await page.goto("/trend");
  const chart = page.locator(".trend-chart");
  await expect(chart).toBeVisible();

  const polylines = chart.locator("polyline");
  // 겹쳐 보기는 목업 `STP-drill-trend` 대로 opt-in 이다 — 진입 직후에는 고른 대상
  // 하나만 그려져 있어야 한다. 이 줄이 빠지면 "언제나 겹쳐 그린다"로 되돌아가도
  // 아래 단언들이 그대로 통과한다.
  await expect(polylines, "진입 직후에 고른 대상 말고 다른 선이 그려졌다").toHaveCount(1);

  const overlay = page.locator("input[name='tr-compare']");
  await expect(overlay).not.toBeChecked();
  await overlay.check();

  await expect(polylines, "그려진 선 수가 응답의 계열 수와 다름").toHaveCount(api.series.length);

  const baseline = await baselineY(page);
  const xOfBucket = new Map<string, number>();
  let scale: number | null = null;

  for (const [i, series] of api.series.entries()) {
    const coords = parsePoints((await polylines.nth(i).getAttribute("points")) ?? "");
    // 선은 basis 의 버킷 목록 위에 그려지므로, 그 목록에 없는 점은 그려지지 않는다.
    const drawn = series.points.filter((p) => api.basis.buckets.includes(p.time_bucket));
    expect(coords.length, `"${series.subject}" 선의 점 개수가 집계 점 개수와 다름`).toBe(
      drawn.length,
    );

    for (const [j, point] of drawn.entries()) {
      const { x, y } = coords[j];

      // (a) 한 x축: 같은 버킷은 어느 계열에서도 같은 x 에 놓인다. 계열마다 자기 점을
      //     왼쪽부터 채우면 같은 눈금 아래 다른 시각이 그려지는데, 그 순간 깨진다.
      const seen = xOfBucket.get(point.time_bucket);
      if (seen === undefined) {
        xOfBucket.set(point.time_bucket, x);
      } else {
        expect(x, `${point.time_bucket} 가 계열마다 다른 x 에 그려짐`).toBeCloseTo(seen, 3);
      }

      // (b) 값 대응: 0선에서 잰 높이가 점유율에 비례한다. 비례상수는 한 점에서 얻어
      //     나머지 전부에 요구하므로 화면의 스케일 계산식을 알 필요가 없다.
      const height = baseline - y;
      if (point.normalized_share === 0) {
        expect(height, "점유율 0 인 점이 0선 위에 있지 않음").toBeCloseTo(0, 3);
        continue;
      }
      expect(height, `"${series.subject}" 의 점이 0선 위로 올라오지 않음`).toBeGreaterThan(0);
      const k = height / point.normalized_share;
      if (scale === null) {
        scale = k;
      } else {
        expect(
          k / scale,
          `"${series.subject}" @ ${point.time_bucket} 이 다른 점과 다른 스케일로 그려짐`,
        ).toBeCloseTo(1, 3);
      }
    }
  }

  expect(scale, "그려진 점이 하나도 없어 값 대응을 검증하지 못했다").not.toBeNull();
});

test("web: the comparison table repeats the API ranking, value for value", async ({
  page,
  request,
}) => {
  const api = await fetchTrend(request);

  // 비교는 순서가 본체다. 먼저 응답 자체가 현재 점유율 내림차순인지 보고,
  // 그 다음 화면이 그 순서를 그대로 말하는지 본다.
  const shares = api.series.map((s) => s.latest_share);
  expect([...shares].sort((a, b) => b - a), "응답이 현재 점유율 내림차순이 아니다").toEqual(shares);
  expect(api.series.length, "비교할 대상이 하나뿐이라 비교가 성립하지 않는다").toBeGreaterThan(1);

  await page.goto("/trend");
  const rows = page.locator(".trend-cmp tbody tr");
  await expect(rows, "비교 표의 행 수가 응답의 계열 수와 다름").toHaveCount(api.series.length);

  for (const [i, series] of api.series.entries()) {
    const cells = rows.nth(i).locator("td");
    await expect(cells.nth(0), `${i + 1}행 대상이 집계 순위와 다름`).toContainText(series.subject);
    await expect(cells.nth(1), `"${series.subject}" 현재 점유율이 집계와 다름`).toHaveText(
      pctText(series.latest_share),
    );
    // 구간 평균은 화면이 `points[]` 에서 계산하는 값이라 응답에 그 수가 따로 없다. 같은
    // 응답에서 같은 방식으로 다시 계산해 대조한다 — 공유 픽스처 Gold 는 버킷이 1개라
    // 여기서는 평균과 최신값이 같은 수이고(그 구분은 `Trend.test.tsx` 가 3버킷으로 진다),
    // 이 단언이 지키는 것은 **컬럼 자리와 값의 대응**이다.
    await expect(cells.nth(2), `"${series.subject}" 구간 평균이 집계와 다름`).toHaveText(
      pctText(windowMean(series)),
    );
    await expect(cells.nth(3), `"${series.subject}" 직전 대비 변화가 집계와 다름`).toHaveText(
      deltaText(series.delta),
    );
  }

  // 지금 어느 대상을 보고 있는지가 표에서 정확히 한 행으로 드러난다.
  const selected = api.series.find((s) => s.selected);
  expect(selected, "응답이 선택된 계열을 표시하지 않는다").toBeTruthy();
  const selectedRow = page.locator('.trend-cmp tbody tr[aria-selected="true"]');
  await expect(selectedRow).toHaveCount(1);
  await expect(selectedRow).toContainText(selected!.subject);

  // 표는 겹쳐 보기와 무관하게 전건이다(이 화면에서 표가 곧 대상 선택기다). 그래서
  // 겹쳐 보기가 꺼진 상태의 범례는 그려진 선 하나만 말하고, 켜야 표와 같은 묶음이 된다 —
  // 그 상태에서 둘이 갈리면 표와 차트가 서로 다른 집합을 가리키는 것이다.
  const legend = page.locator(".trend-legend > span");
  await expect(legend, "겹쳐 보기가 꺼졌는데 범례가 그리지 않은 대상을 말한다").toHaveCount(1);
  await expect(legend).toContainText(selected!.subject);

  await page.locator("input[name='tr-compare']").check();
  await expect(legend).toHaveCount(api.series.length);
  for (const series of api.series) {
    await expect(page.locator(".trend-legend")).toContainText(series.subject);
  }
});

test("web: picking another subject moves the highlight through the API", async ({
  page,
  request,
}) => {
  const initial = await fetchTrend(request);
  const firstIndex = initial.series.findIndex((s) => s.selected);
  const otherIndex = initial.series.findIndex((s) => !s.selected);
  expect(firstIndex, "처음 선택된 계열이 없다").toBeGreaterThanOrEqual(0);
  expect(otherIndex, "선택을 바꿔 볼 다른 대상이 없다").toBeGreaterThanOrEqual(0);
  const other = initial.series[otherIndex];

  await page.goto("/trend");
  const rows = page.locator(".trend-cmp tbody tr");
  await expect(rows).toHaveCount(initial.series.length);
  await expect(page.locator('.trend-cmp tbody tr[aria-selected="true"]')).toContainText(
    initial.series[firstIndex].subject,
  );

  // 행 클릭이 곧 대상 선택이다(별도 picker 가 없다).
  await rows.nth(otherIndex).click();

  // 선택은 화면 안에서만 도는 상태가 아니다: 같은 대상을 `?subject=` 로 물은 응답이
  // 그 대상을 선택된 계열로 돌려주고, 화면은 그 응답의 값을 말해야 한다.
  const picked = await fetchTrend(request, other.subject);
  expect(picked.subject).toBe(other.subject);
  const pickedSeries = picked.series.find((s) => s.selected);
  expect(pickedSeries, "subject 를 지정한 응답에 선택된 계열이 없다").toBeTruthy();
  expect(pickedSeries!.subject).toBe(other.subject);

  const selectedRow = page.locator('.trend-cmp tbody tr[aria-selected="true"]');
  await expect(selectedRow).toHaveCount(1);
  await expect(selectedRow, "선택이 클릭한 행으로 옮겨가지 않았다").toContainText(other.subject);

  // 헤드라인 지표와 범례가 새 대상을 말한다. 겹쳐 보기가 꺼진 상태이므로 범례는
  // 그려진 그 대상 하나만 이름 붙인다 — 차트와 범례가 서로 다른 집합을 가리키면
  // 여기서 깨진다.
  await expect(page.locator(".trend-side .metric .mv")).toHaveText(
    new RegExp(`^\\s*${(pickedSeries!.latest_share * 100).toFixed(1)}\\s*%\\s*$`),
  );
  const legendNames = page.locator(".trend-legend > span");
  await expect(legendNames).toHaveCount(1);
  await expect(legendNames).toContainText(other.subject);

  // 차트의 강조(끝점 마커)도 그 대상의 선 위로 옮겨간다 — 표만 바뀌고 차트가 남의
  // 대상을 강조하고 있으면 여기서 깨진다. 겹쳐 보기가 꺼져 있으니 그려진 선은
  // 고른 대상의 것 하나뿐이다.
  const marker = page.locator(".trend-chart circle");
  await expect(marker).toHaveCount(1);
  const lines = page.locator(".trend-chart polyline");
  await expect(lines, "겹쳐 보기를 켜지 않았는데 선이 여럿 그려졌다").toHaveCount(1);
  const coords = parsePoints((await lines.first().getAttribute("points")) ?? "");
  expect(coords.length, "선택된 계열에 그려진 점이 없다").toBeGreaterThan(0);
  const last = coords[coords.length - 1];
  expect(Number(await marker.getAttribute("cx"))).toBeCloseTo(last.x, 3);
  expect(Number(await marker.getAttribute("cy"))).toBeCloseTo(last.y, 3);
});
