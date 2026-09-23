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
// day early, and an hour rollup that must not leak into a day read.
//
//	06-21  기준금리 .40  삼성 .60
//	06-22  기준금리 .50  삼성 .50            (반도체 absent: axis collected, subject not)
//	06-23  기준금리 .45  삼성 .20  반도체 .35
//
// 삼성 has the most raw mentions on 06-23 but ranks third on share — the case
// the rank-shift note is for.
func writeDailyGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	rows := []string{
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-21","raw_count":4,"normalized_share":0.4,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-21","raw_count":6,"normalized_share":0.6,"delta":0,"spark":[]}`,
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":5,"normalized_share":0.5,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":5,"normalized_share":0.5,"delta":0,"spark":[]}`,
		`{"subject":"기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":5,"normalized_share":0.45,"delta":0,"spark":[]}`,
		`{"subject":"삼성","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":9,"normalized_share":0.2,"delta":0,"spark":[]}`,
		`{"subject":"반도체","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":3,"normalized_share":0.35,"delta":0,"spark":[]}`,
		`{"subject":"미국 대상","axis":"US","bucket_unit":"day","time_bucket":"2026-06-22","raw_count":3,"normalized_share":1,"delta":0,"spark":[]}`,
		`{"subject":"시간 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":99,"normalized_share":0.99,"delta":0,"spark":[]}`,
	}
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(strings.Join(rows, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sent := []string{
		`{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-22","distribution":{"positive":0.5,"neutral":0.5,"negative":0,"mixed":0,"unanalyzed":0.2},"analyzed_total":80}`,
		`{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","distribution":{"positive":0.5,"neutral":0.5,"negative":0,"mixed":0,"unanalyzed":0.1},"analyzed_total":90}`,
		`{"axis":"US","bucket_unit":"day","time_bucket":"2026-06-22","distribution":{"positive":1,"neutral":0,"negative":0,"mixed":0,"unanalyzed":0},"analyzed_total":3}`,
	}
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(strings.Join(sent, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
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
	if d.Basis.Bucket != "2026-06-23" || d.Basis.PreviousBucket != "2026-06-22" || !d.Basis.HasBaseline {
		t.Errorf("anchor/previous wrong: %+v", d.Basis)
	}
	if got := strings.Join(d.Basis.Buckets, ","); got != "2026-06-21,2026-06-22,2026-06-23" {
		t.Errorf("window = %s", got)
	}
}

// The ranking is the latest bucket's, never a flat mix of every bucket — the
// hour row (0.99) and 06-21's 삼성 (0.6) would otherwise outrank today's leader.
func TestDashboardRanksTheLatestBucketOnly(t *testing.T) {
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
	samsung := d.TopSubjects[2]
	if samsung.Rank != 3 || samsung.RawRank != 1 || samsung.RawCount != 9 {
		t.Errorf("raw rank should be carried beside the share rank: %+v", samsung)
	}
}

func TestDashboardDrawsTheWindowAndDeltaAgainstThePreviousBucket(t *testing.T) {
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
	if rate.Delta != -5 || rate.IsNew {
		t.Errorf("기준금리 delta = %v new=%v, want -5%%p and not new", rate.Delta, rate.IsNew)
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

func TestDashboardSummaryComesFromTheSentimentRow(t *testing.T) {
	dir := t.TempDir()
	writeDailyGold(t, dir)
	d := getDashboard(t, dir, "?axis=KR")

	s := d.Summary
	if s == nil || s.Collected == nil || s.CollectedPrev == nil {
		t.Fatalf("summary = %+v", s)
	}
	if *s.Collected != 100 || *s.CollectedPrev != 100 || s.Analyzed != 90 {
		t.Errorf("counts = %d/%d/%d, want 100/100/90", *s.Collected, *s.CollectedPrev, s.Analyzed)
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
		t.Fatalf("hour basis = %+v", d.Basis)
	}
	if len(d.TopSubjects) != 1 || d.TopSubjects[0].Subject != "시간 대상" || d.TopSubjects[0].Delta != 0 {
		t.Errorf("hour rows = %+v", d.TopSubjects)
	}

	d = getDashboard(t, dir, "?axis=KR&range=24h")
	if got := strings.Join(d.Basis.Buckets, ","); got != "2026-06-23" || d.Basis.HasBaseline {
		t.Errorf("24h by day keeps only the anchor day: %s (baseline %v)", got, d.Basis.HasBaseline)
	}

	d = getDashboard(t, dir, "?axis=KR&unit=bogus&range=bogus")
	if d.Basis.Unit != "day" || d.Basis.Range != "7d" {
		t.Errorf("unknown params should fall back to the defaults: %+v", d.Basis)
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
