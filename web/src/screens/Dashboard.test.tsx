import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { Dashboard } from "./Dashboard";
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
    metrics: [{ label: "수집 건수", value: "120", note: "최근 버킷" }],
    sentiment: { positive: 40, neutral: 30, negative: 20, mixed: 5, unanalyzed: 5 },
    top_subjects: [
      {
        rank: 1,
        subject: "기준금리",
        raw_count: 60,
        normalized_share: 0.5,
        delta: 12,
        spark: [0.2, 0.3, 0.5],
      },
      {
        rank: 2,
        subject: "삼성전자",
        raw_count: 30,
        normalized_share: 0.25,
        delta: -4,
        spark: [0.4, 0.3, 0.25],
      },
    ],
  };
}

function stubDashboard(body: DashboardResponse) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => body,
    })),
  );
}

/** 라우트가 실제로 어디로 갔는지 읽는다 — 링크 문자열이 아니라 도착 주소를 단정한다. */
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

describe("Dashboard", () => {
  it("sends both the axis and the subject when a rank row drills into the trend", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    fireEvent.click(container.querySelectorAll(".rankrow")[1]);

    await waitFor(() =>
      expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
        `/trend?axis=KR&subject=${encodeURIComponent("삼성전자")}`,
      ),
    );
  });

  it("carries the axis the reader switched to, not the default one", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    // 축 전환 후에도 같은 응답을 돌려주는 스텁이지만, 승계되는 축은 화면이 **지금 보고
    // 있는** 축이어야 한다 — 응답 본문의 축을 그대로 쓰면 이 단정이 깨진다.
    fireEvent.click(container.querySelectorAll(".seg button")[1]);
    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    fireEvent.click(container.querySelectorAll(".rankrow")[0]);

    await waitFor(() =>
      expect(container.querySelector('[data-testid="landed"]')?.textContent).toBe(
        `/trend?axis=US&subject=${encodeURIComponent("기준금리")}`,
      ),
    );
  });
});

describe("Dashboard — 오늘의 조회 조건", () => {
  it("draws the card the journey promises, with the copy that dates the promise", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));

    // 문면이 바뀌면 아래 복원 단정도 함께 다시 판단해야 한다.
    const heads = [...container.querySelectorAll(".card-h")].map((h) => h.textContent);
    expect(heads).toContain("오늘의 조회 조건어제 닫을 때의 조건으로 열립니다");
    expect(container.querySelector(".dash-brief-check")?.textContent).toContain(
      "마지막 조회 조건으로 열기",
    );
  });

  it("narrows the rank list by the search term without re-querying serving", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    const calls = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.length;

    fireEvent.change(container.querySelector('input[type="search"]')!, {
      target: { value: "삼성" },
    });

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(1));
    expect(container.querySelector(".rankrow .nm")?.textContent).toContain("삼성전자");
    expect((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(calls);
  });

  it("says the search came up empty instead of claiming there is no data", async () => {
    stubDashboard(response());
    const { container } = renderDashboard();

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    fireEvent.change(container.querySelector('input[type="search"]')!, {
      target: { value: "없는대상" },
    });

    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(0));
    expect(container.querySelector(".dash-brief-empty")?.textContent).toBe(
      "검색어에 걸리는 대상이 없습니다.",
    );
    expect(container.querySelector(".placeholder-note")).toBeNull();
  });

  it("reopens with the conditions the reader left, across a closed tab", async () => {
    stubDashboard(response());
    const first = renderDashboard();

    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(2));
    fireEvent.click(first.container.querySelectorAll(".seg button")[1]);
    fireEvent.change(first.container.querySelector('input[type="search"]')!, {
      target: { value: "기준" },
    });
    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(1));
    cleanup();

    expect(sessionStorage.getItem("econ-monitor:dash:brief")).toBeNull();
    expect(localStorage.getItem("econ-monitor:dash:brief")).not.toBeNull();

    const again = renderDashboard();
    await waitFor(() => expect(again.container.querySelectorAll(".rankrow")).toHaveLength(1));
    expect(again.container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe(
      "기준",
    );
    expect(again.container.querySelector(".seg button.on")?.textContent).toBe("미국");
  });

  it("opens on the defaults when restoring is off — but remembers that choice", async () => {
    stubDashboard(response());
    const first = renderDashboard();

    await waitFor(() => expect(first.container.querySelectorAll(".rankrow")).toHaveLength(2));
    fireEvent.click(first.container.querySelectorAll(".seg button")[1]);
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
    await waitFor(() => expect(again.container.querySelectorAll(".rankrow")).toHaveLength(2));
    expect(again.container.querySelector<HTMLInputElement>('input[type="search"]')?.value).toBe("");
    expect(again.container.querySelector(".seg button.on")?.textContent).toBe("한국");
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
    await waitFor(() => expect(container.querySelectorAll(".rankrow")).toHaveLength(2));
    expect(container.querySelector(".dash-brief-check")).not.toBeNull();

    getItem.mockRestore();
    setItem.mockRestore();
  });
});
