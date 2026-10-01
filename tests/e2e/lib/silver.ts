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
  subject_categories: string[] | null;
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  analysis_status: "analyzed" | "low_confidence" | "unanalyzed";
  confidence: number;
  analyzed_at: string;
  analyzer_version: string;
};

export type AnalysisSummary = {
  readBronze: number;
  wrote: number;
  analyzer: string;
  lowConfidence: number;
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

/** 롤업 루트로 이식된 Silver. */
export function rollupAnalyses(): Analysis[] {
  return readAnalyses(exportedDir("E2E_SILVER_ROLLUP_DIR"));
}

/**
 * 집계가 한 분석을 세는 키 — 카테고리가 있으면 카테고리, 없으면 서술 대상. 제품의
 * `econ_core.silver.grouping_keys` 와 같아야 한다: 갈리면 재계산이 Gold 와 다른 칸을 센다.
 */
export function groupingKeys(analysis: Analysis): string[] {
  return analysis.subject_categories ?? analysis.narrative_subjects;
}

export function byRecordId(records: Analysis[]): Map<string, Analysis> {
  return new Map(records.map((record) => [record.record_id, record]));
}

export type Analyzed = { item: NewsItem; analysis: Analysis };

/**
 * 제목 -> (Bronze 관측, Silver 분석).
 *
 * 제목을 키로 쓰는 이유는 더블의 응답 픽스처가 제목으로 색인돼 있어서다(제품 경로가 제목을
 * 프롬프트 첫 줄에 싣는다). `record_id` 는 주기·소스·링크에서 파생되므로 픽스처만 보고는
 * 알 수 없다. 제목이 겹치면 조인이 조용히 한 건을 덮으므로 그 자리에서 끊는다.
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
