package handlers

import (
	"net/http"
	"sort"
	"strings"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
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

func (h *Handlers) debugRecords(w http.ResponseWriter, r *http.Request) {
	query := strings.TrimSpace(r.URL.Query().Get("q"))
	runID := strings.TrimSpace(r.URL.Query().Get("run_id"))
	symptom := strings.TrimSpace(r.URL.Query().Get("symptom"))

	analyses, _ := h.lake.Analyses()
	calls, _ := h.lake.LlmCalls()
	items, _ := h.lake.NewsItems()

	all := debugRecordRows(analyses, calls, items)
	matched := make([]debugRecordRow, 0, len(all))
	for _, row := range all {
		if matchesDebugQuery(row, query) && matchesDebugRun(row, runID) && matchesDebugSymptom(row, symptom) {
			matched = append(matched, row)
		}
	}

	rows := matched
	if len(rows) > debugRecordsLimit {
		rows = rows[:debugRecordsLimit]
	}

	writeJSON(w, http.StatusOK, debugRecordsResponse{
		Query:     query,
		RunID:     runID,
		Symptom:   symptom,
		Total:     len(all),
		Matched:   len(matched),
		Limit:     debugRecordsLimit,
		Truncated: len(matched) > len(rows),
		Rows:      rows,
	})
}

func debugRecordRows(analyses []gen.Analysis, calls []gen.LlmCallRecord, items []gen.NewsItem) []debugRecordRow {
	byCallID := make(map[string]gen.LlmCallRecord, len(calls))
	for _, call := range calls {
		byCallID[call.CallID] = call
	}
	item := make(map[string]gen.NewsItem, len(items))
	for _, news := range items {
		if seen, ok := item[news.RecordID]; ok && seen.CollectedAt >= news.CollectedAt {
			continue
		}
		item[news.RecordID] = news
	}

	latest := make(map[string]gen.Analysis, len(analyses))
	versions := make(map[string]int, len(analyses))
	order := make([]string, 0, len(analyses))
	for _, analysis := range analyses {
		versions[analysis.RecordID]++
		prev, ok := latest[analysis.RecordID]
		if !ok {
			order = append(order, analysis.RecordID)
			latest[analysis.RecordID] = analysis
			continue
		}
		if analysis.AnalyzedAt > prev.AnalyzedAt {
			latest[analysis.RecordID] = analysis
		}
	}

	rows := make([]debugRecordRow, 0, len(order))
	for _, recordID := range order {
		analysis := latest[recordID]
		row := debugRecordRow{
			RecordID:        recordID,
			AnalysisStatus:  string(analysis.AnalysisStatus),
			Confidence:      analysis.Confidence,
			AnalyzerVersion: analysis.AnalyzerVersion,
			AnalyzedAt:      analysis.AnalyzedAt,
			RunID:           analysis.RunID,
			Versions:        versions[recordID],
		}
		if analysis.Sentiment != nil {
			sentiment := string(*analysis.Sentiment)
			row.Sentiment = &sentiment
		}
		if news, ok := item[recordID]; ok {
			row.Title = news.Title
			row.SourceID = news.SourceID
			row.CollectedAt = news.CollectedAt
		}
		exchange := exchangeOf(analysis, byCallID)
		row.ExchangeState = exchange.State
		row.NoCallReason = exchange.NoCallReason
		if exchange.Call != nil {
			outcome := exchange.Call.CallOutcome
			row.CallOutcome = &outcome
		}
		rows = append(rows, row)
	}

	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].AnalyzedAt != rows[j].AnalyzedAt {
			return rows[i].AnalyzedAt > rows[j].AnalyzedAt
		}
		return rows[i].RecordID < rows[j].RecordID
	})
	return rows
}

func matchesDebugQuery(row debugRecordRow, query string) bool {
	if query == "" {
		return true
	}
	needle := strings.ToLower(query)
	return strings.Contains(strings.ToLower(row.RecordID), needle) ||
		strings.Contains(strings.ToLower(row.Title), needle)
}

func matchesDebugRun(row debugRecordRow, runID string) bool {
	return runID == "" || row.RunID == runID
}

func matchesDebugSymptom(row debugRecordRow, symptom string) bool {
	if symptom == "" {
		return true
	}
	group, name, ok := strings.Cut(symptom, ":")
	if !ok {
		return false
	}
	switch group {
	case "analysis_status":
		return row.AnalysisStatus == name
	case "call_outcome":
		return row.CallOutcome != nil && *row.CallOutcome == name
	case "no_call_reason":
		return row.NoCallReason != nil && *row.NoCallReason == name
	}
	return false
}
