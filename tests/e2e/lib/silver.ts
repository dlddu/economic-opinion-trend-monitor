// 분석 배치가 클러스터 안에서 쓴 Silver를 읽는다. run.sh가 Job 완료 후 PVC에서 꺼내
// $E2E_SILVER_DIR(1차 분석) · $E2E_SILVER_V2_DIR(재분석)에 놓고, 여기서 JSONL을 파싱해
// spec에 넘긴다.
//
// **반출 지점이 둘인 이유**: 재분석은 같은 데이터셋을 *갱신*한다(`write_records` 가 교체한다).
// 재분석 Job이 돌고 나면 1차 결과는 더 이상 PVC에 없으므로, `…-test-analysis.md#시나리오 6`이
// 요구하는 "재분석 후에도 추적 키가 유지된다"를 보려면 1차 스냅샷을 두 Job 사이에 꺼내 둬야
// 한다. 3주기 수집(시나리오 7)이 주기 사이에 Bronze를 꺼내는 것과 같은 이유다.
//
// 분석 Job이 찍은 집계도 같이 읽는다. 저신뢰·미분석 건수와 모델 호출 실패 건수는 레코드만
// 봐서는 "모델이 판단을 유보했다"와 "아무도 응답하지 않았다"가 구별되지 않는데, 분석 CLI는
// 그 구별을 집계로 찍는다(`econ_analysis/cli.py`).

import { readFileSync } from "node:fs";
import path from "node:path";

import { analysisBronzeDir, newsItems, type NewsItem } from "./bronze";

/** Silver `analysis` 레코드 — contracts/silver/analysis.avsc 가 계약의 SSOT다. */
export type Analysis = {
  record_id: string;
  source_url: string;
  target_countries: string[];
  narrative_subjects: string[];
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  analysis_status: "analyzed" | "low_confidence" | "unanalyzed";
  confidence: number;
  analyzed_at: string;
  analyzer_version: string;
};

/** 한 분석 주기가 찍은 집계. 필드 이름은 CLI의 출력 토큰을 그대로 따른다. */
export type AnalysisSummary = {
  /** 읽어 들인 Bronze 관측 레코드 수. */
  readBronze: number;
  /** Silver에 쓰인 레코드 수. */
  wrote: number;
  /** 레코드에 찍힌 분석기 버전(`--analyzer-version`). */
  analyzer: string;
  /** 라벨은 있으나 신뢰도가 낮아 표시된 레코드 수. */
  lowConfidence: number;
  /** 모델이 판단하지 않아 강제 라벨 없이 남은 레코드 수. */
  unanalyzed: number;
  /** 본문이 있어 모델까지 간 건수. */
  attempted: number;
  /** 그중 응답이 쓸 수 없어 실패한 건수. 픽스처 누락이 여기로 드러난다. */
  failed: number;
};

