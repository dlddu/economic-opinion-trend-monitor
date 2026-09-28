import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Compare } from "./Compare";
import type { Axis, CompareResponse } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

const DIST = { positive: 0.4, neutral: 0.3, negative: 0.2, mixed: 0.1, unanalyzed: 0.1 };

function column(axis: Axis, subject: string, share: number) {
  return {
    axis,
    top_subjects: [
      { rank: 1, subject, normalized_share: share, raw_count: 12, spark: [0.1, 0.2], delta: 0.3 },
    ],
    sentiment: DIST,
  };
}

function response(): CompareResponse {
  return {
    basis: { time_bucket: "2026-06-23T14", bucket_unit: "hour", normalized: true },
    axes: [
      column("KR", "금리", 0.5),
      column("US", "고용", 0.3),
      column("GLOBAL", "유가", 0.2),
    ],
  };
}

function stubCompare(body: CompareResponse = response()) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, status: 200, statusText: "OK", json: async () => body })),
  );
}

function Landing() {
  const { pathname, search } = useLocation();
  return <div data-testid="landed">{`${pathname}${search}`}</div>;
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={["/compare"]}>
      <Routes>
        <Route path="/compare" element={<Compare />} />
        <Route path="/trend" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );
}

function columnRows(container: HTMLElement, axis: Axis): HTMLElement[] {
  return [...container.querySelectorAll(`.cmpcol[data-axis="${axis}"] .cmprow`)] as HTMLElement[];
}

function exitCard(container: HTMLElement, heading: string): HTMLElement {
  const card = [...container.querySelectorAll(".cmp-exit")].find((el) =>
    el.querySelector("h3")?.textContent?.includes(heading),
  );
  if (!card) throw new Error(`no exit card titled ${heading}`);
  return card as HTMLElement;
}

it("offers both journey exits, each to its own destination", async () => {
  stubCompare();
  const { container } = renderScreen();

  await waitFor(() => expect(container.querySelectorAll(".cmp-exit").length).toBe(2));

  const toFairness = exitCard(container, "격차가 의심스러우면");
  expect(toFairness.textContent).toContain(
    "한 축만 유독 크다면, 관심이 큰 것인지 그 축의 수집이 많은 것인지부터 갈라야 합니다.",
  );
  const fairnessLink = toFairness.querySelector("a")!;
  expect(fairnessLink.textContent).toContain("수집량 차이인지 정규화로 확인");
  expect(fairnessLink.getAttribute("href")).toBe("/fairness");

  const toSentiment = exitCard(container, "분위기까지 보고 싶다면");
  expect(toSentiment.textContent).toContain("분위기 흐름으로 넘어가세요");
  const sentimentLink = toSentiment.querySelector("a")!;
  expect(sentimentLink.textContent).toContain("축별 분위기 분포 보기");
  expect(sentimentLink.getAttribute("href")).toBe("/sentiment");
});

it("keeps the exits out of the three compared columns", async () => {
  stubCompare();
  const { container } = renderScreen();

  await waitFor(() => expect(container.querySelectorAll(".cmp-exit").length).toBe(2));

  expect(container.querySelectorAll(".cmpcol").length).toBe(3);
  expect(container.querySelectorAll(".cmp-exit .cmprow").length).toBe(0);
  expect(container.querySelectorAll(".cmp-exit .norm-flag").length).toBe(0);
  expect(container.querySelectorAll(".norm-flag").length).toBe(1);
});

it("carries the picked subject into the trend detail, keeping the column's axis", async () => {
  stubCompare();
  const { container } = renderScreen();

  await waitFor(() => expect(container.querySelectorAll(".cmprow").length).toBe(3));
  fireEvent.click(columnRows(container, "KR")[0]);

  await waitFor(() =>
    expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
      `/trend?axis=KR&subject=${encodeURIComponent("금리")}`,
    ),
  );
});

it("sends the axis of the column the row sits in, not the first one", async () => {
  stubCompare();
  const { container } = renderScreen();

  await waitFor(() => expect(container.querySelectorAll(".cmprow").length).toBe(3));
  fireEvent.click(columnRows(container, "GLOBAL")[0]);

  await waitFor(() =>
    expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
      `/trend?axis=GLOBAL&subject=${encodeURIComponent("유가")}`,
    ),
  );
});
