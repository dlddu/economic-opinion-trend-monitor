// 집계 배치가 클러스터 안에서 쓴 Gold를 읽는다. run.sh가 Job 완료 후 PVC에서 꺼내
// $E2E_GOLD_DIR(기준 상태) · $E2E_GOLD_SKEW_DIR(수집량을 부풀린 상태)에 놓고, 여기서 JSONL을
// 파싱해 spec에 넘긴다.
//
// **반출 지점이 둘인 이유**: `…-test-aggregation-viz.md#시나리오 1`은 "한 소스의 수집량만 크게
// 늘린 뒤 기준 상태와 비교한다"이므로 단일 상태로는 관측 자체가 성립하지 않는다. 한 루트에서
// 두 번 돌릴 수도 없다 — `write_records`가 데이터셋을 교체하므로 두 번째 집계가 기준 상태를
// 지운다. 그래서 루트를 둘로 갈라 각자 완결된 Gold를 남기고, 여기서 나란히 읽는다.
//
// 같은 루트의 Bronze·Silver도 함께 읽는다. 시나리오 2의 "차원별 교차 집계값이 원천 데이터와
// 일치한다"는 Gold만 봐서는 판정할 수 없고 — 집계가 스스로 만든 값을 자기와 비교하는 꼴이다 —
// 원천에서 **독립적으로 다시 센** 교차표와 대조해야 한다. `crossTab()`이 그 재계산이다.
//
// 이 디렉터리는 `specs/` 밖이다 — `tests/e2e/specs/*.spec.ts` 만이 시나리오 매칭 단위이고
// (docs/econ-opinion-monitor-doc-tracker.md 「e2e 매핑 › 매칭 규약」), 헬퍼가 그 집합에
// 섞이면 `check_scenario_mapping.py` 가 선언 없는 매칭 단위로 읽는다.

import { readFileSync } from "node:fs";
import path from "node:path";

import { aggBronzeDir, newsItems, type NewsItem } from "./bronze";
import {
  aggAnalyses,
  analyzedByTitle,
  byRecordId,
  type Analysis,
  type Analyzed,
} from "./silver";

/** Gold `subject_trend` 레코드 — contracts/gold/subject_trend.avsc 가 계약의 SSOT다. */
export type SubjectTrend = {
  subject: string;
  axis: string;
  bucket_unit: string;
  time_bucket: string;
  raw_count: number;
  normalized_share: number;
  delta: number;
  spark: number[];
};

/** Gold `axis_sentiment` 레코드 — contracts/gold/axis_sentiment.avsc 가 계약의 SSOT다. */
export type AxisSentiment = {
  axis: string;
  bucket_unit: string;
  time_bucket: string;
  distribution: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
    /** 미분석 비율만 **전체** 대비다. 네 분위기는 분석된 건수 대비다(AC3.4). */
    unanalyzed: number;
  };
  analyzed_total: number;
};

