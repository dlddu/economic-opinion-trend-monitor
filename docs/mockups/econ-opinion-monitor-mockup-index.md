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
| `debug` | `docs/mockups/JRN-judgment-debug.html` | 여정 페이지 (처음부터 여정 단위로 그린 화면) |
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
| `JRN-daily-scan` | `docs/mockups/JRN-daily-scan.html` | `dash`, `trend` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window`, `STP-drill-trend` |
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
| `STP-inspect-sources` | `fairness` | 소스별 기여 분해 · 저신뢰 분리 표기. 이 단계는 `#178`(2026-09-27, AC3.9)로 구현에 열렸다 — **이 단계의 카피·구조는 `tbm_econ-opinion-monitor-mockup-render` 의 「등재된 편차」 허용목록이 대조한다**(`STP-drilldown-articles`·`STP-verify-in-trend` 행과 같은 규약) |
| `STP-drilldown-articles` | `fairness` | 기여 뉴스 목록 (소스·수집 시각·본문 중복 표기). 이 단계는 `#174`(2026-09-27, AC3.10)로 구현에 열렸다 — **이 단계의 카피·구조는 `tbm_econ-opinion-monitor-mockup-render`의 「등재된 편차」 허용목록이 대조한다**(`STP-verify-in-trend`·`STP-backfill` 행과 같은 규약) |
| `STP-open-origin` | `trace` | 원문 역추적 · 보존 원문 · 링크 상태 배지 |
| `STP-judge` | `trace` | 판정과 종료. 여정 문서가 이 단계의 터치포인트를 「`trace.html` / 제품 외부(리포트·메모)」로 적었고, 그중 **제품 안에 있던 몫**을 이 여정 페이지가 판정 화면으로 흡수했다. 판정 결과의 **영속화(검증 이력·플래그)는 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹**한 항목이라 화면에도 구현에도 대응물이 없다. |
| (페이지 수준) 토프바 — 크럼 `급등 검증` · `.ctl` pill `tb-basis` | `fairness` | **단계 밖 장치.** `<header class="topbar">`(`:503-511`)에 있어 어느 `data-step` 에도 들어 있지 않고 페이지 전체에 걸린다 — 위 규약의 페이지 수준 절대로 이 페이지가 흡수한 두 화면 중 더 앞선 `fairness` 가 받는다. 단계 하나를 빌려준 `dash` 에는 얹지 않는다(그 토프바는 `JRN-daily-scan` 의 것이다). 구현 편차는 설계 트래커 「페이지 수준 토프바 부재」 행이 대조한다. |
| (페이지 수준) `.branches` 분기 표 — `검증 중 이런 상황이라면` | `fairness` | **단계 밖 장치.** 마지막 섹션 `STP-judge` 가 닫힌 뒤(`:830-870`)에 오므로 어느 `data-step` 에도 들어 있지 않다 — 같은 귀속 근거로 `fairness` 가 받는다. 다섯 갈래의 목적지는 `trace`·`fairness`·`reprocess` 로 흩어지지만 장치를 거는 자리는 하나다. 같은 장치가 `JRN-logic-backfill` 에서는 단계 **안**에 있어 그 단계의 화면(`reprocess`)이 받았다. 구현 편차는 설계 트래커 「페이지 수준 분기 표 … 전면 부재」 행이 대조한다. |

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-open-brief` | `dash` | 기본 축·기간의 상위 대상 목록과 지표 카드 |
| `STP-scan-delta` | `dash` | 직전 동일 구간 대비 증감(`CMP-delta`) 훑기. 이 단계의 표면은 아직 구현에 없고, 그 구현 편차는 설계 트래커 「목업 ↔ 구현 편차 허용목록」의 `STP-scan-delta` 행들이 대조한다 |
| `STP-adjust-window` | `dash` | 기간·단위 조정. 화면 단위 목업이 쓰던 `class="seg"` 의사 컨트롤은 여정 페이지에서 실제 `<select>`·`<input type=radio>`로 대체됐다(규칙 5(d)) — 화면 귀속은 그대로 `dash`다. 폼과 폼 밖 표면의 구현 편차는 설계 트래커 허용목록의 `STP-adjust-window` 행들이 대조한다 |
| `STP-drill-trend` | `trend` | 이 여정 맥락의 추세 상세(라인 차트 + 상위 대상 비교 표). 화면 2에서 넘어갈 때 **고른 대상과 축·기간을 그대로 승계**하는 것은 `dash`가 넘겨줘야 하는 계약이다 |

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

| 단계 | 화면 id | 비고 |
|---|---|---|
| `STP-pin-record` | `debug` | 결과 찾기 · 운영 알림(실행부터 여는 분기) |
| `STP-read-exchange` | `debug` | 호출 기록 · 보낸 요청/받은 응답 원문 · 응답↔저장값 대조 |
| `STP-check-input` | `debug` | 모델이 받은 입력 ↔ 보관 원문 버전 대조. 원문 **읽기** 자체는 `trace` 도 하지만, 이 단계의 관심은 「모델이 받은 본문」과의 대조라 `debug` 에 귀속한다 |
| `STP-scan-run` | `debug` | 실행 단계 표(입력 = 결과별 합) · 증상 몰림 |
| `STP-route-cause` | `debug` | 원인 판정과 인계. 판정의 **영속화는 여정 문서가 백로그로 파킹**한 항목이라 화면에도 구현에도 대응물이 없다 |

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
`fairness` 귀속 단계는 **셋 다 구현에 열렸다** — `STP-check-normalized`는 슬라이스 8(`#66`, 2026-09-20,
AC3.8), `STP-drilldown-articles`는 `#174`(2026-09-27, AC3.10), `STP-inspect-sources`는 `#178`(2026-09-27,
AC3.9)로 열렸다. 마지막 단계의 구현 실체는 Gold 계약 `contracts/gold/subject_source_contribution.avsc`와
그 생성 타입 `go/gen/gold.go`의 `SubjectSourceContribution`, 서빙 `GET /api/source-contributions`,
`Fairness.tsx`의 소스별 기여 카드다. 이전 문면(「`STP-inspect-sources`는 Gold에 수집원 차원이 없어 표면
자체가 부재다」)은 이 절을 쓴 `#66` 시점에는 참이었고 `#178`이 Gold에 수집원 차원을 세우면서 낡았다 —
rct_20260928-0003이 정정했다. 설계 트래커 「등재된 편차」의 그 행도 같은 착지로 **재판정**됐다(2026-09-27,
「전면 부재」가 아니다) — 거기 남아 있는 것은 표면 전체가 아니라 갈래 몇이므로, 남은 편차를 확인할 때는
그 행의 재판정 본문을 읽는다. 이 귀속을 화면 착지보다
먼저 선언해 둔 이유는 그때 경계를 새로 긋지 않기 위해서였고, 실제로 착지하며 경계가 그대로 쓰였다.

새 여정 페이지를 등재할 때는 이 형태의 귀속 표를 함께 넣는다. 한 단계가 두 화면에 걸치면 **더 앞선 화면**에 귀속시키고
넘겨주는 계약을 비고에 적는다 — 판정 대상이 겹쳐 두 번 세어지는 것보다 한 번 세어지고 인계가 기록되는 편이 낫다.

**어느 `data-step` 섹션에도 들어 있지 않은 페이지 수준 장치**(페이지 전체에 걸리는 토프바·분기 표 등)도
같은 표에 선언한다. 그 페이지가 **흡수한 화면**에 귀속시키고, 흡수한 화면이 둘 이상이면 위와 같은
**더 앞선 화면** 원칙으로 하나를 고른 뒤 무엇이 페이지 수준인지 비고에 적는다. 단계를 **빌려준** 화면
(흡수 칸에 없으면서 자기 단계 하나가 이 페이지에 들어온 화면)에는 얹지 않는다 — 그 화면의 페이지 수준
장치는 이미 자기 페이지의 것이고, 얹으면 한 화면이 두 여정 페이지의 토프바를 동시에 들어야 한다.
선언하지 않으면 그 표면은 **어느 화면의 모집단에도 들어가지 않아** 판정면 밖에 영구히 남는다(설계 트래커의
`JRN-spike-verification` 등재 인용 블록이 실측한 상태다).

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

### 화면·상태 인벤토리 등재 (규칙 5(e) · 요건 9)

여정 페이지는 **구현의 기준**이다. 여정 문서는 어떤 화면이 어떤 순서로 이어지는지를 정하고, 화면 하나가 어떤
모습인지(요소·상태 전부)는 실제로 구현될 화면 — PRD·AC, 이미 구현된 `web/src/screens/*.tsx`, 디자인 시스템 —
이 정한다. 그래서 각 단계는 여정 경로의 단면이 아니라 **구현 화면 전체**를 그린다(앱 크롬·여정 밖 행동 포함).
같은 화면이 여러 단계·여러 여정에 나오면 어디서든 구조가 같다 — 바뀌는 것은 보이는 데이터와 진입 맥락뿐이다.

여정마다 두 표를 둔다. 하네스와 정적 게이트는 기대값을 페이지가 아니라 이 표에서 읽는다(페이지에서 읽으면
자기참조라 어떤 뮤테이션도 통과한다).

- **화면 표** (`| 단계 | 화면 id | 근거 |`) — 단계가 지나가는 화면. 페이지에서는 `.screen[data-screen][data-title]`.
  화면 id 는 `web/src/shell/nav.ts` 의 `SCREENS` id 이거나 아래 「라우트 없는 화면 id」 다.
- **상태 표** (`| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |`) — 그 화면이 실제로 가질 상태
  (빈·로딩·오류·0건·검증 실패·제출 중 등). 방식이 `화면 교체`면 `.screen[data-state]`, `얹힘`이면 화면 안의
  `[data-state]` 다. 상태 id 는 페이지 안에서 유일하므로, 여러 단계에 걸친 화면의 상태는 **그 화면이 그 여정에서
  처음 나오는 단계**(데이터로 도달하는 상태는 그 상황이 생기는 단계)에 둔다. 모든 상태는 `#<단계>/<상태 id>`
  딥링크로 바로 열린다.
- **의도적 제외** — 그리지 않기로 한 화면·상태와 사유. 없으면 「없음」. 비워 두면 확인하지 않은 것과 구별되지 않는다.

