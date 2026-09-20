# serving-handlers-pass — 서빙 핸들러 패키지 2파일 판정 (2026-09-20)

기준 커밋 `c887503` · 판정 범위 **2파일 372줄**(`handlers.go` 252 · `handlers_test.go` 120) ·
제거 **6줄** · 문면 정정 **4곳(13줄 감소)** · 남음 **353줄**
(레포 전체 지문 `2419 → 2400`, 파일 수 `123 → 123`)

정책 본문은 [`../README.md`](../README.md), 파일별 결과는 [`../ledger.md`](../ledger.md)에 있다.

## 왜 이 범위인가

직전 [dashboard-surface-pass](2026-09-20-dashboard-surface-pass.md)가 말미 요약에서 다음 패스로
넘긴 것이 이 두 파일이다 — 「⑵ `go/internal/handlers/handlers.go` +228 · `handlers_test.go` +106 ·
`tests/e2e/run.sh` +84 — 서빙·하네스 축이고 셋 다 열린 PR 이 없다. 다음 패스의 가장 큰 덩어리다」.

트리거 지점 `4772128` 에서 독립 파서로 잔여를 다시 세면 **667줄** — ⑴ 행이 없는 **4파일 101줄** +
⑵ 행이 있으나 그 뒤 자란 **13파일 566줄** — 이고 직전 패스의 말미 요약과 **전건 일치**한다.

> **기준 커밋을 옮겼다.** 이 패스는 `4772128`(트리거 지점 · 잔여 667)에서 준비됐으나, 준비와 실행
> 사이에 자매 PR **#84·#85 가 먼저 착지**해 `Dashboard.*`·`Trend.*`·`tokens.css`·
> `aggregation-5…spec.ts` 에 주석 **64줄**을 더했다. 직전 dashboard-surface-pass 가 「#84 가 뒤에
> 착지하면 그 증가분은 계수 규약 ⑵ 로 다음 패스에 도달한다」고 예고한 그 창이고, `Dashboard.tsx` 가
> `남음 0` 행을 가진 채 `0→19` 로 ⑵ 에 돌아온 것이 그 도달 경로가 실제로 작동한 증거다. 그래서
> `c887503` 으로 리베이스하고 지문·잔여·행 수를 전부 재측정했다 — `c887503` 의 패스 직전 잔여는
> **731**(⑴ 4파일 101 + ⑵ 17파일 630)이다. **두 자매는 `go/internal/handlers/` 를 건드리지 않아
> 이 패스가 판정하는 372줄 자체는 움직이지 않았다**(판정 전 줄 수 252·120 이 리베이스 전후 동일).

이 패스는 그중 **한 패키지에 닫혀 있고 소유자가 없는 334줄**(⑵의 두 파일 증가분)을 집어,
**두 파일 전체 372줄을 재판정**한다. 증가분만 처분하지 않는 것은 원장 「읽는 법」이
못박은 불변식 때문이다 — **행의 `남음` 은 그 행의 비고가 열거로 해명하는 줄 수와 같아야 한다**
(trend-surface-pass 가 한 번 거부된 자리).

