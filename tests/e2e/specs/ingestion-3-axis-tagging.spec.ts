// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 3
//
// 시나리오의 사전 조건은 "한국·미국·전세계 축에 매핑된 소스가 각각 존재한다"이다. 그 매핑은
// 코드가 아니라 설정(`fixtures/feeds/e2e-feeds.json` 의 `axis`)에 있으므로, 기대 축을 spec에
// 다시 적지 않고 설정에서 읽어 대조한다 — 매핑을 바꾸면 설정 한 곳만 움직인다.
//
// 단언하지 않는 것: 어떤 매체가 어느 축에 속해야 옳은가(그건 운영 판단이고 설정의 내용이다).
// 여기서 보는 것은 "설정한 축이 빠짐없이 모든 레코드에 붙는가"뿐이다.

import { expect, test } from "@playwright/test";

import { newsItems } from "../lib/bronze";
import { feedConfigs } from "../lib/feeds";

const AXES = ["KR", "US", "GLOBAL"];

test("ingestion: every collected record carries one of the three axis tags", () => {
  const items = newsItems();
  const tagged = items.filter((item) => AXES.includes(item.axis));
  expect(tagged).toHaveLength(items.length);
});

test("ingestion: each record's axis matches the axis configured for its source", () => {
  const axisOf = new Map(feedConfigs().map((config) => [config.source_id, config.axis]));
  // 세 축이 모두 설정에 있어야 시나리오의 사전 조건이 선 것이다 — 아니면 아래 대조가 공허해진다.
  expect(new Set(axisOf.values())).toEqual(new Set(AXES));

  const mismatched = newsItems().filter((item) => item.axis !== axisOf.get(item.source_id));
  expect(mismatched).toEqual([]);
});

test("ingestion: all three axes actually appear in the collected records", () => {
  expect(new Set(newsItems().map((item) => item.axis))).toEqual(new Set(AXES));
});
