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

export interface CompareResponse {
  /** The terms every column was compared on — same bucket, same normalization. */
  basis: {
    time_bucket: string;
    bucket_unit: string;
    normalized: boolean;
  };
  axes: AxisColumn[];
}

/** One bucket of one subject's series (AC3.5). */
export interface TrendPoint {
  time_bucket: string;
  normalized_share: number;
  raw_count: number;
}

/** One subject plotted across time; `selected` marks the one in focus. */
export interface TrendSeries {
  subject: string;
  selected: boolean;
  latest_share: number;
  delta: number;
  points: TrendPoint[];
}

export interface TrendResponse {
  axis: Axis;
  subject: string;
  /** The terms every series is read on — one bucket axis, one normalization. */
  basis: {
    bucket_unit: string;
    normalized: boolean;
    /** Every bucket on this axis, sorted: the x axis the series share. */
    buckets: string[];
  };
  series: TrendSeries[];
}
