# 2026-09-28 — source-dimension-unpromote-pass

판정이 아니라 **행 소멸 2건**의 기록이다. 「소스 차원」의 AC 승격(AC3.9·AC3.10)이 사용자 결정으로
번복되면서 테스트-3 의 시나리오 9·10 과 그 전용 e2e spec 2개가 삭제됐고, 파일이 사라져 원장 L 표의
두 행이 R6(「행은 있으나 판정 대상 주석이 없는 파일」)으로 걸렸다. 정책대로 행을 지우고 이력을 여기 남긴다.

| 표면 | 범위 | 마지막 판정 | 지운 시점의 줄 수 · 지문 |
|---|---|---|---|
| L | `tests/e2e/specs/aggregation-10-contribution-articles.spec.ts` | 2026-09-27 [l-residual-axis-pass](2026-09-27-l-residual-axis-pass.md) (①②③④) | 14 · `e3b2f1040178` |
| L | `tests/e2e/specs/aggregation-9-source-contribution-sums.spec.ts` | 2026-09-27 [scenario9-spec-axis-pass](2026-09-27-scenario9-spec-axis-pass.md) (①②③④) | 19 · `8180399fda5d` |

게이트 자기출력(편집 전 → 후):

| 표면 | 전체 | 판정 완료 | 미판정(—) |
|---|---|---|---|
| L | 2615줄 191행 → **2582줄 189행** | 191행 2615줄 → **189행 2582줄** | 0 → 0 |
| D | 603줄 42행 (무접촉) | 42행 603줄 | 0 → 0 |
| E | 44줄 20행 (무접촉) | 20행 44줄 | 0 → 0 |

## 무접촉으로 둔 것

슬라이스 11·12 의 코드·계약에는 `AC3.9`·`AC3.10` 을 인용하는 주석·doc 문자열이 남아 있다
(`web/src/screens/Fairness.tsx`, `go/internal/handlers/contributions.go`·`contributions_test.go`,
`python/packages/aggregation/src/econ_aggregation/contributions.py`·`tests/test_source_contributions.py`,
`contracts/gold/subject_source_contribution.avsc` 와 그 생성물 `go/gen/gold.go`·`econ_core/models/gold.py`).
번복 뒤 그 인용은 원본(PRD-3)과 어긋나므로 정책상 **틀린 주석**이다. 이 변경에서 고치지 않은 이유는 둘이다 —
주석을 고치면 그 행들의 지문이 바뀌어 판정 축이 `—` 로 돌아가므로 후속 판정 슬라이스의 몫이고, `contracts/`
의 doc 문자열은 `scripts/check-data-format-change.py` 가 계약 변경으로 세어 사람 승인을 부르므로 별도 변경이 맞다.
