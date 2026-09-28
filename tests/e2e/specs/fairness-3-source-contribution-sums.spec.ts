// 검증 시나리오: econ-opinion-monitor-test-fairness.md#시나리오 3
//
// 등식은 원천 재계수 위에 얹는 교차 데이터셋 가드다 — 어느 쪽이 무엇을 잡는지 헷갈리면 등식만
// 남기고 재계수를 지우는 개편이 통과하면서 조용히 공허해진다.
//
// 비교 상태(부풀린 루트)는 Bronze·Silver 를 반출하지 않아 그쪽 독립 기준을 상류 픽스처에서
// 세운다. 그 단정이 없으면 아래 두 상태 비교가 전부 공허해질 수 있다.

import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import { entriesOf, feedConfigs } from "../lib/feeds";
import {
  bucketOf,
  cellKey,
  crossTab,
  goldSkewDir,
  subjectSourceContributions,
  subjectTrends,
  trendOf,
  trendsOfAxis,
} from "../lib/gold";
import { aggItems } from "../lib/gold";
import { aggAnalyses, byRecordId } from "../lib/silver";

/** 화면이 기본으로 여는 축. `/fairness` 는 KR 로 시작하므로 API 도 같은 축으로 묻는다. */
const AXIS = "KR";
/** 수집원이 둘인 대상 — 분해가 한 행보다 많아지는 유일한 관측 지점이다. */
const SHARED = "삼성전자";
/** 부풀리지 **않은** 소스만 다루는 대상. 「대상 단위 값이 그대로다」의 대조 지점이다. */
const UNTOUCHED = "부동산 PF";

const BASE_FEEDS = "e2e-feeds-agg.json";
const SKEW_FEEDS = "e2e-feeds-agg-skew.json";

/** 정규화 몫이 발행되는 격자. `contributions.py: GRID` 와 같은 값이어야 등식을 정수로 뭅는다. */
const GRID = 10_000;
const onGrid = (value: number): number => Math.round(value * GRID);

/** 이름을 상수로 박지 않는 이유: 픽스처가 다른 소스를 부풀리면 조용히 엉뚱한 소스를 본다. */
function inflatedSource(): string {
  const base = feedConfigs(BASE_FEEDS);
  const skew = feedConfigs(SKEW_FEEDS);
  expect(skew.map((c) => c.source_id)).toEqual(base.map((c) => c.source_id));
  const differing = base.filter((config, i) => config.feed_url !== skew[i].feed_url);
  expect(differing, "두 설정이 정확히 한 소스에서만 갈려야 한다").toHaveLength(1);
  return differing[0].source_id;
}

/**
 * (수집원 -> 건수) 를 **원천에서 다시 센다** — `crossTab` 과 같은 조인·버킷 규칙에 소스 축만
 * 더한 것이다. 집계의 `count_by_source` 를 베끼지 않고 Bronze 의 `source_id` 를 그대로 쓴다.
 */
function recountBySource(subject: string, bucket: string): Map<string, number> {
  const byId = byRecordId(aggAnalyses());
  const counts = new Map<string, number>();
  for (const item of aggItems()) {
    if (item.axis !== AXIS) continue;
    if (bucketOf(item) !== bucket) continue;
    const analysis = byId.get(item.record_id);
    if (!analysis) {
      throw new Error(`Bronze 레코드 ${item.record_id}(${item.title}) 의 Silver 분석이 없다`);
    }
    if (!analysis.narrative_subjects.includes(subject)) continue;
    counts.set(item.source_id, (counts.get(item.source_id) ?? 0) + 1);
  }
  return counts;
}

function decompositionOf(subject: string, bucket: string, dir?: string) {
  return subjectSourceContributions(dir).filter(
    (row) => row.axis === AXIS && row.subject === subject && row.time_bucket === bucket,
  );
}

test("사전 조건: 비교 상태는 한 수집원의 수집량만 늘렸다", () => {
  const inflated = inflatedSource();
  const base = feedConfigs(BASE_FEEDS);
  const skew = feedConfigs(SKEW_FEEDS);

  let grew = 0;
  for (const [i, config] of base.entries()) {
    const before = entriesOf(config).length;
    const after = entriesOf(skew[i]).length;
    if (config.source_id === inflated) {
      // 「크게 늘린」이 실제로 일어났는지부터 본다 — 안 늘었다면 아래 비교는 헛돈다.
      expect(after, `${inflated} 의 제공분이 늘지 않았다`).toBeGreaterThan(before);
      grew += 1;
    } else {
      expect(after, `${config.source_id} 의 제공분이 함께 움직였다`).toBe(before);
    }
  }
  expect(grew).toBe(1);
});

