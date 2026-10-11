package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func TestIndexRoutesWriteNothingForACallerWhoLeft(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir, []string{
		`{"record_id":"r-1","analysis_status":"analyzed","analyzed_at":"2026-09-28T00:05:00Z","analyzer_version":"v1","run_id":"run-1"}`,
	}, nil, nil)
	indexLake(t, dir)
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

func TestContributionListsQueueOneAtATimeAndDropCallersWhoLeave(t *testing.T) {
	h := New(store.New(t.TempDir()))
	ran := make(chan struct{}, 2)
	route := h.oneAtATime(func(w http.ResponseWriter, _ *http.Request, _ *sql.DB) error {
		ran <- struct{}{}
		w.WriteHeader(http.StatusOK)
		return nil
	})

	h.heavy <- struct{}{}
	ctx, cancel := context.WithTimeout(context.Background(), 20*time.Millisecond)
	defer cancel()
	left := httptest.NewRecorder()
	_ = route(left, httptest.NewRequest(http.MethodGet, "/api/contributions", nil).WithContext(ctx), nil)
	if len(ran) != 0 || left.Body.Len() != 0 {
		t.Fatalf("a caller who left while queued must not run: ran=%d", len(ran))
	}

	done := make(chan struct{})
	go func() {
		_ = route(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/contributions", nil), nil)
		close(done)
	}()
	select {
	case <-ran:
		t.Fatal("a second list ran while the first held the slot")
	case <-time.After(20 * time.Millisecond):
	}
	<-h.heavy
	<-done
	if len(ran) != 1 {
		t.Fatalf("the queued list must run once the slot frees: ran=%d", len(ran))
	}
}
