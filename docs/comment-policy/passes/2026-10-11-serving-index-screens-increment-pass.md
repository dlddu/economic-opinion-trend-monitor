# 2026-10-11 serving-index-screens-increment-pass — #252 증분 판정

창 = `bd3bc99`→`e28d896`. 주석을 움직인 커밋은 PR **#252**(`e28d896`, 추적·기여·재처리 화면도 서빙 인덱스로 — 요청마다
레이크 스캔 완전 제거) 하나다. #252 는 기능 PR 규칙대로 주석이 바뀐 L 9행의 줄 수·지문을 실측으로 갱신하고 판정 칸을
`—` 로 두었다(신설 4행 포함). D·E 표면은 창 양 끝에서 바이트 동일하다. 이 패스는 원장 운영 규칙 「증분만 판정했으면 그
결과를 적는다」에 따라 **#252 가 들인 증분만** 판정한다. 기존 행의 옛 판정 줄은 그대로다.

판정 모집단은 게이트 `measure` 를 창 양 끝에서 떠 파일별 주석 멀티셋 차로 뽑은 **추가 계수 66줄**(L)이다 — 무인 경로
52줄(handlers 7파일 · `web/src/api/indexState.ts`)과 MA6 경로 14줄(`servingindex/functions.go` 11 · `derive.sql` 3).
대부분은 옛 유지 줄을 인덱스 질의 함수로 옮기며 다시 접은 것이라 순증은 40줄(무인 27 · MA6 13)이다. 같은 창에서
`build.go` 의 `lower()` 1줄은 `functions.go` 로 옮겨 갔다(옛 판정 유지 그대로).

복원 경로 원본: PR #252 제목·본문 · 스쿼시 `e28d896` · 같은 PR 이 들인 테스트
(`go/internal/handlers/reprocess_test.go` 의 `TestReprocessWindowReadsTimestampsTheWayTimeParseDoes` · `handlers_test.go`
`indexLake` 픽스처 · `web/src/screens/Trace.test.tsx`).

## 결과 — 66줄 중 무인 52줄: 제거 13 · 유지 39(개작 2) / MA6 14줄: 유지 13 · 제거 1(적용 이월)

| 파일 · 표면 | 판정 전 → 후 | 증분 처분 |
|---|---|---|
| `go/internal/handlers/contributions.go` · L | 37 → 34 | 유지 6 · 제거 3 |
| `go/internal/handlers/debug_records.go` · L | 1 → 1 | 유지 1 |
| `go/internal/handlers/handlers.go` · L | 101 → 98 | 유지 5(1줄 개작) · 제거 3 |
| `go/internal/handlers/index.go` · L | 3 → 2 | 제거 1 |
| `go/internal/handlers/index_rows.go` · L | 1 → 0 | 제거 1 (행 삭제) |
| `go/internal/handlers/reprocess.go` · L | 39 → 36 | 유지 25(1줄 개작) · 제거 3 |
| `go/internal/handlers/reprocess_test.go` · L | 17 → 17 | 유지 2 |
| `web/src/api/indexState.ts` · L | 2 → 0 | 제거 2 (행 삭제) |
| `go/internal/servingindex/functions.go` · L | 11 → (10) | 유지 10 · 제거 1 — **적용 이월** |
| `go/internal/servingindex/derive.sql` · L | 10 → 10 | 증분 3 유지 — 원장 행은 #250 이월분과 함께 **0003 쪽이 닫는다** |

## 적용 이월 — MA6 사람 게이트, 원장 행 무접촉

`go/internal/servingindex/**` 는 리뷰 게이트 판정기(`scripts/check-data-format-change.py`)의 **MA6** 경로라 주석만 바꿔도
`format_changed=true` 가 되고 `review/manual-approval` 이 사람 승인 뒤에만 초록이 된다. 이 패스는 그 경로의 #252 증분
14줄도 판정했지만 **소스와 원장 행은 건드리지 않았다.** 이유는 둘이다.

- `functions.go` 는 제거 1줄이 있어 소스를 바꿔야 `완료` 가 된다(MA6).
- `derive.sql` 행은 #250 이 이월한 판정(제거 4)을 아직 적용하지 않은 행이다. 이 행과 바로 아래 `functions.go` 행은 열린
  PR #251(`rct_20261011-0003` — #250 이월 MA6 적용)이 고치는 행과 같거나 붙어 있어, 여기서 고치면 그 PR 과 한 번 더 충돌한다.

