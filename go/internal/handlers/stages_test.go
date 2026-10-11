package handlers

import (
	"bytes"
	"context"
	"database/sql"
	"log"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func captureLog(t *testing.T) *bytes.Buffer {
	t.Helper()
	var buf bytes.Buffer
	prev, flags := log.Writer(), log.Flags()
	log.SetOutput(&buf)
	log.SetFlags(0)
	t.Cleanup(func() { log.SetOutput(prev); log.SetFlags(flags) })
	return &buf
}

func TestStageClockNamesTheStageAnAbortCut(t *testing.T) {
	logs := captureLog(t)
	dir := t.TempDir()
	indexLake(t, dir)
	h := New(store.New(dir))
	ctx, cancel := context.WithCancel(context.Background())
	slow := h.fromIndex(func(w http.ResponseWriter, r *http.Request, _ *sql.DB) error {
		clockOf(r).enter("tally")
		cancel()
		return nil
	})
	slow(httptest.NewRecorder(), httptest.NewRequest(http.MethodGet, "/api/debug?record_id=x", nil).WithContext(ctx))

	line := logs.String()
	if !strings.Contains(line, "outcome=aborted at=tally") || !strings.Contains(line, "record_id=x") {
		t.Fatalf("stage line = %q, want the abort pinned on tally", line)
	}
}

func TestStageClockStampsServerTiming(t *testing.T) {
	captureLog(t)
	dir := t.TempDir()
	indexLake(t, dir)
	h := New(store.New(dir))
	rec := httptest.NewRecorder()
	h.fromIndex(h.debug)(rec, httptest.NewRequest(http.MethodGet, "/api/debug", nil))

	timing := rec.Header().Get("Server-Timing")
	for _, stage := range []string{"open;dur=", "silver;dur="} {
		if !strings.Contains(timing, stage) {
			t.Fatalf("Server-Timing = %q, missing %s", timing, stage)
		}
	}
}
