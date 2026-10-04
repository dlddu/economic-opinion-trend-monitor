import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { Reprocess } from "./Reprocess";
import { AppShell } from "../shell/AppShell";
import type { ReprocessResponse, ReprocessRun } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

// Every expected value below is read off this stub, never written twice.
const BUCKET_DONE = { cycle: "2026-09-21T10:00", kept: 2, done: 2, todo: 0 };
const BUCKET_TODO = { cycle: "2026-09-21T11:00", kept: 1, done: 0, todo: 1 };

function single(): ReprocessResponse {
  return {
    scope: {
      range: "7d",
      since: "2026-09-14T12:00:00Z",
      axis: "KR",
      source: "",
      sources: [
        { source_id: "kr-daily", kept: 1 },
        { source_id: "kr-wire", kept: 2 },
      ],
      total: 3,
      already: 2,
      todo: 1,
      buckets: [BUCKET_DONE, BUCKET_TODO],
      throughput_per_minute: 0.2,
      eta_minutes: 5,
    },
    target_version: "v3",
    versions: [
      { analyzer_version: "v3", records: 2, first_analyzed_at: "a", last_analyzed_at: "b" },
    ],
    compare: {
      available: false,
      reason: "single-version",
      before_version: "",
      after_version: "v3",
      rows: [],
      unanalyzed_share: { before: 0, after: 0 },
    },
    trigger: { available: false, note: "클러스터 밖", serving_version: "", decisions: [], runs: [] },
  };
}

const MOVED = { subject: "가계부채", before_share: 0.25, after_share: 0.5, delta: 0.25 };
const NEW = { subject: "반도체", before_share: 0, after_share: 0.25, delta: 0.25 };
const STILL = { subject: "전기요금", before_share: 0.25, after_share: 0.25, delta: 0 };

function dual(): ReprocessResponse {
  const d = single();
  d.versions.unshift({ analyzer_version: "v2", records: 3, first_analyzed_at: "a", last_analyzed_at: "a" });
  d.compare = {
    available: true,
    reason: "",
    before_version: "v2",
    after_version: "v3",
    // Server order: biggest |delta| first.
    rows: [MOVED, NEW, STILL],
    unanalyzed_share: { before: 0, after: 0.25 },
  };
  return d;
}

function stub(body: ReprocessResponse) {
  const fetchMock = vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => body }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

/** A fetch that answers GET with `body` and POST with `post(url, parsed body)`. */
function stubWrites(
  body: ReprocessResponse,
  post: (url: string, sent: Record<string, unknown>) => { status: number; json: unknown },
) {
  const fetchMock = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    if (init?.method === "POST") {
      const r = post(url, JSON.parse(init.body ?? "{}") as Record<string, unknown>);
      return { ok: r.status < 300, status: r.status, statusText: "", json: async () => r.json };
    }
    return { ok: true, status: 200, statusText: "OK", json: async () => body };
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function run(kind: ReprocessRun["kind"], phase: string, version = "v3", extra: Partial<ReprocessRun> = {}): ReprocessRun {
  return {
    name: `econ-reprocess-${kind}-${phase.toLowerCase()}`,
    kind,
    phase,
    message: "",
    started_at: "",
    finished_at: "",
    parameters: { version, sample: kind === "sample" ? "50" : "0" },
    annotations: { "econ-monitor/range": "7d" },
    ...extra,
  };
}

function wired(runs: ReprocessRun[] = []): ReprocessResponse {
  const d = dual();
  d.trigger = { available: true, note: "", serving_version: "v2", decisions: [], runs };
  return d;
}

function calledUrl(fetchMock: ReturnType<typeof stub>, n: number): string {
  return String((fetchMock.mock.calls as unknown as [string][])[n][0]);
}

function empty(): ReprocessResponse {
  const d = single();
  d.scope = { ...d.scope, sources: [], total: 0, already: 0, todo: 0, buckets: [], throughput_per_minute: null, eta_minutes: null };
  d.target_version = "";
  d.versions = [];
  d.compare = { ...d.compare, reason: "no-silver", after_version: "" };
  return d;
}

function rowFor(container: HTMLElement, text: string): HTMLElement {
  const row = [...container.querySelectorAll("tbody tr")].find((tr) => tr.textContent?.includes(text));
  if (!row) throw new Error(`no row for ${text}`);
  return row as HTMLElement;
}

it("sizes the range per cycle against the target version", async () => {
  stub(single());
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelectorAll(".rp-scope tbody tr").length).toBe(2));

  const done = rowFor(container, BUCKET_DONE.cycle);
  expect([...done.querySelectorAll("td.num")].map((td) => td.textContent)).toEqual(
    [BUCKET_DONE.kept, BUCKET_DONE.done, BUCKET_DONE.todo].map(String),
  );
  expect(done.textContent).toContain("완료");
  expect(rowFor(container, BUCKET_TODO.cycle).textContent).toContain("재분석 필요");

  expect(container.querySelector(".rp-todo")?.textContent).toContain("1건");
  expect(container.querySelector(".rp-eta")?.textContent).toContain("5분");
  expect(container.textContent).toContain("v3");
});

