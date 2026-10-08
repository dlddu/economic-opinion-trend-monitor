package handlers

import (
	"net/http"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

type debugInput struct {
	Title         string             `json:"title"`
	SourceURL     string             `json:"source_url"`
	BodyAvailable bool               `json:"body_available"`
	BodyHash      string             `json:"body_hash"`
	Versions      []debugBodyVersion `json:"versions"`
}

type debugBodyVersion struct {
	BodyHash       string `json:"body_hash"`
	FirstSeenAt    string `json:"first_seen_at"`
	FirstSeenCycle string `json:"first_seen_cycle"`
	RawText        string `json:"raw_text"`
	Analyzed       bool   `json:"analyzed"`
	Latest         bool   `json:"latest"`
}

func (h *Handlers) debugInputOf(r *http.Request, recordID string) *debugInput {
	var item *gen.NewsItem
	_ = h.lake.EachNewsItem(r.Context(), func(it *gen.NewsItem) error {
		if it.RecordID != recordID {
			return nil
		}
		found := *it
		item = &found
		return store.ErrStop
	})
	if item == nil {
		return nil
	}

	observed := make([]gen.NewsItem, 0, 1)
	_ = h.lake.EachNewsItem(r.Context(), func(other *gen.NewsItem) error {
		if other.SourceURL == item.SourceURL {
			observed = append(observed, *other)
		}
		return nil
	})
	sort.SliceStable(observed, func(i, j int) bool { return observed[i].CollectedAt < observed[j].CollectedAt })

	seen := make(map[string]bool)
	versions := make([]debugBodyVersion, 0, 1)
	for _, obs := range observed {
		if obs.BodyHash == "" || seen[obs.BodyHash] {
			continue
		}
		seen[obs.BodyHash] = true
		body, _ := h.lake.NewsBody(obs.BodyHash)
		if body == nil {
			continue
		}
		versions = append(versions, debugBodyVersion{
			BodyHash:       body.BodyHash,
			FirstSeenAt:    body.FirstSeenAt,
			FirstSeenCycle: body.FirstSeenCycle,
			RawText:        body.RawText,
			Analyzed:       body.BodyHash == item.BodyHash,
		})
	}
	sort.SliceStable(versions, func(i, j int) bool { return versions[i].FirstSeenAt < versions[j].FirstSeenAt })
	if len(versions) > 0 {
		versions[len(versions)-1].Latest = true
	}

	return &debugInput{
		Title:         item.Title,
		SourceURL:     item.SourceURL,
		BodyAvailable: item.BodyAvailable,
		BodyHash:      item.BodyHash,
		Versions:      versions,
	}
}
