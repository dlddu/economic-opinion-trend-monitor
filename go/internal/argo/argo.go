// Package argo submits and lists Argo Workflows through the Kubernetes API.
//
// The serving Pod never writes the lake — its data mount is read-only on
// purpose. What it can do is ask the cluster to run the batch that does: a
// reprocess is a Workflow created from the batch WorkflowTemplate with the
// operator's range and version as parameters, and a publish/rollback is the
// same with the decision as parameters. This package is that one capability,
// spoken directly to the API server (no client-go: two verbs on one resource
// do not justify a dependency tree).
package argo

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"sort"
	"strings"
	"time"
)

const (
	saDir           = "/var/run/secrets/kubernetes.io/serviceaccount"
	workflowsPath   = "/apis/argoproj.io/v1alpha1/namespaces/%s/workflows"
	templatePath    = "/apis/argoproj.io/v1alpha1/namespaces/%s/workflowtemplates/%s"
	labelReprocess  = "econ-monitor/reprocess"
	labelKind       = "econ-monitor/kind"
	defaultTemplate = "econ-batch-pipeline"
)

// Client talks to one namespace of one API server.
type Client struct {
	BaseURL   string
	Namespace string
	Template  string
	token     string
	http      *http.Client
}

// FromEnv builds the in-cluster client, or returns nil when this process is
// not running in a Pod: no API server to speak to means no trigger, and the
// reprocess response says so instead of pretending.
//
//	KUBERNETES_SERVICE_HOST/PORT   the API server (set by the kubelet)
//	ECON_ARGO_NAMESPACE            overrides the ServiceAccount namespace
//	ECON_ARGO_WORKFLOW_TEMPLATE    overrides the template name (default econ-batch-pipeline)
func FromEnv() (*Client, error) {
	host, port := os.Getenv("KUBERNETES_SERVICE_HOST"), os.Getenv("KUBERNETES_SERVICE_PORT")
	if host == "" || port == "" {
		return nil, nil
	}
	token, err := os.ReadFile(saDir + "/token")
	if err != nil {
		return nil, fmt.Errorf("argo: read service account token: %w", err)
	}
	ns := os.Getenv("ECON_ARGO_NAMESPACE")
	if ns == "" {
		b, err := os.ReadFile(saDir + "/namespace")
		if err != nil {
			return nil, fmt.Errorf("argo: read service account namespace: %w", err)
		}
		ns = strings.TrimSpace(string(b))
	}
	pool := x509.NewCertPool()
	if ca, err := os.ReadFile(saDir + "/ca.crt"); err == nil {
		pool.AppendCertsFromPEM(ca)
	}
	c := New("https://"+host+":"+port, ns, strings.TrimSpace(string(token)))
	c.http.Transport = &http.Transport{TLSClientConfig: &tls.Config{RootCAs: pool, MinVersion: tls.VersionTLS12}}
	if t := os.Getenv("ECON_ARGO_WORKFLOW_TEMPLATE"); t != "" {
		c.Template = t
	}
	return c, nil
}

// New builds a client against baseURL with a bearer token; tests point it at a
// fake API server.
func New(baseURL, namespace, token string) *Client {
	return &Client{
		BaseURL:   strings.TrimRight(baseURL, "/"),
		Namespace: namespace,
		Template:  defaultTemplate,
		token:     token,
		http:      &http.Client{Timeout: 10 * time.Second},
	}
}

// Submission is one Workflow to create from the template.
type Submission struct {
	// Kind labels the run for listing: "sample", "run" or "publish".
	Kind       string
	Entrypoint string
	Parameters map[string]string
	// Annotations carry what the operator asked for, so a listing can show it
	// without reading the spec back.
	Annotations map[string]string
}

// Run is the shape the API reports a workflow in.
type Run struct {
	Name        string            `json:"name"`
	Kind        string            `json:"kind"`
	Phase       string            `json:"phase"`
	Message     string            `json:"message"`
	StartedAt   string            `json:"started_at"`
	FinishedAt  string            `json:"finished_at"`
	Parameters  map[string]string `json:"parameters"`
	Annotations map[string]string `json:"annotations"`
}

// APIError is a non-2xx answer from the API server, with its status message.
type APIError struct {
	Status  int
	Message string
}

func (e *APIError) Error() string { return fmt.Sprintf("api server: %d %s", e.Status, e.Message) }

// TemplateReachable reports whether the WorkflowTemplate can be read with this
// identity — the cheapest proof that both the wiring (Argo installed, template
// applied) and the RBAC (this ServiceAccount may see it) are in place.
func (c *Client) TemplateReachable(ctx context.Context) error {
	_, err := c.do(ctx, http.MethodGet, fmt.Sprintf(templatePath, c.Namespace, c.Template), nil)
	return err
}

