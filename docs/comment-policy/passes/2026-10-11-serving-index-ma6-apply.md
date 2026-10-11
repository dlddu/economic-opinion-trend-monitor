# 2026-10-11 serving-index-ma6-apply — #250·#253 이 이월한 MA6 경로 판정의 적용

[serving-index-increment-pass](2026-10-11-serving-index-increment-pass.md)(PR #250)는 #247·#248 증분 129줄을 전부
판정했지만 `go/internal/servingindex/**`·`go/cmd/econ-index/**` 의 72줄(L 70 · E 2 — 7행)은 리뷰 게이트 판정기의
**MA6**(그 두 경로는 주석만 바꿔도 `format_changed=true`) 때문에 소스 적용을 이월했다. 이 패스는 **새로 판정하지
않는다** — 그 패스의 「적용 이월」 표와 「제거」·「유지 — 사유」 절에 적힌 판정을 그대로 소스에 옮기고, 7행을 `완료` 로
올리며 0줄이 된 E 행 하나를 지운다. 유지 사유는 그 패스 문서에 있다.

같은 경로에 #252 가 들인 증분은 [serving-index-screens-increment-pass](2026-10-11-serving-index-screens-increment-pass.md)
(PR #253)가 판정하고 같은 사유로 적용을 이월했다(`functions.go` 11줄 · `derive.sql` 증분 3줄). 그 패스의 「적용 이월」 절이
지정한 대로 여기서 함께 적용한다 — 역시 새 판정은 없다. 사람 승인은 한 번이다.

## 적용 — 제거 19 · 개작 2

| 파일 · 표면 | 전 → 후 | 적용 |
|---|---|---|
| `go/cmd/econ-index/main.go` · L | 2 → 2 | 개작 1 — 패키지 주석에서 「배치가 Bronze·Silver 를 쓰는 단계마다 돌린다」 절을 걷었다(틀린 주석 — 템플릿은 `onExit: index` 로 워크플로당 한 번 돈다) |
| `go/internal/servingindex/build.go` · L | 26 → 22 | 제거 4 — `loadCalls` 2 · `reuse` 2 (판정 전 27 중 `lower()` 1줄은 #252 가 `functions.go` 로 옮겼다) |
| `go/internal/servingindex/build_test.go` · L | 3 → 2 | 제거 1 — `CallsReused != 0 \|\| CallsRead != 3` 단정 위 1줄 |
| `go/internal/servingindex/derive.sql` · L | 10 → 6 | 제거 4 — 파일 머리 1 · `record_latest` 2 · `run_call` 1 (#252 증분 3줄 `body_share` 머리는 #253 판정대로 유지) |
| `go/internal/servingindex/functions.go` · L | 11 → 10 | 제거 1 — `rfc3339_at_or_after` 의 「비교는 Go 에 남는다: 2262년 이후 연도…」(#253 판정 — 테스트가 붉게 지킨다) |
| `go/internal/servingindex/publish.go` · L | 12 → 6 | 제거 6 · 개작 1 — `publish` 첫 줄 · 교체된 인덱스 mtime 2 · `sweep` 첫 문장(남은 「자기 이름만 지운다」를 한 줄로 다시 접음) · `readPointer` 1 · `readOnlyURI` 상대 경로 1 |
| `go/internal/servingindex/reader.go` · L | 19 → 18 | 제거 1 — `miss` |
| `go/internal/servingindex/build_test.go` · E | 2 → 0 | 제거 2 — 시계 상태 줄 끝 주석 2(행 삭제, 아래) |

diff 는 주석 줄을 지우거나 다시 접을 뿐이다. 비주석 줄 변경은 `build_test.go` 의 두 줄에서 줄 끝 주석만 떨어진 것과
`derive.sql` 머리 주석 뒤 빈 줄 하나뿐이고, Go·SQL 토큰은 바뀌지 않는다. `SchemaVersion` 은 올리지 않는다 — 질의가
알아챌 변경이 아니다(주석과 빈 줄만 빠졌다).

## 지운 행 — E 표면

원장 규칙(「행은 있으나 판정 대상 주석이 없는 파일 — 행을 지우고 이력은 passes/ 에 남긴다」)대로 지우기 직전의 행을
옮긴다.

| 판정일 | 범위 | 현재 주석 줄 수 | 지문 | 판정 | 결과 |
|---|---|---:|---|---|---|
| 2026-10-11 | `go/internal/servingindex/build_test.go` | 2 | `b6d53dd83c8a` | — | (판정 전 2) **serving-index-increment-pass — #247·#248 증분 판정 완료 · 적용 이월(MA6 사람 게이트).** 신설 2: 제거 2 — 시계 상태 주석(바로 위 `clock.Add(90 * time.Minute)` 와 `Grace: time.Hour` 의 재진술). 적용되면 행 삭제. 제거·개작은 아직 적용하지 않았다 — `go/internal/servingindex/**`·`go/cmd/econ-index/**` 는 주석만 바꿔도 `check-data-format-change.py` MA6 이 `format_changed=true` 를 내 수동 승인 뒤에만 머지된다. 이 판정대로 적용하는 수동 승인 슬라이스가 행을 `완료` 로 올린다. [2026-10-11-serving-index-increment-pass](2026-10-11-serving-index-increment-pass.md) |
