package handlers

import (
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
)

// sourceContributionRow is one collector's part of a Gold value.
//
// RawShare and NormalizedContribution are two numbers for the reason the whole
// screen exists: a collector that supplied half the raw articles but a tenth of
// the normalized share is the source-volume deviation AC3.1 corrects, made
// visible per collector. Reporting only one of them would hide exactly the
// comparison the reader came for.
type sourceContributionRow struct {
	SourceID               string  `json:"source_id"`
	RawCount               int64   `json:"raw_count"`
	RawShare               float64 `json:"raw_share"`
	NormalizedContribution float64 `json:"normalized_contribution"`
}

// sourceConcentration is how lopsided the decomposition is, in the three numbers
// the journey step asks of it: who carried the value, by how much, and over how
// many collectors it is spread. One collector at 0.9 across two sources and one
// at 0.9 across nine are different findings, and the share alone cannot tell
// them apart.
type sourceConcentration struct {
	TopSourceID string  `json:"top_source_id"`
	TopShare    float64 `json:"top_share"`
	SourceCount int     `json:"source_count"`
}

// sourceContributionsBasis states the value the decomposition was taken of, and
// puts the aggregate side and this endpoint's own sums next to each other.
//
// RawCount and NormalizedShare are read from Gold's subject-level row; RawTotal
// and NormalizedTotal are summed from the rows below. Publishing all four is
// what lets the screen and the tests assert AC3.9's two identities
// (RawTotal == RawCount, NormalizedTotal == NormalizedShare) rather than trust
// them — and say so when they disagree instead of quietly rescaling.
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

// sourceContributions decomposes one (subject, axis, bucket) Gold value into the
// collection sources that made it (AC3.9).
//
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
	// Descending raw count, then source id — the same order the aggregation
	// wrote, restated here because the dataset is one flat file and a reader of
	// this endpoint should not have to trust its line order.
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

// concentrationOf reads the three concentration numbers off the already-sorted
// rows. An empty decomposition reports no top source rather than the zero value
// of a source id, so the screen can tell "nothing to show" from "a collector
// named empty string".
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
