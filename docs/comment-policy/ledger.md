# 주석 판정 원장

정책 본문은 [`README.md`](README.md), 판정별 근거는 [`passes/`](passes/)에 있다. 이 원장은 **파일 단위**로
판정 전·후 주석 줄 수와 남은 주석의 성격을 적는다. 줄 수는 정책의 추출 규칙(범위·제외 경로·주석 시작 패턴·
기계 판독 주석 제외)으로 센 값이다.

## 읽는 법

- **판정 전** — 해당 패스를 시작한 시점의 주석 줄 수. **제거** — 그 패스가 지운 줄 수. **남음** — 판정 후 줄 수.
- 남음이 0이면 그 파일은 이후 지문에서 빠진다.
- 비고의 "판단 분기"는 애매해서 남긴 것 — 근거는 해당 패스 문서의 「판단이 갈려 남긴 것」.
- 새 주석이 생기면 이 원장의 행은 바뀌지 않는다. 다음 패스가 그 파일을 다시 판정하며 행을 갱신한다.
- 그래서 **행이 있는 파일도 미판정 주석을 가질 수 있다**. 행의 「남음」은 판정 시점 값이고, 그 뒤 자란
  줄은 어느 행에도 잡히지 않는다. 말미 요약의 잔여는 그 둘을 **함께** 센다 — ⑴ 행이 없는 파일의 전량과
  ⑵ 행이 있으나 현재 줄 수가 「남음」을 넘는 파일의 **증가분**. ⑴만 세면 남은 일이 과소 진술되고, 원장만
  읽는 다음 패스는 ⑵에 영영 도달하지 못한다(2026-09-20 `7386301` 실측: ⑴만 세면 540줄, 둘을 합치면 867줄).
- 각 행은 그 파일을 **마지막으로 판정한 패스** 기준이며, initial-pass가 아니면 판정 칸 머리에 패스 이름을 적는다.
- 「패스 이력」의 줄 수는 **레포 전체 지문** 값이다. 표적 패스(일부 파일만 재판정)가 실제로 어떤 파일을
  판정했는지는 그 패스 문서에 있다 — 판정하지 않은 파일은 이 원장에 행을 만들지 않는다.

## 패스 이력

| 판정일 | 패스 | 기준 커밋 | 판정 전 | 제거 | 남음 | 파일 수(전→후) |
|---|---|---|---|---|---|---|
| 2026-09-18 | [initial-pass](passes/2026-09-18-initial-pass.md) | `9d6122b` | 776 | 121 | 655 | 62 → 60 |
| 2026-09-18 | [regression-pass](passes/2026-09-18-regression-pass.md) | `a62eae1` | 960 | 7 | 953 | 81 → 80 |
| 2026-09-18 | [pin-guard-pass](passes/2026-09-18-pin-guard-pass.md) | `e29dddd` | 982 | 3 | 979 | 81 → 81 |
| 2026-09-18 | [aggregation-harness-pass](passes/2026-09-18-aggregation-harness-pass.md) | `e7fbcae` | 1317 | 5 | 1312 | 94 → 94 |
| 2026-09-19 | [product-surface-pass](passes/2026-09-19-product-surface-pass.md) | `d4a4cd2` | 1859 | 2 | 1857 | 111 → 111 |
| 2026-09-20 | [batch-harness-pass](passes/2026-09-20-batch-harness-pass.md) | `32faf64` | 1954 | 12 | 1942 | 112 → 112 |
| 2026-09-20 | [scenario-spec-pass](passes/2026-09-20-scenario-spec-pass.md) | `ddaef4f` | 2201 | 42 | 2159 | 118 → 118 |
| 2026-09-20 | [unrowed-files-pass](passes/2026-09-20-unrowed-files-pass.md) | `4ddbdaa` | 2350 | 33 | 2317 | 121 → 121 |
| 2026-09-20 | [trend-surface-pass](passes/2026-09-20-trend-surface-pass.md) | `473b3cc` | 2398 | 38 | 2360 | 123 → 123 |
| 2026-09-20 | [dashboard-surface-pass](passes/2026-09-20-dashboard-surface-pass.md) | `50dbd2d` | 2360 | 5 | 2355 | 123 → 122 |
| 2026-09-20 | [serving-handlers-pass](passes/2026-09-20-serving-handlers-pass.md) | `c887503` | 2419 | 19 | 2400 | 123 → 123 |
| 2026-09-20 | [lineage-surface-pass](passes/2026-09-20-lineage-surface-pass.md) | `9a5d32e` | 2467 | 13 | 2454 | 124 → 124 |
| 2026-09-21 | [lineage-rejudge-pass](passes/2026-09-21-lineage-rejudge-pass.md) | `6a0b464` | 2454 | 5 | 2449 | 124 → 124 |
| 2026-09-21 | [web-api-view-pass](passes/2026-09-21-web-api-view-pass.md) | `6a0b464` | 2454 | 47 | 2407 | 124 → 123 |
| 2026-09-21 | [e2e-runner-pass](passes/2026-09-21-e2e-runner-pass.md) | `60a8176` | 2428 | 71 | 2357 | 122 → 122 |
| 2026-09-21 | [trend-rejudge-pass](passes/2026-09-21-trend-rejudge-pass.md) | `da51edd` | 2357 | 51 | 2306 | 122 → 122 |
| 2026-09-21 | [reprocess-surface-pass](passes/2026-09-21-reprocess-surface-pass.md) | `88a643c` | 2458 | 16 | 2442 | 126 → 126 |
| 2026-09-21 | [reprocess-trigger-pass](passes/2026-09-21-reprocess-trigger-pass.md) | `f7e2338` | 2618 | 47 | 2571 | 134 → 134 |
| 2026-09-21 | [reprocess-console-pass](passes/2026-09-21-reprocess-console-pass.md) | `ca0554d` | 2571 | 31 | 2540 | 134 → 134 |
| 2026-09-21 | [reprocess-python-pass](passes/2026-09-21-reprocess-python-pass.md) | `52fba9f` | 2542 | 11 | 2531 | 134 → 133 |
| 2026-09-21 | [journey-gate-pass](passes/2026-09-21-journey-gate-pass.md) | `32e7f09` | 2531 | 20 | 2511 | 133 → 133 |
| 2026-09-21 | [dash-brief-pass](passes/2026-09-21-dash-brief-pass.md) | `0f4f04e` | 2521 | 23 | 2498 | 134 → 134 |
| 2026-09-21 | [rollup-test-pass](passes/2026-09-21-rollup-test-pass.md) | `1f508e1` | 2498 | 12 | 2486 | 134 → 134 |

batch-harness-pass도 표적 패스다 — `tests/e2e/k8s/batch/` 의 **아직 행이 없던 18파일**(149줄)만 판정했다.
그 디렉터리의 나머지 한 파일(`feed-double.yaml`)은 aggregation-harness-pass가 이미 판정했으므로,
이 패스 뒤 그 디렉터리는 19파일 전부가 행을 갖는다.

