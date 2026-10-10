package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// TestProbeDebugStages times /api/debug against a real lake the way a freshly started serving
// pod meets it, and asserts nothing — the log lines are its output.
func TestProbeDebugStages(t *testing.T) {
	root := os.Getenv("ECON_PROBE_ROOT")
	if root == "" {
		t.Skip("ECON_PROBE_ROOT unset")
	}
	ids := strings.Fields(os.Getenv("ECON_PROBE_RECORDS"))
	h := New(store.New(root))
	mux := http.NewServeMux()
	h.Register(mux)

	get := func(target string) {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil))
		t.Logf("%d %s  Server-Timing: %s", rec.Code, target, rec.Header().Get("Server-Timing"))
	}
	refresh := func(label string) {
		start, before := time.Now(), h.calls.Counted()
		err := h.calls.Refresh(context.Background(), h.lake)
		t.Logf("--- %s refresh: read=%d total=%d took=%s err=%v",
			label, h.calls.Counted()-before, h.calls.Counted(), time.Since(start).Round(time.Millisecond), err)
	}

	get("/api/debug/records?q=&run_id=&symptom=")
	t.Logf("--- before the first count")
	for _, id := range ids {
		get("/api/debug?record_id=" + id)
	}
	refresh("first")
	refresh("warm")
	t.Logf("--- after the first count")
	for _, id := range ids {
		get("/api/debug?record_id=" + id)
	}
}
