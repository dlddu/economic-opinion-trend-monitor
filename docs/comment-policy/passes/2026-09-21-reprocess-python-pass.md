# reprocess-python-pass — #97 묶음의 python 5파일 판정(⑴ 12 + ⑵ 파일 전체 24 = 36줄)

**표적 패스다(전수 아님).** 기준 커밋 `52fba9f`(#102 착지 = main tip). 추적 task는 `rct_20260921-0007`(모델
`tbm_econ-opinion-monitor-comment-redundancy`). 겨눈 것은 직전 패스(reprocess-console-pass)가 「다음 패스의 선은 #97 묶음의 python
5파일 24줄」이라고 이름 붙인 그 묶음이다: ⑴ 행이 없던 3파일 12줄(`python/packages/core/tests/test_silver.py` 7 ·
`python/packages/core/src/econ_core/storage.py` 3 · `python/packages/aggregation/tests/test_serving_version.py` 2 — 전부 #97 신설),
⑵ 행이 있는 2파일의 증가분 12줄(`python/packages/analysis/src/econ_analysis/cli.py` 7→16 · `python/packages/analysis/tests/test_cli.py` 5→8).

**기준 커밋은 감지 시점 `b19905f` 가 아니다.** 감지(13:09Z)와 준비(13:15Z) 사이에 자매 PR #102(docs-impl `rct_20260921-0011`)가 착지해
`web/src/screens/Reprocess.test.tsx` 에 주석 2줄을 들였고 전체 지문은 `2540 → 2542`(파일 134 그대로)로 먼저 움직였다. 이 묶음의 5파일은
#102 무접촉이라 판정 대상은 움직이지 않았지만, 원장 말미 집계는 tip 기준으로 재측정했다(그 2줄은 ⑵ 에 `Reprocess.test.tsx 23→25` 로 든다).

**⑵ 두 파일은 증가분만이 아니라 파일 전체를 재판정했다.** `git diff f7e2338~1 f7e2338` 의 주석 줄 대조로 #97 은 `cli.py` 에 8줄을 들이고
**3줄을 걷었다** — 「Nobody answered: writing now would replace good Silver …」 2(initial-pass 가 판정한 줄) + 「Keep what the model did
answer …」 1(#73, 미판정) — 셋 다 같은 자리에 갈아 쓴 문면이 들어왔다. 그래서 initial-pass 행(7/0/7)의 비고가 열거하는 줄과 실측 16줄(7 → #73 +4 · #97 +8/−3)은 이미 어긋나 있었고, 「행의 `남음` 은
그 행의 비고가 열거로 해명하는 줄 수와 같아야 한다」(trend-surface-pass · serving-handlers-pass)를 지키려면 증가분 9 만 갱신할 수 없다.
`test_cli.py` 도 같은 처분(5 → #73 +1 · #97 +2 = 8, 전체 8줄). 귀속은 `git blame` 으로 확인했다 — #97 `f7e2338` · #73 `9fbec58` ·
#19 `a23c19a` · #12 `fc304c5` · #6 `576438e`.

판정 시점 열린 PR 은 #75 하나(`.github/workflows/`·`README.md`·`scripts/check-data-format-change.py` — 5파일·원장과 교집합 0).

판정 결과 요약: **제거 11줄(storage.py 3 · cli.py 8 · 테스트 3파일 0) · 문면 정정 0 · 유지 25줄(그중 판단 분기 1자리).**
레포 전체 지문은 `2542 → 2531`(파일 `134 → 133` — `storage.py` 가 남음 0 으로 빠진다), 파일별 원장 행은 `135 → 138`(행 신설 3, 갱신 2).

> 이 패스 뒤 ⑴(행이 없는 파일)은 **0**(원장이 열린 뒤 처음), ⑵ 는 **15파일 140줄**, 보류는 **0**. 전부 아래 「판정하지 않은 것」에 있다.

## 무엇을 판정했나

| 파일 | 원장 행 | 판정한 줄 | 결과 |
|---|---|---:|---|
| `python/packages/core/src/econ_core/storage.py` | 행 없음(#97 신설) | 3 | **제거 3** · 유지 0 |
| `python/packages/core/tests/test_silver.py` | 행 없음(#97 신설) | 7 | 제거 0 · 유지 7 |
| `python/packages/aggregation/tests/test_serving_version.py` | 행 없음(#97 신설) | 2 | 제거 0 · 유지 2 |
| `python/packages/analysis/src/econ_analysis/cli.py` | 남음 7, 실측 16 | 파일 전체 16 | **제거 8** · 유지 8(판단 분기 1) |
| `python/packages/analysis/tests/test_cli.py` | 남음 5, 실측 8 | 파일 전체 8 | 제거 0 · 유지 8 |

### 감지 단계의 예측과 실측

감지(`rct_20260921-0007`)가 planner 에 넘긴 힌트 넷을 소스에서 대조했다.

- 「테스트 3파일은 전량 유지 선례」 — **실측 일치**. 17줄 전부가 바로 아래 단언의 값을 해명하고(아래 「유지」), 이름·숫자만으로는 복원되지 않는다.
- 「`storage.py:59-61` 은 doc-tracker `2026-09.md:207` 이 축자로 적어 복원 경로 ② 성립(제거 후보)」 — **실측 일치, 복원처는 하나 더 있다**.
  L207 은 처방을 적고, 같은 문서의 슬라이스 9 「좁혔지만 닫지 않은 창」(L173-175)이 **문제 자체**(truncate+write 동안 동시 요청이 잘린 줄을
  읽는다)를 적는다. 주석의 세 문장(임시 파일에 쓰고 이름 바꿔 넣음 · 쓰는 도중 읽는 독자 · 이전 완전한 파일)이 둘에 나뉘어 전부 있다.
- 「`cli.py:42/44` `#:` 속성 doc 는 유지 판정 유형」 — 그대로 유지(정책 「Python: 모듈 속성의 `#:` 주석」).
- 「`cli.py:184-185`·`:162`·`:222` 는 doc-tracker ⑴⑵⑶ 과 대조」 — 셋 다 **제거**로 갈렸다(아래). 감지가 「원장 24 vs #97 귀속 19 의 차는
  비-#97 증가분 — 전체 증가분을 판정하면 된다」고 적은 것은 위의 「파일 전체 재판정」으로 한 단계 더 갔다: 증가분이 아니라 파일 전체다.

감지가 예측하지 않은 것 하나 — initial-pass 가 유지했던 `cli.py:153`(AC1.4/1.7 재진술)을 이번에 뒤집었다(아래 ⑵).

## 제거 — 복원 경로별 근거

### ⑴ `storage.py` — 3줄

`write_records` 머리:

```
# Written beside the target and renamed into place: a reader that opens
# the dataset mid-write (the serving Pod reads Gold from this volume)
# sees the previous complete file, never a truncated one.
```

- ① 코드: 바로 아래 `staging = target.with_name(f".{target.name}.tmp")` … `os.replace(staging, target)` — 「옆에 쓰고 이름을 바꿔 넣는다」의
  주인이고, `os.replace` 의 원자성이 「이전의 완전한 파일을 본다」를 뜻한다.
- ② 문서: doc-tracker 2026-09 슬라이스 9 「좁혔지만 닫지 않은 창」 — 「`LocalFsStore.write_records` 가 truncate+write 라 집계가 Gold 를 다시
  쓰는 수 초 동안 동시 요청이 잘린 줄을 읽을 수 있다 — 원자적 교체(임시 파일 → rename)는 …」; 슬라이스 10 후반부 ⑴ — 「`LocalFsStore.write_records`
  는 임시 파일 → `os.replace` 라 서빙이 쓰는 도중의 잘린 줄을 읽지 않는다(#92 가 좁혔지만 닫지 않았던 창)」. 「서빙 Pod 가 이 볼륨에서 Gold 를
  읽는다」는 같은 슬라이스 9 문단(「배치 Pod 가 이미 같은 볼륨을 서빙과 동시에 마운트한다」)과 ⑷ 「마운트는 그대로 읽기 전용」이 적는다.
- ③ PR #97 본문 1항 — 「`LocalFsStore.write_records` 는 임시 파일 → `os.replace`(#92 가 남긴 잘린 줄 창 닫음)」.

정책의 「클러스터·런타임 제약」 유지 항목에 해당하는지 저울질했다 — 해당하지 않는다. 그 항목이 지키는 것은 **문서에 없는** 런타임 사실이고, 이
제약(서빙이 같은 볼륨을 동시에 읽는다)은 doc-tracker 가 슬라이스 9 에서 원인·처방까지 산문으로 적었다.

### ⑵ `cli.py` — 8줄

| 자리 | 문면 | 복원 경로 |
|---|---|---|
| L153(initial-pass 유지분, #6) | `Bodies live once in the content-addressed store; observations resolve by hash (AC1.4, AC1.7).` | ② PRD ingestion AC1.4 「관측 레코드가 본문 해시(`body_hash`)로 본문을 참조한다」 · AC1.7 「본문 저장소에는 버전당 정확히 1건만 존재한다」 — 주석이 AC 번호까지 스스로 인용하는 재진술. ① `bodies = {b["body_hash"]: b["raw_text"] …}` · `DS_NEWS_BODY`. initial-pass 가 유지했으나 그때는 「유지」 사유를 적지 않았고(행 비고는 다른 세 줄만 든다), 이번 파일 전체 재판정에서 PRD 원문과 대조해 뒤집었다 |
| L162(#97) | `Resume semantics: what the target version already covers is the checkpoint.` | ② doc-tracker ⑶ 「범위 지정 실행은 목표 버전이 이미 덮은 레코드를 건너뛰므로 같은 요청을 다시 내면 체크포인트부터 이어진다」 · ③ PR #97 3항 같은 문장 · ① 바로 아래 `done = {… if row["analyzer_version"] == version}` + `test_scoped_run_skips_records_already_at_the_target_version` |
| L176-178(#73) | `Replies from earlier cycles, keyed by exact prompt + model + version: the hourly cycle re-observes mostly unchanged articles, so only new or edited ones reach the model.` | ① **다른 파일 주석의 재진술** — `llm.reply_cache_key` docstring 「Key of one model reply: the exact prompt under a given model and analyzer version. Hourly cycles re-observe mostly the same articles; … the model's earlier reply can stand in for a new call」이 주인(키 구성·이유 둘 다). `run_llm_analysis` docstring 이 `reply_cache` 의 역할을 다시 적는다 |
| L184-185(#97) | `A whole-lake run retires the versions it supersedes; the version a decision currently serves is kept so Gold does not lose it under the next hourly run.` | ② doc-tracker ⑴ 「전 레이크 실행은 … 대체된 버전을 걷는다 — 단 기록된 결정이 서빙 중인 버전은 남긴다(다음 매시간 실행이 반영된 버전을 지우면 Gold 가 그것을 잃는다)」 축자 · ③ PR #97 1항 · ① `store_analyses` docstring 「Without it (a whole-lake run) the records in rows keep only the version just written — plus any version in keep_versions (the serving version)」 + `silver.serving_version(store)` 호출 |
| L222(#97) | `Nothing to analyze still settles the dataset (prunes rows Bronze dropped).` | ① `store_analyses` docstring 「pruned counts rows dropped because their Bronze record is gone」 · `test_silver_rows_bronze_no_longer_holds_are_pruned` · ② doc-tracker ⑴ 「Bronze 가 더는 들지 않는 `record_id` 의 행은 쓸 때마다 걷는다」 |

## 유지 — 25줄(판정한 36줄 중)

- **`test_silver.py` 7줄**: 각 줄이 바로 아래 단언의 값을 해명한다 — 「둘째 버전이 첫째 옆에 착지 — `STP-run-reprocess` 「병존」」(`(written, pruned)
  == (3, 0)`) · 「같은 레코드·같은 버전은 두 행이 아니라 한 행(재개가 중복 계상하지 않는다)」(다시 써도 `written == 3`, `[["a"], ["c"]]`) ·
  「v3 전 레이크 런이 r1 만 건드림: r1 의 v1 은 가고 v2 는 서빙 버전이라 남고 r2 는 무접촉」 2(`(3, 1)` 과 세 쌍의 정확한 집합) · 「Bronze 가 r2 를
  버림: Silver 행이 더는 되짚어지지 않아(AC2.6) 걷힌다」(`(1, 1)`) · 「v2 서빙: r2 는 재처리된 적 없어 최신(v1) 행이 그대로」 · 「결정 없음: 모든
  레코드의 최신 행」. 계약은 doc-tracker ⑴⑵ 가 적지만, **이 픽스처의 어느 행이 어느 단언을 만드는지**는 여기뿐이다 — dashboard-surface-pass 의
  `Sentiment.test.tsx`·`Fairness.test.tsx` 전량 유지와 같은 처분.
- **`test_serving_version.py` 2줄**: 「결정 없음 → 레코드의 최신 버전이, 그것도 하나만 서빙」(`{"신주제"}`) · 「v1 롤백은 포인터 이동, v2 행은 Silver 에
  그대로」(롤백 뒤 단언). 같은 처분.
- **`test_cli.py` 8줄**: 「`--analyzer` 없음 = llm, 키 없으면 거부」 · 「레이크에 닿기 전 중단 — 빈 Silver 조차 없다」 · 「좋은 fake 런이 먼저 착지
  (llm 이 기본이라 명시)」 · 「장애가 실제 분석을 전량 미분석 배치로 바꾸지 않았다」 · 「전부 미분석이지만 실패는 0 — 가드가 걸리면 안 된다」 ·
  「매시간 주기가 같은 기사를 다시 관측 — 두 번째 런은 다시 묻지 않는다」 · 「다음 전 레이크 런은 아직 fake-v1(코드 미상향)」(왜 `{fake-v1, fake-v2}`
  둘 다 남는지 — 서빙 버전 보존의 픽스처 조건) · 「첫 배치의 행이 둘째 배치의 장애를 살아남았다」(왜 `["r1"]` 인지). initial-pass 가 5줄을
  「테스트 의도」로 유지했고, #73·#97 의 3줄도 같은 꼴이다.
- **`cli.py` 8줄**:
  - `#:` 속성 doc 2(`EXIT_CONFIG`·`EXIT_ALL_CALLS_FAILED`) — 정책 유지 대상, initial-pass 「종료 코드 의미」 승계.
  - 표본 시드 1(`Seeded by the run's own identity so a resumed sample draws the same records.`, #97) — **유일 지식**. `_take_sample(…, seed=f"{version}|{args.since}")`
    는 시드가 무엇인지는 보이지만 **왜 런의 신원인지**(재개된 표본이 같은 레코드를 뽑도록)는 doc-tracker ⑶ · PR #97 3항 · 여정 §4 · 테스트
    (`--sample 1 --sample-mode recent` 만 단언) 어디에도 없다.
  - 전송 먼저 구축 2(`Build the transport first: a missing key is an operator error, not an analysis outcome, so fail before touching the lake.`,
    initial-pass 승계) — `EXIT_CONFIG` 의 `#:` doc 은 **결과**(nothing was read)만 적고, `open_store` 앞에 두는 **순서의 이유**(운영자 오류 vs
    분석 결과의 구분)는 여기뿐. 앞선 판정을 뒤집을 새 복원처가 없다.
  - 전량 실패 정지 2(`Nobody answered: writing now would stamp an all-unanalyzed batch and blur the AC2.5 signal. Keep the checkpoint and stop here.`,
    #97 이 갈아 쓴 문면, initial-pass 「전량 실패 시 Silver 보존 근거」 승계) — doc-tracker ⑶ · PR #97 3항 · `#:` doc · stderr 문면은 **무엇을**(쓰지
    않고 멈춘다, 체크포인트 보존)만 적고, **왜**(전량 미분석 배치가 AC2.5 「저신뢰·분석 불가」 신호를 흐린다)는 여기뿐. `test_cli.py:119` 의
    「장애가 실제 분석을 전량 미분석 배치로 바꾸지 않았다」는 같은 사실의 테스트 쪽 사본이나 AC2.5 근거는 들지 않는다.
  - 캐시 병합 순서 1 — 판단 분기(아래).

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| `cli.py` 「Keep what the model did answer even if the batch as a whole fails below.」(`merge_records(… DS_ANALYSIS_CACHE …)` 를 전량 실패 검사 **앞에** 두는 이유) | 전량 실패(`attempted == failed`)면 `run_llm_analysis` docstring 대로 「Only replies that produced a record are returned as new cache entries」라 `new_replies` 가 비어 순서가 무의미해 보인다 — 문면이 헛도는 듯하다(정책: 정확성은 판정 표면이 아니다). 그러나 부분 실패 경로(일부 답함 → 배치는 쓰인다)에서 「답한 것부터 저장」이라는 **순서의 의도**로도 읽히고, 그 의도는 docstring · doc-tracker · PR 본문 어디에도 없다 | 유지 — 부분 실패 경로가 사라지거나 docstring 이 순서를 적으면 다시 본다 |

## 검증

- 비주석 코드 무변경(5파일 전부): `#` 줄을 걷어내고 공백을 접은 본문이 `52fba9f` 와 동일(5/5 SAME). 테스트 3파일은 바이트 무변경.
- `python/`: `pytest` **92 passed**(착지 전과 동일) · `ruff check .` All checks passed · `ruff format --check .` 33 files already formatted.
  (uv 없이 `PYTHONPATH=packages/*/src` 로 1:1 재현 — 워크스페이스에 서드파티 런타임 의존이 없다.)
- 지문(모델 `asIs.versionScript` 그대로): `lines=2542 files=134` / `d62f7a20…`(tip) → **`lines=2531 files=133`** / `9fd52deb…`. 델타 −11/−1.
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수): 기준 커밋에서 ⑴ 3파일 12 · ⑵ 17파일 152(원장 말미 16/150 + #102 의 `Reprocess.test.tsx` 2) ·
  행>실측 1 → 이 패스 뒤 ⑴ **0** · ⑵ **15파일 140** · 보류 0 · 행>실측 1(`batch-pvc.yaml`, 그대로). 원장 행 135 → 138, 지문 밖 행 5
  (`Makefile` · `pvc.yaml` · `check-mockup-render.py` · `Compare.test.tsx` · `storage.py`).
- 열린 PR: 계획 시점(13:15Z)과 PR 개설 직전 둘 다 #75 하나 — 5파일·원장과 교집합 0. go·web·deploy·e2e 는 무접촉(CI `Checks` 가 집행).

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **⑵ 140줄** — 원장 순서대로 `scripts/check-journey-mockup.py`(+23 — #47·#61, 복원처 스크립트 머리 docstring 규칙 목록·트래커 「규칙 8 예외 등재」
  절·두 PR 본문) → dash 묶음 `Dashboard.tsx`(+19)·`Dashboard.test.tsx`(+12) → `test_aggregate.py`(+18) → 나머지. `Reprocess.test.tsx` 의 #102 분
  2줄(`draws the running state in the card sub …` 테스트 머리)은 web 묶음이 다시 열릴 때 함께 본다.
- **행보다 줄어든 파일**: `deploy/overlays/prod/batch-pvc.yaml` 행 남음 9 · 실측 7(#92 내용 교체) — 이번에도 열지 않았다(`deploy/` 표적 패스의 입력).
- **잔여에 들어가지 않는 재판정 후보**(원장 말미 그대로): `Fairness.tsx` 118행 위 28줄 · `Trend.tsx` 「deliberately *not* here」 두 항 · `handlers.go`
  패키지 주석 본문 · 설계 트래커의 `Reprocess.tsx` 자물쇠 다섯 재핀(mockup-render 몫) · 위 판단 분기 1줄.
- **지문 사각지대**: 이 묶음의 Python 파일들은 docstring 을 여럿 갖고(`reply_cache_key` · `store_analyses` · `test_llm_is_the_default` …) 그 본문이
  이번 판정의 **주인**으로 여러 번 등장했다 — docstring 재진술이 주요 중복 유형으로 드러나면 별도 표면으로 더한다는 README 「범위 밖」 조항의
  입력이나, 이번 창에서 docstring 이 재진술 쪽이었던 사례는 없다(전부 주인 쪽).
- `#75` 가 착지하면 `scripts/check-data-format-change.py` 가 ⑴ 로 새로 들어온다 — 이 묶음 밖.
