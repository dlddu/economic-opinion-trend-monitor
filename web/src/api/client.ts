// Thin fetch layer over the Go serving API. In dev, Vite proxies /api to the
// Go process (see vite.config.ts); in prod, Go serves this build under the same
// origin — so a relative /api base works in both.

import type { Axis, CompareResponse, DashboardResponse, TrendResponse } from "./types";

const BASE = "/api";

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${BASE}${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<{ status: string }>("/health"),
  dashboard: (axis: Axis = "KR") => getJSON<DashboardResponse>(`/dashboard?axis=${axis}`),
  compare: () => getJSON<CompareResponse>("/compare"),
  // subject is optional: without it the API selects the leading subject, so the
  // screen never has to guess a name before it has seen the data.
  trend: (axis: Axis = "KR", subject?: string) =>
    getJSON<TrendResponse>(
      `/trend?axis=${axis}${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`,
    ),
  // Per-screen stub endpoints (one per frontend screen). Shapes are not yet
  // finalized, so placeholders consume them as unknown JSON.
  screen: (name: string) => getJSON<unknown>(`/${name}`),
};
