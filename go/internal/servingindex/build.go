// Package servingindex builds and opens the serving index: a SQLite file the batch derives from
// the lake after each run, so a screen's question is an indexed lookup instead of a walk over every
// Bronze and Silver row. The serving pod reads it from the shared volume and never writes it.
package servingindex

import (
	"context"
	"crypto/rand"
	"database/sql"
	_ "embed"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	_ "modernc.org/sqlite"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// SchemaVersion names the shape of schema.sql and derive.sql. A reader refuses an index of
// another version, so bump it with any change a query could notice.
const SchemaVersion = "5"

const (
	// Dir is where the index lives under the lake root.
	Dir         = "serving"
	pointerName = "index.current"
	filePrefix  = "index-"
	fileSuffix  = ".sqlite"
	tmpPrefix   = "."
	tmpSuffix   = ".tmp"
)

//go:embed schema.sql
var schemaSQL string

//go:embed derive.sql
var deriveSQL string

// Options tunes a build; the zero value builds in the system temp directory.
type Options struct {
	// Scratch is a local directory to build in: the index is written once to the shared
	// volume, whole, rather than built there page by page.
	Scratch string
	// Grace is how long a replaced index stays on the volume for a reader still holding it.
	Grace time.Duration
	// Readers is how many llm_call files are read at once.
	Readers int
	// Log receives progress lines; nil discards them.
	Log func(format string, args ...any)
	now func() time.Time
}

// Stats says what a build read and wrote.
type Stats struct {
	Name         string
	Analyses     int
	NewsItems    int
	Records      int
	ArticlePicks int
	// Gold rows copied: subject_trend, subject_source_contribution, axis_sentiment.
	SubjectTrends, SourceContributions, AxisSentiments int
	// PicksWritten is false when the lake has no article_pick dataset yet.
	PicksWritten   bool
	CallFiles      int
	CallsReused    int
	CallsRead      int
	CallsUndecoded int
}

// DefaultGrace outlives any request a reader serves from a replaced index.
const DefaultGrace = time.Hour

const defaultReaders = 32

// Build derives a new index from the lake at root and makes it the one readers open.
func Build(ctx context.Context, root string, opt Options) (Stats, error) {
	if opt.now == nil {
		opt.now = time.Now
	}
	if opt.Log == nil {
		opt.Log = func(string, ...any) {}
	}
	if opt.Readers <= 0 {
		opt.Readers = defaultReaders
	}
	if opt.Grace <= 0 {
		opt.Grace = DefaultGrace
	}
	if opt.Scratch == "" {
		opt.Scratch = os.TempDir()
	}
	name, err := newName(opt.now())
	if err != nil {
		return Stats{}, err
	}
	local := filepath.Join(opt.Scratch, name)
	defer os.Remove(local)

	stats, err := write(ctx, root, local, opt)
	if err != nil {
		return stats, err
	}
	stats.Name = name
	dir := filepath.Join(root, Dir)
	if err := publish(dir, local, name, opt.now()); err != nil {
		return stats, err
	}
	removed, err := sweep(dir, name, opt.now().Add(-opt.Grace))
	for _, r := range removed {
		opt.Log("removed %s", r)
	}
	return stats, err
}

func newName(now time.Time) (string, error) {
	var b [4]byte
	if _, err := rand.Read(b[:]); err != nil {
		return "", err
	}
	return filePrefix + now.UTC().Format("20060102T150405Z") + "-" + hex.EncodeToString(b[:]) + fileSuffix, nil
}

func write(ctx context.Context, root, path string, opt Options) (Stats, error) {
	var stats Stats
	db, err := sql.Open("sqlite", "file:"+path+
		"?_pragma=journal_mode(OFF)&_pragma=synchronous(OFF)&_pragma=cache_size(-65536)")
	if err != nil {
		return stats, err
	}
	defer db.Close()
	// ATTACH and the temp listing live on one connection.
	conn, err := db.Conn(ctx)
	if err != nil {
		return stats, err
	}
	defer conn.Close()
	if _, err := conn.ExecContext(ctx, schemaSQL); err != nil {
		return stats, fmt.Errorf("schema: %w", err)
	}

	start := time.Now()
	if stats.Analyses, err = loadAnalyses(ctx, conn, root); err != nil {
		return stats, fmt.Errorf("analysis: %w", err)
	}
	opt.Log("analysis rows=%d took=%s", stats.Analyses, since(start))
	start = time.Now()
	if stats.NewsItems, err = loadNewsItems(ctx, conn, root); err != nil {
		return stats, fmt.Errorf("news_item: %w", err)
	}
	opt.Log("news_item rows=%d took=%s", stats.NewsItems, since(start))
	start = time.Now()
	stats.PicksWritten = store.New(root).ArticlePicksWritten()
	if stats.ArticlePicks, err = loadArticlePicks(ctx, conn, root); err != nil {
		return stats, fmt.Errorf("article_pick: %w", err)
	}
	opt.Log("article_pick rows=%d took=%s", stats.ArticlePicks, since(start))
	start = time.Now()
	if err := loadGold(ctx, conn, root, &stats); err != nil {
		return stats, err
	}
	opt.Log("gold subject_trend=%d subject_source_contribution=%d axis_sentiment=%d took=%s",
		stats.SubjectTrends, stats.SourceContributions, stats.AxisSentiments, since(start))
	start = time.Now()
	if err := loadCalls(ctx, conn, root, opt, &stats); err != nil {
		return stats, fmt.Errorf("llm_call: %w", err)
	}
	opt.Log("llm_call files=%d reused=%d read=%d undecoded=%d took=%s",
		stats.CallFiles, stats.CallsReused, stats.CallsRead, stats.CallsUndecoded, since(start))
	start = time.Now()
	if _, err := conn.ExecContext(ctx, deriveSQL); err != nil {
		return stats, fmt.Errorf("derive: %w", err)
	}
	if err := conn.QueryRowContext(ctx, "SELECT count(*) FROM record_latest").Scan(&stats.Records); err != nil {
		return stats, err
	}
	opt.Log("derived records=%d took=%s", stats.Records, since(start))
	var undecoded int
	if err := conn.QueryRowContext(ctx, "SELECT count(*) FROM llm_call_file WHERE decoded = 0").Scan(&undecoded); err != nil {
		return stats, err
	}

	meta := map[string]string{
		"schema_version":  SchemaVersion,
		"built_at":        opt.now().UTC().Format(time.RFC3339),
		"analyses":        strconv.Itoa(stats.Analyses),
		"news_items":      strconv.Itoa(stats.NewsItems),
		"article_picks":   strconv.Itoa(stats.ArticlePicks),
		"picks_written":   strconv.FormatBool(stats.PicksWritten),
		"subject_trends":  strconv.Itoa(stats.SubjectTrends),
		"call_files":      strconv.Itoa(stats.CallFiles),
		"calls_undecoded": strconv.Itoa(undecoded),
		"records":         strconv.Itoa(stats.Records),
	}
	for k, v := range meta {
		if _, err := conn.ExecContext(ctx, "INSERT INTO meta (key, value) VALUES (?, ?)", k, v); err != nil {
			return stats, err
		}
	}
	return stats, nil
}

func since(t time.Time) time.Duration { return time.Since(t).Round(time.Millisecond) }

// inTx runs fn in one transaction: a statement per row outside one would sync per row.
func inTx(ctx context.Context, conn *sql.Conn, fn func(tx *sql.Tx) error) error {
	tx, err := conn.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	if err := fn(tx); err != nil {
		_ = tx.Rollback()
		return err
	}
	return tx.Commit()
}

func loadAnalyses(ctx context.Context, conn *sql.Conn, root string) (int, error) {
	n := 0
	err := inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO analysis (seq, record_id, source_url, target_countries,
			narrative_subjects, subject_categories, sentiment, sentiment_rationale, analysis_status, confidence,
			analyzed_at, analyzer_version, run_id, call_id, no_call_reason) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return store.New(root).EachAnalysis(ctx, func(a *gen.Analysis) error {
			n++
			var categories, sentiment any
			if a.SubjectCategories != nil {
				categories = jsonText(*a.SubjectCategories)
			}
			if a.Sentiment != nil {
				sentiment = string(*a.Sentiment)
			}
			_, err := ins.ExecContext(ctx, n, a.RecordID, a.SourceURL, jsonText(a.TargetCountries),
				jsonText(a.NarrativeSubjects), categories, sentiment, text(a.SentimentRationale), string(a.AnalysisStatus), a.Confidence,
				a.AnalyzedAt, a.AnalyzerVersion, a.RunID, text(a.CallID), text(a.NoCallReason))
			return err
		})
	})
	return n, err
}

