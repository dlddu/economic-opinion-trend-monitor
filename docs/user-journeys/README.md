# 사용자 여정 인덱스

> 여정 하나당 문서 하나. 식별자는 `JRN-<슬러그>` / 단계는 `STP-<슬러그>`(순번 금지).
> 가치: `../econ-opinion-monitor-values.md` · 설계 추적: `../econ-opinion-monitor-design-tracker.md` · mockup: `../mockups/econ-opinion-monitor-mockup-index.md`
>
> 마지막 갱신: 2026-11-02

## 여정 목록

| 여정 | 페르소나 | 달성 가치 | 단계 수 | 상태 |
|---|---|---|---|---|
| [`JRN-subject-share`](JRN-subject-share.md) 서술 대상 비율 조회 (허브) | P1 관찰자 | V1, V4 | 4 | 초안 v0.1 |
| [`JRN-subject-sentiment`](JRN-subject-sentiment.md) 서술 대상 분위기 비율 조회 | P1 관찰자 | V3, V4 | 4 | 초안 v0.1 |
| [`JRN-subject-articles`](JRN-subject-articles.md) 서술 대상 원문 목록 조회 | P1 관찰자 | V5, V4 | 4 | 초안 v0.1 |
| [`JRN-subject-trend`](JRN-subject-trend.md) 서술 대상 건수·비율 추세 조회 | P1 관찰자 | V1, V4 | 4 | 초안 v0.1 |
| [`JRN-source-share`](JRN-source-share.md) 출처별 서술 대상 비율 비교 | P1 관찰자 | V4 | 4 | 초안 v0.1 |
| [`JRN-axis-share`](JRN-axis-share.md) 축별 서술 대상 비율 비교 | P1 관찰자 | V2, V3 | 4 | 초안 v0.1 |
| [`JRN-ingestion-recovery`](JRN-ingestion-recovery.md) 수집 이상 감지·복구 | P2 운영자 | V5 | 5 | 초안 v0.1 |
| [`JRN-logic-backfill`](JRN-logic-backfill.md) 로직 개선의 소급 적용 | P2 운영자 | V5 | 5 | 초안 v0.1 |
| [`JRN-judgment-debug`](JRN-judgment-debug.md) 분석 판단 디버깅 | P2 운영자 | V5 | 5 | 초안 v0.1 |

현행 여정 9개 · 총 39단계. 가치 V1~V5 모두 1개 이상 여정에서 달성됨(고아 가치 없음), 모든 여정이 존재하는 가치를 참조함(고아 여정 없음).

### 관찰자 여정의 구조 (2026-11-02 재편)

관찰자 여정은 계기(아침 스캔·급등 의심·집필 중 확인·논조 반전) 중심 4개에서 **기능 중심 6개**로 재편됐다.
`JRN-subject-share` 가 허브이고, 대상을 고르면 분위기·원문·추세 세 여정으로 갈라진다. 출처별·축별 비교
두 여정은 허브와 나란히 서며, 비교 화면에서 고른 대상도 출처·축 조건을 유지한 채 같은 세 여정으로 들어간다.

```
JRN-subject-share ──┬─> JRN-subject-sentiment
JRN-source-share  ──┼─> JRN-subject-articles
JRN-axis-share    ──┴─> JRN-subject-trend
```

공통 규칙:

- **정규화 전/후 전환**은 수치를 보여 주는 다섯 여정(대상 비율·분위기·추세·출처별·축별) 모두에 둔다. 출처별
  표는 한 행이 출처 하나라 출처 간 가중이 없으므로 「비율 ↔ 건수」 전환이다.
- **출처 구성 확인**(한 대상의 언급이 어느 출처에서 몇 건 왔는지)은 원문 목록 여정이 목록 위 요약으로 맡는다.
- **조회 조건 승계** — 축·기간·단위·정규화 여부, 비교에서 들어왔다면 출처·축 조건까지 상세 여정으로 넘긴다.
- 정규화 방식은 PRD `../econ-opinion-monitor-prd-aggregation-viz.md` AC3.1·AC3.4 가 단일 출처다
  (출처별 기사 수의 제곱근 비례 가중 · 언급 단위 계수 · 「전체」는 세 축 균등 평균 · 분위기도 같은 방식).

### 폐기 여정 (mockup 착지 전까지 보존)

| 폐기 여정 | 단계 수 | 후속 |
|---|---|---|
| [`JRN-daily-scan`](JRN-daily-scan.md) 아침 정기 스캔 | 4 | `JRN-subject-share` · `JRN-subject-trend` |
| [`JRN-spike-verification`](JRN-spike-verification.md) 급등 신호의 진위 확인 | 6 | `JRN-subject-articles` (정규화 전환은 공통 단계로) |
| [`JRN-axis-contrast`](JRN-axis-contrast.md) 지역 온도차 확인 | 5 | `JRN-axis-share` |
| [`JRN-sentiment-shift`](JRN-sentiment-shift.md) 분위기 반전 감지 | 4 | `JRN-subject-sentiment` |

네 문서와 그 mockup 페이지는 운영 여정 페이지의 좌측 네비·분기가 아직 가리키고 있어 바로 지우지 않는다.
후속 여정의 mockup 이 착지하는 PR 에서 문서·페이지·네비·분기를 함께 옮기고 삭제한다.

