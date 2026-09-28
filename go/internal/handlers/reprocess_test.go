package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// The fixture clock. Every timestamp below is written relative to it so the
// range windows are exact and the test does not depend on the wall clock.
var reprocessNow = time.Date(2026, 9, 21, 12, 0, 0, 0, time.UTC)

func at(d time.Duration) string { return reprocessNow.Add(d).UTC().Format(time.RFC3339) }

func item(id, source, axis, cycle string, collected time.Duration) string {
	return `{"record_id":"` + id + `","source_id":"` + source + `","axis":"` + axis + `","rank":1,` +
		`"view_count":1,"title":"t","source_url":"https://ex.test/` + id + `","body_hash":"h",` +
		`"body_available":true,"collected_at":"` + at(collected) + `","collection_cycle":"` + cycle + `"}`
}

func analysis(id, version string, analyzed time.Duration, status string, subjects ...string) string {
	quoted := make([]string, len(subjects))
	for i, s := range subjects {
		quoted[i] = `"` + s + `"`
	}
	return `{"record_id":"` + id + `","source_url":"https://ex.test/` + id + `","target_countries":["KR"],` +
		`"narrative_subjects":[` + strings.Join(quoted, ",") + `],"sentiment":"neutral",` +
		`"analysis_status":"` + status + `","confidence":0.9,"analyzed_at":"` + at(analyzed) + `",` +
		`"analyzer_version":"` + version + `"}`
}

func getReprocess(t *testing.T, dir, query string) reprocessResponse {
	t.Helper()
	mux := http.NewServeMux()
	h := New(store.New(dir))
	h.now = func() time.Time { return reprocessNow }
	h.Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/reprocess" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var out reprocessResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	return out
}

// Three KR observations across two cycles plus a US one and a stale KR one.
// Silver holds v3 for two of the in-range KR records and nothing for the third.
func writeScopeLake(t *testing.T, dir string) {
	t.Helper()
	items := strings.Join([]string{
		item("k1", "kr-wire", "KR", "2026-09-21T10:00", -2*time.Hour),
		item("k2", "kr-daily", "KR", "2026-09-21T10:00", -2*time.Hour),
		item("k3", "kr-wire", "KR", "2026-09-21T11:00", -1*time.Hour),
		item("u1", "us-desk", "US", "2026-09-21T11:00", -1*time.Hour),
		item("old", "kr-wire", "KR", "2026-09-10T11:00", -11*24*time.Hour),
	}, "\n")
	analyses := strings.Join([]string{
		analysis("k1", "v3", -100*time.Minute, "analyzed", "기준금리"),
		analysis("k2", "v3", -90*time.Minute, "analyzed", "가계부채"),
		analysis("old", "v3", -11*24*time.Hour, "analyzed", "기준금리"),
	}, "\n")
	writeLineage(t, dir, items, "", analyses)
}

func TestReprocessSizesTheRangeByCycleAndTargetVersion(t *testing.T) {
	dir := t.TempDir()
	writeScopeLake(t, dir)

	rp := getReprocess(t, dir, "?range=7d&axis=KR")
	if rp.Scope.Range != "7d" || rp.Scope.Axis != "KR" || rp.Scope.Source != "" {
		t.Fatalf("scope echo wrong: %+v", rp.Scope)
	}
	// The stale KR record and the US record are outside the selection.
	if rp.Scope.Total != 3 || rp.Scope.Already != 2 || rp.Scope.Todo != 1 {
		t.Fatalf("total/already/todo = %d/%d/%d, want 3/2/1", rp.Scope.Total, rp.Scope.Already, rp.Scope.Todo)
	}
	if rp.TargetVersion != "v3" {
		t.Errorf("target version = %q, want the only Silver version", rp.TargetVersion)
	}
	if len(rp.Scope.Buckets) != 2 || rp.Scope.Buckets[0].Cycle != "2026-09-21T10:00" ||
		rp.Scope.Buckets[1].Cycle != "2026-09-21T11:00" {
		t.Fatalf("buckets not one-per-cycle in time order: %+v", rp.Scope.Buckets)
	}
	if b := rp.Scope.Buckets[0]; b.Kept != 2 || b.Done != 2 || b.Todo != 0 {
		t.Errorf("10:00 bucket = %+v, want kept 2 done 2 todo 0", b)
	}
	if b := rp.Scope.Buckets[1]; b.Kept != 1 || b.Done != 0 || b.Todo != 1 {
		t.Errorf("11:00 bucket = %+v, want kept 1 done 0 todo 1", b)
	}
	if len(rp.Scope.Sources) != 2 || rp.Scope.Sources[0].SourceID != "kr-daily" ||
		rp.Scope.Sources[1].SourceID != "kr-wire" || rp.Scope.Sources[1].Kept != 2 {
		t.Errorf("sources = %+v, want kr-daily(1), kr-wire(2)", rp.Scope.Sources)
	}
	if rp.Trigger.Available || rp.Trigger.Note == "" {
		t.Errorf("trigger must declare itself unavailable with a reason: %+v", rp.Trigger)
	}
}

