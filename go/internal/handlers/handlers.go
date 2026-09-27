// Package handlers exposes the serving API.
package handlers

import (
	"encoding/json"
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/argo"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// Handlers holds the dependencies shared by the route handlers.
type Handlers struct {
	lake *store.Lake
	// argo submits reprocess runs; nil outside a cluster.
	argo *argo.Client
	// now is the clock the time-windowed reads (reprocess) open their range against.
	now func() time.Time
	// trigger caches the Argo reachability probe (see reprocessTrigger).
	trigger triggerProbe
}

// New builds Handlers backed by the given lake, with no workflow trigger.
func New(lake *store.Lake) *Handlers { return &Handlers{lake: lake, now: time.Now} }

// WithArgo attaches the workflow client the reprocess POST routes submit through.
func (h *Handlers) WithArgo(c *argo.Client) *Handlers {
	h.argo = c
	return h
}

// Register wires every API route onto mux (Go 1.22 method+path patterns).
func (h *Handlers) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.health)
	mux.HandleFunc("GET /api/dashboard", h.dashboard)
	mux.HandleFunc("GET /api/trend", h.trend)
	mux.HandleFunc("GET /api/compare", h.compare)
	mux.HandleFunc("GET /api/sentiment", h.sentiment)
	mux.HandleFunc("GET /api/fairness", h.fairness)
	mux.HandleFunc("GET /api/contributions", h.contributions)
	mux.HandleFunc("GET /api/source-contributions", h.sourceContributions)
	mux.HandleFunc("GET /api/trace", h.trace)
	mux.HandleFunc("GET /api/reprocess", h.reprocess)
	mux.HandleFunc("GET /api/debug", h.debug)
	mux.HandleFunc("GET /api/reprocess/runs", h.reprocessRuns)
	mux.HandleFunc("POST /api/reprocess/sample", h.reprocessSample)
	mux.HandleFunc("POST /api/reprocess/run", h.reprocessRun)
	mux.HandleFunc("POST /api/reprocess/publish", h.reprocessPublish)
}

type rankRow struct {
	Rank            int       `json:"rank"`
	Subject         string    `json:"subject"`
	NormalizedShare float64   `json:"normalized_share"`
	RawCount        int64     `json:"raw_count"`
	Spark           []float64 `json:"spark"`
	Delta           float64   `json:"delta"`
}

// trendSeriesLimit caps how many lines the trend chart carries. The point of
// the overlay is "where is attention moving", not an exhaustive list — past a
// handful of lines the chart stops answering that.
const trendSeriesLimit = 3

type trendPoint struct {
	TimeBucket      string  `json:"time_bucket"`
	NormalizedShare float64 `json:"normalized_share"`
	RawCount        int64   `json:"raw_count"`
}

// trendSeries is one subject's line. Selected marks the one the screen
// highlights (exactly one series carries it), and LatestShare/Delta are read
// off the subject's most recent point — the headline metric above the chart.
type trendSeries struct {
	Subject     string       `json:"subject"`
	Selected    bool         `json:"selected"`
	LatestShare float64      `json:"latest_share"`
	Delta       float64      `json:"delta"`
	Points      []trendPoint `json:"points"`
}

// trendBasis states the terms the lines were drawn on, the way compare does —
// a chart whose x-axis unit is implicit invites reading a week as an hour.
type trendBasis struct {
	BucketUnit   string   `json:"bucket_unit"`
	FirstBucket  string   `json:"first_bucket"`
	LatestBucket string   `json:"latest_bucket"`
	Buckets      []string `json:"buckets"`
	Normalized   bool     `json:"normalized"`
}

type trendResponse struct {
	Axis    string        `json:"axis"`
	Subject string        `json:"subject"`
	Basis   trendBasis    `json:"basis"`
	Series  []trendSeries `json:"series"`
}

// sentimentBasis states the terms the ratios were read on, the same way trend
// and compare do. A distribution with an implicit window invites reading last
// week's mood as right now.
//
// Buckets is the selected axis's own x-axis (what the time series is drawn on);
// LatestBucket is the bucket every axis is compared at, which is the latest one
// any axis reached. The two differ exactly when the selected axis has no row in
// that bucket — and that gap is the honest answer, so it is not papered over by
// ending the chart wherever the axis happens to stop.
type sentimentBasis struct {
	BucketUnit   string   `json:"bucket_unit"`
	FirstBucket  string   `json:"first_bucket"`
	LatestBucket string   `json:"latest_bucket"`
	Buckets      []string `json:"buckets"`
	Normalized   bool     `json:"normalized"`
}

