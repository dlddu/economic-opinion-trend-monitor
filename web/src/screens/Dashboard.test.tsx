import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Dashboard } from "./Dashboard";
import { AppShell } from "../shell/AppShell";
import type { DashboardResponse } from "../api/types";

afterEach(() => {
  vi.unstubAllGlobals();
  // 이 레포는 vitest globals 를 켜지 않아 자동 cleanup 이 없다 — 지우지 않으면 앞
  // 테스트가 남긴 도착 주소가 다음 테스트의 조회에 함께 잡힌다.
  cleanup();
  // 저장소도 테스트 사이에 살아남는다 — 지우지 않으면 앞 테스트가 남긴 조건이 다음 테스트의 진입 조건이 된다.
  localStorage.clear();
});

function response(): DashboardResponse {
  return {
    axis: "KR",
    normalized: true,
    basis: {
      range: "7d",
      unit: "day",
      bucket: "2026-06-23",
      previous_bucket: "2026-06-22",
      has_baseline: true,
      buckets: ["2026-06-21", "2026-06-22", "2026-06-23"],
      empty_window: false,
      last_bucket: "2026-06-23",
    },
    summary: {
      collected: 4812,
      collected_prev: 4618,
      analyzed: 4551,
      coverage: 0.946,
      low_confidence: 0.054,
    },
    top_subjects: [
      {
        rank: 1,
        subject: "기준금리",
        raw_count: 60,
        raw_rank: 2,
        normalized_share: 0.21,
        delta: 7,
        is_new: false,
        spark: [0.14, 0.19, 0.21],
      },
      {
        rank: 2,
        subject: "삼성전자",
        raw_count: 30,
        raw_rank: 3,
        normalized_share: 0.13,
        delta: -1.2,
        is_new: false,
        spark: [0.14, 0.14, 0.13],
      },
      {
        rank: 3,
        subject: "전기요금",
        raw_count: 70,
        raw_rank: 1,
        normalized_share: 0.079,
        delta: 0,
        is_new: false,
        spark: [0.08, 0.079, 0.079],
      },
      {
        rank: 4,
        subject: "반도체 보조금",
        raw_count: 9,
        raw_rank: 4,
        normalized_share: 0.066,
        delta: 6.6,
        is_new: true,
        spark: [0, 0, 0.066],
      },
    ],
  };
}

function stubDashboard(body: DashboardResponse) {
  const fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    url,
    json: async () => body,
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function Landing() {
  const { pathname, search } = useLocation();
  return <div data-testid="landed">{`${pathname}${search}`}</div>;
}

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trend" element={<Landing />} />
      </Routes>
    </MemoryRouter>,
  );
}

function axisSelect(container: HTMLElement): HTMLSelectElement {
  return container.querySelector<HTMLSelectElement>(".dash-brief-field select")!;
}

describe("Dashboard", () => {
  it("asks serving for the brief's window — 최근 7일, by day, by default", async () => {
    const fetch = stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(fetch.mock.calls[0][0]).toBe("/api/dashboard?axis=KR&range=7d&unit=day");
  });

  it("sends both the axis and the subject when a rank row drills into the trend", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.click(container.querySelectorAll(".rankrow")[1]);

    await waitFor(() =>
      expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
        `/trend?axis=KR&subject=${encodeURIComponent("삼성전자")}`,
      ),
    );
  });

  it("carries the axis the reader picked in the brief card, not the default one", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.change(axisSelect(container), { target: { value: "US" } });
    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.click(container.querySelectorAll(".rankrow")[0]);

    await waitFor(() =>
      expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
        `/trend?axis=US&subject=${encodeURIComponent("기준금리")}`,
      ),
    );
  });

  it("keeps the journey metadata off the product plane, folded under 여정 문서 정보", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(container.querySelector(".lede")).toBeNull();
    expect(container.querySelector(".sentbar")).toBeNull();
    const meta = container.querySelector("details.meta");
    expect(meta?.querySelector("summary")?.textContent).toBe("여정 문서 정보");
    expect(meta?.querySelector(".mapstrip")).not.toBeNull();
    expect(container.querySelectorAll(".mapstrip")).toHaveLength(1);
  });
});