근거 칸의 순서: 여정 문서의 시스템 응답·연결 AC → 구현 화면 코드 → 디자인 시스템 패턴 → 「가정」.
**근거가 하나도 없는 표면은 그리지 않는다**(2026-10-17, 요건 9 도입 때 목업 전용 표면을 걷어냈다 —
걷어낸 목록은 여정별 「걷어낸 목업 전용 표면」).

라우트 없는 화면 id: `integrity`

#### `JRN-daily-scan`

| 단계 | 화면 id | 근거 |
|---|---|---|
| `STP-open-brief` | `dash` | AC3.2 · AC3.5 · `Dashboard.tsx` (지표 4 · 조회 조건 · 상위 서술 대상 · 변화 · 고른 대상 · 튀는 값 · 이 급등은 진짜인가 · 기간 순위) |
| `STP-scan-delta` | `dash` | 같은 화면 — 변화 카드에서 대상을 고른다 (`Dashboard.tsx` 「{기간} 변화」 · 「고른 대상」) |
| `STP-adjust-window` | `dash` | 같은 화면 — 조회 조건 카드의 기간·단위 (AC3.3 · `Dashboard.tsx` `applyWindow`) |
| `STP-drill-trend` | `trend` | AC3.5 · AC3.2 · `Trend.tsx` (축 전환 · 관심 점유율 추세 · 선택 대상 현재 점유율 · 상위 대상 비교) |

| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |
|---|---|---|---|---|---|---|
| `loading` | `STP-open-brief` | `dash` | 화면 교체 | 첫 진입 — 카드 골격은 그대로, 값은 「—」, 목록은 「불러오는 중…」 | `Dashboard.tsx` (`!data && !error`) | 딥링크 `#STP-open-brief/loading` |
| `api-error` | `STP-open-brief` | `dash` | 얹힘 | 서빙 응답 실패 — 화면 위에 「API 오류」 안내 | `Dashboard.tsx` (`error`) | 딥링크 `#STP-open-brief/api-error` |
| `no-gold` | `STP-open-brief` | `dash` | 얹힘 | Gold 가 아직 없음 — 「데이터 없음 — 배치 파이프라인을 먼저 실행하세요.」 | `Dashboard.tsx` (`noGold`) | 딥링크 `#STP-open-brief/no-gold` |
| `empty-window` | `STP-open-brief` | `dash` | 얹힘 | 밤사이 수집이 없는 축 — 0 이 아니라 「데이터 없음」, 마지막 정상 수집 시각 | 여정 문서 §4 1행 · `Dashboard.tsx` (`emptyWindow`) | 조회 조건 카드의 축을 「전세계」로 |
| `no-selection` | `STP-scan-delta` | `dash` | 얹힘 | 대상 미선택 — 고른 대상 카드가 비어 있음 | `Dashboard.tsx` (`data-state="no-selection"`) | 단계 2 진입 직후 |
| `no-change` | `STP-scan-delta` | `dash` | 얹힘 | 변화 0건 — 「이 조건에 걸리는 변화가 없습니다.」 | `Dashboard.tsx` (`deltaRows.length === 0`) | 증감 임계를 10 으로 |
| `no-baseline` | `STP-scan-delta` | `dash` | 얹힘 | 직전 동일 구간이 없음 — 증감 칸을 0 이 아니라 「—」 | AC3.3 · `Dashboard.tsx` (`has_baseline` 거짓 → `dtext` 「—」) | 딥링크 `#STP-scan-delta/no-baseline` |
| `pick-axis` | `STP-scan-delta` | `dash` | 얹힘 | 「전체」 축 — 급등 확인으로 넘어가려면 축을 하나 골라야 한다는 안내 | `Dashboard.tsx` (`PICK_ONE_AXIS`) | 조회 조건 카드의 축을 「전체」로 |
| `reloading` | `STP-adjust-window` | `dash` | 얹힘 | 기간·단위를 바꾼 직후 재집계 — 「고른 조건으로 다시 집계하는 중…」 | `Dashboard.tsx` (`reapplying`) | 기간이나 단위를 바꾼다 |
| `no-rank` | `STP-adjust-window` | `dash` | 얹힘 | 이 기간 순위 0건 — 「이 축에는 이 기간에 표시할 대상이 없습니다.」 | `Dashboard.tsx` (`top_subjects.length === 0`) | 축을 「전세계」로 |
| `trend-loading` | `STP-drill-trend` | `trend` | 화면 교체 | 첫 진입 — 축 전환 컨트롤 + 「불러오는 중…」 | `Trend.tsx` (`!data && !error`) | 딥링크 `#STP-drill-trend/trend-loading` |
| `trend-error` | `STP-drill-trend` | `trend` | 얹힘 | 서빙 응답 실패 — 「API 오류」 안내 | `Trend.tsx` (`error`) | 딥링크 `#STP-drill-trend/trend-error` |
| `trend-empty` | `STP-drill-trend` | `trend` | 화면 교체 | 축에 집계 버킷 없음 — 빈 차트를 0% 로 그리지 않는다 | `Trend.tsx` (`series.length === 0`) | 화면 안 축 전환을 「전세계」로 |

**의도적 제외**
- `dash` 「튀는 값」 카드의 자기 상태(빈 축 · 평소 기준 없음 · 로딩 · 오류)는 이 여정에서 그리지 않는다 — 그 카드는
  `JRN-spike-verification` 의 첫 단계(`STP-notice-spike`)이고 상태는 그 여정 페이지가 등재한다. 이 페이지의 `dash`
  에서도 카드 자체(구조)는 그린다.
- `dash`·`trend` 의 `<details>` 문서 메타와 mapstrip — 문서 메타라 제품 평면이 아니라 이 페이지의 메타 레이어에 둔다.
- 「마지막 조회 조건으로 열기」 의 복원 동작(다음 진입에서 조건이 돌아옴)은 세션을 넘는 동작이라 프로토타입 안에서
  재현하지 않는다 — 체크박스는 그린다.

**걷어낸 목업 전용 표면** (AC·구현 근거 없음, 2026-10-17)
- 변화 카드의 「비교 기준 구간」 select(직전 동일 구간 · 최근 7일 평균 · 전주 동요일) — AC3.3 은 직전 같은 길이의
  구간만 정의한다. `no-baseline` 은 이 select 대신 딥링크로 연다.
- 기간 순위의 `low-sample` 배너와 흐린 칸 — 표본 임계의 근거가 없다.
- 추세 상세의 「기여 뉴스 표기」 select 와 차트 마크.
- 고른 대상 카드의 분위기 막대(`sentbar`).
- 「마지막 조회 조건으로 열기」 를 끄면 사이드바 하단 수집 시각이 「지금」으로 바뀌던 동작 — 사이드바 하단은
  구현과 같은 고정 문면이다.

여정 문서 §4 2·3행(급등 신뢰 불가 → `JRN-spike-verification`, 축 간 차이 → `JRN-axis-contrast`)은 이 여정을
벗어나는 인계라 상태가 아니라 **이탈 컨트롤**로 단계 2·3 에 있고, 「여정 끝」 표지를 단다. §4 4행(중도 이탈 —
목록만 보고 종료)은 그 상황이 생기는 단계 3 의 「목록만 보고 닫기」 컨트롤이다(전에는 단계 4 에 있어 정상 종료와
섞였다). 정상 종료는 단계 4 의 「여정 끝 · 여정 완료」 표지다.

#### `JRN-sentiment-shift`

| 단계 | 화면 id | 근거 |
|---|---|---|
| `STP-open-sentiment` | `sentiment` | AC3.6 · AC3.4 · `Sentiment.tsx` (컨트롤 줄 축 전환 · 분위기 구성 도넛 · 축별 분위기 · 분리 전후 비율 · 판별이 어렵다면 · 분위기 추세) · 분류 기준 줄은 AC2.3 · 여정 문서 1단계 페인포인트 |
| `STP-check-unanalyzed` | `sentiment` | 같은 화면 — 미분석 줄 · 분리 전후 비율 체크박스 · 범례 (AC2.5 · AC3.4 · `Sentiment.tsx` `SplitRatios` · `CMP-legend`) |
| `STP-overlay-time` | `sentiment` | 같은 화면 — 분위기 추세 (AC3.3 · AC3.6 · `Sentiment.tsx` `SentimentTimeline` · `PAT-stacked-sentiment`) · 구간별 건수(절대량)는 여정 문서 3단계 페인포인트 |
| `STP-confirm-cause` | `sentiment` | 같은 화면 — 판별이 어렵다면 카드의 인계 (`Sentiment.tsx` `.sent-exit` · 여정 문서 §4 3·4행) · 구간 고르기 → 기여 뉴스는 여정 문서 4단계 페인포인트 |

| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |
|---|---|---|---|---|---|---|
| `loading` | `STP-open-sentiment` | `sentiment` | 얹힘 | 첫 진입 · 축 전환 — 컨트롤 줄과 도입 문단은 그대로, 카드 대신 「불러오는 중…」 | `Sentiment.tsx` (`!data && !error` — 축을 바꾸면 `setData(null)`) | 화면 안 축 라디오를 바꾼 직후 · 딥링크 `#STP-open-sentiment/loading` |
| `api-error` | `STP-open-sentiment` | `sentiment` | 얹힘 | 서빙 응답 실패 — 「API 오류」 안내, 카드 없음 | `Sentiment.tsx` (`error`) | 딥링크 `#STP-open-sentiment/api-error` |
| `no-bucket` | `STP-open-sentiment` | `sentiment` | 얹힘 | 집계된 분위기 버킷이 하나도 없음 — 빈 도넛을 0% 로 그리지 않는다 | `Sentiment.tsx` (`data && !aggregated` · `.sent-empty`) | 딥링크 `#STP-open-sentiment/no-bucket` |
| `axis-absent` | `STP-open-sentiment` | `sentiment` | 얹힘 | 고른 축이 기준 버킷에 없음 — 도넛을 비우고 「모두 중립」처럼 읽히지 않게 안내 | AC3.4 · `Sentiment.tsx` (`selected?.present` 거짓 → `.sent-absent`) | 축 라디오를 「전세계」로 |
| `unanalyzed-warning` | `STP-open-sentiment` | `sentiment` | 얹힘 | 미분석 10% 이상 — 해석 보류 경고 + 원인 줄(분석 실패 · 저신뢰 건수) | 여정 문서 §4 1행 · AC2.5 · `Sentiment.tsx` (`noisy` — 고정 임계 `UNANALYZED_NOTICE` 0.1). 원인 줄은 구현에 없다(§4 1행 「원인 표시」) | 축 라디오를 「미국」으로 |
| `split-absent` | `STP-check-unanalyzed` | `sentiment` | 얹힘 | 고른 축이 기준 버킷에 없음 — 분리 전후 두 형태를 놓을 수 없다는 안내 | `Sentiment.tsx` (분리 전후 카드의 `selected?.present` 거짓) | 축 라디오를 「전세계」로 |
| `all-unanalyzed` | `STP-check-unanalyzed` | `sentiment` | 얹힘 | 전량 미분석 — 「분모로 쓸 분석 완료분이 없습니다」 | `Sentiment.tsx` (`SplitRatios` 의 `naCount === null`) | 딥링크 `#STP-check-unanalyzed/all-unanalyzed` |
| `series-empty` | `STP-overlay-time` | `sentiment` | 얹힘 | 고른 축에 이 단위의 버킷이 없음 — 다른 축 대조는 성립한다는 안내 | `Sentiment.tsx` (`data.series.length === 0`) | 축 라디오를 「전세계」로 |
| `low-sample` | `STP-overlay-time` | `sentiment` | 얹힘 | 표본 부족 구간 — 그 막대를 흐리게 두고 비율 대신 「표본 부족」, 안내와 「구간별 건수 보기」 | 여정 문서 §4 2행 · 가정(최소 표본 = 분석 완료 20건 — AC·계약에 값이 없다). 구현에 없다(구현은 버킷별 `{n}건` 만 찍는다) | 축 라디오를 「미국」으로 (10-11 버킷 6건) |

