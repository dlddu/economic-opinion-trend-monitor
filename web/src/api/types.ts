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

/** One bucket of one axis's sentiment composition (AC3.4, AC3.6). */
export interface SentimentPoint {
  time_bucket: string;
  /** Four class ratios over the analyzed items; `unanalyzed` is its own share. */
  distribution: SentimentDistribution;
  /** What those ratios were taken over — 60% of five is not 60% of five hundred. */
  analyzed_total: number;
}

/** One axis at the comparison bucket. */
export interface SentimentAxisRow {
  axis: Axis;
  distribution: SentimentDistribution;
  analyzed_total: number;
  /** False when Gold holds no row for this axis in that bucket — not "all zero". */
  present: boolean;
}

export interface SentimentResponse {
  axis: Axis;
  basis: {
    bucket_unit: string;
    first_bucket: string;
    /** The bucket every axis is compared at; the series may end before it. */
    latest_bucket: string;
    buckets: string[];
    normalized: boolean;
  };
  series: SentimentPoint[];
  by_axis: SentimentAxisRow[];
}

/**
 * One subject counted two ways at the same bucket (AC3.1, AC3.8).
 *
 * `raw_share` is the naive count share, not the normalized one — the gap
 * between the two fields is the source-volume deviation the aggregation
 * corrects, so neither stands in for the other.
 */
export interface FairnessRow {
  rank: number;
  subject: string;
  raw_count: number;
  raw_share: number;
  normalized_share: number;
  delta: number;
  spark: number[];
}

export interface FairnessResponse {
  axis: Axis;
  /** The terms both counting modes were read on — one bucket, one unit. */
  basis: {
    bucket_unit: string;
    time_bucket: string;
    /** The denominator `raw_share` was taken over, published so counts add up. */
    raw_total: number;
    normalized: boolean;
    /** How the normalization was done, stated rather than merely asserted. */
    method: string;
  };
  rows: FairnessRow[];
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

/** One hop of the Bronze → Silver → Gold path (`CMP-crumb`). */
export interface TraceCrumbStep {
  layer: "bronze" | "silver" | "gold";
  label: string;
  /** False when that hop has no record — the chain is drawn broken, not hidden. */
  present: boolean;
}

/**
 * The collected article (AC1.4, AC1.5, AC1.7).
 *
 * `body_available` and `body_preserved` are two different facts and neither
 * substitutes for the other: the first is what the source looked like at
 * collection time, the second is whether this lake still holds the text. When
 * they disagree — a link that has since rotted — the preserved copy is the only
 * thing left to read, which is the whole reason the screen keeps both.
 */
export interface TraceBronze {
  record_id: string;
  source_id: string;
  axis: string;
  title: string;
  source_url: string;
  body_hash: string;
  body_available: boolean;
  body_preserved: boolean;
  body_text: string;
  body_first_seen_at: string;
  body_first_seen_cycle: string;
}

/**
 * The analysis verdict for the same record (AC2.1–AC2.5).
 *
 * `sentiment` is nullable because "set aside" is an outcome, not a missing
 * value — AC2.5 keeps low-confidence records out of the four classes instead of
 * guessing one.
 */
export interface TraceSilver {
  analysis_status: "analyzed" | "low_confidence" | "unanalyzed";
  sentiment: "positive" | "neutral" | "negative" | "mixed" | null;
  target_countries: string[];
  narrative_subjects: string[];
  confidence: number;
  analyzed_at: string;
  analyzer_version: string;
}

/** Provenance metadata ingestion is required to keep (AC1.5). */
export interface TraceIngestion {
  collected_at: string;
  collection_cycle: string;
  rank: number;
  view_count: number;
}

/**
 * One record's lineage, with each layer reported separately.
 *
 * `found=false`, a null `silver` and `bronze.body_preserved=false` mean three
 * different things — never collected, never analyzed, text not kept — and the
 * screen says which rather than printing one "no data".
 */
export interface TraceResponse {
  record_id: string;
  /** How `record_id` was arrived at, so a fallback never reads as a hit. */
  selection: "requested" | "auto" | "requested-missing" | "empty";
  found: boolean;
  crumb: TraceCrumbStep[];
  bronze: TraceBronze | null;
  silver: TraceSilver | null;
  ingestion: TraceIngestion;
}
