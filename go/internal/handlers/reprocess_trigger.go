package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/argo"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// Each trigger submits one Workflow from the batch WorkflowTemplate. The Pod's
// data mount is read-only, so nothing here touches the lake: the batch does,
// with the parameters the operator chose, and the read side of /api/reprocess
// shows the result the next time it is asked.

const (
	entrypointReprocess = "reprocess"
	entrypointPublish   = "publish"
	triggerProbeTTL     = 30 * time.Second
	maxSampleSize       = 500
	maxBatchSize        = 1000
	maxMemoLength       = 2000
)

type reprocessTrigger struct {
	Available bool `json:"available"`
	// Note explains an unavailable trigger; empty when Available.
	Note string `json:"note"`
	// ServingVersion is what the last store.ReprocessDecision named; empty when none.
	ServingVersion string                    `json:"serving_version"`
	Decisions      []store.ReprocessDecision `json:"decisions"`
	Runs           []argo.Run                `json:"runs"`
}

type triggerProbe struct {
	mu      sync.Mutex
	checked time.Time
	err     error
}

// probeArgo answers whether a run can be submitted right now, caching the
// answer briefly so a screen refresh does not become an API-server call.
func (h *Handlers) probeArgo(ctx context.Context) error {
	if h.argo == nil {
		return fmt.Errorf("이 서빙은 클러스터 밖에서 돌고 있어 Argo Workflows 에 제출할 배선이 없다")
	}
	h.trigger.mu.Lock()
	defer h.trigger.mu.Unlock()
	if !h.trigger.checked.IsZero() && h.now().Sub(h.trigger.checked) < triggerProbeTTL {
		return h.trigger.err
	}
	err := h.argo.TemplateReachable(ctx)
	if err != nil {
		err = fmt.Errorf("WorkflowTemplate %s 에 닿지 못한다 (%v)", h.argo.Template, err)
	}
	h.trigger.checked, h.trigger.err = h.now(), err
	return err
}

func (h *Handlers) reprocessTrigger(r *http.Request) reprocessTrigger {
	out := reprocessTrigger{Decisions: []store.ReprocessDecision{}, Runs: []argo.Run{}}
	if decisions, err := h.lake.ReprocessDecisions(); err == nil && len(decisions) > 0 {
		out.Decisions = decisions
		out.ServingVersion = decisions[len(decisions)-1].AnalyzerVersion
	}
	if err := h.probeArgo(r.Context()); err != nil {
		out.Note = err.Error()
		return out
	}
	out.Available = true
	if runs, err := h.argo.List(r.Context()); err == nil {
		out.Runs = runs
	} else {
		out.Note = "실행 목록을 읽지 못했다: " + err.Error()
	}
	return out
}

func (h *Handlers) reprocessRuns(w http.ResponseWriter, r *http.Request) {
	if err := h.probeArgo(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
		return
	}
	runs, err := h.argo.List(r.Context())
	if err != nil {
		writeArgoError(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"runs": runs})
}

type reprocessRequest struct {
	Range           string `json:"range"`
	Axis            string `json:"axis"`
	Source          string `json:"source"`
	AnalyzerVersion string `json:"analyzer_version"`
	SampleSize      int    `json:"sample_size"`
	SampleMode      string `json:"sample_mode"`
	BatchSize       int    `json:"batch_size"`
}

func (h *Handlers) reprocessSample(w http.ResponseWriter, r *http.Request) {
	h.submitReprocess(w, r, "sample")
}

func (h *Handlers) reprocessRun(w http.ResponseWriter, r *http.Request) {
	h.submitReprocess(w, r, "run")
}

