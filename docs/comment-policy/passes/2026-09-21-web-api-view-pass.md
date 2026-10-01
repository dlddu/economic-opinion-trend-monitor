# web-api-view-pass — 서빙 API 뷰 2파일 + 행 없는 파일 2파일 판정

**표적 판정이다(전수 아님).** 기준 커밋 `6a0b464`. 추적 task는 `rct_20260920-0009`
(모델 `tbm_econ-opinion-monitor-comment-necessity`).
판정 대상은 **4파일 / 107줄** — 직전 패스(lineage-surface-pass)가 ⑴(행 없는 파일)로 남긴 **둘 전부**와,
⑵(행보다 자란 파일) 중 `web/src/api/` **한 디렉터리 둘**이다.

판정 결과 요약: **제거 47줄 · 문면 정정 4곳(지문 줄 수 불변, 물리 7줄 감소) · 유지 60줄.**
레포 전체 지문은 `2454 → 2407`(파일 `124 → 123` — `Compare.test.tsx` 가 남음 0 으로 지문에서 빠진다),
파일별 원장 행은 `124 → 126`.

> **이 패스 뒤 ⑴(행이 없는 파일)은 0 이다.** scenario-spec-pass 가 잔여 계수 규약을 세운 뒤 ⑴ 은
> 12파일 332줄 → 4파일 99줄(unrowed-files-pass) → 2파일 44줄(lineage-surface-pass)로 줄어 왔고, 남은 둘을
> 이 패스가 닫는다. 잔여는 이제 ⑵ 하나이고 **286줄 / 20파일**이다(아래 「판정하지 않은 것」).

## 무엇을 판정했나

| 파일 | 원장 상태 | 주석 | 판정 |
|---|---|---:|---|
| `web/src/api/types.ts` | 행 있음(남음 5) · 판정 이후 **+43 자람** | 48 | **제거 34줄** · 문면 정정 1곳 · 14 유지 |
| `web/src/api/client.ts` | 행 있음(남음 5) · 판정 이후 **+10 자람** | 15 | **제거 6줄** · 9 유지 |
| `web/src/screens/Compare.test.tsx` | 행 없음 | 6 | **전량 제거** |
| `web/src/screens/Fairness.tsx` | 행 없음 | 38 | **제거 1줄** · 문면 정정 3곳 · 37 유지(그중 28줄은 판단 분기 — 아래) |

주석 수는 정책의 추출 규칙(줄머리 패턴)으로 센 값이다. JSX 블록 주석 `{/* … */}` 은 **첫 줄만** 지문에
잡히므로, `Fairness.tsx` 의 문면 정정 3곳은 물리 6줄을 줄이지만 지문 줄 수는 움직이지 않는다.

### 왜 이 넷인가 — 슬라이스의 판별식

감지 단계는 「열린 PR 과 줄 겹침 0 인 최대 묶음」으로 `tests/e2e/run.sh`(+84) · `types.ts`(+43) ·
`client.ts`(+10) 셋을 권했다. 계획 시점(`6a0b464`)에 열린 PR 은 #75 하나이고 그것은 `scripts/`·
`.github/` 만 건드리므로 **겹침 조건은 어느 후보에서도 판별식이 아니다**. 대신 두 축으로 갈랐다:

1. **복원처의 종류.** `web/src/api/` 두 파일과 `Fairness.tsx`·`Compare.test.tsx` 의 복원처는 하나의
   묶음 — `go/internal/handlers/handlers.go` 의 응답 타입 doc 주석(serving-handlers-pass 가 전량
   유지 판정한 **설명의 주인**), 설계 트래커의 `fairness`·`compare` 행, PR #66·#70·#76 본문 — 이다.
   `run.sh` 의 복원처는 **다른 묶음**(테스트 문서 셋 · e2e 모킹 정책 · README 「빠른 시작」)이라
   같은 패스에 넣으면 근거 조사가 두 벌이 된다. `run.sh` 는 다음 패스의 1순위로 그대로 남긴다.
