package handlers

import (
	"encoding/json"
	"fmt"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func trendRow(subject, axis, unit, bucket string, raw int, share float64) string {
	return fmt.Sprintf(`{"subject":%q,"axis":%q,"bucket_unit":%q,"time_bucket":%q,"raw_count":%d,`+
		`"normalized_share":%g,"delta":0,"spark":[]}`, subject, axis, unit, bucket, raw, share)
}

func writeTrendRows(t *testing.T, dir string, rows []string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(strings.Join(rows, "\n")+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

// writeSpikeGold: KR days 06-16..06-22 are the 7-day baseline of 06-23, and 06-01 joins it only
// at 30 days.
//
//	환율    10/.10 every baseline day  -> 30/.30   raw ×3, share ×3          spike
//	금리    20/.20 every baseline day  -> 40/.20   raw ×2, share ×1          spike, normalized away
//	주택    14/.14 on 06-16..06-19 only -> 8/.08   absent days count as 0: ×1
//	반도체  none                        -> 5/.05   new, no multiple
//	환율    80/.80 on 06-01
func writeSpikeGold(t *testing.T, dir string) {
	t.Helper()
	rows := []string{trendRow("환율", "KR", "day", "2026-06-01", 80, 0.8)}
	for d := 16; d <= 22; d++ {
		b := fmt.Sprintf("2026-06-%02d", d)
		rows = append(rows, trendRow("환율", "KR", "day", b, 10, 0.1), trendRow("금리", "KR", "day", b, 20, 0.2))
		if d <= 19 {
			rows = append(rows, trendRow("주택", "KR", "day", b, 14, 0.14))
		}
	}
	rows = append(rows,
		trendRow("환율", "KR", "day", "2026-06-23", 30, 0.3),
		trendRow("금리", "KR", "day", "2026-06-23", 40, 0.2),
		trendRow("주택", "KR", "day", "2026-06-23", 8, 0.08),
		trendRow("반도체", "KR", "day", "2026-06-23", 5, 0.05),
		trendRow("미국 대상", "US", "day", "2026-06-23", 99, 1),
	)
	writeTrendRows(t, dir, rows)
}

func getSpikes(t *testing.T, dir, query string) spikesResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()
	resp, err := http.Get(srv.URL + "/api/spikes" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var s spikesResponse
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

func near(p *float64, want float64) bool {
	return p != nil && math.Abs(*p-want) < 1e-9
}

func TestSpikesRankByMultipleOverTheSevenDaysBefore(t *testing.T) {
	dir := t.TempDir()
	writeSpikeGold(t, dir)
	s := getSpikes(t, dir, "?axis=KR")

	if s.Basis.TimeBucket != "2026-06-23" || s.Basis.BucketUnit != "day" || s.Basis.Baseline != "7d" {
		t.Fatalf("basis = %+v", s.Basis)
	}
	if got := strings.Join(s.Basis.BaselineBuckets, ","); got !=
		"2026-06-16,2026-06-17,2026-06-18,2026-06-19,2026-06-20,2026-06-21,2026-06-22" {
		t.Fatalf("baseline buckets = %s", got)
	}
	if !s.Basis.HasBaseline || s.Basis.Threshold != 1.5 {
		t.Fatalf("basis = %+v", s.Basis)
	}
	var order []string
	for _, r := range s.Rows {
		order = append(order, r.Subject)
	}
	if got := strings.Join(order, ","); got != "환율,금리,주택,반도체" {
		t.Fatalf("order = %s", got)
	}

	fx, rate, house, chip := s.Rows[0], s.Rows[1], s.Rows[2], s.Rows[3]
	if !near(fx.RawMultiple, 3) || !near(fx.NormalizedMultiple, 3) || !fx.Spike || fx.NormalizedAway {
		t.Errorf("환율 = %+v", fx)
	}
	if !near(rate.RawMultiple, 2) || !near(rate.NormalizedMultiple, 1) || !rate.Spike || !rate.NormalizedAway {
		t.Errorf("금리 = %+v", rate)
	}
	if house.BaselineRaw != 8 || !near(house.RawMultiple, 1) || house.Spike {
		t.Errorf("주택: a baseline day the subject is absent from must count as 0, got %+v", house)
	}
	if !chip.IsNew || chip.RawMultiple != nil || chip.NormalizedMultiple != nil || chip.Spike {
		t.Errorf("반도체 = %+v", chip)
	}
	for i, r := range s.Rows {
		if r.Rank != i+1 {
			t.Errorf("%s rank = %d", r.Subject, r.Rank)
		}
	}
}

func TestSpikesThirtyDayBaselineReachesFurther(t *testing.T) {
	dir := t.TempDir()
	writeSpikeGold(t, dir)
	s := getSpikes(t, dir, "?axis=KR&baseline=30d")

	if s.Basis.Baseline != "30d" || len(s.Basis.BaselineBuckets) != 8 || s.Basis.BaselineBuckets[0] != "2026-06-01" {
		t.Fatalf("basis = %+v", s.Basis)
	}
	for _, r := range s.Rows {
		if r.Subject == "환율" && !near(r.RawMultiple, 30/(150.0/8)) {
			t.Errorf("환율 30d = %+v", r)
		}
	}
}

func TestSpikesWithoutABaselineClaimNoMultiple(t *testing.T) {
	dir := t.TempDir()
	writeTrendRows(t, dir, []string{trendRow("환율", "KR", "day", "2026-06-23", 30, 0.3)})
	s := getSpikes(t, dir, "?axis=KR")

	if s.Basis.HasBaseline || len(s.Basis.BaselineBuckets) != 0 || len(s.Rows) != 1 {
		t.Fatalf("spikes = %+v", s)
	}
	if r := s.Rows[0]; r.RawMultiple != nil || r.IsNew || r.Spike {
		t.Errorf("a first bucket is not new and not a spike: %+v", r)
	}
}

func TestSpikesOnAnEmptyAxisAnswerEmpty(t *testing.T) {
	s := getSpikes(t, t.TempDir(), "?axis=GLOBAL&baseline=bogus")
	if s.Axis != "GLOBAL" || s.Basis.Baseline != "7d" || s.Basis.TimeBucket != "" || len(s.Rows) != 0 {
		t.Fatalf("spikes = %+v", s)
	}
}

func TestSpikesReadTheFinestUnit(t *testing.T) {
	dir := t.TempDir()
	writeTrendRows(t, dir, []string{
		trendRow("환율", "KR", "hour", "2026-06-22T23", 2, 0.2),
		trendRow("환율", "KR", "hour", "2026-06-23T00", 6, 0.6),
		trendRow("환율", "KR", "day", "2026-06-23", 6, 0.6),
	})
	s := getSpikes(t, dir, "?axis=KR")
	if s.Basis.BucketUnit != "hour" || s.Basis.TimeBucket != "2026-06-23T00" || !near(s.Rows[0].RawMultiple, 3) {
		t.Fatalf("spikes = %+v", s)
	}
}
