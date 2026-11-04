# 2026-11-04 sqrt-weight-increment-pass — #284(AC3.1 제곱근 가중)·#286 이 바꾼 주석 증분 판정

판정 대상은 원장에서 `—` 인 행 중 **열린 PR 과 파일이 겹치지 않는 3행**(27줄)이다.
`aggregate.py`(L·D)·`tests/test_aggregate.py` 3행은 열린 PR #287(AC3.4 「전체」 축 균등 평균)이 같은 파일을 고치고 있어
이 패스에서 뺐다 — 그 PR 이 주석을 다시 바꾸므로 지금 판정하면 낡는다. 후속 판정 슬라이스의 몫이다.

## 결과 — 제거 0 · 유지 3행 · 개작 1

## 유지 — 사유

- `tests/e2e/specs/aggregation-1-volume-normalization.spec.ts` 「기대 결과의 뒤 절 …」 3줄 — 소스 가중이 기사 수의 제곱근에
  비례해 부풀린 소스의 무게는 늘되 건수만큼은 아니라는 사실이, 단언이 `toBeCloseTo` 동치가 아니라 `(naive, 1]` 구간인 이유다.
  지우면 동치로 「되돌려」 의도된 가중 변경을 회귀로 읽는다. 나머지 12줄은 2026-10-01 판정 유지분 그대로.
- `contributions.py` 모듈 docstring — `fold_bucket` 항과 같은 식이라는 서술이 가중 도입 뒤에도 맞다. 사유(분해는 두 번째 계산이
  아니다)는 그대로.
- `scripts/journey-scenarios/JRN-subject-share.js` 5줄 — 선택자를 `[data-role]` 로 잡는 이유와 단계 진입 뒤에만 DOM 에 있는 컨트롤,
  도달 불가 상태를 딥링크로 여는 이유. 코드만으로는 드러나지 않는 제약이다.

## 개작

- spec 「소스별로 먼저 나눈 뒤 평균하므로」 → 「가중 평균하므로」. 코드가 가중 평균이 되어 문면이 틀려 있었다(틀린 주석은 사유가
  있으면 고친다).

## 범위 밖 (후속)

원장 `—` 3행: `aggregate.py` L(14줄)·D(35줄), `tests/test_aggregate.py` L(8줄) — PR #287 머지 뒤 재감지로 이어받는다.