// Submit creates the Workflow and returns it as the API server reports it.
func (c *Client) Submit(ctx context.Context, s Submission) (Run, error) {
	params := make([]map[string]string, 0, len(s.Parameters))
	for k, v := range s.Parameters {
		params = append(params, map[string]string{"name": k, "value": v})
	}
	labels := map[string]string{labelReprocess: "true", labelKind: s.Kind}
	body := map[string]any{
		"apiVersion": "argoproj.io/v1alpha1",
		"kind":       "Workflow",
		"metadata": map[string]any{
			"generateName": "econ-reprocess-" + s.Kind + "-",
			"labels":       labels,
			"annotations":  s.Annotations,
		},
		"spec": map[string]any{
			"workflowTemplateRef": map[string]string{"name": c.Template},
			"entrypoint":          s.Entrypoint,
			"arguments":           map[string]any{"parameters": params},
			// A reprocess is bounded by the model endpoint; an hour and a half
			// is the hourly pipeline's own bound with room for a 30-day range.
			"activeDeadlineSeconds": 5400,
			"ttlStrategy":           map[string]int{"secondsAfterCompletion": 7 * 24 * 3600},
		},
	}
	raw, err := c.do(ctx, http.MethodPost, fmt.Sprintf(workflowsPath, c.Namespace), body)
	if err != nil {
		return Run{}, err
	}
	var wf workflow
	if err := json.Unmarshal(raw, &wf); err != nil {
		return Run{}, fmt.Errorf("argo: decode created workflow: %w", err)
	}
	return wf.run(), nil
}

// List returns the reprocess runs in the namespace, newest first.
func (c *Client) List(ctx context.Context) ([]Run, error) {
	path := fmt.Sprintf(workflowsPath, c.Namespace) + "?labelSelector=" + labelReprocess + "%3Dtrue"
	raw, err := c.do(ctx, http.MethodGet, path, nil)
	if err != nil {
		return nil, err
	}
	var list struct {
		Items []workflow `json:"items"`
	}
	if err := json.Unmarshal(raw, &list); err != nil {
		return nil, fmt.Errorf("argo: decode workflow list: %w", err)
	}
	// Creation order is what the operator thinks of as "latest"; names carry
	// no order, so sort on the timestamp the API server stamped.
	sort.SliceStable(list.Items, func(i, j int) bool {
		return list.Items[i].Metadata.CreationTimestamp > list.Items[j].Metadata.CreationTimestamp
	})
	runs := make([]Run, 0, len(list.Items))
	for _, wf := range list.Items {
		runs = append(runs, wf.run())
	}
	return runs, nil
}

func (c *Client) do(ctx context.Context, method, path string, body any) ([]byte, error) {
	var payload io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, err
		}
		payload = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, payload)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("argo: %s %s: %w", method, path, err)
	}
	defer resp.Body.Close()
	raw, err := io.ReadAll(io.LimitReader(resp.Body, 4<<20))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode > 299 {
		var status struct {
			Message string `json:"message"`
		}
		_ = json.Unmarshal(raw, &status)
		if status.Message == "" {
			status.Message = strings.TrimSpace(string(raw))
		}
		return nil, &APIError{Status: resp.StatusCode, Message: status.Message}
	}
	return raw, nil
}

// IsAPIError reports whether err is an API server refusal and, if so, its status.
func IsAPIError(err error) (int, bool) {
	var e *APIError
	if errors.As(err, &e) {
		return e.Status, true
	}
	return 0, false
}

// workflow is the subset of an Argo Workflow object this package reads.
type workflow struct {
	Metadata struct {
		Name              string            `json:"name"`
		Labels            map[string]string `json:"labels"`
		Annotations       map[string]string `json:"annotations"`
		CreationTimestamp string            `json:"creationTimestamp"`
	} `json:"metadata"`
	Spec struct {
		Arguments struct {
			Parameters []struct {
				Name  string `json:"name"`
				Value string `json:"value"`
			} `json:"parameters"`
		} `json:"arguments"`
	} `json:"spec"`
	Status struct {
		Phase      string `json:"phase"`
		Message    string `json:"message"`
		StartedAt  string `json:"startedAt"`
		FinishedAt string `json:"finishedAt"`
	} `json:"status"`
}

func (wf workflow) run() Run {
	params := make(map[string]string, len(wf.Spec.Arguments.Parameters))
	for _, p := range wf.Spec.Arguments.Parameters {
		params[p.Name] = p.Value
	}
	phase := wf.Status.Phase
	if phase == "" {
		phase = "Pending"
	}
	ann := wf.Metadata.Annotations
	if ann == nil {
		ann = map[string]string{}
	}
	return Run{
		Name:        wf.Metadata.Name,
		Kind:        wf.Metadata.Labels[labelKind],
		Phase:       phase,
		Message:     wf.Status.Message,
		StartedAt:   wf.Status.StartedAt,
		FinishedAt:  wf.Status.FinishedAt,
		Parameters:  params,
		Annotations: ann,
	}
}
