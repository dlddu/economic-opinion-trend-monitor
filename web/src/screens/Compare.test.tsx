import { afterEach, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

function renderScreen() {
  return render(
    <MemoryRouter>
      <Compare />
    </MemoryRouter>,
  );
}

/** 여정 이탈 카드 한 장의 제목 → 링크 라벨·목적지. */
function exitCard(container: HTMLElement, heading: string): HTMLElement {
  const card = [...container.querySelectorAll(".cmp-exit")].find((el) =>
    el.querySelector("h3")?.textContent?.includes(heading),
  );
  if (!card) throw new Error(`no exit card titled ${heading}`);
  return card as HTMLElement;
}

// `JRN-axis-contrast` 는 축 비교를 끝낸 독자를 두 갈래로 내보낸다. 목업은 워크스루
// 단계마다 카드를 한 장씩 세우지만 구현은 한 페이지이므로, 확인할 것은 배치가 아니라
// **두 이탈이 다 있고 각자 제 목적지를 가리키는가**다.
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

// 이탈 카드는 비교 컬럼이 아니다 — 같은 그리드에 섞여 `.cmpcol` 로 세어지면 「세 축을
// 나란히」라는 이 화면의 단정이 조용히 넷이 된다(서빙 e2e 도 같은 수를 센다).
it("keeps the exits out of the three compared columns", async () => {
  stubCompare();
  const { container } = renderScreen();

  await waitFor(() => expect(container.querySelectorAll(".cmp-exit").length).toBe(2));

  expect(container.querySelectorAll(".cmpcol").length).toBe(3);
  expect(container.querySelectorAll(".cmp-exit .cmprow").length).toBe(0);
  expect(container.querySelectorAll(".cmp-exit .norm-flag").length).toBe(0);
  expect(container.querySelectorAll(".norm-flag").length).toBe(1);
});
