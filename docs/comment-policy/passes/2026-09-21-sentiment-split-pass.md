# sentiment-split-pass — `Sentiment.tsx`·`Sentiment.test.tsx` 가 #76 으로 들인 27줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `3205cb5`(#106 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([rollup-test-pass](2026-09-21-rollup-test-pass.md))가 말미에 「다음 패스의 선은 ⑴ `scripts/check-data-format-change.py` 10줄
**또는** ⑵ 최대 `web/src/screens/Sentiment.tsx` +17 · `Sentiment.test.tsx` +10(한 묶음 27)」로 이름 붙인 두 후보 중 **⑵ 묶음**의
증가분만 판정한다. ⑴ 을 고르지 않은 이유는 아래 「판단이 갈린 자리」 3 — 복원처가 다른 묶음이라는 종전 이유에 더해, 그 파일은
**레포 자신의 리뷰 게이트가 사람 리뷰를 요구하는 자리**라 무인 루프가 착지시킬 수 없다는 사실을 이번에 실측했다.
추적 task는 `rct_20260921-0013`(reconciler `tbm_econ-opinion-monitor-comment-necessity`).

판정 결과 요약: **제거 23줄 / 유지 4줄**(그중 정정 2자리 — JSDoc 6→1 · 8→1 로 줄인 자리, 지문상 −12 는 위 23 에 들어 있다).
레포 전체 지문은 `2486 → 2463`(파일 `134 → 134`). 실행 코드는 한 바이트도 바뀌지 않았다 — 두 파일을 `typescript.transpileModule`
(`removeComments: true`, `jsx: react`) 로 주석을 걷어 내면 편집 전후 출력이 **바이트 동일**이고, `tsc -b`·`eslint`·`vitest`(56 passed)는
편집 전후 같은 결과다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

두 파일의 지문 히트를 #76 부모(`9a5d32e^`)와 기준 커밋 사이에서 대조하면 삭제 0 · 추가 27 — 전부 `9a5d32e`(#76 squash, `rct_20260920-0003`
docs-impl 슬라이스) 한 커밋이 들인 것이고 옛 줄(product-surface-pass 가 판정한 54 + 21)은 갈아 쓰지 않았다(`git blame -s` 로도 같다).
그래서 증가분만 판정해도 행의 불변식이 선다.

| 파일 | 자리(기준 커밋 줄) | 지문 줄 | 판정 |
|---|---|---:|---|
| `Sentiment.tsx` | A `:93-99` `unanalyzedCount` JSDoc(`/**` + 본문 5, ` */` 는 지문 밖) | 6 | 정정 6→1 |
| | B `:110` `// 목업의 na-exclude 는 checked 로 열린다 — 이 화면의 기본 읽기가 「분리 표기」다.` | 1 | 제거 |
| | C `:218-222` `{/* 분리 전후 비율 — 전환할 두 형태가 이미 이 화면 안에 다 있다. … */}`(지문은 첫 줄만 센다) | 1 | 제거(물리 5) |
| | D `:251-253` `{/* STP-confirm-cause 이탈 카드. 목업이 여기 두는 세 갈래 중 … */}` | 1 | 제거(물리 3) |
| | E `:397-405` `SplitRatios` JSDoc(`/**` + 본문 7) | 8 | 정정 8→1 |
| `Sentiment.test.tsx` | `:61` `// 화면이 Link 로 이탈 동선을 그리므로 라우터 컨텍스트 없이는 렌더가 던진다.` | 1 | **유지** |
| | `:159` `/** 분리 전후 비율 카드의 네 분류 비율, 클래스별로. */`(`splitShares` 헬퍼) | 1 | 제거 |
| | `:169-171` 체크박스 테스트 머리 — 허위 컨트롤 · 기대값 유도 | 3 | 제거 |
| | `:181` `// 기본값은 「분리」 — 네 비율이 분석 완료분만을 분모로 쓴다.` | 1 | 제거 |
| | `:190` `// 해제하면 같은 비율이 미분석 몫만큼 눌린다.` | 1 | 제거 |
| | `:194` `// 눌린 값은 원값보다 작아야 한다 — 두 형태가 실제로 다르다는 것부터 막아 둔다.` | 1 | **유지** |
| | `:220-221` `// STP-confirm-cause 의 이탈 카드. 대상은 BUILT 인 fairness 하나뿐이라 플레이스홀더로 보내지 않는다.` | 2 | 제거 |

