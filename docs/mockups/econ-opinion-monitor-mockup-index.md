# 경제 여론 추세 모니터 — Mockup 인덱스

> mockup ↔ 여정 단계 ↔ 가치 ↔ 디자인 시스템 항목의 단일 매핑 소스.
> 검증기(`design-doc-structure-validator`)가 시각화 커버리지와 디자인 시스템 사용처를 이 표에서 읽는다.
> 가치 정의: `docs/econ-opinion-monitor-values.md` · 여정: `docs/econ-opinion-monitor-user-journeys.md` · 디자인 시스템 항목: `docs/design-system/econ-opinion-monitor-design-system.md`
>
> 마지막 갱신: 2026-06-03

## Mockup 파일
프로토타입은 **페이지별 자립형(self-contained) HTML 파일**로 분리되어 있다. 각 페이지는 디자인 시스템 CSS와 공통 스크립트를 자체 `<style>`·`<script>`로 **인라인 포함**하므로 다른 파일·폴더 의존 없이 단독으로 열린다(웹폰트만 Google Fonts CDN에서 로드). 모든 페이지는 `docs/mockups/` 안에 있고, 화면 간 이동은 좌측 네비와 본문 버튼의 실제 링크(`<a href>`)로 동작한다.

| 화면 id | 파일 | 형식 |
|---------|------|------|
| `dash` | `docs/mockups/dashboard.html` | 자립형 HTML (CSS·JS 인라인, 라이브러리 비의존) |
| `trend` | `docs/mockups/trend.html` | 자립형 HTML |
| `compare` | `docs/mockups/compare.html` | 자립형 HTML |
| `sentiment` | `docs/mockups/sentiment.html` | 자립형 HTML |
| `fairness` | `docs/mockups/fairness.html` | 자립형 HTML |
| `trace` | `docs/mockups/trace.html` | 자립형 HTML |
| `reprocess` | `docs/mockups/reprocess.html` | 자립형 HTML |
| (진입) | `docs/mockups/index.html` | `dashboard.html`로 리다이렉트 |

> 디자인 시스템 토큰·컴포넌트 스타일은 각 페이지의 `<style>`에 동일하게 인라인된다(개념적 단일 소스는 `docs/design-system/econ-opinion-monitor-design-system.md`). 토큰을 바꿀 때는 7개 페이지의 `:root`를 함께 수정한다.
> 아래 인덱스는 **화면(=페이지 파일) 단위**로 여정·가치·디자인 항목을 매핑한다. 화면 id ↔ 파일 대응은 위 표를 따른다(`dash`만 `dashboard.html`, 나머지는 `<id>.html`).

## 화면 → 여정 단계 → 가치 → 디자인 시스템 항목

### 화면 1 · `dash` 추세 대시보드
- **여정 단계**: J1.1 대시보드 진입(AC3.2, AC3.5), J1.2 기간·단위 조정(AC3.3)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `CMP-topbar`, `CMP-sidebar`, `CMP-nav-item`, `CMP-metric`, `CMP-card`, `CMP-ranklist`, `CMP-spark`, `CMP-sentbar`, `CMP-axpill`, `CMP-kv`, `CMP-seg`, `CMP-norm-toggle`, `CMP-delta`, `CMP-badge`, `CMP-mapstrip`

### 화면 2 · `trend` 대상 추세 상세
- **여정 단계**: J1.3 대상 선택(AC3.5), J1.4 상위 대상 비교(AC3.5), **J2.4 대상 상세 → J1 연결**(축 비교에서 진입하는 상세 목적지)
- **가치**: V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-line-chart`, `CMP-card`, `CMP-table`, `CMP-legend`, `CMP-axpill`, `CMP-seg`, `CMP-delta`, `CMP-mapstrip`

### 화면 3 · `compare` 3축 비교
- **여정 단계**: J2.1 3축 비교 뷰(AC3.7), J2.2 축별 상위 대상(AC3.7, AC3.4), J2.3 축 기준 인지=수집원 축 vs 대상국(AC1.3, AC2.1)
- **가치**: V2 지역 축 간 비교
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-axis`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-axis-compare`, `CMP-card`, `CMP-axpill`, `CMP-ranklist`, `CMP-sentbar`, `CMP-badge`, `CMP-note`, `CMP-mapstrip`

### 화면 4 · `sentiment` 분위기 분포
- **여정 단계**: J3.1 대상·축 분위기 비율(AC3.6, AC3.4), J3.2 미분석 분리(AC2.5, AC3.4), J3.3 분위기 추세 결합(AC3.3, AC3.6)
- **가치**: V3 분위기 분포 파악, V1 시계열 추세 가시화
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-donut`, `PAT-stacked-sentiment`, `CMP-card`, `CMP-sentbar`, `CMP-legend`, `CMP-seg`, `CMP-mapstrip`

