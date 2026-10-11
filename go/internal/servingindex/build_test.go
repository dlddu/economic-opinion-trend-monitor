package servingindex

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func writeFile(t *testing.T, path, body string) {
	t.Helper()
	if err := os.MkdirAll(filepath.Dir(path), 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(path, []byte(body), 0o644); err != nil {
		t.Fatal(err)
	}
}

func writeCall(t *testing.T, root, partition, id, body string) {
	t.Helper()
	writeFile(t, filepath.Join(root, "silver", "llm_call", partition, id+".json"), body)
}

func call(id, run, outcome string) string {
	return `{"call_id":"` + id + `","run_id":"` + run + `","prompt_user":"긴 본문","call_outcome":"` + outcome + `"}`
}

func analysis(record, analyzedAt, run, tail string) string {
	return `{"record_id":"` + record + `","source_url":"https://ex.test/` + record + `","target_countries":["KR"],` +
		`"narrative_subjects":["기준금리"],"analysis_status":"analyzed","confidence":0.8,` +
		`"analyzed_at":"` + analyzedAt + `","analyzer_version":"v1","run_id":"` + run + `"` + tail + `}`
}

func lake(t *testing.T) string {
	t.Helper()
	root := t.TempDir()
	writeFile(t, filepath.Join(root, "silver", "analysis", "year=2026", "month=10", "day=01", "hour=00", "data.jsonl"),
		strings.Join([]string{
			analysis("rec-1", "2026-10-01T00:05:00Z", "run-a", `,"call_id":"call-1"`),
			analysis("rec-2", "2026-10-01T00:06:00Z", "run-a", `,"call_id":"bad-1"`),
			analysis("rec-3", "2026-10-01T00:07:00Z", "run-a", `,"call_id":"call-9"`),
		}, "\n")+"\n")
	writeCall(t, root, "call_id_prefix=c", "call-1", call("call-1", "run-a", "parsed"))
	writeCall(t, root, "call_id_prefix=b", "bad-1", `{"call_id":`)
	// Listed in a partition a lookup by its id never opens: counted for its run, never joined.
	writeCall(t, root, "call_id_prefix=x", "call-9", call("call-9", "run-a", "call_failed"))
	return root
}

func build(t *testing.T, root string, opt Options) Stats {
	t.Helper()
	opt.Scratch = t.TempDir()
	stats, err := Build(context.Background(), root, opt)
	if err != nil {
		t.Fatal(err)
	}
	return stats
}

func openCurrent(t *testing.T, root string) *sql.DB {
	t.Helper()
	snap, err := NewReader(root).Acquire()
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(snap.Release)
	return snap.DB
}

func TestBuildReadsEachCallFileOnceAcrossBuilds(t *testing.T) {
	root := lake(t)
	first := build(t, root, Options{})
	if first.CallFiles != 3 || first.CallsRead != 3 || first.CallsReused != 0 || first.CallsUndecoded != 1 {
		t.Fatalf("first build = %+v, want every file read once", first)
	}

	writeCall(t, root, "call_id_prefix=c", "call-2", call("call-2", "run-b", "parsed"))
	if err := os.Remove(filepath.Join(root, "silver", "llm_call", "call_id_prefix=c", "call-1.json")); err != nil {
		t.Fatal(err)
	}
	second := build(t, root, Options{})
	if second.CallFiles != 3 || second.CallsReused != 2 || second.CallsRead != 1 || second.CallsUndecoded != 0 {
		t.Fatalf("second build = %+v, want the two kept files reused and only the new one read", second)
	}

	db := openCurrent(t, root)
	var paths []string
	rows, err := db.Query("SELECT path || ':' || decoded FROM llm_call_file ORDER BY path")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var p string
		if err := rows.Scan(&p); err != nil {
			t.Fatal(err)
		}
		paths = append(paths, p)
	}
	want := "call_id_prefix=b/bad-1.json:0,call_id_prefix=c/call-2.json:1,call_id_prefix=x/call-9.json:1"
	if got := strings.Join(paths, ","); got != want {
		t.Fatalf("llm_call_file = %s, want %s (a deleted file leaves no row)", got, want)
	}
}

func TestBuildJoinsOnlyTheCallFileALookupWouldOpen(t *testing.T) {
	root := lake(t)
	build(t, root, Options{})
	db := openCurrent(t, root)

	got := map[string]string{}
	rows, err := db.Query("SELECT record_id, exchange_state || '/' || coalesce(call_outcome, '-') FROM record_latest")
	if err != nil {
		t.Fatal(err)
	}
	defer rows.Close()
	for rows.Next() {
		var id, state string
		if err := rows.Scan(&id, &state); err != nil {
			t.Fatal(err)
		}
		got[id] = state
	}
	want := map[string]string{"rec-1": "call/parsed", "rec-2": "call-record-absent/-", "rec-3": "call-record-absent/-"}
	for id, state := range want {
		if got[id] != state {
			t.Errorf("%s = %q, want %q", id, got[id], state)
		}
	}

	var calls int
	if err := db.QueryRow("SELECT sum(calls) FROM run_call WHERE run_id = 'run-a'").Scan(&calls); err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Errorf("run-a calls = %d, want 2 — every decoded file counts, the undecoded one does not", calls)
	}
}

