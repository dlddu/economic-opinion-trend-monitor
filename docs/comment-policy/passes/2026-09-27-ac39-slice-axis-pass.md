# 2026-09-27 — ac39-slice-axis-pass

세 표면의 판정 미완 잔여 **8행 206줄**(L 6행 172 · D 2행 34)을 ①②③④ 네 축 전건 판정하고,
`cli.py` L 행의 **축 ④ 한 칸**(3줄 · 직전 `①②③`)을 함께 닫았다. 제거 **80줄**(L 67 · D 13) ·
**행 소멸 1**(`python/packages/aggregation/src/econ_aggregation/contributions.py` 의 **L 행** —
판정 대상 줄머리 주석 0줄. 같은 파일의 D 행은 남는다).

reconcile task `rct_20260927-0007` (`tbm_econ-opinion-monitor-comment-redundancy`).

게이트 자기출력(편집 전 → 후):

| 표면 | 전체 | 판정 완료 | 미판정(—) | 일부 축만 |
|---|---|---|---|---|
| L | 2663줄 191행 → **2596줄 190행** | 184행 2488줄 → **190행 2596줄** | 6행 172줄 → **0행 0줄** | 1행 3줄 → **0행 0줄** |
| D | 612줄 42행 → **599줄 42행** | 40행 578줄 → **42행 599줄** | 2행 34줄 → **0행 0줄** | 0 → 0 |
| E | 44줄 20행 (무접촉) | 20행 44줄 | 0행 0줄 | 0 → 0 |

⇒ **세 표면 전부 미판정 0행 0줄**이고 「일부 축만 완료」도 0행이다. 직전 패스
[l-residual-axis-pass](2026-09-27-l-residual-axis-pass.md)가 「완료 기준은 L 잔여 0 이 아니라
**#178 이 겹치는 4행 88줄**」로 넘긴 그 4행이 이 패스의 모집단에 들어 있다(#178 착지로 `Fairness`
쌍은 45·44 로 자랐다).

## 범위를 8행 전량으로 잡은 근거