// sentimentPoint is one bucket of the selected axis. The four sentiment ratios
// are over the *analyzed* items and Unanalyzed rides alongside as its own share
// of the whole, never folded in with them (AC3.4). AnalyzedTotal is what those
// ratios were taken over, so a 60% that rests on five items can be told apart
// from one that rests on five hundred.
type sentimentPoint struct {
	TimeBucket    string                    `json:"time_bucket"`
	Distribution  gen.SentimentDistribution `json:"distribution"`
	AnalyzedTotal int64                     `json:"analyzed_total"`
}

// sentimentAxisRow is one axis at the basis bucket — the 축별 half of AC3.4.
//
// Present is the field that keeps the comparison honest. An axis with no Gold
// row in that bucket comes back with the zero distribution and Present false:
// all-zero ratios would otherwise read as "nothing was positive here", which is
// a different claim from "this axis was not aggregated for this bucket".
type sentimentAxisRow struct {
	Axis          string                    `json:"axis"`
	Distribution  gen.SentimentDistribution `json:"distribution"`
	AnalyzedTotal int64                     `json:"analyzed_total"`
	Present       bool                      `json:"present"`
}

type sentimentResponse struct {
	Axis   string             `json:"axis"`
	Basis  sentimentBasis     `json:"basis"`
	Series []sentimentPoint   `json:"series"`
	ByAxis []sentimentAxisRow `json:"by_axis"`
}

// fairnessRowLimit caps the ranking the fairness view carries. The question is
// "is the top of this axis real", so the long tail adds rows without adding
// evidence — and every row is a two-mode comparison, which is dense to read.
const fairnessRowLimit = 20

// fairnessBasis states the terms the two counting modes were read on.
//
// Method names the normalization the aggregation applied, so the screen can
// print it verbatim rather than asserting "normalized" with no way to say how
// (AC3.1). RawTotal is the denominator RawShare was taken over — published so
// the raw counts beside it add up.
type fairnessBasis struct {
	BucketUnit string `json:"bucket_unit"`
	TimeBucket string `json:"time_bucket"`
	RawTotal   int64  `json:"raw_total"`
	Normalized bool   `json:"normalized"`
	Method     string `json:"method"`
}

// fairnessRow is one subject counted two ways at the same bucket.
//
// RawShare is deliberately *not* the normalized share: it is the naive count
// share, what dividing raw counts would have told the reader. Keeping both is
// the whole point — the gap between them is the source-volume deviation AC3.1
// corrects, and AC3.8 asks for exactly that distinction to be visible.
type fairnessRow struct {
	Rank            int       `json:"rank"`
	Subject         string    `json:"subject"`
	RawCount        int64     `json:"raw_count"`
	RawShare        float64   `json:"raw_share"`
	NormalizedShare float64   `json:"normalized_share"`
	Delta           float64   `json:"delta"`
	Spark           []float64 `json:"spark"`
}

type fairnessResponse struct {
	Axis  string        `json:"axis"`
	Basis fairnessBasis `json:"basis"`
	Rows  []fairnessRow `json:"rows"`
}

// traceCrumbStep is one hop of the Bronze -> Silver -> Gold path.
type traceCrumbStep struct {
	Layer   string `json:"layer"`
	Label   string `json:"label"`
	Present bool   `json:"present"`
}

// traceBronze is the collected article: where it came from, and what of it was
// kept.
//
// BodyAvailable and BodyPreserved are deliberately two fields, not one. The
// first is what ingestion recorded about the *source* at collection time; the
// second is whether this lake actually holds the text now. They disagree in the
// case the whole screen exists for — the original URL has since rotted, and the
// copy taken at collection time is the only thing left to read (AC1.4). One
// boolean could not tell that apart from "never had a body".
type traceBronze struct {
	RecordID           string `json:"record_id"`
	SourceID           string `json:"source_id"`
	Axis               string `json:"axis"`
	Title              string `json:"title"`
	SourceURL          string `json:"source_url"`
	BodyHash           string `json:"body_hash"`
	BodyAvailable      bool   `json:"body_available"`
	BodyPreserved      bool   `json:"body_preserved"`
	BodyText           string `json:"body_text"`
	BodyFirstSeenAt    string `json:"body_first_seen_at"`
	BodyFirstSeenCycle string `json:"body_first_seen_cycle"`
}