2. **⑴ 을 0 으로 만드는가.** `Fairness.tsx` 는 세 패스 연속(#70 → #76 → 판정 완료 후)으로 「열린 PR 이
   수정 중」이라 미뤄졌고, 이제 막는 PR 이 없다. `Compare.test.tsx` 는 #76 이 새로 들여 행이 없다.
   둘을 이번에 집지 않으면 ⑴ 은 또 한 패스를 넘긴다.

## 제거 — 복원 경로별 근거

### ⑴ Go 응답 타입 doc 의 재진술 — `web/src/api/types.ts` (34줄)

이 파일은 첫 줄이 스스로 말하듯 「Go 서빙 핸들러가 돌려주는 JSON 모양의 거울」이다. 슬라이스 6·7·8·9
(#45·#53·#66·#70)가 서빙 타입을 세우며 **Go 쪽 doc 주석과 TS 쪽 JSDoc 을 같은 문장으로 두 벌** 적었고,
serving-handlers-pass 가 Go 쪽을 「응답 계약의 『왜 두 필드인가』」로 **전량 유지** 판정했다. 정책의 제거
유형 「**다른 파일 주석의 재진술** — 설명의 주인에만 둔다」 그대로이고, 주인은 값을 **계산하는** 구현
쪽(`handlers.go`)이다 — `store_test.go` ← `store.go`, `Trend.test.tsx` ← `Trend.tsx` 와 같은 판단.

**export 타입의 JSDoc 요약 1줄은 남겼다**(정책 「TS: export 함수·타입의 JSDoc 요약 1줄」). 본문이 여러 줄인
JSDoc 넷은 요약 1줄로 줄였고, 필드 단위 JSDoc 은 export 가 아니라 요약 규칙의 보호를 받지 않는다.

| 지운 줄 | 복원처 (`go/internal/handlers/handlers.go`) |
|---|---|
| `TrendResponse.subject` — `The highlighted subject; the API resolves it, so it is never guessed here.` | `pickSubject` doc: 「honours an explicit ?subject= only when that subject actually has a line; otherwise the leading subject is selected」. `client.ts` 의 `trend` 주석(유지)이 web 안의 주인이기도 하다 |
| `TrendResponse.basis` — `The terms the lines were drawn on — one bucket unit, one x-axis.` | `trendBasis` doc: 「states the terms the lines were drawn on … a chart whose x-axis unit is implicit invites reading a week as an hour」 |
| `SentimentPoint.distribution` — `Four class ratios over the analyzed items; \`unanalyzed\` is its own share.` | `sentimentPoint` doc: 「The four sentiment ratios are over the *analyzed* items and Unanalyzed rides alongside as its own share of the whole」 |
| `SentimentPoint.analyzed_total` — `What those ratios were taken over — 60% of five is not 60% of five hundred.` | 같은 doc: 「AnalyzedTotal is what those ratios were taken over, so a 60% that rests on five items can be told apart from one that rests on five hundred」 |
| `SentimentAxisRow.present` — `False when Gold holds no row for this axis in that bucket — not "all zero".` | `sentimentAxisRow` doc: 「An axis with no Gold row in that bucket comes back with the zero distribution and Present false: all-zero ratios would otherwise read as "nothing was positive here"」 |
| `SentimentResponse.basis.latest_bucket` — `The bucket every axis is compared at; the series may end before it.` | `sentimentBasis` doc: 「LatestBucket is the bucket every axis is compared at … The two differ exactly when the selected axis has no row in that bucket」 |
| `FairnessRow` JSDoc 본문 4줄 (`\`raw_share\` is the naive count share, not the normalized one — the gap between the two fields is the source-volume deviation the aggregation corrects, so neither stands in for the other.`) + 빈 `*` 1줄 | `fairnessRow` doc: 「RawShare is deliberately *not* the normalized share: it is the naive count share … the gap between them is the source-volume deviation AC3.1 corrects」. 요약 1줄 `One subject counted two ways at the same bucket (AC3.1, AC3.8).` 만 남김 |
| `FairnessResponse.basis` — `The terms both counting modes were read on — one bucket, one unit.` · `raw_total` — `The denominator \`raw_share\` was taken over, published so counts add up.` · `method` — `How the normalization was done, stated rather than merely asserted.` | `fairnessBasis` doc: 「states the terms the two counting modes were read on … Method names the normalization the aggregation applied, so the screen can print it verbatim rather than asserting "normalized" with no way to say how … RawTotal is the denominator RawShare was taken over — published so the raw counts beside it add up」 |
| `CompareResponse.basis` — `The terms every column was compared on — same bucket, same normalization.` | `compare` handler doc: 「"Same basis" is the whole point of the view, so it is not left implicit — the response carries the basis it compared on」 |
| `TraceCrumbStep.present` — `False when that hop has no record — the chain is drawn broken, not hidden.` | 그리는 쪽이 주인: `web/src/screens/Trace.tsx` 의 `CMP-crumb` 앵커 「없는 홉을 숨기지 않고 끊긴 자리를 드러낸다」(lineage-surface-pass 유지분) |
| `TraceBronze` JSDoc 본문 6줄 (`\`body_available\` and \`body_preserved\` are two different facts …`) | `traceBronze` doc: 「BodyAvailable and BodyPreserved are deliberately two fields, not one. The first is what ingestion recorded about the *source* at collection time; the second is whether this lake actually holds the text now …」. PR #70 본문 「두 필드로 나눈 이유」 절도 축자(경로 ③). 요약 1줄만 남김 |
| `TraceSilver` JSDoc 본문 4줄 (`\`sentiment\` is nullable because "set aside" is an outcome, not a missing value …`) | `traceSilver` doc: 「Sentiment is a pointer because "no sentiment" is a real outcome, not a zero value: AC2.5 sets low-confidence records aside」. 요약 1줄만 남김 |
| `TraceResponse` JSDoc 본문 4줄 (`\`found=false\`, a null \`silver\` and \`bronze.body_preserved=false\` mean three different things …`) | `traceResponse` doc 의 세 분기 표(「Found=false / Bronze.BodyPreserved / Silver=nil … Collapsing them into one "no data" would tell the reader their lookup failed」) + PR #70 「모자란 것을 뭉치지 않는다」 표(경로 ③). 요약 1줄만 남김 |
| `TraceResponse.selection` — `How \`record_id\` was arrived at, so a fallback never reads as a hit.` | `traceResponse.Selection` 인라인 주석: 「Selection says how RecordID was arrived at: "requested" … "auto" … "requested-missing", or "empty"」 + PR #70 「fallback 이 hit 로 읽히지 않는다」 |

### ⑵ 화면·트래커가 복원하는 클라이언트 주석 — `web/src/api/client.ts` (6줄)

```
- // Both counting modes come back in one response, so switching between them is
- // a client-side re-read of data already in hand — no round trip, and no mode
- // the server has not actually computed.
  fairness: (axis: Axis = "KR") => …
```

**같은 사실이 web 안에 이미 두 벌 더 있고, 주인은 토글을 그리는 `Fairness.tsx` 다** —
`type Mode` 의 JSDoc(「서버가 두 값을 모두 내려주므로 전환은 실제로 값을 바꾼다」)과 `CMP-norm-toggle`
앵커(「두 값이 같은 응답에 함께 오므로 누르면 순위·막대·수치가 실제로 바뀐다」). 경로 ②로는 설계
트래커 「`세는 방식` 폼 카드 전면 부재」 행(「그 토글은 응답에 두 값이 함께 오므로 누르는 즉시
순위·막대·수치를 바꾼다 — 제출 왕복이 없으니 …」)과 doc-tracker 슬라이스 8 행(「전환 스위치는 두 값이
한 응답에 함께 오므로 실동작한다」)이, 경로 ③으로는 PR #66 본문이 적는다. 네 벌 중 세 벌째였다.

```
  // record_id is optional for the same reason subject is on trend: the screen
- // has to be able to open before it knows one. The response names which record
- // it settled on, so a fallback never reads as a hit.
+ // has to be able to open before it knows one.
```

뒷문장은 위 ⑴ 의 `selection` 필드와 같은 재진술이다(주인 `traceResponse.Selection` + PR #70). 앞문장은
남겼다 — **왜 이 인자가 선택적인가**는 이 호출 시그니처의 근거이고 `trend` 의 같은 주석(유지)과 짝이다.

```
- // Stub endpoint for the one screen still on Placeholder (reprocess). Its
- // shape is not finalized, so it is consumed as unknown JSON.
  screen: (name: string) => getJSON<unknown>(`/${name}`),
```

정책의 제거 유형 「README 재진술 — "나머지 화면은 플레이스홀더" 같은 **범위 서술**」 그대로다.
「어느 화면이 아직 플레이스홀더인가」는 `App.tsx` 의 `BUILT` 집합(경로 ①)과 doc-tracker 「잔여 — 화면 1
(`reprocess`)」(경로 ②)이 복원하고, `handlers.go` 패키지 주석이 「Only reprocess still returns a shaped
placeholder」로 한 번 더 적는다. `unknown` 으로 소비한다는 것은 시그니처 `getJSON<unknown>` 자체다.
슬라이스 10 이 착지하는 순간 「the one screen」 은 조용히 거짓이 된다 — 개수를 담은 서술이다.

### ⑶ 테스트 이름·트래커·PR 본문이 복원하는 시험 주석 — `web/src/screens/Compare.test.tsx` (6줄)

```
- /** 여정 이탈 카드 한 장의 제목 → 링크 라벨·목적지. */
  function exitCard(container: HTMLElement, heading: string): HTMLElement {
```

**경로 ①.** 다섯 줄짜리 local 헬퍼이고 이름·시그니처(`container, heading → HTMLElement`)가 하는 일을
말한다. 게다가 요약이 부정확하다 — 헬퍼는 「링크 라벨·목적지」가 아니라 **카드 요소**를 돌려주고, 라벨과
`href` 는 호출한 쪽이 읽는다. dashboard-surface-pass 가 `Dashboard.test.tsx` 의 `Landing` JSDoc 을 남긴
것과 다른 자리다 — 거기서는 이름이 역할을 말하지 않았고 담긴 것이 단언 설계였다.

```
- // `JRN-axis-contrast` 는 축 비교를 끝낸 독자를 두 갈래로 내보낸다. 목업은 워크스루
- // 단계마다 카드를 한 장씩 세우지만 구현은 한 페이지이므로, 확인할 것은 배치가 아니라
- // **두 이탈이 다 있고 각자 제 목적지를 가리키는가**다.
  it("offers both journey exits, each to its own destination", async () => {
```

**경로 ② — 같은 커밋(#76)이 열었다.** 설계 트래커 「해소된 등재」의 두 이탈 행이 이 문장을 적는다:
「목업은 이 카드를 워크스루 단계(`화면 2`)에 두지만 구현의 비교 화면은 단계가 접힌 한 페이지라 배치만
다르다」 · 「두 대상 모두 `BUILT` 라 어느 쪽도 `Placeholder` 로 보내지 않는다(`Compare.test.tsx` 가 라벨과
`href` 를 잠근다)」. 무엇을 단언하는지는 테스트 이름이 말한다(경로 ①). trend-surface-pass 가
`Trend.test.tsx` 에서 「design-tracker 승계 행이 실패 모드를 적고 테스트 이름이 단언을 말한다」로 지운
것과 같은 형태다.

```
- // 이탈 카드는 비교 컬럼이 아니다 — 같은 그리드에 섞여 `.cmpcol` 로 세어지면 「세 축을
- // 나란히」라는 이 화면의 단정이 조용히 넷이 된다(서빙 e2e 도 같은 수를 센다).
  it("keeps the exits out of the three compared columns", async () => {
```

**경로 ③ + ①.** PR #76 본문 「검증」 절이 축자로 적는다 — 「`/compare`(ac3-7) … 가 보는 구조
선택자(`.cmpcol` 3개 · `.cmprow` · `.norm-flag` 가시성 …)를 새로 만들어내지 않는다 — `Compare.test.tsx`
두 번째 테스트가 그 수를 직접 잠근다」. 「서빙 e2e 도 같은 수를 센다」는
`tests/e2e/specs/ac3-7-three-axis-compare.spec.ts` 가 `page.locator(".cmpcol")` 로 스스로 보여 준다.
테스트 이름이 단언의 형태를 말한다.

이로써 이 파일의 주석은 0 이고 지문에서 빠진다. **행은 남긴다** — 지우면 다음 패스가 「아직 아무도 보지
않은 파일」로 오해한다(dashboard-surface-pass 의 `Dashboard.tsx` 처분).

### ⑷ 렌더되는 문면·PRD 가 복원하는 1줄 — `web/src/screens/Fairness.tsx`

```
- {/* 비율이 아니라 건수다 — 같은 행에서 구분 표기(AC3.8). */}
  <td className="num">
    <span className="meta">원시 {r.raw_count}건</span>
```

**경로 ①.** 바로 아래 셀이 `원시 {n}건` 을 렌더한다 — 「비율이 아니라 건수」는 그 문면이 독자에게 직접
말한다. **경로 ②.** PRD AC3.8 「필요 시 원시 수집 건수와 구분해 함께 제공한다」와 설계 트래커 「대비 표
컬럼 구성」 행(「두 컬럼을 나란히 놓고 …」)이 구분 표기 자체를 적는다.

## 문면 정정 (지문 줄 수 불변)

### ⑸ README 범위 절 포인터 제거 — `web/src/api/types.ts`

```
- // are the hand-kept serving-API view (stub contracts, see README scope).
+ // are the hand-kept serving-API view.
```

괄호절은 README 「범위」의 재진술(경로 ②)이면서 **낡았다** — README 「범위 밖」의 「화면별 정식 API
데이터 계약 (스텁 라우트만)」은 서빙 다섯 라우트가 Gold 파생이 된 지금 거짓이고, serving-handlers-pass 가
`README.md:223`·`:228` 의 같은 낡음을 이미 기록했다. 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가
강해진다」. 앞 두 줄(거울이라는 사실 · 손으로 유지하는 뷰라는 경계)은 initial-pass 의 유지 판정 그대로다 —
codegen 이 이 파일을 갱신해 주지 않는다는 경계는 `web/` 어디에도 적혀 있지 않다.

### ⑹ 앵커의 과거 상태 서술 제거 — `web/src/screens/Fairness.tsx` `CMP-note`

```
- {/* CMP-note — 표기 원칙. 화면은 이미 원칙을 지키고 있었지만(정규화/원시 플래그와
-     행마다의 `원시 N건`) 왜 그렇게 적는지는 말하지 않았다. 데이터가 없어도 성립하는
-     문면이라 응답 분기 밖에 둔다. */}
+ {/* CMP-note — 표기 원칙. */}
```

「지키고 있었지만 … 말하지 않았다」는 #76 이전 상태의 서술 — 정책의 「작업 흔적」이고 복원처는 그 커밋
자신(경로 ④)이다. 「응답 분기 밖에 둔다」는 설계 트래커 「세는 방식 표기 원칙 note 부재」 행(「서빙 차단이
없어 응답 분기 밖에 둘 수 있었고(데이터가 오기 전에도 선다)」)과 doc-tracker #76 행(「응답 분기 **밖**에 둬
데이터가 오기 전에도 읽히게 했다」)이 축자로 적는다. 앵커와 이름표만 남겼다.

### ⑺ 패턴 앵커의 구성·근거 열거 제거 — `web/src/screens/Fairness.tsx` `PAT-raw-vs-norm`

```
- {/* PAT-raw-vs-norm — 같은 대상의 원시 카운트 막대 ↔ 정규화 비율
-     막대를 한 행에 병치한다. 두 막대가 갈리는 폭이 곧 수집원 편차
-     보정량이고(V4, AC3.1/3.8), 지금 고른 세는 방식 쪽을 강조한다.
-     CMP-table 로 그린다 — 목업 `STP-check-normalized` 와 같다. */}
+ {/* PAT-raw-vs-norm — 원시 · 정규화 대비. */}
```

lineage-surface-pass 가 `PAT-lineage` 를 1줄 형태로 줄인 것과 같은 처분이다. 열거는 설계 트래커가
축자로 복원한다(경로 ②) — 「대비 표 컬럼 구성」 행: 「두 컬럼을 나란히 놓고 지금 고른 쪽을 `fair-on`
으로 강조한다 — 이 화면의 존재 이유가 『같은 대상을 두 방식으로 센 결과의 **대조**』(AC3.1/3.8)」,
그리고 규칙 3 절: 「`PAT-raw-vs-norm` 은 그 슬라이스가 실제로 구현·마킹했다(`Fairness.tsx` 의 원시·정규화
병치 표)」. 「갈리는 폭이 곧 수집원 편차 보정량」은 `handlers.go` `fairnessRow` doc 이 주인이다.
`CMP-table` 토큰을 걷어도 게이트의 마커 집합은 움직이지 않는다 — `Trend.tsx` 가 같은 마커를 들고 있고
`check-mockup-render.py` 출력이 **바이트 동일**함을 확인했다(아래 「검증」).

### ⑻ 앵커의 근거 제거 — `web/src/screens/Fairness.tsx` `CMP-kv`

```
- {/* CMP-kv — 무엇을 근거로 센 값인지. 분모를 감추면 옆의 건수와
-     대조할 수 없다. */}
+ {/* CMP-kv — 세는 기준. */}
```

설계 트래커 「구현 전용 — 세는 기준 카드」 행이 축자다: 「기준 카드는 `raw_share` 의 **분모를 공개**한다 —
분모가 안 보이면 옆의 건수와 대조할 수 없고」. `handlers.go` `fairnessBasis` doc 의 「published so the
raw counts beside it add up」이 한 번 더. 카드 제목 `세는 기준` 이 바로 아래 렌더된다.

## 유지 — 근거

- **`types.ts` 14줄.** 머리 3줄(거울 · 손으로 유지하는 뷰의 경계 — 셋째 줄은 정정 후), export 타입 JSDoc
  요약 11줄(`AxisColumn` · `TrendPoint` · `TrendSeries` · `SentimentPoint` · `SentimentAxisRow` · `TraceCrumbStep` ·
  `TraceIngestion` 일곱과, 줄여 남긴 `FairnessRow`·`TraceBronze`·`TraceSilver`·`TraceResponse` 넷). `TrendSeries`
  요약의 둘째 문장(「Exactly one series in a response is `selected`」)은 Go doc 과 겹치지만 **한 줄 요약
  안**이라 요약 규칙이 이긴다. 인라인 `(AC3.7)` 류 태그는 aggregation-harness-pass 의 `# AC3.2` 선례대로
  유지(판단 분기 — 아래).
- **`client.ts` 9줄.** 머리 3줄은 initial-pass 유지 판정 그대로다 — 「상대 `/api` 베이스가 dev·prod
  모두에서 되는 이유」는 `BASE = "/api"` 라는 한 상수의 근거이고 새 복원 경로가 열리지 않았다
  (`vite.config.ts` 는 지문 범위 밖이며 프록시 **메커니즘**만 적는다). `trend` 의 「subject is optional
  … so the screen never has to guess a name before it has seen the data」 2줄과 `trace` 의 앞문장 2줄은
  **왜 인자가 선택적인가** — 시그니처의 근거이고 web 안에서 이 파일이 주인이다(`types.ts` 쪽 사본은 ⑴
  에서 지웠다). `sentiment` 의 「The axis is a query parameter, not a client-side filter」 2줄은 판단
  분기(아래).
- **`Fairness.tsx` 37줄.** 앵커 아홉(`CMP-seg`·`CMP-axpill`·`CMP-norm-toggle`·`CMP-note`×2·
  `PAT-raw-vs-norm`·`CMP-delta`·`CMP-kv`·`CMP-badge`)은 원장이 유지로 못박은 추적 앵커 규약이고
  `check-mockup-render.py` 의 `markers()` 가 **주석에서** R3 대조 모집단을 긁는다. 「순위는 세는
  방식을 따라간다 — 그래야 '정규화하면 순위가 유지되나?' 라는 질문이 화면 위에서 실제로 답해진다」
  2줄은 제품 의미론의 근거(`Compare.tsx` 의 「`0%` 로 그리지 않는 이유」 계열)로 트래커는 강조(`fair-on`)만
  적고 **정렬이 모드를 따르는 이유**는 적지 않는다. 나머지 26줄과 두 앵커(`CMP-seg`·`CMP-norm-toggle`)의
  사유 절은 아래 판단 분기.

## 판단이 갈려 남긴 것

- **`Fairness.tsx` 상단 28줄 — 설계 트래커의 줄 번호 인용이 잠근다.** 머리 23줄(6–28행: 화면의 존재 이유,
  열지 않는 두 단계의 사유), `type Mode` JSDoc(38행), `shareIn` JSDoc(57행), 「두 방식의 1위가 갈리면
  그 자체가 판정의 근거다」(91행), `CMP-seg` 의 사유 절(97행), `CMP-norm-toggle` 본문(110–112행).
  **복원 경로는 전부 실재한다** — 머리 첫 문단은 doc-tracker 슬라이스 8 행(「같은 대상을 **두 가지 세는
  방식으로 병치**한다(집계가 계산한 `normalized_share` ↔ 원시 건수를 그냥 나눈 `raw_share`)」)과 화면의
  lede 문면(경로 ①)이, 「한 매체의 편집 결정」은 목업 `JRN-spike-verification.html`(경로 ②)이, 열지 않는
  두 단계는 설계 트래커 `STP-inspect-sources`·`STP-drilldown-articles` 두 행(Gold 키에 수집원 차원이 없다 ·
  `/api/trace` 는 아는 레코드 하나로 내려가는 길이지 목록이 아니다 — **축자**)과 같은 파일의 두 번째
  `CMP-note` 문면(경로 ①)이, 91행은 「두 방식 대조 요약 카드」 행이, 38·110행은 ⑵ 에서 지운
  `client.ts` 사본과 같은 복원처가 받는다. 그럼에도 지우지 않는다: 설계 트래커 「`세는 방식` 폼 카드
  전면 부재」 행이 `CMP-norm-toggle` 의 위치를 **`Fairness.tsx:110-118` 로 인용**하고 있어, 118행 위에서
  한 줄이라도 걷으면 자매 모델 행의 인용이 밀린다. serving-handlers-pass 가 `handlers.go` 패키지 주석을
  (`:34`·`:30-37` 인용), product-surface-pass 가 `Sentiment.tsx` 세 블록을(`:24-29`·`:30-33`·`:55-58`)
  같은 이유로 남긴 것과 동일한 처분이다. 그래서 이 패스의 제거·정정은 **전부 118행 아래**다.
  **다시 볼 시점**: 그 인용이 내용 지목(`Fairness.tsx ∋ CMP-norm-toggle`)으로 바뀌거나 그 행이 처분될 때.
  그때는 머리 23줄 + 38·57·91행 + 97·110행의 사유 절이 **한 번에** 제거·정정 대상이다(28줄 안팎).
  세 파일이 같은 자물쇠에 걸려 있으므로, 트래커 소유자(`tbm_econ-opinion-monitor-mockup-render`)가
  줄 번호 인용을 앵커 지목으로 바꾸면 세 자리가 함께 풀린다 — 이 원장이 그 소유자에게 남기는 유일한 요청이다.
- **`client.ts` `sentiment` 의 2줄** — 「The axis is a query parameter, not a client-side filter: the
  comparison bucket is chosen over all axes, so the server has to see them all.」 뒷절은 `handlers.go`
  `sentiment` doc(「the latest bucket is picked once and every axis is filtered to it」)이 복원하지만,
  앞절 — **왜 클라이언트에서 거르지 않는가** — 는 API 모양의 결정이고 Go 쪽은 적지 않는다. 「애매하면
  남긴다」.
- **인라인 AC 태그** — `types.ts` 요약 8곳의 `(AC3.7)`·`(AC3.5)`·`(AC3.4, AC3.6)`·`(AC1.4, AC1.5, AC1.7)` 등과
  `Fairness.tsx` `CMP-norm-toggle` 의 `(AC3.8)`. 「작업 흔적」으로 읽으면 제거 후보이나
  aggregation-harness-pass(`# AC3.2`)·lineage-surface-pass(`Trace.test.tsx` 3자리)가 산문 안 인라인 태그를
  머리 **배너**와 구별해 유지한 선례를 따른다.
- **`Fairness.tsx` 두 번째 `CMP-note` 의 사유 절**(「열지 못한 두 단계의 사유. 링크를 달지 않는다.」)은
  lineage-surface-pass 가 `Trace.tsx:288` 의 같은 형태(「열지 않은 단계의 사유. 링크도 버튼도 두지 않는다.」)를
  유지한 것과 같은 처분이다 — 한쪽만 줄이면 두 화면의 같은 앵커가 다른 모양이 된다.

## 검증

- **비주석 코드 무변경** — 네 파일을 TypeScript 프린터(`removeComments`)로 주석을 걷고 JSX 주석 컨테이너
  (`{/* … */}` → 빈 `{}`)와 빈 줄을 지운 뒤 `main` 과 대조: **4파일 전부 바이트 동일**. (esbuild 축소는
  타입 전용 파일을 빈 출력으로 만들어 판별력이 없다 — `types.ts` 는 프린터 방식으로만 잴 수 있다.)
- `web/`: `tsc --noEmit` rc=0 · `eslint .` rc=0 · `vitest run` **44 passed / 8 files**(부모와 동일 —
  `Compare.test.tsx` 두 케이스도 그대로 돈다).
- `scripts/check-mockup-render.py` rc=0 — **부모와 출력 바이트 동일**(R3 in-scope 25종 · 성립 25 · 등재 예외 0 ·
  구현 전용 1 · R4·R5 상한 전부 0). `scripts/check-journey-mockup.py` rc=0 — 부모와의 차이는 R8 의 상대 링크
  수 `135 → 136` 한 자리뿐이고, 그 하나는 원장이 이 패스 문서로 거는 링크다(전부 해석).
  `tests/e2e/check_scenario_mapping.py` rc=0(무접촉).
- 지문: 판정 전 `lines=2454 files=124` / `6a8124bd…` (저장된 관측값과 **바이트 동일**하게 재현) →
  판정 후 `lines=2407 files=123` / `d8aa1d42…`. 제거 47 = 34 + 6 + 6 + 1.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

원장 「읽는 법」의 계수 규약대로 — **⑴ 은 0**, 잔여는 ⑵ 뿐이고 **286줄 / 20파일**이다(착지 기준 `6a0b464`).

| 몫 | 내용 | 파일 | 줄 |
|---|---|---:|---:|
| ⑴ | 행이 없는 파일 | 0 | 0 |
| ⑵ | 행이 있으나 판정 이후 자란 파일의 증가분 | 20 | 286 |

⑵의 상위 넷이 `tests/e2e/run.sh`(+84) · `web/src/screens/Trend.tsx`(+25) · `scripts/check-journey-mockup.py`(+23) ·
`web/src/tokens/tokens.css`(+22)로 **154줄 = 54%** 다. **`run.sh` 가 다음 패스의 1순위다** — 84줄이 잔여의
29% 이고 복원처(테스트 문서 셋 · e2e 모킹 정책 원장 · README)가 이 패스의 묶음과 다르다는 이유로 이번에
뺐다. 착지 시점에 열린 PR 은 #75 하나이고 ⑵ 어느 파일도 건드리지 않는다(#75 가 착지하면 신설
`scripts/check-data-format-change.py` 가 ⑴ 에 새로 들어온다).

**잔여에 들어가지 않는 재판정 후보**(줄이 아니라 복원 경로가 자란 자리 — 계수 규약이 세지 않는다):
⑴ `Trace.tsx` 27줄 · `Trace.test.tsx` 22줄 — lineage-surface-pass 가 이름으로 넘긴 것으로, 별도 task
`rct_20260920-0013` 이 열려 있다. 이 패스는 **건드리지 않았다**(그 task 의 범위). ⑵ 위 「판단이 갈려
남긴 것」의 `Fairness.tsx` 상단 32줄 — 트래커 인용이 바뀌는 순간 열린다.

**범위 밖(이 모델의 task 가 다룰 것이 아니다)**: Python docstring 표면(정의 변경 — tobe-modeler 몫).

**판정하지 않은 것을 판정했다고 적지 않는다** — 위 20파일은 옛 판정 시점 행을 그대로 둔 채 남는다.
