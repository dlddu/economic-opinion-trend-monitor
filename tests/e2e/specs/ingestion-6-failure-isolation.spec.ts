// 검증 시나리오: econ-opinion-monitor-test-ingestion.md#시나리오 6

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

const REACHABLE = [HEALTHY, FLAKY, DUPLICATING];

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

  const reachable = REACHABLE.flatMap((source) => provided.get(source)!);
  const unique = new Set(reachable);
  expect(reachable.length).toBeGreaterThan(unique.size); // 픽스처가 중복 경로를 실제로 밟는지

  expect(summary.duplicatesSkipped).toBe(reachable.length - unique.size);
  expect(items).toHaveLength(unique.size);
  expect(summary.wrote).toBe(unique.size);

  const seen = new Map<string, number>();
  for (const item of items) seen.set(item.source_url, (seen.get(item.source_url) ?? 0) + 1);
  const duplicated = reachable.filter(
    (url, index) => reachable.indexOf(url) !== index,
  );
  expect(duplicated.length).toBeGreaterThan(0);
  for (const url of duplicated) expect(seen.get(url)).toBe(1);
});
