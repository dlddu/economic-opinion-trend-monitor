# 2026-10-01 e2e-harness-necessity-pass — e2e 하네스 lib · aggregation · analysis-1..4 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261001-0002`.

## 판정 범위

L 표의 `—` 행 중 e2e 하네스 라이브러리 `tests/e2e/lib/*.ts` 9파일과, 그 라이브러리를 쓰는
`tests/e2e/specs/aggregation-1..5` · `analysis-1..4` 9파일(각 1행), 그리고 그 두 spec 의 E 행
(`aggregation-4` · `analysis-2`, 각 1줄)을 예산 400줄 안에서 묶었다: **판정 전 389줄(L 387 · E 2) →
320줄(제거 69)**. 라이브러리와 소비 spec 을 한 패스에 둔 것은 「설명의 주인(lib) vs 사본(spec 머리)」
처분을 한 번에 내리기 위해서다.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---:|---:|---:|
| `lib/bronze.ts` | 13 | 11 | 2 |
| `lib/calllog.ts` | 13 | 10 | 3 |
| `lib/feeds.ts` | 16 | 15 | 1 |
| `lib/gold.ts` | 65 | 54 | 11 |
| `lib/ingestlog.ts` | 13 | 8 | 5 |
| `lib/llmdouble.ts` | 23 | 21 | 2 |
| `lib/recordlinks.ts` | 14 | 14 | 0 |
| `lib/runlog.ts` | 13 | 13 | 0 |
| `lib/silver.ts` | 39 | 28 | 11 |
| `specs/aggregation-1-volume-normalization.spec.ts` | 13 | 12 | 1 |
| `specs/aggregation-2-subject-cross-dimension.spec.ts` | 24 | 16 | 8 |
| `specs/aggregation-3-bucket-rollup.spec.ts` | 28 | 28 | 0 |
| `specs/aggregation-4-sentiment-ratio-integrity.spec.ts` | 15 (+E 1) | 15 (+E 1) | 0 |
| `specs/aggregation-5-subject-trend-chart.spec.ts` | 51 | 39 | 12 |
| `specs/analysis-1-target-countries.spec.ts` | 10 | 6 | 4 |
| `specs/analysis-2-subject-normalization.spec.ts` | 11 (+E 1) | 10 (+E 1) | 1 |
| `specs/analysis-3-sentiment-classes.spec.ts` | 6 | 2 | 4 |
| `specs/analysis-4-multi-value-retention.spec.ts` | 20 | 16 | 4 |

(경로는 `tests/e2e/` 기준.) 코드 변경 0 — `git diff -U0` 의 ± 줄이 전부 주석 줄이다.

## 제거 목록

