# 2026-10-01 necessity-migration-pass — 필요성 개정 이전 + 첫 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20260930-0001`.

## 이전 (판정 없음)

2026-09-29 유형 개정으로 판정 기준이 「복원 가능한가」에서 「한 문장 필요 사유를 댈 수 있는가」로 바뀌었다.

1. `README.md` — 「복원 경로 넷」을 「필요성 시험」·「유지 대상」·「판정 절차」로 바꿨다. 제외 ①의 이름은 「문서」다.
   doc 주석 수준은 모델 정의를 따른다 — 모듈 속성의 `#:` 주석은 이제 수준 안이 아니라 시험을 받는다.
2. `ledger.md` — 열 `판정 축` → `판정`. **기존 행은 모두 `—`로 되돌렸다.** 옛 `①②③④`는 복원 불가로 남긴
   주석도 포함하므로 새 기준의 판정 완료가 아니다. 결과 칸의 옛 서술은 당시 판정의 기록으로 둔다.
3. `scripts/check-comment-ledger.py` — 유효 표기는 `완료`·`—` 둘(R5), 집계는 `판정 완료`·`미판정` 두 줄.
4. 레포 안의 옛 모델 id 참조 41개 파일을 새 id(`tbm_econ-opinion-monitor-comment-necessity`)로 고쳤다.

## 판정 범위

#218 이 `—`로 되돌린 10행(L 8행 154줄 · D 2행 121줄)과 같은 파일의 다른 표면 행, 그리고 같은 가족의 작은
덩어리를 예산 400줄 안에서 묶었다: **판정 전 396줄 → 309줄(제거 87)**. 다음 덩어리(`aggregate.py` L·D 28줄)는
예산을 넘어 뺐다.

| 표면 | 행 | 판정 전 | 뒤 | 제거 |
|---|---:|---:|---:|---:|
| L | 18 | 245 | 196 | 49 |
| D | 8 | 142 | 108 | 34 |
| E | 3 | 9 | 5 | 4 |

코드 토큰 변경 0 — Python 5파일은 docstring 을 걷은 `ast.dump` 가 base 와 같고, Go diff 는 주석 줄뿐이다.

## 제거 목록

| 파일 | 제거한 주석 | 유형 |
|---|---|---|
| `go/internal/handlers/contributions.go` | `contributionRow`·`contributionSource`·`contributionsBasis`·`contributions` 의 첫 줄(+빈 `//` 3) | 코드 재진술 |
| `go/internal/handlers/contributions_test.go` | `writeContributionLake` 머리, 「AC3.10, first/second sum identity」 머리 2 | 코드 재진술(함수 이름) |
| `go/internal/handlers/reprocess.go` | 파일 머리 5줄(라우트 · 쓰기 쪽 파일 위치) · `reprocessRanges`·`scopeBucket`·`itemsInWindow` 첫 줄 | 코드 재진술 |
| `go/internal/handlers/reprocess_test.go` | 테스트 머리 4블록 9줄 | 코드 재진술(테스트 이름) |
| `go/internal/handlers/reprocess_trigger.go` | 머리의 여정·단계 열거 4줄(남은 문장은 한 줄로 개작) · `reprocessRuns` · `reprocessRequest` 2 | 작업 흔적 · 코드 재진술 |
| `go/internal/handlers/reprocess_trigger_test.go` | `fakeAPIServer` 메서드 열거 2 | 코드 재진술 |
| `go/internal/handlers/dashboard.go` | `/api/dashboard — JRN-daily-scan 화면 1(STP-open-brief)` | 작업 흔적 |
| `python/packages/analysis/src/econ_analysis/llm.py` | `#:` 3(`NO_CALL_BODY_UNAVAILABLE`·`_KOREAN_NAMES`·`_ACRONYM_GLOSS`) · 줄 끝 `# transport / decode failure` | 코드·docstring 재진술 |
| 같은 파일 docstring | 모듈 2문단(동작·주입 구조) · `_temperature`·`_clean_list`·`_tracking_key` · `http_completer` 의 환경 변수 기본값 열거 · `parse_response` 본문 · `analyze_llm` 첫 문단 · `run_llm_analysis` 첫 문단 | 코드 재진술 · 모듈 docstring 재진술 |
| `python/packages/analysis/tests/test_llm.py` | 단언 재진술 4 + 줄 끝 3 · 모듈 docstring 본문 · `_completer` docstring | 코드 재진술 |
| `python/packages/aggregation/tests/test_aggregate.py` | `Raw counts stay per-bucket…` | 코드 재진술 |
| `python/packages/core/src/econ_core/domain.py` | `# Medallion layers.` · 데이터셋 이름 묶음 머리 · `ENV_DATA_ROOT` 머리 | 코드 재진술 |
| `python/packages/core/tests/test_storage.py` | `Missing dataset reads as empty…` | 코드 재진술 |