function exportedDir(variable: string): string {
  const dir = process.env[variable];
  if (!dir) {
    throw new Error(
      `${variable}가 비어 있다 — 분석 배치 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job이 쓴 Silver가 호스트로 반출된다.",
    );
  }
  return dir;
}

function readAnalyses(dir: string): Analysis[] {
  const target = path.join(dir, "analysis.jsonl");
  const records = readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as Analysis);
  if (records.length === 0) {
    throw new Error(`${target} 에 레코드가 없다 — 분석 Job이 아무것도 쓰지 않았다`);
  }
  return records;
}

/** 1차 분석(`e2e-llm-v1`, analyzer=llm-v1)이 쓴 Silver. */
export function analyses(): Analysis[] {
  return readAnalyses(exportedDir("E2E_SILVER_DIR"));
}

/** 재분석(`e2e-llm-v2`, analyzer=llm-v2)이 갱신한 Silver. */
export function reanalyses(): Analysis[] {
  return readAnalyses(exportedDir("E2E_SILVER_V2_DIR"));
}

/**
 * 집계 묶음(`e2e-llm-agg`)이 쓴 Silver. 분석 묶음과 **corpus 가 다르다** — 같은 루트를 쓰면
 * 분석 spec 들의 건수 단정이 집계 corpus 의 열 건에 오염된다.
 */
export function aggAnalyses(): Analysis[] {
  return readAnalyses(exportedDir("E2E_SILVER_AGG_DIR"));
}

/**
 * 롤업 루트로 이식된 Silver. 타임시프트는 이 데이터셋을 **바이트 그대로** 옮기므로 집계
 * 묶음의 Silver 와 같아야 한다 — 시나리오 3의 spec 이 그 동일성부터 확인한다(다르면 재계수의
 * 기준이 무너진 것이고, 롤업이 아니라 하네스를 재고 있는 것이다).
 */
export function rollupAnalyses(): Analysis[] {
  return readAnalyses(exportedDir("E2E_SILVER_ROLLUP_DIR"));
}

/** `record_id` 로 찾기 쉽게 묶는다. 역추적 단정의 공통 출발점이다. */
export function byRecordId(records: Analysis[]): Map<string, Analysis> {
  return new Map(records.map((record) => [record.record_id, record]));
}

/** 한 기사의 Bronze 관측과 그 Silver 분석을 나란히 둔 짝. */
export type Analyzed = { item: NewsItem; analysis: Analysis };

/**
 * 제목 -> (Bronze 관측, Silver 분석). 네 분석 spec 이 공통으로 쓰는 조인이다.
 *
 * 제목을 키로 쓰는 이유는 더블의 응답 픽스처가 제목으로 색인돼 있어서다(제품 경로가 제목을
 * 프롬프트 첫 줄에 싣는다). `record_id` 는 주기·소스·링크에서 파생되므로 픽스처만 보고는
 * 알 수 없다. 제목이 겹치면 조인이 조용히 한 건을 덮으므로 그 자리에서 끊는다.
 *
 * Bronze 쪽을 인자로 열어 둔 것은 집계 묶음이 **자기 corpus** 로 같은 조인을 쓰기 때문이다
 * (`lib/gold.ts: aggByTitle`). 기본값은 분석 묶음이라 기존 호출부는 그대로다.
 */
export function analyzedByTitle(
  records: Analysis[] = analyses(),
  items: NewsItem[] = newsItems(analysisBronzeDir()),
): Map<string, Analyzed> {
  const byId = byRecordId(records);
  const joined = new Map<string, Analyzed>();
  for (const item of items) {
    const analysis = byId.get(item.record_id);
    if (!analysis) {
      throw new Error(`Bronze 레코드 ${item.record_id}(${item.title}) 의 Silver 분석이 없다`);
    }
    if (joined.has(item.title)) {
      throw new Error(`제목이 겹친다: ${item.title} — 픽스처의 제목은 유일해야 한다`);
    }
    joined.set(item.title, { item, analysis });
  }
  return joined;
}

/** 제목으로 한 건을 집는다. 없으면 픽스처와 spec 이 어긋난 것이므로 끊는다. */
export function analyzedTitled(joined: Map<string, Analyzed>, title: string): Analyzed {
  const found = joined.get(title);
  if (!found) throw new Error(`분석 묶음에 제목 ${JSON.stringify(title)} 의 기사가 없다`);
  return found;
}

function need(raw: string, pattern: RegExp, what: string, job: string): RegExpMatchArray {
  const found = raw.match(pattern);
  if (!found) {
    throw new Error(
      `${job} 로그에서 ${what} 를 못 읽었다 — 분석 CLI의 출력 형식이 바뀌었을 수 있다.\n${raw}`,
    );
  }
  return found;
}

/** 한 분석 Job의 로그를 집계로 읽는다. 형식이 어긋나면 조용히 0을 주지 않고 예외로 끊는다. */
export function analysisSummary(job: string): AnalysisSummary {
  const dir = process.env.E2E_INGEST_LOG_DIR;
  if (!dir) {
    throw new Error(
      "E2E_INGEST_LOG_DIR가 비어 있다 — 배치 하네스를 거치지 않고 spec이 실행됐다. " +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job 로그가 호스트로 반출된다.",
    );
  }
  const raw = readFileSync(path.join(dir, `${job}.log`), "utf-8");
  const head = need(raw, /read (\d+) bronze, wrote (\d+) silver records/, "읽기·쓰기 건수", job);
  const flags = need(
    raw,
    /analyzer=(\S+) low_confidence=(\d+) unanalyzed=(\d+)/,
    "분석기·저신뢰·미분석 집계",
    job,
  );
  const calls = need(raw, /model calls: attempted=(\d+) failed=(\d+)/, "모델 호출 집계", job);
  return {
    readBronze: Number.parseInt(head[1], 10),
    wrote: Number.parseInt(head[2], 10),
    analyzer: flags[1],
    lowConfidence: Number.parseInt(flags[2], 10),
    unanalyzed: Number.parseInt(flags[3], 10),
    attempted: Number.parseInt(calls[1], 10),
    failed: Number.parseInt(calls[2], 10),
  };
}