func TestBuildKeepsAReplacedIndexForTheGracePeriodAfterItWasReplaced(t *testing.T) {
	root := lake(t)
	clock := time.Date(2026, 10, 1, 0, 0, 0, 0, time.UTC)
	now := func() time.Time { return clock }
	dir := filepath.Join(root, Dir)
	first := build(t, root, Options{now: now, Grace: time.Hour})
	writeFile(t, filepath.Join(dir, "notes.txt"), "not ours")
	// Published long before it is replaced: the grace counts from the replacement, not from this.
	long := clock.Add(-24 * time.Hour)
	if err := os.Chtimes(filepath.Join(dir, first.Name), long, long); err != nil {
		t.Fatal(err)
	}

	second := build(t, root, Options{now: now, Grace: time.Hour})
	if _, err := os.Stat(filepath.Join(dir, first.Name)); err != nil {
		t.Fatalf("an index replaced just now must stay for its readers: %v", err)
	}

	clock = clock.Add(90 * time.Minute)
	third := build(t, root, Options{now: now, Grace: time.Hour})
	left := map[string]bool{}
	entries, err := os.ReadDir(dir)
	if err != nil {
		t.Fatal(err)
	}
	for _, e := range entries {
		left[e.Name()] = true
	}
	if left[first.Name] {
		t.Errorf("an index replaced longer than the grace ago must go: %v", left)
	}
	for _, keep := range []string{second.Name, third.Name, "notes.txt", pointerName} {
		if !left[keep] {
			t.Errorf("%s must stay: %v", keep, left)
		}
	}
	if name, err := readPointer(dir); err != nil || name != third.Name {
		t.Errorf("pointer = %s %v, want the newest build %s", name, err, third.Name)
	}
}

func TestReaderOpensAnIndexUnderARelativeRoot(t *testing.T) {
	root := lake(t)
	build(t, root, Options{})
	wd, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	rel, err := filepath.Rel(wd, root)
	if err != nil {
		t.Fatal(err)
	}
	snap, err := NewReader(rel).Acquire()
	if err != nil {
		t.Fatalf("relative root %s: %v", rel, err)
	}
	snap.Release()
	if stats := build(t, rel, Options{}); stats.CallsReused != 3 {
		t.Fatalf("a build under a relative root must still reuse the previous index: %+v", stats)
	}
}

func TestReaderMovesToANewerIndexAndClosesTheOldOnceReleased(t *testing.T) {
	root := lake(t)
	first := build(t, root, Options{})
	r := NewReader(root)
	clock := time.Now()
	r.now = func() time.Time { return clock }

	held, err := r.Acquire()
	if err != nil || held.Name != first.Name {
		t.Fatalf("acquire = %v %v", held, err)
	}
	second := build(t, root, Options{})

	same, _ := r.Acquire()
	if same.Name != first.Name {
		t.Errorf("within the recheck interval the reader keeps its index: %s", same.Name)
	}
	same.Release()

	clock = clock.Add(recheckEvery)
	next, err := r.Acquire()
	if err != nil || next.Name != second.Name {
		t.Fatalf("after the interval the reader must move to %s: %v %v", second.Name, next, err)
	}
	defer next.Release()
	if err := held.DB.Ping(); err != nil {
		t.Fatalf("a held snapshot must stay open: %v", err)
	}
	held.Release()
	if err := held.DB.Ping(); err == nil {
		t.Fatal("the replaced index must close once its last holder releases it")
	}
}

func TestReaderIsNotReadyWithoutAnIndexOfItsVersion(t *testing.T) {
	root := lake(t)
	if _, err := NewReader(root).Acquire(); !errors.Is(err, ErrNotReady) {
		t.Fatalf("no index: err = %v, want ErrNotReady", err)
	}

	build(t, root, Options{})
	dir := filepath.Join(root, Dir)
	name, _ := readPointer(dir)
	db, err := sql.Open("sqlite", "file:"+filepath.Join(dir, name))
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec("UPDATE meta SET value = '0' WHERE key = 'schema_version'"); err != nil {
		t.Fatal(err)
	}
	db.Close()
	if _, err := NewReader(root).Acquire(); !errors.Is(err, ErrNotReady) {
		t.Fatalf("an index of another version: err = %v, want ErrNotReady", err)
	}
	if stats := build(t, root, Options{}); stats.CallsReused != 0 || stats.CallsRead != 3 {
		t.Fatalf("build over an index of another version = %+v", stats)
	}
}