## 유지 목록 (필요 사유)

### `go/internal/handlers/contributions.go` (L 29)

- `BodyDuplicate`/`BodyShares` 문단 — 지우면 두 필드가 중복으로 보여 하나를 빼게 되고, 신디케이션 폭을 읽던 화면이 근거를 잃는다.
- `RawCount`·`Total` 가드 — Gold 원값 대신 이 엔드포인트의 계수를 쓰면 합계 항등식이 자기 자신과 비교돼 조용히 공전한다.
- `AnalyzerVersion` 빈 값 의미 — 빈 문자열이 「발행 결정이 없으면 레코드별 최신」이라는 집계 규칙과 같다는 것을 모르면 필터로 오해한다.
- `contributions` 의 「같은 계산」 가드 · 107-108 집계 `bucket_articles` 대응 · `servingVersion`·`selectServing`·`articleKey`·`bucketLabel`·`groupingKeys` 의 Python 대응 지목 — 지우면 한쪽만 고쳐져 목록이 설명하는 숫자와 갈라진다.
- `Newest first …` — 정렬을 바꾸는 사람이 이 목록의 독자가 스파이크에서 왔다는 이유를 모른다.
- `pickContributionSubject` 폴백 범위 · `bodyShares` 빈 해시 · `sourceTally` 필터 전 — 각각 어기면 다른 행·빈 본문·필터된 합계를 조용히 돌려준다.

### `go/internal/handlers/contributions_test.go` (L 21)

- 붙여 넣은 Gold 의 출처(15-17·273·315-316)와 픽스처 배치도 — 손으로 맞춘 Gold 로 바꾸면 합계 항등식이 아무것도 증명하지 못한다.
- 237-238 · 305 · 348 — 단언이 왜 그 값·부등식인지(무시된 파라미터 · 마지막 관측 · 카테고리 우선)를 모르면 단언을 느슨하게 고친다.

### `go/internal/handlers/reprocess.go` (L 27)

- `Sources` 가 필터와 무관한 이유 · `compareRow` 원시 점유율과 AC3.1 정규화의 구분 · `bucketsOf` 의 레코드 단위 「완료」 · 사전식=시간순 조건 · `versionsOf` 기본 대상 근거 · `throughput` 의 nil 조건 · `compareVersions` 의 before/after 정의 · 미실행 버전 · `mentionShares` 의 집계 키와 레코드 1회 계수 — 각각 지우면 화면이 기대하는 의미와 다른 값을 내는 수정이 자연스러워진다.
- `itemsInWindow` 의 읽을 수 없는 시각 제외 — 추측으로 창에 넣는 쪽으로 「고치면」 범위 수가 틀린다.

### `go/internal/handlers/reprocess_test.go` (L 15)

- 고정 시계(16-17) — 벽시계를 쓰면 범위 창 경계가 실행 시각에 따라 흔들린다.
- 픽스처 배치(63-64) · 기댓값 산술(90·175·196·201-202·214·247-248·257) · 124-125 — 숫자가 어디서 왔는지 없으면 단언을 고칠 때 검산할 수 없다.

### `go/internal/handlers/dashboard.go` (L 15) · `dashboard_test.go` (L 15)

- `dashRanges` 가 `/api/reprocess` 와 같은 어휘라는 가드 — 한쪽만 고치면 두 화면의 범위가 갈라진다.
- `Bucket`/`PreviousBucket`/`LastBucket` 의미 · 단위 하나만 읽는 이유 · Gold 계약 위반 시 첫 행 · `recoverTotal` 불가 조건 · `windowBuckets` 제외 규칙 · `bucketStart` 가 `_bucket` 의 역함수라는 것(ISO 주 연도 포함).
- 테스트 픽스처 배치도와 각 단언이 잡으려는 누출(시간 롤업 · 최신 버킷 아닌 섞임 · 수집 누락 축 · ISO 주 경계).

### `go/internal/handlers/source_contributions.go` (L 9) · `source_contributions_test.go` (L 14)

- 집중도 두 필드 · Gold 에서 읽고 재계산하지 않는 이유 · 4자리 격자 반올림 — 지우면 재계산·생략으로 「단순화」해 1e-17 불일치나 두 번째 답이 생긴다.
- 테스트의 같은 입력 Gold 쌍 가드 · 빈 레이크 · 불일치를 숨기지 않아야 하는 이유.

### `go/internal/handlers/reprocess_trigger.go` (L 14) · `reprocess_trigger_test.go` (L 4)