func loadNewsItems(ctx context.Context, conn *sql.Conn, root string) (int, error) {
	n := 0
	err := inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO news_item (seq, record_id, source_id, axis, rank,
			view_count, title, title_lower, source_url, body_hash, body_available, collected_at,
			collection_cycle) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return store.New(root).EachNewsItem(ctx, func(it *gen.NewsItem) error {
			n++
			_, err := ins.ExecContext(ctx, n, it.RecordID, it.SourceID, string(it.Axis), it.Rank, it.ViewCount,
				it.Title, strings.ToLower(it.Title), it.SourceURL, it.BodyHash, it.BodyAvailable, it.CollectedAt,
				it.CollectionCycle)
			return err
		})
	})
	return n, err
}

func loadArticlePicks(ctx context.Context, conn *sql.Conn, root string) (int, error) {
	n := 0
	err := inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO article_pick (seq, axis, bucket_unit, time_bucket,
			record_id, source_id, collected_at, counted_subjects) VALUES (?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return store.New(root).EachArticlePick(ctx, func(p *gen.ArticlePick) error {
			n++
			_, err := ins.ExecContext(ctx, n, string(p.Axis), string(p.BucketUnit), p.TimeBucket, p.RecordID,
				p.SourceID, p.CollectedAt, jsonText(p.CountedSubjects))
			return err
		})
	})
	return n, err
}

