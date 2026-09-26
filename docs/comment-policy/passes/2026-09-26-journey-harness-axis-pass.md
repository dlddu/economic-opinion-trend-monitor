# 2026-09-26 — journey-harness-axis-pass

여정 mockup 하네스 축(`scripts/` 의 검사기 셋 + `scripts/journey-scenarios/` 일곱)을 **한 덩어리로**
가져가 네 복원 경로 전건 판정. 범위는 판정 축이 `①②③④` 가 아닌 **13행 · 주석 380줄**
(L 9행 286 · D 2행 83 · E 2행 11 — 슬라이스 예산 400줄의 95%). 제거 47줄 · 유지 333줄 · 행 소멸 0.

기준 커밋 `5e4642e`.

## 왜 이 덩어리인가

- **원장이 이 슬라이스를 지목해 두었다.** `JRN-judgment-debug.js` 행이 머리 훅 범례 4줄에 대해
  「7개 시나리오 중 5개가 나눠 갖는 바이트 동일 사본 … **공유 사본의 처분은 다섯 파일을 함께 판정하는
  패스의 몫으로 남긴다**(그때 복원처는 `check-journey-flow.js` 의 `:257`·`:271`·`:219` fail 문면과
  `:12-21` 「구조」 절이다 — ①)」고 적었다. regression-pass 도 「재판정하려면 별도 슬라이스로 다뤄야
  한다」로 같은 조건을 걸었다. 다섯 파일 **전부** + 지목된 복원처 파일까지 한 범위에 넣어야 그 조건이 선다.
- **파일 공유 union-find 로도 같은 덩어리다.** `check-journey-mockup.py` 와 `check-mockup-render.py` 는
  L·D·E 세 표에 걸쳐 같은 파일을 덮고(자매 행), 두 게이트는 서로의 소관 경계를 상대 파일에 적는다 —
  한쪽만 가져가면 다음 패스가 이쪽 근거를 지운다.
- **열린 PR 과 파일 교집합 ∅**: 착수·PR 직전 두 번 실측해 열린 PR 은 #162
  (`docs/econ-opinion-monitor-doc-tracker/2026-09.md` 한 파일)뿐이었다.
- **예산 밖으로 뺀 둘**: `scripts/check-data-format-change.py`(D 29 + L 2)는 `SENSITIVE_PATHS` 의
  「리뷰 게이트 판정기 자체」라 한 줄만 건드려도 이 PR 전체가 사람 승인 뒤로 간다 —
  주석 31줄을 위해 380줄의 무인 착지를 잃지 않는다. `scripts/check-comment-ledger.py`(D 25 + E 1)는
  **예산 초과분**이다(406 → 380). 둘 다 `contracts/codegen.py`(D16·E3·L5)와 함께 다음 슬라이스의 몫.

## 결과

| | 판정 전 | 제거 | 남음 |
|---|---:|---:|---:|
| L 9행 | 286 | 25 | 261 |
| D 2행 | 83 | 22 | 61 |
| E 2행 | 11 | 0 | 11 |
| **합계 13행** | **380** | **47** | **333** |

게이트 실측(`python3 scripts/check-comment-ledger.py`, rc=0 「불변식 통과」):
L 2683 → **2658**(네 축 완료 110행 1426줄 → **119행 1687줄**) ·
D 826 → **804**(16행 289줄 → **18행 350줄**) · E 79 → **79**(6행 18줄 → **8행 29줄**).
행 수·파일 수는 세 표면 모두 불변(192 · 41 · 28).

## 제거 — 근거별

### ① 러너가 소유한 훅 범례 (다섯 파일 × 5줄 = 25줄)

`JRN-daily-scan` · `JRN-ingestion-recovery` · `JRN-judgment-debug` · `JRN-logic-backfill` ·
`JRN-sentiment-shift` 의 머리 4줄 + 매달린 ` *` 1줄.

```
 *   inputs(t)  (d) 값 변경이 렌더를 **실제로** 바꾸는가
 *   states(t)  (e) 인덱스가 등재한 상태에 프로토타입 안의 조작만으로 도달하는가
 *   unlock     (c) 전진이 비활성인 단계를 여는 선행 제품 행동
 *   renders(t) (h) 인라인 스크립트만으로 실제 렌더가 일어나는가
```

**복원 경로 ① — 설명의 주인은 러너다.** `scripts/check-journey-flow.js` 가 훅 이름과 규칙 문자의
대응을 자기 fail 문면에 축자로 갖는다:

