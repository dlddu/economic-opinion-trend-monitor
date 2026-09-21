# rollup-test-pass — `test_aggregate.py` 가 #38·#62 로 들인 18줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `1f508e1`(#105 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([dash-brief-pass](2026-09-21-dash-brief-pass.md))가 말미에 「다음 패스의 선은
`python/packages/aggregation/tests/test_aggregate.py` +18(⑵ 최대)」로 이름 붙인 한 파일의 **증가분만** 판정한다.
추적 task는 `rct_20260921-0012`(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **제거 12줄 / 유지 6줄**(그중 정정 3자리 — 2→1 · 7→2 · 2→1 로 줄인 자리, 지문상 −6 은 위 12 에 들어 있다)
+ 옛 1줄 무접촉. 레포 전체 지문은 `2498 → 2486`(파일 `134 → 134`). 실행 코드는 한 바이트도 바뀌지 않았다 — diff 에서 주석이
아닌 줄의 추가·삭제는 0 이고 `pytest`(11 passed)·`ruff check`·`ruff format --check` 는 편집 전후 같은 결과다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

`git blame -s` 로 이 파일의 주석 줄 19줄을 커밋별로 나누면:

| 커밋 | 줄 수 | 자리 | 판정 상태 |
|---|---:|---|---|
| `bb1b56b` (#1) | 1 | `:98` 미분석 분리 `(AC3.4)` | initial-pass 가 유지(남음 1 「테스트 의도(AC 태그 판단 분기)」) — 이 패스 무접촉 |
| `33e24ea` (#38) | 5 | `:42-43` 코퍼스 설계 2 · `:69` 첫 버킷 1 · `:73` `%p (AC3.3)` 1 · `:78` `raw_count (AC3.8)` 1 | **이 패스** |
| `32faf64` (#62) | 13 | `:103` 구분선 1 · `:104-109` 코퍼스 설계 6 · `:135` ISO 주 1 · `:149-150` finest-first 2 · `:164`·`:168`·`:172` 합산 단정 서술 3 | **이 패스** |

행의 옛 1줄(`bb1b56b`)은 #38·#62 가 갈아 쓰지 않았다 — 그래서 증가분만 판정해도 행의 불변식(「남음」 == 비고가 열거하는 줄 수)이
선다: 남은 7 = 1 + 6.

## 복원처 — 구현 docstring 이 주인이고, PR 본문·doc-tracker 가 같은 문장을 적는다

이 18줄의 특징은 dash-brief-pass 와 다르다. 화면 쪽은 PR 본문이 설계 근거의 유일한 산문이었지만, 여기서는 **집계 구현
자신의 모듈 docstring**(`econ_aggregation/aggregate.py:16-30`, #38·#62 가 같은 커밋으로 쓴 것)이 delta·spark·롤업의 근거를
한 문단씩 적고, 같은 문장을 PR 본문(③)과 doc-tracker(②)가 옮겼다. 테스트 주석은 그 셋의 **네 번째 사본**이었다.

| 복원처 | 위치 |
|---|---|
| ① 구현 docstring | `aggregate.py:16-20`(첫 버킷의 delta 0.0 · 단일점 spark) · `:22-30`(롤업 = 같은 원천을 더 굵게 자른 같은 집계, 일 raw_count = 시간 합) · `:41-42`(`BUCKET_UNITS` finest first · 「기본 단위는 시간」) · `_bucket` docstring `:51-58` + `:66-67`(ISO 주 번호 연도) · `_all_units` docstring `:193`·`:200` 「finest first (AC3.3 rollups)」 |
| ① 코드 | `_SPAN` 다섯 stamp · 단언 `_bucket(…, "week") == "2026-W26"` / `"2026-W27"` · `weeks[("2026-W26","A")] == days[23] + days[28]` · `sum(raw_count) == len(_SPAN)` · `bucket[:10] == day` · `delta == 0.0` · `spark == [0.5]` · `25.0` / `-25.0` · 테스트 이름 `test_every_unit_is_emitted_finest_first` · `test_rollup_raw_counts_equal_the_sum_of_the_finer_buckets` |
| ② PRD | `docs/econ-opinion-monitor-prd-aggregation-viz.md` AC3.3 「기본 단위는 시간이며, 더 긴 구간(일·주)으로 롤업할 수 있다 / 롤업 시 합산이 일관되는지」 |
| ② doc-tracker 2026-09 | `:47-56` AC3.3 착지 문단 — 「일 버킷의 `raw_count` 는 그 날에 떨어지는 레코드 수이고 그것이 곧 시간 버킷들의 합」 · 검증 좌표로 **이 파일의 두 테스트 이름**을 적음(「일=시간 합 · 주=일 합 · 단위마다 전 레코드 계상」) · `:723` 변경 이력 「`delta`·`spark` 를 가짜 램프에서 자기 버킷 이력 실값으로 교체」 |
| ③ PR #38 본문 | 「변경」 3항 「직전 버킷 대비 %p(`delta`)와 최근 share 수열(`spark`) … 첫 버킷은 delta=0.0 · 단일점 spark 로 **정직하게** 퇴화한다」 · 4항 「2버킷 케이스에서 `delta`/`spark` 가 실제 이력과 일치하는지, 단일 버킷이 합성 램프가 아닌지」 |
| ③ PR #62 본문 | 「1. 산출」 「`week`=`2026-W26`(ISO 주차)」 · 「롤업을 Gold 행의 2차 합산으로 만들지 않은 것이 핵심 선택 … 일 버킷의 `raw_count` 가 그 날 떨어지는 레코드 수이고 그것이 곧 시간 버킷들의 합」 · 「2. 소비 지점」 「단위 순위로 고른다 … `finestUnit`」 |

## 제거 12줄 — 복원 경로별 근거

**⑴ `:69` 첫 버킷 1줄.** 「The first bucket a subject appears in has nothing to look back at.」 — **①** 바로 아래 두 단언
`delta == 0.0` · `spark == [0.5]`. **①** `aggregate.py:18-20` 「A subject's first bucket has nothing to compare against, so it
reports `delta = 0.0` and a single-point spark」(같은 문장). **③** PR #38 「첫 버킷은 delta=0.0 · 단일점 spark 로 정직하게 퇴화한다」.
**②** doc-tracker `:723`. 세 번째 테스트 이름 `…single_bucket_is_not_a_synthetic_ramp` 가 같은 사실을 한 번 더 말한다.

**⑵ `:103` 구분선 1줄.** `# ── AC3.3 rollups ────`. 정책의 첫 제거 유형(구분선 — 절 이름은 아래 이름이 복원한다): 아래 선언
`_SPAN`·`_span_bronze`·`test_rollup_raw_counts_…`·`test_rollup_shares_…` 가 「rollups」를 이름으로 갖는다. AC 태그 부분은
journey-gate-pass 가 `# ── R10 ──` 를 규칙 앵커로 유지한 것과 갈린다 — 그쪽은 「아래에 그 식별자를 이름으로 가진 선언이 없고
다른 복원처도 없다」였고, 여기는 **②** doc-tracker `:47-56` 이 AC3.3 의 검증 좌표로 이 파일의 두 테스트를 이름으로 적고,
**①** `aggregate.py:193`·`:200` docstring 이 `_all_units` 를 「(AC3.3 rollups)」로 이름 붙인다. 「어느 코드가 어느 AC 의 구현체인지는
태그 말고 복원 경로가 없다」(aggregation-harness-pass 의 인라인 태그 유지 사유)가 이 자리에는 성립하지 않는다.

**⑶ `:104-109` 코퍼스 설계 7줄 → 2줄 (−4, 빈 `#` 포함 물리 −5).** 지운 것은 달력 사실 두 줄과 빈 `#`, 그리고 첫 문장의 절반.

```
# 2026-06-23 (Tue) and 2026-06-28 (Sun) are both ISO week 2026-W26;
# 2026-06-29 (Mon) opens 2026-W27.
```

**①** 단언이 그 달력을 그대로 적는다 — `_bucket("2026-06-23T14:37:02+00:00", "week") == "2026-W26"` · `_bucket("2026-06-29…", "week")
== "2026-W27"` · `weeks[("2026-W26", "A")] == days[("2026-06-23", "A")] + days[("2026-06-28", "A")]`(06-28 이 W26 인 것) ·
`weeks[("2026-W27", "B")] == days[("2026-06-29", "B")]`. 요일 이름은 ISO 주가 월요일에 열린다는 규칙의 예시일 뿐이고 그 규칙은
`aggregate.py:66-67` 과 `tests/e2e/lib/gold.ts:204-207`(목요일 규칙) 이 적는다. 첫 문장의 「The corpus below deliberately spans」
는 바로 아래 `_SPAN` 이 코퍼스라는 것(①)의 재진술이라 접었다. 남긴 2줄은 아래 「유지」.

**⑷ `:135` ISO 주 1줄.** 「ISO week-numbering, so the label is not derivable from the month alone.」 — **①** `_bucket` docstring
`:53-54` 「`2026-W26`」 + `:66-67` 「ISO week-numbering year, which is not always the calendar year in the days around New Year」(설명의
주인 — 구현 쪽). **③** PR #62 「`week`=`2026-W26`(ISO 주차)」. 「month alone 으로 안 나온다」는 **①** 바로 아래 두 단언(같은 6월의
23일 → W26, 29일 → W27)이 보여 준다.

**⑸ `:149-150` finest-first 2줄 → 1줄 (−1).** 지운 절은 「Finest first, and each unit's rows stay contiguous」 — **①** 테스트 이름
`test_every_unit_is_emitted_finest_first` + 단언 `units == sorted(units, key=BUCKET_UNITS.index)`(정렬돼 있다 = 단위별로 이어져 있다).
**①** `aggregate.py:42` 「the full set a run emits, finest first」 · `:193`·`:200` 「once per unit, finest first」. 남긴 절은 아래 「유지」.

**⑹ `:164`·`:168`·`:172` 합산 단정 서술 3줄.**

| 지운 문장 | 복원처 |
|---|---|
| 「A day is the sum of the hours whose label it prefixes.」 | **①** 바로 아래 `bucket[:10] == day` 로 거르는 `sum` 과 단언 메시지 `day {n} != hours {rolled}`. **①** `aggregate.py:25-26` 「a day's `raw_count` is the count of the records that fall in that day, which is exactly the sum of its hours' counts」. **②** doc-tracker `:51-52` 같은 문장 · 검증 좌표 「일=시간 합」. **③** PR #62 축자 |
| 「And a week is the sum of its days.」 | **①** 바로 아래 두 단언(`weeks[…] == days[…] + days[…]`). **②** doc-tracker 「주=일 합」. 테스트 이름 `…equal_the_sum_of_the_finer_buckets` |
| 「No unit invented or dropped a record: every unit accounts for all five.」 | **①** 바로 아래 `sum(row["raw_count"] …) == len(_SPAN)`. **②** doc-tracker 「단위마다 전 레코드 계상」. 「all five」는 README 가 가드에서 금하는 **개수** 표현이기도 하다 — `_SPAN` 이 자라면 조용히 거짓이 된다 |

**⑺ `:42-43` 코퍼스 설계 2줄 → 1줄 (−1).** 지운 절은 「One source, two hour buckets. A goes 1/2 -> 3/4 of the bucket, B the mirror
image」 — **①** 바로 아래 `_bronze(…, hour=14)` ×2 · `hour=15` ×4 와 `_silver` 의 A/B 배분, 단언 `0.5` · `0.75` · `-25.0`. **③** PR #38
「2버킷 케이스에서 `delta`/`spark` 가 실제 이력과 일치하는지」. 남긴 절(「so the deltas are exact」의 이유)은 아래 「유지」.

## 유지 6줄 + 무접촉 1줄 — 근거

줄 번호는 별도 표기가 없으면 **기준 커밋 `1f508e1`** 기준이다(위 「귀속」·「제거」 절도 같다).

| 줄 | 왜 남기나 |
|---|---|
| `:42` 정정 후 1(기준 커밋 `:42-43`) 「1/2 -> 3/4 … keeps the deltas exact — nothing below rounds」 | README 「테스트가 **왜 그 모양으로** 단언하는지」. 같은 파일의 첫 테스트는 `round(…, 2) == 1.0` 으로 단언하고 이 테스트는 `== 25.0` 을 맨 값으로 단언한다 — 코퍼스를 이진 분수(1/2·3/4)로 고른 것이 그 차이의 이유인데, 단언·PR·docstring 어디에도 「왜 반올림이 없는가」는 없다 |
| `:71`(기준 커밋 `:73`) 「The second reads its own previous bucket, in percentage points (AC3.3).」 | **판단 분기 ①(아래).** 인라인 AC 태그 — 같은 파일 `:98` 을 initial-pass 가 「테스트 의도(AC 태그 판단 분기)」로 유지한 것과 같은 형태이고, aggregation-harness-pass(`# AC3.2`)·lineage-rejudge-pass(`Trace.tsx` `(AC1.4)`)·serving-handlers-pass 가 승계한 선례 |
| `:76`(기준 커밋 `:78`) 「Raw counts stay per-bucket rather than cumulative (AC3.8).」 | 같은 분기 ① |
| `:101-102` 정정 후 2(기준 커밋 `:104-109`) 「Two hours of one day, a second day in the same ISO week and a third in the next — so "day" and "week" each have something to actually roll up and a boundary to get wrong」 | 「왜 그 모양으로」 — 코퍼스가 두 경계(일 안의 두 시간 · 주 경계)를 일부러 걸치게 설계됐다는 것. doc-tracker `:558` 이 같은 의도를 적지만 그것은 **e2e 타임시프트 코퍼스**(`timeshift_bronze.py`, 시간 6 · 일 4 · 주 2)에 대한 문장이지 이 단위 테스트의 `_SPAN` 에 대한 것이 아니다. 애매하면 남긴다 |
| `:141` 정정 후 1(기준 커밋 `:149-150`) 「Readers that stop at the first unit they recognize get the default (AC3.3: 기본 단위는 시간)」 | 순서 계약의 **이유**. 「finest first」 자체는 docstring·PR 이 적지만 *왜* 그 순서인지는 어디에도 없다(PR #62 는 소비 지점이 `finestUnit` 으로 「단위 순위로 고른다」고만 적는다). 감지 인계도 「finest first 순서 계약 … 유지 후보」. PRD 인용은 AC 태그 형태라 분기 ① 과 같이 남는다 |
| `:96`(기준 커밋 `:98`) 옛 1(`bb1b56b`) | initial-pass 의 판정 그대로 — 이 패스 무접촉 |

## 판단이 갈린 자리

**판단 분기 1.**

1. **인라인 AC 태그가 붙은 서술 2줄(`:73`·`:78`)을 지울 것인가.** 서술 부분은 복원된다 — `%p` 는 **①** 단언(0.5 → 0.75 가 `25.0`)과
   **③** PR #38 「직전 버킷 대비 %p」·**①** `aggregate.py:16-18`, 「per-bucket rather than cumulative」는 **①** 단언 `raw_count == 3`(누적이면 4).
   그런데 태그가 잇는 「delta ↔ AC3.3」·「버킷별 raw_count ↔ AC3.8」은 doc-tracker 의 AC 좌표(AC3.3 은 롤업 두 테스트, AC3.8 은
   `ac3-8-normalized-ratio.spec.ts`)에도 PRD 에도 없다 — 이 태그를 지우면 그 귀속은 어디에도 남지 않는다. 같은 파일 `:98`
   `(AC3.4)` 를 initial-pass 가 같은 이유로 남겼고, 그 뒤 세 패스가 인라인 태그를 승계했다. **남긴다.** 태그만 남기고 서술을 걷는
   형태(`# (AC3.3)`)는 선례가 없고 읽는 사람에게 무엇의 태그인지 알려 주지 못한다.
   `:103` 구분선의 태그를 지운 것과의 차이는 **복원처 유무**다 — 그쪽은 doc-tracker 가 이 파일의 롤업 테스트를 AC3.3 좌표로 이름
   붙인다.
2. **⑴ `scripts/check-data-format-change.py` 10줄을 이 패스에 넣을 것인가.** 넣지 않았다 — dash-brief-pass 와 같은 이유(복원처가
   PR #75·같은 파일 docstring 인 다른 묶음). 다음 선으로 그대로 넘긴다.

## 검증

```
$ git diff --stat 1f508e1 -- python
 python/packages/aggregation/tests/test_aggregate.py | 20 ++++----------------
 1 file changed, 4 insertions(+), 16 deletions(-)      # 추가 4줄 전부 주석 · 삭제 16줄 전부 주석
$ diff <(git show 1f508e1:…/test_aggregate.py | grep -vE '^\s*#') <(grep -vE '^\s*#' …/test_aggregate.py)   # 빈 출력 — 비주석 줄 동일
$ (cd python && ruff check packages/aggregation/tests/test_aggregate.py && ruff format --check …)   # All checks passed · already formatted
$ (cd python && pytest -q packages/aggregation/tests/test_aggregate.py)   # 11 passed (편집 전 11 passed)
$ <지문 스크립트>                                        # lines=2486 files=134 (편집 전 2498/134)
$ diff hits-before hits-after | grep -c '^<' ; … '^>'   # 16 / 4 — test_aggregate.py 단독
```

파일 단독 계수 `test_aggregate.py` 19 → 7. `ruff` 의 `E501`(100자) 이 정정 줄 하나를 잡아 92자로 줄였다(`:141`). 지문 밖
게이트(`check-mockup-render.py`·`check-journey-mockup.py`·`check_scenario_mapping.py`)는 python 테스트 주석을 읽지 않으므로 무관하고,
PR 의 `ci/build`(ruff + pytest)가 이 편집의 CI 집행자다.

## 원장 반영

- 패스 이력 행 `rollup-test-pass | 1f508e1 | 2498 | 12 | 2486 | 134 → 134`.
- 파일 행 `python/packages/aggregation/tests/test_aggregate.py` 1/0/1 → **19/12/7**(비고가 7 = 1 + 6 을 열거). 신설 0, 행 수 138 그대로.
- 말미 집계 **2498/12/2486** · 잔여 ⑴ **1파일 10줄**(`scripts/check-data-format-change.py`, 변동 없음) · ⑵ **11파일 68줄**(86 − 18) ·
  보류 0 · 행>실측 1(`batch-pvc.yaml`, 변동 없음).

## 범위 밖 (다음 패스로)

잔여 78줄 — 다음 선은 ⑴ `scripts/check-data-format-change.py` 10줄(복원처 PR #75 본문 · 같은 파일 docstring; `:44`·`:63`·`:64`·`:102`·`:105`
축자 복원 후보, `:183-185` ruff-format 모양 의존 3줄 유지 후보) 또는 ⑵ 최대 `web/src/screens/Sentiment.tsx` +17 · `Sentiment.test.tsx` +10(한 묶음 27)
→ `aggregation-5-subject-trend-chart.spec.ts` +13 → 나머지. **`BRIEF_KEY` 앞 3줄과 `Trend.tsx:81-82` 포인터는 web 묶음이 두 파일을 함께
열 때 한 번에 처분한다**(dash-brief-pass 판단 분기 ①). 이 파일의 인라인 AC 태그 3줄(편집 후 `:71`·`:76`·`:96`)은 정책 소유자가 인라인 태그의
처분을 정하면 함께 본다. `batch-pvc.yaml`·`kustomization.yaml` 의 #92 내용 교체분은 다음 `deploy/` 표적 패스. 재판정 후보 5건과 원본
누락 좌표 2건은 원장 말미 그대로.
