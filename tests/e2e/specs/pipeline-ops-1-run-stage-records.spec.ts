// 검증 시나리오: econ-opinion-monitor-test-pipeline-ops.md#시나리오 1
//
// **관측 대상은 화면도 Job 로그도 아니라 레이크에 남은 실행 레코드다.** AC4.1 이 그렇게 설계된
// 이유를 구현이 스스로 적어 두었다(`econ_core/runlog.py`): 세 단계는 세 Pod 이고, 스케줄러는
// 최근 실행만 남기며 Pod 로그는 노드와 함께 사라지므로, 각 단계가 자기 보고를 공유 볼륨의
// 실행 레코드에 접어 넣는다. 그래서 하네스는 이 루트의 Job 다섯 개를 **지운 뒤** `pipeline_run`
// 을 반출하고(run.sh 4g), 아래 단정은 전부 그 반출본 위에서 돈다 — 시나리오의 실행 단계 (3)
// 「스케줄러의 실행 이력을 정리한 뒤 두 실행의 기록을 조회한다」가 그 삭제이고, 기대 결과
// 「스케줄러 이력 정리 후에도 두 기록이 조회된다」가 이 파일이 레코드를 읽을 수 있다는 사실이다.
// e2e 에 Argo 컨트롤러가 없으므로(그 부재는 `…-test-ingestion.md#시나리오 1` 의 예외 사유이기도
// 하다) Job 과 그 Pod 로그가 이 하네스의 스케줄러 이력이다.
//
// **두 실행을 가르는 것은 `ECON_RUN_ID` 하나다.** 운영에서는 Argo WorkflowTemplate 이
// `{{workflow.name}}` 을 세 스텝에 같은 값으로 넣고, 하네스는 같은 변수를 Job 매니페스트에
// 박는다 — 그것 말고는 제품 경로 그대로다. `e2e-ops-run-ok` 는 세 단계를 다 지나가고,
// `e2e-ops-run-stopped` 는 분석 상류를 해석되지 않는 주소로 돌려 그 단계에서 멈춘다.
//
// **건수는 리터럴로 적지 않는다.** 시나리오가 요구하는 것은 특정 숫자가 아니라 **관계**다 —
// 처리 결과별 건수의 합이 입력 건수와 같고, 앞 단계 출력이 다음 단계 입력과 맞물린다. 그래서
// 아래 단정은 레코드 안의 값끼리 비교한다. 픽스처를 한 건 늘리면 숫자는 바뀌지만 관계는 그대로
// 성립해야 하고, 리터럴로 적으면 그 순간 이 spec 은 시나리오가 아니라 픽스처를 재게 된다.
//
// **맞물림이 첫 실행에만 걸리는 이유**도 시나리오 문면 그대로다. 둘째 실행의 분석 입력에는 첫
// 실행이 확정해 둔 레코드가 `skipped_settled` 로 섞여 들어오므로(사전 조건 「이미 분석된 기사와
// 새 기사가 섞인 Bronze」가 바로 그 상태다) 그 실행의 수집 출력과 분석 입력은 같지 않다. 대신
// 그 둘의 차이가 첫 실행이 쓴 건수와 같다는 것을 따로 단정해, 섞임이 우연이 아님을 잠근다.

import { expect, test } from "@playwright/test";

import {
  outcomeCount,
  outcomeTotal,
  pipelineRuns,
  run,
  stage,
  stageNames,
  type PipelineRun,
  type RunStage,
} from "../lib/runlog";

const WHOLE_RUN = "e2e-ops-run-ok";
const STOPPED_RUN = "e2e-ops-run-stopped";
/** 수집 구성에 섞어 둔, 항상 실패하는 소스(더블의 `/__fail__/`). */
const DOWN_SOURCE = "e2e-ops-down";

/**
 * 반출본을 테스트 안에서 읽는다(이 하네스의 기존 관례). 모듈 최상위에서 읽으면 하네스를 거치지
 * 않은 수집(`playwright test --list`)이 파일 전체를 못 여는 오류로 끊긴다.
 */
function bothRuns(): { whole: PipelineRun; stopped: PipelineRun } {
  const runs = pipelineRuns();
  return { whole: run(runs, WHOLE_RUN), stopped: run(runs, STOPPED_RUN) };
}

/** 시각 필드가 실제 시각인지. 값이 있다는 것만으로는 「기록됐다」가 되지 않는다. */
function instant(raw: string | null): number {
  expect(raw).not.toBeNull();
  const parsed = Date.parse(raw as string);
  expect(Number.isNaN(parsed), `시각으로 읽히지 않는다: ${raw}`).toBe(false);
  return parsed;
}

