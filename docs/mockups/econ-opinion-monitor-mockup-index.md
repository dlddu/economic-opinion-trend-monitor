# 경제 여론 추세 모니터 — Mockup 인덱스

> mockup ↔ 여정 단계 ↔ 가치 ↔ 디자인 시스템 항목의 단일 매핑 소스.
> 검증기(`design-doc-structure-validator`)가 시각화 커버리지와 디자인 시스템 사용처를 이 표에서 읽는다.
> 가치 정의: `docs/econ-opinion-monitor-values.md` · 여정: `docs/user-journeys/` (여정당 문서 하나) · 디자인 시스템 항목: `docs/design-system/econ-opinion-monitor-design-system.md`
>
> 마지막 갱신: 2026-08-30

## Mockup 파일
프로토타입은 **페이지별 자립형(self-contained) HTML 파일**로 분리되어 있다. 각 페이지는 디자인 시스템 CSS와 공통 스크립트를 자체 `<style>`·`<script>`로 **인라인 포함**하므로 다른 파일·폴더 의존 없이 단독으로 열린다(웹폰트만 Google Fonts CDN에서 로드). 모든 페이지는 `docs/mockups/` 안에 있고, 화면 간 이동은 좌측 네비와 본문 버튼의 실제 링크(`<a href>`)로 동작한다.

| 화면 id | 파일 | 형식 |
|---------|------|------|
| `dash` | `docs/mockups/dashboard.html` | 자립형 HTML (CSS·JS 인라인, 라이브러리 비의존) |
| `trend` | `docs/mockups/trend.html` | 자립형 HTML |
| `compare` | `docs/mockups/compare.html` | 자립형 HTML |
| ~~`sentiment`~~ | (삭제됨 — 아래 여정 페이지에 흡수) | — |
| `fairness` | `docs/mockups/fairness.html` | 자립형 HTML |
| `trace` | `docs/mockups/trace.html` | 자립형 HTML |
| `reprocess` | `docs/mockups/reprocess.html` | 자립형 HTML |
| (진입) | `docs/mockups/index.html` | `dashboard.html`로 리다이렉트 |

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

**규칙 1 미충족 여정 상한: 5** — 아직 여정 페이지가 없고 예외 등재도 없는 여정의 수다(`JRN-daily-scan`, `JRN-spike-verification`, `JRN-axis-contrast`, `JRN-ingestion-recovery`, `JRN-logic-backfill`). `scripts/check-journey-mockup.py` 가 이 값을 상한으로 읽는다 — 실측이 넘으면 실패하고, 밑돌면 이 값을 낮추라고 실패한다(래칫).

**규칙 5 미충족 mockup 페이지 상한: 6** — 개정된 규칙 5(프로토타입 충실도 (a)~(h))를 아직 충족하지
않는 mockup 페이지의 수다. 화면 단위로 남아 있는 6개(`dashboard`, `trend`, `compare`, `fairness`,
`trace`, `reprocess`)가 그것이며, 여정 워크스루가 아니라 단일 화면 스냅샷이라 (a)(c)(e)를 만족할 수
없다. 이 격차는 여정 단위 재편이 진행되며 닫힌다 — `scripts/check-journey-mockup.py` 가 이 값을
상한으로 읽어 늘면 실패하고, 밑돌면 값을 낮추라고 실패한다(래칫). 여정 페이지는 이 집합에서 제외되며,
`scripts/check-journey-flow.js` 하네스가 (b)~(e)를 실제 DOM에서 집행한다.

### 상태 변형 등재 (규칙 5(e))

규칙 5(e)는 "각 화면이 정상 경로 한 벌로 끝나지 않을 것"을 요구하고, 여정 문서에 분기·예외 서술이 있으면
그것이 최소 집합이라고 정한다. 아래가 각 여정 페이지가 그린 상태의 **단일 등재**이며, 하네스는 기대값을
페이지가 아니라 이 표에서 읽는다(페이지에서 읽으면 자기참조라 어떤 뮤테이션도 통과한다).

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

