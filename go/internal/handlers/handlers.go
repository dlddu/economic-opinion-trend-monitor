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

// --- response shapes ------------------------------------------------------

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

type dashboardResponse struct {
	Axis        string                    `json:"axis"`
	Normalized  bool                      `json:"normalized"`
	Metrics     []metric                  `json:"metrics"`
	TopSubjects []rankRow                 `json:"top_subjects"`
	Sentiment   gen.SentimentDistribution `json:"sentiment"`
}

// trendPoint is one bucket of one subject's series — the chart's raw material.
type trendPoint struct {
	TimeBucket      string  `json:"time_bucket"`
	NormalizedShare float64 `json:"normalized_share"`
	RawCount        int64   `json:"raw_count"`
}

// trendSeries is one subject plotted across time (AC3.5).
type trendSeries struct {
	Subject     string       `json:"subject"`
	Selected    bool         `json:"selected"`
	LatestShare float64      `json:"latest_share"`
	Delta       float64      `json:"delta"`
	Points      []trendPoint `json:"points"`
}

type trendResponse struct {
	Axis    string `json:"axis"`
	Subject string `json:"subject"`
	Basis   struct {
		BucketUnit gen.BucketUnit `json:"bucket_unit"`
		Normalized bool           `json:"normalized"`
		Buckets    []string       `json:"buckets"`
	} `json:"basis"`
	Series []trendSeries `json:"series"`
}

// --- handlers -------------------------------------------------------------

func (h *Handlers) health(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()
	sentiments, _ := h.lake.AxisSentiments()

	// "현재 버킷" in the metric labels below is a claim, so scope the rows to
	// one bucket rather than ranking across every bucket Gold happens to hold —
	// otherwise a subject appears once per bucket and the ranking silently
	// mixes stale rows with fresh ones. Same rule the compare view states.
	bucket, _ := latestBucket(trends, sentiments)
	inBucket := trendsInBucket(trends, bucket)

	top := topSubjects(inBucket, axis, 8)
	dist := sentimentInBucket(sentiments, axis, bucket)

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

// trend answers AC3.5: one subject's interest over time, with the axis's other
// leading subjects laid over it for comparison.
//
// Gold holds one row per (subject, axis, time bucket), so a series is those
// rows for one subject sorted by bucket. Two things the view needs are settled
// here rather than in the browser: the **shared x axis** (the sorted union of
// buckets present on this axis — a subject missing from a bucket must leave a
// gap, not shift left), and **which subject is selected** (the caller's, or the
// axis leader in the latest bucket when none is asked for). Comparison subjects
// are the same top-N ranking the dashboard uses, so the two screens never
// disagree about who is leading.
func (h *Handlers) trend(w http.ResponseWriter, r *http.Request) {
	const comparisons = 3

	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()
	sentiments, _ := h.lake.AxisSentiments()

	onAxis := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if string(t.Axis) == axis {
			onAxis = append(onAxis, t)
		}
	}

	latest, unit := latestBucket(onAxis, nil)
	if unit == "" {
		// No trend rows on this axis: fall back to whatever unit Gold bucketed
		// by, so an empty view still states the terms it would have used.
		_, unit = latestBucket(trends, sentiments)
	}
	ranking := topSubjects(trendsInBucket(onAxis, latest), axis, 0)

	selected := r.URL.Query().Get("subject")
	if !hasSubject(onAxis, selected) {
		selected = ""
		if len(ranking) > 0 {
			selected = ranking[0].Subject
		}
	}

	// Selected first, then the leaders it is compared against.
	wanted := make([]string, 0, comparisons+1)
	if selected != "" {
		wanted = append(wanted, selected)
	}
	for _, row := range ranking {
		if len(wanted) > comparisons {
			break
		}
		if row.Subject != selected {
			wanted = append(wanted, row.Subject)
		}
	}

	body := trendResponse{Axis: axis, Subject: selected, Series: make([]trendSeries, 0, len(wanted))}
	body.Basis.BucketUnit = unit
	body.Basis.Normalized = true
	body.Basis.Buckets = bucketsOf(onAxis)
	for _, subject := range wanted {
		body.Series = append(body.Series, seriesFor(onAxis, subject, subject == selected))
	}
	writeJSON(w, http.StatusOK, body)
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
	sentiments, _ := h.lake.AxisSentiments()

	// Ranked like the dashboard, so scoped to one bucket for the same reason.
	bucket, _ := latestBucket(trends, sentiments)
	rows := topSubjects(trendsInBucket(trends, bucket), axis, 20)
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

// --- helpers --------------------------------------------------------------

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

// bucketsOf is the sorted, de-duplicated x axis shared by every series: the
// buckets that exist on this axis, whether or not a given subject appears in
// each one.
func bucketsOf(trends []gen.SubjectTrend) []string {
	seen := make(map[string]bool, len(trends))
	buckets := make([]string, 0, len(trends))
	for _, t := range trends {
		if !seen[t.TimeBucket] {
			seen[t.TimeBucket] = true
			buckets = append(buckets, t.TimeBucket)
		}
	}
	sort.Strings(buckets)
	return buckets
}

func hasSubject(trends []gen.SubjectTrend, subject string) bool {
	if subject == "" {
		return false
	}
	for _, t := range trends {
		if t.Subject == subject {
			return true
		}
	}
	return false
}

// seriesFor collects one subject's rows in bucket order. The headline numbers
// come from the newest point so the chart and the metric beside it cannot
// disagree.
func seriesFor(trends []gen.SubjectTrend, subject string, selected bool) trendSeries {
	series := trendSeries{Subject: subject, Selected: selected, Points: []trendPoint{}}
	var newest string
	for _, t := range trends {
		if t.Subject != subject {
			continue
		}
		series.Points = append(series.Points, trendPoint{
			TimeBucket:      t.TimeBucket,
			NormalizedShare: t.NormalizedShare,
			RawCount:        t.RawCount,
		})
		if t.TimeBucket >= newest {
			newest = t.TimeBucket
			series.LatestShare, series.Delta = t.NormalizedShare, t.Delta
		}
	}
	sort.SliceStable(series.Points, func(i, j int) bool {
		return series.Points[i].TimeBucket < series.Points[j].TimeBucket
	})
	return series
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
