// 검증 시나리오: econ-opinion-monitor-test-pipeline-ops.md#시나리오 3

import { expect, test } from "@playwright/test";

import { type LlmCall } from "../lib/calllog";
import {
  type AnalysisLink,
  analysisRunIds,
  callsOfRun,
  linkAnalyses,
  linkBodies,
  linkCalls,
  linkItems,
  linkRuns,
  recordsOfRun,
  versionsByRecord,
} from "../lib/recordlinks";

const SCOPED_SOURCE = "e2e-links-desk";
const BASE_VERSION = "llm-v1";
const REPROCESS_VERSION = "llm-v2";
const REPROCESS_RUN = "e2e-links-run-3";

/** 한 행이 가리키는 호출 기록. 계약상 `call_id` 가 있으면 반드시 열려야 한다. */
function callOf(row: AnalysisLink, byId: Map<string, LlmCall>): LlmCall {
  const id = row.call_id;
  expect(id, `${row.record_id}(${row.analyzer_version}) 에 call_id 가 없다`).not.toBeNull();
  const call = byId.get(id as string);
  expect(call, `호출 기록 ${id} 가 레이크에 없다 — 행이 존재하지 않는 호출을 가리킨다`)
    .toBeDefined();
  return call as LlmCall;
}

test("pipeline-ops: every silver row reaches the run that wrote it", () => {
  const rows = linkAnalyses();
  const runs = linkRuns();

  // 코퍼스가 시나리오의 전제를 실제로 만족하는지 먼저 끊는다. 한 통이라도 비면 아래 단정들은
  // 조용히 통과하고, 그 초록은 "연결이 성립한다"가 아니라 "그 유형이 없었다"는 뜻이 된다.
  const statuses = new Set(rows.map((row) => row.analysis_status));
  expect([...statuses].sort()).toEqual(["analyzed", "low_confidence", "unanalyzed"]);

  for (const row of rows) {
    const run = runs.get(row.run_id);
    expect(run, `행 ${row.record_id}(${row.analyzer_version}) 의 실행 ${row.run_id} 가 없다`)
      .toBeDefined();
    // 실행 기록이 있다는 것만으로는 부족하다 — 그 실행이 **분석을 한** 실행이어야 행을 쓸 수 있다.
    expect(run?.stages.map((stage) => stage.stage_name)).toContain("analysis");
  }
});

test("pipeline-ops: a row either names its call or says why there was none", () => {
  const rows = linkAnalyses();
  const byId = new Map(linkCalls().map((call) => [call.call_id, call]));

  // 두 갈래가 **둘 다** 있어야 이 배타 단정이 양방향으로 하중을 받는다. 한쪽이 비면 남은
  // 한쪽만으로도 배타는 참이라, 없는 갈래를 잘못 만들어도 이 테스트가 잡지 못한다.
  const called = rows.filter((row) => row.call_id !== null);
  const uncalled = rows.filter((row) => row.call_id === null);
  expect(called.length).toBeGreaterThan(0);
  expect(uncalled.length).toBeGreaterThan(0);

  for (const row of rows) {
    // AC4.3 의 배타: 하나는 늘 채워져 있고 둘이 동시에 채워지지는 않는다 — 어떤 행도 자기
    // 판단이 어디서 왔는지에 대해 침묵하지 않는다.
    expect(
      (row.call_id === null) !== (row.no_call_reason === null),
      `${row.record_id}(${row.analyzer_version}) 의 call_id/no_call_reason 이 배타적이지 않다`,
    ).toBe(true);
  }

  for (const row of called) {
    const call = callOf(row, byId);
    // 호출 기록은 그 행을 만든 **바로 그 실행**의 것이어야 한다. 실행이 다르면 행이 남의
    // 호출을 가리키는 것이고, 재처리가 앞 버전의 호출을 물려받는 사고가 여기서 드러난다.
    expect(call.run_id).toBe(row.run_id);
    expect(call.record_id).toBe(row.record_id);
  }

  // 미호출 사유는 계약이 doc 에 열거한 두 값뿐이다. 새 사유가 생기면 이 목록과 계약 doc 이
  // 함께 움직여야 한다 — 자유 문자열이 되면 「왜 호출하지 않았는가」가 집계 불가능해진다.
  for (const row of uncalled) {
    expect(["body_unavailable", "keyword_analyzer"]).toContain(row.no_call_reason);
    expect(row.analysis_status).toBe("unanalyzed");
  }
});

