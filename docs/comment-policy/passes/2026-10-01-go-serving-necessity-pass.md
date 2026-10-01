# 2026-10-01 go-serving-necessity-pass — Go 서빙 핵심 4파일 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261001-0001`.

## 판정 범위

L 표의 `—` 행 중 Go 서빙 핵심 네 파일(파일 공유 덩어리 각 1행 — 이 파일들은 D·E 행이 없다)을 예산 400줄
안에서 묶었다: **판정 전 400줄 → 210줄(제거 190)**. 남은 Go `—` 행(`go/cmd/serving/main.go` 4 ·
`go/internal/static/static.go` 6 · `go/internal/store/store_test.go` 2)은 더하면 예산을 넘어 뺐다.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---:|---:|---:|
| `go/internal/argo/argo.go` | 28 | 22 | 6 |
| `go/internal/handlers/handlers.go` | 225 | 95 | 130 |
| `go/internal/handlers/handlers_test.go` | 114 | 62 | 52 |
| `go/internal/store/store.go` | 33 | 31 | 2 |

코드 토큰 변경 0 — 네 파일을 `go/scanner`(주석 제외)로 토큰화한 해시가 base 와 같다. gofmt 가 주석이 빠진
구조체 두 곳(`Handlers` · `traceResponse`)의 필드 정렬 공백을 다시 맞췄다.

## 제거 목록

| 파일 | 제거한 주석 | 유형 |
|---|---|---|
| `handlers.go` | `trend`·`sentiment`·`fairness`·`trace` 핸들러 머리 전부 | 다른 주석의 재진술 — 단위 혼재는 `plottedUnit`·`finestUnit`·`latestBucket`, 낡은 버킷 랭킹은 `seriesBySubject`, 선택 보존은 `pickSubject`, 분모 공개는 `fairnessBasis`, 세 갈래 부족은 `traceResponse`, 조인 키는 `store.NewsItems` 가 정본 |
| 같은 파일 | `compare` 머리 13줄 → 3줄 개작 | 위와 같음 — 「빈 열을 두고 옛 버킷을 빌리지 않는다」만 이 핸들러의 고유 규칙이라 남겼다 |
| 같은 파일 | 타입 머리 첫 줄(`trendBasis`·`sentimentBasis` 첫 문단·`sentimentAxisRow`·`fairnessBasis`·`fairnessRow`·`traceCrumbStep`·`traceBronze`·`traceSilver`·`traceIngestion`·`traceResponse`) | 코드 재진술 — 타입 이름과 필드가 말한다 |
| 같은 파일 | `trendSeriesLimit`·`fairnessRowLimit` 근거 | 소감 — 제품 선택을 옮겨 적었을 뿐, 값을 바꾸는 사람이 틀릴 사실이 없다 |
| 같은 파일 | `Selection` 값 열거 4줄 | 코드 재진술 — `selectNewsItem` 의 반환값 |
| 같은 파일 | `silverSection` 의 null 감정 4줄 | 다른 주석의 재진술 — `traceSilver.Sentiment` 가 정본 |
| 같은 파일 | `latestBucketOf`·`sentimentUnit`·`shareOf`·`limitSeries` 머리, `plottedUnit` 의 둘째 문단 | 다른 주석의 재진술(버킷 키 비교 경고 사본) · 코드 재진술 · 작업 흔적(「Rollups have landed … does not exist yet」) |
| 같은 파일 | `distinctBuckets`·`latestSentimentBucket` 머리 → 호출 전제 1~2줄로 개작 | 코드 재진술 부분 제거 |
| 같은 파일 | `now`·`trigger` 필드 머리 | 코드 재진술 — 고정 시계 주입은 테스트가 즉시 붉어 지킨다 |
| `handlers_test.go` | 테스트 머리 17블록 · 단언 위 7줄 | 코드 재진술(테스트 이름·바로 아래 단언) · 핸들러 doc 재진술 |
| 같은 파일 | `TestFairnessSurvivesEmptyGold` 머리 「until the production schedule is unsuspended」 | **틀린 주석** — `deploy/batch/cronworkflow-pipeline.yaml` 은 이미 `suspend: false` 다 |
| 같은 파일 | `writeRolledUpGold` 둘째 문단 「the trap the compare basis used to fall into」 | 경위 · `latestBucket` 재진술 |
| 같은 파일 | `TestCompareAlignsAxesOnTheLatestBucket` 머리 4줄 → 2줄 개작 | AC 재진술 제거, 단위 테스트의 존재 이유만 남김 |
| `store.go` | 패키지 주석 「Records are decoded straight into the generated contract types …」 · `objectPath` 머리 | 코드 재진술(import 와 함수 이름) |
| `argo.go` | `FromEnv` 환경 변수 표 · `Submission.Kind` · `workflow` 타입 머리 | 코드 재진술(바로 아래 `os.Getenv`·`defaultTemplate`) |

## 틀린 주석 고침

- `handlers.go` `trendSeries` — 옛 문면은 LatestShare/Delta 를 「the subject's most recent point」에서 읽는다고
  적었다. `seriesBySubject` 는 차트 전체의 최신 버킷(`buckets` 의 마지막)에 그 주제의 행이 있을 때만 `head` 를
  채우므로, 그 버킷에 행이 없는 주제의 값은 자기 마지막 점이 아니라 0 이다. 그대로 두면 「최근 점」으로
  고쳐 계산하는 수정이 자연스러워지고 그러면 낡은 주제가 다시 앞에 선다. 문면을 코드에 맞췄다.

## 유지 목록 (필요 사유)

### `go/internal/handlers/handlers.go` (L 95)