describe("Dashboard — 지표 카드", () => {
  it("draws the mockup's four tiles from the summary", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".card.metric")).toHaveLength(4));
    const tiles = [...container.querySelectorAll(".card.metric")];
    const label = (i: number) => tiles[i].querySelector(".ml")?.textContent;
    const value = (i: number) => tiles[i].querySelector(".mv")?.textContent;
    await waitFor(() => expect(value(0)).toBe("4,812"));

    expect([0, 1, 2, 3].map(label)).toEqual(["수집 항목", "분석 완료", "저신뢰 분리", "세는 방식"]);
    expect(tiles[0].querySelector(".md")?.textContent).toBe("▲ 4.2% 전일 대비");
    expect(tiles[0].querySelector(".delta")?.className).toBe("delta up");
    expect(value(1)).toBe("4,551");
    expect(tiles[1].querySelector(".md")?.textContent).toBe("94.6% 분석 커버리지");
    expect(value(2)).toBe("5.4%");
    expect(value(3)).toBe("점유율");
    expect(tiles[3].querySelector(".norm-flag")?.textContent).toBe("▣ share-normalized");
  });

  it("does not invent a day-over-day change when there is no previous count", async () => {
    const body = response();
    body.summary = { ...body.summary!, collected_prev: null };
    stubDashboard(body);
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const first = container.querySelector(".card.metric .md");
    expect(first?.textContent).toBe("— 전일 대비");
  });
});

describe("Dashboard — 상위 서술 대상", () => {
  it("dates the card by the window it reads", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const head = [...container.querySelectorAll(".card-h")].find((h) =>
      h.textContent?.startsWith("상위 서술 대상"),
    );
    expect(head?.querySelector(".sub")?.textContent).toBe("한국 축 · 최근 7일");
  });

  it("writes the change as a coloured figure, not a grey chip, and draws the spark in the same tone", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const rows = [...container.querySelectorAll(".rankrow")];
    const dlt = (i: number) => rows[i].querySelector(".dlt")!;

    expect(dlt(0).textContent).toBe("▲ 7.0%p");
    expect(dlt(0).className).toBe("dlt up");
    expect(dlt(1).textContent).toBe("▼ 1.2%p");
    expect(dlt(1).className).toBe("dlt dn");
    expect(dlt(2).textContent).toBe("–");
    expect(container.querySelector(".rankrow .delta")).toBeNull();

    expect(rows[0].querySelector(".spark polyline")?.getAttribute("stroke")).toBe("var(--pos)");
    expect(rows[1].querySelector(".spark polyline")?.getAttribute("stroke")).toBe("var(--neg)");
  });

  it("notes a normalization reorder and an overnight entry, and nothing else", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const meta = [...container.querySelectorAll(".rankrow")].map(
      (r) => r.querySelector(".meta")?.textContent ?? null,
    );
    expect(meta).toEqual([null, null, "· 원시 카운트 1위 → 정규화 3위", "· 밤사이 새로 진입"]);
  });

  it("says there is no baseline rather than a zero change", async () => {
    const body = response();
    body.basis = { ...body.basis, has_baseline: false, previous_bucket: "" };
    stubDashboard(body);
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const texts = [...container.querySelectorAll(".rankrow .dlt")].map((d) => d.textContent);
    expect(texts).toEqual(["—", "—", "—", "—"]);
    expect(container.querySelector(".rankrow:last-child .meta")).toBeNull();
  });

  it("marks an axis the latest collection did not reach instead of drawing zeros", async () => {
    const body = response();
    body.basis = { ...body.basis, empty_window: true, last_bucket: "2026-06-22", buckets: [] };
    body.summary = null;
    body.top_subjects = [];
    stubDashboard(body);
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelector(".dash-banner")).not.toBeNull());
    const banner = container.querySelector(".dash-banner")!;
    expect(banner.textContent).toContain("한국 축은 밤사이 수집이 들어오지 않았습니다.");
    expect(banner.querySelector(".mono")?.textContent).toBe("2026-06-22");
    expect(container.querySelectorAll(".rankrow")).toHaveLength(0);
    expect(container.querySelector(".card.metric .mv")?.textContent).toBe("—");
  });
});

