// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 8
//
// AC3.8 "정규화된 비율 표시 (원시 카운트와 구분)" — docs/econ-opinion-monitor-prd-aggregation-viz.md
// 검증 방법(AC 본문): "정규화 비율과 원시 카운트가 구분 표기되고, 정규화 적용
// 여부가 드러나는지 확인한다."
//
// 그래서 이 파일은 다음을 단언한다.
//   1) 서빙 API가 정규화 적용 여부(`normalized`)를 명시적으로 실어 보낸다.
//   2) 같은 행에 정규화 비율(`normalized_share`)과 원시 카운트(`raw_count`)가
//      서로 다른 필드로 함께 온다 — 하나가 다른 하나를 대체하지 않는다.
//   3) 대시보드가 정규화 비율을 그리고, 지금 보고 있는 값이 정규화된 값이라는
//      플래그를 노출한다. 대시보드는 목업(`JRN-daily-scan` 화면 1)대로 원시 건수를
//      행마다 적지 않는다 — 원시 순위가 정규화 순위와 갈릴 때만 그 사실을 적는다.
//   4) AC3.8의 전용 표시 표면인 `fairness` 화면이 같은 두 값을 한 행 안에서
//      **구분된 표기**로 병치하고, 세는 방식을 전환하면 표기가 실제로 바뀐다.
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

test("web: dashboard shows the normalized share and flags the counting basis", async ({
  page,
  request,
}) => {
  const api = await (await request.get("/api/dashboard?axis=KR")).json();
  const row = api.top_subjects.find(
    (r: { subject: string }) => r.subject === FIXTURE_SUBJECT,
  );
  expect(row, `${FIXTURE_SUBJECT} 행이 응답에 없음`).toBeTruthy();

  await page.goto("/");
  await expect(page).toHaveTitle(/경제 여론 추세 모니터/);
  // 웹 번들이 실제로 서빙되고 있어야 아래 단언이 의미를 갖는다.
  await expect(page.getByText("The web build was not found")).toHaveCount(0);
  await expect(page.getByText("데이터 없음")).toHaveCount(0);

  const rankRow = page.locator(".rankrow").filter({ hasText: FIXTURE_SUBJECT });
  await expect(rankRow).toHaveCount(1);

  // (3a) 정규화 비율 — 집계값과 같은 값이 퍼센트로 표기된다.
  await expect(rankRow.locator(".pct")).toHaveText(`${(row.normalized_share * 100).toFixed(1)}%`);

  // (3b) 보정된 비교를 보고 있다는 사실이 순위 카드와 세는 방식 타일에 드러난다.
  await expect(page.locator(".card-h .norm-flag")).toHaveText("▣ 정규화");
  await expect(page.locator(".card.metric .norm-flag")).toHaveText("▣ share-normalized");
});

// 기대값은 전부 서빙 응답에서 끌어온다(픽스처 숫자를 spec 에 복사하지 않는다).
test("web: the fairness screen juxtaposes both counting modes and lets the reader switch", async ({
  page,
  request,
}) => {
  const api = await (await request.get("/api/fairness?axis=KR")).json();
  expect(api.basis.normalized).toBe(true);
  const row = api.rows.find((r: { subject: string }) => r.subject === FIXTURE_SUBJECT);
  expect(row, `${FIXTURE_SUBJECT} 행이 응답에 없음`).toBeTruthy();

  await page.goto("/fairness");
  await expect(page.getByText("The web build was not found")).toHaveCount(0);

  const tableRow = page.locator("tbody tr").filter({ hasText: FIXTURE_SUBJECT });
  await expect(tableRow).toHaveCount(1);

  await expect(tableRow.locator(".meta")).toHaveText(`원시 ${row.raw_count}건`);
  const shares = tableRow.locator(".share .pct");
  await expect(shares).toHaveCount(2);
  await expect(shares.nth(0)).toHaveText(`${(row.raw_share * 100).toFixed(1)}%`);
  await expect(shares.nth(1)).toHaveText(`${(row.normalized_share * 100).toFixed(1)}%`);

  await expect(page.locator(".norm-flag")).toBeVisible();
  await expect(tableRow.locator(".share").nth(1)).toHaveClass(/fair-on/);

  // 누르면 실제로 달라지는 컨트롤이라야 「정규화 적용 여부가 드러난다」가 성립한다.
  await page.locator(".norm-toggle").click();
  await expect(page.locator(".raw-flag")).toBeVisible();
  await expect(tableRow.locator(".share").nth(0)).toHaveClass(/fair-on/);
});
