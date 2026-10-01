package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/argo"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

type fakeAPIServer struct {
	t            *testing.T
	templateCode int
	created      []map[string]any
	srv          *httptest.Server
}

func newFakeAPIServer(t *testing.T) *fakeAPIServer {
	t.Helper()
	f := &fakeAPIServer{t: t, templateCode: http.StatusOK}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /apis/argoproj.io/v1alpha1/namespaces/econ-monitor/workflowtemplates/econ-batch-pipeline",
		func(w http.ResponseWriter, r *http.Request) {
			if r.Header.Get("Authorization") != "Bearer tok" {
				w.WriteHeader(http.StatusUnauthorized)
				return
			}
			w.WriteHeader(f.templateCode)
			_, _ = w.Write([]byte(`{"kind":"Status","message":"workflowtemplates.argoproj.io \"econ-batch-pipeline\" is forbidden"}`))
		})
	mux.HandleFunc("POST /apis/argoproj.io/v1alpha1/namespaces/econ-monitor/workflows",
		func(w http.ResponseWriter, r *http.Request) {
			var wf map[string]any
			if err := json.NewDecoder(r.Body).Decode(&wf); err != nil {
				t.Fatal(err)
			}
			meta := wf["metadata"].(map[string]any)
			meta["name"] = meta["generateName"].(string) + "abc12"
			// One second apart, the way the API server's second-resolution
			// timestamps would separate two real submissions.
			meta["creationTimestamp"] = reprocessNow.Add(time.Duration(len(f.created)) * time.Second).Format(time.RFC3339)
			wf["status"] = map[string]any{"phase": "Pending"}
			f.created = append(f.created, wf)
			w.WriteHeader(http.StatusCreated)
			_ = json.NewEncoder(w).Encode(wf)
		})
	mux.HandleFunc("GET /apis/argoproj.io/v1alpha1/namespaces/econ-monitor/workflows",
		func(w http.ResponseWriter, r *http.Request) {
			if !strings.Contains(r.URL.RawQuery, "labelSelector=econ-monitor%2Freprocess%3Dtrue") &&
				!strings.Contains(r.URL.RawQuery, "labelSelector=econ-monitor/reprocess%3Dtrue") {
				t.Errorf("list without the reprocess label selector: %s", r.URL.RawQuery)
			}
			_ = json.NewEncoder(w).Encode(map[string]any{"items": f.created})
		})
	f.srv = httptest.NewServer(mux)
	t.Cleanup(f.srv.Close)
	return f
}

func (f *fakeAPIServer) client() *argo.Client {
	return argo.New(f.srv.URL, "econ-monitor", "tok")
}

func (f *fakeAPIServer) lastParams() (string, map[string]string) {
	f.t.Helper()
	if len(f.created) == 0 {
		f.t.Fatal("nothing was submitted")
	}
	wf := f.created[len(f.created)-1]
	spec := wf["spec"].(map[string]any)
	params := map[string]string{}
	for _, p := range spec["arguments"].(map[string]any)["parameters"].([]any) {
		kv := p.(map[string]any)
		params[kv["name"].(string)] = kv["value"].(string)
	}
	return spec["entrypoint"].(string), params
}

func triggerServer(t *testing.T, dir string, c *argo.Client) *httptest.Server {
	t.Helper()
	mux := http.NewServeMux()
	h := New(store.New(dir))
	h.now = func() time.Time { return reprocessNow }
	if c != nil {
		h.WithArgo(c)
	}
	h.Register(mux)
	srv := httptest.NewServer(mux)
	t.Cleanup(srv.Close)
	return srv
}

func post(t *testing.T, url, body string) (int, map[string]any) {
	t.Helper()
	resp, err := http.Post(url, "application/json", strings.NewReader(body))
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	raw, _ := io.ReadAll(resp.Body)
	var out map[string]any
	_ = json.Unmarshal(raw, &out)
	return resp.StatusCode, out
}

