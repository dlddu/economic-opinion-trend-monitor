// Package store reads data-lake datasets from the local filesystem.
//
// Record datasets are JSONL files and object datasets are one file per record;
// this reader is the Go counterpart of econ_core.storage.LocalFsStore on the
// Python side. Records are decoded straight into the generated contract types so the
// schema stays the single source of truth across both runtimes.
package store

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"
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

// objectPartitionChars mirrors econ_core.storage.OBJECT_PARTITION_CHARS.
const objectPartitionChars = 1

// objectPath locates one record of an object dataset.
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

func (l *Lake) SubjectSourceContributions() ([]gen.SubjectSourceContribution, error) {
	return readJSONL[gen.SubjectSourceContribution](l.path("gold", "subject_source_contribution"))
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
	return readPartitions[gen.NewsItem](filepath.Join(l.Root, "bronze", "news_item"))
}

// NewsBody reads one version from the Bronze news_body object dataset by its content hash.
func (l *Lake) NewsBody(hash string) (*gen.NewsBody, error) {
	path, ok := l.objectPath("bronze", "news_body", "body_hash", hash)
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
	var body gen.NewsBody
	if err := json.Unmarshal(raw, &body); err != nil {
		return nil, err
	}
	return &body, nil
}

// Analyses reads the Silver analysis dataset (empty if absent).
//
// Silver holds one row per (record_id, analyzer_version): a reprocessed record
// keeps its earlier version's row beside the new one (JRN-logic-backfill).
func (l *Lake) Analyses() ([]gen.Analysis, error) {
	return readPartitions[gen.Analysis](filepath.Join(l.Root, "silver", "analysis"))
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

// partitionFile mirrors econ_core.storage.PARTITION_FILE.
const partitionFile = "data.jsonl"

// readPartitions is the Go counterpart of econ_core.storage.LakeStore.read_partitions.
func readPartitions[T any](root string) ([]T, error) {
	var out []T
	err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
		if errors.Is(err, fs.ErrNotExist) && path == root {
			return fs.SkipAll
		}
		if err != nil {
			return err
		}
		if d.IsDir() || d.Name() != partitionFile {
			return nil
		}
		recs, err := readJSONL[T](path)
		if err != nil {
			return err
		}
		out = append(out, recs...)
		return nil
	})
	return out, err
}

// readJSONL decodes a JSONL file into a slice of T. A missing file is not an
// error — it yields an empty slice, matching the Python reader's behavior.
func readJSONL[T any](path string) ([]T, error) {
	f, err := os.Open(path)
	if errors.Is(err, fs.ErrNotExist) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var out []T
	sc := bufio.NewScanner(f)
	sc.Buffer(make([]byte, 0, 64*1024), 4*1024*1024)
	for sc.Scan() {
		line := bytes.TrimSpace(sc.Bytes())
		if len(line) == 0 {
			continue
		}
		var rec T
		if err := json.Unmarshal(line, &rec); err != nil {
			return nil, err
		}
		out = append(out, rec)
	}
	return out, sc.Err()
}
