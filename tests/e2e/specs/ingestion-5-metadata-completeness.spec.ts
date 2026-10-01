// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 5
//
// 시나리오가 요구하는 필드들을 "비어 있지 않다"로만 보면 0이나 빈 문자열이 통과한다 — 그래서
// 조회수·순위·수집 시각은 값이 있는지가 아니라 **값이 맞는지**를 본다.
//
// 마지막 요구("수집 시각으로 시간대별 묶음을 식별할 수 있다")는 `collection_cycle` 이 시간
// 단위 버킷 id 형태이고 한 번의 주기 실행이 한 버킷에만 떨어지는지로 본다.

import { expect, test } from "@playwright/test";

import { itemsBySource, newsItems } from "../lib/bronze";
import { feedConfigs, providedEntries } from "../lib/feeds";

const HOUR_BUCKET = /^\d{4}-\d{2}-\d{2}T\d{2}:00$/;

test("ingestion: every record carries the source identifier and axis it was collected under", () => {
  const configured = new Set(feedConfigs().map((config) => config.source_id));
  for (const item of newsItems()) {
    expect(configured).toContain(item.source_id);
    expect(item.axis).toBeTruthy();
    expect(item.title).toBeTruthy();
    expect(item.source_url).toBeTruthy();
  }
});

test("ingestion: view counts are preserved from the source, not defaulted", () => {
  const viewsByUrl = new Map<string, number>();
  for (const config of feedConfigs()) {
    for (const entry of providedEntries(config.source_id)) {
      viewsByUrl.set(entry.url, entry.views);
    }
  }
  const mismatched = newsItems().filter((item) => item.view_count !== viewsByUrl.get(item.source_url));
  expect(mismatched).toEqual([]);
});

test("ingestion: ranks are a complete 1..N sequence within each source", () => {
  for (const [sourceId, items] of itemsBySource(newsItems())) {
    const ranks = items.map((item) => item.rank).sort((a, b) => a - b);
    expect(ranks, `${sourceId} 의 순위가 1..N으로 닫히지 않는다`).toEqual(
      Array.from({ length: items.length }, (_, i) => i + 1),
    );
  }
});

test("ingestion: collection time and cycle identify one hourly bucket", () => {
  const items = newsItems();
  for (const item of items) {
    expect(Number.isNaN(Date.parse(item.collected_at))).toBe(false);
    expect(item.collection_cycle).toMatch(HOUR_BUCKET);
  }
  expect(new Set(items.map((item) => item.collection_cycle)).size).toBe(1);
});
