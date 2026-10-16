import { afterEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { SpikeCheck } from "./SpikeCheck";
import { fairnessPath } from "./fairnessPath";
import type { SpikeRow, SpikesResponse } from "../api/types";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function row(subject: string, over: Partial<SpikeRow>): SpikeRow {
  return {
    rank: 0,
    subject,
    raw_count: 30,
    normalized_share: 0.3,
    baseline_raw: 10,
    baseline_share: 0.1,
    raw_multiple: 3,
    normalized_multiple: 3,
    is_new: false,
    spike: true,
    normalized_away: false,
    ...over,
  };
}

const FX = row("원/달러 환율", { rank: 1 });
const RATE = row("기준금리", {
  rank: 2,
  raw_count: 12,
  baseline_raw: 10,
  raw_multiple: 1.2,
  normalized_multiple: 1.1,
  spike: false,
});
const FRESH = row("처음 보는 대상", {
  rank: 3,
  raw_count: 2,
  baseline_raw: 0,
  baseline_share: 0,
  raw_multiple: null,
  normalized_multiple: null,
  is_new: true,
  spike: false,
});

function spikes(baseline: SpikesResponse["basis"]["baseline"], rows = [FX, RATE, FRESH]): SpikesResponse {
  return {
    axis: "KR",
    basis: {
      bucket_unit: "day",
      time_bucket: "2026-06-23",
      baseline,
      baseline_buckets: ["2026-06-22"],
      has_baseline: true,
      threshold: 1.5,
    },
    rows,
  };
}

function stub(body: (baseline: "7d" | "30d") => SpikesResponse = spikes) {
  const fetch = vi.fn(async (url: string) => ({
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () =>
      body(new URL(url, "http://x").searchParams.get("baseline") === "30d" ? "30d" : "7d"),
  }));
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

function renderCheck() {
  return render(
    <MemoryRouter>
      <SpikeCheck axis="KR" axisLabel="한국" />
    </MemoryRouter>,
  );
}

function rows(container: HTMLElement): HTMLElement[] {
  return [...container.querySelectorAll<HTMLElement>(".dash-sp-row")];
}

it("lists the subjects by multiple over the usual level and tags the spikes", async () => {
  stub();
  const { container } = renderCheck();

  await waitFor(() => expect(rows(container)).toHaveLength(3));
  const [fx, rate, fresh] = rows(container);
  expect(fx.querySelector(".nm")?.textContent).toBe(FX.subject);
  expect(fx.querySelector(".dlt")?.textContent).toBe("×3.0");
  expect(fx.textContent).toContain("급등");
  expect(fx.querySelector(".meta")?.textContent).toBe("30건 · 평소 10.0건");
  expect(rate.querySelector(".dlt")?.textContent).toBe("×1.2");
  expect(rate.textContent).not.toContain("급등");
  expect(fresh.querySelector(".nm")?.textContent).toBe(`${FRESH.subject}신규`);
  expect(fresh.querySelector(".dlt")?.textContent).toBe("신규");
});

it("opens on the leading spike and hands the picked one, with its window, to the check", async () => {
  stub();
  const { container } = renderCheck();

  const advance = () =>
    container.querySelector('[data-testid="spike-advance"]')?.getAttribute("href");
  await waitFor(() => expect(advance()).toBe(fairnessPath("KR", FX.subject)));
  expect(container.querySelector('[data-testid="spike-mult"]')?.textContent).toBe("×3.0 (평소 10.0건)");

  fireEvent.click(rows(container)[1]);
  await waitFor(() =>
    expect(container.querySelector('[data-testid="spike-pick"]')?.textContent).toBe(RATE.subject),
  );
  expect(rows(container)[1].getAttribute("aria-pressed")).toBe("true");

  fireEvent.change(container.querySelector('select[name="spike-baseline"]') as HTMLSelectElement, {
    target: { value: "30d" },
  });
  await waitFor(() => expect(advance()).toBe(fairnessPath("KR", RATE.subject, "30d")));
});

it("asks the server again when the usual level is redefined", async () => {
  const fetch = stub();
  const { container } = renderCheck();

  await waitFor(() => expect(rows(container)).toHaveLength(3));
  fireEvent.change(container.querySelector('select[name="spike-baseline"]') as HTMLSelectElement, {
    target: { value: "30d" },
  });
  await waitFor(() =>
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "/api/spikes?axis=KR&baseline=7d",
      "/api/spikes?axis=KR&baseline=30d",
    ]),
  );
});

it("claims no multiple when the window holds nothing to compare against", async () => {
  stub((baseline) => {
    const body = spikes(baseline, [
      row(FX.subject, { rank: 1, raw_multiple: null, normalized_multiple: null, spike: false }),
    ]);
    body.basis.has_baseline = false;
    body.basis.baseline_buckets = [];
    return body;
  });
  const { container } = renderCheck();

  await waitFor(() =>
    expect(container.querySelector('[data-testid="spike-no-baseline"]')?.textContent).toContain(
      "최근 7일에 비교할 버킷이 없습니다",
    ),
  );
  expect(rows(container)[0].querySelector(".dlt")?.textContent).toBe("—");
  expect(rows(container)[0].textContent).not.toContain("급등");
});

it("says so rather than drawing an empty list when the axis has no buckets", async () => {
  stub((baseline) => spikes(baseline, []));
  const { container } = renderCheck();

  await waitFor(() =>
    expect(container.querySelector('[data-testid="spike-empty"]')?.textContent).toContain(
      "한국 축에 집계된 버킷이 없습니다",
    ),
  );
  expect(container.querySelector('[data-testid="spike-advance"]')).toBeNull();
});

it("still lists the all-axes spikes but asks for one axis before the fairness check", async () => {
  const fetch = stub();
  const { container } = render(
    <MemoryRouter>
      <SpikeCheck axis="ALL" axisLabel="전체" />
    </MemoryRouter>,
  );

  await waitFor(() => expect(rows(container)).toHaveLength(3));
  expect(fetch.mock.calls[0][0]).toBe("/api/spikes?axis=ALL&baseline=7d");
  expect(container.querySelector('[data-testid="spike-advance"]')).toBeNull();
  expect(container.querySelector('[data-testid="spike-pick-axis"]')?.textContent).toContain(
    "축을 하나 고르면",
  );
});
