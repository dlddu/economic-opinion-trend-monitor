// 검증 시나리오: 없음 (스모크/인프라)

import { expect, test } from "@playwright/test";

test("smoke: serving health responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
