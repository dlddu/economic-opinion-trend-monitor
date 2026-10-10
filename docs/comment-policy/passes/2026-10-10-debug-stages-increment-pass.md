# 2026-10-10 debug-stages-increment-pass — #244·#245 증분 44줄 판정

창 = `696d381`→`0e7c89c`. 주석을 움직인 커밋은 PR **#244**(`5d00dac`, `/api/debug` 단계별 시간 계측 — Server-Timing ·
stages 로그)와 **#245**(`0e7c89c`, llm_call 집계를 요청 밖 백그라운드로) 둘이다. 두 PR 은 기능 PR 규칙대로 주석이
늘어난 아홉 행(L 기존 4 — `debug.go`·`handlers.go`·`calltally.go`·`Debug.tsx` · L 신설 2 — `stages.go`·
`debug_probe_test.go` · E 기존 1 — `calltally.go` · E 신설 2 — `stages_test.go`·`calltally_test.go`)의 줄 수·지문을
실측으로 갱신하고 판정 칸을 `—` 로 두었다. D 표면은 창 양 끝에서 바이트 동일하다. 이 패스는 원장 운영 규칙
「증분만 판정했으면 그 결과를 적는다」에 따라 **두 PR 이 들인 증분만** 판정한다. 기존 행의 옛 판정 줄은 그대로이고
그 판정 근거도 움직이지 않았다.

판정 모집단은 두 PR 의 추가 계수 44줄(L 40 · E 4)이다 — 창에서 삭제된 주석 줄은 E `calltally.go` 의 `seen` 1줄뿐이고
같은 자리에 고쳐 쓴 줄로 돌아왔으므로(개작) 순증은 43줄이다.

복원 경로 원본: PR #244·#245 제목·본문 · 스쿼시 `5d00dac`·`0e7c89c` · 같은 PR 들이 들인 테스트
(`stages_test.go` `TestStageClockNamesTheStageAnAbortCut` · `TestStageClockStampsServerTiming` / `calltally_test.go`
`TestLlmCallTallyIsCompleteOnlyAfterAWholeRefresh` · `TestLlmCallTallyAnswersWhileARefreshIsReading` ·
`TestLlmCallTallySkipsARecordThatDoesNotDecode` / `Debug.test.tsx` 집계 중 화면 단언).

## 결과 — 44줄 중 제거 12 · 유지 30 · 개작 2

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/debug.go` · L | 8 → 8 | 유지 4 |
| `go/internal/handlers/debug_probe_test.go` · L | 4 → 2 | 제거 2 · 개작 2(4줄을 2줄로 다시 접음) |
| `go/internal/handlers/handlers.go` · L | 99 → 99 | 유지 2 |
| `go/internal/handlers/stages.go` · L | 11 → 6 | 제거 5 · 유지 6 |
| `go/internal/store/calltally.go` · L | 24 → 23 | 제거 1 · 유지 16(1줄 개작 — 절 하나를 걷고 다시 접음) |
| `web/src/screens/Debug.tsx` · L | 13 → 11 | 제거 2 |
| `go/internal/handlers/stages_test.go` · E | 1 → 0 | 제거 1 (행 삭제) |
| `go/internal/store/calltally.go` · E | 2 → 2 | 유지 2 |
| `go/internal/store/calltally_test.go` · E | 1 → 0 | 제거 1 (행 삭제) |

diff 는 주석 줄만 지우거나 다시 접는다(비주석 줄 변경 0 — E 두 줄은 줄 끝 주석만 걷었다).

## 제거

- **코드 재진술** — `stages.go` 의 `stageClock` doc 끝 「A nil clock is a no-op, so handlers called without the scan gate
  (unit tests) need no setup.」(빈 `//` 줄 포함 2줄): 메서드마다 첫 줄이 `if c == nil { return }` 이다. `enter` doc 1줄은
  바로 아래 세 줄(`c.close()` · `c.current = name` · `c.at = time.Now()`)이고, `timedWriter` doc 2줄은 바로 아래
  `WriteHeader`(`close` → `Server-Timing` 설정 → `enter("write")`)의 재진술이다 — 헤더 스탬프는
  `TestStageClockStampsServerTiming` 이 붉게 지킨다.
