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

	all := h.debugRecordRows(r)
	if gone(r) {
		return
	}

	byCall := strings.HasPrefix(symptom, "call_outcome:")
	shown := make([]int, 0, debugRecordsLimit)
	total := 0
	for i := range all {
		row := &all[i].row
		if !matchesDebugQuery(*row, query) || !matchesDebugRun(*row, runID) {
			continue
		}
		if byCall {
			if i%256 == 0 && gone(r) {
				return
			}
			h.fillExchange(row, all[i].analysis)
		}
		if matchesDebugSymptom(*row, symptom) {
			total++
			if len(shown) < debugRecordsLimit {
				shown = append(shown, i)
			}
		}
	}

	rows := make([]debugRecordRow, 0, len(shown))
	for _, i := range shown {
		if !byCall {
			h.fillExchange(&all[i].row, all[i].analysis)
		}
		rows = append(rows, all[i].row)
	}

	writeJSON(w, http.StatusOK, debugRecordsResponse{
		Query:     query,
		RunID:     runID,
		Symptom:   symptom,
		Total:     len(all),
		Matched:   total,
		Limit:     debugRecordsLimit,
		Truncated: total > len(rows),
		Rows:      rows,
	})
}

type listedRecord struct {
	row      debugRecordRow
	analysis gen.Analysis
}

func (h *Handlers) debugRecordRows(r *http.Request) []listedRecord {
	latest := map[string]gen.Analysis{}
	versions := map[string]int{}
	order := []string{}
	_ = h.lake.EachAnalysis(r.Context(), func(a *gen.Analysis) error {
		slim := *a
		slim.SourceURL, slim.TargetCountries, slim.NarrativeSubjects, slim.SubjectCategories = "", nil, nil, nil
		versions[a.RecordID]++
		prev, ok := latest[a.RecordID]
		if !ok {
			order = append(order, a.RecordID)
			latest[a.RecordID] = slim
			return nil
		}
		if a.AnalyzedAt > prev.AnalyzedAt {
			latest[a.RecordID] = slim
		}
		return nil
	})

	type listItem struct{ title, sourceID, collectedAt string }
	item := make(map[string]listItem, len(latest))
	_ = h.lake.EachNewsItem(r.Context(), func(news *gen.NewsItem) error {
		if _, listed := latest[news.RecordID]; !listed {
			return nil
		}
		if seen, ok := item[news.RecordID]; ok && seen.collectedAt >= news.CollectedAt {
			return nil
		}
		item[news.RecordID] = listItem{news.Title, news.SourceID, news.CollectedAt}
		return nil
	})

	out := make([]listedRecord, 0, len(order))
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
			NoCallReason:    analysis.NoCallReason,
		}
		if analysis.Sentiment != nil {
			sentiment := string(*analysis.Sentiment)
			row.Sentiment = &sentiment
		}
		if news, ok := item[recordID]; ok {
			row.Title = news.title
			row.SourceID = news.sourceID
			row.CollectedAt = news.collectedAt
		}
		out = append(out, listedRecord{row, analysis})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].row.AnalyzedAt != out[j].row.AnalyzedAt {
			return out[i].row.AnalyzedAt > out[j].row.AnalyzedAt
		}
		return out[i].row.RecordID < out[j].row.RecordID
	})
	return out
}

func (h *Handlers) fillExchange(row *debugRecordRow, analysis gen.Analysis) {
	exchange := exchangeOf(analysis, h.callHeadByID)
	row.ExchangeState = exchange.State
	row.NoCallReason = exchange.NoCallReason
	if exchange.Call != nil {
		outcome := exchange.Call.CallOutcome
		row.CallOutcome = &outcome
	}
}

// callHeadByID is a callLookup that reads only the call's head: a list row
// shows the outcome, never the prompt or reply.
func (h *Handlers) callHeadByID(callID string) (gen.LlmCallRecord, bool) {
	head, err := h.lake.LlmCallHeadOf(callID)
	if err != nil || head == nil {
		return gen.LlmCallRecord{}, false
	}
	return gen.LlmCallRecord{CallID: head.CallID, RunID: head.RunID, CallOutcome: head.CallOutcome}, true
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
