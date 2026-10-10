package handlers

import (
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

func (h *Handlers) debug(w http.ResponseWriter, r *http.Request) {
	requested := r.URL.Query().Get("record_id")
	clock := clockOf(r)
	clock.enter("silver")
	scan := h.scanDebugSilver(r, requested)
	if gone(r) {
		return
	}
	if !scan.selection.found {
		writeJSON(w, http.StatusOK, debugResponse{
			RecordID:  requested,
			Selection: scan.selection.how,
			Found:     false,
			Versions:  []debugVersion{},
		})
		return
	}

	clock.enter("calls")
	rows := debugVersionsOf(scan.rows, h.callByID)
	selected := rows[0]
	for _, row := range rows {
		if row.Selected {
			selected = row
		}
	}

	clock.enter("run")
	run, _ := h.lake.PipelineRun(selected.RunID)
	debugRun := h.debugRunOf(r, run, scan.runs[selected.RunID])
	clock.enter("bronze")
	input := h.debugInputOf(r, scan.recordID, scan.rows[0].SourceURL)
	if gone(r) {
		return
	}

	writeJSON(w, http.StatusOK, debugResponse{
		RecordID:  scan.recordID,
		Selection: scan.selection.how,
		Found:     true,
		Versions:  rows,
		Run:       debugRun,
		Input:     input,
	})
}

type debugSelection struct {
	found bool
	how   string
}

// runTally is what the run panel counts over Silver, kept per run so the one
// Silver pass that finds the record also has the counts for whichever run it picks.
type runTally struct {
	records int
	status  map[string]int
	noCall  map[string]int
}

type debugSilverScan struct {
	recordID  string
	selection debugSelection
	rows      []gen.Analysis
	runs      map[string]*runTally
}

func (h *Handlers) scanDebugSilver(r *http.Request, requested string) debugSilverScan {
	scan := debugSilverScan{recordID: requested, runs: map[string]*runTally{}}
	first := true
	scanned := 0
	defer func() { clockOf(r).note("silver_rows=%d", scanned) }()
	_ = h.lake.EachAnalysis(r.Context(), func(a *gen.Analysis) error {
		scanned++
		if first && requested == "" {
			scan.recordID = a.RecordID
		}
		first = false
		if a.RecordID == scan.recordID {
			scan.rows = append(scan.rows, *a)
		}
		t := scan.runs[a.RunID]
		if t == nil {
			t = &runTally{status: map[string]int{}, noCall: map[string]int{}}
			scan.runs[a.RunID] = t
		}
		t.records++
		t.status[string(a.AnalysisStatus)]++
		if a.NoCallReason != nil {
			t.noCall[*a.NoCallReason]++
		}
		return nil
	})
	switch {
	case len(scan.rows) > 0 && requested != "":
		scan.selection = debugSelection{true, "requested"}
	case len(scan.rows) > 0:
		scan.selection = debugSelection{true, "auto"}
	case requested != "":
		scan.selection = debugSelection{false, "requested-missing"}
	default:
		scan.selection = debugSelection{false, "empty"}
	}
	return scan
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

func (h *Handlers) debugRunOf(r *http.Request, run *gen.PipelineRun, silver *runTally) *debugRun {
	if run == nil {
		return nil
	}
	if silver == nil {
		silver = &runTally{}
	}
	clock := clockOf(r)
	clock.enter("tally")
	before := h.calls.Counted()
	_ = h.calls.Refresh(r.Context(), h.lake)
	clock.note("tally_read=%d tally_total=%d", h.calls.Counted()-before, h.calls.Counted())
	made, outcome := h.calls.Run(run.RunID)
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
			Records:        silver.records,
			Calls:          made,
			AnalysisStatus: tallies(silver.status),
			CallOutcome:    tallies(outcome),
			NoCallReason:   tallies(silver.noCall),
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