function exportedDir(variable: string): string {
  const dir = process.env[variable];
  if (!dir) {
    throw new Error(
      `${variable}가 비어 있다 — 집계 배치 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job이 쓴 Gold가 호스트로 반출된다.",
    );
  }
  return dir;
}

function readJsonlFrom<T>(dir: string, dataset: string): T[] {
  const target = path.join(dir, `${dataset}.jsonl`);
  const records = readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
  if (records.length === 0) {
    throw new Error(`${target} 에 레코드가 없다 — 집계 Job이 아무것도 쓰지 않았다`);
  }
  return records;
}

/** 기준 상태의 Gold 반출 디렉터리. */
export function goldDir(): string {
  return exportedDir("E2E_GOLD_DIR");
}

/** 수집량을 부풀린 상태의 Gold 반출 디렉터리. */
export function goldSkewDir(): string {
  return exportedDir("E2E_GOLD_SKEW_DIR");
}

/**
 * 버킷 단위 순위 — 고운 것부터. 서빙(`handlers.go: finestUnit`)이 쓰는 것과 같은 순서이고,
 * 같아야 한다: 헬퍼가 화면과 다른 단위를 고르면 spec 이 화면과 다른 Gold 를 재게 된다.
 */
const UNIT_RANK = ["hour", "day", "week"] as const;

/**
 * 한 단위로 정한다(AC3.3). 집계는 같은 레코드를 시간·일·주 세 벌로 산출하므로, 단위를 가르지
 * 않고 읽으면 같은 대상이 세 번 세어진다 — 축 합계도, 대상별 행 수도, 점유율 합도 전부 3배가
 * 된다. **버킷 키로 고를 수 없다**: `2026-W26` 은 `2026-06-23T14` 보다 크게 정렬되지만 더
 * 나중이라서가 아니다. 그래서 키가 아니라 **단위 순위**로 고른다.
 */
function inFinestUnit<T extends { bucket_unit: string }>(rows: T[]): T[] {
  const present = new Set(rows.map((row) => row.bucket_unit));
  const unit = UNIT_RANK.find((candidate) => present.has(candidate));
  return unit === undefined ? [] : rows.filter((row) => row.bucket_unit === unit);
}

/** 기본 단위(= 존재하는 가장 고운 단위)의 `subject_trend` 행. 화면이 보는 것과 같은 슬라이스다. */
export function subjectTrends(dir: string = goldDir()): SubjectTrend[] {
  return inFinestUnit(subjectTrendsAllUnits(dir));
}

/** 기본 단위의 `axis_sentiment` 행. */
export function axisSentiments(dir: string = goldDir()): AxisSentiment[] {
  return inFinestUnit(axisSentimentsAllUnits(dir));
}

/**
 * 단위를 가르지 않은 원본 Gold. 롤업 자체를 재는 쪽(테스트 문서 시나리오 3)과, 위 필터가
 * 무언가를 조용히 가리고 있지 않은지 확인하는 쪽이 쓴다.
 */
export function subjectTrendsAllUnits(dir: string = goldDir()): SubjectTrend[] {
  return readJsonlFrom<SubjectTrend>(dir, "subject_trend");
}

export function axisSentimentsAllUnits(dir: string = goldDir()): AxisSentiment[] {
  return readJsonlFrom<AxisSentiment>(dir, "axis_sentiment");
}

/** 집계 묶음의 입력이 된 주기의 Bronze 관측. 교차표 재계산의 축·수집 시각이 여기서 온다. */
export function aggItems(): NewsItem[] {
  return newsItems(aggBronzeDir());
}

/** 집계 corpus 의 제목 -> (Bronze 관측, Silver 분석). 분석 묶음과 같은 조인을 자기 루트로 쓴다. */
export function aggByTitle(): Map<string, Analyzed> {
  return analyzedByTitle(aggAnalyses(), aggItems());
}

/**
 * (축, 버킷, 서술 대상) -> 건수 를 **원천에서 다시 센다**.
 *
 * 집계가 쓰는 조인·버킷 규칙을 그대로 따른다: Silver는 `record_id`로 Bronze에 되돌아 붙고
 * (V5/AC2.6), 버킷은 수집 시각을 시간 단위로 자른 접두사다. 한 기사가 서술 대상을 여러 개
 * 가지면 **대상마다 한 번씩** 센다 — 다중 값이 집계에서 손실되지 않는다는 것이 시나리오 4의
 * 기대 결과이므로, 재계산도 같은 규칙으로 세야 비교가 성립한다.
 *
 * 미분석 레코드는 서술 대상이 비어 있어 자연히 빠진다. 강제로 걸러내지 않는 이유는, 걸러내는
 * 쪽을 여기 적어 두면 제품이 미분석에 라벨을 채우기 시작해도 이 재계산이 같이 가려 주기
 * 때문이다 — 재계산은 원천을 그대로 옮겨야 검출기로 쓸모가 있다.
 */
export function crossTab(
  items: NewsItem[] = aggItems(),
  records: Analysis[] = aggAnalyses(),
): Map<string, number> {
  const byId = byRecordId(records);
  const counts = new Map<string, number>();
  for (const item of items) {
    const analysis = byId.get(item.record_id);
    if (!analysis) {
      throw new Error(`Bronze 레코드 ${item.record_id}(${item.title}) 의 Silver 분석이 없다`);
    }
    for (const subject of analysis.narrative_subjects) {
      const key = cellKey(item.axis, bucketOf(item), subject);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** `2026-03-02T09:12:34+00:00` -> `2026-03-02T09`. 집계의 `_bucket()` 과 같은 규칙이다. */
export function bucketOf(item: NewsItem): string {
  return item.collected_at.slice(0, 13);
}

/**
 * 셀 키의 구분자. **상수로 내보내는 이유**가 있다 — 이 구분자를 손으로 다시 쓴 자리가 한 번
 * 깨졌다. 키를 `축 버킷 대상` 으로 직접 조립한 단정이 있었고, 그때 `cellKey` 의 구분자는 눈에
 * 보이지 않는 NUL(`U+0000`)이라 두 문자열이 영원히 어긋났다(그 파일은 git 이 **바이너리로**
 * 취급해 diff 조차 나오지 않았다). 키를 만들거나 가르는 쪽은 전부 이 상수를 거친다.
 */
export const CELL_SEP = " ";

/** 교차표의 한 칸을 가리키는 키. Gold 행과 재계산 결과를 같은 문자열로 맞춘다. */
export function cellKey(axis: string, bucket: string, subject: string): string {
  return [axis, bucket, subject].join(CELL_SEP);
}

/** 한 축의 `subject_trend` 행만 고른다(단위는 호출자가 이미 정했고, 버킷은 e2e 한 주기라 한 개다). */
export function trendsOfAxis(rows: SubjectTrend[], axis: string): SubjectTrend[] {
  return rows.filter((row) => row.axis === axis);
}

/**
 * 축 안에서 한 서술 대상의 행을 집는다. 0개(누락)·2개 이상(표기가 병합되지 않아 행이 갈림)을
 * 그 자리에서 끊는다 — `find` 로 첫 행만 집으면 병합 실패가 조용히 통과한다.
 */
export function trendOf(rows: SubjectTrend[], axis: string, subject: string): SubjectTrend {
  const found = trendsOfAxis(rows, axis).filter((row) => row.subject === subject);
  if (found.length !== 1) {
    throw new Error(
      `축 ${axis} 의 서술 대상 ${JSON.stringify(subject)} 행이 ${found.length}개다 — 정확히 1개여야 한다`,
    );
  }
  return found[0];
}
