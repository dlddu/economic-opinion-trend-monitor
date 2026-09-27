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

// contribSourceGold is the aggregation's own subject_source_contribution output
// for the Bronze/Silver rows at the top of contributions_test.go, run through
// econ_core.silver.select_serving and
// econ_aggregation.contributions.build_subject_source_contributions_all_units.
// Pairing it with contribGold (the subject_trend output of the *same* input) is
// what makes the identity assertions below a real check: if this handler summed
// differently from the batch, no literal here could hide it.
//
// The KR / hour / 2026-06-23T14 삼성전자 value is the discriminating one — kr_wire
// holds 0.75 of the raw count but only 0.5 of the normalized share, which is the
// source-volume deviation the whole screen exists to show. The other rows carry
// the filters that must not leak: an earlier bucket, the US axis, and the day and
// week rollups of the same records.
const contribSourceGold = `{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "source_id": "kr_wire", "raw_count": 3, "raw_share": 0.75, "normalized_contribution": 0.5}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "source_id": "kr_daily", "raw_count": 1, "raw_share": 0.25, "normalized_contribution": 0.1667}
{"subject": "환율", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "source_id": "kr_daily", "raw_count": 2, "raw_share": 1.0, "normalized_contribution": 0.3333}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T13", "source_id": "kr_wire", "raw_count": 1, "raw_share": 1.0, "normalized_contribution": 1.0}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "source_id": "us_wire", "raw_count": 1, "raw_share": 1.0, "normalized_contribution": 1.0}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "day", "time_bucket": "2026-06-23", "source_id": "kr_wire", "raw_count": 4, "raw_share": 0.8, "normalized_contribution": 0.5}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "day", "time_bucket": "2026-06-23", "source_id": "kr_daily", "raw_count": 1, "raw_share": 0.2, "normalized_contribution": 0.1667}
{"subject": "환율", "axis": "KR", "bucket_unit": "day", "time_bucket": "2026-06-23", "source_id": "kr_daily", "raw_count": 2, "raw_share": 1.0, "normalized_contribution": 0.3333}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "day", "time_bucket": "2026-06-23", "source_id": "us_wire", "raw_count": 1, "raw_share": 1.0, "normalized_contribution": 1.0}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "week", "time_bucket": "2026-W26", "source_id": "kr_wire", "raw_count": 4, "raw_share": 0.8, "normalized_contribution": 0.5}
{"subject": "삼성전자", "axis": "KR", "bucket_unit": "week", "time_bucket": "2026-W26", "source_id": "kr_daily", "raw_count": 1, "raw_share": 0.2, "normalized_contribution": 0.1667}
{"subject": "환율", "axis": "KR", "bucket_unit": "week", "time_bucket": "2026-W26", "source_id": "kr_daily", "raw_count": 2, "raw_share": 1.0, "normalized_contribution": 0.3333}
{"subject": "삼성전자", "axis": "US", "bucket_unit": "week", "time_bucket": "2026-W26", "source_id": "us_wire", "raw_count": 1, "raw_share": 1.0, "normalized_contribution": 1.0}`

func writeSourceContributionGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	for name, body := range map[string]string{
		"subject_trend.jsonl":               contribGold,
		"subject_source_contribution.jsonl": contribSourceGold,
	} {
		if err := os.WriteFile(filepath.Join(gold, name), []byte(body+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func getSourceContributions(t *testing.T, dir, query string) sourceContributionsResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/source-contributions" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var s sourceContributionsResponse
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

// AC3.9's first identity: the per-source raw counts add up to the value's own.
func TestSourceContributionsRawCountsSumToTheGoldRawCount(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	s := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if s.Basis.RawCount != 4 || s.Basis.RawTotal != 4 {
		t.Errorf("raw_count = %d, raw_total = %d — want 4 and 4", s.Basis.RawCount, s.Basis.RawTotal)
	}
	var summed int64
	for _, row := range s.Rows {
		summed += row.RawCount
	}
	if summed != s.Basis.RawCount {
		t.Errorf("rows sum to %d, Gold says %d", summed, s.Basis.RawCount)
	}
}

// AC3.9's second identity: the per-source normalized contributions add up to the
// value's normalized share, on the same 4-decimal grid Gold publishes.
func TestSourceContributionsNormalizedContributionsSumToTheShare(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	s := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if s.Basis.NormalizedShare != 0.6667 || s.Basis.NormalizedTotal != 0.6667 {
		t.Errorf("normalized_share = %v, normalized_total = %v — want 0.6667 twice",
			s.Basis.NormalizedShare, s.Basis.NormalizedTotal)
	}
}

// The reason the decomposition is worth showing: one collector's raw share and
// its normalized contribution disagree. If they always matched, normalization
// would be correcting nothing.
func TestSourceContributionsKeepRawAndNormalizedApart(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	s := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if len(s.Rows) != 2 {
		t.Fatalf("rows = %+v — want the two KR collectors", s.Rows)
	}
	wire := s.Rows[0]
	if wire.SourceID != "kr_wire" {
		t.Fatalf("first row = %+v — want the collector that carried the value", wire)
	}
	if wire.RawShare != 0.75 || wire.NormalizedContribution != 0.5 {
		t.Errorf("kr_wire raw_share = %v, normalized = %v — want 0.75 and 0.5",
			wire.RawShare, wire.NormalizedContribution)
	}
	if !(wire.RawShare > wire.NormalizedContribution) {
		t.Error("raw share must lead the normalized contribution for this fixture")
	}
}

func TestSourceContributionsReportConcentration(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	s := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if s.Concentration.TopSourceID != "kr_wire" || s.Concentration.SourceCount != 2 {
		t.Errorf("concentration = %+v — want kr_wire over 2 collectors", s.Concentration)
	}
	if s.Concentration.TopShare != 0.75 {
		t.Errorf("top share = %v — want the leading collector's raw share", s.Concentration.TopShare)
	}
}

// The axis, bucket unit and bucket filters each have a row in the fixture that
// would show up if they leaked.
func TestSourceContributionsSettleOneAxisUnitAndBucket(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	prev := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T13")
	if len(prev.Rows) != 1 || prev.Rows[0].RawCount != 1 {
		t.Errorf("previous hour = %+v — want the single kr_wire row", prev.Rows)
	}

	us := getSourceContributions(t, dir, "?axis=US&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if len(us.Rows) != 1 || us.Rows[0].SourceID != "us_wire" {
		t.Errorf("US axis = %+v — want only the US collector", us.Rows)
	}

	week := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=week&time_bucket=2026-W26")
	if len(week.Rows) != 2 || week.Basis.RawTotal != 5 || week.Basis.RawCount != 5 {
		t.Errorf("week rollup = %+v / %+v — want the 5-item week value", week.Basis, week.Rows)
	}
}

// An empty lake answers with an empty decomposition rather than failing: the
// screen opens before the batch has ever run.
func TestSourceContributionsSurviveEmptyGold(t *testing.T) {
	s := getSourceContributions(t, t.TempDir(), "?axis=KR")
	if len(s.Rows) != 0 || s.Basis.RawTotal != 0 || s.Concentration.SourceCount != 0 {
		t.Errorf("empty lake = %+v / %+v", s.Basis, s.Concentration)
	}
}

// A subject the caller names but the bucket has no row for answers empty under
// that name — the same contract /api/contributions settled on. Substituting the
// leading subject would hand the reader someone else's decomposition.
func TestSourceContributionsHonourARequestedSubjectWithNoRows(t *testing.T) {
	dir := t.TempDir()
	writeSourceContributionGold(t, dir)

	s := getSourceContributions(t, dir, "?axis=KR&unit=hour&time_bucket=2026-06-23T14&subject="+url.QueryEscape("없는 대상"))
	if s.Basis.Subject != "없는 대상" || len(s.Rows) != 0 {
		t.Errorf("basis = %+v, rows = %+v — want an empty list under the asked-for name", s.Basis, s.Rows)
	}
}

// The two sums are this endpoint's own count, not a copy of the Gold value it is
// checked against. A lake whose decomposition disagrees with its subject-level
// row must come back saying so — rescaling the parts to fit, or echoing the
// aggregate back as the total, would make the identity assertions above vacuous
// and hide the one failure they exist to catch.
func TestSourceContributionsReportADisagreeingLakeInsteadOfHidingIt(t *testing.T) {
	dir := t.TempDir()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	trend := `{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "raw_count": 9, "normalized_share": 0.9, "delta": 0.0, "spark": [0.9]}`
	parts := `{"subject": "삼성전자", "axis": "KR", "bucket_unit": "hour", "time_bucket": "2026-06-23T14", "source_id": "kr_wire", "raw_count": 2, "raw_share": 0.2222, "normalized_contribution": 0.2}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(trend+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gold, "subject_source_contribution.jsonl"), []byte(parts+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	s := getSourceContributions(t, dir, "?axis=KR&subject=삼성전자&unit=hour&time_bucket=2026-06-23T14")
	if s.Basis.RawCount != 9 || s.Basis.RawTotal != 2 {
		t.Errorf("raw_count = %d, raw_total = %d — want 9 and 2, the disagreement as measured",
			s.Basis.RawCount, s.Basis.RawTotal)
	}
	if s.Basis.NormalizedShare != 0.9 || s.Basis.NormalizedTotal != 0.2 {
		t.Errorf("normalized_share = %v, normalized_total = %v — want 0.9 and 0.2",
			s.Basis.NormalizedShare, s.Basis.NormalizedTotal)
	}
}