합: `Sentiment.tsx` 17 → 2(제거 15), `Sentiment.test.tsx` 10 → 2(제거 8). 27 − 23 = 4.

## 복원처 — PR 본문·설계 트래커·doc-tracker 세 곳이 같은 문장을 적고, 화면 코드가 그 모양이다

dash-brief-pass 형(PR 본문 축자 대조)에 가깝다. #76 은 설계 트래커 「등재된 편차」 5행을 닫는 슬라이스라, **왜 이 컨트롤이 이렇게
서는지**를 PR 본문(③)·트래커 「해소된 등재」 행(②)·doc-tracker 변경 이력 행(②)에 각각 한 문단씩 적었고, 화면 주석은 그 셋의 사본에
가까웠다. 여기에 같은 파일 안의 선행 주석(`segments()` JSDoc · 머리 문단 「미분석 is never folded …」)과 코드 자체(①)가 겹친다.

| 복원처 | 위치 |
|---|---|
| ① 코드 | `unanalyzedCount` 본문(`1 - unanalyzed` · `<= 0 → null` · `Math.round(analyzed_total / analyzedShare)`) · `SplitRatios` 본문(`separated = distribution[c.key]` · `mixed = segments(row.distribution)` · `split ? separated : mixed`) · `useState(true)` · `.sent-split-kv .v[data-cls]` 선택자 · 테스트 이름 `swaps the denominator, so every class ratio moves by the unanalyzed share` / `offers the one exit whose destination is a real screen` · 단언 `chk.checked === true` · `negative` vs `negative * analyzed` · `links.length === 1` / `href === "/fairness"` · `api/types.ts:82-87` `SentimentAxisRow`(`analyzed_total` 과 `distribution.unanalyzed` 만 있고 건수는 없다) |
| ① 같은 파일 선행 주석(주인) | `segments()` JSDoc `:72-79` 「The four class ratios are scaled by the analyzed share so that classes and 미분석 together make one bar of 100%」 · 머리 문단 `:19-23` 「미분석 is never folded into the four classes … drawn as its own segment, its own legend entry, and its own figure」 · 테스트 파일 머리 `:11-14` 「Expected values are never written as constants: every assertion below is derived from this stub」 |
| ② 설계 트래커 `docs/econ-opinion-monitor-design-tracker.md` | `:496` 「분리 전후 비율 전환 부재」 해소 행 — 「체크 상태가 네 분류의 **분모를 실제로 갈아 끼운다** — 체크(기본값, 목업의 `checked` 를 따른다)면 `distribution[key]` 원값, 해제하면 `segments()` 의 analyzed 스케일 … **API 추가 호출도 새 필드도 없었다**. 미분석 건수만 서빙에 없어 `analyzed_total / (1 - unanalyzed)` 로 되짚고, 되짚을 수 없는 전량 미분석 구간에서는 건수를 말하지 않는다 … 허위 컨트롤이 아님은 `Sentiment.test.tsx` 의 분모 전환 단정이 잠근다」 · `:497` 「`STP-confirm-cause` 이탈 카드 부재」 해소 행 — 「모집단은 카드 문면 3종 + `data-goto` 없는 이탈 링크 **하나** … 그 하나의 대상(`fairness`)이 `BUILT` 이므로 링크가 빈 화면으로 보내지 않는다 — `data-goto` 를 단 `trace`·`reprocess` 링크 둘은 등재 모집단 밖」 · `:292`·`:353` `data-goto` 앵커 = 제외 범주 「여정 워크스루 진행 장치」 |
| ② doc-tracker 2026-09 | `:735` 「`sentiment` 는 `분리 전후 비율` 체크박스로 네 분류의 **분모를 실제로 갈아 끼우며**(전환할 두 형태가 이미 한 응답 안에 있어 API 추가 호출·새 필드 0) `STP-confirm-cause` 이탈 카드를 함께 세웠다」 |
| ② 여정·목업 | `docs/user-journeys/JRN-sentiment-shift.md` `STP-check-unanalyzed`(2단계) 「미분석이 분모에 섞이거나 아예 숨겨지면 비율이 조용히 왜곡된다」 · KPI 「분리 표기는 상시여야 함」 · `docs/mockups/JRN-sentiment-shift.html:553` `<input type="checkbox" id="na-exclude" name="na-exclude" checked />` |
| ③ PR #76 본문 | 「`분리 전후 비율` 전환은 **새 API·새 필드가 0**이다: `segments()` 가 만드는 「분모에 섞은」 형태와 `distribution[key]` 원값인 「분리한」 형태가 이미 한 응답 안에 다 있고, 체크박스는 그 둘 사이를 오갈 뿐이다. 미분석 **건수**만 서빙이 내려주지 않아 `analyzed_total / (1 - unanalyzed)` 로 되짚고, 되짚을 수 없는 구간(전량 미분석)에서는 건수를 지어내지 않는다.」 · 표 행 「`STP-confirm-cause` 이탈 카드 부재 → `판별이 어렵다면` 카드 → `/fairness`」 |