> 디자인 시스템 토큰·컴포넌트 스타일은 각 페이지의 `<style>`에 동일하게 인라인된다(개념적 단일 소스는 `docs/design-system/econ-opinion-monitor-design-system.md`). 토큰을 바꿀 때는 7개 페이지의 `:root`를 함께 수정한다.
> 아래 인덱스는 **화면(=페이지 파일) 단위**로 여정·가치·디자인 항목을 매핑한다. 화면 id ↔ 파일 대응은 위 표를 따른다(`dash`만 `dashboard.html`, 나머지는 `<id>.html`).

## 화면 → 여정 단계 → 가치 → 디자인 시스템 항목

### 화면 1 · `dash` 추세 대시보드
- **여정 단계**: `JRN-daily-scan` / `STP-open-brief`(AC3.2, AC3.5), `STP-scan-delta`, `STP-adjust-window`(AC3.3) · `JRN-spike-verification` / `STP-notice-spike`(급등 인지 지점)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `CMP-topbar`, `CMP-sidebar`, `CMP-nav-item`, `CMP-metric`, `CMP-card`, `CMP-ranklist`, `CMP-spark`, `CMP-sentbar`, `CMP-axpill`, `CMP-kv`, `CMP-seg`, `CMP-norm-toggle`, `CMP-delta`, `CMP-badge`, `CMP-mapstrip`

### 화면 2 · `trend` 대상 추세 상세
- **여정 단계**: `JRN-daily-scan` / `STP-drill-trend`(AC3.5, AC3.2) · `JRN-axis-contrast` / `STP-verify-in-trend`(AC3.5, 축 비교에서 진입하는 상세 목적지)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-line-chart`, `CMP-card`, `CMP-table`, `CMP-legend`, `CMP-axpill`, `CMP-seg`, `CMP-delta`, `CMP-mapstrip`

### 화면 3 · `compare` 3축 비교
- **여정 단계**: `JRN-axis-contrast` / `STP-open-compare`(AC3.7), `STP-scan-axis-tops`(AC3.7, AC3.4), `STP-disambiguate-axis`(AC1.3, AC2.1), `STP-pick-outlier`(🟠 행 클릭 어포던스 미배선)
- **가치**: V2 지역 축 간 비교
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-axis-compare`, `CMP-card`, `CMP-axpill`, `CMP-ranklist`, `CMP-sentbar`, `CMP-badge`, `CMP-note`, `CMP-mapstrip`

### 여정 페이지 · `JRN-sentiment-shift` 분위기 반전 감지
- **여정 단계**: `JRN-sentiment-shift` / `STP-open-sentiment`(AC3.6, AC3.4), `STP-check-unanalyzed`(AC2.5, AC3.4), `STP-overlay-time`(AC3.3, AC3.6), `STP-confirm-cause`
- **파일**: `docs/mockups/JRN-sentiment-shift.html` (구 `sentiment` 화면을 흡수, 화면 파일은 삭제)
- **가치**: V3 분위기 분포 파악, V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-donut`, `PAT-stacked-sentiment`, `CMP-card`, `CMP-sentbar`, `CMP-legend`, `CMP-mapstrip`

### 화면 5 · `fairness` 공정성·원천 추적
- **여정 단계**: `JRN-spike-verification` / `STP-check-normalized`(AC3.8), `STP-inspect-sources`(AC3.1, AC3.8), `STP-drilldown-articles`(AC3.2)
- **가치**: V4 수집원 편차 보정, V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-raw-vs-norm`, `CMP-card`, `CMP-norm-toggle`, `CMP-table`, `CMP-note`, `CMP-delta`, `CMP-mapstrip`

