# 2026-10-11 article-pick-increment-pass — #255 증분 판정

창 = `2928f5c`→`a569932`. 주석을 움직인 커밋은 PR **#255**(`a569932`, 집계가 기여 기사 목록을 Gold article_pick 으로 쓰고
서빙은 읽기만 한다) 하나다. #255 는 기능 PR 규칙대로 주석이 바뀐 행의 줄 수·지문을 실측으로 갱신하고 판정 칸을 `—` 로
두었다(`test_article_picks.py` L·D 행 신설 포함). 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를 적는다」에 따라
**#255 가 들인 증분만** 판정한다. 기존 행의 옛 판정 줄은 그대로다(아래 「낡은 옛 유지 줄 정정」 1줄만 예외).

판정 모집단은 게이트 `measure` 를 창 양 끝에서 떠 파일별 주석 멀티셋 차로 뽑은 **추가 계수 31줄**(L 23 · D 8)이다 — 무인 경로
28줄(handlers 2파일 · `store.go` · `tests/e2e/run.sh` · aggregation 2파일)과 MA6 경로 3줄(`servingindex/build.go` 1 ·
`schema.sql` 2). `handlers.go` 는 증분 0 이다(#255 가 `heavy` 필드를 그 2줄과 함께 코드째 지웠다).

복원 경로 원본: PR #255 제목·본문 · 스쿼시 `a569932` · 같은 PR 이 들인 테스트
(`go/internal/handlers/contributions_test.go` 의 `TestContributionsListsTheArticlesGoldPicked` ·
`TestContributionsWaitForAnIndexBuiltWithThePicks` · `python/packages/aggregation/tests/test_article_picks.py`).

## 결과 — 31줄 중 무인 28줄: 유지 20(개작 1) · 제거 8 / MA6 3줄: 유지 3(판정만)

| 파일 · 표면 | 판정 전 → 후 | 증분 처분 |
|---|---|---|
| `go/internal/handlers/contributions.go` · L | 24 → 19 | 유지 1(개작) · 제거 5 |
| `go/internal/handlers/contributions_test.go` · L | 25 → 25 | 유지 8 |
| `go/internal/handlers/handlers.go` · L | 96 → 96 | 증분 0 |
| `go/internal/store/store.go` · L | 40 → 40 | 유지 3 |
| `python/packages/aggregation/tests/test_article_picks.py` · L | 1 → 1 | 유지 1 |
| `tests/e2e/run.sh` · L | 33 → 33 | 유지 2 |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` · D | 25 → 22 | 유지 3 · 제거 2 · 옛 유지 줄 정정 1 |
| `python/packages/aggregation/tests/test_article_picks.py` · D | 3 → 2 | 유지 2 · 제거 1 |
| `go/internal/servingindex/build.go` · L | 27 → 27 | 증분 1 유지 — **판정만, 원장 행 무접촉** |
| `go/internal/servingindex/schema.sql` · L | 10 → 10 | 증분 2 유지 — **판정만, 원장 행 무접촉** |

## 제거

- **사본 — 설명의 주인은 생산자 쪽** — `contributions.go` `contributions` doc 2줄 「집계가 목록을 Gold article_pick 으로 값 옆에
  쓰므로 목록은 그 값이 센 것이고, 다시 계산하지 않고 읽는다」: 같은 설계를 `aggregate.py` `article_picks` docstring 이 말한다
  (「SubjectTrend 옆에 써서 목록이 두 번째 계산이 아니게 한다」 — 그 잣대를 세운 자리). 핸들러를 레이크 재계산으로 되돌리면
  picks 를 일부러 레이크와 어긋나게 짠 `TestContributionsListsTheArticlesGoldPicked` 가 붉다.
- **사본 + 테스트가 붉게 지키는 명제** — `contributions.go` 「picks 를 처음 쓰기 전에 빌드된 인덱스는 모든 수 아래 빈 목록을
  낸다: 그건 not ready 지 기사 없음이 아니다」 2줄: `store.go` `ArticlePicksWritten` doc 이 같은 구분(「기사 없음」이 아니다)의
  주인이다. `picks_written` 검사를 꺼 두면 `TestContributionsWaitForAnIndexBuiltWithThePicks` 가 `got 200` 으로 붉다(실측).
- **코드 재진술** — `contributions.go` `pickedArticles` doc 의 「주제 아래 센 버킷의 picks 를 각 관측·본문 공유 수와 함께 읽는다」
  절(바로 아래 질의). 최신 순인 이유만 1줄로 남겼다(개작). `aggregate.py` `article_picks` 의 「주제 없이 센 기사(미분석·주제 없음)는
  어느 목록에도 없으니 쓰지 않는다」 2줄(바로 아래 `if not pick.keys: continue`).
- **테스트 이름의 재진술** — `test_article_picks.py` 모듈 docstring 첫 줄 「AC3.9 — Gold 값 뒤의 기사 목록은 그 값이 센 picks」:
  첫 테스트 `test_picks_number_every_gold_raw_count_exactly` 가 같은 말을 한다. AC3.9 는 2026-09-28 사용자 결정으로 승격이
  번복돼(설계 트래커 2026-09) 살아 있는 AC 번호도 아니다.

## 낡은 옛 유지 줄 정정

- `aggregate.py` `ArticlePicks` docstring 의 「서빙 기여 목록(Go `contributions`)이 이 고르기를 미러한다」 — batch-cycle-streaming-
  increment-pass 가 미러 포인터로 유지했지만, #255 이후 Go 는 고르기를 다시 하지 않고 집계가 쓴 picks 를 읽는다. 짝이 사라져
  거짓이 된 문장이라 걷었다(같은 줄의 「버킷 안 기사의 최신 관측이 이긴다」는 남는다).

## 유지 — 사유

- `contributions.go` `pickedArticles` 1줄(개작) — 최신 순인 이유: 독자가 스파이크에서 왔다(정렬을 바꾸는 사람이 모르는 이유 —
  necessity-migration-pass 의 옛 `Newest first` 유지 사유가 옮겨 온 것).
- `contributions_test.go` 8줄 — 붙여 넣은 Gold 의 출처에 `build_article_picks_all_units` 가 더해진 개작 6줄(손으로 맞춘 값이면 합
  항등식이 아무것도 증명하지 못한다 — 옛 판정 유지 사유) · `TestContributionsListsTheArticlesGoldPicked` 머리 2줄(picks 가 레이크와
  일부러 어긋난다 — 픽스처를 맞춰 「정리」하면 재계산 구현도 초록이 되어 테스트가 조용히 공허해진다).
- `store.go` 3줄 — `ArticlePicksWritten`·`EachArticlePick` export doc 첫 줄(doc 주석 수준) · 「picks 이전에 집계된 레이크는 데이터셋이
  없다 — 「기사 없음」이 아니다」(not ready 와 빈 목록을 가르는 근거의 주인).
- `test_article_picks.py` L 1줄 — `a1`·`a2` 가 URL 을 공유하는 이유(같은 기사의 나중 관측 — 기사 키가 URL 이다).
- `test_article_picks.py` D 2줄 — 모든 케이스가 picks 와 `build_subject_trends` 를 같은 입력으로 만든다: 시험하는 것은 둘의 일치지
  리터럴이 아니다. 리터럴 기대값으로 바꿔도 초록이라 지우면 조용히 공허해진다.
- `tests/e2e/run.sh` 2줄 — 기여 목록이 집계의 Gold article_pick 을 인덱스를 거쳐 읽으므로 길이가 raw_count 와 같아야 한다. 집계→
  인덱스→서빙 체인을 한 번에 묶는 유일한 e2e 검사라는 근거다(FAIL 문구는 비교만 말한다).
- `aggregate.py` `article_picks` 3줄 — 공개 함수 요약 1 · 「SubjectTrend 옆에 써서 목록이 두 번째 계산이 아니다 · (주제, 축, 버킷)
  행 수가 raw_count」 2(목록을 읽기만 한다는 설계의 주인).

## MA6 증분 — 판정만, 원장 행 무접촉

`go/internal/servingindex/**` 는 리뷰 게이트 판정기(`scripts/check-data-format-change.py`)의 **MA6** 경로라 주석만 바꿔도 사람 승인이
붙는다. 이 경로의 #255 증분 3줄은 **전부 유지**라 소스는 바꿀 것이 없다.

- `build.go` `Stats.PicksWritten` 1줄 — 「레이크에 article_pick 데이터셋이 아직 없으면 false」. 옆 필드들과 같은 export 필드 doc
  (옛 판정이 `Options` 필드 넷을 유지한 잣대).
- `schema.sql` `article_pick` 표 머리 2줄 — 계약(`contracts/gold/article_pick.avsc`) 포인터 · `counted_subjects` 는 JSON 텍스트
  (옛 판정이 같은 표에서 유지한 「목록 값 필드는 JSON 텍스트」와 같은 사유).

두 행의 원장 칸은 고치지 않았다. `build.go` 행은 열린 PR #254(`rct_20261011-0005` — #250·#253 이월 MA6 적용)가 고치는 행이고,
`schema.sql` 행은 그 PR 이 고치는 `reader.go` 행 바로 아래다. 여기서 고치면 이미 #255 와 충돌한 그 PR 이 한 번 더 충돌한다.
그 PR 을 새 main 위에 다시 준비할 때 두 행을 이 판정으로 닫는다: `build.go` 는 #255 의 +1줄(유지)을 결과 칸에 더하고,
`schema.sql` 은 증분 2줄 유지를 적어 `완료` 로. 판정이 전부 유지라 새 소스 변경은 없다.

## 범위 밖으로 남긴 것

- `python/packages/core/src/econ_core/silver.py` `grouping_keys` docstring 의 「둘이 어긋나면 Gold 행의 기사를 다시 찾을 수 없다」 —
  #255 이후 기사는 picks 로 찾고, Go `groupingKeys` 는 재처리 집계(`reprocess.go`)에만 쓰인다. 미러 포인터 자체는 아직 참이지만
  근거 절이 낡았다. 이 행은 `완료` 이고 #255 가 건드리지 않아 이 증분 패스의 모집단 밖이다.