func loadGold(ctx context.Context, conn *sql.Conn, root string, stats *Stats) error {
	lake := store.New(root)
	err := inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO subject_trend (seq, subject, axis, bucket_unit,
			time_bucket, raw_count, normalized_share, delta, spark) VALUES (?,?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return lake.EachSubjectTrend(ctx, func(t *gen.SubjectTrend) error {
			stats.SubjectTrends++
			spark, err := json.Marshal(t.Spark)
			if err != nil {
				return err
			}
			_, err = ins.ExecContext(ctx, stats.SubjectTrends, t.Subject, string(t.Axis), string(t.BucketUnit),
				t.TimeBucket, t.RawCount, t.NormalizedShare, t.Delta, string(spark))
			return err
		})
	})
	if err != nil {
		return fmt.Errorf("subject_trend: %w", err)
	}
	err = inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO subject_source_contribution (seq, subject, axis,
			bucket_unit, time_bucket, source_id, raw_count, raw_share, normalized_contribution)
			VALUES (?,?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return lake.EachSubjectSourceContribution(ctx, func(c *gen.SubjectSourceContribution) error {
			stats.SourceContributions++
			_, err := ins.ExecContext(ctx, stats.SourceContributions, c.Subject, string(c.Axis),
				string(c.BucketUnit), c.TimeBucket, c.SourceID, c.RawCount, c.RawShare, c.NormalizedContribution)
			return err
		})
	})
	if err != nil {
		return fmt.Errorf("subject_source_contribution: %w", err)
	}
	err = inTx(ctx, conn, func(tx *sql.Tx) error {
		ins, err := tx.PrepareContext(ctx, `INSERT INTO axis_sentiment (seq, axis, bucket_unit, time_bucket,
			positive, neutral, negative, mixed, unanalyzed, analyzed_total) VALUES (?,?,?,?,?,?,?,?,?,?)`)
		if err != nil {
			return err
		}
		defer ins.Close()
		return lake.EachAxisSentiment(ctx, func(s *gen.AxisSentiment) error {
			stats.AxisSentiments++
			d := s.Distribution
			_, err := ins.ExecContext(ctx, stats.AxisSentiments, string(s.Axis), string(s.BucketUnit),
				s.TimeBucket, d.Positive, d.Neutral, d.Negative, d.Mixed, d.Unanalyzed, s.AnalyzedTotal)
			return err
		})
	})
	if err != nil {
		return fmt.Errorf("axis_sentiment: %w", err)
	}
	return nil
}

