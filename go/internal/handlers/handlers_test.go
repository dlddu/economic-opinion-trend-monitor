package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

// writeMultiBucketGold lays down two time buckets so the compare handler has
// something to pick the wrong one from: T13 is stale (and holds the row with
// the largest share, so a missing filter surfaces immediately), T14 is current,
// and GLOBAL exists only in the stale bucket.
func writeMultiBucketGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"묵은 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":99,"normalized_share":0.9,"delta":0.0,"spark":[0.9]}
{"subject":"현재 KR 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":10,"normalized_share":0.5,"delta":0.0,"spark":[0.5]}
{"subject":"현재 US 대상","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":4,"normalized_share":0.3,"delta":0.0,"spark":[0.3]}
{"subject":"묵은 GLOBAL 대상","axis":"GLOBAL","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":7,"normalized_share":0.4,"delta":0.0,"spark":[0.4]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","distribution":{"positive":0.9,"neutral":0.1,"negative":0.0,"mixed":0.0,"unanalyzed":0.0},"analyzed_total":99}
{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.4,"neutral":0.3,"negative":0.2,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":10}
{"axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.25,"neutral":0.35,"negative":0.3,"mixed":0.1,"unanalyzed":0.4},"analyzed_total":4}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

type compareResponse struct {
	Basis struct {
		TimeBucket string `json:"time_bucket"`
		BucketUnit string `json:"bucket_unit"`
		Normalized bool   `json:"normalized"`
	} `json:"basis"`
	Axes []struct {
		Axis        string                    `json:"axis"`
		TopSubjects []rankRow                 `json:"top_subjects"`
		Sentiment   gen.SentimentDistribution `json:"sentiment"`
	} `json:"axes"`
}

// AC3.7 — the three axes must line up on one shared basis. This is the unit
// guard for that half: the e2e fixture is deliberately single-bucket (it feeds
// the dashboard specs too), so only a test that supplies two buckets can prove
// the handler picks one. The e2e spec covers the rendered side by side view.
func TestCompareAlignsAxesOnTheLatestBucket(t *testing.T) {
	dir := t.TempDir()
	writeMultiBucketGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/compare")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var c compareResponse
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		t.Fatal(err)
	}

	if c.Basis.TimeBucket != "2026-06-23T14" || c.Basis.BucketUnit != "hour" || !c.Basis.Normalized {
		t.Fatalf("basis wrong: %+v", c.Basis)
	}

	// Axis order is fixed so the columns can be read side by side.
	want := []string{"KR", "US", "GLOBAL"}
	if len(c.Axes) != len(want) {
		t.Fatalf("want %d axis columns, got %d", len(want), len(c.Axes))
	}
	for i, axis := range want {
		if c.Axes[i].Axis != axis {
			t.Fatalf("axis column %d = %q, want %q", i, c.Axes[i].Axis, axis)
		}
	}

	// The stale bucket must not leak in — not even the row whose share (0.9)
	// would otherwise top the KR column.
	for _, col := range c.Axes {
		for _, row := range col.TopSubjects {
			if row.Subject == "묵은 대상" || row.Subject == "묵은 GLOBAL 대상" {
				t.Errorf("%s 컬럼에 이전 버킷 행 %q 가 섞였다", col.Axis, row.Subject)
			}
		}
	}
	if len(c.Axes[0].TopSubjects) != 1 || c.Axes[0].TopSubjects[0].Subject != "현재 KR 대상" {
		t.Errorf("KR column wrong: %+v", c.Axes[0].TopSubjects)
	}
	if c.Axes[0].Sentiment.Positive != 0.4 {
		t.Errorf("KR sentiment came from the wrong bucket: %+v", c.Axes[0].Sentiment)
	}

	// An axis absent from the shared bucket stays empty instead of borrowing
	// an older one — an honest gap beats a misaligned comparison.
	if len(c.Axes[2].TopSubjects) != 0 {
		t.Errorf("GLOBAL column should be empty in this bucket: %+v", c.Axes[2].TopSubjects)
	}
	if c.Axes[2].Sentiment != (gen.SentimentDistribution{}) {
		t.Errorf("GLOBAL sentiment should be zero in this bucket: %+v", c.Axes[2].Sentiment)
	}
}

// writeTrendGold lays down three hour buckets across four KR subjects plus a
// week-unit row, so every way the chart could be drawn wrong has a witness:
//
//	기준금리   rises 0.20 -> 0.30 -> 0.50 and leads the latest bucket
//	삼성전자   falls 0.50 -> 0.40 -> 0.30
//	원/달러    holds  0.30 -> 0.30 -> 0.15
//	묵은 1위   held 0.95 in the oldest bucket only, and nothing since
//	주간 롤업  a week row for 기준금리 whose key ("2026-W26") sorts above every
//	          hour key — a unit filter that trusts lexical order plots it last
//
// The US row guards the axis filter.
func writeTrendGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	rows := `{"subject":"기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":10,"normalized_share":0.5,"delta":20.0,"spark":[0.2,0.3,0.5]}
{"subject":"기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":4,"normalized_share":0.2,"delta":0.0,"spark":[0.2]}
{"subject":"기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":6,"normalized_share":0.3,"delta":10.0,"spark":[0.2,0.3]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":10,"normalized_share":0.5,"delta":0.0,"spark":[0.5]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":8,"normalized_share":0.4,"delta":-10.0,"spark":[0.5,0.4]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":6,"normalized_share":0.3,"delta":-10.0,"spark":[0.5,0.4,0.3]}
{"subject":"원/달러","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":6,"normalized_share":0.3,"delta":0.0,"spark":[0.3]}
{"subject":"원/달러","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":6,"normalized_share":0.3,"delta":0.0,"spark":[0.3,0.3]}
{"subject":"원/달러","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":3,"normalized_share":0.15,"delta":-15.0,"spark":[0.3,0.3,0.15]}
{"subject":"묵은 1위","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":95,"normalized_share":0.95,"delta":0.0,"spark":[0.95]}
{"subject":"기준금리","axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","raw_count":20,"normalized_share":0.33,"delta":0.0,"spark":[0.33]}
{"subject":"US 대상","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":9,"normalized_share":0.9,"delta":0.0,"spark":[0.9]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(rows+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

type trendPointJSON struct {
	TimeBucket      string  `json:"time_bucket"`
	NormalizedShare float64 `json:"normalized_share"`
	RawCount        int64   `json:"raw_count"`
}

type trendSeriesJSON struct {
	Subject     string           `json:"subject"`
	Selected    bool             `json:"selected"`
	LatestShare float64          `json:"latest_share"`
	Delta       float64          `json:"delta"`
	Points      []trendPointJSON `json:"points"`
}

type trendResponseJSON struct {
	Axis    string `json:"axis"`
	Subject string `json:"subject"`
	Basis   struct {
		BucketUnit   string   `json:"bucket_unit"`
		FirstBucket  string   `json:"first_bucket"`
		LatestBucket string   `json:"latest_bucket"`
		Buckets      []string `json:"buckets"`
		Normalized   bool     `json:"normalized"`
	} `json:"basis"`
	Series []trendSeriesJSON `json:"series"`
	Note   string            `json:"note"`
}

func getTrend(t *testing.T, dir, query string) trendResponseJSON {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/trend" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var got trendResponseJSON
	if err := json.NewDecoder(resp.Body).Decode(&got); err != nil {
		t.Fatal(err)
	}
	return got
}

// AC3.5 — the response has to be a real time series before the screen can chart
// it, so this pins the three properties the chart reads: bucket order, one
// bucket unit, and a ranking taken from the current bucket.
func TestTrendReturnsBucketOrderedSeries(t *testing.T) {
	dir := t.TempDir()
	writeTrendGold(t, dir)

	got := getTrend(t, dir, "?axis=KR")

	if got.Note != "" {
		t.Errorf("trend still carries a stub note: %q", got.Note)
	}
	if got.Axis != "KR" || !got.Basis.Normalized {
		t.Errorf("axis/normalized wrong: %+v", got)
	}

	// One unit only, and the week row must not set it — its key sorts above
	// every hour key, so a lexical pick would answer "week" here.
	if got.Basis.BucketUnit != "hour" {
		t.Fatalf("bucket_unit = %q, want hour", got.Basis.BucketUnit)
	}
	wantBuckets := []string{"2026-06-23T12", "2026-06-23T13", "2026-06-23T14"}
	if len(got.Basis.Buckets) != len(wantBuckets) {
		t.Fatalf("buckets = %v, want %v", got.Basis.Buckets, wantBuckets)
	}
	for i, b := range wantBuckets {
		if got.Basis.Buckets[i] != b {
			t.Fatalf("buckets = %v, want %v", got.Basis.Buckets, wantBuckets)
		}
	}
	if got.Basis.FirstBucket != wantBuckets[0] || got.Basis.LatestBucket != wantBuckets[2] {
		t.Errorf("basis range wrong: %+v", got.Basis)
	}

	// Ranked on the latest bucket: the subject that dominated the oldest one
	// and has nothing since must not take a line from the current leaders.
	if len(got.Series) != 3 {
		t.Fatalf("want 3 series, got %d: %+v", len(got.Series), got.Series)
	}
	wantOrder := []string{"기준금리", "삼성전자", "원/달러"}
	for i, subject := range wantOrder {
		if got.Series[i].Subject != subject {
			t.Fatalf("series order = %+v, want %v", got.Series, wantOrder)
		}
	}

	lead := got.Series[0]
	if !lead.Selected || got.Subject != "기준금리" {
		t.Errorf("leading subject should be selected by default: %+v", got)
	}
	if lead.LatestShare != 0.5 || lead.Delta != 20.0 {
		t.Errorf("headline metric read off the wrong point: %+v", lead)
	}

	// Points come back oldest first even though Gold held them shuffled, and
	// carry no week row.
	if len(lead.Points) != 3 {
		t.Fatalf("want 3 points, got %+v", lead.Points)
	}
	wantShares := []float64{0.2, 0.3, 0.5}
	for i, p := range lead.Points {
		if p.TimeBucket != wantBuckets[i] || p.NormalizedShare != wantShares[i] {
			t.Fatalf("points out of order: %+v", lead.Points)
		}
	}
}

// Selecting a subject must move the highlight without dropping the comparison,
// and a long-tail subject must survive the top-N trim — otherwise picking one
// would silently return someone else's lines.
func TestTrendSelectsRequestedSubject(t *testing.T) {
	dir := t.TempDir()
	writeTrendGold(t, dir)

	got := getTrend(t, dir, "?axis=KR&subject=%EB%AC%B5%EC%9D%80%201%EC%9C%84")

	if got.Subject != "묵은 1위" {
		t.Fatalf("subject = %q, want 묵은 1위", got.Subject)
	}
	if len(got.Series) != 3 {
		t.Fatalf("want 3 series, got %d: %+v", len(got.Series), got.Series)
	}
	var selected []string
	for _, s := range got.Series {
		if s.Selected {
			selected = append(selected, s.Subject)
		}
	}
	if len(selected) != 1 || selected[0] != "묵은 1위" {
		t.Fatalf("exactly the requested subject should be selected, got %v", selected)
	}
	// It is not a current leader, so it displaces the weakest of them.
	for _, s := range got.Series {
		if s.Subject == "원/달러" {
			t.Errorf("trimmed series should drop the weakest leader: %+v", got.Series)
		}
	}
}

// A subject with no rows is not a reason to hand back someone else's selection,
// and an axis with no Gold at all must still answer 200 with an empty chart.
func TestTrendFallsBackAndSurvivesEmptyGold(t *testing.T) {
	dir := t.TempDir()
	writeTrendGold(t, dir)

	unknown := getTrend(t, dir, "?axis=KR&subject=%EC%97%86%EB%8A%94%20%EB%8C%80%EC%83%81")
	if unknown.Subject != "기준금리" {
		t.Errorf("unknown subject should fall back to the leader, got %q", unknown.Subject)
	}

	empty := getTrend(t, t.TempDir(), "?axis=KR")
	if len(empty.Series) != 0 || len(empty.Basis.Buckets) != 0 {
		t.Errorf("empty Gold should yield an empty chart: %+v", empty)
	}
	if empty.Subject != "" || empty.Basis.BucketUnit != "" {
		t.Errorf("empty Gold should not invent a basis: %+v", empty.Basis)
	}

	// The axis filter is what keeps a US row out of a KR chart.
	for _, s := range getTrend(t, dir, "?axis=US").Series {
		if s.Subject != "US 대상" {
			t.Errorf("US chart leaked a KR subject: %+v", s)
		}
	}
}

// getSentiment runs the sentiment route against a lake rooted at dir.
func getSentiment(t *testing.T, dir, query string) sentimentResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/sentiment" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var s sentimentResponse
	if err := json.NewDecoder(resp.Body).Decode(&s); err != nil {
		t.Fatal(err)
	}
	return s
}

// AC3.4, 축별 half — the three axes have to be read at one bucket, and an axis
// Gold has nothing for must say so rather than answer zeros.
//
// writeMultiBucketGold is shaped for exactly this: KR holds a stale T13 row
// whose positive ratio (0.9) would top the comparison if the bucket filter were
// missing, US holds only the current T14, and GLOBAL holds no sentiment row at
// all.
func TestSentimentComparesAxesAtOneBucket(t *testing.T) {
	dir := t.TempDir()
	writeMultiBucketGold(t, dir)

	s := getSentiment(t, dir, "?axis=KR")

	if s.Axis != "KR" || !s.Basis.Normalized || s.Basis.BucketUnit != "hour" {
		t.Fatalf("basis wrong: %+v", s)
	}
	if s.Basis.LatestBucket != "2026-06-23T14" {
		t.Fatalf("comparison bucket = %q, want the latest", s.Basis.LatestBucket)
	}

	want := []string{"KR", "US", "GLOBAL"}
	if len(s.ByAxis) != len(want) {
		t.Fatalf("want %d axis rows, got %d", len(want), len(s.ByAxis))
	}
	for i, axis := range want {
		if s.ByAxis[i].Axis != axis {
			t.Fatalf("axis row %d = %q, want %q", i, s.ByAxis[i].Axis, axis)
		}
	}

	kr := s.ByAxis[0]
	if !kr.Present || kr.AnalyzedTotal != 10 {
		t.Errorf("KR should be present at the latest bucket: %+v", kr)
	}
	// The stale bucket's 0.9 must not leak into the comparison.
	if kr.Distribution.Positive != 0.4 {
		t.Errorf("KR positive = %v, want the current bucket's 0.4", kr.Distribution.Positive)
	}
	if us := s.ByAxis[1]; !us.Present || us.Distribution.Negative != 0.3 {
		t.Errorf("US row wrong: %+v", us)
	}
	if global := s.ByAxis[2]; global.Present || global.AnalyzedTotal != 0 {
		t.Errorf("GLOBAL has no row in this bucket and must be marked absent: %+v", global)
	}
}

// AC3.4, 미분석 분리 — the four sentiment ratios are over the analyzed items and
// unanalyzed is its own share of the whole. If the handler ever folded them
// together the five numbers would start summing to 1, so that is what is
// asserted against: KR's four sum to 1.0 *and* unanalyzed is 0.2 beside them.
func TestSentimentKeepsUnanalyzedSeparate(t *testing.T) {
	dir := t.TempDir()
	writeMultiBucketGold(t, dir)

	series := getSentiment(t, dir, "?axis=KR").Series
	if len(series) != 2 {
		t.Fatalf("KR has two buckets in Gold, got %d", len(series))
	}
	// Bucket order is chronological, so the stale bucket comes first.
	if series[0].TimeBucket != "2026-06-23T13" || series[1].TimeBucket != "2026-06-23T14" {
		t.Fatalf("series not in bucket order: %+v", series)
	}

	d := series[1].Distribution
	classes := d.Positive + d.Neutral + d.Negative + d.Mixed
	if math.Abs(classes-1.0) > 1e-9 {
		t.Errorf("sentiment classes should be scaled over analyzed items (sum %v, want 1.0)", classes)
	}
	if d.Unanalyzed != 0.2 {
		t.Errorf("unanalyzed = %v, want the aggregate's 0.2 carried through untouched", d.Unanalyzed)
	}
	if series[1].AnalyzedTotal != 10 {
		t.Errorf("analyzed_total = %d, want 10", series[1].AnalyzedTotal)
	}
}

// writeMixedUnitSentiment lays a day rollup beside the hourly rows. The day row
// is the lexically largest key ("2026-06-24" > "2026-06-23T14"), so a handler
// that picked the unit off the newest bucket would draw one day bar and drop
// the hours.
func writeMixedUnitSentiment(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.1},"analyzed_total":9}
{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.4,"neutral":0.3,"negative":0.2,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":10}
{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-24","distribution":{"positive":0.1,"neutral":0.2,"negative":0.6,"mixed":0.1,"unanalyzed":0.3},"analyzed_total":40}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

// One chart, one unit (the AC3.3 rollups the contract already allows must not
// land inside the hourly bars). Empty Gold must answer 200 with nothing drawn
// rather than invent a basis.
func TestSentimentKeepsOneBucketUnitAndSurvivesEmptyGold(t *testing.T) {
	dir := t.TempDir()
	writeMixedUnitSentiment(t, dir)

	s := getSentiment(t, dir, "?axis=KR")
	if s.Basis.BucketUnit != "hour" {
		t.Fatalf("bucket_unit = %q, want the finest unit present", s.Basis.BucketUnit)
	}
	if len(s.Series) != 2 {
		t.Fatalf("want the two hourly buckets, got %d: %+v", len(s.Series), s.Series)
	}
	for _, p := range s.Series {
		if p.TimeBucket == "2026-06-24" {
			t.Errorf("a day rollup leaked into the hourly series: %+v", p)
		}
	}
	if s.Basis.FirstBucket != "2026-06-23T13" || s.Basis.LatestBucket != "2026-06-23T14" {
		t.Errorf("basis edges wrong: %+v", s.Basis)
	}

	empty := getSentiment(t, t.TempDir(), "?axis=KR")
	if len(empty.Series) != 0 || len(empty.Basis.Buckets) != 0 || empty.Basis.BucketUnit != "" {
		t.Errorf("empty Gold should not invent a basis: %+v", empty)
	}
	for _, row := range empty.ByAxis {
		if row.Present {
			t.Errorf("empty Gold marked %s present: %+v", row.Axis, row)
		}
	}
}

// writeRolledUpGold is one aggregation run as it now reaches Gold: the same
// records cut three ways (AC3.3). Every hour row has a day and a week row that
// covers it, so any reader that fails to settle on one unit triple-counts.
//
// The week label is the trap the compare basis used to fall into: "2026-W26"
// sorts above "2026-06-23T14" on bytes, so a plain max over mixed rows returns
// the rollup and calls it the latest hour.
func writeRolledUpGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":5,"normalized_share":0.6,"delta":0.0,"spark":[0.6]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":3,"normalized_share":0.4,"delta":0.0,"spark":[0.4]}
{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":5,"normalized_share":0.6,"delta":0.0,"spark":[0.6]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":3,"normalized_share":0.4,"delta":0.0,"spark":[0.4]}
{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","raw_count":5,"normalized_share":0.6,"delta":0.0,"spark":[0.6]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","raw_count":3,"normalized_share":0.4,"delta":0.0,"spark":[0.4]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":8}
{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":8}
{"axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":8}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

// AC3.7's basis must stay an hour even though a week rollup sorts above every
// hour key on bytes.
func TestCompareSettlesTheUnitBeforePickingTheLatestBucket(t *testing.T) {
	dir := t.TempDir()
	writeRolledUpGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/compare")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()

	var c compareResponse
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		t.Fatal(err)
	}

	if c.Basis.BucketUnit != "hour" || c.Basis.TimeBucket != "2026-06-23T14" {
		t.Fatalf("basis followed the rollup instead of the finest unit: %+v", c.Basis)
	}
	if len(c.Axes[0].TopSubjects) != 2 {
		t.Errorf("KR column should hold the two hour rows: %+v", c.Axes[0].TopSubjects)
	}
	if c.Axes[0].Sentiment.Positive != 0.5 {
		t.Errorf("KR sentiment came from the wrong row: %+v", c.Axes[0].Sentiment)
	}
}

// Rollup-only Gold is not a broken state: with no hour rows the finest unit
// present is the day, and the views answer in it rather than going blank.
func TestViewsFallBackToTheCoarserUnitWhenItIsAllGoldHas(t *testing.T) {
	dir := t.TempDir()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"삼성전자","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":3,"normalized_share":1.0,"delta":0.0,"spark":[1.0]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","raw_count":3,"normalized_share":1.0,"delta":0.0,"spark":[1.0]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","distribution":{"positive":1.0,"neutral":0.0,"negative":0.0,"mixed":0.0,"unanalyzed":0.0},"analyzed_total":3}
{"axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","distribution":{"positive":1.0,"neutral":0.0,"negative":0.0,"mixed":0.0,"unanalyzed":0.0},"analyzed_total":3}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/compare")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	var c compareResponse
	if err := json.NewDecoder(resp.Body).Decode(&c); err != nil {
		t.Fatal(err)
	}
	if c.Basis.BucketUnit != "day" || c.Basis.TimeBucket != "2026-06-23" {
		t.Fatalf("basis = %+v, want the day rows", c.Basis)
	}
	if len(c.Axes[0].TopSubjects) != 1 {
		t.Errorf("KR column wrong: %+v", c.Axes[0].TopSubjects)
	}

	s := getSentiment(t, dir, "?axis=KR")
	if s.Basis.BucketUnit != "day" || len(s.Series) != 1 {
		t.Errorf("sentiment basis = %+v, series %d — want the day rows", s.Basis, len(s.Series))
	}
}

// writeSkewedGold is the shape the fairness view exists to expose: one subject
// whose raw counts lead the axis while its source-normalized share trails.
//
// "와이어 도배 대상" is 60 of the 100 raw items in the basis bucket but only
// 0.25 of the normalized share — one outlet's volume, not the axis's attention.
// Ranking the two modes therefore disagrees, which is what makes the contrast
// testable rather than decorative.
//
// The file also carries the two traps: day/week rollups of the same records
// (AC3.3), and an earlier hour whose subject led with a raw count nothing in
// the latest bucket reaches.
func writeSkewedGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"지난 시간 1위","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":500,"normalized_share":0.99,"delta":0.0,"spark":[0.99]}
{"subject":"와이어 도배 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":60,"normalized_share":0.25,"delta":1.5,"spark":[0.2,0.25]}
{"subject":"고른 관심 대상","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":40,"normalized_share":0.75,"delta":-0.5,"spark":[0.8,0.75]}
{"subject":"와이어 도배 대상","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":60,"normalized_share":0.25,"delta":0.0,"spark":[0.25]}
{"subject":"고른 관심 대상","axis":"KR","bucket_unit":"day","time_bucket":"2026-06-23","raw_count":40,"normalized_share":0.75,"delta":0.0,"spark":[0.75]}
{"subject":"와이어 도배 대상","axis":"KR","bucket_unit":"week","time_bucket":"2026-W26","raw_count":60,"normalized_share":0.25,"delta":0.0,"spark":[0.25]}
{"subject":"미국 축 대상","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":7,"normalized_share":1.0,"delta":0.0,"spark":[1.0]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(""), 0o644); err != nil {
		t.Fatal(err)
	}
}

func getFairness(t *testing.T, dir, query string) fairnessResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/fairness" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var f fairnessResponse
	if err := json.NewDecoder(resp.Body).Decode(&f); err != nil {
		t.Fatal(err)
	}
	return f
}

// The two counting modes have to disagree for the view to be worth anything:
// if the raw ranking and the normalized ranking always matched, normalization
// would be correcting nothing and AC3.8's "구분 표기" would have no content.
func TestFairnessCarriesBothCountingModesForTheSameSubject(t *testing.T) {
	dir := t.TempDir()
	writeSkewedGold(t, dir)

	f := getFairness(t, dir, "?axis=KR")

	if f.Axis != "KR" || !f.Basis.Normalized || f.Basis.Method == "" {
		t.Errorf("basis does not state its terms: %+v", f.Basis)
	}
	if len(f.Rows) != 2 {
		t.Fatalf("want the 2 subjects of the basis bucket, got %d: %+v", len(f.Rows), f.Rows)
	}

	// Ranking follows the normalized share (AC3.1's output), not the raw count.
	if f.Rows[0].Subject != "고른 관심 대상" || f.Rows[0].Rank != 1 {
		t.Errorf("ranking did not follow the normalized share: %+v", f.Rows)
	}

	byName := map[string]fairnessRow{}
	for _, r := range f.Rows {
		byName[r.Subject] = r
	}
	skewed := byName["와이어 도배 대상"]
	// Raw share and normalized share are separate fields with different values —
	// one does not stand in for the other.
	if math.Abs(skewed.RawShare-0.6) > 1e-9 {
		t.Errorf("raw_share = %v, want 60/100", skewed.RawShare)
	}
	if skewed.NormalizedShare != 0.25 {
		t.Errorf("normalized_share = %v, want the aggregation's value", skewed.NormalizedShare)
	}
	if skewed.RawShare <= skewed.NormalizedShare {
		t.Errorf("the skewed subject should lead on raw and trail on normalized: %+v", skewed)
	}
	if skewed.RawCount != 60 {
		t.Errorf("raw_count = %d, want the count itself alongside the share", skewed.RawCount)
	}

	// RawTotal is the published denominator, so the shares add up to the whole.
	if f.Basis.RawTotal != 100 {
		t.Errorf("raw_total = %d, want 60+40 of the basis bucket", f.Basis.RawTotal)
	}
	var sum float64
	for _, r := range f.Rows {
		sum += r.RawShare
	}
	if math.Abs(sum-1) > 1e-9 {
		t.Errorf("raw shares sum to %v, want 1 over the published total", sum)
	}
}

// Same two traps the other Gold readers close: the rollups must not multiply
// the ranking, and an earlier bucket must not outrank the current one.
func TestFairnessSettlesOneUnitAndOneBucket(t *testing.T) {
	dir := t.TempDir()
	writeSkewedGold(t, dir)

	f := getFairness(t, dir, "?axis=KR")

	if f.Basis.BucketUnit != "hour" || f.Basis.TimeBucket != "2026-06-23T14" {
		t.Fatalf("basis followed a rollup or a stale bucket: %+v", f.Basis)
	}
	seen := map[string]bool{}
	for _, r := range f.Rows {
		if seen[r.Subject] {
			t.Errorf("subject %q appears more than once — a rollup row leaked in", r.Subject)
		}
		seen[r.Subject] = true
		if r.Subject == "지난 시간 1위" {
			t.Errorf("an earlier bucket's leader outranked the current one: %+v", r)
		}
		if r.Subject == "미국 축 대상" {
			t.Errorf("another axis leaked into the KR view: %+v", r)
		}
	}
}

// Empty Gold is a real state until the production schedule is unsuspended, so
// the view answers "nothing aggregated yet" instead of inventing a basis.
func TestFairnessSurvivesEmptyGold(t *testing.T) {
	f := getFairness(t, t.TempDir(), "?axis=KR")

	if len(f.Rows) != 0 {
		t.Errorf("empty Gold produced rows: %+v", f.Rows)
	}
	if f.Basis.BucketUnit != "" || f.Basis.TimeBucket != "" || f.Basis.RawTotal != 0 {
		t.Errorf("empty Gold invented a basis: %+v", f.Basis)
	}
}

// writeLineage lays down one collected article, its preserved body and its
// analysis, so the join has something to walk. The three datasets are written
// separately on purpose — each hop of the lineage can be knocked out on its own
// by the tests below.
func writeLineage(t *testing.T, dir string, items, bodies, analyses string) {
	t.Helper()
	for _, d := range []string{"bronze", "silver"} {
		if err := os.MkdirAll(filepath.Join(dir, d), 0o755); err != nil {
			t.Fatal(err)
		}
	}
	write := func(layer, name, content string) {
		if content == "" {
			return
		}
		p := filepath.Join(dir, layer, name+".jsonl")
		if err := os.WriteFile(p, []byte(content+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
	write("bronze", "news_item", items)
	write("silver", "analysis", analyses)
	for _, line := range strings.Split(bodies, "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}
		var body struct {
			BodyHash string `json:"body_hash"`
		}
		if err := json.Unmarshal([]byte(line), &body); err != nil {
			t.Fatal(err)
		}
		partition := filepath.Join(dir, "bronze", "news_body", "body_hash_prefix="+body.BodyHash[:1])
		if err := os.MkdirAll(partition, 0o755); err != nil {
			t.Fatal(err)
		}
		if err := os.WriteFile(filepath.Join(partition, body.BodyHash+".json"), []byte(line+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
	}
}

func getTrace(t *testing.T, dir, query string) traceResponse {
	t.Helper()
	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/trace" + query)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	var tr traceResponse
	if err := json.NewDecoder(resp.Body).Decode(&tr); err != nil {
		t.Fatal(err)
	}
	return tr
}

const (
	liveItem = `{"record_id":"r-1","source_id":"src-a","axis":"KR","rank":1,"view_count":120,` +
		`"title":"기준금리 동결","source_url":"https://ex.test/1","body_hash":"h1",` +
		`"body_available":true,"collected_at":"2026-06-23T14:05:00Z","collection_cycle":"2026-06-23T14"}`
	liveBody = `{"body_hash":"h1","raw_text":"본문 전문","first_seen_at":"2026-06-23T14:05:00Z",` +
		`"first_seen_cycle":"2026-06-23T14"}`
	liveAnalysis = `{"record_id":"r-1","source_url":"https://ex.test/1","target_countries":["KR"],` +
		`"narrative_subjects":["한국은행 기준금리"],"sentiment":"neutral","analysis_status":"analyzed",` +
		`"confidence":0.91,"analyzed_at":"2026-06-23T14:40:00Z","analyzer_version":"v3"}`
)

// The point of the endpoint: one record id reaches all three layers at once, so
// the assertion that matters is that the *stored* values come back.
func TestTraceJoinsBronzeBodyAndSilverAnalysis(t *testing.T) {
	dir := t.TempDir()
	writeLineage(t, dir, liveItem, liveBody, liveAnalysis)

	tr := getTrace(t, dir, "?record_id=r-1")

	if !tr.Found || tr.RecordID != "r-1" || tr.Selection != "requested" {
		t.Fatalf("lookup did not resolve the requested record: %+v", tr)
	}
	if tr.Bronze == nil || tr.Silver == nil {
		t.Fatalf("a layer is missing: bronze=%v silver=%v", tr.Bronze, tr.Silver)
	}
	if tr.Bronze.Title != "기준금리 동결" || tr.Bronze.SourceURL != "https://ex.test/1" {
		t.Errorf("bronze values are not the stored ones: %+v", tr.Bronze)
	}
	if !tr.Bronze.BodyPreserved || tr.Bronze.BodyText != "본문 전문" {
		t.Errorf("body_hash did not resolve to the stored body: %+v", tr.Bronze)
	}
	if tr.Silver.AnalyzerVersion != "v3" || tr.Silver.Sentiment == nil || *tr.Silver.Sentiment != "neutral" {
		t.Errorf("silver values are not the stored ones: %+v", tr.Silver)
	}
	if len(tr.Silver.NarrativeSubjects) != 1 || tr.Silver.NarrativeSubjects[0] != "한국은행 기준금리" {
		t.Errorf("narrative subjects lost in the join: %+v", tr.Silver)
	}
	// Provenance is what lets the reader date the observation (AC1.5).
	if tr.Ingestion.CollectedAt != "2026-06-23T14:05:00Z" || tr.Ingestion.Rank != 1 || tr.Ingestion.ViewCount != 120 {
		t.Errorf("ingestion metadata lost in the join: %+v", tr.Ingestion)
	}
	for _, step := range tr.Crumb {
		if !step.Present {
			t.Errorf("a fully populated lineage reported a gap at %q", step.Layer)
		}
	}
}

// The case the screen exists for: the original link has rotted, but the copy
// taken at collection time is still here, so the trail does not end (AC1.4).
// body_available=false must not be read as "nothing to show".
func TestTraceFallsBackToPreservedBodyWhenLinkUnavailable(t *testing.T) {
	dir := t.TempDir()
	expired := `{"record_id":"r-2","source_id":"src-b","axis":"KR","rank":2,"view_count":40,` +
		`"title":"만료된 기사","source_url":"https://ex.test/gone","body_hash":"h2",` +
		`"body_available":false,"collected_at":"2026-06-23T14:06:00Z","collection_cycle":"2026-06-23T14"}`
	body := `{"body_hash":"h2","raw_text":"수집 시점 보존 사본","first_seen_at":"2026-06-23T14:06:00Z",` +
		`"first_seen_cycle":"2026-06-23T14"}`
	writeLineage(t, dir, expired, body, "")

	tr := getTrace(t, dir, "?record_id=r-2")

	if tr.Bronze == nil {
		t.Fatal("bronze missing")
	}
	if tr.Bronze.BodyAvailable {
		t.Fatalf("fixture is wrong — this record is supposed to be link-dead: %+v", tr.Bronze)
	}
	if !tr.Bronze.BodyPreserved || tr.Bronze.BodyText != "수집 시점 보존 사본" {
		t.Errorf("a dead link swallowed the preserved copy: %+v", tr.Bronze)
	}
	if tr.Bronze.BodyFirstSeenCycle != "2026-06-23T14" {
		t.Errorf("preserved body lost its collection cycle: %+v", tr.Bronze)
	}
}

// Three ways to come up short, three different answers. Collapsing them would
// tell a reader "no data" when the truth is "collected, not yet analyzed" —
// and AC2.5 spends a whole class on keeping that distinction.
func TestTraceSeparatesUnanalyzedFromMissingAnalysis(t *testing.T) {
	// (a) collected, never analyzed: Silver holds no row at all.
	noSilver := t.TempDir()
	writeLineage(t, noSilver, liveItem, liveBody, "")
	tr := getTrace(t, noSilver, "?record_id=r-1")
	if tr.Silver != nil {
		t.Errorf("an absent analysis was reported as one: %+v", tr.Silver)
	}
	if tr.Bronze == nil || !tr.Bronze.BodyPreserved {
		t.Errorf("a missing analysis dragged bronze down with it: %+v", tr.Bronze)
	}
	if tr.Crumb[1].Present {
		t.Errorf("crumb claims a silver hop that is not there: %+v", tr.Crumb)
	}

	// (b) analyzed but set aside: the row exists, the sentiment is null.
	setAside := t.TempDir()
	unanalyzed := `{"record_id":"r-1","source_url":"https://ex.test/1","target_countries":["KR"],` +
		`"narrative_subjects":["한국은행 기준금리"],"sentiment":null,"analysis_status":"low_confidence",` +
		`"confidence":0.21,"analyzed_at":"2026-06-23T14:41:00Z","analyzer_version":"v3"}`
	writeLineage(t, setAside, liveItem, liveBody, unanalyzed)
	tr = getTrace(t, setAside, "?record_id=r-1")
	if tr.Silver == nil {
		t.Fatal("a low-confidence analysis was dropped instead of reported")
	}
	if tr.Silver.Sentiment != nil {
		t.Errorf("a set-aside record was given one of the four classes: %v", *tr.Silver.Sentiment)
	}
	if tr.Silver.AnalysisStatus != "low_confidence" {
		t.Errorf("status lost the reason it was set aside: %+v", tr.Silver)
	}
	if !tr.Crumb[1].Present {
		t.Errorf("a set-aside analysis is still an analysis — crumb should show the hop: %+v", tr.Crumb)
	}

	// (c) not collected at all: the trail never starts, and says so.
	tr = getTrace(t, setAside, "?record_id=nope")
	if tr.Found || tr.Bronze != nil {
		t.Errorf("an unknown record produced a lineage: %+v", tr)
	}
	if tr.Selection != "requested-missing" {
		t.Errorf("a failed lookup did not say so: %q", tr.Selection)
	}
}

// Opening the screen with no record in hand must not error, and must not let
// the caller mistake the fallback for what they asked for.
func TestTraceNamesItsFallbackSelection(t *testing.T) {
	dir := t.TempDir()
	writeLineage(t, dir, liveItem, liveBody, liveAnalysis)

	if tr := getTrace(t, dir, ""); tr.Selection != "auto" || tr.RecordID != "r-1" {
		t.Errorf("no-arg lookup did not report itself as a fallback: %+v", tr)
	}
	if tr := getTrace(t, t.TempDir(), ""); tr.Found || tr.Selection != "empty" {
		t.Errorf("an empty lake invented a record: %+v", tr)
	}
}
