package handlers

import (
	"database/sql"
	"log"
	"net/http"
)

// indexHandler answers from the serving index the batch publishes, not from a lake scan.
type indexHandler func(w http.ResponseWriter, r *http.Request, db *sql.DB) error

// fromIndex times an index-backed request like a scan, without the scan gate: a query holds a
// few pages, not the lake. Until the batch has published an index it answers 503 index_not_ready.
func (h *Handlers) fromIndex(next indexHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		clock := newStageClock()
		clock.enter("open")
		r = r.WithContext(withStageClock(r.Context(), clock))
		defer clock.report(r)
		tw := &timedWriter{ResponseWriter: w, clock: clock}
		if gone(r) {
			return
		}
		snap, err := h.index.Acquire()
		if err != nil {
			clock.note("index=none")
			writeJSON(tw, http.StatusServiceUnavailable, map[string]string{"error": "index_not_ready"})
			return
		}
		defer snap.Release()
		clock.note("index=%s", snap.Name)
		clock.enter("handler")
		tw.Header().Set("X-Index-Built-At", snap.BuiltAt)
		if err := next(tw, r, snap.DB); err != nil && !gone(r) {
			log.Printf("%s %s: index query: %v", r.Method, r.URL.Path, err)
			if !tw.sent {
				writeJSON(tw, http.StatusInternalServerError, map[string]string{"error": "index_query_failed"})
			}
		}
	}
}
