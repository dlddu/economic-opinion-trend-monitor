// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 3
//
// 사전 조건은 "여러 시간대에 걸친 수집 데이터가 있다", 실행 단계는 "시간 단위 버킷을 생성하고
// 일·주 단위로 롤업한다", 기대 결과는 "시간대 버킷이 **누락 없이** 생성되고, 롤업 시 합산이
// **하위 버킷 합과 일치**한다" 이다.
//
// **사전 조건이 이 시나리오의 어려운 절이다.** 수집 CLI 는 `collected_at` 을 실행 시각으로 찍으므로
// (`econ_ingestion/cli.py`, `--cycle` 과 무관하다) 한 수집 Job 의 레코드는 전부 같은 시간 버킷에
// 떨어진다 — 파이프라인을 몇 번 돌려도 e2e 안에서는 시간대 차원이 값 하나다. 그래서 하네스가
// 집계 코퍼스의 Bronze 를 **수집 시각만** 고정 달력으로 다시 찍어 별도 루트에 심고
// (`tools/timeshift_bronze.py`), 그 루트에 **실 `econ-aggregation`** 을 한 번 더 돌린다
// (`k8s/batch/aggregate-job-rollup.yaml`). 피검체는 집계 그대로이고, 손댄 것은 e2e 가 파이프라인을
// 돌려서는 만들 수 없는 그 한 차원뿐이다. Silver 는 바이트 그대로 이식되므로 아래 첫 테스트가
// 그 동일성부터 확인한다 — 어긋나면 롤업이 아니라 하네스를 재고 있는 것이다.
//
// **Gold 를 Gold 로 증명하지 않는다.** 세 단위의 기대값은 전부 Bronze(축·수집 시각) + Silver(서술
// 대상)에서 **그 단위로 다시 센** 교차표에서 온다(`lib/gold.ts: crossTabAt`). 그 위에 Gold 안에서만
// 성립하는 롤업 항등식(일 = 하위 시간 합 · 주 = 하위 일 합)을 따로 건다 — 두 관측이 서로를 대신하지
// 못한다. 재계수가 옳고 롤업이 틀리면 첫 대조가, 둘 다 같은 방식으로 틀리면 항등식이 잡는다.
//
// **점유율은 합산되지 않는다.** `normalized_share` 는 자기 버킷 안의 분포라 시간 점유율을 더하면
// 분포가 아닌 수가 된다. 굵은 버킷 안에서 AC3.1 정규화를 다시 돌리는 것이 그 대신이고, 그래서
// 단위·버킷마다 대상들의 점유율 합이 1이어야 한다 — 롤업을 "Gold 행 더하기"로 구현하면 이 단정이
// 제일 먼저 깨진다.

import { expect, test } from "@playwright/test";

import {
  axisSentimentsAllUnits,
  bucketOfUnit,
  bucketsAt,
  cellKey,
  crossTabAt,
  isoWeekLabel,
  rollupGoldDir,
  rollupItems,
  subjectTrendsAllUnits,
  type AxisSentiment,
  type BucketUnit,
  type SubjectTrend,
} from "../lib/gold";
import { aggAnalyses, rollupAnalyses } from "../lib/silver";

const UNITS: BucketUnit[] = ["hour", "day", "week"];

/** 반올림된 비율끼리의 비교 허용 오차. 계약이 소수 4자리라 항목 수만큼 끝자리가 흔들린다. */
const EPSILON = 1e-3;

function trendsOfUnit(unit: BucketUnit): SubjectTrend[] {
  return subjectTrendsAllUnits(rollupGoldDir()).filter((row) => row.bucket_unit === unit);
}

function sentimentOfUnit(unit: BucketUnit): AxisSentiment[] {
  return axisSentimentsAllUnits(rollupGoldDir()).filter((row) => row.bucket_unit === unit);
}

/** 굵은 버킷 -> 그 안에 드는 고운 버킷들. Gold 안에서만 도는 항등식의 좌·우변을 잇는다. */
function contained(fine: BucketUnit, coarse: BucketUnit): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const bucket of bucketsAt(fine)) {
    // 고운 버킷의 라벨은 그 자체가 ISO 접두사라, 굵은 단위 라벨을 라벨에서 곧장 얻는다.
    const key = coarse === "day" ? bucket.slice(0, 10) : isoWeekLabel(bucket.slice(0, 10));
    grouped.set(key, [...(grouped.get(key) ?? []), bucket]);
  }
  return grouped;
}

test("rollup harness: the corpus really spans several hours, days and weeks", () => {
  const items = rollupItems();

  // Silver 는 이식만 됐다 — 라벨이 달라지면 아래 재계수의 기준이 원천이 아니게 된다.
  const carried = new Map(rollupAnalyses().map((row) => [row.record_id, JSON.stringify(row)]));
  const original = new Map(aggAnalyses().map((row) => [row.record_id, JSON.stringify(row)]));
  expect(carried).toEqual(original);

  // 단위마다 버킷이 하나뿐이면 아래 합산 단정이 전부 공허하게 통과한다(x = x). 여기서 끊는다.
  for (const unit of UNITS) {
    expect(bucketsAt(unit, items).size, `${unit} 버킷 수`).toBeGreaterThan(1);
  }
  // 그리고 굵은 버킷 하나가 고운 버킷을 둘 이상 품어야 "합"이 합다운 합이 된다.
  const hoursPerDay = [...contained("hour", "day").values()].map((hours) => hours.length);
  const daysPerWeek = [...contained("day", "week").values()].map((days) => days.length);
  expect(Math.max(...hoursPerDay), "한 날에 든 시간 버킷 수의 최댓값").toBeGreaterThan(1);
  expect(Math.max(...daysPerWeek), "한 주에 든 일 버킷 수의 최댓값").toBeGreaterThan(1);
});

