# 2026-11-01 window-ranking-increment-pass — #266 이 들인 기간 누적 순위 주석 증분 판정

판정 모집단은 원장에서 아직 `—` 인 행 **전부**다. `#275`(web·여정 하네스) · `#277`(spikes·aggregate 축)이 착지한 뒤
남은 `—` 는 다섯 행이고, 전부 `#266`(조회 조건 카드 정리 · 「전체」 축 · 기간 누적 순위) 이 들인 주석이다 —
`dashboard.go` · `dashboard_test.go` · `build.go` · `tests/test_aggregate.py`(L) · `tests/test_aggregate.py`(D).

`#277` 의 패스가 명시적으로 남긴 「PR #270(`rct_20261028-0001`)이 가져간 파일」이 그대로 이 패스의 범위다.
`#270` 은 원장 행이 겹치는 `#275`·`#277` 착지 때문에 base 가 밀려 충돌 상태이고, 그 PR 이 담고 있던 판정 행의
일부는 이미 다른 패스가 닫았다. 이 패스는 **남아 있는 행만** 다시 판정한다 — 이미 `완료` 가 된 행은 손대지 않는다.

증분은 L 77줄 · D 1줄(5개 행)이고 예산(400줄) 안이다.

## 결과 — 증분 78줄 중 제거 12 · 유지 66

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/dashboard.go` · L | 20 → 18 | 유지 8 · 제거 2 |
| `go/internal/handlers/dashboard_test.go` · L | 26 → 19 | 유지 12 · 제거 6 (+ 표 뒤 구분선 1) |
| `go/internal/servingindex/build.go` · L | 25 → 23 | 제거 2 (MA6) |
| `python/packages/aggregation/tests/test_aggregate.py` · L | 6 → 6 | 유지 1 |
| `python/packages/aggregation/tests/test_aggregate.py` · D | 1 → 0 | 제거 1 (행 삭제) |

제거 12줄은 전부 **재진술**이다. 동작 변경은 없다.

## 제거

- **코드·시그니처의 재진술** — `dashboard.go` `buildDashboard` doc 2줄 「창의 순위를 Gold 가 집계한 대로 매기고 스파크라인은 범위
  안 버킷에서 그린다」. 순위가 `subjects []gen.SubjectWindow`(Gold 창 집계)에서 오고 스파크라인이 `buckets` + `inWindow`
  에서 온다는 사실은 매개변수와 본문이 그대로 말한다. 「창 전체 기준이지 마지막 버킷이 아니다」는
  `dashboard_test.go` 의 단언 위 주석이 주인이다.
- **코드 재진술(데이터 사본)** — `dashboard_test.go` `writeDailyGold` doc 의 버킷·7d·24h 값 표 6줄. 표의 숫자는 바로 아래
  픽스처 리터럴을 그대로 옮긴 것이라 한쪽만 고쳐지면 거짓이 된다. 표 뒤 구분선 `//` 1줄도 표와 함께 걷는다(장식).
  「왜 그 모양인가」를 말하는 문단들(창을 읽어서 .40 이지 마지막 버킷 .45 가 아니다 · 삼성은 원 건수 1위지만 비중 3위)은
  남긴다.
- **열거 재진술** — `servingindex/build.go` `Stats` 의 「Gold 행 복사: subject_trend, …」 2줄. 바로 아래 필드 이름이 같은 다섯 이름을
  이미 나열한다(`SubjectTrends`·`SourceContributions`·`AxisSentiments`·`SubjectWindows`·`AxisWindows`).
- **이름의 재진술** — `test_aggregate.py` `_axes` docstring 「ALL 행을 뺀 수집 축의 행」. 함수 본문 한 줄
  (`row["axis"] != ALL_AXIS`)과 이름이 같은 말이다. 비공개 헬퍼라 docstring 유지를 요구하지 않는다.

## 유지 — 사유

- `dashboard.go` 8줄 — `dashRanges`(`/api/reprocess` 와 Gold `subject_window` 집계 창이 같은 범위 어휘를 써야 한다: 한쪽만 고치면
  순위가 빈다) · `dashUnitSpans`(범위 길이 단위는 점 하나로 그려져 앞이 비므로 더 짧은 단위만 받는다) ·
  `WindowStart`/`WindowEnd`/`HasBaseline`(델타의 기준은 직전 버킷이 아니라 **같은 길이의 직전 창**이다 — HasBaseline 이 거짓이면
  기준 구간이 비어 있다) · `Bucket`/`Buckets`(전 축 최신 버킷과 이 축 범위 안 버킷은 다른 값이다 — 섞으면 비교 앵커가 틀린다).
- `dashboard_test.go` 12줄 — 픽스처 배치도 머리 3줄(KR 세 날 · US 가 하루 일찍 멈춘 축 · 시간 롤업이 일 읽기에 새면 안 되는 배치 · 같은
  레이크를 집계한 창) — 단언이 잡으려는 누출을 픽스처가 담는 방식이라 그대로 두면 단언이 성립하지 않는다 · 순위가 창 전체
  기준이라서 .40 이지 06-23 버킷의 .45 가 아니라는 근거 3줄 · 원 건수 1위지만 비중 3위인 삼성(순위 이동 노트가 낚시하는 경우) 2줄 ·
  범위 길이 단위 쌍은 시간 단위로 읽는다는 근거 1줄 · 창 집계가 없는 레이크는 오류가 아니라 빈 순위라는 근거 1줄 ·
  `ALL` 은 Gold 에서 독립 축이라 합산이 아니라는 근거 2줄 · 공정성은 소스를 분해하는데 `ALL` 에는 소스 행이 없다는 근거 2줄.
- `test_aggregate.py` L 1줄 — `ALL` 행은 수집 축을 접은 합성 행이라 소스 분해는 수집 축으로만 한다. `aggregate.py` 의 `ALL_AXIS`
  머리와 `with_all_axis` docstring 이 설명의 주인이고 이 테스트는 그것이 어떻게 읽히는지를 보여 준다.
- `build.go` 나머지 23줄 · `dashboard.go` 나머지 10줄 · `dashboard_test.go` 나머지 7줄 · `test_aggregate.py` 나머지 5줄 — 옛 판정이
  닫은 분(증분이 아니라). 그대로 선다.

## MA6

`servingindex/build.go` 는 MA6 경로(`go/internal/servingindex/**` — 레이크 볼륨에 쓰는 Go 코드)다. 이 패스는 그 파일의
**주석 2줄만** 걷고 코드·데이터 형식은 건드리지 않는다. 다만 `scripts/check-data-format-change.py` 는 경로 변경을 보므로
이 PR 에는 `review/manual-approval` status 가 자동으로 붙지 않는다 — **사람 승인**이 필요하다(기본 브랜치 ruleset 이
`review/manual-approval` 을 required 로 요구한다). 승인 대상은 이 PR 의 head 커밋이다.

## 범위 밖 (이 패스가 가져가지 않은 것)

원장에 `—` 인 행이 더는 없다(이번 패스 후 L·D·E 전 표면 미판정 0행). 다만 다음이 남아 있다.

- `docs/comment-policy/` 밖의 주석은 이 모델의 범위 밖이다(제외 세 부류 · `comment-scope-exclude` 블록).
- 표면 소유권 — 지문 표면과 도구 공통 지시자는 템플릿 고정부(control plane)라 이 패스가 고치지 않는다.
- PR #270(`rct_20261028-0001`)은 base 가 밀려 충돌 상태이고 이 패스가 가져간 것과 같은 행을 담고 있다 — 이 패스의 PR 로 대체된다.