// traceSilver is the analysis verdict for the same record.
//
// Sentiment is a pointer because "no sentiment" is a real outcome, not a zero
// value: AC2.5 sets low-confidence records aside as unanalyzed rather than
// forcing them into one of the four classes.
type traceSilver struct {
	AnalysisStatus    string   `json:"analysis_status"`
	Sentiment         *string  `json:"sentiment"`
	TargetCountries   []string `json:"target_countries"`
	NarrativeSubjects []string `json:"narrative_subjects"`
	Confidence        float64  `json:"confidence"`
	AnalyzedAt        string   `json:"analyzed_at"`
	AnalyzerVersion   string   `json:"analyzer_version"`
}

// traceIngestion is the provenance metadata AC1.5 asks ingestion to keep.
type traceIngestion struct {
	CollectedAt     string `json:"collected_at"`
	CollectionCycle string `json:"collection_cycle"`
	Rank            int64  `json:"rank"`
	ViewCount       int64  `json:"view_count"`
}

// traceResponse is one record's lineage, with each layer reported separately.
//
// The three ways this can come up short are kept apart on purpose, because they
// mean different things to a reader who is checking whether a spike is real:
//
//	Found=false          the record is not in Bronze — the trail never starts.
//	Bronze.BodyPreserved the text is gone even though the observation is here.
//	Silver=nil           the article was collected but never analyzed.
//
// Collapsing them into one "no data" would tell the reader their lookup failed
// when in fact the pipeline simply has not gotten that far — and the screen
// would have no way to say which.
type traceResponse struct {
	RecordID string `json:"record_id"`
	// Selection says how RecordID was arrived at: "requested" (the caller asked
	// for it), "auto" (none asked for, first observation used),
	// "requested-missing", or "empty".
	Selection string           `json:"selection"`
	Found     bool             `json:"found"`
	Crumb     []traceCrumbStep `json:"crumb"`
	Bronze    *traceBronze     `json:"bronze"`
	Silver    *traceSilver     `json:"silver"`
	Ingestion traceIngestion   `json:"ingestion"`
}

func (h *Handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// trend answers AC3.5: one subject's interest over time, with the axis's
// leading subjects overlaid so the selected line can be read against them.
//
// Gold holds one flat row per (subject, axis, bucket), so a time series is the
// rows of one subject read in bucket order — and the chart is only honest if
// every line is drawn on one x-axis. Two things could break that:
//
//   - Mixed bucket units, which plottedUnit settles before the rows are folded.
//   - Ranking on stale rows. A subject that dominated yesterday and vanished
//     today would outrank the current leaders if ranked on its own best row, so
//     subjects are ordered by their share in the *latest* bucket.
//
// The selected subject is always present in the response, even when it is not
// one of the leaders — otherwise selecting a long-tail subject would silently
// return someone else's lines.
func (h *Handlers) trend(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	requested := r.URL.Query().Get("subject")

	trends, _ := h.lake.SubjectTrends()
	rows := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if string(t.Axis) == axis {
			rows = append(rows, t)
		}
	}

	unit := plottedUnit(rows)
	inUnit := rows[:0:0]
	for _, t := range rows {
		if t.BucketUnit == unit {
			inUnit = append(inUnit, t)
		}
	}

	buckets := distinctBuckets(inUnit)
	series := seriesBySubject(inUnit, buckets)
	selected := pickSubject(series, requested)
	series = limitSeries(series, selected, trendSeriesLimit)

	basis := trendBasis{Normalized: true, BucketUnit: string(unit), Buckets: buckets}
	if len(buckets) > 0 {
		basis.FirstBucket, basis.LatestBucket = buckets[0], buckets[len(buckets)-1]
	}

	writeJSON(w, http.StatusOK, trendResponse{
		Axis:    axis,
		Subject: selected,
		Basis:   basis,
		Series:  series,
	})
}

