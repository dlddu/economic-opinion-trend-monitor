package store

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

func TestSubjectTrendsReadsJSONLIntoContractType(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "gold"), 0o755); err != nil {
		t.Fatal(err)
	}
	line := `{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"hour",` +
		`"time_bucket":"2026-06-23T14","raw_count":3,"normalized_share":0.5,"delta":0.0,"spark":[0.1,0.2]}`
	if err := os.WriteFile(filepath.Join(dir, "gold", "subject_trend.jsonl"), []byte(line+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := New(dir).SubjectTrends()
	if err != nil {
		t.Fatalf("SubjectTrends: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("want 1 record, got %d", len(got))
	}
	if got[0].Subject != "한국은행 기준금리" || got[0].Axis != gen.AxisKR {
		t.Errorf("decoded wrong values: %+v", got[0])
	}
	if got[0].NormalizedShare != 0.5 || got[0].RawCount != 3 {
		t.Errorf("decoded wrong numerics: %+v", got[0])
	}
}

func TestMissingDatasetReadsEmpty(t *testing.T) {
	got, err := New(t.TempDir()).AxisSentiments()
	if err != nil {
		t.Fatalf("AxisSentiments: %v", err)
	}
	if len(got) != 0 {
		t.Fatalf("want empty, got %d", len(got))
	}
}
