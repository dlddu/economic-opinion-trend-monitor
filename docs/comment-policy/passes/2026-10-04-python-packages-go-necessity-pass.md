# 2026-10-04 python-packages-go-necessity-pass — Python 패키지 전체 · Go 잔여 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261004-0001`.

## 판정 범위

L·D·E 표의 `—` 행 중 `python/` 아래 전부(`packages/` 네 패키지 + `pyproject.toml`)와 Go 잔여 3파일
(`go/cmd/serving/main.go`·`go/internal/static/static.go`·`go/internal/store/store_test.go`)을 묶었다.
각 파일이 한 덩어리다. 이로써 `python/`·`go/` 에 `—` 행이 남지 않는다.
**판정 전 364줄(L 72 · D 281 · E 11) → 225줄(L 58 · D 163 · E 4), 제거 139.**

예산 400줄에서 36줄이 남는다. 남은 `—` 덩어리는 `contracts/codegen.py`(생성기 — 사람 게이트 경로)와
`scripts/check-data-format-change.py`(형식 판정기 자신 — 사람 게이트 경로), `.github/workflows/**`, 그리고 다른
디렉터리(`web/src`·`scripts/journey-scenarios`·`deploy/`)라 이 슬라이스의 무인 경로·툴체인과 섞지 않았다.

E 의 `python/packages/ingestion/tests/test_default_feeds.py` 행은 0줄이 되어 지웠다.
코드 변경 0 — Python 14파일은 docstring 을 걷은 `ast.dump` 가 base 와 같고, Go diff 는 주석 줄뿐이다(`gofmt -l` 빈 출력).

doc 주석 수준(모듈·공개 함수·공개 클래스 요약 1줄)은 그대로 두었다. 이번에 걷은 것은 그 수준을 넘는 본문과
비공개 함수의 docstring, 그리고 테스트 이름을 되풀이하는 테스트 docstring 이다.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---|---|---:|
| `go/cmd/serving/main.go` | L 4 | L 4 | 0 |
| `go/internal/static/static.go` | L 6 | L 2 | 4 |
| `go/internal/store/store_test.go` | L 2 | L 2 | 0 |
| `python/packages/aggregation/src/econ_aggregation/__init__.py` | D 1 | D 1 | 0 |
| `python/packages/aggregation/src/econ_aggregation/__main__.py` | D 1 | D 1 | 0 |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` | L 12 · D 16 | L 8 · D 16 | 4 |
| `python/packages/aggregation/src/econ_aggregation/cli.py` | L 3 · D 3 | L 3 · D 3 | 0 |
| `python/packages/aggregation/src/econ_aggregation/contributions.py` | D 9 | D 9 | 0 |
| `python/packages/aggregation/tests/test_source_contributions.py` | D 12 | D 12 | 0 |
| `python/packages/analysis/src/econ_analysis/__init__.py` | D 1 | D 1 | 0 |
| `python/packages/analysis/src/econ_analysis/cli.py` | L 7 · D 37 | L 7 · D 26 | 11 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | L 2 · D 12 | L 2 · D 3 | 9 |
| `python/packages/analysis/tests/test_analysis_run_record.py` | L 2 · D 1 | L 2 · D 1 | 0 |
| `python/packages/analysis/tests/test_cli.py` | L 5 · D 14 | L 5 · D 6 | 8 |
| `python/packages/analysis/tests/test_llm_call_record.py` | D 9 · E 1 | D 2 · E 1 | 7 |
| `python/packages/analysis/tests/test_record_run_call_link.py` | D 4 | D 1 | 3 |
| `python/packages/core/src/econ_core/__init__.py` | D 1 | D 1 | 0 |
| `python/packages/core/src/econ_core/calllog.py` | D 15 | D 15 | 0 |
| `python/packages/core/src/econ_core/runlog.py` | L 5 · D 9 | L 4 · D 9 | 1 |
| `python/packages/core/src/econ_core/storage.py` | L 8 · D 25 | L 7 · D 22 | 4 |
| `python/packages/core/tests/test_silver.py` | L 8 · D 1 · E 1 | L 7 · D 1 · E 1 | 1 |
| `python/packages/ingestion/src/econ_ingestion/__init__.py` | D 1 | D 1 | 0 |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | D 14 | D 3 | 11 |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` | L 1 · D 63 · E 1 | L 1 · D 20 · E 1 | 43 |
| `python/packages/ingestion/src/econ_ingestion/sources.py` | L 3 · D 17 · E 7 | L 1 · D 5 · E 1 | 20 |
| `python/packages/ingestion/tests/test_default_feeds.py` | L 1 · D 6 · E 1 | L 1 · D 1 · E 0 | 6 |
| `python/packages/ingestion/tests/test_feeds.py` | L 2 · D 7 | L 1 · D 1 | 7 |
| `python/packages/ingestion/tests/test_ingestion_run_record.py` | D 2 | D 2 | 0 |
| `python/pyproject.toml` | L 1 | L 1 | 0 |

