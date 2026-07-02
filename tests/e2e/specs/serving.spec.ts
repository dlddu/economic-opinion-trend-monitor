import { expect, test } from "@playwright/test";

// Must match tests/e2e/fixtures/gold/subject_trend.jsonl (KR axis, top rank).
const FIXTURE_SUBJECT = "E2E 검증 서브젝트";

// API level — the smoke.sh assertions promoted to specs (health + dashboard).
test("api: health responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});

test("api: dashboard serves fixture Gold for the KR axis", async ({ request }) => {
  const res = await request.get("/api/dashboard?axis=KR");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toContain(FIXTURE_SUBJECT);
  expect(body).toContain('"normalized":true');
});

// Browser level — the built web app (not the Go placeholder page) renders the
// fixture subject on the dashboard instead of the empty-data note.
test("web: dashboard renders the fixture subject", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/경제 여론 추세 모니터/);
  await expect(page.getByText(FIXTURE_SUBJECT).first()).toBeVisible();
  await expect(page.getByText("The web build was not found")).toHaveCount(0);
  await expect(page.getByText("데이터 없음")).toHaveCount(0);
});
