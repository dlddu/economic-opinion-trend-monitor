package handlers

import (
	"context"
	"database/sql"
	"errors"
	"sort"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
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

// debugInputOf is what the analysis read: the record's first Bronze observation, and every body
// version its article showed across all observations of the same URL, oldest first.
func (h *Handlers) debugInputOf(ctx context.Context, db *sql.DB, recordID string) (*debugInput, error) {
	var item gen.NewsItem
	err := db.QueryRowContext(ctx, `SELECT title, source_url, body_available, body_hash FROM news_item
		WHERE record_id = ? ORDER BY seq LIMIT 1`, recordID).
		Scan(&item.Title, &item.SourceURL, &item.BodyAvailable, &item.BodyHash)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	rs, err := db.QueryContext(ctx, `SELECT body_hash FROM news_item WHERE source_url = ?
		ORDER BY collected_at, seq`, item.SourceURL)
	if err != nil {
		return nil, err
	}
	var hashes []string
	for rs.Next() {
		var hash string
		if err := rs.Scan(&hash); err != nil {
			rs.Close()
			return nil, err
		}
		hashes = append(hashes, hash)
	}
	rs.Close()
	if err := rs.Err(); err != nil {
		return nil, err
	}

	clockIn(ctx).enter("bodies")
	seen := make(map[string]bool)
	versions := make([]debugBodyVersion, 0, 1)
	for _, hash := range hashes {
		if hash == "" || seen[hash] {
			continue
		}
		seen[hash] = true
		body, _ := h.lake.NewsBody(hash)
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
	}, nil
}
