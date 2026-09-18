// 수집 배치가 클러스터 안에서 쓴 Bronze를 읽는다. run.sh가 Job 완료 후 PVC에서 꺼내
// $E2E_BRONZE_DIR 에 놓고, 여기서 JSONL을 파싱해 spec에 넘긴다.
//
// 반출 지점은 넷이다 — 정상 1주기($E2E_BRONZE_DIR), 고장 주입 주기($E2E_BRONZE_FAULTS_DIR),
// 3주기 연속 실행($E2E_BRONZE_CYCLES_DIR/cycleN), 분석 묶음의 입력 주기
// ($E2E_BRONZE_ANALYSIS_DIR). 넷을 한 루트에 섞지 않는 이유는 각자의 단정이 서로의 레코드에
// 오염되기 때문이다(정상 주기의 소스별 건수 단정이 대표적이다).
//
// 이 디렉터리는 `specs/` 밖이다 — `tests/e2e/specs/*.spec.ts` 만이 시나리오 매칭 단위이고
// (docs/econ-opinion-monitor-doc-tracker.md 「e2e 매핑 › 매칭 규약」), 헬퍼가 그 집합에
// 섞이면 `check_scenario_mapping.py` 가 선언 없는 매칭 단위로 읽는다.

import { readFileSync } from "node:fs";
import path from "node:path";

/** Bronze `news_item` 레코드 — contracts/bronze/news_item.avsc 가 계약의 SSOT다. */
export type NewsItem = {
  record_id: string;
  source_id: string;
  axis: string;
  rank: number;
  view_count: number;
  title: string;
  source_url: string;
  body_hash: string;
  body_available: boolean;
  collected_at: string;
  collection_cycle: string;
};

/** Bronze `news_body` 레코드 — 본문은 해시로 주소화돼 별도 데이터셋에 산다. */
export type NewsBody = {
  body_hash: string;
  raw_text: string;
  first_seen_at: string;
  first_seen_cycle: string;
};

/** 반출 디렉터리를 환경변수에서 읽는다. 비어 있으면 "하네스를 안 거쳤다"는 진단으로 끊는다. */
function exportedDir(variable: string): string {
  const dir = process.env[variable];
  if (!dir) {
    throw new Error(
      `${variable}가 비어 있다 — 수집 배치 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job이 쓴 Bronze가 호스트로 반출된다.",
    );
  }
  return dir;
}

function bronzeDir(): string {
  return exportedDir("E2E_BRONZE_DIR");
}

/** 고장 주입 주기(시나리오 6)가 쓴 Bronze. */
export function faultsDir(): string {
  return exportedDir("E2E_BRONZE_FAULTS_DIR");
}

/** 3주기 연속 실행(시나리오 7)의 N번째 주기 스냅샷. */
export function cycleDir(cycle: number): string {
  return path.join(exportedDir("E2E_BRONZE_CYCLES_DIR"), `cycle${cycle}`);
}

/** 분석 묶음(`…-test-analysis.md`)의 입력이 된 주기의 Bronze. Silver의 역추적 대상이다. */
export function analysisBronzeDir(): string {
  return exportedDir("E2E_BRONZE_ANALYSIS_DIR");
}

function readJsonlFrom<T>(dir: string, dataset: string): T[] {
  const target = path.join(dir, `${dataset}.jsonl`);
  const raw = readFileSync(target, "utf-8");
  const records = raw
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as T);
  if (records.length === 0) {
    throw new Error(`${target} 에 레코드가 없다 — 수집 Job이 아무것도 쓰지 않았다`);
  }
  return records;
}

export function newsItems(dir: string = bronzeDir()): NewsItem[] {
  return readJsonlFrom<NewsItem>(dir, "news_item");
}

export function newsBodies(dir: string = bronzeDir()): NewsBody[] {
  return readJsonlFrom<NewsBody>(dir, "news_body");
}

/** `source_id` 로 묶은 관측 레코드. 소스별 단정(상위 N·축·메타데이터)의 공통 출발점이다. */
export function itemsBySource(items: NewsItem[]): Map<string, NewsItem[]> {
  const grouped = new Map<string, NewsItem[]>();
  for (const item of items) {
    const bucket = grouped.get(item.source_id) ?? [];
    bucket.push(item);
    grouped.set(item.source_id, bucket);
  }
  return grouped;
}
