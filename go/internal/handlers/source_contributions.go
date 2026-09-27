package handlers

import (
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

type sourceContributionRow struct {
	SourceID               string  `json:"source_id"`
	RawCount               int64   `json:"raw_count"`
	RawShare               float64 `json:"raw_share"`
	NormalizedContribution float64 `json:"normalized_contribution"`
}

// One collector at 0.9 across two sources and one at 0.9 across nine are
// different findings, and the share alone cannot tell them apart.
type sourceConcentration struct {
	TopSourceID string  `json:"top_source_id"`
	TopShare    float64 `json:"top_share"`
	SourceCount int     `json:"source_count"`
}

type sourceContributionsBasis struct {
	Axis            string  `json:"axis"`
	Subject         string  `json:"subject"`
	BucketUnit      string  `json:"bucket_unit"`
	TimeBucket      string  `json:"time_bucket"`
	RawCount        int64   `json:"raw_count"`
	NormalizedShare float64 `json:"normalized_share"`
	RawTotal        int64   `json:"raw_total"`
	NormalizedTotal float64 `json:"normalized_total"`
	Method          string  `json:"method"`
}

type sourceContributionsResponse struct {
	Basis         sourceContributionsBasis `json:"basis"`
	Concentration sourceConcentration      `json:"concentration"`
	Rows          []sourceContributionRow  `json:"rows"`
}

// It reads the decomposition from its own Gold dataset rather than recomputing
// it from Silver, because the aggregation emits both sides from a single fold —
// the identities hold by construction there, and recomputing it here would be a
// second answer to the same question.
func (h *Handlers) sourceContributions(w http.ResponseWriter, r *http.Request) {
	axis := axisParam(r, "KR")
	trends, _ := h.lake.SubjectTrends()

	inAxis := make([]gen.SubjectTrend, 0, len(trends))
	for _, t := range trends {
		if string(t.Axis) == axis {
			inAxis = append(inAxis, t)
		}
	}
	unit := unitParam(r, plottedUnit(inAxis))
	bucket := r.URL.Query().Get("time_bucket")
	if bucket == "" {
		bucket = latestBucketOf(inAxis, unit)
	}
	inBucket := trendsInBucket(inAxis, bucket, unit)
	subject := pickContributionSubject(inBucket, r.URL.Query().Get("subject"))

	var rawCount int64
	var normalizedShare float64
	for _, t := range inBucket {
		if t.Subject == subject {
			rawCount, normalizedShare = t.RawCount, t.NormalizedShare
		}
	}

	parts, _ := h.lake.SubjectSourceContributions()
	rows := make([]sourceContributionRow, 0, len(parts))
	var rawTotal int64
	var normalizedTotal float64
	for _, p := range parts {
		if string(p.Axis) != axis || string(p.BucketUnit) != string(unit) {
			continue
		}
		if p.TimeBucket != bucket || p.Subject != subject {
			continue
		}
		rows = append(rows, sourceContributionRow{
			SourceID:               p.SourceID,
			RawCount:               p.RawCount,
			RawShare:               p.RawShare,
			NormalizedContribution: p.NormalizedContribution,
		})
		rawTotal += p.RawCount
		normalizedTotal += p.NormalizedContribution
	}
	sort.SliceStable(rows, func(i, j int) bool {
		if rows[i].RawCount != rows[j].RawCount {
			return rows[i].RawCount > rows[j].RawCount
		}
		return rows[i].SourceID < rows[j].SourceID
	})

	writeJSON(w, http.StatusOK, sourceContributionsResponse{
		Basis: sourceContributionsBasis{
			Axis:            axis,
			Subject:         subject,
			BucketUnit:      string(unit),
			TimeBucket:      bucket,
			RawCount:        rawCount,
			NormalizedShare: normalizedShare,
			RawTotal:        rawTotal,
			NormalizedTotal: roundTo4(normalizedTotal),
			Method:          "소스 내 점유율",
		},
		Concentration: concentrationOf(rows),
		Rows:          rows,
	})
}

func concentrationOf(rows []sourceContributionRow) sourceConcentration {
	if len(rows) == 0 {
		return sourceConcentration{}
	}
	return sourceConcentration{
		TopSourceID: rows[0].SourceID,
		TopShare:    rows[0].RawShare,
		SourceCount: len(rows),
	}
}

// roundTo4 puts a sum of 4-decimal Gold values back on that grid, so float
// addition error does not make the published total miss the value it has to
// equal by 1e-17.
func roundTo4(value float64) float64 {
	const grid = 1e4
	if value < 0 {
		return -roundTo4(-value)
	}
	return float64(int64(value*grid+0.5)) / grid
}
