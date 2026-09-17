# 경제 여론 추세 모니터 설계·UX 문서 상태 추적

> 이 문서는 가치 → 사용자 여정 → mockup ↔ 디자인 시스템의 연결 상태를 추적한다.
> 제품(가치→PRD→AC→테스트) 측 추적은 `econ-opinion-monitor-doc-tracker.md`가 담당한다.
> 사용자 여정·mockup·디자인 시스템을 생성·수정할 때마다 함께 갱신한다.
>
> 마지막 갱신: 2026-08-31

## 현재 상태 요약
- 정의된 가치: **5개** (V1~V5, 가치 문서에서 참조)
- 사용자 여정: **6개** (`JRN-*`, 여정당 문서 하나 · 총 30단계 · 가치 연결됨 6개 / 미연결 0개)
- Mockup: **여정 페이지 2개 + 화면 5개** (페이지별 자립형 HTML, CSS·JS 인라인)
- 디자인 시스템: **정의됨** (토큰 9 · 컴포넌트 19 · 패턴 9)
- **건강 상태**: 🟡 **주의** — 가치↔여정 연결은 끊김이 없다. 여정 단위 재편이 **2/6** 진행됐고(`JRN-sentiment-shift` 2026-08-30 · `JRN-axis-contrast` 2026-08-31), 남은 4개는 아직 화면 단위 mockup 에 걸쳐 있다. **미시각화 5단계 · 부분 시각화 2단계**가 남는다.
  가치 측 전제 위험(제품 소유자 미지정)은 product-doc-engineer 영역으로 별도 추적된다.

## 문서 목록
| 구분 | 파일 |
|------|------|
| 사용자 여정 | `user-journeys/JRN-*.md` (6개) + `user-journeys/README.md` (인덱스·구 식별자 매핑) |
| 디자인 시스템 | `design-system/econ-opinion-monitor-design-system.md` |
| Mockup 인덱스 | `mockups/econ-opinion-monitor-mockup-index.md` |
| Mockup — 여정 페이지 | `mockups/JRN-sentiment-shift.html` · `mockups/JRN-axis-contrast.html` (여정 하나 = 페이지 하나, 클릭되는 제품 프로토타입) |
| Mockup — 화면 단위(이관 대기) | `mockups/{dashboard,trend,fairness,trace,reprocess}.html` + `mockups/index.html` (각 페이지 자립형: CSS·JS 인라인) |
| 여정 mockup 게이트 | `scripts/check-journey-mockup.py`(정적 R1~R9) · `scripts/check-journey-flow.js`(DOM 하네스) · `scripts/journey-scenarios/<여정 식별자>.js`(페이지별 조작) · `.github/workflows/docs-journey-mockup.yml` |
| 설계·UX 상태 추적 | `econ-opinion-monitor-design-tracker.md` |

## 배포 상태
| 항목 | 상태 |
|------|------|
| 배포 골격 | `docs/index.html` · `docs/reader.html` · `docs/.nojekyll` 모두 존재 |
| 허브에서 도달 가능 | 문서 13개 · 여정 6개(문서 링크 + 대응 mockup 링크 — 이관된 2개는 여정 페이지를, 나머지 4개는 대응 화면을 가리킨다) · mockup 갤러리 1개 |
| **허브 디자인 시스템 적용** | 🟢 **적용됨** (2026-08-30) — `docs/index.html` 이 `:root` 토큰을 mockup 과 동일하게 인라인하고 serif/sans/mono 역할 분리·`--primary` 마스트헤드·`--accent` mockup 링크를 사용한다. 구획·링크·항목은 미변경. |
| 리더 디자인 시스템 적용 | 🟡 **미적용** — `docs/reader.html` 은 아직 중립(GitHub 기본) 팔레트. 리더는 스킬 템플릿 복사본이라 갱신 시 덮어써질 수 있어 별도 판단 필요. |

## 가치 ↔ 여정 ↔ mockup 연결 매트릭스
| 가치 | 여정 | Mockup(화면) | 상태 |
|------|------|--------------|------|
| V1 시계열 추세 | `JRN-daily-scan`, `JRN-sentiment-shift` | `dash`, `trend`, `JRN-sentiment-shift.html`(여정 페이지) | 🟢 시각화됨 |
| V2 지역 축 비교 | `JRN-axis-contrast` | `JRN-axis-contrast.html`(여정 페이지) | 🟢 시각화됨 |
| V3 분위기 분포 | `JRN-sentiment-shift` | `JRN-sentiment-shift.html`(여정 페이지) | 🟢 시각화됨 |
| V4 편차 보정 | `JRN-spike-verification` | `fairness` | 🟢 시각화됨 |
| V5 원문 추적·재처리 | `JRN-spike-verification`, `JRN-ingestion-recovery`, `JRN-logic-backfill` | `fairness`, `trace`, `reprocess` | 🟡 부분 — 운영 여정 2개가 `reprocess` 한 페이지에 섞임 |