**열린 PR 과의 겹침은 0이다.** 계획 직전 열린 PR 일곱(#85 · #84 · #78 · #76 · #75 · #73 · #72)의
`/pulls/N/files` 를 전부 재조회해 대조했다 — 어느 것도 `go/internal/handlers/` 를 건드리지 않는다.
`tests/e2e/run.sh` 를 같이 묶지 않은 것은 판정 경계를 **한 패키지**로 닫아 두기 위해서다(하네스 축은
서빙 축과 복원처가 다르다 — 다음 패스의 몫).

## 제거한 것 (6줄)

### ① 겹쳐 붙은 낡은 doc 주석 — 같은 함수에 요약이 두 벌 (`handlers.go` 5줄)

`latestBucket` 앞에 doc 주석 블록이 **두 개 이어 붙어** 있었다. 앞 5줄이 지운 것이다.

```
// latestBucket returns the most recent time bucket present in Gold, with the
// unit it was bucketed by. Bucket keys are zero-padded ISO prefixes
// ("2026-06-23T14", "2026-06-23", "2026-W25"), so lexical max is chronological
// max within a unit. Empty Gold yields the zero values, which the callers below
// treat as "no rows match".
```

바로 뒤에 같은 함수의 두 번째 요약(「`latestBucket` picks the basis of the compare view: the newest
bucket of the finest unit present.」 이하 9줄, 슬라이스 8 이 단위 정착을 들이며 쓴 판)이 있고,
그쪽이 **더 정확하다**. 지운 블록의 세 주장은 전부 같은 패키지 안에서 복원된다(경로 ①):

| 지운 주장 | 복원처 |
|---|---|
| 「Gold 에 있는 가장 최근 버킷을 그 단위와 함께 돌려준다」 | 남은 블록 첫 줄이 같은 말을 한다 |
| 「버킷 키는 0 채움 ISO 접두사라 한 단위 안에서 사전순 최대 = 시간순 최대」 | 남은 블록(「`2026-W26` 이 `2026-06-23T14` 보다 크게 정렬되는 것은 'W' 가 '0' 을 이기기 때문」) + `distinctBuckets` doc(「zero-padded ISO prefixes, so lexical order is chronological within one unit」) |
| 「빈 Gold 는 zero value 를 내고 호출자는 그것을 '맞는 행 없음' 으로 취급한다」 | `finestUnit` doc(「The zero unit for empty input is deliberate: a caller filtering on it keeps nothing, so an empty Gold yields an empty view rather than an invented basis.」) |

제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」를 **한 파일 안의 두 벌**에 적용한
것이다(주인은 뒤 블록). 앞 블록이 **단위를 정착시키기 전의 판**이라는 것도 근거를 더한다 —
두 블록을 나란히 읽으면 앞쪽은 「사전순 최대가 시간순 최대」라고만 말하고, 뒤쪽은 그것이
**단위를 먼저 정하지 않으면 거짓**임을 설명한다. 정책의 「되풀이된 주석이 낡아 틀려 있으면 제거
근거가 강해진다」에 해당한다.

### ② 절 구분선 + 슬라이스 흔적 (`handlers_test.go` 1줄)

```
// --- trace (slice 9) ---------------------------------------------------------
```

제거 유형 ④ 「구분선」이고, 괄호 안은 유형 ③ 「작업 흔적」(슬라이스 번호)이다. 절 이름은 바로
아래 `writeLineage`·`TestTrace*` 이름들이 복원한다(경로 ①). **같은 패키지의 같은 형태를
initial-pass 가 이미 지웠다** — `handlers.go` 의 `// --- … ---` 3줄이 그 패스의 제거분이고,
`contracts/codegen.py` 배너 6줄 · `Makefile` `## ---` 6줄 · `tests/e2e/lib/gold.ts` 롤업 구분선
1줄이 같은 판정의 선례다. 이 한 줄은 그 패턴이 **슬라이스 9 와 함께 재발한 것**이다.

## 문면 정정 (4곳 · 13줄 감소)

네 곳 모두 **삭제가 아니라 정정**인 것은, 같은 블록의 남는 절이 복원 불가능한 설계 근거이기
때문이다(`deploy/base/kustomization.yaml`·`ingest-job-agg.yaml` 선례). 셋은 같은 트랩의 사본을
**주인 지목 포인터**로 줄인 것이고(`ingest-job-cycle2.yaml` 이 보여준 올바른 해소 형태), 하나는
과거 상태 서술을 걷은 것이다.

### ③ `trend` 의 「Mixed bucket units」 6줄 → 1줄 (−5)

```
//   - Mixed bucket units. Gold may hold hour, day and week rows for the same
//     subject (the contract allows all three). Plotting them together would put
//     a week point between two hours, so the handler settles on one unit and
//     keeps only those rows. AC3.3 has not landed yet, so today this always
//     resolves to "hour" — the filter is what keeps the series clean when
//     rollups do arrive.
```
→
```
//   - Mixed bucket units, which plottedUnit settles before the rows are folded.
```

두 가지가 겹친다.

1. **주인이 같은 파일 안에 있다.** 이 핸들러가 `handlers.go:330` 에서 부르는 `plottedUnit` 의
   doc 주석(`:703-711`)이 같은 트랩을 **더 자세히** 설명한다 — 단위 순위로 고르는 이유,
   「`2026-W26` 이 `2026-06-23T14` 보다 크게 정렬되는 것은 'W' 가 '0' 을 이기기 때문」, 빈 입력의
   zero unit 계약까지. 설명의 주인은 그 함수다(경로 ①).
2. **낡아서 틀렸다.** 「AC3.3 has not landed yet, so today this always resolves to "hour"」는
   AC3.3 롤업이 `32faf64`(#62, 2026-09-19)로 착지하며 **거짓이 됐다**. 같은 사실을 `plottedUnit`
   은 이미 고쳐 적었다(「Rollups have landed, so this is the live default」) — 고친 쪽과 놓친 쪽이
   한 파일에 같이 있던 자리이고, 정책이 드는 실패 모드(「원본만 고쳐질 때 조용히 거짓이 된다」)
   그 자체다.

남긴 것: 앞 문단(Gold 의 평평한 행 → 시계열, 한 x축이어야 정직하다)과 두 번째 항목
(「Ranking on stale rows」). 항목을 지우지 않고 한 줄로 남긴 것은 목록이 「Two things could break
that」 로 열려 있어 항목 수가 문면에 걸려 있기 때문이고, 같은 파일의 `compare` doc 이 이미
이 형태(「The same mixed-unit trap the trend and sentiment handlers document applies …,
and latestBucket closes it the same way」)를 쓴다.

### ④ `sentiment` 의 같은 트랩 + 과거 상태 서술 9줄 → 6줄 (−3)

```
// Gold holds one AxisSentiment row per (axis, time bucket), so handing the raw
// rows over — which is what this route used to do — leaves the caller to decide
// which of them are comparable, and every caller would decide differently. The
// same two traps the trend handler documents apply, and are closed the same way:
//
//   - Mixed bucket units. Gold may carry hour, day and week rows for one axis
//     (the contract allows all three). Stacking them on one x-axis would put a
//     week between two hours, so one unit is settled on and the rest dropped.
//     AC3.3 has not landed, so today this always resolves to "hour".
```

두 가지를 걷었다.

- **「— which is what this route used to do —」**(과거 상태 서술). 유형 ③ 「작업 흔적」이고
  복원처가 둘이다: 슬라이스 6 커밋 `b30a321`(경로 ④)과 doc-tracker `2026-09.md` 변동 이력
  (「`/api/sentiment` 는 Gold 행을 그대로 덤프해 어느 버킷·어느 단위인지 호출자가 정해야 했다」,
  경로 ②). `aggregate-job.yaml`·`workflow-template.yaml` 에서 「Until this template existed …」
  을 지운 것과 같은 유형이다.
- **「Mixed bucket units」 4줄 → 1줄 포인터.** 이 핸들러의 주인은 `handlers.go:412` 에서 부르는
  `sentimentUnit`(`:932-935`)이고, 그 doc 이 이미 `plottedUnit` 을 주인으로 지목하고 있다
  (「matching plottedUnit's reasoning」). 같은 트랩의 **세 번째 사본**이었고 「AC3.3 has not
  landed」 로 역시 낡아 있었다.

남긴 것: Gold 키 구조에서 오는 비교 가능성 문제와 두 번째 항목(「Comparing axes across
buckets」) — 후자는 이 핸들러만의 실패 모드다.

### ⑤ `fairness` 의 「until now this route closed neither」 2줄 → 1줄 (−1)

```
// The two traps the other Gold readers document apply here too, and until now
// this route closed neither:
```
→
```
// The two traps the other Gold readers document apply here too:
```

「until now this route closed neither」는 **이 라우트의 과거 상태**다. 복원처가 둘이다:
슬라이스 8 커밋 `ddaef4f`(경로 ④)과 doc-tracker `2026-09.md` 그 행(「`/api/fairness` 는 Gold 를
읽는 다섯 핸들러 중 **유일하게 버킷 단위를 정착시키지 않아** AC3.3 롤업 착지 이후 같은 대상을
hour·day·week 3행으로 받아 중복 계상하고 기준 버킷도 고정하지 않아 지난 버킷의 1위가 현재
순위를 눌렀다」, 경로 ②). 주석보다 문서가 더 자세하다.

### ⑥ `fairness` 의 같은 트랩 4줄 → 1줄 (−3)

```
//   - Mixed bucket units. Gold carries hour, day and week rows for the same
//     subject since AC3.3 landed, so ranking the rows flat returned one subject
//     three times over and ranked it against its own rollups. The unit is
//     settled first, the same way trend does it.
```
→
```
//   - Mixed bucket units, which plottedUnit settles before anything is ranked.
```

같은 트랩의 **네 번째 사본**이고(주인 `plottedUnit`, `handlers.go:474` 에서 호출), 「returned one
subject three times over」 는 ⑤와 같은 과거 상태 서술이다. 두 번째 항목(「Ranking on stale
rows」)은 이 핸들러의 실패 모드라 남겼다.

### ⑦ `handlers_test.go` 의 과거 상태 서술 3줄 → 2줄 (−1)

```
// The point of the endpoint: one record id reaches all three layers at once.
// Before slice 9 this returned a fixed string with no lake read behind it, so
// the assertion that matters is that the *stored* values come back.
```
→
```
// The point of the endpoint: one record id reaches all three layers at once, so
// the assertion that matters is that the *stored* values come back.
```

「Before slice 9 this returned a fixed string with no lake read behind it」는 유형 ③ 「작업
흔적」이고 doc-tracker `2026-09.md` 슬라이스 9 행이 축자로 복원한다(「`/api/trace` 는 일곱
라우트에 남은 두 자기선언 stub 의 하나였고(`"stub: 원문 역추적 자리…"`)」, 경로 ②).
뒤 절(**무엇을** 단언 대상으로 고르는가 — 저장된 값이 돌아오는 것)은 단언 설계라 유지했다.

## 유지한 것 (353줄)

### `handlers.go` 235줄

- **패키지·타입·함수 doc 주석의 골격** — 정책 「유지 대상 › doc 주석」(Go: 패키지 주석과 export
  식별자의 이름으로 시작하는 doc 주석). initial-pass 가 `New builds Handlers backed by the given
  lake.` 를 「정의 표본 ① 과 doc 주석 유지 규칙이 충돌 — 유지 규칙 우선」으로 판정한 그 줄들이다.
- **버킷 키의 비자명한 성질** — 「버킷 키는 단위 안에서만 비교 가능하다: `2026-W26` 이
  `2026-06-23T14` 보다 크게 정렬되는 것은 'W' 가 '0' 을 이기기 때문이지 그 주가 더 나중이라서가
  아니다」(`plottedUnit`·`latestBucket`·`finestUnit`·`distinctBuckets`·`latestSentimentBucket`).
  **모델 정의가 이름 대어 유지로 지목한 지식**이고 `tests/e2e/lib/gold.ts` 69줄 유지와 같은 판정이다.
  이 패스가 사본을 걷어 이제 **설명은 단위를 고르는 함수들에만** 있다.
- **응답 계약의 "왜 두 필드인가"** — `traceBronze.BodyAvailable`/`BodyPreserved` 를 하나로
  합치지 않는 이유(원본 링크가 썩고 수집 시점 사본만 남은 경우가 이 화면의 존재 이유 — AC1.4),
  `traceSilver.Sentiment` 가 포인터인 이유(저신뢰는 네 분류 중 하나가 아니다 — AC2.5),
  `sentimentAxisRow.Present`(0 분포와 「집계되지 않았다」는 다른 주장), `fairnessRow.RawShare` 가
  정규화 점유율이 **아니라는** 것(둘의 간격이 AC3.1 이 교정하는 편차 자체다).
  어느 것도 스키마·코드로 복원되지 않는 **설계 판단**이다.
- **「모자란 것을 뭉치지 않는다」 3분기**(`traceResponse` doc) — `Found=false` /
  `BodyPreserved=false` / `Silver=nil` 이 서로 다른 뜻이라는 표. 화면이 어느 것도 「데이터 없음」
  으로 접지 못하게 하는 근거이고 코드는 세 분기의 **존재**만 말한다.
- **상한 상수의 근거** — `trendSeriesLimit`(겹쳐 보기의 질문은 「관심이 어디로 옮겨 가는가」라
  선이 한 줌을 넘으면 그 질문에 답하지 못한다), `fairnessRowLimit`(꼬리는 행만 늘리고 근거를
  늘리지 않는다 · 행마다 두 방식 대비라 읽기가 빽빽하다). 값이 **왜 그 값인지**는 코드가 말하지 않는다.
- **방어적 계산의 의도** — `shareOf` 의 「빈 기준 버킷은 0, NaN 이 아니다 — 화면이 깨진 뷰가
  아니라 빈 뷰를 그린다」, `sentimentSeries` 의 「한 버킷에 두 행은 상류 계약 위반이라 섞지 않고
  첫 행만 쓴다」, `selectNewsItem` 의 「빈 질의를 오류로 끊지 않되 폴백을 요청으로 착각하게
  두지 않는다」.
- **판단 분기 — 세 basis doc 의 「같은 기준을 명시한다」 3벌**(`trendBasis`·`sentimentBasis`·
  `fairnessBasis`). 같은 주장의 사본이지만 셋이 **서로를 지목하는 형태**(「the way compare does」·
  「the same way trend and compare do」)로 이미 주인이 정해져 있고, 각 문장의 뒷절이 그 화면만의
  오독 방식(주를 시간으로 읽음 / 지난주 분위기를 지금으로 읽음 / 분모가 안 보이는 점유율)을
  담는다. 「애매하면 남긴다」.
- **판단 분기 — `trend`·`fairness` 의 「Ranking on stale rows」 2벌.** `seriesBySubject` doc
  (「ordered by the subject's share in the latest bucket …」)이 앞의 것과, `latestBucketOf` doc 이
  뒤의 것과 겹친다. 그러나 두 항목이 적는 것은 **그 핸들러가 무엇을 잘못 답하게 되는가**
  (지난 버킷의 1위가 현재 선두의 선을 빼앗음 / 자기 최고 행으로 현재 순위를 누름)이고 헬퍼 doc 은
  정렬 규칙을 적는다. 사본 넷을 하나로 줄인 「Mixed bucket units」 와 달리 이쪽은 두 벌뿐이고
  문면이 갈리므로 유지한다. 다시 볼 시점: 세 번째 사본이 생길 때.

### `handlers_test.go` 118줄 — 전량 유지

전부 **「테스트가 왜 그 모양으로 단언하는지」**와 **「픽스처가 왜 그 모양인지」**다. 정책
「유지 대상 › 복원 불가능한 지식」이 이름으로 드는 유형이고, `Sentiment.test.tsx`(21줄) ·
`Fairness.test.tsx`(16줄) · `Trend.test.tsx` · `Dashboard.test.tsx` 의 유지 판정이 선례다.
**앞 패스들이 테스트 파일에서 세운 「전량 유지」를 뒤집지 않는다.**

- **픽스처 설계 표** — `writeMultiBucketGold`(T13 은 낡았고 **가장 큰 점유율을 든 행을 거기 둬**
  필터 누락이 즉시 드러나게 했다 · GLOBAL 은 낡은 버킷에만 있다), `writeTrendGold`(네 대상 ×
  세 시간 버킷 + 주 롤업 한 행의 표 — 「차트가 잘못 그려질 수 있는 모든 방식에 증인을 둔다」),
  `writeRolledUpGold`(같은 레코드를 세 벌로 — 단위를 정착시키지 않는 리더는 3중 계상한다),
  `writeSkewedGold`(「와이어 도배 대상」이 원시 100건 중 60건인데 정규화 점유율은 0.25 —
  두 방식이 어긋나야 대비가 시험 가능해진다), `writeMixedUnitSentiment`(일 롤업 키가 사전순으로
  가장 크다). 픽스처의 **판별력**은 단언·픽스처 어느 쪽을 읽어도 복원되지 않는다.
- **단언 설계** — 「낡은 버킷의 0.9 가 새지 않아야 한다」, 「축이 비면 옛 버킷을 빌리지 않고
  빈 채로 — 정직한 공백이 어긋난 비교보다 낫다」, 「네 비율의 합이 1 **이면서** 미분석이 그 옆에
  0.2 인 것을 함께 단언한다(접어 넣으면 다섯 수의 합이 1 이 되기 시작한다)」, 「`수집 뉴스` 는
  원시 합이라 3중 계상이 8 대신 24 로 드러난다」, 「두 세는 방식이 어긋나야 뷰가 값을 갖는다 —
  항상 같으면 정규화가 교정하는 것이 없고 AC3.8 의 「구분 표기」에 내용이 없다」.
- **단위/e2e 층 분담** — 「e2e 픽스처는 의도적으로 단일 버킷이라(대시보드 spec 도 그것을 먹는다)
  두 버킷을 공급하는 테스트만이 핸들러가 하나를 고른다는 것을 증명할 수 있다. 렌더된 나란히
  보기는 e2e spec 이 덮는다」. 원장이 이 파일의 유지 사유로 이미 적은 항목이다.
- **롤업 전용 Gold 가 고장이 아니라는 판독** — 「시간 행이 없으면 가장 고운 단위가 일이고, 뷰는
  빈 화면이 아니라 그 단위로 답한다」.
- **AC 태그 · AC 인용** — 「판단 분기」로 유지(원장의 `# AC3.2`·`AC3.7` 태그 유지와 같은 형태).

## 판단이 갈려 남긴 것

### 패키지 주석 본문 6줄 (`handlers.go:3-8`)

```
// There is one route per frontend screen (7 screens -> 7 routes) plus a health
// check. Five of them (dashboard, compare, sentiment, fairness, trend) derive
// their response from Gold, so the Python -> Gold -> Go path is exercised end to
// end. trace reads further down instead — it joins Bronze and Silver directly to
// walk an aggregate back to its article. Only reprocess still returns a shaped
// placeholder (its real data contract is follow-up work).
```

**제거 쪽 근거(성립한다).** 모든 절에 경로 ①이 있다 — 라우트↔화면 대응은 `Register`
(`:30-38`)가 `// screen: dash` 형태의 줄끝 주석과 함께 여덜 줄로 열거하고, 「reprocess 만
플레이스홀더」는 `reprocess` 핸들러 본문의 `"note": "stub: 재처리 콘솔 자리 … 후속 작업 (AC2.6)"`
가 축자로 말하며, 「trace 는 Bronze·Silver 를 직접 조인한다」는 `trace` doc 이 더 정확히 적는다
(조인 축이 `RecordID` 라는 것까지). 정책 「doc 주석 … 다만 본문이 시그니처·`contracts/` 스키마·
PRD·README「범위」를 되풀이하는 부분은 제거 대상」의 전형이다.

**유지 쪽 근거(둘, 어느 쪽도 제거 근거를 부정하지 않는다).**

1. **자매 모델의 행이 이 위를 줄 번호로 인용한다.** `docs/econ-opinion-monitor-design-tracker.md`
   가 `handlers.go:34`(「`/api/sentiment` 는 기간도 단위도 파라미터로 받지 않는다 — 쿼리는 `axis`
   하나」)와 `handlers.go:30-37`(「선언하는 라우트는 일곱 개 전부 `GET`」)을 **판정 근거로 인용**
   한다. 이 6줄을 지우면 그 아래가 통째로 6줄 올라가 두 인용이 `import` 블록·타입 선언을 가리킨다.
   `Sentiment.tsx:24-29`·`:55-58` 을 「트래커가 줄 번호로 인용하고 있어 제거가 자매 모델 행의
   처분과 묶인다」로 유지한 선례와 같은 자리다. **트래커를 함께 고치는 것도 답이 아니다** —
   열린 PR 셋(#85 · #84 · #76)이 그 파일을 수정 중이라 「겹치는 트리 위에서 판정하면 머지 순간
   근거가 낡는다」에 정확히 걸린다.
2. **경로 ②가 성립하지 않는다.** 이 주석이 README 「범위」의 재진술이라면 `Makefile` 행의 선례
   (「README「디렉터리 구조」「상태」재진술 … 골격·페이크 서술은 낡음」)가 그대로 적용되겠지만,
   실측하면 **README 쪽이 낡았고 주석 쪽이 맞다**: `README.md:223` 은 아직 「프론트 7화면 전부
   (셸 + 대시보드만; 나머지 6화면은 플레이스홀더)」, `:228` 은 「화면별 정식 API 데이터 계약
   (스텁 라우트만)」이다. 정책의 「원본이 부실해서 복원이 안 되는 것이면 주석을 남기는 대신
   원본을 고친다」가 가리키는 상태이고, 그 원본 수정은 **이 축이 아니다**(README 는 열린 PR
   셋(#75 · #73 · #72)이 수정 중이기도 하다).

정책의 **「애매하면 남긴다」**를 적용해 유지한다. 다시 볼 시점: design-tracker 의 두 인용이
내용 지목(doc-tracker 가 쓰는 `handlers.go ∋ func …` 형태)으로 바뀌거나 그 행이 처분될 때 —
그때는 경로 ①만으로 6줄 전량이 제거 대상이다.

## 검증

리베이스 후 기준 커밋 `c887503` 위에서 **전부 다시** 실측한 값이다(괄호는 `4772128` 에서의 값 —
소스 지표는 자매 착지에 움직이지 않았고 지문·잔여만 움직였다).

| 검사 | 값 |
|---|---|
| `gofmt -l go/` | 0건 |
| `go vet ./...` | rc=0 |
| `go test ./...` | `internal/handlers` ok · `internal/store` ok |
| 주석 제거 후 AST 바이트 동일(부모 대비) | `handlers.go` 21284B **동일** · `handlers_test.go` 33915B **동일** |
| `check-journey-mockup.py` / `check-mockup-render.py` | PASS(링크 134건) / 통과 |
| 레포 전체 지문 | `lines=2419 files=123` → `lines=2400 files=123` (`4772128`: 2355 → 2336) |
| 두 파일 주석 줄 수 | 252 → 235 · 120 → 118 (리베이스 전후 동일) |
| 원장 잔여 재계수(독립 파서) | 731 → **397** (`4772128`: 667 → 333) |

「비주석 diff 0줄」로 그치지 않고 **주석을 뺀 AST 를 부모와 바이트 비교**한 것은, 머리 주석
재작성에 선언이 딸려 지워지는 실패를 그 검사가 잡지 못하기 때문이다(주석만 지우는 stripper 로
양쪽을 출력해 sha256 대조 — 입력 규모를 함께 적었다).

## 범위 밖 관측

- **`README.md:223`·`:228` 이 골격 시절 서술로 낡아 있다.** 위 「판단이 갈려 남긴 것」 2번의
  실측이다. 이 모델은 문서 품질을 보지 않으므로(모델 정의 「범위 밖」) 고치지 않았고, 자매 축
  (`tbm_econ-opinion-monitor-docs-impl`)의 몫으로 남긴다. 열린 PR 셋이 그 파일을 수정 중이다.
- **design-tracker 의 `handlers.go:34`·`:30-37` 인용은 이 패스 전에도 한 줄씩 어긋나 있다**
  (`:34` 는 `compare`, `/api/sentiment` 는 `:35`). 이 패스는 그 위의 줄을 건드리지 않아
  **어긋난 정도를 바꾸지 않는다** — 제거·정정 지점이 전부 `:308` 이후다.
- 테스트 이름과 단언은 어느 쪽도 건드리지 않았다. doc-tracker 슬라이스 8·9 행이
  `handlers_test.go` 의 테스트 이름 여섯을 **검증 좌표로 인용**한다.

## 다음 패스로 넘기는 것 (범위 밖)

이 패스 뒤 잔여는 **397줄**이다(말미 요약 참조 — ⑴ 4파일 101 + ⑵ 15파일 296). 큰 것부터:

- ⑵ `tests/e2e/run.sh` +84 · `web/src/api/types.ts` +43 · `scripts/check-journey-mockup.py` +23 ·
  `web/src/api/client.ts` +10 — 열린 PR 이 없다. 하네스·API 뷰 축이 다음 패스의 가장 큰 덩어리다.
- ⑵ **#84·#85 가 준비 사이 들인 64줄** — `web/src/tokens/tokens.css` +20 ·
  `web/src/screens/Dashboard.tsx` +19(행이 `남음 0` 이라 ⑵) ·
  `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` +13 · `Trend.tsx` +12 ·
  `Dashboard.test.tsx` +12 · `Trend.test.tsx` +9 에 흩어져 있다. 여섯 행의 증가분 합이 85 인 것은
  **판정 이후 누적분**이라서다 — 그중 21(`tokens.css` +16 · `aggregation-5…spec.ts` +5)은 이 두
  자매가 착지하기 전에 이미 ⑵ 에 있었고, 두 자매가 더한 것은 64(`tokens.css` +4 ·
  `Dashboard.tsx` +19 · `Dashboard.test.tsx` +12 · `Trend.tsx` +12 · `Trend.test.tsx` +9 ·
  `aggregation-5…spec.ts` +8)로 지문 증가 `2355 → 2419` 와 정확히 같다.
  **직전 두 패스가 판정한 네 파일이 다시 자랐다** —
  행을 남겨 둔 덕에 계수 규약 ⑵ 로 도달했다. 다만 `tokens.css`·`Fairness.*` 는 열린 #76 이
  수정 중이라 그 착지를 기다리는 것이 옳다.
- ⑵ `go/internal/store/store.go` +17 — **열린 #78 이 같은 패키지의 `store_test.go` 를 판정 중**이다
  (`lineage-surface-pass`). 그 패스가 착지한 뒤에 보는 것이 옳다.
- ⑴ `web/src/screens/Fairness.tsx` 37(열린 #76) · `Trace.tsx` 36 · `Trace.test.tsx` 22(열린 #78) ·
  `go/internal/store/store_test.go` 6(열린 #78) — 네 파일 전부 소유자가 있다.
- ⑵ `python/packages/aggregation/tests/test_aggregate.py` +18 ·
  `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` +9 · `econ_aggregation/aggregate.py` +4 ·
  `python/packages/ingestion/tests/test_feeds.py` +3 — 파이썬·spec 잔량, 소유자 없음.
