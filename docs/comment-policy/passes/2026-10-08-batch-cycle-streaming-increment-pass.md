# 2026-10-08 batch-cycle-streaming-increment-pass — #237 증분 50줄 판정

창 = `a320223`→`cef78d3`. 주석을 움직인 커밋은 PR **#237**(`cef78d3`, analysis·aggregation 을 주기 단위로 읽어
OOM 해소) 하나다. #233~#236 은 게이트 출력이 바이트 동일한 주석 중립 커밋이다. #237 은 기능 PR 규칙대로 주석이
늘어난 여덟 행(L 2 · D 5 · E 1)의 줄 수·지문을 실측으로 갱신하고 판정 축을 `—` 로 되돌렸다. 이 패스는 원장 운영
규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **#237 이 들인 증분만** 판정한다. 옛 판정 줄은 #237 이 고쳐 쓴
두 자리(아래) 말고는 그대로이고 그 판정 근거도 움직이지 않았다.

판정 모집단은 순증(L +6 · D +39 · E +1 = 46)이 아니라 **추가된 계수 50줄**(L 6 · D 43 · E 1)이다 — 게이트
`measure`→`by_file` 의 창 양 끝 multiset 차로 뽑았다. 옛 문면을 고쳐 쓴 자리 둘이 추가·삭제 쌍으로 잡힌다:
`aggregate.py` 의 Go `contributions` 미러 포인터(`bucket_articles` → `ArticlePicks` 로 이동, 줄바꿈이 달라짐) ·
`silver.py` `record_retries` 요약(주기 단위 의미로 다시 씀).

복원 경로 원본: ③ PR #237 제목·본문(리뷰·코멘트 0건) · ④ 스쿼시 `cef78d3` 본문(「배치는 주기 경계를 넘어 채움」
한 줄이 명제를 적는다) · ① 같은 PR 이 들인 `test_whole_lake_run_reads_only_cycles_not_yet_settled` ·
`test_a_cycle_holding_only_failing_retries_does_not_stop_the_run` · `test_partition_signature_changes_on_every_rewrite`.

## 결과 — 50줄 중 제거 16 · 유지 34

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `…/analysis/tests/test_cli.py` · L | 9 → 5 | 제거 4 |
| `…/econ_core/storage.py` · L | 9 → 9 | 유지 2 |
| `…/econ_aggregation/aggregate.py` · D | 20 → 20 | 유지 6 |
| `…/econ_analysis/cli.py` · D | 44 → 32 | 제거 12 · 유지 6(개작 1) |
| `…/econ_core/domain.py` · D | 11 → 11 | 유지 2 |
| `…/econ_core/silver.py` · D | 33 → 33 | 유지 15 |
| `…/econ_core/storage.py` · D | 24 → 24 | 유지 2 |
| `…/econ_core/domain.py` · E | 4 → 4 | 유지 1 |

`test_cli.py` L 행은 줄 수·지문이 **#237 이전 판정값과 바이트 동일하게** 돌아왔다(`5014e88e7230`). 비주석 코드는
docstring 노드를 뗀 `ast.dump` 가 base 와 같다(두 파일 SAME, 코드 토큰 1개 변경 프로브는 DIFF). ruff · pytest 통과.

## 제거 — 복원 경로가 선다

- **③ 경위 서사 + 테스트 이름 재진술** — `test_cli.py` 「The hourly run used to read the whole lake into memory and
  outgrew its limit; a settled cycle must now cost a stat, not a read.」 2줄. 앞 절은 PR 본문 「문제」 절(512Mi
  OOMKilled · 누적 실패 131회)이 더 자세히 소유하고, 뒤 절은 테스트 이름과 `read_partition` 스파이 단언
  `assert read == [NEXT_CYCLE]` 이 그대로 말한다(①).
- **다른 주석의 사본** — `test_cli.py` 「Cut at the cycle edge, the old cycle's batch would be its failing retry
  alone and the all-calls-failed guard would take it for an outage.」 2줄은 `_Analysis` docstring 의 배치 경계
  문단과 명제가 같다. 주인은 그 규칙을 어길 사람이 고치는 자리(`_Analysis`)로 두고 테스트 쪽 사본을 걷었다.
- **코드 재진술(비공개 docstring)** — `cli.py` 의 `_Tally`(필드가 곧 실행 집계) · `_Replies`(`load` 의 `loaded`
  가드가 지연 읽기를 말한다) · `_Cycle` · `flush` 요약 각 1줄, `visit` 2줄(`count_only` 키워드 이름과 호출부가
  말한다), `_sample_ids` 요약 1줄, `_Analysis` 요약 1줄.
