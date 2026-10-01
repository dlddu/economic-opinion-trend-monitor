# 2026-09-27 — e2e-spec-axis-pass (시나리오 spec 22행 364줄 · ①②③④ 축 전건 판정)

`tbm_econ-opinion-monitor-comment-necessity` / `rct_20260927-0001`. 기준 커밋 `232fd66`(= #173 착지 tip = main).

판정 **22행 364줄** · 제거 **57줄** · 행 소멸 **2**. L 표면 `2655 → 2598`.

정책 본문은 [`../README.md`](../README.md), 행별 결과는 [`../ledger.md`](../ledger.md)에 있다.

## 범위 — 왜 이 22행인가

직전 [sensitive-lane-pass](2026-09-26-sensitive-lane-pass.md)가 D·E 표면을 전건 완료로 닫고
넘긴 것은 **L 표면 잔여 하나**였고, 그 패스가 파일 집합이 서로소인 세 덩어리로 적어 두었다.
그 표를 live 로 다시 재니 **한 덩어리의 수치가 틀려 있었다**:

| 덩어리 | 인계 표 | 이 패스의 실측 | 차이 |
|---|---:|---:|---|
| `tests/e2e/specs/**` + `tests/smoke.sh` | 22행 / 364줄 | 22행 / 364줄 | 일치 |
| `web/src/**` | 24행 / 397줄 | **25행 / 452줄** | `web/src/screens/Trend.tsx`(55줄, 축 `①②`) 한 행이 빠져 있었다 |
| `python/packages/{aggregation,analysis,ingestion}` | 18행 / 116줄 | 18행 / 116줄 | 일치 |

빠진 행은 인계 시점(`d20825d`)에도 같은 값·같은 축으로 원장에 있었다(`git show d20825d:…ledger.md`)
— 인계 표의 계수 누락이지 그 사이의 이동이 아니다. 셋의 합은 65행 932줄이고, 게이트가 출력하는
`미판정 36행 413줄 + 일부 축만 29행 519줄`과 일치한다.

**예산은 400줄**이고 세 덩어리 중 예산 안에 한 덩어리로 드는 것은 e2e spec 묶음(364줄)뿐이다
(`web/src` 는 452줄로 넘고, 남은 두 덩어리를 합치면 480줄로 넘는다). 직전 패스도 「각 덩어리가
400줄 안팎이라 한 패스에 하나가 맞는다」고 적었다. 36줄을 더 채우려면 다른 덩어리를 쪼개야
하는데, 한 패키지의 행이 두 슬라이스로 갈리면 그 파일들 사이의 사본 관계(아래 「주인 지목」)를
한 자리에서 판정할 수 없다. 그래서 364줄에서 끊었다.

이 덩어리는 **무인 사정권**이다: `tests/**` 는 `check-data-format-change.py` 의
`CONTENT_EXCLUDES` 이고 `docs/**` 는 `SENSITIVE_PATHS` 밖이라 `format_changed=false` →
`review/manual-approval` 이 자동으로 붙는다. 파일이 겹치는 열린 PR 은 0건이었다.

## 네 축을 어떻게 물었는가

- **①** 같은 파일의 코드·상수·단정과 주석이 이름으로 지목하는 제품 코드를 읽었다.
- **②** 테스트 문서 4종(`…-test-{ingestion,analysis,aggregation-viz,pipeline-ops}.md`),
  PRD 4종, `docs/econ-opinion-monitor-doc-tracker/2026-09.md`, `contracts/`,
  `docs/econ-opinion-monitor-e2e-mocking-policy.md` 를 대조했다.
- **③** `git log --follow` 로 22파일의 저작 커밋을 전수로 뽑고 그 PR 26건의 본문을 받아, 주석
  줄마다 **최장 공통 부분 문자열**을 재 25자 이상인 자리를 전부 읽었다.
- **④** 같은 26 커밋의 `Co-authored-by` 트레일러를 지운 본문 길이를 쟀다. 본문이 있는 것은
  **8건**이고 그 본문은 대개 task id 한 줄이나 패스 집계다. 이 22행의 명제를 실제로 복원하는
  커밋은 **`535ffda`(#121) 하나**였다 — `ingestion-7` 의 2줄을 닫았다. 이 축이 한 줄이라도
  닫은 것은 이 모델에서 처음이다(직전 세 패스는 ④ 수확 0이었다).

## 제거 — 근거별 (57줄)

### ② 저장소 문서가 축자로 소유한 것 (10줄)

- **`tests/smoke.sh` 5줄** — 페이크 수집원·페이크 분석기 고정 근거. 바로 아랫줄의
  `# mock-exception: FEED-01` · `LLM-01`(기계 판독 주석, 판정 대상 밖)이 스스로
  `docs/econ-opinion-monitor-e2e-mocking-policy.md` 를 가리키고, 그 허용목록 1·2행의
  「실환경 불가 사유」 칸이 같은 내용을 담는다 — **「미설정 러너에서 스모크가 exit 2로 죽는다」**
  까지 같다. 주석이 자기 복원처를 자기 옆에 달고 있던 자리다.
- **`ac3-6-sentiment-ratio-viz.spec.ts` 3줄** — PRD `…-prd-aggregation-viz.md` AC3.6
  「검증 방법」을 따옴표째 옮긴 문단. 윗줄 `// 검증 시나리오:` 가 문서·앵커를 기계 판독
  형식으로 가리킨다(initial-pass·scenario-spec-pass 가 같은 유형을 닫은 선례).
- **`smoke-serving.spec.ts` 2줄** — 「kind 에 띄운 serving 이 기동해 요청을 받는다는 것만
  확인하는 인프라 스모크이며, 시나리오 전용 spec 들이 의미 있게 실패할 수 있는 전제를 세운다」.
  doc-tracker 「비-시나리오(스모크·인프라) 등재」 표의 그 행이 **같은 문장**으로 적고 있다.

### ① 코드가 그 자리에서 말하는 것 (21줄)

- **`tests/smoke.sh` 6줄** — 파일 머리 3줄(`Makefile` 의 `test-cross: ## Cross-language smoke:
  Python writes Gold -> Go serves it` 가 같은 요약을 담고 `make help` 가 그것을 읽는다)과
  `# 1) …` `# 2) …` `# 3) …` 단계 구분선 3줄(바로 아래 세 `python -m` 호출 · `go build` ·
  `curl`+`grep` 이 각각 복원한다 — 정책의 「구분선」 유형).
- **`smoke-serving.spec.ts` 4줄** — 「시나리오↔spec 1:1 계수에서 제외되고 doc-tracker 에
  등재돼 있다(고아 파일이 아니다)」. `tests/e2e/check_scenario_mapping.py` 의 모듈 docstring
  규칙 2·3 이 그 계약을 적고, 위반 시 규칙 3 이 **「고아 파일」**이라는 말 그대로 rc=1 을 낸다.
- **`analysis-1-target-countries.spec.ts` 3줄** · **`aggregation-2` 2줄** ·
  **`aggregation-3` 2줄** — 머리에 있던 문장이 같은 파일의 테스트 안 주석·단정과 **한 명제**다
  (셋째 테스트가 「축을 베낀 것이 아니다」를 단정한다 / 마지막 테스트가 「필터가 데이터를 지운
  게 아니다」를 그 자리에서 말한다 / 첫 테스트가 「Silver 는 이식만 됐다」를 말한다).
- **`ingestion-6-failure-isolation.spec.ts` 3줄** — Job·피드 좌표. 바로 아래
  `const JOB = "econ-e2e-ingest-faults"` · `const FEEDS_FILE = "e2e-feeds-faults.json"` 와
  다섯 소스 상수(`HEALTHY`·`FLAKY`·`DUPLICATING`·`BROKEN`·`SLOW`)가 고장 유형을 이름으로 말한다.
- **`ac3-6` 1줄** — 화면 카피 축자 인용(아래 「낡아 있던 것」 2번). 스케일 기준은
  `web/src/screens/Sentiment.tsx` 의 `.sent-na` 카피와 `pct()` 가 복원한다.

### ③ 저작 PR 본문이 절 단위로 소유한 서사 (15줄)

정책은 ③ 를 그대로 적용하면 이 레포에서 유지가 0 에 수렴한다고 적고, **「이 값이 무엇과 같아야
하는가 / 무엇을 넣지 말라 / 순서를 바꾸면 무엇이 조용히 깨지는가」를 말하는 줄은 남긴다**는
판별식을 둔다. 그 판별식을 통과하지 못한 것만 걷었다.

- **`aggregation-1` 6줄** — 하네스 두 상태 구성과 「정규화는 소스 안에서 점유율을 먼저 내고 축
  단위로 평균하는 식이라 한 축에 소스가 둘 이상일 때만 실행된다」. PR #50 본문에 두 문장 모두
  있고(「**부풀린 두 번째 루트**(`/data/aggregation-skew`)」 · 「**KR 축에 소스 2개** —
  정규화(AC3.1)가 *소스 안에서 점유율을 낸 뒤 축 단위로 평균*하는 식이라」), 픽스처가 그 조건을
  잃으면 같은 파일의 세 번째 테스트가 **즉시 붉어진다** — 조용히 깨지지 않는다.
- **`analysis-2` 5줄** — 「더블은 변형을 그대로 돌려준다 … 미리 통합해 주면 이 시나리오가
  검증하려는 통합 경로가 e2e 에서 한 번도 실행되지 않는다」. PR #44 본문과 거의 축자다. 이 줄이
  가드로 읽힐 여지는 같은 파일 첫 테스트(`the corpus really does use three different surface
  forms for one subject`)가 그 명제를 **단정으로** 들고 있어 닫힌다.
- **`aggregation-3` 2줄** — `timeshift_bronze.py`·`aggregate-job-rollup.yaml` 좌표와 「피검체는
  집계 그대로이고 손댄 것은 그 한 차원뿐이다」. PR #65 본문에 같은 문장이 있다.
- **`ac3-6` 2줄** — 「그리는 화면은 `sentiment`(JRN-sentiment-shift)다 — 귀속은 PR #117」.
  그 PR 본문이 「`ac3-6` 을 `sentiment` 화면으로」라고 적고, 같은 파일이 `page.goto("/sentiment")`
  를 두 번 호출한다(①). 주석이 자기 복원처의 번호를 스스로 적고 있던 자리다.

### 주인 지목 — 주석끼리의 사본 (9줄)

정책 제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」를 두 자리에 적용했다. 두
자리 모두 **PR #50 의 「알려진 경계 두 가지 (문서·spec 헤더에 명시)」**가 만든 의도적 이중
기재이고, 그래서 사본 쪽을 걷어도 명제가 남는다.

| 명제 | 정본 | 걷은 사본 | 주인을 그렇게 정한 근거 |
|---|---|---|---|
| e2e 한 주기에서 시간대 차원은 값이 하나다(`collected_at` 이 실행 시각) | `aggregation-3` 머리 | `aggregation-2` 5줄 | 그 한계를 **우회하는 하네스**를 쓰는 spec 이 `aggregation-3` 이다 — 전제를 지우면 그 하네스가 임의로 보인다 |
| 오늘 Gold 계약에는 저신뢰 축이 없다(`AxisSentiment` 는 `unanalyzed` 만 싣는다) | `analysis-5` 머리 | `aggregation-4` 5줄 → 주인 지목 1줄(순 −4) | 저신뢰·미분석 분리는 `…-test-analysis.md#시나리오 5` 의 기대 결과이고 `analysis-5` 가 그 시나리오의 spec 이다 |

⚠️ **사본을 걷는 근거로 정본까지 지우지 않았다.** 두 전제는 ①(`econ_ingestion/cli.py` 의
`cycle = args.cycle or …` / `collected_at = now…` 두 줄)과 ②(`contracts/gold/axis_sentiment.avsc`
의 `doc` 「Sentiment ratios for analyzed items; unanalyzed kept separate」)로도 복원되므로 형식상
정본도 제거 대상이 된다. 그러나 정본 쪽 문단은 **그 spec 이 무엇을 미분석에 대해서만 단정하는지**
를 정하는 단언 설계라 정책의 유지 유형(「테스트가 왜 그 모양으로 단언하는지」)에 든다.

**근거별 합계 = 57**: ② 10 + ① 21 + ③ 15 + 주인 지목 9 + ④ 2. 파일별로는
`tests/smoke.sh` 11 · `smoke-serving` 6 · `aggregation-2` 7 · `ac3-6` 6 · `aggregation-1` 6 ·
`analysis-2` 5 · `aggregation-3` 4 · `aggregation-4` 4 · `analysis-1` 3 · `ingestion-6` 3 ·
`ingestion-7` 2 이고, 게이트 실측 델타(`2655 → 2598`)와 같다.

### ④ 커밋 메시지가 닫은 것 (2줄)

- **`ingestion-7` 2줄** — 「`news_item` 은 주기별 파티션으로 누적되므로 스냅샷 N 에는 주기 1..N
  의 관측이 함께 있다 — 관측 단정은 `collection_cycle` 로 그 주기 것만 고른다」. 저작 커밋
  `535ffda`(#121) 본문 첫 줄이 **「news_item: 주기별 파티션 누적
  bronze/news_item/year=/month=/day=/hour=/data.jsonl」**이고, 뒤 절은 같은 파일 `itemAt()` 이
  `item.collection_cycle === id` 로 수행한다(①).

## 낡아 있던 것 세 자리 (제거 근거를 강화한다)

정책 머리말이 「원본만 고쳐질 때 조용히 거짓이 된다」를 이 유형의 비용으로 적는다. 이번 판정에서
그 실례가 셋 나왔고, 셋 다 제거·정정 대상이던 자리다.

1. **`smoke-serving.spec.ts`** 가 가리키는 `docs/econ-opinion-monitor-doc-tracker.md` 는 **없다** —
   doc-tracker 는 `docs/econ-opinion-monitor-doc-tracker/2026-09.md` 로 월별 디렉터리가 됐다.
2. **`ac3-6`** 이 인용한 화면 주석 「분위기 100%는 분석 완료분 기준입니다」는 레포에 **없다** —
   `web/src/screens/Sentiment.tsx` 의 실제 문면은 「미분석 N% — 위 네 비율은 이 몫을 뺀
   **분석 완료분** 기준입니다」다. 인용을 걷고 같은 뜻의 서술만 남겼다(줄 수 −1).
3. **원장의 `ingestion-7` 결과 칸**이 「`news_item` 이 주기마다 덮어쓰기라 최종 파일만으로…」라고
   적고 있었다 — `535ffda`(#121)가 파티션 누적으로 바꾼 뒤 낡은 서술이다. 행을 재기재하며 고쳤다.

## 유지 — 판별식을 통과한 것 (307줄)

- **「무엇을 넣지 말라」** — `ingestion-2` 의 「상한도 제공분도 상수로 쓰지 않는다」,
  `pipeline-ops-1` 의 「건수는 리터럴로 적지 않는다」, `ingestion-3` 의 「기대 축을 spec 에 다시
  적지 않고 설정에서 읽는다」, `analysis-6` 의 「재판정 대상을 상수로 박으면 픽스처와 두 곳이
  어긋난다」. 넷 다 ③ 히트지만 편집 지점 가드라 남긴다.
- **「무엇과 같아야 하는가」** — `pipeline-ops-2` 의 `promptDigest` JSDoc(「제품의
  `econ_core.calllog.prompt_digest` 와 **같은 정의**: system, NUL, user」), `pipeline-ops-3` 의
  「미호출 사유는 계약이 doc 에 열거한 두 값뿐 — 새 사유가 생기면 이 목록과 계약 doc 이 함께
  움직여야 한다」.
- **공허한 통과를 막는 사전 조건 점검의 근거** — 22파일 중 17파일에 있다. 「셋이 다 있어야
  시나리오의 사전 조건이 선 것이다 — 아니면 위 단정이 공허해진다」 류는 그 단정이 무엇을
  **못 잡는지**를 말하므로 코드가 복원하지 않는다.
- **한 번 깨져 본 자리** — `analysis-5` 의 `CELL_SEP` 3줄(축 이름이 다른 축의 접두사일 때 옆
  축을 끌어오고, 구분자를 손으로 조립했다가 `cellKey` 의 구분자와 어긋나 `ci / e2e` 에서 단정이
  실제로 깨진 실측이 적혀 있다).
- **런타임·하네스 제약** — `analysis-6` 의 「1차 Silver 는 재분석 뒤 PVC 에 남아 있지 않다」,
  `ingestion-6` 의 「더블의 지연이 Job 의 `--fetch-timeout` 보다 길다」,
  `ingestion-7` 의 「`news_body` 단정은 그 주기가 끝난 시점의 저장소를 봐야 한다」.

## 판단이 갈려 남긴 것

- **`analysis-3` 6줄 전량** — 「라벨의 정확도는 이 층이 보지 않는다 … 오프라인 골든 평가가
  잰다(doc-tracker 「예외 후보 중 미등재」)」는 PR #44 본문의 「**단정하지 않는다** — 라벨의
  **의미적 정확도**」와 축자로 겹치지만, 이 문단은 미래 편집자에게 **이 spec 에 정확도 단정을
  넣지 말라**를 말하는 자리다. 그 줄이 사라진 뒤 정확도 단정이 들어오면 e2e 는 비결정적으로
  붉어진다(조용히 깨지는 쪽이다). 정책의 「경로 ③ 과 편집 지점 가드가 갈리는 자리」 조항으로
  유지하고, 같은 판정을 `ingestion-2`·`pipeline-ops-1` 에도 일관되게 적용했다.
- **`ingestion-6` 의 「걸러진 중복과 격리된 소스는 Bronze 에 흔적이 없다」 2줄** — PR #39 본문에
  같은 문장이 있으나, 「'레코드가 없다'만 보면 상류가 애초에 아무것도 주지 않은 경우와 구별할 수
  없다」는 **왜 로그와 레코드를 함께 읽는가**의 근거라 단언 설계로 유지했다.

## 「주석만 걷었다」를 코드로 증명한 방법

- **비주석 diff 0줄** — `git diff -U0` 의 추가·삭제 줄에서 `//`·`#`·`*` 로 시작하는 줄과 빈
  줄을 걸러 낸 집합이 **공집합**이다. 22파일 전체가 주석 줄의 삭제·재배치뿐이다.
- **기계 판독 주석 무접촉** — `// 검증 시나리오:` 22줄, `# mock-exception:` 2줄, shebang 1줄이
  전후 **바이트 동일**이다(`check_scenario_mapping.py` 와 모킹 정책 허용목록이 그것을 읽는다).
- **게이트 출력 대조** — 아래 「로컬 게이트 실측」.

## 로컬 게이트 실측 (전건)

```
python3 scripts/check-comment-ledger.py            rc=0  불변식 통과
python3 tests/e2e/check_scenario_mapping.py        rc=0  집계 전후 바이트 동일
python3 scripts/check-journey-mockup.py .          rc=0
python3 scripts/check-mockup-render.py .           rc=0
node scripts/check-journey-flow.js .               rc=0
python3 scripts/check-data-format-change.py <base> <head>   format_changed=false
bash -n tests/smoke.sh                             rc=0
tests/smoke.sh (uv 대역: python3 + PYTHONPATH)      rc=0  Python Gold -> Go API end to end
npx playwright test --list (22 spec)               변경 전후 같은 테스트 목록
```

## 완료 기준 — 절대 지문이 아니라 부모 대비 델타

| | `232fd66` | 이 패스 이후 |
|---|---:|---:|
| L 판정 대상 줄 | 2,655 | **2,598** (−57) |
| L 행 수 | 192 | **190** (행 소멸 2) |
| L 판정 축 `①②③④` | 127행 · 1,723줄 | **147행 · 2,030줄** |
| L 일부 축만 | 29행 · 519줄 | **23행 · 396줄** |
| L 미판정 `—` | 36행 · 413줄 | **20행 · 172줄** |
| L 축 ④ 미판정 | 64행 · 895줄 | **42행 · 531줄** |
| D 표면 | 40행 · 578줄 · 미판정 0 | **불변** |
| E 표면 | 20행 · 44줄 · 미판정 0 | **불변** |

## 범위 밖 (후속)

**L 표면 43행 568줄.** 이 패스는 `tests/` 밖의 L 을 한 칸도 건드리지 않았다. 두 덩어리로 갈리고
둘 다 `SENSITIVE_PATHS` 밖이라 무인 착지가 가능하다.

| 덩어리 | 행 / 줄 | 비고 |
|---|---:|---|
| `web/src/**` | 25행 / 452줄 | 예산 400 을 넘으므로 한 패스에 들어가지 않는다. `tokens.css` 62줄은 줄머리 `#`·`*` 오탐을 포함하고(원장 「읽는 법」), 일곱 행은 ④ 만 비어 있다 |
| `python/packages/{aggregation,analysis,ingestion}` | 18행 / 116줄 | 생산자 glob 이지만 줄머리 주석은 `COMMENT_LINE` 이 건너뛰어 무인이다 |

🔴 **위 표는 이 패스의 판정 기준(`232fd66`)에서 잰 값이고, 판정 중에 이미 움직였다.** 자매 PR
[#174](https://github.com/dlddu/economic-opinion-trend-monitor/pull/174)
(`tbm_econ-opinion-monitor-docs-impl`, AC3.10)가 이 패스를 만드는 동안 `31d74a0` 으로 착지했다.
`merge-tree` 로 이 패스와의 겹침은 **0건**(클린)이고 머지 트리에서 게이트가 rc=0 이지만, 잔여
모집단은 두 자리에서 커졌다 — **다음 패스는 인계 표 대신 게이트 출력을 직접 읽어야 한다.**

머지 트리(`이 패스 ∪ 31d74a0`) 실측 잔여 — **45행 695줄** (게이트 출력 「일부 축만 21행 343줄
+ 미판정 24행 352줄」):

| 덩어리 | 행 / 줄 | 비고 |
|---|---:|---|
| `web/src/**` | 25행 / 471줄 | #174 가 네 파일의 주석을 19줄 늘렸다(행 수는 불변) |
| `python/packages/{aggregation,analysis,ingestion}` | 18행 / 116줄 | 불변 |
| `go/internal/handlers/contributions.go` | 1행 / 64줄 | **#174 가 새로 들인 파일** — 판정 축 `—` |
| `go/internal/handlers/contributions_test.go` | 1행 / 44줄 | 같음 |

새 Go 두 행(108줄)은 같은 PR 이 한 자리에 들인 한 덩어리이므로 파일 공유로 묶이지 않아도 함께
집는 것이 자연스럽고, `python/packages` 116줄과 합치면 224줄로 예산 안에 든다. `web/src` 471줄은
여전히 예산을 넘어 그 안에서 다시 끊어야 한다(화면 단위로 갈리는 자리가 있다). `web/src` 를 집으면 그
안에서 다시 400 으로 끊어야 하고(화면 단위로 갈리는 자리가 있다), `python/packages` 는 116줄이라
한 패스에 통째로 들어가고 남는 예산으로 `web/src` 의 작은 행을 끌어올 수 있다.