// compare answers AC3.7: the three axes side by side on the *same* basis.
//
// "Same basis" is the whole point of the view, so it is not left implicit —
// the response carries the basis it compared on. Gold holds one record per
// (subject, axis, time bucket), so comparing whatever rows happen to exist per
// axis would silently put a stale bucket next to a fresh one. Instead the
// latest bucket present in Gold is picked once and every column is filtered to
// it; an axis with no data in that bucket comes back as an empty column rather
// than borrowing an older one.
//
// The same mixed-unit trap the trend and sentiment handlers document applies to
// that pick, and latestBucket closes it the same way — the unit is settled
// before any two buckets are compared.
func (h *Handlers) compare(w http.ResponseWriter, _ *http.Request) {
	trends, _ := h.lake.SubjectTrends()
	sentiments, _ := h.lake.AxisSentiments()

	bucket, unit := latestBucket(trends, sentiments)
	inBucket := trendsInBucket(trends, bucket, unit)

	axes := []string{"KR", "US", "GLOBAL"}
	columns := make([]map[string]any, 0, len(axes))
	for _, axis := range axes {
		columns = append(columns, map[string]any{
			"axis":         axis,
			"top_subjects": topSubjects(inBucket, axis, 5),
			"sentiment":    sentimentInBucket(sentiments, axis, bucket, unit),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"basis": map[string]any{
			"time_bucket": bucket,
			"bucket_unit": unit,
			"normalized":  true,
		},
		"axes": columns,
	})
}

// sentiment answers AC3.4 (축별·분위기별 비율, 미분석 분리) and gives AC3.6 a
// screen of its own: the selected axis over time, plus the three axes read
// against each other at one bucket.
//
// Gold holds one AxisSentiment row per (axis, time bucket), so handing the raw
// rows over leaves the caller to decide which of them are comparable, and
// every caller would decide differently. The same two traps the trend handler
// documents apply, and are closed the same way:
//
//   - Mixed bucket units, which sentimentUnit settles before the series is read.
//   - Comparing axes across buckets. Whichever row each axis happens to have
//     would silently set a stale axis beside a fresh one, so the latest bucket
//     is picked once and every axis is filtered to it.
func (h *Handlers) sentiment(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	rows, _ := h.lake.AxisSentiments()

	unit := sentimentUnit(rows)
	inUnit := make([]gen.AxisSentiment, 0, len(rows))
	for _, s := range rows {
		if s.BucketUnit == unit {
			inUnit = append(inUnit, s)
		}
	}

	series := sentimentSeries(inUnit, axis)
	basis := sentimentBasis{
		BucketUnit:   string(unit),
		LatestBucket: latestSentimentBucket(inUnit),
		Buckets:      make([]string, 0, len(series)),
		Normalized:   true,
	}
	for _, p := range series {
		basis.Buckets = append(basis.Buckets, p.TimeBucket)
	}
	if len(basis.Buckets) > 0 {
		basis.FirstBucket = basis.Buckets[0]
	}

	writeJSON(w, http.StatusOK, sentimentResponse{
		Axis:   axis,
		Basis:  basis,
		Series: series,
		ByAxis: sentimentByAxis(inUnit, basis.LatestBucket),
	})
}

// fairness answers AC3.8's half of 급등 검증: is this spike still a spike once
// the source-volume difference is normalized away (AC3.1)?
//
// A ranking on its own cannot answer that — it is the *contrast* that answers
// it. So the response carries both counting modes for the same subject: the
// normalized share the aggregation computed (share inside a source first, then
// combined across the axis) and the naive count share the reader would have
// gotten by dividing raw counts. A subject that leads on raw and falls on
// normalized was one outlet's volume, not the axis's attention.
//
// The two traps the other Gold readers document apply here too:
//
//   - Mixed bucket units, which plottedUnit settles before anything is ranked.
//   - Ranking on stale rows. Within a unit, a subject that dominated an earlier
//     bucket would outrank the current leaders on its own best row, so one
//     basis bucket is picked (the latest of that unit) and every row is read
//     from it — compare's rule, applied to one axis.
//
// RawTotal is the denominator of RawShare, published rather than left implicit:
// a share whose denominator is invisible cannot be checked against the counts
// printed beside it.
func (h *Handlers) fairness(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()

	inAxis := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if string(t.Axis) == axis {
			inAxis = append(inAxis, t)
		}
	}

	unit := plottedUnit(inAxis)
	bucket := latestBucketOf(inAxis, unit)
	inBucket := trendsInBucket(inAxis, bucket, unit)

	var rawTotal int64
	for _, t := range inBucket {
		rawTotal += t.RawCount
	}

	ranked := topSubjects(inBucket, axis, fairnessRowLimit)
	rows := make([]fairnessRow, 0, len(ranked))
	for _, t := range ranked {
		rows = append(rows, fairnessRow{
			Rank:            t.Rank,
			Subject:         t.Subject,
			RawCount:        t.RawCount,
			RawShare:        shareOf(t.RawCount, rawTotal),
			NormalizedShare: t.NormalizedShare,
			Delta:           t.Delta,
			Spark:           t.Spark,
		})
	}

	writeJSON(w, http.StatusOK, fairnessResponse{
		Axis: axis,
		Basis: fairnessBasis{
			BucketUnit: string(unit),
			TimeBucket: bucket,
			RawTotal:   rawTotal,
			Normalized: true,
			Method:     "소스 내 점유율",
		},
		Rows: rows,
	})
}

