# 경제 여론 추세 모니터 — Mockup 인덱스

> mockup ↔ 여정 단계 ↔ 가치 ↔ 디자인 시스템 항목의 단일 매핑 소스.
> 검증기(`design-doc-structure-validator`)가 시각화 커버리지와 디자인 시스템 사용처를 이 표에서 읽는다.
> 가치 정의: `docs/econ-opinion-monitor-values.md` · 여정: `docs/user-journeys/` (여정당 문서 하나) · 디자인 시스템 항목: `docs/design-system/econ-opinion-monitor-design-system.md`
>
> 마지막 갱신: 2026-09-19

## Mockup 파일
프로토타입은 **페이지별 자립형(self-contained) HTML 파일**로 분리되어 있다. 각 페이지는 디자인 시스템 CSS와 공통 스크립트를 자체 `<style>`·`<script>`로 **인라인 포함**하므로 다른 파일·폴더 의존 없이 단독으로 열린다(웹폰트만 Google Fonts CDN에서 로드). 모든 페이지는 `docs/mockups/` 안에 있고, 화면 간 이동은 좌측 네비와 본문 버튼의 실제 링크(`<a href>`)로 동작한다.

| 화면 id | 파일 | 형식 |
|---------|------|------|
| `dash` | `docs/mockups/JRN-daily-scan.html` (흡수) | 여정 페이지 |
| `trend` | `docs/mockups/JRN-daily-scan.html` (흡수) | 여정 페이지 |
| `compare` | `docs/mockups/JRN-axis-contrast.html` (흡수) | 여정 페이지 |
| `sentiment` | `docs/mockups/JRN-sentiment-shift.html` | 여정 페이지에 흡수 |
| `fairness` | `docs/mockups/JRN-spike-verification.html` (흡수) | 여정 페이지 |
| `trace` | `docs/mockups/JRN-spike-verification.html` (흡수) | 여정 페이지 |
| `reprocess` | `docs/mockups/reprocess.html` | 자립형 HTML |
| (진입) | `docs/mockups/index.html` | `JRN-daily-scan.html`로 리다이렉트 |

> **흡수된 화면의 표기 규약.** 화면이 여정 페이지에 흡수되면 그 화면 id의 목업 파일은 **흡수한 여정 페이지**다.
> 화면 파일이 삭제돼도 **id 행을 지우거나 취소선 처리하지 않는다** — 그 화면의 시각이 사라진 것이 아니라
> 거처가 옮겨간 것이기 때문이다. 이 표의 화면 id 집합은 `web/src/shell/nav.ts`의 `SCREENS` id 집합과
> 항상 같아야 하며(`tbm_econ-opinion-monitor-mockup-render` 판정 기준 1), 취소선으로 행을 비우면 그 등식이
> 깨져 라우트로 선언된 화면이 목업을 잃어도 아무도 잡지 못한다. 이후 흡수(`compare` → `JRN-axis-contrast` 등)에도
> 같은 형태를 적용한다.
>
> **좌측 네비도 화면 단위로 보존한다.** 흡수돼도 네비 항목을 합치거나 지우지 않는다 —
> `data-id` 는 **화면 id**, 라벨은 **그 화면의 라벨**(`web/src/shell/nav.ts` 의 `label` 과 같은 문자열)을
> 유지하고 **`href` 만** 흡수한 여정 페이지 + 그 화면의 **첫 귀속 단계 앵커**로 돌린다
> (귀속은 아래 「흡수된 화면의 판정 경계」 표가 단일 소스). 한 여정 페이지가 두 화면을 흡수하면
> 네비 항목도 둘이고 앵커로 갈라진다 — `dash` → `JRN-daily-scan.html#STP-open-brief`,
> `trend` → `JRN-daily-scan.html#STP-drill-trend`,
> `fairness` → `JRN-spike-verification.html#STP-check-normalized`,
> `trace` → `JRN-spike-verification.html#STP-open-origin`.
> 항목을 합치거나 라벨을 여정 이름으로 바꾸면(`아침 정기 스캔`·`급등 검증` 이 그랬다) 라우트로 선언된
> 화면이 네비에서 사라져 위 등식이 화면 목록 쪽에서 깨지고, 구현의 `Sidebar` 는 `SCREENS` 를 그대로
> 렌더하므로 목업↔구현 카피가 즉시 갈라진다.
> `scripts/check-mockup-render.py` 의 **R4-nav** 가 이 규약을 상한 0 의 래칫으로 집행한다
> (`docs/econ-opinion-monitor-design-tracker.md` 「규칙 4(네비) — 불일치 상한」).

### 여정 페이지 (여정 단위 mockup — 이관 진행 중)

여정 하나 = 페이지 하나. `<body data-journey>` 로 대상 여정을, 각 단계 섹션의 `data-step` 으로 단계를,
상태 변형 노드의 `data-state` 로 그 페이지가 그린 상태를 선언한다.
화면 단위 파일에서 이관이 끝난 여정만 여기 등재되며, 흡수된 화면 파일은 삭제한다.

