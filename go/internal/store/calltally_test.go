package store

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"testing"
	"time"
)

func callRecord(id, run, outcome string) string {
	return `{"call_id":"` + id + `","run_id":"` + run + `","prompt_user":"긴 본문","call_outcome":"` + outcome + `"}`
}

func callPath(dir, id string) string {
	return filepath.Join(dir, "silver", "llm_call", "call_id_prefix="+id[:1], id+".json")
}

func wantRun(t *testing.T, tally *LlmCallTally, run string, made int, outcomes map[string]int) {
	t.Helper()
	gotMade, got := tally.Run(run)
	if gotMade != made || len(got) != len(outcomes) {
		t.Fatalf("Run(%s) = %d %v, want %d %v", run, gotMade, got, made, outcomes)
	}
	for name, count := range outcomes {
		if got[name] != count {
			t.Fatalf("Run(%s) = %d %v, want %d %v", run, gotMade, got, made, outcomes)
		}
	}
}

func TestLlmCallTallyCountsPerRunAndOutcome(t *testing.T) {
	dir := t.TempDir()
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", callRecord("a-1", "run-a", "parsed"))
	writeObjectRecord(t, dir, "llm_call", "call_id", "b-2", callRecord("b-2", "run-a", "call_failed"))
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-3", callRecord("a-3", "run-b", "parsed"))
	tally := NewLlmCallTally()
	if err := tally.Refresh(context.Background(), New(dir)); err != nil {
		t.Fatal(err)
	}
	wantRun(t, tally, "run-a", 2, map[string]int{"parsed": 1, "call_failed": 1})
	wantRun(t, tally, "run-b", 1, map[string]int{"parsed": 1})
	wantRun(t, tally, "run-z", 0, map[string]int{})
}

func TestLlmCallTallyReadsOnlyFilesWrittenSinceTheLastRefresh(t *testing.T) {
	dir := t.TempDir()
	lake := New(dir)
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", callRecord("a-1", "run-a", "parsed"))
	tally := NewLlmCallTally()
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatal(err)
	}

	// A counted file is never read again: garbling it must not fail or change the next refresh.
	if err := os.WriteFile(callPath(dir, "a-1"), []byte("not json"), 0o644); err != nil {
		t.Fatal(err)
	}
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-2", callRecord("a-2", "run-a", "call_failed"))
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatalf("a counted file was read again: %v", err)
	}
	wantRun(t, tally, "run-a", 2, map[string]int{"parsed": 1, "call_failed": 1})
}

func TestLlmCallTallyRecountsAPartitionThatLostAFile(t *testing.T) {
	dir := t.TempDir()
	lake := New(dir)
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", callRecord("a-1", "run-a", "parsed"))
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-2", callRecord("a-2", "run-a", "parsed"))
	tally := NewLlmCallTally()
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatal(err)
	}
	if err := os.Remove(callPath(dir, "a-1")); err != nil {
		t.Fatal(err)
	}
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatal(err)
	}
	wantRun(t, tally, "run-a", 1, map[string]int{"parsed": 1})

	if err := os.RemoveAll(filepath.Join(dir, "silver", "llm_call")); err != nil {
		t.Fatal(err)
	}
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatal(err)
	}
	wantRun(t, tally, "run-a", 0, map[string]int{})
}

func TestLlmCallTallyResumesAfterACancelledRefreshWithoutDoubleCounting(t *testing.T) {
	dir := t.TempDir()
	lake := New(dir)
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", callRecord("a-1", "run-a", "parsed"))
	tally := NewLlmCallTally()
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if err := tally.Refresh(ctx, lake); err == nil {
		t.Fatal("a cancelled refresh must report the cancellation")
	}
	wantRun(t, tally, "run-a", 0, map[string]int{})

	for range 2 {
		if err := tally.Refresh(context.Background(), lake); err != nil {
			t.Fatal(err)
		}
	}
	wantRun(t, tally, "run-a", 1, map[string]int{"parsed": 1})
}

func TestLlmCallTallyIsCompleteOnlyAfterAWholeRefresh(t *testing.T) {
	dir := t.TempDir()
	lake := New(dir)
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", callRecord("a-1", "run-a", "parsed"))
	tally := NewLlmCallTally()
	if tally.Complete() {
		t.Fatal("a tally that has read nothing is not complete")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	_ = tally.Refresh(ctx, lake)
	if tally.Complete() {
		t.Fatal("a cancelled first refresh is not complete")
	}
	if err := tally.Refresh(context.Background(), lake); err != nil {
		t.Fatal(err)
	}
	if !tally.Complete() {
		t.Fatal("a finished refresh is complete")
	}
}

func TestLlmCallTallyCountsManyFilesAcrossItsReaders(t *testing.T) {
	dir := t.TempDir()
	const n = 3*tallyApplyEvery + 7
	for i := range n {
		id := fmt.Sprintf("a-%05d", i)
		run, outcome := "run-a", "parsed"
		if i%3 == 0 {
			run, outcome = "run-b", "call_failed"
		}
		writeObjectRecord(t, dir, "llm_call", "call_id", id, callRecord(id, run, outcome))
	}
	tally := NewLlmCallTally()
	if err := tally.Refresh(context.Background(), New(dir)); err != nil {
		t.Fatal(err)
	}
	b := (n + 2) / 3
	wantRun(t, tally, "run-a", n-b, map[string]int{"parsed": n - b})
	wantRun(t, tally, "run-b", b, map[string]int{"call_failed": b})
	if tally.Counted() != n {
		t.Fatalf("Counted = %d, want %d", tally.Counted(), n)
	}
}

func TestLlmCallTallyAnswersWhileARefreshIsReading(t *testing.T) {
	tally := NewLlmCallTally()
	tally.refresh.Lock() // a refresh in the middle of its reads
	defer tally.refresh.Unlock()
	done := make(chan struct{})
	go func() {
		tally.Run("run-a")
		tally.Complete()
		tally.Counted()
		close(done)
	}()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("readers waited for a refresh in progress")
	}
}

func TestLlmCallTallyReportsAnUnreadableRecord(t *testing.T) {
	dir := t.TempDir()
	writeObjectRecord(t, dir, "llm_call", "call_id", "a-1", "not json")
	tally := NewLlmCallTally()
	if err := tally.Refresh(context.Background(), New(dir)); err == nil {
		t.Fatal("a record that does not decode must fail the refresh")
	}
	if tally.Complete() {
		t.Fatal("a failed refresh is not complete")
	}
}

func TestLlmCallTallyRefreshesAlongsideReaders(t *testing.T) {
	dir := t.TempDir()
	for i := range 2 * tallyApplyEvery {
		id := fmt.Sprintf("a-%05d", i)
		writeObjectRecord(t, dir, "llm_call", "call_id", id, callRecord(id, "run-a", "parsed"))
	}
	tally := NewLlmCallTally()
	done := make(chan error)
	go func() { done <- tally.Refresh(context.Background(), New(dir)) }()
	for {
		select {
		case err := <-done:
			if err != nil {
				t.Fatal(err)
			}
			wantRun(t, tally, "run-a", 2*tallyApplyEvery, map[string]int{"parsed": 2 * tallyApplyEvery})
			return
		default:
			if made, _ := tally.Run("run-a"); made > tally.Counted() {
				t.Fatalf("Run saw %d calls with only %d counted", made, tally.Counted())
			}
		}
	}
}
