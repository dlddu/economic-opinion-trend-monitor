package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

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
