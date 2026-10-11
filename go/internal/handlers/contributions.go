package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// BodyDuplicate and BodyShares are two fields for one reason: the reader is
// checking whether a spike is real, and "the same text arrived twice" is the
// answer that most often explains one (AC1.7 stores bodies by content hash, so
// a shared hash *is* the duplicate). The count says how wide the reuse is —
// a syndicated wire piece carried by every outlet reads differently from one
// article observed twice.
type contributionRow struct {
	RecordID      string `json:"record_id"`
	SourceID      string `json:"source_id"`
	Title         string `json:"title"`
	SourceURL     string `json:"source_url"`
	CollectedAt   string `json:"collected_at"`
	BodyHash      string `json:"body_hash"`
	BodyAvailable bool   `json:"body_available"`
	BodyDuplicate bool   `json:"body_duplicate"`
	BodyShares    int    `json:"body_shares"`
}

type contributionSource struct {
	SourceID string `json:"source_id"`
	Listed   int    `json:"listed"`
}

// RawCount must come from Gold, never from this endpoint's own count, and Total
// must stay the pre-filter count: `Total == RawCount` and
// `sum(Sources.Listed) == Total` are only checks while the two sides are.
//
// AnalyzerVersion names which Silver rows were counted. Empty means "newest per
// record", which is what the aggregation does with no publish decision recorded.
type contributionsBasis struct {
	Axis            string `json:"axis"`
	Subject         string `json:"subject"`
	BucketUnit      string `json:"bucket_unit"`
	TimeBucket      string `json:"time_bucket"`
	Source          string `json:"source"`
	RawCount        int64  `json:"raw_count"`
	Total           int    `json:"total"`
	Listed          int    `json:"listed"`
	AnalyzerVersion string `json:"analyzer_version"`
}

type contributionsResponse struct {
	Basis   contributionsBasis   `json:"basis"`
	Sources []contributionSource `json:"sources"`
	Rows    []contributionRow    `json:"rows"`
}

// contributions lists the articles behind one Gold value. The aggregation writes them beside the
// value (Gold article_pick), so the list is what the count counted, read rather than recomputed.
func (h *Handlers) contributions(w http.ResponseWriter, r *http.Request, db *sql.DB) error {
	ctx := r.Context()
	// An index built before the aggregation first wrote the picks would list nothing under
	// every count: that is "not ready", not "no articles".
	var written string
	if err := db.QueryRowContext(ctx, "SELECT value FROM meta WHERE key = 'picks_written'").
		Scan(&written); err != nil {
		return err
	}
	if written != "true" {
		clockOf(r).note("picks=absent")
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": "index_not_ready"})
		return nil
	}
	axis := axisParam(r, "KR")
	inAxis, _ := h.lake.SubjectTrendsWhere(ctx, inAxisTrend(axis))
	unit := unitParam(r, plottedUnit(inAxis))
	bucket := r.URL.Query().Get("time_bucket")
	if bucket == "" {
		bucket = latestBucketOf(inAxis, unit)
	}
	inBucket := trendsInBucket(inAxis, bucket, unit)
	subject := pickContributionSubject(inBucket, r.URL.Query().Get("subject"))
	source := r.URL.Query().Get("source")

	var rawCount int64
	for _, t := range inBucket {
		if t.Subject == subject {
			rawCount = t.RawCount
		}
	}

	all, err := pickedArticles(ctx, db, axis, unit, bucket, subject)
	if err != nil {
		return err
	}
	rows := make([]contributionRow, 0, len(all))
	for _, row := range all {
		if source == "" || row.SourceID == source {
			rows = append(rows, row)
		}
	}
	decisions, _ := h.lake.ReprocessDecisions()

	writeJSON(w, http.StatusOK, contributionsResponse{
		Basis: contributionsBasis{
			Axis:            axis,
			Subject:         subject,
			BucketUnit:      string(unit),
			TimeBucket:      bucket,
			Source:          source,
			RawCount:        rawCount,
			Total:           len(all),
			Listed:          len(rows),
			AnalyzerVersion: servingVersion(decisions),
		},
		Sources: sourceTally(all),
		Rows:    rows,
	})
	return nil
}

// pickedArticles reads the bucket's picks counted under subject, newest first because the reader
// came here from a spike, with each pick's observation and how many articles shared its body.
func pickedArticles(ctx context.Context, db *sql.DB, axis string, unit gen.BucketUnit, bucket, subject string) ([]contributionRow, error) {
	rs, err := db.QueryContext(ctx, `SELECT p.record_id, p.source_id, p.collected_at,
		coalesce(n.title, ''), coalesce(n.source_url, ''), coalesce(n.body_hash, ''),
		coalesce(n.body_available, 0), coalesce(b.shares, 0)
		FROM article_pick AS p
		LEFT JOIN news_item AS n ON n.seq = (SELECT max(m.seq) FROM news_item AS m WHERE m.record_id = p.record_id)
		LEFT JOIN body_share AS b ON b.body_hash = n.body_hash
		WHERE p.axis = ? AND p.bucket_unit = ? AND p.time_bucket = ?
		  AND EXISTS (SELECT 1 FROM json_each(p.counted_subjects) WHERE value = ?)
		ORDER BY p.collected_at DESC, p.record_id`, axis, string(unit), bucket, subject)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	out := []contributionRow{}
	for rs.Next() {
		var row contributionRow
		if err := rs.Scan(&row.RecordID, &row.SourceID, &row.CollectedAt, &row.Title, &row.SourceURL,
			&row.BodyHash, &row.BodyAvailable, &row.BodyShares); err != nil {
			return nil, err
		}
		row.BodyDuplicate = row.BodyShares > 1
		out = append(out, row)
	}
	return out, rs.Err()
}

// pickContributionSubject falls back to the leading subject only for an *absent*
// request — never for one the bucket holds no row for.
func pickContributionSubject(inBucket []gen.SubjectTrend, requested string) string {
	if requested != "" {
		return requested
	}
	var subject string
	var best float64 = -1
	for _, t := range inBucket {
		if t.NormalizedShare > best {
			best, subject = t.NormalizedShare, t.Subject
		}
	}
	return subject
}

// servingVersion is the Go counterpart of econ_core.silver.serving_version.
func servingVersion(decisions []store.ReprocessDecision) string {
	if len(decisions) == 0 {
		return ""
	}
	return decisions[len(decisions)-1].AnalyzerVersion
}

// sourceTally is the per-collector breakdown of the *unfiltered* list.
func sourceTally(rows []contributionRow) []contributionSource {
	counts := map[string]int{}
	for _, row := range rows {
		counts[row.SourceID]++
	}
	out := make([]contributionSource, 0, len(counts))
	for id, n := range counts {
		out = append(out, contributionSource{SourceID: id, Listed: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Listed != out[j].Listed {
			return out[i].Listed > out[j].Listed
		}
		return out[i].SourceID < out[j].SourceID
	})
	return out
}

// groupingKeys mirrors econ_core.silver.grouping_keys: the keys Gold counted an
// analysis under — its categories, or its narrative subjects when it has none.
func groupingKeys(a gen.Analysis) []string {
	if a.SubjectCategories != nil {
		return *a.SubjectCategories
	}
	return a.NarrativeSubjects
}
