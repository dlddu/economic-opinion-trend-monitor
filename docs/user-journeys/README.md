# 사용자 여정 인덱스

> 여정 하나당 문서 하나. 식별자는 `JRN-<슬러그>` / 단계는 `STP-<슬러그>`(순번 금지).
> 가치: `../econ-opinion-monitor-values.md` · 설계 추적: `../econ-opinion-monitor-design-tracker.md` · mockup: `../mockups/econ-opinion-monitor-mockup-index.md`
>
> 마지막 갱신: 2026-10-13

## 여정 목록

| 여정 | 페르소나 | 달성 가치 | 단계 수 | 상태 |
|---|---|---|---|---|
| [`JRN-daily-scan`](JRN-daily-scan.md) 아침 정기 스캔 | P1 관찰자 | V1 | 4 | 초안 v0.3 |
| [`JRN-spike-verification`](JRN-spike-verification.md) 급등 신호의 진위 확인 | P1 관찰자 | V4, V5 | 6 | 초안 v0.1 |
| [`JRN-axis-contrast`](JRN-axis-contrast.md) 지역 온도차 확인 | P1 관찰자 | V2 | 5 | 초안 v0.2 |
| [`JRN-sentiment-shift`](JRN-sentiment-shift.md) 분위기 반전 감지 | P1 관찰자 | V3, V1 | 4 | 초안 v0.1 |
| [`JRN-ingestion-recovery`](JRN-ingestion-recovery.md) 수집 이상 감지·복구 | P2 운영자 | V5 | 5 | 초안 v0.1 |
| [`JRN-logic-backfill`](JRN-logic-backfill.md) 로직 개선의 소급 적용 | P2 운영자 | V5 | 5 | 초안 v0.1 |
| [`JRN-judgment-debug`](JRN-judgment-debug.md) 분석 판단 디버깅 | P2 운영자 | V5 | 5 | 초안 v0.1 |

총 34단계. 가치 V1~V5 모두 1개 이상 여정에서 달성됨(고아 가치 없음), 모든 여정이 존재하는 가치를 참조함(고아 여정 없음).

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

여정 단위 재편이 **7/7** 완료됐다. 모든 여정이 자기 전용 페이지 하나(`JRN-<슬러그>.html`)를 갖고,
흡수한 화면 파일은 전부 삭제됐다 — 화면 단위 mockup 은 **0개**다. 2026-09-24 신설한
`JRN-judgment-debug` 는 여정 문서와 같은 날 페이지가 착지했다.

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