// latestBucketOf picks the newest bucket of one already-chosen unit. It is the
// single-dataset counterpart of latestBucket, which settles the unit across two
// datasets before doing the same thing — the unit has to come first either way,
// because bucket keys only sort chronologically within a unit.
func latestBucketOf(rows []gen.SubjectTrend, unit gen.BucketUnit) string {
	var bucket string
	for _, t := range rows {
		if t.BucketUnit == unit && t.TimeBucket > bucket {
			bucket = t.TimeBucket
		}
	}
	return bucket
}

// shareOf divides defensively: an empty basis bucket yields 0, not NaN, so the
// screen renders an empty view instead of a broken one.
func shareOf(count, total int64) float64 {
	if total <= 0 {
		return 0
	}
	return float64(count) / float64(total)
}

// trace walks one Gold contribution back down to the article it came from.
//
// The join axis is RecordID: Bronze news_item carries it, Silver analysis
// carries the same value (AC2.6), and the body hangs off the item's BodyHash in
// a separate content-addressed dataset (AC1.7). Every hop is resolved
// independently and *reported* independently — see traceResponse for why the
// three ways this can come up short are not collapsed into one "missing".
func (h *Handlers) trace(w http.ResponseWriter, r *http.Request) {
	requested := r.URL.Query().Get("record_id")
	items, _ := h.lake.NewsItems()

	item, selection := selectNewsItem(items, requested)
	if item == nil {
		writeJSON(w, http.StatusOK, traceResponse{
			RecordID:  requested,
			Selection: selection,
			Found:     false,
			Crumb:     lineageCrumb(false, false),
		})
		return
	}

	body, _ := h.lake.NewsBody(item.BodyHash)
	analyses, _ := h.lake.Analyses()

	bronze := bronzeSection(*item, body)
	silver, hasSilver := silverSection(item.RecordID, analyses)

	writeJSON(w, http.StatusOK, traceResponse{
		RecordID:  item.RecordID,
		Selection: selection,
		Found:     true,
		Crumb:     lineageCrumb(true, hasSilver),
		Bronze:    &bronze,
		Silver:    silver,
		Ingestion: ingestionSection(*item),
	})
}

// selectNewsItem resolves the requested record, or picks one when none was
// asked for.
//
// The screen must be able to open before it knows a single record id, so an
// empty query is answered with the first observation rather than an error — the
// same courtesy /api/trend extends for subject. What it must *not* do is let
// the caller believe it got what it asked for: the choice is named in the
// response, so "explicit" and "fell back" never read alike.
func selectNewsItem(items []gen.NewsItem, requested string) (*gen.NewsItem, string) {
	if requested != "" {
		for i := range items {
			if items[i].RecordID == requested {
				return &items[i], "requested"
			}
		}
		return nil, "requested-missing"
	}
	if len(items) == 0 {
		return nil, "empty"
	}
	return &items[0], "auto"
}

func bronzeSection(item gen.NewsItem, body *gen.NewsBody) traceBronze {
	out := traceBronze{
		RecordID:      item.RecordID,
		SourceID:      item.SourceID,
		Axis:          string(item.Axis),
		Title:         item.Title,
		SourceURL:     item.SourceURL,
		BodyHash:      item.BodyHash,
		BodyAvailable: item.BodyAvailable,
	}
	if body != nil {
		out.BodyPreserved = true
		out.BodyText = body.RawText
		out.BodyFirstSeenAt = body.FirstSeenAt
		out.BodyFirstSeenCycle = body.FirstSeenCycle
	}
	return out
}

