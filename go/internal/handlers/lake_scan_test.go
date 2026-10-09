package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func TestLakeScanRoutesQueueOneAtATimeAndDropCallersWhoLeave(t *testing.T) {
	h := New(store.New(t.TempDir()))
	ran := make(chan struct{}, 2)
	route := h.oneScanAtATime(func(w http.ResponseWriter, _ *http.Request) {
		ran <- struct{}{}
		w.WriteHeader(http.StatusOK)
	})

	h.lakeScan <- struct{}{}

	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	left := httptest.NewRecorder()
	route(left, httptest.NewRequest(http.MethodGet, "/api/debug", nil).WithContext(ctx))
	if len(ran) != 0 || left.Body.Len() != 0 {
		t.Fatalf("a caller who left while queued must not run: ran=%d body=%q", len(ran), left.Body.String())
	}

	done := make(chan struct{})
	go func() {
		route(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/debug", nil))
		close(done)
	}()
	select {
	case <-ran:
		t.Fatal("a second scan ran while the first held the slot")
	case <-time.After(20 * time.Millisecond):
	}
	<-h.lakeScan
	<-done
	if len(ran) != 1 {
		t.Fatalf("the queued scan must run once the slot frees: ran=%d", len(ran))
	}
}

func TestLakeScanRoutesWriteNothingForACallerWhoLeft(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir, []string{
		`{"record_id":"r-1","analysis_status":"analyzed","analyzed_at":"2026-09-28T00:05:00Z","analyzer_version":"v1","run_id":"run-1"}`,
	}, nil, nil)
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)

	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	for _, path := range []string{"/api/debug", "/api/debug/records", "/api/trace", "/api/reprocess", "/api/contributions"} {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil).WithContext(ctx))
		if rec.Body.Len() != 0 {
			t.Errorf("%s answered a caller who left: %q", path, rec.Body.String())
		}
	}
}
