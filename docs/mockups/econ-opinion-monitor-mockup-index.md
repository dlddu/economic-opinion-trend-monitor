# 경제 여론 추세 모니터 — Mockup 인덱스

> mockup ↔ 여정 단계 ↔ 가치 ↔ 디자인 시스템 항목의 단일 매핑 소스.
> 검증기(`design-doc-structure-validator`)가 시각화 커버리지와 디자인 시스템 사용처를 이 표에서 읽는다.
> 가치 정의: `docs/econ-opinion-monitor-values.md` · 여정: `docs/user-journeys/` (여정당 문서 하나) · 디자인 시스템 항목: `docs/design-system/econ-opinion-monitor-design-system.md`
>
> 마지막 갱신: 2026-09-24

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
| `reprocess` | `docs/mockups/JRN-logic-backfill.html` (흡수) | 여정 페이지 |
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

### 여정 페이지 (여정 단위 mockup — 이관 완료)

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
| `JRN-ingestion-recovery` | `docs/mockups/JRN-ingestion-recovery.html` | (없음) | `STP-spot-anomaly`, `STP-locate-gap`, `STP-diagnose-source`, `STP-backfill`, `STP-verify-integrity` |
| `JRN-logic-backfill` | `docs/mockups/JRN-logic-backfill.html` | `reprocess` | `STP-scope-range`, `STP-dry-run`, `STP-run-reprocess`, `STP-compare-before-after`, `STP-publish` |
| `JRN-judgment-debug` | `docs/mockups/JRN-judgment-debug.html` | (없음) | `STP-pin-record`, `STP-read-exchange`, `STP-check-input`, `STP-scan-run`, `STP-route-cause` |

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

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-spot-anomaly` | `reprocess` | 무결성 패널. 시도·성공·실패·중복을 **네 칸으로 분리**해 「시도 0(스케줄 미실행)」과 「성공 0(소스 오류)」을 구분한다 — 여정 문서가 이 단계의 페인포인트로 적은 구분이다 |
| `STP-locate-gap` | `reprocess` | 무결성 테이블. 축·소스·시간 3중 필터 |
| `STP-diagnose-source` | `reprocess` | 상태 배지 + 수집 메타데이터. 원인 판정에 따라 필요한 메타만 남긴다 |
| `STP-backfill` | `reprocess` | 실행 컨트롤. **이 단계는 화면 단위 `reprocess.html` 에 대응물이 없던 🔴 미시각화 단계**였고 이 여정 페이지가 원본으로 새로 그렸다 — `reprocess`는 `#94`(2026-09-21, 슬라이스 10 전반부)로 `App.tsx`의 `BUILT`에 들었다 — **이 단계의 카피·구조는 `tbm_econ-opinion-monitor-mockup-render`의 「등재된 편차」 허용목록이 대조한다**(이전 문면 「`reprocess` 화면 자체가 `BUILT` 밖이라 목업↔구현 대조는 아직 열리지 않는다」는 그 커밋 이후 사실과 어긋났고 rct_20260921-0003이 정정했다). 이 단계의 그릇은 아직 구현에 없고(허용목록 `STP-backfill` 행), 세우는 일은 `docs-impl` 몫이다 |
| `STP-verify-integrity` | `reprocess` | 보정 전후 비교 패널과 이력 기록. 보정 이력의 **영속화는 여정 문서가 「백로그 후보」로 파킹**한 항목이라 화면에도 구현에도 대응물이 없다 |

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-scope-range` | `reprocess` | 재처리 범위 선택. 기간·축·소스를 고르는 즉시 **대상 건수와 예상 소요를 표기**한다 — 여정 문서가 이 단계의 페인포인트로 적은 「범위를 감으로 정하게 된다」의 대응이다 |
| `STP-dry-run` | `reprocess` | 표본 재분석. **이 단계는 화면 단위 `reprocess.html` 에 대응물이 없던 🔴 미시각화 단계**였고 이 여정 페이지가 원본으로 새로 그렸다 — 여정 문서의 「표본 실행을 기본 경로로 두고 전량 실행은 그 뒤에 열기」를 전진 잠금으로 옮겼다 |
| `STP-run-reprocess` | `reprocess` | 전량 실행·진행 상태. 로직 버전 병존 토글이 여정 문서의 「덮어쓰면 전후 비교가 불가능하다」 페인포인트를 그대로 집행한다 |
| `STP-compare-before-after` | `reprocess` | 전후 비교 표와 주목 임계. 변화가 큰 항목이 먼저 오도록 정렬하고 임계 초과를 배지로 표시한다 |
| `STP-publish` | `reprocess` | 반영·롤백 결정. **이 단계도 화면 단위 파일에 대응물이 없던 🔴 미시각화 단계**였다. 이 프로토타입은 결정을 세션 한정으로 그리지만, **제품은 `#97`(2026-09-21, 슬라이스 10 후반부) 이후 결정을 레이크에 영속한다**(`POST /api/reprocess/publish` → 결정 이력 표) — 그 편차(세션 한정 문장 부재 · 구현 전용 결정 이력 표)는 `tbm_econ-opinion-monitor-mockup-render`의 「등재된 편차」 허용목록 「결정의 영속화」 행이 받는다(이전 문면 「결정의 영속화(재처리 이력·소비자 화면 주석)는 여정 문서가 「백로그 후보」로 파킹한 항목이라 세션 한정으로 그린다」는 그 커밋 이후 사실과 어긋났고 rct_20260921-0006이 정정했다). 소비자 화면 주석(`notify_consumer`)의 노출 자체는 여전히 백로그다 |