func silverSection(recordID string, analyses []gen.Analysis) (*traceSilver, bool) {
	for _, a := range analyses {
		if a.RecordID != recordID {
			continue
		}
		out := traceSilver{
			AnalysisStatus:    string(a.AnalysisStatus),
			TargetCountries:   a.TargetCountries,
			NarrativeSubjects: a.NarrativeSubjects,
			Confidence:        a.Confidence,
			AnalyzedAt:        a.AnalyzedAt,
			AnalyzerVersion:   a.AnalyzerVersion,
		}
		// A record can be analyzed and still carry no sentiment — that is what
		// "unanalyzed" means in AC2.5 (low confidence, set aside on purpose).
		// Reporting it as a fifth class would let the screen draw it as one of
		// the four, so it stays null and the status carries the meaning.
		if a.Sentiment != nil {
			s := string(*a.Sentiment)
			out.Sentiment = &s
		}
		if out.TargetCountries == nil {
			out.TargetCountries = []string{}
		}
		if out.NarrativeSubjects == nil {
			out.NarrativeSubjects = []string{}
		}
		return &out, true
	}
	return nil, false
}

func ingestionSection(item gen.NewsItem) traceIngestion {
	return traceIngestion{
		CollectedAt:     item.CollectedAt,
		CollectionCycle: item.CollectionCycle,
		Rank:            item.Rank,
		ViewCount:       item.ViewCount,
	}
}

// lineageCrumb is the Bronze -> Silver -> Gold path, with each hop marked
// present or not. Gold is always marked present: the reader arrived here *from*
// a Gold number, so the aggregate end of the chain is the premise of the walk,
// not something this endpoint looks up.
func lineageCrumb(bronze, silver bool) []traceCrumbStep {
	return []traceCrumbStep{
		{Layer: "bronze", Label: "원문 수집", Present: bronze},
		{Layer: "silver", Label: "분석", Present: silver},
		{Layer: "gold", Label: "집계 기여", Present: true},
	}
}

func topSubjects(trends []gen.SubjectTrend, axis string, limit int) []rankRow {
	rows := make([]rankRow, 0, len(trends))
	for _, t := range trends {
		if string(t.Axis) != axis {
			continue
		}
		rows = append(rows, rankRow{
			Subject:         t.Subject,
			NormalizedShare: t.NormalizedShare,
			RawCount:        t.RawCount,
			Spark:           t.Spark,
			Delta:           t.Delta,
		})
	}
	sort.SliceStable(rows, func(i, j int) bool {
		return rows[i].NormalizedShare > rows[j].NormalizedShare
	})
	if limit > 0 && len(rows) > limit {
		rows = rows[:limit]
	}
	for i := range rows {
		rows[i].Rank = i + 1
	}
	return rows
}

// plottedUnit picks the bucket unit the chart is drawn in: the finest one
// present, which is the default AC3.3 names.
//
// Note what it does *not* do — pick the unit of the newest bucket. Bucket keys
// are only comparable within a unit: "2026-W26" sorts above "2026-06-23T14"
// because 'W' outranks '0', not because that week is later. Choosing by rank
// order of the units sidesteps that entirely. Empty input yields the zero unit
// and the caller's filter then keeps nothing — an empty chart, never a mixed
// one. Rollups have landed, so this is the live default; a ?unit= parameter
// would hang here, and does not exist yet.
func plottedUnit(rows []gen.SubjectTrend) gen.BucketUnit {
	present := make(map[gen.BucketUnit]bool, 3)
	for _, t := range rows {
		present[t.BucketUnit] = true
	}
	return finestUnit(present)
}

// finestUnit ranks the units rather than the bucket keys — the one comparison
// that is valid across units. The zero unit for empty input is deliberate: a
// caller filtering on it keeps nothing, so an empty Gold yields an empty view
// rather than an invented basis.
func finestUnit(present map[gen.BucketUnit]bool) gen.BucketUnit {
	for _, unit := range []gen.BucketUnit{gen.BucketUnitHour, gen.BucketUnitDay, gen.BucketUnitWeek} {
		if present[unit] {
			return unit
		}
	}
	return ""
}

