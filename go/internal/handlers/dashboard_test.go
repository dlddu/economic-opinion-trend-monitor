package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// writeDailyGold lays down three KR days, a US axis whose collection stopped a
// day early, an hour rollup that must not leak into a day read, and the windows
// Gold aggregated over the same lake.
//
// The ranking reads the windows, so 기준금리 shows .40, not its 06-23 bucket's .45.
// 삼성 has the most raw mentions in the window but ranks third on share — the case
// the rank-shift note is for.
func writeDailyGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	write := func(file string, rows ...string) {
		if err := os.WriteFile(filepath.Join(gold, file), []byte(strings.Join(rows, "\n")+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("subject_trend.jsonl",
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-21","raw_count":4,"normalized_share":0.4,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-21","raw_count":6,"normalized_share":0.6,"delta":0,"spark":[]}`,
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":5,"normalized_share":0.5,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":5,"normalized_share":0.5,"delta":0,"spark":[]}`,
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":5,"normalized_share":0.45,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":9,"normalized_share":0.2,"delta":0,"spark":[]}`,
		`{"subject":"반도체","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":3,"normalized_share":0.35,"delta":0,"spark":[]}`,
		`{"subject":"미국 대상","axis":"US","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":3,"normalized_share":1,"delta":0,"spark":[]}`,
		`{"subject":"시간 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":99,"normalized_share":0.99,"delta":0,"spark":[]}`,
	)
	write("axis_sentiment.jsonl",
		`{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","distribution":{"positive":0.5,"neutral":0.5,"negative":0,"mixed":0,"unanalyzed":0.2},"analyzed_total":80}`,
		`{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","distribution":{"positive":0.5,"neutral":0.5,"negative":0,"mixed":0,"unanalyzed":0.1},"analyzed_total":90}`,
		`{"axis":"US","bucket_unit":"day","time_bucket":"2026-06-22","distribution":{"positive":1,"neutral":0,"negative":0,"mixed":0,"unanalyzed":0},"analyzed_total":3}`,
	)
	const cur7, prev7, cur24 = `"window_start":"2026-06-16T15","window_end":"2026-06-23T14"`,
		`"window_start":"2026-06-09T15","window_end":"2026-06-16T14"`,
		`"window_start":"2026-06-22T15","window_end":"2026-06-23T14"`
	write("subject_window.jsonl",
		`{"subject":"기준금리","axis":"KR","range":"7d","period":"current",`+cur7+`,"raw_count":9,"normalized_share":0.4}`,
		`{"subject":"반도체","axis":"KR","range":"7d","period":"current",`+cur7+`,"raw_count":3,"normalized_share":0.35}`,
		`{"subject":"삼성","axis":"KR","range":"7d","period":"current",`+cur7+`,"raw_count":20,"normalized_share":0.25}`,
		`{"subject":"기준금리","axis":"KR","range":"7d","period":"previous",`+prev7+`,"raw_count":5,"normalized_share":0.5}`,
		`{"subject":"삼성","axis":"KR","range":"7d","period":"previous",`+prev7+`,"raw_count":5,"normalized_share":0.5}`,
		`{"subject":"기준금리","axis":"KR","range":"24h","period":"current",`+cur24+`,"raw_count":3,"normalized_share":0.6}`,
		`{"subject":"삼성","axis":"KR","range":"24h","period":"current",`+cur24+`,"raw_count":2,"normalized_share":0.4}`,
		`{"subject":"미국 대상","axis":"US","range":"7d","period":"current",`+cur7+`,"raw_count":3,"normalized_share":1}`,
	)
	write("axis_window.jsonl",
		`{"axis":"KR","range":"7d","period":"current",`+cur7+`,"collected":100,"analyzed_total":90}`,
		`{"axis":"KR","range":"7d","period":"previous",`+prev7+`,"collected":80,"analyzed_total":70}`,
		`{"axis":"KR","range":"24h","period":"current",`+cur24+`,"collected":5,"analyzed_total":5}`,
		`{"axis":"US","range":"7d","period":"current",`+cur7+`,"collected":3,"analyzed_total":3}`,
	)
}

func getDashboard(t *testing.T, dir, query string) dashboardResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/dashboard" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var d dashboardResponse
	if err := json.NewDecoder(resp.Body).Decode(&d); err != nil {
		t.Fatal(err)
	}
	return d
}

func TestDashboardDefaultsToSevenDaysByDay(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=KR")

	if d.Basis.Range != "7d" || d.Basis.Unit != "day" || !d.Normalized {
		t.Fatalf("basis = %+v", d.Basis)
	}
	if d.Basis.WindowStart != "2026-06-16T15" || d.Basis.WindowEnd != "2026-06-23T14" || !d.Basis.HasBaseline {
		t.Errorf("window/baseline wrong: %+v", d.Basis)
	}
	if got := strings.Join(d.Basis.Buckets, ","); d.Basis.Bucket != "2026-06-23" || got != "2026-06-21,2026-06-22,2026-06-23" {
		t.Errorf("sparkline buckets = %s (anchor %s)", got, d.Basis.Bucket)
	}
}

