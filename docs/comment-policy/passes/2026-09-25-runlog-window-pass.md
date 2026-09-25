# runlog-window-pass — 자매 슬라이스 #130(AC4.1 배치 실행 기록)이 연 판정 표면 67줄 전량 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `92e408f`(#132 착지 tip = main, 감지 시점과 같다).
직전 패스([dash-rebuild-pass](2026-09-24-dash-rebuild-pass.md))가 말미에 「열린 PR 과 겹치는 26 — #130 이 … 동시에 고친다.
먼저 손대면 리베이스 비용만 든다」로 **스스로 해제 조건을 적어 유예**해 둔 자리다. #130 이 2026-09-25 13:17:18Z 에 머지돼
그 조건이 충족됐고, 같은 창이 판정된 적 없는 주석을 새로 들였다. 추적 task는 `rct_20260925-0001`
(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **판정 표면 67줄 중 제거 42 / 유지 25** — 판단 분기 3. 레포 전체 지문은 `2603 → 2561`
(파일 `145 → 143` — `debug_test.go`·`ingestion/cli.py` 가 남음 0 이 되어 지문에서 빠진다).
편집 전 `e39db35c68f7…`, 편집 후 `a2d3714654df…`. **주석 외 한 바이트도 바뀌지 않았다** — 편집한 10파일 전부
주석 줄을 걷어낸 나머지의 sha256 이 편집 전후 동일하다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

직전 판정 지점은 `9a37d04`(#129, dash-rebuild-pass 의 기준 트리)다. 그 지점에서 versionScript 를 재실행해 baseline
`lines=2601 files=140` / `c190df879f5a…` 를 **바이트 재현**했으므로 창은 정확히 `9a37d04..92e408f` **2커밋**이다.
그 둘은 성격이 다르다 — `92e408f`(#132)는 **내 직전 산출**(dash-rebuild-pass 자신)이라 소진된 트리거지만,
`9ebc095`(#130)는 **자매 모델 `tbm_econ-opinion-monitor-docs-impl` 의 reconcile 산출**이고 주석 정책 패스가 본 적 없는 줄을 들였다.
창을 한 덩어리로 「내 산출」로 읽어 닫으면 그 줄들이 영구 미탐지가 된다.

**#130 의 유입량은 43줄이다(48 이 아니다).** diff 의 추가 주석 줄 gross 는 48 인데 같은 창이 5줄을 지웠으므로 net `+43`,
11파일이고 그중 **5파일이 지문에 신규 진입**했다(`140 → 145`). 지문 값으로 검산: `9a37d04` 2601 → `9ebc095` 2644 → `92e408f` 2603
(`2644 − 41` = dash-rebuild-pass 의 델타).

이 패스의 판정 표면은 **#130 이 들인 43줄 + 원장이 그 PR 착지를 조건으로 유예한 24줄 + 그 파일들의 미판정 잔량**을 합친 묶음이다.
한 PR 로 자른 이유는 **복원 경로 ③(PR 본문)이 하나로 모이기 때문**이다 — 아래 13파일의 판정 표면은 전부 PR #130 본문이 원본 후보다.

| 파일 | 행(직전 판정) | 9a37d04 | 92e408f | 판정 표면 | 유래 |
|---|---:|---:|---:|---:|---|
| `deploy/batch/workflow-template.yaml` | 60(reprocess-trigger-pass) | 60 | 70 | 10 | #130 단독 |
| `go/internal/handlers/debug.go` | 없음 | 9 | 10 | 10 | #126 신설 · #130 +1 |
| `go/internal/handlers/debug_test.go` | 없음 | 3 | 5 | 5 | #126 신설 · #130 +2 |
| `python/packages/core/src/econ_core/runlog.py` | 없음 | 0 | 5 | 5 | #130 신설 |
| `python/packages/core/tests/test_runlog.py` | 없음 | 0 | 4 | 4 | #130 신설 |
| `python/packages/analysis/tests/test_analysis_run_record.py` | 없음 | 0 | 5 | 5 | #130 신설 |
| `python/packages/aggregation/tests/test_aggregation_run_record.py` | 없음 | 0 | 2 | 2 | #130 신설 |
| `python/packages/core/src/econ_core/storage.py` | 0(reprocess-python-pass) | 10 | 12 | 12 | #97 창 밖 10 · #130 +2 |
| `python/packages/analysis/src/econ_analysis/cli.py` | 8(reprocess-python-pass) | 8 | 14 | 6 | #130 단독 |
| `python/packages/aggregation/src/econ_aggregation/cli.py` | 3(scenario-spec-pass) | 3 | 6 | 3 | #130 단독 |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | 2(initial-pass) · 실측 0 | 0 | 3 | 3 | #130 단독 |
| `python/packages/core/src/econ_core/domain.py` | 3(initial-pass) | 4 | 4 | 1 | #93(유예 귀속 오류 — 아래) |
| `python/packages/core/tests/test_storage.py` | 3(initial-pass) | 4 | 4 | 1 | 문면 개정(유예 귀속 오류 — 아래) |
| **합** | | | | **67** | |

### 원장의 유예 귀속 두 건이 틀렸다

직전 요약은 유예 26줄을 「#130 이 `debug.go` 9 · `debug_test.go` 3 · `storage.py` 10 · `domain.py` 1 · `test_storage.py` 1 을
고친다」로 적었다. 실측하면 **`domain.py`·`test_storage.py` 는 #130 과 겹치지 않았다** — `git diff 9a37d04 9ebc095` 의 그 두 파일
주석 줄 델타가 **0** 이다. #130 이 두 파일에 더한 것은

- `domain.py`: `DS_PIPELINE_RUN = "pipeline_run"  # silver  -> models.PipelineRun (…)` — **줄 끝 주석**
- `test_storage.py`: 새 테스트 `test_write_object_revises_where_put_object_refuses` 의 **docstring**

이고, 둘 다 정책이 「알려진 사각지대」로 적어 둔 표면(줄 끝 주석 · docstring 본문)이라 지문이 보지 못한다.
즉 그 두 자리는 **처음부터 자유롭게 판정할 수 있었다.** 이 패스가 함께 닫고 두 행과 직전 패스 문서에 해소 표기를 남겼다
(기록은 지우지 않았다). 교훈: 지문의 사각지대는 잔여 계수만 왜곡하는 것이 아니라 **유예의 귀속을 틀리게 만든다.**

## 복원처 — 무엇이 어디서 복원되는가

PR #130 본문이 이 패스의 주된 ③ 이다. 특히 다음 세 절이 축자 원본이다.

1. **「실행 ID 전파는 env.」** — 「`--run-id` → `$ECON_RUN_ID` → 자체 생성. `deploy/batch/workflow-template.yaml` 의 각 컨테이너에
   `ECON_RUN_ID: "{{workflow.name}}"` 을 심어 **세 스텝이 한 실행 레코드에 접히고**, 스케줄 밖 단독 실행은 자기 실행 ID 를 만든다.」
   → `workflow-template.yaml` 사본 5벌의 원본.
2. **「결과별 건수 합 = 입력 건수」는 코드 불변식이다.** — 「테스트가 아니라 `runlog._stage_record()` 가 어긋나면 예외를 던진다.
   중단된 실행은 미처리분이 `not_reached` 로 적혀 **회계가 닫힌 채** 중단 지점을 말한다.」
   → 세 CLI 의 버킷 분할 주석 12줄의 원본.
3. **「`LakeStore.write_object` 를 새로 더했다」** — 「(교체 허용·원자적 rename). 기존 `put_object` 의 「기존 키 거부」는
   `bronze/news_body` 의 불변성(AC1.7)이 걸린 설계라 그대로 두었다.」 → `storage.py` 원자적 쓰기 주석 4줄의 원본.

경로 ① 이 특히 강한 자리가 많다 — 제거 42줄 중 **31줄은 바로 아래(또는 같은 함수 안) 선언·단언·문자열 리터럴이 같은 문장을 축자로 적는다.**

## 제거 42줄 — 파일별 근거

### `deploy/batch/workflow-template.yaml` 70 → 60 (제거 10)

`ECON_RUN_ID` 앞 2줄 주석의 **바이트 동일 사본 5벌**(`ingest`·`analyze`·`aggregate`·`reprocess`·`publish` 컨테이너).
한 파일 안에 같은 문장이 다섯 번 있으면 넷은 정의상 사본이다.

- 「every stage of one Workflow shares this run id」 → 바로 아래 `value: "{{workflow.name}}"` 이 **다섯 자리에서 같은 값**인 것이 복원(①).
- 「so the three Pods fold their stage records into one run record on the data volume」 → 이 설명의 주인은
  `econ_core/runlog.py` 의 `ENV_RUN_ID` `#:` doc 주석이다(정책 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」). 그 주인은 유지했다.
- PR #130 본문 1항이 축자 복원(③).

### `go/internal/handlers/debug.go` 10 → 2 (제거 8)

`debugResponse` doc 의 **두 번째 문단 전체**. 이 문단은 AC 부기라 **이미 한 번 낡아 #130 이 「now land」로 고쳐 써야 했다** —
정책의 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다」가 정면으로 걸린다.

- 「Batch run records now land in the lake (silver/pipeline_run, AC4.1), but the call records and the record -> run -> call links … are
  AC4.2-AC4.3 and are still missing」 → 바로 아래 `Stub` 필드의 문자열 리터럴
  「호출 기록과 레코드↔실행↔호출 연결(PRD-4 AC4.2~4.3) 구현 전」이 축자로 말한다(①).
- 「keeps answering with an explicit stub marker and empty collections rather than a half-built walk」 →
  `Stub`·`Available: false`·`Runs: []any{}`·`Calls: []any{}` 가 복원(①).
- 「Missing names exactly what is still absent so the placeholder can say it plainly」 → 필드 이름 `Missing` 의 재진술(①, 선언 재진술).
- 「The screen walks one Silver record back to the batch run and the model call that produced it (JRN-judgment-debug)」 →
  여정 문서와 PRD-4 가 복원(②).

### `go/internal/handlers/debug_test.go` 5 → 0 (제거 5, 전량)

둘 다 **같은 파일 안의** `t.Fatalf` 문면이 축자 원본이라는 점이 결정적이다(①).

- 머리 3줄 → 테스트 이름 `TestDebugIsAnHonestStubUntilRunAndCallRecordsExist` 와
  「debug must declare itself a stub」·「debug must not fabricate records」.
- `got.Missing` 순회 앞 2줄 → 바로 아래 「run_record exists since AC4.1 — missing must not still claim it」.

### 세 CLI 의 버킷 분할 주석 12줄 (제거 12)

`ingestion/cli.py` 3 → 0 · `analysis/cli.py` 14 → 8(제거 6) · `aggregation/cli.py` 6 → 3(제거 3).
공통 근거: **분할을 말하는 문장의 아래에 그 분할이 산술로 적혀 있고, 「합 = 입력」은 주석이 아니라 코드가 강제한다.**

- `ingestion`: 「the two buckets partition what the sources handed us … named in source_failures instead」 →
  `stage.input_count = len(items) + stats.duplicates` · `count("collected", …)` · `count("duplicate_skipped", …)` · `source_failed(…)` 네 줄.
- `aggregation`: 「either the one Gold serves … or a version that row supersedes」 →
  `count("served", len(chosen))` · `count("superseded", len(all_silver) - len(chosen))`.
- `analysis`: 「the buckets below partition it, so their sum is this number」 → `selected` 정의와 아래 버킷 호출들.
- 세 자리 모두 PR #130 본문 2항이 축자(③)이고, 불변식 위반은 `runlog._stage_record()` 가 예외로 끊는다(①).
- `trigger` 앞 2자리(`analysis` 2줄 · `aggregation` 1줄)는 바로 아래 `runlog.REPROCESS if … else runlog.SCHEDULED` 가 대응을
  그대로 적고, STP-publish·JRN-logic-backfill 이라는 이름은 여정 문서가 복원한다(①②).
- `analysis` 의 「booked as not_reached」 2줄은 `runlog.NOT_REACHED` 의 `#:` doc 이 **설명의 주인**이라 그쪽만 남겼다.

### `python/packages/core/src/econ_core/storage.py` 12 → 8 (제거 4)

**선례 적용이다.** reprocess-python-pass 가 같은 파일 `write_records` 머리의 바이트 동등 문면
(「대상 옆에 쓰고 이름을 바꿔 넣는다 …」)을 `staging = …tmp` + `os.replace` 가 메커니즘의 주인(①)·doc-tracker 슬라이스 9·10(②)·
PR #97(③)이라는 근거로 이미 전량 제거했다. 같은 근거가 같은 파일의 나머지 두 자리에 그대로 선다.

- `os.link` 앞 2줄 → 바로 위 `if target.exists(): return False` 와 바로 아래 `except FileExistsError: return False` 가 동작을
  적고(①), 불변성 계약은 AC1.7 과 PR #130 본문 3항이(②③).
- `os.replace` 앞 2줄 → 바로 아래 `os.replace(staging, target)` (①) · PR #130 본문 「교체 허용·원자적 rename」(③).

### 테스트 3줄 (제거 3)

- `test_runlog.py` 「One file per run — the run id is the object key」 → `write_object(..., "run_id", ...)` 호출과 바로 아래
  `read_runs` 단언(①) · PR #130 본문 「저장은 run_id 키 object 데이터셋」(③).
- `test_analysis_run_record.py` 「Aggregation never ran, and the record shows that by having no entry for it」 →
  바로 아래 단언이 그대로 말하고(①), 같은 명제를 `test_runlog.py` 가 단위 테스트 쪽에서 이미 적어 **주인을 그쪽에 두었다**.
- `test_aggregation_run_record.py` 「each stage's output is the next one's input」 → 바로 아래 두 단언이 축자(①).

## 유지 25줄

### `python/packages/core/src/econ_core/runlog.py` 5 → 5 (제거 0)

세 자리 모두 정책이 유지 대상으로 못박은 **`#:` 모듈 속성 doc 주석**이고, 이 패스의 제거분과 짝을 이룬다.

- `ENV_RUN_ID` 3줄 — `workflow-template.yaml` 사본 5벌을 걷어낸 뒤 **이 설명의 유일한 주인**. 실행 ID 를 Workflow 파라미터가 아니라
  env 로 옮긴 근거(세 파드가 서로 말하지 않고 한 실행 레코드에 접힌다)는 이름 `ENV_RUN_ID` 가 복원하지 않는다.
- `NOT_REACHED` 1줄 — `analysis/cli.py`·`test_runlog.py` 제거분의 주인.
- 「Stage names, in pipeline order」 1줄 — `domain.py` 의 「상수 묶음 표지」와 같은 성격이라 **그 선례대로** 유지.

### 그 밖의 유지

- `storage.py` 8줄 — `PARTITION_FILE`·`OBJECT_PARTITION_CHARS` 의 `#:` doc 4줄. 후자는 「키 문자수 변경은 순수 재배치이나
  **전 객체를 옮겨야 하고 Go 리더가 같은 값을 공유**한다」는 비자명한 데이터 계약이라 복원 불가다.
- `debug.go` 2줄 — 이름으로 시작하는 doc lede(판단 분기, 아래).
- `test_*` 유지 9줄 — 전부 「테스트가 왜 그 모양으로 단언하는지」다(not_reached 회계가 왜 합을 닫는지, 캐시 재사용 테스트가 왜 행을
  settled 에서 먼저 빼는지, `--memo` 없는 publish 거부가 왜 rc=2 인지, 중단된 실행에 뒤 단계 기록이 없다는 명제).
- `domain.py` 4 · `test_storage.py` 4 — 기존 행의 판정(상수 묶음 표지 · AC1.7 테스트 의도)이 그대로 유효하고, 늘어난 1줄씩도 같은 성격이다.

## 판단이 갈려 남긴 것

1. **`debug.go` doc lede 1줄** — 「debugResponse is the stub the judgment-debug screen reads until the lake carries the records it is
   built on」. `debugResponse` 는 **미export** 라 정책의 「export 식별자의 이름으로 시작하는 1줄 doc」 면제 대상이 아니고,
   「스텁이다」는 `Stub` 리터럴이 복원한다. 그러나 타입 이름 자체는 그 사실을 말하지 않고, 지우면 타입 선언에 doc 이 0 이 된다.
   비용이 비대칭이라 유지 쪽으로 닫았다. 다음 패스의 첫 후보다.
2. **`storage.py` 두 마이그레이션의 「전부 착지한 뒤에 rename」 4줄** — `legacy.replace(...)` 가 루프 **뒤에** 있다는 사실은 ① 이
   복원하지만, 「그래서 중단된 실행이 같은 파일에서 재개된다」는 재개 계약의 근거는 이 두 자리뿐이다. 유지.

## 검증

전부 로컬 실측(ruff 는 `python/uv.lock` 핀 **0.15.18** 로 맞췄다).

- **지문**: 편집 전 `lines=2603 files=145` / `e39db35c…` → 편집 후 `lines=2561 files=143` / `a2d37146…`. 델타 **−42 / −2파일**.
- **주석 외 무변경**: 편집한 10파일 각각, 주석 줄을 걷어낸 나머지의 sha256 이 편집 전후 **동일**하다
  (`workflow-template.yaml` `d3ae46dc8f943e85` · `debug.go` `772ca90269f3ec3d` · `debug_test.go` `3045f408f069f13c` ·
  `aggregation/cli.py` `b24a2ae13293b4cc` · `test_aggregation_run_record.py` `f4dac649f71380fc` ·
  `analysis/cli.py` `e0556e4eddde5023` · `test_analysis_run_record.py` `ca1ab170a8128a1b` · `storage.py` `8abf9047abceb20e` ·
  `test_runlog.py` `bb92f82dc54cedde` · `ingestion/cli.py` `7ede2e65b0aa020e`).
- **독립 재계수**: 원장 147행을 파싱해 tip 실측과 대조 — 잔여 112 → **88**(⑴ 2파일 41 + ⑵ 10파일 47).
  검산 `112 + 43 − 65 = 88`(65 는 판정한 67 중 `ingestion/cli.py` 의 행 남음 2·실측 0 차이 2를 뺀 값).
- `ruff check .` · `ruff format --check .` rc=0(39파일) · `gofmt -l go` 무출력 · `go vet ./...` rc=0 · `go test ./...` 전부 ok.
- `pytest` **150 passed** — #130 착지 시점과 같은 수(주석만 지웠으므로 수집·통과가 움직이지 않는다).
- `python3 scripts/check-journey-mockup.py .` PASS(여정 7 · 링크 195건) · `node scripts/check-journey-flow.js .` PASS(710 passed, 0 failed) ·
  `python3 scripts/check-mockup-render.py .` PASS(규칙 3·4·5). 이 패스는 `web/src` 를 건드리지 않으므로
  `check-mockup-render.py` 의 `markers()` 가 읽는 `CMP-*`/`PAT-*` 모집단이 움직이지 않는다.
- `python3 tests/e2e/check_scenario_mapping.py .` rc=0 — 규칙 1~6 위반 0.
- `kustomize build --load-restrictor LoadRestrictionsNone deploy/overlays/preview` → CronWorkflow **0** · WorkflowTemplate **1** ·
  `name: ECON_RUN_ID` **5** (prod 오버레이도 build OK · CronWorkflow 2). 주석 5벌을 지워도 env 5자리는 그대로다.
- `python3 scripts/check-data-format-change.py <base> <head>` → **`format_changed=false`**. 이 패스가 건드린 10파일 중
  `SENSITIVE_PATHS`(5항) 에 걸리는 것이 없고, `PRODUCER_GLOBS` 에 걸리는 세 CLI 는 내용 규칙이 `COMMENT_LINE`(`^\s*(#|//)`)로
  주석 줄을 먼저 제외한다(게이트 소스 `:67` 「주석 줄은 형식을 바꾸지 않는다」). 즉 `review/manual-approval` 이 자동으로 붙는다.
- `make e2e`(kind)는 클러스터가 필요해 로컬에서 돌리지 않았다 — CI 의 `e2e` 잡이 판정한다. 이 패스는 `tests/e2e/` 를 건드리지 않는다.
  `make test-web`(vitest)·`eslint` 도 돌리지 않았다 — `web/` 무접촉.

## 원장 반영

- 「패스 이력」에 `2026-09-25 | runlog-window-pass | 92e408f | 2603 | 42 | 2561 | 145 → 143` 한 행.
- 「파일별 원장」에 **신규 6행**(`debug.go`·`debug_test.go`·`runlog.py`·`test_runlog.py`·`test_analysis_run_record.py`·
  `test_aggregation_run_record.py`) + **갱신 7행**(`workflow-template.yaml`·`analysis/cli.py`·`aggregation/cli.py`·
  `ingestion/cli.py`·`storage.py`·`domain.py`·`test_storage.py`). 표는 141행 → **147행**.
- 말미 요약을 통째로 갈았다 — 직전 요약의 「잔여 112 / 열린 PR 과 겹치는 26 / 착지 시점 열린 PR 2」가 모두 낡았다.
  새 값은 잔여 **88**(⑴ 2파일 41 + ⑵ 10파일 47), 무인 패스의 다음 선 **75줄**, 열린 PR **1**(#131).
- `domain.py`·`test_storage.py` 두 행과 [dash-rebuild-pass](2026-09-24-dash-rebuild-pass.md) 문서의 유예 절에
  **해소·귀속 정정 표기**를 덧붙였다(기록은 지우지 않았다).

## 범위 밖 (다음 패스로)

잔여 88줄 중 이 패스가 보지 않은 것.

- **사람 몫 11** — `scripts/check-data-format-change.py`. `main` ruleset 이 `review/manual-approval` 을 필수 status 로 요구하고,
  그 status 는 이 스크립트가 `format_changed=false` 일 때만 붙는데 `SENSITIVE_PATHS`(`:48`)에 스크립트 자신이 있다.
- **열린 PR 과 겹치는 2** — #131(`ci/e2e-critical-path`)이 `tests/e2e/run.sh` 2 를 고친다(PR files 3건 전수 확인).
- **무인 패스의 다음 선 75** — 1순위는 `scripts/journey-scenarios/JRN-judgment-debug.js` 30(#124·#126·#128 이 세운 여정 하네스,
  행 없음 — 직전 요약이 지목한 표적이 그대로 남았다). 그 다음 `check-journey-mockup.py` 12(#129) ·
  `Trace.tsx`/`Trace.test.tsx` 16(#126·#128) 묶음 · `tokens.css` 6(#128) · `test_cli.py` 4 · `store.go` 3 · `Sidebar.tsx` 2 ·
  `test_llm.py`·`test_silver.py` 각 1.
- **잔여에 들어가지 않는 재판정 후보** — `batch-pvc.yaml` 머리 7(#127 로 사람 몫 사유 해소) · `handlers.go` 233 ·
  `handlers_test.go` 112 · `ac3-8` 25 · `Dashboard.test.tsx` 6(넷 다 감소라 계수 밖) ·
  `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터(dash-brief-pass 판단 분기) ·
  `test_feeds.py`·`test_aggregate.py`·`test_llm.py` 의 인라인 AC 태그.
- **지문 표면 확장 후보** — 이 패스가 실측한 유예 귀속 오류는 **줄 끝 주석·docstring 본문이 지문에 없어서** 생겼다.
  정책이 「알려진 사각지대」로 적어 둔 그 두 표면을 지문에 더하는 것은 모델 정의가 「다음 task 에서 다룬다」로 열어 둔 자리다.