그래서 이 두 행의 적용은 **#251 을 새 main 위에 다시 준비할 때 함께 한다**(그 PR 은 이미 #252 와 `ledger.md`·`derive.sql` 에서
충돌한다). 적용할 것: `functions.go` 의 아래 「제거」 1줄을 지우고 행을 `완료` 로 · `derive.sql` 은 #250 판정 적용과 함께 증분 3줄
유지를 결과 칸에 적고 `완료` 로. 사람 승인은 한 번이다.

이 PR 이 소스에 적용한 것은 무인 52줄의 판정 — 제거 13 · 개작 2 — 이다. diff 는 주석 줄만 지우거나 다시 접는다.

## 제거

- **다른 주석의 재진술** — `contributions.go` `byID` 2줄: 「각 레코드의 마지막 관측, 축·버킷 안일 때만」은 `bucketObservations`
  가 SQL 로 구현하며 같은 문장을 doc 으로 갖는다(설명의 주인은 그 함수). `reprocess.go` `window` 의 「Sources 는 소스 필터와
  무관하게 축의 소스 전부 — 화면이 선택지를 보여야 한다」: `reprocessScope.Sources` 필드 주석(옛 판정 유지)과 같은 말이다.
  `window` 는 앞 세 줄로 다시 접었다.
- **코드 재진술** — `contributions.go` `eachBodyShare` · `handlers.go` `trace`(무엇을 따라가는가 — 응답 타입) ·
  `firstAnalysis`(`ORDER BY seq LIMIT 1`) · `selectNewsItem` 의 「기록의 첫 관측, 없으면 레이크의 첫 관측」 절(바로 아래 두 질의;
  고른 방식을 이름 붙이는 이유만 1줄로 남겼다) · `index.go` `oneAtATime`(바로 아래 `select` 두 갈래) · `index_rows.go` 의
  떠 있는 1줄(인덱스가 레이크 행을 통째로 둔다 — `servingindex/schema.sql` 의 미러 주석이 주인) · `reprocess.go` `scoped` ·
  `shares` · `indexState.ts` 2줄(`INDEX_NOT_READY` 의 뜻 — 같은 말을 하던 `Debug.tsx` 줄을 #250 이 같은 사유로 걷었다; 「기다림이지
  실패가 아니다」는 `Debug.tsx` 의 `listError !== INDEX_NOT_READY` 유지 주석과 `IndexNotReady` 카피가 말한다).
- **테스트가 붉게 지키는 명제**(적용 이월) — `functions.go` `rfc3339_at_or_after` 의 「비교는 Go 에 남는다: 2262년 이후 연도는
  Unix 나노초에 안 들어간다」: 비교를 `UnixNano()` 로 바꾸면 `TestReprocessWindowReadsTimestampsTheWayTimeParseDoes` 가
  `total = 1, want the far offset and the far future only` 로 붉다(실측). 테스트 머리가 같은 사실(「years past 2262」)을 적는다.

## 유지 — 사유

- `contributions.go` `bucketObservations` 3줄 — `bucket_label` 이 버킷을 정하고 `collected_at` 범위는 걷기만 좁힌다. 라벨 조건을
  빼고 범위만 남겨도 handlers 테스트는 전부 초록이다(실측) — 지우면 범위만으로 충분해 보이는 변경이 조용히 들어온다.
- `contributions.go` `bucketBounds` 2줄 — 범위는 `bucketLabel` 이 그 버킷에 넣는 시각을 **전부** 담아야 한다(상위 집합이 아니면
  인덱스 걷기가 행을 조용히 잃는다) · 범위로 못 나타내면 `ok=false`.
- `contributions.go` ISO 주 1줄 — 「1주 = 1월 4일을 담는 주」가 아래 월요일 산식의 근거다. 식만으로는 확인 비용이 크다.
- `debug_records.go` 1줄 — 총계를 빌드가 센 `meta.records` 에서 읽는 이유. `COUNT(*)` 로 바꾸면 차가운 볼륨에서 표 전체를
  읽어 수 초가 걸리고, 테스트로는 보이지 않는다.