| 파일 | 제거한 주석 | 유형 |
|---|---|---|
| `gold.ts` | 머리 둘째 문단(「같은 루트의 Bronze·Silver 도 함께 읽는다 … `crossTab()` 이 그 재계산이다」) | 다른 주석의 재진술 — 정본은 `crossTab` doc |
| 같은 파일 | `rollupGoldDir` 의 「수집 시각만 다시 찍은 같은 코퍼스 … (`tools/timeshift_bronze.py` + `aggregate-job-rollup.yaml`)」 · `rollupItems` 의 「수집 시각만 다시 찍힌 집계 코퍼스다」 | 다른 주석의 재진술 — 정본은 `bronze.ts: rollupBronzeDir` |
| 같은 파일 | `subjectTrendsAllUnits` 의 소비자 열거 2줄 | 열거 — 호출부가 바뀌면 조용히 낡는다 |
| 같은 파일 | `CELL_SEP` 의 NUL 사고담 3줄 → 금지 1문장으로 개작 | 경위 |
| 같은 파일 | `BucketUnit` 머리 | 코드 재진술 — `UNIT_RANK` 에서 파생된 타입 |
| `silver.ts` | `AnalysisSummary` 머리 · 필드 doc 5(`readBronze`·`wrote`·`analyzer`·`lowConfidence`·`unanalyzed`) | 코드 재진술(이름) · 「CLI 출력 토큰을 그대로 따른다」는 부정확(필드는 camelCase) |
| 같은 파일 | `rollupAnalyses` 의 동일성 문단 | 다른 주석의 재진술 — 정본은 `aggregation-3` 의 이식 동일성 단언 위 주석 |
| 같은 파일 | `Analyzed` 머리 · `analyzedByTitle` 의 「네 분석 spec」 · 인자 개방 경위 문단 | 코드 재진술 · 개수 · 경위 |
| `ingestlog.ts` | `IngestSummary` 머리 · 필드 doc 4(`wrote`·`bodiesNew`·`bodiesDeduplicated`·`cycle`) | 위 `silver.ts` 와 같음 |
| `calllog.ts` | 「루트를 가르는 이유는 `runlog.ts` 쪽과 같다」 | 다른 주석 가리킴 — 정본 `runlog.ts` |
| `bronze.ts` | `NewsBody` 머리 · 비공개 `exportedDir` 머리 | 계약 재진술 · 코드 재진술 |
| `feeds.ts` | `ProvidedEntry` 머리 | 이름 재진술 |
| `llmdouble.ts` | 「`lib/feeds.ts` 가 … 하는 일과 같은 자리다」 · `extends` 의 「다섯 줄이고, 대신 …」 → 1줄 개작 | 비교 서술 · 개수 |
| `aggregation-2` | 머리의 교차 집계 문단 · 단위 필터 문단 · 두 절 목록 틀 | 다른 주석의 재진술 — 정본 `gold.ts: crossTab` · `gold.ts: inFinestUnit` |
| `aggregation-5` | 머리의 세 절 목록(1)~(3) | 테스트 이름 재진술 |
| 같은 파일 | `points` 파서 머리 · 「지금 어느 대상을 …」 · 「헤드라인 지표와 범례가 새 대상을 말한다」 | 코드·단언 재진술 |
| `aggregation-1` | 「그렇다고 정규화가 … 늘어난 쪽은 늘어난다」 | 바로 아래 단언 재진술 |
| `analysis-1` · `analysis-3` · `analysis-4` | 「무엇을 단정하지 않는가」(의미적 품질 vs 전달 계약) 머리 문단 | 다른 주석의 재진술 — 정본 `lib/llmdouble.ts` 머리(기대값 출처를 정하는 자리) |
| `analysis-2` | 신규 대상 단언 위 주석 | 상수 `NOVEL_SUBJECTS` doc 재진술 |

## 틀린 주석 고침

- `gold.ts` — `SubjectSourceContribution` 타입 위 doc 이 「Gold `axis_sentiment` 레코드 —
  contracts/gold/axis_sentiment.avsc 가 SSOT」였다(`AxisSentiment` 의 doc 이 한 타입 위로 밀린 자리).
  `subject_source_contribution.avsc` 로 고쳤다. 그대로 두면 이 타입을 고치려는 사람이 엉뚱한 계약을 연다.
- `silver.ts` — `groupingKeys` 위 doc 이 「`record_id` 로 찾기 쉽게 묶는다」(= `byRecordId` 의 설명)였다.
  실제 규칙(카테고리가 있으면 카테고리, 없으면 서술 대상)과 그것이 제품
  `econ_core.silver.grouping_keys` 와 같아야 한다는 의무로 고쳤다 — 갈리면 재계산이 Gold 와 다른 칸을 센다.
- `aggregation-5` — 「단언하지 않는 것」의 셋째 항목 「일·주 롤업 합산 — 집계가 `hour` 버킷만 산출해 관측
  대상이 없다」를 **지웠다**. 집계는 `BUCKET_UNITS = ("hour", "day", "week")` 를 산출하고 시나리오 3 은
  `aggregation-3` 이 잰다 — 이 spec 이 롤업을 재지 않는 이유는 첫 항목(집계 로직은 다른 spec 의 층)이 이미 말한다.

## 유지 목록 (필요 사유)

### `tests/e2e/lib/`

- 계약 SSOT 지목(`news_item`·`llm_call`·`analysis`·`subject_trend`·`subject_source_contribution`·`pipeline_run`) —
  타입만 고치면 하네스가 제품 계약과 조용히 갈린다; 고칠 곳은 `contracts/` 다.
- 반출 루트를 나누는 이유(`bronze.ts`·`gold.ts`·`silver.ts`·`runlog.ts`·`recordlinks.ts` 머리) — `write_records`
  가 데이터셋을 교체하고 주기별 단정이 서로의 레코드에 오염되므로, 합치는 「정리」가 단정을 무력화한다.
  루트를 가르는 이유의 정본은 `runlog.ts`(`calllog.ts` 사본은 걷었다).