- 머리(개작) — Pod 의 데이터 마운트가 read-only 라 여기서 레이크를 쓰면 실패한다는 런타임 제약.
- `Note`·`ServingVersion` 필드 의미 · 프로브 캐시 근거 · 메모 없는 결정 거부 · 403 을 그대로 전달하는 이유.
- 테스트: 1초 간격이 API 서버 초 단위 타임스탬프를 흉내 내는 이유 · 결정 로그가 레이크 읽기라 항상 보고된다는 것 · 두 실행의 정렬 기대.

### `python/packages/analysis/src/econ_analysis/llm.py` (L 8 · D 72 · E 1)

- `_LOW_CONFIDENCE` 머리 — fake 분석기와 같은 값이어야 하며 한쪽만 바꾸면 두 분석기의 low_confidence 경계가 갈라진다.
- `_EXTRA_ALIASES` 의 항등 항목 주석 · `_fold` 의 무공백 접기 — 항등 항목을 no-op 으로 지우거나 공백 축약으로 바꾸면 `중동전쟁`·`중동 전쟁`이 두 주제로 갈라진다.
- `MAX_CATEGORIES` 근거 — 상한을 올리면 한 기사가 여러 카테고리 점유율에 중복 계수된다.
- 재사용 행의 `call_id` 3줄 — 원 호출을 가리키게 「고치면」 호출 기록 이전의 캐시 항목이 갈 곳을 잃는다.
- 모듈 docstring 「Operator error is not an analysis outcome」 — 실패를 미분석으로 흡수하면 AC3.4 가 소비하는 데이터 품질 신호가 장애로 오염된다.
- `canonical_subject`(전체 이름 일치만) · `canonical_categories`(`None` 과 빈 목록) · `AnalysisStats` 필드 의미 · `_error_detail`(키 비노출) · `http_completer`(GPT-5.x temperature 400 · 키를 생성 시점에 요구 · 오프라인 미검증) · `analyze_llm`(여기서 잡지 않는 이유) · `reply_cache_key`(키 구성이 재처리 무효화를 보장) · `_call_record`(실제 전송 문자열) · `_unanalyzed`(`no_call_reason` 범위) · `run_llm_analysis`(캐시·호출 기록 분리 · in/out 파라미터 · 출처 없는 재사용).
- 공개 함수·클래스 요약 1줄 — doc 주석 수준.
- 줄 끝 `# stored reply no longer parses …` — `except: pass` 가 오류를 삼키는 것이 아니라 실호출로 넘어간다는 의도.

### `python/packages/analysis/tests/test_llm.py` (L 5 · D 3 · E 1)

- 판정 거절(122)과 운영 실패(130)를 가르는 주석 · 무본문 항목이 시도가 아님(197) · 통계로만 장애가 보임(209) · 부분 문자열 접기 반례(355) · confidence 연쇄(153 줄 끝).
- 모듈 요약 · `_boom`·`_capture_payload` docstring — 이름만으로는 무엇을 흉내 내는지 드러나지 않는다.

### `python/packages/core/src/econ_core/domain.py` (L 6 · D 9 · E 3) · `silver.py` (D 20)

- `SUBJECT_CATEGORIES` 5줄 — `기타`가 마지막이어야 `OTHER_CATEGORY` 가 맞고, 목록 변경이 과거에는 재처리로만 반영된다.
- `CYCLE_FORMAT` 의 UTC — 형식 문자열만으로는 시간대가 드러나지 않는다.
- `# not a contract` 3 — 이 데이터셋엔 `contracts/` 스키마가 없어 형식을 바꿔도 계약·코드젠·리뷰 게이트 경로를 타지 않는다.
- `body_hash`(정규화하지 않는다) · `parse_cycle`(표기 정확성이 파티션을 정한다) · `grouping_keys`(서빙 `groupingKeys` 와 같아야 함) · `records_of_run`(목록을 저장하지 않는 이유) · `record_decision`(메모 필수 근거)과 공개 함수 요약 — doc 주석 수준 + 각 본문의 사유.

### 작은 테스트 덩어리

- `test_aggregate.py`(L 5) — 정확한 델타가 나오도록 고른 값 · 일/주 경계를 넣은 기간 · 단위 정렬 근거 · 카테고리 이전 행.
- `test_storage.py`(L 3 · D 1) — 늦은 최초 관측 · 수정 본문 · 중단된 이전 실행이라는 픽스처 의도.
- `test_runlog.py`(L 3 · D 1) · `test_serving_version.py`(L 2 · D 1) · `test_aggregation_run_record.py`(L 1 · D 1) — 중단된 실행의 기록 모양 · 결정 전후 서빙 버전 · 메모 없는 결정의 기록 근거, 그리고 모듈 요약.
