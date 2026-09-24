package store

import (
	"os"
	"path/filepath"
	"strings"
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

func TestBronzeAndSilverReadIntoContractTypes(t *testing.T) {
	dir := t.TempDir()
	for _, layer := range []string{"bronze", "silver"} {
		if err := os.MkdirAll(filepath.Join(dir, layer), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	item := `{"record_id":"r-1","source_id":"src-a","axis":"KR","rank":1,"view_count":120,` +
		`"title":"기준금리 동결","source_url":"https://ex.test/1","body_hash":"h1",` +
		`"body_available":true,"collected_at":"2026-06-23T14:05:00Z","collection_cycle":"2026-06-23T14"}`
	body := `{"body_hash":"h1","raw_text":"본문 전문","first_seen_at":"2026-06-23T14:05:00Z",` +
		`"first_seen_cycle":"2026-06-23T14"}`
	analysis := `{"record_id":"r-1","source_url":"https://ex.test/1","target_countries":["KR"],` +
		`"narrative_subjects":["한국은행 기준금리"],"sentiment":"neutral","analysis_status":"analyzed",` +
		`"confidence":0.91,"analyzed_at":"2026-06-23T14:40:00Z","analyzer_version":"v3"}`
	for _, f := range []struct{ layer, name, content string }{
		{"bronze/news_item/year=2026/month=06/day=23/hour=14", "data", item},
		{"silver/analysis/year=2026/month=06/day=23/hour=14", "data", analysis},
	} {
		if err := os.MkdirAll(filepath.Join(dir, f.layer), 0o755); err != nil {
			t.Fatal(err)
		}
		p := filepath.Join(dir, f.layer, f.name+".jsonl")
		if err := os.WriteFile(p, []byte(f.content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	partition := filepath.Join(dir, "bronze", "news_body", "body_hash_prefix=h")
	if err := os.MkdirAll(partition, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(partition, "h1.json"), []byte(body+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	lake := New(dir)

	items, err := lake.NewsItems()
	if err != nil {
		t.Fatalf("NewsItems: %v", err)
	}
	if len(items) != 1 || items[0].RecordID != "r-1" || items[0].Axis != gen.AxisKR {
		t.Fatalf("news_item decoded wrong: %+v", items)
	}
	if !items[0].BodyAvailable || items[0].BodyHash != "h1" || items[0].ViewCount != 120 {
		t.Errorf("news_item numerics/flags decoded wrong: %+v", items[0])
	}

	stored, err := lake.NewsBody("h1")
	if err != nil {
		t.Fatalf("NewsBody: %v", err)
	}
	if stored == nil || stored.BodyHash != "h1" || stored.RawText != "본문 전문" {
		t.Fatalf("news_body decoded wrong: %+v", stored)
	}
	for _, key := range []string{"h2", "", "../h1", ".h1"} {
		if got, err := lake.NewsBody(key); err != nil || got != nil {
			t.Errorf("NewsBody(%q) = %+v, %v; want nil, nil", key, got, err)
		}
	}

	analyses, err := lake.Analyses()
	if err != nil {
		t.Fatalf("Analyses: %v", err)
	}
	if len(analyses) != 1 || analyses[0].RecordID != "r-1" {
		t.Fatalf("analysis decoded wrong: %+v", analyses)
	}
	if analyses[0].Sentiment == nil || *analyses[0].Sentiment != gen.SentimentNeutral {
		t.Errorf("sentiment decoded wrong: %+v", analyses[0])
	}
	if analyses[0].AnalysisStatus != gen.AnalysisStatusAnalyzed || analyses[0].AnalyzerVersion != "v3" {
		t.Errorf("analysis status/version decoded wrong: %+v", analyses[0])
	}
}

// A null sentiment is a value, not a decode failure — AC2.5 sets low-confidence
// records aside rather than forcing them into one of the four classes.
func TestAnalysisDecodesNullSentiment(t *testing.T) {
	dir := t.TempDir()
	part := filepath.Join(dir, "silver", "analysis", "year=2026", "month=06", "day=23", "hour=14")
	if err := os.MkdirAll(part, 0o755); err != nil {
		t.Fatal(err)
	}
	line := `{"record_id":"r-9","source_url":"https://ex.test/9","target_countries":[],` +
		`"narrative_subjects":[],"sentiment":null,"analysis_status":"unanalyzed",` +
		`"confidence":0.1,"analyzed_at":"2026-06-23T14:41:00Z","analyzer_version":"v3"}`
	if err := os.WriteFile(filepath.Join(part, "data.jsonl"), []byte(line+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := New(dir).Analyses()
	if err != nil {
		t.Fatalf("Analyses: %v", err)
	}
	if len(got) != 1 {
		t.Fatalf("want 1 record, got %d", len(got))
	}
	if got[0].Sentiment != nil {
		t.Errorf("null sentiment decoded into a class: %v", *got[0].Sentiment)
	}
	if got[0].AnalysisStatus != gen.AnalysisStatusUnanalyzed {
		t.Errorf("status decoded wrong: %+v", got[0])
	}
}

func TestMissingBronzeAndSilverReadEmpty(t *testing.T) {
	lake := New(t.TempDir())
	items, err := lake.NewsItems()
	if err != nil || len(items) != 0 {
		t.Errorf("NewsItems on an empty lake: %v / %d", err, len(items))
	}
	body, err := lake.NewsBody("h1")
	if err != nil || body != nil {
		t.Errorf("NewsBody on an empty lake: %v / %+v", err, body)
	}
	analyses, err := lake.Analyses()
	if err != nil || len(analyses) != 0 {
		t.Errorf("Analyses on an empty lake: %v / %d", err, len(analyses))
	}
}

func TestNewsItemsReadEveryCyclePartitionInOrder(t *testing.T) {
	dir := t.TempDir()
	write := func(rel, content string) {
		p := filepath.Join(dir, "bronze", "news_item", rel)
		if err := os.MkdirAll(filepath.Dir(p), 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(p, []byte(content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("year=2026/month=06/day=24/hour=00/data.jsonl", `{"record_id":"c"}`)
	write("year=2026/month=06/day=23/hour=23/data.jsonl", `{"record_id":"a"}`+"\n"+`{"record_id":"b"}`)
	write("year=2026/month=06/day=24/hour=01/.data.jsonl.1.tmp", `{"record_id":"half-written"}`)

	items, err := New(dir).NewsItems()
	if err != nil {
		t.Fatalf("NewsItems: %v", err)
	}
	var got []string
	for _, it := range items {
		got = append(got, it.RecordID)
	}
	if strings.Join(got, ",") != "a,b,c" {
		t.Fatalf("records = %v, want a,b,c in partition order", got)
	}
}
