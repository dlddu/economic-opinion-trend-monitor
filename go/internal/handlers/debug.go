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
		Stub:      "stub: 판단 디버깅 자리 — 레이크의 레코드↔실행↔호출 연결을 읽어 주는 조회 경로 구현 전",
		Available: false,
		Missing:   []string{"debug_read_path"},
		Runs:      []any{},
		Calls:     []any{},
	})
}
