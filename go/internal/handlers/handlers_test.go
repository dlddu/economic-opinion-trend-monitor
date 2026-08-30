package handlers

import (
	"encoding/json"
	"fmt"
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

// The dashboard ranks "현재 버킷" — its own metric label says so. Before this
// guard it ranked every bucket at once, which both duplicated a subject per
// bucket and let a stale row outrank the current one.
func TestDashboardAndFairnessRankOnlyTheLatestBucket(t *testing.T) {
	dir := t.TempDir()
	writeMultiBucketGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var d dashboardResponse
	getJSON(t, srv.URL+"/api/dashboard?axis=KR", &d)

	if len(d.TopSubjects) != 1 || d.TopSubjects[0].Subject != "현재 KR 대상" {
		t.Errorf("대시보드가 최신 버킷 밖 행을 포함한다: %+v", d.TopSubjects)
	}
	// 0.9 is the stale bucket's distribution; picking it means the handler took
	// the first row for the axis rather than the current one.
	if d.Sentiment.Positive != 0.4 {
		t.Errorf("분위기가 다른 버킷에서 왔다: %+v", d.Sentiment)
	}

	var f struct {
		Rows []rankRow `json:"rows"`
	}
	getJSON(t, srv.URL+"/api/fairness?axis=KR", &f)
	if len(f.Rows) != 1 || f.Rows[0].Subject != "현재 KR 대상" {
		t.Errorf("공정성 표가 최신 버킷 밖 행을 포함한다: %+v", f.Rows)
	}
}

// writeSeriesGold lays down a KR axis with three buckets so a series has a
// shape: "관심 상승"이 세 버킷 전부에, "간헐 등장"은 가운데 버킷이 빈 채로 —
// 결측 버킷이 앞으로 당겨지면 안 된다는 것을 재려면 구멍이 있어야 한다.
func writeSeriesGold(t *testing.T, dir string) {
	t.Helper()
	gold := filepath.Join(dir, "gold")
	if err := os.MkdirAll(gold, 0o755); err != nil {
		t.Fatal(err)
	}
	// Deliberately not in bucket order on disk: the handler sorts, the file does not.
	rows := `{"subject":"관심 상승","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":30,"normalized_share":0.5,"delta":2.0,"spark":[0.3,0.4,0.5]}
{"subject":"간헐 등장","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":8,"normalized_share":0.2,"delta":0.0,"spark":[0.2]}
{"subject":"관심 상승","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T12","raw_count":10,"normalized_share":0.3,"delta":0.0,"spark":[0.3]}
{"subject":"관심 상승","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T13","raw_count":20,"normalized_share":0.4,"delta":1.0,"spark":[0.3,0.4]}
{"subject":"간헐 등장","axis":"KR","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":12,"normalized_share":0.25,"delta":0.5,"spark":[0.2,0.25]}
{"subject":"다른 축","axis":"US","bucket_unit":"hour","time_bucket":"2026-06-23T14","raw_count":99,"normalized_share":0.9,"delta":0.0,"spark":[0.9]}`
	if err := os.WriteFile(filepath.Join(gold, "subject_trend.jsonl"), []byte(rows+"\n"), 0o644); err != nil {
		t.Fatal(err)
	}
}

// AC3.5 — the chart's data contract: a series per subject in bucket order, the
// axis's leaders alongside for comparison, and a caller-chosen subject.
func TestTrendBuildsSeriesAcrossBuckets(t *testing.T) {
	dir := t.TempDir()
	writeSeriesGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var tr trendResponse
	getJSON(t, srv.URL+"/api/trend?axis=KR", &tr)

	// The shared x axis is every bucket on the axis, sorted — not per subject.
	wantBuckets := []string{"2026-06-23T12", "2026-06-23T13", "2026-06-23T14"}
	if fmt.Sprint(tr.Basis.Buckets) != fmt.Sprint(wantBuckets) {
		t.Errorf("공통 버킷 축이 다르다: %v", tr.Basis.Buckets)
	}
	if tr.Basis.BucketUnit != "hour" || !tr.Basis.Normalized {
		t.Errorf("basis wrong: %+v", tr.Basis)
	}

	// No subject asked for -> the axis leader in the latest bucket, marked.
	if tr.Subject != "관심 상승" || len(tr.Series) == 0 || !tr.Series[0].Selected {
		t.Fatalf("기본 선택 대상이 축 1위가 아니다: %+v", tr)
	}
	lead := tr.Series[0]
	if len(lead.Points) != 3 {
		t.Fatalf("선택 대상 시리즈 점 개수 = %d, want 3", len(lead.Points))
	}
	for i, want := range []float64{0.3, 0.4, 0.5} {
		if lead.Points[i].NormalizedShare != want {
			t.Errorf("점 %d: share %v, want %v (버킷 순 정렬 실패)", i, lead.Points[i].NormalizedShare, want)
		}
		if lead.Points[i].TimeBucket != wantBuckets[i] {
			t.Errorf("점 %d: bucket %q, want %q", i, lead.Points[i].TimeBucket, wantBuckets[i])
		}
	}
	// Headline numbers come from the newest point, not the file's first row.
	if lead.LatestShare != 0.5 || lead.Delta != 2.0 {
		t.Errorf("최신 점에서 온 값이 아니다: share=%v delta=%v", lead.LatestShare, lead.Delta)
	}

	// Comparison subjects ride along, and a bucket a subject is absent from
	// stays absent instead of sliding an older value into its slot.
	gap := seriesNamed(t, tr, "간헐 등장")
	if gap.Selected {
		t.Error("비교 대상이 선택 대상으로 표시됐다")
	}
	if len(gap.Points) != 2 || gap.Points[0].TimeBucket != "2026-06-23T12" ||
		gap.Points[1].TimeBucket != "2026-06-23T14" {
		t.Errorf("결측 버킷이 메워졌다: %+v", gap.Points)
	}

	// Other axes never enter the picture.
	for _, s := range tr.Series {
		if s.Subject == "다른 축" {
			t.Error("다른 축 대상이 KR 시리즈에 섞였다")
		}
	}
}

func TestTrendSelectsTheRequestedSubject(t *testing.T) {
	dir := t.TempDir()
	writeSeriesGold(t, dir)

	mux := http.NewServeMux()
	New(store.New(dir)).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var tr trendResponse
	getJSON(t, srv.URL+"/api/trend?axis=KR&subject=%EA%B0%84%ED%97%90%20%EB%93%B1%EC%9E%A5", &tr)
	if tr.Subject != "간헐 등장" || !tr.Series[0].Selected || tr.Series[0].Subject != "간헐 등장" {
		t.Errorf("요청한 대상이 선택되지 않았다: %+v", tr)
	}
	// The leader is still there to compare against.
	seriesNamed(t, tr, "관심 상승")

	// An unknown subject falls back to the leader rather than rendering nothing.
	var fallback trendResponse
	getJSON(t, srv.URL+"/api/trend?axis=KR&subject=%EC%97%86%EB%8A%94%20%EB%8C%80%EC%83%81", &fallback)
	if fallback.Subject != "관심 상승" {
		t.Errorf("모르는 대상에 대해 1위로 되돌아가지 않았다: %q", fallback.Subject)
	}
}

func TestTrendOnEmptyGold(t *testing.T) {
	mux := http.NewServeMux()
	New(store.New(t.TempDir())).Register(mux)
	srv := httptest.NewServer(mux)
	defer srv.Close()

	var tr trendResponse
	getJSON(t, srv.URL+"/api/trend?axis=KR", &tr)
	if tr.Subject != "" || len(tr.Series) != 0 || len(tr.Basis.Buckets) != 0 {
		t.Errorf("빈 Gold에서 빈 응답이 아니다: %+v", tr)
	}
}

func seriesNamed(t *testing.T, tr trendResponse, subject string) trendSeries {
	t.Helper()
	for _, s := range tr.Series {
		if s.Subject == subject {
			return s
		}
	}
	t.Fatalf("시리즈에 %q 가 없다: %+v", subject, tr.Series)
	return trendSeries{}
}

func getJSON(t *testing.T, url string, into any) {
	t.Helper()
	resp, err := http.Get(url)
	if err != nil {
		t.Fatal(err)
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("GET %s -> %d", url, resp.StatusCode)
	}
	if err := json.NewDecoder(resp.Body).Decode(into); err != nil {
		t.Fatal(err)
	}
}