> **`reprocess` 화면 id 의 목업 파일은 이제 `docs/mockups/JRN-logic-backfill.html` 이다.** 두 운영 여정이 그 화면을
> 공유했고, 위 「흡수된 화면의 표기 규약」이 말하는 흡수(=화면 파일 삭제)는 그 화면을 쓰는 여정이 **전부** 이관될 때
> 일어난다 — `JRN-logic-backfill` 이관으로 그 조건이 충족돼 `reprocess.html` 을 삭제했다. 화면 id 행은 규약대로
> 존속하고 파일만 흡수한 여정 페이지로 옮겨간다.
>
> **한 화면의 귀속 단계가 두 여정 페이지에 흩어진다** — `JRN-ingestion-recovery` 의 다섯 단계도 `reprocess` 귀속이고
> `JRN-logic-backfill` 의 다섯 단계도 그렇다. `trend` 가 `JRN-daily-scan` 과 `JRN-axis-contrast` 에 흩어진 것과 같은
> 모양이며, 「Mockup 파일」 표의 파일 칸은 그중 **그 화면의 이름을 가진 여정**(여기서는 `JRN-logic-backfill`)을 적는다.
> 각 여정 페이지는 같은 화면을 자기 여정의 맥락으로 다시 그린 **원본**이지 복제가 아니다(규칙 2의 중복이 아니다).

**`fairness`는 2026-09-20(`rct_20260920-0001`, 슬라이스 8)로, `trace`는 같은 날(`rct_20260920-0002`,
슬라이스 9)로 둘 다 `BUILT`에 들어왔다** — 이 여정 페이지를 공유하는 두 화면이 모두 구현됐으므로 이 절의
항목 집합 전체가 `tbm_econ-opinion-monitor-mockup-render`의 판정 범위다. `trace` 귀속인 `PAT-lineage`는
슬라이스 9가 `Trace.tsx`에 계보 표면을 실제로 세우면서 그쪽 모델의 「규칙 3 — 이름 대조 예외」에서 **걷혔다**
(등재 예외 1 → 0, 래칫이 강제한 철거).
`fairness` 귀속 단계 중 `STP-check-normalized`만 구현에 열렸고 `STP-inspect-sources`·`STP-drilldown-articles`는
Gold에 수집원 차원이 없어 표면 자체가 부재다(설계 트래커 「등재된 편차」 참조). 이 귀속을 화면 착지보다
먼저 선언해 둔 이유는 그때 경계를 새로 긋지 않기 위해서였고, 실제로 착지하며 경계가 그대로 쓰였다.

새 여정 페이지를 등재할 때는 이 형태의 귀속 표를 함께 넣는다. 한 단계가 두 화면에 걸치면 **더 앞선 화면**에 귀속시키고
넘겨주는 계약을 비고에 적는다 — 판정 대상이 겹쳐 두 번 세어지는 것보다 한 번 세어지고 인계가 기록되는 편이 낫다.

**규칙 1 미충족 여정 상한: 0** — 아직 여정 페이지가 없고 예외 등재도 없는 여정의 수다. 2026-09-19 `JRN-logic-backfill` 이관으로 처음 0 이 됐고, 2026-09-24 `JRN-judgment-debug` 여정 문서가 페이지보다 먼저 들어와 잠시 1 이었다가 같은 날 그 여정 페이지가 착지해 **다시 0 이 됐다**. `scripts/check-journey-mockup.py` 가 이 값을 상한으로 읽는다 — 실측이 넘으면 실패하고, 밑돌면 이 값을 낮추라고 실패한다(래칫). 상한이 0 이므로 **여정 문서가 하나 늘고 대응 페이지가 없으면 그 즉시 PR 이 빨개진다.**

**규칙 5 미충족 mockup 페이지 상한: 0** — 개정된 규칙 5(프로토타입 충실도 (a)~(h))를 아직 충족하지
않는 mockup 페이지의 수다. 화면 단위 스냅샷은 여정 워크스루가 아니라 (a)(c)(e)를 구조적으로 만족할 수
없었고, 마지막 1개였던 `reprocess.html` 이 2026-09-19 `JRN-logic-backfill` 이관으로 흡수·삭제되며
**0 이 됐다** — `scripts/check-journey-mockup.py` 가 이 값을
상한으로 읽어 늘면 실패하고, 밑돌면 값을 낮추라고 실패한다(래칫). 여정 페이지는 이 집합에서 제외되며,
`scripts/check-journey-flow.js` 하네스가 (b)~(e)를 실제 DOM에서 집행한다. 상한이 0 이므로 이제
**화면 단위 mockup 이 하나라도 다시 들어오면 PR 이 빨개진다.**

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

