/// <reference types="vite/client" />
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Trend } from "./Trend";
import type { TrendResponse } from "../api/types";

function renderTrend(entry = "/trend") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Trend />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  // 저장소도 테스트 사이에 살아남는다 — 지우지 않으면 앞 테스트가 남긴 조건이 다음 테스트의 진입 조건이 된다.
  localStorage.clear();
  sessionStorage.clear();
});

const BUCKETS = ["2026-06-23T12", "2026-06-23T13", "2026-06-23T14"];

function seriesResponse(buckets: string[], shares: number[]): TrendResponse {
  return {
    axis: "KR",
    subject: "기준금리",
    basis: {
      bucket_unit: "hour",
      first_bucket: buckets[0],
      latest_bucket: buckets[buckets.length - 1],
      buckets,
      normalized: true,
    },
    series: [
      {
        subject: "기준금리",
        selected: true,
        latest_share: shares[shares.length - 1],
        delta: 0,
        points: buckets.map((b, i) => ({ time_bucket: b, normalized_share: shares[i], raw_count: 1 })),
      },
    ],
  };
}

function axisLabels(container: HTMLElement, anchor: "middle" | "end"): string[] {
  return Array.from(container.querySelectorAll("text.axlab"))
    .filter((el) => el.getAttribute("y") === "240" && (el.getAttribute("text-anchor") ?? "") === anchor)
    .map((el) => el.textContent ?? "");
}

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

function legendNames(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll(".trend-legend > span")).map((el) =>
    (el.textContent ?? "").trim(),
  );
}