scenario-spec-pass도 표적 패스다 — 시나리오 spec 16파일과 `tests/e2e/fixtures/*/server.py` 2파일,
`econ_aggregation/cli.py` 1파일(도합 19파일 360줄)만 판정했다. 판정 시점(`7386301`)에 행이 없던 나머지는
`tests/e2e/lib/` 6파일이었고, 그 디렉터리는 열린 PR이 3파일을 수정 중이라 같은 패스로 묶지 않았다(겹치는
트리 위에서 판정하면 머지 순간 판정 근거가 낡는다). 머지 기준 커밋이 `ddaef4f`로 올라오는 사이 자매 PR
(#65·#66)이 **행 없는 파일 6개를 더 들여** 착지 시점 ⑴은 12파일 332줄이다 — 말미 요약이 그 값이다.
이 패스는 「읽는 법」에 **잔여 계수 규약**을 더해, 행이 있으나 판정 이후 자란 파일의 증가분도 말미 요약이
세도록 고쳤다.

unrowed-files-pass도 표적 패스다 — 판정 시점(`473a965`)에 **행이 없던 12파일 중 11파일**(298줄)만 판정했다.
남은 하나(`web/src/screens/Fairness.tsx` 34줄)를 뺀 것은 열린 PR #70이 그 파일을 수정 중이기 때문이다
(겹치는 트리 위에서 판정하면 머지 순간 판정 근거가 낡는다 — scenario-spec-pass가 `tests/e2e/lib/` 를 미룬 것과
같은 이유다). 머지 기준 커밋이 `4ddbdaa`로 올라오는 사이 그 PR #70이 실제로 머지돼 **행 없는 파일 셋을 더
들이고** `Fairness.tsx`를 37줄로 키웠으므로, 착지 시점 ⑴은 4파일 99줄이다 — 말미 요약이 그 값이다.
`tests/e2e/lib/` 는 6파일 전부가 행을 갖는다. 제거 33줄 중 20줄은 그 디렉터리의 **다섯 파일에 바이트째 되풀이된
같은 블록**이다 — 「이 디렉터리는 `specs/` 밖이다 … `check_scenario_mapping.py` 가 선언 없는 매칭 단위로
읽는다」. 복원 경로가 둘이라 제거했다: ① `check_scenario_mapping.py:104` 의 `SPEC_DIR.glob("*.spec.ts")` 가
`lib/` 를 애초에 훑지 않고, ② doc-tracker 「e2e 매핑 › 매칭 규약」이 「매칭 단위는 `tests/e2e/specs/` 최상위
`*.spec.ts` 파일이고 하네스는 매칭 단위가 아니다」를 못박는다. 주석 스스로 ②를 인용하면서 경로를
`docs/econ-opinion-monitor-doc-tracker.md` 로 적은 것도 이미 낡아 있었다 — 그 문서는 2026-08에 월별 디렉터리
(`docs/econ-opinion-monitor-doc-tracker/2026-09.md`)로 갈라졌다.

trend-surface-pass도 표적 패스다 — 그것도 **행이 없는 파일이 아니라 ⑵(행보다 자란 파일)를 닫는**
첫 패스다. 판정 시점(`473b3cc`)에 `web/src/screens/Trend.tsx`(35 → 75)와 `Trend.test.tsx`(12 → 35)가
`trend` 화면이 세 번째 여정 단계와 승계 계약을 받으며 63줄을 들였고, 그 63줄은 두 파일에 **행이 있다는
이유로** 어느 행에도 잡히지 않고 있었다. 제거 33줄 + 문면 정정 4곳(5줄 감소)의 특징은 복원처가 **같은
커밋 안에서 함께 열렸다**는 것이다 — #79·#80·#81 이 화면을 세우며 doc-tracker 2026-09 변동 이력과
design-tracker 행에 같은 사실을 산문으로 적었고, 주석이 그것을 다시 적었다. 같은 창이 들인
`web/src/tokens/tokens.css`(38 → 54, 증가분 16)를 뺀 것은 열린 PR #76 이 그 파일을 수정 중이기
때문이다(직전 두 패스가 `Fairness.tsx` 를 뺀 것과 같은 이유 — 막은 PR 번호만 바뀌었다).
`Trend.tsx:8-21` 의 「deliberately *not* here」 두 항은 design-tracker 가 처분 시점을 「단위가
**선택 가능해질 때**」로 못박았고 `/api/trend` 가 아직 `?unit=` 을 받지 않아 유지이며, 이 패스의
제거분은 전부 22행 이후라 트래커가 인용한 줄 범위는 움직이지 않는다.

이 패스는 **한 번 거부되고 기준 커밋을 옮겨 다시 판정했다.** 첫 판(`aca481c` 기준, 45줄 증가분)이
준비된 사이 자매 PR #81 이 같은 두 파일에 주석 18줄을 더 들였고, 그대로 머지했다면 원장이 **읽은 적
없는 18줄을 「판정됨」으로 인증**하면서 동시에 `현재 줄 수 == 남음` 을 만들어 계수 규약 ⑵ 가 그 18줄에
영영 도달하지 못하게 만들 참이었다(「읽는 법」이 스스로 경고한 자리다). 그래서 #81 착지를 기다려
기준 커밋을 `473b3cc` 로 옮기고 증가분 전량(63줄)을 다시 판정했다 — **원장 행의 `남음` 은 그 행의
비고가 열거로 해명하는 줄 수와 같아야 하고, 숫자만 갈아끼우는 갱신은 그 불변식을 깬다.**

dashboard-surface-pass도 표적 패스다 — 기준 커밋(`50dbd2d`)에서 **열린 어느 PR 에도 소유자가 없던 10줄**
(`web/src/screens/Dashboard.tsx` 3 · `Dashboard.test.tsx` 7)만 판정했다. 그 10줄은 모두 `#81 (squash)` 한 창이
들였고 잔여의 **두 몫에 나뉘어** 있었다 — 테스트 파일은 행이 없어 ⑴, 화면 파일은 행이 `남음 0` 이라 ⑵.
후자를 함께 집은 것은 행을 갱신하지 않으면 **원장이 「0줄」을 계속 주장**해 원장만 읽는 다음 패스가
재발한 주석에 도달하지 못하기 때문이다. **기준 커밋은 준비 사이 `473b3cc` 에서 `50dbd2d` 로 옮겼다** —
자매 PR #82(trend-surface-pass)가 먼저 착지해 같은 요약 행과 패스 이력 표를 고쳤기 때문이고, 리베이스 후
지문·잔여·행 수를 전부 재측정했다(#82 는 `Trend.*` 만 건드려 이 패스가 판정하는 10줄 자체는 움직이지 않았다).
제거 5줄은 주석을 들인 **그 PR 자신의 본문**이 축자로 복원하는 승계 계약 근거이고(경로 ③ — 앞선 패스들이
doc-tracker·design-tracker 로 복원한 것과 달리 **같은 PR 본문**이 복원처인 첫 사례다), 유지 5줄은 「테스트가 왜
그 모양으로 단언하는지」라 `Sentiment.test.tsx`·`Fairness.test.tsx` 의 전량 유지와 같은 판정이다. 판정 후
`Dashboard.tsx` 는 남음이 0 이라 지문 파일 집합에서 빠지지만 **행은 남긴다** — 지우면 다음 패스가 「아직 아무도
보지 않은 파일」로 오해한다.

**판정 표면을 수정 중인 열린 PR 이 있다 — 미루지 않고 판정한 근거.** 머지 직전 열린 PR 여섯
(#84 · #78 · #76 · #75 · #73 · #72) 중 **#84 가 이 두 파일을 모두 수정 중**이다(앞 세 패스가 `Fairness.tsx`·
`tokens.css` 를 뺀 것과 같은 상황). 그럼에도 뺀 것이 아니라 판정한 것은, #84 가 하는 일이 `오늘의 조회 조건`
카드를 들이며 **주석 31줄을 새로 더하는 것**이고 이 패스가 지우는 5줄과는 **줄이 겹치지 않기** 때문이다 —
제거 대상 문장(「축을 추측해야 하고」)을 #84 의 두 파일 패치에서 축자로 찾으면 0히트이고, 패치 헝크도
제거 지점(`Dashboard.tsx:112-114` · `Dashboard.test.tsx:78-79`)을 비껴간다. 더 중요한 것은 **착지 순서와
무관하게 그 31줄이 묻히지 않는다**는 점이다: 이 패스 뒤 두 파일 모두 행을 가지므로, #84 가 뒤에 착지하면
그 증가분은 계수 규약 ⑵ 로 다음 패스에 그대로 도달한다(두 행의 `남음` 0 · 5 는 착지 시점 실측값이라
⑵ 가 0 을 내지 않는다). 앞 패스들이 파일을 뺀 이유는 「판정 근거가 낡은 트리에서 세워지는 것」이었고,
여기서는 판정 근거(복원 경로 ③)가 #84 가 더하는 줄과 무관하므로 그 위험이 성립하지 않는다.

serving-handlers-pass도 표적 패스다 — `go/internal/handlers/` **한 패키지 2파일**만 판정했고,
직전 패스가 말미 요약에서 다음 패스로 지목한 그 덩어리다(⑵ `handlers.go` +228 · `handlers_test.go`
+106 = 334줄). **기준 커밋은 준비 사이 `4772128` 에서 `c887503` 으로 옮겼다** — 자매 PR #84·#85 가
먼저 착지해 `Dashboard.*`·`Trend.*`·`tokens.css`·`aggregation-5…spec.ts` 에 주석 64줄을 더했기
때문이고(직전 dashboard-surface-pass 가 「#84 가 뒤에 착지하면 그 증가분은 계수 규약 ⑵ 로 다음
패스에 도달한다」고 예고한 그 창이다), 리베이스 후 지문·잔여·행 수를 전부 재측정했다. **두 자매가
`go/internal/handlers/` 를 건드리지 않아 이 패스가 판정하는 372줄 자체는 움직이지 않았다**(판정 전
줄 수 252·120 이 리베이스 전후 동일). 증가분만 처분하지 않고 **두 파일 전체 372줄을 재판정**한 것은 「읽는 법」이 못박은
불변식(**행의 `남음` 은 그 행의 비고가 열거로 해명하는 줄 수와 같아야 한다**) 때문이고,
계획 직전 열린 PR 일곱(#85 · #84 · #78 · #76 · #75 · #73 · #72)의 파일 목록을 다시 조회해
`go/internal/handlers/` 와의 겹침이 **0**임을 확인했다. 제거 6줄은 **한 함수에 겹쳐 붙은 낡은 doc
주석 한 벌**(`latestBucket` 앞 5줄 — 뒤에 이어 붙은 두 번째 요약이 같은 사실을 더 정확히 적고,
`distinctBuckets`·`finestUnit` doc 이 나머지를 복원한다. 「다른 파일 주석의 재진술 — 설명의
주인에만 둔다」를 **한 파일 안의 두 벌**에 적용)과 `handlers_test.go` 의 `// --- trace (slice 9) ---`
구분선 1줄(initial-pass 가 같은 패키지에서 지운 형태의 재발)이다. 문면 정정 4곳(13줄 감소)의
특징은 **같은 트랩의 사본을 주인 지목 포인터로 줄인 것**이다 — 「Mixed bucket units」가
`trend`·`sentiment`·`fairness` 세 핸들러 doc 에 사본으로 있었고 주인은 그들이 실제로 부르는
`plottedUnit`·`sentimentUnit` 이며, 사본 셋 중 둘은 「AC3.3 has not landed」로 **이미 거짓**이었다
(`32faf64` 로 롤업이 착지하며 `plottedUnit` 은 고쳐졌고 사본은 놓쳤다 — 정책의 「되풀이된 주석이
낡아 틀려 있으면 제거 근거가 강해진다」). 나머지 정정은 과거 상태 서술(「which is what this route
used to do」·「until now this route closed neither」·「Before slice 9 this returned a fixed
string」)이고 복원 경로는 슬라이스 커밋(④)과 doc-tracker 변동 이력(②)이다.
**패키지 주석 본문 6줄은 판단 분기로 남겼다** — 경로 ①(`Register` 의 라우트 열거 · `reprocess`
본문 · `trace` doc)이 성립하지만, design-tracker 가 `handlers.go:34`·`:30-37` 을 **판정 근거로
줄 번호 인용**하고 있어 그 위를 지우면 두 인용이 밀린다(`Sentiment.tsx:24-29` 유지와 같은 자리).
경로 ②는 성립하지 않는다 — `README.md:223`·`:228` 이 아직 골격 시절 서술(「나머지 6화면은
플레이스홀더」·「스텁 라우트만」)이라 **README 쪽이 낡았고 주석 쪽이 맞다**. 이 패스의 제거·정정
지점은 전부 `:308` 이후라 트래커가 인용한 줄 범위는 움직이지 않는다.

lineage-surface-pass도 표적 패스다 — 슬라이스 9(`4ddbdaa`/#70)가 들인 **계보 표면 4파일**(93줄)만
판정했다. 셋(`Trace.tsx`·`Trace.test.tsx`·`store_test.go`)은 unrowed-files-pass가 ⑴로 남긴 4파일 중
셋이고, 넷째 `go/internal/store/store.go`는 ⑵(행보다 자란 파일)에서 끌어왔다 — `store_test.go` 의
제거 근거가 `store.go` 의 doc 주석이라, 둘을 같이 보지 않으면 「설명의 주인」 판단이 서지 않는다.
⑴의 남은 하나 `web/src/screens/Fairness.tsx`를 뺀 것은 슬라이스를 그을 때 **열린 PR #76이 그 파일을
수정 중**이었기 때문이다(직전 패스가 같은 파일을 #70 때문에 뺀 것과 같은 이유 — 막은 PR 번호만
바뀌었다). 그 #76은 착지 직전 머지돼(`9a5d32e`) 제약이 풀렸으므로 **다음 패스가 바로 집을 수 있다**.
제거 13줄은 계보 조인 축 재진술 4줄(doc-tracker 변동 이력이 축자 복원) · 열지 않는 단계 서술 5줄
(같은 파일이 화면에 그리는 `note` 문면이 복원) · `store.go` doc 주석의 재진술 3줄(설명의 주인은
구현 쪽) · 테스트 이름이 복원하는 1줄이다. 더해 **문면 정정 2곳**(줄 수 불변): `.trace-` 접두사
가드에서 게이트 메커니즘을 걷어 금지와 출처만 남겼고(pin-guard-pass 선례), `PAT-lineage` 앵커를
이 파일의 다른 앵커 여섯과 같은 1줄 형태로 줄였다(구성 열거는 설계 트래커가 축자 복원).
**판정을 마친 뒤 기준 커밋이 `83e1281` → `8bad0be` → `cfe9f8b` → `9a5d32e`로 세 번 올라왔다** — 그 사이
#77이 설계 트래커에 `trace` 전수 판정을 등재했고(복원 경로 ②가 새로 열렸다), #79가 `Trace.tsx` 의 링크
만료 배너 문면을 목업 3문장으로 갈며 `Trace.test.tsx` 에 주석 2줄을 들였다. 둘 다 **판정 후에 생긴
복원 경로**라 이 패스는 앞당겨 집행하지 않고 해당 행에 다음 패스 후보로 적어 두었다. 마지막 이동
`cfe9f8b` → `9a5d32e`(#76)는 **판정 대상 4파일을 하나도 건드리지 않았다** — 주석 39줄을 다른 7파일에
들였을 뿐이라 판정 내용은 그대로 유효하고, 위 「패스 이력」 행과 아래 말미 집계의 **숫자만** 그 tip 에서
재측정했다(판정 전 `2428/123` → `2467/124`, 착지 후 `2415` → `2454`).

lineage-rejudge-pass는 **줄이 자라지 않은 파일의 재판정**이다 — lineage-surface-pass가 행을 준 뒤 #77·#79가
연 복원 경로 ②에 걸린 `Trace.tsx` 27줄·`Trace.test.tsx` 22줄만 다시 판정했다. 「읽는 법」의 잔여 계수 규약은
⑴ 행 없는 파일과 ⑵ 줄이 자란 파일만 세므로 **복원 경로가 자란 자리는 어느 몫에도 들어가지 않는다** — 그래서
이 패스는 말미 요약의 잔여 숫자를 움직이지 않고(383 그대로), 직전 패스가 이름으로 넘긴 후보 둘을 닫는 것이
전부다. 제거 5줄은 설계 트래커가 축자 복원하는 결측 문장 1줄과 매달린 `//`·같은 파일 `CMP-crumb` 앵커가
복원하는 1줄(`Trace.tsx`), 트래커 「해소된 등재」 행과 바로 아래 단언 3줄이 복원하는 #79 도입 2줄
(`Trace.test.tsx`)이다. 직전 패스가 「판단 분기」로 남긴 나머지 셋(설계 원칙 + 세 결측 목록 · 앵커의 사유 절 ·
인라인 AC 태그)은 이 패스가 **유지로 확정**했다 — 다음 패스로 다시 넘기지 않는다(근거는 패스 문서).
web-api-view-pass도 표적 패스다 — 직전 패스가 ⑴(행 없는 파일)로 남긴 **둘 전부**(`Fairness.tsx` 38 ·
`Compare.test.tsx` 6)와 ⑵(행보다 자란 파일) 중 `web/src/api/` **한 디렉터리 둘**(`types.ts` 5→48 ·
`client.ts` 5→15), 도합 4파일 107줄만 판정했다. 이 패스 뒤 **⑴ 은 0 이다** — scenario-spec-pass 가 계수
규약을 세운 뒤 12파일 332줄 → 4파일 99줄 → 2파일 44줄로 줄어 온 몫이 비었고, 잔여는 ⑵ 하나(20파일
286줄)다. 감지 단계가 권한 「열린 PR 과 겹침 0 인 최대 묶음」(`run.sh`·`types.ts`·`client.ts`)을 그대로
받지 않은 것은, 판정 시점 열린 PR 이 #75 하나(`scripts/`·`.github/` 만 수정)라 겹침이 어느 후보에서도
판별식이 아니었기 때문이다 — 대신 **복원처의 묶음**으로 갈랐다: 이 넷의 복원처는 `handlers.go` 의 응답
타입 doc(serving-handlers-pass 가 전량 유지한 **설명의 주인**) · 설계 트래커 `fairness`/`compare` 행 ·
PR #66·#70·#76 본문으로 하나의 묶음이고, `run.sh`(+84, 잔여의 29%)의 복원처는 테스트 문서·모킹 정책·README
로 다른 묶음이라 다음 패스의 1순위로 남겼다. 제거 47줄의 34줄은 **`types.ts` 의 필드·타입 JSDoc 이
Go 쪽 doc 주석을 같은 문장으로 되풀이한 것**이다 — 슬라이스 6~9 가 서빙 타입을 세우며 두 벌로 적었고,
「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」의 주인은 값을 계산하는 구현 쪽이다(`store_test.go` ←
`store.go` 와 같은 판단). export 타입의 요약 1줄은 정책대로 남겼고 본문이 여러 줄인 JSDoc 넷은 요약 1줄로
줄였다. 나머지는 `client.ts` 의 범위 서술(「the one screen still on Placeholder」 — README 재진술 유형이고
슬라이스 10 이 착지하면 거짓이 되는 개수 서술) 6줄과, #76 이 같은 커밋에서 설계 트래커·PR 본문으로
복원처를 연 `Compare.test.tsx` 6줄 전량이다. **`Fairness.tsx` 는 38줄 중 1줄만 지웠다** — 설계 트래커
「`세는 방식` 폼 카드 전면 부재」 행이 `Fairness.tsx:110-118` 을 줄 번호로 인용하고 있어 118행 위의 28줄은
복원 경로(doc-tracker 슬라이스 8 행 · 설계 트래커 `STP-inspect-sources`/`STP-drilldown-articles` 행 · 화면
자신의 lede 와 note 문면)가 전부 실재함에도 `handlers.go` 패키지 주석·`Sentiment.tsx` 세 블록과 같은 이유로
남겼다(제거·정정은 전부 118행 아래). 세 파일이 같은 자물쇠에 걸려 있으므로 그 인용이 내용 지목으로
바뀌면 함께 풀린다. 문면 정정 4곳은 앵커 셋(`CMP-note`·`PAT-raw-vs-norm`·`CMP-kv`)의 열거·과거 상태 서술을
lineage-surface-pass 의 `PAT-lineage` 처분대로 1줄 형태로 줄인 것과 `types.ts` 머리의 낡은 README 포인터
제거이고, `check-mockup-render.py` 출력이 부모와 바이트 동일함을 확인했다(`CMP-table` 토큰은 `Trend.tsx`
가 들고 있다).

e2e-runner-pass도 표적 패스다 — 직전 패스가 「다음 패스의 1순위」로 이름 붙인 **`tests/e2e/run.sh` 한 파일**(행 남음
12 → 실측 96, +84)만 판정했다. 96줄 중 **71줄을 지웠다**. 감지 단계는 이 파일의 복원처를 테스트 문서 셋·모킹
정책·README 로 예상했으나, 실제 주인은 **`tests/e2e/k8s/batch/` 매니페스트 머리 주석**(batch-harness-pass ·
unrowed-files-pass 가 전량 유지한 설명의 주인)과 `lib/ingestlog.ts`·`tools/timeshift_bronze.py` 머리말, 그리고 그 줄을
들인 PR #39·#44·#50·#65 본문이었다 — #31 부터 #65 까지 하네스를 넓힌 PR 마다 매니페스트에 적은 근거를 러너 머리와
단계 표지 뒤에 한 벌씩 더 적어 왔고, 그 사본을 걷은 것이다(「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」).
머리의 네 경로 목차 28줄은 이 파일 자신의 단계 표지와 말미 배너가 실행 순서대로 되풀이하므로 lede 2줄로 줄였다.
단계 표지 `1)`~`5)`·`4b)`~`4f)` 는 initial-pass 의 판정을 승계해 시나리오 포인터를 든 1줄로 남겼다. 유지 25줄 중
판단 분기 셋(lede 2줄 · llm-fixtures 선행 2줄 · 전제 도구 1줄)은 패스 문서에 적었다. `mock-exception:` 3줄은 바이트
무접촉이다. 이 패스는 원장 행을 신설하지 않고, `deploy/overlays/prod/pvc.yaml` 행에 **파일 소멸**(#92) 만 적었다 —
`batch-pvc.yaml`(행 남음 9 → 실측 7, 내용 교체)·`deploy/overlays/prod/kustomization.yaml`(20 → 23) 은 복원처 묶음이
달라 재판정 후보로 넘긴다(패스 문서 「판정하지 않은 것」).

trend-rejudge-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선」으로 이름 붙인 **`Trend.tsx`·`tokens.css`·`Trend.test.tsx`
세 파일의 증가분 86줄**(47→89 · 38→61 · 25→46)만 판정했다. 86줄 중 **51줄을 지웠다**(34 · 1 · 16). 감지 단계는 이 묶음의
복원처를 「목업 `JRN-axis-contrast.html` · 트래커 `STP-verify-in-trend` 행 · PR #91」 하나로 예상했으나, 실측한 증가분은
**세 착지의 합**이다 — #85(겹쳐 보기 opt-in, 23줄) · #87(복원 조건 수명 `localStorage`, 17줄) · #91(온도차 판별 폼, 26줄) —
그리고 `tokens.css` 의 23줄은 **아홉 PR·여섯 화면**의 구획 주석이라 trend 묶음이 아니다(#45·#53·#66·#70·#76·#80·#84·#85·#91).
그래서 제거의 주인도 셋이다: #85 분은 `drawnSeries()`·체크박스 JSX(경로 ①)와 설계 트래커 「해소된 등재」 #85 행(②),
#87 분은 `Dashboard.tsx` 의 `BRIEF_KEY` 앞 주석(설명의 주인)과 트래커 #87 행, #91 분은 트래커 #91 행과 PR #91 「왜 항상
그리나」 절(③)이 **축자**로 복원한다. `tokens.css` 는 첫 줄(구획 앵커·목업 대응 규칙)을 전부 남기고, 아홉 블록이 되풀이한
규칙 5 게이트의 **메커니즘 문장**(「이름을 들이면 규칙 5 가 선언 단위로 대조하기 시작하는데 세 상한이 전부 0 이라 대조면이
움직인다」 — 설계 트래커 「규칙 3·4(네비)·5 기계 판정」 절이 주인, `Trend.tsx` 의 `.trend-sl-` 가드 2줄이 이미 그 짧은 꼴)만
걷었다 — 지문은 블록 주석의 첫 줄만 세므로 이 정정은 계수에 **−1**(`.raw-flag` 1줄 제거)로만 보인다. 테스트 쪽은 구현 주석의
사본(스케일·색 불변 · 저장소 수명)과 트래커 행을 이름으로 지목한 문장(「등재된 편차」·「트래커 행의 약속」), 단정 나레이션을
걷고, 추림 테스트와 같은 꼴의 배너 지목·폼 분리·조사 핀은 유지했다. 판단 분기 넷(`Trend.tsx` `으로 판별했습니다` 조사 핀 ·
`Trend.test.tsx` 같은 핀 · `.trend-ov-form` 간격 주석 · `.dash-brief-empty` 문면 분기)은 패스 문서에 적었다. 이 패스는
원장 행을 신설하지 않는다(세 행 갱신). `Trend.tsx` 머리 4줄을 걷어 「deliberately *not* here」 블록이 12~23행에서 **7~18행**으로
올라갔다 — 설계 트래커가 인용하는 `Trend.tsx:8-21` 은 #81 이 import 를 더한 시점부터 이미 11~22행이었으므로(이 패스가 처음
깨뜨린 자물쇠가 아니다) 트래커 쪽 정정은 그 행의 소유자(mockup-render 모델)에게 넘긴다(패스 문서 「판정하지 않은 것」).

reprocess-surface-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선」으로 이름 붙인 **#94 묶음 8파일 152줄**(⑴ 행이 없던 신설
`reprocess.go` 69 · `Reprocess.tsx` 33 · `reprocess_test.go` 22 · `Reprocess.test.tsx` 16 + ⑵ 기존 `types.ts`·`handlers.go`·`client.ts`·
`tokens.css` 의 #94 증가분 5·3·3·1)을 겨눴고, 그중 **90줄을 판정해 16줄을 지웠다**(`reprocess.go` 13 · `Reprocess.test.tsx` 2 · `types.ts` 1).
**나머지 62줄은 판정하지 않았다(보류)** — 판정을 마치고 PR 을 여는 사이 자매 **#97(docs-impl 슬라이스 10 후반부)** 이 열려 이 묶음 7파일을
수정 중이었고(`git merge-tree` 로 재보니 첫 판 62줄 제거는 4파일에서 충돌), 자매 **#96(mockup-render)** 이 착지하며 설계 트래커에
`Reprocess.tsx:87-124`·`:240-241`·`:295-302`·`:364-372`·`:375-402` 다섯 줄 번호 자물쇠를 새로 걸었다(`:240-241` 은 지우려던 예상 소요 주석
그 자체). 앞선 패스들의 두 규약 — 열린 PR 이 수정 중인 파일은 뺀다(scenario-spec-pass · unrowed-files-pass · lineage-surface-pass), 트래커가
줄 번호로 인용하는 자리는 뺀다(serving-handlers-pass · web-api-view-pass) — 와 dashboard-surface-pass 의 「헝크가 겹치지 않으면 착지 순서와
무관하다」를 함께 적용해 **헝크 단위로** 뺐다: `Reprocess.tsx` 는 파일째(⑴ 에 남는다, 행 없음) · `reprocess.go` 머리 25(#97 이 「the triggering
itself is the POST side in reprocess_trigger.go」로 갈아 쓴다) · `handlers.go` #94 분 3(패키지 주석·`now` doc — 행 무접촉, ⑵ 에 남는다) ·
`types.ts` `trigger` JSDoc 1. 그 62줄은 #97 이 착지하면 어차피 다른 문장이 되고(#96 의 자물쇠도 #97 의 머리 헝크가 함께 민다), 판정한
90줄은 #97 이 손대지 않아 어느 순서로 착지해도 낡지 않는다(이 PR ↔ #97 자동 병합 충돌 0). 뺀 줄 중 26줄(`reprocess.go` 머리 · `types.ts` 1)은
이 패스가 행을 준 파일 안이라 ⑴⑵ 에 잡히지 않으므로 행 비고와 말미의 「보류」 목록이 추적처다(pin-guard-pass 의 「이 패스가 판정하지
않은 주석」 규약) — #97 이 그 줄을 다시 쓰면 파일이 자라 ⑵ 가 어차피 발화한다. 지운 16줄의 복원처는 감지가 예상한 문서(doc-tracker 착지
행·트래커·PR #94)보다 **같은 묶음 안의 다른 파일 주석**이 많았다: `Reprocess.test.tsx`·`types.ts` 가 `client.ts`·Go 구현 doc(`throughput`)을
사본으로 되풀이했고(「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」, 주인은 값을 계산하는 구현 쪽 — web-api-view-pass 의 `types.ts` ←
`handlers.go` 판단), `ThroughputPerMinute` 필드 doc ↔ `throughput` 함수 doc 은 한 파일 안의 두 벌이었다(serving-handlers-pass 의 `latestBucket`
처분). `client.ts` 의 「The selection is server-side」 3줄은 web-api-view-pass 가 `sentiment` 의 「not a client-side filter」를 판단 분기로 둔 것과
같은 유형이라 남기고 그 사본(`Reprocess.test.tsx` 머리 2줄)을 지웠다. `tokens.css` 의 `PAT-before-after` 구획은 첫 줄(`markers()` 자물쇠)을
남기고 붙은 산문만 걷었다(정정 1블록, 지문 −0). 테스트 파일 `reprocess_test.go` 는 22줄 전량 유지(`handlers_test.go` 와 같은 판정). 판단 분기
둘(`reprocess.go` `versionsOf` 의 기본 목표 근거 · `client.ts` 3줄)은 패스 문서에 적었다. 이 패스는 원장 행을 **3개 신설**하고 3행을
갱신했다(126 → 129). 설계 트래커의 `handlers.go:34`·`:30-37` 인용은 #94 가 4줄을 더한 시점부터 이미 낡아 있다(`Register` 30 → 35행) —
트래커 쪽 정정은 그 행의 소유자(mockup-render 모델) 몫이다.

reprocess-trigger-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음」으로 이름 붙인 묶음(⑴ 9파일 145 + ⑵ 의 #97 분 69 +
보류 26) 가운데 **서빙→Argo 제출 경로의 백엔드 10파일 158줄**(신설 `argo.go`·`reprocess_trigger.go`·`reprocess_trigger_test.go`·
`rbac.yaml` 82 · 보류였던 `reprocess.go` 머리 20 · ⑵ 의 `workflow-template.yaml`·`handlers.go`·`store.go`·`deployment.yaml`·`main.go`
증가분 42 + 앞서 자라 있던 5)만 판정해 **47줄을 지웠다**. 감지 단계는 이 묶음의 복원처를 doc-tracker 슬라이스 10 후반부 착지 항목으로
예상했고 그 경로 ②는 실제로 축자 성립하지만, 지운 줄의 대부분은 문서 사본이 아니라 **같은 착지 안 여덟 자리에 되풀이된 같은
이야기**(「서빙은 레이크를 쓰지 않는다 · 세 단계는 Workflow 하나씩 · `trigger.available` 은 프로브」)였다 — 그래서 이 패스의 첫 판단은
**주인 정하기**다: 「무엇을 일으키고 왜 서빙이 쓰지 않는가」는 그 POST 를 처리하는 `reprocess_trigger.go` 머리, 「프로브가 무엇을
증명하는가」는 그 프로브를 수행하는 `argo.TemplateReachable` doc, 「기록된 결정이 서빙 버전을 이름한다」는 그 타입
`store.ReprocessDecision` doc 이 주인이고, `argo.go` 패키지 주석·`handlers.go` 머리와 `argo` 필드·`main.go`·`rbac.yaml` 머리·
`deployment.yaml`·`workflow-template.yaml` 머리의 사본은 포인터 1줄이나 무주석으로 줄였다(「다른 파일 주석의 재진술 — 설명의 주인에만
둔다」; web 쪽 사본 `ReprocessTrigger.tsx`·`Reprocess.tsx` 머리·`client.ts`·`types.ts`·`Reprocess.test.tsx` 는 다음 패스). `reprocess.go`
머리의 「What this endpoint answers」 목록 12줄은 같은 파일 함수 doc 이 항목마다 주인인 **한 파일 안의 두 벌**이다(serving-handlers-pass
의 `latestBucket` 처분). 매니페스트는 감지의 예측대로 **파라미터 계약**(`arguments.parameters` 기본값 · `sample` 0/양수 · 재시도
안전성과 exit 2 · 온도 주석)은 남았고, 권한 **사유**는 doc-tracker ⑷ 와 `reprocess_trigger.go` 머리가 축자 복원해 포인터로 줄었다.
web 6파일 74줄을 이번에 뺀 것은 주인을 먼저 정해야 사본 판정이 서기 때문이고, #96 이 `Reprocess.tsx` 에 건 자물쇠 다섯은 #97 의 머리
헝크로 **이미 낡아**(33→28) 재핀이 트래커 소유자(mockup-render, `rct_20260921-0006` assessing 중) 몫이라 그 task 와 같은 파일을 만들지
않기 위해서다. 이 패스는 원장 행을 **4개 신설**하고 6행을 갱신했다(129 → 133). `handlers.go` 의 제거 4줄이 전부 `Register` 위라 설계
트래커의 `handlers.go:34`·`:30-37` 인용(#94 부터 낡음)은 더 밀렸다(`Register` 45행) — 재핀은 그 행의 소유자 몫이다.

reprocess-console-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음의 web 6파일 74줄」로 이름 붙인 그 묶음(⑴ 행이 없던
`ReprocessTrigger.tsx` 23 · `Reprocess.tsx` 28 + ⑵ `Reprocess.test.tsx`·`client.ts`·`types.ts`·`tokens.css` 의 #97 증가분 22 + 보류 `types.ts` 1)만
판정해 **31줄을 지웠다**(12 · 10 · 2 · 3 · 4 · 0). 착수 조건(mockup-render 의 열린 task 가 `Reprocess*.tsx` 를 수정 중인가)은 음성 — 그 task 의 PR #100
은 트래커·목업 인덱스 두 파일뿐이고 이 패스가 시작하기 전 `ca0554d` 로 착지했다. 지운 줄의 첫 겹은 예측대로 **직전 패스가 정한 주인의 사본**이다
(`ReprocessTrigger.tsx`·`Reprocess.tsx` 머리의 한국어 문단 ↔ `reprocess_trigger.go` 머리의 영어 원본 · `types.ts` 필드 JSDoc ↔ `argo.TemplateReachable`·
`Note`·`ServingVersion`·`argo.List` doc · `client.ts`·`Reprocess.test.tsx` 나레이션). 둘째 겹은 **web 안의 주인**이다 — 「런이 끝나면 읽기 절반을 다시
센다」가 세 벌(prop doc · 폴링 effect · `reload` 상태)이라 계약이 사는 prop doc 만 남겼고, `Reprocess.tsx` 앵커 넷(`CMP-seg`·`CMP-table`·`CMP-note`·
`PAT-before-after`)에 붙은 산문은 `client.ts:70-72`·`bucketsOf` doc·`reprocess_trigger.go` 머리·`compareRow` doc 의 사본이라 앵커만 남겼다(지문 −0).
셋째 겹은 복원 경로 ②③ 이 **축자**인 자리 — 「덮어쓰기 토글 없음(병존이 구조)」·「소스 목록은 필터와 무관」·「보류 몫은 비율에 섞지 않는다」·
「비교 불가 ≠ 데이터 없음」·「결정 이력은 제품 안에 남는다」는 doc-tracker 슬라이스 10 후반부 ⑴⑵⑸ · 설계 트래커 `reprocess` 행 · PR #97 본문 ·
Go 필드 doc 이 같은 문장으로 적는다. **보류 1줄(`types.ts` `trigger` JSDoc)은 #97 이 필드를 갈며 이미 없앴다** — 새로 든 6줄(순증 5)을 이 패스가
판정했고 보류 목록은 0 이 된다. 판단 분기 넷(주목 임계 상태 2줄 · 예상 소요 주석 2줄 — 설계 트래커 L483 이 **주석 자체를 출처로 인용**해 실체를 남김 ·
`client.ts` 빈 catch 주석 — eslint recommended `no-empty` 가 읽는다 · `types.ts` 요약의 「the last one names …」 절 — 1줄 요약 규칙)은 패스 문서에 적었다.
이 패스는 원장 행을 **2개 신설**하고 4행을 갱신했다(133 → 135). `Reprocess.tsx` 머리 6줄과 본문 4줄을 걷어 설계 트래커의 자물쇠 다섯(`:87-124`·
`:240-241`·`:295-302`·`:364-372`·`:375-402`)은 더 밀렸다 — 이 패스 뒤 실체의 좌표(75~114 · 225~226 · 279~297 · 344~351 · 358~383)는 패스 문서
「판정하지 않은 것」에 있고, 재핀은 그 행의 소유자(mockup-render) 몫이다.

reprocess-python-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음의 python 5파일 24줄」로 이름 붙인 그 묶음(⑴ 행이 없던
`test_silver.py` 7 · `storage.py` 3 · `test_serving_version.py` 2 + ⑵ `cli.py` 7→16 · `test_cli.py` 5→8 의 증가분 12)만 겨눴고 **11줄을 지웠다**
(0 · 3 · 0 · 8 · 0). **기준 커밋은 감지 시점 `b19905f` 가 아니라 `52fba9f`(#102 착지 tip)다** — #102 가 `Reprocess.test.tsx` 에 주석 2줄을
들여 전체 지문이 2540 → 2542 로 먼저 움직였기 때문이고(5파일 자체는 #102 무접촉이라 판정 대상은 움직이지 않았다), 말미 집계는 그 tip 에서
재측정했다. ⑵ 두 파일은 **증가분만이 아니라 파일 전체(16 + 8)를 재판정**했다 — #97 이 `cli.py` 의 주석 3줄(그중 2줄은 initial-pass 가 판정한 것)을 갈아 썼기
때문에(+8/−3 — `git diff f7e2338~1 f7e2338` 의 주석 줄 대조) 행의 비고가 열거하는 줄과 실측이 이미 어긋나 있었고, 「행의 `남음` 은 그 행의
비고가 열거로 해명하는 줄 수와 같아야 한다」(trend-surface-pass · serving-handlers-pass 가 못박은 불변식)를 지키려면 숫자만 갈아끼울 수
없다. 지운 줄의 첫 겹은 **저장소 문서가 축자로 적은 자리**(경로 ②) — `storage.py` 의 원자적 교체 사유 3줄은 doc-tracker 2026-09 의
슬라이스 9(「`write_records` 가 truncate+write 라 집계가 Gold 를 다시 쓰는 수 초 동안 동시 요청이 잘린 줄을 읽을 수 있다 — 원자적 교체」)와
슬라이스 10 후반부 ⑴(「임시 파일 → `os.replace` 라 서빙이 쓰는 도중의 잘린 줄을 읽지 않는다」)이 문제와 처방을 다 적고 PR #97 본문 1항이
되풀이하며, 바로 아래 `os.replace(staging, target)` 이 메커니즘의 주인이다; `cli.py` 의 「전 레이크 실행은 대체된 버전을 걷되 결정이 서빙 중인
버전은 남긴다(다음 매시간 실행이 지우면 Gold 가 잃는다)」 2줄과 「재개 = 목표 버전이 이미 덮은 것이 체크포인트」 1줄은 doc-tracker ⑴⑶ ·
PR #97 본문 1·3항이 같은 문장으로 적고 `store_analyses` docstring(`keep_versions` = the serving version)과 테스트 이름
(`test_scoped_run_skips_records_already_at_the_target_version`)이 코드 쪽 주인이다. 둘째 겹은 **다른 파일 주석의 재진술** —
응답 캐시 머리 3줄(「매시간 주기는 대체로 같은 기사를 다시 관측하므로 새로 든 것만 모델에 닿는다」)은 `llm.reply_cache_key` docstring 이
같은 문장으로 적는 주인이고, 「빈 쓰기도 데이터셋을 정리한다(Bronze 가 버린 행을 걷는다)」 1줄은 `store_analyses` docstring 「pruned counts
rows dropped because their Bronze record is gone」 이 주인이다. 셋째는 **PRD 재진술** — 「본문은 content-addressed 저장소에 한 번, 관측은
해시로 참조(AC1.4, AC1.7)」 1줄은 initial-pass 가 유지했던 줄이나 PRD ingestion AC1.4(「관측 레코드가 본문 해시(`body_hash`)로 본문을
참조한다」)·AC1.7(「본문 저장소에는 버전당 정확히 1건」)이 축자 원본이고 `bodies = {b["body_hash"]: …}` 가 코드 쪽 주인이라 이번에
뒤집었다. **유지 25줄**: 테스트 3파일 17줄은 전량 — 각 줄이 바로 아래 단언이 **왜 그 값인지**를 든다(`(written, pruned) == (3, 0)` 이 「병존」이고
`(3, 1)` 이 「서빙 중인 v2 는 남고 v1 만 걷힌다」인 것은 이름·숫자만으로 복원되지 않는다; dashboard-surface-pass 의 `Sentiment.test`·
`Fairness.test` 처분과 같다). `cli.py` 8줄은 `#:` 속성 doc 2(유지 대상) · 표본 시드 1(「재개된 표본이 같은 레코드를 뽑도록 런 자신의 신원으로
시드한다」 — doc-tracker ⑶ · PR #97 3항 · 여정 §4 어디에도 없는 유일 지식) · 전송 먼저 구축 2(initial-pass 승계 — `#:` doc 은 결과「nothing was
read」만 적고 `open_store` 앞에 두는 순서의 이유는 여기뿐) · 전량 실패 정지 2(initial-pass 승계 — 「AC2.5 신호를 흐린다」는 근거가 doc-tracker ⑶ ·
`#:` doc · stderr 문면 어디에도 없다) · 캐시 병합 순서 1(판단 분기 — 아래). 판단 분기 1자리(`cli.py` 「모델이 답한 것은 배치가 실패해도 남긴다」 —
전량 실패 시 `new_replies` 가 비어 문면이 헛도는 듯하나 부분 실패 경로의 순서 근거로 읽히고 복원처가 없다)는 패스 문서에 적었다. 이 패스는 원장
행을 **3개 신설**하고 2행을 갱신했다(135 → 138). `storage.py` 는 남음 0 이라 지문 파일 집합에서 빠지지만 **행은 남긴다**(dashboard-surface-pass 의
`Dashboard.tsx` 처분). ⑴ 은 이 패스로 **0** 이 된다 — 원장이 열린 뒤 처음이다.

journey-gate-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 `scripts/check-journey-mockup.py` +23」으로 이름 붙인 그 파일의 **증가분 23줄**
(#47 `e7fbcae` R10·R11 머리 주석 11 · #61 `e75b254` R12 머리·README 스캔 주석 12 — `git blame` 으로 파일 단독 귀속, 나머지 42줄은 `052c112`·`98c3288`·
`2579722` 그대로라 두 PR 이 기존 판정 줄을 갈아 쓰지 않았다)만 겨눴고 **20줄을 지웠다**. 증가분만 판정해도 불변식(행의 「남음」 == 비고가 열거하는 줄 수)이
서는 것은 그 귀속 때문이다 — reprocess-python-pass 의 `cli.py` 와 반대 경우. **기준 커밋은 착지 tip `32e7f09`(#103)** 이며 감지 시점과 같다(2파도 0).
지운 줄의 첫 겹은 **같은 파일 안**(경로 ①) — 머리 docstring 의 `R10`·`R11`·`R12` 항이 세 규칙의 문면(「규칙 7 의 기계화 — 표와 래칫만 갱신하고 산문을
남겨 두 SSOT 가 서로 다른 사실을 말하는 것을 잡는다」·「R10 의 파일 참조판」)을 먼저 적고, 바로 아래 코드가 메커니즘의 주인이다(`if fenced or
line.lstrip().startswith(">")` 가 면제를, `(IDX, idx), (TRACKER, tracker), (JREADME, _jreadme)` 가 README 편입을, `_CURRENT_FORM` 의 세 `startswith`
predicate 가 「구조화된 세 행」을, `for name, pat, want, ctx in CLAIMS` 가 `CLAIMS` 튜플 모양을 말한다). 둘째 겹은 **저장소 문서**(경로 ②) — mockup 인덱스
「서술 절의 숫자 규약(규칙 7 / 게이트 R10)」 문단이 「숫자를 산문에서 추방하지는 않는다 … 대신 낡으면 CI 가 잡는다」·「과거 시점의 수치를 인용할 자리는
인용 블록(`> `)과 코드 펜스」·「두 SSOT 가 같은 사실을 서로 다르게 말하는 상태(rct_20260918-0004)」·「R11 이 … 흡수로 삭제된 화면 파일이 목록에 남거나,
새 여정 페이지가 목록에서 빠지는 것을 잡는다」를 축자로 적는다. 셋째 겹은 **PR 본문**(경로 ③) — #47 이 「R7은 허브 링크의 실재와 매핑 표만 검사하고
서술 절의 사실 정합은 보지 않는다」와 「트래커는 4/6 · 미시각화 3단계, 인덱스는 3/6 · 미시각화 4단계」를, #61 이 「R8 의 링크 추출은 링크 문법만 뽑으므로
인라인 코드를 세지 않는다」·「전수 대조는 36건 … 사료를 위반으로 만들어 문서를 거짓으로 고치게 강제한다 … 현재형 주장만 사는 구조화된 세 행」·「README 는
R10 의 스캔 대상이 아니라 낡은 채 살아남았다 — 4/6→6/6 · 25/30·2·3→30/30·0·0」을 같은 문장으로 적는다(#52 이월·#57 잔존도 #61 이 적는다).
**유지 3줄**은 `# ── R10 ──`·`# ── R11 ──`·`# ── R12 ──` 머리 1줄씩 — initial-pass 가 같은 파일의 `# R3 —`·`# R6 —`·`# R7 —` 를 규칙 문자 추적 앵커로
남긴 것과 같은 꼴이다. 감지 단계는 「무엇이 낡은 채 통과했는가」 서술(R11 2줄 · R12 4줄)을 regression-pass 가 #36 의 4줄을 유지한 선례에 견줘 유지 쪽으로
기울여 넘겼으나, #36 의 4줄은 복원처가 어디에도 없었고 이 6줄은 인덱스·PR 본문이 축자로 적으므로 갈렸다 — 근거는 패스 문서에. 판단 분기 0. 이 패스는 원장
행을 신설하지 않고 1행을 갱신했다(138 그대로). 파일이 45줄 남아 지문 파일 집합은 133 그대로다. **원본 쪽 누락 둘은 고치지 않았다** — 인덱스 :150 이 R10 의
스캔 대상을 「이 문서와 트래커」로만 적어 README(#61) 를 빠뜨렸고, 트래커 :25 가 「정적 R1~R11」로 R12 를 빠뜨렸다. 정책상 원본의 정확성은 이 판정의 표면이
아니고(복원은 docstring·코드·PR 본문으로 이미 닫힌다), `docs/mockups`·트래커를 만지면 자매 `tbm_econ-opinion-monitor-journey-mockup` 의 as-is/to-be 가
움직이므로 그 모델의 몫으로 좌표만 남긴다.

dash-brief-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 dash 묶음 `Dashboard.tsx` +19 · `Dashboard.test.tsx` +12」로
이름 붙인 두 파일의 **증가분 31줄**(전량 #84 `763b8f4` — `git blame` 으로 파일별 계수: `Dashboard.tsx` 19 전량 · `Dashboard.test.tsx`
12, 옛 5줄은 `473b3cc` 그대로라 #84 가 기존 판정 줄을 갈아 쓰지 않았다)만 겨눴고 **23줄을 지웠다**(13 · 10). **기준 커밋은
#104 착지 tip `0f4f04e`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은 trend-surface-pass 가 본 것과 같다 — **복원처가 같은
커밋 안에서 함께 열렸다**: #84 가 카드를 세우며 PR 본문(③)에 설계 근거를 절마다 적었고(「검색은 받아 둔 목록을 거른다 —
서빙이 검색어를 받지 않으므로 … 목업도 같은 자리에서 `rows()` 의 `indexOf` 로 거른다」·「카드는 응답 바깥에 둔다 — 축을
바꾸면 `data` 가 잠시 비는데 …」·「5칸으로 두면 격자에 7칸이 빈 채 혼자 남아 col-12」·「끈 선택 자체는 기억한다(잊으면 매번
다시 꺼야 한다)」), 같은 커밋이 설계 트래커 「해소된 등재」 #84 행과 doc-tracker 2026-09 변동 이력 행에 같은 사실을 산문으로
옮겼으며(②), 여정 문서 §4 표가 「중도 이탈 → 다음 진입 시 마지막 조회 조건 복원 | `STP-open-brief`」를 한 행에 적는다(②).
테스트 쪽 9줄은 테스트 이름 일곱(`… without re-querying serving`·`… instead of claiming there is no data`·`… across a closed tab`·
`… but remembers that choice`)과 단언이 복원한다(①, trend-rejudge-pass 의 「나레이션」 처분). `readStoredBrief`·`storeBrief` 의
catch 2줄은 `Trend.tsx` 의 같은 자리(#80 `aca481c`, trend-surface-pass 유지)와 **바이트 동일한 사본**이라 첫째는 지우고 둘째는
`eslint` `no-empty` 가 빈 블록을 잡으므로 주인 지목 포인터로 정정했다(`client.ts` 선례). **유지 8줄**(정정 3 포함) 중 **판단 분기 1**:
`BRIEF_KEY` 앞 수명 근거 3줄은 PR #84·doc-tracker·트래커 #84/#87 행이 축자로 적어 복원되나, `Trend.tsx:81-82` 가 이 주석을
이름으로 「근거의 주인」이라 지목하고 trend-rejudge-pass 가 그 전제로 `Trend.tsx` 쪽을 2줄로 줄였으므로 지우면 그 포인터가
없는 것을 가리키는 거짓 주석이 된다 — `Trend.tsx` 는 이 패스의 표적 밖이라 **남기고**, web 묶음이 두 파일을 함께 열 때
포인터를 트래커 #87 행으로 옮기며 한 번에 처분한다. 나머지 유지는 `STP-open-brief` 앵커 1(뒤 문단 둘은 트래커 「기간·단위
컨트롤」 행·PR 본문이 복원해 걷음, 지문 −0) · 「대소문자를 구분하는 것까지 목업과 같다」 1(의도된 목업 동등성은 어느 문서에도
없다) · `afterEach` 하네스 사실 1 · 카드 문면 편집 가드 1. 이 패스는 행을 신설하지 않고 2행을 갱신했다(138 그대로). ⑴ 의
`scripts/check-data-format-change.py` 10줄은 복원처(PR #75 · 같은 파일 docstring)가 다른 묶음이라 넣지 않았다 — 말미 집계의
조건절을 착지 tip 실측값으로 고쳐 다음 선에 둔다.

rollup-test-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 `python/packages/aggregation/tests/test_aggregate.py` +18」로
이름 붙인 한 파일의 **증가분 18줄**(`git blame` 계수: #38 `33e24ea` 5 · #62 `32faf64` 13, 옛 1줄 `bb1b56b` 은 두 PR 이 갈아 쓰지
않았다)만 겨눴고 **12줄을 지웠다**. **기준 커밋은 #105 착지 tip `1f508e1`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은
dash-brief-pass 와 다르다 — 복원처의 주인이 PR 본문이 아니라 **집계 구현 자신의 모듈 docstring**(`aggregate.py:16-30`, #38·#62 가
같은 커밋으로 쓴 것)이고, PR #38·#62 본문(③)과 doc-tracker AC3.3 착지 문단(②, 검증 좌표로 이 파일의 두 테스트 이름을 적는다)이
같은 문장을 옮겼다 — 테스트 주석은 그 넷째 사본이었다: 첫 버킷의 delta 0.0·단일점 spark(`:69`) · 일=시간 합·주=일 합·전 레코드
계상(`:164`·`:168`·`:172` — 단언 바로 위에서 단언을 산문으로 되풀이) · ISO 주 라벨(`:135`, `_bucket` docstring 이 주인) · finest
first 서술(`:149`) · 코퍼스의 달력 사실(`:108-109` — 단언 `_bucket(…, "week") == "2026-W26"`/`"2026-W27"` · `weeks[W26] == days[23] +
days[28]` 이 그대로 적는다). `# ── AC3.3 rollups ──` 구분선(`:103`)은 journey-gate-pass 의 `# ── R10 ──` 유지와 갈렸다 — 그쪽은
복원처 없음이었고 여기는 doc-tracker 가 AC3.3 좌표로 이 파일의 롤업 테스트를 이름 붙인다. **정정 3자리**(2→1 · 7→2 · 2→1)는
「왜 그 모양으로 단언하는지」만 남겼다 — 이진 분수 코퍼스라 반올림 없이 단언한다 · 두 경계(일 안의 두 시간·주 경계)를 일부러
걸친 코퍼스 · finest first 인 이유(첫 단위에서 멈추는 독자가 기본 단위를 받는다). **유지 6줄** 중 **판단 분기 1**: 인라인 AC 태그가
붙은 서술 2줄(`:73` `%p (AC3.3)` · `:78` `raw_count (AC3.8)`)은 서술은 복원되나 태그가 잇는 귀속이 doc-tracker·PRD 어디에도
없어, 같은 파일 `:98` `(AC3.4)` 의 initial-pass 판정과 aggregation-harness-pass·lineage-rejudge-pass 의 인라인 태그 승계대로
남긴다. 이 패스는 행을 신설하지 않고 1행을 갱신했다(138 그대로). ⑴ 의 `scripts/check-data-format-change.py` 10줄은 dash-brief-pass
와 같은 이유로 넣지 않았다.

pin-guard-pass는 전수가 아니라 **3파일 표적 재판정**이다(핀 메커니즘을 되풀이한 자리). 줄 수는 그 시점의
풀 전체 값이고, 판정한 것은 세 파일뿐이다. 그 세 파일 안에도 **이 패스가 판정하지 않은 주석**이 있으면
아래 파일별 행의 판정 칸에 그 사실과 추적처를 적는다 — 「각 행은 마지막으로 판정한 패스 기준」 규칙 때문에,
적지 않으면 파일 전체가 판정된 것처럼 읽힌다.

## 파일별 원장

| 파일 | 판정 전 | 제거 | 남음 | 판정 |
|---|---:|---:|---:|---|
| `Makefile` | 18 | 18 | 0 | 전량 제거 — 머리 11줄은 README「디렉터리 구조」「상태」재진술(골격·페이크 서술은 낡음), 18행은 `gen-check` 타깃이 복원, `## ---` 6줄은 구분선(help 파서 `^타깃:.*## `에 걸리지 않는 장식) |
| `contracts/codegen.py` | 23 | 18 | 5 | 구분선 배너 6개(18줄) 제거. 유지: 원시 타입 표 설명, ruff magic-trailing-comma 회피 근거, 드라이버의 `# Python`/`# Go` 절 표지(애매 — 유지) |
| `deploy/base/deployment.yaml` | 11 | 1 | 10 | **reprocess-trigger-pass** — 증가분 2줄(#97) 중 제거 1: 「submits batch Workflows with this identity (rbac.yaml); the token the kubelet mounts for it is all the Pod needs」 → 「Why a dedicated identity: rbac.yaml」 포인터 1줄(첫 절은 `rbac.yaml` lede 와 같은 문장, 둘째 절은 `argo.FromEnv` 가 SA 토큰 파일을 읽는 것이 복원). **pin-guard-pass** 판정(제거 2 · 가드 메커니즘 비의존 문면 · Gold 부재 시 빈 데이터셋·emptyDir 이음새 · 불변 태그라 IfNotPresent 근거 유지)은 그대로 |
| `deploy/base/kustomization.yaml` | 9 | 0 | 9 | **pin-guard-pass** — 줄 수 불변, 문면 정정 1곳: 거짓이 된 괄호절 `(where CI's \`pin\` job writes the main SHA)` 삭제(#35 이후 CI는 main에 쓰지 않는다). 유지 — `images:` 트랜스포머를 base에 두지 않는 이유(프리뷰·e2e 재태깅과의 중첩) |
| `deploy/base/rbac.yaml` | 11 | 8 | 3 | **reprocess-trigger-pass** — #97 신설. 제거 8줄: 머리 이야기 4줄+빈 줄(「submits Workflows from the batch WorkflowTemplate … Its data mount is read-only; every write to the lake is the batch's」 — `reprocess_trigger.go` 머리가 주인, doc-tracker ⑷ 축자) · 규칙 열거 1줄(아래 `rules:` 그대로) · 프로브 서술 3줄(「Whether this grant is in place is what `trigger.available` reports … buttons that 403」 — `argo.TemplateReachable`·`writeArgoError` doc 이 주인). 유지 3줄: 신원의 lede + 주인 포인터, 「verbs cut to exactly that」(최소 권한 의도) |
| `deploy/batch/cronworkflow-ingestion.yaml` | 27 | 10 | 17 | 제거 10줄 — AC1.1 배너(시나리오1↔이 파일은 doc-tracker e2e 매핑이 복원), ★suspend 착지 문단(README「배포」재진술 + 실제 `suspend: false`와 어긋난 낡은 서술). 유지: AC1.1 의무↔필드 대응·누락 보정 근거(스케줄 계약) |
| `deploy/batch/cronworkflow-pipeline.yaml` | 34 | 6 | 28 | 제거 6줄 — ★suspend 착지 이유(README「배포」재진술). 유지: 상호 배타 근거, 켜기 전 4단계(analyzer_version·attempted=/failed=·exit 3 등 README에 없는 운용 지식), 과금 경고 |
| `deploy/batch/kustomization.yaml` | 17 | 3 | 14 | 제거 3줄 — 두 스케줄 중 하나만 돈다(README「배포」재진술). 유지: base 밖에 두는 이유(kind e2e·Argo 부재), 클러스터 범위 컨트롤러, kustomizeconfig 연결 |
| `deploy/batch/kustomizeconfig.yaml` | 10 | 0 | 10 | 유지 — kustomize `images:` 트랜스포머가 WorkflowTemplate 경로를 모르는 함정과 선언 위치 근거 |
| `deploy/batch/rbac.yaml` | 6 | 0 | 6 | 유지 — workflowtaskresults 권한이 없으면 첫 단계가 실패하는 런타임 제약 |
| `deploy/batch/workflow-template.yaml` | 66 | 6 | 60 | **reprocess-trigger-pass — 증가분 24줄(#97 분 22 + #94 창의 온도 주석 2)만 판정**(파일 전체 아님). 제거 6줄: 머리 새 문단 6→4(두 템플릿이 무엇을 하는지는 **같은 파일 두 블록 머리**가 각각 적는다 — 한 파일 안의 두 벌; 남긴 것은 「스케줄이 아니라 서빙 Pod 가 부른다」와 `arguments.parameters` 기본값 계약) · `reprocess` 블록 7→5(범위·버전 서술은 아래 `args:` 와 doc-tracker ⑴; 남긴 것은 `sample` 0/양수 계약과 체크포인트 재개 → 과금되는데도 `retryPolicy: Always` 인 근거) · `publish` 블록 4→2(「pointer move … rollback is the same move back」 — doc-tracker ⑵ 축자; 남긴 것은 「Nothing is re-analyzed here, so a retry is safe」). 유지 18(증가분 중): 머리 4 · 파라미터 그룹 표지 2(판단 분기) · `reprocess` 5(그중 `sample` 계약 — 판단 분기) · `publish` 2 · exit 2 재시도 금지 2 · **온도 주석 2**(「GPT-5.x rejects any temperature but its own default (400 unsupported_value)」 — chat-completions 의 문서화되지 않은 동작). 이전 판정(initial-pass 머리 배너 3 · pin-guard-pass 가드 2 · aggregation-harness-pass AC3.2 블록 3)은 그대로 유효 |
| `deploy/overlays/preview/kustomization.yaml` | 30 | 0 | 30 | 유지 — efs StorageClass가 PVC 이름으로 access point를 재사용·연쇄 삭제하는 함정, Flux 분담, delete 패치가 이름 기준이라 새 CronWorkflow를 덮지 않는 함정. 머리의 serving/batch 두 절은 README「PR 프리뷰」와 겹치나 함정 서술과 한 덩어리라 판단 분기로 유지 |
| `deploy/overlays/prod/batch-pvc.yaml` | 13 | 4 | 9 | 제거 4줄 — 체인 연결 시 공유 방식 결정 예고(README「배포」재진술, 스스로 'see README'). 유지: RWO 멀티어태치 근거, storageClassName 부재 의도 |
| `deploy/overlays/prod/kustomization.yaml` | 32 | 12 | 20 | 제거 12줄 — `kubectl apply -k` 적용법·외부 노출(README「배포」재진술), 두 CronWorkflow 인계 목록(README·cronworkflow-pipeline.yaml 재진술). 유지: Recreate/RWO 근거, template-wide 볼륨, 주기 오버라이드 패치 예시(cronworkflow-ingestion.yaml이 가리키는 위치) |
| `deploy/overlays/prod/pvc.yaml` | 1 | 0 | 1 | 유지 — storageClassName 부재 의도(프리뷰의 efs 함정과 대비되는 의도적 기본값). **파일 소멸** — #92(`60a8176`)가 서빙 볼륨을 배치 claim `econ-batch-data` 로 재배선하며 삭제했다(e2e-runner-pass 기록). 행은 이력으로 남기고 지문 파일 집합에서는 빠진다 |
| `go/cmd/serving/main.go` | 6 | 2 | 4 | **reprocess-trigger-pass** — 증가분 2줄(#97) 제거: 「In a Pod the reprocess console can submit batch Workflows; elsewhere it reports the trigger as unavailable and draws no controls」 — 바로 아래 `argo.FromEnv()` 분기와 두 `log.Printf` 가 실행 시점에 같은 말을 하고, `FromEnv` doc·`reprocess_trigger.go` 머리가 주인. 유지 4(initial-pass): 패키지(command) doc 주석, 프로브를 액세스 로그에서 빼는 이유 |
| `go/internal/argo/argo.go` | 36 | 7 | 29 | **reprocess-trigger-pass** — #97 신설. 제거 7줄: 패키지 주석 본문 5(「The serving Pod never writes the lake … This package is that one capability」 — `reprocess_trigger.go` 머리 18~23행이 주인, doc-tracker ⑷ 축자; client-go 미사용 **이유** 2줄은 여기에만 있어 유지) · `FromEnv` 셋째 줄(`probeArgo` nil 분기 문면) · `New` 둘째 줄(테스트 픽스처는 `reprocess_trigger_test.go` 가 주인). 정정 1(`Kind` 값 열거 걷음, 지문 −0). 유지 29: 이름 doc 첫 줄 11 · **환경 변수 표 3줄**(`ECON_ARGO_*` 의 유일한 문서) · `Annotations` 설계 이유 · `Submit` 타임아웃 근거 2 · `List` 정렬 근거 2 · `TemplateReachable` 「무엇을 증명하는가」 3(프로브의 주인) |
| `go/internal/handlers/handlers.go` | 245 | 5 | 240 | **reprocess-trigger-pass — 증가분 10줄(#94 분 3 + #97 분 7)만 판정**(serving-handlers-pass 가 판정한 235줄 무접촉). 제거 5줄: 패키지 주석 9~11행 3→1(「its three POSTs submit the batch as Argo Workflows … never writes the lake」 — `reprocess_trigger.go` 머리가 주인; 다른 항목과 같은 「(파일) 포인터」 꼴로 줄임) · `argo` 필드 doc 둘째 줄(`probeArgo` nil 분기) · `now` 필드 doc 둘째 줄(#94 분 — `reprocess_test.go:15-16` 픽스처 시계 주석이 주인, 직전 패스가 판단만 적고 보류) · `WithArgo` doc 2→1. 유지 5: `argo`·`now`·`trigger` 각 1줄 · `New` 「with no workflow trigger」 · `WithArgo` 1줄. **제거가 전부 `Register` 위라 설계 트래커의 `handlers.go:34`·`:30-37` 인용(#94 부터 낡음)은 더 밀렸다(`Register` 45행) — 재핀은 트래커 소유자(mockup-render) 몫.** serving-handlers-pass 의 판정(제거 5 · 정정 3곳 · 패키지 주석 본문 6줄 판단 분기)은 그대로 유효 |
| `go/internal/handlers/handlers_test.go` | 120 | 1 | 118 | **serving-handlers-pass — 재판정.** 직전 판정(initial-pass, 14줄) 이후 #45·#53·#62·#66·#70 이 106줄을 들였고 파일 전체를 다시 판정했다. 제거 1줄 — `// --- trace (slice 9) ---` 구분선(제거 유형 ④ + 괄호 안은 ③ 「작업 흔적」. 절 이름은 바로 아래 `writeLineage`·`TestTrace*` 이름이 복원하고, **같은 패키지에서 initial-pass 가 지운 `// --- … ---` 3줄의 재발**이다). **문면 정정 1곳(1줄 감소)**: `TestTraceJoinsBronzeBodyAndSilverAnalysis` 머리의 「Before slice 9 this returned a fixed string with no lake read behind it」를 걷었다(유형 ③ — doc-tracker 슬라이스 9 행이 「`/api/trace` 는 일곱 라우트에 남은 두 자기선언 stub 의 하나였고」로 축자 복원). 유지 118줄 — **전량이 「테스트가 왜 그 모양으로 단언하는지」·「픽스처가 왜 그 모양인지」**이고 `Sentiment.test.tsx`·`Fairness.test.tsx`·`Trend.test.tsx`·`Dashboard.test.tsx` 의 전량 유지와 같은 판정이다(앞 패스들의 유지를 뒤집지 않는다): 픽스처 판별력 표 5종(`writeMultiBucketGold` 는 **가장 큰 점유율을 낡은 버킷에** 둬 필터 누락이 즉시 드러나게 했다 · `writeTrendGold` 는 네 대상 × 세 버킷 + 주 롤업으로 「차트가 잘못 그려질 모든 방식에 증인」 · `writeRolledUpGold` 는 같은 레코드 세 벌로 3중 계상 유발 · `writeSkewedGold` 는 원시 60/100 인데 정규화 0.25 라 두 방식이 어긋난다 · `writeMixedUnitSentiment` 는 일 롤업 키가 사전순 최대) · 단언 설계(낡은 0.9 가 새지 않는다 · 축이 비면 옛 버킷을 빌리지 않는다 · 네 비율 합 1 **과** 미분석 0.2 를 함께 단언 · 원시 합이라 3중 계상이 8 대신 24 로 드러난다 · 두 세는 방식이 어긋나야 AC3.8 「구분 표기」에 내용이 있다) · **단위/e2e 층 분담**(e2e 픽스처가 의도적으로 단일 버킷이라 두 버킷을 공급하는 단위 테스트만이 「핸들러가 하나를 고른다」를 증명한다) · 롤업 전용 Gold 가 고장이 아니라는 판독. AC 태그·AC 인용은 판단 분기로 유지 |
| `go/internal/handlers/reprocess.go` | 51 | 15 | 36 | **reprocess-trigger-pass — 직전 패스가 보류한 머리(#97 이 갈아 쓴 12~31행 20줄)를 판정했다.** 제거 15줄: 여정 재진술 3(「bump the analyzer version, re-analyze … publish or roll back」 — 여정 문서 ②·`reprocess_trigger.go` 머리) · 「What this endpoint answers」 목록 12(scope·versions·compare·trigger — **같은 파일 `bucketsOf`·`versionsOf`·`compareVersions`·`compareRow` doc 과 `reprocessTrigger` 필드 doc 이 항목마다 주인**, 한 파일 안의 두 벌). 정정 1(첫 줄 슬라이스 배너). 유지 5: 라우트 lede · 「읽기만 하는 이유 + 쓰기 쪽 위치」 3줄(파일 분할의 이유는 어느 doc 도 되풀이하지 않는다). 나머지 31줄은 **reprocess-surface-pass** 판정 그대로(#94 신설, 제거 13 — `ThroughputPerMinute`/`EtaMinutes` 4·`scopeBucket` 1·`Reason` 열거 2·`UnanalyzedShare` 3→1·`compareVersions` 4→2·정렬 앞 2; 유지 — 이름 doc 첫 줄 8 · 데이터 계약의 비자명한 성질 · 응답 계약의 「왜 이 값인가」 · 방어적 계산의 의도; 판단 분기 `versionsOf` 기본 목표 근거). 이 패스 뒤 파일은 36줄 = 실측 |
| `go/internal/handlers/reprocess_test.go` | 22 | 0 | 22 | **reprocess-surface-pass** — #94 신설, 전량 유지. 픽스처 시계(「Every timestamp below is written relative to it so the range windows are exact」 — `handlers.go` `now` 필드 doc 을 지우며 이 자리를 **설명의 주인**으로 지목) · 픽스처 판별력(「Three KR observations across two cycles plus a US one and a stale KR one. Silver holds v3 for two …」 · 「Two v3 records ten minutes apart: 0.2 records/min, one record left -> 5 min」 · 「v2: 기준금리 x3, 가계부채 x1 -> 75% / 25%」) · 단언 설계(「the fallback is named in the response so the screen shows what was actually measured」 · 「the screen must not draw a before/after table out of one column」 · 「An explicit ?version= is the "after" side even when it is the older one」 · 「A version nobody has run yet has no after side to draw」). `handlers_test.go`·`Trend.test.tsx` 전량 유지와 같은 판정 |
| `go/internal/handlers/reprocess_trigger.go` | 29 | 3 | 26 | **reprocess-trigger-pass** — #97 신설. **이 파일 머리 18~23행이 「서빙은 레이크를 쓰지 않는다 · 세 단계 = Workflow 하나씩 · 쓰는 것은 배치」 이야기의 설명의 주인**이다(`argo.go`·`handlers.go`·`main.go`·`rbac.yaml`·`deployment.yaml` 의 사본을 이 패스가 걷었다; web 쪽 사본은 다음 패스). 제거 3줄: 프로브 문단의 배선·RBAC 열거 1(주인은 `argo.TemplateReachable` doc) · `ServingVersion` doc 2(주인은 `store.ReprocessDecision` doc, 「없으면 최신 행」은 doc-tracker ⑵·`test_serving_version.py`). 정정 1(머리 슬라이스 배너 걷음). 유지 26: 주인 문단 6 + 제품 규칙 4 · `probeArgo` 캐시 이유 · `publishRequest` 의 「둘 다 거부하는 이유」(판단 분기) · `writeArgoError` 403 통과 이유 · 나머지 이름 doc |
| `go/internal/handlers/reprocess_trigger_test.go` | 6 | 0 | 6 | **reprocess-trigger-pass** — #97 신설, 전량 유지: `fakeAPIServer` 가 무엇을 흉내 내는가 · 「One second apart, the way the API server's second-resolution timestamps would separate two real submissions」(픽스처가 실환경과 갈리는 지점) · 「The decision log is a lake read, so it is reported either way」·「Both runs are listed, newest first」(단언 설계) — `reprocess_test.go`·`handlers_test.go` 와 같은 판정 |
| `go/internal/static/static.go` | 6 | 0 | 6 | 유지 — 패키지·export doc 주석(SPA 폴백 동작 설명) |
| `go/internal/store/store.go` | 36 | 0 | 36 | **reprocess-trigger-pass — 증가분 7줄(#97) 판정, 전량 유지**: `Analyses` doc 본문 3줄(「Silver holds one row per (record_id, analyzer_version) …」 — doc-tracker ⑴ 이 축자로 적어 경로 ②가 성립하나 lineage-surface-pass 가 이 파일의 데이터 계약 doc 을 설명의 주인으로 둔 선례를 따랐다, **판단 분기**) · `ReprocessDecision` doc 2줄(「The last one names the version Gold serves」 — 이 패스가 `reprocess_trigger.go` `ServingVersion` 사본을 걷으며 **주인으로 지목**) · `ReprocessDecisions` doc 2줄(「empty if absent」는 `readJSONL` 계약). lineage-surface-pass 의 전량 유지 판정(29줄)은 그대로 |
| `go/internal/store/store_test.go` | 6 | 4 | 2 | **lineage-surface-pass** — 제거 4줄: ⑴ `Lineage needs Bronze and Silver, not Gold … one body can back several observations (AC1.7)` 3줄은 같은 패키지 `store.go` 의 패키지 주석과 `NewsBodies` doc 주석이 양쪽 절을 그대로 갖고 있다(제거 유형 「다른 파일 주석의 재진술」 — 설명의 주인은 구현 쪽), ⑵ `Bronze and Silver are absent until the pipeline has run, exactly like Gold.` 1줄은 바로 아래 테스트 이름 `TestMissingBronzeAndSilverReadEmpty` 가 그대로 복원하고 `store.go` 의 `(empty if absent)`·`readJSONL` doc 주석이 한 번 더 적는다. 유지 2줄 — `A null sentiment is a value, not a decode failure` (이 테스트가 **왜** null 디코드를 성공으로 단언하는지. 테스트 이름은 무엇을 하는지만 말한다) |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` | 12 | 1 | 11 | **aggregation-harness-pass** — 제거 1줄: `# Percentage points, matching the contract's \`delta\` doc.` — 주석이 자기 복원처를 이름으로 지목하고 원본(`contracts/gold/subject_trend.avsc` `delta` 필드 `doc`)이 AC 번호까지 달아 더 정확하다(정책 doc 주석 항의 `contracts/` 스키마 재진술). 유지: 중첩 dict 형태 표기, 버킷 키 사전식=시간순 근거, "없는 버킷은 0이 아니다", AC3.4 분리 근거(태그는 판단 분기) |
| `python/packages/aggregation/src/econ_aggregation/cli.py` | 3 | 0 | 3 | **scenario-spec-pass** — 전량 유지. 세 버킷 단위를 한 데이터셋에 싣는 이유와 "한 차트를 그리는 소비자는 단위 하나를 먼저 고른다"는 소비 규약 — 평평하게 읽는 소비자가 중복 계상하는 자리라 코드·계약 어느 쪽으로도 복원되지 않는다 |
| `python/packages/aggregation/tests/test_aggregate.py` | 19 | 12 | 7 | **rollup-test-pass — 재판정.** 직전 판정(initial-pass) 뒤 남음이 1 이었는데 `#38 (squash)` 가 delta·spark 실값화 테스트로 5줄, `#62 (squash)` 가 AC3.3 롤업 테스트로 13줄을 들였고 그 증가분 18줄을 판정했다. 제거 12줄 — 첫 버킷 delta 0.0 서술 1(`aggregate.py:18-20` 같은 문장 · PR #38 「정직하게 퇴화」 · 단언) · `# ── AC3.3 rollups ──` 구분선 1(아래 `test_rollup_*` 이름 · doc-tracker 가 AC3.3 좌표로 이 파일의 두 테스트를 이름 붙임) · 코퍼스 설계 7→2(달력 사실 「06-23 Tue·06-28 Sun = W26 · 06-29 Mon = W27」는 단언 `_bucket(…, "week")`·`weeks[W26] == days[23] + days[28]` 이 적음) · ISO 주 1(`_bucket` docstring `:53-58`·`:66-67` 이 주인 · PR #62 「ISO 주차」) · finest-first 2→1(테스트 이름 · `aggregate.py:42`·`:193`·`:200`) · 합산 단정 서술 3(단언 바로 위 — `aggregate.py:25-26` · doc-tracker 「일=시간 합 · 주=일 합 · 단위마다 전 레코드 계상」 · PR #62 축자; 「all five」는 개수 표현) · 코퍼스 서술 2→1(`_bronze(hour=14/15)` 배분과 단언 `0.5`·`0.75`·`-25.0`). **유지 6줄**: 정정 후 「이진 분수 코퍼스라 반올림 없이 단언한다」 1 · 「두 경계를 일부러 걸친 코퍼스」 2 · 「첫 단위에서 멈추는 독자가 기본 단위를 받는다 (AC3.3: 기본 단위는 시간)」 1 — 셋 다 「왜 그 모양으로 단언하는지」로 어느 문서·PR 에도 없다 · **판단 분기** 인라인 AC 태그 서술 2(`%p (AC3.3)` · `raw_count (AC3.8)` — 서술은 단언·docstring·PR #38 이 복원하나 태그의 귀속은 어디에도 없어 `:98` 의 initial-pass 판정과 세 패스의 인라인 태그 승계대로 유지). **initial-pass** 판정(옛 1줄 `(AC3.4)` 유지 — 테스트 의도(AC 태그 판단 분기))은 그대로 |
| `python/packages/aggregation/tests/test_serving_version.py` | 2 | 0 | 2 | **reprocess-python-pass** — #97 신설. 유지 2줄: 「결정 없음 → 레코드의 최신 버전이, 그것도 하나만 서빙」·「v1 롤백은 포인터 이동이고 v2 행은 Silver 에 그대로」 — 각각 바로 아래 `_gold_subjects == {"신주제"}` 와 롤백 뒤 단언이 왜 그 값인지(doc-tracker ⑵ 는 계약을 적지만 이 픽스처의 어느 행이 어느 단언을 만드는지는 여기뿐) |
| `python/packages/analysis/src/econ_analysis/cli.py` | 16 | 8 | 8 | **reprocess-python-pass — 파일 전체 재판정**(initial-pass 의 7 → #73 +4 · #97 +8/−3 = 16). 제거 8줄: 「본문은 content-addressed 저장소에 한 번, 관측은 해시로 참조(AC1.4, AC1.7)」 1(PRD ingestion AC1.4·AC1.7 축자 — initial-pass 유지를 뒤집음) · 「재개 의미: 목표 버전이 이미 덮은 것이 체크포인트」 1(doc-tracker ⑶ · PR #97 3항 · `test_scoped_run_skips_records_already_at_the_target_version`) · 응답 캐시 머리 3(`llm.reply_cache_key` docstring 이 주인 — 다른 파일 주석의 재진술) · 「전 레이크 실행은 대체된 버전을 걷되 결정이 서빙 중인 버전은 남긴다」 2(doc-tracker ⑴ · PR #97 1항 축자 · `store_analyses` docstring) · 「빈 쓰기도 데이터셋을 정리한다」 1(`store_analyses` docstring 「pruned … Bronze record is gone」 · `test_silver_rows_bronze_no_longer_holds_are_pruned`). 유지 8줄: `#:` 속성 doc 2(`EXIT_CONFIG`·`EXIT_ALL_CALLS_FAILED` — 종료 코드 의미) · 표본 시드 1(재개된 표본이 같은 레코드를 뽑는 이유 — 유일 지식) · 「전송을 먼저 만든다 — 키 부재는 운영자 오류지 분석 결과가 아니라 레이크에 닿기 전에 실패」 2(initial-pass 승계, 순서의 이유) · 「모델이 답한 것은 배치가 실패해도 남긴다」 1(판단 분기 — 패스 문서) · 「아무도 답하지 않음: 지금 쓰면 전량 미분석 배치가 AC2.5 신호를 흐린다 — 체크포인트를 남기고 멈춘다」 2(initial-pass 승계, #97 이 갈아 쓴 문면) |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | 4 | 0 | 4 | 유지 — 페이크 모델의 판정 규칙 근거(AC 태그 판단 분기) |
| `python/packages/analysis/src/econ_analysis/llm.py` | 2 | 0 | 2 | 유지 — 저신뢰 임계 공유, 카탈로그 정규화 방침 |
| `python/packages/analysis/tests/test_cli.py` | 8 | 0 | 8 | **reprocess-python-pass — 파일 전체 재판정**(initial-pass 의 5 → #73 +1 · #97 +2 = 8). 유지 8줄 전량 — 테스트 의도: 기본값 전환 3(「`--analyzer` 없음 = llm, 키 없으면 거부」·「레이크에 닿기 전 중단 — 빈 Silver 조차 없다」·「좋은 fake 런이 먼저 착지(llm 이 기본이라 명시)」) · 장애 가드 2(「장애가 실제 분석을 전량 미분석 배치로 바꾸지 않았다」·「전부 미분석이지만 실패는 0 — 가드가 걸리면 안 된다」) · 재사용 1(「매시간 주기가 같은 기사를 다시 관측 — 두 번째 런은 다시 묻지 않는다」, #73) · #97 의 2(「다음 전 레이크 런은 아직 fake-v1(코드 미상향)」 — 왜 `{fake-v1, fake-v2}` 둘 다 남는지 · 「첫 배치의 행이 둘째 배치의 장애를 살아남았다」 — 왜 `["r1"]` 인지). 각 줄이 바로 아래 단언이 왜 그 값인지를 들고, 그 값은 이름만으로 복원되지 않는다 |
| `python/packages/analysis/tests/test_fake_llm.py` | 2 | 0 | 2 | 유지 — 테스트 의도(AC 태그 판단 분기) |
| `python/packages/analysis/tests/test_llm.py` | 8 | 0 | 8 | 유지 — 분석 결과 vs 운영 실패 구분 근거(AC 태그 판단 분기) |
| `python/packages/core/src/econ_core/domain.py` | 3 | 0 | 3 | 유지 — 상수 묶음 표지 3줄(재진술성이나 짧고 애매 — 유지) |
| `python/packages/core/src/econ_core/storage.py` | 3 | 3 | 0 | **reprocess-python-pass** — #97 신설. 전량 제거 — `write_records` 머리 3줄(「대상 옆에 쓰고 이름을 바꿔 넣는다: 쓰는 도중 여는 독자(서빙 Pod 가 이 볼륨에서 Gold 를 읽는다)는 이전의 완전한 파일을 본다」): 바로 아래 `staging = …tmp` · `os.replace(staging, target)` 이 메커니즘의 주인(①), doc-tracker 2026-09 슬라이스 9 「좁혔지만 닫지 않은 창」이 문제(「truncate+write 라 … 동시 요청이 잘린 줄을 읽을 수 있다 — 원자적 교체(임시 파일 → rename)」)를, 슬라이스 10 후반부 ⑴ 이 처방(「임시 파일 → `os.replace` 라 서빙이 쓰는 도중의 잘린 줄을 읽지 않는다」)을 축자로 적고(②), PR #97 본문 1항이 되풀이(③); 서빙이 같은 볼륨을 읽기 전용으로 마운트한다는 것은 doc-tracker 슬라이스 9·⑷ 와 `deploy/` 매니페스트가 복원. 남음 0 이라 지문에서 빠지나 행은 남긴다 |
| `python/packages/core/tests/test_silver.py` | 7 | 0 | 7 | **reprocess-python-pass** — #97 신설. 유지 7줄 전량 — 테스트 의도: 「둘째 버전이 첫째 옆에 착지 — `STP-run-reprocess` 「병존」」·「같은 레코드·같은 버전은 두 행이 아니라 한 행(재개가 중복 계상하지 않는다)」(왜 `(3, 0)` 뒤에 `written == 3` 인지) · 「v3 전 레이크 런이 r1 만 건드림: r1 의 v1 은 가고 v2 는 서빙 버전이라 남고 r2 는 무접촉」 2(왜 `(3, 1)` 과 세 쌍인지) · 「Bronze 가 r2 를 버림: Silver 행이 더는 되짚어지지 않아(AC2.6) 걷힌다」 · 「v2 서빙: r2 는 재처리된 적 없어 최신(v1) 행이 그대로 서빙」·「결정 없음: 모든 레코드의 최신 행」. 계약은 doc-tracker ⑴⑵ 가 적지만 픽스처의 어느 행이 어느 단언을 만드는지는 여기뿐 |
| `python/packages/core/tests/test_storage.py` | 3 | 0 | 3 | 유지 — 테스트 의도(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | 2 | 0 | 2 | 유지 — content-addressed 병합 규칙(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` | 1 | 0 | 1 | 유지 — 안정 정렬 의도 |
| `python/packages/ingestion/src/econ_ingestion/sources.py` | 4 | 0 | 4 | 유지 — 페이크 카탈로그 설계 근거(목업 연동·결정성) |
| `python/packages/ingestion/tests/test_default_feeds.py` | 3 | 0 | 3 | 유지 — 테스트 의도 |
| `python/packages/ingestion/tests/test_feeds.py` | 21 | 0 | 21 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `python/packages/ingestion/tests/test_sources.py` | 10 | 0 | 10 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `scripts/check-journey-flow.js` | 45 | 4 | 41 | 제거 4줄 — `/* ===== … ===== */` 구분선. 유지: 정적 대조로 안 되는 이유·자기참조 금지·fail-closed 근거, (a)~(h) 규칙 표지(규칙 문자로 모델 정의와 대응 — 애매, 유지) |
| `scripts/check-journey-mockup.py` | 65 | 20 | 45 | journey-gate-pass — #47·#61 이 들인 23줄만 판정, 20줄 제거(R10 머리 6 · R11 머리 2 · `CLAIMS` 튜플 모양 1 · README 스캔 2 · R12 머리 9 — docstring 규칙 항·바로 아래 코드·mockup 인덱스 「서술 절의 숫자 규약」 문단·PR #47/#61 본문이 축자 복원). 남은 45 = initial-pass 가 남긴 38(오탐 회피·헤더 판정 방식·래칫·모델 정의 인용) + `#36` 의 4(「조각(`#STP-`)을 무시하면 상대 여정의 1단계로 떨어지는 링크를 게이트가 통과시킨다」 — regression-pass 유지, 복원 불가) + 규칙 앵커 3(`# ── R10/R11/R12 ──` 머리 1줄씩, `# R6 —`·`# R7 —` 와 같은 꼴) |
| `scripts/check-mockup-render.py` | 3 | 3 | 0 | regression-pass — 전량 제거. 지문에 걸린 주석이 구분선 배너 3줄뿐이었다(`# ---- SSOT 파싱`·`CSS 파싱`·`판정`). 절 이름은 바로 아래 함수 이름이 복원한다(`definitions()` / `css_rules(css)` / `check_r3()`·`check_r5()`). 파일 설명은 모듈 docstring에 있고 docstring은 지문의 사각지대라 이 파일은 지문에서 빠진다 |
| `scripts/journey-scenarios/JRN-axis-contrast.js` | 28 | 4 | 24 | 제거 4줄 — 러너/시나리오 역할 분담 설명(check-journey-flow.js 머리 주석의 재진술). 유지: 조작별 의도·jsdom `.value` 함정 |
| `scripts/journey-scenarios/JRN-daily-scan.js` | 29 | 0 | 29 | **product-surface-pass** — 전량 유지. 머리는 훅 목록 4줄뿐이고 역할 분담 산문이 없다(= initial-pass가 `JRN-sentiment-shift.js`에서 유지 판정한 형태 그대로). 나머지 25줄은 조작별 의도(`/* 화면 2 → 3. 전진은 대상 선택을 요구하므로 … */`), 상태 라벨 12개(`empty-window`·`no-baseline` 등 — 어떤 조작으로 그 상태에 닿는지), jsdom `.value` 함정으로 복원 불가 |
| `scripts/journey-scenarios/JRN-ingestion-recovery.js` | 33 | 0 | 33 | **product-surface-pass** — 전량 유지. 같은 사유. 상태 라벨이 원인 분기(`source-outage / origin-gone`)·재실행 부작용(`dup-again — 덮어쓰기로 실행하면 중복이 다시 쌓인다`)까지 담아 러너·목업 어느 쪽으로도 복원되지 않는다 |
| `scripts/journey-scenarios/JRN-logic-backfill.js` | 38 | 0 | 38 | **product-surface-pass** — 전량 유지. 머리의 여정 뼈대 3줄(`표본이 전량의 관문` — 여정 문서 `STP-dry-run` 인용)은 **판단 분기**로 남긴다: 앞 절은 여정 문서가 복원하나 뒤 절(「그래서 2·3단계 전진이 기본 비활성이고 그것을 여는 것은 화면 안의 실행 버튼이다」)이 이 파일의 `unlock` 구조를 설명해 한 덩어리다. 나머지는 조작별 의도·상태 라벨 |
| `scripts/journey-scenarios/JRN-sentiment-shift.js` | 27 | 7 | 20 | 제거 7줄 — 역할 분담 재진술(러너 머리 주석; '두 가지'라 쓰고 넷을 나열한 낡은 서술 포함). 유지: 시나리오 훅 목록(inputs/states/unlock/renders) |
| `scripts/journey-scenarios/JRN-spike-verification.js` | 29 | 4 | 25 | regression-pass — 제거 4줄: 머리의 러너/시나리오 역할 분담 산문 3줄(`check-journey-flow.js` 「── 구조 ──」 절의 재진술) + 매달린 ` *` 1줄. `JRN-axis-contrast.js`와 같은 식별 1줄 형태로 줄였다. 유지: 훅별 `(c)(d)(e)(h)` 주석 4줄, 조작별 의도, jsdom `.value` 함정 |
| `tests/e2e/check_scenario_mapping.py` | 22 | 4 | 18 | 제거 4줄 — `# --- … ---` 구분선. 유지: 판정 규칙 근거(첫 열만 읽는 이유, 등재 공백을 쓰는 이유 등) |
| `tests/e2e/fixtures/feeds/server.py` | 11 | 0 | 11 | **scenario-spec-pass** — 전량 유지. HTTP 상태 줄이 latin-1 이라 한글 message 를 넣으면 503 이 아니라 전송 실패로 관측되는 함정, `__flaky__` 카운터가 유일한 상태라는 사실, `__slow__` 하나가 수집을 직렬로 세우지 않게 스레딩 서버를 쓰는 근거 — 전부 런타임 제약이라 복원 불가 |
| `tests/e2e/fixtures/llm/server.py` | 13 | 0 | 13 | **scenario-spec-pass** — 전량 유지. 봉투 안 `content` 가 **문자열**이어야 `parse_response` 의 파싱 계약이 e2e 에서 실행된다는 근거(더블이 대신하면 그 층이 영영 검증되지 않는다), readinessProbe 가 진행 중 요청 뒤에 줄 서지 않게 하는 근거, latin-1 함정(피드 더블을 출처로 지목하는 형태라 재진술이 아니다). **판단 분기**: `do_<METHOD>` 디스패치 규약 1줄이 두 더블 양쪽에 있으나 어느 쪽이 설명의 주인인지 정해지지 않아 양쪽 모두 유지 |
| `tests/e2e/k8s/batch/aggregate-job-rollup.yaml` | 10 | 0 | 10 | **unrowed-files-pass** — 전량 유지. 첫 줄의 「`aggregate-job.yaml` 과 **데이터 루트만** 다르다」는 두 매니페스트를 나란히 읽으면 복원되나(경로 ①), 같은 덩어리가 「수집 시각만 여러 버킷으로 흩어져 있으므로 이 Job 이 쓴 Gold 는 세 단위가 모두 버킷을 여럿 갖는다」는 **기대 산출물의 근거**로 이어진다 — 그 결론은 이 파일에도 `timeshift-job.yaml` 에도 적혀 있지 않고 두 Job 의 조합에서만 나온다. 줄 단위로 끊으면 근거까지 잘리므로 「애매하면 남긴다」로 유지(`ingest-job.yaml` 선례). 유지: 루트를 기준 상태와 가르지 않으면 `write_records` 가 데이터셋을 교체해 이미 매칭된 spec 들이 보는 Gold 가 사라진다는 함정 |
| `tests/e2e/k8s/batch/aggregate-job-skew.yaml` | 5 | 0 | 5 | **batch-harness-pass** — 전량 유지. 기준 상태와 루트만 다르게 두는 이유(같은 코드가 같은 설정으로 돌아야 두 Gold의 차이가 집계 로직의 변덕이 아니라 입력량 차이로 읽힌다)와, 한 루트에서 두 번 돌리면 `write_records`가 데이터셋을 교체해 기준 상태가 사라진다는 함정. 둘 다 매니페스트·테스트 문서 어느 쪽으로도 복원되지 않는다 |
| `tests/e2e/k8s/batch/aggregate-job.yaml` | 11 | 2 | 9 | **batch-harness-pass** — 제거 2줄: 머리의 과거형 프레이밍(「이 Job이 서면서 `python/packages/aggregation`이 e2e에서 처음으로 실제 실행된다. 그 전까지 서빙은 손으로 쓴 픽스처 Gold를 입력으로 썼으므로 … 한 번도 돌지 않았다」). aggregation-harness-pass가 `deploy/batch/workflow-template.yaml`에서 지운 「Until this template existed … no scheduled path ever produced Gold」와 **같은 유형·같은 복원 경로**(④ 커밋 이력)다. 유지 9줄: 배치 이미지 ENTRYPOINT가 `econ-ingestion`이라 집계는 `command`로 덮어써야 한다는 근거, 상류 더블이 필요 없는 이유와 그래서 이 Job에는 mock-exception이 붙지 않는다는 사실(부재의 근거는 코드가 복원하지 못한다) |
| `tests/e2e/k8s/batch/analyze-job-agg-skew.yaml` | 8 | 4 | 4 | **batch-harness-pass** — 제거 4줄: `ECON_LLM_MODEL`·`ECON_LLM_API_KEY`의 env 주석이 `analyze-job.yaml`의 것과 **바이트 동일**이다(제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」). 주인 지목은 주석 자신이 한다: 이 파일 머리가 `analyze-job-agg.yaml`을, 그 파일이 다시 `analyze-job.yaml`을 계약의 주인으로 적는다. 같은 두 env를 같은 값으로 쓰면서 이 주석이 없는 `analyze-job-v2.yaml`이 레포 안의 대조군이다. 유지 4줄: 기준 상태와 모든 설정이 같고 루트만 다른 이유, 부풀린 쪽에만 있는 여섯 건의 응답도 같은 묶음에 들어 있어 404(→ `failed>0`)가 나지 않는다는 픽스처 지식 |
| `tests/e2e/k8s/batch/analyze-job-agg.yaml` | 14 | 4 | 10 | **batch-harness-pass** — 제거 4줄: 위와 같은 env 주석 재진술. 유지 10줄: 응답 묶음을 `e2e-llm-agg`로 가르는 이유(분석 묶음과 기사 집합이 겹치지 않아 한 묶음에 섞으면 한쪽 기사를 지울 때 다른 쪽이 조용히 404로 무너진다), 인자를 주지 않아 기본값인 실 llm 분석기로 도는 이유(페이크로 돌리면 프롬프트 조립·응답 파싱·정규화·저신뢰 판정이 통째로 빠져 Gold까지 잇겠다는 전파 계약이 한 번도 실행되지 않는다) |
| `tests/e2e/k8s/batch/analyze-job-v2.yaml` | 7 | 0 | 7 | **batch-harness-pass** — 전량 유지. 재분석이 새 데이터셋을 만드는 것이 아니라 같은 Silver를 갱신하는 것이고 그 갱신이 추적 키를 잃지 않는지가 시나리오의 기대 결과라는 설계 근거. 같은 `ECON_LLM_*` env를 쓰면서 그 설명을 달지 않아 이 패스의 env 제거 판정에 **대조군**이 된다 |
| `tests/e2e/k8s/batch/analyze-job.yaml` | 12 | 0 | 12 | **batch-harness-pass** — 전량 유지. 이 디렉터리에서 `ECON_LLM_*` 계약 설명의 **주인**이다(agg·agg-skew가 여기로 가리킨다). 유지: 운영 대비 바뀌는 것이 `ECON_LLM_BASE_URL`이 가리키는 곳뿐이라는 경계, 기본값 실 llm 분석기를 쓰는 이유, 더블은 키를 보지 않지만 CLI가 미설정을 operator error(exit 2)로 끊으므로 값이 있어야 한다는 런타임 제약 |
| `tests/e2e/k8s/batch/bronze-shell.yaml` | 3 | 0 | 3 | **batch-harness-pass** — 전량 유지. Job이 PVC에 남긴 산출물을 호스트로 꺼내는 경로(`kubectl exec … cat` → Playwright가 그 파일을 읽는다)와, 이 Pod는 읽기만 하고 아무것도 만들지 않는다는 경계(단정이 배치가 실제로 쓴 레코드에 걸린다는 근거) |
| `tests/e2e/k8s/batch/data-pvc.yaml` | 4 | 0 | 4 | **batch-harness-pass** — 전량 유지. Job 컨테이너는 종료하면 파일시스템째 사라져 emptyDir로는 산출물을 꺼낼 수 없다는 제약과, RWO가 노드 단위라 같은 노드의 반출 Pod와 동시 마운트가 성립한다는 클러스터 지식 |
| `tests/e2e/k8s/batch/feed-double.yaml` | 9 | 1 | 8 | **aggregation-harness-pass** — 이력 프레이밍 재작성(둘째 문단 5줄 → 4줄): "2026-09-18(rct_20260918-0004)부터 `python -m http.server` 대신 …"은 날짜·task id를 담은 변경 이력이라 복원 경로 ③④의 정의 그 자체이자 제거 유형 「작업 흔적」. 삭제가 아니라 재작성인 것은 같은 블록의 픽스처 지식을 살리기 위함이다. 유지: 이미지 재빌드 회피(사이드로드 이미지 재사용), 고장 주입 경로 3개, "가용성을 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다" |
| `tests/e2e/k8s/batch/ingest-job-agg-skew.yaml` | 9 | 0 | 9 | **batch-harness-pass** — 전량 유지. 기준 상태와 **다른 것이 상류 설정 하나뿐**이어야 두 Gold의 차이가 오직 수집량 차이로 읽힌다는 설계(같은 축의 다른 소스와 US 축은 두 상태에서 같은 파일을 받고 주기도 같다), 루트를 따로 두지 않으면 `write_records`가 데이터셋을 교체해 기준 상태가 사라진다는 함정 |
| `tests/e2e/k8s/batch/ingest-job-agg.yaml` | 7 | 1 | 6 | **batch-harness-pass** — 문면 정정 1곳(3줄 → 2줄): 데이터 루트 **열거**(`정상 주기(/data) · 고장 주입(/data/faults) · 3주기(/data/cycles) · 분석(/data/analysis) 과 같은 관례다`)를 걷어냈다. 열거는 `git grep ECON_DATA_ROOT tests/e2e/k8s/batch`가 복원하고(경로 ①), **이미 낡아 있었다** — 이 디렉터리의 루트는 실측 여섯 개(`/data`·`/data/faults`·`/data/cycles`·`/data/analysis`·`/data/aggregation`·`/data/aggregation-skew`)인데 이 줄은 넷만 적어 `/data/aggregation-skew`를 빠뜨린다. README가 가드 항에서 못박은 「**개수·열거·행 위치**는 담지 않는다 — 파일이 자라면 그 표현이 조용히 거짓이 된다」와 같은 근거다. 삭제가 아니라 정정인 것은 뒤 절(한 루트를 공유하면 앞선 묶음의 소스별·건수 단정이 오염된다)이 복원 불가능한 설계 근거이기 때문 — `deploy/base/kustomization.yaml`의 문면 정정 선례. 유지: 메달리온 계층상 집계 앞에 수집 → 분석이 한 번씩 더 필요한 이유 |
| `tests/e2e/k8s/batch/ingest-job-analysis.yaml` | 6 | 1 | 5 | **batch-harness-pass** — 같은 정정(3줄 → 2줄). 이 줄은 셋만 적어 두 집계 루트를 빠뜨린다. 유지: 분석이 Bronze를 입력으로 받으므로 분석 Job 앞에 수집이 한 번 더 필요하다는 이유, 한 루트를 공유하면 ingestion 2~5의 소스별 건수 단정이 오염된다는 근거 |
| `tests/e2e/k8s/batch/ingest-job-cycle1.yaml` | 14 | 0 | 14 | **batch-harness-pass** — 전량 유지. 세 주기 배선 설명의 **주인**이다(cycle2·cycle3가 여기로 가리킨다). 유지: 주기를 Job 하나로 합치지 않는 이유(컨테이너 command를 쉘 루프로 바꾸면 e2e가 검증하는 것이 제품 계약이 아니게 된다), 세 Job이 **순차**여야 하는 이유(같은 데이터셋을 주기마다 덮어쓰는 `LakeStore.write_records` 때문에 동시 실행이면 마지막 내용이 비결정적), 루트를 `/data/cycles`로 가르되 본문 저장소는 주기를 가로질러 누적돼야 해 세 주기가 같은 루트를 공유한다는 이음새 |
| `tests/e2e/k8s/batch/ingest-job-cycle2.yaml` | 4 | 0 | 4 | **batch-harness-pass** — 전량 유지. 「배선 설명은 ingest-job-cycle1.yaml의 머리 주석에 있다」는 재진술이 아니라 README가 권하는 **주인 지목 포인터**다(제거 유형 「다른 파일 주석의 재진술」의 올바른 해소 형태). 나머지는 이 주기의 기대 결과(같은 상류를 받아 본문이 재저장되지 않는 것 — `bodies: 0 new / N deduplicated`) |
| `tests/e2e/k8s/batch/ingest-job-cycle3.yaml` | 3 | 0 | 3 | **batch-harness-pass** — 전량 유지. 같은 포인터 형태 + 이 주기의 기대 결과(새 해시의 본문 레코드가 한 건 추가되고 기존 버전은 보존) |
| `tests/e2e/k8s/batch/ingest-job-faults.yaml` | 16 | 0 | 16 | **batch-harness-pass** — 전량 유지. 고장 주입 경로 3종(`/__fail__/`·`/__flaky__/`·`/__slow__/`)이 어느 픽스처에 섞여 있는지, `--fetch-timeout 1`이 더블의 5초 지연보다 **짧아야** 타임아웃 경로를 실제로 밟는다는 값 근거(5 이상이면 시나리오의 (3)항이 관측되지 않는다), 이 Job은 **성공(completed)하는 것이 기대값**이라는 판독 지침(실패한 소스는 중단이 아니라 `failed_sources`로 기록되는 것이 제품 동작). 셋 다 매니페스트·테스트 문서 어느 쪽으로도 복원되지 않는다 |
| `tests/e2e/k8s/batch/ingest-job.yaml` | 7 | 0 | 7 | **batch-harness-pass** — 전량 유지. **판단 분기**: 머리의 「운영에서 이 CLI를 도는 것은 … `ingest` 템플릿이고, 여기서는 그 컨테이너 계약(…)을 그대로 옮겼다」는 두 파일을 나란히 읽으면 복원되지만(경로 ①), 같은 문장이 「e2e kind 클러스터에는 Argo 컨트롤러가 없기 때문이다」라는 클러스터 제약과 「그래서 이 Job이 관측하는 것은 스케줄이 아니라 한 주기가 무엇을 수집하는가다」라는 경계로 한 덩어리로 이어진다. 줄 단위로 끊으면 근거까지 잘리므로 「애매하면 남긴다」로 유지한다. 이 디렉터리에서 컨테이너 계약 설명의 **주인**이기도 하다(agg·analysis·faults가 여기로 가리킨다). 유지: 주기 id를 고정해 레코드 id와 `collection_cycle`이 실행 시각에 흔들리지 않게 하는 근거 |
| `tests/e2e/k8s/batch/kustomization.yaml` | 8 | 0 | 8 | **batch-harness-pass** — 전량 유지. **상시 자원만** 모으고 Job은 넣지 않는 이유(더블이 Ready가 된 뒤에 적용해야 첫 요청이 헛돌지 않는다), ConfigMap을 run.sh가 픽스처 디렉터리에서 만든다는 배선, serving 쪽 오버레이와 달리 이쪽은 순수 e2e 자원이고 운영 배치는 Argo WorkflowTemplate이 담당한다는 경계 |
| `tests/e2e/k8s/batch/llm-double.yaml` | 11 | 0 | 11 | **batch-harness-pass** — 전량 유지. 새 이미지를 끌어오지 않도록 이미 사이드로드된 배치 이미지로 stdlib HTTP 서버만 띄우는 배선, 더블이 대신하는 것이 chat-completions **한 겹**뿐이고 프롬프트 조립·정규화·저신뢰 판정·Silver 적재는 제품 경로가 그대로 한다는 경계, readiness를 **픽스처 로드까지** 확인하지 않으면 포트만 열린 상태로 Ready가 돼 분석 Job이 응답 표 없이 출발해 전건 실패한다는 함정 |
| `tests/e2e/k8s/batch/timeshift-job.yaml` | 20 | 5 | 15 | **unrowed-files-pass** — 제거 5줄: 무엇을 어디서 어디로 옮기는지의 머리 문단(`command` 와 `args: --from /data/aggregation --to /data/aggregation-rollup` 이 그대로 복원한다 — 경로 ①)과, 뒤이어 「왜 필요한지는 스크립트 머리말에 있다」고 **복원처를 스스로 지목한 뒤 그 요지를 다시 적은** 절(`tools/timeshift_bronze.py` 머리말이 복원 — 경로 ①). `ingest-job-cycle2.yaml` 이 보여준 대로 주인 지목 포인터는 남기고 되풀이만 걷는 형태다. 유지 15줄: 제품 CLI 를 부르지 않는 하네스 스텝이라 상류 더블이 없고 그래서 `mock-exception:` 이 붙지 않는다는 **부재의 근거**(코드가 복원하지 못한다), 하네스 스크립트를 운영 배치 이미지에 굽지 않고 ConfigMap 으로 넣는 경계, 인터프리터를 `/app/.venv/bin/python` 으로 못박는 이유(`python3` 면 시스템 인터프리터가 먼저 잡혀 `ModuleNotFoundError` 로 죽고 그 실패가 「코퍼스가 이상하다」로 오독된다) |
| `tests/e2e/k8s/e2e-patch.yaml` | 5 | 0 | 5 | 유지 — runc가 read-only 마운트 안에 mountpoint를 못 만드는 런타임 함정 |
| `tests/e2e/k8s/kustomization.yaml` | 5 | 0 | 5 | 유지 — side-load·ConfigMap 픽스처 배선 근거 |
| `tests/e2e/kind-config.yaml` | 2 | 0 | 2 | 유지 — 단일 노드 선택 근거 |
| `tests/e2e/lib/bronze.ts` | 22 | 4 | 18 | **unrowed-files-pass** — 제거 4줄: 「이 디렉터리는 `specs/` 밖이다」 블록 + 매달린 `//`(아래 다섯 파일 공통 — 같은 절 참조). 유지 18줄: 반출 지점을 넷으로 가르는 이유(한 루트에 섞으면 정상 주기의 소스별 건수 단정이 다른 주기 레코드에 오염된다), 본문이 해시로 주소화돼 별도 데이터셋에 산다는 계약, 환경변수가 비면 「하네스를 안 거쳤다」로 끊는 진단 설계 |
| `tests/e2e/lib/feeds.ts` | 16 | 0 | 16 | **unrowed-files-pass** — 전량 유지. 이 디렉터리에서 **유일하게** 공통 블록이 없던 파일이다. 유지: 기대값을 상수로 박지 않고 **제공분은 픽스처·상한은 `e2e-feeds.json`** 에서 유도한다는 단정 설계, 제품 파서(`econ_ingestion.feeds`)를 TypeScript 로 베끼지 않는 근거(같은 착각을 양쪽에서 되풀이하게 된다), 고장 주입 경로(`/__flaky__/2/<파일>`)도 마지막 조각이 픽스처 파일명이라는 더블의 동작 |
| `tests/e2e/lib/gold.ts` | 77 | 8 | 69 | **unrowed-files-pass** — 제거 8줄: 공통 블록 4줄, 구분선 `/* ── 롤업 루트(시나리오 3) ── */` 1줄(제거 유형 ④ — `contracts/codegen.py` 배너 6줄·`Makefile` `## ---` 6줄 선례), 선언 재진술 JSDoc 3줄(`goldDir`·`goldSkewDir`·`axisSentiments` — 앞 둘은 본문의 `exportedDir("E2E_GOLD_DIR")`·`("E2E_GOLD_SKEW_DIR")` 와 **머리 주석이 이미 단 괄호 주석**(`$E2E_GOLD_DIR(기준 상태)`·`$E2E_GOLD_SKEW_DIR(수집량을 부풀린 상태)`)이 복원하고, 셋째는 바로 아랫줄 `inFinestUnit(axisSentimentsAllUnits(dir))` 이 복원한다 — 경로 ①). 유지 69줄: 반출 지점이 둘인 이유, **Gold 를 Gold 로 증명하지 않는다**는 재계산 설계, `2026-W26` 이 `2026-06-23T14` 보다 크게 정렬되지만 더 나중이라서가 아니라는 **버킷 키의 비자명한 성질**(모델 정의가 이름 대어 유지로 지목한 그 지식), `CELL_SEP` 을 상수로 내보내는 이유(손으로 조립한 키가 보이지 않는 NUL 과 어긋나 git 이 바이너리로 취급해 diff 조차 나오지 않았던 실측), ISO 주 번호를 제품 구현을 베끼지 않고 목요일 규칙으로 직접 계산하는 근거 |
| `tests/e2e/lib/ingestlog.ts` | 20 | 4 | 16 | **unrowed-files-pass** — 제거 4줄: 공통 블록. 유지 16줄: **왜 로그인가** — 걸러진 중복도 격리된 소스도 Bronze 에 레코드가 없어 「없다」만으로는 애초에 아무것도 주지 않은 경우와 구별되지 않는다는 관측 설계(시나리오 6·7 의 기대 결과가 이 집계에 걸리는 이유), 형식이 어긋나면 조용히 0 을 주지 않고 끊는다는 단정 설계 |
| `tests/e2e/lib/llmdouble.ts` | 24 | 4 | 20 | **unrowed-files-pass** — 제거 4줄: 공통 블록. 유지 20줄: 기대값을 픽스처에서 유도하는 근거, **무엇을 단정하지 않는가**(모델 판단의 의미적 품질은 오프라인 골든 평가의 몫이고 이 층은 값이 손실·왜곡 없이 Silver 까지 가는 계약만 본다)는 층 경계, `extends` 해석이 더블(python)과 여기(TypeScript) 양쪽에 있는 것이 의도라는 근거, 판단을 유보한 응답이 분위기를 비워 두므로 타입이 `null` 을 허용해야 픽스처와 어긋나지 않는다는 계약 |
| `tests/e2e/lib/silver.ts` | 47 | 4 | 43 | **unrowed-files-pass** — 제거 4줄: 공통 블록. 유지 43줄: 반출 지점이 둘인 이유(재분석이 같은 데이터셋을 **갱신**하므로 1차 스냅샷을 두 Job 사이에 꺼내지 않으면 시나리오 6 의 「재분석 후에도 추적 키가 유지된다」를 볼 수 없다), 저신뢰·미분석과 모델 호출 실패가 레코드만으로는 구별되지 않아 CLI 집계를 함께 읽는다는 관측 설계, 제목을 조인 키로 쓰는 이유(더블의 응답 픽스처가 제목으로 색인되고 `record_id` 는 주기·소스·링크에서 파생돼 픽스처만 보고는 알 수 없다), 집계 묶음이 corpus 를 가르는 근거 |
| `tests/e2e/playwright.config.ts` | 2 | 0 | 2 | 유지 — BASE_URL/포트 폴백과 run.sh의 관계 |
| `tests/e2e/run.sh` | 96 | 71 | 25 | **e2e-runner-pass — 재판정.** initial-pass(남음 12) 이후 #31·#39·#44·#50·#65 가 +84 를 들였다. 제거 71줄 — 머리의 네 경로 목차 28줄 → lede 2줄(단계 표지·말미 배너가 같은 목록을 실행 순서대로 되풀이 · 경로 ①), `run_batch_job`/`export_lake` 머리와 PVC·셸 Pod 설명 9줄(`lib/ingestlog.ts` 「왜 로그인가」·`k8s/batch/data-pvc.yaml`·`bronze-shell.yaml` 머리가 주인 · 경로 ①), 더블 선행·가드 설명 12줄(`k8s/batch/kustomization.yaml` 「더블이 Ready 가 된 뒤에 적용」 · PR #39 「가드는 정상 주기 전용」 · PR #44 「404 … `failed=0` 가드로 잡는다」 · `analyze-job-v2.yaml` 「같은 Silver 를 갱신」 — 경로 ①③), 단계 표지 4b~4f 뒤의 서술 25줄(`ingest-job-faults.yaml`·`ingest-job-cycle1.yaml`·`ingest-job-analysis.yaml`·`ingest-job-agg*.yaml`·`aggregate-job*.yaml` 머리 · `tools/timeshift_bronze.py` 머리말 · PR #39·#50·#65 본문 — 경로 ①③). 유지 25줄: 머리 7(lede 2 · 빈 `#` · `make e2e`/CI 동일 스크립트 · 전제 도구 · `KEEP_CLUSTER` — initial-pass 승계), 단계 표지 11(시나리오 포인터를 든 1줄 표지), llm-fixtures 선행 2(ConfigMap 볼륨이 없는 Pod 는 영영 Ready 가 안 된다는 클러스터 제약 — 판단 분기), 정상 주기 가드 2 · 빈 Gold 가드 3(「테스트가 왜 그 모양으로 단언하는지」 — 축소된 Bronze·빈 Gold 가 데이터 문제로 읽히는 것을 막는 가드의 근거는 여기뿐). **판단 분기** — lede 2줄(README `make e2e` 설명이 복원하나 낡았고 README 는 #75 가 수정 중), 전제 도구 1줄(`curl` 이 빠져 낡았으나 initial-pass 유지 승계) — 다음 표적 패스의 첫 후보 |
| `tests/e2e/specs/ac3-6-sentiment-ratio-viz.spec.ts` | 28 | 4 | 24 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드가 복원). 유지: AC 검증 방법 인용과 그에 따른 단언 설계, 스케일 무관 비교 근거 |
| `tests/e2e/specs/ac3-7-three-axis-compare.spec.ts` | 36 | 4 | 32 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드). 유지: 세 낱말 분해 단언 설계, 공통 스케일 근거 |
| `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` | 26 | 4 | 22 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드). 유지: 단언 설계·픽스처 대응 |
| `tests/e2e/specs/aggregation-1-volume-normalization.spec.ts` | 24 | 5 | 19 | **scenario-spec-pass** — 제거 5줄: 사전 조건·실행 단계·기대 결과를 따옴표로 옮겨 적은 머리 문단(바로 윗줄 `// 검증 시나리오:` 가 문서·앵커를 가리키므로 경로 ②로 복원). 유지: 두 상태(기준/부풀림)를 같은 corpus 로 만드는 하네스 설계와 KR 축에 소스를 둘 둔 이유(정규화가 소스 2개 이상에서만 실행된다) |
| `tests/e2e/specs/aggregation-2-subject-cross-dimension.spec.ts` | 35 | 4 | 31 | **scenario-spec-pass** — 제거 4줄: 머리의 시나리오 재진술. 유지: Gold 를 Gold 와 비교하면 자기 증명이 된다는 관측 설계, 수집 CLI 가 `collected_at` 을 실행 시각으로 찍어 e2e 한 주기에서 시간대 차원이 값 하나가 된다는 한계, 롤업 세 벌 중 기본 단위 한 벌로 좁히는 이유 |
| `tests/e2e/specs/aggregation-3-bucket-rollup.spec.ts` | 36 | 4 | 32 | **unrowed-files-pass** — 제거 4줄: 사전 조건·실행 단계·기대 결과를 따옴표째 옮겨 적은 머리 문단(바로 윗줄 `// 검증 시나리오:` 가 문서·앵커를 가리키므로 경로 ②로 복원). scenario-spec-pass 가 자매 spec 16개에서 지운 것과 **같은 유형·같은 자리**이고, 이 파일은 그 패스의 슬라이스가 확정된 뒤 #65 로 들어와 행을 못 받았다. 유지 32줄: 사전 조건이 이 시나리오의 어려운 절이라는 하네스 설계(수집 CLI 가 `collected_at` 을 실행 시각으로 찍어 한 Job 의 레코드가 전부 같은 시간 버킷에 떨어지므로 e2e 가 파이프라인만으로는 시간대 차원을 만들 수 없다), **Gold 를 Gold 로 증명하지 않는다**는 이중 관측(원천 재계수 + Gold 안의 롤업 항등식), 점유율은 합산되지 않고 굵은 버킷 안에서 다시 정규화된다는 근거(롤업을 「Gold 행 더하기」로 구현하면 이 단정이 제일 먼저 깨진다), 굵은 버킷이 고운 버킷을 둘 이상 품어야 합이 합다워진다는 공허 통과 방지 |
| `tests/e2e/specs/aggregation-4-sentiment-ratio-integrity.spec.ts` | 23 | 4 | 19 | **scenario-spec-pass** — 제거 4줄: 머리의 시나리오 재진술. 유지: 분모 선택이 비율 정합성을 가르는 이유(미분석을 섞으면 합이 1 미만, 버리면 미판단량이 사라진다), 오늘 Gold 계약에 저신뢰 축이 없어 "분리"가 미분석에만 성립한다는 경계 |
| `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` | 51 | 3 | 48 | **scenario-spec-pass** — 제거 3줄: 문서 경로·기대 결과·`검증 AC` 를 옮겨 적은 머리 문단(셋 다 `// 검증 시나리오:` 선언과 테스트 문서가 복원). 유지: 뷰박스 좌표를 모르고도 성립하도록 "0선 높이 ÷ 점유율이 상수인가"로 비교하는 설계, 공유 픽스처가 단일 `time_bucket` 이라 다중 버킷 x축이 관측 불가라는 경계 |
| `tests/e2e/specs/analysis-1-target-countries.spec.ts` | 17 | 4 | 13 | **scenario-spec-pass** — 제거 4줄: 머리의 시나리오 재진술. 유지: 이 층이 의미적 품질이 아니라 전파 계약을 본다는 경계, 아홉 건이 모두 `axis=KR` 한 소스인데 대상 국가가 갈린다는 것이 곧 축-베끼기 부재의 증거라는 묶음 설계 |
| `tests/e2e/specs/analysis-2-subject-normalization.spec.ts` | 19 | 3 | 16 | **scenario-spec-pass** — 제거 3줄: 머리의 시나리오 재진술. 유지: 더블이 변형을 그대로 돌려줘야 통합 경로가 e2e 에서 실행된다는 근거(더블이 미리 합치면 검증 대상이 사라진다), 정규 표기의 철자를 단정하지 않는 경계 |
| `tests/e2e/specs/analysis-3-sentiment-classes.spec.ts` | 10 | 4 | 6 | **scenario-spec-pass** — 제거 4줄: 머리의 시나리오 재진술. 유지: 라벨 정확도는 오프라인 골든 평가의 몫이라는 층 분담(doc-tracker 「예외 후보 중 미등재」가 추적처) |
| `tests/e2e/specs/analysis-4-multi-value-retention.spec.ts` | 24 | 4 | 20 | **scenario-spec-pass** — 제거 4줄: 머리의 시나리오 재진술(뒤따르는 문단이 "기대 결과의 뒤 절"을 인용해 홀로 서므로 접속사만 다듬었다). 유지: 다중 값이 줄어들 수 있는 두 자리(모델→Silver, Silver→Gold)를 모두 봐야 하는 이유 |
| `tests/e2e/specs/analysis-5-low-confidence-separation.spec.ts` | 39 | 2 | 37 | **scenario-spec-pass** — 제거 2줄: 머리의 시나리오 재진술(집계 묶음에서 닫히는 이유 한 줄은 판단이라 유지·정정). 유지: 두 사전 조건이 서로 다른 경로로 같은 상태에 닿아 픽스처에서 갈라 둔 근거, 저신뢰가 Gold 계약에 없다는 경계, 축 경계를 `CELL_SEP` 으로 끊는 이유(손으로 조립했다 `cellKey` 구분자와 어긋나 단정이 한 번 깨진 실측) |
| `tests/e2e/specs/analysis-6-traceability-reanalysis.spec.ts` | 20 | 5 | 15 | **scenario-spec-pass** — 제거 5줄: 실행 단계·기대 결과를 옮겨 적은 머리 문단. 유지: "분석 로직 변경"을 더블 응답 묶음 교체 + `--analyzer-version` 상향 두 가지로 세운다는 하네스 설계, 1차 Silver 를 스냅샷에서 읽는 이유(재분석 뒤 PVC 에 남지 않는다) |
| `tests/e2e/specs/ingestion-2-top-n-cap.spec.ts` | 9 | 1 | 8 | **scenario-spec-pass** — 제거 1줄: 사전 조건의 숫자(N=100·60건)를 옮겨 적은 절. 그 숫자를 상수로 쓰지 않는다는 서술이 바로 뒤에 있어 재진술이 스스로와 어긋나는 자리였다. 유지: 상한·제공분을 픽스처에서 유도하는 근거와 단언하지 않는 것 |
| `tests/e2e/specs/ingestion-3-axis-tagging.spec.ts` | 8 | 1 | 7 | **scenario-spec-pass** — 제거 1줄: 사전 조건 인용. 유지: 매핑이 코드가 아니라 설정에 있어 기대 축을 설정에서 읽는 근거, 어느 매체가 어느 축인지는 운영 판단이라는 경계 |
| `tests/e2e/specs/ingestion-4-link-and-body.spec.ts` | 9 | 0 | 9 | **scenario-spec-pass** — 줄 수 불변, 문면 정정 1곳: 시나리오가 두 유형을 요구한다는 재진술을 걷고 픽스처가 그 혼합을 만든다는 하네스 사실만 남겼다. 유지: 내용 주소화를 저장소 안에서만 확인하면 자기 값끼리 맞는지만 보게 된다는 양방향 검사 근거 |
| `tests/e2e/specs/ingestion-5-metadata-completeness.spec.ts` | 8 | 1 | 7 | **scenario-spec-pass** — 제거 1줄: 다섯 필드 열거(테스트 문서가 복원). 유지: "비어 있지 않다"로 보면 0·빈 문자열이 통과하므로 값의 일치를 본다는 단언 설계, 시간 버킷 식별을 `collection_cycle` 형태로 보는 근거 |
| `tests/e2e/specs/ingestion-6-failure-isolation.spec.ts` | 22 | 1 | 21 | **scenario-spec-pass** — 제거 1줄: 한 주기에 넣을 네 가지를 옮겨 적은 절. 유지: 기대 결과 네 절이 각각 어디에 남는지의 대응표(관측처 지정이라 문서가 복원하지 않는다), 걸러진 중복·격리된 소스가 Bronze 에 흔적이 없어 로그와 레코드를 함께 봐야 하는 근거 |
| `tests/e2e/specs/ingestion-7-body-dedup-versioning.spec.ts` | 15 | 0 | 15 | **scenario-spec-pass** — 전량 유지. 머리 문단이 재진술로 보이나 사전 조건 셋을 **어느 픽스처·어느 주기로** 세우는지의 대응이라 하네스 사실이다. 유지: `news_item` 이 주기마다 덮어쓰기라 최종 파일만으로는 주기별 관측을 확인할 수 없어 run.sh 가 스냅샷을 뜬다는 근거 |
| `tests/e2e/specs/smoke-serving.spec.ts` | 6 | 0 | 6 | 유지 — 비-시나리오 spec이 고아가 아닌 이유(doc-tracker 등재 위치 안내) |
| `tests/e2e/tools/timeshift_bronze.py` | 10 | 0 | 10 | **unrowed-files-pass** — 전량 유지. 지문에 드는 10줄은 전부 **달력 상수의 근거**와 **하네스 전제 가드**다: 여섯 슬롯이 시간 6 · 일 4 · 주 2 를 만들도록 고른 최소 달력이라는 것과 각 단위가 둘 이상이어야 하는 이유(한 날에 시간 버킷이 둘 이상 있어야 「일 = 시간들의 합」이 합다운 합이 된다), 오프셋을 `+00:00` 으로 고정하는 이유(집계 버킷이 문자열 접두사라 지역 오프셋이 섞이면 같은 순간이 다른 버킷으로 갈린다), 버킷이 단위마다 하나면 롤업 단정이 공허하게 통과해 시나리오 3 이 초록인데 아무것도 시험하지 않게 된다는 가드의 근거, Silver 를 그대로 옮기는 이유. 어느 것도 매니페스트·테스트 문서로 복원되지 않는다. **범위 밖 관측**: 이 파일의 모듈 docstring(1–29행)에도 「`tests/e2e/specs/` 밖에 있다」 되풀이가 있으나 docstring 본문은 줄머리가 `#` 가 아니어서 **지문의 사각지대**이고, 표면 확장은 모델 정의가 tobe-modeler 몫으로 못박았다 |
| `tests/smoke.sh` | 11 | 0 | 11 | 유지 — 페이크 소스·분석기 고정 근거(오프라인·결정성, exit 2 회피) |
| `web/src/App.tsx` | 1 | 0 | 1 | 유지 — 실화면/플레이스홀더 목록의 역할 |
| `web/src/api/client.ts` | 17 | 3 | 14 | **reprocess-console-pass — #97 증가분 5줄만 재판정(그 아래는 reprocess-surface-pass · web-api-view-pass 의 판정 그대로).** 제거 3줄 — ⑴ `postJSON` 머리 2줄 → 1줄: 「(a missing memo, an RBAC gap)」 열거(`reprocess_trigger.go` `publishRequest`·`writeArgoError` doc 이 주인, 「개수·열거」 유형) ⑵ `api.reprocess*` 앞 「The three steps that cause work (STP-dry-run · STP-run-reprocess · STP-publish) each submit one batch Workflow; `reprocessRuns` is the poll」 2줄(`reprocess_trigger.go` 머리가 **주인** — 직전 패스가 사본 좌표로 지목 · `ReprocessTrigger` 의 폴링 호출 · doc-tracker ⑸). 유지 2줄: `postJSON` 요약 1(export 함수 — 왜 `{error}` 를 파싱해 그대로 던지나) · **판단 분기 1** 빈 `catch` 안의 「A non-JSON refusal keeps the status line」(바로 위 초기화가 복원하나 `eslint.config.js` 의 `js.configs.recommended` → `no-empty` 가 **주석이 든 블록만** 비어 있지 않은 것으로 본다 — 지우면 lint 실패; 정책의 기계 판독 목록에 없는 꼴). **reprocess-surface-pass — #94 증가분 3줄만 재판정(그 아래는 web-api-view-pass 의 판정 그대로).** 제거 0. **판단 분기 1** — `reprocess` 앞 3줄 「The selection is server-side: the range window, the axis and the source filter all change which Bronze records are counted, so every control round-trips rather than filtering a fetched list」: 아래 `sentiment` 의 「not a client-side filter」 2줄과 같은 유형(왜 클라이언트에서 거르지 않는가는 API 모양의 결정이라 Go 쪽에 없다)이라 유지하고, 그 사본(`Reprocess.test.tsx` 머리 2줄)을 지우며 이 자리를 **설명의 주인**으로 지목했다(`Reprocess.tsx` `CMP-seg` 앵커에 붙은 같은 뜻의 산문은 그 파일이 보류라 다음 패스 몫). **web-api-view-pass — 재판정.** 직전 판정(initial-pass, 5줄) 이후 #45·#53·#66·#70 이 10줄을 들였고 파일 전체를 다시 판정했다. 제거 6줄 — ⑴ `fairness` 의 「Both counting modes come back in one response …」 3줄: 같은 사실이 web 안에 두 벌 더 있고(`Fairness.tsx` 의 `type Mode` JSDoc · `CMP-norm-toggle` 앵커) 주인은 토글을 그리는 그 화면이며, 설계 트래커 「`세는 방식` 폼 카드 전면 부재」 행·doc-tracker 슬라이스 8 행·PR #66 본문이 축자 복원(경로 ②③) ⑵ `trace` 뒷문장 「The response names which record it settled on, so a fallback never reads as a hit」 1줄(3줄 → 2줄): `handlers.go` `traceResponse.Selection` 인라인 주석 + PR #70 이 주인 ⑶ `screen` 의 「Stub endpoint for the one screen still on Placeholder (reprocess) …」 2줄: 정책의 「README 재진술 — 범위 서술」 유형이고 `App.tsx` `BUILT`(경로 ①)·doc-tracker 「잔여 — 화면 1」(경로 ②)·`handlers.go` 패키지 주석이 복원하며, 슬라이스 10 착지 순간 「the one screen」 이 조용히 거짓이 되는 개수 서술. 유지 9줄: 머리 3줄(initial-pass 판정 그대로 — 상대 `/api` 베이스가 dev·prod 모두에서 되는 이유, `vite.config.ts` 는 지문 범위 밖이고 메커니즘만 적는다), `trend`·`trace` 의 「왜 인자가 선택적인가」 각 2줄(시그니처의 근거이고 web 안에서 이 파일이 주인 — `types.ts` 쪽 사본은 지웠다), **판단 분기** `sentiment` 의 「The axis is a query parameter, not a client-side filter」 2줄(뒷절은 `handlers.go` `sentiment` doc 이 복원하나 앞절 — 왜 클라이언트에서 거르지 않는가 — 는 API 모양의 결정이라 Go 쪽에 없다) |
| `web/src/api/types.ts` | 23 | 4 | 19 | **reprocess-console-pass — #97 이 들인 6줄 재판정(그 아래는 reprocess-surface-pass · web-api-view-pass 의 판정 그대로). 직전 두 패스의 「보류」였던 옛 `trigger` 필드 JSDoc 1줄은 #97 이 필드를 `ReprocessTrigger` 로 갈며 이미 없앴다(옛 1 소멸 + 새 6 = 순증 5) — 보류 소멸.** 제거 4줄 — `ReprocessTrigger` 필드 JSDoc 전부: `available` 「True only when the batch WorkflowTemplate is reachable with the Pod's identity」(`argo.TemplateReachable` doc 이 주인 · doc-tracker ⑷) · `note` 「Why the trigger is unavailable …; empty when available」(`reprocess_trigger.go` `Note` doc 과 같은 문장) · `serving_version` 「Empty when no decision was ever recorded (aggregation serves each record's newest row)」(`store.ReprocessDecision` doc 이 주인 — 직전 패스가 `ServingVersion` doc 을 줄이며 이 줄을 세 번째 사본으로 지목 · doc-tracker ⑵) · `runs` 「Newest first. Empty when unavailable」(`argo.List` 의 정렬 근거 주석과 내림차순 정렬이 주인). 아래 web-api-view-pass 가 필드 JSDoc 12줄을 Go 쪽으로 복원한 것과 같은 판단. 유지 2줄: `ReprocessRun`·`ReprocessDecision` 의 export 타입 요약 1줄씩 — **판단 분기 1**: `ReprocessDecision` 요약의 뒷절 「the last one names the version Gold serves」는 `store.ReprocessDecision` doc 과 같은 문장이나 한 줄 요약 안이라 요약 규칙이 이긴다(아래 `TrendSeries` 처분). **reprocess-surface-pass — #94 증가분 5줄 중 4줄만 재판정(그 아래는 web-api-view-pass 의 판정 그대로; `trigger` 필드 JSDoc 1줄은 열린 PR #97 이 그 타입을 넓히며 다시 쓰는 자리라 「보류」).** 제거 1줄 — `throughput_per_minute` 필드 JSDoc 「Null unless Silver holds enough dated records at the target version to read a rate off」(`reprocess.go` `throughput` doc 이 주인 — 아래 web-api-view-pass 가 필드 JSDoc 12줄을 Go 쪽으로 복원한 것과 같은 판단). 유지 3줄: `ReprocessBucket`·`ReprocessScope`·`ReprocessCompareRow` 의 export 타입 JSDoc 요약 1줄씩(요약 안 `(STP-scope-range)`·`(PAT-before-after)` 태그는 아래 `(AC3.7)` 류 판단 분기 승계). **web-api-view-pass — 재판정.** 직전 판정(initial-pass, 5줄) 이후 #14·#45·#53·#66·#70 이 43줄을 들였고 파일 전체를 다시 판정했다. 제거 34줄 — **전부 `go/internal/handlers/handlers.go` 의 응답 타입 doc 주석을 같은 문장으로 되풀이한 것**이다(이 파일 첫 줄이 스스로 「Go 서빙 핸들러가 돌려주는 JSON 모양의 거울」이라 적는다): 필드 JSDoc 12줄(`TrendResponse.subject`·`.basis` ← `pickSubject`·`trendBasis` doc / `SentimentPoint.distribution`·`.analyzed_total` ← `sentimentPoint` doc / `SentimentAxisRow.present` ← `sentimentAxisRow` doc / `SentimentResponse.basis.latest_bucket` ← `sentimentBasis` doc / `FairnessResponse.basis`·`.raw_total`·`.method` ← `fairnessBasis` doc / `CompareResponse.basis` ← `compare` handler doc / `TraceCrumbStep.present` ← `Trace.tsx` `CMP-crumb` 앵커(그리는 쪽이 주인) / `TraceResponse.selection` ← `traceResponse.Selection` 인라인 주석)과, 본문이 여러 줄인 export JSDoc 넷을 요약 1줄로 줄인 22줄(`FairnessRow` 5 ← `fairnessRow` doc 「RawShare is deliberately *not* the normalized share」 / `TraceBronze` 7 ← `traceBronze` doc 「deliberately two fields, not one」 + PR #70 / `TraceSilver` 5 ← `traceSilver` doc / `TraceResponse` 5 ← `traceResponse` doc 의 세 분기 표 + PR #70 「모자란 것을 뭉치지 않는다」). 정책 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」이고 주인은 값을 계산하는 구현 쪽이며, serving-handlers-pass 가 그 doc 들을 「응답 계약의 『왜 두 필드인가』」로 전량 유지했으므로 설명은 한 자리에 온전히 남는다. **문면 정정 1곳(줄 수 불변)**: 머리 셋째 줄의 괄호절 `(stub contracts, see README scope)` 제거 — README 「범위 밖」 재진술이면서 낡았다(서빙 다섯 라우트가 Gold 파생인 지금 「스텁 라우트만」은 거짓, serving-handlers-pass 가 `README.md:223`·`:228` 의 같은 낡음을 기록). 유지 14줄: 머리 3줄(거울이라는 사실 · codegen 이 갱신해 주지 않는 손 유지 뷰라는 경계 — initial-pass 판정 그대로), export 타입 JSDoc 요약 11줄(정책 「TS: export 함수·타입의 JSDoc 요약 1줄」 — `TrendSeries` 요약의 「Exactly one series … is `selected`」는 Go doc 과 겹치나 한 줄 요약 안이라 요약 규칙이 이긴다). **판단 분기** — 요약 8곳의 인라인 `(AC3.7)`·`(AC1.4, AC1.5, AC1.7)` 류 태그는 aggregation-harness-pass 의 `# AC3.2`·lineage-surface-pass 의 `Trace.test.tsx` 3자리 선례대로 유지 |
| `web/src/screens/Compare.tsx` | 10 | 0 | 10 | regression-pass — 전량 유지. `#37`이 들인 3줄은 「수집 0인 축을 `0%`로 그리지 않고 '비교 제외'로 적는 이유 — `0%`는 '거기선 아무도 말하지 않았다'로 읽힌다」는 제품 의미론의 근거로 코드·문서 어디서도 복원되지 않는다. initial-pass가 지운 `AC3.7 … (J2 / V2)` 배너는 재발하지 않았다 |
| `web/src/screens/Compare.test.tsx` | 6 | 6 | 0 | **web-api-view-pass** — #76 이 신설한 파일의 첫 판정, 전량 제거. ⑴ local 헬퍼 `exitCard` 의 JSDoc 1줄: 다섯 줄짜리 헬퍼의 이름·시그니처가 하는 일을 말하고(경로 ①) 요약 자체가 부정확했다(헬퍼는 「링크 라벨·목적지」가 아니라 카드 요소를 돌려준다) — `Dashboard.test.tsx` 의 `Landing` JSDoc 을 남긴 자리와 달리 이름이 역할을 말한다 ⑵ 첫 테스트 머리 3줄(「목업은 워크스루 단계마다 카드를 한 장씩 세우지만 구현은 한 페이지이므로 확인할 것은 배치가 아니라 …」): **같은 커밋 #76 이 설계 트래커 「해소된 등재」 두 이탈 행에 축자로 적었다**(「구현의 비교 화면은 단계가 접힌 한 페이지라 배치만 다르다」·「`Compare.test.tsx` 가 라벨과 `href` 를 잠근다」, 경로 ②) + 테스트 이름이 단언을 말한다(경로 ①) — trend-surface-pass 의 `Trend.test.tsx` 처분과 같은 형태 ⑶ 둘째 테스트 머리 2줄(「`.cmpcol` 로 세어지면 … 넷이 된다(서빙 e2e 도 같은 수를 센다)」): PR #76 본문 「검증」 절이 축자(「`Compare.test.tsx` 두 번째 테스트가 그 수를 직접 잠근다」, 경로 ③)이고 `ac3-7-three-axis-compare.spec.ts` 의 `page.locator(".cmpcol")` 가 e2e 쪽을 보여 준다(경로 ①). 판정 후 남음 0 이라 지문 파일 집합에서 빠지지만 행은 남긴다(`Dashboard.tsx` 처분) |
| `web/src/screens/Fairness.test.tsx` | 16 | 0 | 16 | **unrowed-files-pass** — 전량 유지. `Sentiment.test.tsx`·`Trend.test.tsx` 와 같은 유형이다 — 전부 「테스트가 왜 그 모양으로 단언하는지」이고 단정·픽스처 어느 쪽을 읽어도 복원되지 않는다. 유지: 스텁이 모든 기대값의 출처이고 리터럴을 두 번 적지 않는다는 설계, 그 스텁이 화면의 존재 이유가 되는 사례를 실어 나른다는 것(「와이어 도배」가 원시 100건 중 60건을 쥐고도 정규화 점유율은 1/4 이라 두 계수 방식이 축을 다르게 세운다), 토글이 정직하려면 눌렀을 때 화면이 말하는 바가 바뀌어야 한다는 단정 근거, 열지 못하는 두 단계를 빈 화면으로 잇지 않고 사유와 함께 이름 댄다는 **허위 컨트롤 금지** |
| `web/src/screens/Fairness.tsx` | 38 | 1 | 37 | **web-api-view-pass** — 첫 판정(슬라이스 8 `ddaef4f`/#66 신설, #70·#76 이 더함). 세 패스 연속 「열린 PR 이 수정 중」이라 미뤄진 파일이고 이제 막는 PR 이 없다. 제거 1줄 — `{/* 비율이 아니라 건수다 — 같은 행에서 구분 표기(AC3.8). */}`: 바로 아래 셀이 `원시 {n}건` 을 렌더하고(경로 ①) PRD AC3.8·설계 트래커 「대비 표 컬럼 구성」 행이 구분 표기를 적는다(경로 ②). **문면 정정 3곳(지문 줄 수 불변 · 물리 6줄 감소)** — 앵커 셋을 lineage-surface-pass 의 `PAT-lineage` 처분대로 1줄 형태로: `CMP-note`(표기 원칙)의 과거 상태 서술(「지키고 있었지만 … 말하지 않았다」— #76 자신이 복원, 경로 ④)과 「응답 분기 밖」(설계 트래커 「세는 방식 표기 원칙 note 부재」 행·doc-tracker #76 행이 축자) / `PAT-raw-vs-norm` 의 구성·근거 열거(설계 트래커 「대비 표 컬럼 구성」 행·규칙 3 절이 축자, 「갈리는 폭이 곧 보정량」은 `handlers.go` `fairnessRow` doc 이 주인 — `CMP-table` 토큰을 걷어도 게이트 마커 집합 불변, 출력 바이트 동일 확인) / `CMP-kv` 의 근거(「분모를 감추면 옆의 건수와 대조할 수 없다」— 설계 트래커 「세는 기준 카드」 행·`fairnessBasis` doc 이 축자). 유지 37줄: `CMP-*`/`PAT-*` 앵커 아홉(`markers()` 가 주석에서 R3 모집단을 긁는다), 「순위는 세는 방식을 따라간다 — 그래야 … 화면 위에서 실제로 답해진다」 2줄(제품 의미론의 근거 — 트래커는 강조만 적고 정렬이 모드를 따르는 이유는 적지 않는다), 두 번째 `CMP-note` 의 사유 절(`Trace.tsx:288` 의 같은 형태와 일관). **판단 분기 — 118행 위 28줄**(머리 23줄 · `type Mode` JSDoc · `shareIn` JSDoc · 「두 방식의 1위가 갈리면 …」 · `CMP-seg`·`CMP-norm-toggle` 의 사유 절): 복원 경로는 **전부 실재한다** — doc-tracker 슬라이스 8 행(「같은 대상을 두 가지 세는 방식으로 병치 …」)·화면의 lede 문면·목업 `JRN-spike-verification.html`(「그 매체의 편집 결정」)·설계 트래커 `STP-inspect-sources`/`STP-drilldown-articles` 행(Gold 키에 수집원 차원이 없다 · `/api/trace` 는 아는 레코드 하나로 내려가는 길 — 축자)·같은 파일 두 번째 `CMP-note` 문면·「두 방식 대조 요약 카드」 행 — 그러나 설계 트래커 「`세는 방식` 폼 카드 전면 부재」 행이 `Fairness.tsx:110-118` 을 **줄 번호로 인용**해 118행 위를 한 줄이라도 걷으면 자매 모델 행의 인용이 밀린다(`handlers.go:34`·`Sentiment.tsx:24-29` 선례). 다시 볼 시점: 그 인용이 내용 지목(`∋ CMP-norm-toggle`)으로 바뀌거나 그 행이 처분될 때 — 그때 머리 23줄 + 3줄 제거 · 2곳 정정이 한 번에 열린다 |
| `web/src/screens/Sentiment.tsx` | 56 | 2 | 54 | **product-surface-pass** — 제거 2줄: 머리의 AC 배너 `// AC3.4 (축별·분위기별 비율 집계, 미분석 분리) + AC3.6 (분위기 비율 시각화).` 와 매달린 `//`. 제거 유형 「작업 흔적」이고 AC↔화면 대응은 `docs/econ-opinion-monitor-design-tracker.md` 「구현 전용 — mapstrip 칩」 행과 doc-tracker e2e 매핑이 복원한다(경로 ②). initial-pass가 `Compare.tsx`에서 `AC3.7 … (J2 / V2)` 배너를 지운 것과 같은 자리·같은 근거이고, 판정 후 머리가 `Compare.tsx`와 같은 형태(배너 없이 바로 설계 근거)가 된다. 유지 54줄: 미분석을 네 분류에 접지 않는 이유, 도넛이 analyzed 몫으로 닫히는 근거, `PAT-stacked-sentiment` 의 「막대 높이는 구성이지 규모가 아니다」, `CMP-*` 앵커. **판단 분기 — design-tracker 가 승격 등재한 두 블록**(허위 컨트롤 판단 `:24-29`·`:30-33`, 고정 임계 사유 `:55-58`)은 트래커가 「기록 위치를 승격한다」고 적어 복원 경로 ②가 성립하나, 트래커 행들이 이 블록을 **줄 번호로 인용**하고 있어 제거가 자매 모델 행의 처분과 묶인다. 「애매하면 남긴다」로 유지하고 트래커의 처분 시점에 다시 본다 |
| `web/src/screens/Sentiment.test.tsx` | 21 | 0 | 21 | **product-surface-pass** — 전량 유지. 「기대값을 상수로 박지 않는다」는 단언 설계 근거, 스케일 상수가 상쇄되므로 비율만 비교한다는 근거, 한 document 를 공유해 행 단위로 스코프하는 이유(자동 cleanup 부재) — 모두 「테스트가 왜 그 모양으로 단언하는지」 |
| `web/src/screens/Trend.tsx` | 89 | 34 | 55 | **trend-rejudge-pass — 재판정.** 직전 판정(trend-surface-pass, 47줄) 이후 #85·#87·#91 이 42줄을 들였고 그 증가분만 처분했다(제거 34 중 1줄은 머리를 걷으며 매달린 옛 `//` 1줄). 제거 — **머리 4줄**(#85 가 「차트가 답하는 질문」을 「고른 대상 하나 + opt-in 겹침」 서술로 바꿔 쓴 것: `drawnSeries()` 본문·체크박스 JSX 가 복원(①), 트래커 「해소된 등재」 #85 행 「기본 unchecked … 꺼짐이면 고른 대상 하나(고른 것이 없으면 선두 하나), 켜짐이면 응답이 준 비교 대상 전부」 축자(②)) · `drawnSeries` 3줄(같은 문장 + `trendSeriesLimit` 3개 — 트래커 #85 행·PR #85 「서빙이 `trendSeriesLimit = 3` 으로 이미 잘라 내려준다」 축자, 목업 `trendSeries()` 포인터 1줄만 유지) · 겹쳐 보기 상태 2줄(같은 문장의 세 번째 사본 + `useState(false)`) · **`VIEW_KEY` 앞 13줄 → 2줄**(여정 §4 분기·요약 카드 문면 3줄은 트래커 #80 해소 행 축자, 수명 근거 5줄은 `Dashboard.tsx` `BRIEF_KEY` 앞 주석이 설명의 주인이고 트래커 #87 행이 「한 계약의 두 표면이 서로 다른 수명을 가지면 …」을 축자로 적으므로 두 표면 대응 1문장 2줄로 정정, 추림·대상 저장 경계 3줄은 트래커 #87 행·PR #87 축자 + 같은 파일 추림 상태 주석과 배너 문면이 주인) · **`Contrast` 머리 13줄 → 1줄**(성격·저장소 미사용 4줄과 「진입 맥락으로 가리지 않고 항상 그린다」 5줄은 트래커 #91 행·PR #91 「왜 항상 그리나」 절 **축자**, 접두 2줄은 아래 `.trend-sl-` 가드 2줄이 주인 — 목업 포인터 1줄만 유지) · `submit` 분기 1줄(코드 두 분기 + 트래커 「제출 분기는 목업 `submitVerdict()` 그대로」, 「두 실패를 뭉치지 않는다」 가 주인). 지문 −0 정정 2곳: 체크박스 JSX 의 접두 문장 삭제(포인터 1줄 유지), `CMP-legend` 앵커의 「범례는 그려진 선만 말한다」 문장은 **유지**(테스트 쪽 사본을 지우며 이 자리를 주인으로 지목). 유지 55줄 — 직전 판정분 47줄 전량(`:8-21` 「deliberately *not* here」 두 항 포함 — 이제 7~18행이다, 아래 원장 서술) + 이 창의 8줄: 온도차 상태 소유 2(추림 상태 2 와 같은 유형 — 응답이 바뀔 때 결론·메모가 날아가면 판별이 성립하지 않는다) · 세로 스케일 2 · 색 배정 2(둘 다 토글이 값·대상 변화처럼 읽히는 것을 막는 근거, 트래커·PR 어디에도 없다 — 테스트의 사본을 지우고 여기를 주인으로) · `trendSeries()` 포인터 1 · `STP-verify-in-trend` 포인터 1. **판단 분기 1**: `으로 판별했습니다.` 조사 핀 1줄 — 트래커 #91 행이 「조사 `으로` 는 목업 스크립트의 문면 그대로 … 표기를 다듬는 자리는 목업 쪽」을 적지만, 이 줄은 코드 독자가 오탈자로 보고 고치는 것을 막는 핀이라 pin-guard-pass 선례(금지만 말하고 출처를 가리킨다)로 유지 |
| `web/src/screens/Trend.test.tsx` | 46 | 16 | 30 | **trend-rejudge-pass — 재판정.** 직전 판정(trend-surface-pass, 25줄) 이후 #85·#87·#91 이 21줄을 들였고 그 증가분만 처분했다. 제거 16줄 — `legendNames` JSDoc 1(다섯 줄 헬퍼의 이름이 말한다, `Compare.test.tsx` `exitCard` 처분) · 진입 상태 나레이션 2(「기본이 꺼짐이므로 선 하나」·「unchecked 가 진입 상태」 — 테스트 이름 `draws the picked subject alone until 겹쳐 보기 is opted into` 와 `expect(box.checked).toBe(false)` 가 복원) · 범례 2(구현 `CMP-legend` 앵커 문장이 주인) · 표 전건 2(주석이 「(등재된 편차)」로 자기 복원처를 지목 — 트래커 「상위 대상 비교 표가 겹쳐 보기를 따르지 않는다」 행 축자) · 스케일·색 불변 2(구현 `TrendChart` 의 두 주석이 주인 — 「다른 파일 주석의 재진술」) · 라디오 3종 2(테스트 이름 `with the mockup's three verdicts` + 트래커 #91 행 「라벨은 목업 바이트 동일」) · 배너 초기 상태 1 · 저장소 미사용 1(「트래커 행의 약속」 — 자기 복원처 지목, 단정이 곧 내용) · 저장소 수명 3(테스트 이름 `keeps the reader's conditions past the tab, like the dash brief card does` + `Trend.tsx` `VIEW_KEY` 주석 + 트래커 #87 행). 유지 30줄 — 직전 판정분 25줄 전량 + 이 창의 5줄: `afterEach` 정리 3(직전 2줄 승계 + 「옛 자리에 남은 값이 되살아나지 않게 둘 다 비운다」 하네스 사실 1) · 온도차 폼 배너 지목 2(「아무것도 고르지 않고 제출」·「메모는 공백 — 공백만 있는 메모는 비어 있는 것」: 추림 테스트의 배너 지목 2줄과 같은 꼴, 앞 패스의 유지를 뒤집지 않는다) · 폼 분리 1(「추림 폼의 배너는 이 폼의 제출에 반응하지 않는다」 — 왜 그 단정인지) . **판단 분기 1**: 「배너 문장은 목업 `submitVerdict()` 가 조립하는 그대로다 — 조사까지 목업의 것이다」 1줄 — `이번 구간만의 격차으로` 기대값을 오탈자로 고치는 것을 막는 핀(구현 쪽 같은 핀과 짝) |
| `web/src/screens/Trace.tsx` | 27 | 3 | 24 | **lineage-rejudge-pass — 재판정.** 직전 판정(lineage-surface-pass, 36→27) 이후 줄은 자라지 않았고 **복원 경로만 자랐다** — #77(`8bad0be`)이 설계 트래커에 `trace` 전수 판정을 등재했다. 제거 3줄 — 머리 문단 끝의 「셋을 한 덩어리 「데이터 없음」으로 그리면 독자는 자기 조회가 실패했다고 읽는다.」(`docs/econ-opinion-monitor-design-tracker.md` 「구현 전용 — 계보 결측 문면 3종」 행이 **축자** 복원 — #77 부모에서 0회, 트리거에서 1회 · 경로 ②) · 「그래서 계보 브레드크럼이 끊긴 자리를 드러내며 그려진다」(같은 파일 `CMP-crumb` 앵커 주석 「없는 홉을 숨기지 않고 끊긴 자리를 드러낸다」와 `.trace-crumb-gap` 렌더링이 복원 · 경로 ①, 설명의 주인은 앵커) · 그 앞의 매달린 `//` 1줄. 유지 24줄 — 화면이 `fairness` 다음 갈래인 이유(직전 판정 승계), 설계 원칙 「모자란 것을 뭉치지 않는다」와 세 결측 목록, `CMP-*`/`PAT-*` 앵커 여섯과 사유 절, AC2.5 집행 근거, 조회 축 규약, `.trace-` 접두사 가드. **판단 분기 셋을 유지로 확정한다**(직전 패스가 다음 패스 후보로 넘긴 것): ⓐ 설계 원칙 + 세 결측 목록(12~17행) — 트래커 그 행은 재검토 조건(「목업이 계보 결측 상태를 그릴 때」)이 걸린 **편차 행**이라 해소되면 「해소된 등재」로 옮겨지는 서술이고, 목록은 바로 아래 JSX 가 `found`·`body_preserved`·`silver` 세 갈래로 분기하는 이유라 「코드가 왜 그 모양인지」에 해당한다. ⓑ 앵커의 사유 절(`CMP-note — 링크가 죽어도 …(AC1.4)`·`CMP-kv — 수집 메타 …(AC1.5)` 등) — `Fairness.tsx`·`Sentiment.tsx`·`Trend.tsx` 와 같은 1줄 라벨 규약이고, 트래커 행은 편차의 사유이지 앵커의 라벨을 대신하지 않는다. ⓒ 인라인 AC 태그 — aggregation-harness-pass 의 `# AC3.2` 인라인 유지 선례 승계 |
| `web/src/screens/Trace.test.tsx` | 22 | 2 | 20 | **lineage-rejudge-pass — 재판정.** 직전 판정(lineage-surface-pass, 전량 유지) 이후 줄은 자라지 않았고 복원 경로만 자랐다 — #79(`82ceba2`)가 들인 2줄(「목업 `JRN-spike-verification.html#s-link-expired` 의 세 문장. 「사본을 보여준다」만이 아니라 **왜** 보여주는지와 배지가 항상 있다는 안내까지가 그 배너의 문면이다.」)을 **제거**했다: 설계 트래커 「해소된 등재」의 링크 만료 배너 행이 `#s-link-expired` · 3문장 · 「⑴ **왜** 사본을 보여주는지 ⑵ **배지가 항상 있다**는 안내」로 거의 축자 복원하고(②), 바로 아래 단언 3줄이 세 문장을 코드로 들고 있으며(①), 커밋 `82ceba2` 본문이 같은 교체를 적는다(④). 유지 20줄 — 전량이 「테스트가 **왜 그 모양으로** 단언하는지」(픽스처를 한 번만 쓰는 이유, `The case the whole trail exists for`, `"Set aside" is not "neutral"`, `Three ways to come up short …`, `A fallback must not read as a hit`). **판단 분기 확정**: 인라인 `(AC1.5)`·`(AC1.4)`·`AC2.5` 태그 3자리는 aggregation-harness-pass 의 `# AC3.2` 인라인 유지 선례를 승계해 유지한다 — 다음 패스로 다시 넘기지 않는다 |
| `web/src/screens/Dashboard.tsx` | 19 | 13 | 6 | **dash-brief-pass — 재판정.** 직전 판정(dashboard-surface-pass) 뒤 남음이 0 이었는데 `#84 (squash)` 가 `오늘의 조회 조건` 카드를 세우며 19줄을 들였고 그 전량을 판정했다. 제거 13줄 — 머리 9→3(여정 §4 분기·`STP-open-brief` 귀속·카드 문면 3줄 + 빈 `//`: 여정 문서 §4 표 행 · PR #84 「무엇을 좁히는가」 표 · 트래커 #84 해소 행이 축자 / 「파킹한 것은 대상 저장이지 조회 조건 보존이 아니라」 2줄: PR #84 · doc-tracker 축자) · `readStoredBrief` catch 1(`Trend.tsx` 의 같은 catch 와 바이트 동일한 사본 — 주인은 trend-surface-pass 가 유지한 `Trend.tsx` 쪽; 테스트 이름 `still renders when the browser refuses storage`) · `entryBrief` 머리 2(바로 아래 `if (!stored.restore) return { ...DEFAULT_BRIEF, restore: false }` · PR #84 「끈 선택 자체는 기억한다(잊으면 매번 다시 꺼야 한다)」 · 트래커 #84 행) · 검색 3→1(PR #84 「검색은 받아 둔 목록을 거른다 — 서빙이 검색어를 받지 않으므로 … `rows()` 의 `indexOf`」 축자 · 트래커 「순번」 행 · `filter(includes)` 와 `[axis]` 의존 배열) · 빈 검색 결과 JSX 1(트래커 #84 행·doc-tracker 「수집 부재와 구분해 말한다」 · 아래 두 조건문 · 테스트 이름) · `col-12` JSX 1(PR #84 「5칸으로 두면 격자에 7칸이 빈 채 혼자 남아 col-12」 축자). **정정 2자리(지문 −0)**: `storeBrief` catch 는 `eslint` `no-empty` 가 빈 블록을 잡아 주인 지목 포인터 1줄로(「삼키는 이유는 `Trend.tsx` 의 같은 두 catch 가 적는다」) · `STP-open-brief` JSX 블록은 앵커 1줄만 남기고 뒤 문단 둘(기간·단위 컨트롤 부재 → 트래커 「기간·단위 컨트롤」·「기간 표기」 행 / 카드를 응답 바깥에 두는 이유 → PR #84 축자)을 걷음(물리 −7). **유지 6줄**: **판단 분기** `BRIEF_KEY` 앞 수명 근거 3(PR #84·doc-tracker·트래커 #84/#87 행이 축자로 적으나 `Trend.tsx:81-82` 가 이 주석을 이름으로 「근거의 주인」이라 지목 — 지우면 그 포인터가 고아가 되고 `Trend.tsx` 는 표적 밖; web 묶음이 두 파일을 함께 열 때 포인터를 트래커 #87 행으로 옮기며 처분) · catch 포인터 1 · 「대소문자를 구분하는 것까지 목업(`rows()` 의 `indexOf`)과 같다」 1(의도된 목업 동등성은 PR·트래커 어디에도 없다) · `STP-open-brief` 앵커 1(목업 좌표 — `Reprocess.test.tsx` `STP-` 태그·`Trend.tsx:74` 와 같은 꼴). **dashboard-surface-pass — 재판정.** 직전 판정(initial-pass) 뒤 남음이 0 이었는데 `#81 (squash)` 이 순위 행에 3줄을 들였다. 제거 3줄 — 승계 계약의 근거(「축을 함께 넘기지 않으면 받는 쪽이 축을 추측해야 하고, 그 추측이 틀리면 그 축에 없는 대상을 묻게 된다」). **그 주석을 들인 PR 자신의 본문** 표 `Dashboard.tsx` 행이 같은 문장을 축자로 적고(경로 ③), 첫 문장은 바로 아래 `` navigate(`/trend?axis=${axis}&subject=…`) `` 가 말하며(경로 ①), design-tracker `:309` 가 같은 계약을 한 번 더 적는다(경로 ②) — 한 계약의 근거가 주석 3벌 + PR 본문 + 트래커 행으로 존재하던 자리다. 판정 후 남음 0 이라 지문 파일 집합에서 빠지지만 행은 남긴다 |
| `web/src/screens/Dashboard.test.tsx` | 17 | 10 | 7 | **dash-brief-pass — `#84 (squash)` 증가분 12줄만 재판정(옛 5줄은 `473b3cc` 그대로 — 아래 dashboard-surface-pass 의 판정 그대로).** 제거 10줄 — `afterEach` 3→1(수명 재진술 「날을 넘겨 사는 저장소」: 주인 `Dashboard.tsx` `BRIEF_KEY` 앞 주석 · 트래커 #84/#87 행 / 「복원 단정 테스트가 그 수명을 이용한다」: 아래 두 테스트가 `cleanup()` 뒤 다시 렌더하는 모양 자체) · 카드 문면 테스트 2→1(「제목과 sub 를 함께 단정한다 — sub 가 어제라고 적기 때문에」: 테스트 이름 `… with the copy that dates the promise`) · 검색 테스트 2(테스트 이름 `narrows … without re-querying serving` + `toHaveLength(calls)` · PR #84) · 빈 검색 테스트 2(`Dashboard.tsx` 빈 검색 JSX 와 같은 문장의 사본 — 트래커 #84 행·doc-tracker; 「파이프라인을 다시 돌리라고 시킨다」는 단언이 부재를 확인하는 `.placeholder-note` 문면 그대로) · 탭 넘김 테스트 2(테스트 이름 `reopens … across a closed tab` + `sessionStorage`/`localStorage` 단언 쌍 · 트래커 #87 행 — trend-rejudge-pass 의 `Trend.test.tsx` 「저장소 수명 3줄」 처분) · 비복원 테스트 1(테스트 이름 `… but remembers that choice` · PR #84 「잊으면 매번 다시 꺼야 한다」 — `Dashboard.tsx` `entryBrief` 머리와 같은 문장의 사본). **유지 7줄 = 옛 5 + 새 2**: `afterEach` 「저장소도 테스트 사이에 살아남는다 — 지우지 않으면 앞 테스트가 남긴 조건이 다음 테스트의 진입 조건이 된다」 1(바로 위 `cleanup()` 유지 2줄과 같은 하네스 사실 — `localStorage.clear()` 가 복원하는 것은 지운다까지) · 「문면이 바뀌면 아래 복원 단정도 함께 다시 판단해야 한다」 1(편집 지점 가드, 메커니즘·개수 없음). **dashboard-surface-pass** — `#81 (squash)` 이 신설한 파일의 첫 판정. 제거 2줄: 위 `Dashboard.tsx` 와 **같은 문장의 세 번째 사본**(제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」이며 이 파일은 주인이 아니다). 무엇을 단언하는지는 테스트 이름 `sends both the axis and the subject when a rank row drills into the trend` 가 말하고, 그 이름은 design-tracker `:309` 가 **검증 좌표로 직접 인용**하고 있어 계약↔단언 연결은 문서 쪽에 남는다. 유지 5줄: vitest 자동 cleanup 부재 2(`globals: true` 의 **부재**라 어느 파일도 적극적으로 말하지 않는다 — `Sentiment.test.tsx` 의 같은 유지와 같은 근거), 축 전환 스텁 설계 2(스텁이 축에 무감각해서 「화면 상태를 읽는 구현」과 「응답 본문을 베끼는 구현」을 가른다 — 픽스처 판별력은 단언·픽스처 어느 쪽을 읽어도 복원되지 않는다), **판단 분기** 도착 주소 JSDoc 1. **판단 분기** — `:53` `/** 라우트가 실제로 어디로 갔는지 읽는다 — 링크 문자열이 아니라 도착 주소를 단정한다. */` 는 #81 본문이 거의 같은 말을 해 경로 ③이 성립할 여지가 있으나, local 헬퍼 `Landing` 의 이름이 그 역할을 말하지 않고 담긴 것이 제품 계약의 변호가 아니라 **단언 설계**라 「애매하면 남긴다」로 유지했다 |
| `web/src/screens/Placeholder.tsx` | 3 | 0 | 3 | 유지 — 플레이스홀더가 증명하는 것 |
| `web/src/screens/Reprocess.test.tsx` | 25 | 2 | 23 | **reprocess-console-pass — #97 증가분 11줄만 재판정(그 아래는 reprocess-surface-pass 의 판정 그대로).** 제거 2줄 — `draws no run controls …` 테스트 머리 「The write half is drawn only on a positive probe: without it the note says why and there is no control to press」(테스트 이름과 `reprocess_trigger.go` 머리(주인) · `Reprocess.tsx` `CMP-note` 조건이 복원 — 「구현 주석의 사본」 유형, 아래 reprocess-surface-pass 의 2줄과 같은 처분). 유지 9줄: `stubWrites` JSDoc 1 · `STP-dry-run:`·`STP-run-reprocess:`·`STP-publish:` 머리 8(각 테스트가 왜 그 단언인지 — 「the full run stays locked until a sample has finished」 · 「resumed, not restarted — the same request goes again and the batch skips what its checkpoint already covers」 · 「a rollback targets the version the comparison calls "before", and the server's refusal is shown in its own words」; 머리의 `STP-` 태그는 아래 `STP-scope-range:`·`STP-compare-before-after:` 와 같은 목업 좌표). **reprocess-surface-pass** — #94 신설. 제거 2줄 — `round-trips …` 테스트 머리 「The selection is server-side: changing the range or the axis re-fetches …」(`client.ts` `reprocess` 앞 3줄의 사본 — trend-rejudge-pass 가 `Trend.test.tsx` 에서 걷은 「구현 주석의 사본」 유형; 테스트 이름 `round-trips range, axis and source through the query` 가 나머지를 말한다). 유지 14줄: 스텁 설계(「Every expected value below is read off this stub, never written twice」 · 「Server order: biggest \|delta\| first」) · `calledUrl` JSDoc 1 · 각 테스트의 「왜 그 단언인지」(「No fake before/after … the versions Silver does hold are still listed」 · 「Raise the threshold above every delta: nothing is flagged any more」 · 「Sort by after-share: the row with the largest after share leads」 · 「An empty lake is an empty scope, not an error and not an invented table」 · 「The trigger note is always present」). `STP-scope-range:`·`STP-compare-before-after:` 머리 2건은 `Trend.test.tsx:149` 의 `STP-drill-trend` 지목과 같은 목업 좌표 |
| `web/src/screens/Reprocess.tsx` | 28 | 10 | 18 | **reprocess-console-pass** — #94 신설, reprocess-surface-pass · reprocess-trigger-pass 가 파일째 보류(열린 #97 · #96 자물쇠)했던 파일의 첫 판정(#97 이 머리·「실행」 절을 갈아 쓴 뒤 28줄). 제거 10줄: 머리 8→2(「로드맵 슬라이스 10」 배너 — 작업 흔적 · 여정 단계 목록 문단 — 여정 문서 §3 이 복원하고 reprocess-trigger-pass 가 그 영어 원본(`reprocess.go` 머리)을 지우며 이 자리를 사본으로 지목 · 프로브 문장 — `reprocess_trigger.go` 머리 · `argo.TemplateReachable` 이 주인; 남긴 2줄은 읽는 둘/일으키는 셋의 위치 + 주인 포인터 — 파일을 왜 갈랐나는 이름만으로 복원되지 않는다) · `reload` 상태 주석 1(`ReprocessTrigger` prop doc `onChanged` 가 web 안의 주인) · 소스 목록 블록 1(`reprocess.go` `Sources` doc 이 주인, 축자) · 보류 몫 note 주석 1(`UnanalyzedShare` doc · 설계 트래커 L474 축자) · 버전 표 주석 1(설계 트래커 L481 「「비교 불가」와 「데이터 없음」은 다른 뜻」 축자 · `compareVersions` doc). **정정 4블록(지문 −0)**: `CMP-seg`(`client.ts:70-72` 가 주인) · `CMP-table`(`bucketsOf` doc 이 주인, 뒷절은 병존 이전 상태 서술로 낡음) · `CMP-note`(`reprocess_trigger.go` 머리) · `PAT-before-after`(`compareRow` doc 이 영어 원본)의 산문을 걷고 앵커만 남김. 유지 18: 머리 2 · `sortRows` JSDoc(reprocess-surface-pass 가 지목한 **결정의 주인**) · 축 전환 `setSource("")` 의 이유 1(구현이 주인, `Reprocess.test.tsx:166` 은 그 사본으로 이미 유지) · 절 표지 2 · 앵커 9(`markers()` 자물쇠) · **판단 분기 2**: 주목 임계 상태 2줄(「임계 자체는 제품 결정이 아니라 운영자 입력이라 화면 상태로 둔다」 — 왜 화면 상태인가는 여기뿐) · 예상 소요 주석 2줄(`throughput` doc 이 주인이나 설계 트래커 L483 이 **이 주석을 출처로 인용** — 재핀은 mockup-render 몫이라 실체를 남김). 설계 트래커 자물쇠 다섯은 이 패스로 더 밀렸다(이 패스 뒤 좌표는 패스 문서) |
| `web/src/screens/ReprocessTrigger.tsx` | 23 | 12 | 11 | **reprocess-console-pass** — #97 신설. 제거 12줄: 머리 10→2(「세 단계는 각각 배치 Workflow 하나를 제출 · 서빙은 레이크를 쓰지 못하고 쓰는 것은 배치 · `trigger.available` 은 플래그가 아니라 프로브 · 버튼은 실제로 일으키는 버튼」 — 전부 `reprocess_trigger.go` 머리 16~28행의 한국어 사본, `argo.TemplateReachable` doc · `Reprocess.tsx` 마운트 조건 · doc-tracker ⑷⑸ · PR #97 본문이 함께 복원; 남긴 2줄은 세 단계 id 를 든 lede + 주인 포인터) · 폴링 effect 머리 2(같은 파일 prop doc `onChanged` 가 계약의 주인 · effect 본문 · doc-tracker ⑸ 축자) · 병존 블록 1(doc-tracker ⑴⑸ · 설계 트래커 L510 · PR #97 「「덮어쓰기」 토글 없음(병존이 구조)」 축자 · `store.go` `Analyses` doc) · 결정 이력 표 주석 1(`store.ReprocessDecision` doc 「The last one names the version Gold serves」가 주인 · doc-tracker ⑸). **정정 2블록(지문 −0)**: `CMP-table` 앵커 둘의 산문(표본 런 표 — `samples` 필터·doc-tracker ⑴ / 확인 표 — 표 행 `"가능 (버전 병존)"`·설계 트래커 L511)을 걷고 앵커만 남김. 유지 11: lede·포인터 2 · prop doc `overThreshold`·`onChanged` 2(프롭 계약) · 폴링 catch 의 「the next tick asks again; a missed poll is not an error to show」(왜 실패를 삼키나 — 여기뿐) · `STP-dry-run`·`STP-run-reprocess`·`STP-publish` 절 표지 3(여정 단계 좌표) · 앵커 3(`CMP-table` ×2 · `CMP-kv`) |
| `web/src/shell/AppShell.tsx` | 1 | 0 | 1 | 유지 — 디자인 시스템 패턴 식별자(PAT-screen-shell) |
| `web/src/shell/MapStrip.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 목업을 따르는 칩 구분자 규약 |
| `web/src/shell/Sidebar.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 페르소나 태그의 목업 근거 |
| `web/src/shell/Topbar.tsx` | 1 | 0 | 1 | 유지 — 컴포넌트 식별자 |
| `web/src/shell/nav.ts` | 4 | 2 | 2 | 수정 — 첫 줄의 '어느 화면이 구현됐는가' 절 2줄 제거(App.tsx가 복원하며 스스로 그렇게 말함), 목업 인덱스 출처 표기는 유지 |
| `web/src/tokens/tokens.css` | 62 | 0 | 62 | **reprocess-console-pass — #97 이 들인 `.rp-` 구획 1줄(블록 첫 줄 기준)만 재판정(그 아래는 reprocess-surface-pass · trend-rejudge-pass 의 판정 그대로).** 제거 0 · **정정 1블록(지문 −0)**: 「(규칙 5 교집합 불변)」 → 「(규칙 5 대조 규약)」(게이트 메커니즘은 설계 트래커 「규칙 3·4(네비)·5 기계 판정」 절이 주인 — 아래 열한 블록과 같은 꼴). 이름 사상(`.fld`·`.chk`·`.formrow`·`.radios` → `.rp-` — 목업 이름은 코드에 없어 이 줄이 유일한 대조 좌표)과 `.btn.pri` 공유 이유(「기본 버튼의 강조형이라 이름을 달리 둘 이유가 없다」 — 설계 트래커 L468 은 공유 사실과 R5 충돌 0 만 적는다)는 유지. **reprocess-surface-pass — #94 가 들인 `PAT-before-after (reprocess screen)` 구획 1줄(블록 첫 줄 기준)만 재판정(그 아래는 trend-rejudge-pass 의 판정 그대로).** 제거 0 · **정정 1블록(지문 −0)**: 「재처리 전후 비교 — 같은 서술 대상을 두 로직 버전으로 나란히 놓는 표. 표 자체는 목업과 같은 table.tbl 이라 위 CMP-table 선언을 그대로 쓰고」(`Reprocess.tsx` `<table className="tbl rp-cmp">`·`compareRow` doc, ①)와 규칙 5 메커니즘 문장 「빌리면 규칙 5 의 공통 선택자 교집합이 넓어진다」(설계 트래커 「전부 `.rp-` 접두라 목업 인라인 `<style>` 과 교집합을 만들지 않고」가 주인, ②)를 걷고 아래 열한 블록과 같은 꼴(앵커 + 빌리지 않는 목업 이름 `.tag`·`.muted`·`.emptybox`·`.fld` 사상 + 「(규칙 5 대조 규약)」)로 줄였다. 첫 줄은 `markers()` 자물쇠라 유지. **trend-rejudge-pass — 재판정.** 직전 판정(regression-pass, 38줄) 이후 #45·#53·#66·#70·#76·#80·#84·#85·#91 아홉 PR 이 23줄(블록 주석 첫 줄 기준)을 들였고 그 증가분만 처분했다 — trend-surface-pass 가 #76 수정 중이라 뺐던 16줄 포함. 제거 1줄 — `.raw-flag` 의 「The raw-mode counterpart of .norm-flag, also the mockup's declarations」(이름 짝이 말하고, 목업 선언 공유는 게이트가 센다). **지문 −0 정정 11블록**: 아홉 구획 주석(compare 이탈 카드 · `.gridline/.axlab` · STP-drill-trend · PAT-donut · sentiment 분리 · CMP-table · CMP-norm-toggle · `button.norm-toggle` · STP-shortlist · STP-verify-in-trend · STP-open-brief)과 `table.tbl tr.click.on td` 가 각자 되풀이한 규칙 5 게이트의 메커니즘 문장(「목업이 쓰는 이름을 여기 들이면 규칙 5 가 그 선택자를 선언 단위로 대조하기 시작하는데, 세 상한이 전부 0 이라 대조면이 그 순간 움직인다」 · 「the render gate compares them declaration by declaration and all three caps are zero」 — 설계 트래커 「규칙 3·4(네비)·5 기계 판정」 절이 주인, `Trend.tsx` 의 `.trend-sl-` 가드가 「근거는 설계 트래커의 규칙 5 대조 규약」 한 구절로 가리키는 pin-guard-pass 꼴)을 걷고 「(규칙 5 대조 규약)」 포인터로 바꿨다; 「슬라이스 8」·「slice 5」 작업 흔적도 함께. 유지 60줄 — 직전 판정분 38줄 전량(`* {`·`#root {` 셀렉터 오탐 2 포함) + 이 창의 22줄: `CMP-*`/`PAT-*`/`STP-*` 구획 앵커 첫 줄 전부(`markers()` 가 주석에서 이름을 긁는다 — `CMP-table`·`PAT-line-chart`·`PAT-donut`·`PAT-stacked-sentiment`·`CMP-norm-toggle`·`PAT-raw-vs-norm`·`PAT-lineage`·`CMP-crumb` 은 지우면 R3 가 깨진다), 목업 대응 규칙의 이름 사상(`.radios`→`.trend-vd-`, `.fld`→`.trend-sl-`/`.dash-brief-`, `.muted` 인라인 등 — 목업 이름은 코드에 없어 이 줄이 유일한 대조 좌표), `PAT-lineage` 의 trace 전용 근거(인라인 스크립트 조립 구조라 대조가 신호를 주지 못한다 — 트래커 규칙 5 절은 「교집합을 만들지 않는다」까지만), `.col-8` 예외 근거, `PAT-raw-vs-norm`·`.fair-cmp .meta` 의 시각 논증, `.trace-body`·`.trace-url` 근거. **판단 분기 2**: `.trend-ov-form` 간격 1(「목업도 `#trendchart` 쪽 margin-top 에 같은 간격」 — 목업 파일이 복원하나 자리가 다른 대응이라 유지) · `.dash-brief-empty` 문면 분기 1(트래커 #84 행 「수집 부재와 구분해 말한다」가 거의 축자이나 CSS 규칙이 왜 빈 상태와 같은 모양인지는 여기뿐) |
| **rollup-test-pass 기준 · 레포 전체** | **2498** | **12** | **2486** | 지문 값(판정 트리 `1f508e1` = #105 착지 tip = main; 자매가 더 착지해 값이 움직이면 「이 패스의 델타 −12/±0 이 반영됐는가」로 읽는다). 이 표는 **138개 파일 행**을 갖는다 — 지문의 134파일과 집합이 다르다(남음 0 이라 지문에서 빠진 행 넷 `Makefile`·`scripts/check-mockup-render.py`·`web/src/screens/Compare.test.tsx`·`python/packages/core/src/econ_core/storage.py` + #92 로 파일이 소멸한 `deploy/overlays/prod/pvc.yaml` 행 하나 ↔ 아직 행이 없는 파일 **1** `scripts/check-data-format-change.py`). 행마다 기준 패스가 다르므로 위 열의 단순 합과는 다르다. **미판정 잔여는 「읽는 법」의 계수 규약대로 두 몫을 합쳐 78줄, 계수 밖 「보류」는 0**이다: ⑴ 아직 행이 없는 파일 **1개 10줄**(`scripts/check-data-format-change.py` — #75 `66d8f98` 신설, 변동 없음), ⑵ 행이 있으나 판정 이후 자란 파일의 증가분 **11파일 68줄**(`web/src/screens/Sentiment.tsx` 54→71 · `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` 48→61 · `web/src/screens/Sentiment.test.tsx` 21→31 · `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` 22→31 · `python/packages/aggregation/src/econ_aggregation/aggregate.py` 11→15 · `python/packages/analysis/tests/test_llm.py` 8→12 · `deploy/overlays/prod/kustomization.yaml` 20→23 · `python/packages/ingestion/tests/test_feeds.py` 21→24 · `web/src/screens/Fairness.test.tsx` 16→18 · `web/src/screens/Reprocess.test.tsx` 23→25(#102 — reprocess-console-pass 뒤 착지) · `web/src/screens/Compare.tsx` 10→11). 직전 패스의 보류 0 그대로. `python/packages/aggregation/tests/test_aggregate.py` 는 이 패스로 행이 갱신돼(남음 7 = 실측) ⑵ 에서 빠졌다(86 − 18 = 68). **다음 패스의 선은 ⑴ `scripts/check-data-format-change.py` 10줄**(복원처 PR #75 본문 · 같은 파일 docstring — `:44`·`:63`·`:64`·`:102`·`:105` 는 축자 복원 후보, `:183-185` 의 ruff-format 모양 의존 3줄은 유지 후보) **또는 ⑵ 최대 `web/src/screens/Sentiment.tsx` +17 · `Sentiment.test.tsx` +10**(한 묶음 27 — 같은 화면의 구현·테스트라 dash 묶음처럼 함께 본다), 그다음 `aggregation-5-subject-trend-chart.spec.ts` +13 → 나머지; `Reprocess.test.tsx` 의 #102 분 2줄과 **`Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터**(dash-brief-pass 판단 분기 — 주인을 지우려면 포인터를 트래커 #87 행으로 옮겨야 한다)는 web 묶음이 다시 열릴 때 함께 본다. `test_aggregate.py` 의 인라인 AC 태그 3줄(`(AC3.3)`·`(AC3.8)`·`(AC3.4)`)은 정책 소유자가 인라인 태그의 처분을 정하면 함께 본다. **행 남음이 실측과 어긋나는 자리**: `deploy/overlays/prod/batch-pvc.yaml` 행 남음 9 · 실측 7 — #92 의 내용 교체라 증가분 계수에 잡히지 않는다(같은 커밋의 `deploy/overlays/prod/kustomization.yaml` 20→23 도 내용 교체; 둘 다 다음 `deploy/` 표적 패스의 입력 — 트래커가 `∋` 좌표로 인용하는 두 문장은 지우면 트래커가 끊기고, efs access point uid/gid 고정은 유지 대상). 착지 시점에 열린 PR 은 **0**. **잔여에 들어가지 않는 재판정 후보**: `Fairness.tsx` 118행 위 28줄(트래커 `Fairness.tsx:110-118` 인용이 풀릴 때) · `Trend.tsx` 「deliberately *not* here」 두 항(처분 시점은 트래커 그대로 「단위가 선택 가능해질 때」) · `handlers.go` 패키지 주석 본문(트래커 `handlers.go:34`·`:30-37` 인용이 내용 지목으로 바뀔 때) · 설계 트래커의 `Reprocess.tsx` 자물쇠 다섯 재핀(mockup-render 몫 — reprocess-console-pass 문서에 좌표) · `cli.py` 캐시 병합 순서 1줄(판단 분기 — 부분 실패 경로가 사라지면 다시 본다). **원본 쪽 누락 좌표(자매 journey-mockup 모델 몫)**: mockup 인덱스 :150 이 R10 스캔 대상에서 README 를 빠뜨림 · 트래커 :25 「정적 R1~R11」이 R12 를 빠뜨림. 재감지가 새 task로 잇는다 |