// distinctBuckets returns the x-axis: every bucket present, oldest first.
// Bucket keys are zero-padded ISO prefixes, so lexical order is chronological
// within one unit — which is all this sees, the caller having filtered.
func distinctBuckets(rows []gen.SubjectTrend) []string {
	seen := make(map[string]bool, len(rows))
	buckets := make([]string, 0, len(rows))
	for _, t := range rows {
		if !seen[t.TimeBucket] {
			seen[t.TimeBucket] = true
			buckets = append(buckets, t.TimeBucket)
		}
	}
	sort.Strings(buckets)
	return buckets
}

// seriesBySubject folds the flat Gold rows into one line per subject, ordered
// by the subject's share in the latest bucket. A subject with no row in that
// bucket sorts to the back on a zero share: it is still drawable history, but
// it is not what attention is on now.
func seriesBySubject(rows []gen.SubjectTrend, buckets []string) []trendSeries {
	latest := ""
	if len(buckets) > 0 {
		latest = buckets[len(buckets)-1]
	}

	order := make([]string, 0)
	points := make(map[string][]trendPoint)
	head := make(map[string]gen.SubjectTrend)
	for _, t := range rows {
		if _, ok := points[t.Subject]; !ok {
			order = append(order, t.Subject)
		}
		points[t.Subject] = append(points[t.Subject], trendPoint{
			TimeBucket:      t.TimeBucket,
			NormalizedShare: t.NormalizedShare,
			RawCount:        t.RawCount,
		})
		if t.TimeBucket == latest {
			head[t.Subject] = t
		}
	}

	series := make([]trendSeries, 0, len(order))
	for _, subject := range order {
		pts := points[subject]
		sort.SliceStable(pts, func(i, j int) bool { return pts[i].TimeBucket < pts[j].TimeBucket })
		series = append(series, trendSeries{
			Subject:     subject,
			LatestShare: head[subject].NormalizedShare,
			Delta:       head[subject].Delta,
			Points:      pts,
		})
	}
	sort.SliceStable(series, func(i, j int) bool {
		return series[i].LatestShare > series[j].LatestShare
	})
	return series
}

// pickSubject honours an explicit ?subject= only when that subject actually has
// a line; otherwise the leading subject is selected. Echoing back a subject the
// response holds no data for would leave the screen highlighting nothing.
func pickSubject(series []trendSeries, requested string) string {
	for _, s := range series {
		if s.Subject == requested {
			return requested
		}
	}
	if len(series) > 0 {
		return series[0].Subject
	}
	return ""
}

// limitSeries trims to the leading subjects while keeping the selected one,
// which may sit outside them, and marks it.
func limitSeries(series []trendSeries, selected string, limit int) []trendSeries {
	kept := make([]trendSeries, 0, limit)
	for _, s := range series {
		if s.Subject == selected {
			s.Selected = true
			kept = append(kept, s)
			continue
		}
		if len(kept) < limit && countUnselected(kept) < limit-1 {
			kept = append(kept, s)
		}
	}
	if len(kept) > limit {
		kept = kept[:limit]
	}
	sort.SliceStable(kept, func(i, j int) bool {
		return kept[i].LatestShare > kept[j].LatestShare
	})
	return kept
}

func countUnselected(series []trendSeries) int {
	n := 0
	for _, s := range series {
		if !s.Selected {
			n++
		}
	}
	return n
}

// latestBucket picks the basis of the compare view: the newest bucket of the
// finest unit present.
//
// Settling the unit *first* is not a refinement, it is what makes the pick
// meaningful. Bucket keys are only comparable within a unit — "2026-W26" sorts
// above "2026-06-23T14" because 'W' outranks '0', not because that week is
// later — so a plain maximum over mixed rows would hand the view a week rollup
// and label it the latest hour. With rollups in Gold (AC3.3) that is not a
// hypothetical: every run writes a week row.
func latestBucket(trends []gen.SubjectTrend, sentiments []gen.AxisSentiment) (string, gen.BucketUnit) {
	present := make(map[gen.BucketUnit]bool, 3)
	for _, t := range trends {
		present[t.BucketUnit] = true
	}
	for _, s := range sentiments {
		present[s.BucketUnit] = true
	}
	unit := finestUnit(present)

	var bucket string
	for _, t := range trends {
		if t.BucketUnit == unit && t.TimeBucket > bucket {
			bucket = t.TimeBucket
		}
	}
	for _, s := range sentiments {
		if s.BucketUnit == unit && s.TimeBucket > bucket {
			bucket = s.TimeBucket
		}
	}
	return bucket, unit
}

