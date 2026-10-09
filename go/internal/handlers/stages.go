package handlers

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"
)

// stageClock times the stages of one lake-scanning request. It reports them twice: as a
// Server-Timing header the browser shows beside the request, and as one log line written even
// when the client gave up — the line names the stage the abort cut short, which is what a
// request cut at the proxy's timeout otherwise leaves blank.
//
// A nil clock is a no-op, so handlers called without the scan gate (unit tests) need no setup.
type stageClock struct {
	start   time.Time
	at      time.Time
	current string
	done    []stageSpan
	notes   []string
}

type stageSpan struct {
	name string
	took time.Duration
}

type stageClockKey struct{}

func newStageClock() *stageClock {
	now := time.Now()
	return &stageClock{start: now, at: now}
}

func withStageClock(ctx context.Context, c *stageClock) context.Context {
	return context.WithValue(ctx, stageClockKey{}, c)
}

func clockOf(r *http.Request) *stageClock {
	c, _ := r.Context().Value(stageClockKey{}).(*stageClock)
	return c
}

// enter closes the running stage and starts the named one.
func (c *stageClock) enter(name string) {
	if c == nil {
		return
	}
	c.close()
	c.current = name
	c.at = time.Now()
}

func (c *stageClock) close() {
	if c == nil || c.current == "" {
		return
	}
	c.done = append(c.done, stageSpan{c.current, time.Since(c.at)})
	c.current = ""
}

// note attaches a count to the log line (rows scanned, files read), which turns a slow stage
// into a reason: the same 20 s means one thing over 2 k files and another over 200 k.
func (c *stageClock) note(format string, args ...any) {
	if c == nil {
		return
	}
	c.notes = append(c.notes, fmt.Sprintf(format, args...))
}

func (c *stageClock) serverTiming() string {
	parts := make([]string, 0, len(c.done))
	for _, s := range c.done {
		parts = append(parts, fmt.Sprintf("%s;dur=%.1f", s.name, float64(s.took.Microseconds())/1000))
	}
	return strings.Join(parts, ", ")
}

func (c *stageClock) report(r *http.Request) {
	cutAt := c.current
	c.close()
	outcome := "ok"
	if r.Context().Err() != nil {
		outcome = "aborted at=" + cutAt
	}
	var b strings.Builder
	fmt.Fprintf(&b, "stages %s %s", r.Method, r.URL.RequestURI())
	fmt.Fprintf(&b, " outcome=%s total=%dms", outcome, time.Since(c.start).Milliseconds())
	for _, s := range c.done {
		fmt.Fprintf(&b, " %s=%dms", s.name, s.took.Milliseconds())
	}
	for _, n := range c.notes {
		b.WriteString(" " + n)
	}
	log.Print(b.String())
}

// timedWriter stamps Server-Timing on the response as the header goes out, closing the stage
// that was running; the encode that follows is timed as its own "write" stage.
type timedWriter struct {
	http.ResponseWriter
	clock *stageClock
	sent  bool
}

func (w *timedWriter) WriteHeader(code int) {
	if !w.sent {
		w.sent = true
		w.clock.close()
		w.Header().Set("Server-Timing", w.clock.serverTiming())
		w.clock.enter("write")
	}
	w.ResponseWriter.WriteHeader(code)
}

func (w *timedWriter) Write(b []byte) (int, error) {
	if !w.sent {
		w.WriteHeader(http.StatusOK)
	}
	return w.ResponseWriter.Write(b)
}