func TestReprocessNarrowsBySourceAndRange(t *testing.T) {
	dir := t.TempDir()
	writeScopeLake(t, dir)

	bySource := getReprocess(t, dir, "?range=7d&axis=KR&source=kr-wire")
	if bySource.Scope.Total != 2 || bySource.Scope.Todo != 1 {
		t.Errorf("kr-wire: total/todo = %d/%d, want 2/1", bySource.Scope.Total, bySource.Scope.Todo)
	}
	// The source list is the axis's, not the filter's — the screen still has to
	// offer the other source.
	if len(bySource.Scope.Sources) != 2 {
		t.Errorf("sources shrank with the filter: %+v", bySource.Scope.Sources)
	}

	wide := getReprocess(t, dir, "?range=30d&axis=KR")
	if wide.Scope.Total != 4 {
		t.Errorf("30d should take the 11-day-old record in: total = %d", wide.Scope.Total)
	}

	none := getReprocess(t, dir, "?range=24h&axis=KR&source=us-desk")
	if none.Scope.Total != 0 || len(none.Scope.Buckets) != 0 {
		t.Errorf("a source the axis lacks must give an empty scope: %+v", none.Scope)
	}
}

// An unknown range key falls back rather than erroring, and the fallback is
// named in the response so the screen shows what was actually measured.
func TestReprocessNamesItsRangeFallbackAndSurvivesEmptyLake(t *testing.T) {
	rp := getReprocess(t, t.TempDir(), "?range=forever")
	if rp.Scope.Range != defaultReprocessRange {
		t.Errorf("range = %q, want fallback %q", rp.Scope.Range, defaultReprocessRange)
	}
	if rp.Scope.Total != 0 || rp.TargetVersion != "" || len(rp.Versions) != 0 {
		t.Errorf("empty lake should read as empty scope: %+v", rp)
	}
	if rp.Compare.Available || rp.Compare.Reason != "no-silver" {
		t.Errorf("compare on an empty lake = %+v, want unavailable/no-silver", rp.Compare)
	}
	if rp.Scope.EtaMinutes != nil || rp.Scope.ThroughputPerMinute != nil {
		t.Errorf("no observation, no estimate: %+v", rp.Scope)
	}
	if rp.Scope.Buckets == nil || rp.Scope.Sources == nil || rp.Compare.Rows == nil {
		t.Errorf("lists must serialize as [] not null: %+v", rp)
	}
}

// With one version there is nothing to compare against, and the response says
// so — the screen must not draw a before/after table out of one column.
func TestReprocessRefusesToCompareASingleVersion(t *testing.T) {
	dir := t.TempDir()
	writeScopeLake(t, dir)

	rp := getReprocess(t, dir, "?range=7d&axis=KR")
	if rp.Compare.Available || rp.Compare.Reason != "single-version" || rp.Compare.AfterVersion != "v3" {
		t.Errorf("compare = %+v, want unavailable/single-version on v3", rp.Compare)
	}
	if len(rp.Versions) != 1 || rp.Versions[0].AnalyzerVersion != "v3" || rp.Versions[0].Records != 2 {
		t.Errorf("versions = %+v, want v3 with the 2 in-range records", rp.Versions)
	}
	// Two v3 records ten minutes apart: 0.2 records/min, one record left -> 5 min.
	if rp.Scope.ThroughputPerMinute == nil || math.Abs(*rp.Scope.ThroughputPerMinute-0.2) > 1e-9 {
		t.Errorf("throughput = %v, want 0.2/min", rp.Scope.ThroughputPerMinute)
	}
	if rp.Scope.EtaMinutes == nil || *rp.Scope.EtaMinutes != 5 {
		t.Errorf("eta = %v, want 5 minutes", rp.Scope.EtaMinutes)
	}
}