#### `JRN-ingestion-recovery`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `no-anomaly` | 이 축·구간에는 이상이 없음 — 시도 대비 성공률 100% · 중복 0건 | 이 task 결정(여정 완료 기준의 「정상 범위로 복구됨을 확인」 갈래를 진입 시점으로 확장) | 화면 1의 「축」 `<select>` 를 이상이 없는 축(전세계)으로 바꾼다 |
| `attempt-zero` | 수집 **시도 자체가 0** — 「성공 0(소스 오류)」과 구분해 스케줄 미실행으로 표기 | 여정 문서 `STP-spot-anomaly` 페인포인트(「수집 0건과 시도 실패가 같은 모습이면 이상을 놓친다」) | 화면 1에서 시도 칸이 0인 구간 행을 고른다 |
| `filter-empty` | 3중 필터 결과 0건 — 좁힌 조합에 해당하는 구간이 없음 | 이 task 결정 | 화면 2에서 그 축에 없는 소스(한국 축 + `us-desk`)로 좁힌다 |
| `source-outage` | 소스 API 장애 — 지금 재수집해도 같은 오류. 재시도 예약 후 「복구 대기」 표시 | 여정 문서 §4 1행 | 화면 3에서 원인을 「소스 API가 오류를 돌려줬다」로 고른다 |
| `origin-gone` | 원본 소실 — 재수집 불가. 영구 누락으로 확정해 집계가 0이 아니라 「데이터 없음」으로 다루게 한다 | 여정 문서 §4 2행 | 화면 3에서 원인을 「원본이 이미 내려갔다」로 고른다 |
| `running` | 고른 구간을 다시 긁는 중 | 이 task 결정 | 화면 4에서 「보정 실행」 |
| `dup-again` | 재수집이 중복을 다시 만듦 — 링크·본문 중복 규칙 재확인 필요 | 여정 문서 §4 3행 | 화면 4에서 「새 버전으로 보존」 체크를 풀고(=덮어쓰기) 「보정 실행」 |
| `invalid` | 복구 확인 입력 검증 실패 | 이 task 결정 | 화면 5에서 결론 미선택 또는 보정 이력 메모 공란으로 「복구 확인 기록」 제출 |
| `recorded` | 복구 확인 기록 완료(성공) | 이 task 결정 — **세션 한정이며 영속 저장이 아니다** | 화면 5에서 결론을 고르고 보정 이력 메모를 채워 제출 |

> `recorded`가 세션 안에서만 유지되는 것은 미구현이 아니라 **범위 결정**이다. 여정 문서가
> `STP-verify-integrity`의 페인포인트로 적은 「보정 이력을 구간 메타로 기록하고 소비자 화면에도 주석 노출」을
> 문서 자신이 **「백로그 후보」** 로 파킹했다. 이 프로토타입은 그 기능을 만들지 않고 단계가 정의한
> 「정상 범위인지 재확인한다」까지만 그린다 — `JRN-daily-scan`·`JRN-spike-verification`의 `recorded`와 같은 규약이다.

#### `JRN-logic-backfill`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `empty-scope` | 고른 조합에 보관된 원문이 없음 — 재분석할 대상이 0건 | 이 task 결정 | 화면 1에서 그 축에 없는 소스(한국 축 + `us-desk`)로 좁힌다 |
| `over-budget` | 한 번에 돌리기에 큰 범위 — 대상 건수와 예상 소요를 표기해 나눠 돌게 한다 | 여정 문서 `STP-scope-range` 페인포인트(「대상 건수·예상 비용이 안 보이면 범위를 감으로 정하게 된다」) | 화면 1의 「기간」 `<select>` 를 「지난 30일」로 넓힌다 |
| `sample-running` | 표본을 새 로직으로 돌리는 중 | 이 task 결정 | 화면 2에서 「표본 실행」 |
| `sample-mismatch` | 표본 결과가 의도와 다름 — **전량 실행을 잠근다** | 여정 문서 §4 1행 | 화면 2에서 「표본 추출」을 「새 로직이 건드리는 대상 우선」으로 바꾼다(재분류 62%) |
| `running` | 범위 전체를 다시 분석하는 중 | 이 task 결정 | 화면 3에서 「전량 실행」 |
| `overwrite-warning` | 덮어쓰기로 돌리면 이전 결과가 사라져 전후 비교·되돌리기가 불가능 | 여정 문서 `STP-run-reprocess` 페인포인트(「기존 Silver를 덮어써 이전 결과를 잃으면 전후 비교 자체가 불가능」) | 화면 3에서 「로직 버전을 붙여 병존시킨다」 체크를 푼다 |
| `interrupted` | 재분석이 도중에 끊김 — 체크포인트까지 유지하고 그 지점부터 재개(전량 재실행 금지) | 여정 문서 §4 2행 | 화면 3에서 배치 크기를 450으로 올리고 「전량 실행」 |
| `over-threshold` | 전후 차이가 주목 임계를 넘는 항목이 있음 | 여정 문서 §4 3행 | 화면 4에서 「주목 임계 (%p)」를 실측 최대 변화 아래로 내린다 |
| `low-confidence` | 분석 실패·저신뢰 급증 — 미분석을 비율에 섞지 않고 분리 적재해 비중을 보고 | 여정 문서 §4 5행 | 화면 4에서 「미분석 · 저신뢰를 따로 떼어 보기」 체크 |
| `invalid` | 반영·롤백 결정 입력 검증 실패 | 이 task 결정 | 화면 5에서 결정 미선택 또는 근거 공란으로 「결정 기록」 제출 |
| `recorded` | 반영·롤백 결정 기록 완료(성공) | 이 task 결정 — 프로토타입 안에서는 세션 한정(제품은 `#97` 이후 영속, 아래 정정) | 화면 5에서 결정을 고르고 근거를 채워 제출 |