test("pipeline-ops: a replayed reply reaches the call it replays", () => {
  const calls = linkCalls();
  const byId = new Map(calls.map((call) => [call.call_id, call]));
  const reused = calls.filter((call) => call.call_outcome === "reused");

  // 재사용 갈래가 없으면 이 테스트 전체가 공허하다.
  expect(reused.length).toBeGreaterThan(0);

  for (const call of reused) {
    // 행은 원 호출을 **직접** 가리키지 않는다. 한 홉(행 -> 이 실행의 재사용 기록 ->
    // `reused_from_call_id`)을 두는 것이 AC4.3 의 설계 판단이고(analysis.avsc 의 doc 이 그
    // 근거를 적는다), 직접 참조로 만들면 호출 기록 이전에 쌓인 캐시 항목에서 가리킬 대상이
    // 없어 부분 함수가 된다. 그 한 홉이 실제로 닫히는지가 여기서 관측된다.
    expect(call.reused_from_call_id).not.toBeNull();
    const origin = byId.get(call.reused_from_call_id as string);
    expect(origin, `원 호출 ${call.reused_from_call_id} 가 레이크에 없다`).toBeDefined();

    // 원 호출은 **다른 실행**의 것이고, 재사용이 성립한 근거인 프롬프트 동일성을 공유하며,
    // 돌려준 응답도 같다. 셋이 함께 성립해야 "같은 답을 다시 쓴 것"이라 말할 수 있다.
    expect(origin?.run_id).not.toBe(call.run_id);
    expect(origin?.prompt_sha256).toBe(call.prompt_sha256);
    expect(origin?.response_raw).toBe(call.response_raw);
    // 재사용은 전송하지 않는다 — 그래서 원 호출이 있어야만 응답 원문을 말할 수 있다.
    expect(call.call_attempt_count).toBe(0);
  }
});

test("pipeline-ops: a run's own record and call lists match what points back at it", () => {
  const rows = linkAnalyses();
  const calls = linkCalls();
  const runs = linkRuns();
  const analysisRuns = analysisRunIds(runs);

  // 실행이 하나뿐이면 「그 실행을 가리킨 집합」이 곧 전체라 아래 단정이 공허하다.
  expect(analysisRuns.length).toBeGreaterThan(1);

  let accountedRows = 0;
  let accountedCalls = 0;
  for (const runId of analysisRuns) {
    const madeRows = recordsOfRun(rows, runId);
    const madeCalls = callsOfRun(calls, runId);
    expect(madeRows.length, `실행 ${runId} 이 아무 행도 쓰지 않았다`).toBeGreaterThan(0);
    accountedRows += madeRows.length;
    accountedCalls += madeCalls.length;

    // 역방향 목록을 **저장된 다른 쪽 사실**과 맞춘다. 실행 레코드의 분석 단계는 자기가 쓴 행
    // 수를 `output_count` 로 들고 있고, 행을 훑어 만든 목록은 그 수와 같아야 한다. 이 코퍼스는
    // 재시도가 없도록 짜여 있어(wire 픽스처 머리말) 등식이 정확히 성립한다 — 재시도가 있으면
    // 뒤 실행이 같은 (레코드, 버전) 행을 덮어써 앞 실행 쪽이 정당하게 작아진다.
    const analysis = runs.get(runId)?.stages.find((stage) => stage.stage_name === "analysis");
    expect(analysis?.output_count, `실행 ${runId} 의 분석 단계 집계와 행 수가 다르다`)
      .toBe(madeRows.length);

    // 그 실행의 호출 기록은 그 실행이 쓴 행들이 가리킨 호출과 **정확히** 같다. 남는 호출이
    // 있으면 어떤 행도 책임지지 않는 호출을 한 것이고, 모자라면 행이 남의 호출을 가리킨 것이다.
    expect(new Set(madeCalls.map((call) => call.call_id)))
      .toEqual(new Set(madeRows.map((row) => row.call_id).filter((id) => id !== null)));
  }

  // 실행별 목록을 다 더하면 레이크 전체가 된다 — 어떤 행도, 어떤 호출도 실행 없이 떠 있지
  // 않고 두 실행에 동시에 속하지도 않는다. 위 루프가 분석 실행만 훑으므로, 이 등식은 수집만
  // 한 실행이 Silver 나 호출을 남기지 않았다는 것까지 함께 말한다.
  expect(accountedRows).toBe(rows.length);
  expect(accountedCalls).toBe(calls.length);
});

