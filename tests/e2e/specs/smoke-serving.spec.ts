// 검증 AC: 없음 (스모크/인프라)
//
// 이 파일은 AC를 주검증하지 않는다. kind 클러스터에 띄운 serving 워크로드가
// 실제로 기동해 요청을 받는다는 것만 확인하는 인프라 스모크이며, AC 전용 spec
// 들이 의미 있게 실패할 수 있는 전제를 세운다. AC↔spec 1:1 계수에서 제외되고
// docs/econ-opinion-monitor-doc-tracker.md 의 "e2e 매핑" 섹션에 비-AC 유형으로
// 등재돼 있다(고아 파일이 아니다).

import { expect, test } from "@playwright/test";

test("smoke: serving health responds ok", async ({ request }) => {
  const res = await request.get("/api/health");
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ status: "ok" });
});
