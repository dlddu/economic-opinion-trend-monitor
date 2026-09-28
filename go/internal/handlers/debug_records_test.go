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

func recordsAnalysis(recordID, version, status, runID, analyzedAt, tail string) string {
	return `{"record_id":"` + recordID + `","source_url":"https://ex.test/1","target_countries":["KR"],` +
		`"narrative_subjects":["기준금리"],"sentiment":"positive","analysis_status":"` + status + `",` +
		`"confidence":0.8,"analyzed_at":"` + analyzedAt + `","analyzer_version":"` + version + `",` +
		`"run_id":"` + runID + `",` + tail + `}`
}

func recordsNewsItem(recordID, title, sourceID, collectedAt string) string {
	return `{"record_id":"` + recordID + `","source_id":"` + sourceID + `","axis":"KR","rank":1,` +
		`"view_count":100,"title":"` + title + `","source_url":"https://ex.test/` + recordID + `",` +
		`"body_hash":"h-` + recordID + `","body_available":true,"collected_at":"` + collectedAt + `",` +
		`"collection_cycle":"2026-09-28T00:00:00Z"}`
}

func recordsCall(callID, runID, outcome string) string {
	return `{"call_id":"` + callID + `","run_id":"` + runID + `","record_id":"rec","source_url":"https://ex.test/1",` +
		`"analyzer_version":"v2","call_model":"model-x","call_temperature":0.1,"prompt_system":"s",` +
		`"prompt_user":"u","prompt_sha256":"abc","response_raw":"{}","call_outcome":"` + outcome + `",` +
		`"call_failure_reason":null,"call_attempt_count":1,"called_at":"2026-09-28T00:01:30Z",` +
		`"duration_ms":10,"reused_from_call_id":null}`
}

func writeRecordsLake(t *testing.T, dir string, analyses, items []string, calls map[string]string) {
	t.Helper()
	writeDebugLake(t, dir, analyses, nil, calls)
	if len(items) == 0 {
		return
	}
	part := filepath.Join(dir, "bronze", "news_item", "year=2026", "month=09", "day=28", "hour=00")
	if err := os.MkdirAll(part, 0o755); err != nil {
		t.Fatal(err)
	}
	body := strings.Join(items, "\n") + "\n"
	if err := os.WriteFile(filepath.Join(part, "data.jsonl"), []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func getDebugRecords(t *testing.T, dir, query string) debugRecordsResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/debug/records" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d, want 200", resp.StatusCode)
	}
	var got debugRecordsResponse
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	return got
}

func threeRecordLake(t *testing.T) string {
	t.Helper()
	dir := t.TempDir()
	writeRecordsLake(t, dir,
		[]string{
			recordsAnalysis("rec-1", "v2", "analyzed", "run-a", "2026-09-28T00:01:30Z", `"call_id":"call-ok"`),
			recordsAnalysis("rec-2", "v2", "unanalyzed", "run-a", "2026-09-28T00:01:20Z", `"no_call_reason":"body_unavailable"`),
			recordsAnalysis("rec-3", "v2", "low_confidence", "run-b", "2026-09-28T00:01:10Z", `"call_id":"call-bad"`),
		},
		[]string{
			recordsNewsItem("rec-1", "기준금리 동결", "src-a", "2026-09-28T00:00:10Z"),
			recordsNewsItem("rec-2", "환율 급등", "src-b", "2026-09-28T00:00:20Z"),
			recordsNewsItem("rec-3", "반도체 수출 반등", "src-a", "2026-09-28T00:00:30Z"),
		},
		map[string]string{
			"call-ok":  recordsCall("call-ok", "run-a", "parsed"),
			"call-bad": recordsCall("call-bad", "run-b", "call_failed"),
		})
	return dir
}

func recordIDs(rows []debugRecordRow) []string {
	out := make([]string, 0, len(rows))
	for _, row := range rows {
		out = append(out, row.RecordID)
	}
	return out
}

func TestDebugRecordsListsOneRowPerRecordNewestFirst(t *testing.T) {
	dir := threeRecordLake(t)

	got := getDebugRecords(t, dir, "")
	if got.Total != 3 || got.Matched != 3 || len(got.Rows) != 3 {
		t.Fatalf("counts: %+v", got)
	}
	if want := []string{"rec-1", "rec-2", "rec-3"}; strings.Join(recordIDs(got.Rows), ",") != strings.Join(want, ",") {
		t.Errorf("order = %v, want %v", recordIDs(got.Rows), want)
	}
	first := got.Rows[0]
	if first.Title != "기준금리 동결" || first.SourceID != "src-a" || first.CollectedAt != "2026-09-28T00:00:10Z" {
		t.Errorf("bronze columns not joined: %+v", first)
	}
	if first.ExchangeState != exchangeCall || first.CallOutcome == nil || *first.CallOutcome != "parsed" {
		t.Errorf("call outcome not carried: %+v", first)
	}
	if got.Rows[1].NoCallReason == nil || *got.Rows[1].NoCallReason != "body_unavailable" {
		t.Errorf("no-call reason not carried: %+v", got.Rows[1])
	}
	if first.Versions != 1 {
		t.Errorf("versions = %d, want 1", first.Versions)
	}
}

func TestDebugRecordsSearchesRecordIDAndTitle(t *testing.T) {
	dir := threeRecordLake(t)

	byTitle := getDebugRecords(t, dir, "?q=%EA%B8%89%EB%93%B1")
	if byTitle.Matched != 1 || byTitle.Rows[0].RecordID != "rec-2" {
		t.Errorf("title search: %+v", byTitle)
	}
	if byTitle.Total != 3 {
		t.Errorf("total must count the lake, not the match: %+v", byTitle)
	}

	byID := getDebugRecords(t, dir, "?q=REC-3")
	if byID.Matched != 1 || byID.Rows[0].RecordID != "rec-3" {
		t.Errorf("record_id search is case-insensitive: %+v", byID)
	}

	none := getDebugRecords(t, dir, "?q=없는제목")
	if none.Matched != 0 || len(none.Rows) != 0 || none.Total != 3 {
		t.Errorf("no match must be empty, not everything: %+v", none)
	}
}