## 제거 23줄 — 복원 경로별 근거

줄 번호는 **기준 커밋 `3205cb5`** 기준.

**A `Sentiment.tsx:93-99` `unanalyzedCount` JSDoc 6 → 1(−5).** 다섯 문장 중 넷이 복원된다 — 「미분석 건수는 서빙이 내려주지 않는다 —
Gold 는 분석 완료 건수와 미분석 비율만 준다」(① `api/types.ts` `SentimentAxisRow` · ③ PR 「미분석 건수만 서빙이 내려주지 않아」 · ② 트래커
`:496`) · 「전체 = `analyzed_total / (1 - unanalyzed)` 로 되짚을 수 있고 그 차가 미분석 건수다」(① 본문 그대로 · ③ · ②) · 「비율이 1 에 닿으면
전체를 복원할 수 없다 — 그때는 건수를 지어내지 않고 `null` 을 돌려」(① `if (analyzedShare <= 0) return null` · ③ 「되짚을 수 없는
구간(전량 미분석)에서는 건수를 지어내지 않는다」 · ②) · 「화면이 비율로만 말하게 한다」(① `SplitRatios` 의 `naCount === null` 분기가
「이 버킷은 전량 미분석이라 분모로 쓸 분석 완료분이 없습니다」 를 그린다). 남긴 한 문장은 아래 「유지」.

**B `:110`(−1).** 「목업의 `na-exclude` 는 checked 로 열린다」는 ② 목업 `:553` 의 `checked` 속성 그대로이고, 「기본 읽기가 분리 표기」는
② 트래커 `:496` 「체크(기본값, 목업의 `checked` 를 따른다)」 · 여정 KPI 「분리 표기는 상시여야 함」 · ① `useState(true)` + 테스트 단언
`chk.checked === true` 가 복원한다.

**C `:218-222`(지문 −1 · 물리 −5).** 「전환할 두 형태가 이미 이 화면 안에 다 있다 … `segments()` 가 … 「분모에 섞은」 형태 … `distribution[key]`
원값이 「분리한」 형태 … API 를 다시 부르지도, 없는 값을 지어내지도 않는다」는 ③ PR 본문 한 문단의 **축자에 가까운 사본**이고 ② 트래커
`:496`·doc-tracker `:735` 가 같은 문장을 적는다. 「여정 2단계의 논점(분모가 바뀌면 어느 비율이 눌리는지)」은 ② 여정 `STP-check-unanalyzed`
페인포인트. 게다가 같은 파일 아래 `SplitRatios` JSDoc(E)이 같은 내용을 다시 적어 **한 파일 안의 두 사본** 중 하나였다. `CMP-*`/`PAT-*`
마커가 없는 블록이라 `check-mockup-render.py` 의 R3 모집단(주석에서 긁는 마커 집합)과 무관하다 — 편집 전후 게이트 출력 바이트 동일.

