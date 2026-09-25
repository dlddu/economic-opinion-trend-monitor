package handlers

import "net/http"

// debugResponse is the stub the judgment-debug screen reads until the lake
// carries the records it is built on.
//
// The screen walks one Silver record back to the batch run and the model call
// that produced it (JRN-judgment-debug). Batch run records now land in the lake
// (silver/pipeline_run, AC4.1), but the call records and the record -> run ->
// call links the walk needs are AC4.2-AC4.3 and are still missing, so the route
// keeps answering with an explicit stub marker and empty collections rather than
// a half-built walk. Missing names exactly what is still absent so the
// placeholder can say it plainly.
type debugResponse struct {
	Stub      string   `json:"stub"`
	Available bool     `json:"available"`
	Missing   []string `json:"missing"`
	Runs      []any    `json:"runs"`
	Calls     []any    `json:"calls"`
}

func (h *Handlers) debug(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, debugResponse{
		Stub:      "stub: 판단 디버깅 자리 — 호출 기록과 레코드↔실행↔호출 연결(PRD-4 AC4.2~4.3) 구현 전",
		Available: false,
		Missing:   []string{"llm_call_record"},
		Runs:      []any{},
		Calls:     []any{},
	})
}
