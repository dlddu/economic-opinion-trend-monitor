package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"math"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

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

// reprocess sizes a reprocessing run over a window of one axis's observations. The window can
// hold most of the lake, so the index counts it and only per-version and per-cycle totals come back.
func (h *Handlers) reprocess(w http.ResponseWriter, r *http.Request, db *sql.DB) error {
	q := r.URL.Query()
	rangeKey := q.Get("range")
	window, ok := reprocessRanges[rangeKey]
	if !ok {
		rangeKey, window = defaultReprocessRange, reprocessRanges[defaultReprocessRange]
	}
	axis := axisParam(r, "KR")
	source := q.Get("source")
	since := h.now().Add(-window)
	ctx := r.Context()
	clock := clockOf(r)

	win := newWindow(axis, source, since)
	clock.enter("sources")
	sources, err := windowSources(ctx, db, win)
	if err != nil {
		return err
	}
	clock.enter("versions")
	versions, err := windowVersions(ctx, db, win)
	if err != nil {
		return err
	}
	target := q.Get("version")
	if target == "" && len(versions) > 0 {
		target = versions[len(versions)-1].AnalyzerVersion
	}
	clock.enter("buckets")
	buckets, err := scopeBuckets(ctx, db, win, target)
	if err != nil {
		return err
	}

	scope := reprocessScope{
		Range:   rangeKey,
		Since:   since.UTC().Format(time.RFC3339),
		Axis:    axis,
		Source:  source,
		Sources: sources,
		Buckets: buckets,
	}
	for _, b := range scope.Buckets {
		scope.Total += b.Kept
		scope.Already += b.Done
		scope.Todo += b.Todo
	}
	clock.enter("throughput")
	scope.ThroughputPerMinute, scope.EtaMinutes, err = throughput(ctx, db, win, target, scope.Todo)
	if err != nil {
		return err
	}
	clock.enter("compare")
	compare, err := compareVersions(ctx, db, win, versions, target)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, reprocessResponse{
		Scope:         scope,
		TargetVersion: target,
		Versions:      versions,
		Compare:       compare,
		Trigger:       h.reprocessTrigger(r),
	})
	return nil
}

// window is the observations a reprocessing run would cover: one axis's, collected at or after
// since (as time.Parse reads collected_at — one it cannot read is left out rather than guessed
// in), narrowed to one source when one is given. Sources lists the axis's sources whatever the
// source filter says: the screen needs them all to offer a choice.
type window struct {
	axis, source string
	since        time.Time
}

func newWindow(axis, source string, since time.Time) window {
	return window{axis: axis, source: source, since: since}
}

// inAxis matches the axis's observations in the window. A date three days before since's bounds
// the index walk: time.Parse takes offsets up to 24:60, so a timestamp at or after since carries a
// date at most two days earlier.
func (w window) inAxis() (string, []any) {
	return `n.axis = ? AND n.collected_at >= ? AND rfc3339_at_or_after(n.collected_at, ?)`,
		[]any{w.axis, w.since.UTC().AddDate(0, 0, -3).Format("2006-01-02"), w.since.Format(time.RFC3339Nano)}
}

// scoped also applies the source filter.
func (w window) scoped() (string, []any) {
	where, args := w.inAxis()
	if w.source != "" {
		where += " AND n.source_id = ?"
		args = append(args, w.source)
	}
	return where, args
}

