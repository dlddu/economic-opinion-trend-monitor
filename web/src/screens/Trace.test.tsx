import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { Trace } from "./Trace";
import type { TraceResponse } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

// One fully-populated lineage. Every expected value below is read off this
// object rather than written twice, so a fixture edit cannot leave a stale
// literal asserting the old shape.
const BRONZE = {
  record_id: "r-1",
  source_id: "연합뉴스",
  axis: "KR",
  title: "기준금리 동결",
  source_url: "https://ex.test/1",
  body_hash: "sha256:abc",
  body_available: true,
  body_preserved: true,
  body_text: "한국은행은 기준금리를 동결했다.",
  body_first_seen_at: "2026-06-23T14:05:00Z",
  body_first_seen_cycle: "2026-06-23T14",
};

const SILVER = {
  analysis_status: "analyzed" as const,
  sentiment: "neutral" as const,
  target_countries: ["KR"],
  narrative_subjects: ["한국은행 기준금리"],
  confidence: 0.91,
  analyzed_at: "2026-06-23T14:40:00Z",
  analyzer_version: "v3",
};

const INGESTION = {
  collected_at: "2026-06-23T14:05:00Z",
  collection_cycle: "2026-06-23T14",
  rank: 1,
  view_count: 120,
};

function response(over: Partial<TraceResponse> = {}): TraceResponse {
  return {
    record_id: BRONZE.record_id,
    selection: "requested",
    found: true,
    crumb: [
      { layer: "bronze", label: "원문 수집", present: true },
      { layer: "silver", label: "분석", present: true },
      { layer: "gold", label: "집계 기여", present: true },
    ],
    bronze: { ...BRONZE },
    silver: { ...SILVER },
    ingestion: { ...INGESTION },
    ...over,
  };
}

// The screen reads its record from the URL, so it always renders under a router.
function renderTrace(entry = "/trace") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Trace />
      <LocationProbe />
    </MemoryRouter>,
  );
}

function LocationProbe() {
  const loc = useLocation();
  return <span data-testid="loc">{loc.pathname + loc.search}</span>;
}

function stubTrace(body: TraceResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => body })),
  );
}

// The screen's reason to exist: three layers, one record, on one surface.
it("puts all three layers of one record on the screen", async () => {
  stubTrace(response());
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));

  const text = container.textContent ?? "";
  // Bronze: where it came from and what it said.
  expect(text).toContain(BRONZE.source_id);
  expect(text).toContain(BRONZE.source_url);
  expect(text).toContain(BRONZE.body_text);
  // Silver: how it was classified.
  expect(text).toContain(SILVER.analyzer_version);
  expect(text).toContain(SILVER.narrative_subjects[0]);
  // Ingestion metadata: when the observation was taken (AC1.5).
  expect(text).toContain(INGESTION.collection_cycle);
  expect(text).toContain(String(INGESTION.view_count));

  // CMP-crumb draws every hop, and none of them as a gap.
  const steps = [...container.querySelectorAll(".trace-crumb-step")];
  expect(steps).toHaveLength(3);
  expect(container.querySelectorAll(".trace-crumb-gap")).toHaveLength(0);
});

// The case the whole trail exists for: the original link is dead, and the copy
// taken at collection time carries the reader the rest of the way (AC1.4).
it("keeps going on a dead link by showing the preserved copy", async () => {
  stubTrace(response({ bronze: { ...BRONZE, body_available: false } }));
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));

  const text = container.textContent ?? "";
  expect(text).toContain("링크 끊김");
  // The trail does not end here — the body is still on screen.
  expect(text).toContain(BRONZE.body_text);
  expect(text).toContain("원문 주소가 열리지 않습니다.");
  expect(text).toContain("추적이 여기서 끊기지 않도록, 수집 시점에 보존해 둔 원문 전체를 대신 보여 줍니다.");
  expect(text).toContain("링크 상태는 위에 배지로 항상 표시됩니다.");
});

// "Set aside" is not "neutral". AC2.5 keeps low-confidence records out of the
// four classes, so the screen must not draw one for them.
it("leaves sentiment blank for a set-aside record instead of picking a class", async () => {
  stubTrace(
    response({
      silver: { ...SILVER, sentiment: null, analysis_status: "low_confidence", confidence: 0.21 },
    }),
  );
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));

  const text = container.textContent ?? "";
  expect(text).toContain("저신뢰");
  expect(text).toContain("분류에서 제외");
  // None of the four class labels may appear as this record's verdict.
  for (const label of ["긍정", "중립", "부정", "혼재"]) {
    expect(container.querySelector(".badge")?.textContent).not.toBe(label);
  }
  // A set-aside record was still analyzed — the silver hop is not a gap.
  expect(container.querySelectorAll(".trace-crumb-gap")).toHaveLength(0);
});