> `recorded`가 이 프로토타입 안에서 세션 한정인 것은 앞선 네 여정의 `recorded`와 같은 **프로토타입 규약**이다 —
> 여정 문서가 `STP-publish`의 페인포인트로 적은 「재처리 반영 시각·로직 버전을 소비자 화면 주석으로 노출」을 문서
> 자신이 **「백로그 후보」** 로 파킹했고, 프로토타입은 그 기능을 만들지 않는다. 다만 **제품의 결정 기록은 `#97`
> (2026-09-21, 슬라이스 10 후반부) 이후 세션이 아니라 레이크에 남는다** — 여정 완료 기준 「결정이 기록됨」을 제품이
> 먼저 닫았고, 목업의 `이 기록은 이 세션 안에서만 유지됩니다 — 제품 안에 남는 재처리 이력은 아직 없습니다.` 문장은
> 제품에 대해서는 더 이상 참이 아니다(이전 문면 「세션 안에서만 유지되는 것은 미구현이 아니라 범위 결정이다」는 그
> 커밋 이후 사실과 어긋났고 rct_20260921-0006이 정정했다). 그 편차와 구현 전용 결정 이력 표는
> `tbm_econ-opinion-monitor-mockup-render`의 「등재된 편차」 「결정의 영속화」 행이 받고, 목업을 영속 이력으로 다시
> 그릴지는 디자인 결정으로 남는다. 소비자 화면 주석의 실제 노출은 여전히 백로그다.

여정 문서 §4 3·4행(임계 초과 → `JRN-spike-verification`, 원문 누락 → `JRN-ingestion-recovery`)은 이 여정을 벗어나는
인계라 상태가 아니라 **이탈 컨트롤**이다. 이 페이지는 §4 3·4·5행을 화면 4의 「재처리 중 이런 상황이라면」 목록으로
모아 두었다 — 그 셋은 모두 **전후 비교를 보고 나서야 갈리는** 갈래이고, 1·2행(표본 불일치 · 중단 재개)은 각각
자기 화면의 배너 상태로 위 표에 있다.

여정 문서 §4 4행(수집은 정상인데 분석 결과가 이상 → `JRN-logic-backfill`)은 이 여정을 벗어나는 인계라 상태가 아니라
**이탈 컨트롤**로 화면 4에 있다. §4 5행(중도 이탈)도 상태가 아니라 화면 5의 「미해결로 남기고 구간 목록으로」
컨트롤로, 다음 진입에 그 구간이 다시 뜬다는 처리를 보여 준다. 나머지 3행(1·2·3)은 자기 단계로 되돌아오는 분기라
각 화면의 배너 상태로 위 표에 있다.

> 디자인 시스템 토큰·컴포넌트 스타일은 각 페이지의 `<style>`에 동일하게 인라인된다(개념적 단일 소스는 `docs/design-system/econ-opinion-monitor-design-system.md`). 토큰을 바꿀 때는 여정 페이지 6개의 `:root`를 함께 수정한다.
> 아래 인덱스는 **화면(=페이지 파일) 단위**로 여정·가치·디자인 항목을 매핑한다. 화면 id ↔ 파일 대응은 위 표를 따른다(흡수된 `dash`·`trend`·`sentiment`·`compare`·`fairness`·`trace`·`reprocess`는 각각 흡수한 여정 페이지이며, 화면 단위 파일은 이제 하나도 남아 있지 않다).

#### `JRN-judgment-debug`

| 상태 id | 상태 | 출처 | 도달 경로 (프로토타입 안에서) |
|---|---|---|---|
| `no-match` | 찾는 분석 결과가 없음 — 레코드 번호 형식 안내 | 여정 문서 `STP-pin-record` 페인포인트(제보가 제목만 들고 와 헤맨다) | 화면 1의 검색에 없는 레코드 번호를 친다 |
| `parse-mismatch` | 응답의 최종 판단과 저장값이 어긋남 — 저장값이 응답 안 첫 JSON(초안)에서 읽힘 | 여정 문서 `STP-read-exchange` 페인포인트(모델이 틀렸는지 파서가 틀렸는지) | 제보 링크의 기본 결과 `R-2609-0412` 로 화면 2에 들어간다 |
| `call-failed` | 모델 호출 실패 — 재시도 횟수·마지막 오류를 보이고 결과는 미분석 | PRD-4 AC4.2(호출 실패도 기록) | 화면 1에서 `R-2609-0398` 을 고르고 화면 2로 |
| `not-called` | 모델을 부르지 않은 결과 — 미호출 사유와 입력 점검으로 가는 분기 | 여정 문서 §4 2행 | 화면 1에서 `R-2609-0377`(본문 미확보)을 고르고 화면 2로 |
| `reused` | 응답 재사용 결과 — 원 호출 기록으로 가는 분기 | 여정 문서 §4 3행 | 화면 1에서 `R-2609-0365` 를 고르고 화면 2로 |
| `no-call-record` | 호출 기록이 없는 결과(기록 도입 이전) — 표본 재분석으로 넘기는 분기 | 여정 문서 §4 4행 | 화면 1에서 `R-2608-2210` 을 고르고 화면 2로 |
| `body-mismatch` | 분석에 쓴 본문 버전 ≠ 보관된 최신 버전 — 분석 뒤 수정 횟수 표기 | 여정 문서 `STP-check-input` 페인포인트(어느 버전으로 판단했는지) | 화면 1에서 `R-2609-0351` 을 고르고 화면 3으로 |
| `body-empty` | 본문이 사실상 비어 있음(링크만 있거나 안내 문구뿐) | 여정 문서 `STP-check-input` 사용자 행동(본문이 비었거나 잘렸는지) | 화면 1에서 `R-2609-0420` 을 고르고 화면 3으로 |
| `run-concentrated` | 고른 증상이 이 실행에 몰림 — 기준 대비 비율과 직전 실행 건수 | 여정 문서 `STP-scan-run` 사용자 행동(같은 증상이 얼마나 몰렸는지) | 화면 4 기본 상태(기준 2%). 「몰림 기준 %」를 올리면 해소 |
| `run-stage-failed` | 실행이 분석 단계에서 중단 — 멈춘 지점까지의 건수·사유, 집계 미실행 | PRD-4 AC4.1(중단된 실행도 그 시점까지 기록) | 화면 4의 「실행」 `<select>` 에서 09-23 23:00 을 고른다 |
| `invalid` | 원인 판정 입력 검증 실패 | 이 task 결정 | 화면 5에서 원인 미선택 또는 판정 메모 공란으로 「판정 기록」 제출 |
| `recorded` | 원인 판정 기록 완료(성공) | 이 task 결정 — **세션 한정이며 영속 저장이 아니다** | 화면 5에서 원인을 고르고 메모를 채워 제출 |

