# 경제 여론 추세 모니터 설계·UX 문서 상태 추적

> 이 문서는 가치 → 사용자 여정 → mockup ↔ 디자인 시스템의 연결 상태를 추적한다.
> 제품(가치→PRD→AC→테스트) 측 추적은 `econ-opinion-monitor-doc-tracker.md`가 담당한다.
> 사용자 여정·mockup·디자인 시스템을 생성·수정할 때마다 함께 갱신한다.
>
> 마지막 갱신: 2026-08-29

## 현재 상태 요약
- 정의된 가치: **5개** (V1~V5, 가치 문서에서 참조)
- 사용자 여정: **6개** (`JRN-*`, 여정당 문서 하나 · 총 30단계 · 가치 연결됨 6개 / 미연결 0개)
- Mockup: **화면 7개** (페이지별 자립형 HTML, CSS·JS 인라인)
- 디자인 시스템: **정의됨** (토큰 9 · 컴포넌트 19 · 패턴 9)
- **건강 상태**: 🟡 **주의** — 가치↔여정 연결은 끊김이 없으나, 여정 재작성으로 단계가 19개 → 30개로 늘면서 **미시각화 5단계 · 부분 시각화 3단계**가 생겼다. mockup 이 화면 단위라 여정과 1:1 이 아닌 것이 근본 원인이다.
  가치 측 전제 위험(제품 소유자 미지정)은 product-doc-engineer 영역으로 별도 추적된다.

## 문서 목록
| 구분 | 파일 |
|------|------|
| 사용자 여정 | `user-journeys/JRN-*.md` (6개) + `user-journeys/README.md` (인덱스·구 식별자 매핑) |
| 디자인 시스템 | `design-system/econ-opinion-monitor-design-system.md` |
| Mockup 인덱스 | `mockups/econ-opinion-monitor-mockup-index.md` |
| Mockup(실파일) | `mockups/{dashboard,trend,compare,sentiment,fairness,trace,reprocess}.html` + `mockups/index.html` (각 페이지 자립형: CSS·JS 인라인) |
| 설계·UX 상태 추적 | `econ-opinion-monitor-design-tracker.md` |

## 가치 ↔ 여정 ↔ mockup 연결 매트릭스
| 가치 | 여정 | Mockup(화면) | 상태 |
|------|------|--------------|------|
| V1 시계열 추세 | `JRN-daily-scan`, `JRN-sentiment-shift` | `dash`, `trend`, `sentiment` | 🟢 시각화됨 |
| V2 지역 축 비교 | `JRN-axis-contrast` | `compare`, `trend` | 🟢 시각화됨 |
| V3 분위기 분포 | `JRN-sentiment-shift` | `sentiment` | 🟢 시각화됨 |
| V4 편차 보정 | `JRN-spike-verification` | `fairness` | 🟢 시각화됨 |
| V5 원문 추적·재처리 | `JRN-spike-verification`, `JRN-ingestion-recovery`, `JRN-logic-backfill` | `fairness`, `trace`, `reprocess` | 🟡 부분 — 운영 여정 2개가 `reprocess` 한 페이지에 섞임 |

## 여정 단계 → mockup 커버리지
| 여정 | 단계 수 | 시각화 | 부분 | 미시각화 |
|------|---------|--------|------|----------|
| `JRN-daily-scan` | 5 | 4 | 0 | 1 (`STP-shortlist`) |
| `JRN-spike-verification` | 6 | 5 | 0 | 1 (`STP-judge`) |
| `JRN-axis-contrast` | 5 | 4 | 1 (`STP-pick-outlier`) | 0 |
| `JRN-sentiment-shift` | 4 | 4 | 0 | 0 |
| `JRN-ingestion-recovery` | 5 | 2 | 2 (`STP-diagnose-source`, `STP-verify-integrity`) | 1 (`STP-backfill`) |
| `JRN-logic-backfill` | 5 | 3 | 0 | 2 (`STP-dry-run`, `STP-publish`) |
| **합계** | **30** | **22** | **3** | **5** |

## 위험 진단

### 🔴 가치 측 위험 (존재 이유 불분명)
- **고아 여정**: (없음) — 6개 여정 모두 존재하는 가치를 참조함.
- **고아 mockup**: (없음) — 7개 화면 모두 여정 단계·가치에 매핑됨.
- **인덱스 누락 mockup**: (없음) — 실파일 7개가 모두 인덱스에 등재됨.

### 🟡 시각화 누락 (구조적 공백)
- **미시각화 단계 5개**: `STP-shortlist`, `STP-judge`(관찰자 측 — 북마크·검증 이력 기능 부재), `STP-backfill`(운영 재수집 컨트롤 부재), `STP-dry-run`, `STP-publish`(재처리 표본 실행·반영 결정 부재).
- **부분 시각화 3개**: `STP-pick-outlier`(클릭 어포던스), `STP-diagnose-source`(실패 사유 미표시), `STP-verify-integrity`(결과만 표시).
- **여정↔mockup 1:1 위반**: 검증기는 여정 하나 = mockup 페이지 하나를 전제하나, 현재 mockup 은 화면 단위 7개다. `JRN-ingestion-recovery` 와 `JRN-logic-backfill` 이 `reprocess.html` 을 공유하고, `JRN-daily-scan`·`JRN-spike-verification`·`JRN-axis-contrast` 는 각각 2개 화면에 걸쳐 있다. → `journeys/<journey-id>/` 구조로 재편 필요.
- **시각화 없는 가치**: (없음) — V1~V5 전부 1개 이상 화면에서 시각화됨.

### 🟢 디자인 시스템 측 위험 (일관성)
- **디자인 시스템 부재**: 해소됨 — 토큰/컴포넌트/패턴이 정의되고 각 페이지의 `:root` 와 일치.
- **임의 스타일 mockup**: (없음) — 모든 화면이 정의된 디자인 시스템 항목을 사용한다고 인덱스에 명시됨.
- **사용처 없는 디자인 시스템 항목**: (없음) — 정의된 37개 항목(토큰9+컴포넌트19+패턴9)이 모두 1개 이상 화면에서 사용됨.
- **미정의 항목 사용**: (없음) — 인덱스가 참조하는 모든 항목이 디자인 시스템에 정의됨.
