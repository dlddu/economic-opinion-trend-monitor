package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"slices"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// goldSource is where a Gold screen reads Gold. Every question names the axis, unit, buckets or
// subjects it is about, so the index answers it from an index range instead of a decode of the
// whole file.
type goldSource interface {
	// trends returns the subject_trend rows matching q, in file order.
	trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error)
	// trendUnits reports which bucket units have subject_trend rows on axis ("" = any axis).
	trendUnits(ctx context.Context, axis string) (map[gen.BucketUnit]bool, error)
	// latestTrendBucket is the greatest subject_trend bucket of unit on axis ("" = any axis).
	latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error)
	// trendBuckets lists the subject_trend buckets of unit on axis, sorted.
	trendBuckets(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error)
	// trendSubjects lists the subjects of unit on axis in the order of their first row.
	trendSubjects(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error)
	sourceContributions(
		ctx context.Context, axis string, unit gen.BucketUnit, bucket, subject string,
	) ([]gen.SubjectSourceContribution, error)
	axisSentiments(ctx context.Context) ([]gen.AxisSentiment, error)
}

// trendQuery narrows subject_trend to one unit. An empty axis matches every axis; nil buckets or
// subjects match every one, and an empty list (or an empty unit) matches nothing.
type trendQuery struct {
	axis     string
	unit     gen.BucketUnit
	buckets  []string
	subjects []string
}

func (q trendQuery) match(t *gen.SubjectTrend) bool {
	return (q.axis == "" || string(t.Axis) == q.axis) && t.BucketUnit == q.unit &&
		(q.buckets == nil || slices.Contains(q.buckets, t.TimeBucket)) &&
		(q.subjects == nil || slices.Contains(q.subjects, t.Subject))
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
			next(w, r, &lakeGold{lake: h.lake})
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

// lakeGold answers from the Gold files. It lives for one request and keeps the one axis and unit
// it read, so a screen's several questions about them cost one scan, as they did before the index.
type lakeGold struct {
	lake *store.Lake
	axis string
	unit gen.BucketUnit
	rows []gen.SubjectTrend
	read bool
}

func (g *lakeGold) axisUnit(ctx context.Context, axis string, unit gen.BucketUnit) ([]gen.SubjectTrend, error) {
	if g.read && g.axis == axis && g.unit == unit {
		return g.rows, nil
	}
	rows, err := g.lake.SubjectTrendsWhere(ctx, trendQuery{axis: axis, unit: unit}.match)
	g.axis, g.unit, g.rows, g.read = axis, unit, rows, err == nil
	return rows, err
}

func (g *lakeGold) trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error) {
	if q.axis == "" {
		return g.lake.SubjectTrendsWhere(ctx, q.match)
	}
	rows, err := g.axisUnit(ctx, q.axis, q.unit)
	var out []gen.SubjectTrend
	for i := range rows {
		if q.match(&rows[i]) {
			out = append(out, rows[i])
		}
	}
	return out, err
}

func (g *lakeGold) trendUnits(ctx context.Context, axis string) (map[gen.BucketUnit]bool, error) {
	present := make(map[gen.BucketUnit]bool, len(bucketUnits))
	_, err := g.lake.SubjectTrendsWhere(ctx, func(t *gen.SubjectTrend) bool {
		if axis == "" || string(t.Axis) == axis {
			present[t.BucketUnit] = true
		}
		return false
	})
	return present, err
}

func (g *lakeGold) latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error) {
	var bucket string
	_, err := g.lake.SubjectTrendsWhere(ctx, func(t *gen.SubjectTrend) bool {
		if (axis == "" || string(t.Axis) == axis) && t.BucketUnit == unit && t.TimeBucket > bucket {
			bucket = t.TimeBucket
		}
		return false
	})
	return bucket, err
}

