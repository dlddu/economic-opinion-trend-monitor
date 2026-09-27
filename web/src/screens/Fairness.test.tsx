import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Fairness } from "./Fairness";
import type { ContributionsResponse, FairnessResponse } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

// The stub is the source of every expected value below — nothing is written as
// a literal twice. It carries the case the screen exists for: "와이어 도배" owns
// 60 of the 100 raw items but only a quarter of the normalized share, so the two
// counting modes rank the axis differently.
const SKEWED = { subject: "와이어 도배 대상", raw_count: 60, raw_share: 0.6, normalized_share: 0.25 };
const EVEN = { subject: "고른 관심 대상", raw_count: 40, raw_share: 0.4, normalized_share: 0.75 };

function response(): FairnessResponse {
  return {
    axis: "KR",
    basis: {
      bucket_unit: "hour",
      time_bucket: "2026-06-23T14",
      raw_total: SKEWED.raw_count + EVEN.raw_count,
      normalized: true,
      method: "소스 내 점유율",
    },
    rows: [
      { rank: 1, ...EVEN, delta: -0.5, spark: [0.8, 0.75] },
      { rank: 2, ...SKEWED, delta: 1.5, spark: [0.2, 0.25] },
    ],
  };
}

// 기여 기사 목록은 별도 라우트라 스텁도 url 로 갈라야 한다 — 한 응답을 두 경로에
// 같이 내려주면 어느 화면 조각이 무엇을 읽는지 이 파일이 말하지 못한다.
const ARTICLES: ContributionsResponse["rows"] = [
  {
    record_id: "r-wire-1",
    source_id: "kr_wire",
    title: "와이어 도배 기사 A",
    source_url: "https://wire.example/a",
    collected_at: "2026-06-23T14:05:00Z",
    body_hash: "shared",
    body_available: true,
    body_duplicate: true,
    body_shares: 2,
  },
  {
    record_id: "r-wire-2",
    source_id: "kr_wire",
    title: "와이어 도배 기사 B(같은 본문)",
    source_url: "https://wire.example/b",
    collected_at: "2026-06-23T14:10:00Z",
    body_hash: "shared",
    body_available: true,
    body_duplicate: true,
    body_shares: 2,
  },
  {
    record_id: "r-daily-1",
    source_id: "kr_daily",
    title: "일간지 기사",
    source_url: "https://daily.example/c",
    collected_at: "2026-06-23T14:40:00Z",
    body_hash: "own",
    body_available: false,
    body_duplicate: false,
    body_shares: 1,
  },
];

function contributions(source = ""): ContributionsResponse {
  const rows = source ? ARTICLES.filter((r) => r.source_id === source) : ARTICLES;
  return {
    basis: {
      axis: "KR",
      subject: SKEWED.subject,
      bucket_unit: "hour",
      time_bucket: "2026-06-23T14",
      source,
      raw_count: ARTICLES.length,
      total: ARTICLES.length,
      listed: rows.length,
      analyzer_version: "",
    },
    sources: [
      { source_id: "kr_wire", listed: 2 },
      { source_id: "kr_daily", listed: 1 },
    ],
    rows,
  };
}

function stubFairness(
  body: FairnessResponse = response(),
  articles: (url: string) => ContributionsResponse = (url) =>
    contributions(new URL(url, "http://x").searchParams.get("source") ?? ""),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => (url.includes("/contributions") ? articles(url) : body),
    })),
  );
}

function renderFairness() {
  return render(
    <MemoryRouter>
      <Fairness />
    </MemoryRouter>,
  );
}

function rowFor(container: HTMLElement, subject: string): HTMLElement {
  const row = [...container.querySelectorAll("tbody tr")].find((tr) =>
    tr.textContent?.includes(subject),
  );
  if (!row) throw new Error(`no row for ${subject}`);
  return row as HTMLElement;
}

/** The two share cells of one row, in column order: raw, then normalized. */
function shareCells(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll(".share")] as HTMLElement[];
}

