package handlers

import (
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// TestProbeDebugStages times /api/debug against a real lake, the way a freshly started serving
// pod meets it: the first pass has an empty call tally, the second reuses it. It runs only when
// ECON_PROBE_ROOT names a lake and asserts nothing — the "stages" log lines are its output.
func TestProbeDebugStages(t *testing.T) {
	root := os.Getenv("ECON_PROBE_ROOT")
	if root == "" {
		t.Skip("ECON_PROBE_ROOT unset")
	}
	ids := strings.Fields(os.Getenv("ECON_PROBE_RECORDS"))
	mux := http.NewServeMux()
	New(store.New(root)).Register(mux)

	get := func(target string) {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
		t.Logf("%d %s  Server-Timing: %s", rec.Code, target, rec.Header().Get("Server-Timing"))
	}
	get("/api/debug/records?q=&run_id=&symptom=")
	for pass := 1; pass <= 2; pass++ {
		t.Logf("--- pass %d", pass)
		for _, id := range ids {
			get("/api/debug?record_id=" + id)
		}
	}
}
