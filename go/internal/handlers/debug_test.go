package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func writeDebugLake(t *testing.T, dir string, analyses []string, runs, calls map[string]string) {
	t.Helper()
	if len(analyses) > 0 {
		part := filepath.Join(dir, "silver", "analysis", "year=2026", "month=09", "day=28", "hour=00")
		if err := os.MkdirAll(part, 0o755); err != nil {
			t.Fatal(err)
		}
		body := strings.Join(analyses, "\n") + "\n"
		if err := os.WriteFile(filepath.Join(part, "data.jsonl"), []byte(body), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	for _, ds := range []struct {
		dataset string
		field   string
		records map[string]string
	}{
		{"pipeline_run", "run_id", runs},
		{"llm_call", "call_id", calls},
	} {
		for key, record := range ds.records {
			partition := filepath.Join(dir, "silver", ds.dataset, ds.field+"_prefix="+key[:1])
			if err := os.MkdirAll(partition, 0o755); err != nil {
				t.Fatal(err)
			}
			if err := os.WriteFile(filepath.Join(partition, key+".json"), []byte(record), 0o644); err != nil {
				t.Fatal(err)
			}
		}
	}
}

func getDebug(t *testing.T, dir, query string) debugResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/debug" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var got debugResponse
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	return got
}

const debugRunRecord = `{"run_id":"run-a","run_trigger":"scheduled",` +
	`"run_started_at":"2026-09-28T00:00:00Z","run_ended_at":"2026-09-28T00:02:00Z","run_status":"succeeded",` +
	`"stages":[{"stage_name":"analysis","stage_status":"succeeded","stage_started_at":"2026-09-28T00:01:00Z",` +
	`"stage_ended_at":"2026-09-28T00:02:00Z","duration_ms":60000,"input_count":3,"output_count":3,` +
	`"outcomes":[{"outcome_name":"analyzed","outcome_count":1},{"outcome_name":"unanalyzed","outcome_count":1},` +
	`{"outcome_name":"call_failed","outcome_count":1}],"failure_reason":null,"source_failures":[]}]}`

const debugCallRecord = `{"call_id":"call-1","run_id":"run-a","record_id":"rec-1",` +
	`"source_url":"https://ex.test/1","analyzer_version":"v2","call_model":"model-x","call_temperature":0.1,` +
	`"prompt_system":"너는 분석기다","prompt_user":"TITLE: 기준금리 동결\n본문",` +
	`"prompt_sha256":"abc123","response_raw":"{\"sentiment\":\"mixed\"}","call_outcome":"parsed",` +
	`"call_failure_reason":null,"call_attempt_count":2,"called_at":"2026-09-28T00:01:30Z",` +
	`"duration_ms":820,"reused_from_call_id":null}`

func analysisRow(recordID, version, status, runID, callField string) string {
	return `{"record_id":"` + recordID + `","source_url":"https://ex.test/1","target_countries":["KR"],` +
		`"narrative_subjects":["기준금리"],"sentiment":"positive","analysis_status":"` + status + `",` +
		`"confidence":0.8,"analyzed_at":"2026-09-28T00:01:` + version[len(version)-1:] + `0Z",` +
		`"analyzer_version":"` + version + `","run_id":"` + runID + `",` + callField + `}`
}

func TestDebugWalksARecordBackToItsCallAndRun(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-1"`)},
		map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord})

	got := getDebug(t, dir, "?record_id=rec-1")
	if !got.Found || got.Selection != "requested" || got.RecordID != "rec-1" {
		t.Fatalf("selection: %+v", got)
	}
	if len(got.Versions) != 1 {
		t.Fatalf("want 1 version, got %d", len(got.Versions))
	}
	version := got.Versions[0]
	if !version.Selected || version.AnalyzerVersion != "v2" {
		t.Errorf("selected version wrong: %+v", version)
	}
	if version.Exchange.State != exchangeCall || version.Exchange.Call == nil {
		t.Fatalf("exchange must carry the call: %+v", version.Exchange)
	}
	call := version.Exchange.Call
	if call.PromptSystem != "너는 분석기다" || !strings.HasPrefix(call.PromptUser, "TITLE: ") {
		t.Errorf("prompt not read back verbatim: %+v", call)
	}
	if call.ResponseRaw == nil || *call.ResponseRaw != `{"sentiment":"mixed"}` {
		t.Errorf("raw reply missing: %+v", call)
	}
	if call.CallOutcome != "parsed" || call.CallAttemptCount != 2 || call.PromptSha256 != "abc123" {
		t.Errorf("verdict fields wrong: %+v", call)
	}
	if got.Run == nil {
		t.Fatal("run must be read from the lake")
	}
	if got.Run.RunID != "run-a" || got.Run.RunStatus != "succeeded" || got.Run.RunTrigger != "scheduled" {
		t.Errorf("run header wrong: %+v", got.Run)
	}
	if len(got.Run.Stages) != 1 || got.Run.Stages[0].InputCount != 3 || len(got.Run.Stages[0].Outcomes) != 3 {
		t.Errorf("stage records not carried: %+v", got.Run.Stages)
	}
}

