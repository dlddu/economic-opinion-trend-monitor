// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 2
//
// 상한은 `fixtures/feeds/e2e-feeds.json` 의 `limit`, 제공분은 피드 픽스처의 항목 수다. 그래서
// 여기서는 상한도 제공분도 상수로 쓰지 않고 그 둘에서 유도한다: 픽스처를 늘리거나 줄여도 이
// spec은 여전히 옳고, 절단이 상한을 벗어나는 순간에만 깨진다.
//
// 단언하지 않는 것: 순위를 매기는 기준 자체(조회수 정렬)의 타당성과 축 태깅(시나리오 3),
// 메타데이터 완전성(시나리오 5). 여기서는 "몇 건이 남는가"와 "어느 건이 남는가"만 본다.

import { expect, test } from "@playwright/test";

import { itemsBySource, newsItems } from "../lib/bronze";
import { feedConfig, providedEntries, topByViews } from "../lib/feeds";

const CAPPED = "e2e-kr-wire"; // 제공분 > 상한 — 절단이 일어나는 쪽
const SHORT = "e2e-us-markets"; // 제공분 < 상한 — 채워 넣기가 없어야 하는 쪽

test("ingestion: a source that offers more than its cap is truncated to the top N", () => {
  const config = feedConfig(CAPPED);
  const provided = providedEntries(CAPPED);
  expect(provided.length).toBeGreaterThan(config.limit); // 픽스처가 절단 상황을 실제로 만드는지

  const collected = itemsBySource(newsItems()).get(CAPPED) ?? [];
  expect(collected).toHaveLength(config.limit);

  const expectedUrls = topByViews(provided, config.limit).map((entry) => entry.url);
  expect([...collected].sort((a, b) => a.rank - b.rank).map((item) => item.source_url)).toEqual(
    expectedUrls,
  );
});

test("ingestion: a source that offers fewer than its cap keeps exactly what it offered", () => {
  const config = feedConfig(SHORT);
  const provided = providedEntries(SHORT);
  expect(provided.length).toBeLessThan(config.limit); // 픽스처가 한계 상황을 실제로 만드는지

  const collected = itemsBySource(newsItems()).get(SHORT) ?? [];
  expect(collected).toHaveLength(provided.length);
  expect(new Set(collected.map((item) => item.source_url))).toEqual(
    new Set(provided.map((entry) => entry.url)),
  );
});

test("ingestion: each source's collected count is readable from the records it wrote", () => {
  const bySource = itemsBySource(newsItems());
  for (const sourceId of [CAPPED, SHORT]) {
    const collected = bySource.get(sourceId) ?? [];
    // 건수가 레코드에서 되읽히려면 소스 식별자가 모든 레코드에 있고 순위가 1..N으로 닫혀야 한다.
    expect(collected.every((item) => item.source_id === sourceId)).toBe(true);
    expect([...collected].map((item) => item.rank).sort((a, b) => a - b)).toEqual(
      Array.from({ length: collected.length }, (_, i) => i + 1),
    );
  }
});
