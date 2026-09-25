package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// The debug route exists so the screen can be routed and navigated to, but it
// must not pretend: until the run and call records exist it says it is a stub
// and returns no runs or calls.
func TestDebugIsAnHonestStubUntilRunAndCallRecordsExist(t *testing.T) {
	mux := http.NewServeMux()
	New(store.New(t.TempDir())).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/debug")
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
	if !strings.HasPrefix(got.Stub, "stub:") || got.Available {
		t.Fatalf("debug must declare itself a stub, got %+v", got)
	}
	if len(got.Runs) != 0 || len(got.Calls) != 0 {
		t.Fatalf("debug must not fabricate records, got runs=%d calls=%d", len(got.Runs), len(got.Calls))
	}
	// Honest in the other direction too: batch run records landed with AC4.1, so the
	// stub may no longer name run_record among what is missing.
	for _, missing := range got.Missing {
		if missing == "run_record" {
			t.Fatalf("run_record exists since AC4.1 — missing must not still claim it: %v", got.Missing)
		}
	}
	if len(got.Missing) == 0 {
		t.Fatal("the stub must still name what it is waiting for (AC4.2-AC4.3)")
	}
}
