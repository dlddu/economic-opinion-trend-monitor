# 2026-10-09 debug-latency-increment-pass — #241 증분 20줄 판정

창 = `496c05a`→`d0e1243`. 주석을 움직인 커밋은 PR **#241**(`d0e1243`, 판단 디버깅 화면 지연과 레코드 선택 무반응 해소)
하나다. #241 은 기능 PR 규칙대로 주석이 늘어난 일곱 행(L 기존 3 · L 신설 3 — `debug_input.go`·`calltally.go`·
`calltally_test.go` · E 신설 1 — `calltally.go`)의 줄 수·지문을 실측으로 갱신하고 판정 칸을 `—` 로 두었다. D 표면은
창 양 끝에서 바이트 동일하다. 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **#241 이 들인
증분만** 판정한다. 기존 세 행(`client.ts`·`Debug.tsx`·`Debug.test.tsx`)의 옛 판정 줄은 그대로이고 그 판정 근거도
움직이지 않았다.

판정 모집단은 #241 의 추가 계수 20줄(L 19 · E 1)이다 — 창에서 삭제된 주석 줄은 0 이라 순증과 같다.

복원 경로 원본: PR #241 제목·본문 · 스쿼시 `d0e1243` · 같은 PR 이 들인 `calltally_test.go`
(`TestLlmCallTallyRecountsAPartitionThatLostAFile` · `TestLlmCallTallyResumesAfterACancelledRefreshWithoutDoubleCounting`) ·
`debug_input_test.go`(`TestDebugInputFollowsTheBronzeURLWhenSilverCarriesAnother`).

## 결과 — 20줄 중 제거 4 · 유지 16

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/debug_input.go` · L | 4 → 3 | 제거 1 · 유지 3(개작) |
| `go/internal/store/calltally.go` · L | 9 → 7 | 제거 2 · 유지 7 |
| `go/internal/store/calltally.go` · E | 1 → 1 | 유지 1 |
| `go/internal/store/calltally_test.go` · L | 1 → 1 | 유지 1 |
| `web/src/api/client.ts` · L | 11 → 10 | 제거 1 |
| `web/src/screens/Debug.test.tsx` · L | 3 → 3 | 유지 1 |
| `web/src/screens/Debug.tsx` · L | 11 → 11 | 유지 3 |

diff 는 주석 줄만 지우거나 다시 접는다(비주석 줄 변경 0).

## 제거

- **코드 재진술** — `debug_input.go` `debugInputOf` 첫 문장 「finds the record's collection observation and every
  observation of the same article」. 함수 이름과 바로 아래 두 `EachNewsItem` 콜백이 말한다. 같은 문단의 `urlHint`
  사유는 그 자체로 서므로 문단을 그 문장부터 다시 접었다(4 → 3줄).
- **테스트 이름 재진술** — `calltally.go` `Refresh` doc 둘째·셋째 문장 2줄(「파일을 잃은 파티션은 처음부터 다시 센다」·
  「취소된 refresh 는 센 만큼 남겨 다음이 이어 센다」). 같은 PR 의 `TestLlmCallTallyRecountsAPartitionThatLostAFile` ·
  `TestLlmCallTallyResumesAfterACancelledRefreshWithoutDoubleCounting` 가 같은 문장을 이름으로 말하고, 어기면 붉다.
  첫 줄은 doc 주석 수준이라 남는다.
- **다른 주석의 재진술** — `client.ts` `getJSON` 위 「A signal lets a screen drop a request …; the server stops the scan
  behind it.」 1줄. 인자 타입 `AbortSignal` 이 앞 절을 말하고, 끊어야 하는 **이유**(서버가 스캔을 멈추고 새 선택이 그
  뒤에 줄 서지 않는다)는 끊는 자리인 `Debug.tsx` 레코드 선택 주석이 주인이다.

## 유지 목록 (필요 사유)

- `go/internal/handlers/debug_input.go` — `urlHint` 3줄(개작): Silver 가 실은 출처 URL 덕에 Bronze 한 번의 패스가
  레코드와 같은 기사의 관측을 함께 모으고, 레코드 자신의 URL 이 갈릴 때만 두 번째 패스를 치른다. 지우면 두 패스로
  「단순화」해 디버그 화면 한 번에 Bronze 전량 스캔이 조용히 곱절이 된다(비용 테스트 없음).
- `go/internal/store/calltally.go` · L — export doc 1줄 4(`LlmCallTally`·`NewLlmCallTally`·`Refresh`·`Run`) — doc 주석
  수준 / `LlmCallTally` 본문 3줄: 파일을 한 번만 읽어도 되는 근거는 llm_call 객체가 한 번 쓰인다는 **다른 구성요소의
  계약**(`put_object` 가 저장된 키를 거절)이라 코드에서 보이지 않는다 — 그 계약이 바뀌면 집계가 조용히 낡는다 /
  레코드 대신 8바이트 이름 해시만 드는 이유(서빙 파드 메모리가 작고 호출이 수십만 건) — 레코드를 들고 가게 고치면
  OOM 이 조용히 돌아온다(메모리 테스트 없음).
- `go/internal/store/calltally.go` · E — `seen` 「sorted」: `slices.BinarySearch` 가 기대는 불변식. 정렬 없이 덧붙이면
  이미 센 파일을 조용히 다시 센다.
- `go/internal/store/calltally_test.go` — 센 파일을 깨진 JSON 으로 덮는 이유 1줄: 다시 읽으면 실패하거나 집계가
  바뀌므로 그것이 「다시 읽지 않는다」의 관측 수단이다 — 테스트가 왜 그 모양인지.
- `web/src/screens/Debug.test.tsx` — `stubSlowDetail` 1줄: r-1 밖의 상세는 영영 응답하지 않는다(로딩 중 화면을
  관측하기 위해). 이름의 「slow」는 「언젠가 온다」로 읽혀, 응답을 붙이는 「정리」가 단언을 공허하게 만든다.
- `web/src/screens/Debug.tsx` — `listReload` 1줄: 조건이 그대로인 「찾기」는 URL 이 안 바뀌어 목록 effect 가 다시
  돌지 않으므로 일부러 올리는 카운터다 — 지우면 군더더기로 보고 걷는다 / 레코드 선택의 `AbortController` 2줄: 앞
  요청을 끊어야 서버가 스캔을 멈추고 새 선택이 그 뒤에 줄 서지 않는다(서버의 한 번에 하나 스캔 `lakeScan` 과 맞물림).

## 판단이 갈려 남긴 것

- `calltally.go` `Refresh` 2줄 — export 메서드의 동작 계약이라 호출자 쪽 문서로 읽힐 수 있다. 다만 호출자는 같은
  패키지 밖 하나(`handlers`)이고 두 문장 모두 같은 이름의 테스트가 붉게 지키므로 batch-cycle-streaming-increment-pass
  의 「테스트가 없는 무음 파손만 남긴다」 방향을 따라 걷었다.