**의도적 제외**
- 구현 하단의 `MapStrip`(여정·가치·AC 칩) — 문서 메타라 제품 평면이 아니라 이 페이지의 메타 레이어에 둔다.
- 구현 문면 끝의 `AC2.5`·`AC3.3` mono 태그 — 제품 평면에 AC 번호를 두지 않는 규약. 문장은 그대로 그린다.
- 서술 대상별 분포 — Gold `axis_sentiment` 가 `(axis, bucket)` 키라 대상 차원이 없다. AC3.6 이 「서술 대상 **또는 축**」 이고
  여정 문서 1단계도 「대상 또는 축」 이라 축 단위로 그린다.
- 기간·단위 전환 컨트롤 — `/api/sentiment` 가 기간·단위 파라미터를 받지 않는다(구현의 단위 note 가 사유를 화면에서 밝힌다).
  여정 문서 3단계 터치포인트의 「기간 세그먼트(`CMP-seg`)」 는 이 판단으로 그리지 않는다 — 시간축 조작은 막대로 구간을
  고르는 것으로 대신한다(가정).
- 「분리 전후 비율」 체크박스를 끈 상태(분모에 섞은 비율) — 상태가 아니라 컨트롤 값이라 등재하지 않는다. 체크박스로 바로 본다.

**걷어낸 목업 전용 표면** (근거 없음 또는 근거가 다른 표면으로 옮겨 감, 2026-10-18)
- 서술 대상 피커 — 축 `<select>` · 「대상 찾기」 검색 · 대상 목록(행마다 분위기 막대) · 상태 `no-selection`·`empty`. 대상별
  분포가 Gold·서빙에 없다(트래커 「등재된 편차」 서술 대상 피커 행). 축 고르기는 구현의 축 전환을 실제 라디오로 그린다.
- 토프바 pill `tb-target`(「대상 미선택」 / 고른 대상 이름) — 구현 토프바에 pill 이 없다.
- 「미분석 경고 임계 (%)」 number input — 구현은 고정 임계다. §4 1행의 상황은 구현의 경고 문면으로 그린다.
- 미분석 분리 진입 바(「집계에서 분리된 항목 N건 · 열기 →」) — 같은 사실을 구현의 미분석 줄이 비율로 말한다.
- 사유별 분해 표 카드(「미분석 · 저신뢰 분리 집계」 · `사유`/`건수`/`전체 대비` · 범례 「미분석 (집계 분리)」) — §4 1행이
  요구하는 「원인 표시」 만큼만 경고 안의 원인 줄로 남겼다.
- 기간·단위 폼(기간 7·30·90일 `<select>` · 단위 라디오 · 「적용」) 과 그 제출의 재집계 로딩 — 서빙 파라미터가 없다.
  상태 id `loading` 은 구현의 첫 진입 · 축 전환 로딩이 이어받는다.
- 판별 폼(결론 라디오 · 근거 메모 textarea · 「판별 기록」) 과 상태 `invalid`·`recorded` — AC 도 쓰기 경로도 없고 여정 완료
  기준은 기록을 요구하지 않는다.
- 도넛 중앙의 「{n}% {분류} 우세」 — 구현은 「분석 완료」 건수를 둔다.

구현에 아직 없지만 근거가 있어 그린 표면: 분류 기준 줄(AC2.3 · 여정 문서 1단계 페인포인트), 경고 안 원인 줄(§4 1행),
구간별 건수 — 절대량 막대(여정 문서 3단계 페인포인트 「비율과 절대량을 분리」), 표본 부족 처리(§4 2행), 막대로 구간을
고르면 열리는 「이 구간의 기여 뉴스 · 원문 보기」(여정 문서 4단계 페인포인트, 여정 밖 행동), 판별이 어렵다면 카드의 원문 확인 ·
재처리 요청 링크(§4 3·4행).

여정 문서 §4 1행(미분석 임계 초과)은 그 상황이 생기는 단계 1 의 경고 안 「분리 전후 비율 보기」(같은 화면의 분리 전후 카드로
이동), 2행(표본 부족)은 단계 3 의 표본 부족 안내 안 「구간별 건수 보기」(같은 화면의 절대량 막대로 이동)다. 3·4행(분류 오류 →
`JRN-spike-verification`, 분류 기준 변경 → `JRN-logic-backfill`)은 이 여정을 벗어나는 인계라 단계 4 의 「판별이 어렵다면」 카드에
있고 「여정 끝」 표지를 단다 — 같은 링크가 다른 단계에서는 여정 밖 행동이다. 정상 종료는 단계 4 의 「여정 끝 · 여정 완료」 표지다.

#### `JRN-axis-contrast`

| 단계 | 화면 id | 근거 |
|---|---|---|
| `STP-open-compare` | `compare` | AC3.7 · AC3.8 · `Compare.tsx` (도입 문단 · 세 축 공통 기준 줄 · 축 구분 note · 출처 축 3열 — 순위 행 `원시 {n}건` · 한 눈금 막대 · 분위기 미니 막대 · 이탈 카드 2) · `PAT-axis-compare` · 여정 문서 `STP-open-compare` 페인포인트(기준을 동기화하고 화면에 명시) |
| `STP-scan-axis-tops` | `compare` | 같은 화면 — 순위 행의 공통/고유 표시 (여정 문서 `STP-scan-axis-tops` 페인포인트 · AC3.7 · AC3.4 · AC3.2 의 「동일 대상 = 한 집계 키」) |
| `STP-disambiguate-axis` | `compare` | 같은 화면 — 축 구분 note(`Compare.tsx`) · 열 머리 `{축} · 출처 축` · 「대상 국가」 select (여정 문서 `STP-disambiguate-axis` 페인포인트 「두 기준을 별도 컨트롤로」 · AC1.3 · AC2.1) |
| `STP-pick-outlier` | `compare` | 같은 화면 — 격차 후보 행 (여정 문서 `STP-pick-outlier` 터치포인트·페인포인트) · 순위 행 클릭 → 추세 상세 (`Compare.tsx` `onOpen` → `/trend?axis&subject`) |
| `STP-verify-in-trend` | `trend` | AC3.5 · AC3.2 · `Trend.tsx` (`JRN-daily-scan` 의 `STP-drill-trend` 와 같은 구조) · 축·대상 승계 `Trend.tsx` (`useSearchParams`) |

| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |
|---|---|---|---|---|---|---|
| `loading` | `STP-open-compare` | `compare` | 화면 교체 | 첫 진입 — 도입 문단과 「불러오는 중…」 만 | `Compare.tsx` (`!data && !error`) | 딥링크 `#STP-open-compare/loading` |
| `api-error` | `STP-open-compare` | `compare` | 화면 교체 | 서빙 응답 실패 — 도입 문단과 「API 오류」 안내만(열·이탈 카드 없음) | `Compare.tsx` (`error` · `{data && …}`) | 딥링크 `#STP-open-compare/api-error` |
| `axis-empty` | `STP-open-compare` | `compare` | 얹힘 | 전세계 축 수집 없음 — 그 열을 0%가 아니라 「비교에서 제외」, 공통/고유·격차를 남은 두 축으로 다시 셈 | 여정 문서 §4 1행 · `Compare.tsx` `AxisRows` (`top_subjects.length === 0`) | 딥링크 `#STP-open-compare/axis-empty` (그 상황의 데이터로 연다) |
| `no-sentiment` | `STP-open-compare` | `compare` | 얹힘 | 한 열의 분위기 집계 없음 — 미니 막대 대신 「분위기 집계 없음」 | AC3.7 · `Compare.tsx` `MiniSent` (`total <= 0`) | 딥링크 `#STP-open-compare/no-sentiment` |
| `no-outlier` | `STP-pick-outlier` | `compare` | 얹힘 | 한 축에만 있는 대상 0건 — 「차이 없음」도 결론 | 여정 문서 완료 기준(「또는 "차이 없음"을 확인」) | 「대상 국가」 를 「글로벌 (특정 국가 아님)」 으로 |
| `alias-merged` | `STP-pick-outlier` | `compare` | 얹힘 | 표기 변형 통합 — 통합 규칙 안내와 통합 전후 표(축 · 적힌 표기 · 통합 전 · 통합 후) | 여정 문서 §4 4행 · AC3.2 · AC2.2 | 딥링크 `#STP-pick-outlier/alias-merged` |
| `trend-loading` | `STP-verify-in-trend` | `trend` | 화면 교체 | 첫 진입 — 축 전환 컨트롤 + 「불러오는 중…」 | `Trend.tsx` (`!data && !error`) | 딥링크 `#STP-verify-in-trend/trend-loading` |
| `trend-error` | `STP-verify-in-trend` | `trend` | 얹힘 | 서빙 응답 실패 — 「API 오류」 안내 | `Trend.tsx` (`error`) | 딥링크 `#STP-verify-in-trend/trend-error` |
| `trend-empty` | `STP-verify-in-trend` | `trend` | 화면 교체 | 축에 집계 버킷 없음 — 빈 차트를 0% 로 그리지 않는다 | `Trend.tsx` (`series.length === 0`) | 딥링크 `#STP-verify-in-trend/trend-empty` |

