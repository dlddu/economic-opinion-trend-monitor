package handlers

import (
	"strings"
	"testing"
)

func newsItemRow(recordID, collectedAt, bodyHash string) string {
	available := "true"
	if bodyHash == "" {
		available = "false"
	}
	return `{"record_id":"` + recordID + `","source_id":"src-a","axis":"KR","rank":1,"view_count":10,` +
		`"title":"기준금리 동결","source_url":"https://ex.test/1","body_hash":"` + bodyHash + `",` +
		`"body_available":` + available + `,"collected_at":"` + collectedAt + `",` +
		`"collection_cycle":"` + collectedAt[:16] + `"}`
}

func newsBodyRow(bodyHash, text, firstSeenAt string) string {
	return `{"body_hash":"` + bodyHash + `","raw_text":"` + text + `","first_seen_at":"` + firstSeenAt + `",` +
		`"first_seen_cycle":"` + firstSeenAt[:16] + `"}`
}

func TestDebugInputListsEveryBodyVersionOfTheArticle(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v2", "analyzed", "run-a", `"call_id":"call-1"`)},
		map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord})
	writeLineage(t, dir,
		strings.Join([]string{
			newsItemRow("rec-3", "2026-09-28T02:00:00Z", "bbb"),
			newsItemRow("rec-1", "2026-09-28T00:00:00Z", "aaa"),
			newsItemRow("rec-2", "2026-09-28T01:00:00Z", "aaa"),
		}, "\n"),
		strings.Join([]string{
			newsBodyRow("aaa", "첫 본문", "2026-09-28T00:00:00Z"),
			newsBodyRow("bbb", "고친 본문", "2026-09-28T02:00:00Z"),
		}, "\n"),
		"")

	input := getDebug(t, dir, "?record_id=rec-1").Input
	if input == nil {
		t.Fatal("input must be read from bronze")
	}
	if input.BodyHash != "aaa" || input.Title != "기준금리 동결" || input.SourceURL != "https://ex.test/1" {
		t.Errorf("observation header wrong: %+v", input)
	}
	if len(input.Versions) != 2 {
		t.Fatalf("want 2 versions (unchanged body stored once), got %+v", input.Versions)
	}
	first, second := input.Versions[0], input.Versions[1]
	if first.BodyHash != "aaa" || !first.Analyzed || first.Latest || first.RawText != "첫 본문" {
		t.Errorf("analyzed version wrong: %+v", first)
	}
	if second.BodyHash != "bbb" || second.Analyzed || !second.Latest || second.FirstSeenAt != "2026-09-28T02:00:00Z" {
		t.Errorf("latest version wrong: %+v", second)
	}
}

func TestDebugInputSaysTheBodyWasNeverCaptured(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v1", "unanalyzed", "run-a", `"no_call_reason":"body_unavailable"`)},
		map[string]string{"run-a": debugRunRecord}, nil)
	writeLineage(t, dir, newsItemRow("rec-1", "2026-09-28T00:00:00Z", ""), "", "")

	input := getDebug(t, dir, "?record_id=rec-1").Input
	if input == nil {
		t.Fatal("the observation exists, so input must too")
	}
	if input.BodyAvailable || input.BodyHash != "" || input.Versions == nil || len(input.Versions) != 0 {
		t.Errorf("an uncaptured body must be an empty version list: %+v", input)
	}
}

func TestDebugInputIsNullWithoutTheBronzeObservation(t *testing.T) {
	dir := t.TempDir()
	writeDebugLake(t, dir,
		[]string{analysisRow("rec-1", "v1", "analyzed", "run-a", `"call_id":"call-1"`)},
		map[string]string{"run-a": debugRunRecord},
		map[string]string{"call-1": debugCallRecord})

	got := getDebug(t, dir, "?record_id=rec-1")
	if !got.Found || got.Input != nil {
		t.Errorf("missing bronze must read as null input, not an invented one: %+v", got.Input)
	}
}
