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

    // 승계 계약의 보내는 쪽. 대상만 넘기면 받는 쪽이 축을 추측해야 하고, 그 추측이 틀리면
    // 그 축에 없는 대상을 묻게 된다 — 그래서 축·대상이 **함께** 실려야 한다.
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
