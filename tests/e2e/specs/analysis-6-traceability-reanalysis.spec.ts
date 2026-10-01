// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 6
//
// "분석 로직 변경"은 하네스에서 두 가지로 세운다: 더블의 응답 묶음을 `e2e-llm-v2` 로 바꾸고
// (몇 건을 다시 판정한다) `--analyzer-version` 을 올린다. 데이터 루트는 그대로라 재분석은 같은
// Silver 데이터셋을 덮어쓴다 — 그 덮어쓰기가 추적 키를 잃지 않는지가 이 시나리오의 무게중심이다.
//
// 1차 Silver 는 재분석 Job 이 돌기 전에 반출해 둔 스냅샷을 읽는다(`E2E_SILVER_DIR`). 재분석
// 뒤에는 PVC 에 더 이상 남아 있지 않기 때문이다.

import { expect, test } from "@playwright/test";

import { analysisBronzeDir, newsBodies, newsItems } from "../lib/bronze";
import { MODEL_V1, MODEL_V2, cannedReplies } from "../lib/llmdouble";
import { type Analysis, analyses, byRecordId, reanalyses } from "../lib/silver";

/** 재분석이 바꿀 수 있는 판단부만 추린 비교 키 — 추적 키·버전은 일부러 뺀다. */
function judgement(record: Analysis): string {
  return JSON.stringify([record.target_countries, record.narrative_subjects, record.sentiment]);
}

test("analysis: every Silver record traces back to its Bronze source link and body", () => {
  const items = new Map(newsItems(analysisBronzeDir()).map((item) => [item.record_id, item]));
  const bodies = new Set(newsBodies(analysisBronzeDir()).map((body) => body.body_hash));
  const records = analyses();
  expect(records.length).toBe(items.size);

  for (const record of records) {
    const item = items.get(record.record_id);
    expect(item, `Silver ${record.record_id} 의 Bronze 관측이 없다`).toBeDefined();
    // 링크는 추적 키의 두 번째 축이다 — record_id 가 맞아도 링크가 다르면 다른 원문을 가리킨다.
    expect(record.source_url, record.record_id).toBe(item!.source_url);
    // 본문은 해시로 주소화돼 별도 데이터셋에 산다. 해시가 풀려야 원문 본문까지 도달한 것이다.
    expect(item!.body_available, record.record_id).toBe(true);
    expect(bodies.has(item!.body_hash), `본문 ${item!.body_hash} 를 못 찾는다`).toBe(true);
  }
});

test("analysis: re-analysis updates Silver in place, keeping every tracking key", () => {
  const before = analyses();
  const after = reanalyses();

  expect(after).toHaveLength(before.length);
  expect(new Set(after.map((r) => r.record_id))).toEqual(new Set(before.map((r) => r.record_id)));
  expect(new Set(after.map((r) => r.source_url))).toEqual(new Set(before.map((r) => r.source_url)));

  const first = byRecordId(before);
  for (const record of after) {
    const prior = first.get(record.record_id)!;
    expect(record.source_url, record.record_id).toBe(prior.source_url);
    // 분석 시각은 Bronze 관측 시각에서 오므로 재분석이 바꾸지 않는다(원문 추적 키의 일부).
    expect(record.analyzed_at, record.record_id).toBe(prior.analyzed_at);
  }
});

test("analysis: the re-analysed batch is stamped with the new analyzer version", () => {
  expect(new Set(analyses().map((r) => r.analyzer_version))).toEqual(new Set(["llm-v1"]));
  expect(new Set(reanalyses().map((r) => r.analyzer_version))).toEqual(new Set(["llm-v2"]));
});

test("analysis: re-judged articles change, untouched ones keep their earlier result", () => {
  const v1 = cannedReplies(MODEL_V1);
  const v2 = cannedReplies(MODEL_V2);
  const rejudged = new Set(
    [...v2].filter(([title, reply]) => JSON.stringify(v1.get(title)) !== JSON.stringify(reply))
      .map(([title]) => title),
  );
  // 하나도 다시 판정되지 않으면 "로직을 변경해 재분석했다"는 사전 조건이 서지 않는다.
  expect(rejudged.size).toBeGreaterThan(0);

  const titleOf = new Map(newsItems(analysisBronzeDir()).map((i) => [i.record_id, i.title]));
  const first = byRecordId(analyses());
  let changed = 0;
  for (const record of reanalyses()) {
    const title = titleOf.get(record.record_id)!;
    const prior = first.get(record.record_id)!;
    if (rejudged.has(title)) {
      expect(judgement(record), title).not.toBe(judgement(prior));
      changed += 1;
    } else {
      expect(judgement(record), title).toBe(judgement(prior));
    }
  }
  expect(changed).toBe(rejudged.size);
});
