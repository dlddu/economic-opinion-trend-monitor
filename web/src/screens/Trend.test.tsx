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

  it("offers every compared subject as a shortlist candidate, with the drilled one pre-picked", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll(".trend-sl-cand")).toHaveLength(2));

    const boxes = Array.from(
      container.querySelectorAll<HTMLInputElement>(".trend-sl-cand input"),
    );
    expect(boxes.map((b) => b.value)).toEqual(["기준금리", "삼성전자"]);
    expect(boxes.map((b) => b.checked)).toEqual([true, false]);
    expect(container.querySelector(".trend-sl-count")?.textContent).toBe("1개 선택");
  });

  it("names which half of the shortlist form is missing instead of one blanket message", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelectorAll(".trend-sl-cand")).toHaveLength(2));
    const form = container.querySelector(".trend-sl-form") as HTMLFormElement;
    const err = container.querySelector(".trend-sl-banner.err") as HTMLElement;
    const good = container.querySelector(".trend-sl-banner.good") as HTMLElement;
    expect(err.hidden).toBe(true);

    fireEvent.submit(form);
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain("왜 오늘 이것을 챙기는지 한 줄이라도");
    expect(good.hidden).toBe(true);

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

    fireEvent.submit(container.querySelector(".trend-sl-form") as HTMLFormElement);

    const good = container.querySelector(".trend-sl-banner.good") as HTMLElement;
    expect(good.hidden).toBe(false);
    expect(good.textContent).toContain("오늘 볼 대상을 추렸습니다.");
    expect(good.textContent).toContain("기준금리 · 삼성전자 — 2개를 오늘 볼 대상으로 남겼습니다.");
    expect(good.textContent).toContain("이 세션 안에서만");
    expect(good.textContent).toContain("워치리스트는 아직 없습니다");
    expect((container.querySelector(".trend-sl-banner.err") as HTMLElement).hidden).toBe(true);
  });

  it("offers the 온도차 판별 form with the mockup's three verdicts and memo prompt", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelector(".trend-vd-form")).not.toBeNull());

    const card = container.querySelector(".trend-vd-form")?.closest(".card") as HTMLElement;
    expect(card.querySelector("h3")?.textContent).toBe("온도차 판별");
    expect(card.querySelector(".sub")?.textContent).toBe("한 문장으로 설명할 수 있는 상태로 마칩니다");

    const radios = Array.from(card.querySelectorAll<HTMLInputElement>(".trend-vd-radio input"));
    expect(radios.map((r) => r.value)).toEqual(["persistent", "transient", "none"]);
    expect(radios.map((r) => r.checked)).toEqual([false, false, false]);
    expect(
      Array.from(card.querySelectorAll(".trend-vd-radio")).map((el) => el.textContent?.trim()),
    ).toEqual([
      "지속적인 온도차다 — 기간 내내 격차가 유지된다",
      "이번 구간만의 격차다 — 최근 며칠에만 벌어졌다",
      "차이 없음 — 축 간 관심사가 사실상 같다",
    ]);
    const memo = card.querySelector("textarea[name='verdict-memo']") as HTMLTextAreaElement;
    expect(memo.placeholder).toBe("어느 축이 언제부터 얼마나 벌어졌는지 적어 두세요.");
    expect(card.querySelector(".trend-sl-submit")?.textContent?.trim()).toBe("온도차 기록");
    expect((card.querySelector(".trend-sl-banner.err") as HTMLElement).hidden).toBe(true);
    expect((card.querySelector(".trend-sl-banner.good") as HTMLElement).hidden).toBe(true);
  });

  it("names which half of the 온도차 판별 form is missing, as the mockup's submitVerdict does", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelector(".trend-vd-form")).not.toBeNull());
    const form = container.querySelector(".trend-vd-form") as HTMLFormElement;
    const card = form.closest(".card") as HTMLElement;
    const err = card.querySelector(".trend-sl-banner.err") as HTMLElement;
    const good = card.querySelector(".trend-sl-banner.good") as HTMLElement;

    fireEvent.submit(form);
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe("결론을 하나 고르세요.");
    expect(good.hidden).toBe(true);

    fireEvent.click(card.querySelectorAll(".trend-vd-radio input")[0]);
    fireEvent.change(card.querySelector("textarea[name='verdict-memo']") as HTMLTextAreaElement, {
      target: { value: "   " },
    });
    fireEvent.submit(form);
    expect(err.hidden).toBe(false);
    expect(err.textContent).toBe(
      "근거 메모를 적어야 기록됩니다 — 어느 축이 언제부터 벌어졌는지가 결론의 실체입니다.",
    );
    expect(good.hidden).toBe(true);
    // 추림 폼의 배너는 이 폼의 제출에 반응하지 않는다 — 두 기록은 별개다.
    expect((container.querySelector(".trend-sl-banner.err") as HTMLElement).hidden).toBe(true);
  });

  it("records the 온도차 verdict for the session with the mockup's banner wording", async () => {
    stubTrend([response()]);
    const { container } = renderTrend();

    await waitFor(() => expect(container.querySelector(".trend-vd-form")).not.toBeNull());
    const form = container.querySelector(".trend-vd-form") as HTMLFormElement;
    const card = form.closest(".card") as HTMLElement;

    fireEvent.click(card.querySelectorAll(".trend-vd-radio input")[1]);
    fireEvent.change(card.querySelector("textarea[name='verdict-memo']") as HTMLTextAreaElement, {
      target: { value: "US 축만 이번 주 화요일부터 8%p 벌어졌다" },
    });
    fireEvent.submit(form);

    const good = card.querySelector(".trend-sl-banner.good") as HTMLElement;
    expect(good.hidden).toBe(false);
    expect(good.textContent).toContain("온도차를 기록했습니다.");
    expect(good.textContent).toContain("이번 구간만의 격차으로 판별했습니다.");
    expect((card.querySelector(".trend-sl-banner.err") as HTMLElement).hidden).toBe(true);
    expect(Object.keys(localStorage)).toEqual(["econ-monitor:trend:view"]);
    expect(sessionStorage.length).toBe(0);
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