- **다른 주석의 사본 · ①** — `_analyze` docstring 의 요약 1줄과 settled 건너뛰기 문단 4줄. settled 정의는 모듈
  docstring 문단이, 「다시 쓰인 파티션」 조건은 `silver.still_settled`·`read_settled` docstring 이 주인이고,
  「settled 주기는 읽지 않는다」는 `test_whole_lake_run_reads_only_cycles_not_yet_settled` 가 즉시 붉힌다.
  메모리 상한 1문장만 남겼다(아래 개작).

## 유지 목록 (필요 사유)

- `python/packages/core/src/econ_core/storage.py` — L: `partition_signature` 의 inode 2줄 — `write_partition` 이
  `os.replace` 로 떨어지기 때문에 크기·mtime 이 같아도 재작성이 서명을 바꾼다. `st_ino` 를 빼거나 제자리 쓰기로
  바꾸면 settled 표시가 다시 쓰인 주기를 **조용히** 건너뛴다(`test_partition_signature_changes_on_every_rewrite`
  는 mtime_ns 가 갈리는 한 초록이라 이 회귀를 확정적으로 잡지 못한다) / D: 추상 메서드 `partition_signature`·
  `iter_records` 요약 — doc 주석 수준.
- `python/packages/core/src/econ_core/domain.py` — D: `partition_cycle` 요약(`cycle_partition` 의 역) — doc 주석
  수준 / E: `DS_ANALYSIS_SETTLED` 의 `# not a contract` — 기존 세 줄과 같은 사유(이 데이터셋엔 `contracts/`
  스키마가 없어 형식 변경이 계약·코드젠 경로를 거치지 않는다).
- `python/packages/aggregation/src/econ_aggregation/aggregate.py` — D: `Pick`·`ArticlePicks`·`join`·
  `bucket_articles` 요약 — doc 주석 수준. `Pick` 의 「nothing more is kept」는 메모리 상한이 이 필드 집합에 기대고
  있다는 것을 같이 말한다. `ArticlePicks` 의 「최신 관측이 이긴다 · Go `contributions` 미러」 2줄은 옛 판정에서
  유지된 미러 포인터가 `bucket_articles` 에서 옮겨 온 것이다(한쪽만 고치면 두 언어의 기여 목록이 갈린다).
- `python/packages/core/src/econ_core/silver.py` — D: 공개 함수 요약(`pending_retry_cycles`·`record_retries`·
  `read_settled`·`still_settled`·`mark_settled`·`BronzeCycles`) — doc 주석 수준 · `BronzeCycles` 의 「드문 경로
  전용」 2줄(흔한 경로에서 쓰면 전체 Bronze 를 읽어 OOM 이 조용히 돌아온다 — 메모리 테스트 없음) ·
  `pending_retry_cycles` 의 옛 재시도 행 2줄(주기를 적지 않은 재시도는 첫 증분 실행이 채운다 — 비자명한 데이터 계약) ·
  `read_settled` 의 표시 성립 조건 2줄(두 서명이 모두 같을 때만).
- `python/packages/analysis/src/econ_analysis/cli.py` — D: `_Analysis` 의 배치 경계 3줄(배치가 주기 경계를 넘어
  채워지는 이유 — 주기마다 끊으면 알려진 실패 재시도만 든 배치를 전량 실패 가드가 장애로 읽는다) · `_sample_ids` 의
  후보 순서 2줄(전체 레이크 순서를 지켜야 같은 시드가 같은 레코드를 고른다 — 순서를 바꿔도 붉는 테스트가 없다) ·
  `_analyze` 의 메모리 상한 1줄(개작 — 레이크 전체를 읽는 경로를 들이면 OOM 이 조용히 돌아온다).

## 판단이 갈려 남긴 것

- `_Analysis` 배치 경계 3줄 — 이 규칙을 어기면 `test_a_cycle_holding_only_failing_retries_does_not_stop_the_run` 이
  붉으므로 prune-fresh-bronze-increment-pass 의 「즉시 붉음 ⇒ 가드 불요」 형에 가깝다. 다만 주기 단위 설계는 주기마다
  배치를 끊는 정리를 자연스럽게 부르고, 테스트 이름은 결과만 말해 「왜 경계를 넘는가」를 복원하지 못한다(④ 스쿼시
  본문도 사실만 적는다). 그래서 사본 둘 중 하나를 고치는 자리에 남겼다.
