package handlers

import (
	"io"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// goldQueries are the Gold screens' requests the differential below replays, across axes, units,
// a bucket no axis has and a subject Gold does not know.
func goldQueries() []string {
	var out []string
	for _, axis := range []string{"KR", "US", "GLOBAL"} {
		q := "?axis=" + axis
		out = append(out,
			"/api/dashboard"+q, "/api/dashboard"+q+"&unit=hour", "/api/dashboard"+q+"&unit=week&range=30d",
			"/api/dashboard"+q+"&unit=hour&range=24h",
			"/api/trend"+q, "/api/trend"+q+"&subject=%EC%97%86%EC%9D%8C",
			"/api/sentiment"+q, "/api/fairness"+q,
			"/api/source-contributions"+q, "/api/source-contributions"+q+"&unit=day",
			"/api/source-contributions"+q+"&unit=week&time_bucket=2026-W26",
			"/api/source-contributions"+q+"&time_bucket=1999-01-01T00",
		)
	}
	return append(out, "/api/compare", "/api/dashboard?axis=ALL", "/api/trend?axis=ALL")
}

func serveGold(t *testing.T, dir, path string) (body, source string) {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	raw, _ := io.ReadAll(rec.Body)
	if rec.Code != http.StatusOK {
		t.Fatalf("%s: status %d %s", path, rec.Code, raw)
	}
	return string(raw), rec.Header().Get("X-Gold-Source")
}

// Every Gold screen answers the same from the index's copy of Gold as from the files, on every
// Gold fixture the screen tests use: the index is a faster way to the same answer, not a second one.
func TestGoldScreensAnswerTheSameFromTheIndexAsFromTheFiles(t *testing.T) {
	fixtures := map[string]func(*testing.T, string){
		"empty":                func(*testing.T, string) {},
		"multi-bucket":         writeMultiBucketGold,
		"trend":                writeTrendGold,
		"mixed-unit-sentiment": writeMixedUnitSentiment,
		"rolled-up":            writeRolledUpGold,
		"skewed":               writeSkewedGold,
		"daily":                writeDailyGold,
		"source-contributions": writeSourceContributionGold,
		"contributions":        writeContributionLake,
	}
	for name, write := range fixtures {
		t.Run(name, func(t *testing.T) {
			dir := t.TempDir()
			write(t, dir)
			fromFiles := map[string]string{}
			for _, path := range goldQueries() {
				body, source := serveGold(t, dir, path)
				if source != "lake" {
					t.Fatalf("%s: with no index the screen must read the files, read %q", path, source)
				}
				fromFiles[path] = body
			}
			indexLake(t, dir)
			for _, path := range goldQueries() {
				body, source := serveGold(t, dir, path)
				if source != "index" {
					t.Fatalf("%s: with an index the screen must read it, read %q", path, source)
				}
				if body != fromFiles[path] {
					t.Errorf("%s:\n files: %s\n index: %s", path, fromFiles[path], body)
				}
			}
		})
	}
}
