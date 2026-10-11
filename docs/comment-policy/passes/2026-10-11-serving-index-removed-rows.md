# 2026-10-11 serving-index-removed-rows — 서빙 인덱스 PR 이 지운 파일의 원장 행

서빙 인덱스 PR(디버그 화면 API 를 배치가 만드는 SQLite 인덱스로 옮긴 PR)이 llm_call 백그라운드 집계와 두 메모리
프로브를 걷어내며 아래 파일이 사라졌다: `go/internal/store/calltally.go` · `go/internal/store/calltally_test.go` ·
`go/internal/handlers/debug_probe_test.go` · `go/internal/handlers/startup_memprobe_test.go`. 원장 규칙(「행은 있으나
판정 대상 주석이 없는 파일 — 행을 지우고 이력은 passes/ 에 남긴다」)대로 그 행을 원장에서 지우고, 지우기 직전의 행을
여기 그대로 옮긴다. 이 PR 이 새로 들이거나 고친 주석의 행은 원장에 `—` 로 남아 다음 판정 슬라이스가 가져간다.

## 지운 행 — L 표면

| 판정일 | 범위 | 현재 주석 줄 수 | 지문 | 판정 | 결과 |
|---|---|---:|---|---|---|
| 2026-10-10 | `go/internal/handlers/debug_probe_test.go` | 2 | `ed4976402b2b` | 완료 | (판정 전 4 · 제거 2) **debug-stages-increment-pass — #244·#245 증분 판정.** 신설 4: 개작 2 · 제거 2 — 프로브 순서 서술(첫 계수 전·첫 계수·빈 refresh·계수 뒤)은 바로 아래 `t.Logf` 라벨이, `ECON_PROBE_ROOT` 조건은 `t.Skip` 이 말하므로 걷고, 「갓 뜬 serving 파드가 만나는 방식으로 재고 아무것도 단언하지 않는다 — 로그가 산출물」만 남겼다(단언 없는 테스트를 군더더기로 지우거나 단언을 덧붙이는 판단을 막는다). [2026-10-10-debug-stages-increment-pass](2026-10-10-debug-stages-increment-pass.md) |
| 2026-10-11 | `go/internal/handlers/startup_memprobe_test.go` | 4 | `187985c18ffd` | — | (판정 전 4) **serving OOM 수정 PR — 미판정.** 이 PR 이 들인 주석의 필요성 판정은 다음 판정 슬라이스가 가져간다. |
| 2026-10-10 | `go/internal/store/calltally.go` | 29 | `cf7f42f73982` | — | **serving OOM 수정 PR — 미판정.** 이 PR 이 들인 주석의 필요성 판정은 다음 판정 슬라이스가 가져간다. 옛 판정: (판정 전 24 · 제거 1) **debug-stages-increment-pass — #244·#245 증분 판정.** 증분 17: 유지 15 · 제거 1 · 개작 1 — `LlmCallTally` 둘째 문단(첫 계수 실측 232k 파일 16분 → Refresh 는 요청 경로 밖, 읽기는 병렬·`mu` 는 적용 때만; 「Complete 를 물어라」 절은 `Complete` doc 이 주인이라 걷어 다시 접음) · `tallyReaders` 둘째 문장(EFS 왕복 겹침이 속도를 정한다 — CPU 수로 「맞추면」 조용히 느려진다) · 재계수를 옆에 세고 바꾸는 이유 2줄 · `count` doc 2줄(1024 건마다 적용해야 취소된 계수가 읽은 만큼 남는다 — 기존 취소 테스트는 읽기 전 취소만 본다) · 디코드 안 되는 레코드를 건너뛰는 이유 2줄(레코드는 통째로 링크되므로 안 풀리는 것은 영영 안 풀린다 — 다른 구성요소의 계약) · export doc 1줄 `Complete`·`Counted`·`Skipped`(doc 주석 수준 — `Complete` 둘째 줄은 완료 전 `Run` 값이 부분합이라는 호출자 계약). 제거: `tallyApplyEvery` doc 1줄(사용처와 `count` doc 재진술). 옛 판정 유지분 7 그대로. [2026-10-10-debug-stages-increment-pass](2026-10-10-debug-stages-increment-pass.md) |
| 2026-10-09 | `go/internal/store/calltally_test.go` | 1 | `9a6dddccc2fd` | 완료 | (판정 전 1 · 제거 0) **debug-latency-increment-pass — #241 증분 판정.** 신설 1: 유지 1 — 센 파일을 깨뜨리는 이유(다시 읽으면 실패하거나 집계가 바뀌므로 「다시 읽지 않는다」의 관측 수단) — 테스트가 왜 그 모양인지. [2026-10-09-debug-latency-increment-pass](2026-10-09-debug-latency-increment-pass.md) |

## 지운 행 — E 표면

| 판정일 | 범위 | 현재 주석 줄 수 | 지문 | 판정 | 결과 |
|---|---|---:|---|---|---|
| 2026-10-10 | `go/internal/store/calltally.go` | 2 | `5887a9b3bc02` | 완료 | (판정 전 2 · 제거 0) **debug-stages-increment-pass — #244·#245 증분 판정.** 증분 2: 유지 2 — `refresh` 뮤텍스 「한 번에 하나, `seen` 의 유일한 작성자」(`refreshPartition` 이 `mu` 없이 `seen` 을 이진 탐색하는 근거 — 다른 작성자를 들이면 경합이 조용히 생긴다) · `seen` 「refresh 사이에 정렬」(개작 — `slices.BinarySearch` 불변식, 계수 중에는 정렬돼 있지 않다는 경계까지). [2026-10-10-debug-stages-increment-pass](2026-10-10-debug-stages-increment-pass.md) |