## 여정 단계 → mockup 커버리지
| 여정 | 단계 수 | 시각화 | 부분 | 미시각화 |
|------|---------|--------|------|----------|
| `JRN-daily-scan` | 5 | 4 | 0 | 1 (`STP-shortlist`) |
| `JRN-spike-verification` | 6 | 5 | 0 | 1 (`STP-judge`) |
| `JRN-axis-contrast` | 5 | 5 | 0 | 0 |
| `JRN-sentiment-shift` | 4 | 4 | 0 | 0 |
| `JRN-ingestion-recovery` | 5 | 2 | 2 (`STP-diagnose-source`, `STP-verify-integrity`) | 1 (`STP-backfill`) |
| `JRN-logic-backfill` | 5 | 3 | 0 | 2 (`STP-dry-run`, `STP-publish`) |
| **합계** | **30** | **23** | **2** | **5** |

## 규칙 8 예외 등재 (mockup 을 두지 않기로 한 여정)

`tbm_econ-opinion-monitor-journey-mockup` 모델의 규칙 8 레지스트리다. 여기 등재된 여정은 여정 mockup
페이지가 없어도 drift 로 계수되지 않는다. **등재 없이 페이지만 없는 여정은 drift**이므로, 「이관하지
않기로 결정」했다면 반드시 여기에 사유와 재검토 시점을 남긴다.

`scripts/check-journey-mockup.py` 가 아래 표를 기계적으로 읽는다 — **행 형식이 계약이다.**
첫 칸이 백틱으로 감싼 여정 식별자이고, 같은 행에 `재검토` 라는 낱말이 있어야 등재로 인식된다.

```
| `JRN-<슬러그>` | 등재 사유 | 재검토 시점: YYYY-MM-DD |
```

| 여정 | 사유 | 재검토 |
|---|---|---|
| (등재 0건) | — | — |

> 현재 예외는 **0건**이며, 6개 여정 전부가 판정 대상이다. 형제 레포(`feature-doc`)가 `JRN-restore-history`
> 1건을 예외로 빼 판정 대상을 줄인 것과 달리 이 레포는 면제가 없다 — 이관이 유일한 해소 경로다.

## 위험 진단

### 🔴 가치 측 위험 (존재 이유 불분명)
- **고아 여정**: (없음) — 6개 여정 모두 존재하는 가치를 참조함.
- **고아 mockup**: (없음) — 여정 페이지 2개 + 화면 5개 모두 여정 단계·가치에 매핑됨.
- **인덱스 누락 mockup**: (없음) — 실파일 7개(여정 페이지 2 + 화면 5)가 모두 인덱스에 등재됨.

### 🟡 시각화 누락 (구조적 공백)
- **미시각화 단계 5개**: `STP-shortlist`, `STP-judge`(관찰자 측 — 북마크·검증 이력 기능 부재), `STP-backfill`(운영 재수집 컨트롤 부재), `STP-dry-run`, `STP-publish`(재처리 표본 실행·반영 결정 부재).
- **부분 시각화 2개**: `STP-diagnose-source`(실패 사유 미표시), `STP-verify-integrity`(결과만 표시). — `STP-pick-outlier`(클릭 어포던스)는 2026-08-31 `JRN-axis-contrast` 여정 페이지 이관으로 해소됨.
- **여정↔mockup 1:1 위반 (4/6 남음)**: 여정 하나 = mockup 페이지 하나가 목표인데 `JRN-sentiment-shift`(2026-08-30)·`JRN-axis-contrast`(2026-08-31)만 이관됐다. 남은 `JRN-daily-scan`·`JRN-spike-verification`·`JRN-ingestion-recovery`·`JRN-logic-backfill` 은 아직 화면 단위에 걸쳐 있고(`dash`·`trend`·`reprocess` 공유), **저마다 🔴 미시각화 단계를 하나 이상 안고 있어 제품 범위 확정이 선행**이다. 실측 상한은 `mockups/econ-opinion-monitor-mockup-index.md` 의 「규칙 1 미충족 여정 상한」 래칫이 관리한다(현재 4).
- **시각화 없는 가치**: (없음) — V1~V5 전부 1개 이상 화면에서 시각화됨.

### 🟢 디자인 시스템 측 위험 (일관성)
- **디자인 시스템 부재**: 해소됨 — 토큰/컴포넌트/패턴이 정의되고 각 페이지의 `:root` 와 일치.
- **임의 스타일 mockup**: (없음) — 모든 화면이 정의된 디자인 시스템 항목을 사용한다고 인덱스에 명시됨.
- **사용처 없는 디자인 시스템 항목**: (없음) — 정의된 37개 항목(토큰9+컴포넌트19+패턴9)이 모두 1개 이상 화면에서 사용됨.
- **미정의 항목 사용**: (없음) — 인덱스가 참조하는 모든 항목이 디자인 시스템에 정의됨.
- **임의 스타일 허브**: 해소됨 (2026-08-30) — 허브가 GitHub 기본 팔레트(`#0969da`/`#f6f8fa`)와 시스템 폰트를 쓰던 상태에서 디자인 시스템 토큰으로 재적용됨. 토큰 밖 색상 리터럴은 on-`--primary` 텍스트용 `#fff` 뿐(mockup `.brand h1`·`.btn.pri` 와 동일 관행).
- **임의 스타일 리더**: 남아 있음 — `docs/reader.html` 미적용. 위 배포 상태 표 참조.