func (g *lakeGold) trendBuckets(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error) {
	rows, err := g.axisUnit(ctx, axis, unit)
	seen := map[string]bool{}
	buckets := []string{}
	for _, t := range rows {
		if !seen[t.TimeBucket] {
			seen[t.TimeBucket] = true
			buckets = append(buckets, t.TimeBucket)
		}
	}
	sort.Strings(buckets)
	return buckets, err
}

func (g *lakeGold) trendSubjects(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error) {
	rows, err := g.axisUnit(ctx, axis, unit)
	seen := map[string]bool{}
	subjects := []string{}
	for _, t := range rows {
		if !seen[t.Subject] {
			seen[t.Subject] = true
			subjects = append(subjects, t.Subject)
		}
	}
	return subjects, err
}

func (g *lakeGold) sourceContributions(
	ctx context.Context, axis string, unit gen.BucketUnit, bucket, subject string,
) ([]gen.SubjectSourceContribution, error) {
	return g.lake.SubjectSourceContributionsWhere(ctx, func(p *gen.SubjectSourceContribution) bool {
		return string(p.Axis) == axis && p.BucketUnit == unit && p.TimeBucket == bucket && p.Subject == subject
	})
}

func (g *lakeGold) axisSentiments(context.Context) ([]gen.AxisSentiment, error) {
	return g.lake.AxisSentiments()
}

// indexGold answers from the serving index's copy of Gold.
type indexGold struct{ db *sql.DB }

// axisUnitWhere is the condition for unit on axis ("" = any axis).
func axisUnitWhere(axis string, unit gen.BucketUnit) (string, []any) {
	if axis == "" {
		return "bucket_unit = ?", []any{string(unit)}
	}
	return "axis = ? AND bucket_unit = ?", []any{axis, string(unit)}
}

func (g indexGold) trends(ctx context.Context, q trendQuery) ([]gen.SubjectTrend, error) {
	where, args := axisUnitWhere(q.axis, q.unit)
	if q.buckets != nil {
		where += " AND time_bucket IN (SELECT value FROM json_each(?))"
		args = append(args, jsonText(q.buckets))
	}
	if q.subjects != nil {
		where += " AND subject IN (SELECT value FROM json_each(?))"
		args = append(args, jsonText(q.subjects))
	}
	rs, err := g.db.QueryContext(ctx, `SELECT subject, axis, bucket_unit, time_bucket, raw_count,
		normalized_share, delta, spark FROM subject_trend WHERE `+where+` ORDER BY seq`, args...)
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
		where, args := axisUnitWhere(axis, unit)
		var found bool
		if err := g.db.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM subject_trend WHERE "+where+")",
			args...).Scan(&found); err != nil {
			return present, err
		}
		if found {
			present[unit] = true
		}
	}
	return present, nil
}

func (g indexGold) latestTrendBucket(ctx context.Context, axis string, unit gen.BucketUnit) (string, error) {
	where, args := axisUnitWhere(axis, unit)
	var bucket sql.NullString
	err := g.db.QueryRowContext(ctx, "SELECT max(time_bucket) FROM subject_trend WHERE "+where, args...).
		Scan(&bucket)
	return bucket.String, err
}

func (g indexGold) trendBuckets(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error) {
	where, args := axisUnitWhere(axis, unit)
	return g.strings(ctx, "SELECT DISTINCT time_bucket FROM subject_trend WHERE "+where+
		" ORDER BY time_bucket", args...)
}

func (g indexGold) trendSubjects(ctx context.Context, axis string, unit gen.BucketUnit) ([]string, error) {
	where, args := axisUnitWhere(axis, unit)
	return g.strings(ctx, "SELECT subject FROM subject_trend WHERE "+where+
		" GROUP BY subject ORDER BY min(seq)", args...)
}

func (g indexGold) strings(ctx context.Context, query string, args ...any) ([]string, error) {
	rs, err := g.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	out := []string{}
	for rs.Next() {
		var s string
		if err := rs.Scan(&s); err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rs.Err()
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

func jsonText(v []string) string {
	raw, _ := json.Marshal(v)
	return string(raw)
}
