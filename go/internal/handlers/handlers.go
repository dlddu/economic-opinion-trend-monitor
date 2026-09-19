// Package handlers exposes the serving API.
//
// There is one stub route per frontend screen (7 screens -> 7 routes) plus a
// health check. Routes that have Gold data behind them (dashboard, compare,
// sentiment, fairness, trend) derive their response from the lake so the
// Python -> Gold -> Go path is exercised end to end; trace and reprocess return
// shaped placeholders (their real data contracts are follow-up work).
package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// Handlers holds the dependencies shared by the route handlers.
type Handlers struct {
	lake *store.Lake
}

// New builds Handlers backed by the given lake.
func New(lake *store.Lake) *Handlers { return &Handlers{lake: lake} }

// Register wires every API route onto mux (Go 1.22 method+path patterns).
func (h *Handlers) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/health", h.health)
	mux.HandleFunc("GET /api/dashboard", h.dashboard) // screen: dash
	mux.HandleFunc("GET /api/trend", h.trend)         // screen: trend
	mux.HandleFunc("GET /api/compare", h.compare)     // screen: compare
	mux.HandleFunc("GET /api/sentiment", h.sentiment) // screen: sentiment
	mux.HandleFunc("GET /api/fairness", h.fairness)   // screen: fairness
	mux.HandleFunc("GET /api/trace", h.trace)         // screen: trace
	mux.HandleFunc("GET /api/reprocess", h.reprocess) // screen: reprocess
}