test("한 축에 수집원이 둘 이상이고, 한 대상이 여러 수집원에 걸쳐 있다", () => {
  const trend = trendOf(subjectTrends(), AXIS, SHARED);
  const rows = decompositionOf(SHARED, trend.time_bucket);

  // 사전 조건의 뒤 절. 분해 행이 하나뿐이면 「합」 단정이 항등식이 되어 아무것도 못 잡는다.
  expect(rows.length, `${SHARED} 의 분해가 한 수집원뿐이다`).toBeGreaterThan(1);
  expect(new Set(rows.map((row) => row.source_id)).size).toBe(rows.length);
});

test("분해가 실제로 수집한 수집원 구성과 일치한다", () => {
  const trends = trendsOfAxis(subjectTrends(), AXIS);
  expect(trends.length).toBeGreaterThan(0);

  for (const trend of trends) {
    const rows = decompositionOf(trend.subject, trend.time_bucket);
    const recounted = recountBySource(trend.subject, trend.time_bucket);

    expect(
      new Set(rows.map((row) => row.source_id)),
      `${trend.subject} 의 수집원 집합이 원천과 다르다`,
    ).toEqual(new Set(recounted.keys()));

    for (const row of rows) {
      expect(
        row.raw_count,
        `${trend.subject} / ${row.source_id} 의 원시 건수가 원천 재계수와 다르다`,
      ).toBe(recounted.get(row.source_id));
    }
  }
});

test("수집원별 원시 건수의 합이 원시 카운트와 같다", () => {
  for (const dir of [undefined, goldSkewDir()]) {
    const label = dir === undefined ? "baseline" : "skewed";
    const trends = trendsOfAxis(subjectTrends(dir), AXIS);
    expect(trends.length, `${label} 에 축 ${AXIS} 행이 없다`).toBeGreaterThan(0);

    for (const trend of trends) {
      const rows = decompositionOf(trend.subject, trend.time_bucket, dir);
      expect(rows.length, `${label} ${trend.subject} 의 분해가 비었다`).toBeGreaterThan(0);
      const summed = rows.reduce((acc, row) => acc + row.raw_count, 0);
      expect(summed, `${label} ${trend.subject}`).toBe(trend.raw_count);
    }
  }
});

test("수집원별 정규화 후 기여의 합이 정규화 비율과 같다", () => {
  for (const dir of [undefined, goldSkewDir()]) {
    const label = dir === undefined ? "baseline" : "skewed";
    for (const trend of trendsOfAxis(subjectTrends(dir), AXIS)) {
      const rows = decompositionOf(trend.subject, trend.time_bucket, dir);
      const summed = rows.reduce((acc, row) => acc + onGrid(row.normalized_contribution), 0);
      // 격자 정수로 뭅는다 — 부동소수 오차를 허용치로 덮으면 최대 잔여법이 깨져도 통과한다.
      expect(summed, `${label} ${trend.subject}`).toBe(onGrid(trend.normalized_share));
    }
  }
});

test("원시 기여 비중은 늘린 수집원만 오른다", () => {
  const inflated = inflatedSource();
  const bucket = trendOf(subjectTrends(), AXIS, SHARED).time_bucket;
  const skewBucket = trendOf(subjectTrends(goldSkewDir()), AXIS, SHARED).time_bucket;

  const before = new Map(
    decompositionOf(SHARED, bucket).map((row) => [row.source_id, row.raw_share]),
  );
  const after = new Map(
    decompositionOf(SHARED, skewBucket, goldSkewDir()).map((row) => [row.source_id, row.raw_share]),
  );
  expect(new Set(after.keys())).toEqual(new Set(before.keys()));

  for (const [source, share] of before) {
    if (source === inflated) {
      expect(after.get(source), `${source} 의 원시 비중이 오르지 않았다`).toBeGreaterThan(share);
    } else {
      expect(after.get(source), `${source} 의 원시 비중이 함께 올랐다`).toBeLessThan(share);
    }
  }
});

