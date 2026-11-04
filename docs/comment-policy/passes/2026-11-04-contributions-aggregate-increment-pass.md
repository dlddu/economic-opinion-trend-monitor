# 2026-11-04 contributions-aggregate-increment-pass — #294·#287 이 들인 주석 증분 판정

판정 대상은 원장에서 `—` 이던 4행(L 3행 · D 1행, 90줄)이다. #294(AC3.12 소스 구성 요약 `/api/contributions`)와
#287(AC3.4 「전체」 축 균등 평균)이 머지되어 `aggregate.py` 등이 더는 바뀌는 중이 아니므로 앞선 패스가 미룬 3행을 함께 닫는다.
열린 PR #280(Fairness 화면)·#220(문서)은 이 4개 파일과 겹치지 않는다.

## 결과 — 제거 1줄 · 유지 4행 · 개작 0

## 제거

- `go/internal/handlers/contributions.go` `composeSources` doc 의 「so a collector Gold has no row for still shows up, at zero」.
  같은 사실(Gold 행이 없는 수집처는 0)을 `contributionSource` doc 이 이미 말한다 — 다른 주석의 재진술이다. 남은 두 문장은 「목록이 어느 수집처가 나오는지의 정본이고 Gold 는 무게만 준다」는 설계 경계다.

## 유지 — 사유

- `contributions.go`
  - `contributionSource` doc — 두 필드가 `Listed` 가 아니라 집계의 `subject_source_contribution` 행에서 온다는 것(그래서 기여 열의 합이 주제 정규화 점유율과 같다). 지우면 `Listed` 로 다시 계산해 합이 어긋난다.
  - `Concentration` 필드 doc — 필터 이전 목록 기준이라 소스 필터가 값을 움직이면 안 된다는 가드.
- `aggregate.py` L(증분)
  - AC3.1 가중 주석 — 가중치 합이 1이고 기사 없는 소스의 가중이 0이라는 계약. 코드의 제곱근 식만으로는 정규화 가정이 드러나지 않는다.
  - 윈도 중첩 dict 표기 2(`counts`·`tally`) — 옛 판정과 같은 사유(형태를 되짚는 비용).
- `aggregate.py` D(증분)
  - `with_all_axis` 본문 — 주제 없는 축이 평균에서 빠지고 나머지가 무게를 나누며 없는 주제는 0으로 센다는 계약(AC3.4). 지우면 평균을 「고쳐」 값이 어긋난다.
  - `SourceCounts` 본문 — 언급 수와 기사 수가 다른 이유와 각각의 쓰임(점유율 / 무게). 지우면 둘 중 하나로 합친다.
  - 모듈·`_bucket`·`Windows`·`window_articles` 등 나머지는 옛 판정 유지분 그대로.
- `tests/test_aggregate.py`
  - 기본 단위가 시간이라는 단언 앞 — 첫 단위만 알아보는 독자가 기본값을 받는다는 이유.
  - `ALL` 행 픽스처 두 곳 — 축당 기사 수와 무관하게 같은 무게라는 것, 한 축만 보고하는 시간의 분모. 지우면 기대값이 왜 1/2 인지 다시 유도해야 한다.
  - AC3.1 예시 — 합산·균등·제곱근 가중이 갈리는 값을 고른 이유.

## 범위 밖

없음. 이 패스는 원장 미판정 4행 전부를 닫는다.