## 제거 유형

| 유형 | 자리 |
|---|---|
| PRD AC·계약 재진술 | `feeds.py`·`sources.py`·`test_feeds.py` 모듈 본문, `collect_feed`·`collect_source`·`parse_feed` 본문, `fake_llm.analyze` 본문 |
| 코드·argparse 재진술 | 두 CLI 모듈의 「두 수집원/분석기」 문단, `load_feed_configs` 스키마, 비공개 `_localname`·`_first_text`·`_find_link`·`_fetch_with_retry`, `FakeArticle`·`FakeSource` 필드 줄 끝, `storage.py` 모듈 본문, `PARTITION_FILE`·「Stage names」 `#:` |
| 다른 주석의 사본 | `aggregate.py` 의 버킷 키 사전식 3줄(주인 `_bucket`) · 분석 CLI 의 「Two guards, two exit codes」(주인 `#:` 두 줄) · `fake_llm.py` 의 `keyword_analyzer` 문단(주인 `#:`) · `sources.run_ingestion` 의 주기 간 중복 제거(주인 `run_feed_ingestion`) |
| 테스트 이름 재진술 | `test_cli.py` 6 · `test_llm_call_record.py` 7 · `test_record_run_call_link.py` 3 |
| 저장소 문서 재진술 | 수집 CLI 의 스케줄 배선 문단(`deploy/batch/cronworkflow-ingestion.yaml` 머리가 주인) · `static.go` 패키지 본문 |
| 작업 흔적·소감 | 「Feed cutover tests — the CLI now defaults …」 · 「Subjects mirror the dashboard mockup」 · 여정 표지(`STP-run-reprocess`·`JRN-logic-backfill §4`) |
| 즉시 붉는 단언이 지키는 명제 | `sources.py` 의 `kr-biz` 중복 기사 표지(`test_failure_isolation_and_dedup` 의 `duplicates >= 1`) |

## 틀린 주석 고침

- `python/packages/analysis/tests/test_cli.py` 모듈 docstring — 「``LocalFsStore.write_records`` *replaces* the Silver dataset」.
  Silver 분석은 이제 `silver.store_analyses` → `write_partition` 으로 **파티션 단위로** 교체된다. 「A Silver write *replaces*
  each partition it covers」로 고쳤다(모델에 닿지 못한 실행이 쓰면 안 되는 이유는 그대로 선다).
- `python/packages/ingestion/src/econ_ingestion/sources.py` 모듈 docstring 「A real implementation would call news APIs」는
  `feeds.py` 가 실수집을 맡은 뒤로 낡았다. 본문째 걷었다.
- `python/packages/ingestion/src/econ_ingestion/cli.py` 모듈 docstring 의 주기 멱등 명제는 사유가 있어 개작했다 —
  스케줄 배선 서술은 걷고, 「스케줄이 늦은·놓친 틱을 같은 주기로 다시 돌리므로 파티션 교체를 지켜야 한다」만 남겼다.

## 유지 목록 (필요 사유)

