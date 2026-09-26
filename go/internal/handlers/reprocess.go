package handlers

import (
	"math"
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// /api/reprocess — the read side of the reprocess console.
//
// Before anything is triggered the operator has to see what the range
// contains, and that part is a pure read over Bronze and Silver; the
// triggering itself is the POST side in reprocess_trigger.go.

// reprocessRanges maps the range query value to how far back the window opens.
var reprocessRanges = map[string]time.Duration{
	"24h": 24 * time.Hour,
	"7d":  7 * 24 * time.Hour,
	"30d": 30 * 24 * time.Hour,
}

const defaultReprocessRange = "7d"

type reprocessResponse struct {
	Scope         reprocessScope   `json:"scope"`
	TargetVersion string           `json:"target_version"`
	Versions      []versionRow     `json:"versions"`
	Compare       reprocessCompare `json:"compare"`
	Trigger       reprocessTrigger `json:"trigger"`
}

type reprocessScope struct {
	Range  string `json:"range"`
	Since  string `json:"since"`
	Axis   string `json:"axis"`
	Source string `json:"source"`
	// Sources lists every source the axis holds inside the window, whatever the
	// source filter says — the screen needs the full list to offer a choice.
	Sources             []sourceRow   `json:"sources"`
	Total               int           `json:"total"`
	Already             int           `json:"already"`
	Todo                int           `json:"todo"`
	Buckets             []scopeBucket `json:"buckets"`
	ThroughputPerMinute *float64      `json:"throughput_per_minute"`
	EtaMinutes          *float64      `json:"eta_minutes"`
}

type sourceRow struct {
	SourceID string `json:"source_id"`
	Kept     int    `json:"kept"`
}

// scopeBucket is one collection cycle of the selection.
type scopeBucket struct {
	Cycle string `json:"cycle"`
	Kept  int    `json:"kept"`
	Done  int    `json:"done"`
	Todo  int    `json:"todo"`
}

type versionRow struct {
	AnalyzerVersion string `json:"analyzer_version"`
	Records         int    `json:"records"`
	FirstAnalyzedAt string `json:"first_analyzed_at"`
	LastAnalyzedAt  string `json:"last_analyzed_at"`
}

type reprocessCompare struct {
	Available       bool         `json:"available"`
	Reason          string       `json:"reason"`
	BeforeVersion   string       `json:"before_version"`
	AfterVersion    string       `json:"after_version"`
	Rows            []compareRow `json:"rows"`
	UnanalyzedShare compareShare `json:"unanalyzed_share"`
}

type compareShare struct {
	Before float64 `json:"before"`
	After  float64 `json:"after"`
}

// compareRow is one subject's mention share under each version. Share here is
// raw: mentions of the subject over all mentions the version produced in the
// range. It is not the AC3.1 normalized share Gold carries — the point is to
// see what the new logic *said*, before aggregation reweights it.
type compareRow struct {
	Subject     string  `json:"subject"`
	BeforeShare float64 `json:"before_share"`
	AfterShare  float64 `json:"after_share"`
	Delta       float64 `json:"delta"`
}

func (h *Handlers) reprocess(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	rangeKey := q.Get("range")
	window, ok := reprocessRanges[rangeKey]
	if !ok {
		rangeKey, window = defaultReprocessRange, reprocessRanges[defaultReprocessRange]
	}
	axis := axisParam(r, "KR")
	source := q.Get("source")
	since := h.now().Add(-window)

	items, _ := h.lake.NewsItems()
	analyses, _ := h.lake.Analyses()

	inAxis := itemsInWindow(items, axis, since)
	scoped := inAxis
	if source != "" {
		scoped = nil
		for _, it := range inAxis {
			if it.SourceID == source {
				scoped = append(scoped, it)
			}
		}
	}

	scopedIDs := make(map[string]bool, len(scoped))
	for _, it := range scoped {
		scopedIDs[it.RecordID] = true
	}
	silver := make([]gen.Analysis, 0, len(scoped))
	for _, a := range analyses {
		if scopedIDs[a.RecordID] {
			silver = append(silver, a)
		}
	}

	versions := versionsOf(silver)
	target := q.Get("version")
	if target == "" && len(versions) > 0 {
		target = versions[len(versions)-1].AnalyzerVersion
	}

	scope := reprocessScope{
		Range:   rangeKey,
		Since:   since.UTC().Format(time.RFC3339),
		Axis:    axis,
		Source:  source,
		Sources: sourcesOf(inAxis),
		Buckets: bucketsOf(scoped, silver, target),
	}
	for _, b := range scope.Buckets {
		scope.Total += b.Kept
		scope.Already += b.Done
		scope.Todo += b.Todo
	}
	scope.ThroughputPerMinute, scope.EtaMinutes = throughput(silver, target, scope.Todo)

	writeJSON(w, http.StatusOK, reprocessResponse{
		Scope:         scope,
		TargetVersion: target,
		Versions:      versions,
		Compare:       compareVersions(silver, versions, target),
		Trigger:       h.reprocessTrigger(r),
	})
}

// itemsInWindow keeps the observations of one axis collected at or after since.
// An observation whose collected_at cannot be read is left out rather than
// guessed into the window.
func itemsInWindow(items []gen.NewsItem, axis string, since time.Time) []gen.NewsItem {
	var out []gen.NewsItem
	for _, it := range items {
		if string(it.Axis) != axis {
			continue
		}
		at, err := time.Parse(time.RFC3339, it.CollectedAt)
		if err != nil || at.Before(since) {
			continue
		}
		out = append(out, it)
	}
	return out
}

func sourcesOf(items []gen.NewsItem) []sourceRow {
	count := map[string]int{}
	for _, it := range items {
		count[it.SourceID]++
	}
	out := make([]sourceRow, 0, len(count))
	for id, n := range count {
		out = append(out, sourceRow{SourceID: id, Kept: n})
	}
	sort.Slice(out, func(i, j int) bool { return out[i].SourceID < out[j].SourceID })
	return out
}

// bucketsOf groups the selection by collection cycle and marks, per cycle, how
// many records Silver already carries at the target version. "Done" is a count
// of records, not of Silver rows — a record analyzed twice at the same version
// is still one record that needs no reprocessing.
func bucketsOf(items []gen.NewsItem, silver []gen.Analysis, target string) []scopeBucket {
	doneIDs := map[string]bool{}
	if target != "" {
		for _, a := range silver {
			if a.AnalyzerVersion == target {
				doneIDs[a.RecordID] = true
			}
		}
	}
	byCycle := map[string]*scopeBucket{}
	for _, it := range items {
		b := byCycle[it.CollectionCycle]
		if b == nil {
			b = &scopeBucket{Cycle: it.CollectionCycle}
			byCycle[it.CollectionCycle] = b
		}
		b.Kept++
		if doneIDs[it.RecordID] {
			b.Done++
		}
	}
	out := make([]scopeBucket, 0, len(byCycle))
	for _, b := range byCycle {
		b.Todo = b.Kept - b.Done
		out = append(out, *b)
	}
	// Cycle keys share one unit ("2026-09-21T09:00"), so lexical order is time order.
	sort.Slice(out, func(i, j int) bool { return out[i].Cycle < out[j].Cycle })
	return out
}

// versionsOf lists the analyzer versions present, oldest last-analyzed first.
// The newest by last_analyzed_at is the default target: it is the version the
// pipeline is stamping right now.
func versionsOf(silver []gen.Analysis) []versionRow {
	byVersion := map[string]*versionRow{}
	for _, a := range silver {
		v := byVersion[a.AnalyzerVersion]
		if v == nil {
			v = &versionRow{AnalyzerVersion: a.AnalyzerVersion,
				FirstAnalyzedAt: a.AnalyzedAt, LastAnalyzedAt: a.AnalyzedAt}
			byVersion[a.AnalyzerVersion] = v
		}
		v.Records++
		if a.AnalyzedAt < v.FirstAnalyzedAt {
			v.FirstAnalyzedAt = a.AnalyzedAt
		}
		if a.AnalyzedAt > v.LastAnalyzedAt {
			v.LastAnalyzedAt = a.AnalyzedAt
		}
	}
	out := make([]versionRow, 0, len(byVersion))
	for _, v := range byVersion {
		out = append(out, *v)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].LastAnalyzedAt != out[j].LastAnalyzedAt {
			return out[i].LastAnalyzedAt < out[j].LastAnalyzedAt
		}
		return out[i].AnalyzerVersion < out[j].AnalyzerVersion
	})
	return out
}

