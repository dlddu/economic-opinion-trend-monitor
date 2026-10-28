package handlers

import (
	"fmt"
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// dashRanges is the same range vocabulary /api/reprocess takes, and the windows Gold's
// subject_window is aggregated over.
var dashRanges = map[string]time.Duration{
	"24h": 24 * time.Hour,
	"7d":  7 * 24 * time.Hour,
	"30d": 30 * 24 * time.Hour,
}

// dashUnitSpans is how long one bucket of each unit lasts. A unit as long as the range would draw
// the range as a single point with nothing before it, so the dashboard only takes shorter units.
var dashUnitSpans = map[gen.BucketUnit]time.Duration{
	gen.BucketUnitHour: time.Hour,
	gen.BucketUnitDay:  24 * time.Hour,
	gen.BucketUnitWeek: 7 * 24 * time.Hour,
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
	// WindowStart and WindowEnd are the hours the ranking covers; HasBaseline says the window of
	// the same length before it collected anything, which the deltas are taken against.
	WindowStart string `json:"window_start"`
	WindowEnd   string `json:"window_end"`
	HasBaseline bool   `json:"has_baseline"`
	// Bucket is the latest bucket of the unit across every axis — the collection the screen is
	// reading. Buckets are this axis's buckets of the unit inside the range, the sparkline's points.
	Bucket      string   `json:"bucket"`
	Buckets     []string `json:"buckets"`
	EmptyWindow bool     `json:"empty_window"`
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

func (h *Handlers) dashboard(w http.ResponseWriter, r *http.Request, gold goldSource) {
	axis := axisOrAllParam(r, "KR")
	rangeKey := r.URL.Query().Get("range")
	if _, ok := dashRanges[rangeKey]; !ok {
		rangeKey = defaultDashRange
	}
	unit := unitParam(r, defaultDashUnit)
	if dashUnitSpans[unit] >= dashRanges[rangeKey] {
		unit = gen.BucketUnitHour
	}

	// Another axis only lifts the anchor, so of the other axes only their latest bucket is read, and
	// of this axis only the rows of the buckets the window shows.
	ctx := r.Context()
	buckets, err := gold.trendBuckets(ctx, axis, unit)
	goldFailed(r, err)
	everyAxisLatest, err := gold.latestTrendBucket(ctx, "", unit)
	goldFailed(r, err)
	sentiments, err := gold.axisSentiments(ctx)
	goldFailed(r, err)
	subjects, err := gold.subjectWindows(ctx, axis, rangeKey)
	goldFailed(r, err)
	counts, err := gold.axisWindows(ctx, axis, rangeKey)
	goldFailed(r, err)
	inWindow := func(window []string) []gen.SubjectTrend {
		rows, err := gold.trends(ctx, trendQuery{axis: axis, unit: unit, buckets: window})
		goldFailed(r, err)
		return rows
	}
	writeJSON(w, http.StatusOK, buildDashboard(
		buckets, inWindow, sentiments, subjects, counts, everyAxisLatest, axis, rangeKey, unit,
	))
}

func buildDashboard(
	buckets []string, inWindow func(window []string) []gen.SubjectTrend, sentiments []gen.AxisSentiment,
	subjects []gen.SubjectWindow, counts []gen.AxisWindow, everyAxisLatest, axis, rangeKey string,
	unit gen.BucketUnit,
) dashboardResponse {
	resp := dashboardResponse{
		Axis:        axis,
		Normalized:  true,
		Basis:       dashBasis{Range: rangeKey, Unit: string(unit), Buckets: []string{}},
		TopSubjects: []dashRow{},
	}

	// Everything below reads one unit: bucket keys only order within a unit.
	anchor := everyAxisLatest
	axisBuckets := map[string]bool{}
	for _, b := range buckets {
		axisBuckets[b] = true
		if b > anchor {
			anchor = b
		}
	}
	for _, s := range sentiments {
		if s.BucketUnit != unit {
			continue
		}
		if s.TimeBucket > anchor {
			anchor = s.TimeBucket
		}
		if string(s.Axis) == axis {
			axisBuckets[s.TimeBucket] = true
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
	shares := map[string]map[string]float64{}
	for _, t := range inWindow(window) {
		if shares[t.Subject] == nil {
			shares[t.Subject] = map[string]float64{}
		}
		shares[t.Subject][t.TimeBucket] = t.NormalizedShare
	}

	var current, previous *gen.AxisWindow
	for i := range counts {
		switch c := &counts[i]; c.Period {
		case gen.WindowPeriodCurrent:
			current = c
		case gen.WindowPeriodPrevious:
			previous = c
		}
	}
	if current != nil {
		resp.Basis.WindowStart, resp.Basis.WindowEnd = current.WindowStart, current.WindowEnd
	}
	resp.Basis.HasBaseline = previous != nil && previous.Collected > 0
	resp.Summary = summarize(current, previous)
	resp.TopSubjects = rankWindow(subjects, shares, window, resp.Basis.HasBaseline)
	return resp
}

func rankWindow(
	subjects []gen.SubjectWindow, shares map[string]map[string]float64, window []string, hasBaseline bool,
) []dashRow {
	var current []gen.SubjectWindow
	before := map[string]float64{}
	for _, s := range subjects {
		switch s.Period {
		case gen.WindowPeriodCurrent:
			current = append(current, s)
		case gen.WindowPeriodPrevious:
			before[s.Subject] = s.NormalizedShare
		}
	}

	byRaw := append([]gen.SubjectWindow(nil), current...)
	sort.Slice(byRaw, func(i, j int) bool {
		if byRaw[i].RawCount != byRaw[j].RawCount {
			return byRaw[i].RawCount > byRaw[j].RawCount
		}
		return byRaw[i].Subject < byRaw[j].Subject
	})
	rawRank := make(map[string]int, len(byRaw))
	for i, s := range byRaw {
		rawRank[s.Subject] = i + 1
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
	for i, s := range current {
		spark := make([]float64, 0, len(window))
		for _, b := range window {
			spark = append(spark, shares[s.Subject][b])
		}
		row := dashRow{
			Rank:            i + 1,
			Subject:         s.Subject,
			NormalizedShare: s.NormalizedShare,
			RawCount:        s.RawCount,
			RawRank:         rawRank[s.Subject],
			Spark:           spark,
		}
		if hasBaseline {
			prev, seen := before[s.Subject]
			row.Delta = math.Round((s.NormalizedShare-prev)*1000) / 10
			row.IsNew = !seen
		}
		rows = append(rows, row)
	}
	return rows
}

func summarize(current, previous *gen.AxisWindow) *dashSummary {
	if current == nil || current.Collected == 0 {
		return nil
	}
	collected := current.Collected
	coverage := float64(current.AnalyzedTotal) / float64(collected)
	out := &dashSummary{
		Collected:     &collected,
		Analyzed:      current.AnalyzedTotal,
		Coverage:      math.Round(coverage*10000) / 10000,
		LowConfidence: math.Round((1-coverage)*10000) / 10000,
	}
	if previous != nil {
		before := previous.Collected
		out.CollectedPrev = &before
	}
	return out
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