> `recorded`가 세션 안에서만 유지되는 것은 미구현이 아니라 **범위 결정**이다. 여정 문서가 `STP-route-cause`의
> 페인포인트로 적은 「판정 메모를 레코드·실행에 남기기」를 문서 자신이 **「현재 AC 없음 — 백로그 후보」** 로
> 파킹했다. 화면도 그 사실을 성공 배너에 그대로 적는다 — 다른 여정의 `recorded` 와 같은 규약이다.
> 이 페이지가 그리는 기록(호출·실행)은 PRD-4 AC4.1~4.3 이 요구하는 계약이며 **아직 구현 전**이다 — 목업이 계약을 먼저 보여 준다.

## 화면 → 여정 단계 → 가치 → 디자인 시스템 항목

### 여정 페이지 · `JRN-daily-scan` 아침 정기 스캔
- **여정 단계**: `JRN-daily-scan` / `STP-open-brief`(AC3.2, AC3.5), `STP-scan-delta`, `STP-adjust-window`(AC3.3), `STP-drill-trend`(AC3.5, AC3.2), `STP-shortlist`
- **파일**: `docs/mockups/JRN-daily-scan.html` (구 `dash`·`trend` 두 화면을 흡수, 화면 파일은 삭제. `JRN-spike-verification` / `STP-notice-spike`(급등 인지 지점)와 `JRN-axis-contrast` / `STP-verify-in-trend`는 각 여정 페이지가 자기 맥락의 화면을 원본으로 이미 갖고 있다 — 같은 화면이 여러 여정에 등장하는 것은 규칙 2의 중복이 아니다)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-line-chart`, `CMP-topbar`, `CMP-sidebar`, `CMP-nav-item`, `CMP-metric`, `CMP-card`, `CMP-ranklist`, `CMP-spark`, `CMP-sentbar`, `CMP-axpill`, `CMP-kv`, `CMP-table`, `CMP-legend`, `CMP-seg`, `CMP-norm-toggle`, `CMP-delta`, `CMP-badge`, `CMP-mapstrip`

### 여정 페이지 · `JRN-axis-contrast` 지역 온도차 확인
- **여정 단계**: `JRN-axis-contrast` / `STP-open-compare`(AC3.7), `STP-scan-axis-tops`(AC3.7, AC3.4), `STP-disambiguate-axis`(AC1.3, AC2.1), `STP-pick-outlier`, `STP-verify-in-trend`(AC3.5)
- **파일**: `docs/mockups/JRN-axis-contrast.html` (구 `compare` 화면을 흡수, 화면 파일은 삭제. `STP-verify-in-trend`는 이 여정 맥락의 추세 상세를 원본으로 새로 그린다 — 구 `trend` 화면은 `JRN-daily-scan.html` 이 흡수했다)
- **가치**: V2 지역 축 간 비교
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-axis-compare`, `PAT-line-chart`, `CMP-card`, `CMP-axpill`, `CMP-ranklist`, `CMP-badge`, `CMP-note`, `CMP-legend`, `CMP-table`, `CMP-kv`, `CMP-metric`, `CMP-delta`, `CMP-mapstrip`

### 여정 페이지 · `JRN-sentiment-shift` 분위기 반전 감지
- **여정 단계**: `JRN-sentiment-shift` / `STP-open-sentiment`(AC3.6, AC3.4), `STP-check-unanalyzed`(AC2.5, AC3.4), `STP-overlay-time`(AC3.3, AC3.6), `STP-confirm-cause`
- **파일**: `docs/mockups/JRN-sentiment-shift.html` (구 `sentiment` 화면을 흡수, 화면 파일은 삭제)
- **가치**: V3 분위기 분포 파악, V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-donut`, `PAT-stacked-sentiment`, `CMP-card`, `CMP-sentbar`, `CMP-legend`, `CMP-mapstrip`

### 여정 페이지 · `JRN-spike-verification` 급등 신호의 진위 확인
- **여정 단계**: `JRN-spike-verification` / `STP-notice-spike`, `STP-check-normalized`(AC3.8), `STP-inspect-sources`(AC3.1, AC3.8), `STP-drilldown-articles`(AC3.2, AC1.7), `STP-open-origin`(AC2.6, AC1.4), `STP-judge`
- **파일**: `docs/mockups/JRN-spike-verification.html` (구 `fairness`·`trace` 두 화면을 흡수, 화면 파일은 삭제. `STP-notice-spike`는 이 여정 맥락의 급등 인지 화면을 원본으로 새로 그린다 — 구 `dash`·`trend` 화면은 `JRN-daily-scan.html` 이 흡수했다)
- **가치**: V4 수집원 편차 보정, V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-raw-vs-norm`, `PAT-lineage`, `CMP-card`, `CMP-norm-toggle`, `CMP-ranklist`, `CMP-table`, `CMP-note`, `CMP-kv`, `CMP-badge`, `CMP-delta`, `CMP-mapstrip`