**의도적 제외**
- `trend` 의 축별 라인(한 대상의 세 축 시계열)과 「표시할 축」 체크박스 — 여정 문서 `STP-verify-in-trend` 터치포인트(v0.2)가
  적었지만 AC3.5 는 대상별 추세·상위 대상 비교·대상 선택만 정하고, `Trend.tsx` 는 한 번에 한 축을 그린다(축 전환 라디오).
  `trend` 는 `JRN-daily-scan` 과 같은 구조여야 하므로 이 페이지에서만 다르게 그리지 않는다 — 축별 대조는 화면 안 축 전환으로
  한다. 여정 문서 터치포인트를 고칠지 화면에 세울지는 사용자 결정으로 남긴다.
- `compare`·`trend` 의 mapstrip — 문서 메타라 제품 평면이 아니라 이 페이지의 메타 레이어에 둔다.
- 기간 승계 — `compare` 는 서빙이 고른 버킷 하나를 비교해 넘길 기간이 없다. 승계는 축·대상만 한다(`Compare.tsx` `onOpen`).
- 대상 국가 select 는 구현에 없다(서빙·Gold 에 대상 국가 차원 없음) — 여정 문서가 요구해 그린다. 공통/고유 표시 · 격차 후보
  행 · 통합 안내 · 빈 열의 「남은 두 축으로 대조 계속」 도 같은 처지다(구현 편차는 설계 트래커 「등재된 편차」 의 `compare` 행들).

**걷어낸 목업 전용 표면** (AC·구현·여정 문서 근거 없음, 2026-10-18)
- 비교 기준 폼(`기간` select · `수집량 정규화` 체크박스 · `기준 적용`)과 그 재집계 `loading`, 「수집 현황」 카드, 토프바 pill
  `최근 7일 · 정규화` — 여정 문서의 대응은 기준을 「강제로 동기화하고 화면에 명시」이지 고르게 하는 것이 아니다. 명시는
  구현의 「세 축 공통 기준」 줄이, 원시/정규화 구분(AC3.8)은 순위 행의 `원시 {n}건` 이 한다.
- 순위 행의 증감 `+2.1` 칸.
- 「대상 찾기」 검색 · 「한 축에만 있는 대상만 보기」 필터 — 여정 문서는 공통/고유를 배지로 구분하라고만 한다.
- 「출처 축 — 어디서 수집했는가」 select 와 출처×대상 교차 표(건수·비중) — 출처 축은 열 자체(AC3.7 세 열 고정)이고
  터치포인트는 축 기준 주석이다. 대상 국가만 별도 select 로 남겼다.
- 격차 패널의 「격차 임계 (%p)」 · 「표기 변형을 같은 대상으로 통합」 체크박스 · 「선택한 대상」 카드와 `no-selection` 상태 —
  통합은 AC3.2 대로 집계가 하는 일이라 사용자가 켜는 스위치가 아니고, 페인포인트 대응이 「행 클릭 시 선택 대상을 유지한
  채 상세로」라 중간 선택 카드가 없다. 격차 후보 행 자체는 터치포인트라 남겼고, `no-outlier` 는 임계 대신 「한 축에만
  있는 대상 0건」 으로 판정한다.
- 추세 단계의 「승계된 설정」 카드 · 카드 sub 「비교 뷰의 축·기간을 그대로 승계했습니다」 · 합성 「축별 시계열」 차트(`T-n`·`지금`)
  · `점유율 %` 태그 — 단계 5 는 공유 화면 `trend` 그대로다. 승계는 표면이 아니라 동작(축·대상)으로 남는다.

여정 문서 §4 1행(축 수집 없음)은 그 상황이 처음 보이는 단계 1 의 빈 열 안 「남은 두 축으로 대조 계속」, 4행(표기 변형)은
격차 후보를 고르는 단계 4 의 통합 안내 안 「통합 후 순위로 다시 대조」 이고, 둘 다 단계 2 로 돌아간다. 2·3행(수집량 차이
의심 → `JRN-spike-verification`, 축별 분위기 → `JRN-sentiment-shift`)은 구현 `Compare.tsx` 의 이탈 카드 둘이다 — 같은 화면이
네 단계에 있으므로 분기 컨트롤은 그 상황이 생기는 단계 2·3 에만 달고 「여정 끝」 표지를 단다(분위기 이탈은
`#STP-open-sentiment` 앵커로 착지한다). 정상 종료는 단계 5 의 「여정 끝 · 여정 완료」 표지다.

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

구현이 없는 여정이다. 다섯 단계는 **라우트 없는 화면 `integrity`**(수집 무결성 콘솔) 하나를 지나간다 — 2026-10-17
사용자 결정. 화면은 AC·여정 문서·디자인 시스템이 요구하는 카드를 모두 가진 한 장이고, 단계마다 바뀌는 것은 보이는
데이터와 진입 맥락뿐이다. 토프바 제목은 `수집 무결성 콘솔`, pill 은 `CMP-topbar` 의 컨텍스트 메타(축 · 기간)다.
좌측 네비에 항목이 없으므로 이 화면에서는 네비 active 가 없다.

| 단계 | 화면 id | 근거 |
|---|---|---|
| `STP-spot-anomaly` | `integrity` | AC1.6 · AC1.1 · `PAT-integrity-panel`(성공/재시도/중복/누락 지표 + 이벤트 로그) · 여정 문서 `STP-spot-anomaly` 페인포인트(시도·성공·실패·중복 분리) — 화면 전체: 지표 4 · 시간대별 수집 현황 · 구간 요약 · 구간·소스 좁히기 · 이벤트 로그 · 수집 메타데이터 · 원인 진단 · 보정 실행 · 보정하지 않고 닫는다면 · 복구 확인 |
| `STP-locate-gap` | `integrity` | 같은 화면 — 「구간 · 소스 좁히기」 의 축(AC1.3) · 소스 · 시간 3중 필터와 시간 × 소스 행 선택 (AC1.5 · AC1.6 · 여정 문서 `STP-locate-gap` 페인포인트) |
| `STP-diagnose-source` | `integrity` | 같은 화면 — 「수집 메타데이터」(AC1.5 수집 시각 · 조회수 · 순위 · 소스 식별자 · 축, AC4.1 실행 ID · 소스별 실패 사유) + 「원인 진단」(`CMP-badge` · `CMP-kv`, AC1.6 · AC1.7) |
| `STP-backfill` | `integrity` | 같은 화면 — 「보정 실행」(AC1.6 재시도 · AC1.7 본문 버전 보존 · AC4.1 트리거 재처리 실행 기록) |
| `STP-verify-integrity` | `integrity` | 같은 화면 — 「복구 확인」(`PAT-before-after` · 여정 문서 완료 기준 「정상 범위로 복구됨을 확인. 로그로 확인 가능」 · §5 수집 성공률 99%) |

| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |
|---|---|---|---|---|---|---|
| `loading` | `STP-spot-anomaly` | `integrity` | 화면 교체 | 첫 진입 — 「불러오는 중…」 | 가정 — 같은 계열 운영 화면 `Reprocess.tsx` (`!data && !error`) | 딥링크 `#STP-spot-anomaly/loading` |
| `api-error` | `STP-spot-anomaly` | `integrity` | 화면 교체 | 수집 기록을 불러오지 못함 — 「API 오류」 안내만 | 가정 — `Reprocess.tsx` (`error && error !== INDEX_NOT_READY`) | 딥링크 `#STP-spot-anomaly/api-error` |
| `index-not-ready` | `STP-spot-anomaly` | `integrity` | 화면 교체 | 「인덱스 준비 중」 안내만 | 가정 — `IndexNotReady.tsx` 문면 그대로 (`Reprocess.tsx` `error === INDEX_NOT_READY`) | 딥링크 `#STP-spot-anomaly/index-not-ready` |
| `no-bucket` | `STP-spot-anomaly` | `integrity` | 얹힘 | 구간 미선택 — 구간 요약이 비어 있음 | 가정 (행을 고르기 전) | 단계 1 진입 직후 |
| `no-anomaly` | `STP-spot-anomaly` | `integrity` | 얹힘 | 이 축의 최근 24시간에 이상 없음 — 성공률 100% · 실패 0 · 중복 0 | AC1.6 · 여정 문서 완료 기준(「정상 범위」) | 축을 「전세계」로 |
| `attempt-zero` | `STP-spot-anomaly` | `integrity` | 얹힘 | 시도 0 — 「성공 0」과 구분, 자동 재시도 · 다음 주기 보정이 실패했다는 기록 | 여정 문서 `STP-spot-anomaly` 페인포인트 · AC1.1(실행 누락 시 재시도 · 다음 주기 보정) | 「10/17 03–06시」 구간을 고른다 |
| `no-gap` | `STP-locate-gap` | `integrity` | 얹힘 | 고른 구간 없음 — 진단 · 보정할 범위가 비어 있음 | 여정 문서 `STP-locate-gap` 페인포인트(전 구간 재수집은 과잉 대응) · 가정 | 단계 2 진입 직후 |
| `filter-empty` | `STP-locate-gap` | `integrity` | 얹힘 | 3중 필터 결과 0건 | AC1.3 · 여정 문서 `STP-locate-gap` 페인포인트(3중 필터) | 한국 축에서 소스를 `us-desk` 로 |
| `unresolved` | `STP-locate-gap` | `integrity` | 얹힘 | 지난 점검에서 미해결로 남긴 구간이 맨 위에 「미해결」 배지로 다시 뜸 | 여정 문서 §4 5행 처리(「미해결 상태로 유지해 다음 진입 시 노출」) | 단계 4 「미해결로 남기고 닫기」 |
| `source-outage` | `STP-diagnose-source` | `integrity` | 얹힘 | 소스 API 장애 — 지금 다시 긁어도 같은 오류, 재시도 예약 · 복구 대기로 | 여정 문서 §4 1행 · AC1.6 | 원인 「소스 API 오류」 |
| `origin-gone` | `STP-diagnose-source` | `integrity` | 얹힘 | 원본 소실 — 재수집 불가, 영구 누락으로 확정 | 여정 문서 §4 2행 | 원인 「원본 소실」 |
| `no-target` | `STP-backfill` | `integrity` | 얹힘 | 고른 구간 없음 — 「보정 실행」 차단 | 여정 문서 `STP-locate-gap` 페인포인트(범위 없이 전 구간을 다시 긁지 않는다) · 가정 | 구간 목록에서 고른 구간을 모두 해제 |
| `retry-pending` | `STP-backfill` | `integrity` | 얹힘 | 복구 대기 — 재시도 예약 시각, 구간 목록 · 시간대별 현황에 「복구 대기」 배지 | 여정 문서 §4 1행 처리(「재시도 예약 후 대기, 구간을 복구 대기로 표시」) · AC1.6 재시도 | 단계 3 소스 장애 배너의 「재시도 예약하고 복구 대기로 표시」 |
| `dedup-confirm` | `STP-backfill` | `integrity` | 얹힘 | 중복 정리 확인 대화상자 — 정리할 관측 수 · 본문 버전은 건드리지 않음 | 가정 — 관측을 집계에서 빼는 되돌리기 어려운 작업 | 작업 「중복 정리」로 「보정 실행」 |
| `running` | `STP-backfill` | `integrity` | 얹힘 | 제출 중 | 가정 | 「보정 실행」 |
| `run-failed` | `STP-backfill` | `integrity` | 얹힘 | 제출 실패 — 고른 구간 · 작업 유지, 다시 제출 | 가정 | 딥링크 `#STP-backfill/run-failed` |
| `run-done` | `STP-backfill` | `integrity` | 얹힘 | 실행 결과 — 실행 ID · 트리거 재처리 · 다시 받은 관측 · 본문 버전(같은 해시 재저장 안 함 · 수정 본문 새 버전 · 삭제 · 덮어쓰기 0건) | AC1.7 · AC4.1 · AC1.6 | 「보정 실행」 뒤 |
| `dup-again` | `STP-backfill` | `integrity` | 얹힘 | 재수집이 중복을 다시 만듦 — 중복 규칙 재확인으로 | 여정 문서 §4 3행 | 중복 구간(kr-daily 10/17 13 · 14시)을 고르고 작업을 「재수집」으로 실행 |
| `no-run` | `STP-verify-integrity` | `integrity` | 얹힘 | 보정 실행 전 — 「보정 후」 칸이 「—」 | 가정 | 실행 없이 단계 5 를 연다(딥링크 `#STP-verify-integrity`) |
| `recovered` | `STP-verify-integrity` | `integrity` | 얹힘 | 정상 범위(성공률 99% 이상 · 중복 0)로 복구 — 실행 기록이 이벤트 로그에 남음 | 여정 문서 완료 기준 · §5 수집 성공률 · `PAT-before-after` · AC4.1 | 실패 구간(kr-wire 10/17 09–11시)을 재수집하고 단계 5 로 |
| `perm-missing` | `STP-verify-integrity` | `integrity` | 얹힘 | 영구 누락 — 보정 후 칸과 판정이 「복구됨」 대신 「데이터 없음」 | 여정 문서 §4 2행 처리(「집계에서 데이터 없음 처리」) | 단계 3 영구 누락 배너의 「영구 누락으로 확정하고 확인으로」 |

**의도적 제외**
- 보정 이력을 구간 메타로 기록하고 소비자 화면에 주석으로 노출하는 것 — 여정 문서가 `STP-verify-integrity` 페인포인트의
  대응 방향으로 적고 스스로 **「백로그 후보」** 로 파킹했다. 이 화면은 보정 실행이 이벤트 로그에 실행 기록(AC4.1
  트리거 재처리)으로 남는 데까지만 그린다.
- 예약한 재시도가 실제로 돌아 구간이 채워지는 순간 — 세션을 넘는 시간 경과라 재현하지 않는다. 「복구 대기」 표기까지.
- 「미해결」 의 다음 진입 — 세션을 넘는 동작이라, 미해결로 남기고 닫으면 같은 세션 안에서 단계 2 로 돌아가 그 표기를
  보이는 것으로 대신한다.
- 이벤트 로그 카드의 자기 상태(빈 로그) — 이상 없는 축에서 「이벤트 없음」 행으로 그려지고 조건이 `no-anomaly` 와 같아
  따로 등재하지 않는다.
- 문서 메타(`<details>`)와 mapstrip — 메타 레이어에 둔다.

**걷어낸 목업 전용 표면** (AC·여정 문서 근거 없음, 2026-10-17)
- 보정 실행의 체크박스 「기존 Bronze를 덮어쓰지 않고 새 버전으로 보존한다 (content-addressed)」 — 풀면 덮어쓰기가 되는
  선택지였다. AC1.7 「기존 버전을 삭제·덮어쓰지 않는다」 를 어기는 선택지라 고정 안내 문면으로 바꿨다. `dup-again` 은 이
  체크박스를 풀던 길 대신 중복 구간을 재수집하는 데이터로 닿는다.
- 「배치 크기 (건)」 number 입력.
- 작업 옵션 「재수집 + 중복 정리」 — 여정 문서는 「재수집 또는 중복 정리」 다.
- 복구 확인의 「재확인 범위」 select(「보정한 구간만」/「그날 전체」) — 고른 구간만 본다.
- 복구 확인의 「결론」 라디오 · 「보정 이력 메모」 textarea · 제출 「복구 확인 기록」 과 상태 `invalid` · `recorded` — 보정
  이력의 영속화는 여정 문서가 백로그 후보로 둔 대응 방향이고, 완료 기준은 「정상 범위로 복구됨을 확인. 로그로 확인 가능」
  이라 기록 폼이 아니라 전후 비교와 이벤트 로그가 받는다. 영구 누락 확정은 단계 3 의 영구 누락 배너가 한다.
- 「점검 구간」 select 의 「최근 7일」 — 여정은 시간대별 훑기다. 최근 24시간 고정.
- 단계 2 의 두 번째 「축」 select — 같은 화면에 축 컨트롤이 둘이었다. 축은 「시간대별 수집 현황」 의 하나로 두고, 좁히기
  카드는 그 축을 배지로 보인다.
- 토프바 pill `구간 미선택`(`#tb-scope`) — 고른 구간을 토프바에 쓰던 목업 전용 문면. pill 은 `CMP-topbar` 의 축 · 기간이다.
- 사이드바 하단 `수집 점검 · 12개 소스` — 구현 고정 문면 `수집 정상 · 12개 소스` 로.

여정 문서 §4 의 다섯 행은 모두 **그 상황이 생기는 단계**의 화면 안 컨트롤이고, DOM 순서가 §4 순서와 같다. 1 · 2행
(소스 장애 · 원본 소실)은 원인을 가르는 단계 3 의 배너에 있고, 도착 단계에 그 처리가 보인다 — 1행은 단계 4 의
`retry-pending`(구간 목록 「복구 대기」 배지), 2행은 단계 5 의 `perm-missing`(보정 후 칸 「데이터 없음」). 3행(중복
재생성)은 보정을 실행한 단계 4 의 `dup-again` 배너다. 4행(분석 이상 → `JRN-logic-backfill`)과 5행(중도 이탈)은
단계 4 의 「보정하지 않고 닫는다면」 카드에 있다 — 둘의 상황은 원인을 가른 직후(단계 3)에 먼저 생기지만, §4 순서상
3행(단계 4) 뒤에 와야 해서 단계 4 에 둔다. 단계 4 는 보정을 실행할지 정하는 자리라 「보정하지 않고 닫는다」 두 갈래가
그 결정과 나란히 선다. 5행의 도착(단계 2)에는 `unresolved` 가 보인다. 정상 종료는 단계 5 의 「여정 끝 · 여정 완료」 표지다.

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

> **분기 표는 부분으로 서지 않는다 (2026-09-28, rct_20260928-0005).** `재처리 중 이런 상황이라면` 과
> `검증 중 이런 상황이라면` 두 목록은 각자 힌트 문장이 갈래 집합의 **완전성**을 주장하는 집합 장치라, 목적지가
> 이미 선 쌍만 먼저 구현에 세우면 그 힌트가 거짓이 된다. 그래서 목적지 하나(`JRN-ingestion-recovery` 귀속 단계)가
> 구현에 설 때까지 두 표를 통째로 두지 않는 처분을 유지한다 — 근거와 판별식은 설계 트래커 「등재된 편차」의 두
> 분기 표 행에 있다. 목적지가 각자 독립 카드인 이탈 컨트롤(`JRN-axis-contrast` 의 두 카드)은 이 제약을 받지 않는다.

여정 문서 §4 4행(수집은 정상인데 분석 결과가 이상 → `JRN-logic-backfill`)은 이 여정을 벗어나는 인계라 상태가 아니라
**이탈 컨트롤**로 화면 4에 있다. §4 5행(중도 이탈)도 상태가 아니라 화면 5의 「미해결로 남기고 구간 목록으로」
컨트롤로, 다음 진입에 그 구간이 다시 뜬다는 처리를 보여 준다. 나머지 3행(1·2·3)은 자기 단계로 되돌아오는 분기라
각 화면의 배너 상태로 위 표에 있다.

> 디자인 시스템 토큰·컴포넌트 스타일은 각 페이지의 `<style>`에 동일하게 인라인된다(개념적 단일 소스는 `docs/design-system/econ-opinion-monitor-design-system.md`). 토큰을 바꿀 때는 여정 페이지 6개의 `:root`를 함께 수정한다.
> 아래 인덱스는 **화면(=페이지 파일) 단위**로 여정·가치·디자인 항목을 매핑한다. 화면 id ↔ 파일 대응은 위 표를 따른다(흡수된 `dash`·`trend`·`sentiment`·`compare`·`fairness`·`trace`·`reprocess`는 각각 흡수한 여정 페이지이며, 화면 단위 파일은 이제 하나도 남아 있지 않다).

#### `JRN-judgment-debug`