- **사용처 재진술** — `calltally.go` `tallyApplyEvery` doc 1줄: 사용처 `if len(batch) == tallyApplyEvery { apply() }` 와
  `count` doc 의 「applying every tallyApplyEvery reads」가 같은 말을 한다. 왜 나눠 적용하는가는 `count` doc 이 주인이다.
- **다른 자리의 재진술** — `calltally.go` `LlmCallTally` 둘째 문단의 「and readers ask Complete before trusting the
  counts」 절: `Complete` doc 둘째 줄(「Until it has, Run's counts are a part of the whole.」)이 호출자가 읽는 자리의
  정본이라 이쪽을 걷고 문단을 다시 접었다(줄 수 불변 · 개작).
- **프로브 절차 재진술** — `debug_probe_test.go` `TestProbeDebugStages` doc 의 순서 서술(첫 계수 전 요청 · 첫 계수 ·
  새것 없는 refresh · 계수 뒤 요청)과 「runs only when ECON_PROBE_ROOT names a lake」: 아래 `t.Logf("--- before the
  first count")` 등 라벨과 `t.Skip("ECON_PROBE_ROOT unset")` 이 말한다. 4줄을 2줄로 다시 접었다.
- **서버 계약의 재진술** — `Debug.tsx` `callsTallied` 위 2줄(서버가 배경에서 세고 첫 계수가 끝나기 전엔 호출 수를
  보내지 않는다 · 0 을 「호출 없음」으로 읽게 된다): 앞 절은 서버 `debugRunOf`·`LlmCallTally.Complete` doc 이 주인이고,
  뒤 절은 `Debug.test.tsx` 의 집계 중 픽스처(`calls: 0, calls_tallied: false`) 단언이 붉게 지킨다.
- **테스트 이름 재진술** — E `stages_test.go` `cancel() // the proxy gives up while the tally is still reading` 은
  `TestStageClockNamesTheStageAnAbortCut` 과 `outcome=aborted at=tally` 단언이, E `calltally_test.go`
  `tally.refresh.Lock() // a refresh in the middle of its reads` 는 `TestLlmCallTallyAnswersWhileARefreshIsReading` 이 말한다.

## 유지 목록 (필요 사유)

- `go/internal/handlers/debug.go` — `KeepCallTally` doc 둘째 문장(첫 줄은 doc 주석 수준): 스캔 게이트 밖에서 도는 이유는
  llm_call 을 게이트 요청이 통째로 읽지 않기 때문이다 — 게이트에 넣으면 16분 첫 계수 동안 모든 디버그 요청이 그 뒤에
  줄 선다(테스트 없음) / `took > 30*time.Second` 로그 조건 위 1줄: 파일이 사라진 뒤의 재계수는 분 단위인데 합계가
  그대로일 수 있어 `read != 0` 만으로는 그 비용이 로그에서 사라진다 / `debugRunOf` 의 「집계는 KeepCallTally 가 세고
  여기서는 세지 않는다」 1줄: 요청 경로의 첫 계수가 #245 가 고친 `/api/debug` 30초 초과의 원인이고, `Refresh` 를 이
  자리로 되돌리는 「단순화」를 막는 테스트가 없다.
- `go/internal/handlers/debug_probe_test.go` — 개작 2줄: 이 테스트는 갓 뜬 serving 파드가 만나는 순서로 실제 레이크를
  재고 아무것도 단언하지 않는다(로그가 산출물). 지우면 단언 없는 테스트를 군더더기로 걷거나 실레이크에 기대는 단언을
  덧붙이는 판단을 부른다.
- `go/internal/handlers/handlers.go` — `oneScanAtATime` 의 시계를 게이트 대기 **전에** 켜는 이유 2줄: 다른 스캔 뒤에 줄 선
  선택은 자기 스캔이 시작되기 전에 프록시 예산을 쓰므로 대기도 호출자가 겪는 시간이다 — 시계를 게이트 뒤로 옮기면
  `gate` 단계가 조용히 사라진다.
- `go/internal/handlers/stages.go` — `stageClock` doc 4줄: Server-Timing 에 더해 클라이언트가 떠난 요청에도 로그 한 줄을
  남기고 그 줄이 끊긴 단계를 이름으로 적는 이유(프록시 타임아웃으로 끊긴 요청은 그것이 없으면 어디서 멈췄는지가
  비어 있다) — 이 장치가 왜 있는지를 말하는 유일한 자리다 / `note` doc 2줄: 같은 20초도 2천 파일과 20만 파일에서 뜻이
  갈리므로 계수 노트가 느린 단계를 이유로 바꾼다 — 노트를 소음으로 걷는 판단을 막는다(노트 단언 테스트 없음).
- `go/internal/store/calltally.go` · L — export doc 1줄 `Complete`·`Counted`·`Skipped` — doc 주석 수준(`Complete` 둘째 줄은
  완료 전 `Run` 값이 부분합이라는 호출자 계약) / `LlmCallTally` 둘째 문단 4줄(빈 `//` 포함, 개작): 첫 계수 실측(prod EFS 에서
  232k 파일 하나씩 16분)이 Refresh 를 요청 경로 밖에 두는 근거이고, 병렬로 읽고 `mu` 는 적용할 때만 잡는다는 것이 읽기가
  계수 중에도 막히지 않는 이유다 / `tallyReaders` 둘째 문장: 읽기 하나가 EFS 왕복 하나라 속도는 CPU 가 아니라 왕복 겹침이
  정한다 — CPU 수로 「맞추면」 조용히 느려진다 / 사라진 파일 뒤 재계수를 옆에 세고 바꾸는 이유 2줄: `byRun` 에서 센 값을
  뺄 길이 없고, 바꿔 끼워야 읽기가 새 값이 온전해질 때까지 옛 값을 본다 / `count` doc 2줄: `tallyApplyEvery` 건마다 적용해야
  취소된 계수가 읽은 만큼 남고 다음 refresh 가 이어 센다 — 기존 취소 테스트는 읽기 **전** 취소만 보므로 끝에 한 번 적용하게
  고쳐도 붉지 않다 / 디코드 안 되는 레코드를 건너뛰는 이유 2줄: 레코드는 통째로 링크되므로 안 풀리는 것은 영영 안
  풀린다(쓰는 쪽의 계약) — 실패로 바꾸면 집계가 영영 완료되지 않는다.
- `go/internal/store/calltally.go` · E — `refresh` 뮤텍스 「one Refresh at a time; the only writer of callPartition.seen」:
  `refreshPartition` 이 `mu` 없이 `seen` 을 이진 탐색해도 되는 근거 — 다른 작성자를 들이면 경합이 조용히 생긴다 /
  `seen` 「sorted between refreshes」(개작): `slices.BinarySearch` 가 기대는 불변식과, 계수 도중에는 정렬돼 있지 않다는 경계.

## 판단이 갈려 남긴 것

- `calltally.go` `count` doc 2줄 — debug-latency-increment-pass 는 `Refresh` doc 의 「취소 뒤 이어 세기」를 같은 이름의
  테스트가 지킨다며 걷었다. 이번 문장은 같은 성질의 **구현 근거**(왜 나눠 적용하는가)이고, 그 테스트
  (`TestLlmCallTallyResumesAfterACancelledRefreshWithoutDoubleCounting`)는 취소된 컨텍스트로 시작해 읽기 전에 멈추므로
  적용 시점을 끝으로 미루는 변경을 잡지 못한다 — 「테스트가 없는 무음 파손만 남긴다」 방향에 따라 남겼다.
- `stages.go` `stageClock` doc 4줄 — 두 테스트가 동작(헤더 · 끊긴 단계 이름)을 지키지만 「왜 클라이언트가 떠난 요청도
  로그를 남기는가」는 복원하지 못한다. 동작 서술 부분은 그 이유와 한 문장으로 묶여 있어 통째로 남겼다.