func windowSources(ctx context.Context, db *sql.DB, w window) ([]sourceRow, error) {
	where, args := w.inAxis()
	rs, err := db.QueryContext(ctx, `SELECT n.source_id, count(*) FROM news_item AS n WHERE `+where+
		` GROUP BY n.source_id ORDER BY n.source_id`, args...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	out := []sourceRow{}
	for rs.Next() {
		var row sourceRow
		if err := rs.Scan(&row.SourceID, &row.Kept); err != nil {
			return nil, err
		}
		out = append(out, row)
	}
	return out, rs.Err()
}

// windowRecords selects the analysis rows of the window's records: every row of every scoped
// record, once each, however many times the record was observed.
func windowRecords(w window) (string, []any) {
	where, args := w.scoped()
	return `a.record_id IN (SELECT n.record_id FROM news_item AS n WHERE ` + where + `)`, args
}

// windowVersions lists the analyzer versions the window's analyses carry, oldest last-analyzed
// first. The newest by last_analyzed_at is the default target: it is the version the pipeline is
// stamping right now.
func windowVersions(ctx context.Context, db *sql.DB, w window) ([]versionRow, error) {
	where, args := windowRecords(w)
	rs, err := db.QueryContext(ctx, `SELECT a.analyzer_version, count(*), min(a.analyzed_at), max(a.analyzed_at)
		FROM analysis AS a WHERE `+where+` GROUP BY a.analyzer_version
		ORDER BY max(a.analyzed_at), a.analyzer_version`, args...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	out := []versionRow{}
	for rs.Next() {
		var v versionRow
		if err := rs.Scan(&v.AnalyzerVersion, &v.Records, &v.FirstAnalyzedAt, &v.LastAnalyzedAt); err != nil {
			return nil, err
		}
		out = append(out, v)
	}
	return out, rs.Err()
}

// scopeBuckets groups the scoped observations by collection cycle and marks, per cycle, how many
// belong to a record Silver already carries at the target version. "Done" counts records needing
// no reprocessing, not Silver rows: a record analyzed twice at the same version is still done once.
func scopeBuckets(ctx context.Context, db *sql.DB, w window, target string) ([]scopeBucket, error) {
	where, args := w.scoped()
	done, doneArgs := "0", []any{}
	if target != "" {
		done = `EXISTS (SELECT 1 FROM analysis AS a WHERE a.record_id = n.record_id AND a.analyzer_version = ?)`
		doneArgs = append(doneArgs, target)
	}
	// Cycle keys share one unit ("2026-09-21T09:00"), so lexical order is time order.
	rs, err := db.QueryContext(ctx, `SELECT n.collection_cycle, count(*), sum(`+done+`) FROM news_item AS n
		WHERE `+where+` GROUP BY n.collection_cycle ORDER BY n.collection_cycle`, append(doneArgs, args...)...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	out := []scopeBucket{}
	for rs.Next() {
		var b scopeBucket
		if err := rs.Scan(&b.Cycle, &b.Kept, &b.Done); err != nil {
			return nil, err
		}
		b.Todo = b.Kept - b.Done
		out = append(out, b)
	}
	return out, rs.Err()
}

// tallyMentions feeds the window's analyses at each tallied version, each record's in lake order,
// reading only what a tally counts. Records come in id order: walking the record index needs no
// sort of the whole window.
func tallyMentions(ctx context.Context, db *sql.DB, w window, tally map[string]*mentionTally) error {
	where, args := windowRecords(w)
	marks := make([]string, 0, len(tally))
	for v := range tally {
		marks = append(marks, "?")
		args = append(args, v)
	}
	rs, err := db.QueryContext(ctx, `SELECT a.record_id, a.analyzer_version, a.analysis_status,
		a.narrative_subjects, a.subject_categories FROM analysis AS a
		WHERE `+where+` AND a.analyzer_version IN (`+strings.Join(marks, ",")+`) ORDER BY a.record_id, a.seq`, args...)
	if err != nil {
		return err
	}
	defer rs.Close()
	for rs.Next() {
		var a gen.Analysis
		var subjects string
		var categories sql.NullString
		if err := rs.Scan(&a.RecordID, &a.AnalyzerVersion, &a.AnalysisStatus, &subjects, &categories); err != nil {
			return err
		}
		if err := json.Unmarshal([]byte(subjects), &a.NarrativeSubjects); err != nil {
			return err
		}
		if categories.Valid {
			var c []string
			if err := json.Unmarshal([]byte(categories.String), &c); err != nil {
				return err
			}
			a.SubjectCategories = &c
		}
		tally[a.AnalyzerVersion].add(a)
	}
	return rs.Err()
}

// throughput reads the rate the target version was produced at, from the analyzed_at spread of
// its records in the window, and turns the remaining count into an estimate. Both are nil unless
// at least two records span a positive interval.
func throughput(ctx context.Context, db *sql.DB, w window, target string, todo int) (*float64, *float64, error) {
	where, args := windowRecords(w)
	rs, err := db.QueryContext(ctx, `SELECT a.analyzed_at FROM analysis AS a WHERE `+where+
		` AND a.analyzer_version = ?`, append(args, target)...)
	if err != nil {
		return nil, nil, err
	}
	defer rs.Close()
	var first, last time.Time
	n := 0
	for rs.Next() {
		var analyzedAt string
		if err := rs.Scan(&analyzedAt); err != nil {
			return nil, nil, err
		}
		at, err := time.Parse(time.RFC3339, analyzedAt)
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
	if err := rs.Err(); err != nil {
		return nil, nil, err
	}
	span := last.Sub(first).Minutes()
	if n < 2 || span <= 0 {
		return nil, nil, nil
	}
	perMinute := float64(n) / span
	eta := math.Ceil(float64(todo) / perMinute)
	return &perMinute, &eta, nil
}

// compareVersions puts the newest two versions side by side: "after" is the
// target version and "before" the newest other one.
func compareVersions(ctx context.Context, db *sql.DB, w window, versions []versionRow, target string) (reprocessCompare, error) {
	if len(versions) == 0 {
		return reprocessCompare{Available: false, Reason: "no-silver", Rows: []compareRow{}}, nil
	}
	if len(versions) < 2 {
		return reprocessCompare{Available: false, Reason: "single-version", AfterVersion: target,
			Rows: []compareRow{}}, nil
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
			Rows: []compareRow{}}, nil
	}

	tally := map[string]*mentionTally{before: newMentionTally(), target: newMentionTally()}
	if err := tallyMentions(ctx, db, w, tally); err != nil {
		return reprocessCompare{}, err
	}
	beforeShares, beforeUnanalyzed := tally[before].shares()
	afterShares, afterUnanalyzed := tally[target].shares()
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
	}, nil
}

// mentionTally counts, for one version, each grouping key's mentions (the keys Gold would count,
// see groupingKeys) and how many of its records it did not classify. Records are counted once per
// version even if Silver holds the same record twice at that version.
type mentionTally struct {
	mentions                   map[string]int
	total, records, unanalyzed int
	seen                       map[string]bool
}

func newMentionTally() *mentionTally {
	return &mentionTally{mentions: map[string]int{}, seen: map[string]bool{}}
}

func (t *mentionTally) add(a gen.Analysis) {
	if t.seen[a.RecordID] {
		return
	}
	t.seen[a.RecordID] = true
	t.records++
	if a.AnalysisStatus != gen.AnalysisStatusAnalyzed {
		t.unanalyzed++
	}
	for _, s := range groupingKeys(a) {
		t.mentions[s]++
		t.total++
	}
}

// shares is each key's share of all the version's mentions, and its unclassified fraction.
func (t *mentionTally) shares() (map[string]float64, float64) {
	shares := make(map[string]float64, len(t.mentions))
	for s, n := range t.mentions {
		shares[s] = float64(n) / float64(t.total)
	}
	if t.records == 0 {
		return shares, 0
	}
	return shares, float64(t.unanalyzed) / float64(t.records)
}
