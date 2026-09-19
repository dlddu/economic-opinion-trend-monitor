package handlers

import (
	"encoding/json"
	"math"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/dlddu/economic-opinion-trend-monitor/go/gen"
	"github.com/dlddu/economic-opinion-trend-monitor/go/internal/store"
)

func writeGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	subjects := `{"subject":"한국은행 기준금리","axis":"KR","bucket_unit":"hour","time_bucket":"b","raw_count":5,"normalized_share":0.6,"delta":0.0,"spark":[0.5,0.6]}
{"subject":"삼성전자","axis":"KR","bucket_unit":"hour","time_bucket":"b","raw_count":3,"normalized_share":0.4,"delta":0.0,"spark":[0.4,0.4]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(subjects+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
	sentiment := `{"axis":"KR","bucket_unit":"hour","time_bucket":"b","distribution":{"positive":0.5,"neutral":0.3,"negative":0.1,"mixed":0.1,"unanalyzed":0.2},"analyzed_total":8}`
	if err := os.WriteFile(filepath.Join(gold, "axis_sentiment.jsonl"), []byte(sentiment+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

func TestDashboardDerivesFromGold(t *testing.T) {
	dir := t.TempDir()
	writeGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	resp, err := http.Get(srv.URL + "/api/dashboard?axis=KR")
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}

	var d dashboardResponse
	if err := json.NewDecoder(resp.Body).Decode(&d); err != nil {
		t.Fatal(err)
	}
	if d.Axis != "KR" || !d.Normalized {
		t.Errorf("axis/normalized wrong: %+v", d)
	}
	if len(d.TopSubjects) != 2 {
		t.Fatalf("want 2 subjects, got %d", len(d.TopSubjects))
	}
	// Highest normalized_share ranks first.
	if d.TopSubjects[0].Subject != "한국은행 기준금리" || d.TopSubjects[0].Rank != 1 {
		t.Errorf("ranking wrong: %+v", d.TopSubjects)
	}
	if d.Sentiment.Positive != 0.5 || d.Sentiment.Unanalyzed != 0.2 {
		t.Errorf("sentiment passthrough wrong: %+v", d.Sentiment)
	}
}

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
