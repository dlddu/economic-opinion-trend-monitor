package handlers

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

type debugResponse struct {
	RecordID  string         `json:"record_id"`
	Selection string         `json:"selection"`
	Found     bool           `json:"found"`
	Versions  []debugVersion `json:"versions"`
	Run       *debugRun      `json:"run"`
	Input     *debugInput    `json:"input"`
}

type debugVersion struct {
	AnalyzerVersion   string        `json:"analyzer_version"`
	AnalyzedAt        string        `json:"analyzed_at"`
	AnalysisStatus    string        `json:"analysis_status"`
	Sentiment         *string       `json:"sentiment"`
	Confidence        float64       `json:"confidence"`
	TargetCountries   []string      `json:"target_countries"`
	NarrativeSubjects []string      `json:"narrative_subjects"`
	RunID             string        `json:"run_id"`
	Selected          bool          `json:"selected"`
	Exchange          debugExchange `json:"exchange"`
}

type debugExchange struct {
	State        string     `json:"state"`
	NoCallReason *string    `json:"no_call_reason"`
	CallID       *string    `json:"call_id"`
	Call         *debugCall `json:"call"`
	ReusedFrom   *debugCall `json:"reused_from"`
}

type debugCall struct {
	CallID            string   `json:"call_id"`
	RunID             string   `json:"run_id"`
	AnalyzerVersion   string   `json:"analyzer_version"`
	CallModel         string   `json:"call_model"`
	CallTemperature   *float64 `json:"call_temperature"`
	PromptSystem      string   `json:"prompt_system"`
	PromptUser        string   `json:"prompt_user"`
	PromptSha256      string   `json:"prompt_sha256"`
	ResponseRaw       *string  `json:"response_raw"`
	CallOutcome       string   `json:"call_outcome"`
	CallFailureReason *string  `json:"call_failure_reason"`
	CallAttemptCount  int64    `json:"call_attempt_count"`
	CalledAt          string   `json:"called_at"`
	DurationMs        int64    `json:"duration_ms"`
	ReusedFromCallID  *string  `json:"reused_from_call_id"`
}

type debugRun struct {
	RunID        string         `json:"run_id"`
	RunTrigger   string         `json:"run_trigger"`
	RunStartedAt string         `json:"run_started_at"`
	RunEndedAt   *string        `json:"run_ended_at"`
	RunStatus    string         `json:"run_status"`
	Stages       []gen.RunStage `json:"stages"`
	Symptoms     debugSymptoms  `json:"symptoms"`
}

type debugSymptoms struct {
	Records        int          `json:"records"`
	Calls          int          `json:"calls"`
	AnalysisStatus []debugTally `json:"analysis_status"`
	CallOutcome    []debugTally `json:"call_outcome"`
	NoCallReason   []debugTally `json:"no_call_reason"`
}

type debugTally struct {
	Name  string `json:"name"`
	Count int    `json:"count"`
}

const (
	exchangeCall       = "call"
	exchangeNoCall     = "no-call"
	exchangeCallAbsent = "call-record-absent"
	exchangeUnrecorded = "unrecorded"
)

