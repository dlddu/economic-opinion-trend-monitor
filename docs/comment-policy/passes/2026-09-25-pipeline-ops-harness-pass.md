# pipeline-ops-harness-pass (2026-09-25)

판정 트리 `e92e3cc`(= #135 착지 tip). 판정 표면 **135줄 / 7파일** — #136(`e85bad0`,
`tbm_econ-opinion-monitor-scenario-e2e` `rct_20260925-0001` 의 착지)이 신설한 파일 전량.
**제거 52 · 유지 83 · 판단 분기 4.**

## 이 표면이 왜 지금까지 판정되지 않았나

직전 패스(residual-close-pass, #135)의 **머지 기준 커밋은 `78e32da`** 이고, #136 은 그보다
뒤(`e85bad0`)에 착지했다. `docs/comment-policy/` tree 는 창 안에서 `e92e3cc` 한 번만
움직였고 `e85bad0` 에서는 `ecc5a43c…` 로 **바이트 불변**이다 — 즉 **#136 이 들인 135줄을 본
패스는 존재할 수 없다.** 그런데 원장 말미 요약은 #136 이 없는 트리에서 센 **89** 로 굳어 있어,
원장만 읽는 다음 패스는 이 표면에 도달하지 못한다. 7파일 전부 **행이 없으므로** 원장 규약
(「각 행은 마지막으로 판정한 패스 기준」)상 판정을 미루는 한 영구히 미판정으로 재등장한다.

## 판정 표면을 어떻게 뽑았나 (재현 절차)

원장의 판정 규약(「읽는 법」)을 코드로 옮겨 **원장 148행 vs 라이브 152파일**을 대조했다.

    ⑴ 행이 없는 파일의 전량        10파일 163줄
    ⑵ 행이 있으나 자란 파일의 증가분  3파일  93줄
    합계 잔여                              256줄

이 256 은 원장 말미 선언 **89** 와 산술로 화해한다: `89 + 167(#136 이 들인 gross) = 256`.
이 패스가 집은 것은 그중 **⑴ 의 #136 신규 7파일 135줄**이다.

### `tests/e2e/run.sh` 를 범위에서 뺀 이유 (32줄)

#136 은 `run.sh` 도 73 → 105(**+32**)로 키웠다. 그 파일은 자매 task
`rct_20260925-0003`(같은 모델, `planning`)이 창 `0e38ab1..78e32da` 에서 **+48 을 이미 범위로
못박았다**. 한 파일을 두 슬라이스가 같이 고치면 헝크가 겹쳐 착지 순서가 서로를 막는다. 그래서
`run.sh` 는 통째로 넘기고, 이 패스는 **파일 교집합 0** 인 신규 7파일만 판정한다. `run.sh` 의
+80 중 자매가 덮는 것은 48 이고 **#136 유래 32 는 어느 슬라이스에도 없다** — 아래 「범위 밖」 참조.

## 제거의 복원 경로

| 자리 | 제거 | 복원 경로 | 원본 |
|---|---:|---|---|
| `runlog.ts` 머리 「왜 레이크인가」 | 5 | ① 코드 | `econ_core/runlog.py` docstring 「**Why the lake and not the scheduler.**」 — **주석 자신이 그 파일을 지목한다** |
| `runlog.ts` 타입 JSDoc 4개 | 4 | ① 코드 | `contracts/silver/pipeline_run.avsc` 의 `doc` + `feeds.py` |
| `spec` 머리 「관측 대상은 …」 | 10 | ①② | `econ_core/runlog.py`(주석이 지목) · 테스트 문서 실행 단계 (3)·기대 결과 축자 |
| `spec` 머리 「두 실행을 가르는 …」 | 5 | ① 코드 | 네 매니페스트의 `ECON_RUN_ID` 값 · `deploy/batch/workflow-template.yaml` 의 `{{workflow.name}}` · `analyze-job-ops-stopped.yaml` 의 `econ-llm-absent.invalid` |
| `spec` 머리 「맞물림이 첫 실행에만 …」 | 5 | ② 문서 | **주석이 스스로 「시나리오 문면 그대로다」라고 적는다**; 같은 관계를 `:164-165` 단정 머리가 소유 |
| `spec` 인라인 「실행 단계 (3)의 기대 결과」 | 2 | ①② | 바로 위 테스트 이름이 같은 말을 한다 · 기대 결과 축자 |
| `ingest-job-ops.yaml` 기대값 판독 지침 | 3 | 재진술 | `ingest-job-faults.yaml:14-16` 과 **첫 줄 바이트 동일** — 원장이 그 파일을 이 지침의 주인으로 이미 적었다 |
| `ingest-job-ops-2.yaml` 사전 조건·건수 | 6 | ② + 가드 | 사전 조건·기대 결과 축자 + **건수 열거**(「열 건」·「새 기사 네 건」)는 README 가드 조항 위반 |
| `analyze-job-ops.yaml` 「성공해야 …」 | 4 | ①② | 기대 결과 축자 · `run.sh` 가드 · 파일 이름이 복원 |
| `analyze-job-ops-stopped.yaml` 「집계 Job 은 없다」 | 4 | ② | 기대 결과 축자; spec 의 「부재가 관측 대상이다」가 단정과 함께 소유 |
| `aggregate-job-ops.yaml` 「모킹 지점이 없다 …」 | 4 | 재진술 + ② | `aggregate-job.yaml` 이 「부재의 근거」의 주인(윗줄이 그 파일을 지목) · 기대 결과 축자 |

`e2e-runner-pass`·`scenario-spec-pass`·`batch-harness-pass` 가 세운 유형을 그대로 따른다 —
**주인 지목 포인터는 남기고 되풀이만 걷는다**(`ingest-job-cycle2.yaml` 선례).

## 판단이 갈려 남긴 것 (4)

- **`analyze-job-ops-stopped.yaml` 머리 2줄** — 「시나리오의 실행 단계 (2)는 「…」다」는 ② 인용이지만,
  같은 줄이 「바꾸는 것은 **상류 주소 한 칸**뿐이다」로 이어지고 그 뒤가 RFC 2606 예약 TLD 라는
  복원 불가 지식이다. 줄 단위로 끊으면 근거까지 잘린다(`ingest-job.yaml` 선례).
- **`runlog.ts` export 함수 JSDoc 7줄** — 정책이 「export 함수의 JSDoc 요약 1줄은 유지」로 명시한
  범주다. `outcomeTotal` 의 「AC4.1 이 `input_count` 와 같기를 요구하는 값이다」는 avsc 와 겹치지만
  같은 한 줄의 앞 절(요약)과 끊기지 않는다.
- **`spec` 의 `DOWN_SOURCE` JSDoc 1줄** — 「더블의 `/__fail__/`」가 `ingest-job-ops.yaml:10-12` 와
  겹치나, 그 파일은 이 소스에 대해 **주인 지목을 하지 않는다**(제거의 전제가 서지 않는다).
- **`ingest-job-ops-2.yaml` 기대값 1줄** — 「성공(completed)이 기대값」은 `ingest-job-faults.yaml` 의
  재진술이지만 뒤 절(「중단되는 것은 수집이 아니라 다음 단계다」)이 이 파일 고유의 경계다.

## 게이트가 주석을 읽는 자리 (보존 확인)

- `tests/e2e/check_scenario_mapping.py` 는 spec 머리의 **`// 검증 시나리오:` 한 줄**을 파싱한다.
  그 줄은 모델 정의의 DIRECTIVE(지문·판정 양쪽에서 제외)이고 이 패스는 건드리지 않았다.
- `mock-exception:` 줄 5개(FEED-21~24 · LLM-09~10)도 DIRECTIVE라 무접촉이다.
- 네 게이트를 편집 후 실제로 굴렸다(아래).

## 범위 밖 (후속)

- **`tests/e2e/run.sh` +80** — 48 은 자매 `rct_20260925-0003` 의 범위, **#136 유래 32 는 어느
  슬라이스에도 없다.** 자매가 착지한 뒤 재감지가 나머지를 연다.
- **`scripts/check-data-format-change.py` 11줄** — `SENSITIVE_PATHS` 에 판정기 자신이 있어 주석만
  고쳐도 필수 status `review/manual-approval` 이 붙지 않는다(**사람 몫**).
- **`tests/e2e/playwright-setup.sh` 9 · `test_llm_call_record.py` 8 · `llm.py` +7 · `cli.py` +6** —
  자매 `rct_20260925-0003` 이 창 `0e38ab1..78e32da` 에서 범위로 못박은 몫이다.
- **지문의 사각지대** — Python docstring 본문·줄 끝 주석은 `versionScript` 가 보지 않는다.
  `calllog.py` 66줄이 그 실례이고, 확장은 tobe-modeler 소관이다.

## 검증 (전부 로컬 실측)

| 항목 | 값 |
|---|---|
| 편집 전 지문 | `lines=2766 files=152` / `b34a2298…` (트리거와 바이트 일치) |
| 편집 후 지문 | `lines=2714 files=152` / `ba4fd7fd…` |
| **부모 대비 순 제거** | **52줄** (파일 수 152 불변 — 남음 0 파일 없음) |
| 파일별 | spec 43→21 · `runlog.ts` 21→12 · `analyze-job-ops-stopped` 21→17 · `ingest-job-ops` 19→16 · `ingest-job-ops-2` 14→8 · `analyze-job-ops` 10→6 · `aggregate-job-ops` 7→3 |
| `python3 tests/e2e/check_scenario_mapping.py` | rc=0 (규칙 1~6 위반 없음) |
| `python3 scripts/check-journey-mockup.py .` | rc=0 (링크 200건 — 이 패스 문서 포함) |
| `python3 scripts/check-mockup-render.py .` | rc=0 |
| `node scripts/check-journey-flow.js .` | rc=0 (710 passed, 0 failed) |
| 코드 불변 | 주석 줄만 지웠다 — 비주석 줄 diff **0** |

완료 기준을 절대 지문이 아니라 **부모 대비 순 제거 52줄**로 적는다. base 가 움직여도 판정이
낡지 않게 하기 위해서다.
