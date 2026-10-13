package handlers

import (
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

const (
	defaultSpikeBaseline = "7d"
	spikeThreshold       = 1.5
	spikeRowLimit        = 20
)

var spikeBaselines = map[string]bool{"7d": true, "30d": true}

type spikeBasis struct {
	BucketUnit      string   `json:"bucket_unit"`
	TimeBucket      string   `json:"time_bucket"`
	Baseline        string   `json:"baseline"`
	BaselineBuckets []string `json:"baseline_buckets"`
	HasBaseline     bool     `json:"has_baseline"`
	Threshold       float64  `json:"threshold"`
}

type spikeRow struct {
	Rank               int      `json:"rank"`
	Subject            string   `json:"subject"`
	RawCount           int64    `json:"raw_count"`
	NormalizedShare    float64  `json:"normalized_share"`
	BaselineRaw        float64  `json:"baseline_raw"`
	BaselineShare      float64  `json:"baseline_share"`
	RawMultiple        *float64 `json:"raw_multiple"`
	NormalizedMultiple *float64 `json:"normalized_multiple"`
	IsNew              bool     `json:"is_new"`
	Spike              bool     `json:"spike"`
	NormalizedAway     bool     `json:"normalized_away"`
}

type spikesResponse struct {
	Axis  string     `json:"axis"`
	Basis spikeBasis `json:"basis"`
	Rows  []spikeRow `json:"rows"`
}

func (h *Handlers) spikes(w http.ResponseWriter, r *http.Request, gold goldSource) {
	axis := axisParam(r, "KR")
	baseline := r.URL.Query().Get("baseline")
	if !spikeBaselines[baseline] {
		baseline = defaultSpikeBaseline
	}

	ctx := r.Context()
	units, err := gold.trendUnits(ctx, axis)
	goldFailed(r, err)
	unit := finestUnit(units)
	buckets, err := gold.trendBuckets(ctx, axis, unit)
	goldFailed(r, err)

	resp := spikesResponse{
		Axis: axis,
		Basis: spikeBasis{
			BucketUnit:      string(unit),
			Baseline:        baseline,
			BaselineBuckets: []string{},
			Threshold:       spikeThreshold,
		},
		Rows: []spikeRow{},
	}
	if len(buckets) == 0 {
		writeJSON(w, http.StatusOK, resp)
		return
	}

	current := buckets[len(buckets)-1]
	before := bucketsBefore(buckets, current, unit, dashRanges[baseline])
	resp.Basis.TimeBucket = current
	resp.Basis.BaselineBuckets = before
	resp.Basis.HasBaseline = len(before) > 0

	read := append(append(make([]string, 0, len(before)+1), before...), current)
	rows, err := gold.trends(ctx, trendQuery{axis: axis, unit: unit, buckets: read})
	goldFailed(r, err)
	resp.Rows = rankSpikes(rows, current, len(before))
	writeJSON(w, http.StatusOK, resp)
}

func bucketsBefore(buckets []string, current string, unit gen.BucketUnit, span time.Duration) []string {
	out := []string{}
	end, err := bucketStart(current, unit)
	if err != nil {
		return out
	}
	from := end.Add(-span)
	for _, b := range buckets {
		at, err := bucketStart(b, unit)
		if err != nil || at.Before(from) || !at.Before(end) {
			continue
		}
		out = append(out, b)
	}
	sort.Strings(out)
	return out
}

func rankSpikes(rows []gen.SubjectTrend, current string, baselineBuckets int) []spikeRow {
	now := map[string]gen.SubjectTrend{}
	rawSum := map[string]int64{}
	shareSum := map[string]float64{}
	for _, t := range rows {
		if t.TimeBucket == current {
			if _, seen := now[t.Subject]; !seen {
				now[t.Subject] = t
			}
			continue
		}
		rawSum[t.Subject] += t.RawCount
		shareSum[t.Subject] += t.NormalizedShare
	}

	out := make([]spikeRow, 0, len(now))
	for subject, t := range now {
		row := spikeRow{Subject: subject, RawCount: t.RawCount, NormalizedShare: t.NormalizedShare}
		if baselineBuckets > 0 {
			n := float64(baselineBuckets)
			row.BaselineRaw = float64(rawSum[subject]) / n
			row.BaselineShare = shareSum[subject] / n
			row.RawMultiple = ratio(float64(t.RawCount), row.BaselineRaw)
			row.NormalizedMultiple = ratio(t.NormalizedShare, row.BaselineShare)
			row.IsNew = rawSum[subject] == 0
		}
		row.Spike = row.RawMultiple != nil && *row.RawMultiple >= spikeThreshold
		row.NormalizedAway = row.Spike && row.NormalizedMultiple != nil && *row.NormalizedMultiple < spikeThreshold
		out = append(out, row)
	}

	sort.Slice(out, func(i, j int) bool {
		a, b := out[i], out[j]
		if (a.RawMultiple == nil) != (b.RawMultiple == nil) {
			return a.RawMultiple != nil
		}
		if a.RawMultiple != nil && *a.RawMultiple != *b.RawMultiple {
			return *a.RawMultiple > *b.RawMultiple
		}
		if a.RawCount != b.RawCount {
			return a.RawCount > b.RawCount
		}
		return a.Subject < b.Subject
	})
	if len(out) > spikeRowLimit {
		out = out[:spikeRowLimit]
	}
	for i := range out {
		out[i].Rank = i + 1
	}
	return out
}

func ratio(now, usual float64) *float64 {
	if usual <= 0 {
		return nil
	}
	v := now / usual
	return &v
}
