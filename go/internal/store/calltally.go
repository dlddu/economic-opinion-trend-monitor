package store

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"hash/fnv"
	"io/fs"
	"os"
	"path/filepath"
	"slices"
	"strings"
	"sync"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// LlmCallTally counts llm_call records per run and call outcome, reading each record file once:
// llm_call objects are written once (put_object refuses a stored key), so a refresh reads only the
// files it has not counted. It keeps an 8-byte name hash per counted file, not the record — the
// serving pod's memory is small and Silver holds hundreds of thousands of calls.
type LlmCallTally struct {
	mu    sync.Mutex
	parts map[string]*callPartition
}

type callPartition struct {
	seen  []uint64 // sorted hashes of the file names already counted
	byRun map[string]map[gen.LlmCallOutcome]int
}

// NewLlmCallTally returns an empty tally; the first Refresh reads every llm_call record.
func NewLlmCallTally() *LlmCallTally {
	return &LlmCallTally{parts: map[string]*callPartition{}}
}

// Refresh counts the llm_call records written since the last refresh. A partition that lost a
// counted file is recounted from scratch rather than trusted. A cancelled refresh keeps what it
// counted so far, so the next one resumes instead of starting over.
func (t *LlmCallTally) Refresh(ctx context.Context, l *Lake) error {
	t.mu.Lock()
	defer t.mu.Unlock()

	root := l.objectDir("silver", "llm_call")
	partitions, err := os.ReadDir(root)
	if errors.Is(err, fs.ErrNotExist) {
		clear(t.parts)
		return nil
	}
	if err != nil {
		return err
	}
	live := make(map[string]bool, len(partitions))
	for _, partition := range partitions {
		if !partition.IsDir() || !strings.Contains(partition.Name(), "=") {
			continue
		}
		live[partition.Name()] = true
		if err := t.refreshPartition(ctx, root, partition.Name()); err != nil {
			return err
		}
	}
	for name := range t.parts {
		if !live[name] {
			delete(t.parts, name)
		}
	}
	return nil
}

func (t *LlmCallTally) refreshPartition(ctx context.Context, root, name string) error {
	dir := filepath.Join(root, name)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	p := t.parts[name]
	if p == nil {
		p = &callPartition{byRun: map[string]map[gen.LlmCallOutcome]int{}}
		t.parts[name] = p
	}

	var fresh []string
	kept := 0
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
			continue
		}
		if _, ok := slices.BinarySearch(p.seen, hashName(entry.Name())); ok {
			kept++
		} else {
			fresh = append(fresh, entry.Name())
		}
	}
	if kept < len(p.seen) {
		p = &callPartition{byRun: map[string]map[gen.LlmCallOutcome]int{}}
		t.parts[name] = p
		return t.refreshPartition(ctx, root, name)
	}

	added := make([]uint64, 0, len(fresh))
	defer func() {
		p.seen = append(p.seen, added...)
		slices.Sort(p.seen)
	}()
	var buf bytes.Buffer
	for _, file := range fresh {
		if err := ctx.Err(); err != nil {
			return err
		}
		err := readInto(&buf, filepath.Join(dir, file))
		if errors.Is(err, fs.ErrNotExist) {
			continue
		}
		if err != nil {
			return err
		}
		var head LlmCallHead
		if err := json.Unmarshal(buf.Bytes(), &head); err != nil {
			return err
		}
		outcomes := p.byRun[head.RunID]
		if outcomes == nil {
			outcomes = map[gen.LlmCallOutcome]int{}
			p.byRun[head.RunID] = outcomes
		}
		outcomes[head.CallOutcome]++
		added = append(added, hashName(file))
	}
	return nil
}

// Run reports how many calls the run made and how many ended in each outcome, as of the last Refresh.
func (t *LlmCallTally) Run(runID string) (made int, outcomes map[string]int) {
	t.mu.Lock()
	defer t.mu.Unlock()
	outcomes = map[string]int{}
	for _, p := range t.parts {
		for outcome, count := range p.byRun[runID] {
			made += count
			outcomes[string(outcome)] += count
		}
	}
	return made, outcomes
}

func hashName(name string) uint64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(name))
	return h.Sum64()
}
