import { afterEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Trend } from "./Trend";
import type { TrendResponse } from "../api/types";

// The chart is the part of AC3.5 a browser test can only observe through
// rendered geometry, so pin the mapping here: every series must land on one
// shared scale and one shared x axis. The kind e2e spec
// (tests/e2e/specs/ac3-5-subject-trend-chart.spec.ts) asserts the same property
// against the real serving path; this test makes it cheap to keep true.

const RESPONSE: TrendResponse = {
  axis: "KR",
  subject: "가",
  basis: { bucket_unit: "hour", normalized: true, buckets: ["T11", "T12", "T13"] },
  series: [
    {
      subject: "가",
      selected: true,
      latest_share: 0.3,
      delta: 2.0,
      points: [
        { time_bucket: "T11", normalized_share: 0.1, raw_count: 10 },
        { time_bucket: "T12", normalized_share: 0.2, raw_count: 20 },
        { time_bucket: "T13", normalized_share: 0.3, raw_count: 30 },
      ],
    },
    {
      // Absent from T12 on purpose: the gap must stay a gap.
      subject: "나",
      selected: false,
      latest_share: 0.05,
      delta: -1.0,
      points: [
        { time_bucket: "T11", normalized_share: 0.15, raw_count: 12 },
        { time_bucket: "T13", normalized_share: 0.05, raw_count: 4 },
      ],
    },
  ],
};

function stubFetch(body: TrendResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body)))),
  );
}

function parsePoints(line: Element): { x: number; y: number }[] {
  return (line.getAttribute("points") ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(",").map(Number);
      return { x, y };
    });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("Trend chart", () => {
  it("plots every series on one shared scale and one shared x axis", async () => {
    stubFetch(RESPONSE);
    const { container } = render(
      <MemoryRouter>
        <Trend />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelectorAll("polyline.tseries")).toHaveLength(2));

    const ticks = [...container.querySelectorAll(".trend-x text")];
    expect(ticks.map((t) => t.getAttribute("data-bucket"))).toEqual(RESPONSE.basis.buckets);
    const tickX = new Map(ticks.map((t) => [t.getAttribute("data-bucket"), Number(t.getAttribute("x"))]));

    const plotted: { share: number; y: number }[] = [];
    for (const series of RESPONSE.series) {
      const line = container.querySelector(`polyline.tseries[data-subject="${series.subject}"]`)!;
      const drawn = parsePoints(line);
      // A missing bucket leaves a gap rather than shifting later points left.
      expect(drawn).toHaveLength(series.points.length);
      series.points.forEach((point, i) => {
        expect(drawn[i].x).toBe(tickX.get(point.time_bucket));
        plotted.push({ share: point.normalized_share, y: drawn[i].y });
      });
    }

    // One scale for all of them: y must be a single decreasing affine function
    // of share. Checking the slope between every pair proves that without
    // re-deriving the component's own formula.
    const slopes = plotted.flatMap((a, i) =>
      plotted.slice(i + 1).map((b) => (a.y - b.y) / (a.share - b.share)),
    );
    for (const slope of slopes) {
      expect(slope).toBeCloseTo(slopes[0], 6);
    }
    expect(slopes[0]).toBeLessThan(0); // a bigger share sits higher on the chart
  });

  it("marks the selected subject and reports its latest share", async () => {
    stubFetch(RESPONSE);
    const { container } = render(
      <MemoryRouter initialEntries={["/trend?subject=%EA%B0%80"]}>
        <Trend />
      </MemoryRouter>,
    );

    await waitFor(() => expect(container.querySelector(".trend-metric")).not.toBeNull());
    expect(container.querySelector('polyline.tseries[data-selected="true"]')?.getAttribute("data-subject")).toBe("가");
    expect(container.querySelector(".trend-metric .mv")?.textContent).toBe("30.0%");
    expect(container.querySelector(".trend-metric .delta")?.textContent).toBe("▲ 2.0%p");

    // Every series is offered as a comparison subject to switch to.
    expect(container.querySelectorAll(".trend-pick-item")).toHaveLength(2);
  });
});
