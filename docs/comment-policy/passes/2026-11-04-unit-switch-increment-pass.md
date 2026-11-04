# 2026-11-04 unit-switch-increment-pass — #292 가 들인 주석 증분 판정

판정 대상은 원장에서 `—` 인 행 중 **열린 PR 과 파일이 겹치지 않는 2행**(132줄)이다.
`handlers.go`(L)·`web/src/screens/Trend.tsx`(L)는 #292(trend 집계 단위 전환 `?unit=`)가 주석을 바꿔 증분 미판정으로 되돌아간 행이다.
`aggregate.py`(L·D)·`tests/test_aggregate.py` 3행은 열린 PR #287(AC3.4 「전체」 축 균등 평균)이 같은 파일을 고치고 있어
이 패스에서 뺐다 — 그 PR 이 주석을 다시 바꾸므로 지금 판정하면 낡는다. 열린 PR #294(contributions)는 `handlers.go` 가 아니라
`contributions.go` 를 고치므로 겹치지 않는다.

## 결과 — 제거 0 · 유지 2행 · 개작 0

## 유지 — 사유

- `go/internal/handlers/handlers.go` 증분 3줄(개작 1 · 신설 2, 옛 판정 유지분 93줄은 그대로).
  - `trend` 의 「Only one unit is drawn (… unless ?unit= asks for another) … Gold grows every batch run」 — 한 단위·유지할 대상만 읽는 이유(Gold 는 배치마다 자란다)의 개작이다.
    지우면 축의 모든 행을 읽던 예전 방식으로 돌아가 OOM 근거가 사라진다.
  - 「?unit= picks a coarser rollup … only when the axis really has rows for it; otherwise the finest unit answers … basis.bucket_unit tells the caller which one it got」 —
    요청한 단위에 행이 없으면 오류가 아니라 가장 잘게 쪼갠 단위로 답하고, 호출자는 `basis.bucket_unit` 으로 알아야 한다는 계약이다. 코드의 `units[asked]` 조건만으로는 이유와 신호 경로가 드러나지 않는다.
- `web/src/screens/Trend.tsx` 증분(옛 판정 유지분의 나머지는 그대로).
  - `unit` 상태 앞 「undefined 면 API 가 고른 단위(가장 잘게 쪼갠 쪽)를 따른다」 — 초기값 `undefined` 가 「미선택」이 아니라 서버 선택을 따른다는 뜻이다. 지우면 `undefined` 를 기본 단위 문자열로 채워 서버 선택을 덮어쓴다.
  - 재집계 effect 의 「단위만 바뀐 재집계는 컨트롤(라디오)이 사라지지 않게 이전 응답을 둔 채 차트만 비운다」 — 응답을 비우면 단위 컨트롤이 응답에서 그려지므로 전환 도중 사라진다. 코드만으로는 `reloading` 을 따로 두는 이유가 보이지 않는다.
  - 머리 주석의 「One thing is deliberately *not* here」(A 대상 추가 버튼) — 시간/일/주 스위치 항목이 걷혀 한 항목이 되었고, 남은 항목의 사유는 옛 판정과 같다.

## 범위 밖 (후속)

원장 `—` 3행: `aggregate.py` L(14줄)·D(35줄), `tests/test_aggregate.py` L(8줄) — PR #287 머지 뒤 재감지로 이어받는다.