**D `:251-253`(지문 −1 · 물리 −3).** 「목업이 여기 두는 세 갈래 중 `trace`·`reprocess` 로 가는 둘은 `data-goto` 를 단 여정 워크스루 진행
장치라 제품 표면이 아니고, 남는 하나가 `fairness` 로 가는 평범한 이탈 링크다」 — ② 트래커 `:497` 이 「모집단은 … `data-goto` 없는 이탈
링크 하나 … `data-goto` 를 단 `trace`·`reprocess` 링크 둘은 등재 모집단 밖이라 옮기지 않았다」로, `:292`·`:353` 이 `data-goto` 를 제외
범주 「여정 워크스루 진행 장치」로 이름 붙여 **문장째 복원**한다. 감지 인계가 「목업 근거는 유지 후보」로 넘겼으나 그 목업 근거의 주인이
트래커(자매 mockup-render 모델의 등재)라는 것이 실측이다 — 화면 주석은 그 사본이다. `STP-confirm-cause` 토큰은 게이트 두 스크립트가
`web/src` 에서 읽는 이름(`CMP-*`/`PAT-*`)이 아니다.

**E `:397-405` `SplitRatios` JSDoc 8 → 1(−7).** 「분리(체크): the four ratios are `distribution[key]` — over the analyzed items」(① 본문
`separated` · ② 트래커) · 「closing at 100% by themselves, with 미분석 counted beside them rather than in them」(① 머리 문단 `:19-23` 이 주인 —
「미분석 is never folded … its own segment, its own legend entry, and its own figure」) · 「섞음(해제): the same four scaled by the analyzed
share, so 미분석 takes a segment of the same bar and every class ratio is pressed down by exactly that much」(① `segments()` JSDoc `:75-78`
이 주인 — 「scaled by the analyzed share so that classes and 미분석 together make one bar of 100%」, 코드 `dist[c.key] * analyzed`) · 「No second
request and no new field: both arrays come from one response」(③ PR 「새 API·새 필드가 0 … 이미 한 응답 안에 다 있고」 · ② 트래커 「API 추가
호출도 새 필드도 없었다」 · doc-tracker `:735`). README 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」를 같은 파일 안에 적용한 것과,
web-api-view-pass 가 export JSDoc 넷을 요약 1줄로 줄인 처분(`FairnessRow` 5→1 등)과 같은 형태다. 남긴 한 줄은 아래 「유지」.

**`Sentiment.test.tsx:159`(−1).** `splitShares` 헬퍼의 JSDoc 「분리 전후 비율 카드의 네 분류 비율, 클래스별로」 = 바로 아래 선택자
`.sent-split-kv .v[data-cls]`(카드 · 클래스별) 와 이름의 재진술 — 제거 유형 「선언 재진술」(unrowed-files-pass 가 `gold.ts` 의 `goldDir` 류
JSDoc 3줄을 지운 것과 같은 자리). 같은 파일 `stubSentiment` JSDoc 은 「answering each in turn」 이라는 동작을 담아 product-surface-pass 가
남겼고 이 패스도 무접촉이다.

**`:169-171`(−3).** 「체크박스가 실제로 분모를 갈아 끼우는지 … 문면만 있고 수치가 안 바뀌면 허위 컨트롤이다」는 ② 트래커 `:496` 마지막 문장
「컨트롤이 수치를 바꾸지 않는 허위 컨트롤이 아님은 `Sentiment.test.tsx` 의 분모 전환 단정이 잠근다」와 ① 테스트 이름 `swaps the denominator,
so every class ratio moves by the unanalyzed share` 가 복원하고, 「목업이 이 컨트롤을 둔 이유가 「분모가 바뀌면 어느 비율이 눌리는지 보인다」」
는 ② 여정 2단계 페인포인트다. 「기대값은 응답 stub 에서 직접 유도한다」는 **같은 파일 머리 `:11-14`** 가 파일 전체에 대해 이미 말한다(주인).