### 여정 페이지 · `JRN-ingestion-recovery` 수집 이상 감지·복구
- **여정 단계**: `JRN-ingestion-recovery` / `STP-spot-anomaly`(AC1.6), `STP-locate-gap`(AC1.5, AC1.6), `STP-diagnose-source`(AC1.5, AC1.6, AC1.7), `STP-backfill`(AC1.6, AC1.7), `STP-verify-integrity`
- **파일**: `docs/mockups/JRN-ingestion-recovery.html` (운영 축 화면을 이 여정 맥락의 원본으로 새로 그린다. 구 `reprocess` 화면은 두 운영 여정이 공유했으므로 나중 이관인 `JRN-logic-backfill` 시점에 흡수됐고, 화면 파일은 삭제)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자), V1의 전제(지속적 수집) 보호
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-integrity-panel`, `PAT-before-after`, `CMP-card`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-note`, `CMP-metric`, `CMP-mapstrip`

### 여정 페이지 · `JRN-logic-backfill` 로직 개선의 소급 적용
- **여정 단계**: `JRN-logic-backfill` / `STP-scope-range`(AC1.4, AC2.6), `STP-dry-run`, `STP-run-reprocess`(AC2.6, AC2.4), `STP-compare-before-after`(AC3.2, AC3.3), `STP-publish`
- **파일**: `docs/mockups/JRN-logic-backfill.html` (구 `reprocess` 화면을 흡수, 화면 파일은 삭제. `JRN-ingestion-recovery` 는 같은 `reprocess` 귀속 단계를 자기 여정 맥락의 원본으로 이미 갖고 있다 — 같은 화면이 여러 여정에 등장하는 것은 규칙 2의 중복이 아니다)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-before-after`, `PAT-integrity-panel`, `CMP-card`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-note`, `CMP-metric`, `CMP-mapstrip`

### 여정 페이지 · `JRN-judgment-debug` 분석 판단 디버깅
- **여정 단계**: `JRN-judgment-debug` / `STP-pin-record`(AC4.3, AC2.6), `STP-read-exchange`(AC4.2), `STP-check-input`(AC4.2, AC2.6, AC1.7), `STP-scan-run`(AC4.1, AC4.3), `STP-route-cause`
- **파일**: `docs/mockups/JRN-judgment-debug.html` (새로 그린 운영 화면. 흡수한 화면 id 가 없고 좌측 네비 항목도 없다 — 아래 「알려진 정제 항목」 참조)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-integrity-panel`, `CMP-card`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-note`, `CMP-metric`, `CMP-mapstrip`

