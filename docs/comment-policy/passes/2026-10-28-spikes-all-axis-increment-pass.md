# 2026-10-28 spikes-all-axis-increment-pass — #265·#266 이 들인 나머지 주석 증분 판정

판정 모집단은 원장에서 아직 `—` 인 행 가운데 **열린 PR #270 이 가져간 파일(`dashboard.go` · `dashboard_test.go` · `build.go` · `tests/test_aggregate.py`)을 뺀 나머지 전부**다.
옛 판정(`2026-10-13-gold-index-increment-pass` 등)이 마지막으로 닫은 시점(`8a483a3`)과 현재 지문을 대조해 **그 뒤에 들어온 주석만** 시험했다 — 옛 유지분은 같은 사유로 그대로 선다.
증분은 L 26줄 · D 12줄(10개 행)이고 예산(400줄) 안이다.

## 결과 — 증분 38줄 중 제거 9 · 유지 29

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/gold.go` · L | 19 → 19 | 유지 2 |
| `go/internal/handlers/handlers.go` · L | 93 → 93 | 유지 2 |
| `go/internal/handlers/spikes_test.go` · L | 8 → 2 | 유지 2 · 제거 6 |
| `go/internal/servingindex/schema.sql` · L | 15 → 15 | 유지 2 |
| `go/internal/store/store.go` · L | 47 → 47 | 유지 4 |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` · L / D | 12 → 12 / 32 → 31 | 유지 4 / 유지 9 · 제거 1 |
| `python/packages/aggregation/tests/test_article_picks.py` · D | 3 → 2 | 제거 1 |
| `python/packages/aggregation/tests/test_source_contributions.py` · D | 13 → 12 | 제거 1 |
| `tests/e2e/lib/gold.ts` · L | 57 → 57 | 유지 4 |

## 제거

- **코드·단언의 재진술** — `spikes_test.go` `writeSpikeGold` 위 대상별 기대 배수 표 6줄. 입력 리터럴은 바로 아래 `trendRow` 호출에, 배수·`Spike`·`NormalizedAway`·`IsNew` 는 테스트 단언에, 「없는 날은 0」 근거는 단언 메시지에 이미 있다.
- **코드 재진술** — `aggregate.py` `window_articles` 의 「직전 창은 같은 길이로 바로 앞」 1문장. `bounds` 계산이 그대로 말한다.
- **다른 주석의 사본** — 두 테스트 파일의 `_axes` docstring. 「`ALL` 은 축의 소스를 접은 것」 은 `aggregate.py` 의 `ALL_AXIS` 머리와 `with_all_axis` docstring 이 주인이고, 필터 `!= ALL_AXIS` 가 바로 아래에 있다.

## 유지 — 사유

- `gold.go` 2 — `subjectWindows`·`axisWindows` 인터페이스 doc. 두 구현(레이크·인덱스)이 맞춰야 할 계약(파일 순서 · 두 기간 모두)이라, 인덱스 쪽이 `ORDER BY seq` 를 빠뜨리거나 한 기간만 읽으면 호출부가 조용히 어긋난다.
- `handlers.go` 2 — `axisOrAllParam` doc. `ALL` 은 `subject_trend`·`axis_sentiment` 에만 있으므로 다른 화면의 `axisParam` 을 이 함수로 바꿔 끼우면 `ALL` 요청이 빈 화면이 된다.
- `spikes_test.go` 2 — `writeSpikeGold` 머리. 7일 기준 구간(06-16..06-22)과 06-01 이 30일에서만 들어온다는 배치가 30일 테스트의 버킷 8개와 `150.0/8` 의 출처다.
- `schema.sql` 2 — 윈도 집계 표 머리. `contracts/gold/*_window.avsc` 포인터이고, 한 행이 한 범위의 한 기간이라 24h/7d/30d 와 직전 구간이 같은 표에 든다는 사실이 이 표의 읽는 법이다. 소스 무접촉(MA6 경로이지만 전부 유지).
- `store.go` 4 — `SubjectWindowsWhere`·`AxisWindowsWhere`·`EachSubjectWindow`·`EachAxisWindow` export doc 첫 줄(doc 주석 수준).
- `aggregate.py` L 4 — `ALL_AXIS` 머리(수집 축이 아니라 집계가 더하는 축이다 — 수집 축 루프에 넣으면 Bronze 에 없는 축을 찾는다) · `WINDOW_RANGES` 머리(키는 서빙이 `range` 로 조회하는 이름이다 — 바꾸면 대시보드가 조용히 빈다) · 윈도 중첩 dict 형태 표기 2(`counts`·`tally` — 형태를 되짚는 비용).
- `aggregate.py` D 9 — `keyed_articles`·`with_all_axis`·`window_articles`·윈도 결과 타입 요약 4(공개 요약) · `with_all_axis` 의 소스 가중 2줄(`ALL` 의 점유율은 축 점유율의 평균이 아니다 — 평균으로 「고치면」 값이 어긋난다) · `window_articles` 의 현재 창 정의 3줄(모든 축이 같은 마지막 시각에서 끝나므로 수집을 멈춘 축은 옛 창이 아니라 더 빈 창을 보인다 · 창 안 여러 시각에 관측된 기사는 마지막 관측으로 읽는다).
- `gold.ts` 4 — `ALL_AXIS` 머리 3줄(spec 이 견주는 Bronze 교차표는 수집 축별이라 `ALL` 이 없다 — 리더가 `ALL` 행을 빼지 않으면 Gold 쪽에만 행이 남아 어긋난다) · `subjectTrendsAllUnits` JSDoc 요약 1줄.

## 범위 밖 (이 패스가 가져가지 않은 것)

PR #270(`rct_20261028-0001`)이 가져간 `dashboard.go` · `dashboard_test.go` · `build.go` · `tests/test_aggregate.py`(L·D) 는 #270 이 착지하면 `완료` 가 된다. 두 PR 은 원장의 서로 다른 행만 건드린다.