func jsonText(v []string) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}

func text(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}

func loadCalls(ctx context.Context, conn *sql.Conn, root string, opt Options, stats *Stats) error {
	if _, err := conn.ExecContext(ctx, `CREATE TEMP TABLE listing (
		path TEXT PRIMARY KEY, call_id TEXT NOT NULL, canonical INTEGER NOT NULL) WITHOUT ROWID`); err != nil {
		return err
	}
	callDir := filepath.Join(root, "silver", "llm_call")
	if err := listCalls(ctx, conn, callDir, &stats.CallFiles); err != nil {
		return err
	}
	reused, err := reuse(ctx, conn, filepath.Join(root, Dir), opt)
	if err != nil {
		return err
	}
	stats.CallsReused = reused

	after := ""
	for {
		batch, err := unread(ctx, conn, after, 4096)
		if err != nil || len(batch) == 0 {
			return err
		}
		after = batch[len(batch)-1].path
		heads, err := readHeads(ctx, callDir, batch, opt.Readers)
		if err != nil {
			return err
		}
		err = inTx(ctx, conn, func(tx *sql.Tx) error {
			for _, h := range heads {
				if h.gone {
					continue
				}
				stats.CallsRead++
				if !h.decoded {
					stats.CallsUndecoded++
					if _, err := tx.ExecContext(ctx, `INSERT INTO llm_call_file (path, call_id, canonical, decoded)
						VALUES (?, ?, ?, 0)`, h.path, h.callID, h.canonical); err != nil {
						return err
					}
					continue
				}
				if _, err := tx.ExecContext(ctx, `INSERT INTO llm_call_file
					(path, call_id, canonical, decoded, run_id, call_outcome) VALUES (?, ?, ?, 1, ?, ?)`,
					h.path, h.callID, h.canonical, h.head.RunID, string(h.head.CallOutcome)); err != nil {
					return err
				}
			}
			return nil
		})
		if err != nil {
			return err
		}
		opt.Log("llm_call read=%d", stats.CallsRead)
	}
}

// listCalls lists every llm_call file the serving readers would see — a .json file in a
// key_prefix=… directory — into temp.listing, a directory batch at a time.
func listCalls(ctx context.Context, conn *sql.Conn, dir string, listed *int) error {
	partitions, err := os.ReadDir(dir)
	if errors.Is(err, fs.ErrNotExist) {
		return nil
	}
	if err != nil {
		return err
	}
	for _, partition := range partitions {
		if !partition.IsDir() || !strings.Contains(partition.Name(), "=") {
			continue
		}
		f, err := os.Open(filepath.Join(dir, partition.Name()))
		if err != nil {
			return err
		}
		for {
			entries, err := f.ReadDir(4096)
			txErr := inTx(ctx, conn, func(tx *sql.Tx) error {
				for _, e := range entries {
					if e.IsDir() || !strings.HasSuffix(e.Name(), ".json") {
						continue
					}
					id := strings.TrimSuffix(e.Name(), ".json")
					canonical := lookupKey(id) && partition.Name() == "call_id_prefix="+id[:1]
					if _, err := tx.ExecContext(ctx, "INSERT INTO temp.listing VALUES (?, ?, ?)",
						partition.Name()+"/"+e.Name(), id, canonical); err != nil {
						return err
					}
					*listed++
				}
				return nil
			})
			if txErr != nil {
				f.Close()
				return txErr
			}
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				f.Close()
				return err
			}
		}
		f.Close()
	}
	return nil
}