func TestDebugRecordsNarrowsToOneSymptom(t *testing.T) {
	dir := threeRecordLake(t)

	for _, tc := range []struct {
		symptom string
		want    string
	}{
		{"analysis_status:unanalyzed", "rec-2"},
		{"analysis_status:low_confidence", "rec-3"},
		{"call_outcome:call_failed", "rec-3"},
		{"call_outcome:parsed", "rec-1"},
		{"no_call_reason:body_unavailable", "rec-2"},
	} {
		got := getDebugRecords(t, dir, "?symptom="+tc.symptom)
		if got.Matched != 1 || got.Rows[0].RecordID != tc.want {
			t.Errorf("symptom %s -> %v, want [%s]", tc.symptom, recordIDs(got.Rows), tc.want)
		}
	}

	unknown := getDebugRecords(t, dir, "?symptom=analysis_status:nonesuch")
	if unknown.Matched != 0 {
		t.Errorf("unknown symptom must match nothing: %+v", unknown)
	}
	ungrouped := getDebugRecords(t, dir, "?symptom=unanalyzed")
	if ungrouped.Matched != 0 {
		t.Errorf("a symptom without its group must not match everything: %+v", ungrouped)
	}
}

func TestDebugRecordsNarrowsToOneRun(t *testing.T) {
	dir := threeRecordLake(t)

	got := getDebugRecords(t, dir, "?run_id=run-a")
	if got.Matched != 2 || strings.Join(recordIDs(got.Rows), ",") != "rec-1,rec-2" {
		t.Errorf("run filter: %+v", recordIDs(got.Rows))
	}

	both := getDebugRecords(t, dir, "?run_id=run-a&symptom=analysis_status:unanalyzed")
	if both.Matched != 1 || both.Rows[0].RecordID != "rec-2" {
		t.Errorf("run and symptom must both apply: %+v", recordIDs(both.Rows))
	}

	crossed := getDebugRecords(t, dir, "?run_id=run-b&symptom=analysis_status:unanalyzed")
	if crossed.Matched != 0 {
		t.Errorf("the symptom of another run must not leak in: %+v", crossed)
	}
}

func TestDebugRecordsFoldsVersionsOntoTheNewestOne(t *testing.T) {
	dir := t.TempDir()
	writeRecordsLake(t, dir,
		[]string{
			recordsAnalysis("rec-1", "v2", "unanalyzed", "run-a", "2026-09-28T00:01:00Z", `"no_call_reason":"body_unavailable"`),
			recordsAnalysis("rec-1", "v3", "analyzed", "run-b", "2026-09-28T00:05:00Z", `"call_id":"call-ok"`),
		},
		[]string{recordsNewsItem("rec-1", "기준금리 동결", "src-a", "2026-09-28T00:00:10Z")},
		map[string]string{"call-ok": recordsCall("call-ok", "run-b", "parsed")})

	got := getDebugRecords(t, dir, "")
	if got.Total != 1 || got.Matched != 1 || len(got.Rows) != 1 {
		t.Fatalf("two versions of one record are one row: %+v", got)
	}
	row := got.Rows[0]
	if row.AnalyzerVersion != "v3" || row.AnalysisStatus != "analyzed" || row.RunID != "run-b" {
		t.Errorf("newest version must win: %+v", row)
	}
	if row.Versions != 2 {
		t.Errorf("versions = %d, want 2", row.Versions)
	}
	if got := getDebugRecords(t, dir, "?run_id=run-a"); got.Matched != 0 {
		t.Errorf("the superseded run must not answer for the record: %+v", got)
	}
}

func TestDebugRecordsCapsTheListAndSaysSo(t *testing.T) {
	dir := t.TempDir()
	analyses := make([]string, 0, debugRecordsLimit+3)
	items := make([]string, 0, debugRecordsLimit+3)
	for i := 0; i < debugRecordsLimit+3; i++ {
		id := "rec-" + string(rune('a'+i/26)) + string(rune('a'+i%26))
		analyses = append(analyses, recordsAnalysis(id, "v2", "analyzed", "run-a", "2026-09-28T00:01:00Z", `"call_id":"call-ok"`))
		items = append(items, recordsNewsItem(id, "제목 "+id, "src-a", "2026-09-28T00:00:10Z"))
	}
	writeRecordsLake(t, dir, analyses, items, map[string]string{"call-ok": recordsCall("call-ok", "run-a", "parsed")})

	got := getDebugRecords(t, dir, "")
	if got.Total != debugRecordsLimit+3 || got.Matched != debugRecordsLimit+3 {
		t.Fatalf("counts must report the whole lake: %+v", got.Total)
	}
	if len(got.Rows) != debugRecordsLimit || !got.Truncated || got.Limit != debugRecordsLimit {
		t.Errorf("rows = %d, truncated = %v, limit = %d", len(got.Rows), got.Truncated, got.Limit)
	}
}

func TestDebugRecordsAnswersAnEmptyLake(t *testing.T) {
	got := getDebugRecords(t, t.TempDir(), "")
	if got.Total != 0 || got.Matched != 0 || got.Truncated {
		t.Errorf("empty lake: %+v", got)
	}
	if got.Rows == nil || len(got.Rows) != 0 {
		t.Errorf("rows must serialize as [], not null: %v", got.Rows)
	}
}