func TestDebugNamesTheNoCallReasonInsteadOfAnEmptyCall(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v1", "unanalyzed", "run-a", `"no_call_reason":"body_unavailable"`)},
		map[string]string{"run-a": debugRunRecord}, nil)

	exchange := getDebug(t, dir, "?record_id=rec-1").Versions[0].Exchange
	if exchange.State != exchangeNoCall {
		t.Fatalf("state = %q, want %q", exchange.State, exchangeNoCall)
	}
	if exchange.NoCallReason == nil || *exchange.NoCallReason != "body_unavailable" {
		t.Errorf("reason not surfaced: %+v", exchange)
	}
	if exchange.Call != nil {
		t.Errorf("no call must stay absent, got %+v", exchange.Call)
	}
}

func TestDebugSeparatesAnAbsentCallRecordFromOneNeverRecorded(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir, []string{
		analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-gone"`),
		analysisRow("rec-2", "v1", "analyzed", "run-a", `"call_id":null,"no_call_reason":null`),
	}, map[string]string{"run-a": debugRunRecord}, nil)

	absent := getDebug(t, dir, "?record_id=rec-1").Versions[0].Exchange
	if absent.State != exchangeCallAbsent || absent.CallID == nil || *absent.CallID != "call-gone" {
		t.Errorf("a named but unreadable call must say so: %+v", absent)
	}
	unrecorded := getDebug(t, dir, "?record_id=rec-2").Versions[0].Exchange
	if unrecorded.State != exchangeUnrecorded || unrecorded.CallID != nil {
		t.Errorf("a row from before call records must say so: %+v", unrecorded)
	}
}

func TestDebugFollowsAReusedReplyOneHopToTheOriginCall(t *testing.T) {
	dir := t.TempDir()
	reuse := `{"call_id":"call-2","run_id":"run-a","record_id":"rec-1","source_url":"https://ex.test/1",` +
		`"analyzer_version":"v2","call_model":"model-x","prompt_system":"s","prompt_user":"u",` +
		`"prompt_sha256":"abc123","response_raw":null,"call_outcome":"reused","call_failure_reason":null,` +
		`"call_attempt_count":0,"called_at":"2026-09-28T00:03:00Z","duration_ms":0,` +
		`"reused_from_call_id":"call-1"}`
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-2"`)},
		map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord, "call-2": reuse})

	exchange := getDebug(t, dir, "?record_id=rec-1").Versions[0].Exchange
	if exchange.Call == nil || exchange.Call.CallOutcome != "reused" {
		t.Fatalf("reuse record missing: %+v", exchange)
	}
	if exchange.ReusedFrom == nil || exchange.ReusedFrom.CallID != "call-1" {
		t.Fatalf("origin call must be one hop away: %+v", exchange.ReusedFrom)
	}
	if exchange.ReusedFrom.ResponseRaw == nil {
		t.Error("the origin call is where the reply text lives")
	}
}

