// 연결 기록 루트(`/data/record-links`)가 남긴 레코드를 읽는다 —
// `…-test-pipeline-ops.md#시나리오 3`(레코드·실행·호출 양방향 연결) 전용이다.
//
// 이 루트만 네 데이터셋을 **한꺼번에** 반출한다: Silver 행, 호출 기록, 실행 기록, 그리고
// 역추적의 종점인 Bronze 관측·본문. 시나리오 3 의 단정이 전부 「한쪽에 적힌 id 가 다른 쪽에서
// 실제로 열리는가」라서, 넷이 같은 실행에서 나온 한 벌이 아니면 그 질문 자체가 성립하지 않는다.

import { readFileSync } from "node:fs";
import path from "node:path";

import { type NewsBody, type NewsItem, newsBodies, newsItems } from "./bronze";
import { type LlmCall, llmCalls } from "./calllog";
import { type PipelineRun, pipelineRuns } from "./runlog";

/**
 * Silver `analysis` 행 중 이 시나리오가 읽는 필드 — `contracts/silver/analysis.avsc` 가 SSOT다.
 *
 * `lib/silver.ts` 의 `Analysis` 를 넓히지 않고 여기 따로 둔 것은, 그쪽 타입을 쓰는 분석·집계
 * spec 들이 연결 필드를 읽지 않기 때문이다 — 읽지 않는 필드를 타입에 얹으면 그 spec 들이
 * 무엇을 관측하는지가 흐려진다.
 */
export type AnalysisLink = {
  record_id: string;
  source_url: string;
  analysis_status: "analyzed" | "low_confidence" | "unanalyzed";
  analyzer_version: string;
  run_id: string;
  call_id: string | null;
  no_call_reason: string | null;
};

function exportedDir(variable: string): string {
  const dir = process.env[variable];
  if (!dir) {
    throw new Error(
      `${variable}가 비어 있다 — 연결 기록 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 배치가 쓴 레코드가 호스트로 반출된다.",
    );
  }
  return dir;
}

/** 연결 기록 루트의 Silver 전건(두 분석기 버전이 함께 들어 있다). */
export function linkAnalyses(): AnalysisLink[] {
  const target = path.join(exportedDir("E2E_SILVER_LINKS_DIR"), "analysis.jsonl");
  const rows = readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as AnalysisLink);
  if (rows.length === 0) {
    throw new Error(`${target} 에 레코드가 없다 — 분석 배치가 아무것도 쓰지 않았다`);
  }
  return rows;
}

export function linkCalls(): LlmCall[] {
  return llmCalls("E2E_LLM_CALL_LINKS_DIR");
}

export function linkRuns(): Map<string, PipelineRun> {
  return pipelineRuns("E2E_RUNLOG_LINKS_DIR");
}

/** 연결 기록 루트의 Bronze 관측(`record_id` -> 레코드). 역추적의 종점이다. */
export function linkItems(): Map<string, NewsItem> {
  const items = newsItems(exportedDir("E2E_BRONZE_LINKS_DIR"));
  return new Map(items.map((item) => [item.record_id, item]));
}

export function linkBodies(): Map<string, NewsBody> {
  const bodies = newsBodies(exportedDir("E2E_BRONZE_LINKS_DIR"));
  return new Map(bodies.map((body) => [body.body_hash, body]));
}

/** 한 실행이 쓴 Silver 행 — 행에 적힌 `run_id` 를 반대편에서 읽은 것이다. */
export function recordsOfRun(rows: AnalysisLink[], runId: string): AnalysisLink[] {
  return rows.filter((row) => row.run_id === runId);
}

/** 한 실행이 한 모델 호출 — 호출 기록에 적힌 `run_id` 를 반대편에서 읽은 것이다. */
export function callsOfRun(calls: LlmCall[], runId: string): LlmCall[] {
  return calls.filter((call) => call.run_id === runId);
}

/** 분석 단계를 밟은 실행만. 수집만 한 실행은 Silver 행을 쓰지 않는다. */
export function analysisRunIds(runs: Map<string, PipelineRun>): string[] {
  return [...runs.values()]
    .filter((run) => run.stages.some((stage) => stage.stage_name === "analysis"))
    .map((run) => run.run_id)
    .sort();
}

/** 한 레코드가 가진 분석기 버전들(정렬). 병존 판정의 출발점이다. */
export function versionsByRecord(rows: AnalysisLink[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const row of rows) {
    const bucket = grouped.get(row.record_id) ?? [];
    bucket.push(row.analyzer_version);
    grouped.set(row.record_id, bucket);
  }
  for (const [id, versions] of grouped) grouped.set(id, versions.sort());
  return grouped;
}