### 화면 6 · `trace` 원문 추적 상세
- **여정 단계**: `JRN-spike-verification` / `STP-open-origin`(AC2.6, AC1.4) · `STP-judge`(🔴 판정 기록 UI 없음 — 미시각화)
- **가치**: V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-lineage`, `CMP-card`, `CMP-crumb`, `CMP-kv`, `CMP-badge`, `CMP-table`, `CMP-mapstrip`

### 화면 7 · `reprocess` 재처리 콘솔
- **여정 단계**: `JRN-logic-backfill` / `STP-scope-range`(AC1.4, AC2.6), `STP-run-reprocess`(AC2.6), `STP-compare-before-after`(AC3.2, AC3.3) · `JRN-ingestion-recovery` / `STP-spot-anomaly`(AC1.6), `STP-locate-gap`, `STP-diagnose-source`(🟠 실패 사유 표시 없음), `STP-verify-integrity`(🟠 결과만 표시)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-before-after`, `PAT-integrity-panel`, `CMP-card`, `CMP-seg`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-mapstrip`

## 화면 간 이동(클릭 동선, 실제 링크)
- `dashboard.html` → `compare.html` ("3축 나란히 비교" 버튼), `dashboard.html` → `trend.html` (상위 대상 순위 행 클릭)
- `fairness.html` → `trace.html` (원천 기여 뉴스의 "원문 →" 행 클릭)
- `trace.html` → `reprocess.html` ("이 키로 재분석" 버튼)
- 좌측 네비(`<a href>`)에서 6개 화면 + 여정 페이지 `JRN-sentiment-shift.html` 임의 전환, `index.html`은 대시보드로 리다이렉트
- `JRN-sentiment-shift.html` 안에서는 단계 레일·주요 행동 버튼·`#STP-<슬러그>` 딥링크로 4단계를 이동하고, §분기 4행이 각각 선언된 대상(`#STP-…` 또는 `trace.html`·`reprocess.html`)으로 이동한다

## 여정 단계 커버리지 (22/30 완전 · 3 부분 · 5 미시각화)

여정 문서를 맥락 기준으로 재작성하면서 단계가 19개 → 30개로 늘었고, 화면 단위 mockup 이 아직 못 따라온 구간이 드러났다.

| 여정 | 단계 | 화면 | 상태 |
|------|------|------|------|
| `JRN-daily-scan` | `STP-open-brief`, `STP-scan-delta`, `STP-adjust-window` | `dash` | 🟢 |
| `JRN-daily-scan` | `STP-drill-trend` | `trend` | 🟢 |
| `JRN-daily-scan` | `STP-shortlist` | (없음) | 🔴 제품 외부 메모에 의존 |
| `JRN-spike-verification` | `STP-notice-spike` | `dash`, `trend` | 🟢 |
| `JRN-spike-verification` | `STP-check-normalized`, `STP-inspect-sources`, `STP-drilldown-articles` | `fairness` | 🟢 |
| `JRN-spike-verification` | `STP-open-origin` | `trace` | 🟢 |
| `JRN-spike-verification` | `STP-judge` | (없음) | 🔴 판정 기록 UI 없음 |
| `JRN-axis-contrast` | `STP-open-compare`, `STP-scan-axis-tops`, `STP-disambiguate-axis` | `compare` | 🟢 |
| `JRN-axis-contrast` | `STP-pick-outlier` | `compare` | 🟠 행 클릭 어포던스 미배선 |
| `JRN-axis-contrast` | `STP-verify-in-trend` | `trend` | 🟢 |
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
| V2 지역 축 비교 | `compare` |
| V3 분위기 분포 | `JRN-sentiment-shift` |
| V4 편차 보정 | `fairness` |
| V5 원문 추적·재처리 | `fairness`, `trace`, `reprocess` |

## 알려진 정제 항목 (mockup 한정)
- **여정↔mockup 1:1 이관 진행 중 (1/6)**: `JRN-sentiment-shift` 만 여정 페이지로 이관됐고 나머지 5개는 아직 화면 단위다. 이관 순서는 **화면 소유가 배타적인 여정부터** — `sentiment` 는 이 여정 전용이었기에 흡수·삭제가 선결 판단 없이 끝났다. 남은 5개는 화면을 공유한다(`dash`: daily-scan+spike-verification, `trend`: daily-scan+axis-contrast, `reprocess`: ingestion-recovery+logic-backfill)므로, 그 화면을 쓰는 여정이 **전부** 이관될 때 함께 흡수·삭제해야 한다.
- **`STP-pick-outlier` 클릭 동선**: `compare` 의 대상 행에서 `trend` 상세로 가는 명시적 클릭 어포던스가 아직 미배선. 목적지 화면은 존재하므로 부분 시각화로 본다.
- **미시각화 5단계**: `STP-shortlist`, `STP-judge`, `STP-backfill`, `STP-dry-run`, `STP-publish`. 앞의 둘은 제품 범위(북마크·검증 이력) 확정이 선행돼야 한다.
- 데이터는 모두 예시(mock) 값이며 실제 파이프라인 연동 전 디자인 검토용이다.
