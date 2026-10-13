package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// goldSource is where a Gold screen reads Gold. Every question names the axis, unit or bucket it
// is about, so the index answers it from an index range instead of a decode of the whole file.
type goldSource interface {
	// trends returns the subject_trend rows matching q, in file order.
	trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error)
	// trendUnits reports which bucket units have subject_trend rows on axis ("" = any axis).
	trendUnits(ctx context.Context, axis string) (map[gen.BucketUnit]bool, error)
	// latestTrendBucket is the greatest subject_trend bucket of unit on axis ("" = any axis).
	latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error)
	sourceContributions(
		ctx context.Context, axis string, unit gen.BucketUnit, bucket, subject string,
	) ([]gen.SubjectSourceContribution, error)
	axisSentiments(ctx context.Context) ([]gen.AxisSentiment, error)
}

// trendQuery narrows subject_trend to one unit, and to one bucket unless everyBucket. An empty
// axis matches every axis; an empty unit or bucket matches nothing, as when Gold has none.
type trendQuery struct {
	axis        string
	unit        gen.BucketUnit
	bucket      string
	everyBucket bool
}

func (q trendQuery) match(t *gen.SubjectTrend) bool {
	return (q.axis == "" || string(t.Axis) == q.axis) && t.BucketUnit == q.unit &&
		(q.everyBucket || t.TimeBucket == q.bucket)
}

var bucketUnits = []gen.BucketUnit{gen.BucketUnitHour, gen.BucketUnitDay, gen.BucketUnitWeek}

type goldHandler func(w http.ResponseWriter, r *http.Request, gold goldSource)

// fromGold serves a Gold screen from the published index, or from the lake's Gold files while
// there is none (before the first build, or between a deploy that bumps the schema and the next
// build), so these screens never wait on the index. The X-Gold-Source header says which.
func (h *Handlers) fromGold(next goldHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		snap, err := h.index.Acquire()
		if err != nil {
			w.Header().Set("X-Gold-Source", "lake")
			next(w, r, lakeGold{h.lake})
			return
		}
		defer snap.Release()
		w.Header().Set("X-Gold-Source", "index")
		w.Header().Set("X-Index-Built-At", snap.BuiltAt)
		next(w, r, indexGold{snap.DB})
	}
}

// goldFailed logs a Gold read that failed. The screens answer with what they have, as they
// did over the files, rather than turning one bad read into an error page.
func goldFailed(r *http.Request, err error) {
	if err != nil && !gone(r) {
		log.Printf("%s %s: gold read: %v", r.Method, r.URL.Path, err)
	}
}

// lakeGold answers from the Gold files, one filtered scan per question.
type lakeGold struct{ lake *store.Lake }

func (g lakeGold) trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error) {
	return g.lake.SubjectTrendsWhere(ctx, q.match)
}

func (g lakeGold) trendUnits(ctx context.Context, axis string) (map[gen.BucketUnit]bool, error) {
	present := make(map[gen.BucketUnit]bool, len(bucketUnits))
	_, err := g.lake.SubjectTrendsWhere(ctx, func(t *gen.SubjectTrend) bool {
		if axis == "" || string(t.Axis) == axis {
			present[t.BucketUnit] = true
		}
		return false
	})
	return present, err
}

func (g lakeGold) latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error) {
	var bucket string
	_, err := g.lake.SubjectTrendsWhere(ctx, func(t *gen.SubjectTrend) bool {
		if (axis == "" || string(t.Axis) == axis) && t.BucketUnit == unit && t.TimeBucket > bucket {
			bucket = t.TimeBucket
		}
		return false
	})
	return bucket, err
}

func (g lakeGold) sourceContributions(
	ctx context.Context, axis string, unit gen.BucketUnit, bucket, subject string,
) ([]gen.SubjectSourceContribution, error) {
	return g.lake.SubjectSourceContributionsWhere(ctx, func(p *gen.SubjectSourceContribution) bool {
		return string(p.Axis) == axis && p.BucketUnit == unit && p.TimeBucket == bucket && p.Subject == subject
	})
}

