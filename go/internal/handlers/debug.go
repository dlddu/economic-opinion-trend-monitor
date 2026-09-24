package handlers

import "net/http"

// debugResponse is the stub the judgment-debug screen reads until the lake
// carries the records it is built on.
//
// The screen walks one Silver record back to the batch run and the model call
// that produced it (JRN-judgment-debug). Those two datasets are what PRD-4
// AC4.1–4.3 add; until they land there is nothing true to serve, so the route
// answers with an explicit stub marker and empty collections rather than a
// fabricated run or call. Available names what is missing so the placeholder can
// say it plainly.
type debugResponse struct {
	Stub      string   `json:"stub"`
	Available bool     `json:"available"`
	Missing   []string `json:"missing"`
	Runs      []any    `json:"runs"`
	Calls     []any    `json:"calls"`
}

func (h *Handlers) debug(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, debugResponse{
		Stub:      "stub: 판단 디버깅 자리 — 실행·호출 기록(PRD-4 AC4.1~4.3) 구현 전",
		Available: false,
		Missing:   []string{"run_record", "llm_call_record"},
		Runs:      []any{},
		Calls:     []any{},
	})
}