// The ranking is the whole window's, as Gold aggregated it — not the latest bucket's (기준금리
// .45), and never a flat mix of every bucket (the hour row's .99, 06-21's 삼성 .6).
func TestDashboardRanksTheRangeWindow(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=KR")

	var names []string
	for _, r := range d.TopSubjects {
		names = append(names, r.Subject)
	}
	if got := strings.Join(names, ","); got != "기준금리,반도체,삼성" {
		t.Fatalf("ranking = %s", got)
	}
	if d.TopSubjects[0].NormalizedShare != 0.4 {
		t.Errorf("기준금리 share = %v, want the window's 0.4", d.TopSubjects[0].NormalizedShare)
	}
	samsung := d.TopSubjects[2]
	if samsung.Rank != 3 || samsung.RawRank != 1 || samsung.RawCount != 20 {
		t.Errorf("raw rank should be carried beside the share rank: %+v", samsung)
	}
}

func TestDashboardDrawsTheUnitSparkAndDeltaAgainstThePreviousWindow(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=KR")

	byName := map[string]dashRow{}
	for _, r := range d.TopSubjects {
		byName[r.Subject] = r
	}
	rate := byName["기준금리"]
	if len(rate.Spark) != 3 || rate.Spark[0] != 0.4 || rate.Spark[2] != 0.45 {
		t.Errorf("spark = %v", rate.Spark)
	}
	if rate.Delta != -10 || rate.IsNew {
		t.Errorf("기준금리 delta = %v new=%v, want -10%%p and not new", rate.Delta, rate.IsNew)
	}
	chip := byName["반도체"]
	// Absent on days the axis collected: a zero reading, not a gap.
	if len(chip.Spark) != 3 || chip.Spark[0] != 0 || chip.Spark[1] != 0 {
		t.Errorf("반도체 spark = %v", chip.Spark)
	}
	if !chip.IsNew || chip.Delta != 35 {
		t.Errorf("반도체 should enter new at +35%%p: %+v", chip)
	}
}

func TestDashboardSummaryCountsTheWindow(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=KR")

	s := d.Summary
	if s == nil || s.Collected == nil || s.CollectedPrev == nil {
		t.Fatalf("summary = %+v", s)
	}
	if *s.Collected != 100 || *s.CollectedPrev != 80 || s.Analyzed != 90 {
		t.Errorf("counts = %d/%d/%d, want 100/80/90", *s.Collected, *s.CollectedPrev, s.Analyzed)
	}
	if s.Coverage != 0.9 || s.LowConfidence != 0.1 {
		t.Errorf("coverage/low = %v/%v", s.Coverage, s.LowConfidence)
	}
}

// US collected up to 06-22 while KR reached 06-23: the axis missed the latest
// collection, which is not the same as nothing being of interest.
func TestDashboardMarksAnAxisThatMissedTheLatestCollection(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=US")

	if !d.Basis.EmptyWindow || d.Basis.LastBucket != "2026-06-22" || d.Basis.Bucket != "2026-06-23" {
		t.Fatalf("basis = %+v", d.Basis)
	}
	if len(d.TopSubjects) != 0 || d.Summary != nil {
		t.Errorf("an empty window draws nothing: %+v / %+v", d.TopSubjects, d.Summary)
	}
}

func TestDashboardHonoursTheRequestedUnitAndRange(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)

	d := getDashboard(t, dir, "?axis=KR&unit=hour&range=24h")
	if d.Basis.Unit != "hour" || d.Basis.Bucket != "2026-06-23T14" || d.Basis.HasBaseline {
		t.Fatalf("24h basis = %+v", d.Basis)
	}
	if len(d.TopSubjects) != 2 || d.TopSubjects[0].NormalizedShare != 0.6 || d.TopSubjects[0].Delta != 0 ||
		d.TopSubjects[0].IsNew {
		t.Errorf("24h rows = %+v", d.TopSubjects)
	}

	d = getDashboard(t, dir, "?axis=KR&unit=bogus&range=bogus")
	if d.Basis.Unit != "day" || d.Basis.Range != "7d" {
		t.Errorf("unknown params should fall back to the defaults: %+v", d.Basis)
	}
}