## 화면 간 이동(클릭 동선, 실제 링크)
- `JRN-daily-scan.html` 안에서는 단계 레일·화면 안의 주요 행동 버튼·`#STP-<슬러그>` 딥링크로 5단계를 이동하고, §분기 4행이 각각 `#STP-scan-delta`·`JRN-spike-verification.html#STP-notice-spike`·`JRN-axis-contrast.html#STP-open-compare`·`#STP-open-brief`로 이동한다
- 좌측 네비(`<a href>`)는 화면 **7항목**(`dash`·`trend`·`compare`·`sentiment`·`fairness`·`trace`·`reprocess` — `nav.ts` 의 `SCREENS` 와 같은 순서·라벨)이고, 목적지는 **5파일**이다(`JRN-daily-scan.html`·`JRN-sentiment-shift.html`·`JRN-axis-contrast.html`·`JRN-spike-verification.html`·`JRN-logic-backfill.html`). **`JRN-ingestion-recovery.html` 은 좌측 네비의 목적지가 아니다** — `reprocess` 항목은 화면 id 규약에 따라 그 화면을 흡수한 `JRN-logic-backfill.html#STP-scope-range` 를 가리키고, 수집 복구 여정 페이지로는 허브와 다른 여정의 이탈 컨트롤로 들어간다. 그래서 네비 목적지 수와 여정 페이지 실측 수는 서로 다른 축이다. 흡수된 일곱 화면은 항목을 유지한 채 흡수한 여정 페이지로 가며, 한 페이지를 나눠 쓰는 `dash`·`trend` 와 `fairness`·`trace` 는 각각 `#STP-open-brief`/`#STP-drill-trend`, `#STP-check-normalized`/`#STP-open-origin` 앵커로 갈라진다. `index.html`은 `JRN-daily-scan.html`로 리다이렉트
- `JRN-sentiment-shift.html` 안에서는 단계 레일·주요 행동 버튼·`#STP-<슬러그>` 딥링크로 4단계를 이동하고, §분기 4행이 각각 선언된 대상(`#STP-…` 또는 `JRN-spike-verification.html#STP-open-origin`·`JRN-logic-backfill.html#STP-scope-range`)으로 이동한다
- `JRN-axis-contrast.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 4행이 `#STP-scan-axis-tops`(2건)·`JRN-spike-verification.html#STP-check-normalized`·`JRN-sentiment-shift.html`로 이동한다
- `JRN-spike-verification.html` 안에서는 같은 방식으로 6단계를 이동하고, 「검증 중 이런 상황이라면」 목록의 §분기 5행이 `#STP-open-origin`·`#STP-inspect-sources`·`JRN-logic-backfill.html#STP-scope-range`·`JRN-ingestion-recovery.html#STP-spot-anomaly`·`#STP-judge`로 이동한다
- `JRN-ingestion-recovery.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 5행이 `#STP-backfill`·`#STP-verify-integrity`·`#STP-diagnose-source`·`JRN-logic-backfill.html#STP-scope-range`·`#STP-locate-gap` 으로 이동한다
- `JRN-logic-backfill.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 5행이 `#STP-dry-run`·`#STP-run-reprocess`·`JRN-spike-verification.html#STP-open-origin`·`JRN-ingestion-recovery.html#STP-locate-gap`·`#STP-compare-before-after` 로 이동한다
- `JRN-judgment-debug.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 7행이 `#STP-scan-run`·`#STP-check-input`·`#STP-read-exchange`·`JRN-logic-backfill.html#STP-dry-run`·`JRN-ingestion-recovery.html#STP-locate-gap`·`JRN-logic-backfill.html#STP-scope-range`·`#STP-pin-record` 로 이동한다. 이 페이지로 들어오는 길은 허브뿐이다(좌측 네비 항목 없음)
- **여정 사이의 인계는 이제 예외 없이 상대 여정의 단계에 착지한다** — 이전에는 `JRN-axis-contrast`의 「정규화로 확인」이 `fairness.html`로, `JRN-sentiment-shift`의 「원문 확인」이 `trace.html`로, 세 여정의 재처리 인계가 `reprocess.html`로 갔지만, 그 분기들이 선언한 대상은 처음부터 상대 여정의 **단계**였다. 화면 파일이 모두 흡수된 지금 그 괴리는 남아 있지 않다(`JRN-spike-verification` 의 「수집 이상 점검하기」가 선언 대상 `JRN-ingestion-recovery#STP-spot-anomaly` 와 달리 `reprocess.html` 을 가리키던 것도 이번에 바로잡았다)

## 여정 단계 커버리지 (35/35 완전 · 0 부분 · 0 미시각화)

여정 문서를 맥락 기준으로 재작성하면서 단계가 19개 → 30개로 늘었고, 화면 단위 mockup 이 아직 못 따라온 구간이 드러났다.