// throughput reads the rate the target version was produced at, from the
// analyzed_at spread of its records, and turns the remaining count into an
// estimate. Both are nil unless at least two records span a positive interval.
func throughput(silver []gen.Analysis, target string, todo int) (*float64, *float64) {
	var first, last time.Time
	n := 0
	for _, a := range silver {
		if a.AnalyzerVersion != target {
			continue
		}
		at, err := time.Parse(time.RFC3339, a.AnalyzedAt)
		if err != nil {
			continue
		}
		if n == 0 || at.Before(first) {
			first = at
		}
		if n == 0 || at.After(last) {
			last = at
		}
		n++
	}
	span := last.Sub(first).Minutes()
	if n < 2 || span <= 0 {
		return nil, nil
	}
	perMinute := float64(n) / span
	eta := math.Ceil(float64(todo) / perMinute)
	return &perMinute, &eta
}

// compareVersions puts the newest two versions side by side: "after" is the
// target version and "before" the newest other one.
func compareVersions(silver []gen.Analysis, versions []versionRow, target string) reprocessCompare {
	if len(versions) == 0 {
		return reprocessCompare{Available: false, Reason: "no-silver", Rows: []compareRow{}}
	}
	if len(versions) < 2 {
		return reprocessCompare{Available: false, Reason: "single-version", AfterVersion: target,
			Rows: []compareRow{}}
	}
	before, hasTarget := "", false
	for i := len(versions) - 1; i >= 0; i-- {
		if versions[i].AnalyzerVersion == target {
			hasTarget = true
		} else if before == "" {
			before = versions[i].AnalyzerVersion
		}
	}
	if !hasTarget {
		// The target is not among the versions Silver holds (an explicit
		// ?version= nobody has run yet): nothing to put on the "after" side.
		return reprocessCompare{Available: false, Reason: "single-version", AfterVersion: target,
			Rows: []compareRow{}}
	}

	beforeShares, beforeUnanalyzed := mentionShares(silver, before)
	afterShares, afterUnanalyzed := mentionShares(silver, target)
	subjects := map[string]bool{}
	for s := range beforeShares {
		subjects[s] = true
	}
	for s := range afterShares {
		subjects[s] = true
	}
	rows := make([]compareRow, 0, len(subjects))
	for s := range subjects {
		b, a := beforeShares[s], afterShares[s]
		rows = append(rows, compareRow{Subject: s, BeforeShare: b, AfterShare: a, Delta: a - b})
	}
	sort.Slice(rows, func(i, j int) bool {
		di, dj := math.Abs(rows[i].Delta), math.Abs(rows[j].Delta)
		if di != dj {
			return di > dj
		}
		return rows[i].Subject < rows[j].Subject
	})
	return reprocessCompare{
		Available:       true,
		BeforeVersion:   before,
		AfterVersion:    target,
		Rows:            rows,
		UnanalyzedShare: compareShare{Before: beforeUnanalyzed, After: afterUnanalyzed},
	}
}

// mentionShares returns, for one version, each subject's share of all subject
// mentions that version produced, plus the fraction of its records it did not
// classify. Records are counted once per version even if Silver holds the same
// record twice at that version.
func mentionShares(silver []gen.Analysis, version string) (map[string]float64, float64) {
	mentions := map[string]int{}
	total, records, unanalyzed := 0, 0, 0
	seen := map[string]bool{}
	for _, a := range silver {
		if a.AnalyzerVersion != version || seen[a.RecordID] {
			continue
		}
		seen[a.RecordID] = true
		records++
		if a.AnalysisStatus != gen.AnalysisStatusAnalyzed {
			unanalyzed++
		}
		for _, s := range a.NarrativeSubjects {
			mentions[s]++
			total++
		}
	}
	shares := make(map[string]float64, len(mentions))
	for s, n := range mentions {
		shares[s] = float64(n) / float64(total)
	}
	if records == 0 {
		return shares, 0
	}
	return shares, float64(unanalyzed) / float64(records)
}