it("round-trips range, axis and source through the query", async () => {
  const fetchMock = stub(single());
  const { container } = render(<Reprocess />);
  const seg = (label: string, text: string) =>
    [...container.querySelectorAll(`.seg[aria-label="${label}"] button`)].find(
      (b) => b.textContent === text,
    ) as HTMLElement;
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  expect(calledUrl(fetchMock, 0)).toContain("/api/reprocess?range=7d&axis=KR");

  fireEvent.click(seg("기간", "지난 24시간"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  expect(calledUrl(fetchMock, 1)).toContain("range=24h&axis=KR");

  const select = container.querySelector(".rp-source select") as HTMLSelectElement;
  expect([...select.options].map((o) => o.value)).toEqual(["", "kr-daily", "kr-wire"]);
  fireEvent.change(select, { target: { value: "kr-wire" } });
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
  expect(calledUrl(fetchMock, 2)).toContain("&source=kr-wire");

  // Switching axis drops the source: it belonged to the other axis.
  fireEvent.click(seg("출처 축", "미국"));
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(4));
  expect(calledUrl(fetchMock, 3)).toContain("axis=US");
  expect(calledUrl(fetchMock, 3)).not.toContain("source=");
});

it("refuses to draw a comparison out of a single version, but lists what exists", async () => {
  stub(single());
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-single")).not.toBeNull());

  expect(container.querySelector(".rp-cmp")).toBeNull();
  expect(container.querySelector(".rp-single")?.textContent).toContain("한 버전뿐");
  expect(rowFor(container, "v3").textContent).toContain("2");
});

it("compares two versions side by side, flags the threshold and re-sorts", async () => {
  stub(dual());
  const { container, getByText } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-cmp")).not.toBeNull());

  const moved = rowFor(container, MOVED.subject);
  const nums = [...moved.querySelectorAll("td.num")].map((td) => td.textContent);
  expect(nums).toEqual(["25.0%", "50.0%", "+25.0"]);
  expect(moved.classList.contains("rp-flagged")).toBe(true);
  expect(rowFor(container, STILL.subject).textContent).toContain("변동 없음");
  expect(container.querySelector(".rp-over")?.textContent).toContain("2건");
  expect(container.querySelector(".rp-unanalyzed")?.textContent).toContain("25.0%");

  const input = container.querySelector(".rp-threshold input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "30" } });
  await waitFor(() => expect(container.querySelector(".rp-over")).toBeNull());
  expect(container.querySelectorAll(".rp-flagged").length).toBe(0);

  fireEvent.click(getByText("이후 점유율 순"));
  const first = container.querySelector(".rp-cmp tbody tr");
  expect(first?.textContent).toContain(MOVED.subject);
});

it("shows the empty scope state and no estimate when there is nothing to size", async () => {
  stub(empty());
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-empty")).not.toBeNull());

  expect(container.querySelector("table.tbl")).toBeNull();
  expect(container.querySelector(".rp-eta")?.textContent).toContain("—");
  expect(container.querySelector(".rp-trigger")?.textContent).toContain("일으킬 수 없습니다");
});

it("draws no run controls while the trigger is unavailable", async () => {
  stub(single());
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-trigger")).not.toBeNull());
  expect(container.querySelector(".rp-trigger")?.textContent).toContain("클러스터 밖");
  expect(container.querySelector(".rp-run-controls")).toBeNull();
});

const subOf = (container: HTMLElement, heading: string) =>
  Array.from(container.querySelectorAll(".card-h"))
    .find((h) => h.querySelector("h3")?.textContent === heading)
    ?.querySelector(".sub")?.textContent;

it("submits a sample for the selected scope and keeps the full run locked", async () => {
  const posted: { url: string; body: Record<string, unknown> }[] = [];
  stubWrites(wired(), (url, body) => {
    posted.push({ url, body });
    return { status: 202, json: { run: run("sample", "Pending") } };
  });
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-run-controls")).not.toBeNull());

  expect((container.querySelector(".rp-full") as HTMLButtonElement).disabled).toBe(true);
  expect(container.querySelector(".rp-gate")?.textContent).toBe("잠김");

  const size = container.querySelector(".rp-form input[type=number]") as HTMLInputElement;
  fireEvent.change(size, { target: { value: "80" } });
  fireEvent.click(container.querySelector(".rp-sample") as HTMLButtonElement);
  await waitFor(() => expect(posted.length).toBe(1));
  expect(posted[0].url).toBe("/api/reprocess/sample");
  expect(posted[0].body).toMatchObject({ range: "7d", axis: "KR", source: "", analyzer_version: "v3", sample_size: 80, sample_mode: "random" });
  await waitFor(() => expect(container.querySelector(".rp-runs")).not.toBeNull());
  expect(container.querySelector(".rp-runs")?.textContent).toContain("대기");
  expect(subOf(container, "표본 재분석")).toBe("표본을 새 로직으로 돌리는 중…");
});

// STP-run-reprocess: a finished sample opens the full run; a failed full run is
// resumed, not restarted — the same request goes again and the batch skips
// what its checkpoint already covers.
it("opens the full run after a sample and offers to resume a failed one", async () => {
  const posted: { url: string; body: Record<string, unknown> }[] = [];
  stubWrites(wired([run("run", "Failed", "v3", { message: "deadline" }), run("sample", "Succeeded")]), (url, body) => {
    posted.push({ url, body });
    return { status: 202, json: { run: run("run", "Pending") } };
  });
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-run-controls")).not.toBeNull());

  expect(container.querySelector(".rp-gate")?.textContent).toBe("열림");
  const full = container.querySelector(".rp-full") as HTMLButtonElement;
  expect(full.disabled).toBe(false);
  expect(full.textContent).toContain("체크포인트부터 이어서 재개");
  expect(container.querySelector(".rp-interrupted")?.textContent).toContain("deadline");
  expect(subOf(container, "전량 재분석")).toMatch(/^실패 · /);

  fireEvent.click(full);
  await waitFor(() => expect(posted.length).toBe(1));
  expect(posted[0].url).toBe("/api/reprocess/run");
  expect(posted[0].body).toMatchObject({ range: "7d", axis: "KR", analyzer_version: "v3", batch_size: 100 });
  expect(posted[0].body).not.toHaveProperty("sample_size");
  await waitFor(() => expect(subOf(container, "전량 재분석")).toBe("범위 전체를 다시 분석하는 중…"));
});

// STP-publish: the decision needs a choice and a reason before anything is
// sent; a rollback targets the version the comparison calls "before", and the
// server's refusal is shown in its own words.
it("records a decision with its reason, or says what is missing", async () => {
  const posted: { url: string; body: Record<string, unknown> }[] = [];
  const data = wired([run("run", "Succeeded"), run("sample", "Succeeded")]);
  data.trigger.decisions = [
    { decided_at: "2026-09-21T09:00:00+00:00", decision: "publish", analyzer_version: "v2", memo: "이전 반영", notify_consumer: true },
  ];
  stubWrites(data, (url, body) => {
    posted.push({ url, body });
    if (body.memo === "거부") return { status: 403, json: { error: "workflows.argoproj.io is forbidden" } };
    return { status: 202, json: { run: run("publish", "Pending") } };
  });
  const { container } = render(<Reprocess />);
  await waitFor(() => expect(container.querySelector(".rp-run-controls")).not.toBeNull());

  expect(container.querySelector(".rp-serving")?.textContent).toBe("v2");
  expect(container.querySelector(".rp-decisions")?.textContent).toContain("이전 반영");
  const checks = container.querySelector(".rp-checks") as HTMLElement;
  expect(checks.textContent).toContain("가능 (버전 병존)");

  const decide = container.querySelector(".rp-decide") as HTMLButtonElement;
  fireEvent.click(decide);
  await waitFor(() => expect(container.querySelector(".rp-error")).not.toBeNull());
  expect(container.querySelector(".rp-error")?.textContent).toContain("반영할지 되돌릴지");
  expect(posted.length).toBe(0);

  fireEvent.click(container.querySelector('input[name="decision"][value="rollback"]') as HTMLInputElement);
  fireEvent.click(decide);
  await waitFor(() => expect(container.querySelector(".rp-error")?.textContent).toContain("결정 근거"));
  expect(posted.length).toBe(0);

  const memo = container.querySelector(".rp-memo textarea") as HTMLTextAreaElement;
  fireEvent.change(memo, { target: { value: "거부" } });
  fireEvent.click(decide);
  await waitFor(() => expect(posted.length).toBe(1));
  expect(posted[0].url).toBe("/api/reprocess/publish");
  expect(posted[0].body).toEqual({ decision: "rollback", analyzer_version: "v2", memo: "거부", notify_consumer: true });
  await waitFor(() => expect(container.querySelector(".rp-error")?.textContent).toContain("forbidden"));

  fireEvent.change(memo, { target: { value: "설명되지 않는 변화가 남았다" } });
  fireEvent.click(decide);
  await waitFor(() => expect(container.querySelector(".rp-recorded")).not.toBeNull());
  expect(container.querySelector(".rp-recorded")?.textContent).toContain("이전 버전(v2)으로 롤백");
});

describe("Reprocess — 셸 토프바", () => {
  afterEach(cleanup);

  function renderInShell() {
    return render(
      <MemoryRouter initialEntries={["/reprocess"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/reprocess" element={<Reprocess />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it("pills the chosen scope as axis · range · count, under the route title", async () => {
    const body = single();
    stub(body);
    const { container } = renderInShell();

    await waitFor(() =>
      expect(container.querySelector(".topbar .pill-ctl")?.textContent).toBe(
        `한국 · 지난 7일 · ${body.scope.total}건`,
      ),
    );
    expect(container.querySelector(".topbar h2")?.textContent).toBe("재처리 콘솔");
  });

  it("pills an empty range as 범위 미확정", async () => {
    stub(empty());
    const { container } = renderInShell();

    await waitFor(() => expect(container.querySelector(".topbar .pill-ctl")?.textContent).toBe("범위 미확정"));
  });
});
