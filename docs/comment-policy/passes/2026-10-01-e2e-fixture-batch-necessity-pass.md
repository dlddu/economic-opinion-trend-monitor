# 2026-10-01 e2e-fixture-batch-necessity-pass — e2e 픽스처 · 배치 매니페스트 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261001-0004`.

## 판정 범위

L·D·E 표의 `—` 행 중 `tests/e2e/` 에 남은 두 디렉터리를 묶었다: 배치 하네스 매니페스트
`k8s/batch/*.yaml` 36파일과 상류 더블 픽스처 `fixtures/feeds/`(XML 20 · `server.py`) ·
`fixtures/llm/server.py`. 각 파일이 한 덩어리다. 이로써 `tests/e2e/` 에 `—` 행이 남지 않는다.
**판정 전 338줄(L 287 · D 50 · E 1) → 142줄(L 101 · D 41 · E 0), 제거 196.**

XML 은 게이트가 `<!--` 로 시작하는 줄만 세므로 머리 주석 한 블록이 1줄이다 — 블록 안을 줄여도
그 행의 줄 수는 1 로 남고 지문만 움직인다.

설명의 주인은 다음으로 정했다. 픽스처 파일마다의 역할·건수·관례(`<views>` 감소, 주기별 차이는 다른
파일, 묶음별 데이터 루트, 집계 묶음의 두 상태)는 **`fixtures/feeds/README.md`**, 더블의 프로토콜은
**`fixtures/feeds/server.py`·`fixtures/llm/server.py` 모듈 docstring**, 「실 llm 분석기여야 한다」는
**`k8s/batch/analyze-job.yaml`** 이다. 사본은 걷었고, 남긴 것은 그 파일에서만 어길 수 있는 가드다.

| 파일 (`tests/e2e/` 기준) | 판정 전 | 뒤 | 제거 |
|---|---:|---:|---:|
| `fixtures/feeds/agg_global_desk.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/agg_kr_daily.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/agg_kr_wire.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/agg_kr_wire_skew.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/agg_us_desk.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/analysis_corpus.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/cycle12_main.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/cycle3_main.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/faults_dup.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/faults_flaky.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/faults_ok.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/global_desk.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/kr_wire.rss.xml` | 1 | 0 | 1 |
| `fixtures/feeds/llm_calls_cycle1.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/llm_calls_cycle2.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/record_links_desk_cycle1.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/record_links_desk_cycle2.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/record_links_wire_cycle1.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/record_links_wire_cycle2.rss.xml` | 1 | 1 | 0 |
| `fixtures/feeds/server.py` | 11 (+D 23) | 7 (+D 14) | 13 |
| `fixtures/feeds/us_markets.atom.xml` | 1 | 0 | 1 |
| `fixtures/llm/server.py` | 11 (+D 27 +E 1) | 8 (+D 27 +E 0) | 4 |
| `k8s/batch/aggregate-job-ops.yaml` | 3 | 0 | 3 |
| `k8s/batch/aggregate-job-rollup.yaml` | 10 | 2 | 8 |
| `k8s/batch/aggregate-job-skew.yaml` | 5 | 0 | 5 |
| `k8s/batch/aggregate-job.yaml` | 7 | 2 | 5 |
| `k8s/batch/analyze-job-agg-skew.yaml` | 4 | 2 | 2 |
| `k8s/batch/analyze-job-agg.yaml` | 10 | 2 | 8 |
| `k8s/batch/analyze-job-calls-v2.yaml` | 1 | 0 | 1 |
| `k8s/batch/analyze-job-calls1.yaml` | 3 | 2 | 1 |
| `k8s/batch/analyze-job-calls2.yaml` | 5 | 2 | 3 |
| `k8s/batch/analyze-job-links-v2.yaml` | 3 | 2 | 1 |
| `k8s/batch/analyze-job-links1.yaml` | 4 | 2 | 2 |
| `k8s/batch/analyze-job-links2.yaml` | 4 | 2 | 2 |
| `k8s/batch/analyze-job-ops-stopped.yaml` | 17 | 6 | 11 |
| `k8s/batch/analyze-job-ops.yaml` | 6 | 2 | 4 |
| `k8s/batch/analyze-job-v2.yaml` | 7 | 2 | 5 |
| `k8s/batch/analyze-job.yaml` | 12 | 8 | 4 |
| `k8s/batch/bronze-shell.yaml` | 3 | 1 | 2 |
| `k8s/batch/data-pvc.yaml` | 4 | 3 | 1 |
| `k8s/batch/feed-double.yaml` | 8 | 0 | 8 |
| `k8s/batch/ingest-job-agg-skew.yaml` | 9 | 0 | 9 |
| `k8s/batch/ingest-job-agg.yaml` | 6 | 0 | 6 |
| `k8s/batch/ingest-job-analysis.yaml` | 5 | 0 | 5 |
| `k8s/batch/ingest-job-calls1.yaml` | 1 | 0 | 1 |
| `k8s/batch/ingest-job-calls2.yaml` | 2 | 2 | 0 |
| `k8s/batch/ingest-job-cycle1.yaml` | 14 | 6 | 8 |
| `k8s/batch/ingest-job-cycle2.yaml` | 4 | 0 | 4 |
| `k8s/batch/ingest-job-cycle3.yaml` | 3 | 0 | 3 |
| `k8s/batch/ingest-job-faults.yaml` | 16 | 3 | 13 |
| `k8s/batch/ingest-job-links1.yaml` | 1 | 0 | 1 |
| `k8s/batch/ingest-job-links2.yaml` | 3 | 1 | 2 |
| `k8s/batch/ingest-job-ops-2.yaml` | 8 | 2 | 6 |
| `k8s/batch/ingest-job-ops.yaml` | 16 | 8 | 8 |
| `k8s/batch/ingest-job.yaml` | 7 | 3 | 4 |
| `k8s/batch/kustomization.yaml` | 8 | 2 | 6 |
| `k8s/batch/llm-double.yaml` | 11 | 2 | 9 |
| `k8s/batch/timeshift-job.yaml` | 15 | 6 | 9 |

