# 2026-10-13 gold-index-increment-pass — #261 증분 판정

창 = `00b77b9`→`283225f`. 주석을 움직인 커밋은 PR **#261**(`283225f`, Gold 화면이 인덱스의 Gold 사본에서 보이는 버킷·대상만
읽는다) 하나다. #260(`00b77b9`)은 주석 지문을 움직이지 않았다. #261 은 기능 PR 규칙대로 주석이 바뀐 행의 줄 수·지문을 실측으로
갱신하고 판정 칸을 `—` 로 두었다(`gold.go`·`gold_test.go` 행 신설 포함). 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를
적는다」에 따라 **#261 이 들인 증분만** 판정한다. 기존 행의 옛 판정 줄은 그대로다.

판정 모집단은 게이트 `measure` 를 창 양 끝에서 떠 파일별 주석 멀티셋 차로 뽑은 **추가 계수 45줄**(L 45 · D 0 · E 0)이다 — 무인
경로 41줄(`go/internal/handlers/**` 5파일 · `go/internal/store/store.go`)과 MA6 경로 4줄(`servingindex/build.go` 1 ·
`schema.sql` 3). 같은 창에서 #261 이 코드와 함께 걷은 주석은 15줄(`handlers.go` 13 · `dashboard.go` 2)이고, 그 가운데 유지
사유가 있던 줄(OOM 근거 · 단위를 먼저 정하는 이유 · 다른 축 앵커 동등성)은 #261 의 새 줄로 개작돼 넘어왔다.

복원 경로 원본: PR #261 제목·본문 · 스쿼시 `283225f` · 같은 PR 이 들인 차등 테스트
(`go/internal/handlers/gold_test.go` 의 `TestGoldScreensAnswerTheSameFromTheIndexAsFromTheFiles`).

## 결과 — 45줄: 유지 39(개작 1) · 제거 6

| 파일 · 표면 | 판정 전 → 후 | 증분 처분 |
|---|---|---|
| `go/internal/handlers/contributions.go` · L | 20 → 20 | 유지 1 |
| `go/internal/handlers/dashboard.go` · L | 19 → 17 | 유지 2 · 제거 2 |
| `go/internal/handlers/gold.go` · L | 19 → 17 | 유지 17(개작 1) · 제거 2 |
| `go/internal/handlers/gold_test.go` · L | 4 → 4 | 유지 4 |
| `go/internal/handlers/handlers.go` · L | 93 → 91 | 유지 8 · 제거 2 |
| `go/internal/servingindex/build.go` · L | 24 → 24 | 유지 1 — MA6, 소스 무접촉 |
| `go/internal/servingindex/schema.sql` · L | 13 → 13 | 유지 3 — MA6, 소스 무접촉 |
| `go/internal/store/store.go` · L | 43 → 43 | 유지 3 |

## 제거

- **코드 재진술** — `gold.go` `indexGold` doc 1줄 「서빙 인덱스의 Gold 사본에서 답한다」(바로 아래 `struct{ db *sql.DB }` 와
  `fromGold` 의 doc 이 이미 말한다) · `axisUnitWhere` doc 1줄 「`""` = 모든 축」(바로 아래 `if axis == ""` 분기).
  `fromGold` doc 의 「X-Gold-Source 헤더가 어느 쪽인지 말한다」 절(바로 아래 두 `Header().Set` 줄) — 나머지 두 줄은 남는다(개작).
- **코드 재진술** — `handlers.go` `latestValues` doc 2줄 「unit 이 없으면 축의 최세 단위, bucket 이 없으면 그 단위의 최신」(바로 아래
  두 `if … == ""` 분기를 그대로 읽은 것).
- **이름의 재진술 + 사본** — `dashboard.go` `buildDashboard` 매개변수 doc 2줄 「buckets 는 …, inWindow 는 …, everyAxisLatest 는
  모든 축의 최신 버킷: 앵커가 거기서 시작한다」. 매개변수 이름이 같은 말을 하고, 「다른 축은 앵커만 올린다」는 호출 자리
  `dashboard` 의 인라인 주석이 주인이다.

## 유지 — 사유

- `contributions.go` 1줄 — 값과 기사 목록이 한 인덱스 빌드에서 온다: 그래서 이 화면은 `fromGold` 의 레이크 폴백이 아니라
  `indexGold{db}` 를 직접 쓴다. 다른 Gold 화면처럼 `goldSource` 로 바꾸면 인덱스가 없을 때 수는 레이크에서, 목록은 인덱스에서
  와 서로 다른 원본을 센다.
- `dashboard.go` 2줄(개작된 옛 유지 줄) — 다른 축은 앵커만 올리므로 그 축들은 최신 버킷만, 이 축은 창의 버킷만 읽는다. 읽기를
  넓히거나 좁히는 사람이 앵커가 같게 나오는 근거를 모르면 앵커가 조용히 달라진다(serving-oom-increment-pass 의 옛 사유).
