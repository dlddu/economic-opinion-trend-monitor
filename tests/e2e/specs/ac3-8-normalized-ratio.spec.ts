// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 8
//
// AC3.8 "정규화된 비율 표시 (원시 카운트와 구분)" — docs/econ-opinion-monitor-prd-aggregation-viz.md
// 검증 방법(AC 본문): "정규화 비율과 원시 카운트가 구분 표기되고, 정규화 적용
// 여부가 드러나는지 확인한다."
//
// 그래서 이 파일은 세 가지를 단언한다.
//   1) 서빙 API가 정규화 적용 여부(`normalized`)를 명시적으로 실어 보낸다.
//   2) 같은 행에 정규화 비율(`normalized_share`)과 원시 카운트(`raw_count`)가
//      서로 다른 필드로 함께 온다 — 하나가 다른 하나를 대체하지 않는다.
//   3) 화면이 그 둘을 한 행 안에서 **구분된 표기**로 보여주고, 지금 보고 있는
//      값이 정규화된 값이라는 플래그를 노출한다.
//
// 단언하지 않는 것: 정규화 계산 자체의 견고성(AC3.1)과 집계 정확성(AC3.2/3.3).
// 이 하네스는 픽스처 Gold를 마운트하므로 집계 로직을 관측하지 못한다.

import { expect, test } from "@playwright/test";

// tests/e2e/fixtures/gold/subject_trend.jsonl 의 KR 축 1위 행과 일치해야 한다.
const FIXTURE_SUBJECT = "E2E 검증 서브젝트";

test("api: dashboard marks the ratio as normalized and keeps raw counts alongside", async ({
  request,
}) => {
  const res = await request.get("/api/dashboard?axis=KR");
  expect(res.status()).toBe(200);
  const body = await res.json();

  // (1) 정규화 적용 여부가 응답에 드러난다.
  expect(body.normalized).toBe(true);

  // (2) 정규화 비율과 원시 카운트가 별개 필드로 공존한다.
  const row = body.top_subjects.find(
    (r: { subject: string }) => r.subject === FIXTURE_SUBJECT,
  );
  expect(row, `${FIXTURE_SUBJECT} 행이 응답에 없음`).toBeTruthy();
  expect(typeof row.normalized_share).toBe("number");
  expect(typeof row.raw_count).toBe("number");
  expect(row.normalized_share).toBeGreaterThan(0);
  expect(row.normalized_share).toBeLessThanOrEqual(1); // 비율 (0~1)
  expect(row.raw_count).toBeGreaterThan(1); // 원시 건수 — 비율이 아니다
});

test("web: dashboard shows the normalized share and the raw count as distinct values", async ({
  page,
  request,
}) => {
  const api = await (await request.get("/api/dashboard?axis=KR")).json();
  const row = api.top_subjects.find(
    (r: { subject: string }) => r.subject === FIXTURE_SUBJECT,
  );

  await page.goto("/");
  await expect(page).toHaveTitle(/경제 여론 추세 모니터/);
  // 웹 번들이 실제로 서빙되고 있어야 아래 단언이 의미를 갖는다.
  await expect(page.getByText("The web build was not found")).toHaveCount(0);
  await expect(page.getByText("데이터 없음")).toHaveCount(0);

  const rankRow = page.locator(".rankrow").filter({ hasText: FIXTURE_SUBJECT });
  await expect(rankRow).toHaveCount(1);

  // (3a) 정규화 비율 — 집계값과 같은 값이 퍼센트로 표기된다.
  const share = rankRow.locator(".pct");
  await expect(share).toHaveText(`${(row.normalized_share * 100).toFixed(1)}%`);

  // (3b) 원시 카운트 — 같은 행에서 비율과 구분된 표기로 함께 제공된다.
  const raw = rankRow.locator(".meta");
  await expect(raw).toHaveText(`원시 ${row.raw_count}건`);

  // 둘이 실제로 다른 표기여야 "구분 표기"다.
  expect(await share.textContent()).not.toBe(await raw.textContent());

  // (3c) 보정된 비교를 보고 있다는 사실이 화면에 드러난다.
  await expect(page.getByText("▣ 정규화 비율", { exact: true })).toBeVisible();
});