**`:181`·`:190`(−2).** 각각 단언 바로 위에서 단언을 산문으로 되풀이한다 — `expect(chk.checked).toBe(true)` + 스케일 없는 `negative`(「기본값은
분리 — 분석 완료분만을 분모로」) · `negative * analyzed`(「해제하면 미분석 몫만큼 눌린다」). rollup-test-pass 의 `# A day is the sum…` →
`assert n == rolled` 처분과 같다(①).

**`:220-221`(−2).** 「대상은 `BUILT` 인 `fairness` 하나뿐이라 플레이스홀더로 보내지 않는다」 — ① 테스트 이름 `offers the one exit whose
destination is a real screen` + 단언 `links.length === 1` · `href === "/fairness"` · ② 트래커 `:497` 「그 하나의 대상(`fairness`)이 `BUILT`
이므로 링크가 빈 화면으로 보내지 않는다」 · ③ PR 표 행. `Sentiment.tsx` 의 D 와 같은 문장의 **다른 파일 사본**이기도 했다.

## 유지 4줄 — 근거

줄 번호는 **편집 후** 기준.

| 줄 | 왜 남기나 |
|---|---|
| `Sentiment.tsx:93` 정정 후 1(기준 커밋 `:93-99`) `/** 비율에서 되짚은 건수라 반올림 오차가 1건 범위에서 남을 수 있다. */` | **데이터 계약의 비자명한 성질.** Gold 가 비율을 넷째 자리에서 반올림하므로(`aggregate.py:174` `round(c["unanalyzed"] / total, 4)`) 되짚은 전체가 실제와 어긋날 수 있고, 그것이 `Math.max(0, …)` 가드가 있는 이유다. 반올림한다는 사실은 ①(다른 패키지의 코드)에 있지만 「그래서 이 화면의 건수가 1건 범위에서 틀릴 수 있다」는 결론은 PR·트래커·doc-tracker 어디에도 없다. 원문의 이 절만 남기고 나머지 네 문장을 걷었다 |
| `Sentiment.tsx:382` 정정 후 1(기준 커밋 `:397-405`) `/** The same bucket under the two denominators the journey's step 2 argues about. */` | 지역 컴포넌트의 요약 1줄이자 **설명의 주인을 가리키는 포인터**(여정 `STP-check-unanalyzed`). dash-brief-pass 가 `client.ts` 선례대로 바이트 동일 사본을 주인 지목 포인터 1줄로 정정한 것과 같은 처분 — 본문 7줄은 주인(`segments()` JSDoc · 머리 문단 · PR · 트래커)이 복원하지만 「이 카드가 여정 2단계의 논점을 그린다」는 연결은 이 줄이 유일하게 화면 쪽에서 말한다. 애매하면 남긴다 |
| `Sentiment.test.tsx:61` `// 화면이 Link 로 이탈 동선을 그리므로 라우터 컨텍스트 없이는 렌더가 던진다.` | **테스트 하네스가 왜 그 모양인지.** `renderScreen` 이 `MemoryRouter` 로 감싸는 이유 — `react-router` 의 `<Link>` 가 라우터 밖에서 던지는 것은 외부 라이브러리의 동작이라 이 레포 어디에도 없고, 다른 화면 테스트(`Compare.test.tsx`·`Dashboard.test.tsx`)의 `MemoryRouter` 래퍼에도 설명이 없다(이 줄이 유일). vitest 자동 cleanup 부재를 남긴 것과 같은 근거 |
| `Sentiment.test.tsx:188`(기준 커밋 `:194`) `// 눌린 값은 원값보다 작아야 한다 — 두 형태가 실제로 다르다는 것부터 막아 둔다.` | **왜 그 모양으로 단언하는지.** 바로 아래 `expect(kr.distribution.unanalyzed).toBeGreaterThan(0)` 은 stub 값에 대한 단언이라 그 자체로는 이유가 없다 — 미분석이 0 이면 위 두 단언이 같은 값을 비교해 공허 통과한다는 것이 이유이고(dash-brief-pass 가 남긴 `Dashboard.test.tsx` 편집 지점 가드와 같은 층), 단언·PR·트래커 어디에도 없다 |