여정 페이지는 **클릭되는 제품 프로토타입**이다 — 단계 메타를 늘어놓고 이전/다음으로 넘기는 문서 뷰어는
여기 등재할 수 없다. 문서 메타(단계 번호·식별자·터치포인트·연결 AC·분기표)는 기본적으로 접힌
`<details data-meta-layer>` 보조 레이어에만 두고, 연 직후 보이는 것은 제품 화면이어야 한다.

| 여정 | 파일 | 흡수한 화면 | 단계 |
|---|---|---|---|
| `JRN-sentiment-shift` | `docs/mockups/JRN-sentiment-shift.html` | `sentiment` | `STP-open-sentiment`, `STP-check-unanalyzed`, `STP-overlay-time`, `STP-confirm-cause` |
| `JRN-axis-contrast` | `docs/mockups/JRN-axis-contrast.html` | `compare` | `STP-open-compare`, `STP-scan-axis-tops`, `STP-disambiguate-axis`, `STP-pick-outlier`, `STP-verify-in-trend` |
| `JRN-spike-verification` | `docs/mockups/JRN-spike-verification.html` | `fairness`, `trace` | `STP-notice-spike`, `STP-check-normalized`, `STP-inspect-sources`, `STP-drilldown-articles`, `STP-open-origin`, `STP-judge` |
| `JRN-daily-scan` | `docs/mockups/JRN-daily-scan.html` | `dash`, `trend` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window`, `STP-drill-trend`, `STP-shortlist` |

#### 흡수된 화면의 판정 경계 (단계 ↔ 화면 id 귀속)

여정 페이지가 화면을 흡수해도 **그 페이지의 모든 단계가 그 화면인 것은 아니다.** 여정은 화면을 가로지르며 걷고,
워크스루는 그 경로를 한 파일에 이어 붙인 것이기 때문이다. 목업↔구현 렌더링 정합성
(`tbm_econ-opinion-monitor-mockup-render`)은 화면 단위로 판정하므로, **어느 단계가 어느 화면 id의 시각인지**를
여기에 선언한다 — 선언이 없으면 판정자마다 경계를 새로 그어 같은 표면이 사이클마다 다르게 세어진다.

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-open-compare` | `compare` | 비교 기준 설정 · 축별 수집 현황 |
| `STP-scan-axis-tops` | `compare` | 축별 상위 대상 대조 |
| `STP-disambiguate-axis` | `compare` | 출처 축 ↔ 대상 축 구분 |
| `STP-pick-outlier` | `compare` | 축 간 격차 · 편차 대상 선택 |
| `STP-verify-in-trend` | `trend` | 이 여정 맥락의 추세 상세. `trend`는 `#45`(2026-09-19)로 `App.tsx`의 `BUILT`에 들었다 — **이 단계의 카피·구조는 `tbm_econ-opinion-monitor-mockup-render`의 「등재된 편차」 허용목록이 대조한다**(이전 문면 「아직 `Placeholder`라 구현 의무는 `docs-impl` 소관」은 그 커밋 이후 사실과 어긋났고 rct_20260919-0002가 정정했다). 아직 화면에 없는 것을 **세우는** 일은 여전히 `docs-impl` 몫이고, 있는 것이 목업과 어긋나는지는 mockup-render 몫이다. 다만 이 단계가 선언하는 **「비교 뷰의 축·기간을 그대로 승계」는 `compare`가 넘겨줘야 하는 계약**이므로, 승계 자체의 구현은 `compare`의 인계 항목으로 남는다. |

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-open-sentiment` | `sentiment` | 분포 열기 |
| `STP-check-unanalyzed` | `sentiment` | 미분석 비중 확인 |
| `STP-overlay-time` | `sentiment` | 기간·단위 중첩 |
| `STP-confirm-cause` | `sentiment` | 원인 확인 · 판별 기록 |

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-notice-spike` | `dash` | 급등 인지. 이 단계는 `dash`(순위 목록)와 `trend`(라인 차트) 두 화면에 걸치므로 아래 규약대로 **더 앞선 화면**인 `dash`에 귀속시킨다. `trend`로 넘어갈 때 **의심 대상과 비교 구간을 그대로 승계**하는 것은 `dash`가 넘겨줘야 하는 계약이다. |
| `STP-check-normalized` | `fairness` | 원시↔정규화 전환과 대비 표기 |
| `STP-inspect-sources` | `fairness` | 소스별 기여 분해 · 저신뢰 분리 표기 |
| `STP-drilldown-articles` | `fairness` | 기여 뉴스 목록 (소스·수집 시각·본문 중복 표기) |
| `STP-open-origin` | `trace` | 원문 역추적 · 보존 원문 · 링크 상태 배지 |
| `STP-judge` | `trace` | 판정과 종료. 여정 문서가 이 단계의 터치포인트를 「`trace.html` / 제품 외부(리포트·메모)」로 적었고, 그중 **제품 안에 있던 몫**을 이 여정 페이지가 판정 화면으로 흡수했다. 판정 결과의 **영속화(검증 이력·플래그)는 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹**한 항목이라 화면에도 구현에도 대응물이 없다. |

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-open-brief` | `dash` | 기본 축·기간의 상위 대상 목록과 지표 카드 |
| `STP-scan-delta` | `dash` | 직전 동일 구간 대비 증감(`CMP-delta`) 훑기 |
| `STP-adjust-window` | `dash` | 기간·단위 조정. 화면 단위 목업이 쓰던 `class="seg"` 의사 컨트롤은 여정 페이지에서 실제 `<select>`·`<input type=radio>`로 대체됐다(규칙 5(d)) — 화면 귀속은 그대로 `dash`다 |
| `STP-drill-trend` | `trend` | 이 여정 맥락의 추세 상세(라인 차트 + 상위 대상 비교 표). 화면 2에서 넘어갈 때 **고른 대상과 축·기간을 그대로 승계**하는 것은 `dash`가 넘겨줘야 하는 계약이다 |
| `STP-shortlist` | `trend` | 추림과 세션 종료. 여정 문서가 이 단계의 터치포인트를 「`trend.html` / 제품 외부(사용자 개인 메모)」로 적었고, 그중 **제품 안에 있던 몫**을 이 여정 페이지가 추림 화면으로 흡수했다. 관심 대상 **북마크·워치리스트(영속화)는 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹**한 항목이라 화면에도 구현에도 대응물이 없다 |

`fairness`·`trace`는 구현 `web/src/App.tsx`의 `BUILT` 집합 밖이라(둘 다 `Placeholder`) 이 귀속은 아직
`tbm_econ-opinion-monitor-mockup-render`의 「등재 화면」 허용목록에 들어가지 않는다 — 그 등재는 두 화면이
`BUILT`에 들어와 그 모델이 실제로 대조할 때 그쪽 슬라이스가 한다. 여기 미리 선언해 두는 이유는 그때
경계를 새로 긋지 않기 위해서다.

새 여정 페이지를 등재할 때는 이 형태의 귀속 표를 함께 넣는다. 한 단계가 두 화면에 걸치면 **더 앞선 화면**에 귀속시키고
넘겨주는 계약을 비고에 적는다 — 판정 대상이 겹쳐 두 번 세어지는 것보다 한 번 세어지고 인계가 기록되는 편이 낫다.

**규칙 1 미충족 여정 상한: 2** — 아직 여정 페이지가 없고 예외 등재도 없는 여정의 수다(`JRN-ingestion-recovery`, `JRN-logic-backfill`). `scripts/check-journey-mockup.py` 가 이 값을 상한으로 읽는다 — 실측이 넘으면 실패하고, 밑돌면 이 값을 낮추라고 실패한다(래칫).

**규칙 5 미충족 mockup 페이지 상한: 1** — 개정된 규칙 5(프로토타입 충실도 (a)~(h))를 아직 충족하지
않는 mockup 페이지의 수다. 화면 단위로 남아 있는 1개(`reprocess`)가 그것이며,
여정 워크스루가 아니라 단일 화면 스냅샷이라 (a)(c)(e)를 만족할 수
없다. 이 격차는 여정 단위 재편이 진행되며 닫힌다 — `scripts/check-journey-mockup.py` 가 이 값을
상한으로 읽어 늘면 실패하고, 밑돌면 값을 낮추라고 실패한다(래칫). 여정 페이지는 이 집합에서 제외되며,
`scripts/check-journey-flow.js` 하네스가 (b)~(e)를 실제 DOM에서 집행한다.

**서술 절의 숫자 규약(규칙 7 / 게이트 R10).** 이 문서와 `docs/econ-opinion-monitor-design-tracker.md` 의
산문이 이관 진척(`N/6`)·여정 페이지 수·화면 단위 수·미시각화 단계 수를 다시 적으면,
`scripts/check-journey-mockup.py` 의 R10 이 그 숫자를 **실측과 대조해** 어긋나면 실패시킨다. 표와 래칫만
갱신하고 산문을 남겨 두 SSOT 가 같은 사실을 서로 다르게 말하는 상태(rct_20260918-0004)를 막기 위함이다.
숫자를 산문에서 추방하지는 않는다 — 읽는 사람에게 필요한 수치이므로, 대신 낡으면 CI 가 잡는다.
**과거 시점의 수치를 인용할 자리는 인용 블록(`> `)과 코드 펜스**이며 그 안은 대조에서 면제된다.
마찬가지로 R11 이 트래커 「문서 목록」의 mockup 파일 등재를 실파일과 양방향 대조한다 — 흡수로 삭제된
화면 파일이 목록에 남거나, 새 여정 페이지가 목록에서 빠지는 것을 잡는다.

### 상태 변형 등재 (규칙 5(e))

규칙 5(e)는 "각 화면이 정상 경로 한 벌로 끝나지 않을 것"을 요구하고, 여정 문서에 분기·예외 서술이 있으면
그것이 최소 집합이라고 정한다. 아래가 각 여정 페이지가 그린 상태의 **단일 등재**이며, 하네스는 기대값을
페이지가 아니라 이 표에서 읽는다(페이지에서 읽으면 자기참조라 어떤 뮤테이션도 통과한다).

#### `JRN-daily-scan`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `empty-window` | 밤사이 수집이 들어오지 않은 축 — 0이 아니라 「데이터 없음」으로 두고 마지막 정상 수집 시각을 표기 | 여정 문서 §4 1행 | 화면 1의 「축」 `<select>` 를 수집이 비어 있는 축(전세계)으로 바꾼다 |
| `no-baseline` | 비교 기준 구간에 저장된 값이 없어 증감을 계산할 수 없음 — 증감 칸을 0이 아니라 `—` 로 둔다 | 이 task 결정(여정 문서 §4 1행의 「무응답과 0을 구분」 원칙을 증감 축으로 확장) | 화면 2의 「비교 기준 구간」을 「전주 동요일」로 선택 |
| `no-selection` | 대상 미선택 — 기간을 바꿔 볼 대상이 정해지지 않음 | 이 task 결정 | 화면 2 진입 직후(오른쪽 「고른 대상」 패널) |
| `loading` | 고른 단위로 재집계 중 | 이 task 결정 | 화면 3에서 기간·단위를 고르고 「기간 적용」 제출 |
| `low-sample` | 시간 단위에서 구간당 표본 부족 — 해당 구간을 흐리게 그리고 순위 해석에서 제외 | 이 task 결정(여정 문서 §4의 「단위를 바꿀 때마다 순위가 뒤집히면 판단이 서지 않는다」 페인포인트 대응) | 화면 3에서 단위를 「시간」으로 두고 「기간 적용」 제출 |
| `invalid` | 추림 입력 검증 실패 | 이 task 결정 | 화면 5에서 후보 미선택 또는 메모 공란으로 「추림 확정하고 닫기」 제출 |
| `recorded` | 추림 완료(성공) | 이 task 결정 — **세션 한정이며 영속 저장이 아니다** | 화면 5에서 후보를 고르고 메모를 채워 제출 |

> `recorded`가 세션 안에서만 유지되는 것은 미구현이 아니라 **범위 결정**이다. 여정 문서가
> `STP-shortlist`의 페인포인트로 적은 「관심 대상 북마크·워치리스트」를 문서 자신이
> **「현재 범위 밖, 백로그 후보」** 로 파킹했다. 이 프로토타입은 그 기능을 만들지 않고 단계가 정의한
> 「2~3개를 추리고 세션을 닫는다」까지만 그린다 — `JRN-spike-verification`의 `recorded`와 같은 규약이다.

여정 문서 §4 2·3행(급등 신뢰 불가 → `JRN-spike-verification`, 축 간 차이 → `JRN-axis-contrast`)은 이 여정을
벗어나는 인계라 상태가 아니라 **이탈 컨트롤**로 화면 2·3에 있다. §4 4행(중도 이탈)은 상태가 아니라
화면 5의 「저장 없이 닫고 이 조건으로 다시 열기」 컨트롤로, 다음 진입의 조회 조건 복원을 보여 준다.

#### `JRN-sentiment-shift`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `no-selection` | 대상 미선택 — 분포를 아직 열 수 없음 | 이 task 결정 | 화면 1 진입 직후(오른쪽 분포 패널) |
| `empty` | 검색 결과 0건 — 고를 대상이 없음 | 이 task 결정 | 화면 1의 「대상 찾기」에 일치하는 대상이 없는 검색어를 입력 |
| `unanalyzed-warning` | 미분석 비중이 임계 초과 — 비율 해석 보류 경고 | 여정 문서 §4 1행 | 화면 1에서 대상을 고르고 「미분석 경고 임계(%)」를 실제 비중 아래로 내린다 |
| `loading` | 구간 재집계 중 | 이 task 결정 | 화면 3에서 기간·단위를 바꾸고 「적용」 제출 |
| `low-sample` | 표본 부족 — 최소 표본 미만 구간을 흐리게, 수치 대신 표기 | 여정 문서 §4 2행 | 화면 3에서 단위를 「시간」으로 두고 「적용」 제출 |
| `invalid` | 판별 입력 검증 실패 | 이 task 결정 | 화면 4에서 결론 미선택 또는 근거 메모 공란으로 「판별 기록」 제출 |
| `recorded` | 판별 기록 완료(성공) | 이 task 결정 | 화면 4에서 결론을 고르고 근거 메모를 채워 제출 |

여정 문서 §4 3·4행(분류 오류 → `JRN-spike-verification`, 분류 기준 변경 → `JRN-logic-backfill`)은 이 여정을
벗어나는 인계라 상태가 아니라 **이탈 컨트롤**로 화면 4에 있다.

#### `JRN-axis-contrast`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `loading` | 세 축을 같은 기준으로 재집계 중 | 이 task 결정 | 화면 1에서 「기준 적용」 제출 |
| `axis-empty` | 특정 축의 수집이 비어 있음 — 0%가 아니라 비교에서 제외 | 여정 문서 §4 1행 | 화면 1에서 기간을 「최근 24시간」으로 두고 「기준 적용」 제출(해외 축 시간당 수집 미도착) |
| `no-selection` | 편차 대상 미선택 — 상세로 넘어갈 수 없음 | 이 task 결정 | 화면 4 진입 직후(오른쪽 선택 패널) |
| `no-outlier` | 임계를 넘는 대상 없음 — 「차이 없음」도 결론 | 이 task 결정(여정 완료 기준의 "또는 차이 없음을 확인" 갈래) | 화면 4에서 「격차 임계(%p)」를 실측 최대 격차 위로 올린다 |
| `alias-merged` | 표기 변형을 같은 대상으로 통합 — 통합 전후를 구분 표기 | 여정 문서 §4 4행 | 화면 4에서 「표기 변형을 같은 대상으로 통합」 체크 |
| `invalid` | 온도차 판별 입력 검증 실패 | 이 task 결정 | 화면 5에서 결론 미선택 또는 근거 메모 공란으로 「온도차 기록」 제출 |
| `recorded` | 온도차 판별 기록 완료(성공) | 이 task 결정 | 화면 5에서 결론을 고르고 근거 메모를 채워 제출 |

여정 문서 §4 2·3행(수집량 차이 의심 → `JRN-spike-verification`, 축별 분위기 → `JRN-sentiment-shift`)은
이 여정을 벗어나는 인계라 상태가 아니라 **이탈 컨트롤**로 화면 2·3에 있다.

#### `JRN-spike-verification`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `loading` | 축별 총 건수로 재환산 중 | 이 task 결정 | 화면 2에서 「세는 방식 적용」 제출 |
| `normalized-away` | 정규화하면 급등이 사라짐 — 원문 확인 없이 「편중」으로 조기 종료할 수 있는 갈래 | 여정 문서 §4 5행 | 화면 2에서 「수집량 정규화」를 켜고 「세는 방식 적용」 제출(한국 축 기본 대상) |
| `low-confidence` | 저신뢰·미분석 항목을 집계에서 분리 표기 | 여정 문서 §4 2행 | 화면 3에서 「저신뢰·미분석 항목 분리 표기」 체크 |
| `no-selection` | 기여 뉴스 미선택 — 원문으로 내려갈 수 없음 | 이 task 결정 | 화면 4 진입 직후(오른쪽 상세 패널) |
| `link-expired` | 원문 링크 만료·404 — 보존 원문 전체를 대체 표시하고 링크 상태를 배지로 명시 | 여정 문서 §4 1행 | 화면 5에서 「원문 링크 상태」를 '만료·404'로 선택 |
| `invalid` | 판정 입력 검증 실패 | 이 task 결정 | 화면 6에서 결론 미선택 또는 근거 메모 공란으로 「판정 기록」 제출 |
| `recorded` | 판정 기록 완료(성공) | 이 task 결정 — **세션 한정이며 영속 저장이 아니다** | 화면 6에서 결론을 고르고 근거 메모를 채워 제출 |

> `recorded`가 세션 안에서만 유지되는 것은 미구현이 아니라 **범위 결정**이다. 여정 문서가
> `STP-judge`의 페인포인트로 적은 「검증 이력·플래그 남기기」를 문서 자신이 **「현재 범위 밖, 백로그 후보」**
> 로 파킹했다. 이 프로토타입은 그 기능을 만들지 않고 단계가 정의한 「판단하고 세션을 닫는다」까지만 그린다.
> 백로그가 깨어나면 이 행의 출처와 화면 문구를 함께 고친다.

여정 문서 §4 3·4행(분류 오류 → `JRN-logic-backfill`, 수집 이상 → `JRN-ingestion-recovery`)은 이 여정을
벗어나는 인계라 상태가 아니라 **이탈 컨트롤**이다. 이 페이지는 §4 5행 전체를 「검증 중 이런 상황이라면」
목록으로 제품 평면에 모아 두었다 — 이 여정의 §4는 자기 단계로 되돌아오는 행(1·2·5)과 타 여정 인계(3·4)가
섞여 있어 단계별로 흩어 놓으면 문서 순서와 화면 순서가 어긋나기 때문이다(예: 1행의 조건은 5단계에서만
발생하는데 2행의 조건은 3단계에서 발생한다). 각 상황의 **처리**는 해당 화면 안에도 그대로 있다
(1행 → 화면 5의 링크 상태 배지·보존 원문, 2행 → 화면 3의 분리 표기 토글, 5행 → 화면 2의 정규화 소멸 배너).

> 디자인 시스템 토큰·컴포넌트 스타일은 각 페이지의 `<style>`에 동일하게 인라인된다(개념적 단일 소스는 `docs/design-system/econ-opinion-monitor-design-system.md`). 토큰을 바꿀 때는 5개 페이지(화면 1 + 여정 페이지 4)의 `:root`를 함께 수정한다.
> 아래 인덱스는 **화면(=페이지 파일) 단위**로 여정·가치·디자인 항목을 매핑한다. 화면 id ↔ 파일 대응은 위 표를 따른다(흡수된 `dash`·`trend`·`sentiment`·`compare`·`fairness`·`trace`는 각각 흡수한 여정 페이지, 나머지는 `<id>.html`).

## 화면 → 여정 단계 → 가치 → 디자인 시스템 항목

### 여정 페이지 · `JRN-daily-scan` 아침 정기 스캔
- **여정 단계**: `JRN-daily-scan` / `STP-open-brief`(AC3.2, AC3.5), `STP-scan-delta`, `STP-adjust-window`(AC3.3), `STP-drill-trend`(AC3.5, AC3.2), `STP-shortlist`
- **파일**: `docs/mockups/JRN-daily-scan.html` (구 `dash`·`trend` 두 화면을 흡수, 화면 파일은 삭제. `JRN-spike-verification` / `STP-notice-spike`(급등 인지 지점)와 `JRN-axis-contrast` / `STP-verify-in-trend`는 각 여정 페이지가 자기 맥락의 화면을 원본으로 이미 갖고 있다 — 같은 화면이 여러 여정에 등장하는 것은 규칙 2의 중복이 아니다)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-line-chart`, `CMP-topbar`, `CMP-sidebar`, `CMP-nav-item`, `CMP-metric`, `CMP-card`, `CMP-ranklist`, `CMP-spark`, `CMP-sentbar`, `CMP-axpill`, `CMP-kv`, `CMP-table`, `CMP-legend`, `CMP-seg`, `CMP-norm-toggle`, `CMP-delta`, `CMP-badge`, `CMP-mapstrip`

