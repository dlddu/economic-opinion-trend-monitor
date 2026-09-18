// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 7
//
// AC3.7 "3축 비교 뷰" — docs/econ-opinion-monitor-prd-aggregation-viz.md
// 검증 방법(AC 본문): "동일 시점·기준에서 3개 축이 정렬되어 비교 가능한지 확인한다."
//
// 그 문장의 세 낱말을 그대로 나눠 단언한다.
//   1) **3개 축** — KR·US·GLOBAL 컬럼이 고정된 순서로 나란히 존재한다.
//   2) **동일 시점** — 세 컬럼이 하나의 time bucket 위에서 비교되고, 그 시점이
//      화면에 드러난다. 기준이 화면에 없으면 "같은 시점 비교"는 주장일 뿐 관측이
//      아니다.
//   3) **비교 가능** — 비율 막대가 축마다 자기 컬럼 최대값으로 정규화되지 않고
//      **세 축 공통 스케일** 하나로 그려진다. 컬럼 안에서만 옳은 그림은 나란히
//      놓아도 대조가 안 된다.
//
// 기대값은 상수로 박지 않는다(ac3-6·ac3-8이 세운 관례). 서빙 API가 내려주는 값을
// 먼저 읽고 화면과 대조하므로, 픽스처를 바꿔도 이 테스트는 여전히 옳고 화면이
// 집계에서 어긋나는 순간에만 깨진다.
//
// 단언하지 않는 것: 축별 집계값 자체의 정확성(AC3.2·AC3.4)과 정규화 계산의
// 견고성(AC3.1). 이 하네스는 픽스처 Gold를 마운트하므로 집계 로직을 관측하지
// 못한다. 여기서 집계값은 화면이 따라야 할 기준으로만 쓴다.

import { expect, test } from "@playwright/test";

const AXES = ["KR", "US", "GLOBAL"] as const;

interface RankRow {
  rank: number;
  subject: string;
  normalized_share: number;
  raw_count: number;
}

interface AxisColumn {
  axis: string;
  top_subjects: RankRow[];
  sentiment: Record<string, number>;
}

interface CompareBody {
  basis: { time_bucket: string; bucket_unit: string; normalized: boolean };
  axes: AxisColumn[];
}

/** 렌더된 비율 막대의 폭(%)을 읽는다. */
async function barWidth(row: import("@playwright/test").Locator): Promise<number> {
  const raw = await row.locator(".bar i").evaluate((el) => (el as HTMLElement).style.width);
  return Number.parseFloat(raw);
}

test("api: compare aligns all three axes on one basis", async ({ request }) => {
  const res = await request.get("/api/compare");
  expect(res.status()).toBe(200);
  const body: CompareBody = await res.json();

  // (1) 비교 기준이 응답에 명시된다 — 암묵이 아니라 계약이다.
  expect(body.basis.time_bucket).not.toBe("");
  expect(body.basis.bucket_unit).not.toBe("");
  expect(body.basis.normalized).toBe(true);

  // (2) 3개 축이 고정 순서로 온다.
  expect(body.axes.map((c) => c.axis)).toEqual([...AXES]);

  // (3) 픽스처가 세 축 모두 채우고 있어야 "나란히 비교"가 공허하지 않다.
  for (const col of body.axes) {
    expect(col.top_subjects.length, `${col.axis} 축에 상위 대상이 없다`).toBeGreaterThan(0);
    const sentimentTotal = Object.values(col.sentiment).reduce((sum, v) => sum + v, 0);
    expect(sentimentTotal, `${col.axis} 축에 분위기 집계가 없다`).toBeGreaterThan(0);
  }
});

test("web: the three axis columns render side by side on the API's basis", async ({
  page,
  request,
}) => {
  const api: CompareBody = await (await request.get("/api/compare")).json();

  await page.goto("/compare");
  // 실화면이어야 아래 단언이 의미를 갖는다 — 스텁 응답을 덤프하던 플레이스홀더가
  // 아니라는 것부터 확인한다.
  await expect(page.getByText("플레이스홀더")).toHaveCount(0);
  await expect(page.getByText("The web build was not found")).toHaveCount(0);

  const columns = page.locator(".cmpcol");
  await expect(columns).toHaveCount(AXES.length);
  expect(
    await columns.evaluateAll((els) => els.map((el) => el.getAttribute("data-axis"))),
  ).toEqual([...AXES]);

  // 비교 기준(시점)이 화면에 드러나고 API가 비교한 그 값과 같다.
  await expect(page.locator(".cmp-bucket")).toHaveText(api.basis.time_bucket);
  await expect(page.locator(".norm-flag")).toBeVisible();

  // 각 컬럼의 순위·대상·비율이 그 축의 집계와 일치한다.
  for (const axis of AXES) {
    const expected = api.axes.find((c) => c.axis === axis)!;
    const rows = page.locator(`.cmpcol[data-axis="${axis}"] .cmprow`);
    await expect(rows).toHaveCount(expected.top_subjects.length);

    for (const [i, row] of expected.top_subjects.entries()) {
      const nm = rows.nth(i).locator(".nm");
      await expect(nm, `${axis} ${i + 1}위 대상이 집계와 다름`).toContainText(
        `${row.rank}. ${row.subject}`,
      );
      await expect(nm).toContainText(`원시 ${row.raw_count}건`);
      await expect(rows.nth(i).locator(".pct")).toHaveText(
        `${(row.normalized_share * 100).toFixed(1)}%`,
      );
    }
  }
});

test("web: share bars use one scale shared by all three axes", async ({ page, request }) => {
  const api: CompareBody = await (await request.get("/api/compare")).json();
  const shares = api.axes.flatMap((c) => c.top_subjects.map((r) => r.normalized_share));
  const maxShare = Math.max(...shares);

  // 축마다 최대값이 달라야 "컬럼별 스케일"과 "공통 스케일"이 구분된다. 세 축의
  // 최대 비율이 전부 같으면 이 테스트는 아무것도 증명하지 못하므로 먼저 막는다.
  const perAxisMax = api.axes.map((c) => Math.max(...c.top_subjects.map((r) => r.normalized_share)));
  expect(new Set(perAxisMax).size, "축별 최대 비율이 모두 같아 스케일 구분이 불가능하다").toBeGreaterThan(1);

  await page.goto("/compare");

  for (const axis of AXES) {
    const expected = api.axes.find((c) => c.axis === axis)!;
    const rows = page.locator(`.cmpcol[data-axis="${axis}"] .cmprow`);

    for (const [i, row] of expected.top_subjects.entries()) {
      const width = await barWidth(rows.nth(i));
      // 공통 스케일: 폭은 (자기 비율 / 세 축 통합 최대)여야 한다. 컬럼 최대로
      // 나눴다면 각 컬럼 1위가 전부 100%가 되어 여기서 깨진다.
      expect(
        width,
        `${axis} "${row.subject}" 막대가 공통 스케일을 따르지 않음`,
      ).toBeCloseTo((row.normalized_share / maxShare) * 100, 1);
    }
  }
});
