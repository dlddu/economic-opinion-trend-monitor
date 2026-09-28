package handlers

import (
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// debugResponse walks one Silver record back to the model call and the batch run that produced it (JRN-judgment-debug).
type debugResponse struct {
	RecordID  string         `json:"record_id"`
	Selection string         `json:"selection"`
	Found     bool           `json:"found"`
	Versions  []debugVersion `json:"versions"`
	Run       *debugRun      `json:"run"`
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

func (h *Handlers) debug(w http.ResponseWriter, r *http.Request) {
	requested := r.URL.Query().Get("record_id")
	analyses, _ := h.lake.Analyses()

	recordID, selection := selectDebugRecord(analyses, requested)
	if !selection.found {
		writeJSON(w, http.StatusOK, debugResponse{
			RecordID:  requested,
			Selection: selection.how,
			Found:     false,
			Versions:  []debugVersion{},
		})
		return
	}

	calls, _ := h.lake.LlmCalls()
	rows := debugVersionsOf(recordID, analyses, calls)
	selected := rows[0]
	for _, row := range rows {
		if row.Selected {
			selected = row
		}
	}

	run, _ := h.lake.PipelineRun(selected.RunID)

	writeJSON(w, http.StatusOK, debugResponse{
		RecordID:  recordID,
		Selection: selection.how,
		Found:     true,
		Versions:  rows,
		Run:       debugRunOf(run, analyses, calls),
	})
}

type debugSelection struct {
	found bool
	how   string
}

func selectDebugRecord(analyses []gen.Analysis, requested string) (string, debugSelection) {
	if requested != "" {
		for i := range analyses {
			if analyses[i].RecordID == requested {
				return requested, debugSelection{true, "requested"}
			}
		}
		return "", debugSelection{false, "requested-missing"}
	}
	if len(analyses) == 0 {
		return "", debugSelection{false, "empty"}
	}
	return analyses[0].RecordID, debugSelection{true, "auto"}
}

func debugVersionsOf(recordID string, analyses []gen.Analysis, calls []gen.LlmCallRecord) []debugVersion {
	byCallID := make(map[string]gen.LlmCallRecord, len(calls))
	for _, call := range calls {
		byCallID[call.CallID] = call
	}

	rows := make([]debugVersion, 0, 1)
	for _, analysis := range analyses {
		if analysis.RecordID != recordID {
			continue
		}
		row := debugVersion{
			AnalyzerVersion:   analysis.AnalyzerVersion,
			AnalyzedAt:        analysis.AnalyzedAt,
			AnalysisStatus:    string(analysis.AnalysisStatus),
			Confidence:        analysis.Confidence,
			TargetCountries:   orEmpty(analysis.TargetCountries),
			NarrativeSubjects: orEmpty(analysis.NarrativeSubjects),
			RunID:             analysis.RunID,
			Exchange:          exchangeOf(analysis, byCallID),
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

func exchangeOf(analysis gen.Analysis, byCallID map[string]gen.LlmCallRecord) debugExchange {
	if analysis.NoCallReason != nil {
		return debugExchange{State: exchangeNoCall, NoCallReason: analysis.NoCallReason}
	}
	if analysis.CallID == nil {
		return debugExchange{State: exchangeUnrecorded}
	}
	call, ok := byCallID[*analysis.CallID]
	if !ok {
		return debugExchange{State: exchangeCallAbsent, CallID: analysis.CallID}
	}
	exchange := debugExchange{State: exchangeCall, CallID: analysis.CallID, Call: projectCall(call)}
	if call.ReusedFromCallID != nil {
		if origin, ok := byCallID[*call.ReusedFromCallID]; ok {
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

func debugRunOf(run *gen.PipelineRun, analyses []gen.Analysis, calls []gen.LlmCallRecord) *debugRun {
	if run == nil {
		return nil
	}
	status := make(map[string]int)
	noCall := make(map[string]int)
	records := 0
	for _, analysis := range analyses {
		if analysis.RunID != run.RunID {
			continue
		}
		records++
		status[string(analysis.AnalysisStatus)]++
		if analysis.NoCallReason != nil {
			noCall[*analysis.NoCallReason]++
		}
	}
	outcome := make(map[string]int)
	made := 0
	for _, call := range calls {
		if call.RunID != run.RunID {
			continue
		}
		made++
		outcome[string(call.CallOutcome)]++
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
			Calls:          made,
			AnalysisStatus: tallies(status),
			CallOutcome:    tallies(outcome),
			NoCallReason:   tallies(noCall),
		},
	}
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