### 여정 페이지 · `JRN-axis-contrast` 지역 온도차 확인
- **여정 단계**: `JRN-axis-contrast` / `STP-open-compare`(AC3.7), `STP-scan-axis-tops`(AC3.7, AC3.4), `STP-disambiguate-axis`(AC1.3, AC2.1), `STP-pick-outlier`, `STP-verify-in-trend`(AC3.5)
- **파일**: `docs/mockups/JRN-axis-contrast.html` (구 `compare` 화면을 흡수, 화면 파일은 삭제. `STP-verify-in-trend`는 이 여정 맥락의 추세 상세를 원본으로 새로 그린다 — `trend.html`은 `JRN-daily-scan` 몫으로 존속)
- **가치**: V2 지역 축 간 비교
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-axis-compare`, `PAT-line-chart`, `CMP-card`, `CMP-axpill`, `CMP-ranklist`, `CMP-badge`, `CMP-note`, `CMP-legend`, `CMP-table`, `CMP-kv`, `CMP-metric`, `CMP-delta`, `CMP-mapstrip`

### 여정 페이지 · `JRN-sentiment-shift` 분위기 반전 감지
- **여정 단계**: `JRN-sentiment-shift` / `STP-open-sentiment`(AC3.6, AC3.4), `STP-check-unanalyzed`(AC2.5, AC3.4), `STP-overlay-time`(AC3.3, AC3.6), `STP-confirm-cause`
- **파일**: `docs/mockups/JRN-sentiment-shift.html` (구 `sentiment` 화면을 흡수, 화면 파일은 삭제)
- **가치**: V3 분위기 분포 파악, V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-donut`, `PAT-stacked-sentiment`, `CMP-card`, `CMP-sentbar`, `CMP-legend`, `CMP-mapstrip`