func reuse(ctx context.Context, conn *sql.Conn, dir string, opt Options) (int, error) {
	name, err := readPointer(dir)
	if err != nil {
		if !errors.Is(err, fs.ErrNotExist) {
			opt.Log("previous index: %v — reading every llm_call file", err)
		}
		return 0, nil
	}
	if _, err := conn.ExecContext(ctx, "ATTACH DATABASE ? AS prev", readOnlyURI(filepath.Join(dir, name))); err != nil {
		opt.Log("previous index %s: %v — reading every llm_call file", name, err)
		return 0, nil
	}
	defer conn.ExecContext(context.WithoutCancel(ctx), "DETACH DATABASE prev")
	var version string
	if err := conn.QueryRowContext(ctx, "SELECT value FROM prev.meta WHERE key = 'schema_version'").Scan(&version); err != nil || version != SchemaVersion {
		opt.Log("previous index %s: schema %q, err %v — reading every llm_call file", name, version, err)
		return 0, nil
	}
	res, err := conn.ExecContext(ctx, `INSERT INTO llm_call_file
		SELECT p.path, p.call_id, p.canonical, p.decoded, p.run_id, p.call_outcome
		FROM temp.listing AS l JOIN prev.llm_call_file AS p ON p.path = l.path`)
	if err != nil {
		return 0, err
	}
	n, err := res.RowsAffected()
	return int(n), err
}

// lookupKey mirrors the keys store.Lake opens an object by: any other name is never looked up.
func lookupKey(id string) bool {
	return id != "" && !strings.HasPrefix(id, ".") && !strings.ContainsAny(id, `/\`)
}

type listedCall struct {
	path, callID string
	canonical    bool
}

func unread(ctx context.Context, conn *sql.Conn, after string, limit int) ([]listedCall, error) {
	rows, err := conn.QueryContext(ctx, `SELECT l.path, l.call_id, l.canonical FROM temp.listing AS l
		WHERE l.path > ? AND NOT EXISTS (SELECT 1 FROM main.llm_call_file AS c WHERE c.path = l.path)
		ORDER BY l.path LIMIT ?`, after, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []listedCall
	for rows.Next() {
		var c listedCall
		if err := rows.Scan(&c.path, &c.callID, &c.canonical); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

type readHead struct {
	listedCall
	head    store.LlmCallHead
	decoded bool
	gone    bool
}

// readHeads reads files in parallel: each read is a network round trip on the shared volume.
func readHeads(ctx context.Context, dir string, files []listedCall, readers int) ([]readHead, error) {
	out := make([]readHead, len(files))
	next := make(chan int)
	errs := make(chan error, readers)
	var wg sync.WaitGroup
	for range readers {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for i := range next {
				out[i] = readHead{listedCall: files[i]}
				raw, err := os.ReadFile(filepath.Join(dir, filepath.FromSlash(files[i].path)))
				if errors.Is(err, fs.ErrNotExist) {
					out[i].gone = true
					continue
				}
				if err != nil {
					errs <- err
					return
				}
				// A record is linked into place whole, so one that does not decode never will.
				out[i].decoded = json.Unmarshal(raw, &out[i].head) == nil
			}
		}()
	}
	var failed error
feed:
	for i := range files {
		select {
		case next <- i:
		case failed = <-errs:
			break feed
		case <-ctx.Done():
			failed = ctx.Err()
			break feed
		}
	}
	close(next)
	wg.Wait()
	if failed == nil {
		select {
		case failed = <-errs:
		default:
		}
	}
	return out, failed
}
