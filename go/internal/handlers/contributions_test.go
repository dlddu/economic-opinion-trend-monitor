package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// The Gold below is the aggregation's own output — Bronze/Silver fed through
// econ_core.silver.select_serving + build_subject_trends_all_units, pasted in.
// Hand-fitting it to this handler would make the sum identities prove nothing.
//
// What the rows are arranged to hold, for KR / hour / 2026-06-23T14:
//
//	r1, r3   kr_wire, one shared body hash (AC1.7 syndication — the case a
//	         reader checking a spike is looking for)
//	r2       kr_wire, analyzed twice (v1 then v2) — must be counted once
//	r4       kr_daily, carries two subjects at once
//	r5       kr_daily, a different subject only
//	r6       the previous hour — a bucket filter that leaks shows up here
//	r7       the US axis — an axis filter that leaks shows up here
//	r8       collected but unanalyzed: no subjects, so it is in no list
const (
	contribBronze = `{"record_id": "r1", "source_id": "kr_wire", "axis": "KR", "rank": 1, "view_count": 100, "title": "삼성전자 실적 발표", "source_url": "https://wire.example/1", "body_hash": "b1shared", "body_available": true, "collected_at": "2026-06-23T14:05:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r2", "source_id": "kr_wire", "axis": "KR", "rank": 1, "view_count": 100, "title": "삼성전자 증설 계획", "source_url": "https://wire.example/2", "body_hash": "b2", "body_available": true, "collected_at": "2026-06-23T14:10:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r3", "source_id": "kr_wire", "axis": "KR", "rank": 1, "view_count": 100, "title": "[전재] 삼성전자 실적 발표", "source_url": "https://wire.example/3", "body_hash": "b1shared", "body_available": true, "collected_at": "2026-06-23T14:20:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r4", "source_id": "kr_daily", "axis": "KR", "rank": 1, "view_count": 100, "title": "삼성전자와 협력사", "source_url": "https://daily.example/4", "body_hash": "b4", "body_available": true, "collected_at": "2026-06-23T14:40:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r5", "source_id": "kr_daily", "axis": "KR", "rank": 1, "view_count": 100, "title": "환율 급등", "source_url": "https://daily.example/5", "body_hash": "b5", "body_available": true, "collected_at": "2026-06-23T14:50:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r6", "source_id": "kr_wire", "axis": "KR", "rank": 1, "view_count": 100, "title": "지난 시간 삼성전자", "source_url": "https://wire.example/6", "body_hash": "b6", "body_available": true, "collected_at": "2026-06-23T13:30:00Z", "collection_cycle": "2026-06-23T13"}
{"record_id": "r7", "source_id": "us_wire", "axis": "US", "rank": 1, "view_count": 100, "title": "Samsung earnings", "source_url": "https://us.example/7", "body_hash": "b7", "body_available": true, "collected_at": "2026-06-23T14:15:00Z", "collection_cycle": "2026-06-23T14"}
{"record_id": "r8", "source_id": "kr_daily", "axis": "KR", "rank": 1, "view_count": 100, "title": "판독 불가 기사", "source_url": "https://daily.example/8", "body_hash": "", "body_available": false, "collected_at": "2026-06-23T14:55:00Z", "collection_cycle": "2026-06-23T14"}`

	contribSilver = `{"record_id": "r1", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r2", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:31:00Z", "analyzer_version": "v1"}
{"record_id": "r2", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T15:00:00Z", "analyzer_version": "v2"}
{"record_id": "r3", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r4", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자", "환율"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r5", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["환율"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r6", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r7", "analysis_status": "analyzed", "sentiment": "neutral", "target_countries": ["KR"], "narrative_subjects": ["삼성전자"], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}
{"record_id": "r8", "analysis_status": "unanalyzed", "sentiment": null, "target_countries": ["KR"], "narrative_subjects": [], "confidence": 0.9, "analyzed_at": "2026-06-23T14:30:00Z", "analyzer_version": "v1"}`

	contribGold = `{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T13", "raw_count": 1, "normalized_share": 1.0, "delta": 0.0, "spark": [1.0]}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "raw_count": 4, "normalized_share": 0.6667, "delta": -33.33, "spark": [1.0, 0.6667]}
{"subject": "환율", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "raw_count": 2, "normalized_share": 0.3333, "delta": 0.0, "spark": [0.3333]}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "raw_count": 1, "normalized_share": 1.0, "delta": 0.0, "spark": [1.0]}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "day", "time_bucket": "2026-06-23", "raw_count": 5, "normalized_share": 0.6667, "delta": 0.0, "spark": [0.6667]}
{"subject": "환율", "axis": "KR", "bucket_unit": "day", "time_bucket": "2026-06-23", "raw_count": 2, "normalized_share": 0.3333, "delta": 0.0, "spark": [0.3333]}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "day", "time_bucket": "2026-06-23", "raw_count": 1, "normalized_share": 1.0, "delta": 0.0, "spark": [1.0]}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "week", "time_bucket": "2026-W26", "raw_count": 5, "normalized_share": 0.6667, "delta": 0.0, "spark": [0.6667]}
{"subject": "환율", "axis": "KR", "bucket_unit": "week", "time_bucket": "2026-W26", "raw_count": 2, "normalized_share": 0.3333, "delta": 0.0, "spark": [0.3333]}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "week", "time_bucket": "2026-W26", "raw_count": 1, "normalized_share": 1.0, "delta": 0.0, "spark": [1.0]}`
)

