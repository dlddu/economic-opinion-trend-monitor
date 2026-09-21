import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Fairness } from "./Fairness";
import type { FairnessResponse } from "../api/types";

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

function stubFairness(body: FairnessResponse = response()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => body })),
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
  const { container } = render(<Fairness />);

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
  const { container } = render(<Fairness />);

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
  const { container } = render(<Fairness />);

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
  const { container } = render(<Fairness />);

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
