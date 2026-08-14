package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func writeGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"b","raw_count":5,"normalized_share":0.6,"delta":0.0,"spark":[0.5,0.6]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"b","raw_count":3,"normalized_share":0.4,"delta":0.0,"spark":[0.4,0.4]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"b","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":8}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestDashboardDerivesFromGold(t *testing.T) {
	dir := t.TempDir()
	writeGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/dashboard?axis=KR")
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
	if d.Axis != "KR" || !d.Normalized {
		t.Errorf("axis/normalized wrong: %+v", d)
	}
	if len(d.TopSubjects) != 2 {
		t.Fatalf("want 2 subjects, got %d", len(d.TopSubjects))
	}
	// Highest normalized_share ranks first.
	if d.TopSubjects[0].Subject != "한국은행 기준금리" || d.TopSubjects[0].Rank != 1 {
		t.Errorf("ranking wrong: %+v", d.TopSubjects)
	}
	if d.Sentiment.Positive != 0.5 || d.Sentiment.Unanalyzed != 0.2 {
		t.Errorf("sentiment passthrough wrong: %+v", d.Sentiment)
	}
}

// writeMultiBucketGold lays down two time buckets so the compare handler has
// something to pick the wrong one from: T13 is stale (and holds the row with
// the largest share, so a missing filter surfaces immediately), T14 is current,
// and GLOBAL exists only in the stale bucket.
func writeMultiBucketGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"묵은 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":99,"normalized_share":0.9,"delta":0.0,"spark":[0.9]}
{"subject":"현재 KR 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":10,"normalized_share":0.5,"delta":0.0,"spark":[0.5]}
{"subject":"현재 US 대상","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":4,"normalized_share":0.3,"delta":0.0,"spark":[0.3]}
{"subject":"묵은 GLOBAL 대상","axis":"GLOBAL","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":7,"normalized_share":0.4,"delta":0.0,"spark":[0.4]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","distribution":{"positive":0.9,"neutral":0.1,"negative":0.0,"mixed":0.0,"unanalyzed":0.0},"analyzed_total":99}
{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.4,"neutral":0.3,"negative":0.2,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":10}
{"axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.25,"neutral":0.35,"negative":0.3,"mixed":0.1,"unanalyzed":0.4},"analyzed_total":4}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

type compareResponse struct {
	Basis struct {
		TimeBucket string `json:"time_bucket"`
		BucketUnit string `json:"bucket_unit"`
		Normalized bool   `json:"normalized"`
	} `json:"basis"`
	Axes []struct {
		Axis        string                    `json:"axis"`
		TopSubjects []rankRow                 `json:"top_subjects"`
		Sentiment   gen.SentimentDistribution `json:"sentiment"`
	} `json:"axes"`
}

// AC3.7 — the three axes must line up on one shared basis. This is the unit
// guard for that half: the e2e fixture is deliberately single-bucket (it feeds
// the dashboard specs too), so only a test that supplies two buckets can prove
// the handler picks one. The e2e spec covers the rendered side by side view.
func TestCompareAlignsAxesOnTheLatestBucket(t *testing.T) {
	dir := t.TempDir()
	writeMultiBucketGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/compare")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var c compareResponse
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		t.Fatal(err)
	}

	if c.Basis.TimeBucket != "2026-06-23T14" || c.Basis.BucketUnit != "hour" || !c.Basis.Normalized {
		t.Fatalf("basis wrong: %+v", c.Basis)
	}

	// Axis order is fixed so the columns can be read side by side.
	want := []string{"KR", "US", "GLOBAL"}
	if len(c.Axes) != len(want) {
		t.Fatalf("want %d axis columns, got %d", len(want), len(c.Axes))
	}
	for i, axis := range want {
		if c.Axes[i].Axis != axis {
			t.Fatalf("axis column %d = %q, want %q", i, c.Axes[i].Axis, axis)
		}
	}

	// The stale bucket must not leak in — not even the row whose share (0.9)
	// would otherwise top the KR column.
	for _, col := range c.Axes {
		for _, row := range col.TopSubjects {
			if row.Subject == "묵은 대상" || row.Subject == "묵은 GLOBAL 대상" {
				t.Errorf("%s 컬럼에 이전 버킷 행 %q 가 섞였다", col.Axis, row.Subject)
			}
		}
	}
	if len(c.Axes[0].TopSubjects) != 1 || c.Axes[0].TopSubjects[0].Subject != "현재 KR 대상" {
		t.Errorf("KR column wrong: %+v", c.Axes[0].TopSubjects)
	}
	if c.Axes[0].Sentiment.Positive != 0.4 {
		t.Errorf("KR sentiment came from the wrong bucket: %+v", c.Axes[0].Sentiment)
	}

	// An axis absent from the shared bucket stays empty instead of borrowing
	// an older one — an honest gap beats a misaligned comparison.
	if len(c.Axes[2].TopSubjects) != 0 {
		t.Errorf("GLOBAL column should be empty in this bucket: %+v", c.Axes[2].TopSubjects)
	}
	if c.Axes[2].Sentiment != (gen.SentimentDistribution{}) {
		t.Errorf("GLOBAL sentiment should be zero in this bucket: %+v", c.Axes[2].Sentiment)
	}
}
