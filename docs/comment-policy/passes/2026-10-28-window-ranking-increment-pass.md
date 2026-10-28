# 2026-10-28 window-ranking-increment-pass — #263~#267 증분 판정

창 = `8a483a3`→`24b477b`. 주석을 들인 커밋은 기능 PR 다섯(#263 기록 폼 제거 · #264 조회 조건 카드 · #265 급등 → 공정성 화면 ·
#266 「전체」 축·기간 누적 순위 · #267 요건 9 mockup)이고, 기능 PR 규칙대로 주석이 바뀐 행을 `—` 로 되돌렸다. 이 패스는 원장 운영
규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **그 PR 들이 들인 증분만** 판정한다. 기존 행의 옛 판정 줄은 그대로다.

이 패스가 가져간 덩어리는 Go 서빙(`go/internal/handlers/**` · `servingindex/**` · `store/store.go`) · Python 집계
(`python/packages/aggregation/**`) · `tests/e2e/lib/gold.ts` 의 11개 L 행과 D 행 4개(그중 하나는 주석이 0줄이 되어 행 삭제)다(주석 약 380줄 규모의 행). 가져가지 않은 것:
`web/src/tokens/tokens.css` 행(열린 PR #269 가 같은 파일을 고친다) · `scripts/**` · `web/src/api/types.ts` · `Dashboard.tsx` · E 행 둘 —
다음 슬라이스의 몫이다.

판정 모집단은 창 양 끝에서 파일별 주석 멀티셋 차로 뽑은 **추가 계수**다(L 약 58 · D 12).

## 결과

| 파일 · 표면 | 증분 | 처분 |
|---|---:|---|
| `go/internal/handlers/dashboard.go` · L | 10 | 유지 8 · 제거 2 |
| `go/internal/handlers/dashboard_test.go` · L | 18 | 유지 11 · 제거 7 |
| `go/internal/handlers/gold.go` · L | 2 | 유지 2 |
| `go/internal/handlers/handlers.go` · L | 2 | 유지 2 |
| `go/internal/handlers/spikes_test.go` · L | 8 | 유지 8 (신규 파일) |
| `go/internal/servingindex/build.go` · L | 2 | 제거 2 (MA6) |
| `go/internal/servingindex/schema.sql` · L | 2 | 유지 2 (MA6) |
| `go/internal/store/store.go` · L | 4 | 유지 4 |
| `python/.../aggregate.py` · L | 4 | 유지 4 |
| `python/.../tests/test_aggregate.py` · L | 1 | 유지 1 |
| `tests/e2e/lib/gold.ts` · L | 4 | 유지 4 |
| `python/.../aggregate.py` · D | 10 | 유지 10 |
| `python/.../tests/test_aggregate.py` · D | 1 | 제거 1 (행 삭제) |
| `python/.../tests/test_article_picks.py` · D | 1 | 유지 1 |
| `python/.../tests/test_source_contributions.py` · D | 1 | 유지 1 |

## 제거

- **코드 재진술 + 테스트 주석 사본** — `dashboard.go` `buildDashboard` doc 2줄 「창의 순위를 Gold 가 집계한 대로 매기고 스파크라인은 범위
  안 버킷에서 그린다」. 이름·매개변수가 같은 말을 하고, 「창 전체 기준이지 마지막 버킷이 아니다」는 `dashboard_test.go` 의 단언 위 주석이 주인이다.
- **코드 재진술(데이터 사본)** — `dashboard_test.go` `writeDailyGold` doc 의 버킷·7d·24h 값 표 7줄(구분 `//` 1줄 포함). 표의 숫자는 바로 아래
  픽스처 리터럴을 그대로 옮긴 것이라 한쪽만 고쳐지면 거짓이 된다. 「왜 그 모양인가」를 말하는 두 문단(창을 읽어서 .40 이지 마지막 버킷 .45 가 아니다 ·
  삼성은 원 건수 1위지만 비중 3위)은 남긴다.
- **열거 재진술** — `servingindex/build.go` `Stats` 의 「Gold 행 복사: subject_trend, …」 2줄. 바로 아래 필드 이름이 같은 다섯 이름을 이미 나열한다.
- **이름의 재진술** — `test_aggregate.py` `_axes` docstring 「ALL 행을 뺀 수집 축의 행」(함수 본문 한 줄과 이름이 같은 말).

## 유지 — 사유

- `dashboard.go` 8줄 — `dashRanges`(`/api/reprocess` 와 Gold `subject_window` 집계 창이 같은 범위 어휘를 써야 한다: 한쪽만 고치면 순위가 빈다) ·
  `dashUnitSpans`(범위 길이 단위는 점 하나로 그려져 앞이 비므로 더 짧은 단위만 받는다) · `WindowStart/End/HasBaseline`(HasBaseline 이 거짓이면 델타의
  기준 구간이 비었다) · `Bucket`/`Buckets`(전 축 최신 버킷과 이 축 범위 안 버킷은 다른 값이다 — 섞으면 비교 앵커가 틀린다).
- `dashboard_test.go` 11줄 — 픽스처 설명 2문단(위) · 기간 누적 순위가 창 전체 기준이라는 단언의 이유 · 범위 길이 단위 쌍은 시간 단위로 읽는다 ·
  창 집계가 없는 레이크는 오류가 아니라 빈 순위다 · `ALL` 은 Gold 에서 독립 축이라 합산이 아니다 · 공정성은 소스를 분해하는데 `ALL` 은 소스 행이 없다.
- `gold.go`·`store.go` — 인터페이스 메서드 계약(두 구현 `lakeGold`·`indexGold` 가 맞춰야 할 파일 순서·두 기간) · export 식별자 1줄 doc(수준이 요구).
- `handlers.go` `axisOrAllParam` 2줄 — `ALL` 은 `subject_trend`·`axis_sentiment` 에만 있으므로 그 둘만 읽는 화면만 받는다. 다른 화면이 쓰면 빈 결과가 나온다.
- `spikes_test.go` 8줄 — 환율·금리·주택·반도체 행이 왜 그 배수로 나오는가(원 건수와 비중의 배수 차 · 빠진 날은 0 으로 센다 · 신규 대상은 배수가 없다). 단언의
  기대값이 이 규칙에서 나오므로 지우면 숫자만 남는다.
- `schema.sql` 2줄 — 창 집계 테이블의 출처 계약(`subject_window.avsc`·`axis_window.avsc`)과 용도. 같은 형식의 인접 헤더(유지)와 한 묶음.
- `aggregate.py` 14줄(L 4 · D 10) — `ALL` 축은 모든 축의 소스를 한 버킷으로 읽는 축이고 소스 수가 많은 축이 더 무겁다(AC3.1) · 창 길이는 서빙 층이
  부르는 이름과 같은 시간 단위 · 현재 창은 가장 늦게 수집된 시각에서 끝나므로 수집이 멈춘 축은 더 비어 보인다(옛 창이 아니다) · `counts`·`tally` 의 중첩
  키 모양은 타입으로 선언되지 않았다.
- `test_aggregate.py` 1줄 · `test_article_picks.py`·`test_source_contributions.py` docstring — `ALL` 행은 수집 축을 접은 합성 행이라 소스 분해는 수집 축으로만 한다는 이유.
- `tests/e2e/lib/gold.ts` 4줄 — spec 이 견주는 Bronze 교차표에는 `ALL` 축이 없어 두 리더가 `ALL` 행을 뺀다는 이유(없으면 spec 이 존재하지 않는 축에서 어긋난다).