test("pipeline-ops: coexisting versions name different runs and calls, and share one Bronze origin", () => {
  const rows = linkAnalyses();
  const items = linkItems();
  const bodies = linkBodies();
  const byId = new Map(linkCalls().map((call) => [call.call_id, call]));
  const byRecord = versionsByRecord(rows);

  const coexisting = [...byRecord.entries()].filter(([, versions]) => versions.length > 1);
  expect(coexisting.length, "두 버전이 병존하는 레코드가 없다 — 재처리가 범위 지정이 아니었다")
    .toBeGreaterThan(0);

  for (const [recordId, versions] of coexisting) {
    expect(versions).toEqual([BASE_VERSION, REPROCESS_VERSION]);
    const pair = rows.filter((row) => row.record_id === recordId);
    const base = pair.find((row) => row.analyzer_version === BASE_VERSION) as AnalysisLink;
    const next = pair.find((row) => row.analyzer_version === REPROCESS_VERSION) as AnalysisLink;

    // 서로 다른 실행·호출. 같으면 재처리가 새 판단을 한 것이 아니라 행만 복제한 것이다.
    expect(next.run_id).toBe(REPROCESS_RUN);
    expect(base.run_id).not.toBe(next.run_id);
    expect(base.call_id).not.toBe(next.call_id);
    expect(callOf(base, byId).run_id).toBe(base.run_id);
    expect(callOf(next, byId).run_id).toBe(next.run_id);

    // 그런데 **두 버전 모두** 같은 Bronze 관측 한 건으로 역추적된다(AC2.6). 두 판단이 같은
    // 원문을 두고 내려진 것이 아니면 버전 비교 자체가 의미를 잃는다.
    const item = items.get(recordId);
    expect(item, `레코드 ${recordId} 의 Bronze 관측이 없다`).toBeDefined();
    expect(base.source_url).toBe(item?.source_url);
    expect(next.source_url).toBe(item?.source_url);
    expect(bodies.get(item?.body_hash ?? "")?.raw_text).toBeTruthy();
  }

  // 범위 지정의 관측 지점: 범위 **밖** 소스의 레코드는 앞 버전 한 벌로만 남는다. 이 비대칭이
  // 없으면 "범위를 지정했다"가 관측되지 않고, 전체 재처리와 구별되지 않는다.
  const scopedIds = new Set(coexisting.map(([recordId]) => recordId));
  const outside = [...items.values()].filter((item) => item.source_id !== SCOPED_SOURCE);
  expect(outside.length).toBeGreaterThan(0);
  for (const item of outside) {
    expect(scopedIds.has(item.record_id)).toBe(false);
    expect(byRecord.get(item.record_id) ?? [BASE_VERSION]).toEqual([BASE_VERSION]);
  }
});
