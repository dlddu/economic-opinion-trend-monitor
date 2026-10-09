package handlers

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// dashRanges is the same range vocabulary /api/reprocess takes.
var dashRanges = map[string]time.Duration{
	"24h": 24 * time.Hour,
	"7d":  7 * 24 * time.Hour,
	"30d": 30 * 24 * time.Hour,
}

const (
	defaultDashRange = "7d"
	defaultDashUnit  = gen.BucketUnitDay
	dashTopLimit     = 8
)

type dashRow struct {
	Rank            int       `json:"rank"`
	Subject         string    `json:"subject"`
	NormalizedShare float64   `json:"normalized_share"`
	RawCount        int64     `json:"raw_count"`
	RawRank         int       `json:"raw_rank"`
	Spark           []float64 `json:"spark"`
	Delta           float64   `json:"delta"`
	IsNew           bool      `json:"is_new"`
}

type dashBasis struct {
	Range string `json:"range"`
	Unit  string `json:"unit"`
	// Bucket is the latest bucket of the unit across every axis — the collection
	// the screen is reading. PreviousBucket is this axis's bucket before it.
	Bucket         string   `json:"bucket"`
	PreviousBucket string   `json:"previous_bucket"`
	HasBaseline    bool     `json:"has_baseline"`
	Buckets        []string `json:"buckets"`
	EmptyWindow    bool     `json:"empty_window"`
	// LastBucket is this axis's own latest bucket in the unit, "" when it has none.
	LastBucket string `json:"last_bucket"`
}

type dashSummary struct {
	Collected     *int64  `json:"collected"`
	CollectedPrev *int64  `json:"collected_prev"`
	Analyzed      int64   `json:"analyzed"`
	Coverage      float64 `json:"coverage"`
	LowConfidence float64 `json:"low_confidence"`
}

type dashboardResponse struct {
	Axis        string       `json:"axis"`
	Normalized  bool         `json:"normalized"`
	Basis       dashBasis    `json:"basis"`
	Summary     *dashSummary `json:"summary"`
	TopSubjects []dashRow    `json:"top_subjects"`
}

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	rangeKey := r.URL.Query().Get("range")
	if _, ok := dashRanges[rangeKey]; !ok {
		rangeKey = defaultDashRange
	}
	unit := unitParam(r, defaultDashUnit)

	// Another axis's rows only lift the anchor, so of those only a row that raises
	// their running maximum is kept — the anchor comes out the same.
	var otherAxesMax string
	trends, _ := h.lake.SubjectTrendsWhere(r.Context(), func(t *gen.SubjectTrend) bool {
		if t.BucketUnit != unit {
			return false
		}
		if string(t.Axis) == axis {
			return true
		}
		if t.TimeBucket > otherAxesMax {
			otherAxesMax = t.TimeBucket
			return true
		}
		return false
	})
	sentiments, _ := h.lake.AxisSentiments()
	writeJSON(w, http.StatusOK, buildDashboard(trends, sentiments, axis, rangeKey, unit))
}

func buildDashboard(
	trends []gen.SubjectTrend, sentiments []gen.AxisSentiment,
	axis, rangeKey string, unit gen.BucketUnit,
) dashboardResponse {
	resp := dashboardResponse{
		Axis:        axis,
		Normalized:  true,
		Basis:       dashBasis{Range: rangeKey, Unit: string(unit), Buckets: []string{}},
		TopSubjects: []dashRow{},
	}

	// Everything below reads one unit: bucket keys only order within a unit.
	var anchor string
	axisBuckets := map[string]bool{}
	shares := map[string]map[string]gen.SubjectTrend{}
	sentAt := map[string]gen.AxisSentiment{}
	for _, t := range trends {
		if t.BucketUnit != unit {
			continue
		}
		if t.TimeBucket > anchor {
			anchor = t.TimeBucket
		}
		if string(t.Axis) != axis {
			continue
		}
		axisBuckets[t.TimeBucket] = true
		if shares[t.TimeBucket] == nil {
			shares[t.TimeBucket] = map[string]gen.SubjectTrend{}
		}
		shares[t.TimeBucket][t.Subject] = t
	}
	for _, s := range sentiments {
		if s.BucketUnit != unit {
			continue
		}
		if s.TimeBucket > anchor {
			anchor = s.TimeBucket
		}
		if string(s.Axis) != axis {
			continue
		}
		axisBuckets[s.TimeBucket] = true
		// Gold's key is (axis, bucket): a second row is a contract violation,
		// so the first is kept, as sentimentSeries does.
		if _, seen := sentAt[s.TimeBucket]; !seen {
			sentAt[s.TimeBucket] = s
		}
	}
	resp.Basis.Bucket = anchor
	for b := range axisBuckets {
		if b > resp.Basis.LastBucket {
			resp.Basis.LastBucket = b
		}
	}
	if anchor == "" || resp.Basis.LastBucket != anchor {
		resp.Basis.EmptyWindow = true
		return resp
	}

	window := windowBuckets(axisBuckets, anchor, unit, dashRanges[rangeKey])
	resp.Basis.Buckets = window
	var prev string
	if len(window) >= 2 {
		prev = window[len(window)-2]
		resp.Basis.PreviousBucket = prev
		resp.Basis.HasBaseline = true
	}

	resp.Summary = summarize(sentAt, anchor, prev)
	resp.TopSubjects = rankAnchor(shares, window, anchor, prev)
	return resp
}