다섯 단계가 모두 같은 화면 `debug`(`Debug.tsx`, 토프바 제목 = nav 라벨 `판단 디버깅`, `useTopbar` 를 쓰지 않아 pill 없음)다.
구현은 검색 카드 · 고른 결과 · 응답↔저장값 · 모델 호출 기록 · 입력 점검 · 배치 실행 · 증상 · 원인 판정 · 이어지는 길을 한 화면에
세로로 쌓으므로, 각 단계는 그 화면 전체를 같은 구조로 다시 그리고 단계로 들어오면 그 단계가 보는 카드로 스크롤한다.
예시 레코드 번호는 실제 규약(수집 해시 앞 열두 자리 16진수)을 따르고, 실행·호출 번호·단계 이름·상태 값은 서빙 응답의
원값(`scheduled` · `succeeded` · `analysis` · `call_failed` …)을 구현처럼 그대로 보인다.

| 단계 | 화면 id | 근거 |
|---|---|---|
| `STP-pin-record` | `debug` | AC4.3 · AC2.6 · `Debug.tsx` 전체(머리 lede · 분석 결과 찾기[검색 · 증상 세 묶음 · `찾기` · 목록 표 · 「제목 기록 없음」] · 고른 결과 · 응답↔저장값 · 모델 호출 기록 · 모델이 받은 입력 · 보관된 원문 · 대조 요약 · 배치 실행 · 증상이 몰렸나 · 원인 판정 · 판정 뒤 이어지는 길) — 이 단계는 검색 카드와 고른 결과를 본다. 「원문 열기 ↗」 는 원문 주소가 있을 때만(`input?.source_url`) · 운영 알림 카드는 여정 문서 터치포인트·§4 1행(아래 상태 `alert-entry`) |
| `STP-read-exchange` | `debug` | 같은 화면 — 모델 호출 기록(`CMP-kv`) · 응답↔저장값(`CMP-table`) (AC4.2 · `Debug.tsx` `compareRows`·`lastJSONObject`) |
| `STP-check-input` | `debug` | 같은 화면 — 모델이 받은 입력 · 보관된 원문(원문 버전 `<select>`) · 대조 요약 (AC4.2 · AC2.6 · AC1.7 · `Debug.tsx` `sentKnown`·`staleBy`·`emptyish`) |
| `STP-scan-run` | `debug` | 같은 화면 — 배치 실행 단계 표(`PAT-integrity-panel` 계열, 입력 = 결과별 합) · 증상이 몰렸나(`CMP-metric`) 와 「목록 보기」 드릴다운 (AC4.1 · AC4.3 · `Debug.tsx` `stageBalance`·`updateParams({symptom, run_id})`) |
| `STP-route-cause` | `debug` | 같은 화면 — 원인 판정(근거 표 · 원인 라디오 · 판정 메모 · 「판정 기록」) · 판정 뒤 이어지는 길 (여정 문서 `STP-route-cause` · `Debug.tsx` `CAUSES`) |

| 상태 id | 단계 | 화면 id | 방식 | 상태 | 근거 | 도달 경로 |
|---|---|---|---|---|---|---|
| `loading` | `STP-pin-record` | `debug` | 화면 교체 | 첫 진입 — lede · 「레코드 {번호}의 판단 기록을 불러오는 중…」 · 검색 카드 안 「목록을 불러오는 중…」 | `Debug.tsx` (`!data && !error` · `!list && !listError`) | 딥링크 `#STP-pin-record/loading` |
| `index-not-ready` | `STP-pin-record` | `debug` | 화면 교체 | 원문·분석 기록 인덱스 준비 전(503 `index_not_ready`) — 검색 카드 안에 한 번만 | `IndexNotReady.tsx` · `Debug.tsx` (`listError === INDEX_NOT_READY`, 상세 쪽은 「once is enough」 로 생략) | 딥링크 `#STP-pin-record/index-not-ready` |
| `api-error` | `STP-pin-record` | `debug` | 얹힘 | 상세 조회 실패 — 화면 머리 「API 오류: … Go 서빙(:8080)…」, 아래 카드 없음 | `Debug.tsx` (`error && error !== INDEX_NOT_READY`) | 딥링크 `#STP-pin-record/api-error` |
| `detail-loading` | `STP-pin-record` | `debug` | 얹힘 | 레코드를 고른 직후 — 「레코드 {번호}의 판단 기록을 불러오는 중…」 | `Debug.tsx` (`!data && !error`, `query` 있음) | 목록에서 다른 레코드 라디오를 고른다 |
| `list-error` | `STP-pin-record` | `debug` | 얹힘 | 목록 조회 실패 — 검색 카드 안 「API 오류: …」 | `Debug.tsx` (`listError && listError !== INDEX_NOT_READY`) | 딥링크 `#STP-pin-record/list-error` |
| `list-loading` | `STP-pin-record` | `debug` | 얹힘 | 조건을 바꾼 뒤 목록 재조회 — 「목록을 불러오는 중…」 | `Debug.tsx` (`!list && !listError`, `listReload`) | 「찾기」 제출 또는 증상 `<select>` 변경 |
| `no-match` | `STP-pin-record` | `debug` | 얹힘 | 찾는 결과 0건 — 레코드 번호는 제보 링크 `record_id=` 뒤의 값이라는 안내 | 여정 문서 `STP-pin-record` 페인포인트 · `Debug.tsx` (`listRows.length === 0`) | 검색에 없는 번호를 넣고 「찾기」 |
| `truncated` | `STP-pin-record` | `debug` | 얹힘 | 맞는 결과가 상한(50건)을 넘음 — 「맞는 결과 N건 가운데 앞 50건만 보입니다」 | `Debug.tsx` (`list.truncated`) · 서빙 `debugRecordsLimit` | 딥링크 `#STP-pin-record/truncated` |
| `alert-entry` | `STP-pin-record` | `debug` | 얹힘 | 운영 알림 링크로 실행 단위에서 진입 — 「실행 기록부터 보기」 | 여정 문서 §4 1행 · `STP-pin-record` 터치포인트 「운영 알림 카드」 · 가정(구현 없음 — 아래 걷어낸 표면의 판정) | 딥링크 `#STP-pin-record/alert-entry` |
| `requested-missing` | `STP-pin-record` | `debug` | 얹힘 | 링크의 레코드에 분석 결과가 없음 — 「조회가 실패한 것이 아니라 되짚을 판단이 없습니다」 | `Debug.tsx` (`selection === "requested-missing"`) | 딥링크 `#STP-pin-record/requested-missing` |
| `no-records` | `STP-pin-record` | `debug` | 얹힘 | 분석된 레코드가 아직 하나도 없음 | `Debug.tsx` (`!data.found`, `selection` 이 `empty`) | 딥링크 `#STP-pin-record/no-records` |
| `auto-pick` | `STP-pin-record` | `debug` | 얹힘 | 조회 없이 열어 첫 레코드를 자동 선택 — 고른 결과 카드 note | `Debug.tsx` (`selection === "auto"`) | 딥링크 `#STP-pin-record/auto-pick` |
| `multi-version` | `STP-pin-record` | `debug` | 얹힘 | 재처리로 분석 버전이 둘 이상 병존 — 버전별 분석 로직·실행·호출 | AC4.3(병존하는 두 로직 버전이 각자 다른 실행·호출을 가리킴) · `Debug.tsx` (`versions.length > 1` note) · 가정(버전별 표는 AC4.3 검증 항목을 화면에 옮긴 것, 구현은 개수만) | 목록에서 `b05f7a2c6e19` 를 고른다 |
| `parse-mismatch` | `STP-read-exchange` | `debug` | 얹힘 | 응답의 최종 판단 ≠ 저장값 — 읽는 쪽을 먼저 의심 | 여정 문서 `STP-read-exchange` 페인포인트 · `Debug.tsx` (`mismatched.length > 0`) | 기본 레코드 `a3f9c21e07b4`(제보 링크) |
| `parse-failed` | `STP-read-exchange` | `debug` | 얹힘 | 응답을 읽지 못함(형식 깨짐) — 원문은 그대로, 읽지 못한 사유 | AC4.2(파싱 실패·형식이 깨진 응답도 기록 · 「파싱 결과 또는 실패 사유」) · `Debug.tsx` `OUTCOME_LABEL.parse_failed` · 가정(배너 문면 — 구현은 근거 표에만 적는다) | 목록에서 `7c3d05e8b2f9` 를 고른다 |
| `call-failed` | `STP-read-exchange` | `debug` | 얹힘 | 모델 호출 실패 — 재시도 횟수·마지막 오류, 결과는 미분석 | AC4.2 · `Debug.tsx` (`call_outcome === "call_failed"`) | 목록에서 `5be0d8a1c934` 를 고른다 |
| `no-reply` | `STP-read-exchange` | `debug` | 얹힘 | 응답 원문 없음 — 빈 칸 대신 「보여 줄 원문이 없습니다」 | `Debug.tsx` (`response_raw === null`) | 목록에서 `5be0d8a1c934` 를 고른다 |
| `not-called` | `STP-read-exchange` | `debug` | 얹힘 | 모델을 부르지 않음 — 미호출 사유(본문 미확보 · 키워드 분석기) | 여정 문서 §4 2행 · AC4.3 · `Debug.tsx` (`exchange.state === "no-call"`, `NO_CALL_LABEL`) | 목록에서 `c71e4f02ad88`(본문 미확보) 또는 `4e8a1f6d93b0`(키워드 분석기) |
| `reused` | `STP-read-exchange` | `debug` | 얹힘 | 이전 응답 재사용 — 원 호출 기록으로 | 여정 문서 §4 3행 · AC4.2 · `Debug.tsx` (`reusedView`) | 목록에서 `0d9a6b7e2f15` 를 고른다 |
| `no-call-record` | `STP-read-exchange` | `debug` | 얹힘 | 호출 기록 도입 이전 분석 — 표본 재분석으로 재현 | 여정 문서 §4 4행 · `Debug.tsx` (`exchange.state === "unrecorded"`) | 목록에서 `2b6e91f4c0a7` 를 고른다 |
| `call-record-absent` | `STP-read-exchange` | `debug` | 얹힘 | 가리키는 호출 기록이 레이크에 없음 | `Debug.tsx` (`exchange.state === "call-record-absent"`) | 목록에서 `d6c4a90e3b72`(제목 기록 없음) 를 고른다 |
| `body-mismatch` | `STP-check-input` | `debug` | 얹힘 | 분석에 쓴 본문 ≠ 지금 보관된 최신 본문 — 분석 뒤 수정 횟수 | 여정 문서 `STP-check-input` 페인포인트 · AC1.7 · `Debug.tsx` (`staleBy > 0`) | 목록에서 `e48c0b93a7d2` 를 고른다 |
| `body-empty` | `STP-check-input` | `debug` | 얹힘 | 본문이 사실상 비어 있음(본문 미수집 · 안내 문구뿐) | 여정 문서 `STP-check-input` 사용자 행동 · `Debug.tsx` (`emptyish`) | 목록에서 `9f27d3c50e61` 또는 `c71e4f02ad88` |
| `run-stage-failed` | `STP-scan-run` | `debug` | 얹힘 | 실행이 도중에 멈춤 — 멈춘 지점까지 건수·사유, 뒤 단계 없음 | AC4.1(중단된 실행도 그 시점까지 기록) · `Debug.tsx` (`stage_status === "failed"`) | 목록에서 `5be0d8a1c934` 를 고른다 |
| `run-running` | `STP-scan-run` | `debug` | 얹힘 | 실행이 아직 진행 중 — 종료 시각 자리에 「아직 진행 중」 | `Debug.tsx` (`run_ended_at ?? "아직 진행 중"`) | 딥링크 `#STP-scan-run/run-running` |
| `no-run-record` | `STP-scan-run` | `debug` | 얹힘 | 실행 기록이 레이크에 없음 — 「실행이 없었던 것이 아니라 기록이 없습니다」 | `Debug.tsx` (`run` 이 `null`) | 목록에서 `2b6e91f4c0a7` 를 고른다 |
| `run-filter` | `STP-scan-run` | `debug` | 얹힘 | 실행 기록 → 레코드 목록 드릴다운 — 검색 카드가 그 실행·증상으로 좁혀지고 「전체 실행으로 넓히기」 | AC4.3(실행 기록에서 레코드 목록으로 이동) · 여정 문서 `STP-scan-run` 페인포인트 · `Debug.tsx` (`runFilter`) | 증상이 몰렸나의 「목록 보기」 |
| `invalid` | `STP-route-cause` | `debug` | 얹힘 | 판정 입력 검증 실패(원인 미선택 · 메모 공란) | `Debug.tsx` (`setInvalid`) | 원인 없이, 또는 메모 없이 「판정 기록」 |
| `recorded` | `STP-route-cause` | `debug` | 얹힘 | 판정 기록됨 — 이 화면 안에서만 유지 | 여정 문서 `STP-route-cause`(판정 보존은 백로그) · `Debug.tsx` (`setRecorded`) | 원인을 고르고 메모를 채워 「판정 기록」 |

