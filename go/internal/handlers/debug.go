package handlers

import "net/http"

// debugResponse is the stub the judgment-debug screen reads until the lake
// carries the records it is built on.
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