여덟 행 중 **다섯이 같은 저작 PR #178**(자매 `tbm_econ-opinion-monitor-docs-impl/rct_20260927-0003`
슬라이스 12, AC3.9) 소산이다. 그래서 복원 경로 ②(PRD AC3.9 · 테스트 문서 시나리오 9·10)·
③(PR #178 본문)·④(squash 본문)가 **행마다 같다** — 쪼개면 같은 본문을 두 번 읽으면서도
아래 **삼중 쌍둥이**의 주인을 정할 수 없다:

| 자리 | 명제 | 처분 |
|---|---|---|
| `contributions.py` 모듈 docstring 첫 단락 (산출) | 「접기 직전의 항을 꺼내 쓴다 — **두 번째 계산법**은 자기가 설명한다는 수와 조용히 어긋난다」 | **유지(정본)** — 산출을 두 번 계산하려는 사람의 편집 지점 |
| `source_contributions.go` `sourceContributions` doc (서빙) | 「Silver 에서 **다시 세지 않고** 자기 Gold 를 읽는다」 | **유지** — 명제가 다르다(서빙 측 편집 지점). 사본이 아니다 |
| `Fairness.tsx` 머리 28-31 (화면) | 「그 수는 화면이 새로 계산한 것이 아니라 집계가 접어 두었던 항 그대로다」 | **유지** — 아래 자물쇠 |

206줄은 정의의 판정 슬라이스 **400줄 예산 안**이므로 축소 사유가 없다. 파일 공유 union-find 는
`contributions.py` 가 L·D 두 표면에 행을 갖는 것을 빼면 전부 싱글턴이다.

## 경로 ③ 이 이례적으로 넓다 — 그 이유와 그것이 닫지 못한 것

PR #178 본문은 `## 계획 단계 · 접근` 5항 · `## 회계 불변` · `## 검증 방법` · **음성 프로브 표
12행** · `## 장부 이동` · `## 범위 밖`을 절 단위로 적는다. 그래서 「무엇을 왜 그렇게 했는가」는
대부분 ③ 으로 닫힌다. 남는 것을 가른 판별식은 정책의 **③↔편집 지점 가드** 조항 하나이고,
작동하는 물음은 「**어기면 즉시 붉는가**」다. 이 패스의 실측:

| 명제 | 어겼을 때 | 처분 |
|---|---|---|
| `raw_total`·`normalized_total` 을 Gold 값으로 베끼지 말라 | `…ReportADisagreeingLakeInsteadOfHidingIt` 즉시 붉음(PR #178 프로브 표 「go 1건」×2) | **제거**(③) |
| 행 순서를 뒤집지 말라 | `…KeepRawAndNormalizedApart` 가 「want the collector that carried the value」로 즉시 붉음 | **제거**(①③) |
| 격자 잔여를 넘기지 말라 | python 2건 즉시 붉음 | **제거**(③ 축자) |
| 두 번째 계산법을 짜지 말라 | **안 붉는다** — 다른 계산법도 두 등식을 만족시킬 수 있다 | **유지** |
| 타이브레이크를 소스 id 로 고정하라 | **안 붉는다** — 비결정 타이브레이크도 등식은 만족한다 | **유지** |
| `SourceCount` 를 함께 내라 | **안 붉는다** — 어느 단정도 세 번째 수를 요구하지 않는다 | **유지** |
| 조회를 `container` 안으로 한정하라 | **조용히** 앞 테스트가 그린 화면을 집는다(자동 cleanup 없음) | **유지** |
| 스텁 분기에서 `/source-contributions` 를 `/contributions` 보다 먼저 보라 | 부분 문자열 포함이라 뒤집으면 소스 카드가 기사 응답을 읽는다 | **유지** |

🔴 **PR #178 의 음성 프로브 표는 「그 변이가 몇 건을 붉히는가」만 적고 「그 단정들 사이의 공전
관계」는 적지 않는다.** 그래서 「합을 Gold 값으로 베끼면 **위 등식 단정들이 공전한다**」를 말하는
세 자리(go 5줄 · `Fairness.test.tsx` AC3.9 축 2줄 · AC3.10 축 2줄)는 ③ 이 닫지 못해 유지했다.
프로브 표를 ③ 히트로 쓸 때는 **표가 적는 것이 변이지 관계가 아니라는 점**을 먼저 볼 것.

## 경로 ② — 테스트 문서 시나리오 9·10 이 픽스처 산문을 통째로 소유한다

`docs/econ-opinion-monitor-test-aggregation-viz.md` 의 두 시나리오가 **사전 조건과 기대 결과를
축자로** 갖고 있어 python 픽스처 docstring 3줄과 web 단정 머리 6줄이 여기서 닫혔다:

- 시나리오 9 사전 조건 「한 축에 수집원이 둘 이상이고, 같은 서술 대상이 여러 수집원에 걸쳐 수집된
  기준 상태와, 그 중 한 소스의 수집량만 크게 늘린 비교 상태」 ⇒ `_corpus`·`_skew` 머리.
- 시나리오 10 기대 결과 「목록 건수가 그 값의 원시 카운트와 같고, 수집원별 건수의 합이 전체와
  같다. 각 행에 수집원·수집 시각·본문 중복 여부가 표기되고, 원문 링크와 보존 원문에 도달한다」
  ⇒ `Fairness.test.tsx` 의 AC3.10 3자리 6줄.

반면 **픽스처 설계**(왜 각 소스에 둘째 대상을 두는가 · 왜 1/3 코퍼스가 필요한가)는 ② 에 없다 —
시나리오는 상태를 요구하고 픽스처가 그 상태를 **어떻게** 만드는지는 요구하지 않는다.

## 사본 처분 — 정본을 어디에 세웠나

| 명제 | 사본들 | 정본 |
|---|---|---|
| 「스텁이 모든 기대값의 출처 · 리터럴을 두 번 적지 않는다」 | `Fairness.test.tsx` 머리 4줄 + 소스 스텁 머리 3줄 | **파일 머리** (소스 스텁 머리 걷음) |
| 「빈 레이크는 실패가 아니라 빈 분해」 | `concentrationOf` doc + `…SurviveEmptyGold` 머리 | **테스트 머리**(그 명제를 단정하는 자리) |
| 「두 합 등식을 화면은 주장하지 않고 적는다」 | `Fairness.tsx` 146-147 + `Fairness.test.tsx` 264-265 | **`Fairness.tsx`**(구현 가드가 주인) |
| 「목록의 축은 표에서 고른 대상」 | `Fairness.tsx` 112-113 + `Fairness.test.tsx` 403-404 | **`Fairness.tsx`** |
| 「카드 머리 합은 서빙이 센 값」 | `Fairness.test.tsx` 277-278 + 288-289 | **277-278**(공전 방지 논거를 함께 담은 쪽) |
| 최대 잔여법 기법 | `contributions.py` 모듈 docstring 2단락 + `_on_grid` docstring | **`_on_grid`**(그 함수가 기법 자체) |

## 축 ④ — 이 슬라이스에서는 전건 공전

여덟 행 + `cli.py` 의 저작 커밋 셋(`e72cc9d`#178 · `33e24ea`#38 · `32faf64`#62)의 트레일러를 뺀
본문은 각각 **0줄 · 0줄 · 1줄**(`reconcile rct_20260919-0006 …`)이다. 제목은 세 개 다 슬라이스
이름까지만 적어 판정 대상 명제를 담지 않는다. ⇒ ④ 는 한 줄도 닫지 않았고, 그것이 「④ 를 물었다」의
내용이다(→ l-residual-axis-pass 가 ④ 로 실제 히트를 낸 것과의 대조군).

## 🔴 `Fairness.tsx` 자물쇠 — 네 번째 유예를 하지 않고 선택지를 적는다

`Fairness.tsx` 44줄은 **전량 유지**로 닫았다. 증분 19줄(머리 블록 13-35 · 등식 상태 146-154)의
복원 경로는 ②③ 에 **전부 실재하지만**, 설계 트래커
`docs/econ-opinion-monitor-design-tracker.md` 의 「`세는 방식` 폼 카드 전면 부재
(`STP-check-normalized`)」 행이 `CMP-norm-toggle` 의 위치를 **`Fairness.tsx:173-181` 로 줄 번호
인용**해 그 위를 한 줄이라도 걷으면 자매 모델 행의 인용이 밀린다.

**이 자물쇠의 이력이 곧 점검 신호다.** 인용은 세 번 재작성됐다:

| 시점 | 인용 | 민 것 |
|---|---|---|
| 2026-09-20 등재 | `Fairness.tsx:110-118` | — |
| 2026-09-27 슬라이스 11 (#174) | → `146-154` | 기여 기사 목록 상태 |
| 2026-09-27 슬라이스 12 (#178) | → `173-181` | 소스별 기여 상태·조회 |

그리고 이 자리를 **주석 판정에서 제외한 패스는 이번이 다섯 번째**다(e2e-runner-pass ·
reprocess-surface-pass · trend-rejudge-pass · web-api-view-pass · 이 패스). web-api-view-pass 가 적은
해제 조건은 「그 인용이 내용 지목(`∋ CMP-norm-toggle`)으로 바뀌거나 그 행이 처분될 때」인데,
**그 둘 중 어느 것도 소유 모델의 감지를 깨우지 않는다** — 설계 트래커 행은 「유지」로 닫혀 있고
(2026-09-26 재판정), 줄 번호가 밀려도 소유 PR 이 그때그때 재인용해 편차 지표가 **불변**이다.
즉 해제 조건은 발화하지 않는 조건이고, 유예가 자동 갱신된다.

기한을 늘리는 대신 **선택지를 열거한다**(어느 것도 이 PR 이 하지 않는다):

1. **자매 모델이 인용을 내용 지목으로 바꾼다** — `Fairness.tsx:173-181` → `Fairness.tsx ∋ CMP-norm-toggle`.
   `CMP-*` 마커는 `check-mockup-render.py` 가 R3 모집단으로 긁으므로 지목 대상이 사라지면 게이트가
   붉어진다 ⇒ 줄 번호보다 **강한** 자물쇠다. 소관은 `tbm_econ-opinion-monitor-mockup-render`.
2. **주석 판정 PR 이 같은 커밋에서 인용을 갱신한다** — #178 이 자기 인용 3자리에 한 것과 같은 처리.
   다만 그러면 `comment-redundancy` 축이 `design-tracker` 를 편집하게 되어 자매 모델의 산출물
   소유권을 넘는다.
3. **줄 번호 인용을 금지 규약으로 올린다** — 설계 트래커의 「구현 위치」 칸을 `파일 ∋ 마커` 로
   통일. 세 모델이 같은 파일을 인용하는 구조 자체를 없앤다.

이 패스는 ⑴ 을 권고하고 근거를 여기에 남긴다. 위 세 줄 중 어느 것도 서기 전까지
`Fairness.tsx` 의 증분 19줄은 **판정은 끝났고 처분만 유예된** 상태다(판정 축 `①②③④` · 제거 0).

## 행별 판정

제거 근거·유지 목록은 `ledger.md` 의 각 행 결과 칸에 있다. 배분:

| 표면 | 행 | 전 | 후 | 제거 |
|---|---|---:|---:|---:|
| L | `go/internal/handlers/source_contributions.go` | 37 | 9 | 28 |
| L | `go/internal/handlers/source_contributions_test.go` | 31 | 14 | 17 |
| L | `econ_aggregation/aggregate.py` | 13 | 12 | 1 |
| L | `econ_aggregation/cli.py` (축 ④ 만) | 3 | 3 | 0 |
| L | `econ_aggregation/contributions.py` | 2 | **0(행 삭제)** | 2 |
| L | `web/src/screens/Fairness.test.tsx` | 45 | 26 | 19 |
| L | `web/src/screens/Fairness.tsx` | 44 | 44 | 0 |
| D | `econ_aggregation/contributions.py` | 18 | 9 | 9 |
| D | `aggregation/tests/test_source_contributions.py` | 16 | 12 | 4 |

## 검산

- **비주석 diff 0줄** — `git diff -U0` 의 ± 줄 전량이 줄머리 주석 또는 docstring 본문이다.
  코드 실행 경로 무변경: `go test ./...` · `pytest` · `vitest` 전건 통과.
- 게이트 4종 rc=0 (`check-comment-ledger.py` · `check-mockup-render.py` ·
  `check-journey-mockup.py` · `tests/e2e/check_scenario_mapping.py`).
- `check-mockup-render.py` 의 마커 집합 불변 — `Fairness.tsx` 무접촉이고 `Fairness.test.tsx` 에서
  걷은 19줄에는 `CMP-*`/`PAT-*` 가 없다.
- 줄 수·지문 9쌍은 손으로 쓰지 않고 게이트를 import 해 `measure()`/`by_file()`/`fingerprint()` 로
  냈다.
- `scripts/check-data-format-change.py <base> <head>` = **`format_changed=false`** —
  판정기의 `COMMENT_LINE = ^\s*(#|//)` 이 걷는 줄머리 주석을 전부 건너뛰고, 걷는 docstring 줄에
  `field=`·`"field":` 가 없으며, `tests/**`·`test_*.py` 는 `CONTENT_EXCLUDES` 다. 접촉 경로에
  `SENSITIVE_PATHS` 가 없다 ⇒ `review/manual-approval` 자동 success.
