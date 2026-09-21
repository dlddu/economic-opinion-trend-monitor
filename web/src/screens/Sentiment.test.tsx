import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Sentiment } from "./Sentiment";
import type { SentimentResponse } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

const BUCKETS = ["2026-06-23T13", "2026-06-23T14"];

// Expected values are never written as constants: every assertion below is
// derived from this stub, the way `ac3-6-sentiment-ratio-viz.spec.ts` derives
// its expectations from the serving response. Change the numbers here and the
// tests stay correct; they break only when the drawing stops matching the data.
function response(axis: SentimentResponse["axis"] = "KR"): SentimentResponse {
  const early = { positive: 0.5, neutral: 0.3, negative: 0.1, mixed: 0.1, unanalyzed: 0.05 };
  const late = { positive: 0.2, neutral: 0.3, negative: 0.4, mixed: 0.1, unanalyzed: 0.25 };
  return {
    axis,
    basis: {
      bucket_unit: "hour",
      first_bucket: BUCKETS[0],
      latest_bucket: BUCKETS[1],
      buckets: BUCKETS,
      normalized: true,
    },
    series: [
      { time_bucket: BUCKETS[0], distribution: early, analyzed_total: 19 },
      { time_bucket: BUCKETS[1], distribution: late, analyzed_total: 12 },
    ],
    by_axis: [
      { axis: "KR", distribution: late, analyzed_total: 12, present: true },
      { axis: "US", distribution: early, analyzed_total: 8, present: true },
      // GLOBAL was not aggregated for this bucket — not "all zero".
      {
        axis: "GLOBAL",
        distribution: { positive: 0, neutral: 0, negative: 0, mixed: 0, unanalyzed: 0 },
        analyzed_total: 0,
        present: false,
      },
    ],
  };
}

/** Captures every /api/sentiment URL the screen asks for, answering each in turn. */
function stubSentiment(bodies: SentimentResponse[]) {
  const urls: string[] = [];
  let call = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      urls.push(url);
      const body = bodies[Math.min(call, bodies.length - 1)];
      call += 1;
      return { ok: true, status: 200, statusText: "OK", json: async () => body };
    }),
  );
  return urls;
}

// 화면이 `Link` 로 이탈 동선을 그리므로 라우터 컨텍스트 없이는 렌더가 던진다.
function renderScreen() {
  return render(
    <MemoryRouter>
      <Sentiment />
    </MemoryRouter>,
  );
}

function barHeights(container: HTMLElement, bucket: string): Record<string, number> {
  const group = container.querySelector(`g[data-bucket="${bucket}"]`);
  if (!group) throw new Error(`no bar for ${bucket}`);
  const out: Record<string, number> = {};
  group.querySelectorAll("rect[data-cls]").forEach((el) => {
    out[el.getAttribute("data-cls") ?? ""] = Number.parseFloat(el.getAttribute("height") ?? "0");
  });
  return out;
}

describe("Sentiment", () => {
  it("draws one stacked bar per bucket whose segments keep the aggregate's proportions", async () => {
    const body = response();
    stubSentiment([body]);
    const { container } = renderScreen();

    await waitFor(() => expect(container.querySelectorAll("g[data-bucket]")).toHaveLength(2));

    const dist = body.series[1].distribution;
    const heights = barHeights(container, BUCKETS[1]);

    // Comparing ratios between classes, not absolute heights: the four are
    // scaled by the analyzed share, so the scale constant cancels out and the
    // test does not have to know it.
    expect(heights["s-neg"] / heights["s-pos"]).toBeCloseTo(dist.negative / dist.positive, 5);
    expect(heights["s-neu"] / heights["s-mix"]).toBeCloseTo(dist.neutral / dist.mixed, 5);
  });

  it("keeps 미분석 as its own segment instead of folding it into the four classes", async () => {
    const body = response();
    stubSentiment([body]);
    const { container } = renderScreen();

    await waitFor(() => expect(container.querySelectorAll("g[data-bucket]")).toHaveLength(2));

    const dist = body.series[1].distribution;
    const heights = barHeights(container, BUCKETS[1]);
    const classes = heights["s-pos"] + heights["s-neu"] + heights["s-neg"] + heights["s-mix"];
    const total = classes + heights["s-na"];

    // The bar is the whole bucket: classes take the analyzed share of it and
    // 미분석 takes the rest. If they were ever summed together the classes
    // alone would fill the bar and this split would collapse.
    expect(heights["s-na"] / total).toBeCloseTo(dist.unanalyzed, 5);
    expect(classes / total).toBeCloseTo(1 - dist.unanalyzed, 5);
  });

  it("marks an axis Gold has no row for instead of drawing it as zero", async () => {
    stubSentiment([response()]);
    const { container } = renderScreen();

    const absent = await waitFor(() => {
      const row = container.querySelector('[data-axis="GLOBAL"]');
      if (!row) throw new Error("no GLOBAL row");
      return row;
    });

    expect(absent.getAttribute("data-present")).toBe("false");
    // A marked gap, and no bar pretending the axis was measured.
    expect(absent.querySelector(".sentbar")).toBeNull();
    // Scoped to this row on purpose: these tests share one document (there is
    // no auto-cleanup between them), so a document-wide text query would match
    // the rows earlier cases left behind.
    expect(absent.textContent).toContain("집계 없음");

    // The axes that do have rows are still drawn.
    expect(container.querySelector('[data-axis="KR"] .sentbar')).not.toBeNull();
  });

  it("asks the server again when the axis changes", async () => {
    const urls = stubSentiment([response("KR"), response("US")]);
    const { container } = renderScreen();

    await waitFor(() => expect(container.querySelectorAll("g[data-bucket]")).toHaveLength(2));
    expect(urls[0]).toContain("axis=KR");

    // The switch is queried through the control, not by its text: "미국" is also
    // the label of the US row in the axis comparison below it.
    const buttons = container.querySelectorAll(".seg button");
    expect(buttons).toHaveLength(3);
    fireEvent.click(buttons[1]);

    // The comparison bucket is chosen over all axes, so the axis cannot be a
    // client-side filter — a new request is the only correct behaviour.
    await waitFor(() => expect(urls.length).toBeGreaterThan(1));
    expect(urls[urls.length - 1]).toContain("axis=US");
  });
});