test.describe("두 실행 모두 실행 ID·트리거·시작/종료·최종 상태를 남긴다", () => {
  test("Job 을 지운 뒤에도 두 실행의 기록이 레이크에서 조회된다", () => {
    // 실행 단계 (3)의 기대 결과. 반출이 Job 삭제 뒤에 일어나므로 여기서 두 건이 읽히는 것이
    // 곧 「스케줄러 이력 정리 후에도 조회된다」다.
    expect([...pipelineRuns().keys()].sort()).toEqual([WHOLE_RUN, STOPPED_RUN].sort());
  });

  for (const [label, pick] of [
    ["정상 실행", (both: ReturnType<typeof bothRuns>) => both.whole],
    ["중단 실행", (both: ReturnType<typeof bothRuns>) => both.stopped],
  ] as const) {
    test(`${label}의 실행 헤더가 채워져 있다`, () => {
      const record: PipelineRun = pick(bothRuns());
      expect(record.run_trigger).toBe("scheduled");
      const started = instant(record.run_started_at);
      const ended = instant(record.run_ended_at);
      expect(ended).toBeGreaterThanOrEqual(started);
      // `running` 이면 단계 기록이 레코드에 접히기 전에 끊긴 것이다.
      expect(record.run_status).not.toBe("running");
    });

    test(`${label}의 모든 단계에서 처리 결과별 건수의 합이 입력 건수와 같다`, () => {
      const record: PipelineRun = pick(bothRuns());
      expect(record.stages.length).toBeGreaterThan(0);
      for (const target of record.stages) {
        expect(
          outcomeTotal(target),
          `${target.stage_name}: 통이 입력을 빠짐없이 겹치지 않게 나누지 않는다`,
        ).toBe(target.input_count);
      }
    });
  }
});

test.describe("정상 실행 — 세 단계가 맞물리고 실패 소스가 기록된다", () => {
  test("최종 상태가 succeeded 이고 세 단계가 모두 성공으로 남는다", () => {
    const { whole } = bothRuns();
    expect(stageNames(whole)).toEqual(["ingestion", "analysis", "aggregation"]);
    expect(whole.run_status).toBe("succeeded");
    for (const target of whole.stages) {
      expect(target.stage_status, `${target.stage_name} 단계`).toBe("succeeded");
    }
  });

  test("앞 단계 출력이 다음 단계 입력과 맞물린다", () => {
    const { whole } = bothRuns();
    const ingestion = stage(whole, "ingestion");
    const analysis = stage(whole, "analysis");
    const aggregation = stage(whole, "aggregation");
    // 빈 레이크에서 시작한 실행이라 수집이 쓴 관측이 그대로 분석의 입력이다.
    expect(outcomeCount(analysis, "skipped_settled")).toBe(0);
    expect(analysis.input_count).toBe(ingestion.output_count);
    expect(aggregation.input_count).toBe(analysis.output_count);
    // 맞물림이 「둘 다 0」으로 공허하게 성립하는 경로를 막는다.
    expect(ingestion.output_count).toBeGreaterThan(0);
  });

  test("실패한 소스와 그 사유가 수집 단계에 기록된다", () => {
    const { whole } = bothRuns();
    const ingestion = stage(whole, "ingestion");
    const named = ingestion.source_failures.map((failure) => failure.source_id);
    expect(named).toContain(DOWN_SOURCE);
    const failure = ingestion.source_failures.find((one) => one.source_id === DOWN_SOURCE);
    expect(failure?.source_failure_reason ?? "").not.toHaveLength(0);
    // 격리는 중단이 아니다 — 나머지 소스의 관측은 그대로 들어와 있다.
    expect(ingestion.output_count).toBeGreaterThan(0);
    // 실패한 소스는 분류할 관측이 없으므로 처리 결과 통이 아니라 이 목록에만 나타난다.
    expect(outcomeTotal(ingestion)).toBe(ingestion.input_count);
  });

  test("다른 단계에는 소스 실패가 없다", () => {
    const { whole } = bothRuns();
    for (const name of ["analysis", "aggregation"] as const) {
      expect(stage(whole, name).source_failures).toEqual([]);
    }
  });
});

test.describe("중단 실행 — 분석 단계가 실패로, 집계는 실행되지 않은 것으로 남는다", () => {
  test("최종 상태가 failed 이고 분석 단계가 실패로 기록된다", () => {
    const { stopped } = bothRuns();
    expect(stopped.run_status).toBe("failed");
    const analysis: RunStage = stage(stopped, "analysis");
    expect(analysis.stage_status).toBe("failed");
    expect(analysis.failure_reason ?? "").toMatch(/model calls failed/);
    // 수집은 이 실행에서도 성공했다 — 멈춘 것은 그 다음 단계다.
    expect(stage(stopped, "ingestion").stage_status).toBe("succeeded");
  });

  test("집계 단계는 기록에 없다", () => {
    const { stopped } = bothRuns();
    // 부재가 관측 대상이다. 집계 Job 을 이 실행에 두지 않았으므로 단계가 아예 없어야 하고,
    // 「돌았지만 0건」이나 「실패로 기록됨」과 구별된다.
    expect(stageNames(stopped)).toEqual(["ingestion", "analysis"]);
  });

  test("중단 시점까지의 건수가 읽히고, 닿지 못한 입력이 그 차이를 메운다", () => {
    const { whole, stopped } = bothRuns();
    const analysis = stage(stopped, "analysis");
    const settled = outcomeCount(analysis, "skipped_settled");
    const failed = outcomeCount(analysis, "call_failed");
    // 사전 조건 「이미 분석된 기사와 새 기사가 섞인 Bronze」의 기계적 확인: 확정분은 앞 실행이
    // 쓴 건수이고, 호출이 실패한 것은 이 실행이 새로 수집한 건수다.
    expect(settled).toBe(stage(whole, "analysis").output_count);
    expect(failed).toBe(stage(stopped, "ingestion").output_count);
    expect(failed).toBeGreaterThan(0);
    expect(analysis.input_count).toBe(settled + failed);
    // 한 배치가 전건 실패해 그 자리에서 끊었으므로 Silver 에 쓴 것은 없다.
    expect(analysis.output_count).toBe(0);
  });
});
