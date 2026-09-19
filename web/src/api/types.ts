// Mirrors the JSON shapes returned by the Go serving handlers.
// The data-lake field types ultimately come from contracts/ via codegen; these
// are the hand-kept serving-API view (stub contracts, see README scope).

export type Axis = "KR" | "US" | "GLOBAL";

export interface SentimentDistribution {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
  unanalyzed: number;
}

export interface Metric {
  label: string;
  value: string;
  note: string;
}

export interface RankRow {
  rank: number;
  subject: string;
  normalized_share: number;
  raw_count: number;
  spark: number[];
  delta: number;
}

export interface DashboardResponse {
  axis: Axis;
  normalized: boolean;
  metrics: Metric[];
  top_subjects: RankRow[];
  sentiment: SentimentDistribution;
}

/** One axis column of the 3-axis comparison (AC3.7). */
export interface AxisColumn {
  axis: Axis;
  top_subjects: RankRow[];
  sentiment: SentimentDistribution;
}

/** One point of a subject's time series (AC3.5). */
export interface TrendPoint {
  time_bucket: string;
  normalized_share: number;
  raw_count: number;
}

/** One subject's line. Exactly one series in a response is `selected`. */
export interface TrendSeries {
  subject: string;
  selected: boolean;
  latest_share: number;
  delta: number;
  points: TrendPoint[];
}

export interface TrendResponse {
  axis: Axis;
  /** The highlighted subject; the API resolves it, so it is never guessed here. */
  subject: string;
  /** The terms the lines were drawn on — one bucket unit, one x-axis. */
  basis: {
    bucket_unit: string;
    first_bucket: string;
    latest_bucket: string;
    buckets: string[];
    normalized: boolean;
  };
  series: TrendSeries[];
}

export interface CompareResponse {
  /** The terms every column was compared on — same bucket, same normalization. */
  basis: {
    time_bucket: string;
    bucket_unit: string;
    normalized: boolean;
  };
  axes: AxisColumn[];
}