func trendsInBucket(trends []gen.SubjectTrend, bucket string, unit gen.BucketUnit) []gen.SubjectTrend {
	rows := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if t.TimeBucket == bucket && t.BucketUnit == unit {
			rows = append(rows, t)
		}
	}
	return rows
}

func sentimentInBucket(
	rows []gen.AxisSentiment, axis, bucket string, unit gen.BucketUnit,
) gen.SentimentDistribution {
	for _, r := range rows {
		if string(r.Axis) == axis && r.TimeBucket == bucket && r.BucketUnit == unit {
			return r.Distribution
		}
	}
	return gen.SentimentDistribution{}
}

// sentimentUnit picks the bucket unit the distribution is read in: the finest
// one present, matching plottedUnit's reasoning (bucket keys are only
// comparable within a unit, so unit rank — not key order — decides). Empty
// input yields the zero unit and the caller's filter then keeps nothing.
func sentimentUnit(rows []gen.AxisSentiment) gen.BucketUnit {
	present := make(map[gen.BucketUnit]bool, 3)
	for _, s := range rows {
		present[s.BucketUnit] = true
	}
	return finestUnit(present)
}

// sentimentSeries folds one axis's rows into bucket order. Gold's key is
// (axis, bucket), so a second row for a bucket is an upstream contract
// violation rather than a value to blend: the first is kept and the rest
// dropped, which keeps one bar per bucket instead of a silently doubled one.
func sentimentSeries(rows []gen.AxisSentiment, axis string) []sentimentPoint {
	out := make([]sentimentPoint, 0, len(rows))
	seen := make(map[string]bool, len(rows))
	for _, s := range rows {
		if string(s.Axis) != axis || seen[s.TimeBucket] {
			continue
		}
		seen[s.TimeBucket] = true
		out = append(out, sentimentPoint{
			TimeBucket:    s.TimeBucket,
			Distribution:  s.Distribution,
			AnalyzedTotal: s.AnalyzedTotal,
		})
	}
	sort.SliceStable(out, func(i, j int) bool { return out[i].TimeBucket < out[j].TimeBucket })
	return out
}

// latestSentimentBucket returns the most recent bucket present, which is the
// lexical max: bucket keys are zero-padded ISO prefixes, so within one unit
// lexical order is chronological. The caller has already filtered to one unit.
func latestSentimentBucket(rows []gen.AxisSentiment) string {
	bucket := ""
	for _, s := range rows {
		if s.TimeBucket > bucket {
			bucket = s.TimeBucket
		}
	}
	return bucket
}

// sentimentByAxis lines the three axes up at one bucket. Every axis gets a row
// whether or not Gold holds one for it, so the screen renders a fixed set of
// columns and marks the missing ones rather than dropping them — a disappearing
// column reads as "this axis does not exist", not "it has no data yet".
func sentimentByAxis(rows []gen.AxisSentiment, bucket string) []sentimentAxisRow {
	out := make([]sentimentAxisRow, 0, 3)
	for _, axis := range []string{"KR", "US", "GLOBAL"} {
		row := sentimentAxisRow{Axis: axis}
		for _, s := range rows {
			if string(s.Axis) == axis && s.TimeBucket == bucket && bucket != "" {
				row.Distribution = s.Distribution
				row.AnalyzedTotal = s.AnalyzedTotal
				row.Present = true
				break
			}
		}
		out = append(out, row)
	}
	return out
}

func sentimentFor(rows []gen.AxisSentiment, axis string) gen.SentimentDistribution {
	for _, r := range rows {
		if string(r.Axis) == axis {
			return r.Distribution
		}
	}
	return gen.SentimentDistribution{}
}

func axisParam(r *http.Request, fallback string) string {
	switch axis := r.URL.Query().Get("axis"); axis {
	case "KR", "US", "GLOBAL":
		return axis
	default:
		return fallback
	}
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	if err := enc.Encode(payload); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
	}
}
