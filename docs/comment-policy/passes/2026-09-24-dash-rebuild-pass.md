# dash-rebuild-pass — 자매 슬라이스 #117(dash 재구성)이 들인 증가분 85줄 전량 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `9a37d04`(#129 착지 tip = main, 감지 시점과 같다).
직전 패스([phone-media-pass](2026-09-22-phone-media-pass.md))가 말미에 「무인 패스의 다음 선은 없다 — 지문이 또 자라야
(자매 슬라이스가 `web/src`·`go`·`python`·`tests`·`deploy` 에 주석을 들여야) 다음 표적이 생긴다; 「다음 선 없음」은 고갈이 아니라
**자매 착지 대기**로 읽는다」로 닫아 둔 그 조건이 12커밋으로 성립해 열린 패스다. 추적 task는 `rct_20260924-0001`
(reconciler `tbm_econ-opinion-monitor-comment-necessity`).

판정 결과 요약: **판정 표면 85줄 중 제거 41 / 유지 44** — 판단 분기 0. 레포 전체 지문은 `2601 → 2560`(파일 `140 → 140` — 어느 파일도
남음 0 이 되지 않았다). 편집 전 `c190df879f5a…`, 편집 후 `94d42f5f5a8f…`. **주석 외 한 바이트도 바뀌지 않았다** — 편집한 6파일 전부
주석 줄을 걷어낸 나머지의 sha256 이 편집 전후 동일하다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

