# 2026-09-28 prune-fresh-bronze-increment-pass — #214 증분 5줄 판정

창 = `b59284e`→`5fb7477`. 주석을 움직인 커밋은 PR **#214**(`9b0f45f`, 사람 PR — 정리 단계가 실행 중 수집된
주기의 Silver 를 고아로 지우던 문제) 하나다. #213(`55aba68`)·#215(`5fb7477`)는 게이트 출력이 바이트 동일한
주석 중립 커밋이다. #214 는 기능 PR 규칙대로 주석이 늘어난 두 행(L)의 줄 수·지문을 실측으로 갱신하고 판정 축을
`—` 로 되돌렸다. 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **#214 가 들인
증분만** 네 경로로 판정한다. 옛 판정 줄은 #214 가 한 줄도 고치지 않았다.

판정 모집단은 추가된 L 계수 5줄이다(순증과 같다). 옛 문면을 고쳐 쓴 자리는 없다.

복원 경로 원본: ③ PR #214 제목·본문(리뷰·코멘트 0건) · ④ 스쿼시 `9b0f45f`(본문은 `Co-authored-by:` 뿐이라
제목으로만 히트) · ① 같은 PR 이 들인 `test_cycle_collected_during_a_run_is_not_pruned_as_orphan`.

## 결과 — 5줄 중 제거 5 · 유지 0

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `…/econ_analysis/cli.py` · L | 9 → 7 | 제거 2 |
| `…/analysis/tests/test_cli.py` · L | 8 → 5 | 제거 3 |

두 행 모두 줄 수·지문이 **#214 이전 판정값과 바이트 동일하게** 돌아왔다(`564b08c170c4` · `5014e88e7230`).
비주석 diff 는 0줄이다.

## 제거 — 복원 경로가 선다

- **③ + 즉시 붉음: 정리 직전 Bronze 재독 이유** — `cli.py` 「Bronze read again, not the snapshot taken at start:
  a run that outlives the hour would otherwise see the cycle collected meanwhile as orphans and drop its Silver.」
  2줄은 PR 본문 「수정」 절 「정리 직전에 Bronze 를 다시 읽어 그 주기 목록으로 `prune_orphans` 를 돈다. 실행 도중
  들어온 주기는 더 이상 고아가 아니다」와 명제가 같다. 이 줄은 편집 지점 가드 후보였다(두 번째 Bronze 읽기를
  시작 스냅숏으로 합치는 정리를 막는 자리). 그래서 README 판정 절차 2 의 판별식 「어기면 조용히 깨지는가」로 쟀다.
  `prune_orphans(store, fresh)` 를 `prune_orphans(store, cycles)` 로 되돌리는 프로브를 돌리자
  `test_cycle_collected_during_a_run_is_not_pruned_as_orphan` 이 **즉시 붉었다**
  (`assert ('r3', 'fake-v1') in kept` 실패, 되돌린 뒤 전건 통과). 무음 파손이 없으므로 가드로 남길 이유가 없다.
  service-dedup-increment-pass 가 `bodyShares` 머리를 걷은 것과 같은 형이다.
- **③ 경위 서사: 운영 사고** — `test_cli.py` 「A reprocess outlived the hour in production: the hourly pipeline
  collected and analyzed the next cycle meanwhile, and the reprocess's closing prune, working from the Bronze it
  read at start, deleted that cycle's Silver (2026-09-28).」 3줄은 PR 본문 「운영 사례 (2026-09-28)」 절이
  재처리 실행 이름·시각·`pruned=504`·주기별 건수까지 더 자세히 소유한다. 테스트가 무엇을 재현하는지는 테스트 이름과
  바로 아래 `analyze_while_the_hour_turns` 가 복원한다(①).

## 판단이 갈려 남긴 것

없음.