21개 행이 0줄이 되어 지웠다(L 20 · E 1). 코드 변경 0 — YAML 은 주석을 걷은 뒤에도 `yaml.safe_load_all`
결과가, XML 은 주석 노드를 뺀 문서가, Python 은 주석·docstring 을 걷은 줄 시퀀스가 base 와 같다.

## 제거 유형

| 유형 | 자리 |
|---|---|
| 시나리오 위치 배너(`…-test-*.md#시나리오 N` 의 어느 단계인가) | `k8s/batch` 의 Job 머리 대부분 — 그 대응은 `run.sh` 의 체인과 spec 의 `// 검증 시나리오:` 가 진다(e2e-spec-runner-necessity-pass 가 `run.sh` 단계 표지를 걷은 것과 같은 판단) |
| 「컨테이너 계약은 X 와 같고 바뀌는 것은 Y 뿐」 | diff 재진술 — 두 매니페스트를 나란히 보면 바로 보인다 |
| 묶음별 데이터 루트 관례 · 두 상태(`write_records` 교체) 일반론 | `feeds/README.md` 불릿 재진술. 루트를 공유하고 싶어지는 자리(`aggregate-job-rollup.yaml`)와 특수 사유(`ingest-job-ops.yaml` 의 `skipped_settled`)만 남겼다 |
| 픽스처 역할 · 건수 · 갈래 목록 | `feeds/README.md` 표 · 응답 표(`llm/responses.json`) 재진술. 번호별 역할처럼 README 에 없는 대응은 남겼다 |
| 더블 머리 사본 | `feed-double.yaml`·`llm-double.yaml` 머리(모듈 docstring 사본), `llm/server.py` 의 ConfigMap 기본값 2줄(피드 더블 사본) |
| 코드 재진술 | `_hits` 위 설명 · `do_<METHOD>` 규약 · `log_message` · `_flaky`/`_slow` docstring · `MAX_BODY` 줄 끝 |

## 틀린 주석 고침

- `k8s/batch/kustomization.yaml` — ConfigMap 을 run.sh 가 만든다는 문장의 괄호 「GOLD 픽스처와 같은 방식」은
  낡았다. GOLD 픽스처는 2026-09-26 에 제거됐다(`fixtures/README.md` 「서빙 입력은 픽스처가 아니다」). 괄호를 지웠다.
- `k8s/batch/analyze-job-calls2.yaml` — 「(위 주석 참조)」가 가리키는 근거는 이 파일 위가 아니라
  `analyze-job-calls1.yaml` 에 있다. 포인터를 고쳤다.
- `k8s/batch/data-pvc.yaml` — 동시 마운트하는 쪽을 「반출 Pod」만 적었는데 서빙 Pod 도 같은 클레임을 마운트한다
  (`k8s/e2e-patch.yaml`). 개작에서 더했다.

## 번복

- `k8s/batch/aggregate-job.yaml`·`timeshift-job.yaml` 의 「상류 더블이 없어 `mock-exception:` 이 붙지 않는다」는
  batch-harness-pass 가 「부재의 근거는 코드가 복원하지 못한다」로 유지했다. 필요성 시험으로는 사유를 못 댄다 —
  주입하는 상류가 없다는 것은 매니페스트에 상류 주소 env 가 없다는 데서 바로 보여, 확인에 비용이 들지 않는다.
  옛 패스 문서는 고치지 않는다.

## 범위 밖 발견(문서 — 주석 정책 범위 밖)

- `tests/e2e/fixtures/feeds/README.md` 표의 `agg_kr_wire.rss.xml` 행 「4 (본문 없는 1건 포함)」는 실측 5건 · 본문 없는
  2건이고, `agg_kr_wire_skew.rss.xml` 행 「10 (앞 4건은 동일)」은 실측 11건 · 앞 5건 동일이다. 픽스처 머리 주석
  (이번에 유지한 분모 등식 가드)이 맞고 README 가 낡았다. 이 PR 은 고치지 않는다.
