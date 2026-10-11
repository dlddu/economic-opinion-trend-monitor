package handlers

import (
	"net/http"
	"slices"
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
	clock := clockOf(r)

	clock.enter("silver")
	list := h.latestAnalyses(r)
	if gone(r) {
		return
	}
	var titleHit []bool
	if query != "" {
		clock.enter("titles")
		titleHit = h.titleMatches(r, list, query)
		if gone(r) {
			return
		}
	}

	clock.enter("filter")
	byCall := strings.HasPrefix(symptom, "call_outcome:")
	needle := strings.ToLower(query)
	var matched []int32
	for i := range list.rows {
		rec := &list.rows[i]
		if needle != "" && !strings.Contains(strings.ToLower(rec.recordID), needle) && !titleHit[i] {
			continue
		}
		if runID != "" && rec.runID != runID {
			continue
		}
		if symptom != "" {
			row := debugRecordRow{AnalysisStatus: rec.status, NoCallReason: optional(rec.noCall)}
			if byCall {
				if len(matched)%256 == 0 && gone(r) {
					return
				}
				h.fillExchange(&row, rec.analysis())
			}
			if !matchesDebugSymptom(row, symptom) {
				continue
			}
		}
		matched = append(matched, int32(i))
	}
	slices.SortFunc(matched, func(a, b int32) int {
		ra, rb := &list.rows[a], &list.rows[b]
		if c := strings.Compare(rb.analyzedAt, ra.analyzedAt); c != 0 {
			return c
		}
		return strings.Compare(ra.recordID, rb.recordID)
	})
	shown := matched[:min(len(matched), debugRecordsLimit)]

	clock.enter("bronze")
	items := h.listItems(r, list, shown)
	if gone(r) {
		return
	}
	rows := make([]debugRecordRow, 0, len(shown))
	for _, i := range shown {
		rec := &list.rows[i]
		row := debugRecordRow{
			RecordID:        rec.recordID,
			AnalysisStatus:  rec.status,
			Sentiment:       optional(rec.sentiment),
			Confidence:      rec.confidence,
			AnalyzerVersion: rec.version,
			AnalyzedAt:      rec.analyzedAt,
			RunID:           rec.runID,
			Versions:        int(rec.versions),
		}
		if item, ok := items[rec.recordID]; ok {
			row.Title, row.SourceID, row.CollectedAt = item.title, item.sourceID, item.collectedAt
		}
		h.fillExchange(&row, rec.analysis())
		rows = append(rows, row)
	}
	clock.note("records=%d matched=%d", len(list.rows), len(matched))

	writeJSON(w, http.StatusOK, debugRecordsResponse{
		Query:     query,
		RunID:     runID,
		Symptom:   symptom,
		Total:     len(list.rows),
		Matched:   len(matched),
		Limit:     debugRecordsLimit,
		Truncated: len(matched) > len(rows),
		Rows:      rows,
	})
}

// listedRecord is what the list keeps per record between its passes: the newest analysis row's
// listed fields, with values that repeat across rows shared. Keeping whole rows and building a
// response row for every record held about 200 MiB for 190 k records; the response shows 50.
type listedRecord struct {
	recordID, analyzedAt, callID string
	runID, version, status       string
	sentiment, noCall            string
	confidence                   float64
	versions                     int32
}

func (rec *listedRecord) analysis() gen.Analysis {
	a := gen.Analysis{RecordID: rec.recordID, NoCallReason: optional(rec.noCall)}
	if rec.callID != "" {
		a.CallID = &rec.callID
	}
	return a
}

type latestList struct {
	rows  []listedRecord
	index map[string]int32
}

func (h *Handlers) latestAnalyses(r *http.Request) *latestList {
	list := &latestList{index: map[string]int32{}}
	shared := map[string]string{}
	share := func(s string) string {
		if v, ok := shared[s]; ok {
			return v
		}
		shared[s] = s
		return s
	}
	_ = h.lake.EachAnalysis(r.Context(), func(a *gen.Analysis) error {
		i, seen := list.index[a.RecordID]
		if seen {
			list.rows[i].versions++
			if a.AnalyzedAt <= list.rows[i].analyzedAt {
				return nil
			}
		} else {
			i = int32(len(list.rows))
			list.index[a.RecordID] = i
			list.rows = append(list.rows, listedRecord{versions: 1})
		}
		rec := &list.rows[i]
		rec.recordID, rec.analyzedAt = a.RecordID, a.AnalyzedAt
		rec.runID, rec.version, rec.status = share(a.RunID), share(a.AnalyzerVersion), share(string(a.AnalysisStatus))
		rec.sentiment, rec.noCall, rec.callID = "", "", ""
		if a.Sentiment != nil {
			rec.sentiment = share(string(*a.Sentiment))
		}
		if a.NoCallReason != nil {
			rec.noCall = share(*a.NoCallReason)
		}
		if a.CallID != nil {
			rec.callID = *a.CallID
		}
		rec.confidence = a.Confidence
		return nil
	})
	return list
}

// titleMatches reports, per listed record, whether its shown title — the newest collection's,
// the first of equal times — contains query. It keeps one collection time per record, not titles.
func (h *Handlers) titleMatches(r *http.Request, list *latestList, query string) []bool {
	needle := strings.ToLower(query)
	hit := make([]bool, len(list.rows))
	seen := make([]bool, len(list.rows))
	newest := make([]string, len(list.rows))
	_ = h.lake.EachNewsItem(r.Context(), func(news *gen.NewsItem) error {
		i, listed := list.index[news.RecordID]
		if !listed || (seen[i] && newest[i] >= news.CollectedAt) {
			return nil
		}
		seen[i], newest[i] = true, news.CollectedAt
		hit[i] = strings.Contains(strings.ToLower(news.Title), needle)
		return nil
	})
	return hit
}

type listItem struct{ title, sourceID, collectedAt string }

// listItems finds the shown title, source and collection time of the shown records only.
func (h *Handlers) listItems(r *http.Request, list *latestList, shown []int32) map[string]listItem {
	items := make(map[string]listItem, len(shown))
	if len(shown) == 0 {
		return items
	}
	wanted := make(map[string]bool, len(shown))
	for _, i := range shown {
		wanted[list.rows[i].recordID] = true
	}
	_ = h.lake.EachNewsItem(r.Context(), func(news *gen.NewsItem) error {
		if !wanted[news.RecordID] {
			return nil
		}
		if seen, ok := items[news.RecordID]; ok && seen.collectedAt >= news.CollectedAt {
			return nil
		}
		items[news.RecordID] = listItem{news.Title, news.SourceID, news.CollectedAt}
		return nil
	})
	return items
}

func optional(s string) *string {
	if s == "" {
		return nil
	}
	return &s
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