// debug walks one record back to its analyses, their model calls, the run and the Bronze input.
// The index finds the rows; a call, a run and a body are each one object read from the lake.
func (h *Handlers) debug(w http.ResponseWriter, r *http.Request, db *sql.DB) error {
	requested := r.URL.Query().Get("record_id")
	ctx := r.Context()
	clock := clockOf(r)
	clock.enter("silver")
	recordID := requested
	if requested == "" {
		err := db.QueryRowContext(ctx, "SELECT record_id FROM analysis ORDER BY seq LIMIT 1").Scan(&recordID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
	}
	analyses, err := indexedAnalyses(ctx, db, recordID)
	if err != nil {
		return err
	}
	selection := debugSelection{len(analyses) > 0, "requested"}
	switch {
	case len(analyses) > 0 && requested == "":
		selection.how = "auto"
	case len(analyses) == 0 && requested != "":
		selection.how = "requested-missing"
	case len(analyses) == 0:
		selection.how = "empty"
	}
	if !selection.found {
		writeJSON(w, http.StatusOK, debugResponse{
			RecordID:  requested,
			Selection: selection.how,
			Found:     false,
			Versions:  []debugVersion{},
		})
		return nil
	}

	clock.enter("calls")
	rows := debugVersionsOf(analyses, h.callByID)
	selected := rows[0]

	clock.enter("run")
	run, _ := h.lake.PipelineRun(selected.RunID)
	debugRun, err := debugRunOf(ctx, db, run)
	if err != nil {
		return err
	}
	clock.enter("bronze")
	input, err := h.debugInputOf(ctx, db, recordID)
	if err != nil {
		return err
	}

	writeJSON(w, http.StatusOK, debugResponse{
		RecordID:  recordID,
		Selection: selection.how,
		Found:     true,
		Versions:  rows,
		Run:       debugRun,
		Input:     input,
	})
	return nil
}

type debugSelection struct {
	found bool
	how   string
}

// indexedAnalyses reads a record's analyses newest first, the earliest-walked of equal times first.
func indexedAnalyses(ctx context.Context, db *sql.DB, recordID string) ([]gen.Analysis, error) {
	rs, err := db.QueryContext(ctx, `SELECT record_id, source_url, target_countries, narrative_subjects,
		sentiment, analysis_status, confidence, analyzed_at, analyzer_version, run_id, call_id, no_call_reason
		FROM analysis WHERE record_id = ? ORDER BY analyzed_at DESC, seq`, recordID)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	var out []gen.Analysis
	for rs.Next() {
		var a gen.Analysis
		var countries, subjects string
		var sentiment, callID, noCall sql.NullString
		if err := rs.Scan(&a.RecordID, &a.SourceURL, &countries, &subjects, &sentiment, &a.AnalysisStatus,
			&a.Confidence, &a.AnalyzedAt, &a.AnalyzerVersion, &a.RunID, &callID, &noCall); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(countries), &a.TargetCountries); err != nil {
			return nil, err
		}
		if err := json.Unmarshal([]byte(subjects), &a.NarrativeSubjects); err != nil {
			return nil, err
		}
		if sentiment.Valid {
			s := gen.Sentiment(sentiment.String)
			a.Sentiment = &s
		}
		a.CallID, a.NoCallReason = nullable(callID), nullable(noCall)
		out = append(out, a)
	}
	return out, rs.Err()
}

// callLookup reads one llm_call record by call_id. A record kept in memory per
// lookup, not all of them at once: the prompt and reply text is most of Silver's size.
type callLookup func(callID string) (gen.LlmCallRecord, bool)

func (h *Handlers) callByID(callID string) (gen.LlmCallRecord, bool) {
	call, err := h.lake.LlmCall(callID)
	if err != nil || call == nil {
		return gen.LlmCallRecord{}, false
	}
	return *call, true
}

func debugVersionsOf(analyses []gen.Analysis, lookup callLookup) []debugVersion {
	rows := make([]debugVersion, 0, 1)
	for _, analysis := range analyses {
		row := debugVersion{
			AnalyzerVersion:   analysis.AnalyzerVersion,
			AnalyzedAt:        analysis.AnalyzedAt,
			AnalysisStatus:    string(analysis.AnalysisStatus),
			Confidence:        analysis.Confidence,
			TargetCountries:   orEmpty(analysis.TargetCountries),
			NarrativeSubjects: orEmpty(analysis.NarrativeSubjects),
			RunID:             analysis.RunID,
			Exchange:          exchangeOf(analysis, lookup),
		}
		if analysis.Sentiment != nil {
			sentiment := string(*analysis.Sentiment)
			row.Sentiment = &sentiment
		}
		rows = append(rows, row)
	}
	sort.SliceStable(rows, func(i, j int) bool { return rows[i].AnalyzedAt > rows[j].AnalyzedAt })
	if len(rows) > 0 {
		rows[0].Selected = true
	}
	return rows
}

