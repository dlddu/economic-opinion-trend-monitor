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

pin-guard-pass는 전수가 아니라 **3파일 표적 재판정**이다(핀 메커니즘을 되풀이한 자리). 줄 수는 그 시점의
풀 전체 값이고, 판정한 것은 세 파일뿐이다. 그 세 파일 안에도 **이 패스가 판정하지 않은 주석**이 있으면
아래 파일별 행의 판정 칸에 그 사실과 추적처를 적는다 — 「각 행은 마지막으로 판정한 패스 기준」 규칙 때문에,
적지 않으면 파일 전체가 판정된 것처럼 읽힌다.

## 파일별 원장

| 파일 | 판정 전 | 제거 | 남음 | 판정 |
|---|---:|---:|---:|---|
| `Makefile` | 18 | 18 | 0 | 전량 제거 — 머리 11줄은 README「디렉터리 구조」「상태」재진술(골격·페이크 서술은 낡음), 18행은 `gen-check` 타깃이 복원, `## ---` 6줄은 구분선(help 파서 `^타깃:.*## `에 걸리지 않는 장식) |
| `contracts/codegen.py` | 23 | 18 | 5 | 구분선 배너 6개(18줄) 제거. 유지: 원시 타입 표 설명, ruff magic-trailing-comma 회피 근거, 드라이버의 `# Python`/`# Go` 절 표지(애매 — 유지) |
| `deploy/base/deployment.yaml` | 11 | 2 | 9 | **pin-guard-pass** — 제거 2줄: `deploy` 브랜치 발행 메커니즘 서술(어디로 발행되는지·무엇을 Flux가 추적하는지·어느 값이 운영값인지 — `.github/workflows/image.yml`과 README「운영 고정(`pin` job)」이 복원). 수기 편집 금지 가드는 **메커니즘 비의존 문면**으로 다시 써 유지. 유지: Gold 부재 시 빈 데이터셋·emptyDir 오버레이 이음새, 불변 태그라 IfNotPresent가 옳다는 근거 |
| `deploy/base/kustomization.yaml` | 9 | 0 | 9 | **pin-guard-pass** — 줄 수 불변, 문면 정정 1곳: 거짓이 된 괄호절 `(where CI's \`pin\` job writes the main SHA)` 삭제(#35 이후 CI는 main에 쓰지 않는다). 유지 — `images:` 트랜스포머를 base에 두지 않는 이유(프리뷰·e2e 재태깅과의 중첩) |
| `deploy/batch/cronworkflow-ingestion.yaml` | 27 | 10 | 17 | 제거 10줄 — AC1.1 배너(시나리오1↔이 파일은 doc-tracker e2e 매핑이 복원), ★suspend 착지 문단(README「배포」재진술 + 실제 `suspend: false`와 어긋난 낡은 서술). 유지: AC1.1 의무↔필드 대응·누락 보정 근거(스케줄 계약) |
| `deploy/batch/cronworkflow-pipeline.yaml` | 34 | 6 | 28 | 제거 6줄 — ★suspend 착지 이유(README「배포」재진술). 유지: 상호 배타 근거, 켜기 전 4단계(analyzer_version·attempted=/failed=·exit 3 등 README에 없는 운용 지식), 과금 경고 |
| `deploy/batch/kustomization.yaml` | 17 | 3 | 14 | 제거 3줄 — 두 스케줄 중 하나만 돈다(README「배포」재진술). 유지: base 밖에 두는 이유(kind e2e·Argo 부재), 클러스터 범위 컨트롤러, kustomizeconfig 연결 |
| `deploy/batch/kustomizeconfig.yaml` | 10 | 0 | 10 | 유지 — kustomize `images:` 트랜스포머가 WorkflowTemplate 경로를 모르는 함정과 선언 위치 근거 |
| `deploy/batch/rbac.yaml` | 6 | 0 | 6 | 유지 — workflowtaskresults 권한이 없으면 첫 단계가 실패하는 런타임 제약 |
| `deploy/batch/workflow-template.yaml` | 45 | 3 | 42 | **aggregation-harness-pass — AC3.2 aggregate 블록만 판정(파일 전체 아님)** — 제거 3줄(6줄 → 3줄): "Until this template existed … no scheduled path ever produced Gold and serving fell back to empty datasets (deploy/base/deployment.yaml)"는 #38 커밋 메시지(경로 ④)와 `deploy/base/deployment.yaml`의 유지 판정 주석(경로 ①)이 복원하며, **initial-pass가 이 파일 머리에서 지운 "aggregation gets its own entrypoint when that slice lands"의 과거형 재발**이다. 유지: `# AC3.2` 인라인 태그(판단 분기 — `# AC1.1`·`# AC2.1-2.6`과 같은 형태), `No args: …` 2줄, `Pure recomputation … never billable` 2줄. **직전 행(pin-guard-pass)이 남긴 「미판정 10줄」 포인터는 이 패스가 해소했다** — 그 10줄이 곧 여기서 판정한 #38(`33e24ea`)의 AC3.2 aggregate 블록이다. **머리 가드 2줄("The `image:` tags in this file are CI-owned … README 「운영 고정(`pin` job)」")은 pin-guard-pass의 판정분이고 이 패스는 판정하지 않았다** — 판정 전 45는 pin-guard-pass가 그 가드를 3줄 → 2줄로 줄인 뒤의 실측값이다. 이 블록 밖의 줄은 initial-pass(머리 배너 3줄 제거 — AC 흔적 + 집계 후속 = README「범위」재진술)와 pin-guard-pass의 판정이 유효하다: 엔트리포인트 2개 근거, imagePullSecrets 선언 위치, exit 2 재시도 금지, Secret required 근거 등 유지 |
| `deploy/overlays/preview/kustomization.yaml` | 30 | 0 | 30 | 유지 — efs StorageClass가 PVC 이름으로 access point를 재사용·연쇄 삭제하는 함정, Flux 분담, delete 패치가 이름 기준이라 새 CronWorkflow를 덮지 않는 함정. 머리의 serving/batch 두 절은 README「PR 프리뷰」와 겹치나 함정 서술과 한 덩어리라 판단 분기로 유지 |
| `deploy/overlays/prod/batch-pvc.yaml` | 13 | 4 | 9 | 제거 4줄 — 체인 연결 시 공유 방식 결정 예고(README「배포」재진술, 스스로 'see README'). 유지: RWO 멀티어태치 근거, storageClassName 부재 의도 |
| `deploy/overlays/prod/kustomization.yaml` | 32 | 12 | 20 | 제거 12줄 — `kubectl apply -k` 적용법·외부 노출(README「배포」재진술), 두 CronWorkflow 인계 목록(README·cronworkflow-pipeline.yaml 재진술). 유지: Recreate/RWO 근거, template-wide 볼륨, 주기 오버라이드 패치 예시(cronworkflow-ingestion.yaml이 가리키는 위치) |
| `deploy/overlays/prod/pvc.yaml` | 1 | 0 | 1 | 유지 — storageClassName 부재 의도(프리뷰의 efs 함정과 대비되는 의도적 기본값) |
| `go/cmd/serving/main.go` | 4 | 0 | 4 | 유지 — 패키지(command) doc 주석, 프로브를 액세스 로그에서 빼는 이유 |
| `go/internal/handlers/handlers.go` | 252 | 5 | 235 | **serving-handlers-pass — 재판정.** 직전 판정(initial-pass, 24줄) 이후 #45·#53·#62·#66·#70 이 228줄을 들였고, 증가분만이 아니라 **파일 전체를 다시 판정**했다. 제거 5줄 — `latestBucket` 앞에 **doc 주석 블록이 두 벌 겹쳐 붙어** 있었고 앞 판을 걷었다(뒤 판이 같은 사실을 더 정확히 적는다: 「단위를 먼저 정하지 않으면 사전순 최대는 시간순 최대가 아니다」. 나머지 두 주장은 `distinctBuckets` doc(0 채움 ISO 접두사)·`finestUnit` doc(빈 입력의 zero unit 계약)이 복원 — 경로 ①. 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」를 한 파일 안의 두 벌에 적용). **문면 정정 3곳(12줄 감소)**: `trend`·`sentiment`·`fairness` doc 의 「Mixed bucket units」 항목(6·4·4줄)을 **주인 지목 포인터 1줄**로 줄였다 — 주인은 세 핸들러가 실제로 부르는 `plottedUnit`·`sentimentUnit` 이고(`compare` doc 이 이미 쓰는 형태), 그중 둘은 「AC3.3 has not landed」로 **거짓이 된 채** 남아 있었다(`32faf64` 착지 후 `plottedUnit` 만 고쳐졌다). 같은 정정에서 과거 상태 서술 둘(`sentiment` 의 「which is what this route used to do」 · `fairness` 의 「until now this route closed neither」)을 걷었다 — 복원 경로는 슬라이스 커밋 `b30a321`·`ddaef4f`(④)와 doc-tracker `2026-09.md` 변동 이력(②). 유지 235줄: 패키지·타입·함수 doc 주석 골격(`New builds Handlers…` 는 정의 표본 ①과 doc 주석 유지 규칙이 충돌 — 유지 규칙 우선) · **버킷 키의 비자명한 성질**(단위 안에서만 비교 가능 · `2026-W26` > `2026-06-23T14` 의 이유 — 모델 정의가 이름 대어 유지로 지목한 지식이고 이제 단위를 고르는 함수들에만 있다) · 응답 계약의 「왜 두 필드인가」(`BodyAvailable`/`BodyPreserved` 는 AC1.4 가 존재 이유인 경우에 갈린다 · `Sentiment` 포인터는 AC2.5 · `Present` 는 0 분포와 미집계의 차이 · `RawShare` 는 정규화 점유율이 **아니라는** 것이 AC3.1 편차의 정의) · `traceResponse` 의 「모자란 것을 뭉치지 않는다」 3분기 표 · 상한 상수의 근거(`trendSeriesLimit`·`fairnessRowLimit` 는 **왜 그 값인지**를 코드가 말하지 않는다) · 방어적 계산의 의도(`shareOf` 의 0 vs NaN · `sentimentSeries` 의 중복 버킷 = 상류 계약 위반 · `selectNewsItem` 의 폴백 명명). **판단 분기 셋**: ⑴ **패키지 주석 본문 6줄** — 경로 ①(`Register` 라우트 열거 · `reprocess` 본문 · `trace` doc)이 성립하지만 design-tracker 가 `handlers.go:34`·`:30-37` 을 판정 근거로 **줄 번호 인용**해 제거가 자매 모델 행의 처분과 묶이고(`Sentiment.tsx:24-29` 선례), 경로 ②는 **README 쪽이 낡아**(`:223`·`:228` 이 「나머지 6화면은 플레이스홀더」·「스텁 라우트만」) 성립하지 않는다. 다시 볼 시점: 그 인용이 내용 지목(`∋ func …`)으로 바뀌거나 그 행이 처분될 때 ⑵ 세 basis doc 의 「같은 기준을 명시한다」 3벌 — 셋이 서로를 지목하는 형태로 주인이 정해져 있고 뒷절이 화면별 오독 방식을 담는다 ⑶ `trend`·`fairness` 의 「Ranking on stale rows」 2벌 — 헬퍼 doc(`seriesBySubject`·`latestBucketOf`)은 정렬 규칙을, 이쪽은 **그 핸들러가 무엇을 잘못 답하게 되는가**를 적는다. 사본 셋을 하나로 줄인 「Mixed bucket units」 와 달리 두 벌뿐이고 문면이 갈린다 |
| `go/internal/handlers/handlers_test.go` | 120 | 1 | 118 | **serving-handlers-pass — 재판정.** 직전 판정(initial-pass, 14줄) 이후 #45·#53·#62·#66·#70 이 106줄을 들였고 파일 전체를 다시 판정했다. 제거 1줄 — `// --- trace (slice 9) ---` 구분선(제거 유형 ④ + 괄호 안은 ③ 「작업 흔적」. 절 이름은 바로 아래 `writeLineage`·`TestTrace*` 이름이 복원하고, **같은 패키지에서 initial-pass 가 지운 `// --- … ---` 3줄의 재발**이다). **문면 정정 1곳(1줄 감소)**: `TestTraceJoinsBronzeBodyAndSilverAnalysis` 머리의 「Before slice 9 this returned a fixed string with no lake read behind it」를 걷었다(유형 ③ — doc-tracker 슬라이스 9 행이 「`/api/trace` 는 일곱 라우트에 남은 두 자기선언 stub 의 하나였고」로 축자 복원). 유지 118줄 — **전량이 「테스트가 왜 그 모양으로 단언하는지」·「픽스처가 왜 그 모양인지」**이고 `Sentiment.test.tsx`·`Fairness.test.tsx`·`Trend.test.tsx`·`Dashboard.test.tsx` 의 전량 유지와 같은 판정이다(앞 패스들의 유지를 뒤집지 않는다): 픽스처 판별력 표 5종(`writeMultiBucketGold` 는 **가장 큰 점유율을 낡은 버킷에** 둬 필터 누락이 즉시 드러나게 했다 · `writeTrendGold` 는 네 대상 × 세 버킷 + 주 롤업으로 「차트가 잘못 그려질 모든 방식에 증인」 · `writeRolledUpGold` 는 같은 레코드 세 벌로 3중 계상 유발 · `writeSkewedGold` 는 원시 60/100 인데 정규화 0.25 라 두 방식이 어긋난다 · `writeMixedUnitSentiment` 는 일 롤업 키가 사전순 최대) · 단언 설계(낡은 0.9 가 새지 않는다 · 축이 비면 옛 버킷을 빌리지 않는다 · 네 비율 합 1 **과** 미분석 0.2 를 함께 단언 · 원시 합이라 3중 계상이 8 대신 24 로 드러난다 · 두 세는 방식이 어긋나야 AC3.8 「구분 표기」에 내용이 있다) · **단위/e2e 층 분담**(e2e 픽스처가 의도적으로 단일 버킷이라 두 버킷을 공급하는 단위 테스트만이 「핸들러가 하나를 고른다」를 증명한다) · 롤업 전용 Gold 가 고장이 아니라는 판독. AC 태그·AC 인용은 판단 분기로 유지 |
| `go/internal/static/static.go` | 6 | 0 | 6 | 유지 — 패키지·export doc 주석(SPA 폴백 동작 설명) |
| `go/internal/store/store.go` | 29 | 0 | 29 | **lineage-surface-pass — 재판정(전량 유지).** initial-pass 이후 슬라이스 9 가 17줄을 들였고(패키지 주석의 계보 문단, `NewsItems`·`NewsBodies`·`Analyses` doc 주석) 그 17줄에도 옛 유지 사유가 그대로 성립한다: 정책의 유지 대상인 패키지·export doc 주석이고, 본문이 시그니처 재진술이 아니라 **데이터 계약의 비자명한 성질**이다 — 본문이 레코드가 아니라 해시로 걸리는 이유(한 본문이 여러 관측을 받치고, 수정된 기사는 덮어쓰지 않고 새 버전을 덧붙인다, AC1.7), Python `LocalFsStore` 와의 대응, 「없는 파일 = 빈 슬라이스」 계약. **판단 분기 — 패키지 주석의 계보 문단 4줄**(`Most screens read Gold … Lineage is the exception`)은 doc-tracker 변동 이력이 같은 사실을 적어 경로 ②가 성립할 여지가 있으나, 같은 패스가 `store_test.go` 의 재진술을 지우며 **이 자리를 설명의 주인으로 지목**했으므로 유지한다 |
| `go/internal/store/store_test.go` | 6 | 4 | 2 | **lineage-surface-pass** — 제거 4줄: ⑴ `Lineage needs Bronze and Silver, not Gold … one body can back several observations (AC1.7)` 3줄은 같은 패키지 `store.go` 의 패키지 주석과 `NewsBodies` doc 주석이 양쪽 절을 그대로 갖고 있다(제거 유형 「다른 파일 주석의 재진술」 — 설명의 주인은 구현 쪽), ⑵ `Bronze and Silver are absent until the pipeline has run, exactly like Gold.` 1줄은 바로 아래 테스트 이름 `TestMissingBronzeAndSilverReadEmpty` 가 그대로 복원하고 `store.go` 의 `(empty if absent)`·`readJSONL` doc 주석이 한 번 더 적는다. 유지 2줄 — `A null sentiment is a value, not a decode failure` (이 테스트가 **왜** null 디코드를 성공으로 단언하는지. 테스트 이름은 무엇을 하는지만 말한다) |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` | 12 | 1 | 11 | **aggregation-harness-pass** — 제거 1줄: `# Percentage points, matching the contract's \`delta\` doc.` — 주석이 자기 복원처를 이름으로 지목하고 원본(`contracts/gold/subject_trend.avsc` `delta` 필드 `doc`)이 AC 번호까지 달아 더 정확하다(정책 doc 주석 항의 `contracts/` 스키마 재진술). 유지: 중첩 dict 형태 표기, 버킷 키 사전식=시간순 근거, "없는 버킷은 0이 아니다", AC3.4 분리 근거(태그는 판단 분기) |
| `python/packages/aggregation/src/econ_aggregation/cli.py` | 3 | 0 | 3 | **scenario-spec-pass** — 전량 유지. 세 버킷 단위를 한 데이터셋에 싣는 이유와 "한 차트를 그리는 소비자는 단위 하나를 먼저 고른다"는 소비 규약 — 평평하게 읽는 소비자가 중복 계상하는 자리라 코드·계약 어느 쪽으로도 복원되지 않는다 |
| `python/packages/aggregation/tests/test_aggregate.py` | 1 | 0 | 1 | 유지 — 테스트 의도(AC 태그 판단 분기) |
| `python/packages/analysis/src/econ_analysis/cli.py` | 7 | 0 | 7 | 유지 — 종료 코드 의미(`#:` 속성 doc), 운영자 오류를 레이크 접근 전에 실패시키는 근거, 전량 실패 시 Silver 보존 근거 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | 4 | 0 | 4 | 유지 — 페이크 모델의 판정 규칙 근거(AC 태그 판단 분기) |
| `python/packages/analysis/src/econ_analysis/llm.py` | 2 | 0 | 2 | 유지 — 저신뢰 임계 공유, 카탈로그 정규화 방침 |
| `python/packages/analysis/tests/test_cli.py` | 5 | 0 | 5 | 유지 — 테스트 의도(기본값 전환·장애 가드) |
| `python/packages/analysis/tests/test_fake_llm.py` | 2 | 0 | 2 | 유지 — 테스트 의도(AC 태그 판단 분기) |
| `python/packages/analysis/tests/test_llm.py` | 8 | 0 | 8 | 유지 — 분석 결과 vs 운영 실패 구분 근거(AC 태그 판단 분기) |
| `python/packages/core/src/econ_core/domain.py` | 3 | 0 | 3 | 유지 — 상수 묶음 표지 3줄(재진술성이나 짧고 애매 — 유지) |
| `python/packages/core/tests/test_storage.py` | 3 | 0 | 3 | 유지 — 테스트 의도(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | 2 | 0 | 2 | 유지 — content-addressed 병합 규칙(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` | 1 | 0 | 1 | 유지 — 안정 정렬 의도 |
| `python/packages/ingestion/src/econ_ingestion/sources.py` | 4 | 0 | 4 | 유지 — 페이크 카탈로그 설계 근거(목업 연동·결정성) |
| `python/packages/ingestion/tests/test_default_feeds.py` | 3 | 0 | 3 | 유지 — 테스트 의도 |
| `python/packages/ingestion/tests/test_feeds.py` | 21 | 0 | 21 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `python/packages/ingestion/tests/test_sources.py` | 10 | 0 | 10 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `scripts/check-journey-flow.js` | 45 | 4 | 41 | 제거 4줄 — `/* ===== … ===== */` 구분선. 유지: 정적 대조로 안 되는 이유·자기참조 금지·fail-closed 근거, (a)~(h) 규칙 표지(규칙 문자로 모델 정의와 대응 — 애매, 유지) |
| `scripts/check-journey-mockup.py` | 42 | 0 | 42 | regression-pass — 전량 유지. `#36`이 들인 4줄은 「조각(`#STP-`)을 무시하면 상대 여정의 1단계로 떨어지는 링크를 게이트가 통과시킨다」는 게이트 설계 근거로 복원 불가. initial-pass가 남긴 38줄(오탐 회피·헤더 판정 방식·래칫·모델 정의 인용)의 판정은 유효 |
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
| `tests/e2e/run.sh` | 12 | 0 | 12 | 유지 — 전제 도구·KEEP_CLUSTER·단계 표지(애매 — 유지) |
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
| `web/src/api/client.ts` | 5 | 0 | 5 | 유지 — 상대 /api 베이스가 dev·prod 모두에서 되는 이유 |
| `web/src/api/types.ts` | 5 | 0 | 5 | 유지 — 손으로 유지하는 서빙 API 뷰라는 경계, export JSDoc |
| `web/src/screens/Compare.tsx` | 10 | 0 | 10 | regression-pass — 전량 유지. `#37`이 들인 3줄은 「수집 0인 축을 `0%`로 그리지 않고 '비교 제외'로 적는 이유 — `0%`는 '거기선 아무도 말하지 않았다'로 읽힌다」는 제품 의미론의 근거로 코드·문서 어디서도 복원되지 않는다. initial-pass가 지운 `AC3.7 … (J2 / V2)` 배너는 재발하지 않았다 |
| `web/src/screens/Fairness.test.tsx` | 16 | 0 | 16 | **unrowed-files-pass** — 전량 유지. `Sentiment.test.tsx`·`Trend.test.tsx` 와 같은 유형이다 — 전부 「테스트가 왜 그 모양으로 단언하는지」이고 단정·픽스처 어느 쪽을 읽어도 복원되지 않는다. 유지: 스텁이 모든 기대값의 출처이고 리터럴을 두 번 적지 않는다는 설계, 그 스텁이 화면의 존재 이유가 되는 사례를 실어 나른다는 것(「와이어 도배」가 원시 100건 중 60건을 쥐고도 정규화 점유율은 1/4 이라 두 계수 방식이 축을 다르게 세운다), 토글이 정직하려면 눌렀을 때 화면이 말하는 바가 바뀌어야 한다는 단정 근거, 열지 못하는 두 단계를 빈 화면으로 잇지 않고 사유와 함께 이름 댄다는 **허위 컨트롤 금지** |
| `web/src/screens/Sentiment.tsx` | 56 | 2 | 54 | **product-surface-pass** — 제거 2줄: 머리의 AC 배너 `// AC3.4 (축별·분위기별 비율 집계, 미분석 분리) + AC3.6 (분위기 비율 시각화).` 와 매달린 `//`. 제거 유형 「작업 흔적」이고 AC↔화면 대응은 `docs/econ-opinion-monitor-design-tracker.md` 「구현 전용 — mapstrip 칩」 행과 doc-tracker e2e 매핑이 복원한다(경로 ②). initial-pass가 `Compare.tsx`에서 `AC3.7 … (J2 / V2)` 배너를 지운 것과 같은 자리·같은 근거이고, 판정 후 머리가 `Compare.tsx`와 같은 형태(배너 없이 바로 설계 근거)가 된다. 유지 54줄: 미분석을 네 분류에 접지 않는 이유, 도넛이 analyzed 몫으로 닫히는 근거, `PAT-stacked-sentiment` 의 「막대 높이는 구성이지 규모가 아니다」, `CMP-*` 앵커. **판단 분기 — design-tracker 가 승격 등재한 두 블록**(허위 컨트롤 판단 `:24-29`·`:30-33`, 고정 임계 사유 `:55-58`)은 트래커가 「기록 위치를 승격한다」고 적어 복원 경로 ②가 성립하나, 트래커 행들이 이 블록을 **줄 번호로 인용**하고 있어 제거가 자매 모델 행의 처분과 묶인다. 「애매하면 남긴다」로 유지하고 트래커의 처분 시점에 다시 본다 |
| `web/src/screens/Sentiment.test.tsx` | 21 | 0 | 21 | **product-surface-pass** — 전량 유지. 「기대값을 상수로 박지 않는다」는 단언 설계 근거, 스케일 상수가 상쇄되므로 비율만 비교한다는 근거, 한 document 를 공유해 행 단위로 스코프하는 이유(자동 cleanup 부재) — 모두 「테스트가 왜 그 모양으로 단언하는지」 |
| `web/src/screens/Trend.tsx` | 75 | 25 | 47 | **trend-surface-pass — 재판정.** 직전 판정(product-surface-pass, 35줄) 이후 #62·#79·#80·#81 이 40줄을 들였고 그 증가분만 처분했다. 제거 25줄 — **승계 계약 머리 8줄**(`#81` 이 같은 커밋 안에서 복원 경로 ②를 열었다: design-tracker 「승계 표면 전체」 행이 「`Dashboard.tsx` 의 순위 행이 `/trend?axis=<축>&subject=<대상>` 으로 보내고 `Trend.tsx` 가 `useSearchParams` 로 그 쿼리를 읽어 **쿼리 > 세션** 으로 진입 조건을 정한다」를, doc-tracker 2026-09 행이 「쿼리가 한 조각이라도 있으면 진입 조건 전체를 쿼리가 정한다 — 축만 넘어온 진입에 세션의 대상을 섞으면 그 축에 없을 수도 있는 대상을 묻게 되기 때문이다」를 **축자로** 적는다. 실패 모드(「dash 에서 X 를 눌러도 세션에 남은 다른 대상 Y 의 상세가 열렸다」)도 두 문서와 `#81` 본문이 같이 적는다. 메커니즘 자체는 바로 아래 `entryView` 가 네 줄로 복원한다 — `if (axis !== undefined \|\| subject !== undefined) return { axis, subject }; return restored ?? {};` 가 「한 조각이라도 있으면 전체를 쿼리가 정한다」와 「쿼리 > 세션」 둘 다이므로 경로 ①·② 중복) · 여정 단계 귀속 6줄(주석이 자기 복원처 「mockup index, 「흡수된 화면의 판정 경계」」를 이름으로 지목하고, design-tracker 「한 화면의 귀속 단계가 여러 여정 페이지에 흩어질 수 있다」가 같은 세 단계를 다시 적는다) · 조회 조건 복원 근거 4줄 · 추림 화면 머리 5줄 · 배너 초기 문면의 구조 설명 2줄(목업 `#invalid-msg` 정적 마크업이 복원). 앞 셋은 doc-tracker 2026-09 의 #79·#80 행이 **같은 커밋 안에서** 축자로 복원한다. **문면 정정 2곳(3줄 감소)**: 구간 평균 머리 4줄 → 2줄(서빙 무접촉·`avg(s.s)` 재진술만 걷고 「왜 현재 점유율 옆인가」는 유지 — `Compare.tsx` 의 제품 의미론 계열), `.trend-sl-` 가드 3줄 → 2줄(README 가드 항 「메커니즘을 담지 않는다 … 금지만 말하고 출처를 가리킨다」 — pin-guard-pass 선례). 유지 47줄: 직전 패스 판정분 35줄 전량(차트가 답하는 질문 · 색 배정 · viewBox 상수 · `bucketTick` JSDoc · 축 전환 시 선택 해제 · `CMP-*`/`PAT-*` 앵커 · 눈금 반올림)과 이 창이 들인 12줄(스토리지 실패를 **왜** 삼키는지 2 · 추림 상태 소유의 비자명한 결과 2 · 후보 재계산의 모집단 근거 2 — ⑸에서 테스트 쪽 사본을 지우며 이 자리를 설명의 주인으로 지목했다 · 정정 후 남은 4 · `{/* CMP-kv */}` 앵커 1 — `check-mockup-render.py` 의 `markers()` 가 **주석에서** R3 대조 모집단을 긁으므로 지우면 게이트가 깨진다 · 두 실패를 뭉치지 않는다 1). **판단 분기 — `:8-21` 의 「deliberately *not* here」 두 항**은 유지가 유효하다: design-tracker 「구현 전용 — 버킷 단위 안내 `note`」 행이 처분 시점을 「서빙이 단위를 고르는 파라미터를 받아 **단위가 선택 가능해질 때**」로 적고 「AC3.3 롤업 착지(2026-09-19)만으로는 열리지 않는다」까지 괄호로 못박았으며 `/api/trend` 는 아직 `?unit=` 을 받지 않는다. 이 패스의 제거분은 전부 **22행 이후**라 트래커가 줄 번호로 인용한 `:8-21` 범위는 움직이지 않는다 |
| `web/src/screens/Trend.test.tsx` | 35 | 8 | 25 | **trend-surface-pass — 재판정.** 직전 판정(product-surface-pass, 12줄) 이후 #79·#80·#81 이 23줄을 들였다. 제거 8줄 — **`#81` 이 들인 진입 쿼리 테스트 셋의 주석 7줄**: ⑴ 「승계 계약의 받는 쪽 … 쿼리를 읽지 않으면 `subject=` 없는 축 기본 질의가 나간다」 2줄은 테스트 **이름**(`opens the subject the entry query names, not the axis default`)과 바로 아래 두 단정이 그대로 복원하고, 실패 모드는 design-tracker 승계 행이 적는다 ⑵ 「축만 넘어온 진입은 그 축의 기본 화면이다」 1줄은 `expect(urls[0]).not.toContain("subject=")` 한 줄의 재진술 ⑶ 「세션에는 지난번에 두고 간 대상이 남아 있다」 1줄은 바로 아래 네 줄(렌더 → 행 클릭 → `unmount`)의 코드 나레이션(경로 ①) ⑷ 역전 서술 3줄(「누른 것은 `기준금리` 인데 세션에 남은 `삼성전자` 의 상세가 열린다 … 이것이 이 슬라이스가 닫는 역전이다」)은 design-tracker·doc-tracker·`#81` 본문 **셋 다** 같은 실패 모드를 적고, 마지막 절의 슬라이스 귀속은 initial-pass 가 세운 제거 유형 ③「작업 흔적」이다. 나머지 1줄 — `// 상세로 내려간 대상은 미리 골라 둔다(목업 renderCandidates()).` 는 `Trend.tsx` 의 같은 문장과 괄호 표기만 다르다(제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」, 주인은 그 동작을 하는 구현 쪽 · `analyze-job-agg.yaml` env 주석 선례). **문면 정정 2곳(2줄 감소)**: ⑴ 「모든 버튼은 무언가를 해야 한다」 4줄 → 3줄 — **앞 패스의 유지를 뒤집은 것이 아니라 참이었다가 거짓이 된 절을 걷었다.** 「would have nothing behind it **until AC3.3 lands**」의 전제는 `32faf64`(#62) 로 AC3.3 이 착지하며 무너졌고 같은 커밋이 `Trend.tsx` 머리의 같은 변호는 고쳤으나 이 줄만 놓쳤다(정책의 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다」). ⑵ 파킹 사실 재진술 2줄 → 1줄(앞 문장은 여정 문서·mockup 인덱스·doc-tracker 가 복원하는 세 번째 사본). 유지 25줄: 직전 판정분 11줄(반전 스케일 · 비교 표가 피커를 겸하는 이유 · 정정 후 남은 단언 설계), 이 창이 들인 11줄 — 세션 정리 2(자동 cleanup 부재라는 하네스 사실), 서빙 무접촉의 **관측처 지정** 1(「여기서 보인다」 — 사실을 적은 doc-tracker 행으로는 복원되지 않는다), 배너 지목 2 · 재진입 2 · 정정 후 1, **판단 분기** 구간 평균 대조 3 — 그리고 **`#81` 이 들인 `renderTrend` 헬퍼의 JSDoc 3줄**. 이 셋은 위 제거 7줄과 달리 유지다: 「`entry` 가 곧 `Dashboard` 가 `navigate()` 로 밀어 넣는 주소다」는 이 파일의 기본 인자 `= "/trend"` 가 **왜 그 값인지**(쿼리 없는 직접 진입 = 네비게이션 바)를 제품 쪽 동선에 붙여 설명하는 하네스 전제이고, 단정이나 `MemoryRouter` 래핑 어느 쪽을 읽어도 「이 문자열은 대시보드가 미는 주소와 같은 것」이라는 대응은 복원되지 않는다. 「애매하면 남긴다」의 적용이기도 하다 — 네 테스트 파일의 하네스 설명 전량 유지와 일관(doc-tracker #79 행 검증 좌표가 같은 숫자를 적어 경로 ②가 성립할 여지가 있으나 그 행은 갱신되지 않는 변동 이력이고, 주석의 요지는 숫자가 아니라 「헤드라인 값을 베끼는 구현이 여기서 실패한다」는 픽스처 설계다 — 네 테스트 파일의 같은 유형 전량 유지와 일관). **범위 밖 관측**: 같은 테스트의 **이름** `does not offer a bucket-unit switch while rollups are unimplemented` 도 같은 이유로 낡았으나 테스트 이름은 지문의 판정 표면이 아니라 건드리지 않았다 |
| `web/src/screens/Trace.tsx` | 36 | 9 | 27 | **lineage-surface-pass** — 제거 9줄: ⑴ 계보 조인 축 재진술 4줄(`축은 record_id 하나다 … 화면은 조인을 다시 하지 않는다` + 매달린 `//`) — doc-tracker 변동 이력의 슬라이스 9 착지 행이 「`record_id` 를 축으로 Bronze `news_item` → `news_body`(`body_hash`) → Silver `analysis` 를 실제로 조인한다」로 축자 복원하고, `contracts/` 스키마가 키를 한 번 더 복원하며, 「화면은 조인을 다시 하지 않는다」는 `api.trace()` 한 번 호출이 스스로 보여 준다. ⑵ 열지 않는 단계(`STP-judge`) 서술 5줄 — 아래 `note` 의 **렌더되는 문면**(`**판정 기록**은 아직 열 수 없습니다 … 쓸 곳 없는 버튼을 두는 대신 없다고 적습니다`)이 같은 말을 독자에게 직접 하고, 파킹 사실은 주석이 인용하는 여정 문서·mockup 인덱스가 적는다. **문면 정정 2곳(줄 수 불변)**: `.trace-` 접두사 가드에서 게이트 메커니즘(「규칙 5 가 선언 단위로 대조」)을 걷어 금지와 출처만 남겼고(pin-guard-pass 선례 — 가드는 메커니즘을 담지 않는다), `PAT-lineage` 앵커를 이 파일의 다른 앵커 여섯과 같은 **1줄 형태**로 줄였다(구성 열거 `CMP-crumb + Bronze 원문 카드 + Silver 분석 카드 + 수집 메타 카드`는 설계 트래커가 축자 복원하고 코드 바로 아래가 보여 준다 — 앵커 자체는 추적 앵커 규약으로 유지). 유지 27줄 — 화면이 `fairness` 다음 갈래인 이유, 설계 원칙 「모자란 것을 뭉치지 않는다」와 세 결측의 구분, `CMP-*`/`PAT-*` 앵커 여섯, AC2.5 집행 근거, 조회 축 규약. **판단 분기 — 본문 앵커들의 사유 절과 머리의 「한 덩어리로 그리면 …」 2줄.** 판정 종료 후 머지된 #77(`8bad0be`)이 설계 트래커에 `trace` 전수 판정을 등재하며 그 사유들을 — 「한 덩어리 「데이터 없음」」은 **축자로** — 적어 **경로 ②가 실제로 열렸다.** 판정을 그 문서 없는 트리에서 마쳤으므로 앞당겨 집행하지 않고 **다음 패스의 확정 재판정 후보로 넘긴다** |
| `web/src/screens/Trace.test.tsx` | 22 | 0 | 22 | **lineage-surface-pass** — 전량 유지. `Sentiment.test.tsx`·`Fairness.test.tsx` 와 같은 유형 — 정책이 이름을 댄 유지 대상 「테스트가 **왜 그 모양으로** 단언하는지」다: 픽스처를 한 번만 쓰고 기대값을 두 번 적지 않는 이유(`a fixture edit cannot leave a stale literal asserting the old shape`), `The case the whole trail exists for`, `"Set aside" is not "neutral"`, `Three ways to come up short … the one the stub endpoint could never tell apart`, `A fallback must not read as a hit`. **판단 분기 둘** — ⑴ 인라인 `(AC1.5)`·`(AC1.4)`·`AC2.5` 태그 3자리는 「작업 흔적」으로 읽으면 제거 후보이나, aggregation-harness-pass 가 `workflow-template.yaml` 의 `# AC3.2` **인라인** 태그를 명시적으로 유지 판정했고 머리 **배너**(`Compare.tsx`·`Sentiment.tsx`)와는 형태가 다르다. ⑵ **판정 종료 후 #79 가 들인 2줄**(`목업 JRN-spike-verification.html#s-link-expired 의 세 문장 …`)은 설계 트래커 「해소된 등재」의 그 행이 「⑴ **왜** 사본을 보여주는지 ⑵ **배지가 항상 있다**는 안내」로 거의 축자 복원하므로 경로 ②가 성립한다 — 그러나 #77 건과 같은 이유로 앞당겨 집행하지 않고 다음 패스 후보로 넘긴다. 둘 다 「애매하면 남긴다」 |
| `web/src/screens/Dashboard.tsx` | 3 | 3 | 0 | **dashboard-surface-pass — 재판정.** 직전 판정(initial-pass) 뒤 남음이 0 이었는데 `#81 (squash)` 이 순위 행에 3줄을 들였다. 제거 3줄 — 승계 계약의 근거(「축을 함께 넘기지 않으면 받는 쪽이 축을 추측해야 하고, 그 추측이 틀리면 그 축에 없는 대상을 묻게 된다」). **그 주석을 들인 PR 자신의 본문** 표 `Dashboard.tsx` 행이 같은 문장을 축자로 적고(경로 ③), 첫 문장은 바로 아래 `` navigate(`/trend?axis=${axis}&subject=…`) `` 가 말하며(경로 ①), design-tracker `:309` 가 같은 계약을 한 번 더 적는다(경로 ②) — 한 계약의 근거가 주석 3벌 + PR 본문 + 트래커 행으로 존재하던 자리다. 판정 후 남음 0 이라 지문 파일 집합에서 빠지지만 행은 남긴다 |
| `web/src/screens/Dashboard.test.tsx` | 7 | 2 | 5 | **dashboard-surface-pass** — `#81 (squash)` 이 신설한 파일의 첫 판정. 제거 2줄: 위 `Dashboard.tsx` 와 **같은 문장의 세 번째 사본**(제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」이며 이 파일은 주인이 아니다). 무엇을 단언하는지는 테스트 이름 `sends both the axis and the subject when a rank row drills into the trend` 가 말하고, 그 이름은 design-tracker `:309` 가 **검증 좌표로 직접 인용**하고 있어 계약↔단언 연결은 문서 쪽에 남는다. 유지 5줄: vitest 자동 cleanup 부재 2(`globals: true` 의 **부재**라 어느 파일도 적극적으로 말하지 않는다 — `Sentiment.test.tsx` 의 같은 유지와 같은 근거), 축 전환 스텁 설계 2(스텁이 축에 무감각해서 「화면 상태를 읽는 구현」과 「응답 본문을 베끼는 구현」을 가른다 — 픽스처 판별력은 단언·픽스처 어느 쪽을 읽어도 복원되지 않는다), **판단 분기** 도착 주소 JSDoc 1. **판단 분기** — `:53` `/** 라우트가 실제로 어디로 갔는지 읽는다 — 링크 문자열이 아니라 도착 주소를 단정한다. */` 는 #81 본문이 거의 같은 말을 해 경로 ③이 성립할 여지가 있으나, local 헬퍼 `Landing` 의 이름이 그 역할을 말하지 않고 담긴 것이 제품 계약의 변호가 아니라 **단언 설계**라 「애매하면 남긴다」로 유지했다 |
| `web/src/screens/Placeholder.tsx` | 3 | 0 | 3 | 유지 — 플레이스홀더가 증명하는 것 |
| `web/src/shell/AppShell.tsx` | 1 | 0 | 1 | 유지 — 디자인 시스템 패턴 식별자(PAT-screen-shell) |
| `web/src/shell/MapStrip.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 목업을 따르는 칩 구분자 규약 |
| `web/src/shell/Sidebar.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 페르소나 태그의 목업 근거 |
| `web/src/shell/Topbar.tsx` | 1 | 0 | 1 | 유지 — 컴포넌트 식별자 |
| `web/src/shell/nav.ts` | 4 | 2 | 2 | 수정 — 첫 줄의 '어느 화면이 구현됐는가' 절 2줄 제거(App.tsx가 복원하며 스스로 그렇게 말함), 목업 인덱스 출처 표기는 유지 |
| `web/src/tokens/tokens.css` | 38 | 0 | 38 | regression-pass — 전량 유지. `#37`이 들인 7줄 중 4줄은 `CMP-*`/`PAT-*` 앵커 분할·신설(원장이 유지로 못박은 추적 앵커 규약을 더 정확히 따른 것), 3줄은 목업 규약 근거(버튼 리셋을 한 번만 두는 이유·열 수가 `.grid`의 일부가 아닌 이유·note 여백의 소유자)로 목업이 보여주지 않는 **왜 그렇게 쪼갰는가**라 복원 불가. 2줄(`* {`, `#root {`)은 여전히 셀렉터 오탐 |
| **lineage-surface-pass 기준 · 레포 전체** | **2467** | **13** | **2454** | 지문 값(`9a5d32e` → 이 패스 후 · 파일 수 124 불변). 이 표는 **124개 파일 행**을 갖는다 — 지문의 124파일과 수가 같을 뿐 **집합은 다르다**(남음 0 이라 지문에서 빠진 행 둘 `Makefile`·`scripts/check-mockup-render.py`, 반대로 아직 행이 없는 파일이 아래 ⑴ 둘). 행마다 기준 패스가 다르므로 위 열의 단순 합과는 다르다. **미판정 잔여는 「읽는 법」의 계수 규약대로 두 몫을 합쳐 383줄**이다: ⑴ 아직 행이 없는 파일 **2개 44줄** — `web/src/screens/Fairness.tsx` 38(이 패스가 슬라이스를 그을 때 열려 있던 #76 이 수정 중이라 뺐고, 그 #76 이 `9a5d32e` 로 착지하며 37→38 이 됐다. 직전 집계가 ⑴로 세던 나머지 셋은 이 패스가 판정해 행을 줬다) · `web/src/screens/Compare.test.tsx` 6(같은 #76 이 0→6 으로 지문에 편입시켜 **새로** ⑴ 에 들어왔다 — 원장 행이 없다), ⑵ 행이 있으나 판정 이후 자란 파일의 증가분 **22파일 339줄**(`tests/e2e/run.sh` 12→96 · `web/src/api/types.ts` 5→48 · `web/src/screens/Trend.tsx` 47→72 · `scripts/check-journey-mockup.py` 42→65 · `web/src/tokens/tokens.css` 38→60 · `web/src/screens/Dashboard.tsx` 0→19 · `python/packages/aggregation/tests/test_aggregate.py` 1→19 · `web/src/screens/Sentiment.tsx` 54→71 · `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` 48→61 · `web/src/screens/Trend.test.tsx` 25→38 · `web/src/screens/Dashboard.test.tsx` 5→17 · `web/src/api/client.ts` 5→15 · `web/src/screens/Sentiment.test.tsx` 21→31 · `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` 22→31 · `python/packages/aggregation/src/econ_aggregation/aggregate.py` 11→15 · `python/packages/analysis/src/econ_analysis/cli.py` 7→11 · `python/packages/analysis/tests/test_llm.py` 8→12 · `python/packages/ingestion/tests/test_feeds.py` 21→24 · `deploy/batch/workflow-template.yaml` 42→44 · `web/src/screens/Fairness.test.tsx` 16→18 · `python/packages/analysis/tests/test_cli.py` 5→6 · `web/src/screens/Compare.tsx` 10→11). ⑵의 상위 다섯(`run.sh`·`types.ts`·`Trend.tsx`·`check-journey-mockup.py`·`tokens.css`)이 197줄로 **58%**라 파일 단위로 자르면 다음 패스의 선이 선다 — #76 이 착지해 `tokens.css` 를 막던 제약은 풀렸고, 착지 시점에 열린 PR 은 #75 하나로 ⑴·⑵ 어느 파일도 건드리지 않는다(#75 가 착지하면 신설 `scripts/check-data-format-change.py` 가 ⑴ 에 새로 들어온다). **잔여에 들어가지 않는 재판정 후보가 둘 더 있다**(줄이 자란 것이 아니라 **복원 경로가 자란** 자리라 계수 규약이 세지 않는다): 이 패스가 방금 행을 준 `Trace.tsx` 27줄·`Trace.test.tsx` 22줄 — 판정 종료 후 #77·#79 가 설계 트래커와 목업 문면으로 복원 경로 ②를 열었다. 해당 행의 「판단 분기」가 어느 주석에 어느 행이 걸리는지 적는다. 재감지가 새 task로 잇는다 |
