// Package store reads data-lake datasets from the local filesystem.
//
// Record datasets are JSONL files and object datasets are one file per record;
// this reader is the Go counterpart of econ_core.storage.LocalFsStore on the
// Python side.
package store

import (
	"bufio"
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// Lake is a local-filesystem view of the data lake rooted at Root.
type Lake struct {
	Root string
}

// New returns a Lake rooted at the given data directory.
func New(root string) *Lake { return &Lake{Root: root} }

func (l *Lake) path(layer, dataset string) string {
	return filepath.Join(l.Root, layer, dataset+".jsonl")
}

func (l *Lake) objectDir(layer, dataset string) string {
	return filepath.Join(l.Root, layer, dataset)
}

// objectPartitionChars mirrors econ_core.storage.OBJECT_PARTITION_CHARS.
const objectPartitionChars = 1

func (l *Lake) objectPath(layer, dataset, keyField, key string) (path string, ok bool) {
	if key == "" || strings.HasPrefix(key, ".") || strings.ContainsAny(key, `/\`) {
		return "", false
	}
	prefix := key[:min(objectPartitionChars, len(key))]
	partition := keyField + "_prefix=" + prefix
	return filepath.Join(l.Root, layer, dataset, partition, key+".json"), true
}

// SubjectTrends reads the Gold subject_trend dataset (empty if absent).
func (l *Lake) SubjectTrends() ([]gen.SubjectTrend, error) {
	return readJSONL[gen.SubjectTrend](l.path("gold", "subject_trend"))
}

// ErrStop, returned from a scan callback, ends the scan early without an error.
var ErrStop = errors.New("store: stop scan")

// SubjectTrendsWhere reads the Gold subject_trend dataset, keeping only the rows keep accepts.
func (l *Lake) SubjectTrendsWhere(ctx context.Context, keep func(*gen.SubjectTrend) bool) ([]gen.SubjectTrend, error) {
	return collect(ctx, l.path("gold", "subject_trend"), keep)
}

// SubjectSourceContributionsWhere reads the Gold subject_source_contribution dataset, keeping only the rows keep accepts.
func (l *Lake) SubjectSourceContributionsWhere(
	ctx context.Context, keep func(*gen.SubjectSourceContribution) bool,
) ([]gen.SubjectSourceContribution, error) {
	return collect(ctx, l.path("gold", "subject_source_contribution"), keep)
}

// AxisSentiments reads the Gold axis_sentiment dataset (empty if absent).
func (l *Lake) AxisSentiments() ([]gen.AxisSentiment, error) {
	return readJSONL[gen.AxisSentiment](l.path("gold", "axis_sentiment"))
}

// NewsItems reads the Bronze news_item dataset (empty if absent).
//
// One record is one collection observation, keyed by RecordID — the same key
// Silver analysis carries, which is what makes the lineage join possible at all
// (AC2.6).
func (l *Lake) NewsItems() ([]gen.NewsItem, error) {
	var out []gen.NewsItem
	err := l.EachNewsItem(context.Background(), func(it *gen.NewsItem) error {
		out = append(out, *it)
		return nil
	})
	return out, err
}

// EachNewsItem streams the Bronze news_item dataset to fn in NewsItems order.
func (l *Lake) EachNewsItem(ctx context.Context, fn func(*gen.NewsItem) error) error {
	return stopped(eachPartitions(ctx, filepath.Join(l.Root, "bronze", "news_item"), fn))
}

// NewsBody reads one version from the Bronze news_body object dataset by its content hash.
func (l *Lake) NewsBody(hash string) (*gen.NewsBody, error) {
	return readObject[gen.NewsBody](l, "bronze", "news_body", "body_hash", hash)
}

// Analyses reads the Silver analysis dataset (empty if absent).
//
// Silver holds one row per (record_id, analyzer_version): a reprocessed record
// keeps its earlier version's row beside the new one (JRN-logic-backfill).
func (l *Lake) Analyses() ([]gen.Analysis, error) {
	var out []gen.Analysis
	err := l.EachAnalysis(context.Background(), func(a *gen.Analysis) error {
		out = append(out, *a)
		return nil
	})
	return out, err
}

// EachAnalysis streams the Silver analysis dataset to fn in Analyses order.
func (l *Lake) EachAnalysis(ctx context.Context, fn func(*gen.Analysis) error) error {
	return stopped(eachPartitions(ctx, filepath.Join(l.Root, "silver", "analysis"), fn))
}

// ReprocessDecision is one publish/rollback the batch recorded (the Python
// aggregation's --decision). The last one names the version Gold serves.
type ReprocessDecision struct {
	DecidedAt       string `json:"decided_at"`
	Decision        string `json:"decision"`
	AnalyzerVersion string `json:"analyzer_version"`
	Memo            string `json:"memo"`
	NotifyConsumer  bool   `json:"notify_consumer"`
}

// ReprocessDecisions reads the Silver reprocess_decision log, oldest first
// (empty if absent — no decision ever recorded).
func (l *Lake) ReprocessDecisions() ([]ReprocessDecision, error) {
	return readJSONL[ReprocessDecision](l.path("silver", "reprocess_decision"))
}

func (l *Lake) PipelineRun(runID string) (*gen.PipelineRun, error) {
	return readObject[gen.PipelineRun](l, "silver", "pipeline_run", "run_id", runID)
}

func (l *Lake) PipelineRuns() ([]gen.PipelineRun, error) {
	var out []gen.PipelineRun
	err := eachObjects(context.Background(), l.objectDir("silver", "pipeline_run"), func(run *gen.PipelineRun) error {
		out = append(out, *run)
		return nil
	})
	return out, err
}

func (l *Lake) LlmCall(callID string) (*gen.LlmCallRecord, error) {
	return readObject[gen.LlmCallRecord](l, "silver", "llm_call", "call_id", callID)
}

// LlmCallHead is the part of an llm_call record a tally or a list row reads.
// Decoding only it leaves the prompt and reply text — nearly all of a record — unallocated.
type LlmCallHead struct {
	CallID      string             `json:"call_id"`
	RunID       string             `json:"run_id"`
	CallOutcome gen.LlmCallOutcome `json:"call_outcome"`
}

// LlmCallHeadOf reads one llm_call record's head by call_id (nil if absent).
func (l *Lake) LlmCallHeadOf(callID string) (*LlmCallHead, error) {
	return readObject[LlmCallHead](l, "silver", "llm_call", "call_id", callID)
}

// EachLlmCallHead streams the head of every llm_call record to fn, in call_id file-name order.
func (l *Lake) EachLlmCallHead(ctx context.Context, fn func(*LlmCallHead) error) error {
	return stopped(eachObjects(ctx, l.objectDir("silver", "llm_call"), fn))
}

// partitionFile mirrors econ_core.storage.PARTITION_FILE.
const partitionFile = "data.jsonl"

// readObject is the Go counterpart of econ_core.storage.LakeStore.get_object.
func readObject[T any](l *Lake, layer, dataset, keyField, key string) (*T, error) {
	path, ok := l.objectPath(layer, dataset, keyField, key)
	if !ok {
		return nil, nil
	}
	raw, err := os.ReadFile(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var rec T
	if err := json.Unmarshal(raw, &rec); err != nil {
		return nil, err
	}
	return &rec, nil
}

// eachObjects is the streaming Go counterpart of econ_core.storage.LakeStore.read_objects.
func eachObjects[T any](ctx context.Context, root string, fn func(*T) error) error {
	partitions, err := os.ReadDir(root)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	type found struct {
		name string
		path string
	}
	var files []found
	for _, partition := range partitions {
		if !partition.IsDir() || !strings.Contains(partition.Name(), "=") {
			continue
		}
		entries, err := os.ReadDir(filepath.Join(root, partition.Name()))
		if err != nil {
			return err
		}
		for _, entry := range entries {
			if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".json") {
				continue
			}
			files = append(files, found{entry.Name(), filepath.Join(root, partition.Name(), entry.Name())})
		}
	}
	sort.Slice(files, func(i, j int) bool { return files[i].name < files[j].name })

	var buf bytes.Buffer
	for _, f := range files {
		if err := ctx.Err(); err != nil {
			return err
		}
		if err := readInto(&buf, f.path); err != nil {
			return err
		}
		var rec T
		if err := json.Unmarshal(buf.Bytes(), &rec); err != nil {
			return err
		}
		if err := fn(&rec); err != nil {
			return err
		}
	}
	return nil
}

func readInto(buf *bytes.Buffer, path string) error {
	f, err := os.Open(path)
	if err != nil {
		return err
	}
	defer f.Close()
	buf.Reset()
	_, err = io.Copy(buf, f)
	return err
}

// eachPartitions is the streaming Go counterpart of econ_core.storage.LakeStore.read_partitions.
func eachPartitions[T any](ctx context.Context, root string, fn func(*T) error) error {
	return filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if errors.Is(err, fs.ErrNotExist) && path == root {
			return fs.SkipAll
		}
		if err != nil {
			return err
		}
		if d.IsDir() || d.Name() != partitionFile {
			return nil
		}
		return eachJSONL(ctx, path, fn)
	})
}

// readJSONL decodes a JSONL file into a slice of T. A missing file is not an
// error — it yields an empty slice, matching the Python reader's behavior.
func readJSONL[T any](path string) ([]T, error) {
	return collect[T](context.Background(), path, nil)
}

func collect[T any](ctx context.Context, path string, keep func(*T) bool) ([]T, error) {
	var out []T
	err := eachJSONL(ctx, path, func(rec *T) error {
		if keep == nil || keep(rec) {
			out = append(out, *rec)
		}
		return nil
	})
	return out, err
}

const ctxCheckEvery = 1024

func eachJSONL[T any](ctx context.Context, path string, fn func(*T) error) error {
	f, err := os.Open(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	defer f.Close()

	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	for n := 0; sc.Scan(); n++ {
		if n%ctxCheckEvery == 0 {
			if err := ctx.Err(); err != nil {
				return err
			}
		}
		line := bytes.TrimSpace(sc.Bytes())
		if len(line) == 0 {
			continue
		}
		var rec T
		if err := json.Unmarshal(line, &rec); err != nil {
			return err
		}
		if err := fn(&rec); err != nil {
			return err
		}
	}
	return sc.Err()
}

func stopped(err error) error {
	if errors.Is(err, ErrStop) {
		return nil
	}
	return err
}