func exchangeOf(analysis gen.Analysis, lookup callLookup) debugExchange {
	if analysis.NoCallReason != nil {
		return debugExchange{State: exchangeNoCall, NoCallReason: analysis.NoCallReason}
	}
	if analysis.CallID == nil {
		return debugExchange{State: exchangeUnrecorded}
	}
	call, ok := lookup(*analysis.CallID)
	if !ok {
		return debugExchange{State: exchangeCallAbsent, CallID: analysis.CallID}
	}
	exchange := debugExchange{State: exchangeCall, CallID: analysis.CallID, Call: projectCall(call)}
	if call.ReusedFromCallID != nil {
		if origin, ok := lookup(*call.ReusedFromCallID); ok {
			exchange.ReusedFrom = projectCall(origin)
		}
	}
	return exchange
}

func projectCall(call gen.LlmCallRecord) *debugCall {
	return &debugCall{
		CallID:            call.CallID,
		RunID:             call.RunID,
		AnalyzerVersion:   call.AnalyzerVersion,
		CallModel:         call.CallModel,
		CallTemperature:   call.CallTemperature,
		PromptSystem:      call.PromptSystem,
		PromptUser:        call.PromptUser,
		PromptSha256:      call.PromptSha256,
		ResponseRaw:       call.ResponseRaw,
		CallOutcome:       string(call.CallOutcome),
		CallFailureReason: call.CallFailureReason,
		CallAttemptCount:  call.CallAttemptCount,
		CalledAt:          call.CalledAt,
		DurationMs:        call.DurationMs,
		ReusedFromCallID:  call.ReusedFromCallID,
	}
}

// debugRunOf is the run panel: the run record from the lake, and what its analyses and its
// model calls came to, counted in the index.
func debugRunOf(ctx context.Context, db *sql.DB, run *gen.PipelineRun) (*debugRun, error) {
	if run == nil {
		return nil, nil
	}
	status, err := countBy(ctx, db, `SELECT analysis_status, count(*) FROM analysis
		WHERE run_id = ? GROUP BY analysis_status`, run.RunID)
	if err != nil {
		return nil, err
	}
	noCall, err := countBy(ctx, db, `SELECT no_call_reason, count(*) FROM analysis
		WHERE run_id = ? AND no_call_reason IS NOT NULL GROUP BY no_call_reason`, run.RunID)
	if err != nil {
		return nil, err
	}
	outcome, err := countBy(ctx, db, "SELECT call_outcome, calls FROM run_call WHERE run_id = ?", run.RunID)
	if err != nil {
		return nil, err
	}
	records, calls := 0, 0
	for _, n := range status {
		records += n
	}
	for _, n := range outcome {
		calls += n
	}
	stages := run.Stages
	if stages == nil {
		stages = []gen.RunStage{}
	}
	return &debugRun{
		RunID:        run.RunID,
		RunTrigger:   string(run.RunTrigger),
		RunStartedAt: run.RunStartedAt,
		RunEndedAt:   run.RunEndedAt,
		RunStatus:    string(run.RunStatus),
		Stages:       stages,
		Symptoms: debugSymptoms{
			Records:        records,
			Calls:          calls,
			AnalysisStatus: tallies(status),
			CallOutcome:    tallies(outcome),
			NoCallReason:   tallies(noCall),
		},
	}, nil
}

func countBy(ctx context.Context, db *sql.DB, query string, args ...any) (map[string]int, error) {
	rs, err := db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rs.Close()
	counts := map[string]int{}
	for rs.Next() {
		var name string
		var n int
		if err := rs.Scan(&name, &n); err != nil {
			return nil, err
		}
		counts[name] += n
	}
	return counts, rs.Err()
}

func tallies(counts map[string]int) []debugTally {
	out := make([]debugTally, 0, len(counts))
	for name, count := range counts {
		out = append(out, debugTally{Name: name, Count: count})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Count != out[j].Count {
			return out[i].Count > out[j].Count
		}
		return out[i].Name < out[j].Name
	})
	return out
}

func orEmpty(values []string) []string {
	if values == nil {
		return []string{}
	}
	return values
}