| 훅 | 러너의 자리 | 문면 |
|---|---|---|
| `inputs` | `:257` | `시나리오에 inputs() 가 없다 — (d) 의 '값 변경이 렌더를 바꾸는가' 를 못 본다` |
| `states` | `:271` | `시나리오에 states() 가 없다 — (e) 의 상태 도달을 못 본다` |
| `unlock` | `:219` | `(c) … 의 전진이 비활성인데 시나리오에 unlock 훅이 없다` |
| `renders` | `:317` | `/* ---------- (h) 정적 동작 ---------- */` 블록 안에서 호출 |

**두 번째 복원처가 네 파일에는 파일 안에 있다.** `daily-scan:31,36,132,216` ·
`ingestion-recovery:49,59,145,234` · `logic-backfill:45,53,156,282` · `sentiment-shift:13,18,86,160`
의 훅별 `/* (c) … */ /* (d) … */ /* (e) … */ /* (h) … */` 주석이 같은 문장을 **편집 지점에서**
반복한다 — 예컨대 범례의 `renders(t) (h) 인라인 스크립트만으로 실제 렌더가 일어나는가` 와
`/* (h) 인라인 스크립트만으로 실제 렌더가 일어난다. */` 는 어미만 다르다. 정책의
「같은 설명이 두 벌이면 **명제를 어길 사람이 읽는 자리**를 정본으로 두고 사본을 걷는다」가 정면으로 적용된다.
`JRN-judgment-debug.js` 만 훅별 주석이 **없어** 러너가 유일한 복원처다 — 사본 다섯 벌 중 형태가 갈린
자리이고, 원장이 이 행에서 처분을 미뤄 둔 이유이기도 하다.

**왜 지금 뒤집는가 — 재투표가 아니라 예약된 처분의 집행이다.** product-surface-pass 는 이 범례를
「애매하면 남긴다」로 유지하면서 그 사유를 **조건부**로 적었다(regression-pass: 「재판정하려면 별도
슬라이스로 다뤄야 한다」 / 원장: 「다섯 파일을 함께 판정하는 패스의 몫」). 그 조건이 이 슬라이스에서
처음 충족됐다. 그리고 비대칭 비용의 방향이 실측으로 반대였다 — **이 범례는 이미 두 번 조용히 낡았다**:

- `JRN-sentiment-shift` 의 옛 머리는 「두 가지」라 쓰고 넷을 나열했다(initial-pass 가 제거).
- `JRN-judgment-debug` 의 `unlock` 줄은 「— 이 여정에는 없다」를 달고 있었고, 같은 파일 `:34` 의
  `unlock: {}` 가 그 사실을 이미 적고 있었다(residual-close-pass 가 정정).

사본이 다섯 벌이라 러너의 훅 계약이 바뀌면 다섯이 함께 거짓이 된다. 일곱 시나리오가 이제 전부
`JRN-axis-contrast`·`JRN-spike-verification` 와 같은 **식별 1줄 머리**로 수렴했다(발산 0).

### ③ 저작 PR 본문이 절 단위로 소유 — `check-mockup-render.py` (D 19줄)

| 걷은 것 | 복원처 |
|---|---|
| 「왜 게이트가 필요한가」 문단 | #37 「잔여가 계속 미판정으로 남은 근본 원인은 「아무도 안 집어서」가 아니라 기계가 없어서입니다」 세 불릿 축자(12종/15종 계수 갈림 · design-tracker 가 양 side 범위 밖) |
| 「기대값은 언제나 SSOT 에서 파싱한다」 아래 다섯 쌍 표 | ① 바로 아래 `DS`·`IDX`·`TRACKER`·`APP`·`NAV` 상수가 같은 다섯 경로를 선언 · ③ #37 이 같은 표를 본문에 싣는다 |
| 「허용목록은 **래칫**이다 — 넘으면 실패, 밑돌면 낮추라고 실패」 | ③ #37 축자 · ① 코드가 양방향으로 **크게** 실패시킨다(조용하지 않다) |
| `absorbed_screens()` 본문 6줄 | ③ #45 「③ 게이트 R3 실패 → 파서를 고쳤다」 절 — 「정규식이 「흡수한 화면」 칸의 **첫 id 하나만** 집어 …」 |
| `markers()` 본문 3줄 | ③ #37 「결합 마커(`CMP-a / b`)는 분해해 셉니다」 + 「셸 TSX 주석까지 보면 15종」 |

### ③ 세 번째 사본 — `check-journey-mockup.py` R13 소관 경계 (D 3줄)

「네비 항목 자체(id·라벨·순서)가 구현 `nav.ts` 와 맞는지는 이 검사기의 몫이 아니다 … 여기서 대조하는
쌍은 **문서 산문 ↔ 목업 네비 실측**이다」는 저작 PR **#129 「소관 경계」 절 축자**다. 같은 명제의
L 표면 사본은 residual-close-pass 가 이미 걷으며 주인을 `check-mockup-render.py` R4 머리로 지목했다 —
여기 남은 한 벌이 세 번째였다.