**의도적 제외**
- 상세 조회만 인덱스 준비 중인 갈래(`Debug.tsx` 의 머리 `IndexNotReady`) — 두 조회가 같은 서빙 인덱스를 읽어 함께 503 이 되므로
  구현 주석(「once is enough」)대로 `index-not-ready` 한 상태로 그린다.
- 화면 끝 `MapStrip`(되짚는 레코드 · 분석 버전 · 속한 실행 칩) — `CMP-mapstrip` 은 화면을 여정·가치에 잇는 문서 장치라
  `JRN-daily-scan` 과 같이 메타 레이어에 둔다. 칩의 세 값은 고른 결과 카드 머리 배지 · 버전 note · kv 「실행」 에 이미 있다.
- 「원문 열기 ↗」 의 실제 새 탭 · 「원문 추적 상세에서 보기」 의 `/trace` 착지 — 여정 밖 행동이라 그려 두되 누르면 안내만 뜬다.
- 실행 진행 중(`run-running`)의 나머지 칸(최종 상태 `running`, 진행 중 단계 표)은 딥링크가 종료 시각 자리만 바꾼다 — 예시 실행이
  전부 끝난 실행이라 진행 중 실행 데이터를 따로 두지 않았다.

**걷어낸 목업 전용 표면** (AC·구현·여정 문서 근거 없음, 2026-10-17)
- 운영 알림 카드의 「평소보다 많습니다 (23건)」 주장 — 실행 간 기준선이 계약·서빙에 없다. 카드 자체는 여정 문서 터치포인트·§4 1행
  근거로 남기되 상시 표면이 아니라 알림 링크로 들어온 상태(`alert-entry`)로 바꿨다.
- 배치 실행 카드의 `실행` `<select>`(예시 실행 넷) · sub 꼬리 「고른 결과를 만든 실행」/「최근 실행을 보여 줍니다」 · kv `분석 코드` —
  실행 목록 라우트와 실행의 분석 코드 필드가 없다. 기록 없는 결과는 `no-run-record` 로 그린다.
- 증상이 몰렸나의 `증상` `<select>` 다섯 · `몰림 기준 %` 입력 · `run-concentrated` 배너(직전 실행 비교 · 「이 실행부터 분석 코드가
  바뀌었습니다」) · 「해당 결과:」 번호 나열 — 실행 단위 tally 는 서빙 세 묶음뿐이고 직전 실행 기준선이 없다. 레코드 목록으로 내려가는
  길은 구현의 「목록 보기」 드릴다운(`run-filter`)으로 그린다.
- 검색 카드 증상 필터의 평면 다섯 항목과 「분류가 의심됨」 — 서빙이 거를 수 있는 세 묶음(`optgroup`)으로 바꿨다. 검색은 입력 즉시가
  아니라 「찾기」 제출로 조회한다.
- 원인 판정의 일괄 적용 체크박스(「같은 실행에서 같은 증상인 결과 N건에도…」) · kv `판정 대상`/`원인` · 원인 힌트(「모은 근거로 보면…」) —
  레코드 증상 분류와 실행 단위 건수, 판정 영속화가 없다. `invalid`·`recorded` 는 구현에 있어 남는다.
- 전송본 해시 줄의 「보관 원문으로 재구성한 요청과 바이트 일치 ✓」 — 하지 않은 대조라 구현처럼 `sha256 {해시}` 만 둔다.
- 고른 결과 kv `레코드`·`출처`·`수집 주기`·`분석 결과`·`만든 실행` — 구현의 아홉 키(상태 · 분위기 · 신뢰도 · 대상 국가 · 서술 대상 ·
  분석 로직 · 분석 시각 · 실행 · 원문 주소)로 바꿨다. 출처·수집 주기는 `/api/debug` 의 `input` 에 없다.
- 토프바 pill `tb-rec`(고른 레코드 번호) — `Debug.tsx` 는 `useTopbar` 를 쓰지 않아 pill 이 없다. 사이드바 하단의 분석 로직·최근 실행
  문면 — 구현 고정 문면(`수집 정상 · 12개 소스` / `마지막 수집 14:00 KST`)으로 바꿨다.
- 호출 실패 레코드의 지어낸 응답 원문(「(응답 없음) 1차 시도: HTTP 429…」) — 구현은 `response_raw` 가 `null` 이면 `no-reply` 로 적는다.
- 예시 레코드 번호 `R-2609-0412` 꼴 — 실제 `record_id` 규약(12자리 16진수)과 무일치 안내 문면(`record_id=` 뒤의 값)으로 바꿨다.

여정 문서 §4 1행(운영 알림 → 실행부터)은 그 상황이 생기는 단계 1 의 `alert-entry` 안 「실행 기록부터 보기」 다. 2·3·4행(미호출 →
입력 점검, 재사용 → 원 호출, 기록 없음 → 표본 재분석)은 단계 2 의 모델 호출 기록 카드 안에 구현 순서대로 있고, 4행은 여정을
벗어나는 인계라 「여정 끝」 표지를 단다. 5·6행(입력 → 수집 복구, 로직 → 소급 적용)은 단계 5 의 「판정 뒤 이어지는 길」 이며 둘 다
「여정 끝」 표지를 단다 — 5행의 목적지는 여정 문서대로 `JRN-ingestion-recovery#STP-locate-gap` 이다(구현은 `/reprocess`, 설계 트래커
「판정 뒤 이어지는 길 첫 갈래」 행). 7행(조사 도중 이탈)은 결론을 못 내는 자리인 같은 카드의 「이 결과부터 다시 보기」 로, §4 순서와
DOM 순서가 함께 맞는다. 같은 화면이 다섯 단계에 있으므로 각 분기 컨트롤은 그 단계의 사본에만 `data-goto` 를 달고, 다른 단계의 같은
컨트롤은 같은 행동을 한다. 정상 종료는 단계 5 의 「여정 끝 · 여정 완료」 표지다.

> `recorded` 가 화면 안에서만 유지되는 것은 미구현이 아니라 **범위 결정**이다 — 여정 문서가 `STP-route-cause` 페인포인트의
> 「판정 메모를 레코드·실행에 남기기」를 「현재 AC 없음 — 백로그 후보」로 파킹했고, 구현(`Debug.tsx`)도 성공 배너에 그 사실을 적는다.
> 이 페이지가 그리는 기록(실행·호출)은 PRD-4 AC4.1~4.3 이 요구하는 계약이며 계약·조회 경로(`/api/debug` · `/api/debug/records`)·
> 화면(`Debug.tsx`)이 모두 제품에 착지해 있다.

## 화면 → 여정 단계 → 가치 → 디자인 시스템 항목

### 여정 페이지 · `JRN-daily-scan` 아침 정기 스캔
- **여정 단계**: `JRN-daily-scan` / `STP-open-brief`(AC3.2, AC3.5), `STP-scan-delta`, `STP-adjust-window`(AC3.3), `STP-drill-trend`(AC3.5, AC3.2)
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
- **파일**: `docs/mockups/JRN-judgment-debug.html` (새로 그린 운영 화면 — 화면 id `debug`, 좌측 네비 운영 그룹 두 번째 항목 `판단 디버깅`)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-integrity-panel`, `CMP-card`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-note`, `CMP-metric`, `CMP-mapstrip`