describe("Dashboard — 오늘의 조회 조건", () => {
  it("draws the card the journey promises, with the axis select and the copy that dates the promise", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));

    const heads = [...container.querySelectorAll(".card-h")].map((h) => h.textContent);
    expect(heads).toContain("오늘의 조회 조건어제 닫을 때의 조건으로 열립니다");
    expect([...axisSelect(container).options].map((o) => o.textContent)).toEqual([
      "한국",
      "미국",
      "전세계",
    ]);
    expect(container.querySelector(".dash-brief-check")?.textContent).toContain(
      "마지막 조회 조건으로 열기",
    );
    const note = container.querySelector(".note.info")!;
    expect(note.querySelector("svg.ic")).not.toBeNull();
    expect(note.textContent).toContain("닫을 때의 축·기간이 그대로 복원되어");
  });

  it("narrows the rank list by the search term without re-querying serving", async () => {
    const fetch = stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const calls = fetch.mock.calls.length;

    fireEvent.change(container.querySelector('input[type="search"]')!, {
      target: { value: "삼성" },
    });

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(1));
    expect(container.querySelector(".rankrow .nm")?.textContent).toContain("삼성전자");
    expect(fetch.mock.calls).toHaveLength(calls);
  });

  it("says the search came up empty instead of claiming there is no data", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.change(container.querySelector('input[type="search"]')!, {
      target: { value: "없는대상" },
    });

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(0));
    expect(container.querySelector(".dash-brief-empty")?.textContent).toBe(
      "검색어에 걸리는 대상이 없습니다.",
    );
  });

  it("reopens with the conditions the reader left, across a closed tab", async () => {
    stubDashboard(response());
    const first = renderDashboard();

    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.change(axisSelect(first.container), { target: { value: "US" } });
    fireEvent.change(first.container.querySelector('input[type="search"]')!, {
      target: { value: "기준" },
    });
    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(1));
    cleanup();

    expect(sessionStorage.getItem("econ-monitor:dash:brief")).toBeNull();
    const stored = JSON.parse(localStorage.getItem("econ-monitor:dash:brief")!);
    expect(stored).toMatchObject({ axis: "US", q: "기준", range: "7d", unit: "day" });

    const again = renderDashboard();
    await waitFor(() => expect(again.container.querySelectorAll(".rankrow")).toHaveLength(1));
    expect(again.container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe(
      "기준",
    );
    expect(axisSelect(again.container).value).toBe("US");
  });

  it("restores a stored window and asks serving for it", async () => {
    localStorage.setItem(
      "econ-monitor:dash:brief",
      JSON.stringify({ axis: "KR", q: "", restore: true, range: "30d", unit: "week" }),
    );
    const fetch = stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(fetch.mock.calls[0][0]).toBe("/api/dashboard?axis=KR&range=30d&unit=week");
  });

  it("opens on the defaults when restoring is off — but remembers that choice", async () => {
    stubDashboard(response());
    const first = renderDashboard();

    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.change(axisSelect(first.container), { target: { value: "US" } });
    fireEvent.change(first.container.querySelector('input[type="search"]')!, {
      target: { value: "기준" },
    });
    fireEvent.click(first.container.querySelector(".dash-brief-check input")!);
    await waitFor(() =>
      expect(first.container.querySelector<HTMLInputElement>(".dash-brief-check input")?.checked)
        .toBe(false),
    );
    cleanup();

    const again = renderDashboard();
    await waitFor(() => expect(again.container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(again.container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("");
    expect(axisSelect(again.container).value).toBe("KR");
    expect(
      again.container.querySelector<HTMLInputElement>(".dash-brief-check input")?.checked,
    ).toBe(false);
  });

  it("still renders when the browser refuses storage", async () => {
    stubDashboard(response());
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("storage disabled");
    });

    const { container } = renderDashboard();
    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(container.querySelector(".dash-brief-check")).not.toBeNull();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});

describe("Dashboard — 밤사이 변화 · 고른 대상", () => {
  function card(container: HTMLElement, title: string): HTMLElement {
    const head = [...container.querySelectorAll(".card-h")].find(
      (h) => h.querySelector("h3")?.textContent === title,
    )!;
    return head.parentElement as HTMLElement;
  }

  function trows(container: HTMLElement): HTMLButtonElement[] {
    return [...container.querySelectorAll<HTMLButtonElement>(".dash-trow")];
  }

  it("lists every ranked subject with its change, and badges the overnight entry", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(trows(container)).toHaveLength(4));
    const delta = card(container, "밤사이 변화");
    expect(delta.className).toBe("card col-7");
    expect(delta.querySelector(".card-h .sub")?.textContent).toBe("직전 동일 구간 대비");
    expect(delta.querySelector(".dash-tag")?.textContent).toBe("4개 대상");
    expect(trows(container).map((b) => b.querySelector(".dlt")?.textContent)).toEqual([
      "▲ 7.0%p",
      "▼ 1.2%p",
      "–",
      "▲ 6.6%p",
    ]);
    expect(trows(container).map((b) => b.querySelector(".badge")?.textContent ?? null)).toEqual([
      null,
      null,
      null,
      "신규",
    ]);
  });

  it("narrows the list by the threshold and by 새로 올라온 대상만 without re-querying serving", async () => {
    const fetch = stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(trows(container)).toHaveLength(4));
    const delta = card(container, "밤사이 변화");
    fireEvent.change(delta.querySelector('input[type="number"]')!, { target: { value: "2" } });
    expect(trows(container).map((b) => b.querySelector(".nm")?.textContent?.trim())).toEqual([
      "기준금리",
      "반도체 보조금 신규",
    ]);
    expect(delta.querySelector(".dash-tag")?.textContent).toBe("2개 대상");

    fireEvent.click(delta.querySelector(".dash-brief-check input")!);
    expect(trows(container)).toHaveLength(1);

    fireEvent.change(delta.querySelector('input[type="number"]')!, { target: { value: "9" } });
    expect(trows(container)).toHaveLength(0);
    expect(delta.querySelector(".dash-brief-empty")?.textContent).toBe(
      "이 조건에 걸리는 변화가 없습니다.",
    );
    expect(container.querySelectorAll(".rankrow")).toHaveLength(4);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("holds the picked subject instead of leaving for the trend, and unfolds it beside the list", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(trows(container)).toHaveLength(4));
    const pick = card(container, "고른 대상");
    expect(pick.className).toBe("card col-5");
    expect(pick.querySelector(".card-h .sub")?.textContent).toBe("오늘 더 볼 후보");
    expect(pick.querySelector('[data-state="no-selection"]')?.textContent).toBe(
      "왼쪽 목록에서 대상을 하나 고르면여기에 어제 대비 변화가 펼쳐집니다.",
    );

    fireEvent.click(trows(container)[3]);
    expect(container.querySelector('[data-testid="landed"]')).toBeNull();
    expect(trows(container).map((b) => b.getAttribute("aria-pressed"))).toEqual([
      "false",
      "false",
      "false",
      "true",
    ]);
    expect(pick.querySelector('[data-state="no-selection"]')).toBeNull();
    expect([...pick.querySelectorAll(".kv")].map((kv) => kv.textContent)).toEqual([
      "대상반도체 보조금",
      "점유율6.6%",
      "직전 동일 구간 대비▲ 6.6%p",
      "진입밤사이 새로 올라옴",
    ]);

    fireEvent.click(trows(container)[0]);
    expect(pick.querySelectorAll(".kv")[3].textContent).toBe("진입이전 구간에도 있었음");
  });

  it("keeps the pick while the filter hides its row", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(trows(container)).toHaveLength(4));
    fireEvent.click(trows(container)[1]);
    fireEvent.click(card(container, "밤사이 변화").querySelector(".dash-brief-check input")!);
    expect(trows(container)).toHaveLength(1);
    expect(card(container, "고른 대상").querySelector(".kv")?.textContent).toBe("대상삼성전자");
  });

  it("does not filter by a change it cannot compute, and claims no entry without a baseline", async () => {
    const body = response();
    body.basis.has_baseline = false;
    body.basis.previous_bucket = "";
    stubDashboard(body);
    const { container } = renderDashboard();

    await waitFor(() => expect(trows(container)).toHaveLength(4));
    fireEvent.change(card(container, "밤사이 변화").querySelector('input[type="number"]')!, {
      target: { value: "5" },
    });
    expect(trows(container)).toHaveLength(4);
    expect(trows(container).map((b) => b.querySelector(".dlt")?.textContent)).toEqual([
      "—",
      "—",
      "—",
      "—",
    ]);
    fireEvent.click(trows(container)[3]);
    expect(
      [...card(container, "고른 대상").querySelectorAll(".kv")].map((kv) => kv.textContent),
    ).toEqual(["대상반도체 보조금", "점유율6.6%", "직전 동일 구간 대비—", "진입이전 구간에도 있었음"]);
  });
});

