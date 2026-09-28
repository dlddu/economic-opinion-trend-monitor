import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Debug } from "./Debug";
import type { DebugCall, DebugRecordsResponse, DebugResponse, DebugVersion } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

// One fully-recorded exchange. Every expectation reads off these objects rather
// than repeating a literal, so a fixture edit cannot leave a stale assertion.
const CALL: DebugCall = {
  call_id: "c-1",
  run_id: "run-1",
  analyzer_version: "v3",
  call_model: "claude-sonnet-5",
  call_temperature: 0.2,
  prompt_system: "너는 경제 기사를 분류한다.",
  prompt_user: "제목: 기준금리 동결\n본문: 한국은행은 기준금리를 동결했다.",
  prompt_sha256: "sha256:p1",
  response_raw: '{"sentiment":"positive"}\n다시 생각해보니\n{"sentiment":"mixed","confidence":0.7}',
  call_outcome: "parsed",
  call_failure_reason: null,
  call_attempt_count: 1,
  called_at: "2026-09-24T03:10:00Z",
  duration_ms: 812,
  reused_from_call_id: null,
};

const VERSION: DebugVersion = {
  analyzer_version: "v3",
  analyzed_at: "2026-09-24T03:10:02Z",
  analysis_status: "analyzed",
  sentiment: "positive",
  confidence: 0.7,
  target_countries: ["KR"],
  narrative_subjects: ["한국은행 기준금리"],
  run_id: "run-1",
  selected: true,
  exchange: {
    state: "call",
    no_call_reason: null,
    call_id: CALL.call_id,
    call: CALL,
    reused_from: null,
  },
};

const RUN = {
  run_id: "run-1",
  run_trigger: "schedule",
  run_started_at: "2026-09-24T03:00:00Z",
  run_ended_at: "2026-09-24T03:12:00Z",
  run_status: "succeeded",
  stages: [
    {
      stage_name: "analysis",
      stage_status: "succeeded",
      stage_started_at: "2026-09-24T03:05:00Z",
      stage_ended_at: "2026-09-24T03:12:00Z",
      duration_ms: 420000,
      input_count: 14,
      output_count: 11,
      outcomes: [{ outcome_name: "parsed", outcome_count: 11 }],
      failure_reason: null,
      source_failures: [],
    },
  ],
  symptoms: {
    records: 14,
    calls: 12,
    analysis_status: [
      { name: "analyzed", count: 11 },
      { name: "unanalyzed", count: 3 },
    ],
    call_outcome: [{ name: "parsed", count: 11 }],
    no_call_reason: [{ name: "body_unavailable", count: 2 }],
  },
};

function response(over: Partial<DebugResponse> = {}): DebugResponse {
  return {
    record_id: "r-1",
    selection: "requested",
    found: true,
    versions: [VERSION],
    run: RUN,
    ...over,
  };
}

const LIST_ROW: DebugRecordsResponse["rows"][number] = {
  record_id: "r-1",
  title: "기준금리 동결",
  source_id: "src-a",
  collected_at: "2026-09-24T02:50:00Z",
  analysis_status: "analyzed",
  sentiment: "positive",
  confidence: 0.7,
  analyzer_version: "v3",
  analyzed_at: "2026-09-24T03:10:02Z",
  run_id: "run-1",
  versions: 1,
  exchange_state: "call",
  call_outcome: "parsed",
  no_call_reason: null,
};

function records(over: Partial<DebugRecordsResponse> = {}): DebugRecordsResponse {
  const rows = over.rows ?? [LIST_ROW];
  return {
    query: "",
    run_id: "",
    symptom: "",
    total: rows.length,
    matched: rows.length,
    limit: 50,
    truncated: false,
    ...over,
    rows,
  };
}

function stub(body: DebugResponse, list: DebugRecordsResponse = records()) {
  const fetchMock = vi.fn(async (url: unknown) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => (String(url).includes("/debug/records") ? list : body),
  }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderDebug(entry = "/debug?record_id=r-1") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Debug />
    </MemoryRouter>,
  );
}

function withExchange(over: Partial<DebugVersion["exchange"]>): DebugResponse {
  return response({ versions: [{ ...VERSION, exchange: { ...VERSION.exchange, ...over } }] });
}

it("puts the prompt, the raw reply and the owning run on one screen", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain(CALL.call_model));

  const text = container.textContent ?? "";
  expect(text).toContain(CALL.prompt_user);
  expect(text).toContain(CALL.response_raw ?? "");
  expect(text).toContain(CALL.prompt_sha256);
  expect(text).toContain(RUN.run_id);
  expect(text).toContain(String(RUN.symptoms.records));
  expect(text).toContain(RUN.stages[0].stage_name);
  expect(text).toContain(String(RUN.stages[0].input_count));
});

it("flags a field where the final reply and the stored value disagree", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("응답 ↔ 저장값"));

  expect(container.textContent).toContain("읽는 쪽");
  const mismatched = [...container.querySelectorAll("td .badge")].filter(
    (n) => n.textContent === "어긋남",
  );
  expect(mismatched.length).toBeGreaterThan(0);

  const rowsBefore = container.querySelectorAll("tbody tr").length;
  fireEvent.click(container.querySelector(".chk input") as HTMLInputElement);
  expect(container.querySelectorAll("tbody tr").length).toBeLessThan(rowsBefore);
});

