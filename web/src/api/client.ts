// Thin fetch layer over the Go serving API. In dev, Vite proxies /api to the
// Go process (see vite.config.ts); in prod, Go serves this build under the same
// origin — so a relative /api base works in both.

import type {
  Axis,
  BucketUnit,
  CompareResponse,
  ContributionsResponse,
  SourceContributionsResponse,
  DashboardResponse,
  DashRange,
  FairnessResponse,
  ReprocessPublish,
  ReprocessResponse,
  ReprocessRun,
  ReprocessSubmit,
  SentimentResponse,
  TraceResponse,
  TrendResponse,
} from "./types";

const BASE = "/api";

export async function getJSON<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${BASE}${path} -> ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

// The write routes answer a refusal with `{error}` in the operator's words; that text is what the screen shows.
export async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      // A non-JSON refusal keeps the status line.
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => getJSON<{ status: string }>("/health"),
  dashboard: (axis: Axis = "KR", range: DashRange = "7d", unit: BucketUnit = "day") =>
    getJSON<DashboardResponse>(`/dashboard?axis=${axis}&range=${range}&unit=${unit}`),
  compare: () => getJSON<CompareResponse>("/compare"),
  // subject is optional: without it the API selects the leading subject, so the
  // screen never has to guess a name before it has seen the data.
  trend: (axis: Axis = "KR", subject?: string) =>
    getJSON<TrendResponse>(
      `/trend?axis=${axis}${subject ? `&subject=${encodeURIComponent(subject)}` : ""}`,
    ),
  // The axis is a query parameter, not a client-side filter: the comparison
  // bucket is chosen over all axes, so the server has to see them all.
  sentiment: (axis: Axis = "KR") => getJSON<SentimentResponse>(`/sentiment?axis=${axis}`),
  fairness: (axis: Axis = "KR") => getJSON<FairnessResponse>(`/fairness?axis=${axis}`),
  contributions: (axis: Axis = "KR", subject = "", unit = "", timeBucket = "", source = "") =>
    getJSON<ContributionsResponse>(
      `/contributions?axis=${axis}` +
        (subject ? `&subject=${encodeURIComponent(subject)}` : "") +
        (unit ? `&unit=${encodeURIComponent(unit)}` : "") +
        (timeBucket ? `&time_bucket=${encodeURIComponent(timeBucket)}` : "") +
        (source ? `&source=${encodeURIComponent(source)}` : ""),
    ),
  sourceContributions: (axis: Axis = "KR", subject = "", unit = "", timeBucket = "") =>
    getJSON<SourceContributionsResponse>(
      `/source-contributions?axis=${axis}` +
        (subject ? `&subject=${encodeURIComponent(subject)}` : "") +
        (unit ? `&unit=${encodeURIComponent(unit)}` : "") +
        (timeBucket ? `&time_bucket=${encodeURIComponent(timeBucket)}` : ""),
    ),
  // record_id is optional for the same reason subject is on trend: the screen
  // has to be able to open before it knows one.
  trace: (recordId?: string) =>
    getJSON<TraceResponse>(
      `/trace${recordId ? `?record_id=${encodeURIComponent(recordId)}` : ""}`,
    ),
  // The selection is server-side: the range window, the axis and the source
  // filter all change which Bronze records are counted, so every control
  // round-trips rather than filtering a fetched list.
  reprocess: (range: ReprocessResponse["scope"]["range"] = "7d", axis: Axis = "KR", source = "") =>
    getJSON<ReprocessResponse>(
      `/reprocess?range=${range}&axis=${axis}${source ? `&source=${encodeURIComponent(source)}` : ""}`,
    ),
  reprocessSample: (body: ReprocessSubmit) =>
    postJSON<{ run: ReprocessRun }>("/reprocess/sample", body),
  reprocessRun: (body: ReprocessSubmit) => postJSON<{ run: ReprocessRun }>("/reprocess/run", body),
  reprocessPublish: (body: ReprocessPublish) =>
    postJSON<{ run: ReprocessRun }>("/reprocess/publish", body),
  reprocessRuns: () => getJSON<{ runs: ReprocessRun[] }>("/reprocess/runs"),
  screen: (name: string) => getJSON<unknown>(`/${name}`),
};