## 구 식별자 매핑

기존 통합 문서 `econ-opinion-monitor-user-journeys.md`는 삭제됐고(내용은 git 이력에 남는다), 그 안의 `J1`~`J5`는 아래로 대체된다. 트래커·mockup 인덱스·포털·mockup 배지의 참조는 모두 이전 완료.

| 구 | 신 |
|---|---|
| J1 (추세 파악) | `JRN-daily-scan` |
| J2 (3축 비교) | `JRN-axis-contrast` |
| J3 (분위기 분포) | `JRN-sentiment-shift` |
| J4 (공정성·원문 추적) | `JRN-spike-verification` |
| J5.1~5.3 (재처리) | `JRN-logic-backfill` |
| J5.4 (수집 무결성) | `JRN-ingestion-recovery` |

`J5`가 성격이 다른 두 계기(운영 사고 대응 / 계획된 로직 변경)를 담고 있어 두 여정으로 분리했다.

## 여정 ↔ mockup 현황

**2026-11-02 관찰자 여정 재편으로 새 여정 6개가 mockup 없이 들어왔다.** 여정 문서 13개 중 여정 페이지를
가진 것은 7개(폐기 4 + 운영 3)이고, 새 관찰자 여정 6개는 아직 페이지가 없다 — mockup 인덱스의
「규칙 1 미충족 여정 상한」을 6 으로 올려 등재했다. 새 여정 페이지는 `journey-mockup-builder` 로 그리며,
페이지가 착지할 때마다 상한을 하나씩 낮추고 대응하는 폐기 여정의 문서·페이지를 걷어 낸다.

| 새 여정 | 대응 mockup | 다시 그릴 출발점 |
|---|---|---|
| `JRN-subject-share` | ⬜ 없음 | `JRN-daily-scan.html` 화면 1~3 |
| `JRN-subject-sentiment` | ⬜ 없음 | `JRN-sentiment-shift.html` (대상 단위로) |
| `JRN-subject-articles` | ⬜ 없음 | `JRN-spike-verification.html` 기여 뉴스·원문 단계 |
| `JRN-subject-trend` | ⬜ 없음 | `JRN-daily-scan.html` 화면 4 |
| `JRN-source-share` | ⬜ 없음 | (신규 화면) |
| `JRN-axis-share` | ⬜ 없음 | `JRN-axis-contrast.html` |

아래는 재편 전 기준의 현황이다(폐기 여정 포함, 이력으로 남긴다).

| 여정 | 대응 mockup | 미시각화·부분 단계 |
|---|---|---|
| `JRN-daily-scan` | ✅ `JRN-daily-scan.html` (여정 페이지 — 구 `dash`·`trend` 흡수·삭제) | (없음) |
| `JRN-spike-verification` | ✅ `JRN-spike-verification.html` (여정 페이지 — 구 `fairness`·`trace` 흡수·삭제) | (없음) |
| `JRN-axis-contrast` | ✅ `JRN-axis-contrast.html` (여정 페이지 — 구 `compare` 흡수·삭제) | (없음) |
| `JRN-sentiment-shift` | ✅ `JRN-sentiment-shift.html` (여정 페이지 — 구 `sentiment` 흡수·삭제) | (없음) |
| `JRN-ingestion-recovery` | ✅ `JRN-ingestion-recovery.html` (여정 페이지 — 운영 축 화면을 이 여정 맥락의 원본으로 새로 그림) | (없음) |
| `JRN-logic-backfill` | ✅ `JRN-logic-backfill.html` (여정 페이지 — 구 `reprocess` 흡수·삭제) | (없음) |
| `JRN-judgment-debug` | ✅ `JRN-judgment-debug.html` (여정 페이지 — 새로 그린 운영 화면, 좌측 네비 항목 `debug`) | (없음) |

단계 커버리지 34/34(완전) · 0(부분) · 0(미시각화). 상세는 `../mockups/econ-opinion-monitor-mockup-index.md`.

마지막까지 남아 있던 두 운영 여정(`JRN-ingestion-recovery`·`JRN-logic-backfill`)은 `reprocess` 화면을
공유했기에 제품 범위를 먼저 확정하고 이관했고, 그 과정에서 남아 있던 🔴 미시각화 단계가 모두 해소됐다.
`STP-judge` 는 여정 페이지의 판정 화면으로 해소됐으나, 그 단계가 적은 「검증 이력·플래그」 영속화는
문서가 파킹한 백로그 그대로다 — 판정은 세션 안에서만 유지된다. `JRN-daily-scan` 의 옛 마지막 단계
`STP-shortlist`(추림)는 2026-10-13 단계 집합에서 뺐다(5→4단계) — 그 행동은 제품 밖에서 일어나고, 추림 폼은
AC 근거 없는 mockup 표면이었다. 같은 날 `JRN-axis-contrast` 의 온도차 판별 기록 폼도 같은 이유로 걷어냈다.
mockup 을 두지 않기로 한 여정은 `../econ-opinion-monitor-design-tracker.md` 의 「규칙 8 예외 등재」에
사유·재검토 시점을 적어야 하며, 현재 등재는 0건이다.
