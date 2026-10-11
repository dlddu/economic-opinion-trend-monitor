package handlers

import (
	"context"
	"database/sql"
	"net/http"
	"strings"
)

const debugRecordsLimit = 50

type debugRecordRow struct {
	RecordID        string  `json:"record_id"`
	Title           string  `json:"title"`
	SourceID        string  `json:"source_id"`
	CollectedAt     string  `json:"collected_at"`
	AnalysisStatus  string  `json:"analysis_status"`
	Sentiment       *string `json:"sentiment"`
	Confidence      float64 `json:"confidence"`
	AnalyzerVersion string  `json:"analyzer_version"`
	AnalyzedAt      string  `json:"analyzed_at"`
	RunID           string  `json:"run_id"`
	Versions        int     `json:"versions"`
	ExchangeState   string  `json:"exchange_state"`
	CallOutcome     *string `json:"call_outcome"`
	NoCallReason    *string `json:"no_call_reason"`
}

type debugRecordsResponse struct {
	Query     string           `json:"query"`
	RunID     string           `json:"run_id"`
	Symptom   string           `json:"symptom"`
	Total     int              `json:"total"`
	Matched   int              `json:"matched"`
	Limit     int              `json:"limit"`
	Truncated bool             `json:"truncated"`
	Rows      []debugRecordRow `json:"rows"`
}

func (h *Handlers) debugRecords(w http.ResponseWriter, r *http.Request, db *sql.DB) error {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	runID := strings.TrimSpace(r.URL.Query().Get("run_id"))
	symptom := strings.TrimSpace(r.URL.Query().Get("symptom"))
	ctx := r.Context()
	clock := clockOf(r)

	where, args := debugRecordsFilter(query, runID, symptom)
	resp := debugRecordsResponse{Query: query, RunID: runID, Symptom: symptom, Limit: debugRecordsLimit}
	clock.enter("count")
	// The build counted the records: counting them here reads the whole table, seconds on a cold volume.
	if err := db.QueryRowContext(ctx, "SELECT CAST(value AS INTEGER) FROM meta WHERE key = 'records'").
		Scan(&resp.Total); err != nil {
		return err
	}
	resp.Matched = resp.Total
	if where != "1" {
		if err := db.QueryRowContext(ctx, "SELECT count(*) FROM record_latest WHERE "+where, args...).
			Scan(&resp.Matched); err != nil {
			return err
		}
	}
	clock.enter("rows")
	rows, err := debugRecordRows(ctx, db, where, args)
	if err != nil {
		return err
	}
	resp.Rows = rows
	resp.Truncated = resp.Matched > len(rows)
	clock.note("records=%d matched=%d", resp.Total, resp.Matched)
	writeJSON(w, http.StatusOK, resp)
	return nil
}

func debugRecordsFilter(query, runID, symptom string) (string, []any) {
	conds := []string{"1"}
	var args []any
	if query != "" {
		needle := strings.ToLower(query)
		conds = append(conds, "(instr(record_id_lower, ?) > 0 OR instr(coalesce(title_lower, ''), ?) > 0)")
		args = append(args, needle, needle)
	}
	if runID != "" {
		conds = append(conds, "run_id = ?")
		args = append(args, runID)
	}
	if symptom != "" {
		group, name, ok := strings.Cut(symptom, ":")
		if column := symptomColumn[group]; ok && column != "" {
			conds = append(conds, column+" = ?")
			args = append(args, name)
		} else {
			conds = append(conds, "0")
		}
	}
	return strings.Join(conds, " AND "), args
}

var symptomColumn = map[string]string{
	"analysis_status": "analysis_status",
	"call_outcome":    "call_outcome",
	"no_call_reason":  "no_call_reason",
}

func debugRecordRows(ctx context.Context, db *sql.DB, where string, args []any) ([]debugRecordRow, error) {
	rs, err := db.QueryContext(ctx, `SELECT record_id, coalesce(title, ''), coalesce(source_id, ''),
		coalesce(collected_at, ''), analysis_status, sentiment, confidence, analyzer_version, analyzed_at,
		run_id, versions, exchange_state, call_outcome, no_call_reason
		FROM record_latest WHERE `+where+` ORDER BY analyzed_at DESC, record_id LIMIT ?`,
		append(args, debugRecordsLimit)...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	rows := make([]debugRecordRow, 0, debugRecordsLimit)
	for rs.Next() {
		var row debugRecordRow
		var sentiment, outcome, noCall sql.NullString
		if err := rs.Scan(&row.RecordID, &row.Title, &row.SourceID, &row.CollectedAt, &row.AnalysisStatus,
			&sentiment, &row.Confidence, &row.AnalyzerVersion, &row.AnalyzedAt, &row.RunID, &row.Versions,
			&row.ExchangeState, &outcome, &noCall); err != nil {
			return nil, err
		}
		row.Sentiment, row.CallOutcome, row.NoCallReason = nullable(sentiment), nullable(outcome), nullable(noCall)
		rows = append(rows, row)
	}
	return rows, rs.Err()
}

func nullable(s sql.NullString) *string {
	if !s.Valid {
		return nil
	}
	return &s.String
}
