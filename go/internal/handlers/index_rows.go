package handlers

import (
	"context"
	"database/sql"
	"encoding/json"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// The index keeps lake rows whole, so a query hands back the same records a scan decoded.

const newsItemColumns = `SELECT record_id, source_id, axis, rank, view_count, title, source_url, body_hash,
	body_available, collected_at, collection_cycle FROM news_item`

const analysisColumns = `SELECT record_id, source_url, target_countries, narrative_subjects, subject_categories,
	sentiment, analysis_status, confidence, analyzed_at, analyzer_version, run_id, call_id, no_call_reason
	FROM analysis`

func scanNewsItems(ctx context.Context, db *sql.DB, query string, args ...any) ([]gen.NewsItem, error) {
	var out []gen.NewsItem
	err := eachNewsItem(ctx, db, func(it gen.NewsItem) error {
		out = append(out, it)
		return nil
	}, query, args...)
	return out, err
}

func eachNewsItem(ctx context.Context, db *sql.DB, fn func(gen.NewsItem) error, query string, args ...any) error {
	rs, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rs.Close()
	for rs.Next() {
		var it gen.NewsItem
		if err := rs.Scan(&it.RecordID, &it.SourceID, &it.Axis, &it.Rank, &it.ViewCount, &it.Title, &it.SourceURL,
			&it.BodyHash, &it.BodyAvailable, &it.CollectedAt, &it.CollectionCycle); err != nil {
			return err
		}
		if err := fn(it); err != nil {
			return err
		}
	}
	return rs.Err()
}

func scanAnalyses(ctx context.Context, db *sql.DB, query string, args ...any) ([]gen.Analysis, error) {
	var out []gen.Analysis
	err := eachAnalysis(ctx, db, func(a gen.Analysis) error {
		out = append(out, a)
		return nil
	}, query, args...)
	return out, err
}

func eachAnalysis(ctx context.Context, db *sql.DB, fn func(gen.Analysis) error, query string, args ...any) error {
	rs, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rs.Close()
	for rs.Next() {
		var a gen.Analysis
		var countries, subjects string
		var categories, sentiment, callID, noCall sql.NullString
		if err := rs.Scan(&a.RecordID, &a.SourceURL, &countries, &subjects, &categories, &sentiment,
			&a.AnalysisStatus, &a.Confidence, &a.AnalyzedAt, &a.AnalyzerVersion, &a.RunID, &callID, &noCall); err != nil {
			return err
		}
		if err := json.Unmarshal([]byte(countries), &a.TargetCountries); err != nil {
			return err
		}
		if err := json.Unmarshal([]byte(subjects), &a.NarrativeSubjects); err != nil {
			return err
		}
		if categories.Valid {
			var c []string
			if err := json.Unmarshal([]byte(categories.String), &c); err != nil {
				return err
			}
			a.SubjectCategories = &c
		}
		if sentiment.Valid {
			s := gen.Sentiment(sentiment.String)
			a.Sentiment = &s
		}
		a.CallID, a.NoCallReason = nullable(callID), nullable(noCall)
		if err := fn(a); err != nil {
			return err
		}
	}
	return rs.Err()
}
