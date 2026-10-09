package store

import (
	"context"
	"errors"
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

func TestSubjectTrendsWhereKeepsOnlyAcceptedRows(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "gold"), 0o755); err != nil {
		t.Fatal(err)
	}
	lines := `{"subject":"a","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":1,"normalized_share":0.1,"delta":0.0,"spark":[]}
{"subject":"b","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":2,"normalized_share":0.2,"delta":0.0,"spark":[]}
{"subject":"c","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":3,"normalized_share":0.3,"delta":0.0,"spark":[]}`
	if err := os.WriteFile(filepath.Join(dir, "gold", "subject_trend.jsonl"), []byte(lines+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	got, err := New(dir).SubjectTrendsWhere(context.Background(), func(r *gen.SubjectTrend) bool { return r.Axis == gen.AxisKR })
	if err != nil {
		t.Fatalf("SubjectTrendsWhere: %v", err)
	}
	if len(got) != 2 || got[0].Subject != "a" || got[1].Subject != "c" {
		t.Fatalf("want KR rows a, c in file order, got %+v", got)
	}

	none, err := New(t.TempDir()).SubjectTrendsWhere(context.Background(), func(*gen.SubjectTrend) bool { return true })
	if err != nil || len(none) != 0 {
		t.Fatalf("missing dataset should read empty, got %v, %v", none, err)
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

func writeObjectRecord(t *testing.T, dir, dataset, keyField, key, body string) {
	t.Helper()
	partition := filepath.Join(dir, "silver", dataset, keyField+"_prefix="+key[:1])
	if err := os.MkdirAll(partition, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(partition, key+".json"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestPipelineRunAndLlmCallReadTheObjectDatasetsByKey(t *testing.T) {
	dir := t.TempDir()
	run := `{"run_id":"run-a","run_trigger":"reprocess","run_started_at":"2026-09-28T00:00:00Z",` +
		`"run_ended_at":null,"run_status":"running","stages":[{"stage_name":"analysis",` +
		`"stage_status":"running","stage_started_at":"2026-09-28T00:01:00Z","stage_ended_at":null,` +
		`"duration_ms":0,"input_count":2,"output_count":0,"outcomes":[],"failure_reason":null,` +
		`"source_failures":[]}]}`
	call := `{"call_id":"call-1","run_id":"run-a","record_id":"r-1","source_url":"https://ex.test/1",` +
		`"analyzer_version":"v2","call_model":"model-x","call_temperature":0.2,"prompt_system":"s",` +
		`"prompt_user":"u","prompt_sha256":"h","response_raw":null,"call_outcome":"call_failed",` +
		`"call_failure_reason":"upstream 500","call_attempt_count":3,"called_at":"2026-09-28T00:01:10Z",` +
		`"duration_ms":12,"reused_from_call_id":null}`
	writeObjectRecord(t, dir, "pipeline_run", "run_id", "run-a", run)
	writeObjectRecord(t, dir, "llm_call", "call_id", "call-1", call)

	lake := New(dir)
	gotRun, err := lake.PipelineRun("run-a")
	if err != nil || gotRun == nil {
		t.Fatalf("PipelineRun: %v %v", gotRun, err)
	}
	if gotRun.RunTrigger != gen.RunTriggerReprocess || gotRun.RunStatus != gen.RunStatusRunning {
		t.Errorf("run enums decoded wrong: %+v", *gotRun)
	}
	if len(gotRun.Stages) != 1 || gotRun.Stages[0].StageName != gen.PipelineStageAnalysis {
		t.Errorf("nested stage decoded wrong: %+v", gotRun.Stages)
	}
	if gotRun.RunEndedAt != nil {
		t.Errorf("an unfinished run keeps run_ended_at null: %+v", *gotRun)
	}

	gotCall, err := lake.LlmCall("call-1")
	if err != nil || gotCall == nil {
		t.Fatalf("LlmCall: %v %v", gotCall, err)
	}
	if gotCall.CallOutcome != gen.LlmCallOutcomeCallFailed || gotCall.ResponseRaw != nil {
		t.Errorf("a failed call keeps no reply: %+v", *gotCall)
	}
	if gotCall.CallFailureReason == nil || *gotCall.CallFailureReason != "upstream 500" {
		t.Errorf("failure reason decoded wrong: %+v", *gotCall)
	}
}

func TestObjectDatasetsReadEmptyWhenAbsentAndOrderByKeyFileName(t *testing.T) {
	lake := New(t.TempDir())
	runs, err := lake.PipelineRuns()
	if err != nil || len(runs) != 0 {
		t.Fatalf("absent dataset must read empty: %v %v", runs, err)
	}
	if got, err := lake.PipelineRun("run-a"); err != nil || got != nil {
		t.Fatalf("absent object must read nil: %v %v", got, err)
	}

	dir := t.TempDir()
	for _, key := range []string{"run-c", "run-a", "run-b"} {
		writeObjectRecord(t, dir, "pipeline_run", "run_id", key,
			`{"run_id":"`+key+`","run_trigger":"scheduled","run_started_at":"2026-09-28T00:00:00Z",`+
				`"run_ended_at":null,"run_status":"succeeded","stages":[]}`)
	}
	got, err := New(dir).PipelineRuns()
	if err != nil {
		t.Fatal(err)
	}
	var ids []string
	for _, run := range got {
		ids = append(ids, run.RunID)
	}
	if strings.Join(ids, ",") != "run-a,run-b,run-c" {
		t.Errorf("order = %v, want key-name order", ids)
	}
}

func TestEachAnalysisStopsEarlyAndHonorsCancellation(t *testing.T) {
	dir := t.TempDir()
	part := filepath.Join(dir, "silver", "analysis", "year=2026", "month=10", "day=05", "hour=00")
	if err := os.MkdirAll(part, 0o755); err != nil {
		t.Fatal(err)
	}
	rows := `{"record_id":"a"}` + "\n" + `{"record_id":"b"}` + "\n" + `{"record_id":"c"}` + "\n"
	if err := os.WriteFile(filepath.Join(part, "data.jsonl"), []byte(rows), 0o644); err != nil {
		t.Fatal(err)
	}
	lake := New(dir)

	var seen []string
	err := lake.EachAnalysis(context.Background(), func(a *gen.Analysis) error {
		seen = append(seen, a.RecordID)
		if a.RecordID == "b" {
			return ErrStop
		}
		return nil
	})
	if err != nil || strings.Join(seen, ",") != "a,b" {
		t.Fatalf("ErrStop must end the scan without an error: seen=%v err=%v", seen, err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	called := false
	err = lake.EachAnalysis(ctx, func(*gen.Analysis) error {
		called = true
		return nil
	})
	if !errors.Is(err, context.Canceled) || called {
		t.Fatalf("a cancelled scan must stop before decoding: called=%v err=%v", called, err)
	}
}

func TestLlmCallHeadsReadByKeyAndInKeyOrder(t *testing.T) {
	dir := t.TempDir()
	for _, c := range []struct{ id, run, outcome string }{
		{"call-2", "run-b", "parsed"},
		{"call-1", "run-a", "call_failed"},
	} {
		writeObjectRecord(t, dir, "llm_call", "call_id", c.id,
			`{"call_id":"`+c.id+`","run_id":"`+c.run+`","prompt_user":"긴 본문","call_outcome":"`+c.outcome+`"}`)
	}
	lake := New(dir)

	head, err := lake.LlmCallHeadOf("call-1")
	if err != nil || head == nil || head.RunID != "run-a" || head.CallOutcome != gen.LlmCallOutcomeCallFailed {
		t.Fatalf("LlmCallHeadOf(call-1) = %+v, %v", head, err)
	}
	if missing, err := lake.LlmCallHeadOf("call-9"); err != nil || missing != nil {
		t.Fatalf("absent call must read nil: %+v %v", missing, err)
	}

	var ids []string
	if err := lake.EachLlmCallHead(context.Background(), func(h *LlmCallHead) error {
		ids = append(ids, h.CallID+"/"+string(h.CallOutcome))
		return nil
	}); err != nil {
		t.Fatal(err)
	}
	if strings.Join(ids, ",") != "call-1/call_failed,call-2/parsed" {
		t.Fatalf("heads = %v", ids)
	}
}