test("rollup: every bucket present in the source appears in Gold, at all three units", () => {
  for (const unit of UNITS) {
    // 분위기 데이터셋을 기준으로 삼는다 — 모든 관측 레코드를 세므로(미분석 포함) "버킷이
    // 누락 없이 생성됐는가"를 그대로 말한다. `subject_trend` 는 서술 대상이 없는 레코드가
    // 행을 남기지 않아, 그런 레코드만 든 버킷이 정당하게 비어 있을 수 있다.
    const measured = new Set(
      rollupItems().map((item) => cellKey(item.axis, bucketOfUnit(item, unit), "")),
    );
    const fromGold = new Set(
      sentimentOfUnit(unit).map((row) => cellKey(row.axis, row.time_bucket, "")),
    );
    expect(fromGold, `${unit} 단위의 (축, 버킷) 집합`).toEqual(measured);
  }
});

test("rollup: raw counts at every unit match an independent recount of the source", () => {
  for (const unit of UNITS) {
    const fromGold = new Map(
      trendsOfUnit(unit).map((row) => [
        cellKey(row.axis, row.time_bucket, row.subject),
        row.raw_count,
      ]),
    );
    expect(fromGold, `${unit} 단위 교차표`).toEqual(crossTabAt(unit));
  }
});

test("rollup: a coarse bucket's count is the sum of the buckets it contains", () => {
  for (const [fine, coarse] of [
    ["hour", "day"],
    ["day", "week"],
  ] as [BucketUnit, BucketUnit][]) {
    // 고운 행들을 **굵은 키로 눌러 더한다**. 한 굵은 버킷에 고운 버킷이 여럿 들어오므로 반드시
    // 누적이어야 한다 — 덮어쓰면 마지막 고운 버킷만 남아 단정이 헐거워진다.
    const foldTo = (coarseOf: (bucket: string) => string, rows: { axis: string; time_bucket: string; subject?: string; value: number }[]) => {
      const totals = new Map<string, number>();
      for (const row of rows) {
        const key = cellKey(row.axis, coarseOf(row.time_bucket), row.subject ?? "");
        totals.set(key, (totals.get(key) ?? 0) + row.value);
      }
      return totals;
    };
    const coarseOf = (bucket: string) =>
      coarse === "day" ? bucket.slice(0, 10) : isoWeekLabel(bucket.slice(0, 10));

    const expected = foldTo(
      coarseOf,
      trendsOfUnit(fine).map((row) => ({ ...row, value: row.raw_count })),
    );
    const measured = new Map(
      trendsOfUnit(coarse).map((row) => [
        cellKey(row.axis, row.time_bucket, row.subject),
        row.raw_count,
      ]),
    );
    expect(measured, `${coarse} raw_count = Σ ${fine}`).toEqual(expected);

    // 분위기 쪽도 같은 항등식을 만족한다 — 분석된 건수는 세면 되는 값이라 굵게 잘라도 합이다.
    const expectedAnalyzed = foldTo(
      coarseOf,
      sentimentOfUnit(fine).map((row) => ({ ...row, value: row.analyzed_total })),
    );
    const measuredAnalyzed = new Map(
      sentimentOfUnit(coarse).map((row) => [
        cellKey(row.axis, row.time_bucket, ""),
        row.analyzed_total,
      ]),
    );
    expect(measuredAnalyzed, `${coarse} analyzed_total = Σ ${fine}`).toEqual(expectedAnalyzed);
  }
});

test("rollup: shares are renormalized inside each bucket, not summed across them", () => {
  for (const unit of UNITS) {
    const perBucket = new Map<string, number>();
    for (const row of trendsOfUnit(unit)) {
      const key = cellKey(row.axis, row.time_bucket, "");
      perBucket.set(key, (perBucket.get(key) ?? 0) + row.normalized_share);
    }
    expect(perBucket.size, `${unit} 단위의 (축, 버킷) 수`).toBeGreaterThan(0);
    for (const [key, total] of perBucket) {
      // 시간 점유율을 그대로 더해 일 행을 만들면 이 합이 1 을 넘는다(버킷 수만큼 커진다).
      expect(total, `${unit} ${key} 의 점유율 합`).toBeCloseTo(1, 3);
    }

    for (const row of sentimentOfUnit(unit)) {
      if (row.analyzed_total === 0) continue;
      const { positive, neutral, negative, mixed } = row.distribution;
      expect(
        Math.abs(positive + neutral + negative + mixed - 1),
        `${unit} ${row.axis} ${row.time_bucket} 의 분위기 비율 합`,
      ).toBeLessThan(EPSILON);
    }
  }
});
