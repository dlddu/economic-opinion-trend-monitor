import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { Trend } from "./Trend";
import type { TrendResponse } from "../api/types";

afterEach(() => vi.unstubAllGlobals());

const BUCKETS = ["2026-06-23T12", "2026-06-23T13", "2026-06-23T14"];

function response(selected = "기준금리"): TrendResponse {
  const series = [
    { subject: "기준금리", shares: [0.2, 0.3, 0.5], delta: 20 },
    { subject: "삼성전자", shares: [0.5, 0.4, 0.3], delta: -10 },
  ];
  return {
    axis: "KR",
    subject: selected,
    basis: {
      bucket_unit: "hour",
      first_bucket: BUCKETS[0],
      latest_bucket: BUCKETS[2],
      buckets: BUCKETS,
      normalized: true,
    },
    series: series.map((s) => ({
      subject: s.subject,
      selected: s.subject === selected,
      latest_share: s.shares[2],
      delta: s.delta,
      points: s.shares.map((share, i) => ({
        time_bucket: BUCKETS[i],
        normalized_share: share,
        raw_count: Math.round(share * 100),
      })),
    })),
  };
}

/** Captures every /api/trend URL the screen asks for, answering each in turn. */
function stubTrend(bodies: TrendResponse[]) {
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

function polylinePoints(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll("polyline")).map((el) =>
    el.getAttribute("points") ?? "",
  );
}

describe("Trend", () => {
  it("plots one x position per bucket, in bucket order", async () => {
    stubTrend([response()]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(2));

    const [lead] = polylinePoints(container);
    const xs = lead.split(" ").map((p) => Number.parseFloat(p.split(",")[0]));
    const ys = lead.split(" ").map((p) => Number.parseFloat(p.split(",")[1]));

    expect(xs).toHaveLength(BUCKETS.length);
    // Left to right, evenly spaced across the plot area.
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    // The lead series rises 0.2 -> 0.3 -> 0.5, and SVG y grows downward, so a
    // rising share has to come back as a falling y. This is what catches an
    // inverted scale, which a shares-only assertion would miss.
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(ys[1]).toBeGreaterThan(ys[2]);
  });

  it("shows the selected subject's headline share and delta", async () => {
    stubTrend([response()]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelector(".metric .mv")).not.toBeNull());
    expect(container.querySelector(".metric .mv")?.textContent).toContain("50.0");
    expect(container.querySelector(".metric .md")?.textContent).toContain("▲ 20.0%p");
  });

  it("re-asks the API for the subject the reader picks", async () => {
    const urls = stubTrend([response(), response("삼성전자")]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelectorAll("table.tbl tr.click")).toHaveLength(2));
    // The comparison table doubles as the picker, as the mockup's
    // `STP-drill-trend` draws it: selecting resolves server side, because the
    // comparison set itself depends on which subject is selected.
    fireEvent.click(container.querySelectorAll("table.tbl tr.click")[1]);

    await waitFor(() => expect(urls).toHaveLength(2));
    expect(urls[0]).toContain("/api/trend?axis=KR");
    expect(urls[0]).not.toContain("subject=");
    expect(urls[1]).toContain(`subject=${encodeURIComponent("삼성전자")}`);

    await waitFor(() =>
      expect(container.querySelector("table.tbl tr.click.on")?.textContent).toContain("삼성전자"),
    );
  });

  it("puts the window mean beside the current share, as the mockup's table does", async () => {
    stubTrend([response()]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelectorAll("table.tbl tr.click")).toHaveLength(2));

    const headers = Array.from(container.querySelectorAll("table.tbl thead th")).map(
      (th) => th.textContent ?? "",
    );
    expect(headers[1]).toBe("현재 점유율");
    expect(headers[2]).toBe("구간 평균");

    // 기준금리 rises 0.2 -> 0.3 -> 0.5: the mean (33.3%) is a *different* number
    // from the latest share (50.0%), so a column that copies the headline value
    // instead of averaging the buckets fails here.
    const lead = container.querySelectorAll("table.tbl tbody tr")[0].querySelectorAll("td");
    expect(lead[1].textContent).toBe("50.0%");
    expect(lead[2].textContent).toBe("33.3%");

    const other = container.querySelectorAll("table.tbl tbody tr")[1].querySelectorAll("td");
    expect(other[1].textContent).toBe("30.0%");
    expect(other[2].textContent).toBe("40.0%");
  });

  it("says an axis has nothing aggregated instead of drawing an empty chart", async () => {
    const empty: TrendResponse = {
      axis: "KR",
      subject: "",
      basis: {
        bucket_unit: "",
        first_bucket: "",
        latest_bucket: "",
        buckets: [],
        normalized: true,
      },
      series: [],
    };
    stubTrend([empty]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelector(".trend-empty")).not.toBeNull());
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });

  it("does not offer a bucket-unit switch while rollups are unimplemented", async () => {
    stubTrend([response()]);
    const { container } = render(<Trend />);

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(2));
    // Every button on the screen must do something: only the axis segment (3)
    // is a button — subject selection rides on the comparison table's rows. A
    // 시간/일/주 switch would have nothing behind it until AC3.3 lands, so it
    // must not be drawn.
    const labels = Array.from(container.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(labels.filter((l) => ["시간", "일", "주"].includes(l.trim()))).toHaveLength(0);
    expect(container.querySelectorAll(".seg button")).toHaveLength(3);
  });
});
