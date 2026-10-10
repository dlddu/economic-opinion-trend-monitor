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
	argo    *argo.Client
	now     func() time.Time
	trigger triggerProbe
	// lakeScan admits one full Bronze/Silver scan at a time: overlapping scans
	// (a screen's parallel fetches, re-sent while earlier ones still ran) are what ran the pod out of memory.
	lakeScan chan struct{}
	calls    *store.LlmCallTally
}

// New builds Handlers backed by the given lake, with no workflow trigger.
func New(lake *store.Lake) *Handlers {
	return &Handlers{
		lake:     lake,
		now:      time.Now,
		lakeScan: make(chan struct{}, 1),
		calls:    store.NewLlmCallTally(),
	}
}

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
	mux.HandleFunc("GET /api/contributions", h.oneScanAtATime(h.contributions))
	mux.HandleFunc("GET /api/source-contributions", h.sourceContributions)
	mux.HandleFunc("GET /api/trace", h.oneScanAtATime(h.trace))
	mux.HandleFunc("GET /api/reprocess", h.oneScanAtATime(h.reprocess))
	mux.HandleFunc("GET /api/debug", h.oneScanAtATime(h.debug))
	mux.HandleFunc("GET /api/debug/records", h.oneScanAtATime(h.debugRecords))
	mux.HandleFunc("GET /api/reprocess/runs", h.reprocessRuns)
	mux.HandleFunc("POST /api/reprocess/sample", h.reprocessSample)
	mux.HandleFunc("POST /api/reprocess/run", h.reprocessRun)
	mux.HandleFunc("POST /api/reprocess/publish", h.reprocessPublish)
}

func (h *Handlers) oneScanAtATime(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// Waiting here is part of what the caller sees: a pick queued behind another scan
		// spends its proxy budget before its own scan starts.
		clock := newStageClock()
		clock.enter("gate")
		r = r.WithContext(withStageClock(r.Context(), clock))
		defer clock.report(r)
		select {
		case h.lakeScan <- struct{}{}:
		case <-r.Context().Done():
			return
		}
		defer func() { <-h.lakeScan }()
		clock.enter("handler")
		next(&timedWriter{ResponseWriter: w, clock: clock}, r)
	}
}

func gone(r *http.Request) bool {
	return r.Context().Err() != nil
}

type rankRow struct {
	Rank            int       `json:"rank"`
	Subject         string    `json:"subject"`
	NormalizedShare float64   `json:"normalized_share"`
	RawCount        int64     `json:"raw_count"`
	Spark           []float64 `json:"spark"`
	Delta           float64   `json:"delta"`
}

const trendSeriesLimit = 3

type trendPoint struct {
	TimeBucket      string  `json:"time_bucket"`
	NormalizedShare float64 `json:"normalized_share"`
	RawCount        int64   `json:"raw_count"`
}

// trendSeries is one subject's line. Exactly one series carries Selected, and
// LatestShare/Delta are the subject's values in the chart's latest bucket — zero
// when the subject has no row there, not its own most recent point.
type trendSeries struct {
	Subject     string       `json:"subject"`
	Selected    bool         `json:"selected"`
	LatestShare float64      `json:"latest_share"`
	Delta       float64      `json:"delta"`
	Points      []trendPoint `json:"points"`
}

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

const fairnessRowLimit = 20

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

type traceCrumbStep struct {
	Layer   string `json:"layer"`
	Label   string `json:"label"`
	Present bool   `json:"present"`
}

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

type traceIngestion struct {
	CollectedAt     string `json:"collected_at"`
	CollectionCycle string `json:"collection_cycle"`
	Rank            int64  `json:"rank"`
	ViewCount       int64  `json:"view_count"`
}

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
	RecordID  string           `json:"record_id"`
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

func (h *Handlers) trend(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	requested := r.URL.Query().Get("subject")

	// Filter while reading, not after: Gold grows every batch run, and holding
	// every axis and unit at once is what got serving OOM-killed.
	var finest gen.BucketUnit
	rows, _ := h.lake.SubjectTrendsWhere(r.Context(), func(t *gen.SubjectTrend) bool {
		if string(t.Axis) != axis {
			return false
		}
		if finest == "" || unitRank(t.BucketUnit) < unitRank(finest) {
			finest = t.BucketUnit
		}
		return t.BucketUnit == finest
	})

	unit := plottedUnit(rows)
	inUnit := rows[:0]
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

// compare filters every axis to one bucket, the latest in Gold, so an axis with
// no data there comes back as an empty column instead of borrowing an older
// bucket and setting a stale column beside a fresh one.
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

func (h *Handlers) fairness(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	inAxis, _ := h.lake.SubjectTrendsWhere(r.Context(), inAxisTrend(axis))

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

func inAxisTrend(axis string) func(*gen.SubjectTrend) bool {
	return func(t *gen.SubjectTrend) bool { return string(t.Axis) == axis }
}

func latestBucketOf(rows []gen.SubjectTrend, unit gen.BucketUnit) string {
	var bucket string
	for _, t := range rows {
		if t.BucketUnit == unit && t.TimeBucket > bucket {
			bucket = t.TimeBucket
		}
	}
	return bucket
}

func shareOf(count, total int64) float64 {
	if total <= 0 {
		return 0
	}
	return float64(count) / float64(total)
}

func (h *Handlers) trace(w http.ResponseWriter, r *http.Request) {
	requested := r.URL.Query().Get("record_id")
	item, selection := h.selectNewsItem(r, requested)
	if gone(r) {
		return
	}
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
	var first []gen.Analysis
	_ = h.lake.EachAnalysis(r.Context(), func(a *gen.Analysis) error {
		if a.RecordID != item.RecordID {
			return nil
		}
		first = append(first, *a)
		return store.ErrStop
	})
	if gone(r) {
		return
	}

	bronze := bronzeSection(*item, body)
	silver, hasSilver := silverSection(item.RecordID, first)

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

// selectNewsItem names how the record was chosen, so falling back to the first
// observation never reads like the record the caller asked for.
func (h *Handlers) selectNewsItem(r *http.Request, requested string) (*gen.NewsItem, string) {
	var item *gen.NewsItem
	_ = h.lake.EachNewsItem(r.Context(), func(it *gen.NewsItem) error {
		if requested != "" && it.RecordID != requested {
			return nil
		}
		found := *it
		item = &found
		return store.ErrStop
	})
	switch {
	case item != nil && requested != "":
		return item, "requested"
	case item != nil:
		return item, "auto"
	case requested != "":
		return nil, "requested-missing"
	}
	return nil, "empty"
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
func plottedUnit(rows []gen.SubjectTrend) gen.BucketUnit {
	present := make(map[gen.BucketUnit]bool, 3)
	for _, t := range rows {
		present[t.BucketUnit] = true
	}
	return finestUnit(present)
}

func unitRank(u gen.BucketUnit) int {
	for i, unit := range []gen.BucketUnit{gen.BucketUnitHour, gen.BucketUnitDay, gen.BucketUnitWeek} {
		if u == unit {
			return i
		}
	}
	return 3
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

// distinctBuckets sorts bucket keys lexically, which is chronological only
// within one unit — callers filter to one unit first.
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

// latestSentimentBucket takes the lexical max, which is chronological only
// within one unit — the caller has already filtered to one.
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