// AC3.8: the two values are present *at once* and told apart, rather than one
// standing in for the other.
it("shows the raw count and the normalized share as distinct values in one row", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(2));

  const row = rowFor(container, SKEWED.subject);
  expect(row.textContent).toContain(`원시 ${SKEWED.raw_count}건`);

  const [raw, normalized] = shareCells(row);
  expect(raw.querySelector(".pct")?.textContent).toBe(`${(SKEWED.raw_share * 100).toFixed(1)}%`);
  expect(normalized.querySelector(".pct")?.textContent).toBe(
    `${(SKEWED.normalized_share * 100).toFixed(1)}%`,
  );
  // Same subject, two different numbers — that difference is the whole point.
  expect(raw.querySelector(".pct")?.textContent).not.toBe(
    normalized.querySelector(".pct")?.textContent,
  );
});

// The toggle is only honest if pressing it changes what the screen says. It
// re-ranks on the selected mode and moves the emphasis to that column.
it("re-ranks and moves the emphasis when the counting mode is switched", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(2));

  const firstSubject = () => container.querySelector("tbody tr td")?.textContent;
  const emphasized = () =>
    [...container.querySelectorAll("tbody tr")]
      .map((tr) => [...tr.querySelectorAll(".share")].findIndex((s) => s.classList.contains("fair-on")))
      .join(",");

  // Normalized mode: the evenly-sourced subject leads, and the normalized
  // column (index 1) is the emphasized one.
  expect(firstSubject()).toBe(EVEN.subject);
  expect(emphasized()).toBe("1,1");
  expect(container.querySelector(".norm-flag")?.textContent).toContain("정규화");

  const toggle = container.querySelector(".norm-toggle") as HTMLElement;
  expect(toggle.textContent).toContain("수집량 정규화");
  fireEvent.click(toggle);

  // Raw mode: the ranking flips to the volume leader and the raw column
  // (index 0) takes the emphasis.
  await waitFor(() => expect(firstSubject()).toBe(SKEWED.subject));
  expect(emphasized()).toBe("0,0");
  expect(container.querySelector(".raw-flag")?.textContent).toContain("원시");
});

// The two steps this screen cannot open are named with their reason instead of
// being linked to an empty view (허위 컨트롤 금지).
it("states why the source breakdown is missing and offers no control for it", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(2));

  const note = [...container.querySelectorAll(".note")].find((n) =>
    n.textContent?.includes("소스별 기여 분해"),
  );
  expect(note, "소스 분해 부재 사유가 화면에 없다").toBeTruthy();
  expect(note?.textContent).toContain("수집원 차원이 없");
  expect(note?.querySelectorAll("a, button").length).toBe(0);
});

it("states the notation principle, and states it before any data arrives", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  const { container } = renderFairness();

  expect(container.querySelectorAll("tbody tr").length).toBe(0);

  const note = [...container.querySelectorAll(".note")].find((n) =>
    n.textContent?.includes("세는 방식을 항상 적어"),
  );
  expect(note, "표기 원칙 note 가 화면에 없다").toBeTruthy();
  expect(note?.textContent).toContain("모든 수치 옆에 세는 방식을 항상 적어 둡니다.");
  expect(note?.textContent).toContain(
    "표기가 없으면 원시 건수와 점유율을 섞어 읽게 되고, 그 순간 비교는 무의미해집니다.",
  );
});