직전 판정 지점은 `5e57792`(#116, phone-media-pass 가 판정한 tip)다. 그 지점에서 versionScript 를 재실행해 baseline
`lines=2431 files=134` / `d888d2b2…` 를 **바이트 재현**했으므로 창은 정확히 `5e57792..9a37d04` 12커밋이고, 그 사이 주석 정책
패스는 0건이다(전부 자매 모델 산출 — #117·#118·#119·#121·#122·#123·#124·#125·#126·#127·#128·#129).

창이 들인 미판정 잔여는 **197줄**인데(⑴ 행 없는 파일 7개 109 + ⑵ 행이 있으나 자란 파일 17개 88), 이 패스는 그중 **한 PR
(#117 `4941359`, 「목업 JRN-daily-scan 화면 1(STP-open-brief)에 맞춰 대시보드 재구성」) 유래분 85줄만** 판정한다.
한 PR 로 자른 이유는 **복원 경로 ③(PR 본문)이 하나로 모이기 때문**이다 — 아래 일곱 파일의 증가분은 전부 같은 PR 본문이 원본 후보다.

| 파일 | 행(직전 판정) | 5e57792 | 9a37d04 | 판정 표면 | 유래 |
|---|---:|---:|---:|---:|---|
| `go/internal/handlers/dashboard.go` | 없음 | 0 | 37 | 37 | #117 신설 |
| `go/internal/handlers/dashboard_test.go` | 없음 | 0 | 15 | 15 | #117 신설 |
| `web/src/screens/Dashboard.tsx` | 6(dash-brief-pass) | 6 | 19 | 13 | #117 단독 |
| `web/src/api/types.ts` | 19(reprocess-console-pass) | 19 | 28 | 9 | #117 단독 |
| `tests/e2e/specs/ac3-6-sentiment-ratio-viz.spec.ts` | 24(첫 판정) | 24 | 29 | 5 | #117 단독 |
| `web/src/shell/topbarSlot.ts` | 없음 | 0 | 4 | 4 | #117 신설 |
| `web/src/shell/Topbar.tsx` | 1(initial-pass) | 1 | 3 | 2 | #117 단독 |
| **합** | | **50** | **135** | **85** | |

`git log 5e57792..HEAD -- <파일>` 이 일곱 파일 모두 `4941359` **단일 커밋**이다. 창의 나머지 잔여(112줄)는 유래가 다른 PR
(#118·#121·#124·#125·#126·#128·#129)이거나 사람 몫이거나 열린 PR 과 겹쳐 이 패스의 표면 밖이다 — 「범위 밖」 절 참조.

## 복원처 — 무엇이 어디서 복원되는가

PR #117 본문이 이 패스의 주된 ③ 이다. 특히 다음 두 절이 축자 원본이다.

- 「바뀐 것 · serving」 — `순위: 최신 버킷 하나 · 스파크라인: 창 안 버킷(축이 수집했는데 대상이 없으면 0) · 변화량: 직전 버킷 대비
  %p(기준 없으면 has_baseline=false)` / `raw_rank·is_new·empty_window(최신 수집이 이 축에 안 들어옴)·summary(axis_sentiment 되짚기:
  수집·분석 완료·커버리지·저신뢰)`
- 「하지 않은 것」 — `화면 2·3(STP-scan-delta·STP-adjust-window)과 그리로 가는 CTA — 갈 화면이 없어 허위 컨트롤이 된다.`

② 로는 설계 트래커 `docs/econ-opinion-monitor-design-tracker.md` 의 #117 해소 행 다섯이 받친다 — 특히 「축 세그·정규화 토글의
배치면이 다름」 행이 「셸이 화면별 토프바 슬롯(`shell/topbarSlot.ts` 의 `useTopbar`)을 갖게 돼 `dash` 가 제목 `아침 정기 스캔` 과
`.ctl` 의 `pill-ctl`(`{축} · {기간} · {단위}`)을 올린다」를 축자로 적는다.

① 로는 같은 파일의 더 아래 doc 주석(`recoverTotal`·`windowBuckets`·`dashBasis` 필드 doc)과 바로 아래 선언이 받친다.

**다른 파일 주석의 재진술**로 잡힌 자리가 둘 있다.
- `dashboard.go` 머리의 「비율에서 되짚은 건수라 반올림 오차가 1건 범위에서 남을 수 있다」 ↔ **`web/src/screens/Sentiment.tsx:93`**
  의 `unanalyzedCount` doc 이 **같은 문장**이다. 주석 자신이 그 함수를 이름으로 지목하므로 주인은 그쪽이다.
- `dashboard.go` 의 `dashRanges` doc 첫 문장 ↔ **`go/internal/handlers/reprocess.go:18`** 의 `reprocessRanges` doc 과 같은 문장.
  먼저 쓰인 쪽이 주인이라 이쪽은 두 라우트가 **같은 어휘를 쓴다**는 조율 근거 1줄로 줄였다.

## 제거 41줄 — 파일별 근거

### `go/internal/handlers/dashboard.go` 37 → 16 (제거 21)

**머리 21줄 → 앵커 1줄.** 다섯 항이 각각 다른 경로로 복원된다.

| 머리의 항 | 복원 경로 |
|---|---|
| 창을 한 단위 버킷으로 연다 / 순위는 최신 버킷 하나 | ③ PR #117 「순위: 최신 버킷 하나」 |
| 평평하게 섞어 자르면 어제의 1위가 오늘 순위에 끼어든다 | `dashboard_test.go:93-94` 가 **반례 수치와 함께** 주인(hour 0.99 · 06-21 삼성 0.6) |
| 스파크라인 — 축이 수집했는데 대상이 빠지면 0 | ③ PR #117 축자(괄호까지 같다) + `dashboard_test.go:130` |
| 축 자체에 수집이 없던 버킷은 창에 안 들어온다 | ① 같은 파일 `windowBuckets` doc 「keeps the axis's buckets …」 + `dashboard_test.go:156-157` |
| 변화량은 직전 버킷 대비 %p · 없으면 has_baseline=false, 0으로 안 채운다 | ③ PR #117 축자 + `HasBaseline` 필드 자신 |
| empty_window · 다른 축의 수집 시각이 최신 버킷을 정한다 | ③ PR #117 축자 + 같은 파일 `dashBasis.Bucket` doc 축자 |
| 되짚기 공식 3종 | ① `summarize`·`recoverTotal` 본문 |
| 반올림 오차 1건 | **`Sentiment.tsx:93` 과 같은 문장** |
| 전부 분리된 버킷은 null | ① 같은 파일 `recoverTotal` doc 축자 |

**`dashRanges` doc 2 → 1.** 첫 문장은 `reprocess.go:18` 의 사본이고, 맵 리터럴 자신이 어휘를 복원한다. 남긴 1줄은 **편집 지점
가드**다(두 라우트가 같은 어휘를 쓴다는 금지형 — README 「가드는 금지만 말하고 출처를 가리킨다」).

### `web/src/api/types.ts` 28 → 21 (제거 7)

`DashRow`·`DashBasis`·`DashSummary` 의 **필드 JSDoc 전량**(`raw_rank`·`spark`·`delta`·`is_new`·`bucket`·`empty_window`·`collected`).
일곱 줄이 모두 `dashboard.go` 의 필드 doc·머리·`recoverTotal` doc 과 같은 문장이고, `collected` 와 `bucket` 은 **축자**다.
[web-api-view-pass](2026-09-21-web-api-view-pass.md)가 필드 JSDoc 12줄을, [reprocess-console-pass](2026-09-21-reprocess-console-pass.md)가
4줄을 같은 근거로 Go 쪽에 복원한 선례를 그대로 잇는다. 이 패스는 **Go 쪽 대응 doc 을 유지**해 주인을 못박았다.
유지 2 — `DashRange`·`DashRow` 의 export 타입 요약 1줄씩(요약 규칙).

### `web/src/screens/Dashboard.tsx` 19 → 12 (제거 7)

- **머리 5 → 2.** 「목업이 그대로 스펙이다 — 지표 카드 넷, `오늘의 조회 조건` 카드, `상위 서술 대상` 순위, 토프바의 조건 pill」은
  PR #117 「바뀐 것 · web」 축자이자 README 가드 조항이 명시로 금지한 **열거**꼴이다. 화면 2·3 CTA 를 두지 않는 사정은 PR #117
  「하지 않은 것」의 「갈 화면이 없어 허위 컨트롤이 된다」 축자 + 설계 트래커 「허위 컨트롤 금지 교리」 — **금지만 말하고 출처를
  가리키는** 가드 1줄로 줄였다(`Trend.tsx` 머리의 같은 꼴 가드와 같은 판단).
- `PREV_LABEL` JSDoc 1 — 바로 아래 맵 리터럴(`hour: "직전 시간 대비"`)이 복원한다(①).
- `BRIEF_KEY` 앞 증가분 2 — `StoredBrief` 타입이 `range`·`unit` 을 들고 있고(①), 설계 트래커 「기간·단위 컨트롤 부재」 행이
  서빙 선행과 컨트롤 부재를 축자로 적는다(②). dash-brief-pass 가 **판단 분기**로 남긴 수명 근거 3줄은 건드리지 않았다.
- 「보조 레이어 — 문서 메타는 … 접힌 자리에 둔다」 JSX 1 — 바로 아래 `<details className="meta"><summary>여정 문서 정보</summary>` 가 복원(①).

### `web/src/shell/topbarSlot.ts` 4 → 2 (제거 2) · `web/src/shell/Topbar.tsx` 3 → 1 (제거 2)

두 파일 모두 머리가 「셸이 라우트 제목을 기본값으로 두고 화면이 올리면 그것을 그린다」를 말하는데, 그 동작은 `Topbar.tsx` 의
`override?.title ?? screen?.label ?? …` 한 줄이 그대로 복원한다(①). 목업 쪽 사정은 설계 트래커 해소 행이 축자(②)이고,
「제품 평면에 문서 식별자를 두지 않는다」는 `check-journey-mockup.py` R5 가 **기계로 집행**하는 원칙이다.
두 파일 모두 `CMP-topbar` 앵커만 남겼다.

### `tests/e2e/specs/ac3-6-sentiment-ratio-viz.spec.ts` 29 → 27 (제거 2)

「대시보드는 … 분위기 막대를 걷어냈고(그 화면이 그리는 것은 지표·조회 조건·순위뿐이다), AC3.6 의 분위기 시각화는 축별 막대와
도넛 수치로 이 화면이 맡는다」 — PR #117 「`ac3-6` 을 `sentiment` 화면으로」(③)와 설계 트래커 `dash` 해소 행이 복원하고,
화면 열거는 README 가드 조항이 금지한 꼴이다. 귀속을 가리키는 1줄로 줄였다. 첫 판정이 「시나리오→AC 연결 설명」 4줄을 같은
근거로 걷은 것과 같은 판단이다.

## 유지 44줄

### `go/internal/handlers/dashboard_test.go` 15 → 15 (제거 0)

전량이 「픽스처가 왜 그 모양인지」·「테스트가 왜 그 모양으로 단언하는지」다 — 같은 패키지 `handlers_test.go` **118줄 전량 유지**와
같은 판정이고, `Sentiment.test.tsx`·`Fairness.test.tsx`·`Trend.test.tsx`·`Dashboard.test.tsx` 의 전량 유지와도 같다.

- `writeDailyGold` 판별력 표 9줄 — KR 3일 + **하루 일찍 끊긴 US 축** + 일 읽기에 새면 안 되는 시 롤업. 삼성이 06-23 원시 1위인데
  점유율 3위라 순위 갈림 주석(`RANK_SHIFT_NOTE`)의 증인이 된다.
- 최신 버킷 순위 근거 2 — hour 0.99 와 06-21 삼성 0.6 이 섞이면 오늘의 선두를 제친다. **`dashboard.go` 머리의 사본을 걷으며 이
  자리를 주인으로 지목**했다.
- 「축이 수집한 날의 부재는 0 이지 공백이 아니다」 1 · US 가 최신 수집을 놓친 것과 관심이 없는 것의 구분 2 — 같은 지목.
- ISO 2027년 1주가 달력 2027-01-04 에 열린다 1 — 달력 사실.

### 그 밖의 유지

- `dashboard.go` 16 — `/api/dashboard` 앵커 1 · `dashRanges` 조율 가드 1 · `Bucket`/`PreviousBucket` 2 · `LastBucket` 1
  (**`types.ts` 필드 JSDoc 을 걷으며 이 자리를 주인으로 지목**) · 「버킷 키는 단위 안에서만 순서를 갖는다」 1 ·
  Gold 키 (axis, bucket) 계약 2 · `recoverTotal` 2 · `windowBuckets` 3 · `bucketStart` 3.
- `Dashboard.tsx` 증가분 몫 6 — 앵커 1 · 허위 컨트롤 가드 1 · `RANK_SHIFT_NOTE` JSDoc 1(**왜 2 인가** — 「한 칸 차이는 동점
  처리의 흔들림」은 PR·트래커 어디에도 없다) · 목업 `dcls`·`dtext`·`scolor` 문턱 동등성 1 · `CMP-metric` 앵커 1 · `CMP-spark` 앵커 1.
- `ac3-6` 증가분 몫 — `aggregates` 헬퍼 JSDoc 1 · 도넛 수치와 막대의 기준이 섞이지 않았는지까지 대조하는 단언 설계 2 ·
  `.sent-na` 의 첫 `<b>` 가 미분석 비율이라는 DOM 좌표 1.
- `types.ts` 2 · `topbarSlot.ts` 2 · `Topbar.tsx` 1.

**앵커의 이름은 지우지 않는다.** `scripts/check-mockup-render.py` 의 `markers()` 가 `web/src` 의 `.css`·`.ts`·`.tsx` **주석**에서
`CMP-*`/`PAT-*` 를 읽어 R3 의 구현측 모집단을 만든다(게이트 docstring 이 「셸 TSX 주석까지 보면 15」로 그 사실을 적는다).
`CMP-metric`·`CMP-spark`·`CMP-topbar` 를 담은 주석은 **줄일 수는 있어도 이름을 지우면 R3 가 깨진다** — 이 패스는 셋 다 남겼고
게이트 출력이 편집 전후 바이트 동일한 것으로 확인했다.

## 판단이 갈려 남긴 것

없다. 이 패스의 제거 41줄은 전부 축자 원본이나 바로 아래 선언이 있는 자리이고, 애매한 자리는 전부 유지 쪽으로 닫았다
(`RANK_SHIFT_NOTE` 의 「왜 2 인가」, `bucketStart` 의 버킷 라벨 예시, `.sent-na` DOM 좌표).

## 검증

- **지문**: 편집 전 `lines=2601 files=140` / `c190df87…` → 편집 후 `lines=2560 files=140` / `94d42f5f…`. 델타 −41.
- **주석 외 무변경**: 편집한 6파일 각각, 주석 줄을 걷어낸 나머지의 sha256 이 편집 전후 **동일**하다
  (`dashboard.go` `8ba3d0f50952c08c` · `types.ts` `2c02059017afbdee` · `Dashboard.tsx` `7386ecc4406c9806` ·
  `topbarSlot.ts` `89457b699a89d5f8` · `Topbar.tsx` `a74600077eb07b12` · `ac3-6` `4ef13b3c08cf6c32`).
- **독립 재계수**: 원장 141행을 파싱해 tip 실측과 대조 — 잔여 197 → **112**(⑴ 4파일 53 + ⑵ 13파일 59). 판정한 85 와 합이 197 로 맞는다.
- `gofmt -l go` 무출력 · `go vet ./...` rc=0 · `go test ./...` 전부 ok.
- `tsc -b` rc=0 · `eslint .` rc=0 · `vitest run` 9파일 73건 통과.
- `python3 scripts/check-journey-mockup.py` rc=0 · `python3 scripts/check-mockup-render.py` rc=0 — **둘 다 출력이 편집 전후 바이트 동일**
  (R3 의 「in-scope 27종 — 이름 대조 성립 26 · 등재 예외 1 · 구현 전용 1」 불변).
- `python3 scripts/check-data-format-change.py <base> <head>` → `format_changed=false`(이 패스가 건드린 7파일 중 `SENSITIVE_PATHS`·
  `CONTENT_RULES` 에 걸리는 것이 없고, 내용 규칙은 주석 줄을 `COMMENT_LINE` 으로 이미 제외한다).

## 원장 반영

- 「패스 이력」에 `2026-09-24 | dash-rebuild-pass | 9a37d04 | 2601 | 41 | 2560 | 140 → 140` 한 행.
- 「파일별 원장」에 **신규 3행**(`dashboard.go`·`dashboard_test.go`·`topbarSlot.ts`) + **갱신 4행**(`Dashboard.tsx`·`types.ts`·
  `Topbar.tsx`·`ac3-6`). 표는 138행 → **141행**.
- 말미 요약을 통째로 갈았다 — 직전 요약의 「미판정 잔여 10 / ⑵ 0 / 무인 패스의 다음 선은 없다」 **세 문장이 모두 낡았다**.
  새 값은 잔여 **112**(⑴ 4파일 53 + ⑵ 13파일 59), 무인 패스의 다음 선 **75줄**.
- `deploy/overlays/prod/batch-pvc.yaml` 행의 「사람 몫」 유보에 **해소 표기**를 덧붙였다(기록은 지우지 않았다) —
  #127(`6b3a264`)이 `SENSITIVE_PATHS` 를 10항 → 5항으로 줄이며 `deploy/**/*pvc*.yaml` 을 뺐으므로 그 유보의 근거가 소멸했다.
  여전히 감소(실측 7 < 남음 9)라 잔여 계수 밖이고, 무인 재판정 후보로 남는다.

## 범위 밖 (다음 패스로)

잔여 112줄 중 이 패스가 보지 않은 것.

- **사람 몫 11** — `scripts/check-data-format-change.py`. `main` ruleset 이 `review/manual-approval` 을 필수 status 로 요구하고,
  그 status 는 이 스크립트가 `format_changed=false` 일 때만 붙는데 `SENSITIVE_PATHS`(`:48`)에 스크립트 자신이 있다.
- **열린 PR 과 겹치는 26** — #130 이 `debug.go` 9 · `debug_test.go` 3 · `storage.py` 10 · `domain.py` 1 · `test_storage.py` 1 을,
  #131 이 `tests/e2e/run.sh` 2 를 동시에 고친다. 먼저 손대면 리베이스 비용만 든다.
  **— #130 몫 24 는 해소됨(2026-09-25, #130 `9ebc095` 착지 · [runlog-window-pass](2026-09-25-runlog-window-pass.md) 가 판정, rct_20260925-0001)**. 그때 **귀속 두 건이 틀린 것으로 드러났다**: #130 이 `domain.py`·`test_storage.py` 에 더한 것은 줄 끝 주석과 docstring 이라 **지문의 사각지대**여서 그 두 파일의 기존 1줄씩은 애초에 #130 과 겹치지 않았다(실측: `git diff 9a37d04 9ebc095` 의 두 파일 주석 줄 델타 0). #131 몫 `run.sh` 2 는 그 PR 이 아직 열려 있어 유예가 유효하다.
- **무인 패스의 다음 선 75** — 가장 큰 표적은 `scripts/journey-scenarios/JRN-judgment-debug.js` 30(#124·#126·#128 이 세운 여정
  하네스, 행 없음)과 `Trace.tsx`/`Trace.test.tsx` 16(#126·#128) 묶음. 그 밖에 `check-journey-mockup.py` 12(#129) ·
  `tokens.css` 6(#128) · `test_cli.py` 4 · `store.go` 3 · `Sidebar.tsx` 2 · `test_llm.py`·`test_silver.py` 각 1.
- **잔여에 들어가지 않는 재판정 후보** — `batch-pvc.yaml` 머리 7(위) · `ingestion/cli.py` 행 남음 2 · 실측 0 ·
  `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터(dash-brief-pass 판단 분기) · `ac3-8` 머리 단언 목록 ·
  `test_feeds.py`·`test_aggregate.py`·`test_llm.py` 의 인라인 AC 태그.
