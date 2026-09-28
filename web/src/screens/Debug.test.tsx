import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Debug } from "./Debug";
import type {
  DebugCall,
  DebugInput,
  DebugRecordsResponse,
  DebugResponse,
  DebugVersion,
} from "../api/types";

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

const INPUT: DebugInput = {
  title: "기준금리 동결",
  source_url: "https://news.example/a/1",
  body_available: true,
  body_hash: "hash-v1",
  versions: [
    {
      body_hash: "hash-v1",
      first_seen_at: "2026-09-24T01:12:00Z",
      first_seen_cycle: "2026-09-24T01:00",
      raw_text: "한국은행은 기준금리를 연 3.50%로 동결했다. 금융통화위원회는 물가 상승률이 목표 수준으로 내려오고 있다고 봤다.",
      analyzed: true,
      latest: false,
    },
    {
      body_hash: "hash-v2",
      first_seen_at: "2026-09-24T01:40:00Z",
      first_seen_cycle: "2026-09-24T01:00",
      raw_text: "한국은행은 기준금리를 연 3.50%로 동결했다. 금융통화위원회는 물가 상승률이 목표 수준으로 내려오고 있다고 봤다. 다만 가계부채 우려를 덧붙였다.",
      analyzed: false,
      latest: true,
    },
  ],
};

function response(over: Partial<DebugResponse> = {}): DebugResponse {
  return {
    record_id: "r-1",
    selection: "requested",
    found: true,
    versions: [VERSION],
    run: RUN,
    input: INPUT,
    ...over,
  };
}

function cardTitled(container: HTMLElement, title: string): Element | null {
  const heading = [...container.querySelectorAll(".card-h h3")].find(
    (h) => h.textContent === title,
  );
  return heading?.closest(".card") ?? null;
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
    (n) => n.textContent === "다름",
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
  expect(cardTitled(container, "모델 호출 기록")?.querySelector("pre.code")).toBeNull();
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
  fireEvent.change(container.querySelector("textarea") as HTMLTextAreaElement, {
    target: { value: "응답 끝의 JSON 이 저장값과 다르다" },
  });
  fireEvent.submit(causeInput.closest("form") as HTMLFormElement);

  expect(container.textContent).toContain("「파싱」로 1건을 판정했습니다.");
  expect(container.textContent).toContain("이 화면 안에서만");
});

it("refuses a verdict without a cause, then without a memo", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("원인 판정"));
  const form = container.querySelector('input[value="parse"]')?.closest("form") as HTMLFormElement;
  fireEvent.submit(form);
  expect(container.textContent).toContain("원인을 먼저 고르세요.");

  fireEvent.click(container.querySelector('input[value="parse"]') as HTMLInputElement);
  fireEvent.submit(form);
  expect(container.textContent).toContain("근거 없는 판정은 다음 조사에 쓸 수 없습니다.");
  expect(container.textContent).not.toContain("판정했습니다.");
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

it("keeps the comparison card but marks every field uncomparable without a raw reply", async () => {
  stub(withExchange({ call: { ...CALL, response_raw: null } }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain(CALL.call_model));
  const card = cardTitled(container, "응답 ↔ 저장값");
  expect(card?.textContent).toContain("응답이 없어 대조할 수 없습니다");
  const badges = [...(card?.querySelectorAll("td .badge") ?? [])].map((n) => n.textContent);
  expect(badges).toEqual(["대조 불가", "대조 불가", "대조 불가", "대조 불가"]);
});

it("opens the original call behind a reused answer", async () => {
  const original = { ...CALL, run_id: "run-0", prompt_user: "원 호출 때 보낸 제목과 본문" };
  const reuse = {
    ...CALL,
    call_id: "c-2",
    call_outcome: "reused",
    response_raw: null,
    reused_from_call_id: CALL.call_id,
  };
  stub(withExchange({ state: "call", call_id: "c-2", call: reuse, reused_from: original }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("재사용한 결과입니다"));
  const card = cardTitled(container, "모델 호출 기록");
  expect(card?.querySelector("pre.code")).toBeNull();
  expect(card?.textContent).toContain("모델 호출 없음 (응답 재사용)");

  const open = [...(card?.querySelectorAll("button") ?? [])].find((b) =>
    b.textContent?.includes("원 호출 기록 열기"),
  ) as HTMLButtonElement;
  fireEvent.click(open);
  expect(card?.textContent).toContain("원 호출 기록");
  expect(card?.textContent).toContain(`${CALL.call_id} (원 호출)`);
  expect(card?.textContent).toContain(original.prompt_user);
});

it("checks that each stage's outcome counts add up to its input", async () => {
  const balanced = {
    ...RUN,
    stages: [{ ...RUN.stages[0], outcomes: [{ outcome_name: "parsed", outcome_count: 14 }] }],
  };
  stub(response({ run: balanced }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("배치 실행"));
  expect(cardTitled(container, "배치 실행")?.textContent).toContain("✓ 입력 = 합");
});

it("flags a stage whose outcome counts miss part of its input", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("배치 실행"));
  const stage = RUN.stages[0];
  expect(cardTitled(container, "배치 실행")?.textContent).toContain(
    `✗ ${stage.outcomes[0].outcome_count} ≠ ${stage.input_count}`,
  );
});

it("hands the verdict on through three branches", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("판정 뒤 이어지는 길"));
  const card = cardTitled(container, "판정 뒤 이어지는 길");
  const links = [...(card?.querySelectorAll("a") ?? [])].map((a) => [
    a.textContent,
    a.getAttribute("href"),
  ]);
  expect(links).toEqual([
    ["재처리 콘솔 →", "/reprocess"],
    ["소급 적용 범위 정하기 →", "/reprocess"],
    ["이 결과부터 다시 보기 →", "/debug?record_id=r-1"],
  ]);
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

  await waitFor(() => expect(container.querySelector(".dbg-emptybox")).toBeTruthy());
  const empty = container.querySelector(".dbg-emptybox")?.textContent ?? "";
  expect(empty).toContain("찾는 분석 결과가 없습니다");
  expect(empty).toContain("record_id=");
  expect(empty).not.toContain("R-");
});

