// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 6
//
// 기대 결과 네 절이 서로 다른 곳에 남는다는 점이 이 spec 의 구조를 정한다:
//   * "전체 수집을 중단시키지 않는다"  → Job 이 완료되고 정상 소스의 레코드가 Bronze 에 있다
//   * "중복 링크가 식별·처리된다"      → 중복 링크가 Bronze 에 한 번만 있고 집계가 그 수를 센다
//   * "재시도가 동작한다"              → 처음 두 번 503 을 낸 소스가 격리되지 **않고** 수집된다
//   * "실패·중복·누락 사실이 기록된다" → Job 로그의 duplicates_skipped · failed_sources
//
// 걸러진 중복과 격리된 소스는 Bronze 에 흔적이 없다 — "레코드가 없다"만 보면 상류가 애초에
// 아무것도 주지 않은 경우와 구별할 수 없어서, 집계(로그)와 레코드를 함께 본다.

import { expect, test } from "@playwright/test";

import { faultsDir, itemsBySource, newsItems } from "../lib/bronze";
import { entriesOf, feedConfigs } from "../lib/feeds";
import { ingestSummary } from "../lib/ingestlog";

const JOB = "econ-e2e-ingest-faults";
const FEEDS_FILE = "e2e-feeds-faults.json";

const HEALTHY = "e2e-faults-ok";
const FLAKY = "e2e-faults-flaky";
const DUPLICATING = "e2e-faults-dup";
const BROKEN = "e2e-faults-down";
const SLOW = "e2e-faults-slow";

/** 끝내 응답에 성공하는 소스들 — 격리된 둘을 뺀 나머지. */
const REACHABLE = [HEALTHY, FLAKY, DUPLICATING];

/** 상류가 제공한 링크를 소스별로. 기대값은 전부 여기서 유도한다(상수를 spec 에 박지 않는다). */
function providedUrls(): Map<string, string[]> {
  const bySource = new Map<string, string[]>();
  for (const config of feedConfigs(FEEDS_FILE)) {
    bySource.set(
      config.source_id,
      entriesOf(config).map((entry) => entry.url),
    );
  }
  return bySource;
}

test("ingestion: one dead source does not take the cycle down with it", () => {
  const summary = ingestSummary(JOB);
  const items = newsItems(faultsDir());
  const bySource = itemsBySource(items);
  const provided = providedUrls();

  // 격리는 "실패했다"가 아니라 "실패했는데도 나머지가 수집됐다"로만 관측된다.
  expect(summary.failedSources).toContain(BROKEN);
  expect(bySource.get(BROKEN) ?? []).toHaveLength(0);

  const healthy = bySource.get(HEALTHY) ?? [];
  expect(healthy.map((item) => item.source_url).sort()).toEqual(
    [...provided.get(HEALTHY)!].sort(),
  );
});

test("ingestion: a source that times out is isolated, not retried forever", () => {
  const summary = ingestSummary(JOB);
  const bySource = itemsBySource(newsItems(faultsDir()));

  // 더블의 지연이 Job 의 --fetch-timeout 보다 길다. 끊지 못하면 Job 이 완료되지 않아
  // run.sh 가 먼저 실패하므로, 여기까지 왔다는 것 자체가 타임아웃이 걸렸다는 뜻이다.
  expect(summary.failedSources).toContain(SLOW);
  expect(bySource.get(SLOW) ?? []).toHaveLength(0);
});

test("ingestion: a transient failure is retried until it succeeds", () => {
  const summary = ingestSummary(JOB);
  const bySource = itemsBySource(newsItems(faultsDir()));
  const provided = providedUrls();

  // 이 소스는 처음 두 요청에 503 을 받는다(`/__flaky__/2/`). 재시도가 없었다면 격리됐을
  // 것이므로, 격리 목록에 없고 제공분이 다 수집된 것이 재시도가 동작했다는 관측이다.
  expect(summary.failedSources).not.toContain(FLAKY);
  expect((bySource.get(FLAKY) ?? []).map((item) => item.source_url).sort()).toEqual(
    [...provided.get(FLAKY)!].sort(),
  );
});

test("ingestion: a link seen twice is collected once and counted as a duplicate", () => {
  const summary = ingestSummary(JOB);
  const items = newsItems(faultsDir());
  const provided = providedUrls();

  // 끝내 도달한 소스들이 제공한 링크 전부(중복 포함)와 그중 고유한 것.
  const reachable = REACHABLE.flatMap((source) => provided.get(source)!);
  const unique = new Set(reachable);
  expect(reachable.length).toBeGreaterThan(unique.size); // 픽스처가 중복 경로를 실제로 밟는지

  expect(summary.duplicatesSkipped).toBe(reachable.length - unique.size);
  expect(items).toHaveLength(unique.size);
  expect(summary.wrote).toBe(unique.size);

  // 중복된 링크 각각이 관측 레코드로는 한 번만 남는다.
  const seen = new Map<string, number>();
  for (const item of items) seen.set(item.source_url, (seen.get(item.source_url) ?? 0) + 1);
  const duplicated = reachable.filter(
    (url, index) => reachable.indexOf(url) !== index,
  );
  expect(duplicated.length).toBeGreaterThan(0);
  for (const url of duplicated) expect(seen.get(url)).toBe(1);
});
