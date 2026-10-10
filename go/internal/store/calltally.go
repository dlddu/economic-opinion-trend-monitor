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
//
// A first count reads every record (232 k files took 16 min one by one on the prod EFS volume),
// so Refresh belongs off the request path: it reads in parallel and holds mu only to apply what
// it read, and readers ask Complete before trusting the counts.
type LlmCallTally struct {
	refresh  sync.Mutex // one Refresh at a time; the only writer of callPartition.seen
	mu       sync.Mutex
	parts    map[string]*callPartition
	complete bool
}

type callPartition struct {
	seen  []uint64 // hashes of the file names already counted, sorted between refreshes
	byRun map[string]map[gen.LlmCallOutcome]int
}

func newCallPartition() *callPartition {
	return &callPartition{byRun: map[string]map[gen.LlmCallOutcome]int{}}
}

// tallyReaders is how many record files a refresh reads at once. Each read is one network
// round trip on EFS, so the count goes as fast as the round trips overlap, not as the CPU.
const tallyReaders = 16

// tallyApplyEvery is how many reads a refresh gathers before it takes mu to apply them.
const tallyApplyEvery = 1024

// NewLlmCallTally returns an empty tally; the first Refresh reads every llm_call record.
func NewLlmCallTally() *LlmCallTally {
	return &LlmCallTally{parts: map[string]*callPartition{}}
}

// Refresh counts the llm_call records written since the last refresh.
func (t *LlmCallTally) Refresh(ctx context.Context, l *Lake) error {
	t.refresh.Lock()
	defer t.refresh.Unlock()

	root := l.objectDir("silver", "llm_call")
	partitions, err := os.ReadDir(root)
	if errors.Is(err, fs.ErrNotExist) {
		t.mu.Lock()
		clear(t.parts)
		t.complete = true
		t.mu.Unlock()
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
	t.mu.Lock()
	defer t.mu.Unlock()
	for name := range t.parts {
		if !live[name] {
			delete(t.parts, name)
		}
	}
	t.complete = true
	return nil
}

func (t *LlmCallTally) refreshPartition(ctx context.Context, root, name string) error {
	dir := filepath.Join(root, name)
	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}
	t.mu.Lock()
	p := t.parts[name]
	if p == nil {
		p = newCallPartition()
		t.parts[name] = p
	}
	t.mu.Unlock()

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
		// A counted file is gone, so its counts are in byRun with no way to take them out.
		// Recount aside and swap, so readers keep the old counts until the new ones are whole.
		next := newCallPartition()
		var all []string
		for _, entry := range entries {
			if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".json") {
				all = append(all, entry.Name())
			}
		}
		if err := t.count(ctx, next, dir, all); err != nil {
			return err
		}
		t.mu.Lock()
		t.parts[name] = next
		t.mu.Unlock()
		return nil
	}
	return t.count(ctx, p, dir, fresh)
}

type countedCall struct {
	name uint64
	head LlmCallHead
}

// count reads files into p, applying every tallyApplyEvery reads, so a cancelled count keeps
// what it read and the next refresh resumes after it.
func (t *LlmCallTally) count(ctx context.Context, p *callPartition, dir string, files []string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	reading, stop := context.WithCancel(ctx)
	defer stop()

	names := make(chan string)
	read := make(chan countedCall, tallyReaders)
	failed := make(chan error, 1)
	go func() {
		defer close(names)
		for _, file := range files {
			select {
			case names <- file:
			case <-reading.Done():
				return
			}
		}
	}()
	var readers sync.WaitGroup
	for range tallyReaders {
		readers.Add(1)
		go func() {
			defer readers.Done()
			var buf bytes.Buffer
			for file := range names {
				if reading.Err() != nil {
					return
				}
				head, err := readCallHead(&buf, filepath.Join(dir, file))
				if errors.Is(err, fs.ErrNotExist) {
					continue
				}
				if err != nil {
					select {
					case failed <- err:
					default:
					}
					stop()
					return
				}
				select {
				case read <- countedCall{hashName(file), head}:
				case <-reading.Done():
					return
				}
			}
		}()
	}
	go func() {
		readers.Wait()
		close(read)
	}()

	batch := make([]countedCall, 0, tallyApplyEvery)
	apply := func() {
		t.mu.Lock()
		defer t.mu.Unlock()
		for _, c := range batch {
			outcomes := p.byRun[c.head.RunID]
			if outcomes == nil {
				outcomes = map[gen.LlmCallOutcome]int{}
				p.byRun[c.head.RunID] = outcomes
			}
			outcomes[c.head.CallOutcome]++
			p.seen = append(p.seen, c.name)
		}
		batch = batch[:0]
	}
	for c := range read {
		batch = append(batch, c)
		if len(batch) == tallyApplyEvery {
			apply()
		}
	}
	apply()
	t.mu.Lock()
	slices.Sort(p.seen)
	t.mu.Unlock()

	select {
	case err := <-failed:
		return err
	default:
	}
	return ctx.Err()
}

func readCallHead(buf *bytes.Buffer, path string) (LlmCallHead, error) {
	var head LlmCallHead
	if err := readInto(buf, path); err != nil {
		return head, err
	}
	err := json.Unmarshal(buf.Bytes(), &head)
	return head, err
}

// Complete reports whether a refresh has counted every llm_call record at least once. Until it
// has, Run's counts are a part of the whole.
func (t *LlmCallTally) Complete() bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return t.complete
}

// Counted reports how many llm_call record files the tally has read so far.
func (t *LlmCallTally) Counted() int {
	t.mu.Lock()
	defer t.mu.Unlock()
	n := 0
	for _, p := range t.parts {
		n += len(p.seen)
	}
	return n
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