func (h *Handlers) submitReprocess(w http.ResponseWriter, r *http.Request, kind string) {
	var req reprocessRequest
	if err := decodeBody(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	window, ok := reprocessRanges[req.Range]
	if !ok {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "range 는 24h·7d·30d 중 하나여야 한다"})
		return
	}
	switch req.Axis {
	case "KR", "US", "GLOBAL":
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "axis 는 KR·US·GLOBAL 중 하나여야 한다"})
		return
	}
	req.AnalyzerVersion = strings.TrimSpace(req.AnalyzerVersion)
	if req.AnalyzerVersion == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "analyzer_version 이 비어 있다 — 어느 로직 버전을 찍을지 정해야 한다"})
		return
	}
	if kind == "sample" {
		if req.SampleSize < 1 || req.SampleSize > maxSampleSize {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("sample_size 는 1~%d 이어야 한다", maxSampleSize)})
			return
		}
		if req.SampleMode != "random" && req.SampleMode != "recent" {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "sample_mode 는 random·recent 중 하나여야 한다"})
			return
		}
	} else {
		req.SampleSize, req.SampleMode = 0, "random"
	}
	if req.BatchSize == 0 {
		req.BatchSize = 100
	}
	if req.BatchSize < 1 || req.BatchSize > maxBatchSize {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("batch_size 는 1~%d 이어야 한다", maxBatchSize)})
		return
	}
	if err := h.probeArgo(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
		return
	}
	since := h.now().Add(-window).UTC().Format(time.RFC3339)
	run, err := h.argo.Submit(r.Context(), argo.Submission{
		Kind:       kind,
		Entrypoint: entrypointReprocess,
		Parameters: map[string]string{
			"version":     req.AnalyzerVersion,
			"since":       since,
			"axis":        req.Axis,
			"source":      req.Source,
			"sample":      fmt.Sprint(req.SampleSize),
			"sample_mode": req.SampleMode,
			"batch":       fmt.Sprint(req.BatchSize),
		},
		Annotations: map[string]string{
			"econ-monitor/range": req.Range,
		},
	})
	if err != nil {
		writeArgoError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"run": run})
}

// publishRequest is the body of POST /api/reprocess/publish: the decision the
// journey ends on, with its reason — a decision without a memo is refused, the
// batch refuses it too, and neither would be able to explain the numbers later.
type publishRequest struct {
	Decision        string `json:"decision"`
	AnalyzerVersion string `json:"analyzer_version"`
	Memo            string `json:"memo"`
	NotifyConsumer  bool   `json:"notify_consumer"`
}

func (h *Handlers) reprocessPublish(w http.ResponseWriter, r *http.Request) {
	var req publishRequest
	if err := decodeBody(r, &req); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	if req.Decision != "publish" && req.Decision != "rollback" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "반영할지 되돌릴지를 먼저 고르세요."})
		return
	}
	req.AnalyzerVersion = strings.TrimSpace(req.AnalyzerVersion)
	if req.AnalyzerVersion == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "어느 로직 버전을 서빙할지(analyzer_version)가 비어 있다."})
		return
	}
	req.Memo = strings.TrimSpace(req.Memo)
	if req.Memo == "" {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "결정 근거를 적어야 기록됩니다 — 근거가 없으면 나중에 숫자가 왜 바뀌었는지 설명할 수 없습니다."})
		return
	}
	if len(req.Memo) > maxMemoLength {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": fmt.Sprintf("결정 근거는 %d자 이내로 적으세요.", maxMemoLength)})
		return
	}
	if err := h.probeArgo(r.Context()); err != nil {
		writeJSON(w, http.StatusServiceUnavailable, map[string]string{"error": err.Error()})
		return
	}
	run, err := h.argo.Submit(r.Context(), argo.Submission{
		Kind:       "publish",
		Entrypoint: entrypointPublish,
		Parameters: map[string]string{
			"decision": req.Decision,
			"version":  req.AnalyzerVersion,
			"memo":     req.Memo,
			"notify":   fmt.Sprint(req.NotifyConsumer),
		},
	})
	if err != nil {
		writeArgoError(w, err)
		return
	}
	writeJSON(w, http.StatusAccepted, map[string]any{"run": run})
}

func decodeBody(r *http.Request, into any) error {
	dec := json.NewDecoder(http.MaxBytesReader(nil, r.Body, 64<<10))
	dec.DisallowUnknownFields()
	if err := dec.Decode(into); err != nil {
		return fmt.Errorf("요청 본문을 읽지 못했다: %v", err)
	}
	return nil
}

// writeArgoError passes the API server's own refusal through (a 403 is an
// RBAC gap the operator has to see as such) and reports everything else as a
// bad gateway.
func writeArgoError(w http.ResponseWriter, err error) {
	status := http.StatusBadGateway
	if code, ok := argo.IsAPIError(err); ok && (code == http.StatusForbidden || code == http.StatusNotFound || code == http.StatusUnauthorized) {
		status = code
	}
	writeJSON(w, status, map[string]string{"error": err.Error()})
}
