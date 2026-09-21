// Mirrors the JSON shapes returned by the Go serving handlers.
// The data-lake field types ultimately come from contracts/ via codegen; these
// are the hand-kept serving-API view.

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
  subject: string;
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
  distribution: SentimentDistribution;
  analyzed_total: number;
}

/** One axis at the comparison bucket. */
export interface SentimentAxisRow {
  axis: Axis;
  distribution: SentimentDistribution;
  analyzed_total: number;
  present: boolean;
}

export interface SentimentResponse {
  axis: Axis;
  basis: {
    bucket_unit: string;
    first_bucket: string;
    latest_bucket: string;
    buckets: string[];
    normalized: boolean;
  };
  series: SentimentPoint[];
  by_axis: SentimentAxisRow[];
}

/** One subject counted two ways at the same bucket (AC3.1, AC3.8). */
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
  basis: {
    bucket_unit: string;
    time_bucket: string;
    raw_total: number;
    normalized: boolean;
    method: string;
  };
  rows: FairnessRow[];
}

export interface CompareResponse {
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
  present: boolean;
}

/** The collected article (AC1.4, AC1.5, AC1.7). */
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

/** The analysis verdict for the same record (AC2.1–AC2.5). */
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

/** One record's lineage, with each layer reported separately. */
export interface TraceResponse {
  record_id: string;
  selection: "requested" | "auto" | "requested-missing" | "empty";
  found: boolean;
  crumb: TraceCrumbStep[];
  bronze: TraceBronze | null;
  silver: TraceSilver | null;
  ingestion: TraceIngestion;
}

/** One collection cycle of a reprocess selection (STP-scope-range). */
export interface ReprocessBucket {
  cycle: string;
  kept: number;
  done: number;
  todo: number;
}

export interface ReprocessSource {
  source_id: string;
  kept: number;
}

/** What the (range, axis, source) selection holds, sized against the target analyzer version. */
export interface ReprocessScope {
  range: "24h" | "7d" | "30d";
  since: string;
  axis: Axis;
  source: string;
  sources: ReprocessSource[];
  total: number;
  already: number;
  todo: number;
  buckets: ReprocessBucket[];
  /** Null unless Silver holds enough dated records at the target version to read a rate off. */
  throughput_per_minute: number | null;
  eta_minutes: number | null;
}

export interface ReprocessVersion {
  analyzer_version: string;
  records: number;
  first_analyzed_at: string;
  last_analyzed_at: string;
}

/** One subject's raw mention share under each of two analyzer versions (PAT-before-after). */
export interface ReprocessCompareRow {
  subject: string;
  before_share: number;
  after_share: number;
  delta: number;
}

export interface ReprocessCompare {
  available: boolean;
  reason: "" | "no-silver" | "single-version";
  before_version: string;
  after_version: string;
  rows: ReprocessCompareRow[];
  unanalyzed_share: { before: number; after: number };
}

/** One batch Workflow the console submitted: a sample, a full run, or a publish. */
export interface ReprocessRun {
  name: string;
  kind: "sample" | "run" | "publish";
  phase: "Pending" | "Running" | "Succeeded" | "Failed" | "Error" | string;
  message: string;
  started_at: string;
  finished_at: string;
  parameters: Record<string, string>;
  annotations: Record<string, string>;
}

/** One publish/rollback the batch recorded; the last one names the version Gold serves. */
export interface ReprocessDecision {
  decided_at: string;
  decision: "publish" | "rollback";
  analyzer_version: string;
  memo: string;
  notify_consumer: boolean;
}

export interface ReprocessTrigger {
  /** True only when the batch WorkflowTemplate is reachable with the Pod's identity. */
  available: boolean;
  /** Why the trigger is unavailable, in the operator's words; empty when available. */
  note: string;
  /** Empty when no decision was ever recorded (aggregation serves each record's newest row). */
  serving_version: string;
  decisions: ReprocessDecision[];
  /** Newest first. Empty when unavailable. */
  runs: ReprocessRun[];
}

export interface ReprocessResponse {
  scope: ReprocessScope;
  target_version: string;
  versions: ReprocessVersion[];
  compare: ReprocessCompare;
  trigger: ReprocessTrigger;
}

export interface ReprocessSubmit {
  range: ReprocessScope["range"];
  axis: Axis;
  source: string;
  analyzer_version: string;
  sample_size?: number;
  sample_mode?: "random" | "recent";
  batch_size?: number;
}

export interface ReprocessPublish {
  decision: ReprocessDecision["decision"];
  analyzer_version: string;
  memo: string;
  notify_consumer: boolean;
}
