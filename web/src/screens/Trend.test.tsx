import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Trend } from "./Trend";
import type { TrendResponse } from "../api/types";

/**
 * 화면이 진입 쿼리를 읽으므로 라우터 안에서 렌더한다. `entry` 가 곧 `Dashboard` 가
 * `navigate()` 로 밀어 넣는 주소다 — 기본값은 쿼리 없는 직접 진입(네비게이션 바).
 */
function renderTrend(entry = "/trend") {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Trend />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  // 화면이 마지막 조회 조건을 세션에 남긴다(여정 §4 의 중도 이탈 분기). 지우지 않으면
  // 앞 테스트가 고른 축·대상이 다음 테스트의 첫 질의로 새어 나간다.
  sessionStorage.clear();
});

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
    const { container } = renderTrend();

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

    await waitFor(() => expect(container.querySelectorAll("polyline")).toHaveLength(2));
    // Every button on the screen must do something: only the axis segment (3)
    // is a button — subject selection rides on the comparison table's rows. A
    // 시간/일/주 switch has nothing behind it, so it must not be drawn.
    const labels = Array.from(container.querySelectorAll("button")).map((b) => b.textContent ?? "");
    expect(labels.filter((l) => ["시간", "일", "주"].includes(l.trim()))).toHaveLength(0);
    expect(container.querySelectorAll(".seg button")).toHaveLength(3);
  });

  it("offers every compared subject as a shortlist candidate, with the drilled one pre-picked", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll(".trend-sl-cand")).toHaveLength(2));

    const boxes = Array.from(
      container.querySelectorAll<HTMLInputElement>(".trend-sl-cand input"),
    );
    // 후보는 이미 받은 비교 대상이다 — 서빙에 새로 묻는 것이 없다는 사실이 여기서 보인다.
    expect(boxes.map((b) => b.value)).toEqual(["기준금리", "삼성전자"]);
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
    expect(container.querySelector(".trend-sl-count")?.textContent).toBe("1개 선택");
  });

  it("names which half of the shortlist form is missing instead of one blanket message", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll(".trend-sl-cand")).toHaveLength(2));
    const form = container.querySelector("form") as HTMLFormElement;
    const err = container.querySelector(".trend-sl-banner.err") as HTMLElement;
    const good = container.querySelector(".trend-sl-banner.good") as HTMLElement;
    expect(err.hidden).toBe(true);

    // 후보는 골라져 있고 메모만 비었다 — 배너는 그 쪽을 지목해야 한다.
    fireEvent.submit(form);
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("왜 오늘 이것을 챙기는지 한 줄이라도");
    expect(good.hidden).toBe(true);

    // 반대로 메모만 채우고 후보를 전부 풀면 다른 쪽을 지목한다.
    fireEvent.change(container.querySelector("textarea") as HTMLTextAreaElement, {
      target: { value: "금리 결정 주간이라 하루 더 본다" },
    });
    fireEvent.click(container.querySelectorAll(".trend-sl-cand input")[0]);
    fireEvent.submit(form);
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("후보를 하나 이상 고르세요");
  });

  it("records the shortlist for the session and says so, without claiming a watchlist", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll(".trend-sl-cand")).toHaveLength(2));
    fireEvent.click(container.querySelectorAll(".trend-sl-cand input")[1]);
    fireEvent.change(container.querySelector("textarea") as HTMLTextAreaElement, {
      target: { value: "반도체 수출 지표 발표 전" },
    });
    expect(container.querySelector(".trend-sl-count")?.textContent).toBe("2개 선택");

    fireEvent.submit(container.querySelector("form") as HTMLFormElement);

    const good = container.querySelector(".trend-sl-banner.good") as HTMLElement;
    expect(good.hidden).toBe(false);
    expect(good.textContent).toContain("오늘 볼 대상을 추렸습니다.");
    expect(good.textContent).toContain("기준금리 · 삼성전자 — 2개를 오늘 볼 대상으로 남겼습니다.");
    // 배너가 경계를 직접 말해야, 화면이 하지 않는 일을 한다고 읽히지 않는다.
    expect(good.textContent).toContain("이 세션 안에서만");
    expect(good.textContent).toContain("워치리스트는 아직 없습니다");
    expect((container.querySelector(".trend-sl-banner.err") as HTMLElement).hidden).toBe(true);
  });

  it("reopens on the conditions the reader left, as the scan summary promises", async () => {
    const urls = stubTrend([response(), response("삼성전자")]);
    const first = renderTrend();

    await waitFor(() =>
      expect(first.container.querySelectorAll("table.tbl tr.click")).toHaveLength(2),
    );
    fireEvent.click(first.container.querySelectorAll("table.tbl tr.click")[1]);
    await waitFor(() => expect(urls).toHaveLength(2));
    first.unmount();

    // 다시 진입 — 「닫을 때의 조건이 다음 진입에 복원됩니다」가 사실이려면 첫 질의가
    // 기본값이 아니라 두고 간 대상이어야 한다.
    const again = renderTrend();
    await waitFor(() => expect(urls).toHaveLength(3));
    expect(urls[2]).toContain(`subject=${encodeURIComponent("삼성전자")}`);

    await waitFor(() =>
      expect(again.container.querySelector(".trend-sl-cand")).not.toBeNull(),
    );
    const summary = Array.from(again.container.querySelectorAll(".kv")).map(
      (kv) => kv.textContent ?? "",
    );
    expect(summary.some((row) => row.includes("상세로 내려간 대상") && row.includes("삼성전자"))).toBe(
      true,
    );
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