func rankAnchor(
	shares map[string]map[string]gen.SubjectTrend, window []string, anchor, prev string,
) []dashRow {
	current := make([]gen.SubjectTrend, 0, len(shares[anchor]))
	for _, t := range shares[anchor] {
		current = append(current, t)
	}

	byRaw := append([]gen.SubjectTrend(nil), current...)
	sort.Slice(byRaw, func(i, j int) bool {
		if byRaw[i].RawCount != byRaw[j].RawCount {
			return byRaw[i].RawCount > byRaw[j].RawCount
		}
		return byRaw[i].Subject < byRaw[j].Subject
	})
	rawRank := make(map[string]int, len(byRaw))
	for i, t := range byRaw {
		rawRank[t.Subject] = i + 1
	}

	sort.Slice(current, func(i, j int) bool {
		if current[i].NormalizedShare != current[j].NormalizedShare {
			return current[i].NormalizedShare > current[j].NormalizedShare
		}
		if current[i].RawCount != current[j].RawCount {
			return current[i].RawCount > current[j].RawCount
		}
		return current[i].Subject < current[j].Subject
	})
	if len(current) > dashTopLimit {
		current = current[:dashTopLimit]
	}

	rows := make([]dashRow, 0, len(current))
	for i, t := range current {
		spark := make([]float64, 0, len(window))
		for _, b := range window {
			spark = append(spark, shares[b][t.Subject].NormalizedShare)
		}
		row := dashRow{
			Rank:            i + 1,
			Subject:         t.Subject,
			NormalizedShare: t.NormalizedShare,
			RawCount:        t.RawCount,
			RawRank:         rawRank[t.Subject],
			Spark:           spark,
		}
		if prev != "" {
			before, seen := shares[prev][t.Subject]
			row.Delta = math.Round((t.NormalizedShare-before.NormalizedShare)*1000) / 10
			row.IsNew = !seen
		}
		rows = append(rows, row)
	}
	return rows
}

func summarize(sentAt map[string]gen.AxisSentiment, anchor, prev string) *dashSummary {
	cur, ok := sentAt[anchor]
	if !ok {
		return nil
	}
	u := cur.Distribution.Unanalyzed
	out := &dashSummary{
		Collected:     recoverTotal(cur),
		Analyzed:      cur.AnalyzedTotal,
		Coverage:      1 - u,
		LowConfidence: u,
	}
	if before, ok := sentAt[prev]; prev != "" && ok {
		out.CollectedPrev = recoverTotal(before)
	}
	return out
}

// recoverTotal re-derives a bucket's item count from its analyzed count and the
// share set aside. A bucket with everything set aside cannot be re-derived.
func recoverTotal(s gen.AxisSentiment) *int64 {
	kept := 1 - s.Distribution.Unanalyzed
	if kept <= 0 {
		return nil
	}
	n := int64(math.Round(float64(s.AnalyzedTotal) / kept))
	return &n
}

// windowBuckets keeps the axis's buckets that start inside the range ending at
// the anchor, oldest first. A key that does not parse is left out rather than
// guessed into the window.
func windowBuckets(present map[string]bool, anchor string, unit gen.BucketUnit, span time.Duration) []string {
	end, err := bucketStart(anchor, unit)
	if err != nil {
		return []string{anchor}
	}
	from := end.Add(-span)
	out := make([]string, 0, len(present))
	for b := range present {
		at, err := bucketStart(b, unit)
		if err != nil || !at.After(from) || at.After(end) {
			continue
		}
		out = append(out, b)
	}
	sort.Strings(out)
	return out
}

// bucketStart reads a Gold bucket label back into the instant its bucket opens —
// the inverse of the aggregation's `_bucket`: "2026-06-23T14", "2026-06-23",
// "2026-W26" (ISO week-numbering year).
func bucketStart(label string, unit gen.BucketUnit) (time.Time, error) {
	switch unit {
	case gen.BucketUnitHour:
		return time.Parse("2006-01-02T15", label)
	case gen.BucketUnitDay:
		return time.Parse("2006-01-02", label)
	case gen.BucketUnitWeek:
		var year, week int
		if _, err := fmt.Sscanf(label, "%d-W%d", &year, &week); err != nil {
			return time.Time{}, err
		}
		if week < 1 || week > 53 {
			return time.Time{}, fmt.Errorf("week out of range: %q", label)
		}
		jan4 := time.Date(year, time.January, 4, 0, 0, 0, 0, time.UTC)
		monday := jan4.AddDate(0, 0, -((int(jan4.Weekday()) + 6) % 7))
		return monday.AddDate(0, 0, (week-1)*7), nil
	}
	return time.Time{}, fmt.Errorf("unknown bucket unit %q", unit)
}

func unitParam(r *http.Request, fallback gen.BucketUnit) gen.BucketUnit {
	switch unit := gen.BucketUnit(r.URL.Query().Get("unit")); unit {
	case gen.BucketUnitHour, gen.BucketUnitDay, gen.BucketUnitWeek:
		return unit
	default:
		return fallback
	}
}
