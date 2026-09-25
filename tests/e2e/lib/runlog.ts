// 배치가 레이크에 쓴 실행·단계 기록(`silver/pipeline_run`)을 읽는다. run.sh 가 이 루트의 Job 을
// **지운 뒤** PVC 에서 꺼내 $E2E_RUNLOG_OPS_DIR 에 놓고, 여기서 JSONL 을 파싱해 spec 에 넘긴다.
//
// **왜 레이크인가**: 운영의 세 단계는 Argo 의 세 스텝, 즉 세 Pod 이고, 스케줄러는 최근 실행만
// 남기고 Pod 로그는 노드와 함께 사라진다. AC4.1 은 그 둘보다 오래 사는 기록을 요구하므로 각
// 단계가 자기 보고를 공유 볼륨의 실행 레코드에 접어 넣는다(`econ_core/runlog.py`). 그래서 이
// 리더의 입력이 Job 로그가 아니라 반출된 데이터셋인 것 자체가 그 설계의 관측이다.
//
// 계약의 SSOT 는 `contracts/silver/pipeline_run.avsc` 다. 여기 타입은 그 일부를 spec 이 읽기
// 쉬운 모양으로 옮긴 것이고, 계약이 바뀌면 이 파일이 아니라 그쪽이 먼저 바뀐다.

import { readFileSync } from "node:fs";
import path from "node:path";

/** 한 단계의 처리 결과별 건수. 통은 서로 겹치지 않아 합이 `input_count` 다(AC4.1). */
export type RunOutcome = { outcome_name: string; outcome_count: number };

/** 재시도를 다 쓰고도 못 가져와 격리된 소스와 그 사유. 수집 단계에만 채워진다. */
export type SourceFailure = { source_id: string; source_failure_reason: string };

/** 실행 레코드 안의 한 단계. 실행이 닿지 못한 단계는 애초에 배열에 없다. */
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

/** 배치 실행 하나. `run_id` 가 객체 키라 실행마다 파일 하나다. */
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

/** 반출된 실행 레코드를 `run_id` -> 레코드로. 반출이 비면 조용히 넘기지 않고 끊는다. */
export function pipelineRuns(): Map<string, PipelineRun> {
  const target = path.join(exportedDir("E2E_RUNLOG_OPS_DIR"), "pipeline_run.jsonl");
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