function splitShares(container: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  container.querySelectorAll(".sent-split-kv .v[data-cls]").forEach((el) => {
    out[el.getAttribute("data-cls") ?? ""] = el.textContent ?? "";
  });
  return out;
}

describe("분리 전후 비율 전환", () => {
  it("swaps the denominator, so every class ratio moves by the unanalyzed share", async () => {
    stubSentiment([response()]);
    const { container } = renderScreen();

    const kr = response().by_axis.find((r) => r.axis === "KR")!;
    const analyzed = 1 - kr.distribution.unanalyzed;

    await waitFor(() => expect(container.querySelector(".sent-split-kv")).not.toBeNull());

    const chk = container.querySelector(".sent-split-chk input") as HTMLInputElement;
    expect(chk.checked).toBe(true);
    expect(splitShares(container)["s-neg"]).toBe(
      `${(kr.distribution.negative * 100).toFixed(1)}%`,
    );

    fireEvent.click(chk);

    expect(splitShares(container)["s-neg"]).toBe(
      `${(kr.distribution.negative * analyzed * 100).toFixed(1)}%`,
    );
    // 눌린 값은 원값보다 작아야 한다 — 두 형태가 실제로 다르다는 것부터 막아 둔다.
    expect(kr.distribution.unanalyzed).toBeGreaterThan(0);
  });

  it("says which denominator is in use, and switches that sentence with the box", async () => {
    stubSentiment([response()]);
    const { container } = renderScreen();

    const kr = response().by_axis.find((r) => r.axis === "KR")!;
    const total = Math.round(kr.analyzed_total / (1 - kr.distribution.unanalyzed));

    await waitFor(() => expect(container.querySelector(".sent-split-note")).not.toBeNull());

    const note = () => container.querySelector(".sent-split-note")?.textContent ?? "";
    expect(note()).toContain(
      `지금 보는 비율은 분석된 ${kr.analyzed_total}건만을 분모로 씁니다.`,
    );
    expect(note()).toContain(`미분석 ${total - kr.analyzed_total}건은 분리해 따로 셉니다.`);

    fireEvent.click(container.querySelector(".sent-split-chk input") as HTMLInputElement);

    expect(note()).toContain(
      "미분석을 분모에 섞으면 각 비율이 그만큼 눌립니다 — 어느 쪽이 줄었는지 구분되지 않습니다.",
    );
  });

  it("offers the one exit whose destination is a real screen", async () => {
    stubSentiment([response()]);
    const { container } = renderScreen();

    await waitFor(() => expect(container.querySelector(".sent-exit")).not.toBeNull());

    const card = container.querySelector(".sent-exit") as HTMLElement;
    expect(card.textContent).toContain("판별이 어렵다면");
    expect(card.textContent).toContain("다른 흐름으로 넘깁니다");
    expect(card.textContent).toContain(
      "분류 자체가 미심쩍으면 원문을 직접 보고, 분류 기준을 바꿔야 한다면 재처리로 넘기세요.",
    );

    const links = [...card.querySelectorAll("a")];
    expect(links.length).toBe(1);
    expect(links[0].textContent).toContain("정규화 비율로 다시 확인");
    expect(links[0].getAttribute("href")).toBe("/fairness");
  });
});