## 정정 (줄 수 불변, 지문만 이동)

`check-mockup-render.py` 요약 줄의 **「규칙 3·5」 → 「규칙 3·4(네비)·5」**, **「두 축」 → 「세 축」**.
#46 이 2026-09-18 에 R4-nav 를 넣은 뒤로 낡아 있었다. 같은 파일의 R4 절과 `tracker_section()` 이
찾는 절 이름(`### 규칙 3…기계 판정`), 그리고 게이트 자신의 출력
(`목업 ↔ 구현 렌더링 정합성(규칙 3·4·5) 통과`)이 실측이다.

## 유지 — 근거

- **`check-journey-flow.js` 41줄 전량.** ②③ 히트는 실재한다 —
  `docs/mockups/econ-opinion-monitor-mockup-index.md:432` 가 「구조」와 fail-closed 를 절 단위로 적고,
  #21 「하네스 일반화(fail-closed)」 절이 범용 러너·시나리오 분리·자기참조 유지를 갖는다. **그래도 유지**인 이유 둘.
  ⑴ 「── 구조 ──」 절은 이 레포가 되풀이해 지목해 온 **설명의 주인**이다 — initial-pass 가
  `JRN-axis-contrast`·`JRN-sentiment-shift` 에서, regression-pass 가 `JRN-spike-verification` 에서
  역할 분담 산문을 걷으며 각각 이 블록을 복원처로 명시했고, **이번 패스의 ① 근거도 이 파일**이다.
  주인을 없애면 그 제거 일곱 건이 가리킬 곳을 잃는다(deploy-serving-axis-pass 가 `reprocess_trigger.go`
  주인 문단을 남긴 처분과 같은 모양).
  ⑵ fail-closed 3줄과 자기참조 금지 1줄은 정책의 **편집 지점 가드**다 — 어기면 조용히 깨진다:
  시나리오 없는 여정 페이지가 (c)(d)(e) 를 한 번도 집행받지 않은 채 「두 게이트 green」으로 착지하고
  (#21 이 실제로 겪은 구멍), 페이지에서 기대값을 읽으면 「어떤 뮤테이션도 통과」한다.
- **`check-journey-mockup.py` 모듈 docstring 의 R1~R13 목록 22줄.** 이 목록은 **정본**이다 —
  e2e-harness-axis-pass 가 `check_scenario_mapping.py` 의 `# 규칙N —` 앵커 8줄을, #161 이
  `check-comment-ledger.py` 의 `# R1`~`# R9` 앵커를 「주인은 모듈 docstring」이라는 같은 근거로 걷었다.
  ② `docs/econ-opinion-monitor-design-tracker.md:25` 는 R1~R11 을 괄호로 뭉뚱그린 한 줄 요약이라
  규칙 열셋을 복원하지 못한다.
- **`check-mockup-render.py` 의 R3·R4·R5 절과 1줄 요약 docstring 열둘.** 같은 이유(두 게이트가 서로
  인용하는 규칙 정본) + 정책이 이름 든 유지 대상(「Python 은 모듈·public 함수 docstring 을 유지한다」).
- **`items_by_screen()` 의 귀속 규칙 5줄** — 인덱스는 **단계** 귀속(「더 앞선 화면」)만 규정하고
  「여정 절의 **항목**은 그 여정이 흡수한 모든 화면에 귀속된다」는 적지 않는다. #45 가 「`dash` 와
  `trend` 가 같은 여정 절을 공유해 새로 들여오는 항목이 0종」으로 이 규칙의 **귀결**만 인용한다. 애매 → 유지.
- **`mock_nav()` 의 그룹 순서 가드 3줄** — 그룹 머리글 표기가 페이지마다 `·`/`&middot;` 로 갈려 있어
  텍스트로 잡으면 실체 없는 차이가 생긴다. #46 은 표기가 갈렸다는 **사실**만 적고 이 귀결은 적지 않는다.
- **E 표면 11줄 전량.** ⑴ `# (f) 딥링크 앵커`·`# (c) 화면 내 전진` — 규칙 문자 표지로,
  `check-journey-flow.js` 의 `(a)~(h)` 구분선에 대한 선행 판정(「규칙 문자로 모델 정의와 대응 — 애매, 유지」)의 승계.
  ⑵ 건너뜀의 사유 3줄(`<body …>` 태그를 먼저 떼는 이유 — 떼지 않으면 R2 가 선언 자신을 세어
  「정확히 1건」이 2건이 된다 · 화면 단위 파일 · `index.html` 리다이렉트).
  ⑶ 무타입 컨테이너의 유일한 형태 선언 4줄 — `branches:[(when, jid, sid)]` 의 3튜플 순서는 레포
  어디에도 다른 이름이 없다. ⑷ `norm_value()` 의 두 줄 — 정규식 자신은 도메인(폰트 스택)도 입력 예시도
  담지 않고, #37 은 「표기 차이(hex 대소문자·선행/후행 0·따옴표·shorthand↔longhand)」로 **목록만** 적어
  어느 줄이 어느 표기를 맡는지 복원하지 못한다.
- **조작별 의도·상태 라벨·jsdom `.value` 함정**(일곱 시나리오 공통) — product-surface-pass 가 세 파일에서
  명시적 유지 판정한 유형 그대로다. jsdom 함정은 ③ #20 본문에 같은 취지가 있으나 **편집 지점 가드**다:
  이 줄을 어기고 `<span>` 을 컨트롤로 되돌리면 「값을 바꿨더니 렌더가 변했다」가 그대로 성립해 두 게이트가
  조용히 통과한다(#20 이 음성 시험에서 실제로 잡은 구멍이다).

## ④ — 이 슬라이스에서 0줄

13행의 저작 커밋 전수(`git log --format=%b`)에서 제목 외 본문을 가진 것이 **0개**다 — 전부 squash 제목
한 줄에 `Co-authored-by` trailer 뿐이고, 하나(`96ac1cb`)만 `reconcile rct_20260919-0002 /
tbm_econ-opinion-monitor-journey-mockup` 참조 한 줄을 더 갖는다. ④ 는 판정을 통과시키기만 하고
아무것도 닫지 않는다. deploy-serving-axis-pass 가 열아홉 행에서 같은 실측을 적었다 — **다음 패스가 ④ 를
다시 비싸게 조사하지 않도록** 두 번째로 기록해 둔다.

## 무영향 증명

- **Python 2파일** — `ast.parse` 후 모든 모듈·클래스·함수 docstring 노드를 떼고 `ast.dump` 비교:
  부모와 **동일**. 즉 docstring 밖 토큰이 한 개도 움직이지 않았다.
- **JS 8파일** — 주석과 공백을 제거한 바이트열이 부모와 **동일**(문자열·템플릿 리터럴 안의 `//`·`/*` 은
  추적해 보존하는 스캐너로 제거).
- **게이트 4종 로컬 전건**:
  `python3 scripts/check-comment-ledger.py` rc=0 「불변식 통과」 ·
  `python3 scripts/check-journey-mockup.py .` rc=0 「여정 7개 · 여정 페이지 7개 · 미이관 0(상한 0) ·
  규칙 5 미충족 페이지 0(상한 0) · 링크 352건」 ·
  `python3 scripts/check-mockup-render.py .` rc=0 「R4 목업 7페이지 × 네비 항목 8개 일치 · R5 값 충돌/목업
  전용/구현 전용 0 = 상한 0」 ·
  `node scripts/check-journey-flow.js .` **710 passed, 0 failed** (jsdom 29, 여정 페이지 7개) —
  걷은 것이 이 하네스와 시나리오의 계약 주석이므로 이 실행이 그 계약이 그대로임을 보인다.
- `python3 scripts/check-data-format-change.py <base> <head>` → **`format_changed=false`**
  (`SENSITIVE_PATHS` 다섯 항 무접촉 ⇒ `review/manual-approval` 이 자동으로 붙는다).
- `checks.yml` 의 `changes` 잡 기준으로 이 PR 의 변경 파일은 전부 `docs/*` 또는 `scripts/*` 라
  **`code=false`** — 무거운 `build`·`e2e` 는 건너뛰고 `lint-scenario-mapping`·`comment-ledger`·
  `docs`·`render`·`image` 가 돈다.

## 이번 패스가 보지 않은 것

- `scripts/check-data-format-change.py`(D 29 · L 2) — `SENSITIVE_PATHS` 의 「리뷰 게이트 판정기 자체」.
  사람 승인이 붙는 슬라이스가 `contracts/codegen.py`(D 16 · E 3 · L 5)와 함께 가져간다.
- `scripts/check-comment-ledger.py`(D 25 · E 1) — 예산 초과분(406 → 380). 다음 무인 슬라이스의 1순위다.
- 나머지 잔여: L 미판정 41행 439줄 + 일부 축만 32행 532줄 · D 23행 454줄 · E 20행 50줄.
  가장 큰 단일 덩어리는 `python/packages/core/`(D 195 + L 15 + E 11)와 `web/src/`(L 62 + 56 + 55 …).
