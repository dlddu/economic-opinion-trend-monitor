// Package store reads Gold-layer datasets from the local data lake.
//
// The skeleton serializes every layer as JSONL (one JSON object per line); this
// reader is the Go counterpart of econ_core.storage.LocalFsStore on the Python
// side. Gold records are decoded straight into the generated contract types so
// the schema stays the single source of truth across both runtimes.
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