### 화면 5 · `fairness` 공정성·원천 추적
- **여정 단계**: J4.1 정규화 여부 확인(AC3.8), J4.2 편차 보정 인지(AC3.1, AC3.8), J4.3 원천 드릴다운(AC3.2)
- **가치**: V4 수집원 편차 보정, V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-raw-vs-norm`, `CMP-card`, `CMP-norm-toggle`, `CMP-table`, `CMP-note`, `CMP-delta`, `CMP-mapstrip`

### 화면 6 · `trace` 원문 추적 상세
- **여정 단계**: J4.4 원문 역추적(AC2.6, AC1.4)
- **가치**: V5 원문 추적성·재처리
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-lineage`, `CMP-card`, `CMP-crumb`, `CMP-kv`, `CMP-badge`, `CMP-table`, `CMP-mapstrip`

### 화면 7 · `reprocess` 재처리 콘솔
- **여정 단계**: J5.1 재처리 범위 선택(AC1.4, AC2.6), J5.2 재분석 실행(AC2.6), J5.3 전후 비교(AC3.2, AC3.3), J5.4 수집 무결성 점검(AC1.6)
- **가치**: V5 원문 추적성·재처리 (페르소나 P2 운영자)
- **디자인 시스템 항목**: `TKN-surface`, `TKN-ink`, `TKN-line`, `TKN-brand`, `TKN-sentiment`, `TKN-type`, `TKN-radius`, `TKN-shadow`, `PAT-screen-shell`, `PAT-before-after`, `PAT-integrity-panel`, `CMP-card`, `CMP-seg`, `CMP-table`, `CMP-kv`, `CMP-badge`, `CMP-mapstrip`

## 화면 간 이동(클릭 동선, 실제 링크)
- `dashboard.html` → `compare.html` ("3축 나란히 비교" 버튼), `dashboard.html` → `trend.html` (상위 대상 순위 행 클릭)
- `fairness.html` → `trace.html` (원천 기여 뉴스의 "원문 →" 행 클릭)
- `trace.html` → `reprocess.html` ("이 키로 재분석" 버튼)
- 좌측 네비(`<a href>`)에서 7개 페이지 임의 전환, `index.html`은 대시보드로 리다이렉트

## 여정 단계 커버리지 (19/19)
| 여정 | 단계 | 화면 |
|------|------|------|
| J1 | 1.1, 1.2 | `dash` |
| J1 | 1.3, 1.4 | `trend` |
| J2 | 2.1, 2.2, 2.3 | `compare` |
| J2 | 2.4 | `trend` (상세 목적지) |
| J3 | 3.1, 3.2, 3.3 | `sentiment` |
| J4 | 4.1, 4.2, 4.3 | `fairness` |
| J4 | 4.4 | `trace` |
| J5 | 5.1, 5.2, 5.3, 5.4 | `reprocess` |

## 가치 커버리지 (5/5)
| 가치 | 시각화 화면 |
|------|-------------|
| V1 시계열 추세 | `dash`, `trend`, `sentiment` |
| V2 지역 축 비교 | `compare` |
| V3 분위기 분포 | `sentiment` |
| V4 편차 보정 | `fairness` |
| V5 원문 추적·재처리 | `fairness`, `trace`, `reprocess` |

## 알려진 정제 항목 (mockup 한정)
- **J2.4 클릭 동선**: `compare`의 대상 행에서 `trend` 상세로 가는 명시적 클릭 어포던스는 아직 미배선. 상세 목적지 화면(`trend`) 자체는 존재하므로 단계는 시각화됨으로 간주하되, 행 클릭 연결은 후속 정제 대상.
- 데이터는 모두 예시(mock) 값이며 실제 파이프라인 연동 전 디자인 검토용이다.
