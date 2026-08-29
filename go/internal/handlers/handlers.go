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

// --- handlers -------------------------------------------------------------

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

func (h *Handlers) trend(w http.ResponseWriter, r *http.Request) {
	subject := r.URL.Query().Get("subject")
	trends, _ := h.lake.SubjectTrends()
	var series []gen.SubjectTrend
	for _, t := range trends {
		if subject == "" || t.Subject == subject {
			series = append(series, t)
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"subject": subject,
		"series":  series,
		"note":    "stub: single-bucket skeleton data (AC3.5 time series is follow-up)",
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