- 패키지 주석 · `Handlers`·`New`·`WithArgo`·`Register` 1줄 — doc 주석 수준.
- `argo` 필드 「nil outside a cluster」 — 모르면 nil 검사 없이 역참조해 로컬·테스트 서빙이 패닉한다.
- `trendSeries`(고침) — 위 「틀린 주석 고침」.
- `sentimentBasis` 의 `Buckets`↔`LatestBucket` 문단 — 두 값이 갈리는 것이 정직한 답이라는 것을 모르면 차트 끝을 맞추는 「수정」으로 공백을 덮는다.
- `sentimentPoint` — 네 비율의 분모가 분석분이고 미분석은 전체 대비라는 것을 모르면 다섯 수를 합 1 로 접는다.
- `sentimentAxisRow.Present` — 없으면 0 분포가 「긍정 0」과 「집계 안 됨」을 구별하지 못한다.
- `fairnessBasis` `Method`·`RawTotal` · `fairnessRow.RawShare` — 원 점유율이 정규화 점유율이 *아니어야* 대비가 성립한다; 하나로 합치는 「정리」를 막는다.
- `traceBronze` 본문 두 필드 · `traceSilver.Sentiment` 포인터 · `traceResponse` 세 갈래 — 하나의 bool·0 값·「no data」로 접으면 화면이 존재하는 사례(링크 소실·판정 보류·미분석)를 구별하지 못한다.
- `trend` 의 「Filter while reading」 2줄 — 읽고 나서 거르면 서빙이 OOM 으로 죽은 적이 있다(런타임 제약).
- `compare`(개작) — 빈 열을 두고 옛 버킷을 빌리지 않는다는 규칙.
- `selectNewsItem`(개작) — 선택 방식을 응답에 싣는 이유; 빼면 폴백이 요청한 레코드처럼 읽힌다.
- `lineageCrumb` 의 Gold 항상 present — 조회하지 않는 이유를 모르면 Gold 를 찾는 코드를 더한다.
- `plottedUnit` 2줄 — 최신 단위가 아니라 가장 고운 단위가 AC3.3 의 기본값이다.
- `finestUnit` — 단위 간 유효한 유일한 비교와 빈 입력의 0 단위(빈 뷰)가 의도라는 것.
- `distinctBuckets`·`latestSentimentBucket`(개작) — 사전식 = 시간순은 한 단위 안에서만 참이라 호출 전 필터가 전제다.
- `seriesBySubject` — 최신 버킷 점유율로 정렬하고 그 버킷에 없는 주제는 0 으로 뒤로 간다(낡은 1위 방지).
- `pickSubject` — 데이터 없는 주제를 되돌려주면 화면이 아무것도 강조하지 못한다.
- `latestBucket` — 버킷 키 비교 경고의 정본(`2026-W26` > `2026-06-23T14` 예시 포함).
- `sentimentSeries` — 같은 버킷 두 번째 행은 상류 계약 위반이라 섞지 않고 첫 행만 둔다.
- `sentimentByAxis` — 사라지는 열은 「축이 없다」로 읽힌다.

### `go/internal/handlers/handlers_test.go` (L 62)

- 픽스처 배치도(`writeMultiBucketGold` · `writeTrendGold` 표 · `writeMixedUnitSentiment` · `writeRolledUpGold` · `writeSkewedGold` · `writeLineage`) — 각 행이 어떤 오답의 증인인지 없으면 픽스처를 「단순화」해 테스트가 아무것도 증명하지 못하게 된다.
- 단언 위 근거(0.9 누출 · 주간 키가 사전식으로 위 · 묵은 1위 · 뒤섞인 입력 · 다섯 수의 합 · 약한 선두 밀어냄 · 스트리밍 중 고운 단위 · 시간순 첫 버킷 · (a)(b)(c) 하위 사례 입력) — 숫자·순서가 어디서 왔는지 없으면 단언을 고칠 때 검산할 수 없다.
- `TestCompareAlignsAxesOnTheLatestBucket`(개작) · `TestSentimentComparesAxesAtOneBucket` 의 픽스처 재사용 설명 — e2e 가 단일 버킷이라 이 테스트만 버킷 선택을 증명한다; 중복으로 보고 지우면 그 증명이 사라진다.

### `go/internal/store/store.go` (L 31)

- Python 대응 지목(`LocalFsStore` · `OBJECT_PARTITION_CHARS` · `PARTITION_FILE` · `get_object` · `read_objects` · `read_partitions`) — 지우면 한쪽만 고쳐져 레이크 배치를 다르게 읽는다.
- `readJSONL` 의 없는 파일 = 빈 결과(Python 과 같음) · `NewsItems` 의 RecordID 조인 키 · `Analyses` 의 (record_id, analyzer_version) 행 · `ReprocessDecision` 의 마지막 결정 = 서빙 버전 — 데이터 계약의 비자명한 성질.
- 패키지 주석 · export 1줄 doc — doc 주석 수준.

### `go/internal/argo/argo.go` (L 22)

- 패키지 주석의 client-go 미사용 이유 — 손으로 짠 HTTP 클라이언트를 「표준화」하려는 사람이 그 비용 판단을 다시 하지 않게 한다.
- `FromEnv` 의 Pod 밖 nil — 호출부가 nil 을 「클러스터 밖」으로 다뤄야 한다.
- `Annotations` — 사양을 다시 읽지 않고 목록에 보이게 하는 이유.
- `TemplateReachable` — 템플릿 읽기가 배선과 RBAC 를 함께 증명하는 가장 싼 프로브라는 것.
- 재처리 타임아웃 근거 · 생성 시각 정렬 근거(이름에는 순서가 없다).
- export 1줄 doc — doc 주석 수준.