it("keeps the search table reachable when the requested record is missing", async () => {
  stub(response({ found: false, selection: "requested-missing", versions: [], run: null }));
  const { container } = renderDebug("/debug?record_id=nope");

  await waitFor(() => expect(container.textContent).toContain("되짚을 판단이"));
  expect(container.textContent).toContain(LIST_ROW.title);
  expect(container.querySelector(`input[aria-label="${LIST_ROW.record_id} 고르기"]`)).toBeTruthy();
});

it("puts the body the model analyzed on the version history and flags a later edit", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  const [analyzed, latest] = INPUT.versions;
  const options = [...container.querySelectorAll("option")].map((o) => o.textContent ?? "");
  expect(options).toContain(`v1 · ${analyzed.first_seen_at} · 분석에 쓴 버전`);
  expect(options).toContain(`v2 · ${latest.first_seen_at} · 최신`);
  expect(container.textContent).toContain("분석에 쓴 본문과 지금 보관된 최신 본문이 다릅니다.");
  expect(container.textContent).toContain("분석 뒤에 1번 수정됐습니다");
  expect(container.textContent).toContain("고른 원문 버전이 모델이 받은 본문과 다릅니다 (v1 ↔ v2)");
  expect(container.textContent).toContain(latest.raw_text);

  const archive = cardTitled(container, "보관된 원문") as HTMLElement;
  fireEvent.change(archive.querySelector("select") as HTMLSelectElement, {
    target: { value: analyzed.body_hash },
  });
  expect(container.textContent).toContain("고른 원문 버전이 모델이 받은 본문과 같습니다");
  expect(archive.querySelector("pre.code")?.textContent).toContain(analyzed.raw_text);
  const open = archive.querySelector(`a[href="${INPUT.source_url}"]`);
  expect(open?.getAttribute("target")).toBe("_blank");
});

it("raises no edit badge when the analyzed body is still the latest", async () => {
  const only = { ...INPUT.versions[0], latest: true };
  stub(response({ input: { ...INPUT, versions: [only] } }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  expect(container.textContent).toContain("보관 버전 1개 · 분석에 쓴 버전 v1 · 최신 v1");
  expect(container.textContent).not.toContain("분석에 쓴 본문과 지금 보관된 최신 본문이 다릅니다.");
});

it("says the body was never captured instead of drawing an empty version", async () => {
  const notCalled = withExchange({
    state: "no-call",
    no_call_reason: "body_unavailable",
    call_id: null,
    call: null,
  });
  stub({ ...notCalled, input: { ...INPUT, body_available: false, body_hash: "", versions: [] } });
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  expect(container.textContent).toContain("보관된 본문 없음");
  expect(container.textContent).toContain("(본문 없음 — 원문 링크만 보관)");
  expect(container.textContent).toContain("(모델에 보내지 않음)");
  expect(container.textContent).toContain("본문이 사실상 비어 있습니다.");
  expect(container.textContent).toContain("원문 링크만 있고 본문이 수집되지 않았습니다.");
});

it("claims no empty body when the collection record itself is missing", async () => {
  stub(response({ input: null }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  expect(container.textContent).toContain("비교할 원문이 없습니다");
  expect(container.textContent).not.toContain("본문이 사실상 비어 있습니다.");
});

it("says the archived body is only a notice when it is too short to judge", async () => {
  const notice = {
    ...INPUT.versions[0],
    raw_text: "이 기사는 구독자 전용입니다. 무단 전재·재배포 금지.",
    latest: true,
  };
  stub(response({ input: { ...INPUT, versions: [notice] } }));
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  expect(container.textContent).toContain("본문이 사실상 비어 있습니다.");
  expect(container.textContent).toContain("보관된 본문이 구독·저작권 안내 문구뿐입니다.");
});

it("raises no empty-body warning for a full archived body", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("보관된 원문"));
  expect(container.textContent).not.toContain("본문이 사실상 비어 있습니다.");
});

it("lets the picked result open its source and names the keys it carries", async () => {
  stub(response());
  const { container } = renderDebug();

  await waitFor(() => expect(container.textContent).toContain("고른 결과"));
  const picked = cardTitled(container, "고른 결과") as HTMLElement;
  expect(picked.querySelector(".dbg-verdict")?.textContent).toBe(INPUT.title);
  expect(picked.textContent).toContain("원문 주소");
  expect(picked.textContent).toContain(INPUT.source_url);
  expect(picked.textContent).toContain(
    "결과마다 그것을 만든 실행과 모델 호출이 붙어 있습니다. 원문으로 되짚는 키도 그대로입니다.",
  );
  const open = picked.querySelector(`a[href="${INPUT.source_url}"]`);
  expect(open?.textContent).toContain("원문 열기");
  expect(open?.getAttribute("target")).toBe("_blank");
});
