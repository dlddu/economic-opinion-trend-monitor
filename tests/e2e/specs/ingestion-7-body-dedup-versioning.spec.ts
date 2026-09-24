// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 7
//
// 시나리오의 사전 조건 셋을 하네스가 이렇게 만든다:
//   (a) 같은 기사가 두 주기 연속 — 주기 1·2 가 같은 상류(`cycle12_main.rss.xml`)를 받는다
//   (b) 세 번째 주기에 본문 수정 — 주기 3 만 `cycle3_main.rss.xml` 을 받는다(링크·조회수는 동일)
//   (c) 다른 링크로 같은 본문 전재 — 세 주기 모두에 reprint-a / reprint-b 쌍이 있다
//
// Bronze 의 `news_item`·`news_body` 는 둘 다 주기를 가로질러 누적된다(PRD ingestion
// 「보유 기간」). 같은 링크가 주기마다 관측 레코드를 하나씩 남기므로 관측 레코드는 링크와
// `collection_cycle` 로 함께 찾는다. run.sh 는 주기 사이마다 스냅샷을 떠 `cycle1/2/3` 으로
// 반출한다 — 주기별 본문 저장소 상태(재저장 없음 · 새 버전 추가)를 그 시점으로 보기 위해서다.

import { createHash } from "node:crypto";

import { expect, test } from "@playwright/test";

import { cycleDir, newsBodies, newsItems } from "../lib/bronze";
import { entriesOf, feedConfigs } from "../lib/feeds";
import { ingestSummary } from "../lib/ingestlog";

const STORY = "https://cycle.e2e.invalid/main/story";
const REPRINT_A = "https://cycle.e2e.invalid/main/reprint-a";
const REPRINT_B = "https://cycle.e2e.invalid/main/reprint-b";

const CYCLES = [1, 2, 3];

function hashOf(text: string): string {
  return createHash("sha256").update(text, "utf-8").digest("hex");
}

/** 그 주기의 상류가 준 본문을 링크로 찾는다. */
function providedBody(file: string, url: string): string {
  const entries = feedConfigs(file).flatMap((config) => entriesOf(config));
  const found = entries.find((entry) => entry.url === url);
  if (!found?.body) throw new Error(`${file} 픽스처에 ${url} 의 본문이 없다`);
  return found.body;
}

function cycleId(cycle: number): string {
  return ingestSummary(`econ-e2e-ingest-cycle${cycle}`).cycle;
}

/** 그 주기의 관측 레코드를 링크로 찾는다 — 스냅샷에는 앞선 주기의 관측도 함께 있다. */
function itemAt(cycle: number, url: string, snapshot: number = cycle) {
  const found = newsItems(cycleDir(snapshot)).find(
    (item) => item.source_url === url && item.collection_cycle === cycleId(cycle),
  );
  if (!found) {
    throw new Error(`스냅샷 ${snapshot} 의 Bronze 에 주기 ${cycle} 의 ${url} 관측 레코드가 없다`);
  }
  return found;
}

test("ingestion: an unchanged body is not stored again on the next cycle", () => {
  const first = ingestSummary("econ-e2e-ingest-cycle1");
  const second = ingestSummary("econ-e2e-ingest-cycle2");

  // 주기 1 이 상류가 준 서로 다른 본문을 저장하고, 주기 2 는 같은 내용이라 한 건도 새로
  // 쓰지 않는다. 주기 2 의 관측 레코드 수는 그대로다 — 재저장이 없는 것이지 관측이 없는 게 아니다.
  expect(first.bodiesNew).toBeGreaterThan(0);
  expect(second.bodiesNew).toBe(0);
  expect(second.bodiesDeduplicated).toBe(first.bodiesNew);
  expect(second.wrote).toBe(first.wrote);

  const stored = newsBodies(cycleDir(2));
  const storyHash = hashOf(providedBody("e2e-feeds-cycle12.json", STORY));
  expect(stored.filter((body) => body.body_hash === storyHash)).toHaveLength(1);
});

test("ingestion: an edited body is added as a new version and the old one survives", () => {
  const third = ingestSummary("econ-e2e-ingest-cycle3");
  const original = hashOf(providedBody("e2e-feeds-cycle12.json", STORY));
  const edited = hashOf(providedBody("e2e-feeds-cycle3.json", STORY));
  expect(edited).not.toBe(original); // 픽스처가 실제로 본문을 고쳤는지

  expect(third.bodiesNew).toBe(1);

  const stored = newsBodies(cycleDir(3));
  const byHash = new Map(stored.map((body) => [body.body_hash, body]));
  expect(byHash.has(edited)).toBe(true);

  // 보존이 요점이다 — 새 버전이 붙어도 기존 레코드가 덮이거나 사라지지 않는다.
  const kept = byHash.get(original);
  expect(kept, "수정 전 본문 레코드가 사라졌다").toBeDefined();
  expect(kept!.raw_text).toBe(providedBody("e2e-feeds-cycle12.json", STORY));
  expect(kept!.first_seen_cycle).toBe(ingestSummary("econ-e2e-ingest-cycle1").cycle);
});

test("ingestion: each cycle's observation points at the body seen in that cycle", () => {
  const original = hashOf(providedBody("e2e-feeds-cycle12.json", STORY));
  const edited = hashOf(providedBody("e2e-feeds-cycle3.json", STORY));

  expect(itemAt(1, STORY).body_hash).toBe(original);
  expect(itemAt(2, STORY).body_hash).toBe(original);
  expect(itemAt(3, STORY).body_hash).toBe(edited);
});

test("ingestion: earlier cycles' observations survive later cycles", () => {
  const original = hashOf(providedBody("e2e-feeds-cycle12.json", STORY));
  const edited = hashOf(providedBody("e2e-feeds-cycle3.json", STORY));

  // 마지막 스냅샷 하나에 세 주기의 관측이 모두 남아 있어야 관측 이력이 곧 수정 이력이 된다.
  expect(itemAt(1, STORY, 3).body_hash).toBe(original);
  expect(itemAt(2, STORY, 3).body_hash).toBe(original);
  expect(itemAt(3, STORY, 3).body_hash).toBe(edited);
});

test("ingestion: reprints under different links share one stored body", () => {
  for (const cycle of CYCLES) {
    const a = itemAt(cycle, REPRINT_A);
    const b = itemAt(cycle, REPRINT_B);

    expect(a.source_url).not.toBe(b.source_url); // 전재 쌍은 링크가 다르다
    expect(a.body_hash).toBe(b.body_hash);

    const shared = newsBodies(cycleDir(cycle)).filter(
      (body) => body.body_hash === a.body_hash,
    );
    expect(shared, `주기 ${cycle} 에서 전재 쌍이 본문 레코드를 공유하지 않는다`).toHaveLength(1);
  }
});
