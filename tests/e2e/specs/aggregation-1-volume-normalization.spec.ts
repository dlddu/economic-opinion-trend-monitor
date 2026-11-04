// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 1
//
// 두 상태의 차이는 오직 수집량이다 — 그래야 두 Gold 의 차이를 수집량 차이로 읽을 수 있다.

import { expect, test } from "@playwright/test";

import { goldSkewDir, subjectTrends, trendOf, trendsOfAxis } from "../lib/gold";

const AXIS = "KR";
/** 수집량을 부풀린 대상 — 부풀린 소스에 기사가 더해지는 쪽이다. */
const INFLATED = "삼성전자";
/** 부풀리지 **않은** 소스에만 있는 대상 — "소스 간 격차가 지배하지 않는다"의 관측 지점이다. */
const UNTOUCHED = "부동산 PF";

test("aggregation: the skewed run really did inflate one subject's raw volume", () => {
  const base = trendOf(subjectTrends(), AXIS, INFLATED);
  const skewed = trendOf(subjectTrends(goldSkewDir()), AXIS, INFLATED);

  // 실행 단계가 실제로 일어났는지부터 본다 — 부풀리지 못했다면 아래 비교는 헛돈다.
  expect(skewed.raw_count).toBeGreaterThan(base.raw_count * 2);
});

test("aggregation: the normalized share moves far less than the raw volume", () => {
  const base = trendOf(subjectTrends(), AXIS, INFLATED);
  const skewed = trendOf(subjectTrends(goldSkewDir()), AXIS, INFLATED);

  const rawRatio = skewed.raw_count / base.raw_count;
  const shareRatio = skewed.normalized_share / base.normalized_share;

  // 기대 결과의 앞 절: "절대 수집량 증가에 **비례해** 흔들리지 않는다". 비율이 수집량 증가의
  // 절반에도 못 미쳐야 비례가 끊어졌다고 말할 수 있다.
  expect(shareRatio).toBeLessThan(rawRatio / 2);
  expect(shareRatio).toBeGreaterThan(1);
});

test("aggregation: normalization keeps the inflated source below its naive count share", () => {
  for (const dir of [undefined, goldSkewDir()]) {
    const rows = trendsOfAxis(subjectTrends(dir), AXIS);
    const total = rows.reduce((sum, row) => sum + row.raw_count, 0);
    const inflated = rows.find((row) => row.subject === INFLATED);
    expect(inflated, `${dir ?? "baseline"} 에 ${INFLATED} 행이 없다`).toBeDefined();

    // 소스를 무시하고 그냥 센 점유율(naive)보다 정규화된 비율이 작다. 소스별로 먼저 나눈 뒤
    // 평균하므로, 한 소스에 쏠린 건수가 그대로 점유율이 되지 못한다.
    expect(inflated!.normalized_share).toBeLessThan(inflated!.raw_count / total);
  }
});

test("aggregation: a subject only the untouched source carries is not pushed out in proportion", () => {
  const base = trendOf(subjectTrends(), AXIS, UNTOUCHED);
  const skewed = trendOf(subjectTrends(goldSkewDir()), AXIS, UNTOUCHED);

  // 기대 결과의 뒤 절: "소스 간 격차가 결과를 지배하지 않는다". 소스 가중이 기사 수의 제곱근에
  // 비례하므로(AC3.1) 부풀린 소스의 무게는 늘지만 건수만큼은 아니다 — 다른 소스만 다루는 대상의
  // 비율은 줄어들 수는 있어도 건수 점유율이 줄어드는 만큼 밀려나지 않는다.
  const rowsTotal = (dir?: string) =>
    trendsOfAxis(subjectTrends(dir), AXIS).reduce((sum, row) => sum + row.raw_count, 0);
  const naiveRatio = rowsTotal() / rowsTotal(goldSkewDir());

  expect(skewed.raw_count).toBe(base.raw_count);
  const shareRatio = skewed.normalized_share / base.normalized_share;
  expect(shareRatio).toBeLessThanOrEqual(1);
  expect(shareRatio).toBeGreaterThan(naiveRatio);
});

test("aggregation: shares still form a distribution in both states", () => {
  for (const dir of [undefined, goldSkewDir()]) {
    const rows = trendsOfAxis(subjectTrends(dir), AXIS);
    const sum = rows.reduce((acc, row) => acc + row.normalized_share, 0);
    // 재정규화가 살아 있어야 두 상태의 비율을 같은 잣대로 비교할 수 있다.
    expect(sum, `${dir ?? "baseline"} 축 ${AXIS}`).toBeCloseTo(1, 3);
  }
});