// Three ways to come up short, three different answers. This is the one the
// stub endpoint could never tell apart.
it("tells 'not analyzed yet' apart from 'not collected'", async () => {
  stubTrace(
    response({
      silver: null,
      crumb: [
        { layer: "bronze", label: "원문 수집", present: true },
        { layer: "silver", label: "분석", present: false },
        { layer: "gold", label: "집계 기여", present: true },
      ],
    }),
  );
  const { container, unmount } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));
  expect(container.textContent).toContain("아직 분석되지 않았습니다");
  // Bronze survives a missing analysis — the body is still readable.
  expect(container.textContent).toContain(BRONZE.body_text);
  expect(container.querySelectorAll(".trace-crumb-gap")).toHaveLength(1);
  unmount();

  stubTrace(response({ found: false, bronze: null, silver: null, selection: "requested-missing" }));
  const missing = renderTrace();
  await waitFor(() => expect(missing.container.textContent).toContain("Bronze 에 없습니다"));
  // No lineage is drawn for a record that was never collected.
  expect(missing.container.querySelectorAll(".trace-crumb-step")).toHaveLength(0);
});

// A fallback must not read as a hit: the screen says it chose for you.
it("says so when it picked the record itself", async () => {
  stubTrace(response({ selection: "auto" }));
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));
  expect(container.textContent).toContain("첫 관측");
});

// Another screen hands a record over in the URL (the judgment-debug CTA does):
// the screen must open on that record, not on "first observation".
it("opens the record named in ?record_id= and asks the API for it", async () => {
  stubTrace(response());
  const { container } = renderTrace("/trace?record_id=R-2609-0412");

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  expect(String(fetchMock.mock.calls[0][0])).toContain("record_id=R-2609-0412");
  expect((container.querySelector(".trace-lookup input") as HTMLInputElement).value).toBe("R-2609-0412");
});

// And the reverse: looking a record up here puts it in the URL, so the view can
// be shared as a link and survives a reload.
it("writes the looked-up record back into the URL", async () => {
  stubTrace(response());
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));
  const input = container.querySelector(".trace-lookup input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: "  R-2609-0351 " } });
  fireEvent.submit(container.querySelector(".trace-lookup") as HTMLFormElement);

  await waitFor(() =>
    expect(container.querySelector('[data-testid="loc"]')?.textContent).toBe("/trace?record_id=R-2609-0351"),
  );
  const fetchMock = globalThis.fetch as unknown as ReturnType<typeof vi.fn>;
  await waitFor(() =>
    expect(fetchMock.mock.calls.some((c) => String(c[0]).includes("record_id=R-2609-0351"))).toBe(true),
  );
});

// The article itself is one click away when its address still answers — in a new
// tab, without handing the opened page a handle back to this one.
it("links out to the original article while the link is alive", async () => {
  stubTrace(response());
  const { container } = renderTrace();

  await waitFor(() => expect(container.textContent).toContain(BRONZE.title));
  const a = container.querySelector(".trace-open a") as HTMLAnchorElement;
  expect(a).not.toBeNull();
  expect(a.getAttribute("href")).toBe(BRONZE.source_url);
  expect(a.getAttribute("target")).toBe("_blank");
  expect(a.getAttribute("rel")).toContain("noopener");
});

// No button that cannot work: a dead link gets the preserved copy instead, and a
// non-http address is never turned into a clickable href.
it("offers no open button for a dead link or a non-http address", async () => {
  stubTrace(response({ bronze: { ...BRONZE, body_available: false } }));
  const dead = renderTrace();
  await waitFor(() => expect(dead.container.textContent).toContain(BRONZE.title));
  expect(dead.container.querySelector(".trace-open")).toBeNull();
  dead.unmount();

  stubTrace(response({ bronze: { ...BRONZE, source_url: "javascript:alert(1)" } }));
  const odd = renderTrace();
  await waitFor(() => expect(odd.container.textContent).toContain(BRONZE.title));
  expect(odd.container.querySelector(".trace-open")).toBeNull();
  expect(odd.container.textContent).toContain("javascript:alert(1)");
});
