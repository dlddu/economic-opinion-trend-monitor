// 검증 시나리오: econ-opinion-monitor-test-pipeline-ops.md#시나리오 1
//
// **건수는 리터럴로 적지 않는다.** 시나리오가 요구하는 것은 특정 숫자가 아니라 **관계**다 —
// 처리 결과별 건수의 합이 입력 건수와 같고, 앞 단계 출력이 다음 단계 입력과 맞물린다. 그래서
// 아래 단정은 레코드 안의 값끼리 비교한다. 픽스처를 한 건 늘리면 숫자는 바뀌지만 관계는 그대로
// 성립해야 하고, 리터럴로 적으면 그 순간 이 spec 은 시나리오가 아니라 픽스처를 재게 된다.

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