| 여정 | 단계 | 화면 | 상태 |
|------|------|------|------|
| `JRN-daily-scan` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window`, `STP-drill-trend`, `STP-shortlist` | `JRN-daily-scan.html` (여정 페이지) | 🟢 |
| `JRN-spike-verification` | `STP-notice-spike`, `STP-check-normalized`, `STP-inspect-sources`, `STP-drilldown-articles`, `STP-open-origin`, `STP-judge` | `JRN-spike-verification.html` (여정 페이지) | 🟢 |
| `JRN-axis-contrast` | `STP-open-compare`, `STP-scan-axis-tops`, `STP-disambiguate-axis`, `STP-pick-outlier`, `STP-verify-in-trend` | `JRN-axis-contrast.html` (여정 페이지) | 🟢 |
| `JRN-sentiment-shift` | `STP-open-sentiment`, `STP-check-unanalyzed`, `STP-overlay-time`, `STP-confirm-cause` | `JRN-sentiment-shift.html` (여정 페이지) | 🟢 |
| `JRN-ingestion-recovery` | `STP-spot-anomaly`, `STP-locate-gap`, `STP-diagnose-source`, `STP-backfill`, `STP-verify-integrity` | `JRN-ingestion-recovery.html` (여정 페이지) | 🟢 |
| `JRN-logic-backfill` | `STP-scope-range`, `STP-dry-run`, `STP-run-reprocess`, `STP-compare-before-after`, `STP-publish` | `JRN-logic-backfill.html` (여정 페이지) | 🟢 |
| `JRN-judgment-debug` | `STP-pin-record`, `STP-read-exchange`, `STP-check-input`, `STP-scan-run`, `STP-route-cause` | `JRN-judgment-debug.html` (여정 페이지) | 🟢 |

2026-09-24 `JRN-judgment-debug` 는 여정 문서가 먼저 들어와 한때 다섯 단계가 미시각화였고, 같은 날 여정 페이지가 착지해 해소됐다.

## 가치 커버리지 (5/5)
| 가치 | 시각화 화면 |
|------|-------------|
| V1 시계열 추세 | `dash`, `trend`, `JRN-sentiment-shift` |
| V2 지역 축 비교 | `JRN-axis-contrast` |
| V3 분위기 분포 | `JRN-sentiment-shift` |
| V4 편차 보정 | `JRN-spike-verification` |
| V5 원문 추적·재처리 | `JRN-spike-verification`, `JRN-ingestion-recovery`, `JRN-logic-backfill`, `JRN-judgment-debug` |

## 알려진 정제 항목 (mockup 한정)
- **여정↔mockup 1:1 이관 완료 (7/7)**: 일곱 여정 전부가 여정 페이지를 갖고(2026-09-24 신설 `JRN-judgment-debug` 는 문서와 같은 날 페이지 착지), 화면 단위 mockup 은 0개다(진입 리다이렉트 `index.html` 만 남는다). 이관 순서는 **화면 소유가 배타적인 여정부터**였다 — `sentiment`·`compare` 는 각각 그 여정 전용, `trace` 는 `JRN-spike-verification` 단독 소유, `fairness` 는 그 여정이 3단계의 주 터치포인트로 쓰고 나머지 1건은 `JRN-sentiment-shift` 의 보조 참조뿐, `dash`·`trend` 는 `JRN-daily-scan` 단독 소유였고, **두 운영 여정이 공유한 `reprocess` 가 마지막**이었다. 공유 화면이라 규약대로 **그 화면을 쓰는 여정이 전부 이관될 때** 흡수·삭제했다 — 2026-09-19 `JRN-logic-backfill` 이관이 그 시점이고, 같은 슬라이스가 마지막 🔴 미시각화 2건(`STP-dry-run`·`STP-publish`)의 제품 범위를 확정해 화면으로 그렸다. 두 래칫(「규칙 1 미충족 여정 상한」·「규칙 5 미충족 mockup 페이지 상한」)이 함께 0 으로 내려갔다.
- **`STP-pick-outlier` 클릭 동선**: 해소됨(2026-08-31). 여정 페이지의 격차 후보 행을 클릭하면 선택 대상을 유지한 채 `STP-verify-in-trend` 상세로 전진한다.
- **미시각화 단계 0개**: 2026-09-24 신설 `JRN-judgment-debug` 의 다섯 단계는 같은 날 여정 페이지로 해소됐다. 그 이전의 마지막 2건(`STP-dry-run`·`STP-publish`)이 2026-09-19 `JRN-logic-backfill` 이관으로 해소됐다. 둘 다 「제품에 둘 것인지」가 선행 판단이었고 이 슬라이스가 **둔다**로 확정했다 — 표본 실행은 전량 실행의 관문(표본이 의도와 어긋나면 전량이 잠긴다)으로, 반영·롤백은 근거를 함께 적는 결정 기록으로 그렸다. 결정의 영속화(재처리 이력·소비자 화면 주석)는 여정 문서가 파킹한 백로그 그대로다. 앞선 해소: `STP-backfill` 은 `JRN-ingestion-recovery` 이관(2026-09-19), `STP-shortlist` 는 `JRN-daily-scan` 이관(2026-09-18). 🟠 부분 시각화였던 `STP-diagnose-source`·`STP-verify-integrity` 도 같은 흐름에서 닫혔다.
- **`STP-judge` 판정 화면**: 해소됨(2026-09-18). 여정 페이지가 앞 단계에서 모은 근거를 요약하고 「유효한 신호」/「수집 편중」 두 갈래로 세션을 닫는 화면을 갖는다. 여정 문서가 이 단계의 페인포인트로 적은 **「검증 이력·플래그 남기기」는 문서 자신이 「현재 범위 밖, 백로그 후보」로 파킹**한 항목이라 이 슬라이스에서 만들지 않았다 — 판정은 세션 안에서만 유지된다(「상태 변형 등재」의 `recorded` 행 참조).
- **여정 페이지의 DOM 하네스는 페이지별 시나리오를 요구한다**: `scripts/check-journey-flow.js` 는 `data-journey` 를 선언한 페이지를 전부 발견해 (a)~(h)를 구동하고, `scripts/journey-scenarios/<여정 식별자>.js` 가 없으면 **실패한다**(fail-closed). 여정 페이지를 새로 얹을 때는 시나리오도 함께 넣어야 한다.
- 데이터는 모두 예시(mock) 값이며 실제 파이프라인 연동 전 디자인 검토용이다.
- **`JRN-judgment-debug` 진입 경로 — 좌측 네비 항목 없음**: 이 여정 페이지는 새로 그린 운영 화면이지만 좌측 네비에 항목을 더하지 않았다. 네비는 `web/src/shell/nav.ts` 의 `SCREENS` 와 1:1 이어야 하고(R4-nav 상한 0), 항목을 더하는 것은 구현 라우트를 새로 선언하는 제품 결정이기 때문이다. 지금은 허브로만 들어오며, 목업 네비에서는 어느 항목도 활성 표시하지 않는다. 구현 슬라이스가 이 화면의 라우트를 정할 때 네비 항목과 「Mockup 파일」 표의 화면 id 를 함께 연다.
- **요청·응답 원문 블록(`.code`)은 디자인 시스템 미등재**: 가공 전 텍스트를 그대로 보여 주는 고정폭 블록을 이 페이지에서 처음 썼다. 토큰(`TKN-type` mono · `TKN-surface` · `TKN-line` · `TKN-radius`)만 조합했고 새 색·치수는 없다. 두 번째 사용처가 생기면 컴포넌트로 등재한다.
- **목업 데이터는 운영 실측 규모를 따른다**: 실행당 관측 약 500건, 새 LLM 호출은 그중 일부이고 나머지는 응답 재사용이라는 비율은 2026-09-24 운영 레이크 실측(PRD-4 「설계 전제」)을 본떴다. 개별 레코드·호출 번호는 가상이다.
