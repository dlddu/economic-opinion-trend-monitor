# reprocess-console-pass — #97 묶음 중 web 6파일 74줄 판정

**표적 패스다(전수 아님).** 기준 커밋 `ca0554d`(#100 착지 = main tip; 감지 트리거 `98e97d6` 과 지문·정책 트리가 바이트 동일).
추적 task는 `rct_20260921-0006`(모델 `tbm_econ-opinion-monitor-comment-redundancy`).
겨눈 것은 **6파일 / 74줄** — 직전 패스(reprocess-trigger-pass)가 「다음 패스의 선은 #97 묶음의 web 6파일 74줄」이라고 이름 붙인
그 묶음이다: ⑴ 행이 없던 신설 2파일 51줄(`web/src/screens/ReprocessTrigger.tsx` 23 · `web/src/screens/Reprocess.tsx` 28 — 후자는 #94
신설이나 reprocess-surface-pass 가 파일째 보류해 행이 없었다), ⑵ 행이 있는 4파일에 #97 이 들인 증가분 22줄(`web/src/screens/Reprocess.test.tsx`
+11 · `web/src/api/client.ts` +5 · `web/src/api/types.ts` +5 · `web/src/tokens/tokens.css` +1), 그리고 직전 두 패스가 「보류」로 적어 둔
`types.ts` `trigger` JSDoc 1. 트리거 시점 잔여 236줄(⑴ 63 + ⑵ 172 + 보류 1)의 31%.

**보류 1줄은 #97 이 이미 없앴다.** 옛 `trigger: { available; note }` 필드의 JSDoc(「The serving API cannot start a run yet …」)은 #97 이 필드를
`trigger: ReprocessTrigger` 로 갈며 사라졌고, 그 자리에 타입 요약 2 + 필드 JSDoc 4 = 6줄이 새로 들어와 순증이 +5 다(`git diff f7e2338~1
f7e2338 -- web/src/api/types.ts` 의 주석 줄 대조). 그래서 이 패스가 `types.ts` 에서 판정한 것은 「증가분 5」가 아니라 **#97 이 들인 6줄**이고,
보류 목록은 이 패스로 **0** 이 된다.

착수 조건(원장 말미가 건 유일한 것 — 「mockup-render 의 열린 task 가 `Reprocess*.tsx` 를 수정 중인지 확인」)은 음성이다: mockup-render
`rct_20260921-0006` 의 PR #100 은 `docs/econ-opinion-monitor-design-tracker.md`·`docs/mockups/econ-opinion-monitor-mockup-index.md` 두
파일뿐이고 이 패스가 시작하기 전 `ca0554d` 로 착지했다. 판정 시점 열린 PR 은 #75 하나(`.github/workflows/`·`README.md`·`scripts/` — 6파일과
교집합 0).

판정 결과 요약: **제거 31줄(ReprocessTrigger.tsx 12 · Reprocess.tsx 10 · Reprocess.test.tsx 2 · client.ts 3 · types.ts 4 · tokens.css 0) ·
문면 정정 7블록(지문 −0) · 유지 43줄(그중 판단 분기 4자리).**
레포 전체 지문은 `2571 → 2540`(파일 `134 → 134`), 파일별 원장 행은 `133 → 135`(행 신설 2, 갱신 4).

> 이 패스 뒤 ⑴(행이 없는 파일)은 **3파일 12줄**(`python/packages/core/tests/test_silver.py` 7 · `python/packages/core/src/econ_core/storage.py` 3 ·
> `python/packages/aggregation/tests/test_serving_version.py` 2), ⑵ 는 **16파일 150줄**, 보류는 **0**. 전부 아래 「판정하지 않은 것」에 있다.

## 무엇을 판정했나