### 여정 페이지 · `JRN-spike-verification` 급등 신호의 진위 확인
- **여정 단계**: `JRN-spike-verification` / `STP-notice-spike`, `STP-check-normalized`(AC3.8), `STP-inspect-sources`(AC3.1, AC3.8), `STP-drilldown-articles`(AC3.2, AC1.7), `STP-open-origin`(AC2.6, AC1.4), `STP-judge`
- **파일**: `docs/mockups/JRN-spike-verification.html` (구 `fairness`·`trace` 두 화면을 흡수, 화면 파일은 삭제. `STP-notice-spike`는 이 여정 맥락의 급등 인지 화면을 원본으로 새로 그린다 — `dashboard.html`·`trend.html`은 `JRN-daily-scan` 몫으로 존속)
- **가치**: V4 수집원 편차 보정, V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-raw-vs-norm`, `PAT-lineage`, `CMP-card`, `CMP-norm-toggle`, `CMP-ranklist`, `CMP-table`, `CMP-note`, `CMP-kv`, `CMP-badge`, `CMP-delta`, `CMP-mapstrip`

### 화면 7 · `reprocess` 재처리 콘솔
- **여정 단계**: `JRN-logic-backfill` / `STP-scope-range`(AC1.4, AC2.6), `STP-run-reprocess`(AC2.6), `STP-compare-before-after`(AC3.2, AC3.3) · `JRN-ingestion-recovery` / `STP-spot-anomaly`(AC1.6), `STP-locate-gap`, `STP-diagnose-source`(🟠 실패 사유 표시 없음), `STP-verify-integrity`(🟠 결과만 표시)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-before-after`, `PAT-integrity-panel`, `CMP-card`, `CMP-seg`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-mapstrip`

## 화면 간 이동(클릭 동선, 실제 링크)
- `JRN-daily-scan.html` 안에서는 단계 레일·화면 안의 주요 행동 버튼·`#STP-<슬러그>` 딥링크로 5단계를 이동하고, §분기 4행이 각각 `#STP-scan-delta`·`JRN-spike-verification.html#STP-notice-spike`·`JRN-axis-contrast.html#STP-open-compare`·`#STP-open-brief`로 이동한다
- 좌측 네비(`<a href>`)는 화면 **7항목**(`dash`·`trend`·`compare`·`sentiment`·`fairness`·`trace`·`reprocess` — `nav.ts` 의 `SCREENS` 와 같은 순서·라벨)이고, 목적지는 **5파일**이다(화면 1개 `reprocess.html` + 여정 페이지 4개 `JRN-daily-scan.html`·`JRN-sentiment-shift.html`·`JRN-axis-contrast.html`·`JRN-spike-verification.html`). 흡수된 여섯 화면은 항목을 유지한 채 흡수한 여정 페이지로 가며, 한 페이지를 나눠 쓰는 `dash`·`trend` 와 `fairness`·`trace` 는 각각 `#STP-open-brief`/`#STP-drill-trend`, `#STP-check-normalized`/`#STP-open-origin` 앵커로 갈라진다. `index.html`은 `JRN-daily-scan.html`로 리다이렉트
- `JRN-sentiment-shift.html` 안에서는 단계 레일·주요 행동 버튼·`#STP-<슬러그>` 딥링크로 4단계를 이동하고, §분기 4행이 각각 선언된 대상(`#STP-…` 또는 `JRN-spike-verification.html#STP-open-origin`·`reprocess.html`)으로 이동한다
- `JRN-axis-contrast.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 4행이 `#STP-scan-axis-tops`(2건)·`JRN-spike-verification.html#STP-check-normalized`·`JRN-sentiment-shift.html`로 이동한다
- `JRN-spike-verification.html` 안에서는 같은 방식으로 6단계를 이동하고, 「검증 중 이런 상황이라면」 목록의 §분기 5행이 `#STP-open-origin`·`#STP-inspect-sources`·`reprocess.html`(2건)·`#STP-judge`로 이동한다
- **이관된 여정 사이의 인계는 이제 화면 파일이 아니라 상대 여정의 단계에 착지한다** — 이전에는 `JRN-axis-contrast`의 「정규화로 확인」이 `fairness.html`로, `JRN-sentiment-shift`의 「원문 확인」이 `trace.html`로 갔지만, 두 분기가 선언한 대상은 처음부터 `JRN-spike-verification`의 단계였다

