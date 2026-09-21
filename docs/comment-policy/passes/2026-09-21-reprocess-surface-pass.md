# reprocess-surface-pass — #94 묶음(`reprocess` 표면) 중 자매 PR 이 손대지 않는 자리 판정

**표적 패스다(전수 아님).** 기준 커밋 `88a643c`(판정 트리; 착지 트리는 #96 이 `docs/` 만 더한 `bedfa99` — 지문 동일).
추적 task는 `rct_20260921-0004`(모델 `tbm_econ-opinion-monitor-comment-redundancy`).
겨눈 것은 **8파일 / 152줄** — 직전 패스(trend-rejudge-pass)가 「다음 패스의 선」으로 이름 붙인 **#94 묶음**이다:
⑴ 행이 없던 신설 4파일 140줄(`go/internal/handlers/reprocess.go` 69 · `web/src/screens/Reprocess.tsx` 33 ·
`go/internal/handlers/reprocess_test.go` 22 · `web/src/screens/Reprocess.test.tsx` 16) + ⑵ 행이 있는 4파일에 #94 가
들인 증가분 12줄(`web/src/api/types.ts` +5 · `go/internal/handlers/handlers.go` +3 · `web/src/api/client.ts` +3 ·
`web/src/tokens/tokens.css` +1). 잔여 297줄의 51%.

**그중 62줄은 판정하지 않았다(보류)** — 준비 중 열린 자매 PR #97 이 그 줄을 다시 쓰고 있고, 준비 중 착지한 자매 #96 이
`Reprocess.tsx` 에 줄 번호 자물쇠 다섯을 새로 걸었다(아래 「보류 — 왜 62줄을 뺐나」). 판정한 것은 **90줄**이다.

판정 결과 요약: **제거 16줄(13 · — · 0 · 2 · 1 · — · 0 · 0) · 문면 정정 1블록(지문 −0) · 유지 74줄(그중 판단 분기 2자리) · 보류 62줄.**
레포 전체 지문은 `2458 → 2442`(파일 `126 → 126`), 파일별 원장 행은 `126 → 129`(행 신설 3, 갱신 3 — `Reprocess.tsx`·`handlers.go` 는 무접촉).

> 이 패스 뒤 ⑴(행이 없는 파일)은 **`Reprocess.tsx` 1파일 33줄**, ⑵ 는 **18파일 148줄**(직전 패스가 적은 145 + `handlers.go` 의 #94 분 3),
> 그 밖에 **보류 26줄**(`reprocess.go` 머리 25 · `types.ts` 1 — 행의 「남음」 안에 있어 ⑴⑵ 어디에도 잡히지 않는다)이 있다.
> 셋 다 아래 「판정하지 않은 것」에 있다.

## 보류 — 왜 62줄을 뺐나

계획 시점(10:35Z) 열린 PR 은 #75 하나(`.github/`·`README.md`·`scripts/`)였다. 판정을 마치고 PR 을 여는 사이 자매 둘이
PR 을 열었고 하나는 착지했다:

- **#97(docs-impl `rct_20260921-0006`, 슬라이스 10 후반부, 27파일, 10:52Z 개설)** — 이 묶음 8파일 중 `reprocess_test.go` 를 뺀
  **7파일을 수정 중**. `git merge-tree` 로 재보니 첫 판(8파일 62줄 제거)은 4파일에서 충돌했다: `reprocess.go` 머리(#97 이 「the
  triggering itself is the POST side in reprocess_trigger.go」로 갈아 쓰고 「trigger」 항·후속 슬라이스 문단·`reprocessTriggerNote` 를
  지운다) · `Reprocess.tsx` 머리와 「실행」 절(#97 이 `ReprocessTrigger` 화면을 들인다) · `handlers.go` 패키지 주석과 `now` 필드 doc ·
  `types.ts` `trigger` JSDoc(#97 이 `trigger` 타입을 넓힌다).
- **#96(mockup-render `rct_20260921-0003`, 10:37Z 개설 · 11:0xZ 착지 `bedfa99`)** — `docs/` 2파일만 고쳤으나 설계 트래커의 `reprocess`
  편차 20행이 **`Reprocess.tsx:87-124` · `:240-241` · `:295-302` · `:364-372` · `:375-402` 를 줄 번호로 인용**한다(`:240-241` 은 예상 소요
  주석을 「숫자를 지어내지 않는다」의 출처로, `:375-402` 는 버전 표 블록을 「비교 불가 ≠ 데이터 없음」의 근거로). 이 패스의 `Reprocess.tsx`
  처분(제거 3 · 정정 5블록)은 전부 402행 앞이라 다섯 인용을 밀고, 그중 `:240-241` 은 지우려던 바로 그 줄이다.

앞선 패스들의 두 규약을 그대로 적용했다: **열린 PR 이 수정 중인 파일**(scenario-spec-pass 의 `tests/e2e/lib/`, unrowed-files-pass ·
lineage-surface-pass 의 `Fairness.tsx` — 「겹치는 트리 위에서 판정하면 머지 순간 판정 근거가 낡는다」)과 **트래커가 줄 번호로 인용하는
자리**(serving-handlers-pass 의 `handlers.go` 패키지 주석, web-api-view-pass 의 `Fairness.tsx` 118행 위 28줄 — 「그 위를 지우면 인용이
밀린다」)는 뺀다. 다만 dashboard-surface-pass 가 #84 와 겹치는 파일을 그래도 판정한 기준(**헝크가 겹치지 않고**, 착지 순서와 무관하게
자매의 줄이 묻히지 않는다)도 함께 써서, 파일이 아니라 **헝크 단위**로 뺐다:

| 보류 | 줄 | 이유 |
|---|---:|---|
| `web/src/screens/Reprocess.tsx` 전체 | 33 | #97 이 머리·「실행」 절을 다시 쓰고, #96 의 다섯 줄 번호 자물쇠가 402행까지 걸려 있어 그 앞의 어떤 제거도 인용을 민다 — **파일째 보류**, 행을 만들지 않는다(⑴ 에 남는다) |
| `go/internal/handlers/reprocess.go` 머리 12~36행 | 25 | #97 의 13~21 · 26~41행 헝크와 겹친다. 그 아래 44줄은 #97 이 손대지 않는다(#97 의 나머지 헝크는 `reprocessTrigger` 타입 삭제 125~135행과 `Trigger:` 한 줄 192~198행) |
| `go/internal/handlers/handlers.go` #94 분 3줄 | 3 | 패키지 주석·`now` doc 모두 #97 의 5~12 · 17~36행 헝크 안 — 행 무접촉, ⑵ 에 남는다 |
| `web/src/api/types.ts` `trigger` 필드 JSDoc | 1 | #97 의 236~246행 헝크 안. 나머지 4줄(`ReprocessBucket`·`ReprocessScope`·`throughput_per_minute`·`ReprocessCompareRow`)은 그 밖 |

뺀 62줄은 #97 이 착지하면 어차피 **다른 문장**이 되고(#96 의 자물쇠도 #97 의 머리 헝크 −4줄이 함께 민다), 판정한 90줄은 #97 이
손대지 않아 어느 순서로 착지해도 판정 근거가 낡지 않는다 — 이 PR ↔ #97 자동 병합 **충돌 0**(`git merge-tree --write-tree`). 착지
순서와 무관하게 자매의 새 주석이 묻히지 않는 것도 같다: 이 패스 뒤 `reprocess.go`·`types.ts`·`client.ts`·`tokens.css`·두 테스트가 행을
가지므로 #97 의 증가분(약 +400줄)은 계수 규약 ⑵ 로, `Reprocess.tsx` 는 ⑴ 로 다음 패스에 도달한다. 뺀 줄 중 26줄(`reprocess.go` 머리 ·
`types.ts` 1)은 이 패스가 행을 준 파일 안이라 ⑴⑵ 에 잡히지 않으므로 **행 비고와 원장 말미의 「보류」 목록**이 그 추적처다
(pin-guard-pass 가 「이 패스가 판정하지 않은 주석」을 행에 적어 둔 규약). #97 이 그 줄을 다시 쓰면 파일이 자라 ⑵ 가 어차피 발화한다.

## 무엇을 판정했나

| 파일 | 원장 상태 | 주석 | 판정 |
|---|---|---:|---|
| `go/internal/handlers/reprocess.go` | 행 없음(#94 신설) | 69 | 머리 25 보류 · 나머지 44 중 **제거 13** · 31 유지(판단 분기 1) |
| `go/internal/handlers/reprocess_test.go` | 행 없음(#94 신설) | 22 | 제거 0 · **22 전량 유지** |
| `web/src/screens/Reprocess.test.tsx` | 행 없음(#94 신설) | 16 | **제거 2** · 14 유지 |
| `web/src/api/types.ts` | 행 있음(web-api-view-pass, 남음 14) · 이후 **+5** | 19 | 1 보류 · **제거 1** · 3 유지 |
| `web/src/api/client.ts` | 행 있음(web-api-view-pass, 남음 9) · 이후 **+3** | 12 | 제거 0 · 3 유지(판단 분기 1) |
| `web/src/tokens/tokens.css` | 행 있음(trend-rejudge-pass, 남음 60) · 이후 **+1** | 61 | 제거 0 · 정정 1블록 · 1 유지 |
| `web/src/screens/Reprocess.tsx` | 행 없음(#94 신설) | 33 | **파일째 보류** — 행 없음 |
| `go/internal/handlers/handlers.go` | 행 있음(serving-handlers-pass, 남음 235) · 이후 **+3** | 238 | **3 전부 보류** — 행 무접촉 |

주석 수는 정책의 추출 규칙으로 센 값이다 — **블록 주석은 첫 줄만** 센다(`/* …` 뒤의 이어지는 줄은 `*` 로 시작하지 않으면 지문에
없다). 그래서 `tokens.css` 의 정정 1블록은 계수에 보이지 않는다. ⑵ 세 파일은 **증가분만** 처분했다 — 앞선 패스의 판정(유지·판단
분기)은 뒤집지 않는다.

### 감지 단계의 예측과 실측

감지 단계는 이 묶음의 복원처를 「설계 트래커 슬라이스 10 행 · doc-tracker 2026-09 행 · PR #94 본문 · `contracts/` 스키마」
하나로 예상했고, 실측도 그렇다 — 152줄 전부가 **한 커밋(`2fede44`, #94)** 이 들였다. 다만 지운 16줄의 복원처는 그 문서들보다
**같은 묶음 안의 다른 파일 주석**이 많았다: `Reprocess.test.tsx`·`types.ts` 가 `client.ts`·Go 구현 doc 을 사본으로 되풀이했고(「다른
파일 주석의 재진술 — 설명의 주인에만 둔다」, 주인은 값을 계산하는 구현 쪽 — web-api-view-pass 의 `types.ts` ← `handlers.go` 판단),
한 파일 안의 두 벌(`ThroughputPerMinute` 필드 doc ↔ `throughput` 함수 doc)도 있었다. 감지가 예상한 문서 복원처가 주인인 것은
`compareVersions` 의 「instead of inventing a baseline」(doc-tracker·트래커 「빈 표를 꾸며내지 않는다」)과 정렬 앞 「the journey's …」
정도다. `contracts/` 스키마는 복원처로 쓰지 않았다. 감지가 「가장 크게」 예상한 머리 문단(영·한 두 벌 38줄 — doc-tracker 착지 행·PR
#94 「왜 전반부만인가」가 축자 복원)은 보류에 들어 판정하지 않았다.

## 제거 — 복원 경로별 근거

### ⑴ `reprocess.go` — 13줄

| 지운 줄 | 복원처 |
|---|---|
| `ThroughputPerMinute`/`EtaMinutes` 필드 doc 4줄 | 같은 파일 `throughput` 함수 doc(「reads the rate … from the analyzed_at spread … Both are nil unless at least two records span a positive interval」)이 **설명의 주인**(한 파일 안의 두 벌 — serving-handlers-pass 의 `latestBucket` 처분). 「a guess wearing a number」의 취지(관측 없으면 숫자를 지어내지 않는다)는 설계 트래커 #96 행이 `Reprocess.tsx:240-241` 주석을 출처로 인용하고(②), PR #94 「관측이 없으면 `null`」(③)·화면 문면 `— (관측된 처리 속도 없음)`(①) |
| `scopeBucket` doc 둘째 줄(「The screen draws these as the 「구간 · 원문 · 이미 새 로직 · 재분석 대상」 rows of the mockup」) | `Reprocess.tsx` 의 `<th>` 넷이 그 열 이름 그대로다(①). 이름으로 시작하는 첫 줄만 남겼다 |
| `Reason` 필드 doc 2줄(값 열거 `"no-silver"`·`"single-version"`) | `types.ts` 의 `reason: "" \| "no-silver" \| "single-version"` 유니온과 `Reprocess.tsx` `REASON_TEXT` 의 두 키, `compareVersions` 의 세 return(①). 열거는 정책의 「개수·열거」 유형이기도 하다 |
| `UnanalyzedShare` doc 3줄 → 1줄 | 「fraction of records each version left outside the four classes」는 `mentionShares` doc(「plus the fraction of its records it did not classify」)이 주인(①). 「AC2.5 가 분리해 둔다」 포인터 1줄만 남겼다 — `handlers.go` 의 `Sentiment` 포인터 doc 과 같은 꼴 |
| `compareVersions` doc 4줄 → 2줄(「with a single version there is no other side, and the response names that instead of inventing a baseline」) | doc-tracker 착지 행 「단일 버전이면 전후 표를 그리지 않고 사유(`compare.reason`)를 말한다」 · 설계 트래커 「버전이 하나뿐이면 표를 그리지 않고 사유를 말한다(빈 표를 꾸며내지 않는다)」 · #96 행 「비교 불가 ≠ 데이터 없음」 · PR #94(②③, 축자) · 함수 본문의 `Reason: "single-version"` 두 return(①) |
| 정렬 앞 2줄(「Biggest movement first: the screen's default order and the journey's "변화량 상위 항목을 우선 정렬" in one place」) | `Reprocess.tsx` `sortRows` JSDoc 「정렬은 서버가 \|delta\| 순으로 내려준 것을 기본으로 두고, 화면에서만 바꾼다」가 **결정의 주인**(①) · 여정 문서 `JRN-logic-backfill` 의 그 문장(②) · 정렬 본문 `math.Abs(Delta)` 내림차순(①) |

### ⑵ `Reprocess.test.tsx` — 2줄

| 지운 줄 | 복원처 |
|---|---|
| `round-trips …` 테스트 머리 2줄(「The selection is server-side: changing the range or the axis re-fetches with the new query, and the source list offered is the one the response carried」) | `client.ts` `reprocess` 앞 3줄의 사본(구현 주석의 사본 — trend-rejudge-pass 가 `Trend.test.tsx` 에서 걷은 유형) · 테스트 이름 `round-trips range, axis and source through the query`(①) |

### ⑶ `types.ts` — 1줄 (증가분 5 중; 1줄 보류)

| 지운 줄 | 복원처 |
|---|---|
| `throughput_per_minute` 필드 JSDoc 1줄(「Null unless Silver holds enough dated records at the target version to read a rate off」) | `reprocess.go` `throughput` doc(①) — web-api-view-pass 가 필드 JSDoc 12줄을 Go 쪽 doc 으로 복원한 것과 같은 판단(이 파일 첫 줄이 스스로 「Go 서빙 핸들러가 돌려주는 JSON 모양의 거울」) |

유지 3줄: `ReprocessBucket`·`ReprocessScope`·`ReprocessCompareRow` 의 export 타입 JSDoc 요약 1줄씩(정책 「TS: export 타입의
JSDoc 요약 1줄」). 요약 안의 `(STP-scope-range)`·`(PAT-before-after)` 태그는 이 파일의 다른 요약 8곳의 `(AC3.7)` 류 태그와
같은 판단 분기 승계. 보류 1줄(`trigger` JSDoc 「The serving API cannot start a run yet …」)은 #97 이 `trigger` 타입을 넓히며
다시 쓰는 자리라 판정하지 않았다 — 후반부가 착지하면 「yet」이 거짓이 되는 상태 서술이라 그때의 문장을 그때 본다.

### ⑷ `tokens.css` — 정정 1블록(지문 −0)

`PAT-before-after (reprocess screen)` 구획의 「재처리 전후 비교 — 같은 서술 대상을 두 로직 버전으로 나란히 놓는 표. 표 자체는
목업과 같은 table.tbl 이라 위 CMP-table 선언을 그대로 쓰고」(`Reprocess.tsx` `<table className="tbl rp-cmp">` 와 `compareRow`
doc 이 복원, ①)와 규칙 5 게이트의 메커니즘 문장 「빌리면 규칙 5 의 공통 선택자 교집합이 넓어진다」(설계 트래커 「이 화면이
새로 쓰는 선택자는 전부 `.rp-` 접두라 목업 인라인 `<style>` 과 교집합을 만들지 않고」가 주인, ②)를 걷고 trend-rejudge-pass
의 열한 블록과 같은 꼴 — 앵커 + 「빌리지 않는 목업 이름」 사상 + 「(규칙 5 대조 규약)」 포인터 — 로 줄였다. 목업 이름
`.tag`·`.muted`·`.emptybox`·`.fld` 는 코드 어디에도 없어 이 줄이 유일한 대조 좌표라 남겼다. #97 은 이 파일의 1768행 이후에만
덧붙이므로 겹치지 않는다.

## 유지 — 74줄(판정한 90줄 중)

- **`reprocess.go` 31줄**: 이름으로 시작하는 doc 첫 줄(`reprocessRanges`·`scopeBucket`·`itemsInWindow`·`bucketsOf`·`versionsOf`·
  `throughput`·`compareVersions`·`mentionShares` — Go doc 유지 규칙) · **데이터 계약의 비자명한 성질**(`bucketsOf` 의 「"Done" is a
  count of records, not of Silver rows — a record analyzed twice at the same version is still one record」 · `mentionShares` 의
  「Records are counted once per version even if Silver holds the same record twice」 · `Cycle keys share one unit … so lexical order
  is time order` — 모델 정의가 이름 대어 유지로 지목한 버킷 키 지식) · **응답 계약의 「왜 이 값인가」**(`compareRow` 의 「raw …
  not the AC3.1 normalized share Gold carries — the point is to see what the new logic *said*, before aggregation reweights it」 —
  트래커·PR 어디에도 「왜 원시 점유율인가」는 없다, `handlers.go` `RawShare` 유지와 같은 자리 · `Sources` 의 「whatever the source
  filter says — the screen needs the full list to offer a choice」 · `throughput` 의 두 조건 · `UnanalyzedShare` 의 AC2.5 포인터) ·
  **방어적 계산의 의도**(`itemsInWindow` 의 「left out rather than guessed into the window」 · `compareVersions` 본문의 「an explicit
  ?version= nobody has run yet: nothing to put on the "after" side」).
- **`reprocess_test.go` 22줄 전량**: 픽스처 시계(「Every timestamp below is written relative to it so the range windows are exact」)·
  픽스처 판별력(「Three KR observations across two cycles plus a US one and a stale KR one」 · 산술 `0.2 records/min … -> 5 min` ·
  `v2: 기준금리 x3 …`)·단언 설계(「the fallback is named in the response so the screen shows what was actually measured」 · 「An explicit
  ?version= is the "after" side even when it is the older one」)이고 `handlers_test.go` 전량 유지와 같은 판정.
- **`Reprocess.test.tsx` 14줄**: 스텁 설계(「Every expected value below is read off this stub, never written twice」 · 「Server order:
  biggest |delta| first」) · `calledUrl` JSDoc 1 · 각 테스트 머리의 「왜 그 단언인지」(「No fake before/after … the versions Silver
  does hold are still listed」 · 「Raise the threshold above every delta: nothing is flagged any more」 · 「An empty lake is an empty
  scope, not an error and not an invented table」).
- **`client.ts` 3줄**: 「The selection is server-side … every control round-trips rather than filtering a fetched list」 — web-api-view-pass
  가 `sentiment` 의 「The axis is a query parameter, not a client-side filter」를 판단 분기로 둔 것과 같은 유형(왜 클라이언트에서
  거르지 않는가는 API 모양의 결정이라 Go 쪽에 없다). 사본(`Reprocess.test.tsx` 머리 2줄)을 지우며 이 자리를 주인으로 지목했다 —
  `Reprocess.tsx` `CMP-seg` 앵커에 붙은 같은 뜻의 산문은 파일째 보류라 다음 패스에서 같은 판단으로 걷는다.
- **`tokens.css` 1줄**(첫 줄 기준): `PAT-before-after` 구획 앵커 — `check-mockup-render.py` `markers()` 자물쇠.
- **`types.ts` 3줄**: 위 ⑶.

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| `reprocess.go` `versionsOf` doc 둘째·셋째 줄(「The newest by last_analyzed_at is the default target: it is the version the pipeline is stamping right now」) | 기본 목표 버전 선택은 `reprocess()` 본문 `versions[len(versions)-1]`이 복원하나(①), **왜 마지막 분석 시각 기준인가**(파이프라인이 지금 찍는 버전)는 코드에 없다 | 유지 |
| `client.ts` `reprocess` 앞 3줄 | 위 「유지」 — `sentiment` 선례 | 유지 |

`Reprocess.tsx` 에서 판단이 갈릴 자리(주목 임계 상태 2줄 — 「운영자 입력이라 화면 상태로 둔다」 · 버전 표 앞 「비교 불가 ≠ 데이터
없음」)는 이 패스가 판정하지 않았고, 후자는 #96 행이 그 문장을 축자로 적어 경로 ② 가 열렸으되 `:375-402` 자물쇠가 함께 걸렸다 —
다음 패스의 입력이다.

## 검증

- 비주석 코드 무변경(4파일 모두): 블록·줄 주석을 걷어내고 공백을 접은 본문이 `88a643c` 와 동일(`nocomment.py` — `{/* */}` ·
  `/* */` · 줄머리 `//` 제거 후 비교). `reprocess.go` 는 `gofmt -w` 가 주석 제거로 풀린 구조체 필드 정렬만 다시 맞췄다.
- `go/`: `gofmt -l .` 빈 출력 · `go vet ./...` rc=0 · `go test ./...` handlers·store ok(`reprocess_test.go` 5건 포함).
- `web/`: `eslint .` rc=0 · `vitest run` **52 passed / 9 files**(착지 전과 같은 수, `Reprocess.test.tsx` 5/5) · `tsc -b && vite build` rc=0.
- 게이트: `scripts/check-mockup-render.py .` rc=0 **출력 바이트 동일**(R3 in-scope 27 · 성립 26 · 등재 예외 1 · 구현 전용 1 ·
  R4·R5 상한 6종 0 — `PAT-before-after` 구획 첫 줄 유지라 마커 집합 불변) · `scripts/check-journey-mockup.py .` PASS ·
  `tests/e2e/check_scenario_mapping.py` OK.
- 지문(모델 `asIs.versionScript` 그대로): `lines=2458 files=126` / `c90a464e…` → **`lines=2442 files=126`** / `acc6c5ed…`. 델타 −16/0.
  #96 착지(`bedfa99`, `docs/` 만)는 지문을 움직이지 않았다 — 판정 트리와 착지 트리의 값이 같다.
- 자매 #97 과의 병합: `git merge-tree --write-tree HEAD pr97` 충돌 0(첫 판 62줄 제거는 4파일 충돌 → 겹치는 줄을 뺀 뒤 0).
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수): 기준 커밋에서 ⑴ 4파일 140 · ⑵ 21파일 157(원장 말미와 파일별 일치) → 이 패스 뒤
  ⑴ **1파일 33** · ⑵ **18파일 148줄** + 보류 26(⑴⑵ 밖).
- e2e 는 CI(`ci / e2e`)가 집행한다 — 주석만 바뀌었으므로 실행 경로는 동일하다.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **보류 62줄(#97 이 다시 쓰는 자리 · #96 의 자물쇠)**: `Reprocess.tsx` 33(파일째, ⑴) · `reprocess.go` 머리 25 · `handlers.go` #94 분
  3(⑵ 안) · `types.ts` `trigger` JSDoc 1. **#97 이 착지하면 그 트리에서 새 문장을 판정한다** — 후반부가 들이는 증가분(약 +400줄:
  `Reprocess.test.tsx` +146 · `tokens.css` +115 · `types.ts` +53 · `client.ts` +32 · `handlers.go` +25 · `Reprocess.tsx` +70 · 신설
  `reprocess_trigger.go`·`reprocess_trigger_test.go`·`ReprocessTrigger.tsx`·`argo.go` 등)과 **한 착지·한 복원처 묶음**이라 그것이
  다음 `reprocess` 표적 패스(가칭 reprocess-trigger-surface-pass)의 선이다. #96 의 `Reprocess.tsx` 줄 번호 자물쇠 다섯은 #97 의 머리
  헝크(20줄 → 16줄)가 함께 미니 그 패스가 트래커 소유자(mockup-render)에게 재핀을 넘기며 판정한다. #97 이 착지하지 않으면(거부·재계획)
  `reprocess.go` 머리·`types.ts` 1줄·`handlers.go` 3줄은 지금의 복원처(doc-tracker 슬라이스 10 착지 행 · 「재처리 실행 트리거」 잔여 행 ·
  PR #94 「왜 전반부만인가」 — 축자)로 곧장 판정할 수 있고, `Reprocess.tsx` 는 자물쇠가 서 있는 동안 402행 아래(`{/* CMP-mapstrip */}`
  1줄뿐)만 열린다.
- **⑵ 잔여 148줄 / 18파일**: `scripts/check-journey-mockup.py` 42→65(+23) · `web/src/screens/Dashboard.tsx` 0→19 ·
  `python/packages/aggregation/tests/test_aggregate.py` 1→19 · `web/src/screens/Sentiment.tsx` 54→71 ·
  `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` 48→61 · `web/src/screens/Dashboard.test.tsx` 5→17 ·
  `web/src/screens/Sentiment.test.tsx` 21→31 · `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` 22→31 ·
  `econ_aggregation/aggregate.py` 11→15 · `econ_analysis/cli.py` 7→11 · `test_llm.py` 8→12 · `test_feeds.py` 21→24 ·
  `deploy/overlays/prod/kustomization.yaml` 20→23 · `go/internal/handlers/handlers.go` 235→238(보류) · `deploy/batch/workflow-template.yaml` 42→44 ·
  `web/src/screens/Fairness.test.tsx` 16→18 · `web/src/screens/Compare.tsx` 10→11 · `test_cli.py` 5→6.
  **#97 묶음 다음의 선은 직전 패스가 적은 그대로 `scripts/check-journey-mockup.py`(+23)** — 증분은 #47·#61 이 들였고 복원처는 스크립트
  머리 docstring 의 규칙 목록 · 설계 트래커 「규칙 8 예외 등재」 절 · 두 PR 본문. 그다음 dash 묶음 `Dashboard.tsx`(+19)·
  `Dashboard.test.tsx`(+12) 31줄(`BRIEF_KEY` 앞 주석은 `Trend.tsx` 수명 주석의 주인이라 그 판정과 맞물린다).
- **설계 트래커의 `handlers.go:34`·`:30-37` 인용**(serving-handlers-pass 가 패키지 주석 본문을 판단 분기로 둔 자물쇠)은 #94 가
  import·필드 4줄을 더한 시점부터 `Register` 가 35행으로 내려가 **이미 낡아 있다**(trend-rejudge-pass 의 `Trend.tsx:8-21` 과 같은 사정).
  트래커는 `docs/` 루트라 이 모델의 양 side 밖이고 그 행의 소유자는 mockup-render 모델이므로 여기서 고치지 않는다.
- **`deploy/` 재판정 후보**(잔여 계수 밖): `batch-pvc.yaml` 행 남음 9 · 실측 7 · `prod/kustomization.yaml` 20→23 — e2e-runner-pass 가
  넘긴 그대로.
- `Fairness.tsx` 118행 위 28줄 — 트래커 `Fairness.tsx:110-118` 자물쇠, 미발화. `Trend.tsx` 「deliberately *not* here」 두 항 — 트래커 그대로.
- #75 가 착지하면 신설 `scripts/check-data-format-change.py` 가 ⑴ 에 새로 들어온다.
- Python docstring 표면 — 모델 정의의 사각지대, tobe-modeler 몫.