func TestDebugListsEveryAnalyzerVersionNewestFirst(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir, []string{
		analysisRow("rec-1", "v1", "unanalyzed", "run-a", `"no_call_reason":"keyword_analyzer"`),
		analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-1"`),
	}, map[string]string{"run-a": debugRunRecord}, map[string]string{"call-1": debugCallRecord})

	got := getDebug(t, dir, "?record_id=rec-1")
	if len(got.Versions) != 2 {
		t.Fatalf("both versions must survive, got %d", len(got.Versions))
	}
	if got.Versions[0].AnalyzerVersion != "v2" || !got.Versions[0].Selected {
		t.Errorf("newest version must lead and be selected: %+v", got.Versions)
	}
	if got.Versions[1].Selected {
		t.Error("exactly one version is selected")
	}
}

func TestDebugTalliesRunSymptomsAcrossItsRecordsAndCalls(t *testing.T) {
	dir := t.TempDir()
	failed := `{"call_id":"call-3","run_id":"run-a","record_id":"rec-3","source_url":"https://ex.test/3",` +
		`"analyzer_version":"v2","call_model":"model-x","prompt_system":"s","prompt_user":"u",` +
		`"prompt_sha256":"d3","response_raw":null,"call_outcome":"call_failed",` +
		`"call_failure_reason":"upstream 500","call_attempt_count":3,"called_at":"2026-09-28T00:01:40Z",` +
		`"duration_ms":10,"reused_from_call_id":null}`
	writeDebugLake(t, dir, []string{
		analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-1"`),
		analysisRow("rec-2", "v2", "unanalyzed", "run-a", `"no_call_reason":"body_unavailable"`),
		analysisRow("rec-3", "v2", "unanalyzed", "run-a", `"call_id":"call-3"`),
		analysisRow("rec-4", "v2", "analyzed", "run-b", `"call_id":null,"no_call_reason":null`),
	}, map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord, "call-3": failed})

	symptoms := getDebug(t, dir, "?record_id=rec-1").Run.Symptoms
	if symptoms.Records != 3 || symptoms.Calls != 2 {
		t.Fatalf("run totals must count only this run: %+v", symptoms)
	}
	if want := []debugTally{{"unanalyzed", 2}, {"analyzed", 1}}; !sameTallies(symptoms.AnalysisStatus, want) {
		t.Errorf("analysis status tally = %+v, want %+v", symptoms.AnalysisStatus, want)
	}
	if want := []debugTally{{"call_failed", 1}, {"parsed", 1}}; !sameTallies(symptoms.CallOutcome, want) {
		t.Errorf("call outcome tally = %+v, want %+v", symptoms.CallOutcome, want)
	}
	if want := []debugTally{{"body_unavailable", 1}}; !sameTallies(symptoms.NoCallReason, want) {
		t.Errorf("no-call tally = %+v, want %+v", symptoms.NoCallReason, want)
	}
}

func sameTallies(got, want []debugTally) bool {
	if len(got) != len(want) {
		return false
	}
	for i := range got {
		if got[i] != want[i] {
			return false
		}
	}
	return true
}

func TestDebugNamesItsFallbackSelectionWithoutFabricating(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-1"`)},
		map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord})

	auto := getDebug(t, dir, "")
	if !auto.Found || auto.Selection != "auto" || auto.RecordID != "rec-1" {
		t.Errorf("no record_id must land on the first row: %+v", auto)
	}

	missing := getDebug(t, dir, "?record_id=nope")
	if missing.Found || missing.Selection != "requested-missing" || len(missing.Versions) != 0 {
		t.Errorf("unknown record must not be papered over: %+v", missing)
	}
	if missing.Run != nil {
		t.Errorf("no run for a record that is not there: %+v", missing.Run)
	}

	empty := getDebug(t, t.TempDir(), "")
	if empty.Found || empty.Selection != "empty" || len(empty.Versions) != 0 || empty.Run != nil {
		t.Errorf("empty lake: %+v", empty)
	}
}

func TestDebugKeepsTheRunNilWhenTheRunRecordIsAbsent(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v2", "analyzed", "run-gone", `"call_id":"call-1"`)},
		nil, map[string]string{"call-1": debugCallRecord})

	got := getDebug(t, dir, "?record_id=rec-1")
	if !got.Found || got.Run != nil {
		t.Errorf("a missing run record must read as absent, not as an empty run: %+v", got.Run)
	}
}