## 판단이 갈린 자리

**판단 분기 2 + 슬라이스 선택 1.**

1. **E 를 전량 제거할 것인가, 요약 1줄로 정정할 것인가.** `SplitRatios` 는 export 가 아니라 README 「TS: export 함수·타입의 JSDoc 요약 1줄」
   유지 규칙이 자동으로 걸리지 않는다. 그러나 같은 파일의 지역 함수 JSDoc(`bucketTick` · `segments` · `AxisRow` · `Donut` 의 `PAT-donut`)은
   앞 패스들이 「왜」를 담은 것으로 남겼고, 이 줄은 여정 단계를 지목하는 포인터 역할을 한다. 「애매하면 남긴다」로 1줄 정정.
2. **A 의 「반올림 오차 1건」 절을 남길 것인가.** Gold 의 `round(…, 4)` 는 ①(`aggregate.py`)에 있어 「반올림된다」 자체는 복원되지만, 그 결과가
   이 화면의 되짚은 건수에 어떻게 나타나는지(1건 범위 · 0 아래로 자른다)는 어디에도 없다. 남겼다. 메커니즘(넷째 자리)은 주석에 넣지 않았다 —
   `aggregate.py` 가 자리수를 바꾸면 조용히 거짓이 되는 종류라(pin-guard-pass 의 「가드는 메커니즘을 담지 않는다」와 같은 이유).
