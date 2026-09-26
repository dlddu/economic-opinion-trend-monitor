# serving-core-axis-pass — `go/internal/handlers/` 서빙 읽기 표면 5파일 네 축 전건 판정 (2026-09-26)

기준 커밋 `93fcc50`(#161 e2e-window-pass 착지본) · 판정 범위 **5파일 378줄**(`handlers.go` 233 · `handlers_test.go` 112 ·
`dashboard.go` 16 · `dashboard_test.go` 15 · `debug.go` 2) · 제거 **11줄** · 문면 정정 **3곳(줄 수 불변)** ·
남음 **367줄** · 판정 축 `①②③④` 로 마감한 행 **5**

정책 본문은 [`../README.md`](../README.md), 파일별 결과는 [`../ledger.md`](../ledger.md)에 있다.

## 왜 이 범위인가

원장 게이트 실측으로 판정 축이 `①②③④` 가 아닌 행은 기준 커밋에서 **135행 2387줄**이고(계획 시점
`67c8225` 에서는 167행 2776줄이었다 — 준비 사이에 #161 이 32행 389줄을 판정해 착지했다), 정의의
슬라이스 예산은 400줄이다. 행↔파일이 1:1(R6)이라 「파일 공유 덩어리」는 행 하나씩이므로, 예산 안에서 묶을 단위는
**저작·판정 이력을 공유하는 한 패키지**다. 이 다섯은 serving-handlers-pass(#86) · dash-rebuild-pass(#132) ·
runlog-window-pass(#133) 가 판정한 **서빙 읽기** 표면이고 **378/400(94.5%)** 로 예산을 채운다.

같은 `go/` 트리의 남은 아홉 행(`reprocess*` 4행 90줄 · `argo`·`main`·`static`·`store*` 5행 76줄)을 함께
묶지 않은 것은 그쪽이 reprocess-\*-pass 가 판정한 **쓰기·제출 경로**이고 복원처가 다르기 때문이다
(주인 문단이 `reprocess_trigger.go` 머리에 있다) — 다음 슬라이스의 덩어리다.

**열린 PR 과의 파일 겹침은 0이다.** 계획 직전과 PR 직전에 두 번 `gh pr view --json files` 로
재조회했다. 계획 시점의 #161(`rct_0007`)은 준비 중에 `93fcc50` 으로 **착지해 이 패스의 기준 커밋이
됐고**(그 11파일 중 `go/` 는 0건이라 이 판정 범위의 줄 수·지문은 리베이스 전후 동일하다 — 아래 검증
표의 다섯 값이 그 증거다), 남은 #163(`rct_0008`)은 `docs/comment-policy/README.md`·`ledger.md`·
`scripts/check-comment-ledger.py` 이고 **`go/` 를 건드리지 않는다.** 이 PR 이 `ledger.md` 에서
건드리는 것은 **아래 일곱 행**뿐이고 #163 이 건드리는 것은 D·E 표면의 새 절이라, 행 단위 형식(#158)의
목적대로 둘의 착지 순서는 자유롭다.

## 이 슬라이스의 일은 「새 제거 사냥」이 아니라 축 완성 재판정이다

마지막 판정 커밋 `98e97d6`(reprocess-trigger-pass) 이후 이 표면의 주석 변화를 실측하면
`handlers.go` 는 **증가 2줄(#126) · 개작 1줄(7→8 화면) · 감소 9줄**(#117 이 `inOneUnit` 을 걷음),
`handlers_test.go` 는 **증가 0 · 감소 5** 다. 즉 378줄의 실질은 **이미 판정받고 유지된 줄**이고,
원장의 `—`·`③`·`①③`·`①②` 는 #158 이전 원장을 옮길 때 「확인되지 않은 축은 적지 않는다」로
보수적으로 비워 둔 칸이다. 그래서 이 패스는 **아직 묻지 않은 축을 실측으로 묻는다.**

## 축별 판정

### ① 코드 자체 — 제거 12줄(패키지 주석 10 + `debug.go` 1 + …)

**`handlers.go` 패키지 주석 본문 전량(2~11행, 10줄).** 모든 절에 복원처가 있다.

| 지운 절 | 복원처 |
|---|---|
| 「one route per frontend screen (8 screens -> 8 routes) plus a health check」 | `Register`(45~60행)가 `// screen: dash` 꼴 줄끝 주석 8줄 + `POST` 3줄로 열거한다 |
| 「Five of them … derive their response from Gold」 | 다섯 라우트 doc 이 각각 Gold 를 읽는다고 적는다 |
| 「trace reads further down … joins Bronze and Silver directly」 | `trace` doc 이 조인 축이 `RecordID` 라는 것까지 더 정확히 적는다 |
| 「reprocess reads the same two layers … (reprocess.go)」·「reprocess's three POSTs … (reprocess_trigger.go)」 | reprocess-trigger-pass 가 **주인으로 지목한** `reprocess_trigger.go` 머리 6줄 |
| 「debug is still a stub: the run and model-call records … do not exist in the lake yet」 | `debug.go` 의 `Stub` 리터럴 + `Missing: ["debug_read_path"]`(아래 참조) |

serving-handlers-pass 는 이 본문에 대해 **「제거 쪽 근거(성립한다)」를 이미 적어 두고** 유지 쪽 논거
둘 때문에 「애매하면 남긴다」로 보류했다. 이 패스는 그 두 논거를 각각 다시 쟀다.

- **논거 1 「설계 트래커가 줄 번호로 인용하므로 지우면 인용이 밀린다」 — 소진됐다.**
  `docs/econ-opinion-monitor-design-tracker.md` 591·593행의 인용 2건은 문면 그대로 살아 있으나,
  실측하면 `handlers.go:34` 는 이미 `}`(구조체 닫는 괄호)이고 `:30-37` 은 `now`·`trigger` 필드와
  `New` 다 — 인용된 명제(「쿼리는 `axis` 하나」·「선언하는 라우트는 일곱 개 전부 `GET`」)는
  `Register` 45~60행으로 옮겨 **이미 어긋나 있다.** 막으려던 손해가 이미 발생했고,
  reprocess-trigger-pass 가 「재핀은 트래커 소유자(mockup-render) 몫」으로 넘긴 상태다. 인용된
  명제 자체도 `POST` 세 라우트 착지로 낡았다(일곱 전부 `GET` 이 아니다). **이 패스는 트래커를
  고치지 않는다** — 소유자가 재핀할 때 HEAD 기준으로 다시 걸면 된다.
- **논거 2 「경로 ② 가 성립하지 않는다(README 가 낡았고 주석이 맞다)」 — 여전히 참이지만 ① 을
  막지 못한다.** 이 논거는 경로 ② 만 부정하고, 제거는 ① 로 닫힌다.

**`debug.go` `debugResponse` doc 의 둘째 절(1줄).** 두 근거가 겹친다.

1. **낡아 거짓이다.** 「until the lake carries the records it is built on」은 #130(AC4.1 실행 기록) ·
   #134(AC4.2 호출 기록) · #137(AC4.3 레코드↔실행↔호출 연결) 착지로 **거짓**이 됐다 — 레이크는
   그 레코드를 갖고 있고, 없는 것은 **조회 경로**다.
2. **주인이 바로 아래에 있고 그쪽은 고쳐졌다.** `Stub: "… 조회 경로 구현 전"` 과
   `Missing: []string{"debug_read_path"}` 가 맞는 문면을 갖는다(①). runlog-window-pass 가 같은 파일의
   AC 부기 문단 8줄을 **정확히 이 근거로** 걷었고, 그때 이 둘째 절과 `handlers.go` 의 사본은 남았다.

정책의 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다」가 두 자리에 동시에 적용된 자리다.

### ② 저장소 문서 — 문면 정정 3곳(PRD 인라인 인용)

`handlers.go` 의 doc 주석 셋이 PRD 문장을 **괄호 안에 인용**하고 있었다. 정책의 「doc 주석 … 다만
본문이 시그니처·`contracts/` 스키마·PRD·README「범위」를 되풀이하는 부분은 제거 대상」 그대로다.
**AC 태그(포인터)는 남기고 인용 문면만 걷었다** — 태그는 복원처를 가리키는 포인터고, 인용은 사본이다.

| 자리 | 걷은 인용 | 소유자 |
|---|---|---|
| `sentimentPoint` | `저신뢰·미분석은 비율 집계에서 분리한다` | `prd-aggregation-viz.md:41` — **사본이 「또는 별도 항목으로 표시한다」 선택지를 흘려 이미 덜 정확하다** |
| `fairnessBasis` | `"정규화 방식은 명시되고 일관 적용된다"` | `prd-aggregation-viz.md:23` 축자 |
| `plottedUnit` | `("기본 단위는 시간")` | `prd-aggregation-viz.md:35` 축자 |

줄 수는 변하지 않고 지문만 움직인다(`argo.go` 행의 「정정 1(지문 −0)」 선례와 같은 형태).

**반대편(부재)도 건수로 쟀다.** 테스트 두 파일의 유지 사유는 「픽스처가 왜 그 모양인지 · 테스트가
왜 그 모양으로 단언하는지」다. `docs/econ-opinion-monitor-test-*.md` 4파일 229줄에서 픽스처 식별자
6종(`writeDailyGold`·`writeTrendGold`·`writeRolledUpGold`·`writeSkewedGold`·`writeMultiBucketGold`·
`writeMixedUnitSentiment`)을 전수 검색하면 **0히트**다 — 테스트 문서는 AC 단위 시나리오(사전 조건 ·
실행 단계 · 기대 결과 · 검증 AC)만 적고 픽스처의 판별력·수치를 담지 않는다. ⇒ 두 파일에 대해
경로 ② 로 복원되는 줄 **0**.

> **다음 패스에 넘기는 판별식 하나.** `test-aggregation-viz.md` 시나리오 4 의 기대 결과
> (「분위기 비율 합이 정합적이고, 저신뢰/미분석 항목이 비율에서 분리되거나 별도 항목으로 표시된다」)는
> `handlers_test.go` 단언 주석의 **무엇을** 과 겹친다. 이 패스가 유지한 근거는 주석이 적는 것이
> 「네 비율을 접어 넣으면 **다섯 수의 합이 1 이 되기 시작한다**」는 **실패 모드**이고 그것은 문서에
> 없다는 것이다. 같은 형태(문서가 기대 결과를, 주석이 실패 모드를)가 다른 spec 주석에서 재발하면
> 이 판별식을 그대로 쓰면 된다.

### ③ PR — 제거 0(이 패스 분)

- `handlers.go`·`handlers_test.go` 의 ③ 은 serving-handlers-pass 가 이미 물었다(그 패스가 ③ 로 걷은
  것은 `handlers_test.go` 의 「Before slice 9 …」 과거 상태 서술 1줄).
- `dashboard_test.go` 의 ③ 은 이 패스가 새로 물었다. 저작 **PR #117 본문 28줄을 전수 읽어** 대조했다 —
  `기준금리`·`삼성`·`0.99`·`ISO`·`writeDailyGold` **0히트**이고, 본문이 적는 것은 서빙 계약
  (`?axis&range&unit`, `raw_rank`·`is_new`·`empty_window`)과 화면 변경이다. 픽스처의 판별력은 어디에도 없다.
- `debug.go` 의 ③: #126(네비·CTA·딥링크)·#130(적재) 본문은 이 doc 의 절을 소유하지 않는다.

### ④ 커밋 메시지 — 제거 0, 세는 법과 함께

이 레포는 **squash 머지라 커밋 본문이 거의 비어 있다.** 이 표면을 건드린 창 커밋 여섯을
`git log -1 --format=%b` 로 전수 확인했다: `4941359`(#117)·`187f55e`(#126)·`ec52834`(#86)·
`fafceb8`(#137)·`58e82a2`(#134) 는 `Co-authored-by:` 한 줄뿐이고, 본문이 있는 것은
`535ffda`(#121) 하나(파티션 레이아웃 3줄)인데 그 명제는 `store.go` 축이라 이 다섯 파일 주석에 없다.
⇒ 경로 ④ 로 복원되는 줄 **0**. (앞 패스들이 ④ 로 걷은 것은 전부 **과거 상태 서술**이고, 이 표면에는
serving-handlers-pass 가 그 유형을 이미 다 걷어 남은 것이 없다.)

## 유지한 것 (367줄)

- **`handlers.go` 223줄** — serving-handlers-pass 가 세운 유지 집합을 승계한다(버킷 키 지식의 주인
  함수들 · 응답 계약의 「왜 두 필드인가」 · 상한 상수의 근거 · 방어적 계산의 의도 · basis doc 3벌 ·
  「Ranking on stale rows」 2벌). **그 패스가 적은 재방문 조건을 이 패스가 다시 쟀다 —
  「Mixed bucket units」 는 주인(`plottedUnit`) + 포인터 3벌 + `compare` 3줄이고,
  「Ranking on stale rows」 는 여전히 2벌(`trend` 289~291 · `fairness` 433~436)이라 3벌째가 없다.**
  ⇒ 두 판단 분기의 유지가 유효하다.
- **라우트 doc 다섯의 「answers ACx.y: …」 앞절** — AC 제목의 영어 환언이라 ② 가 부분 성립하지만,
  뒤절이 그 화면만의 설계 판단(「the axis's leading subjects overlaid so the selected line can be read
  against them」 · 「"Same basis" is the whole point of the view」)을 담아 문장을 자르면 포인터만 남는다.
  **「애매하면 남긴다」** — 재방문 조건: AC 제목만 남는 사본이 생길 때.
- **`handlers_test.go` 112 · `dashboard_test.go` 15** — 전량 유지. 픽스처 판별력과 단언 설계이고
  `Sentiment.test.tsx`·`Fairness.test.tsx`·`Trend.test.tsx`·`Dashboard.test.tsx`·`reprocess_test.go`·
  `reprocess_trigger_test.go` 의 전량 유지가 선례다. **앞 패스들이 테스트 파일에서 세운 「전량 유지」를
  뒤집지 않는다.**
- **`dashboard.go` 16** — 여정 문서를 **가리키는** 머리 1줄(포인터), `dashRanges` 의 「무엇과 같아야
  하는가」, 필드 doc, `bucketStart`·`recoverTotal`·`windowBuckets` 의 비자명한 계약.
  **사본 기록**: 93행 「Everything below reads one unit」 은 버킷 키 지식의 사본이고 주인은
  `plottedUnit` 이지만, **아래에 다른 단위를 읽는 코드를 더하면 조용히 깨지는** 편집 지점 가드라
  남긴다(README 「편집 지점에서만 효과가 있는 가드」). 재방문 조건: 이 파일이 단위 필터를 함수로 분리할 때.
- **`debug.go` 1** — 이름 선두 요약(정책 「유지 대상 › doc 주석」).

## 부록 — scope-expansion-pass 가 넘긴 사본 2벌의 정본 지정 (주석 무접촉)

scope-expansion-pass(#159)가 `ci.yml`·`checks.yml` 두 행에 **「판단 분기 1」로 적어 다음 패스에 넘긴**
건이다: 「`make lint` 중 docs/ 를 읽는 검사」 취지가 두 파일에 두 벌 있고 「양쪽이 서로 다른 절을 더
갖고 있어 이번에는 둘 다 남기고 사본 처분을 기록한다」.

**이 건을 예산 밖 부록으로 집은 이유는 게이트 지표가 이 건에 대해 영구히 불변이기 때문이다.**
두 행은 이미 판정 축 `①②③④` 라 게이트의 「미판정 행·줄」 어느 칸도 움직이지 않는다 — 즉 다음
감지가 이 인계를 **줄 수로는 절대 깨우지 못하고**, 오직 패스 문서 산문으로만 전달된다. 유예가
무한해지는 자리라 닫아 둔다.

실측: 두 문면은 서로 다른 명제를 갖는다. `ci.yml` 12~13행은 **「build 가 걸러지는 문서 PR 에서도
돌아야 하므로 따로 떼어 항상 돌린다」**(그 잡의 존재 이유), `checks.yml` 의 `code` 블록은
**「`code` 는 제외 목록이고 docs/ 를 읽는 검사는 ci.yml 이 필터와 무관하게 따로 돌린다」**(필터의
완전성). 정책의 「애매하면 남긴다」와 가드 조항으로 **둘 다 유지**하고, **정본은 `ci.yml`** 로
지정한다 — 그 명제를 어기는 사람(`scenario-mapping`·`comment-ledger` 잡을 `build` 로 되접으려는
사람)이 읽는 자리가 거기다. **재방문 조건: 세 번째 사본이 생길 때.**
이 부록은 **주석을 한 줄도 건드리지 않아** 두 행의 줄 수(13·26)와 지문
(`148e6c9ea980`·`e447361589d3`)이 불변이다.

## 검증

| 검사 | 값 |
|---|---|
| `python3 scripts/check-comment-ledger.py .` | rc=0 · 불변식 통과 |
| 판정 대상 주석 줄 수 (부모 `93fcc50` → HEAD) | `2840 → 2829` — **순 제거 11줄** |
| 판정 축 `①②③④` | 행 `58 → 63`(**+5**) · 줄 `453 → 820`(**+367**) |
| 일부 축만 완료 | 행 `53 → 50`(**−3**) · 줄 `1065 → 935`(**−130**) |
| 미판정(`—`) | 행 `82 → 80`(**−2**) · 줄 `1322 → 1074`(**−248**) |
| 행 수 · 파일 수 | `193 · 193` 불변(행 신설·삭제 0 — 어느 파일도 주석 0줄이 되지 않았다) |
| 판정 범위 다섯 파일의 줄 수 | `233·112·16·15·2 → 223·112·16·15·1`(리베이스 전후 동일 — #161 은 `go/` 무접촉) |
| 비주석 diff | **0줄** |
| 주석 제거 후 AST 바이트 대조(부모 vs HEAD) | `handlers.go` 18623B 동일(`ad7966219573340f`) · `debug.go` 577B 동일(`23c1b35262000566`) |
| `gofmt -l go/` | 0건 |
| `go vet ./...` | rc=0 |
| `go test ./internal/handlers/... ./internal/store/...` | 둘 다 `ok` |
| `check_scenario_mapping.py` / `check-journey-mockup.py` / `check-mockup-render.py` / `check-journey-flow.js` | 네 종 rc=0 |
| `check-data-format-change.py` | `format_changed=false`(민감 경로·생산자 글롭 무접촉 ⇒ 무인 사정권) |

「비주석 diff 0줄」로 그치지 않고 **주석을 뺀 AST 를 부모와 바이트 비교**한 것은 머리 주석
재작성에 선언이 딸려 지워지는 실패를 그 검사가 잡지 못하기 때문이다(serving-handlers-pass 선례).

## 범위 밖 (후속)

- **`go/` 의 남은 아홉 행 166줄**(다음 슬라이스의 1순위 — 이 패스 뒤 가장 큰 단일 덩어리다) — `reprocess.go` 36(`②`) · `reprocess_trigger.go` 26(`—`) ·
  `reprocess_test.go` 22(`—`) · `reprocess_trigger_test.go` 6(`—`) · `argo/argo.go` 29(`—`) ·
  `store/store.go` 35(`①`) · `static/static.go` 6(`—`) · `cmd/serving/main.go` 4(`—`) ·
  `store/store_test.go` 2(`—`). 쓰기·제출 경로라 복원처가 다르고 열린 PR 도 없다 — 예산 하나로 닫히는 크기다.
- **`python/packages/analysis/tests/test_cli.py` 14줄(`—`)** — scope-expansion-pass 가 다음 패스에
  지목한 둘 중 하나다. 이 패스가 집지 않은 이유는 예산이 378/400 에서 차기 때문이고, **이 행은
  게이트가 미판정으로 세므로 다음 감지가 계속 깨운다**(위 부록과 달리 유예가 유한하다).
- **설계 트래커의 `handlers.go:34`·`:30-37` 인용 재핀** — 트래커 소유자
  (`tbm_econ-opinion-monitor-mockup-render`)의 몫이다. 이 패스는 인용이 **이 패스 전에도 이미
  어긋나 있었음**을 실측해 위에 적었고, 트래커를 건드리지 않았다.
- **`README.md:223`·`:228` 의 골격 시절 서술** — serving-handlers-pass 가 남긴 관측이고 문서 품질은
  이 모델의 표면이 아니다(`tbm_econ-opinion-monitor-docs-impl` 몫).
