// 수집 배치가 클러스터 안에서 쓴 Bronze를 읽는다. run.sh가 Job 완료 후 PVC에서 꺼내
// $E2E_BRONZE_DIR 에 놓고, 여기서 JSONL을 파싱해 spec에 넘긴다.
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

function bronzeDir(): string {
  const dir = process.env.E2E_BRONZE_DIR;
  if (!dir) {
    throw new Error(
      "E2E_BRONZE_DIR가 비어 있다 — 수집 배치 하네스를 거치지 않고 spec이 실행됐다. " +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job이 쓴 Bronze가 호스트로 반출된다.",
    );
  }
  return dir;
}

function readJsonl<T>(dataset: string): T[] {
  const target = path.join(bronzeDir(), `${dataset}.jsonl`);
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

export function newsItems(): NewsItem[] {
  return readJsonl<NewsItem>("news_item");
}

export function newsBodies(): NewsBody[] {
  return readJsonl<NewsBody>("news_body");
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