## 여정 단계 커버리지 (25/30 완전 · 2 부분 · 3 미시각화)

여정 문서를 맥락 기준으로 재작성하면서 단계가 19개 → 30개로 늘었고, 화면 단위 mockup 이 아직 못 따라온 구간이 드러났다.

| 여정 | 단계 | 화면 | 상태 |
|------|------|------|------|
| `JRN-daily-scan` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window`, `STP-drill-trend`, `STP-shortlist` | `JRN-daily-scan.html` (여정 페이지) | 🟢 |
| `JRN-spike-verification` | `STP-notice-spike`, `STP-check-normalized`, `STP-inspect-sources`, `STP-drilldown-articles`, `STP-open-origin`, `STP-judge` | `JRN-spike-verification.html` (여정 페이지) | 🟢 |
| `JRN-axis-contrast` | `STP-open-compare`, `STP-scan-axis-tops`, `STP-disambiguate-axis`, `STP-pick-outlier`, `STP-verify-in-trend` | `JRN-axis-contrast.html` (여정 페이지) | 🟢 |
| `JRN-sentiment-shift` | `STP-open-sentiment`, `STP-check-unanalyzed`, `STP-overlay-time`, `STP-confirm-cause` | `JRN-sentiment-shift.html` (여정 페이지) | 🟢 |
| `JRN-ingestion-recovery` | `STP-spot-anomaly`, `STP-locate-gap` | `reprocess` | 🟢 |
| `JRN-ingestion-recovery` | `STP-diagnose-source` | `reprocess` | 🟠 실패 사유 미표시 |
| `JRN-ingestion-recovery` | `STP-backfill` | (없음) | 🔴 재수집 실행 컨트롤 없음 |
| `JRN-ingestion-recovery` | `STP-verify-integrity` | `reprocess` | 🟠 결과만 표시 |
| `JRN-logic-backfill` | `STP-scope-range`, `STP-run-reprocess`, `STP-compare-before-after` | `reprocess` | 🟢 |
| `JRN-logic-backfill` | `STP-dry-run` | (없음) | 🔴 표본 실행 화면 없음 |
| `JRN-logic-backfill` | `STP-publish` | (없음) | 🔴 반영·롤백 컨트롤 없음 |

## 가치 커버리지 (5/5)
| 가치 | 시각화 화면 |
|------|-------------|
| V1 시계열 추세 | `dash`, `trend`, `JRN-sentiment-shift` |
| V2 지역 축 비교 | `JRN-axis-contrast` |
| V3 분위기 분포 | `JRN-sentiment-shift` |
| V4 편차 보정 | `JRN-spike-verification` |
| V5 원문 추적·재처리 | `JRN-spike-verification`, `reprocess` |

## 알려진 정제 항목 (mockup 한정)
- **여정↔mockup 1:1 이관 진행 중 (4/6)**: `JRN-sentiment-shift`·`JRN-axis-contrast`·`JRN-spike-verification`·`JRN-daily-scan` 이 여정 페이지로 이관됐고 나머지 2개(`JRN-ingestion-recovery`·`JRN-logic-backfill`)는 아직 화면 단위다. 이관 순서는 **화면 소유가 배타적인 여정부터** — `sentiment`·`compare` 는 각각 그 여정 전용이었고, `trace` 도 `JRN-spike-verification` 단독 소유, `fairness` 는 그 여정이 3단계의 주 터치포인트로 쓰고 나머지 1건은 `JRN-sentiment-shift` 의 보조 참조뿐이며, `dash`·`trend` 는 `JRN-daily-scan` 단독 소유였다 — 다섯 화면 모두 흡수·삭제가 끝났다. 남은 2개는 **둘 다 🔴 미시각화 단계를 안고 있어 제품 범위 확정이 선행**이며(`STP-backfill`·`STP-dry-run`·`STP-publish`), 화면도 서로 공유한다(`reprocess`: ingestion-recovery+logic-backfill) — 그 화면을 쓰는 여정이 **전부** 이관될 때 함께 흡수·삭제해야 하므로, 두 여정은 **함께** 이관해야 `reprocess.html` 을 지울 수 있다.
- **`STP-pick-outlier` 클릭 동선**: 해소됨(2026-08-31). 여정 페이지의 격차 후보 행을 클릭하면 선택 대상을 유지한 채 `STP-verify-in-trend` 상세로 전진한다.
- **미시각화 3단계**: `STP-backfill`, `STP-dry-run`, `STP-publish` — 셋 다 운영 축이고 `JRN-ingestion-recovery`·`JRN-logic-backfill` 에 속한다. 재수집 실행·표본 실행·반영 결정 컨트롤을 제품에 둘 것인지가 선행 판단이다. `STP-shortlist` 는 2026-09-18 `JRN-daily-scan` 이관으로 해소됐다(추림 화면 신설 — 다만 영속화는 여정 문서가 파킹한 백로그 그대로다).
- **`STP-judge` 판정 화면**: 해소됨(2026-09-18). 여정 페이지가 앞 단계에서 모은 근거를 요약하고 「유효한 신호」/「수집 편중」 두 갈래로 세션을 닫는 화면을 갖는다. 여정 문서가 이 단계의 페인포인트로 적은 **「검증 이력·플래그 남기기」는 문서 자신이 「현재 범위 밖, 백로그 후보」로 파킹**한 항목이라 이 슬라이스에서 만들지 않았다 — 판정은 세션 안에서만 유지된다(「상태 변형 등재」의 `recorded` 행 참조).
- **여정 페이지의 DOM 하네스는 페이지별 시나리오를 요구한다**: `scripts/check-journey-flow.js` 는 `data-journey` 를 선언한 페이지를 전부 발견해 (a)~(h)를 구동하고, `scripts/journey-scenarios/<여정 식별자>.js` 가 없으면 **실패한다**(fail-closed). 여정 페이지를 새로 얹을 때는 시나리오도 함께 넣어야 한다.
- 데이터는 모두 예시(mock) 값이며 실제 파이프라인 연동 전 디자인 검토용이다.
