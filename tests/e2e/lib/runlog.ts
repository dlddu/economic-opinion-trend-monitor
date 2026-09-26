// 계약의 SSOT 는 `contracts/silver/pipeline_run.avsc` 다. 여기 타입은 그 일부를 spec 이 읽기
// 쉬운 모양으로 옮긴 것이고, 계약이 바뀌면 이 파일이 아니라 그쪽이 먼저 바뀐다.

import { readFileSync } from "node:fs";
import path from "node:path";

export type RunOutcome = { outcome_name: string; outcome_count: number };

export type SourceFailure = { source_id: string; source_failure_reason: string };

export type RunStage = {
  stage_name: "ingestion" | "analysis" | "aggregation";
  stage_status: "succeeded" | "failed";
  stage_started_at: string;
  stage_ended_at: string;
  duration_ms: number;
  input_count: number;
  output_count: number;
  outcomes: RunOutcome[];
  failure_reason: string | null;
  source_failures: SourceFailure[];
};

export type PipelineRun = {
  run_id: string;
  run_trigger: "scheduled" | "reprocess";
  run_started_at: string;
  run_ended_at: string | null;
  run_status: "running" | "succeeded" | "failed";
  stages: RunStage[];
};

function exportedDir(variable: string): string {
  const dir = process.env[variable];
  if (!dir) {
    throw new Error(
      `${variable}가 비어 있다 — 실행 기록 하네스를 거치지 않고 spec이 실행됐다. ` +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 배치가 쓴 pipeline_run이 호스트로 반출된다.",
    );
  }
  return dir;
}

/**
 * 반출된 실행 레코드를 `run_id` -> 레코드로. 반출이 비면 조용히 넘기지 않고 끊는다.
 *
 * 루트를 가르는 이유는 두 시나리오가 **같은 레코드를 세기** 때문이다: 한 루트를 공유하면
 * 「이 실행이 만든 행」의 집합이 옆 시나리오의 주기에 오염된다.
 */
export function pipelineRuns(variable = "E2E_RUNLOG_OPS_DIR"): Map<string, PipelineRun> {
  const target = path.join(exportedDir(variable), "pipeline_run.jsonl");
  const runs = readFileSync(target, "utf-8")
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => JSON.parse(line) as PipelineRun);
  if (runs.length === 0) {
    throw new Error(`${target} 에 실행 레코드가 없다 — 배치가 실행 기록을 쓰지 않았다`);
  }
  return new Map(runs.map((run) => [run.run_id, run]));
}

/** 이름으로 한 실행을 집는다. 없으면 하네스와 spec 이 어긋난 것이므로 끊는다. */
export function run(runs: Map<string, PipelineRun>, runId: string): PipelineRun {
  const found = runs.get(runId);
  if (!found) {
    throw new Error(
      `실행 기록에 ${JSON.stringify(runId)} 가 없다 (있는 것: ${[...runs.keys()].join(", ")})`,
    );
  }
  return found;
}

/** 실행이 지나간 단계 이름들. 「닿지 못한 단계」는 여기 나타나지 않는다. */
export function stageNames(record: PipelineRun): string[] {
  return record.stages.map((stage) => stage.stage_name);
}

/** 단계 하나를 집는다. 없으면 그 단계가 돌지 않은 것이므로 단정이 아니라 예외로 끊는다. */
export function stage(record: PipelineRun, name: RunStage["stage_name"]): RunStage {
  const found = record.stages.find((candidate) => candidate.stage_name === name);
  if (!found) {
    throw new Error(
      `실행 ${record.run_id} 에 ${name} 단계 기록이 없다 (있는 것: ${stageNames(record).join(", ")})`,
    );
  }
  return found;
}

/** 처리 결과별 건수의 합. AC4.1 이 `input_count` 와 같기를 요구하는 값이다. */
export function outcomeTotal(target: RunStage): number {
  return target.outcomes.reduce((sum, outcome) => sum + outcome.outcome_count, 0);
}

/** 처리 결과를 이름 -> 건수로. 없는 통을 0으로 채우지 않는다(있는 통만 담는다). */
export function outcomes(target: RunStage): Map<string, number> {
  return new Map(target.outcomes.map((outcome) => [outcome.outcome_name, outcome.outcome_count]));
}

/** 이름으로 처리 결과 건수를 집는다. 통이 없으면 단정이 어긋난 것이므로 끊는다. */
export function outcomeCount(target: RunStage, name: string): number {
  const found = outcomes(target).get(name);
  if (found === undefined) {
    throw new Error(
      `${target.stage_name} 단계에 처리 결과 ${JSON.stringify(name)} 통이 없다 ` +
        `(있는 것: ${[...outcomes(target).keys()].join(", ")})`,
    );
  }
  return found;
}
