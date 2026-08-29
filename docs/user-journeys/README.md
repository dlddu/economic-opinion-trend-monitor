# 사용자 여정 인덱스

> 여정 하나당 문서 하나. 식별자는 `JRN-<슬러그>` / 단계는 `STP-<슬러그>`(순번 금지).
> 가치: `../econ-opinion-monitor-values.md` · 설계 추적: `../econ-opinion-monitor-design-tracker.md` · mockup: `../mockups/econ-opinion-monitor-mockup-index.md`
>
> 마지막 갱신: 2026-08-29

## 여정 목록

| 여정 | 페르소나 | 달성 가치 | 단계 수 | 상태 |
|---|---|---|---|---|
| [`JRN-daily-scan`](JRN-daily-scan.md) 아침 정기 스캔 | P1 관찰자 | V1 | 5 | 초안 v0.1 |
| [`JRN-spike-verification`](JRN-spike-verification.md) 급등 신호의 진위 확인 | P1 관찰자 | V4, V5 | 6 | 초안 v0.1 |
| [`JRN-axis-contrast`](JRN-axis-contrast.md) 지역 온도차 확인 | P1 관찰자 | V2 | 5 | 초안 v0.1 |
| [`JRN-sentiment-shift`](JRN-sentiment-shift.md) 분위기 반전 감지 | P1 관찰자 | V3, V1 | 4 | 초안 v0.1 |
| [`JRN-ingestion-recovery`](JRN-ingestion-recovery.md) 수집 이상 감지·복구 | P2 운영자 | V5 | 5 | 초안 v0.1 |
| [`JRN-logic-backfill`](JRN-logic-backfill.md) 로직 개선의 소급 적용 | P2 운영자 | V5 | 5 | 초안 v0.1 |

총 30단계. 가치 V1~V5 모두 1개 이상 여정에서 달성됨(고아 가치 없음), 모든 여정이 존재하는 가치를 참조함(고아 여정 없음).

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

현재 mockup은 **화면 단위**(7개 페이지)로 만들어져 있어 여정과 1:1이 아니다. `design-doc-structure-validator`는 여정 하나 = mockup 페이지 하나를 전제하므로 재구성이 필요하다.

| 여정 | 현재 대응 화면 | 미시각화·부분 단계 |
|---|---|---|
| `JRN-daily-scan` | `dash`, `trend` | 🔴 `STP-shortlist` |
| `JRN-spike-verification` | `dash`, `fairness`, `trace` | 🔴 `STP-judge` |
| `JRN-axis-contrast` | `compare`, `trend` | 🟠 `STP-pick-outlier`(클릭 어포던스) |
| `JRN-sentiment-shift` | `sentiment` | (없음 — 1:1 근접) |
| `JRN-ingestion-recovery` | `reprocess` 일부 | 🔴 `STP-backfill` · 🟠 `STP-diagnose-source`, `STP-verify-integrity` |
| `JRN-logic-backfill` | `reprocess` | 🔴 `STP-dry-run`, `STP-publish` |

단계 커버리지 22/30(완전) · 3(부분) · 5(미시각화). 상세는 `../mockups/econ-opinion-monitor-mockup-index.md`.