// A unit as long as the range would draw it as one point, so such a pair is read by the hour.
func TestDashboardTakesOnlyUnitsShorterThanTheRange(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	for query, want := range map[string]string{
		"?axis=KR&unit=day&range=24h":  "hour",
		"?axis=KR&unit=week&range=24h": "hour",
		"?axis=KR&unit=week&range=7d":  "hour",
		"?axis=KR&unit=week&range=30d": "week",
		"?axis=KR&unit=day&range=7d":   "day",
	} {
		if got := getDashboard(t, dir, query).Basis.Unit; got != want {
			t.Errorf("%s unit = %s, want %s", query, got, want)
		}
	}
}

// A lake aggregated before the windows existed has no ranking to show yet, not an error.
func TestDashboardWithoutWindowsRanksNothing(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	for _, f := range []string{"subject_window.jsonl", "axis_window.jsonl"} {
		if err := os.Remove(filepath.Join(dir, "gold", f)); err != nil {
			t.Fatal(err)
		}
	}
	d := getDashboard(t, dir, "?axis=KR")
	if len(d.TopSubjects) != 0 || d.Summary != nil || d.Basis.HasBaseline || d.Basis.EmptyWindow {
		t.Errorf("no windows = %+v / %+v / %+v", d.TopSubjects, d.Summary, d.Basis)
	}
}

func appendGold(t *testing.T, dir, file string, rows ...string) {
	t.Helper()
	f, err := os.OpenFile(filepath.Join(dir, "gold", file), os.O_APPEND|os.O_WRONLY, 0o644)
	if err != nil {
		t.Fatal(err)
	}
	defer f.Close()
	if _, err := f.WriteString(strings.Join(rows, "\n") + "\n"); err != nil {
		t.Fatal(err)
	}
}

// ALL is an axis of its own in Gold: the dashboard ranks and counts its rows, not a sum of the
// source axes' rows beside them.
func TestDashboardServesTheAllAxisFromItsOwnRows(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	appendGold(t, dir, "subject_trend.jsonl",
		`{"subject":"기준금리","axis":"ALL","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":5,"normalized_share":0.7,"delta":0,"spark":[]}`,
	)
	window := `"range":"7d","period":"current","window_start":"2026-06-16T15","window_end":"2026-06-23T14"`
	appendGold(t, dir, "subject_window.jsonl",
		`{"subject":"기준금리","axis":"ALL",`+window+`,"raw_count":12,"normalized_share":0.7}`,
		`{"subject":"반도체","axis":"ALL",`+window+`,"raw_count":3,"normalized_share":0.3}`,
	)
	appendGold(t, dir, "axis_window.jsonl", `{"axis":"ALL",`+window+`,"collected":124,"analyzed_total":93}`)
	d := getDashboard(t, dir, "?axis=ALL")

	if d.Axis != "ALL" || d.Basis.EmptyWindow || d.Basis.HasBaseline {
		t.Fatalf("axis/basis = %s %+v", d.Axis, d.Basis)
	}
	if len(d.TopSubjects) != 2 || d.TopSubjects[0].Subject != "기준금리" || d.TopSubjects[0].NormalizedShare != 0.7 {
		t.Fatalf("ALL rows = %+v", d.TopSubjects)
	}
	if d.Summary == nil || d.Summary.Analyzed != 93 || *d.Summary.Collected != 124 {
		t.Errorf("summary = %+v", d.Summary)
	}
}

// Fairness decomposes a value into its sources, which ALL has no rows of, so it keeps to the
// source axes.
func TestScreensWithoutAnAllAxisFallBackFromIt(t *testing.T) {
	if f := getFairness(t, t.TempDir(), "?axis=ALL"); f.Axis != "KR" {
		t.Errorf("fairness axis = %q, want the KR fallback", f.Axis)
	}
}

func TestBucketStartReadsEveryUnit(t *testing.T) {
	cases := []struct {
		label string
		unit  gen.BucketUnit
		want  string
	}{
		{"2026-06-23T14", gen.BucketUnitHour, "2026-06-23T14:00:00Z"},
		{"2026-06-23", gen.BucketUnitDay, "2026-06-23T00:00:00Z"},
		{"2026-W26", gen.BucketUnitWeek, "2026-06-22T00:00:00Z"},
		// ISO week 1 of 2027 opens in calendar 2027-01-04; of 2026, in 2025-12-29.
		{"2027-W01", gen.BucketUnitWeek, "2027-01-04T00:00:00Z"},
		{"2026-W01", gen.BucketUnitWeek, "2025-12-29T00:00:00Z"},
	}
	for _, c := range cases {
		got, err := bucketStart(c.label, c.unit)
		if err != nil || got.Format("2006-01-02T15:04:05Z07:00") != c.want {
			t.Errorf("bucketStart(%q) = %v, %v; want %s", c.label, got, err, c.want)
		}
	}
	if _, err := bucketStart("nope", gen.BucketUnitWeek); err == nil {
		t.Error("an unreadable week label should fail, not be guessed")
	}
}