- `handlers.go` `index` 필드 2줄 — 화면을 요청마다 레이크 스캔으로 되돌리면 파드가 OOM 난다(옛 `lakeScan` 근거가 옮겨 온 것 —
  #250 이 걷은 옛 `index` 주석은 타입 재진술이었고 이 주석은 근거를 말한다).
- `handlers.go` `heavy` 필드 2줄 — 주간 기여 목록 하나가 분석 ~10k 를 Go 로 풀어 운영 레이크 실측 ~70 MiB, 둘이 동시에 파드에
  안 들어간다. 한 번에 하나의 근거(런타임 제약 수치).
- `handlers.go` `selectNewsItem` 1줄(개작) — 대체 선택이 요청한 기록처럼 읽히지 않게 고른 방식을 이름 붙인다(옛 판정 유지 사유).
- `reprocess.go` — `reprocess` 2줄(창이 레이크 대부분일 수 있어 인덱스가 세고 버전·주기 합계만 온다 — 행을 Go 로 끌어오면 OOM 경로) ·
  `window` 3줄(개작 — time.Parse 가 읽는 대로, 못 읽는 시각은 빼고 추측하지 않는다: 스캔과 같아야 하는 규칙) · `inAxis` 3줄
  (오프셋 24:60 때문에 `since` 3일 전 날짜가 걷기 하한 — 아래 `-3` 의 근거) · `windowRecords` 2줄(관측 횟수와 무관하게 레코드당
  한 번 — `IN` 을 JOIN 으로 바꾸면 여러 번 관측된 레코드가 중복되고 이 경로를 밟는 테스트가 없다) · `windowVersions` 3줄(기본 대상
  버전의 근거 — 옛 유지) · `scopeBuckets` 3줄(「완료」는 Silver 행이 아니라 레코드 수 — 옛 유지) · `tallyMentions` 3줄(레코드
  인덱스 순서라 창 전체 정렬이 없다 · 레코드 안에서는 레이크 순서) · `throughput` 3줄 · `mentionTally` 3줄(옛 유지 근거의 이동).
- `reprocess_test.go` 2줄 — 테스트 머리(오프셋 24:60·2262년 이후 연도를 고른 픽스처의 의도) · `far-offset` 이 실제로 가리키는
  UTC 시각(그 값 없이는 창 안인지 손으로 계산해야 한다).
- `servingindex/functions.go` 10줄(적용 이월 행) — `Function` export doc 3(Go 의 대소문자 접기·RFC 3339 파서·버킷 계산을 Go 에서
  해야 질의가 대체한 스캔과 같다 — 미러) · `Register` export doc 3(init 에서 부를 것: 연결은 열리기 전에 등록된 함수만 본다 —
  어기면 조용히 「no such function」) · `go_lower` 1(SQLite `lower()` 는 ASCII 만 — `build.go` 에서 옮겨 온 옛 유지) ·
  `rfc3339_at_or_after` 2(time.Parse 와 같은 읽기 · 못 읽으면 false — 스캔과 같아야 하는 규칙) · `boundCache` 1(질의가 행마다
  같은 하한을 넘긴다 — 캐시의 근거).
- `servingindex/derive.sql` 증분 3줄 — 본문 공유 수의 기사 키가 Python 집계 `econ_aggregation.aggregate.article_key` 의 미러 ·
  빈 해시는 「본문 없음」이지 공유 본문이 아니다(옛 `contributions.go` `add` 유지 줄이 옮겨 온 것).

## 삭제된 원장 행(원문)

```
| 2026-10-11 | `go/internal/handlers/index_rows.go` | 1 | `ba13138d29d5` | — | (판정 전 1) **서빙 인덱스 PR — 미판정.** 이 PR 이 들인 주석의 필요성 판정은 다음 판정 슬라이스가 가져간다. |
| 2026-10-11 | `web/src/api/indexState.ts` | 2 | `6fbe41ef0b5b` | — | (판정 전 2) **서빙 인덱스 PR — 미판정.** 이 PR 이 들인 주석의 필요성 판정은 다음 판정 슬라이스가 가져간다. |
```