// Two versions in Silver: the newest is "after", the other "before", rows are
// the union of subjects ordered by the size of the movement, and the share each
// version left unclassified is reported apart.
func TestReprocessComparesTwoCoexistingVersions(t *testing.T) {
	dir := t.TempDir()
	items := strings.Join([]string{
		item("k1", "kr-wire", "KR", "2026-09-21T10:00", -2*time.Hour),
		item("k2", "kr-wire", "KR", "2026-09-21T10:00", -2*time.Hour),
		item("k3", "kr-wire", "KR", "2026-09-21T10:00", -2*time.Hour),
		item("k4", "kr-wire", "KR", "2026-09-21T10:00", -2*time.Hour),
	}, "\n")
	analyses := strings.Join([]string{
		// v2: 기준금리 x3, 가계부채 x1 -> 75% / 25%; nothing unanalyzed.
		analysis("k1", "v2", -100*time.Minute, "analyzed", "기준금리"),
		analysis("k2", "v2", -99*time.Minute, "analyzed", "기준금리"),
		analysis("k3", "v2", -98*time.Minute, "analyzed", "기준금리"),
		analysis("k4", "v2", -97*time.Minute, "analyzed", "가계부채"),
		// v3: 기준금리 x1, 가계부채 x2, 반도체 x1 -> 25% / 50% / 25%; one of four
		// records unanalyzed (it still counts, with no subjects).
		analysis("k1", "v3", -50*time.Minute, "analyzed", "기준금리"),
		analysis("k2", "v3", -49*time.Minute, "analyzed", "가계부채"),
		analysis("k3", "v3", -48*time.Minute, "analyzed", "가계부채", "반도체"),
		analysis("k4", "v3", -47*time.Minute, "unanalyzed"),
	}, "\n")
	writeLineage(t, dir, items, "", analyses)

	rp := getReprocess(t, dir, "?range=7d&axis=KR")
	if rp.TargetVersion != "v3" {
		t.Fatalf("target = %q, want the newest version v3", rp.TargetVersion)
	}
	// Every record already carries v3, so nothing is left to reprocess.
	if rp.Scope.Already != 4 || rp.Scope.Todo != 0 {
		t.Errorf("already/todo = %d/%d, want 4/0", rp.Scope.Already, rp.Scope.Todo)
	}
	c := rp.Compare
	if !c.Available || c.BeforeVersion != "v2" || c.AfterVersion != "v3" || c.Reason != "" {
		t.Fatalf("compare = %+v, want available v2 -> v3", c)
	}
	want := []struct {
		subject       string
		before, after float64
	}{
		{"기준금리", 0.75, 0.25},
		{"가계부채", 0.25, 0.5},
		{"반도체", 0, 0.25},
	}
	if len(c.Rows) != len(want) {
		t.Fatalf("rows = %+v, want %d", c.Rows, len(want))
	}
	for i, w := range want {
		r := c.Rows[i]
		if r.Subject != w.subject || math.Abs(r.BeforeShare-w.before) > 1e-9 ||
			math.Abs(r.AfterShare-w.after) > 1e-9 || math.Abs(r.Delta-(w.after-w.before)) > 1e-9 {
			t.Errorf("row %d = %+v, want %+v", i, r, w)
		}
	}
	if c.UnanalyzedShare.Before != 0 || math.Abs(c.UnanalyzedShare.After-0.25) > 1e-9 {
		t.Errorf("unanalyzed share = %+v, want 0 -> 0.25", c.UnanalyzedShare)
	}
	if len(rp.Versions) != 2 || rp.Versions[0].AnalyzerVersion != "v2" || rp.Versions[1].AnalyzerVersion != "v3" {
		t.Errorf("versions = %+v, want v2 then v3 by last_analyzed_at", rp.Versions)
	}

	// An explicit ?version= is the "after" side even when it is the older one,
	// and "already" counts what carries that version: all four records do.
	older := getReprocess(t, dir, "?range=7d&axis=KR&version=v2")
	if older.Compare.BeforeVersion != "v3" || older.Compare.AfterVersion != "v2" {
		t.Errorf("explicit version must be the after side: %+v", older.Compare)
	}
	if older.Scope.Already != 4 {
		t.Errorf("already at v2 = %d, want 4", older.Scope.Already)
	}

	// A version nobody has run yet has no after side to draw.
	unseen := getReprocess(t, dir, "?range=7d&axis=KR&version=v9")
	if unseen.Compare.Available || unseen.Compare.Reason != "single-version" || unseen.Scope.Todo != 4 {
		t.Errorf("unseen target: compare = %+v todo = %d, want unavailable / 4", unseen.Compare, unseen.Scope.Todo)
	}
}

// A version that files articles under categories is compared on its categories —
// what Gold will count once it is published — and one without them on its subjects.
func TestMentionSharesCountsCategoriesWhenAVersionHasThem(t *testing.T) {
	categories := []string{"반도체", "기업 경영·실적"}
	silver := []gen.Analysis{
		{RecordID: "k1", AnalyzerVersion: "v2", AnalysisStatus: gen.AnalysisStatusAnalyzed, NarrativeSubjects: []string{"삼성전자"}},
		{RecordID: "k1", AnalyzerVersion: "v3", AnalysisStatus: gen.AnalysisStatusAnalyzed, NarrativeSubjects: []string{"삼성전자"}, SubjectCategories: &categories},
	}

	before, _ := mentionShares(silver, "v2")
	if len(before) != 1 || before["삼성전자"] != 1 {
		t.Errorf("v2 shares = %v, want 삼성전자 alone", before)
	}
	after, _ := mentionShares(silver, "v3")
	if len(after) != 2 || after["반도체"] != 0.5 || after["기업 경영·실적"] != 0.5 {
		t.Errorf("v3 shares = %v, want its two categories at half each", after)
	}
}