it("shows why no call was made instead of an empty exchange", async () => {
  stub(
    withExchange({ state: "no-call", no_call_reason: "body_unavailable", call_id: null, call: null }),
  );
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("모델을 부르지 않았습니다"));
  expect(container.textContent).toContain("본문을 확보하지 못해");
  expect(container.querySelector("pre.code")).toBeNull();
});

it("names the original call when this run reused an answer", async () => {
  const reuse = { ...CALL, call_id: "c-2", call_outcome: "reused", reused_from_call_id: CALL.call_id };
  stub(withExchange({ state: "call", call_id: "c-2", call: reuse, reused_from: CALL }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("다시 부르지 않았습니다"));
  expect(container.textContent).toContain(CALL.call_id);
});

it("routes rows written before call logging to sample re-analysis", async () => {
  stub(withExchange({ state: "unrecorded", call_id: null, call: null }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("호출 기록이 없습니다"));
  expect(container.querySelector('a[href="/reprocess"]')).not.toBeNull();
});

it("distinguishes a missing call record from a record that was never called", async () => {
  stub(withExchange({ state: "call-record-absent", call_id: "c-gone", call: null }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("호출 기록을 찾지 못했습니다"));
  expect(container.textContent).toContain("c-gone");
});

it("reports the retry count and last error of a failed call", async () => {
  const failed = {
    ...CALL,
    call_outcome: "call_failed",
    call_failure_reason: "429 rate limited",
    call_attempt_count: 3,
    response_raw: null,
  };
  stub(withExchange({ call: failed }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("호출이 실패해"));
  expect(container.textContent).toContain(failed.call_failure_reason);
  expect(container.textContent).toContain(String(failed.call_attempt_count));
});

it("says the run record is missing rather than drawing an empty run", async () => {
  stub(response({ run: null }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("실행 기록이 레이크에 없습니다"));
  expect(container.textContent).toContain("기록이 없습니다");
});

it("separates an unknown record from an empty lake", async () => {
  stub(response({ found: false, selection: "requested-missing", versions: [], run: null }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("되짚을 판단이"));
});

it("records a cause and says the verdict does not outlive the screen", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("원인 판정"));
  const causeInput = container.querySelector('input[value="parse"]') as HTMLInputElement;
  fireEvent.click(causeInput);
  fireEvent.submit(causeInput.closest("form") as HTMLFormElement);

  expect(container.textContent).toContain("이 화면 안에서만");
});

it("compares the model's last answer, not its first draft", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("응답 ↔ 저장값"));

  const sentimentRow = [...container.querySelectorAll("tbody tr")].find(
    (tr) => tr.querySelector("td")?.textContent === "분위기",
  );
  const cells = [...(sentimentRow?.querySelectorAll("td") ?? [])].map((td) => td.textContent);
  expect(cells[1]).toBe("mixed");
  expect(cells[2]).toBe(VERSION.sentiment);
});

it("draws no comparison table when there is no raw reply", async () => {
  stub(withExchange({ call: { ...CALL, response_raw: null } }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain(CALL.call_model));
  const headings = [...container.querySelectorAll(".card-h h3")].map((h) => h.textContent);
  expect(headings).not.toContain("응답 ↔ 저장값");
  expect(container.textContent).toContain("대조할 응답 원문이 없음");
});

it("lists the records that match the search and opens the one the operator picks", async () => {
  const fetchMock = stub(response());
  const { container } = renderDebug("/debug?record_id=r-1&q=%EA%B8%B0%EC%A4%80%EA%B8%88%EB%A6%AC");

  await waitFor(() => expect(container.textContent).toContain(LIST_ROW.title));

  const listCall = fetchMock.mock.calls.map((c) => String(c[0])).find((u) => u.includes("/debug/records"));
  expect(listCall).toContain(`q=${encodeURIComponent("기준금리")}`);

  const row = container.querySelector(`input[aria-label="${LIST_ROW.record_id} 고르기"]`);
  expect(row).toBeTruthy();
  expect((row as HTMLInputElement).checked).toBe(true);
});

it("drills from a run symptom down to the records that show it", async () => {
  const fetchMock = stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("증상이 몰렸나"));

  const unanalyzed = RUN.symptoms.analysis_status[1];
  const drill = Array.from(container.querySelectorAll("button")).find((b) =>
    (b.textContent ?? "").startsWith(`${unanalyzed.count}건`),
  );
  expect(drill).toBeTruthy();
  fireEvent.click(drill as HTMLButtonElement);

  await waitFor(() =>
    expect(
      fetchMock.mock.calls
        .map((c) => String(c[0]))
        .some(
          (u) =>
            u.includes(`symptom=${encodeURIComponent(`analysis_status:${unanalyzed.name}`)}`) &&
            u.includes(`run_id=${RUN.run_id}`),
        ),
    ).toBe(true),
  );
  expect(container.textContent).toContain("전체 실행으로 넓히기");
});

it("says nothing matched instead of drawing an empty result table", async () => {
  stub(response(), records({ rows: [], total: 3, matched: 0 }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.querySelector(".emptybox")).toBeTruthy());
  expect(container.querySelector(".emptybox")?.textContent).toContain("찾는 분석 결과가 없습니다");
});

it("keeps the search table reachable when the requested record is missing", async () => {
  stub(response({ found: false, selection: "requested-missing", versions: [], run: null }));
  const { container } = renderDebug("/debug?record_id=nope");

  await waitFor(() => expect(container.textContent).toContain("되짚을 판단이"));
  expect(container.textContent).toContain(LIST_ROW.title);
  expect(container.querySelector(`input[aria-label="${LIST_ROW.record_id} 고르기"]`)).toBeTruthy();
});