| 파일 | 원장 행 | 판정한 줄 | 결과 |
|---|---|---:|---|
| `web/src/screens/ReprocessTrigger.tsx` | 행 없음(#97 신설) | 23 | **제거 12** · 정정 2(`CMP-table` 앵커 둘 1줄화) · 유지 11 |
| `web/src/screens/Reprocess.tsx` | 행 없음(#94 신설, 직전 두 패스 보류) | 28 | **제거 10** · 정정 4(`CMP-seg`·`CMP-table`·`CMP-note`·`PAT-before-after` 앵커 1줄화) · 유지 18(판단 분기 2) |
| `web/src/screens/Reprocess.test.tsx` | 남음 14, 실측 25 | 증가분 11(#97) | **제거 2** · 유지 9 |
| `web/src/api/client.ts` | 남음 12, 실측 17 | 증가분 5(#97) | **제거 3** · 유지 2(판단 분기 1) |
| `web/src/api/types.ts` | 남음 18, 실측 23 | #97 이 들인 6(보류였던 옛 JSDoc 1 소멸 포함 순증 5) | **제거 4** · 유지 2(판단 분기 1) |
| `web/src/tokens/tokens.css` | 남음 61, 실측 62 | 증가분 1(#97, 블록 첫 줄 기준) | 제거 0 · **정정 1**(지문 −0) |

### 감지 단계의 예측과 실측

감지는 이 묶음을 「직전 패스가 정한 주인 셋(`reprocess_trigger.go` 머리 · `argo.TemplateReachable` · `store.ReprocessDecision`)의 사본」으로
예상하고 사본 좌표 여섯(`ReprocessTrigger.tsx:10-19` · `Reprocess.tsx:7-14` · `client.ts:29-30,77-78` · `types.ts:260-264` ·
`Reprocess.test.tsx:223-224`)을 적었다. 실측은 맞았고, 그 위에 두 겹이 더 있었다. ⑴ **web 안의 주인** — 「런 하나가 끝나면 읽기 절반을 다시
센다」가 세 벌(`ReprocessTrigger` 의 prop doc `onChanged` · 폴링 effect 머리 2줄 · `Reprocess.tsx` `reload` 상태 주석)이라 계약이 사는 prop doc
1줄만 남겼고, `Reprocess.tsx` 의 앵커 넷에 붙은 산문은 각각 `client.ts:70-72`(reprocess-surface-pass 가 주인으로 지목) · `reprocess.go` `bucketsOf`
doc · `reprocess_trigger.go` 머리 · `reprocess.go` `compareRow` doc(reprocess-surface-pass 가 전량 유지한 주인)의 사본이었다. ⑵ **복원 경로
②③ 이 축자인 자리** — 「덮어쓰기 토글은 없다(병존이 구조)」·「소스 목록은 필터와 무관하게 전량」·「보류 몫은 비율에 섞지 않는다(AC2.5)」·
「비교 불가 ≠ 데이터 없음」·「결정 이력은 제품 안에 남고 마지막이 서빙 버전」은 doc-tracker 2026-09 「슬라이스 10 후반부」 ⑴⑵⑸ 절, 설계 트래커
`reprocess` 행(L474 · L481 · L511), PR #97 본문, Go `Sources`·`UnanalyzedShare` 필드 doc 이 같은 문장으로 적는다. 감지가 인계 ②에 적은
「`Reprocess.tsx` 머리를 걷으면 트래커 자물쇠가 또 밀린다」는 그대로였고, 인계 ④(테스트 파일의 구현 주석 사본은 걷고 「왜 그 단언인지」는
남긴다)도 그대로 적용했다.

## 제거 — 복원 경로별 근거

### ⑴ `ReprocessTrigger.tsx` — 12줄

| 지운 줄 | 복원처 |
|---|---|
| 머리 10줄 → 2줄: 「표본 실행·전량 실행·반영/되돌리기는 각각 배치 Workflow 하나를 제출한다. 서빙은 레이크를 쓰지 못하고(읽기 전용 마운트), 쓰는 것은 배치다 — 이 화면은 무엇을 어떻게 돌릴지 정해 넘기고, 돌아간 결과는 위쪽 읽기 절반이 다음 조회에서 보여 준다」(4) + 「이 컴포넌트는 `trigger.available` 일 때만 그려진다. 응답의 그 값은 플래그가 아니라 프로브다(서빙이 자기 신원으로 WorkflowTemplate 을 읽을 수 있는가) — 그래서 여기 있는 버튼은 눌렀을 때 실제로 무언가를 일으키는 버튼이다」(3) + 빈 `//` 2 | **설명의 주인은 `reprocess_trigger.go` 머리 16~28행**(「are each one Workflow submitted from the batch WorkflowTemplate. The Pod's data mount is read-only, so nothing here touches the lake: the batch does … the read side of /api/reprocess shows the result the next time it is asked」 · 「A control is offered only when it can do something. `trigger.available` is a probe, not a flag (argo.TemplateReachable, with this Pod's identity) … the screen draws no buttons」 — 한국어 사본을 영어 원본이 축자 복원) · `argo.TemplateReachable` doc(①) · 마운트 조건 `data.trigger.available && <ReprocessTrigger …>`(`Reprocess.tsx`, ①) · doc-tracker ⑷⑸(②) · 설계 트래커 「허위 컨트롤 금지」 문단(②) · PR #97 본문 4·5(③). 남긴 2줄: lede(세 단계 id — `STP-` 좌표) + 주인 포인터 |
| 폴링 effect 머리 「진행 중인 런이 있는 동안만 묻는다. 어느 하나가 끝나면 읽기 절반을 다시 세게 한다 — 「이미 새 로직」 열과 전후 표가 그 결과다」 2줄 | 같은 파일 prop doc `onChanged`(「Ask the read half to fetch again — a run finished, so the counts moved」 — **web 안의 주인**, 계약이 사는 자리) · effect 본문 `if (!runs.some(isActive)) return` · `if (finished) onChanged()`(①) · doc-tracker ⑸ 「진행 중인 런이 있는 동안 `GET /api/reprocess/runs` 를 5초마다 묻고 하나가 끝나면 읽기 절반을 다시 센다」(축자, ②) |
| 「병존은 선택이 아니다: Silver 는 (record_id, analyzer_version) 별로 쌓이고 덮어쓰기 경로가 없다. 목업의 「덮어쓰기」 토글은 그래서 없다 — 되돌릴 자리가 없는 실행은 이 제품에 존재하지 않는다」(블록 첫 줄 1) | doc-tracker ⑴ 「Silver 는 `(record_id, analyzer_version)` 별 한 행」·⑸ 「「덮어쓰기」 토글은 없다(병존이 구조라 되돌릴 자리가 없는 실행은 존재하지 않는다)」(축자, ②) · 설계 트래커 L510 「병존 고정」(②) · PR #97 「「덮어쓰기」 토글 없음(병존이 구조)」(③) · `store.go` `Analyses` doc(직전 패스가 판단 분기로 유지한 주인, ①) · 바로 아래 화면 문면 「이전 결과는 그대로 두고 새 버전을 나란히 쌓습니다」(①) |
| 결정 이력 표 앞 「제품 안에 남는 재처리 이력 — 마지막 행이 지금 서빙하는 버전이다」 1줄 | `store.ReprocessDecision` doc 「The last one names the version Gold serves」(**주인**, ①) · `types.ts:250` 요약(같은 문장) · doc-tracker ⑸ 「결정 기록은 세션이 아니라 레이크에 남는다」·설계 트래커 L511 「결정의 영속화」(②) · `data.trigger.decisions` 이름(①) |

정정 2블록(지문 −0): `CMP-table` 앵커 둘의 산문 — 「이 버전으로 제출한 표본 런. 표본은 Silver 에 병존으로 쌓이므로 완료되면 위 전후 표가 그 표본의
재분류를 그대로 보여 준다」(`samples` 필터 ① · doc-tracker ⑴ ② · 위 폴링 계약의 세 번째 사본)와 「결정 전 확인 항목. 「되돌리기 가능」은 병존이
구조라 항상 참이다」(표 행 `["되돌리기 가능 여부", "가능 (버전 병존)", true]` ① · 설계 트래커 L511 목업 `pubRow()` 4행 ②)를 걷고 앵커만 남겼다
(`check-mockup-render.py` `markers()` 가 이름을 긁는 자리).

### ⑵ `Reprocess.tsx` — 10줄

| 지운 줄 | 복원처 |
|---|---|
| 머리 8줄 → 2줄: 「재처리 콘솔 — 로드맵 슬라이스 10」(배너) · 「재처리는 이 제품의 운영 흐름 중 유일하게 무언가를 *일으키는* 쪽이다: 분석 로직의 버전을 올리고, 범위를 골라 다시 돌리고, 전후를 견주고, 내보내거나 되돌린다(`JRN-logic-backfill`)」 · 「단, 응답의 `trigger.available` 이 참일 때만. 그 값은 서빙이 배치 WorkflowTemplate 에 실제로 닿는지의 프로브라, 거짓이면 사유를 말하고 버튼은 그리지 않는다(허위 컨트롤 금지)」 + 빈 `//` 1 | 슬라이스 배너는 작업 흔적(reprocess-trigger-pass 가 Go 두 파일에서 같은 처분, doc-tracker 슬라이스 10 착지 행이 복원 ②) · 단계 목록은 여정 문서 `JRN-logic-backfill` §3 의 다섯 단계(②)이고 reprocess-trigger-pass 가 **이 문장의 영어 원본(`reprocess.go` 머리 3줄)을 지우며 이 자리를 「web 쪽 사본」으로 적어 뒀다** · 프로브 문장은 위 ⑴ 과 같은 주인(`reprocess_trigger.go` 머리 · `argo.TemplateReachable`)과 `CMP-note` 블록 조건 `!data.trigger.available`(①). 남긴 2줄: 이 파일이 읽는 둘(`STP-` 좌표)과 일으키는 셋의 위치 + 주인 포인터 — 파일을 왜 갈랐나는 이름만으로 복원되지 않는다(reprocess-trigger-pass 가 `reprocess.go` 머리에 같은 이유로 3줄을 남긴 것과 같은 판단) |
| `reload` 상태 앞 「Bumped when a run finishes: the same selection is fetched again」 1줄 | `ReprocessTrigger` prop doc `onChanged`(web 안의 주인) · `onChanged={() => setReload((n) => n + 1)}` 과 effect deps `[…, reload]`(①) |
| 소스 `<select>` 앞 「소스 목록은 응답이 준다(그 축이 그 기간에 실제로 가진 소스). 필터를 걸어도 목록은 줄지 않으므로 다른 소스로 옮겨 갈 수 있다」(블록 첫 줄 1) | `reprocess.go` `Sources` 필드 doc 「lists every source the axis holds inside the window, whatever the source filter says — the screen needs the full list to offer a choice」(**주인**, reprocess-surface-pass 가 유지한 자리, ①) · `scope?.sources`(①) |
| 보류 몫 note 앞 「판단 보류 몫은 비율에 섞지 않고 따로 보고한다(AC2.5 의 잣대)」 1줄 | `reprocess.go` `UnanalyzedShare` doc 「stays apart from the subject shares, as AC2.5 keeps it everywhere else」(①) · 설계 트래커 L474 「판단 보류 몫을 비율에 섞지 않는 것은 AC2.5의 잣대라 켜고 끌 결정이 아니고」(축자, ②) · note 문면 「급증한 것이 관심인지 보류인지는 이 몫을 따로 세야 갈립니다」(①) |
| 버전 표 앞 「견줄 상대는 없어도 무엇이 있는지는 보여 준다 — 「비교 불가」와 「데이터 없음」은 다른 뜻이다」(블록 첫 줄 1) | 설계 트래커 L481 「「비교 불가」와 「데이터 없음」은 다른 뜻이라 사유를 말하고 무엇이 있는지(버전 표)는 보여 준다」(축자, ②) · `reprocess.go` `compareVersions` doc 「names that instead of inventing a baseline」(①) · `REASON_TEXT` 두 문면(①). reprocess-surface-pass 가 「판단이 갈릴 자리」로 예고한 둘 중 하나 — 트래커가 **그 문장을 그대로** 적고 있어 제거했다(다른 하나, 주목 임계 2줄은 유지 — 아래) |

정정 4블록(지문 −0): `CMP-seg`(「기간·축은 서버가 범위를 다시 세므로 전환이 실동작한다」 — `client.ts:70-72` 「The selection is server-side …」가 주인,
reprocess-surface-pass 가 이 사본을 다음 패스 몫으로 적었다) · `CMP-table`(「수집 주기 하나가 한 구간이다. 「이미 새 로직」은 목표 버전이 찍힌 레코드
수라 …」 — `reprocess.go` `bucketsOf` doc 「groups the selection by collection cycle and marks, per cycle, how many records Silver already carries at the
target version」이 주인이고, 뒷절 「버전을 올리기 전엔 전부가 이미 새 로직이고」는 병존 이전의 상태 서술이라 #97 뒤 낡았다) · `CMP-note`(「일으킬 수
없는 동안은 그 사유만 말한다」 — `reprocess_trigger.go` 머리 「the reason is reported and the screen draws no buttons」 · 설계 트래커 L482) ·
`PAT-before-after`(「점유율은 그 버전이 이 범위에서 낸 언급 전체 중 몫(원시)이고, Gold 의 AC3.1 정규화 점유율이 아니다 — 새 로직이 *무엇을 말했나*
를 집계가 다시 재기 전에 보는 표다」 — `reprocess.go` `compareRow` doc 이 같은 문장의 영어 원본이고 reprocess-surface-pass 가 「응답 계약의 왜」로
전량 유지한 주인). 넷 다 앵커만 남겼다.

### ⑶ `Reprocess.test.tsx` — 2줄(증가분 11 중)

「The write half is drawn only on a positive probe: without it the note says why and there is no control to press」 — 테스트 이름
`draws no run controls while the trigger is unavailable`(①) · `reprocess_trigger.go` 머리(주인) · `Reprocess.tsx` `CMP-note` 블록 조건(①).
trend-rejudge-pass 가 `Trend.test.tsx` 에서 걷은 「구현 주석의 사본」 유형이고, reprocess-surface-pass 가 이 파일에서 같은 처분을 한 선례를
잇는다. 나머지 9줄은 「왜 그 단언인지」라 유지(아래).

### ⑷ `client.ts` — 3줄(증가분 5 중)

| 지운 줄 | 복원처 |
|---|---|
| `postJSON` 머리 2줄 → 1줄: 「(a missing memo, an RBAC gap)」 열거 | `reprocess_trigger.go` `publishRequest` doc(「a decision without a memo is refused」) · `writeArgoError` doc(「a 403 is an RBAC gap the operator has to see as such」)(①). 열거는 정책의 「개수·열거」 유형. 남긴 1줄은 export 함수의 요약(「refusal with `{error}` in the operator's words; that text is what the screen shows」 — 왜 `{error}` 를 파싱해 그대로 던지나) |
| `api.reprocess*` 앞 「The three steps that cause work (STP-dry-run · STP-run-reprocess · STP-publish) each submit one batch Workflow; `reprocessRuns` is the poll」 2줄 | `reprocess_trigger.go` 머리(**주인** — 감지가 좌표로 지목한 사본) · `ReprocessTrigger` 의 `setInterval(… api.reprocessRuns() …)`(①) · doc-tracker ⑸(②) |

### ⑸ `types.ts` — 4줄(#97 이 들인 6 중)

`ReprocessTrigger` 인터페이스의 필드 JSDoc 넷 — web-api-view-pass 가 이 파일의 필드 JSDoc 12줄을 「`handlers.go` 응답 타입 doc 의 거울」로 지운
판단(주인은 값을 계산하는 구현 쪽)을 그대로 적용했다.

| 지운 줄 | 복원처 |
|---|---|
| `available` 「True only when the batch WorkflowTemplate is reachable with the Pod's identity」 | `argo.TemplateReachable` doc(**주인**) · `reprocess_trigger.go` 머리 「a probe, not a flag (argo.TemplateReachable, with this Pod's identity)」 · doc-tracker ⑷ 「서빙이 자기 신원으로 WorkflowTemplate 을 읽을 수 있을 때만 참」(②) |
| `note` 「Why the trigger is unavailable, in the operator's words; empty when available」 | `reprocess_trigger.go` `Note` 필드 doc 「explains an unavailable trigger; empty when Available」(①, 같은 문장) |
| `serving_version` 「Empty when no decision was ever recorded (aggregation serves each record's newest row)」 | `store.ReprocessDecision` doc(주인) · `reprocess_trigger.go` `ServingVersion` doc 「empty when none」(직전 패스가 3줄→1줄로 줄이며 **이 줄을 세 번째 사본으로 지목**) · doc-tracker ⑵ 「없으면 그 레코드의 최신 행」(②) · `test_serving_version.py:53`(①) |
| `runs` 「Newest first. Empty when unavailable」 | `argo.List` 의 「Creation order is what the operator thinks of as "latest" … sort on the timestamp the API server stamped」와 내림차순 정렬(①, 주인) · `probeArgo` 실패 시 `runs` 를 채우지 않는 `reprocessTrigger` 조립(①) · 화면의 `fulls[0]`/`lastFull` 이름(①) |

유지 2줄: `ReprocessRun`·`ReprocessDecision` 의 export 타입 JSDoc 요약 1줄씩(정책 「TS: export 함수·타입의 JSDoc 요약 1줄」). `ReprocessDecision`
요약의 뒷절 「the last one names the version Gold serves」는 `store.ReprocessDecision` doc 과 같은 문장이나 **한 줄 요약 안이라 요약 규칙이
이긴다**(web-api-view-pass 의 `TrendSeries` 처분) — 판단 분기로 적는다.

### ⑹ `tokens.css` — 정정 1블록(지문 −0)

`.rp-` 구획 첫 줄의 「(규칙 5 교집합 불변)」을 아래 열한 블록과 같은 「(규칙 5 대조 규약)」 포인터로 바꿨다 — 게이트 메커니즘은 설계 트래커
「규칙 3·4(네비)·5 기계 판정」 절이 주인(trend-rejudge-pass 의 11블록 처분). 이름 사상(`.fld`·`.chk`·`.formrow`·`.radios` → `.rp-`)과 `.btn.pri`
공유 이유(「기본 버튼의 강조형이라 이름을 달리 둘 이유가 없다」 — 설계 트래커 L468 은 공유 사실과 R5 충돌 0 만 적는다)는 유지.

## 유지 — 43줄(판정한 74줄 중)

- **`ReprocessTrigger.tsx` 11줄**: 머리 lede + 주인 포인터 2 · prop doc `overThreshold`·`onChanged` 각 1(프롭 계약 — `onChanged` 는 위 세 벌의
  주인으로 남긴 자리) · 폴링 catch 의 「the next tick asks again; a missed poll is not an error to show」(왜 실패를 삼키나 — 여기뿐) · `STP-dry-run`·
  `STP-run-reprocess`·`STP-publish` 절 표지 3(여정 단계 좌표 — `Reprocess.tsx` 의 `STP-scope-range`·`STP-compare-before-after` 표지와 같은 꼴,
  e2e-runner-pass 가 단계 표지를 포인터 1줄로 남긴 처분) · `CMP-table` 앵커 2 · `CMP-kv` 앵커 1(`markers()` 자물쇠).
- **`Reprocess.tsx` 18줄**: 머리 2 · `sortRows` JSDoc(「정렬은 서버가 |delta| 순으로 내려준 것을 기본으로 두고, 화면에서만 바꾼다」 —
  reprocess-surface-pass 가 **결정의 주인**으로 지목) · 주목 임계 상태 2(판단 분기, 아래) · 축 전환 시 `setSource("")` 의 「소스 목록은 축마다 다르다 —
  다른 축의 소스를 들고 가지 않는다」(결정이 사는 자리 — `Reprocess.test.tsx:166` 의 같은 문장은 「왜 그 단언인지」로 이미 유지된 사본이고, 구현 쪽이
  주인) · 예상 소요 주석 2(판단 분기, 아래) · 절 표지 2 · 앵커 9(`CMP-seg` ×2 · `CMP-axpill` · `CMP-table` · `CMP-badge` · `CMP-kv` · `CMP-note` ·
  `PAT-before-after` · `CMP-mapstrip`).
- **`Reprocess.test.tsx` 9줄**: `stubWrites` JSDoc 1(헬퍼 요약) · `STP-dry-run:`·`STP-run-reprocess:`·`STP-publish:` 머리 8 — 각 테스트가 **왜 그
  단언인지**(「the full run stays locked until a sample has finished」 · 「resumed, not restarted — the same request goes again and the batch skips
  what its checkpoint already covers」 · 「a rollback targets the version the comparison calls "before", and the server's refusal is shown in its own
  words」)를 들고, 머리의 `STP-` 태그는 reprocess-surface-pass 가 유지한 `STP-scope-range:`·`STP-compare-before-after:` 와 같은 목업 좌표.
- **`client.ts` 2줄**: `postJSON` 요약 1 · 빈 `catch` 안의 「A non-JSON refusal keeps the status line」(판단 분기, 아래).
- **`types.ts` 2줄**: export 타입 요약 2(위 ⑸).
- **`tokens.css` 1줄**: `.rp-` 구획 첫 줄(정정 후).

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| `Reprocess.tsx` 주목 임계 상태 2줄(「여정이 「임계 초과를 배지 표시」로 요구한 값이고, 임계 자체는 제품 결정이 아니라 운영자 입력이라 화면 상태로 둔다」) | 앞절은 여정 문서 `STP-compare-before-after` 페인포인트 절이 축자 복원(②). 뒷절 — 임계가 **왜 서버 파라미터도 응답 필드도 아닌 화면 상태인가** — 는 여정 §5 「전후 변화폭 … TBD (임계 설정 근거)」가 근거 미정임을 말할 뿐 결정 자체는 여기에만 있다(reprocess-surface-pass 가 「판단이 갈릴 자리」로 예고) | 유지 |
| `Reprocess.tsx` 예상 소요 주석 2줄(「예상은 Silver 가 목표 버전을 찍은 속도(analyzed_at 분포)에서 읽는다. 읽을 관측이 없으면 숫자를 지어내지 않는다」) | `reprocess.go` `throughput` doc(주인, ①)과 화면 문면 `— (관측된 처리 속도 없음)`(①)이 복원하지만, 설계 트래커 L483 이 **이 주석을 출처로 인용**한다(「관측 부재(숫자를 지어내지 않는다 — `Reprocess.tsx:240-241` 주석)」). 줄 번호는 이미 낡았어도(tip 237행, 이 패스 뒤 225행) 인용의 **내용**이 사라지면 트래커 문장이 가리킬 것이 없어진다 — 재핀은 mockup-render 몫이므로 이 패스는 실체를 남긴다 | 유지 |
| `client.ts` 빈 `catch` 안의 「A non-JSON refusal keeps the status line」 | 바로 위 `let detail = …` 초기화가 그대로 복원한다(①). 그러나 `eslint.config.js` 가 `js.configs.recommended` 를 extends 하고 그 안의 `no-empty` 는 **주석이 든 블록만 비어 있지 않은 것으로 본다** — 지우면 lint 가 실패한다. 정책의 「기계가 읽는 주석」 목록(`eslint-` 지시자)에는 없는 꼴이라 여기 적는다 | 유지 |
| `types.ts` `ReprocessDecision` 요약의 「the last one names the version Gold serves」 절 | `store.ReprocessDecision` doc 이 주인이고 같은 문장. 그러나 export 타입 요약 1줄 안이라 「요약 1줄 유지」 규칙이 이긴다(web-api-view-pass 의 `TrendSeries` 처분과 같은 자리) | 유지 |

## 검증

- 비주석 코드 무변경(6파일 전부): 블록·줄·JSX 주석을 걷어내고 공백을 접은 본문이 `ca0554d` 와 동일(`nocomment.py` 6/6 SAME).
- `web/`: `eslint .` rc=0 · `tsc -b` rc=0 · `vitest run` **9 files / 56 passed**(착지 전과 동일 — `Reprocess.test.tsx` 9건 포함) · `vite build` ok.
- 게이트: `scripts/check-mockup-render.py .` 출력이 부모(`ca0554d`)와 **바이트 동일**(R3 in-scope 27종 · 성립 26 · 등재 예외 1 · 구현 전용 1 ·
  R4·R5 상한 전부 0 — 앵커 첫 줄을 전부 남겼으므로 `markers()` 집합 불변) · `scripts/check-journey-mockup.py .` PASS(여정 6 · 링크 142) ·
  `tests/e2e/check_scenario_mapping.py` OK.
- 지문(모델 `asIs.versionScript` 그대로): `lines=2571 files=134` / `e2eb74eb…` → **`lines=2540 files=134`** / `bbd3c40d…`. 델타 −31/0.
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수): 기준 커밋에서 ⑴ 5파일 63 · ⑵ 20파일 172 · 행>실측 1(원장 말미와 파일·수치 일치) →
  이 패스 뒤 ⑴ **3파일 12** · ⑵ **16파일 150** · 보류 0 · 행>실측 1(`batch-pvc.yaml`, 그대로).
- 열린 PR: 계획 시점(12:24Z)과 PR 개설 직전 둘 다 #75 하나 — 이 6파일과 교집합 0. go·python·deploy·e2e 는 무접촉(CI `Checks` 가 집행).

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **#97 묶음의 python 5파일 24줄** — `python/packages/core/tests/test_silver.py` 7(⑴) · `python/packages/core/src/econ_core/storage.py` 3(⑴) ·
  `python/packages/aggregation/tests/test_serving_version.py` 2(⑴) · `econ_analysis/cli.py` +9(⑵, 그중 #97 분 5) · `analysis/tests/test_cli.py` +3(⑵).
  복원처는 doc-tracker ⑴⑵⑶ 절로 백엔드·web 과 다른 묶음(직전 패스가 적은 순서 그대로 **다음 패스의 선**). 테스트 3파일은 전량 유지 선례,
  `storage.py` 의 `os.replace` 3줄은 doc-tracker ⑴ 이 축자 복원.
- **⑵ 나머지 138줄** — `scripts/check-journey-mockup.py`(+23) → dash 묶음 `Dashboard.tsx`(+19)·`Dashboard.test.tsx`(+12) → `test_aggregate.py`(+18) 등,
  직전 패스가 적은 순서 그대로.
- **설계 트래커의 `Reprocess.tsx` 줄 번호 자물쇠 다섯**(L469 `:87-124` · L483 `:240-241` · L472 `:295-302` · L474 `:364-372` · L481 `:375-402`) —
  #97 머리 헝크로 이미 낡아 있었고(직전 두 패스가 기록), 이 패스가 머리 6줄과 본문 4줄을 걷어 **더 밀렸다**. 이 패스 뒤 실체의 좌표는
  `.dash-controls` 블록 **75~114** · 예상 소요 주석 **225~226** · 정렬 `CMP-seg`+임계 폼 **279~297** · 보류 몫 note **344~351** · 버전 표 블록
  **358~383** 이다. 재핀은 트래커 소유자(mockup-render 모델) 몫이다(trend-rejudge-pass 의 `Trend.tsx:8-21` · reprocess-trigger-pass 의
  `handlers.go:34` 처분과 같다).
- **행보다 줄어든 파일**: `deploy/overlays/prod/batch-pvc.yaml` 행 남음 9 · 실측 7(#92 내용 교체) — 이번에도 열지 않았다(`deploy/` 표적 패스의 입력).
- **잔여에 들어가지 않는 재판정 후보**(원장 말미 그대로): `Fairness.tsx` 118행 위 28줄 · `Trend.tsx` 「deliberately *not* here」 두 항 · `handlers.go`
  패키지 주석 본문.
- `#75` 가 착지하면 `scripts/check-data-format-change.py` 가 ⑴ 로 새로 들어온다 — 이 묶음 밖.