test("정규화 후 기여는 원시 증가에 비례해 흔들리지 않는다", () => {
  const inflated = inflatedSource();
  const bucket = trendOf(subjectTrends(), AXIS, SHARED).time_bucket;
  const skewBucket = trendOf(subjectTrends(goldSkewDir()), AXIS, SHARED).time_bucket;

  const before = decompositionOf(SHARED, bucket).find((row) => row.source_id === inflated);
  const after = decompositionOf(SHARED, skewBucket, goldSkewDir()).find(
    (row) => row.source_id === inflated,
  );
  expect(before, `기준 상태에 ${inflated} 행이 없다`).toBeDefined();
  expect(after, `비교 상태에 ${inflated} 행이 없다`).toBeDefined();

  const rawRatio = after!.raw_count / before!.raw_count;
  const contributionRatio = after!.normalized_contribution / before!.normalized_contribution;

  // 비례가 끊어졌다는 판정의 잣대는 대상 단위의 `fairness-1` 이 세운 것과 같다.
  expect(contributionRatio).toBeLessThan(rawRatio / 2);
  expect(contributionRatio).toBeGreaterThan(1);
});

test("대상 단위 집계 값은 분해가 없던 때와 같다", () => {
  const counts = crossTab();

  for (const trend of trendsOfAxis(subjectTrends(), AXIS)) {
    expect(
      counts.get(cellKey(AXIS, trend.time_bucket, trend.subject)),
      `${trend.subject} 의 대상 단위 원시 카운트가 소스 무관 재계수와 다르다`,
    ).toBe(trend.raw_count);
  }

  for (const dir of [undefined, goldSkewDir()]) {
    const rows = trendsOfAxis(subjectTrends(dir), AXIS);
    const keys = rows.map((row) => cellKey(AXIS, row.time_bucket, row.subject));
    expect(new Set(keys).size, "대상 단위 행이 수집원마다 쪼개졌다").toBe(keys.length);
    const shares = rows.reduce((acc, row) => acc + row.normalized_share, 0);
    expect(shares, `${dir === undefined ? "baseline" : "skewed"} 축 ${AXIS}`).toBeCloseTo(1, 3);
  }

  const base = trendOf(subjectTrends(), AXIS, UNTOUCHED);
  const skewed = trendOf(subjectTrends(goldSkewDir()), AXIS, UNTOUCHED);
  expect(skewed.raw_count).toBe(base.raw_count);
  expect(onGrid(skewed.normalized_share)).toBe(onGrid(base.normalized_share));
});

test("서빙이 기준 상태의 분해를 그대로 조회에 내보낸다", async ({ request }) => {
  const served = await fetchContributions(request, SHARED);
  const trend = trendOf(subjectTrends(), AXIS, SHARED);
  const rows = decompositionOf(SHARED, trend.time_bucket);

  expect(served.basis.axis).toBe(AXIS);
  expect(served.basis.subject).toBe(SHARED);
  expect(served.basis.time_bucket).toBe(trend.time_bucket);
  // 응답이 든 두 짝(대상 단위 값 / 자기 행의 합)이 반출 Gold 와 같은 수여야 한다.
  expect(served.basis.raw_count).toBe(trend.raw_count);
  expect(served.basis.raw_total).toBe(rows.reduce((acc, row) => acc + row.raw_count, 0));
  expect(onGrid(served.basis.normalized_total)).toBe(onGrid(trend.normalized_share));

  expect(
    new Map(served.rows.map((row) => [row.source_id, row.raw_count])),
    "서빙이 반출 Gold 와 다른 분해를 냈다",
  ).toEqual(new Map(rows.map((row) => [row.source_id, row.raw_count])));
  expect(served.concentration.source_count).toBe(rows.length);
  expect(served.concentration.top_source_id).toBe(served.rows[0].source_id);
});

type ServedContributions = {
  basis: {
    axis: string;
    subject: string;
    bucket_unit: string;
    time_bucket: string;
    raw_count: number;
    normalized_share: number;
    raw_total: number;
    normalized_total: number;
    method: string;
  };
  concentration: { top_source_id: string; top_share: number; source_count: number };
  rows: {
    source_id: string;
    raw_count: number;
    raw_share: number;
    normalized_contribution: number;
  }[];
};

async function fetchContributions(
  request: APIRequestContext,
  subject: string,
): Promise<ServedContributions> {
  const res = await request.get(
    `/api/source-contributions?axis=${AXIS}&subject=${encodeURIComponent(subject)}`,
  );
  expect(res.status()).toBe(200);
  return (await res.json()) as ServedContributions;
}