3. **⑴ `scripts/check-data-format-change.py` 10줄이 아니라 ⑵ 를 고른 이유.** 직전 두 패스는 「복원처가 다른 묶음」이라 ⑴ 을 미뤘다. 이번에
   ⑴ 을 먼저 열려다 실측한 사실: `main` 의 ruleset(`GET /repos/…/rules/branches/main`)이 **`review/manual-approval` 을 `required` 와 함께
   필수 status check 로 요구**하고, 그 status 는 `review-gate.yml` 이 `scripts/check-data-format-change.py` 의 판정이 `format_changed=false`
   일 때만 붙이는데, 그 스크립트의 `SENSITIVE_PATHS` 에 **스크립트 자신**(`:55`)이 들어 있다 — 주석만 고쳐도 `format_changed=true` 가 되어
   status 가 붙지 않고, PR 은 사람이 status 를 붙이거나 bypass 머지하기 전까지 `BLOCKED` 다(PR #75 자신이 사람 머지였다). 무인 루프의
   패스가 스스로 그 status 를 붙이는 것은 게이트의 존재 이유(「PR 이 게이트 자체를 고쳐 스스로 success 를 받을 수 있으면 안 된다」)를 어기므로
   하지 않는다. 따라서 ⑴ 은 **사람 몫의 패스**로 남긴다 — 원장 말미에 그렇게 적었다. 곁가지 관측: `review-gate.yml` 머리 주석 「checks.yml 의
   `required` 와는 독립이다. 이 게이트는 머지를 막는 체크가 아니라」는 ruleset 실측과 어긋난다(status 부재가 머지를 막는다) — 주석의 정확성은
   이 정책의 판정 표면이 아니고 `.github/workflows` 는 범위 밖이라 정책 소유자에게 넘긴다.

## 검증

```
$ git diff --stat 3205cb5 -- web/src
 web/src/screens/Sentiment.test.tsx |  8 --------
 web/src/screens/Sentiment.tsx      | 27 ++-------------------------
 2 files changed, 2 insertions(+), 33 deletions(-)      # 추가 2줄 전부 주석 · 삭제 33줄 전부 주석(JSX 블록 연속 줄 포함)
$ node -e '… ts.transpileModule(before|after, {removeComments:true, jsx:react}) …'   # 두 파일 모두 IDENTICAL — 주석을 걷은 출력 바이트 동일
$ (cd web && npx tsc -b && npm run lint && npx vitest run)   # rc 0 · 0 · 9 files 56 passed (편집 전 56 passed)
$ <지문 스크립트>                                        # lines=2463 files=134 (편집 전 2486/134)
$ diff hits-before hits-after                             # 삭제 25(Sentiment.tsx 17 · Sentiment.test.tsx 8) / 추가 2(정정 JSDoc 1줄 ×2) → 순 −23
$ python3 scripts/check-mockup-render.py ; python3 scripts/check-journey-mockup.py   # rc 0 · 0, 편집 전과 출력 바이트 동일
$ python3 scripts/check-data-format-change.py 3205cb5 HEAD   # format_changed=false (web/src 는 경로·내용 규칙 밖) → review/manual-approval 이 붙는다
```

파일 단독 계수 `Sentiment.tsx` 71 → 56 · `Sentiment.test.tsx` 31 → 23. PR 의 `ci/build`(tsc + eslint + vitest)와 `docs / render`·`docs / structure`
가 이 편집의 CI 집행자다.

설계 트래커가 `Sentiment.tsx` 를 **줄 번호로 인용한 자리**(`:24-29` · `:30-33` · `:263` · `:311-315` · `:394-396`)는 #76 이 이미 최대 +68 밀어
전부 낡아 있었고(자매 mockup-render 모델 몫 — 원장 「원본 쪽 누락 좌표」와 같은 성격), 이 패스는 그 위(`:59` 이전)를 건드리지 않아 머리 두
블록의 인용은 더 밀리지 않는다. 아래쪽 세 인용은 물리 −23 만큼 더 밀린다 — 이미 거짓인 좌표라 새 실패 모드가 아니지만 트래커 재핀 때 함께 볼 것.

## 원장 반영

- 패스 이력 행 `sentiment-split-pass | 3205cb5 | 2486 | 23 | 2463 | 134 → 134`.
- 파일 행 `web/src/screens/Sentiment.tsx` 56/2/54 → **71/15/56** · `web/src/screens/Sentiment.test.tsx` 21/0/21 → **31/8/23**. 신설 0, 행 수 138 그대로.
- 말미 집계 **2486/23/2463** · 잔여 ⑴ **1파일 10줄**(`scripts/check-data-format-change.py`, 변동 없음 — 사람 게이트 뒤) · ⑵ **9파일 41줄**(68 − 27) ·
  보류 0 · 행>실측 1(`batch-pvc.yaml`, 변동 없음).

## 범위 밖 (다음 패스로)

잔여 51줄 — 무인 루프의 다음 선은 ⑵ 최대 `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` +13 → `ac3-8-normalized-ratio.spec.ts` +9 →
`aggregate.py` +4 · `test_llm.py` +4 → 나머지 5파일(`kustomization.yaml` 3 · `test_feeds.py` 3 · `Fairness.test.tsx` 2 · `Reprocess.test.tsx` 2 ·
`Compare.tsx` 1). ⑴ `scripts/check-data-format-change.py` 10줄은 **사람 리뷰 게이트 뒤**다(위 판단 분기 3) — 사람이 그 PR 에
`review/manual-approval` 을 붙이거나 직접 패스를 내기 전까지 무인 패스의 선에서 뺀다. **`Dashboard.tsx` `BRIEF_KEY` 앞 3줄과
`Trend.tsx:81-82` 포인터**는 `Dashboard.tsx`·`Trend.tsx` 두 파일을 함께 여는 패스에서 처분한다(dash-brief-pass 판단 분기 ① — 이 패스는 `Sentiment`
두 파일만 열었다). `test_aggregate.py` 인라인 AC 태그 3줄은 정책 소유자 결정. `batch-pvc.yaml`·`kustomization.yaml` #92 교체분은 다음 `deploy/`
표적 패스. 재판정 후보 5건과 원본 누락 좌표 2건은 원장 말미 그대로(트래커의 `Sentiment.tsx` 줄 번호 인용 5곳 낡음을 자매 몫 관측으로 덧붙인다).