func (g lakeGold) axisSentiments(context.Context) ([]gen.AxisSentiment, error) {
	return g.lake.AxisSentiments()
}

// indexGold answers from the serving index's copy of Gold.
type indexGold struct{ db *sql.DB }

func (g indexGold) trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error) {
	conds, args := []string{"bucket_unit = ?"}, []any{string(q.unit)}
	if q.axis != "" {
		conds, args = append(conds, "axis = ?"), append(args, q.axis)
	}
	if !q.everyBucket {
		conds, args = append(conds, "time_bucket = ?"), append(args, q.bucket)
	}
	rs, err := g.db.QueryContext(ctx, `SELECT subject, axis, bucket_unit, time_bucket, raw_count,
		normalized_share, delta, spark FROM subject_trend WHERE `+strings.Join(conds, " AND ")+
		` ORDER BY seq`, args...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	var out []gen.SubjectTrend
	for rs.Next() {
		var t gen.SubjectTrend
		var spark string
		if err := rs.Scan(&t.Subject, &t.Axis, &t.BucketUnit, &t.TimeBucket, &t.RawCount,
			&t.NormalizedShare, &t.Delta, &spark); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(spark), &t.Spark); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rs.Err()
}

func (g indexGold) trendUnits(ctx context.Context, axis string) (map[gen.BucketUnit]bool, error) {
	present := make(map[gen.BucketUnit]bool, len(bucketUnits))
	for _, unit := range bucketUnits {
		query, args := "SELECT EXISTS (SELECT 1 FROM subject_trend WHERE bucket_unit = ?)", []any{string(unit)}
		if axis != "" {
			query = "SELECT EXISTS (SELECT 1 FROM subject_trend WHERE axis = ? AND bucket_unit = ?)"
			args = []any{axis, string(unit)}
		}
		var found bool
		if err := g.db.QueryRowContext(ctx, query, args...).Scan(&found); err != nil {
			return present, err
		}
		if found {
			present[unit] = true
		}
	}
	return present, nil
}

func (g indexGold) latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error) {
	query, args := "SELECT max(time_bucket) FROM subject_trend WHERE bucket_unit = ?", []any{string(unit)}
	if axis != "" {
		query = "SELECT max(time_bucket) FROM subject_trend WHERE axis = ? AND bucket_unit = ?"
		args = []any{axis, string(unit)}
	}
	var bucket sql.NullString
	err := g.db.QueryRowContext(ctx, query, args...).Scan(&bucket)
	return bucket.String, err
}

func (g indexGold) sourceContributions(
	ctx context.Context, axis string, unit gen.BucketUnit, bucket, subject string,
) ([]gen.SubjectSourceContribution, error) {
	rs, err := g.db.QueryContext(ctx, `SELECT subject, axis, bucket_unit, time_bucket, source_id, raw_count,
		raw_share, normalized_contribution FROM subject_source_contribution
		WHERE axis = ? AND bucket_unit = ? AND time_bucket = ? AND subject = ? ORDER BY seq`,
		axis, string(unit), bucket, subject)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	var out []gen.SubjectSourceContribution
	for rs.Next() {
		var p gen.SubjectSourceContribution
		if err := rs.Scan(&p.Subject, &p.Axis, &p.BucketUnit, &p.TimeBucket, &p.SourceID, &p.RawCount,
			&p.RawShare, &p.NormalizedContribution); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rs.Err()
}

func (g indexGold) axisSentiments(ctx context.Context) ([]gen.AxisSentiment, error) {
	rs, err := g.db.QueryContext(ctx, `SELECT axis, bucket_unit, time_bucket, positive, neutral, negative,
		mixed, unanalyzed, analyzed_total FROM axis_sentiment ORDER BY seq`)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	var out []gen.AxisSentiment
	for rs.Next() {
		var s gen.AxisSentiment
		d := &s.Distribution
		if err := rs.Scan(&s.Axis, &s.BucketUnit, &s.TimeBucket, &d.Positive, &d.Neutral, &d.Negative,
			&d.Mixed, &d.Unanalyzed, &s.AnalyzedTotal); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rs.Err()
}