describe("Dashboard — 셸 토프바", () => {
  function renderInShell() {
    return render(
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/trend" element={<Landing />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    );
  }

  it("titles the page by the journey and pills the window, with no journey crumb", async () => {
    stubDashboard(response());
    const { container } = renderInShell();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    expect(container.querySelector(".topbar h2")?.textContent).toBe("아침 정기 스캔");
    expect(container.querySelector(".topbar .pill-ctl")?.textContent).toBe(
      "한국 · 최근 7일 · 일 단위",
    );
    expect(container.querySelector(".topbar .step")).toBeNull();

    fireEvent.change(axisSelect(container), { target: { value: "GLOBAL" } });
    await waitFor(() =>
      expect(container.querySelector(".topbar .pill-ctl")?.textContent).toBe(
        "전세계 · 최근 7일 · 일 단위",
      ),
    );
  });

  it("hands the topbar back to the route when the screen is left", async () => {
    stubDashboard(response());
    const { container } = renderInShell();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    fireEvent.click(container.querySelectorAll(".rankrow")[0]);

    await waitFor(() => expect(container.querySelector('[data-testid="landed"]')).not.toBeNull());
    expect(container.querySelector(".topbar h2")?.textContent).toBe("대상 추세 상세");
    expect(container.querySelector(".topbar .pill-ctl")).toBeNull();
  });

  it("gives every nav item an icon, so the collapsed rail is never blank", async () => {
    stubDashboard(response());
    const { container } = renderInShell();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(4));
    const items = [...container.querySelectorAll(".nav-item")];
    expect(items).toHaveLength(8);
    for (const item of items) {
      expect(item.querySelector("svg.ic path, svg.ic circle")).not.toBeNull();
      expect(item.querySelector(".jn")).toBeNull();
    }
    expect(items[6].className).toContain("op");
    expect(items[7].className).toContain("op");
  });
});
