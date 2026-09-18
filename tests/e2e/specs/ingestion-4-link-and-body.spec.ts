// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 4
//
// 시나리오는 두 유형(본문 확보 / 미확보)을 한 수집에 섞어 넣고 각각의 기대 결과를 요구한다.
// 픽스처 `global_desk.rss.xml` 이 그 혼합을 만든다(본문 요소가 없는 항목 3건 포함).
//
// "그 해시로 본문 저장소에서 원문 전체가 정확히 복원된다"는 두 방향으로 본다: 저장된 본문이
// 자기 해시와 맞는지(내용 주소화가 실제로 성립하는지)와, 그 본문이 피드가 준 원문과 같은지.
// 앞의 것만 보면 저장소가 스스로 만든 값끼리 맞는지만 확인하게 된다.

import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { newsBodies, newsItems } from "../lib/bronze";
import { feedConfigs, providedEntries } from "../lib/feeds";

/** 피드가 준 원문을 URL로 찾는다(본문 요소가 없던 항목은 null). */
function providedBodies(): Map<string, string | null> {
  const byUrl = new Map<string, string | null>();
  for (const config of feedConfigs()) {
    for (const entry of providedEntries(config.source_id)) {
      byUrl.set(entry.url, entry.body);
    }
  }
  return byUrl;
}

test("ingestion: captured bodies resolve from the observation's content address", () => {
  const bodies = new Map(newsBodies().map((body) => [body.body_hash, body]));
  const provided = providedBodies();
  const captured = newsItems().filter((item) => item.body_available);
  expect(captured.length).toBeGreaterThan(0); // 픽스처가 본문 확보 경로를 실제로 밟는지

  for (const item of captured) {
    expect(item.body_hash).not.toBe("");
    const stored = bodies.get(item.body_hash);
    expect(stored, `${item.source_url} 의 본문이 저장소에 없다`).toBeDefined();
    expect(createHash("sha256").update(stored!.raw_text, "utf-8").digest("hex")).toBe(
      item.body_hash,
    );
    expect(stored!.raw_text).toBe(provided.get(item.source_url));
  }
});

test("ingestion: uncaptured bodies keep the link and say so instead of inventing a hash", () => {
  const provided = providedBodies();
  const uncaptured = newsItems().filter((item) => !item.body_available);
  expect(uncaptured.length).toBeGreaterThan(0); // 픽스처가 본문 미확보 경로를 실제로 밟는지

  for (const item of uncaptured) {
    expect(item.body_hash).toBe("");
    expect(item.source_url).toBeTruthy();
    // 미확보로 표시된 항목은 애초에 피드가 본문을 주지 않은 항목이어야 한다.
    expect(provided.get(item.source_url)).toBeNull();
  }
});