- 로그로 집계를 읽는 이유(`ingestlog.ts`·`silver.ts` 머리) — Bronze·Silver 레코드에 남지 않는 사실(격리·중복·
  유보 vs 무응답)이라 레코드 계수로 바꾸면 구별이 사라진다.
- `attempted`·`failed`·`duplicatesSkipped`·`failedSources` 필드 doc · `failed_sources` 입력 모양 — 이름만으로는
  분모(본문 있는 건)와 픽스처 누락 신호, 파이썬 repr 입력을 알 수 없다.
- 기대값을 픽스처에서 유도하는 이유 · 제품 파서/구현을 베끼지 않는 이유(`feeds.ts`·`llmdouble.ts` 머리 ·
  `isoWeekLabel` · `crossTab` 의 미분석을 거르지 않는 이유) — 베끼면 대조가 동어반복이 된다.
- 의미적 품질을 단정하지 않는 범위(`llmdouble.ts` 머리) — 이 층에 정확도 단언을 더하는 것을 막는 정본.
- 두 구현이 같아야 하는 자리 — `UNIT_RANK`↔서빙 `finestUnit` · `bucketOf`↔집계 `_bucket` · `groupingKeys`↔
  `grouping_keys`(고침) · `extends` 이중 해석 · `MODEL_*`↔Job `ECON_LLM_MODEL` · `CannedReply` 스키마.
- `inFinestUnit` — 단위를 가르지 않으면 3배로 세고, 버킷 키로는 단위를 고를 수 없다.
- `AxisSentiment.unanalyzed` — 이것만 전체 대비라 다섯 수를 합 1 로 접는 실수를 막는다.
- `CELL_SEP`(개작) · `trendOf` · `analyzedByTitle` 제목 키 · `cannedReply`/`analysisSummary` 의 「조용히 0/undefined
  를 주지 않는다」 — 어기면 실패가 원인 없이 드러나거나 조용히 통과한다.
- `recordlinks.ts` 의 `Analysis` 를 넓히지 않는 이유 · `aggAnalyses` corpus 분리 — 합치면 다른 spec 들의 관측이 흐려지거나
  건수 단정이 오염된다.
- `rollupGoldDir`(개작) · `rollupBronzeDir` — 세 단위 다중 버킷이 있는 유일한 루트와 그 타임시프트 출처.
- export 함수의 JSDoc 요약 1줄 — doc 주석 수준.

### `tests/e2e/specs/`

- `// 검증 시나리오:` — 기계가 읽는 주석(시험 면제, 지문 제외).
- 사전 조건 선확인 주석(픽스처 표기 · 다중 값 · 두 축 · 분위기 섞임 · 버킷 둘 이상 등) — 없으면 단정이 공허하게
  통과한다는 이유를 모르고 「불필요한 단언」으로 지운다.
- 단언의 모양·임계 근거(절반 임계 · naive 대비 · 허용 오차 · 누적 합산 · 0선 · 비례상수 · 순서가 본체 ·
  버킷 1개 단서) — 숫자·순서가 어디서 왔는지 없으면 단언을 고칠 때 검산할 수 없다.
- `aggregation-3` 머리 세 문단 · Silver 이식 동일성 — 시나리오의 어려운 절(수집 시각이 실행 시각)과 두 관측이
  서로를 대신하지 못하는 이유; 이식 동일성의 정본.
- `aggregation-4` 머리 · E 1줄(0 분모 건너뛰기) — 분모 규칙과 0 분포에 합 1 을 걸지 않는 이유.
- `aggregation-5` 의 상수를 박지 않는 이유 · 공식을 베끼지 않는 비교 · 단언하지 않는 것(집계 로직 · 다중 버킷
  x축 — 다른 루트가 서빙에 마운트되지 않는다) · 선택이 API 를 거치는 이유.
- `analysis-2` 머리(철자를 단정하지 않음) · E 1줄(`shared[0]` 은 이미 정규 표기) · 개수 보존 근거.
- `analysis-4` 머리 첫 문단 — 이 시나리오가 집계 묶음에 있는 이유와 다중 값이 줄어드는 두 자리.
- 픽스처 출처 지목(`analysis_corpus.rss.xml` · `agg_us_desk.rss.xml`) — 기대값의 근거 파일.