type metric struct {
	Label string `json:"label"`
	Value string `json:"value"`
	Note  string `json:"note"`
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

type dashboardResponse struct {
	Axis        string                    `json:"axis"`
	Normalized  bool                      `json:"normalized"`
	Metrics     []metric                  `json:"metrics"`
	TopSubjects []rankRow                 `json:"top_subjects"`
	Sentiment   gen.SentimentDistribution `json:"sentiment"`
}

func (h *Handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()
	sentiments, _ := h.lake.AxisSentiments()

	top := topSubjects(trends, axis, 8)
	dist := sentimentFor(sentiments, axis)

	var rawTotal int64
	for _, row := range top {
		rawTotal += row.RawCount
	}
	completion := (1 - dist.Unanalyzed) * 100

	writeJSON(w, http.StatusOK, dashboardResponse{
		Axis:       axis,
		Normalized: true,
		Metrics: []metric{
			{Label: "수집 뉴스 (현재 버킷)", Value: fmt.Sprintf("%d", rawTotal), Note: "원시 카운트 합"},
			{Label: "추적 서술 대상", Value: fmt.Sprintf("%d", len(top)), Note: "표기변형 통합 키"},
			{Label: "분석 완료율", Value: fmt.Sprintf("%.1f %%", completion), Note: "저신뢰·미분석 분리"},
			{Label: "정규화 기준", Value: "소스 내 점유율", Note: "share-normalized"},
		},
		TopSubjects: top,
		Sentiment:   dist,
	})
}

// trend answers AC3.5: one subject's interest over time, with the axis's
// leading subjects overlaid so the selected line can be read against them.
//
// Gold holds one flat row per (subject, axis, bucket), so a time series is the
// rows of one subject read in bucket order — and the chart is only honest if
// every line is drawn on one x-axis. Two things could break that:
//
//   - Mixed bucket units. Gold may hold hour, day and week rows for the same
//     subject (the contract allows all three). Plotting them together would put
//     a week point between two hours, so the handler settles on one unit and
//     keeps only those rows. AC3.3 has not landed yet, so today this always
//     resolves to "hour" — the filter is what keeps the series clean when
//     rollups do arrive.
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
func (h *Handlers) compare(w http.ResponseWriter, _ *http.Request) {
	trends, _ := h.lake.SubjectTrends()
	sentiments, _ := h.lake.AxisSentiments()

	bucket, unit := latestBucket(trends, sentiments)
	inBucket := trendsInBucket(trends, bucket)

	axes := []string{"KR", "US", "GLOBAL"}
	columns := make([]map[string]any, 0, len(axes))
	for _, axis := range axes {
		columns = append(columns, map[string]any{
			"axis":         axis,
			"top_subjects": topSubjects(inBucket, axis, 5),
			"sentiment":    sentimentInBucket(sentiments, axis, bucket),
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

func (h *Handlers) sentiment(w http.ResponseWriter, _ *http.Request) {
	sentiments, _ := h.lake.AxisSentiments()
	writeJSON(w, http.StatusOK, map[string]any{"by_axis": sentiments})
}

func (h *Handlers) fairness(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()
	rows := topSubjects(trends, axis, 20)
	writeJSON(w, http.StatusOK, map[string]any{
		"axis":       axis,
		"normalized": true,
		"rows":       rows,
		"note":       "정규화 비율과 원시 카운트를 함께 제공 (AC3.8)",
	})
}

func (h *Handlers) trace(w http.ResponseWriter, r *http.Request) {
	recordID := r.URL.Query().Get("record_id")
	writeJSON(w, http.StatusOK, map[string]any{
		"record_id": recordID,
		"lineage": []map[string]string{
			{"layer": "gold", "note": "subject_trend / axis_sentiment 집계 기여"},
			{"layer": "silver", "note": "analysis 레코드 (record_id 추적 키)"},
			{"layer": "bronze", "note": "원문 링크 + 원문 전체 (AC1.4)"},
		},
		"note": "stub: 원문 역추적 자리. 실제 Bronze 조인은 후속 작업 (AC2.6)",
	})
}

func (h *Handlers) reprocess(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"status": "idle",
		"note":   "stub: 재처리 콘솔 자리. analyzer 버전 bump + 재분석 트리거는 후속 작업 (AC2.6)",
	})
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
// present, which is the default AC3.3 names ("기본 단위는 시간").
//
// Note what it does *not* do — pick the unit of the newest bucket. Bucket keys
// are only comparable within a unit: "2026-W26" sorts above "2026-06-23T14"
// because 'W' outranks '0', not because that week is later. Choosing by rank
// order of the units sidesteps that entirely. Empty input yields the zero unit
// and the caller's filter then keeps nothing — an empty chart, never a mixed
// one. When rollups land, this is where a ?unit= parameter hangs.
func plottedUnit(rows []gen.SubjectTrend) gen.BucketUnit {
	present := make(map[gen.BucketUnit]bool, 3)
	for _, t := range rows {
		present[t.BucketUnit] = true
	}
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

// latestBucket returns the most recent time bucket present in Gold, with the
// unit it was bucketed by. Bucket keys are zero-padded ISO prefixes
// ("2026-06-23T14", "2026-06-23", "2026-W25"), so lexical max is chronological
// max within a unit. Empty Gold yields the zero values, which the callers below
// treat as "no rows match".
func latestBucket(trends []gen.SubjectTrend, sentiments []gen.AxisSentiment) (string, gen.BucketUnit) {
	var bucket string
	var unit gen.BucketUnit
	for _, t := range trends {
		if t.TimeBucket > bucket {
			bucket, unit = t.TimeBucket, t.BucketUnit
		}
	}
	for _, s := range sentiments {
		if s.TimeBucket > bucket {
			bucket, unit = s.TimeBucket, s.BucketUnit
		}
	}
	return bucket, unit
}

func trendsInBucket(trends []gen.SubjectTrend, bucket string) []gen.SubjectTrend {
	rows := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if t.TimeBucket == bucket {
			rows = append(rows, t)
		}
	}
	return rows
}

func sentimentInBucket(rows []gen.AxisSentiment, axis, bucket string) gen.SentimentDistribution {
	for _, r := range rows {
		if string(r.Axis) == axis && r.TimeBucket == bucket {
			return r.Distribution
		}
	}
	return gen.SentimentDistribution{}
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
