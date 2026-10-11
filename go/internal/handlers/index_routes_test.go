package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

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