func seedDecisions(t *testing.T, dir string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Join(dir, "silver"), 0o755); err != nil {
		t.Fatal(err)
	}
	log := `{"decided_at":"2026-09-21T09:00:00+00:00","decision":"publish","analyzer_version":"llm-v2","memo":"의도한 개선","notify_consumer":true}` + "\n" +
		`{"decided_at":"2026-09-21T10:00:00+00:00","decision":"rollback","analyzer_version":"llm-v1","memo":"설명되지 않는 변화","notify_consumer":false}` + "\n"
	if err := os.WriteFile(filepath.Join(dir, "silver", "reprocess_decision.jsonl"), []byte(log), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestReprocessTriggerIsUnavailableOutsideACluster(t *testing.T) {
	dir := t.TempDir()
	seedDecisions(t, dir)
	out := getReprocess(t, dir, "")
	if out.Trigger.Available {
		t.Fatal("no argo client, yet the trigger says available")
	}
	if !strings.Contains(out.Trigger.Note, "클러스터 밖") {
		t.Fatalf("note = %q", out.Trigger.Note)
	}
	// The decision log is a lake read, so it is reported either way.
	if out.Trigger.ServingVersion != "llm-v1" || len(out.Trigger.Decisions) != 2 {
		t.Fatalf("serving_version=%q decisions=%d", out.Trigger.ServingVersion, len(out.Trigger.Decisions))
	}
	srv := triggerServer(t, dir, nil)
	code, body := post(t, srv.URL+"/api/reprocess/run", `{"range":"7d","axis":"KR","analyzer_version":"llm-v2"}`)
	if code != http.StatusServiceUnavailable || body["error"] == "" {
		t.Fatalf("POST without wiring: %d %v", code, body)
	}
}

func TestReprocessTriggerProbesTheTemplateAndReportsRBAC(t *testing.T) {
	api := newFakeAPIServer(t)
	api.templateCode = http.StatusForbidden
	srv := triggerServer(t, t.TempDir(), api.client())
	resp, err := http.Get(srv.URL + "/api/reprocess")
	if err != nil {
		t.Fatal(err)
	}
	var out reprocessResponse
	_ = json.NewDecoder(resp.Body).Decode(&out)
	resp.Body.Close()
	if out.Trigger.Available || !strings.Contains(out.Trigger.Note, "403") {
		t.Fatalf("available=%v note=%q", out.Trigger.Available, out.Trigger.Note)
	}
	code, body := post(t, srv.URL+"/api/reprocess/sample",
		`{"range":"24h","axis":"KR","analyzer_version":"llm-v2","sample_size":50,"sample_mode":"random"}`)
	if code != http.StatusServiceUnavailable {
		t.Fatalf("POST behind a failed probe: %d %v", code, body)
	}
	if len(api.created) != 0 {
		t.Fatal("a workflow was submitted despite the failed probe")
	}
}

func TestReprocessSampleAndRunSubmitScopedWorkflows(t *testing.T) {
	api := newFakeAPIServer(t)
	srv := triggerServer(t, t.TempDir(), api.client())

	code, body := post(t, srv.URL+"/api/reprocess/sample",
		`{"range":"24h","axis":"US","source":"wsj","analyzer_version":"llm-v2","sample_size":50,"sample_mode":"recent"}`)
	if code != http.StatusAccepted {
		t.Fatalf("sample: %d %v", code, body)
	}
	entry, params := api.lastParams()
	if entry != "reprocess" {
		t.Fatalf("entrypoint = %q", entry)
	}
	want := map[string]string{
		"version": "llm-v2", "since": reprocessNow.Add(-24 * time.Hour).Format(time.RFC3339),
		"axis": "US", "source": "wsj", "sample": "50", "sample_mode": "recent", "batch": "100",
	}
	for k, v := range want {
		if params[k] != v {
			t.Errorf("param %s = %q, want %q", k, params[k], v)
		}
	}
	run := body["run"].(map[string]any)
	if run["kind"] != "sample" || run["phase"] != "Pending" || !strings.HasPrefix(run["name"].(string), "econ-reprocess-sample-") {
		t.Fatalf("run = %v", run)
	}

	code, _ = post(t, srv.URL+"/api/reprocess/run",
		`{"range":"30d","axis":"KR","analyzer_version":"llm-v2","batch_size":250}`)
	if code != http.StatusAccepted {
		t.Fatalf("run: %d", code)
	}
	_, params = api.lastParams()
	if params["sample"] != "0" || params["batch"] != "250" || params["since"] != reprocessNow.Add(-30*24*time.Hour).Format(time.RFC3339) {
		t.Fatalf("run params = %v", params)
	}

	// Both runs are listed, newest first, on the read side and the polling route.
	resp, err := http.Get(srv.URL + "/api/reprocess/runs")
	if err != nil {
		t.Fatal(err)
	}
	var listed struct{ Runs []argo.Run }
	_ = json.NewDecoder(resp.Body).Decode(&listed)
	resp.Body.Close()
	if len(listed.Runs) != 2 || listed.Runs[0].Kind != "run" || listed.Runs[1].Kind != "sample" {
		t.Fatalf("runs = %+v", listed.Runs)
	}
}

func TestReprocessRefusesAnUnusableScope(t *testing.T) {
	api := newFakeAPIServer(t)
	srv := triggerServer(t, t.TempDir(), api.client())
	for _, body := range []string{
		`{"range":"1y","axis":"KR","analyzer_version":"v2","sample_size":10,"sample_mode":"random"}`,
		`{"range":"7d","axis":"EU","analyzer_version":"v2","sample_size":10,"sample_mode":"random"}`,
		`{"range":"7d","axis":"KR","analyzer_version":" ","sample_size":10,"sample_mode":"random"}`,
		`{"range":"7d","axis":"KR","analyzer_version":"v2","sample_size":0,"sample_mode":"random"}`,
		`{"range":"7d","axis":"KR","analyzer_version":"v2","sample_size":10,"sample_mode":"touched"}`,
		`{"range":"7d","axis":"KR","analyzer_version":"v2","sample_size":10,"sample_mode":"random","bogus":1}`,
	} {
		if code, _ := post(t, srv.URL+"/api/reprocess/sample", body); code != http.StatusBadRequest {
			t.Errorf("%s -> %d, want 400", body, code)
		}
	}
	if len(api.created) != 0 {
		t.Fatal("a refused request still submitted a workflow")
	}
}

func TestReprocessPublishRecordsADecisionThroughTheBatch(t *testing.T) {
	api := newFakeAPIServer(t)
	srv := triggerServer(t, t.TempDir(), api.client())

	code, body := post(t, srv.URL+"/api/reprocess/publish", `{"decision":"publish","analyzer_version":"llm-v2","memo":"  "}`)
	if code != http.StatusBadRequest || !strings.Contains(body["error"].(string), "결정 근거") {
		t.Fatalf("memo-less publish: %d %v", code, body)
	}
	code, body = post(t, srv.URL+"/api/reprocess/publish", `{"decision":"keep","analyzer_version":"llm-v2","memo":"x"}`)
	if code != http.StatusBadRequest || !strings.Contains(body["error"].(string), "반영할지 되돌릴지") {
		t.Fatalf("undecided publish: %d %v", code, body)
	}
	if len(api.created) != 0 {
		t.Fatal("a refused decision still submitted a workflow")
	}

	code, body = post(t, srv.URL+"/api/reprocess/publish",
		`{"decision":"rollback","analyzer_version":"llm-v1","memo":"설명되지 않는 변화가 남았다","notify_consumer":false}`)
	if code != http.StatusAccepted {
		t.Fatalf("rollback: %d %v", code, body)
	}
	entry, params := api.lastParams()
	if entry != "publish" || params["decision"] != "rollback" || params["version"] != "llm-v1" ||
		params["memo"] != "설명되지 않는 변화가 남았다" || params["notify"] != "false" {
		t.Fatalf("entrypoint=%q params=%v", entry, params)
	}
}