const (
	contribSubject = "삼성전자"
	contribBucket  = "2026-06-23T14"
)

// writeContributionLake lays the three layers down the way the batch writes them.
func writeContributionLake(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(contribGold+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	for _, ds := range []struct{ dataset, content string }{
		{"bronze/news_item", contribBronze},
		{"silver/analysis", contribSilver},
	} {
		part := filepath.Join(dir, ds.dataset, "year=2026", "month=06", "day=23", "hour=14")
		if err := os.MkdirAll(part, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(part, "data.jsonl"), []byte(ds.content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func getContributions(t *testing.T, dir, query string) contributionsResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/contributions" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var out contributionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&out); err != nil {
		t.Fatal(err)
	}
	return out
}

func rowByRecord(t *testing.T, rows []contributionRow, id string) contributionRow {
	t.Helper()
	for _, row := range rows {
		if row.RecordID == id {
			return row
		}
	}
	t.Fatalf("no row for %s in %+v", id, rows)
	return contributionRow{}
}

// AC6.4, first sum identity: the list's length is the same value's raw count.
func TestContributionsListMatchesTheGoldRawCount(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	got := getContributions(t, dir, "?axis=KR")

	if got.Basis.Subject != contribSubject || got.Basis.TimeBucket != contribBucket {
		t.Fatalf("basis did not settle on the leading subject of the latest bucket: %+v", got.Basis)
	}
	if got.Basis.BucketUnit != "hour" {
		t.Fatalf("bucket unit = %q, want the finest unit present", got.Basis.BucketUnit)
	}
	if int64(len(got.Rows)) != got.Basis.RawCount {
		t.Fatalf("listed %d articles for a value whose raw count is %d", len(got.Rows), got.Basis.RawCount)
	}
	if got.Basis.Total != len(got.Rows) || got.Basis.Listed != len(got.Rows) {
		t.Fatalf("unfiltered total/listed disagree with the rows: %+v", got.Basis)
	}

	row := rowByRecord(t, got.Rows, "r2")
	if row.SourceID != "kr_wire" || row.CollectedAt == "" || row.SourceURL == "" || row.Title == "" {
		t.Fatalf("row is missing the collector, the collection time or the link: %+v", row)
	}
}

// AC6.4, second sum identity: narrowing by collector partitions the list.
func TestContributionsNarrowedBySourceSumsToTheWhole(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	whole := getContributions(t, dir, "?axis=KR")
	if len(whole.Sources) < 2 {
		t.Fatalf("fixture must span at least two collectors, got %+v", whole.Sources)
	}

	tallied := 0
	fetched := 0
	for _, src := range whole.Sources {
		tallied += src.Listed
		narrowed := getContributions(t, dir, "?axis=KR&source="+src.SourceID)
		if narrowed.Basis.Source != src.SourceID {
			t.Fatalf("narrowed response does not name its filter: %+v", narrowed.Basis)
		}
		if narrowed.Basis.Listed != src.Listed || len(narrowed.Rows) != src.Listed {
			t.Fatalf("%s: listed %d rows, tally says %d", src.SourceID, len(narrowed.Rows), src.Listed)
		}
		if narrowed.Basis.Total != whole.Basis.Total {
			t.Fatalf("%s: total moved with the filter (%d != %d)", src.SourceID, narrowed.Basis.Total, whole.Basis.Total)
		}
		for _, row := range narrowed.Rows {
			if row.SourceID != src.SourceID {
				t.Fatalf("%s: filter leaked %s", src.SourceID, row.SourceID)
			}
		}
		fetched += len(narrowed.Rows)
	}
	if tallied != whole.Basis.Total || fetched != whole.Basis.Total {
		t.Fatalf("per-source counts sum to %d (fetched %d), whole is %d", tallied, fetched, whole.Basis.Total)
	}
}

func TestContributionsCountsAReanalyzedRecordOnce(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	got := getContributions(t, dir, "?axis=KR")

	seen := 0
	for _, row := range got.Rows {
		if row.RecordID == "r2" {
			seen++
		}
	}
	if seen != 1 {
		t.Fatalf("the twice-analyzed record appears %d times", seen)
	}
	if got.Basis.AnalyzerVersion != "" {
		t.Fatalf("analyzer version = %q, want empty for newest-per-record", got.Basis.AnalyzerVersion)
	}
}

func TestContributionsMarksSharedBodiesAsDuplicates(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	got := getContributions(t, dir, "?axis=KR")

	for _, id := range []string{"r1", "r3"} {
		row := rowByRecord(t, got.Rows, id)
		if !row.BodyDuplicate || row.BodyShares != 2 {
			t.Fatalf("%s shares its body with another observation but reads %+v", id, row)
		}
	}
	for _, id := range []string{"r2", "r4"} {
		row := rowByRecord(t, got.Rows, id)
		if row.BodyDuplicate || row.BodyShares != 1 {
			t.Fatalf("%s has its own body but reads %+v", id, row)
		}
	}
}

func TestContributionsHonoursTheRequestedUnitAndBucket(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	hourWide := getContributions(t, dir, "?axis=KR&subject="+contribSubject)
	day := getContributions(t, dir, "?axis=KR&unit=day&subject="+contribSubject)
	if day.Basis.BucketUnit != "day" || day.Basis.TimeBucket != "2026-06-23" {
		t.Fatalf("day basis wrong: %+v", day.Basis)
	}
	if int64(len(day.Rows)) != day.Basis.RawCount {
		t.Fatalf("day: listed %d for raw count %d", len(day.Rows), day.Basis.RawCount)
	}
	// The day holds the previous hour's observation too, so a unit parameter that
	// was quietly ignored would show up as the two lists being the same length.
	if len(day.Rows) <= len(hourWide.Rows) {
		t.Fatalf("day list (%d) is not wider than the hour list (%d)", len(day.Rows), len(hourWide.Rows))
	}

	hour := getContributions(t, dir, "?axis=KR&subject="+contribSubject+"&time_bucket=2026-06-23T13")
	if hour.Basis.TimeBucket != "2026-06-23T13" {
		t.Fatalf("explicit bucket ignored: %+v", hour.Basis)
	}
	if int64(len(hour.Rows)) != hour.Basis.RawCount || len(hour.Rows) != 1 {
		t.Fatalf("previous hour: listed %d for raw count %d", len(hour.Rows), hour.Basis.RawCount)
	}
	if hour.Rows[0].RecordID != "r6" {
		t.Fatalf("previous hour listed %s", hour.Rows[0].RecordID)
	}
}

func TestContributionsAnswersAnUnknownSubjectWithAnEmptyList(t *testing.T) {
	dir := t.TempDir()
	writeContributionLake(t, dir)

	const absent = "없는 대상"
	got := getContributions(t, dir, "?axis=KR&subject="+url.QueryEscape(absent))

	if got.Basis.Subject != absent {
		t.Fatalf("subject was substituted: %+v", got.Basis)
	}
	if got.Basis.RawCount != 0 || len(got.Rows) != 0 || got.Basis.Total != 0 {
		t.Fatalf("an absent subject produced a list: %+v", got.Basis)
	}
	if got.Sources == nil || len(got.Sources) != 0 {
		t.Fatalf("sources = %+v, want an empty list", got.Sources)
	}
}
