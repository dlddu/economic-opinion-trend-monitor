// Package store reads data-lake datasets from the local filesystem.
//
// The skeleton serializes every layer as JSONL (one JSON object per line); this
// reader is the Go counterpart of econ_core.storage.LocalFsStore on the Python
// side. Records are decoded straight into the generated contract types so the
// schema stays the single source of truth across both runtimes.
//
// Most screens read Gold, which is already shaped for display. Lineage is the
// exception: tracing a Gold number back to the article it came from means
// reading Bronze and Silver directly, because that is where the body text and
// the analysis verdict live (AC1.4, AC2.6).
package store

import (
	"bufio"
	"bytes"
	"encoding/json"
	"errors"
	"io/fs"
	"os"
	"path/filepath"

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

// SubjectTrends reads the Gold subject_trend dataset (empty if absent).
func (l *Lake) SubjectTrends() ([]gen.SubjectTrend, error) {
	return readJSONL[gen.SubjectTrend](l.path("gold", "subject_trend"))
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
	return readJSONL[gen.NewsItem](l.path("bronze", "news_item"))
}

// NewsBodies reads the Bronze news_body dataset (empty if absent).
//
// Bodies are content-addressed by hash and stored once, so they are a separate
// dataset from the observations that reference them: several observations of an
// unchanged article share one body, and an edited article appends a new version
// rather than overwriting (AC1.7).
func (l *Lake) NewsBodies() ([]gen.NewsBody, error) {
	return readJSONL[gen.NewsBody](l.path("bronze", "news_body"))
}

// Analyses reads the Silver analysis dataset (empty if absent).
func (l *Lake) Analyses() ([]gen.Analysis, error) {
	return readJSONL[gen.Analysis](l.path("silver", "analysis"))
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