// AC3.10: 목록이 그 값을 설명한다는 주장은 건수 등식으로만 선다. 화면은 두 수를
// 같은 자리에 적고, 갈리면 갈렸다고 말한다(수를 맞춰 보이려고 깎지 않는다).
it("lists the contributing articles and prints the count beside the raw count", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const tag = container.querySelector(".art-count");
  expect(tag?.textContent).toContain(`목록 ${ARTICLES.length}건`);
  expect(tag?.textContent).toContain(`원시 카운트 ${ARTICLES.length}건`);
  expect(container.querySelector(".art-mismatch")).toBeNull();

  // 각 행이 AC3.10 이 요구하는 세 값(수집원·수집 시각·본문 중복 여부)과 두 도달
  // 경로(원문 링크·원문 역추적)를 담는다.
  const first = container.querySelector(".art-row") as HTMLElement;
  expect(first.textContent).toContain(`수집원 ${ARTICLES[0].source_id}`);
  expect(first.textContent).toContain(ARTICLES[0].collected_at);
  expect(first.querySelector(".art-dup-badge")?.textContent).toContain(
    `본문 중복 ${ARTICLES[0].body_shares}건`,
  );
  expect(first.querySelector(`a[href="${ARTICLES[0].source_url}"]`)).toBeTruthy();
  expect(first.querySelector(`a[href="/trace?record_id=${ARTICLES[0].record_id}"]`)).toBeTruthy();
});

// 목록 건수가 원시 카운트와 갈리면 화면이 그것을 숨기지 않는다 — 이 note 가 없으면
// 「목록이 그 값을 설명한다」는 주장이 검증 없이 통과한다.
it("says so when the list does not reconcile with the raw count", async () => {
  stubFairness(response(), () => {
    const body = contributions();
    body.basis.raw_count = ARTICLES.length + 1;
    return body;
  });
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelector(".art-mismatch")).toBeTruthy());
  expect(container.querySelector(".art-mismatch")?.textContent).toContain("원시 카운트와 다릅니다");
});

// AC3.10: 수집원으로 좁히면 좁혀 조회한다 — 클라이언트 필터가 아니라 같은 라우트를
// 다시 물어야 「좁힌 건수의 합 = 전체」를 서빙이 책임진다.
it("narrows the list by collector with a fresh request", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const select = container.querySelector(".art-src select") as HTMLSelectElement;
  const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
  expect(options[0]).toContain("전체");
  expect(options.join(" ")).toContain("kr_wire (2건)");

  fireEvent.change(select, { target: { value: "kr_wire" } });

  const wire = ARTICLES.filter((r) => r.source_id === "kr_wire");
  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(wire.length));
  for (const row of [...container.querySelectorAll(".art-row")]) {
    expect(row.textContent).toContain("수집원 kr_wire");
  }
  // 좁혀도 전체 건수는 그대로 적힌다 — 좁힌 수가 그 값의 전부인 것처럼 읽히면 안 된다.
  expect(container.querySelector(".art-count")?.textContent).toContain(`목록 ${ARTICLES.length}건`);
});

// 본문 중복 필터는 목업의 컨트롤이고, 켜면 실제로 목록이 줄어야 허위 컨트롤이 아니다.
it("keeps only the duplicated-body rows when that filter is on", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const dup = container.querySelector(".art-dup input") as HTMLInputElement;
  fireEvent.click(dup);

  const duplicated = ARTICLES.filter((r) => r.body_duplicate);
  await waitFor(() =>
    expect(container.querySelectorAll(".art-row").length).toBe(duplicated.length),
  );
  expect(duplicated.length).toBeLessThan(ARTICLES.length);
});

// 표에서 대상을 고르는 것이 목록의 축이다. 고르지 않았으면 지금 세는 방식의 1위가
// 열리고, 고르면 그 대상으로 옮겨 간다.
it("opens the list on the leading subject and follows the picked one", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));
  expect(container.querySelector(".art-card .sub")?.textContent).toContain(EVEN.subject);

  const pick = [...container.querySelectorAll(".art-pick")].find(
    (b) => b.textContent === SKEWED.subject,
  ) as HTMLElement;
  fireEvent.click(pick);

  await waitFor(() =>
    expect(container.querySelector(".art-card .sub")?.textContent).toContain(SKEWED.subject),
  );
  expect(pick.getAttribute("aria-pressed")).toBe("true");
});
