package handlers

import (
	"fmt"
	"net/http"
	"sort"
	"time"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// contributionRow is one article that made a Gold number.
//
// BodyDuplicate and BodyShares are two fields for one reason: the reader is
// checking whether a spike is real, and "the same text arrived twice" is the
// answer that most often explains one (AC1.7 stores bodies by content hash, so
// a shared hash *is* the duplicate). The count says how wide the reuse is —
// a syndicated wire piece carried by every outlet reads differently from one
// article observed twice.
type contributionRow struct {
	RecordID      string `json:"record_id"`
	SourceID      string `json:"source_id"`
	Title         string `json:"title"`
	SourceURL     string `json:"source_url"`
	CollectedAt   string `json:"collected_at"`
	BodyHash      string `json:"body_hash"`
	BodyAvailable bool   `json:"body_available"`
	BodyDuplicate bool   `json:"body_duplicate"`
	BodyShares    int    `json:"body_shares"`
}

// contributionSource is one collector's share of the list.
type contributionSource struct {
	SourceID string `json:"source_id"`
	Listed   int    `json:"listed"`
}

// contributionsBasis states the value the list was taken under.
//
// RawCount must come from Gold, never from this endpoint's own count, and Total
// must stay the pre-filter count: `Total == RawCount` and
// `sum(Sources.Listed) == Total` are only checks while the two sides are.
//
// AnalyzerVersion names which Silver rows were counted. Empty means "newest per
// record", which is what the aggregation does with no publish decision recorded.
type contributionsBasis struct {
	Axis            string `json:"axis"`
	Subject         string `json:"subject"`
	BucketUnit      string `json:"bucket_unit"`
	TimeBucket      string `json:"time_bucket"`
	Source          string `json:"source"`
	RawCount        int64  `json:"raw_count"`
	Total           int    `json:"total"`
	Listed          int    `json:"listed"`
	AnalyzerVersion string `json:"analyzer_version"`
}

type contributionsResponse struct {
	Basis   contributionsBasis   `json:"basis"`
	Sources []contributionSource `json:"sources"`
	Rows    []contributionRow    `json:"rows"`
}

// contributions lists the individual articles behind one Gold value (AC6.4).
//
// The join must stay the *same calculation* build_subject_trends runs — a second
// way of computing it here disagrees with the number the list explains.
func (h *Handlers) contributions(w http.ResponseWriter, r *http.Request) {
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
	source := r.URL.Query().Get("source")

	var rawCount int64
	for _, t := range inBucket {
		if t.Subject == subject {
			rawCount = t.RawCount
		}
	}

	items, _ := h.lake.NewsItems()
	analyses, _ := h.lake.Analyses()
	decisions, _ := h.lake.ReprocessDecisions()
	version := servingVersion(decisions)
	served := selectServing(analyses, version)

	shares := bodyShares(items)
	byID := make(map[string]gen.NewsItem, len(items))
	for _, it := range items {
		byID[it.RecordID] = it
	}

	all := make([]contributionRow, 0, len(served))
	for _, a := range served {
		item, ok := byID[a.RecordID]
		if !ok || string(item.Axis) != axis {
			continue
		}
		if bucketLabel(item.CollectedAt, unit) != bucket {
			continue
		}
		if !contains(a.NarrativeSubjects, subject) {
			continue
		}
		n := shares[item.BodyHash]
		all = append(all, contributionRow{
			RecordID:      item.RecordID,
			SourceID:      item.SourceID,
			Title:         item.Title,
			SourceURL:     item.SourceURL,
			CollectedAt:   item.CollectedAt,
			BodyHash:      item.BodyHash,
			BodyAvailable: item.BodyAvailable,
			BodyDuplicate: n > 1,
			BodyShares:    n,
		})
	}
	// Newest first because the reader came here from a spike.
	sort.SliceStable(all, func(i, j int) bool {
		if all[i].CollectedAt != all[j].CollectedAt {
			return all[i].CollectedAt > all[j].CollectedAt
		}
		return all[i].RecordID < all[j].RecordID
	})

	rows := make([]contributionRow, 0, len(all))
	for _, row := range all {
		if source == "" || row.SourceID == source {
			rows = append(rows, row)
		}
	}

	writeJSON(w, http.StatusOK, contributionsResponse{
		Basis: contributionsBasis{
			Axis:            axis,
			Subject:         subject,
			BucketUnit:      string(unit),
			TimeBucket:      bucket,
			Source:          source,
			RawCount:        rawCount,
			Total:           len(all),
			Listed:          len(rows),
			AnalyzerVersion: version,
		},
		Sources: sourceTally(all),
		Rows:    rows,
	})
}

// pickContributionSubject falls back to the leading subject only for an *absent*
// request — never for one the bucket holds no row for.
func pickContributionSubject(inBucket []gen.SubjectTrend, requested string) string {
	if requested != "" {
		return requested
	}
	var subject string
	var best float64 = -1
	for _, t := range inBucket {
		if t.NormalizedShare > best {
			best, subject = t.NormalizedShare, t.Subject
		}
	}
	return subject
}

// servingVersion is the Go counterpart of econ_core.silver.serving_version.
func servingVersion(decisions []store.ReprocessDecision) string {
	if len(decisions) == 0 {
		return ""
	}
	return decisions[len(decisions)-1].AnalyzerVersion
}

// selectServing mirrors econ_core.silver.select_serving.
func selectServing(analyses []gen.Analysis, version string) []gen.Analysis {
	order := make([]string, 0, len(analyses))
	byRecord := map[string][]gen.Analysis{}
	for _, a := range analyses {
		if _, seen := byRecord[a.RecordID]; !seen {
			order = append(order, a.RecordID)
		}
		byRecord[a.RecordID] = append(byRecord[a.RecordID], a)
	}
	out := make([]gen.Analysis, 0, len(order))
	for _, id := range order {
		rows := byRecord[id]
		pick := -1
		if version != "" {
			for i, a := range rows {
				if a.AnalyzerVersion == version {
					pick = i
					break
				}
			}
		}
		if pick < 0 {
			pick = 0
			for i, a := range rows {
				if a.AnalyzedAt > rows[pick].AnalyzedAt ||
					(a.AnalyzedAt == rows[pick].AnalyzedAt && a.AnalyzerVersion > rows[pick].AnalyzerVersion) {
					pick = i
				}
			}
		}
		out = append(out, rows[pick])
	}
	return out
}

// bucketLabel cuts a collection timestamp down to its bucket label, the forward
// direction of bucketStart and a transcription of the aggregation's `_bucket`.
// An unreadable timestamp matches no bucket: the record is left out, not guessed at.
func bucketLabel(collectedAt string, unit gen.BucketUnit) string {
	switch unit {
	case gen.BucketUnitHour:
		if len(collectedAt) < 13 {
			return ""
		}
		return collectedAt[:13]
	case gen.BucketUnitDay:
		if len(collectedAt) < 10 {
			return ""
		}
		return collectedAt[:10]
	case gen.BucketUnitWeek:
		if len(collectedAt) < 10 {
			return ""
		}
		day, err := time.Parse("2006-01-02", collectedAt[:10])
		if err != nil {
			return ""
		}
		year, week := day.ISOWeek()
		return fmt.Sprintf("%d-W%02d", year, week)
	}
	return ""
}

// bodyShares: an empty body hash is "no text kept", not a text they all share.
func bodyShares(items []gen.NewsItem) map[string]int {
	out := map[string]int{}
	for _, it := range items {
		if it.BodyHash == "" {
			continue
		}
		out[it.BodyHash]++
	}
	return out
}

// sourceTally is the per-collector breakdown of the *unfiltered* list.
func sourceTally(rows []contributionRow) []contributionSource {
	counts := map[string]int{}
	for _, row := range rows {
		counts[row.SourceID]++
	}
	out := make([]contributionSource, 0, len(counts))
	for id, n := range counts {
		out = append(out, contributionSource{SourceID: id, Listed: n})
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Listed != out[j].Listed {
			return out[i].Listed > out[j].Listed
		}
		return out[i].SourceID < out[j].SourceID
	})
	return out
}

func contains(values []string, want string) bool {
	for _, v := range values {
		if v == want {
			return true
		}
	}
	return false
}