- `go/cmd/serving/main.go` — L: 패키지(Command) 주석 2줄 — doc 주석 수준 · 프로브 경로를 access log 에서 빼는 이유 2줄(지우면 필터를 군더더기로 보고 걷어 로그가 프로브로 덮인다).
- `go/internal/static/static.go` — L: 패키지 주석 첫 줄 · `Handler` 1줄 doc — doc 주석 수준.
- `go/internal/store/store_test.go` — L: null 감정이 디코드 실패가 아니라 값이라는 근거 2줄(AC2.5 저신뢰 분리 — 지우면 null 을 오류로 「고치는」 쪽으로 판단한다).
- `python/packages/aggregation/src/econ_aggregation/__init__.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/aggregation/src/econ_aggregation/__main__.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/aggregation/src/econ_aggregation/aggregate.py` — L: ISO 주 번호 연도 2줄 · 중첩 dict 형태 표기 3블록(`counts`·`shares`·`history`·`tally`) — 형태를 되짚는 비용 · `shares` 를 먼저 전량 만드는 이유 · 「없는 버킷은 0이 아니다」 / D: 모듈 본문 2문단(첫 버킷 `delta = 0.0` 은 정답이지 자리 표시가 아니다 · `normalized_share` 를 하위 버킷에서 합하지 않는다) · `_bucket` 의 단위 안 사전식=시간순, 단위 사이 불성립(버킷 키 정본) · `bucket_articles` 의 Go `contributions` 미러 포인터 · 공개 함수 요약.
- `python/packages/aggregation/src/econ_aggregation/cli.py` — L: 세 단위를 한 데이터셋에 내는 이유 3줄 — `bucket_unit` 이 계약상 구분자라 독자가 단위를 먼저 정한다 / D: 모듈 요약 · `--decision` 이 포인터 이동이고 롤백이 재분석하지 않는다는 2줄.
- `python/packages/aggregation/src/econ_aggregation/contributions.py` — D: 분해가 두 번째 계산이 아니라 `fold_bucket` 항을 합 이전에 꺼낸다는 모듈 본문(다르게 계산하면 AC3.9 두 합 등식이 잡으려는 조용한 불일치) · 동점 처리 근거.
- `python/packages/aggregation/tests/test_source_contributions.py` — D: 같은 입력으로 두 계산을 돌리는 이유(리터럴이 아니라 일치를 단언) · 픽스처 두 개의 의도(소박한 점유율과 정규화 점유율이 갈리게 · 1/3 이 격자에서 안 나눠져 잔여 분배가 실제로 필요하게).
- `python/packages/analysis/src/econ_analysis/__init__.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/analysis/src/econ_analysis/cli.py` — L: `#:` 종료 코드 2줄(각 코드가 보장하는 것 — 읽기 전 중단 · Silver 무손상) · 시드를 실행 id 로 잡는 이유(재개된 표본이 같은 레코드) · 캐시 병합·호출 기록이 전량 실패 종료보다 앞서야 하는 순서 가드 2 · 전량 실패 배치를 쓰지 않는 이유 2줄 / D: 전체 레이크 실행의 「settled」 정의 문단(시간당 실행이 새 주기에 비례하는 이유 · 실패 호출과 AC4.3 이전 행만 다시 묻는다 · 과거 재분석은 버전 올림이다) · 범위 실행이 기존 버전 **옆에** 쓴다는 것(콘솔 비교·롤백 대상) · 운영 오류가 분석 결과로 위장하지 않는 이유 · `_book_outcomes` 의 분기 순서.
- `python/packages/analysis/src/econ_analysis/fake_llm.py` — L: `#:` `keyword_analyzer` 미호출 사유 2줄 — 사유가 기사가 아니라 분석기의 속성이라는 것(모듈 docstring 의 같은 문단은 사본이라 걷었다) / D: 모듈 요약 · `normalize_subject`·`analyze` 요약 — doc 주석 수준.
- `python/packages/analysis/tests/test_analysis_run_record.py` — L: 두 번째 실행이 캐시로 답하고 파티션을 비워 「settled」 밖으로 미는 이유 2줄 / D: 모듈 요약 — doc 주석 수준.
- `python/packages/analysis/tests/test_cli.py` — L: 무본문 배치에서 가드가 발화하면 안 되는 이유 · 다음 주기가 같은 기사를 다시 관측한다는 시나리오 · 서빙 버전과 코드 기본 버전이 갈리는 시나리오 · Bronze 가 주기를 모두 보관해 재순회하면 안 되는 이유 2줄 / D: 모듈 본문(모델에 닿지 못한 실행이 쓰면 안 되는 이유 — **틀린 주석 고침**: 「`write_records` 가 Silver 데이터셋을 교체한다」→ Silver 는 파티션 단위로 교체된다) · `test_whole_lake_run_keeps_the_published_version` 의 「Gold would lose it」.
- `python/packages/analysis/tests/test_llm_call_record.py` — D: 모듈 요약 · `_completer` docstring(제목으로 키잉하고 받은 요청을 그대로 기록한다 — 이름만으로는 바이트 동일 단언의 근거가 드러나지 않는다) / E: `# the reuse sent nothing` — 두 실행 뒤 호출 1회의 근거.
- `python/packages/analysis/tests/test_record_run_call_link.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/core/src/econ_core/__init__.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/core/src/econ_core/calllog.py` — D: `new_call_id` 가 무작위인 이유(같은 프롬프트의 두 호출이 두 기록이어야 한다 — 내용 파생 id 면 `put_object` 가 둘째를 조용히 거부) · `prompt_hash` 의 NUL 구분자 근거 · `calls_of_run` 을 스캔으로 파생하는 이유 · 공개 함수 요약.
- `python/packages/core/src/econ_core/runlog.py` — L: `ENV_RUN_ID` `#:` 3줄(WorkflowTemplate 이 단계마다 같은 값을 준다 — 세 Pod 가 합의하는 경로) · `NOT_REACHED` `#:` / D: 공개 함수·메서드 요약 8 — doc 주석 수준(`_merge_stage` 의 「(a retry)」는 교체하는 이유).
- `python/packages/core/src/econ_core/storage.py` — L: `OBJECT_PARTITION_CHARS` `#:` 3줄(Go 리더가 같은 값을 쓴다 — 한쪽만 바꾸면 읽기가 갈린다) · rename 순서 가드 2×2줄(중단된 실행의 재시도 안전) / D: `write_object` 본문 6줄(`put_object` 와의 경계 — 두 메서드는 데이터셋을 공유하지 않는다) · 공개 메서드 요약.
- `python/packages/core/tests/test_silver.py` — L: `(2, 0)` 이 두 버전을 세는 이유 · 같은 키 1행(재개가 이중 계수하지 않음) · v2 가 남는 이유(서빙 버전) · r2 가 떨어지는 이유(AC2.6 추적 불가) · r2 가 v1 으로 서빙되는 이유 · 결정 없음의 규칙 / D: 모듈 요약 — doc 주석 수준 / E: `os.replace` 면 inode 가 바뀐다 — 단언이 무엇을 가르는가.
- `python/packages/ingestion/src/econ_ingestion/__init__.py` — D: 모듈 요약 — doc 주석 수준.
- `python/packages/ingestion/src/econ_ingestion/cli.py` — D: 모듈 요약 · 주기 멱등 2줄로 개작(스케줄이 늦은·놓친 틱을 같은 주기로 다시 돌리므로 파티션 교체를 지키지 않으면 이중 계수).
- `python/packages/ingestion/src/econ_ingestion/feeds.py` — L: 안정 정렬 1줄 — 조회수 없는 피드의 순위가 피드 순서라는 사실이 이 정렬에만 기대고 있어, 보조 키를 더하면 조용히 깨진다 / D: 공개 클래스·함수 요약 · World Bank 가 RSS/Atom 을 내지 않아 `worldbank-json` 이 있다는 2줄 · `documents` 의 비레코드 `facets` 키와 조회수 부재(정렬 파라미터가 순위) — 외부 API 의 문서화되지 않은 동작 · `_cdata` 의 `{"cdata!": …}` 래퍼 · `run_feed_ingestion` 미러 포인터와 주기 간 중복 제거 위치(`put_object`) / E: 넓은 `except Exception` 의 의도 — transport 가 자기 예외를 던지므로 좁히면 격리 대신 실행이 죽는다.
- `python/packages/ingestion/src/econ_ingestion/sources.py` — L: `_body` 의 마커 1줄 — fake LLM 이 `tone=`·`대상국=` 을 파싱하므로 본문 형식을 바꾸면 두 구현이 갈린다 / D: 모듈·함수·`SourceError` 요약 · `run_ingestion` 의 `run_feed_ingestion` 미러 포인터 1줄(한쪽만 고치면 두 경로의 출력이 갈린다) / E: `available` 1 — `limit` 과 겹쳐 보이는 두 값이 API 상한 경우를 만든다.
- `python/packages/ingestion/tests/test_default_feeds.py` — L: `source_id` 유일성 단언의 이유 1줄 — 수집 통계가 실패·중복을 source 로 키잉한다 / D: 모듈 요약 — doc 주석 수준.
- `python/packages/ingestion/tests/test_feeds.py` — L: `/kr/fx` 가 두 픽스처에 있어 중복 1 이 나온다는 1줄 — 픽스처를 열어야 확인되는 단언 근거 / D: 모듈 요약 — doc 주석 수준.
- `python/packages/ingestion/tests/test_ingestion_run_record.py` — D: 모듈 요약 · `$ECON_RUN_ID` 경로 테스트가 왜 있는가(템플릿이 그 env 로 세 Pod 를 묶는다).
- `python/pyproject.toml` — L: `E501` 무시의 근거 1줄 — 긴 줄이 생성 모델이 옮긴 스키마 doc 에서 온다(고칠 곳은 스키마).

## 번복

- `python/packages/core/src/econ_core/storage.py` 모듈 본문의 dict 경계 3줄은 core-python-docstring-pass 가 「판단이 갈려
  남김」으로 유지했다. 필요성 시험으로는 사유를 못 댄다 — 공개 메서드 시그니처가 `list[dict]`·`dict` 를 적어 경계가
  코드에서 바로 보인다. 옛 패스 문서는 고치지 않는다.
- `python/packages/aggregation/src/econ_aggregation/aggregate.py` 의 「Sentiment ratios are over analyzed items」 줄은
  aggregation-harness-pass 가 「AC3.4 분리 근거」로 유지했다. 바로 아래 `analyzed_denom` 분모가 그 명제를 그대로 적어
  확인에 비용이 들지 않는다.