- `gold.go` `goldSource` 3줄 — 모든 질문이 축·단위·버킷·주제를 이름 대야 인덱스가 파일 전체 디코드 대신 인덱스 범위로 답한다.
  새 화면이 메서드를 더할 때 따를 설계 규칙이다.
- `gold.go` 인터페이스 메서드 doc 5줄 — 두 구현(`lakeGold`·`indexGold`)이 맞춰야 할 계약: `trends` 는 파일 순서(인덱스는
  `ORDER BY seq`), `""` 는 모든 축, `trendBuckets` 는 정렬, `trendSubjects` 는 첫 행 순서(인덱스는 `GROUP BY … ORDER BY min(seq)`).
  구현 본문이 서로 달라 한쪽만 읽어서는 계약이 안 보인다.
- `gold.go` `trendQuery` 2줄 — nil 버킷·주제는 전부와 맞고 빈 목록은 아무것과도 맞지 않는다. Go 에서 둘은 쉽게 섞이고 섞이면
  화면이 빈 결과와 전체 결과를 바꿔 낸다.
- `gold.go` `fromGold` 2줄(개작) — 인덱스가 없는 두 창(첫 빌드 전 · 스키마를 올리는 배포와 다음 빌드 사이) 동안 레이크에서 읽어
  이 화면들이 인덱스를 기다리지 않는다. 폴백을 지우려는 사람이 그 창이 배포마다 온다는 것을 알아야 한다.
- `gold.go` `goldFailed` 2줄 — 화면은 파일 위에서 그랬듯 있는 것으로 답하고 읽기 하나의 실패를 오류 페이지로 바꾸지 않는다.
  오류를 응답으로 올리려는 사람이 바꾸는 것이 화면 계약이라는 근거다.
- `gold.go` `lakeGold` 2줄 — 한 요청 동안 읽은 축·단위를 기억해 한 화면의 여러 질문이 한 번의 스캔으로 끝난다. 캐시를
  걷으면 화면마다 파일 스캔이 질문 수만큼 는다.
- `gold_test.go` `goldQueries` 2줄 — 퍼센트 인코딩된 「없음」 주제와 `1999-01-01T00` 버킷이 경계 사례라는 의도. 리터럴만으로는
  안 읽힌다.
- `gold_test.go` 차등 테스트 doc 2줄 — 화면 테스트가 쓰는 Gold 픽스처 전부에서 같은 답이어야 한다: 새 픽스처를 이 맵에
  올리지 않으면 차등 검사의 범위가 조용히 준다.
- `handlers.go` `trend` 2줄(옛 OOM 유지 줄의 개작) — 축의 최세 단위와 차트가 남기는 주제만 읽는다: Gold 는 배치마다 자란다.
- `handlers.go` `compare` 3줄(옛 `latestBucket` 유지 줄의 개작) — 단위를 먼저 정한다: 버킷 키는 단위 안에서만 비교되고
  `'W'` 가 `'0'` 보다 커서 섞인 행의 최댓값은 주 롤업을 최신 시로 단다.
- `handlers.go` `trendSubjectsKept` 3줄 — `seriesBySubject`·`pickSubject`·`limitSeries` 가 전체 주제에서 고르는 것과 같은 선택을
  최신 버킷과 주제 목록만으로 해야 한다. 한쪽 순위 규칙만 바꾸면 차트가 다른 계열을 조용히 그린다.
- `store.go` 3줄 — `EachSubjectTrend`·`EachSubjectSourceContribution`·`EachAxisSentiment` export doc 첫 줄(doc 주석 수준).

## MA6 증분 — 전부 유지, 소스 무접촉

`go/internal/servingindex/**` 는 리뷰 게이트 판정기(`scripts/check-data-format-change.py`)의 **MA6** 경로라 주석만 바꿔도 사람 승인이
붙는다. 이 경로의 #261 증분 4줄은 **전부 유지**라 소스는 바꾸지 않고 원장 행만 `완료` 로 닫는다(열린 MA6 PR 없음).

- `build.go` `Stats` 1줄 — 세 정수가 Gold 세 데이터셋(`subject_trend`·`subject_source_contribution`·`axis_sentiment`)에서 복사한
  행 수다. 옆 필드들과 같은 export 필드 doc(옛 판정이 `Options` 필드 넷을 유지한 잣대)이고, 이름만으로는 파일 수와 갈리지 않는다.
- `schema.sql` Gold 사본 표 머리 3줄 — 표가 있는 이유(화면이 축·단위·버킷 하나를 묻게 하고, 기사 picks 와 같은 빌드에서 읽게
  한다)와 계약(`contracts/gold/*.avsc`) 포인터 · `spark` 는 JSON 텍스트(옛 판정이 `article_pick` 표에서 유지한 「목록 값 필드는
  JSON 텍스트」와 같은 사유).
