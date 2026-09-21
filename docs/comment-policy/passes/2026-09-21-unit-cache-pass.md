# unit-cache-pass — `aggregate.py`·`test_llm.py` 가 #62·#73 으로 들인 8줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `ba7b704`(#109 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([fairness-spec-pass](2026-09-21-fairness-spec-pass.md))가 말미에 「다음 패스의 선은 ⑵ 최대
`python/packages/aggregation/src/econ_aggregation/aggregate.py` +4 · `python/packages/analysis/tests/test_llm.py` +4(동률 — 둘 다
python 묶음이라 한 패스로 볼 수 있고, 들인 PR 은 blame 으로 가른다)」로 이름 붙인 두 파일의 **증가분만** 판정한다. blame 으로 가르면
`aggregate.py` 의 +4 는 전량 #62(`32faf64`, AC3.3 일·주 롤업)이고 `test_llm.py` 의 +4 는 전량 #73(`9fbec58`, temperature 선택화 +
모델 응답 재사용)이라 들인 PR 은 둘이지만 복원처의 모양이 같다 — **둘 다 같은 패키지의 구현 docstring 이 주인**이고 README·PRD·PR 본문이
그 문장을 옮겼다. 이름은 두 파일이 들인 내용(버킷 **단위** 상수 · 모델 응답 **캐시**)에서 땄다.
추적 task는 `rct_20260921-0016`(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **판정 표면 8줄 중 제거 6줄 / 유지 2줄** — 문면 정정 없음. 레포 전체 지문은 `2448 → 2442`(파일 `134 → 134`).
실행 코드는 한 바이트도 바뀌지 않았다 — 두 파일을 `ast.dump` 로 펼친 결과가 편집 전후 **동일**하고(주석은 AST 에 없다), 비주석
줄 필터(`grep -vE '^\s*#'`) diff 도 빈 출력이며, `pytest`(92 passed)·`ruff check`·`ruff format --check` 는 편집 전후 같은 결과다.

## 무엇이 들어왔나 — 귀속

| 파일 | 행(남음) | 기준 커밋 히트 | blame |
|---|---:|---:|---|
| `aggregate.py` | 11(aggregation-harness-pass) | 15 | `bb1b56b`(#1 신설) 3 · `33e24ea`(#38) 8 · **`32faf64`(#62) 4** — 옛 11 = 3 + 8, #62 는 옛 줄을 갈아 쓰지 않았다 |
| `test_llm.py` | 8(initial-pass) | 12 | `fc304c5`(#12 신설) 8 · **`9fbec58`(#73) 4** — 옛 8 그대로 |

행의 「남음」과 blame 의 옛 줄이 두 파일 모두 일치하므로 증가분 8 만 판정해도 행의 불변식이 선다(11 + 4 → 11 + 2 · 8 + 4 → 8 + 0).

| 자리(기준 커밋 줄) | 내용 | 지문 줄 | 판정 |
|---|---|---:|---|
| A `aggregate.py:41-42` | `DEFAULT_BUCKET_UNIT`/`BUCKET_UNITS` 위 「The unit an aggregation answers in when the caller does not say (AC3.3: "기본 단위는 시간"), and the full set a run emits, finest first.」 | 2 | **제거 2** |
| B `aggregate.py:66-67` | `_bucket` 의 `week` 분기 안 「ISO week-numbering year, which is not always the calendar year in the days around New Year — the point of using it here.」 | 2 | **유지 2** |
| C `test_llm.py:240` | `test_temperature_can_be_omitted` 첫 줄 「GPT-5.x models 400 on any non-default temperature, so the field must be droppable.」 | 1 | **제거 1** |
| D `test_llm.py:280` | `test_second_cycle_reuses_unchanged_replies` 단언 위 「Same prompts -> no new model calls, identical judgements, nothing new to store.」 | 1 | **제거 1** |
| E `test_llm.py:293` | `test_edited_body_or_version_bump_calls_again` 첫 호출 위 「Edited body (new content address) -> new prompt -> fresh call (AC1.7).」 | 1 | **제거 1** |
| F `test_llm.py:297` | 같은 test 둘째 호출 위 「Analyzer version bump -> reprocess even the unchanged body (AC2.6).」 | 1 | **제거 1** |

합: 8 → 2(제거 6). 지문 `aggregate.py` 15 → 13 · `test_llm.py` 12 → 8.

## 복원처 — 같은 패키지의 구현 docstring 이 주인, README·PRD·PR 본문이 사본

- **A** — 세 절이 각각 주인을 갖는다. 「caller 가 말하지 않을 때 답하는 단위」는 상수 이름 `DEFAULT_BUCKET_UNIT` 과 값 `"hour"`, 그리고
  `_bucket`·`build_*` 시그니처의 `unit: str = DEFAULT_BUCKET_UNIT` 이 코드로 적고(①), 같은 파일 모듈 docstring `:22` 「Rollups (AC3.3):
  the hour is the default unit」이 AC3.3 귀속까지 붙여 같은 문장을 적는다(①). 「"기본 단위는 시간"」 인용의 원문은 PRD
  `docs/econ-opinion-monitor-prd-aggregation-viz.md` AC3.3 설명(②). 「the full set a run emits, finest first」는 상수 이름 `BUCKET_UNITS`
  와 `build_subject_trends_all_units`·`build_axis_sentiment_all_units` docstring `:193`·`:200` 「once per unit, finest first (AC3.3
  rollups)」(①), 그리고 `test_aggregate.py` 의 `test_every_unit_is_emitted_finest_first` 가 단언한다(①). PR #62 본문 「CLI 는
  `BUCKET_UNITS = ("hour", "day", "week")` 를 팬아웃해」(③)와 doc-tracker AC3.3 착지 문단(②)이 같은 사실을 옮겼다. rollup-test-pass 가
  `test_aggregate.py` 의 finest-first 서술을 지울 때 `aggregate.py:42`·`:193`·`:200` 을 주인으로 지목했는데, `:42` 가 빠져도 `:193`·`:200`
  과 test 이름이 남으므로 그 판정의 복원 경로는 끊기지 않는다.
- **C** — `http_completer` docstring `llm.py:139-142` 「`ECON_LLM_TEMPERATURE` defaults to `0`; set it to an empty string or `default` to
  omit the field — newer models (e.g. the GPT-5.x family) reject any temperature other than their own default with a 400」이 같은 문장을
  더 정확하게(생략 조건까지) 적는 주인이고(①), test 이름 `test_temperature_can_be_omitted` + parametrize 값(`""`·`"default"`·`" Default "`)
  + 단언 `"temperature" not in sent[0]` 이 「droppable」을 적는다(①). PR #73 본문 「왜」 절이 400 응답 원문(`Unsupported value: 'temperature'
  does not support 0 with this model`)까지 보존한다(③). 「chat-completions 엔드포인트의 문서화되지 않은 동작」은 정책의 유지 유형이지만
  그 지식의 자리는 구현 docstring 이고 이 줄은 그 사본이다.
- **D** — 세 절이 바로 아래 세 단언의 문면이다: 「no new model calls」= `len(calls) == 2`(첫 주기 2건 그대로), 「identical judgements」=
  `strip(first) == strip(second)`, 「nothing new to store」= `entries2 == []`(①). test 이름 `test_second_cycle_reuses_unchanged_replies`
  와 `reply_cache_key` docstring `llm.py:296-298` 「Hourly cycles re-observe mostly the same articles; their prompt (title + body) is
  byte-identical, so the model's earlier reply can stand in for a new call」(①), README 「Silver」 항 「매시간 다시 관측되는 미변경 기사는
  모델을 다시 부르지 않는다」(②), PR #73 「모델 응답 캐시」 절(③).
- **E·F** — `reply_cache_key` docstring `llm.py:298-300` 「A changed body or title, a prompt edit, a model switch or an `analyzer_version`
  bump (AC2.6 reprocessing) each change the key and force a fresh call」이 두 줄을 한 문장으로 적는 주인이고(①), README 같은 항 「본문·제목
  수정, 프롬프트·모델 변경, `--analyzer-version` 올림(재분석, AC2.6)은 키가 바뀌어 새로 호출된다」(②)와 PR #73 본문 「본문·제목 수정(AC1.7),
  프롬프트·모델 변경, `--analyzer-version` 올림(AC2.6 재분석)은 키가 바뀌어 새로 호출된다」(③)가 **인라인 AC 태그까지 포함해** 같은
  문장이다. test 이름 `test_edited_body_or_version_bump_calls_again` 과 두 호출의 차이(`body_hash="h2"` · 위치 인자 `"llm-v2"`) + 단언
  `len(calls) == 3` 이 무엇이 재호출을 부르는지 적는다(①). 「new content address」의 귀속 AC1.7 은 `analyze_llm` docstring `llm.py:255`
  「`item["body_hash"]` (AC1.4, AC1.7)」와 PRD AC1.7 「수정된 본문(해시 변경)은 새 레코드」(①②)가 잇는다.

## 제거 6줄 — 복원 경로별 근거

| 경로 | 줄 | 자리 |
|---|---:|---|
| ① 코드(같은 파일 모듈·함수 docstring · 상수 이름과 값 · test 이름과 바로 아래 단언 · `llm.py:139-142`·`:255`·`:296-300`) | 6 | A 2 · C 1 · D 1 · E 1 · F 1 — 전부 ① 만으로 복원되고 아래 ②③ 이 겹친다 |
| ② 저장소 문서(README 「Silver」 캐시 항 · PRD AC1.7·AC2.6·AC3.3 · doc-tracker AC3.3 착지 문단) | (5) | A 의 인용 원문 · D·E·F 의 캐시 규칙 |
| ③ PR 본문(#62 「어떻게 1.」 · #73 「왜」·「모델 응답 캐시」) | (5) | A 의 팬아웃 · C 의 400 원문 · D·E·F 축자 |

경로 ④(커밋 메시지)는 squash 제목만이라 근거로 쓰지 않았다.

## 유지 2줄 — 근거

- **B `aggregate.py:66-67`** — `iso[0]`(ISO week-numbering year)을 `date.year` 대신 쓰는 이유. `_bucket` docstring `:51-58` 은 라벨 모양
  (`2026-W26`)과 단위 안 사전식=시간순만 적고 연도가 달력 연도와 갈리는 날들을 말하지 않으며, PR #62 본문도 「`week`=`2026-W26`(ISO 주차)」
  까지만 적는다. 코드만 읽는 사람은 `f"{iso[0]}-W…"` 에서 「왜 `iso[0]` 인가」를 되묻게 되고 그 답은 어디에도 없다 — 정책의 「데이터 계약의
  비자명한 성질」(Gold 버킷 키 사전식 정렬 근거와 같은 유형)이다. rollup-test-pass 가 `test_aggregate.py` 의 ISO 주 서술을 지우며 이 두 줄을
  주인으로 지목했으므로 지우면 그쪽 복원 경로도 끊긴다.

## 판단이 갈린 자리

1. **E·F 의 인라인 AC 태그(`(AC1.7)`·`(AC2.6)`)를 판단 분기로 남기지 않은 것** — rollup-test-pass 가 `test_aggregate.py` 의 `%p (AC3.3)`·
   `raw_count (AC3.8)` 을 남긴 판별식은 「서술은 복원되나 **태그가 잇는 귀속이 어디에도 없다**」였다. 여기서는 그 판별식의 값이 다르다 —
   `reply_cache_key` docstring 이 `analyzer_version` 올림에 AC2.6 을, `analyze_llm` docstring 이 `body_hash` 에 AC1.7 을 붙이고, README·PR
   #73 본문은 두 줄을 태그까지 포함해 축자로 적는다. 귀속이 세 경로에 남아 있어 태그를 지워도 잃는 것이 없다. 같은 파일 옛 8줄의
   `(AC2.2)`·`(AC2.5)` 태그(initial-pass 「AC 태그 판단 분기」 유지)는 증가분 밖이라 이 패스가 재판정하지 않는다 — 정책 소유자가 인라인 태그의
   처분을 정하면 `test_aggregate.py` 3줄과 함께 본다.
2. **B 를 docstring 으로 옮기지 않은 것** — `_bucket` docstring 에 한 문장을 더하면 지문에서 2줄이 빠지고 지식은 남는다(정책 「원본을
   고친다」 경로). 하지만 그것은 지문의 사각지대(docstring 본문)로 옮기는 것이지 중복을 없애는 것이 아니고, 이 지식의 자리는 `iso[0]` 바로
   옆이 가장 정확하다. 유지로 둔다.
3. **C 를 「유지 유형」으로 보지 않은 것** — 정책이 「chat-completions 엔드포인트의 문서화되지 않은 동작」을 유지 대상으로 드는 것은 그 지식이
   레포 어딘가의 주석에 있어야 한다는 뜻이고, `http_completer` docstring 이 그 자리다. 테스트의 사본은 「다른 파일 주석의 재진술 — 설명의
   주인에만 둔다」로 처분했다(serving-handlers-pass·fairness-spec-pass 와 같은 처분).

## 검증

```
$ git diff --stat ba7b704 -- python
 python/packages/aggregation/src/econ_aggregation/aggregate.py | 2 --
 python/packages/analysis/tests/test_llm.py                    | 4 ----
 2 files changed, 6 deletions(-)                        # 삭제 6줄 전부 주석, 추가 0
$ python3 astcmp.py ba7b704 <두 파일>                     # ast.dump 편집 전후 SAME · SAME, 비주석 줄 186/186 · 314/314
$ diff <(git show ba7b704:<f> | grep -vE '^\s*#') <(grep -vE '^\s*#' <f>)   # 두 파일 모두 빈 출력
$ (cd python && ruff check . && ruff format --check .)   # All checks passed · 33 files already formatted
$ (cd python && pytest -p no:cacheprovider)              # 92 passed (편집 전 92 passed; 두 파일만 39 passed 동일)
$ <지문 스크립트>                                        # lines=2442 files=134 (편집 전 2448/134)
$ python3 scripts/check-data-format-change.py ba7b704 HEAD   # format_changed=false
```

파일 단독 계수 `aggregate.py` 15 → 13 · `test_llm.py` 12 → 8. 지문 밖 게이트(`check-mockup-render.py`·`check-journey-mockup.py`·
`check_scenario_mapping.py`)는 python 주석을 읽지 않아 편집 전후 같은 통과이고, PR 의 `ci/build`(ruff + pytest)가 이 편집의 CI 집행자다.
원장 재계수: 파일별 원장 138행 ↔ 지문 파일별 계수를 대조해 기준 트리 ⑴ 1파일 10 · ⑵ 7파일 19 == 옛 말미 29, 행 갱신 후 ⑴ 1파일 10 ·
⑵ 5파일 11 == 새 말미 21.

## 원장 반영

- 패스 이력 행 `| 2026-09-21 | unit-cache-pass | ba7b704 | 2448 | 6 | 2442 | 134 → 134 |`.
- 「패스 이력」 아래 「unit-cache-pass도 표적 패스다」 문단.
- 파일 행 `aggregate.py` 15 / 2 / 13 · `test_llm.py` 12 / 4 / 8(기준 패스 갱신, 행 신설 없음 — 138 그대로).
- 말미 집계 `**unit-cache-pass 기준 · 레포 전체** | 2448 | 6 | 2442`, 잔여 29 → **21**(⑴ 10 사람 몫 + ⑵ 5파일 11).

## 범위 밖 (다음 패스로)

- ⑵ 5파일 11줄: `python/packages/ingestion/tests/test_feeds.py` +3(전량 #71 `11b53fe` — 실패 소스 정리; 복원처 후보 PR #71 본문·`feeds.py`
  docstring) · `deploy/overlays/prod/kustomization.yaml` +3(#92 내용 교체 — `batch-pvc.yaml` 과 함께 `deploy/` 표적 패스 몫) — **다음 선은
  동률**이며 python 단독 무인 패스면 `test_feeds.py` 가 선 → `Fairness.test.tsx` 2 · `Reprocess.test.tsx` 2 · `Compare.tsx` 1.
- ⑴ `scripts/check-data-format-change.py` 10줄 — 사람 몫(sentiment-split-pass 「판단이 갈린 자리」 3).
- `test_llm.py` 옛 8줄의 `(AC2.2)`·`(AC2.5)` 태그와 `test_aggregate.py` 인라인 AC 태그 3줄 — 정책 소유자가 인라인 태그의 처분을 정할 때 함께.
- `ac3-8` 머리 단언 목록 표식 · `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터 · `deploy/` #92 교체분 · 재판정 후보 5 ·
  원본 누락 좌표 — 직전 패스 말미 그대로.
