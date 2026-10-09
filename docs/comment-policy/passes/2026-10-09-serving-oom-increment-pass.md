# 2026-10-09 serving-oom-increment-pass — #238 증분 26줄 판정

창 = `68b0874`→`0050c4f`. 주석을 움직인 커밋은 PR **#238**(`0050c4f`, serving 레이크 전량 로드 제거) 하나다.
#238 은 기능 PR 규칙대로 주석이 늘어난 L 표면 여섯 행(기존 4 · 신설 2 — `debug.go`·`debug_records.go`)의 줄 수·지문을
실측으로 갱신하고 판정 칸을 `—` 로 두었다. D·E 표면은 창 양 끝에서 바이트 동일하다. 이 패스는 원장 운영 규칙
「증분만 판정했으면 그 결과를 적는다」에 따라 **#238 이 들인 증분만** 판정한다. 옛 판정 줄은 그대로이고 그 판정
근거도 움직이지 않았다.

판정 모집단은 순증(+23)이 아니라 **추가된 계수 26줄**이다 — 옛 문면을 고쳐 쓴 자리 셋이 추가·삭제 쌍으로 잡힌다:
`contributions.go` 의 `bodyShares` 줄(→ `add` 로 옮겨 감) · `store.go` 의 `readObjects`/`readPartitions` 미러 포인터
(→ 스트리밍 `eachObjects`/`eachPartitions` 로 개명).

복원 경로 원본: PR #238 제목·본문 · 스쿼시 `0050c4f` 본문(제목 한 줄) · 같은 PR 이 들인
`lake_scan_test.go`(`TestLakeScanRoutesQueueOneAtATimeAndDropCallersWhoLeave` ·
`TestLakeScanRoutesWriteNothingForACallerWhoLeft`) · `store_test.go`(`TestEachAnalysisStopsEarlyAndHonorsCancellation` ·
`TestLlmCallHeadsReadByKeyAndInKeyOrder`).

## 결과 — 26줄 중 제거 3 · 유지 23

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/contributions.go` · L | 32 → 31 | 제거 1 · 유지 3(개작 1) |
| `go/internal/handlers/dashboard.go` · L | 17 → 17 | 유지 2 |
| `go/internal/handlers/debug.go` · L | 4 → 4 | 유지 4 |
| `go/internal/handlers/debug_records.go` · L | 4 → 2 | 제거 2 · 유지 2 |
| `go/internal/handlers/handlers.go` · L | 97 → 97 | 유지 2 |
| `go/internal/store/store.go` · L | 39 → 39 | 유지 10 |

diff 는 주석 줄만 지운다(비주석 줄 변경 0). `gofmt -l` 무출력 · `go vet ./...` · `go test ./...` 통과.

## 제거

- **작업 흔적(경위)** — `contributions.go` `byID` 문단 끝 「as the unfiltered map did」 1줄. 이 PR 이전 코드(거르지
  않던 맵)를 가리키는 비교라 지금 코드를 고치러 온 사람의 판단에 쓰이지 않는다. 앞 두 줄(마지막 관측 우선)은 그 자체로
  사유가 서므로 문장을 닫아 개작했다.
- **코드 재진술** — `debug_records.go` 「Only a call_outcome symptom reads the call record to filter; otherwise calls
  are read for the shown rows alone.」 2줄. 바로 아래 `byCall := strings.HasPrefix(symptom, "call_outcome:")` 와 그
  분기가 말한다. 호출 기록을 한 건씩만 읽는 **이유**(본문이 Silver 크기의 대부분)는 `callLookup` doc 이 주인이다.

## 유지 목록 (필요 사유)

- `go/internal/handlers/contributions.go` — `byID` 2줄(개작): 범위 밖 관측을 만나면 `delete` 하는 이유 — 같은 record id
  가 나중에 다시 관측되면 걸렀든 아니든 앞선 관측을 대체해야 마지막 관측 우선이 지켜진다. `delete` 를 「불필요한 정리」로
  빼면 범위 밖으로 옮겨 간 기사가 옛 관측으로 **조용히** 남는다 / `add` 1줄: 빈 본문 해시는 「본문 미보관」이지 모두가
  공유하는 본문이 아니다 — 옛 판정에서 `bodyShares` 줄로 유지된 사유가 그대로 옮겨 왔다.
- `go/internal/handlers/dashboard.go` — 다른 축 행은 앵커만 올리므로 누적 최댓값을 올리는 행만 남겨도 앵커가 같다는
  동등성 2줄. 필터가 왜 다른 축 행을 대부분 버려도 되는지 말하지 않으면, 고치는 사람이 그 행을 다른 용도로 쓰거나
  조건을 바꿔 앵커를 조용히 옮긴다.
- `go/internal/handlers/debug.go` — `runTally` 2줄: run 별로 집계를 들고 가는 이유(Silver 한 번의 패스가 레코드도 찾고
  고른 run 의 집계도 낸다 — 두 번째 전량 스캔을 들이지 않기 위해) / `callLookup` 2줄: 호출 기록을 한 건씩만 메모리에
  두는 이유(프롬프트·응답 본문이 Silver 크기의 대부분 — 전량 적재로 되돌리면 OOM 이 조용히 돌아온다, 메모리 테스트 없음).
- `go/internal/handlers/debug_records.go` — `callHeadByID` 2줄: 헤드만 읽어도 되는 조건(목록 행은 결과만 보이고 프롬프트·
  응답은 보이지 않는다). 목록 행에 본문 파생 칸을 더하는 사람이 이 조회의 한계를 알게 한다.
- `go/internal/handlers/handlers.go` — `lakeScan` 2줄: 전량 스캔을 한 번에 하나만 들이는 이유(화면의 병렬 요청·재전송이
  겹친 스캔이 파드 OOM 원인).
- `go/internal/store/store.go` — export doc 1줄 7(`ErrStop`·`SubjectSourceContributionsWhere`·`EachNewsItem`·
  `EachAnalysis`·`LlmCallHead`·`LlmCallHeadOf`·`EachLlmCallHead`) — doc 주석 수준 / `LlmCallHead` 둘째 줄: 헤드만
  디코드하면 본문(레코드의 대부분)이 할당되지 않는다 — 필드를 더할 때 메모리 상한이 이 타입에 기댄다는 것을 알린다 /
  `eachObjects`·`eachPartitions` 2줄: Python `LakeStore.read_objects`·`read_partitions` 대응 지목 — 옛 판정의 미러
  포인터가 스트리밍 개명과 함께 옮겨 온 것(한쪽만 고치면 두 언어의 레이크 읽기가 갈린다).

## 판단이 갈려 남긴 것

- `handlers.go` `lakeScan` 2줄 — 용량을 바꾸면 `TestLakeScanRoutesQueueOneAtATimeAndDropCallersWhoLeave` 가 붉으므로
  「즉시 붉음 ⇒ 가드 불요」 형에 가깝다. 다만 테스트 이름은 결과(하나씩 줄 세운다)만 말하고 「왜 하나인가」(겹친 스캔이
  OOM 원인)를 복원하지 못해, 테스트를 「동시성 제한이 과하다」며 함께 고치는 판단을 막지 못한다. batch-cycle-streaming-
  increment-pass 의 `_Analysis` 배치 경계 3줄과 같은 형으로 남겼다.