describe("Trend", () => {
  it("plots one x position per bucket, in bucket order", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));

    const [lead] = polylinePoints(container);
    const xs = lead.split(" ").map((p) => Number.parseFloat(p.split(",")[0]));
    const ys = lead.split(" ").map((p) => Number.parseFloat(p.split(",")[1]));

    expect(xs).toHaveLength(BUCKETS.length);
    expect(xs[0]).toBeLessThan(xs[1]);
    expect(xs[1]).toBeLessThan(xs[2]);
    // The lead series rises 0.2 -> 0.3 -> 0.5, and SVG y grows downward, so a
    // rising share has to come back as a falling y. This is what catches an
    // inverted scale, which a shares-only assertion would miss.
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(ys[1]).toBeGreaterThan(ys[2]);
  });

  it("labels at most seven buckets, dated once the window spans days", async () => {
    const start = Date.UTC(2026, 8, 24, 2);
    const buckets = Array.from({ length: 100 }, (_, i) =>
      new Date(start + i * 3_600_000).toISOString().slice(0, 13),
    );
    stubTrend([seriesResponse(buckets, buckets.map(() => 0.01))]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
    const ticks = [...axisLabels(container, "middle"), ...axisLabels(container, "end")];
    expect(ticks).toHaveLength(7);
    expect(ticks[0]).toBe("09-24 02시");
    expect(axisLabels(container, "end")).toEqual(["09-28 05시"]);
  });

  it("keeps same-day hourly ticks to the hour", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
    expect(axisLabels(container, "middle")).toEqual(["12시", "13시", "14시"]);
  });

  it("steps the share axis so no two gridline labels read the same", async () => {
    stubTrend([seriesResponse(["2026-06-23T12", "2026-06-23T13"], [0.004, 0.019])]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
    const labels = Array.from(container.querySelectorAll("text.axlab"))
      .filter((el) => el.getAttribute("text-anchor") === "end" && el.getAttribute("x") === "48")
      .map((el) => el.textContent);
    expect(labels).toEqual(["2.0%", "1.5%", "1.0%", "0.5%", "0"]);
  });

  it("draws the picked subject alone until 겹쳐 보기 is opted into", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
    const box = container.querySelector("input[name='tr-compare']") as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(box.closest("label")?.textContent).toContain("상위 대상 3개를 겹쳐 보기");
    expect(legendNames(container)).toEqual(["기준금리"]);
    expect(container.querySelectorAll("table.tbl tr.click")).toHaveLength(2);
    const [soloPoints] = polylinePoints(container);
    const soloStroke = container.querySelector("polyline")?.getAttribute("stroke");

    fireEvent.click(box);

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(2));
    expect(legendNames(container)).toEqual(["기준금리", "삼성전자"]);
    expect(polylinePoints(container)[0]).toBe(soloPoints);
    expect(container.querySelector("polyline")?.getAttribute("stroke")).toBe(soloStroke);

    fireEvent.click(box);

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
  });

  it("shows the selected subject's headline share and delta", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelector(".metric .mv")).not.toBeNull());
    expect(container.querySelector(".metric .mv")?.textContent).toContain("50.0");
    expect(container.querySelector(".metric .md")?.textContent).toContain("▲ 20.0%p");
  });

  it("re-asks the API for the subject the reader picks", async () => {
    const urls = stubTrend([response(), response("삼성전자")]);
    const { container } = renderTrend();

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
    const { container } = renderTrend();

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
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelector(".trend-empty")).not.toBeNull());
    expect(container.querySelectorAll("polyline")).toHaveLength(0);
  });

  it("does not offer a bucket-unit switch while rollups are unimplemented", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(1));
    const labels = Array.from(container.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(labels.filter((l) => ["시간", "일", "주"].includes(l.trim()))).toHaveLength(0);
    expect(container.querySelectorAll(".seg button")).toHaveLength(3);
  });

  it("reopens on the conditions the reader left", async () => {
    const urls = stubTrend([response(), response("삼성전자")]);
    const first = renderTrend();

    await waitFor(() =>
      expect(first.container.querySelectorAll("table.tbl tr.click")).toHaveLength(2),
    );
    fireEvent.click(first.container.querySelectorAll("table.tbl tr.click")[1]);
    await waitFor(() => expect(urls).toHaveLength(2));
    first.unmount();

    const again = renderTrend();
    await waitFor(() => expect(urls).toHaveLength(3));
    expect(urls[2]).toContain(`subject=${encodeURIComponent("삼성전자")}`);

    await waitFor(() =>
      expect(again.container.querySelector("table.tbl tr.click.on")?.textContent).toContain("삼성전자"),
    );
  });

  it("keeps the reader's conditions past the tab, like the dash brief card does", async () => {
    const urls = stubTrend([response(), response("삼성전자")]);
    const { container, unmount } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll("table.tbl tr.click")).toHaveLength(2));
    fireEvent.click(container.querySelectorAll("table.tbl tr.click")[1]);
    await waitFor(() => expect(urls).toHaveLength(2));
    unmount();

    expect(sessionStorage.getItem("econ-monitor:trend:view")).toBeNull();
    const stored = localStorage.getItem("econ-monitor:trend:view");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toMatchObject({ subject: "삼성전자" });
  });

  it("opens the subject the entry query names, not the axis default", async () => {
    const urls = stubTrend([response("삼성전자")]);
    renderTrend(`/trend?axis=KR&subject=${encodeURIComponent("삼성전자")}`);

    await waitFor(() => expect(urls).toHaveLength(1));
    expect(urls[0]).toContain("axis=KR");
    expect(urls[0]).toContain(`subject=${encodeURIComponent("삼성전자")}`);
  });

  it("carries the axis the entry query names", async () => {
    const urls = stubTrend([response()]);
    renderTrend("/trend?axis=US");

    await waitFor(() => expect(urls).toHaveLength(1));
    expect(urls[0]).toContain("/api/trend?axis=US");
    expect(urls[0]).not.toContain("subject=");
  });

  it("lets the entry query beat the session the reader left behind", async () => {
    const first = stubTrend([response(), response("삼성전자")]);
    const left = renderTrend();
    await waitFor(() => expect(left.container.querySelectorAll("table.tbl tr.click")).toHaveLength(2));
    fireEvent.click(left.container.querySelectorAll("table.tbl tr.click")[1]);
    await waitFor(() => expect(first).toHaveLength(2));
    left.unmount();

    const urls = stubTrend([response()]);
    renderTrend(`/trend?axis=KR&subject=${encodeURIComponent("기준금리")}`);

    await waitFor(() => expect(urls).toHaveLength(1));
    expect(urls[0]).toContain(`subject=${encodeURIComponent("기준금리")}`);
    expect(urls[0]).not.toContain(encodeURIComponent("삼성전자"));
  });
});
