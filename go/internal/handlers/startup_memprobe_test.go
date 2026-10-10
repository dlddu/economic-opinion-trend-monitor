package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"runtime/metrics"
	"strconv"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// TestProbeStartupMemory measures a cold serving pod's first minutes against a real lake: the
// background call tally starts with the process while the browser asks for the record list and
// a record's detail at once, then two more picks. It reports the peak RSS and Go heap over that
// span. It runs only when ECON_PROBE_ROOT names a lake and asserts nothing.
func TestProbeStartupMemory(t *testing.T) {
	root := os.Getenv("ECON_PROBE_ROOT")
	if root == "" {
		t.Skip("ECON_PROBE_ROOT unset")
	}
	ids := strings.Fields(os.Getenv("ECON_PROBE_RECORDS"))
	h := New(store.New(root))
	mux := http.NewServeMux()
	h.Register(mux)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	samples := []metrics.Sample{
		{Name: "/memory/classes/heap/objects:bytes"},
		{Name: "/memory/classes/total:bytes"},
	}
	var mu sync.Mutex
	var peakRSS, peakHeap, peakGo uint64
	var peakAt time.Duration
	start := time.Now()
	sampling := make(chan struct{})
	sampled := make(chan struct{})
	go func() {
		defer close(sampled)
		tick := time.NewTicker(50 * time.Millisecond)
		defer tick.Stop()
		last := time.Now()
		for {
			select {
			case <-sampling:
				return
			case <-tick.C:
			}
			metrics.Read(samples)
			heap, total, rss := samples[0].Value.Uint64(), samples[1].Value.Uint64(), residentBytes()
			mu.Lock()
			if rss > peakRSS {
				peakRSS, peakAt = rss, time.Since(start)
			}
			peakHeap, peakGo = max(peakHeap, heap), max(peakGo, total)
			mu.Unlock()
			if time.Since(last) >= 5*time.Second {
				last = time.Now()
				t.Logf("t=%5.1fs rss=%dMiB heap=%dMiB go=%dMiB tally=%d complete=%t",
					time.Since(start).Seconds(), rss>>20, heap>>20, total>>20, h.calls.Counted(), h.calls.Complete())
			}
		}
	}()

	go h.KeepCallTally(ctx, time.Hour)
	get := func(target string) {
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, target, nil).WithContext(ctx))
		t.Logf("t=%5.1fs %d %s", time.Since(start).Seconds(), rec.Code, target)
	}
	var opened sync.WaitGroup
	opened.Add(1)
	go func() {
		defer opened.Done()
		get("/api/debug/records?q=&run_id=&symptom=")
	}()
	if len(ids) > 0 {
		get("/api/debug?record_id=" + ids[0])
	}
	opened.Wait()
	for _, id := range ids[min(1, len(ids)):] {
		get("/api/debug?record_id=" + id)
	}
	for deadline := time.Now().Add(15 * time.Minute); !h.calls.Complete() && time.Now().Before(deadline); {
		time.Sleep(200 * time.Millisecond)
	}
	close(sampling)
	<-sampled
	t.Logf("PEAK rss=%dMiB (at %.1fs) heap=%dMiB go=%dMiB · tally complete=%t total=%d after %.1fs",
		peakRSS>>20, peakAt.Seconds(), peakHeap>>20, peakGo>>20, h.calls.Complete(), h.calls.Counted(), time.Since(start).Seconds())
}

func residentBytes() uint64 {
	raw, err := os.ReadFile("/proc/self/statm")
	if err != nil {
		return 0
	}
	fields := strings.Fields(string(raw))
	if len(fields) < 2 {
		return 0
	}
	pages, _ := strconv.ParseUint(fields[1], 10, 64)
	return pages * uint64(os.Getpagesize())
}