## 화면 간 이동(클릭 동선, 실제 링크)
- `JRN-daily-scan.html` 안에서는 단계 레일·화면 안의 주요 행동 버튼·`#STP-<슬러그>` 딥링크로 5단계를 이동하고, §분기 4행이 각각 `#STP-scan-delta`·`JRN-spike-verification.html#STP-notice-spike`·`JRN-axis-contrast.html#STP-open-compare`·`#STP-open-brief`로 이동한다
- 좌측 네비(`<a href>`)는 화면 **8항목**(`dash`·`trend`·`compare`·`sentiment`·`fairness`·`trace`·`reprocess`·`debug` — `nav.ts` 의 `SCREENS` 와 같은 순서·라벨)이고, 목적지는 **6파일**이다(`JRN-daily-scan.html`·`JRN-sentiment-shift.html`·`JRN-axis-contrast.html`·`JRN-spike-verification.html`·`JRN-logic-backfill.html`·`JRN-judgment-debug.html`). **`JRN-ingestion-recovery.html` 은 좌측 네비의 목적지가 아니다** — `reprocess` 항목은 화면 id 규약에 따라 그 화면을 흡수한 `JRN-logic-backfill.html#STP-scope-range` 를 가리키고, 수집 복구 여정 페이지로는 허브와 다른 여정의 이탈 컨트롤로 들어간다. 그래서 네비 목적지 수와 여정 페이지 실측 수는 서로 다른 축이다. 흡수된 일곱 화면은 항목을 유지한 채 흡수한 여정 페이지로 가며, 한 페이지를 나눠 쓰는 `dash`·`trend` 와 `fairness`·`trace` 는 각각 `#STP-open-brief`/`#STP-drill-trend`, `#STP-check-normalized`/`#STP-open-origin` 앵커로 갈라진다. `index.html`은 `JRN-daily-scan.html`로 리다이렉트
- `JRN-sentiment-shift.html` 안에서는 단계 레일·주요 행동 버튼·`#STP-<슬러그>` 딥링크로 4단계를 이동하고, §분기 4행이 각각 선언된 대상(`#STP-…` 또는 `JRN-spike-verification.html#STP-open-origin`·`JRN-logic-backfill.html#STP-scope-range`)으로 이동한다
- `JRN-axis-contrast.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 4행이 `#STP-scan-axis-tops`(2건)·`JRN-spike-verification.html#STP-check-normalized`·`JRN-sentiment-shift.html`로 이동한다
- `JRN-spike-verification.html` 안에서는 같은 방식으로 6단계를 이동하고, 「검증 중 이런 상황이라면」 목록의 §분기 5행이 `#STP-open-origin`·`#STP-inspect-sources`·`JRN-logic-backfill.html#STP-scope-range`·`JRN-ingestion-recovery.html#STP-spot-anomaly`·`#STP-judge`로 이동한다
- `JRN-ingestion-recovery.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 5행이 `#STP-backfill`·`#STP-verify-integrity`·`#STP-diagnose-source`·`JRN-logic-backfill.html#STP-scope-range`·`#STP-locate-gap` 으로 이동한다
- `JRN-logic-backfill.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 5행이 `#STP-dry-run`·`#STP-run-reprocess`·`JRN-spike-verification.html#STP-open-origin`·`JRN-ingestion-recovery.html#STP-locate-gap`·`#STP-compare-before-after` 로 이동한다
- `JRN-judgment-debug.html` 안에서는 같은 방식으로 5단계를 이동하고, §분기 7행이 `#STP-scan-run`·`#STP-check-input`·`#STP-read-exchange`·`JRN-logic-backfill.html#STP-dry-run`·`JRN-ingestion-recovery.html#STP-locate-gap`·`JRN-logic-backfill.html#STP-scope-range`·`#STP-pin-record` 로 이동한다. 좌측 네비 `debug` 항목(`판단 디버깅`)이 이 페이지 `#STP-pin-record` 로 들어온다. 화면 1(고른 결과)과 화면 3(보관된 원문)의 「원문 추적 상세」 CTA 는 고른 결과를 `?record_id=` 로 실어 `JRN-spike-verification.html#STP-open-origin` 에 착지한다 — 분기가 아니라 화면 간 이동이라 §4 분기(`data-goto`)로 세지 않는다. 구현의 `/trace` 는 2026-09-24 부터 `?record_id=` 를 읽어 그 기사로 바로 열고, 화면에서 조회하면 주소에 되써 링크로 공유된다(`web/src/screens/Trace.tsx`)
- **여정 사이의 인계는 이제 예외 없이 상대 여정의 단계에 착지한다** — 이전에는 `JRN-axis-contrast`의 「정규화로 확인」이 `fairness.html`로, `JRN-sentiment-shift`의 「원문 확인」이 `trace.html`로, 세 여정의 재처리 인계가 `reprocess.html`로 갔지만, 그 분기들이 선언한 대상은 처음부터 상대 여정의 **단계**였다. 화면 파일이 모두 흡수된 지금 그 괴리는 남아 있지 않다(`JRN-spike-verification` 의 「수집 이상 점검하기」가 선언 대상 `JRN-ingestion-recovery#STP-spot-anomaly` 와 달리 `reprocess.html` 을 가리키던 것도 이번에 바로잡았다)

## 여정 단계 커버리지 (34/34 완전 · 0 부분 · 0 미시각화)

여정 문서를 맥락 기준으로 재작성하면서 단계가 19개 → 30개로 늘었고, 화면 단위 mockup 이 아직 못 따라온 구간이 드러났다.

| 여정 | 단계 | 화면 | 상태 |
|------|------|------|------|
| `JRN-daily-scan` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window`, `STP-drill-trend` | `JRN-daily-scan.html` (여정 페이지) | 🟢 |
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
- **`debug` 화면 추가 (2026-09-24)**: `JRN-judgment-debug` 여정 페이지를 좌측 네비에 넣기로 결정해 화면 id `debug`(`/debug`, 운영 그룹)를 `web/src/shell/nav.ts` 의 `SCREENS` 에 더하고 일곱 목업 페이지의 네비에 같은 항목을 넣었다. 그때 구현은 `Placeholder` 였고 `/api/debug` 는 「실행·호출 기록 구현 전」을 밝히는 스텁이었다 — 그 기록(PRD-4 AC4.1~4.3)이 레이크에 생겨야 화면을 세울 수 있으므로 `BUILT` 편입과 목업↔구현 대조를 그 뒤로 미뤘다. **그 선행 조건은 해소됐다(rct_20260926-0011 실측)**: AC4.1 `#130`(09-24) · AC4.2 `#134`(09-25) · AC4.3 `#137`(09-25) 가 전건 착지해 기록은 레이크에 있고, 위에 인용한 스텁 문면도 세 착지를 따라 세 번 좁혀져 지금은 조회 경로 하나(`debug_read_path`)만 말한다. **조회 경로도 해소됐다(rct_20260928-0005)** — `/api/debug` 가 스텁을 버리고 레코드↔실행↔호출 조회 계약이 됐다. **화면도 해소됐다(rct_20260928-0006)** — `Debug.tsx` 가 서고 `BUILT` 에 `debug` 가 들어가 선행 조건이 **0개**가 됐다(이전 문면은 「남은 선행 조건은 화면 하나」였고, 그 앞은 「조회 경로와 화면」 둘이었다). `BUILT` 편입을 그 슬라이스가 함께 가져온 것은 **그러지 않으면 아무도 움직일 수 없기 때문**이다 — `check-mockup-render.py` 의 in-scope 모집단이 `BUILT` 로 정해지므로, 화면이 `BUILT` 밖인 동안에는 `tbm_econ-opinion-monitor-mockup-render` 의 판정 지표가 `debug` 에 대해 **불변**이고(양성 프로브 실측: `BUILT` 밖이면 in-scope 7화면 · 넣으면 8화면) 그 모델이 착수할 수 있는 것이 없다. 그 편입이 연 R3·R5 는 **등재가 아니라 수렴**으로 닫혔다(`tokens.css` 의 `.code` 를 이 페이지의 `.code` 문면에 맞춤 — 값 충돌·목업 전용 선언 상한은 0 그대로). 이제 자매에게 남는 것은 게이트가 보지 않는 **카피·DOM 축**의 목업↔구현 대조다. **그 대조는 rct_20260928-0007 이 시작했다** — 이 페이지의 `STP-pin-record`·`STP-check-input` 두 단계를 편차 허용목록에 첫 등재했고(벽은 한 종류다: 서빙이 레코드 목록도 원문 버전 목록도 내려주지 않는다), 남은 `STP-read-exchange`·`STP-scan-run`·`STP-route-cause` 는 벽의 종류가 달라 후속 사이클이 받는다. **`STP-pin-record` 등재는 rct_20260928-0010 이 레코드 목록 조회(`#203`) 착지 뒤 실측으로 다시 판정했다** — 목록이 서서 「카드 전량 부재」가 해소되고 분류 축만 남았으며, 구현이 목업 쪽으로 더 움직일 자리는 설계 트래커 표가 「구현 수렴 대기」로 든다. **남은 세 단계는 rct_20260928-0014 가 첫 등재했다** — 벽 없는 차이는 「구현 수렴 대기」로, 서빙이 실행 목록·증상 축을 내려주지 않아 생긴 차이와 구현 쪽이 맞는 문면은 사유와 함께 설계 트래커 표에 있다.
- **요청·응답 원문 블록(`.code`)은 디자인 시스템 미등재**: 가공 전 텍스트를 그대로 보여 주는 고정폭 블록을 이 페이지에서 처음 썼다. 토큰(`TKN-type` mono · `TKN-surface` · `TKN-line` · `TKN-radius`)만 조합했고 새 색·치수는 없다. 두 번째 사용처가 생기면 컴포넌트로 등재한다.
- **목업 데이터는 운영 실측 규모를 따른다**: 실행당 관측 약 500건, 새 LLM 호출은 그중 일부이고 나머지는 응답 재사용이라는 비율은 2026-09-24 운영 레이크 실측(PRD-4 「설계 전제」)을 본떴다. 개별 레코드·호출 번호는 가상이다.
- **원문 열기(원래 기사로 나가기) — 2026-09-24 추가**: `JRN-spike-verification` 원문 단계(`#origin-url` · `#open-source`)와 `JRN-judgment-debug` 화면 1·3(`#open-source-1`·`#open-source-3`)에 「원문 주소」와 「원문 열기 ↗」를 넣었다. 링크가 끊긴 상태에서는 버튼을 두지 않는다(보존 사본이 원문 역할). **목업은 외부 주소를 `href` 가 아니라 `data-url` 에 두고 클릭 시 새 탭으로 연다** — 여정 페이지 규칙 5(h)가 웹폰트 외 외부 `href`/`src` 를 금지하기 때문이다. 구현(`Trace.tsx`)은 http(s) 주소만 `<a target="_blank" rel="noopener noreferrer">` 로 만든다.
