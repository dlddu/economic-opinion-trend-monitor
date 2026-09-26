# 2026-09-26 ledger-format-migration

유형 템플릿 `templates/comment-redundancy.tbm.md` 「원장 형식 (고정부)」으로 `ledger.md` 를 이전한다.
**주석은 한 줄도 판정하지 않았고 한 줄도 지우지 않았다** — diff 는 `docs/comment-policy/`·게이트·CI 설정뿐이다.

## 무엇이 바뀌었나

| | 이전 전 | 이전 후 |
|---|---|---|
| 열 | 파일 · 판정 전 · 제거 · 남음 · 판정 (5열) | 판정일 · 범위 · 현재 주석 줄 수 · 지문 · 판정 축 · 결과 (6열) |
| 진척 | 결과 칸 산문 + 손 마커 | `판정 축` 칸 (게이트가 집계를 출력) |
| 합계 | 집계 행 2 + 표 뒤 손 산문 | 없음 — `scripts/check-comment-ledger.py` 출력 |
| 행 순서 | 대체로 사전순(인접 역순 있음) | 범위 첫 파일 경로 사전순(게이트 R8) |
| 패스 이력 | 원장 안 표 | 이 문서 「패스 이력(이전 전 원장에서 옮김)」 |
| 게이트 | 없음 | `scripts/check-comment-ledger.py` (`make lint` · CI `comment-ledger`) |

## 판정 축을 옮긴 규칙

새로 판정하지 않았다. 축은 **행의 결과 칸이 복원 경로 기호(`①②③④`)로 직접 선언한 것만** 옮겼다.
산문(`README 재진술` 등)에서 축을 **추론하지 않았다** — 추론은 판정이고, 묻지 않은 것을 판정 완료로
세게 되기 때문이다. 그래서 이 칸은 실제로 판정된 것의 **하한**이다.

원장 산문은 동그라미 숫자를 **두 가지**로 쓴다 — 복원 경로와 README 「자주 나오는 제거 유형」의 번호.
후자(`제거 유형 ④` 등) 2곳은 문맥으로 걸러 축에서 제외했다.

판정 뒤 주석이 자란 행은 템플릿 규칙대로 축을 `—`로 되돌렸다 — 현재 지문에 대한 판정이 미완이기 때문이다.

### 축을 `—`로 되돌린 행 (판정 뒤 자람)

| 범위 | 남음(판정 시점) | 현재 실측 | 되돌린 축 |
|---|---:|---:|---|
| `deploy/base/deployment.yaml` | 10 | 11 | — |
| `python/packages/analysis/tests/test_cli.py` | 12 | 14 | — |
| `tests/e2e/k8s/e2e-patch.yaml` | 5 | 19 | — |
| `tests/e2e/k8s/kustomization.yaml` | 5 | 6 | — |
| `tests/e2e/run.sh` | 51 | 54 | ①②③ |
| `tests/e2e/specs/ac3-7-three-axis-compare.spec.ts` | 32 | 37 | — |
| `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` | 26 | 33 | — |

### 행을 지운 파일 — 판정 대상 주석 0줄 (7건)

범위 불변식(합집합 = 실측 파일 집합)상 판정 대상 주석이 없는 파일은 행을 갖지 않는다.
판정 기록은 아래와 각 패스 문서에 남는다.

| 파일 | 판정 전 | 제거 | 남음 | 결과 |
|---|---:|---:|---:|---|
| `Makefile` | 18 | 18 | 0 | 전량 제거 — 머리 11줄은 README「디렉터리 구조」「상태」재진술(골격·페이크 서술은 낡음), 18행은 `gen-check` 타깃이 복원, `## ---` 6줄은 구분선(help 파서 `^타깃:.*## `에 걸리지 않는 장식) |
| `deploy/overlays/prod/pvc.yaml` | 1 | 0 | 1 | 유지 — storageClassName 부재 의도(프리뷰의 efs 함정과 대비되는 의도적 기본값). **파일 소멸** — #92(`60a8176`)가 서빙 볼륨을 배치 claim `econ-batch-data` 로 재배선하며 삭제했다(e2e-runner-pass 기록). 행은 이력으로 남기고 지문 파일 집합에서는 빠진다 |
| `go/internal/handlers/debug_test.go` | 5 | 5 | 0 | **runlog-window-pass — 첫 판정**(#126 신설 · #130 이 2줄 더했다). 전량 제거 — ⑴ 머리 3줄(「The debug route exists so the screen can be routed and navigated to, but it must not pretend: until the run and call records exist it says it is a stub and returns no runs or calls」): 테스트 이름 `TestDebugIsAnHonestStubUntilRunAndCallRecordsExist` 와 같은 함수 안의 두 `t.Fatalf` 문면(「debug must declare itself a stub」 · 「debug must not fabricate records」)이 **같은 파일 안에서** 축자 복원한다(①) ⑵ `got.Missing` 순회 앞 2줄(「Honest in the other direction too: batch run records landed with AC4.1, so the stub may no longer name run_record among what is missing」): 바로 아래 `t.Fatalf` 의 「run_record exists since AC4.1 — missing must not still claim it」이 축자 복원(①). 남음 0 이라 지문에서 빠지나 행은 남긴다 |
| `python/packages/analysis/tests/test_record_run_call_link.py` | 12 | 12 | 0 | **record-run-call-link-pass — 첫 판정**(#137 이 만든 신규 파일, 행 없었음 = ⑴ 항 전량). 전량 제거 — 12줄이 네 갈래로 전부 복원된다: ⒜ 바로 아래 단언의 재진술 6줄(실행 도달 1 · 배타 1 · 네 유형 열거 1 · 본문 미확보 1 · 타 실행 누출 1 · AC2.6 불변 1) — 「개수·열거」는 정책이 가드에서도 금한 형태다 ⒝ 구현 주석의 사본 4줄(한 홉 경유 2 · 직접 가리켰다면 2) — 주인은 `llm.py` 재사용 분기의 가드이고 이 패스가 그쪽을 남겼다(정책 「설명의 주인에만 둔다」) ⒞ PR #137 본문 축자 2줄(「양쪽 끝에서 읽는 같은 사실」 · 음성 프로브 표의 `records_of_run` 행) ⒟ 모듈 docstring(#137 이 시나리오 3 의 기대 결과를 절 단위로 옮겨 적었다)과 `analysis.avsc` 세 필드 doc 이 ⒜⒞ 전건을 한 번 더 덮는다. 남음 0 이므로 이후 지문에서 빠진다 |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | 3 | 3 | 0 | **runlog-window-pass — 재판정.** 직전 판정(initial-pass, 남음 2)의 두 줄은 #118 이후 이미 사라져 실측 0 이었고, 그 자리에 #130 이 3줄을 들였다. 전량 제거 — 「one observation is either collected or dropped as a duplicate, so the two buckets partition what the sources handed us; a source that failed outright has no observations to classify and is named in source_failures instead」: 바로 아래 네 줄(`stage.input_count = len(items) + stats.duplicates` · `stage.count("collected", len(items))` · `stage.count("duplicate_skipped", stats.duplicates)` · `stage.source_failed(source_id, reason)`)이 그 문장을 그대로 코드로 적고(①), 「합 = 입력」 불변식은 `runlog._stage_record()` 가 강제한다(PR #130 본문 — ①③). 남음 0 이라 지문에서 빠지나 행은 남긴다 |
| `scripts/check-mockup-render.py` | 3 | 3 | 0 | regression-pass — 전량 제거. 지문에 걸린 주석이 구분선 배너 3줄뿐이었다(`# ---- SSOT 파싱`·`CSS 파싱`·`판정`). 절 이름은 바로 아래 함수 이름이 복원한다(`definitions()` / `css_rules(css)` / `check_r3()`·`check_r5()`). 파일 설명은 모듈 docstring에 있고 docstring은 지문의 사각지대라 이 파일은 지문에서 빠진다 |
| `web/src/screens/Compare.test.tsx` | 6 | 6 | 0 | **web-api-view-pass** — #76 이 신설한 파일의 첫 판정, 전량 제거. ⑴ local 헬퍼 `exitCard` 의 JSDoc 1줄: 다섯 줄짜리 헬퍼의 이름·시그니처가 하는 일을 말하고(경로 ①) 요약 자체가 부정확했다(헬퍼는 「링크 라벨·목적지」가 아니라 카드 요소를 돌려준다) — `Dashboard.test.tsx` 의 `Landing` JSDoc 을 남긴 자리와 달리 이름이 역할을 말한다 ⑵ 첫 테스트 머리 3줄(「목업은 워크스루 단계마다 카드를 한 장씩 세우지만 구현은 한 페이지이므로 확인할 것은 배치가 아니라 …」): **같은 커밋 #76 이 설계 트래커 「해소된 등재」 두 이탈 행에 축자로 적었다**(「구현의 비교 화면은 단계가 접힌 한 페이지라 배치만 다르다」·「`Compare.test.tsx` 가 라벨과 `href` 를 잠근다」, 경로 ②) + 테스트 이름이 단언을 말한다(경로 ①) — trend-surface-pass 의 `Trend.test.tsx` 처분과 같은 형태 ⑶ 둘째 테스트 머리 2줄(「`.cmpcol` 로 세어지면 … 넷이 된다(서빙 e2e 도 같은 수를 센다)」): PR #76 본문 「검증」 절이 축자(「`Compare.test.tsx` 두 번째 테스트가 그 수를 직접 잠근다」, 경로 ③)이고 `ac3-7-three-axis-compare.spec.ts` 의 `page.locator(".cmpcol")` 가 e2e 쪽을 보여 준다(경로 ①). 판정 후 남음 0 이라 지문 파일 집합에서 빠지지만 행은 남긴다(`Dashboard.tsx` 처분) |

### 행을 새로 세운 파일 — 판정 축 `—` (33건)

옛 「잔량 선언」의 자리다. 이전 직전 원장의 말미 산문은 이 가운데 일부만 세고 있었다 — 나머지는
2026-09-26 `867ffa32` 의 범위 개정(포함 목록 → 레포 전체 − 제외)으로 새로 범위에 든 파일이고,
그 개정 뒤 아무도 잔량을 다시 세지 않았다. 게이트가 이제 이 축을 센다.

| 범위 | 현재 주석 줄 수 |
|---|---:|
| `.dockerignore` | 5 |
| `.github/workflows/checks.yml` | 34 |
| `.github/workflows/ci.yml` | 49 |
| `.github/workflows/docs-journey-mockup.yml` | 19 |
| `.github/workflows/docs-mockup-render.yml` | 15 |
| `.github/workflows/image.yml` | 64 |
| `.github/workflows/review-gate.yml` | 26 |
| `.gitignore` | 7 |
| `Dockerfile` | 9 |
| `Dockerfile.batch` | 15 |
| `python/pyproject.toml` | 1 |
| `scripts/check-comment-ledger.py` | 13 |
| `tests/e2e/fixtures/feeds/agg_global_desk.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/agg_kr_daily.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/agg_kr_wire.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/agg_kr_wire_skew.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/agg_us_desk.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/analysis_corpus.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/cycle12_main.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/cycle3_main.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/faults_dup.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/faults_flaky.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/faults_ok.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/global_desk.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/kr_wire.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/llm_calls_cycle1.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/llm_calls_cycle2.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/record_links_desk_cycle1.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/record_links_desk_cycle2.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/record_links_wire_cycle1.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/record_links_wire_cycle2.rss.xml` | 1 |
| `tests/e2e/fixtures/feeds/us_markets.atom.xml` | 1 |
| `web/vite.config.ts` | 2 |

### 축 표기 후보 — 결과 칸이 복원처를 명시하지만 축 기호가 없는 행 (31건)

이 이전은 **축 기호로 선언된 것만** 옮겼다. 아래 행들의 결과 칸은 복원처를 산문으로 명시하고 있어
축을 채울 수 있을 가능성이 높지만, 산문에서 축을 **추론하는 것은 판정**이므로 이 이전은 하지 않았다.
다음 판정 슬라이스가 결과 칸을 읽어 확인한 축만 채운다 — 읽기만으로 끝나는 값싼 몫이다.

| 범위 |
|---|
| `deploy/base/rbac.yaml` |
| `deploy/batch/cronworkflow-ingestion.yaml` |
| `deploy/batch/cronworkflow-pipeline.yaml` |
| `deploy/batch/kustomization.yaml` |
| `deploy/overlays/prod/batch-pvc.yaml` |
| `deploy/overlays/prod/kustomization.yaml` |
| `go/cmd/serving/main.go` |
| `go/internal/argo/argo.go` |
| `go/internal/handlers/dashboard_test.go` |
| `go/internal/handlers/handlers.go` |
| `go/internal/handlers/reprocess_test.go` |
| `go/internal/handlers/reprocess_trigger.go` |
| `go/internal/store/store_test.go` |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` |
| `python/packages/aggregation/tests/test_aggregate.py` |
| `python/packages/core/src/econ_core/runlog.py` |
| `python/packages/ingestion/tests/test_feeds.py` |
| `scripts/journey-scenarios/JRN-daily-scan.js` |
| `scripts/journey-scenarios/JRN-ingestion-recovery.js` |
| `scripts/journey-scenarios/JRN-spike-verification.js` |
| `tests/e2e/fixtures/llm/server.py` |
| `tests/e2e/k8s/batch/analyze-job-agg-skew.yaml` |
| `tests/e2e/k8s/batch/analyze-job-links1.yaml` |
| `tests/e2e/k8s/batch/ingest-job-cycle2.yaml` |
| `tests/e2e/k8s/batch/ingest-job-ops.yaml` |
| `tests/e2e/playwright-setup.sh` |
| `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` |
| `web/src/api/types.ts` |
| `web/src/screens/Reprocess.tsx` |
| `web/src/screens/ReprocessTrigger.tsx` |
| `web/src/screens/Trend.test.tsx` |

## 패스 이력 (이전 전 원장에서 옮김)

원장은 행 단위 사실만 담는다(템플릿 「원장 형식」). 아래는 이전 직전 `ledger.md` 의 「패스 이력」 절을
**그대로** 옮긴 것이다 — 값은 당시 사실의 기록이고 고치지 않았다.


| 판정일 | 패스 | 기준 커밋 | 판정 전 | 제거 | 남음 | 파일 수(전→후) |
|---|---|---|---|---|---|---|
| 2026-09-18 | [initial-pass](2026-09-18-initial-pass.md) | `9d6122b` | 776 | 121 | 655 | 62 → 60 |
| 2026-09-18 | [regression-pass](2026-09-18-regression-pass.md) | `a62eae1` | 960 | 7 | 953 | 81 → 80 |
| 2026-09-18 | [pin-guard-pass](2026-09-18-pin-guard-pass.md) | `e29dddd` | 982 | 3 | 979 | 81 → 81 |
| 2026-09-18 | [aggregation-harness-pass](2026-09-18-aggregation-harness-pass.md) | `e7fbcae` | 1317 | 5 | 1312 | 94 → 94 |
| 2026-09-19 | [product-surface-pass](2026-09-19-product-surface-pass.md) | `d4a4cd2` | 1859 | 2 | 1857 | 111 → 111 |
| 2026-09-20 | [batch-harness-pass](2026-09-20-batch-harness-pass.md) | `32faf64` | 1954 | 12 | 1942 | 112 → 112 |
| 2026-09-20 | [scenario-spec-pass](2026-09-20-scenario-spec-pass.md) | `ddaef4f` | 2201 | 42 | 2159 | 118 → 118 |
| 2026-09-20 | [unrowed-files-pass](2026-09-20-unrowed-files-pass.md) | `4ddbdaa` | 2350 | 33 | 2317 | 121 → 121 |
| 2026-09-20 | [trend-surface-pass](2026-09-20-trend-surface-pass.md) | `473b3cc` | 2398 | 38 | 2360 | 123 → 123 |
| 2026-09-20 | [dashboard-surface-pass](2026-09-20-dashboard-surface-pass.md) | `50dbd2d` | 2360 | 5 | 2355 | 123 → 122 |
| 2026-09-20 | [serving-handlers-pass](2026-09-20-serving-handlers-pass.md) | `c887503` | 2419 | 19 | 2400 | 123 → 123 |
| 2026-09-20 | [lineage-surface-pass](2026-09-20-lineage-surface-pass.md) | `9a5d32e` | 2467 | 13 | 2454 | 124 → 124 |
| 2026-09-21 | [lineage-rejudge-pass](2026-09-21-lineage-rejudge-pass.md) | `6a0b464` | 2454 | 5 | 2449 | 124 → 124 |
| 2026-09-21 | [web-api-view-pass](2026-09-21-web-api-view-pass.md) | `6a0b464` | 2454 | 47 | 2407 | 124 → 123 |
| 2026-09-21 | [e2e-runner-pass](2026-09-21-e2e-runner-pass.md) | `60a8176` | 2428 | 71 | 2357 | 122 → 122 |
| 2026-09-21 | [trend-rejudge-pass](2026-09-21-trend-rejudge-pass.md) | `da51edd` | 2357 | 51 | 2306 | 122 → 122 |
| 2026-09-21 | [reprocess-surface-pass](2026-09-21-reprocess-surface-pass.md) | `88a643c` | 2458 | 16 | 2442 | 126 → 126 |
| 2026-09-21 | [reprocess-trigger-pass](2026-09-21-reprocess-trigger-pass.md) | `f7e2338` | 2618 | 47 | 2571 | 134 → 134 |
| 2026-09-21 | [reprocess-console-pass](2026-09-21-reprocess-console-pass.md) | `ca0554d` | 2571 | 31 | 2540 | 134 → 134 |
| 2026-09-21 | [reprocess-python-pass](2026-09-21-reprocess-python-pass.md) | `52fba9f` | 2542 | 11 | 2531 | 134 → 133 |
| 2026-09-21 | [journey-gate-pass](2026-09-21-journey-gate-pass.md) | `32e7f09` | 2531 | 20 | 2511 | 133 → 133 |
| 2026-09-21 | [dash-brief-pass](2026-09-21-dash-brief-pass.md) | `0f4f04e` | 2521 | 23 | 2498 | 134 → 134 |
| 2026-09-21 | [rollup-test-pass](2026-09-21-rollup-test-pass.md) | `1f508e1` | 2498 | 12 | 2486 | 134 → 134 |
| 2026-09-21 | [sentiment-split-pass](2026-09-21-sentiment-split-pass.md) | `3205cb5` | 2486 | 23 | 2463 | 134 → 134 |
| 2026-09-21 | [trend-spec-pass](2026-09-21-trend-spec-pass.md) | `775efcb` | 2463 | 10 | 2453 | 134 → 134 |
| 2026-09-21 | [fairness-spec-pass](2026-09-21-fairness-spec-pass.md) | `7376e37` | 2453 | 5 | 2448 | 134 → 134 |
| 2026-09-21 | [unit-cache-pass](2026-09-21-unit-cache-pass.md) | `ba7b704` | 2448 | 6 | 2442 | 134 → 134 |
| 2026-09-21 | [feed-adapter-pass](2026-09-21-feed-adapter-pass.md) | `00a1eed` | 2442 | 3 | 2439 | 134 → 134 |
| 2026-09-21 | [deploy-overlay-pass](2026-09-21-deploy-overlay-pass.md) | `3e8eaf4` | 2439 | 3 | 2436 | 134 → 134 |
| 2026-09-21 | [web-convergence-pass](2026-09-21-web-convergence-pass.md) | `ca2f107` | 2436 | 5 | 2431 | 134 → 134 |
| 2026-09-22 | [phone-media-pass](2026-09-22-phone-media-pass.md) | `d6db7fe` | 2432 | 1 | 2431 | 134 → 134 |
| 2026-09-24 | [dash-rebuild-pass](2026-09-24-dash-rebuild-pass.md) | `9a37d04` | 2601 | 41 | 2560 | 140 → 140 |
| 2026-09-25 | [runlog-window-pass](2026-09-25-runlog-window-pass.md) | `92e408f` | 2603 | 42 | 2561 | 145 → 143 |
| 2026-09-25 | [residual-close-pass](2026-09-25-residual-close-pass.md) | `78e32da` | 2637 | 38 | 2599 | 145 → 145 |
| 2026-09-25 | [pipeline-ops-harness-pass](2026-09-25-pipeline-ops-harness-pass.md) | `e92e3cc` | 2766 | 52 | 2714 | 152 → 152 |
| 2026-09-25 | [calllog-e2e-window-pass](2026-09-25-calllog-e2e-window-pass.md) | `22464d6` | 2714 | 60 | 2654 | 152 → 152 |
| 2026-09-25 | [llm-call-harness-pass](2026-09-25-llm-call-harness-pass.md) | `ae71aa4` | 2783 | 114 | 2669 | 159 → 159 |
| 2026-09-25 | [format-gate-pass](2026-09-25-format-gate-pass.md) | `2164bbc` | 2669 | 9 | 2660 | 159 → 159 |
| 2026-09-26 | [record-run-call-link-pass](2026-09-26-record-run-call-link-pass.md) | `fafceb8` | 2686 | 20 | 2666 | 160 → 159 |
| 2026-09-26 | [record-link-window-pass](2026-09-26-record-link-window-pass.md) | `bcaa60d` | 2792 | 58 | 2734 | 166 → 166 |

batch-harness-pass도 표적 패스다 — `tests/e2e/k8s/batch/` 의 **아직 행이 없던 18파일**(149줄)만 판정했다.
그 디렉터리의 나머지 한 파일(`feed-double.yaml`)은 aggregation-harness-pass가 이미 판정했으므로,
이 패스 뒤 그 디렉터리는 19파일 전부가 행을 갖는다.

scenario-spec-pass도 표적 패스다 — 시나리오 spec 16파일과 `tests/e2e/fixtures/*/server.py` 2파일,
`econ_aggregation/cli.py` 1파일(도합 19파일 360줄)만 판정했다. 판정 시점(`7386301`)에 행이 없던 나머지는
`tests/e2e/lib/` 6파일이었고, 그 디렉터리는 열린 PR이 3파일을 수정 중이라 같은 패스로 묶지 않았다(겹치는
트리 위에서 판정하면 머지 순간 판정 근거가 낡는다). 머지 기준 커밋이 `ddaef4f`로 올라오는 사이 자매 PR
(#65·#66)이 **행 없는 파일 6개를 더 들여** 착지 시점 ⑴은 12파일 332줄이다 — 말미 요약이 그 값이다.
이 패스는 「읽는 법」에 **잔여 계수 규약**을 더해, 행이 있으나 판정 이후 자란 파일의 증가분도 말미 요약이
세도록 고쳤다.

unrowed-files-pass도 표적 패스다 — 판정 시점(`473a965`)에 **행이 없던 12파일 중 11파일**(298줄)만 판정했다.
남은 하나(`web/src/screens/Fairness.tsx` 34줄)를 뺀 것은 열린 PR #70이 그 파일을 수정 중이기 때문이다
(겹치는 트리 위에서 판정하면 머지 순간 판정 근거가 낡는다 — scenario-spec-pass가 `tests/e2e/lib/` 를 미룬 것과
같은 이유다). 머지 기준 커밋이 `4ddbdaa`로 올라오는 사이 그 PR #70이 실제로 머지돼 **행 없는 파일 셋을 더
들이고** `Fairness.tsx`를 37줄로 키웠으므로, 착지 시점 ⑴은 4파일 99줄이다 — 말미 요약이 그 값이다.
`tests/e2e/lib/` 는 6파일 전부가 행을 갖는다. 제거 33줄 중 20줄은 그 디렉터리의 **다섯 파일에 바이트째 되풀이된
같은 블록**이다 — 「이 디렉터리는 `specs/` 밖이다 … `check_scenario_mapping.py` 가 선언 없는 매칭 단위로
읽는다」. 복원 경로가 둘이라 제거했다: ① `check_scenario_mapping.py:104` 의 `SPEC_DIR.glob("*.spec.ts")` 가
`lib/` 를 애초에 훑지 않고, ② doc-tracker 「e2e 매핑 › 매칭 규약」이 「매칭 단위는 `tests/e2e/specs/` 최상위
`*.spec.ts` 파일이고 하네스는 매칭 단위가 아니다」를 못박는다. 주석 스스로 ②를 인용하면서 경로를
`docs/econ-opinion-monitor-doc-tracker.md` 로 적은 것도 이미 낡아 있었다 — 그 문서는 2026-08에 월별 디렉터리
(`docs/econ-opinion-monitor-doc-tracker/2026-09.md`)로 갈라졌다.

trend-surface-pass도 표적 패스다 — 그것도 **행이 없는 파일이 아니라 ⑵(행보다 자란 파일)를 닫는**
첫 패스다. 판정 시점(`473b3cc`)에 `web/src/screens/Trend.tsx`(35 → 75)와 `Trend.test.tsx`(12 → 35)가
`trend` 화면이 세 번째 여정 단계와 승계 계약을 받으며 63줄을 들였고, 그 63줄은 두 파일에 **행이 있다는
이유로** 어느 행에도 잡히지 않고 있었다. 제거 33줄 + 문면 정정 4곳(5줄 감소)의 특징은 복원처가 **같은
커밋 안에서 함께 열렸다**는 것이다 — #79·#80·#81 이 화면을 세우며 doc-tracker 2026-09 변동 이력과
design-tracker 행에 같은 사실을 산문으로 적었고, 주석이 그것을 다시 적었다. 같은 창이 들인
`web/src/tokens/tokens.css`(38 → 54, 증가분 16)를 뺀 것은 열린 PR #76 이 그 파일을 수정 중이기
때문이다(직전 두 패스가 `Fairness.tsx` 를 뺀 것과 같은 이유 — 막은 PR 번호만 바뀌었다).
`Trend.tsx:8-21` 의 「deliberately *not* here」 두 항은 design-tracker 가 처분 시점을 「단위가
**선택 가능해질 때**」로 못박았고 `/api/trend` 가 아직 `?unit=` 을 받지 않아 유지이며, 이 패스의
제거분은 전부 22행 이후라 트래커가 인용한 줄 범위는 움직이지 않는다.

이 패스는 **한 번 거부되고 기준 커밋을 옮겨 다시 판정했다.** 첫 판(`aca481c` 기준, 45줄 증가분)이
준비된 사이 자매 PR #81 이 같은 두 파일에 주석 18줄을 더 들였고, 그대로 머지했다면 원장이 **읽은 적
없는 18줄을 「판정됨」으로 인증**하면서 동시에 `현재 줄 수 == 남음` 을 만들어 계수 규약 ⑵ 가 그 18줄에
영영 도달하지 못하게 만들 참이었다(「읽는 법」이 스스로 경고한 자리다). 그래서 #81 착지를 기다려
기준 커밋을 `473b3cc` 로 옮기고 증가분 전량(63줄)을 다시 판정했다 — **원장 행의 `남음` 은 그 행의
비고가 열거로 해명하는 줄 수와 같아야 하고, 숫자만 갈아끼우는 갱신은 그 불변식을 깬다.**

dashboard-surface-pass도 표적 패스다 — 기준 커밋(`50dbd2d`)에서 **열린 어느 PR 에도 소유자가 없던 10줄**
(`web/src/screens/Dashboard.tsx` 3 · `Dashboard.test.tsx` 7)만 판정했다. 그 10줄은 모두 `#81 (squash)` 한 창이
들였고 잔여의 **두 몫에 나뉘어** 있었다 — 테스트 파일은 행이 없어 ⑴, 화면 파일은 행이 `남음 0` 이라 ⑵.
후자를 함께 집은 것은 행을 갱신하지 않으면 **원장이 「0줄」을 계속 주장**해 원장만 읽는 다음 패스가
재발한 주석에 도달하지 못하기 때문이다. **기준 커밋은 준비 사이 `473b3cc` 에서 `50dbd2d` 로 옮겼다** —
자매 PR #82(trend-surface-pass)가 먼저 착지해 같은 요약 행과 패스 이력 표를 고쳤기 때문이고, 리베이스 후
지문·잔여·행 수를 전부 재측정했다(#82 는 `Trend.*` 만 건드려 이 패스가 판정하는 10줄 자체는 움직이지 않았다).
제거 5줄은 주석을 들인 **그 PR 자신의 본문**이 축자로 복원하는 승계 계약 근거이고(경로 ③ — 앞선 패스들이
doc-tracker·design-tracker 로 복원한 것과 달리 **같은 PR 본문**이 복원처인 첫 사례다), 유지 5줄은 「테스트가 왜
그 모양으로 단언하는지」라 `Sentiment.test.tsx`·`Fairness.test.tsx` 의 전량 유지와 같은 판정이다. 판정 후
`Dashboard.tsx` 는 남음이 0 이라 지문 파일 집합에서 빠지지만 **행은 남긴다** — 지우면 다음 패스가 「아직 아무도
보지 않은 파일」로 오해한다.

**판정 표면을 수정 중인 열린 PR 이 있다 — 미루지 않고 판정한 근거.** 머지 직전 열린 PR 여섯
(#84 · #78 · #76 · #75 · #73 · #72) 중 **#84 가 이 두 파일을 모두 수정 중**이다(앞 세 패스가 `Fairness.tsx`·
`tokens.css` 를 뺀 것과 같은 상황). 그럼에도 뺀 것이 아니라 판정한 것은, #84 가 하는 일이 `오늘의 조회 조건`
카드를 들이며 **주석 31줄을 새로 더하는 것**이고 이 패스가 지우는 5줄과는 **줄이 겹치지 않기** 때문이다 —
제거 대상 문장(「축을 추측해야 하고」)을 #84 의 두 파일 패치에서 축자로 찾으면 0히트이고, 패치 헝크도
제거 지점(`Dashboard.tsx:112-114` · `Dashboard.test.tsx:78-79`)을 비껴간다. 더 중요한 것은 **착지 순서와
무관하게 그 31줄이 묻히지 않는다**는 점이다: 이 패스 뒤 두 파일 모두 행을 가지므로, #84 가 뒤에 착지하면
그 증가분은 계수 규약 ⑵ 로 다음 패스에 그대로 도달한다(두 행의 `남음` 0 · 5 는 착지 시점 실측값이라
⑵ 가 0 을 내지 않는다). 앞 패스들이 파일을 뺀 이유는 「판정 근거가 낡은 트리에서 세워지는 것」이었고,
여기서는 판정 근거(복원 경로 ③)가 #84 가 더하는 줄과 무관하므로 그 위험이 성립하지 않는다.

serving-handlers-pass도 표적 패스다 — `go/internal/handlers/` **한 패키지 2파일**만 판정했고,
직전 패스가 말미 요약에서 다음 패스로 지목한 그 덩어리다(⑵ `handlers.go` +228 · `handlers_test.go`
+106 = 334줄). **기준 커밋은 준비 사이 `4772128` 에서 `c887503` 으로 옮겼다** — 자매 PR #84·#85 가
먼저 착지해 `Dashboard.*`·`Trend.*`·`tokens.css`·`aggregation-5…spec.ts` 에 주석 64줄을 더했기
때문이고(직전 dashboard-surface-pass 가 「#84 가 뒤에 착지하면 그 증가분은 계수 규약 ⑵ 로 다음
패스에 도달한다」고 예고한 그 창이다), 리베이스 후 지문·잔여·행 수를 전부 재측정했다. **두 자매가
`go/internal/handlers/` 를 건드리지 않아 이 패스가 판정하는 372줄 자체는 움직이지 않았다**(판정 전
줄 수 252·120 이 리베이스 전후 동일). 증가분만 처분하지 않고 **두 파일 전체 372줄을 재판정**한 것은 「읽는 법」이 못박은
불변식(**행의 `남음` 은 그 행의 비고가 열거로 해명하는 줄 수와 같아야 한다**) 때문이고,
계획 직전 열린 PR 일곱(#85 · #84 · #78 · #76 · #75 · #73 · #72)의 파일 목록을 다시 조회해
`go/internal/handlers/` 와의 겹침이 **0**임을 확인했다. 제거 6줄은 **한 함수에 겹쳐 붙은 낡은 doc
주석 한 벌**(`latestBucket` 앞 5줄 — 뒤에 이어 붙은 두 번째 요약이 같은 사실을 더 정확히 적고,
`distinctBuckets`·`finestUnit` doc 이 나머지를 복원한다. 「다른 파일 주석의 재진술 — 설명의
주인에만 둔다」를 **한 파일 안의 두 벌**에 적용)과 `handlers_test.go` 의 `// --- trace (slice 9) ---`
구분선 1줄(initial-pass 가 같은 패키지에서 지운 형태의 재발)이다. 문면 정정 4곳(13줄 감소)의
특징은 **같은 트랩의 사본을 주인 지목 포인터로 줄인 것**이다 — 「Mixed bucket units」가
`trend`·`sentiment`·`fairness` 세 핸들러 doc 에 사본으로 있었고 주인은 그들이 실제로 부르는
`plottedUnit`·`sentimentUnit` 이며, 사본 셋 중 둘은 「AC3.3 has not landed」로 **이미 거짓**이었다
(`32faf64` 로 롤업이 착지하며 `plottedUnit` 은 고쳐졌고 사본은 놓쳤다 — 정책의 「되풀이된 주석이
낡아 틀려 있으면 제거 근거가 강해진다」). 나머지 정정은 과거 상태 서술(「which is what this route
used to do」·「until now this route closed neither」·「Before slice 9 this returned a fixed
string」)이고 복원 경로는 슬라이스 커밋(④)과 doc-tracker 변동 이력(②)이다.
**패키지 주석 본문 6줄은 판단 분기로 남겼다** — 경로 ①(`Register` 의 라우트 열거 · `reprocess`
본문 · `trace` doc)이 성립하지만, design-tracker 가 `handlers.go:34`·`:30-37` 을 **판정 근거로
줄 번호 인용**하고 있어 그 위를 지우면 두 인용이 밀린다(`Sentiment.tsx:24-29` 유지와 같은 자리).
경로 ②는 성립하지 않는다 — `README.md:223`·`:228` 이 아직 골격 시절 서술(「나머지 6화면은
플레이스홀더」·「스텁 라우트만」)이라 **README 쪽이 낡았고 주석 쪽이 맞다**. 이 패스의 제거·정정
지점은 전부 `:308` 이후라 트래커가 인용한 줄 범위는 움직이지 않는다.

lineage-surface-pass도 표적 패스다 — 슬라이스 9(`4ddbdaa`/#70)가 들인 **계보 표면 4파일**(93줄)만
판정했다. 셋(`Trace.tsx`·`Trace.test.tsx`·`store_test.go`)은 unrowed-files-pass가 ⑴로 남긴 4파일 중
셋이고, 넷째 `go/internal/store/store.go`는 ⑵(행보다 자란 파일)에서 끌어왔다 — `store_test.go` 의
제거 근거가 `store.go` 의 doc 주석이라, 둘을 같이 보지 않으면 「설명의 주인」 판단이 서지 않는다.
⑴의 남은 하나 `web/src/screens/Fairness.tsx`를 뺀 것은 슬라이스를 그을 때 **열린 PR #76이 그 파일을
수정 중**이었기 때문이다(직전 패스가 같은 파일을 #70 때문에 뺀 것과 같은 이유 — 막은 PR 번호만
바뀌었다). 그 #76은 착지 직전 머지돼(`9a5d32e`) 제약이 풀렸으므로 **다음 패스가 바로 집을 수 있다**.
제거 13줄은 계보 조인 축 재진술 4줄(doc-tracker 변동 이력이 축자 복원) · 열지 않는 단계 서술 5줄
(같은 파일이 화면에 그리는 `note` 문면이 복원) · `store.go` doc 주석의 재진술 3줄(설명의 주인은
구현 쪽) · 테스트 이름이 복원하는 1줄이다. 더해 **문면 정정 2곳**(줄 수 불변): `.trace-` 접두사
가드에서 게이트 메커니즘을 걷어 금지와 출처만 남겼고(pin-guard-pass 선례), `PAT-lineage` 앵커를
이 파일의 다른 앵커 여섯과 같은 1줄 형태로 줄였다(구성 열거는 설계 트래커가 축자 복원).
**판정을 마친 뒤 기준 커밋이 `83e1281` → `8bad0be` → `cfe9f8b` → `9a5d32e`로 세 번 올라왔다** — 그 사이
#77이 설계 트래커에 `trace` 전수 판정을 등재했고(복원 경로 ②가 새로 열렸다), #79가 `Trace.tsx` 의 링크
만료 배너 문면을 목업 3문장으로 갈며 `Trace.test.tsx` 에 주석 2줄을 들였다. 둘 다 **판정 후에 생긴
복원 경로**라 이 패스는 앞당겨 집행하지 않고 해당 행에 다음 패스 후보로 적어 두었다. 마지막 이동
`cfe9f8b` → `9a5d32e`(#76)는 **판정 대상 4파일을 하나도 건드리지 않았다** — 주석 39줄을 다른 7파일에
들였을 뿐이라 판정 내용은 그대로 유효하고, 위 「패스 이력」 행과 아래 말미 집계의 **숫자만** 그 tip 에서
재측정했다(판정 전 `2428/123` → `2467/124`, 착지 후 `2415` → `2454`).

lineage-rejudge-pass는 **줄이 자라지 않은 파일의 재판정**이다 — lineage-surface-pass가 행을 준 뒤 #77·#79가
연 복원 경로 ②에 걸린 `Trace.tsx` 27줄·`Trace.test.tsx` 22줄만 다시 판정했다. 「읽는 법」의 잔여 계수 규약은
⑴ 행 없는 파일과 ⑵ 줄이 자란 파일만 세므로 **복원 경로가 자란 자리는 어느 몫에도 들어가지 않는다** — 그래서
이 패스는 말미 요약의 잔여 숫자를 움직이지 않고(383 그대로), 직전 패스가 이름으로 넘긴 후보 둘을 닫는 것이
전부다. 제거 5줄은 설계 트래커가 축자 복원하는 결측 문장 1줄과 매달린 `//`·같은 파일 `CMP-crumb` 앵커가
복원하는 1줄(`Trace.tsx`), 트래커 「해소된 등재」 행과 바로 아래 단언 3줄이 복원하는 #79 도입 2줄
(`Trace.test.tsx`)이다. 직전 패스가 「판단 분기」로 남긴 나머지 셋(설계 원칙 + 세 결측 목록 · 앵커의 사유 절 ·
인라인 AC 태그)은 이 패스가 **유지로 확정**했다 — 다음 패스로 다시 넘기지 않는다(근거는 패스 문서).
web-api-view-pass도 표적 패스다 — 직전 패스가 ⑴(행 없는 파일)로 남긴 **둘 전부**(`Fairness.tsx` 38 ·
`Compare.test.tsx` 6)와 ⑵(행보다 자란 파일) 중 `web/src/api/` **한 디렉터리 둘**(`types.ts` 5→48 ·
`client.ts` 5→15), 도합 4파일 107줄만 판정했다. 이 패스 뒤 **⑴ 은 0 이다** — scenario-spec-pass 가 계수
규약을 세운 뒤 12파일 332줄 → 4파일 99줄 → 2파일 44줄로 줄어 온 몫이 비었고, 잔여는 ⑵ 하나(20파일
286줄)다. 감지 단계가 권한 「열린 PR 과 겹침 0 인 최대 묶음」(`run.sh`·`types.ts`·`client.ts`)을 그대로
받지 않은 것은, 판정 시점 열린 PR 이 #75 하나(`scripts/`·`.github/` 만 수정)라 겹침이 어느 후보에서도
판별식이 아니었기 때문이다 — 대신 **복원처의 묶음**으로 갈랐다: 이 넷의 복원처는 `handlers.go` 의 응답
타입 doc(serving-handlers-pass 가 전량 유지한 **설명의 주인**) · 설계 트래커 `fairness`/`compare` 행 ·
PR #66·#70·#76 본문으로 하나의 묶음이고, `run.sh`(+84, 잔여의 29%)의 복원처는 테스트 문서·모킹 정책·README
로 다른 묶음이라 다음 패스의 1순위로 남겼다. 제거 47줄의 34줄은 **`types.ts` 의 필드·타입 JSDoc 이
Go 쪽 doc 주석을 같은 문장으로 되풀이한 것**이다 — 슬라이스 6~9 가 서빙 타입을 세우며 두 벌로 적었고,
「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」의 주인은 값을 계산하는 구현 쪽이다(`store_test.go` ←
`store.go` 와 같은 판단). export 타입의 요약 1줄은 정책대로 남겼고 본문이 여러 줄인 JSDoc 넷은 요약 1줄로
줄였다. 나머지는 `client.ts` 의 범위 서술(「the one screen still on Placeholder」 — README 재진술 유형이고
슬라이스 10 이 착지하면 거짓이 되는 개수 서술) 6줄과, #76 이 같은 커밋에서 설계 트래커·PR 본문으로
복원처를 연 `Compare.test.tsx` 6줄 전량이다. **`Fairness.tsx` 는 38줄 중 1줄만 지웠다** — 설계 트래커
「`세는 방식` 폼 카드 전면 부재」 행이 `Fairness.tsx:110-118` 을 줄 번호로 인용하고 있어 118행 위의 28줄은
복원 경로(doc-tracker 슬라이스 8 행 · 설계 트래커 `STP-inspect-sources`/`STP-drilldown-articles` 행 · 화면
자신의 lede 와 note 문면)가 전부 실재함에도 `handlers.go` 패키지 주석·`Sentiment.tsx` 세 블록과 같은 이유로
남겼다(제거·정정은 전부 118행 아래). 세 파일이 같은 자물쇠에 걸려 있으므로 그 인용이 내용 지목으로
바뀌면 함께 풀린다. 문면 정정 4곳은 앵커 셋(`CMP-note`·`PAT-raw-vs-norm`·`CMP-kv`)의 열거·과거 상태 서술을
lineage-surface-pass 의 `PAT-lineage` 처분대로 1줄 형태로 줄인 것과 `types.ts` 머리의 낡은 README 포인터
제거이고, `check-mockup-render.py` 출력이 부모와 바이트 동일함을 확인했다(`CMP-table` 토큰은 `Trend.tsx`
가 들고 있다).

e2e-runner-pass도 표적 패스다 — 직전 패스가 「다음 패스의 1순위」로 이름 붙인 **`tests/e2e/run.sh` 한 파일**(행 남음
12 → 실측 96, +84)만 판정했다. 96줄 중 **71줄을 지웠다**. 감지 단계는 이 파일의 복원처를 테스트 문서 셋·모킹
정책·README 로 예상했으나, 실제 주인은 **`tests/e2e/k8s/batch/` 매니페스트 머리 주석**(batch-harness-pass ·
unrowed-files-pass 가 전량 유지한 설명의 주인)과 `lib/ingestlog.ts`·`tools/timeshift_bronze.py` 머리말, 그리고 그 줄을
들인 PR #39·#44·#50·#65 본문이었다 — #31 부터 #65 까지 하네스를 넓힌 PR 마다 매니페스트에 적은 근거를 러너 머리와
단계 표지 뒤에 한 벌씩 더 적어 왔고, 그 사본을 걷은 것이다(「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」).
머리의 네 경로 목차 28줄은 이 파일 자신의 단계 표지와 말미 배너가 실행 순서대로 되풀이하므로 lede 2줄로 줄였다.
단계 표지 `1)`~`5)`·`4b)`~`4f)` 는 initial-pass 의 판정을 승계해 시나리오 포인터를 든 1줄로 남겼다. 유지 25줄 중
판단 분기 셋(lede 2줄 · llm-fixtures 선행 2줄 · 전제 도구 1줄)은 패스 문서에 적었다. `mock-exception:` 3줄은 바이트
무접촉이다. 이 패스는 원장 행을 신설하지 않고, `deploy/overlays/prod/pvc.yaml` 행에 **파일 소멸**(#92) 만 적었다 —
`batch-pvc.yaml`(행 남음 9 → 실측 7, 내용 교체)·`deploy/overlays/prod/kustomization.yaml`(20 → 23) 은 복원처 묶음이
달라 재판정 후보로 넘긴다(패스 문서 「판정하지 않은 것」).

trend-rejudge-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선」으로 이름 붙인 **`Trend.tsx`·`tokens.css`·`Trend.test.tsx`
세 파일의 증가분 86줄**(47→89 · 38→61 · 25→46)만 판정했다. 86줄 중 **51줄을 지웠다**(34 · 1 · 16). 감지 단계는 이 묶음의
복원처를 「목업 `JRN-axis-contrast.html` · 트래커 `STP-verify-in-trend` 행 · PR #91」 하나로 예상했으나, 실측한 증가분은
**세 착지의 합**이다 — #85(겹쳐 보기 opt-in, 23줄) · #87(복원 조건 수명 `localStorage`, 17줄) · #91(온도차 판별 폼, 26줄) —
그리고 `tokens.css` 의 23줄은 **아홉 PR·여섯 화면**의 구획 주석이라 trend 묶음이 아니다(#45·#53·#66·#70·#76·#80·#84·#85·#91).
그래서 제거의 주인도 셋이다: #85 분은 `drawnSeries()`·체크박스 JSX(경로 ①)와 설계 트래커 「해소된 등재」 #85 행(②),
#87 분은 `Dashboard.tsx` 의 `BRIEF_KEY` 앞 주석(설명의 주인)과 트래커 #87 행, #91 분은 트래커 #91 행과 PR #91 「왜 항상
그리나」 절(③)이 **축자**로 복원한다. `tokens.css` 는 첫 줄(구획 앵커·목업 대응 규칙)을 전부 남기고, 아홉 블록이 되풀이한
규칙 5 게이트의 **메커니즘 문장**(「이름을 들이면 규칙 5 가 선언 단위로 대조하기 시작하는데 세 상한이 전부 0 이라 대조면이
움직인다」 — 설계 트래커 「규칙 3·4(네비)·5 기계 판정」 절이 주인, `Trend.tsx` 의 `.trend-sl-` 가드 2줄이 이미 그 짧은 꼴)만
걷었다 — 지문은 블록 주석의 첫 줄만 세므로 이 정정은 계수에 **−1**(`.raw-flag` 1줄 제거)로만 보인다. 테스트 쪽은 구현 주석의
사본(스케일·색 불변 · 저장소 수명)과 트래커 행을 이름으로 지목한 문장(「등재된 편차」·「트래커 행의 약속」), 단정 나레이션을
걷고, 추림 테스트와 같은 꼴의 배너 지목·폼 분리·조사 핀은 유지했다. 판단 분기 넷(`Trend.tsx` `으로 판별했습니다` 조사 핀 ·
`Trend.test.tsx` 같은 핀 · `.trend-ov-form` 간격 주석 · `.dash-brief-empty` 문면 분기)은 패스 문서에 적었다. 이 패스는
원장 행을 신설하지 않는다(세 행 갱신). `Trend.tsx` 머리 4줄을 걷어 「deliberately *not* here」 블록이 12~23행에서 **7~18행**으로
올라갔다 — 설계 트래커가 인용하는 `Trend.tsx:8-21` 은 #81 이 import 를 더한 시점부터 이미 11~22행이었으므로(이 패스가 처음
깨뜨린 자물쇠가 아니다) 트래커 쪽 정정은 그 행의 소유자(mockup-render 모델)에게 넘긴다(패스 문서 「판정하지 않은 것」).

reprocess-surface-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선」으로 이름 붙인 **#94 묶음 8파일 152줄**(⑴ 행이 없던 신설
`reprocess.go` 69 · `Reprocess.tsx` 33 · `reprocess_test.go` 22 · `Reprocess.test.tsx` 16 + ⑵ 기존 `types.ts`·`handlers.go`·`client.ts`·
`tokens.css` 의 #94 증가분 5·3·3·1)을 겨눴고, 그중 **90줄을 판정해 16줄을 지웠다**(`reprocess.go` 13 · `Reprocess.test.tsx` 2 · `types.ts` 1).
**나머지 62줄은 판정하지 않았다(보류)** — 판정을 마치고 PR 을 여는 사이 자매 **#97(docs-impl 슬라이스 10 후반부)** 이 열려 이 묶음 7파일을
수정 중이었고(`git merge-tree` 로 재보니 첫 판 62줄 제거는 4파일에서 충돌), 자매 **#96(mockup-render)** 이 착지하며 설계 트래커에
`Reprocess.tsx:87-124`·`:240-241`·`:295-302`·`:364-372`·`:375-402` 다섯 줄 번호 자물쇠를 새로 걸었다(`:240-241` 은 지우려던 예상 소요 주석
그 자체). 앞선 패스들의 두 규약 — 열린 PR 이 수정 중인 파일은 뺀다(scenario-spec-pass · unrowed-files-pass · lineage-surface-pass), 트래커가
줄 번호로 인용하는 자리는 뺀다(serving-handlers-pass · web-api-view-pass) — 와 dashboard-surface-pass 의 「헝크가 겹치지 않으면 착지 순서와
무관하다」를 함께 적용해 **헝크 단위로** 뺐다: `Reprocess.tsx` 는 파일째(⑴ 에 남는다, 행 없음) · `reprocess.go` 머리 25(#97 이 「the triggering
itself is the POST side in reprocess_trigger.go」로 갈아 쓴다) · `handlers.go` #94 분 3(패키지 주석·`now` doc — 행 무접촉, ⑵ 에 남는다) ·
`types.ts` `trigger` JSDoc 1. 그 62줄은 #97 이 착지하면 어차피 다른 문장이 되고(#96 의 자물쇠도 #97 의 머리 헝크가 함께 민다), 판정한
90줄은 #97 이 손대지 않아 어느 순서로 착지해도 낡지 않는다(이 PR ↔ #97 자동 병합 충돌 0). 뺀 줄 중 26줄(`reprocess.go` 머리 · `types.ts` 1)은
이 패스가 행을 준 파일 안이라 ⑴⑵ 에 잡히지 않으므로 행 비고와 말미의 「보류」 목록이 추적처다(pin-guard-pass 의 「이 패스가 판정하지
않은 주석」 규약) — #97 이 그 줄을 다시 쓰면 파일이 자라 ⑵ 가 어차피 발화한다. 지운 16줄의 복원처는 감지가 예상한 문서(doc-tracker 착지
행·트래커·PR #94)보다 **같은 묶음 안의 다른 파일 주석**이 많았다: `Reprocess.test.tsx`·`types.ts` 가 `client.ts`·Go 구현 doc(`throughput`)을
사본으로 되풀이했고(「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」, 주인은 값을 계산하는 구현 쪽 — web-api-view-pass 의 `types.ts` ←
`handlers.go` 판단), `ThroughputPerMinute` 필드 doc ↔ `throughput` 함수 doc 은 한 파일 안의 두 벌이었다(serving-handlers-pass 의 `latestBucket`
처분). `client.ts` 의 「The selection is server-side」 3줄은 web-api-view-pass 가 `sentiment` 의 「not a client-side filter」를 판단 분기로 둔 것과
같은 유형이라 남기고 그 사본(`Reprocess.test.tsx` 머리 2줄)을 지웠다. `tokens.css` 의 `PAT-before-after` 구획은 첫 줄(`markers()` 자물쇠)을
남기고 붙은 산문만 걷었다(정정 1블록, 지문 −0). 테스트 파일 `reprocess_test.go` 는 22줄 전량 유지(`handlers_test.go` 와 같은 판정). 판단 분기
둘(`reprocess.go` `versionsOf` 의 기본 목표 근거 · `client.ts` 3줄)은 패스 문서에 적었다. 이 패스는 원장 행을 **3개 신설**하고 3행을
갱신했다(126 → 129). 설계 트래커의 `handlers.go:34`·`:30-37` 인용은 #94 가 4줄을 더한 시점부터 이미 낡아 있다(`Register` 30 → 35행) —
트래커 쪽 정정은 그 행의 소유자(mockup-render 모델) 몫이다.

reprocess-trigger-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음」으로 이름 붙인 묶음(⑴ 9파일 145 + ⑵ 의 #97 분 69 +
보류 26) 가운데 **서빙→Argo 제출 경로의 백엔드 10파일 158줄**(신설 `argo.go`·`reprocess_trigger.go`·`reprocess_trigger_test.go`·
`rbac.yaml` 82 · 보류였던 `reprocess.go` 머리 20 · ⑵ 의 `workflow-template.yaml`·`handlers.go`·`store.go`·`deployment.yaml`·`main.go`
증가분 42 + 앞서 자라 있던 5)만 판정해 **47줄을 지웠다**. 감지 단계는 이 묶음의 복원처를 doc-tracker 슬라이스 10 후반부 착지 항목으로
예상했고 그 경로 ②는 실제로 축자 성립하지만, 지운 줄의 대부분은 문서 사본이 아니라 **같은 착지 안 여덟 자리에 되풀이된 같은
이야기**(「서빙은 레이크를 쓰지 않는다 · 세 단계는 Workflow 하나씩 · `trigger.available` 은 프로브」)였다 — 그래서 이 패스의 첫 판단은
**주인 정하기**다: 「무엇을 일으키고 왜 서빙이 쓰지 않는가」는 그 POST 를 처리하는 `reprocess_trigger.go` 머리, 「프로브가 무엇을
증명하는가」는 그 프로브를 수행하는 `argo.TemplateReachable` doc, 「기록된 결정이 서빙 버전을 이름한다」는 그 타입
`store.ReprocessDecision` doc 이 주인이고, `argo.go` 패키지 주석·`handlers.go` 머리와 `argo` 필드·`main.go`·`rbac.yaml` 머리·
`deployment.yaml`·`workflow-template.yaml` 머리의 사본은 포인터 1줄이나 무주석으로 줄였다(「다른 파일 주석의 재진술 — 설명의 주인에만
둔다」; web 쪽 사본 `ReprocessTrigger.tsx`·`Reprocess.tsx` 머리·`client.ts`·`types.ts`·`Reprocess.test.tsx` 는 다음 패스). `reprocess.go`
머리의 「What this endpoint answers」 목록 12줄은 같은 파일 함수 doc 이 항목마다 주인인 **한 파일 안의 두 벌**이다(serving-handlers-pass
의 `latestBucket` 처분). 매니페스트는 감지의 예측대로 **파라미터 계약**(`arguments.parameters` 기본값 · `sample` 0/양수 · 재시도
안전성과 exit 2 · 온도 주석)은 남았고, 권한 **사유**는 doc-tracker ⑷ 와 `reprocess_trigger.go` 머리가 축자 복원해 포인터로 줄었다.
web 6파일 74줄을 이번에 뺀 것은 주인을 먼저 정해야 사본 판정이 서기 때문이고, #96 이 `Reprocess.tsx` 에 건 자물쇠 다섯은 #97 의 머리
헝크로 **이미 낡아**(33→28) 재핀이 트래커 소유자(mockup-render, `rct_20260921-0006` assessing 중) 몫이라 그 task 와 같은 파일을 만들지
않기 위해서다. 이 패스는 원장 행을 **4개 신설**하고 6행을 갱신했다(129 → 133). `handlers.go` 의 제거 4줄이 전부 `Register` 위라 설계
트래커의 `handlers.go:34`·`:30-37` 인용(#94 부터 낡음)은 더 밀렸다(`Register` 45행) — 재핀은 그 행의 소유자 몫이다.

reprocess-console-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음의 web 6파일 74줄」로 이름 붙인 그 묶음(⑴ 행이 없던
`ReprocessTrigger.tsx` 23 · `Reprocess.tsx` 28 + ⑵ `Reprocess.test.tsx`·`client.ts`·`types.ts`·`tokens.css` 의 #97 증가분 22 + 보류 `types.ts` 1)만
판정해 **31줄을 지웠다**(12 · 10 · 2 · 3 · 4 · 0). 착수 조건(mockup-render 의 열린 task 가 `Reprocess*.tsx` 를 수정 중인가)은 음성 — 그 task 의 PR #100
은 트래커·목업 인덱스 두 파일뿐이고 이 패스가 시작하기 전 `ca0554d` 로 착지했다. 지운 줄의 첫 겹은 예측대로 **직전 패스가 정한 주인의 사본**이다
(`ReprocessTrigger.tsx`·`Reprocess.tsx` 머리의 한국어 문단 ↔ `reprocess_trigger.go` 머리의 영어 원본 · `types.ts` 필드 JSDoc ↔ `argo.TemplateReachable`·
`Note`·`ServingVersion`·`argo.List` doc · `client.ts`·`Reprocess.test.tsx` 나레이션). 둘째 겹은 **web 안의 주인**이다 — 「런이 끝나면 읽기 절반을 다시
센다」가 세 벌(prop doc · 폴링 effect · `reload` 상태)이라 계약이 사는 prop doc 만 남겼고, `Reprocess.tsx` 앵커 넷(`CMP-seg`·`CMP-table`·`CMP-note`·
`PAT-before-after`)에 붙은 산문은 `client.ts:70-72`·`bucketsOf` doc·`reprocess_trigger.go` 머리·`compareRow` doc 의 사본이라 앵커만 남겼다(지문 −0).
셋째 겹은 복원 경로 ②③ 이 **축자**인 자리 — 「덮어쓰기 토글 없음(병존이 구조)」·「소스 목록은 필터와 무관」·「보류 몫은 비율에 섞지 않는다」·
「비교 불가 ≠ 데이터 없음」·「결정 이력은 제품 안에 남는다」는 doc-tracker 슬라이스 10 후반부 ⑴⑵⑸ · 설계 트래커 `reprocess` 행 · PR #97 본문 ·
Go 필드 doc 이 같은 문장으로 적는다. **보류 1줄(`types.ts` `trigger` JSDoc)은 #97 이 필드를 갈며 이미 없앴다** — 새로 든 6줄(순증 5)을 이 패스가
판정했고 보류 목록은 0 이 된다. 판단 분기 넷(주목 임계 상태 2줄 · 예상 소요 주석 2줄 — 설계 트래커 L483 이 **주석 자체를 출처로 인용**해 실체를 남김 ·
`client.ts` 빈 catch 주석 — eslint recommended `no-empty` 가 읽는다 · `types.ts` 요약의 「the last one names …」 절 — 1줄 요약 규칙)은 패스 문서에 적었다.
이 패스는 원장 행을 **2개 신설**하고 4행을 갱신했다(133 → 135). `Reprocess.tsx` 머리 6줄과 본문 4줄을 걷어 설계 트래커의 자물쇠 다섯(`:87-124`·
`:240-241`·`:295-302`·`:364-372`·`:375-402`)은 더 밀렸다 — 이 패스 뒤 실체의 좌표(75~114 · 225~226 · 279~297 · 344~351 · 358~383)는 패스 문서
「판정하지 않은 것」에 있고, 재핀은 그 행의 소유자(mockup-render) 몫이다.

reprocess-python-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 #97 묶음의 python 5파일 24줄」로 이름 붙인 그 묶음(⑴ 행이 없던
`test_silver.py` 7 · `storage.py` 3 · `test_serving_version.py` 2 + ⑵ `cli.py` 7→16 · `test_cli.py` 5→8 의 증가분 12)만 겨눴고 **11줄을 지웠다**
(0 · 3 · 0 · 8 · 0). **기준 커밋은 감지 시점 `b19905f` 가 아니라 `52fba9f`(#102 착지 tip)다** — #102 가 `Reprocess.test.tsx` 에 주석 2줄을
들여 전체 지문이 2540 → 2542 로 먼저 움직였기 때문이고(5파일 자체는 #102 무접촉이라 판정 대상은 움직이지 않았다), 말미 집계는 그 tip 에서
재측정했다. ⑵ 두 파일은 **증가분만이 아니라 파일 전체(16 + 8)를 재판정**했다 — #97 이 `cli.py` 의 주석 3줄(그중 2줄은 initial-pass 가 판정한 것)을 갈아 썼기
때문에(+8/−3 — `git diff f7e2338~1 f7e2338` 의 주석 줄 대조) 행의 비고가 열거하는 줄과 실측이 이미 어긋나 있었고, 「행의 `남음` 은 그 행의
비고가 열거로 해명하는 줄 수와 같아야 한다」(trend-surface-pass · serving-handlers-pass 가 못박은 불변식)를 지키려면 숫자만 갈아끼울 수
없다. 지운 줄의 첫 겹은 **저장소 문서가 축자로 적은 자리**(경로 ②) — `storage.py` 의 원자적 교체 사유 3줄은 doc-tracker 2026-09 의
슬라이스 9(「`write_records` 가 truncate+write 라 집계가 Gold 를 다시 쓰는 수 초 동안 동시 요청이 잘린 줄을 읽을 수 있다 — 원자적 교체」)와
슬라이스 10 후반부 ⑴(「임시 파일 → `os.replace` 라 서빙이 쓰는 도중의 잘린 줄을 읽지 않는다」)이 문제와 처방을 다 적고 PR #97 본문 1항이
되풀이하며, 바로 아래 `os.replace(staging, target)` 이 메커니즘의 주인이다; `cli.py` 의 「전 레이크 실행은 대체된 버전을 걷되 결정이 서빙 중인
버전은 남긴다(다음 매시간 실행이 지우면 Gold 가 잃는다)」 2줄과 「재개 = 목표 버전이 이미 덮은 것이 체크포인트」 1줄은 doc-tracker ⑴⑶ ·
PR #97 본문 1·3항이 같은 문장으로 적고 `store_analyses` docstring(`keep_versions` = the serving version)과 테스트 이름
(`test_scoped_run_skips_records_already_at_the_target_version`)이 코드 쪽 주인이다. 둘째 겹은 **다른 파일 주석의 재진술** —
응답 캐시 머리 3줄(「매시간 주기는 대체로 같은 기사를 다시 관측하므로 새로 든 것만 모델에 닿는다」)은 `llm.reply_cache_key` docstring 이
같은 문장으로 적는 주인이고, 「빈 쓰기도 데이터셋을 정리한다(Bronze 가 버린 행을 걷는다)」 1줄은 `store_analyses` docstring 「pruned counts
rows dropped because their Bronze record is gone」 이 주인이다. 셋째는 **PRD 재진술** — 「본문은 content-addressed 저장소에 한 번, 관측은
해시로 참조(AC1.4, AC1.7)」 1줄은 initial-pass 가 유지했던 줄이나 PRD ingestion AC1.4(「관측 레코드가 본문 해시(`body_hash`)로 본문을
참조한다」)·AC1.7(「본문 저장소에는 버전당 정확히 1건」)이 축자 원본이고 `bodies = {b["body_hash"]: …}` 가 코드 쪽 주인이라 이번에
뒤집었다. **유지 25줄**: 테스트 3파일 17줄은 전량 — 각 줄이 바로 아래 단언이 **왜 그 값인지**를 든다(`(written, pruned) == (3, 0)` 이 「병존」이고
`(3, 1)` 이 「서빙 중인 v2 는 남고 v1 만 걷힌다」인 것은 이름·숫자만으로 복원되지 않는다; dashboard-surface-pass 의 `Sentiment.test`·
`Fairness.test` 처분과 같다). `cli.py` 8줄은 `#:` 속성 doc 2(유지 대상) · 표본 시드 1(「재개된 표본이 같은 레코드를 뽑도록 런 자신의 신원으로
시드한다」 — doc-tracker ⑶ · PR #97 3항 · 여정 §4 어디에도 없는 유일 지식) · 전송 먼저 구축 2(initial-pass 승계 — `#:` doc 은 결과「nothing was
read」만 적고 `open_store` 앞에 두는 순서의 이유는 여기뿐) · 전량 실패 정지 2(initial-pass 승계 — 「AC2.5 신호를 흐린다」는 근거가 doc-tracker ⑶ ·
`#:` doc · stderr 문면 어디에도 없다) · 캐시 병합 순서 1(판단 분기 — 아래). 판단 분기 1자리(`cli.py` 「모델이 답한 것은 배치가 실패해도 남긴다」 —
전량 실패 시 `new_replies` 가 비어 문면이 헛도는 듯하나 부분 실패 경로의 순서 근거로 읽히고 복원처가 없다)는 패스 문서에 적었다. 이 패스는 원장
행을 **3개 신설**하고 2행을 갱신했다(135 → 138). `storage.py` 는 남음 0 이라 지문 파일 집합에서 빠지지만 **행은 남긴다**(dashboard-surface-pass 의
`Dashboard.tsx` 처분). ⑴ 은 이 패스로 **0** 이 된다 — 원장이 열린 뒤 처음이다.

journey-gate-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 `scripts/check-journey-mockup.py` +23」으로 이름 붙인 그 파일의 **증가분 23줄**
(#47 `e7fbcae` R10·R11 머리 주석 11 · #61 `e75b254` R12 머리·README 스캔 주석 12 — `git blame` 으로 파일 단독 귀속, 나머지 42줄은 `052c112`·`98c3288`·
`2579722` 그대로라 두 PR 이 기존 판정 줄을 갈아 쓰지 않았다)만 겨눴고 **20줄을 지웠다**. 증가분만 판정해도 불변식(행의 「남음」 == 비고가 열거하는 줄 수)이
서는 것은 그 귀속 때문이다 — reprocess-python-pass 의 `cli.py` 와 반대 경우. **기준 커밋은 착지 tip `32e7f09`(#103)** 이며 감지 시점과 같다(2파도 0).
지운 줄의 첫 겹은 **같은 파일 안**(경로 ①) — 머리 docstring 의 `R10`·`R11`·`R12` 항이 세 규칙의 문면(「규칙 7 의 기계화 — 표와 래칫만 갱신하고 산문을
남겨 두 SSOT 가 서로 다른 사실을 말하는 것을 잡는다」·「R10 의 파일 참조판」)을 먼저 적고, 바로 아래 코드가 메커니즘의 주인이다(`if fenced or
line.lstrip().startswith(">")` 가 면제를, `(IDX, idx), (TRACKER, tracker), (JREADME, _jreadme)` 가 README 편입을, `_CURRENT_FORM` 의 세 `startswith`
predicate 가 「구조화된 세 행」을, `for name, pat, want, ctx in CLAIMS` 가 `CLAIMS` 튜플 모양을 말한다). 둘째 겹은 **저장소 문서**(경로 ②) — mockup 인덱스
「서술 절의 숫자 규약(규칙 7 / 게이트 R10)」 문단이 「숫자를 산문에서 추방하지는 않는다 … 대신 낡으면 CI 가 잡는다」·「과거 시점의 수치를 인용할 자리는
인용 블록(`> `)과 코드 펜스」·「두 SSOT 가 같은 사실을 서로 다르게 말하는 상태(rct_20260918-0004)」·「R11 이 … 흡수로 삭제된 화면 파일이 목록에 남거나,
새 여정 페이지가 목록에서 빠지는 것을 잡는다」를 축자로 적는다. 셋째 겹은 **PR 본문**(경로 ③) — #47 이 「R7은 허브 링크의 실재와 매핑 표만 검사하고
서술 절의 사실 정합은 보지 않는다」와 「트래커는 4/6 · 미시각화 3단계, 인덱스는 3/6 · 미시각화 4단계」를, #61 이 「R8 의 링크 추출은 링크 문법만 뽑으므로
인라인 코드를 세지 않는다」·「전수 대조는 36건 … 사료를 위반으로 만들어 문서를 거짓으로 고치게 강제한다 … 현재형 주장만 사는 구조화된 세 행」·「README 는
R10 의 스캔 대상이 아니라 낡은 채 살아남았다 — 4/6→6/6 · 25/30·2·3→30/30·0·0」을 같은 문장으로 적는다(#52 이월·#57 잔존도 #61 이 적는다).
**유지 3줄**은 `# ── R10 ──`·`# ── R11 ──`·`# ── R12 ──` 머리 1줄씩 — initial-pass 가 같은 파일의 `# R3 —`·`# R6 —`·`# R7 —` 를 규칙 문자 추적 앵커로
남긴 것과 같은 꼴이다. 감지 단계는 「무엇이 낡은 채 통과했는가」 서술(R11 2줄 · R12 4줄)을 regression-pass 가 #36 의 4줄을 유지한 선례에 견줘 유지 쪽으로
기울여 넘겼으나, #36 의 4줄은 복원처가 어디에도 없었고 이 6줄은 인덱스·PR 본문이 축자로 적으므로 갈렸다 — 근거는 패스 문서에. 판단 분기 0. 이 패스는 원장
행을 신설하지 않고 1행을 갱신했다(138 그대로). 파일이 45줄 남아 지문 파일 집합은 133 그대로다. **원본 쪽 누락 둘은 고치지 않았다** — 인덱스 :150 이 R10 의
스캔 대상을 「이 문서와 트래커」로만 적어 README(#61) 를 빠뜨렸고, 트래커 :25 가 「정적 R1~R11」로 R12 를 빠뜨렸다. 정책상 원본의 정확성은 이 판정의 표면이
아니고(복원은 docstring·코드·PR 본문으로 이미 닫힌다), `docs/mockups`·트래커를 만지면 자매 `tbm_econ-opinion-monitor-journey-mockup` 의 as-is/to-be 가
움직이므로 그 모델의 몫으로 좌표만 남긴다.

dash-brief-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 dash 묶음 `Dashboard.tsx` +19 · `Dashboard.test.tsx` +12」로
이름 붙인 두 파일의 **증가분 31줄**(전량 #84 `763b8f4` — `git blame` 으로 파일별 계수: `Dashboard.tsx` 19 전량 · `Dashboard.test.tsx`
12, 옛 5줄은 `473b3cc` 그대로라 #84 가 기존 판정 줄을 갈아 쓰지 않았다)만 겨눴고 **23줄을 지웠다**(13 · 10). **기준 커밋은
#104 착지 tip `0f4f04e`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은 trend-surface-pass 가 본 것과 같다 — **복원처가 같은
커밋 안에서 함께 열렸다**: #84 가 카드를 세우며 PR 본문(③)에 설계 근거를 절마다 적었고(「검색은 받아 둔 목록을 거른다 —
서빙이 검색어를 받지 않으므로 … 목업도 같은 자리에서 `rows()` 의 `indexOf` 로 거른다」·「카드는 응답 바깥에 둔다 — 축을
바꾸면 `data` 가 잠시 비는데 …」·「5칸으로 두면 격자에 7칸이 빈 채 혼자 남아 col-12」·「끈 선택 자체는 기억한다(잊으면 매번
다시 꺼야 한다)」), 같은 커밋이 설계 트래커 「해소된 등재」 #84 행과 doc-tracker 2026-09 변동 이력 행에 같은 사실을 산문으로
옮겼으며(②), 여정 문서 §4 표가 「중도 이탈 → 다음 진입 시 마지막 조회 조건 복원 | `STP-open-brief`」를 한 행에 적는다(②).
테스트 쪽 9줄은 테스트 이름 일곱(`… without re-querying serving`·`… instead of claiming there is no data`·`… across a closed tab`·
`… but remembers that choice`)과 단언이 복원한다(①, trend-rejudge-pass 의 「나레이션」 처분). `readStoredBrief`·`storeBrief` 의
catch 2줄은 `Trend.tsx` 의 같은 자리(#80 `aca481c`, trend-surface-pass 유지)와 **바이트 동일한 사본**이라 첫째는 지우고 둘째는
`eslint` `no-empty` 가 빈 블록을 잡으므로 주인 지목 포인터로 정정했다(`client.ts` 선례). **유지 8줄**(정정 3 포함) 중 **판단 분기 1**:
`BRIEF_KEY` 앞 수명 근거 3줄은 PR #84·doc-tracker·트래커 #84/#87 행이 축자로 적어 복원되나, `Trend.tsx:81-82` 가 이 주석을
이름으로 「근거의 주인」이라 지목하고 trend-rejudge-pass 가 그 전제로 `Trend.tsx` 쪽을 2줄로 줄였으므로 지우면 그 포인터가
없는 것을 가리키는 거짓 주석이 된다 — `Trend.tsx` 는 이 패스의 표적 밖이라 **남기고**, web 묶음이 두 파일을 함께 열 때
포인터를 트래커 #87 행으로 옮기며 한 번에 처분한다. 나머지 유지는 `STP-open-brief` 앵커 1(뒤 문단 둘은 트래커 「기간·단위
컨트롤」 행·PR 본문이 복원해 걷음, 지문 −0) · 「대소문자를 구분하는 것까지 목업과 같다」 1(의도된 목업 동등성은 어느 문서에도
없다) · `afterEach` 하네스 사실 1 · 카드 문면 편집 가드 1. 이 패스는 행을 신설하지 않고 2행을 갱신했다(138 그대로). ⑴ 의
`scripts/check-data-format-change.py` 10줄은 복원처(PR #75 · 같은 파일 docstring)가 다른 묶음이라 넣지 않았다 — 말미 집계의
조건절을 착지 tip 실측값으로 고쳐 다음 선에 둔다.

rollup-test-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 `python/packages/aggregation/tests/test_aggregate.py` +18」로
이름 붙인 한 파일의 **증가분 18줄**(`git blame` 계수: #38 `33e24ea` 5 · #62 `32faf64` 13, 옛 1줄 `bb1b56b` 은 두 PR 이 갈아 쓰지
않았다)만 겨눴고 **12줄을 지웠다**. **기준 커밋은 #105 착지 tip `1f508e1`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은
dash-brief-pass 와 다르다 — 복원처의 주인이 PR 본문이 아니라 **집계 구현 자신의 모듈 docstring**(`aggregate.py:16-30`, #38·#62 가
같은 커밋으로 쓴 것)이고, PR #38·#62 본문(③)과 doc-tracker AC3.3 착지 문단(②, 검증 좌표로 이 파일의 두 테스트 이름을 적는다)이
같은 문장을 옮겼다 — 테스트 주석은 그 넷째 사본이었다: 첫 버킷의 delta 0.0·단일점 spark(`:69`) · 일=시간 합·주=일 합·전 레코드
계상(`:164`·`:168`·`:172` — 단언 바로 위에서 단언을 산문으로 되풀이) · ISO 주 라벨(`:135`, `_bucket` docstring 이 주인) · finest
first 서술(`:149`) · 코퍼스의 달력 사실(`:108-109` — 단언 `_bucket(…, "week") == "2026-W26"`/`"2026-W27"` · `weeks[W26] == days[23] +
days[28]` 이 그대로 적는다). `# ── AC3.3 rollups ──` 구분선(`:103`)은 journey-gate-pass 의 `# ── R10 ──` 유지와 갈렸다 — 그쪽은
복원처 없음이었고 여기는 doc-tracker 가 AC3.3 좌표로 이 파일의 롤업 테스트를 이름 붙인다. **정정 3자리**(2→1 · 7→2 · 2→1)는
「왜 그 모양으로 단언하는지」만 남겼다 — 이진 분수 코퍼스라 반올림 없이 단언한다 · 두 경계(일 안의 두 시간·주 경계)를 일부러
걸친 코퍼스 · finest first 인 이유(첫 단위에서 멈추는 독자가 기본 단위를 받는다). **유지 6줄** 중 **판단 분기 1**: 인라인 AC 태그가
붙은 서술 2줄(`:73` `%p (AC3.3)` · `:78` `raw_count (AC3.8)`)은 서술은 복원되나 태그가 잇는 귀속이 doc-tracker·PRD 어디에도
없어, 같은 파일 `:98` `(AC3.4)` 의 initial-pass 판정과 aggregation-harness-pass·lineage-rejudge-pass 의 인라인 태그 승계대로
남긴다. 이 패스는 행을 신설하지 않고 1행을 갱신했다(138 그대로). ⑴ 의 `scripts/check-data-format-change.py` 10줄은 dash-brief-pass
와 같은 이유로 넣지 않았다.

sentiment-split-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑴ `scripts/check-data-format-change.py` 10줄 또는 ⑵ 최대
`web/src/screens/Sentiment.tsx` +17 · `Sentiment.test.tsx` +10」로 이름 붙인 두 후보 중 **⑵ 묶음의 증가분 27줄**(전부 #76 `9a5d32e` 단일
커밋분, 옛 54 + 21 줄 무접촉)만 겨눴고 **23줄을 지웠다**. **기준 커밋은 #106 착지 tip `3205cb5`** = 감지 시점(2파도 0 · 열린 PR 0). 복원처는
dash-brief-pass 형 — #76 이 설계 트래커 「등재된 편차」 5행을 닫는 슬라이스라 「왜 이 컨트롤이 이렇게 서는지」를 PR 본문(③)·트래커 해소 행
`:496`·`:497`(②)·doc-tracker `:735`(②)가 한 문단씩 적었고, 화면 주석은 그 사본이었다: 분리 전후 비율 JSX 블록(「전환할 두 형태가 이미 이
화면 안에 다 있다 … API 를 다시 부르지도, 없는 값을 지어내지도 않는다」 — PR 본문 축자) · `STP-confirm-cause` 이탈 카드 블록(「`data-goto` 를
단 둘은 여정 워크스루 진행 장치라 제품 표면이 아니고」 — 트래커 `:497`·`:292` 가 문장째) · `na-exclude` 기본값(목업 `checked` · 트래커
「목업의 `checked` 를 따른다」) · 테스트의 단언 바로 위 산문 4줄과 허위 컨트롤 머리 3줄(트래커 `:496` 「허위 컨트롤이 아님은 `Sentiment.test.tsx`
의 분모 전환 단정이 잠근다」 · 테스트 이름) · `splitShares` 선언 재진술 1. **정정 2자리**(JSDoc 6→1 · 8→1)는 「데이터 계약의 비자명한 성질」과
「주인 지목 포인터」만 남겼다 — 되짚은 미분석 건수가 Gold 의 비율 반올림 때문에 1건 범위에서 어긋날 수 있다는 것(`Math.max(0, …)` 의 이유) ·
`SplitRatios` 가 여정 2단계의 논점을 그린다는 요약 1줄. **유지 4줄** 중 테스트 2줄은 하네스 사실(`Link` 는 라우터 밖에서 던진다 — 다른 화면
테스트 어디에도 없다)과 공허 통과 방지 단언의 이유. 실행 코드 무접촉은 `typescript.transpileModule(removeComments)` 출력 바이트 동일로
확인했다. 이 패스는 행을 신설하지 않고 2행을 갱신했다(138 그대로). **⑴ 을 고르지 않은 새 이유**: `main` ruleset 이 `review/manual-approval`
을 필수 status 로 요구하고, 그 status 는 `check-data-format-change.py` 가 `format_changed=false` 일 때만 붙는데 그 스크립트의 `SENSITIVE_PATHS`
에 스크립트 자신이 있다 — 주석만 고쳐도 PR 이 사람 리뷰 뒤로 간다(#75 자신이 사람 머지). 무인 패스가 스스로 status 를 붙이는 것은 게이트의
존재 이유를 어기므로 ⑴ 은 **사람 몫의 패스**로 넘긴다(패스 문서 「판단이 갈린 자리」 3).

trend-spec-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ 최대 `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` +13」으로
이름 붙인 한 파일의 **증가분 13줄**(`git blame` 계수: #79 `82ceba2` 5 · #85 `c887503` 11 — #85 가 옛 한 줄짜리 셋을 갈아 썼으므로 물리 16 = 증가 13 +
옛 3)만 겨눴고 **10줄을 지웠다**. **기준 커밋은 #107 착지 tip `775efcb`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은 두 패스와 또 다르다 —
복원처의 주인이 **같은 파일의 머리**(`:10-12` 상수 금지·같은 응답 대조 · `:23-25` 공유 픽스처 단일 버킷)와 **단언 문면·메시지 자신**(`toHaveCount(1)` ·
「겹쳐 보기를 켜지 않았는데 선이 여럿 그려졌다」)이고, 설계 트래커 `:414`(표 = 대상 선택기 등재 행)·`:501`·`:505`(해소 행)와 PR #79·#85 본문이
같은 문장을 옮겼다 — 단언 바로 위의 산문은 그 사본이었다(`Trend.tsx:224` JSX 주석이 opt-in 의 주인). **정정 4자리**(4→1 · 3→1 · 3→1 · 3→1)와
옛 줄 복원 1(2→1)은 「관측되지 않는 것의 경계」(이 단언은 컬럼 자리와 값의 대응만 지킨다)와 「단언의 존재 이유」(빠지면 항상-겹침 회귀가 통과 ·
표·차트 집합 일치)만 남겼다. **유지 6줄** 중 **판단 분기 1**: 지역 헬퍼 `windowMean` 의 JSDoc 1줄 — 이웃 `parsePoints`·`baselineY` 의 1줄 JSDoc 을
scenario-spec-pass 가 유지했고 뒷절(화면과 같은 계산·같은 순서)이 관측 설계라 `SplitRatios` 선례대로 남긴다. 실행 코드 무접촉은
`typescript.transpileModule(removeComments)` 출력 바이트 동일로 확인했다. 이 패스는 행을 신설하지 않고 1행을 갱신했다(138 그대로).
같은 디렉터리의 다음 후보 `ac3-8-normalized-ratio.spec.ts` +9 는 #66(fairness) 묶음이라 섞지 않았다(패스 문서 「판단이 갈린 자리」 3).

fairness-spec-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ 최대 `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` +9」로
이름 붙인 한 파일의 **증가분 9줄**(`git blame` 전량 #66 `ddaef4f` — fairness 슬라이스 8 이 세 번째 test 를 확장하며 들였고 옛 22줄은 한 줄도
갈아 쓰지 않았다)만 겨눴고 **5줄을 지웠다**. **기준 커밋은 #108 착지 tip `7376e37`** = 감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은
**같은 파일 안의 두 벌**이다 — #66 은 머리의 단언 목록에 4) 를 더하고 세 번째 test 위와 안에 그 4) 를 다시 적었다(「설명의 주인에만
둔다」를 한 파일 안에 적용 — serving-handlers-pass 의 `latestBucket` 두 벌과 같은 처분). 주인은 머리 목록(initial-pass 가 「AC 검증 방법
인용과 그에 따른 단언 설계」로 유지한 자리)이고, test 머리 2줄은 `Fairness.tsx:8-12`·트래커 「대비 표 컬럼 구성」 행·doc-tracker 슬라이스 8
절·test 제목이, test 안의 3줄은 바로 아래 단언 문면(`원시 N건`/`%` · `.norm-flag`/`fair-on` · `click()` 뒤 `.raw-flag`)이 복원한다.
**정정 2자리(줄 수 불변)**: 머리 `:7` 「세 가지를 단언한다」는 #66 이 4) 를 더한 순간 거짓이 됐는데 아무도 고치지 않았다 — 개수 없는 문면으로
고쳤다(증가분 밖이지만 거짓을 만든 것이 이 증가분이다); 4) 의 괄호 「슬라이스 8에서 화면이 붙으며 추가」는 작업 흔적이라 걷었다.
**유지 4줄** 중 판단 분기 2: 머리 4) 2줄(test 제목이 복원하지만 1)~3) 과 같은 목록이라 같은 판정에 둔다) · 전환 단언 위 1줄(2→1 —
「누르면 실제로 달라지는 컨트롤이라야 「정규화 적용 여부가 드러난다」가 성립한다」: AC 검증 방법 문면과 클릭 단언을 잇는 유일한 문장,
「허위 컨트롤이 아니다」의 주인 `Fairness.tsx:110-112` 는 화면의 성질을 말한다). 나머지 1줄(기대값을 서빙 응답에서 유도)은 `ac3-6:6`·
`ac3-7:15`·`aggregation-5:10-12` 가 파일마다 적는 관측 설계 관례라 유지. 실행 코드 무접촉은 `typescript.transpileModule(removeComments)`
출력 바이트 동일(51줄)로 확인했다. 이 패스는 행을 신설하지 않고 1행을 갱신했다(138 그대로). 다음 선은 ⑵ `aggregate.py` +4 ·
`test_llm.py` +4(python 묶음).

unit-cache-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ 최대 `aggregate.py` +4 · `test_llm.py` +4(python 묶음)」로
이름 붙인 두 파일의 **증가분 8줄**(`git blame`: `aggregate.py` +4 전량 #62 `32faf64` · `test_llm.py` +4 전량 #73 `9fbec58` — 두 PR 모두
옛 줄을 갈아 쓰지 않아 행의 「남음」과 blame 의 옛 줄이 일치한다)만 겨눴고 **6줄을 지웠다**. **기준 커밋은 #109 착지 tip `ba7b704`** =
감지 시점(2파도 0 · 열린 PR 0). 지운 줄의 특징은 rollup-test-pass 와 같다 — 복원처의 주인이 **같은 패키지의 구현 docstring**(`aggregate.py`
모듈 docstring `:22` 「the hour is the default unit」·`_all_units` docstring `:193`·`:200` 「finest first」, `llm.py` `http_completer`
docstring `:139-142` GPT-5.x 400 · `reply_cache_key` docstring `:296-300` 캐시 키가 바뀌는 네 경우)이고 README 「Silver」 캐시 항(②)과
PR #62·#73 본문(③)이 같은 문장을 옮겼다: 상수 위 기본 단위·finest first 서술 2(`aggregate.py:41-42` — 상수 이름·값·시그니처 기본값이
코드로 적는다) · temperature 생략 이유 1(`test_llm.py:240`) · 캐시 히트 서술 1(`:280` — 바로 아래 세 단언의 문면) · 재호출 조건 2(`:293`·`:297`).
**유지 2줄**: `aggregate.py:66-67` ISO 주 번호 연도가 달력 연도와 갈리는 날들 — `iso[0]` 을 쓰는 이유는 docstring·PR 어디에도 없고
rollup-test-pass 가 `test_aggregate.py` 의 ISO 주 서술을 지우며 이 자리를 주인으로 지목했다. **판단 분기 0** — 지운 `:293`·`:297` 의 인라인
AC 태그(`(AC1.7)`·`(AC2.6)`)는 rollup-test-pass 가 `test_aggregate.py` 의 태그를 남긴 판별식(「태그가 잇는 귀속이 어디에도 없다」)의 값이
달라서다: `reply_cache_key`·`analyze_llm` docstring 과 README·PR #73 본문이 태그까지 축자로 적는다(패스 문서 「판단이 갈린 자리」 1).
실행 코드 무접촉은 두 파일의 `ast.dump` 편집 전후 동일 + `pytest` 92 passed 로 확인했다. 이 패스는 행을 신설하지 않고 2행을 갱신했다
(138 그대로). 다음 선은 ⑵ `test_feeds.py` +3(#71) · `deploy/overlays/prod/kustomization.yaml` +3(#92, `deploy/` 몫) 동률.

feed-adapter-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ 최대 `test_feeds.py` +3 · `kustomization.yaml` +3(동률 — python 단독
무인 패스면 `test_feeds.py` 가 선)」으로 이름 붙인 두 후보 중 python 쪽 `python/packages/ingestion/tests/test_feeds.py` 의 **증가분 3줄**
(`git blame`: 옛 21 전량 #7 `9569ca3` · +3 전량 #71 `11b53fee` — 옛 줄을 갈아 쓰지 않아 행의 「남음」과 blame 의 옛 줄이 일치한다)만 겨눴고
**3줄을 전부 지웠다**. **기준 커밋은 #110 착지 tip `00a1eed`** = 감지 시점(2파도 0 · 열린 PR 0). 복원처의 주인은 **같은 패키지의 파서 docstring 과
바로 아래 단언**이다 — `parse_worldbank_news` docstring `feeds.py:225-227` 이 비레코드(`facets`)·URL 없는 레코드 제외와 「조회수가 없어 API 순서가
순위」를 축자로 적고, `FeedConfig` docstring `:66-67` 이 「``limit`` is the per-source top-N cap (AC1.2)」를 태그까지 적으며, 코드 `:243` `or` 폴백 +
`:249` `bool(body)` 와 픽스처의 세 레코드(content · descr 만 · 둘 다 없음)를 펼친 세 단언이 폴백 서술을 적는다; PR #71 본문(③)이 세 문장을
옮겼고 B 의 `(AC1.4)` 는 태그까지 축자다. **유지 0** · **판단 분기 0** — 지운 `:245`·`:257` 의 인라인 AC 태그는 unit-cache-pass E·F 와 같은
판별식 값(귀속이 docstring·PR·PRD·같은 파일 옛 줄 `:87`·`:109` 에 남아 있다)이라 분기로 두지 않았다(패스 문서 「판단이 갈린 자리」 1);
옛 21줄의 `(AC1.x)` 태그(initial-pass 판단 분기)는 증가분 밖이라 재판정하지 않았다. `deploy/` 후보를 고르지 않은 이유는 패스 문서 「판단이
갈린 자리」 3. 실행 코드 무접촉은 `ast.dump` 편집 전후 동일 + `pytest` 92 passed 로 확인했다. 이 패스는 행을 신설하지 않고 1행을 갱신했다
(138 그대로). 다음 선은 ⑵ `deploy/overlays/prod/kustomization.yaml` +3(#92, `deploy/` 몫) 단독 최대 → web 3파일 5.

deploy-overlay-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ 최대 `deploy/overlays/prod/kustomization.yaml` +3 단독(#92 의 내용
교체분이라 `batch-pvc.yaml` 과 함께 `deploy/` 표적 패스에서 본다)」으로 이름 붙인 그 파일의 **#92(`60a8176`) 교체분 8줄**(`git blame`: 옛 줄 15 는
`c4038e2`·`6ef97ca`·`a23c19a` 그대로, `:2-4`·`:17-20`·`:32` 8줄이 #92 — 순증 +3 = 교체 전 5 → 8)만 겨눴고 **3줄을 지웠다**(정정 2자리).
**기준 커밋은 #111 착지 tip `3e8eaf4`** = 감지 시점(2파도 0 · 열린 PR 0). 복원처의 주인은 **같은 오버레이의 `batch-pvc.yaml` 머리와 base
매니페스트**다 — `batch-pvc.yaml:1-3` 이 「the scheduled batch writes Bronze -> Silver -> Gold into it and the serving Pod reads Gold out of it」를
축자로 적고 두 패치의 같은 `claimName: econ-batch-data` 가 「the one claim」 을 값으로 보이며(머리 3줄 → lede 1줄), `deploy/base/deployment.yaml:55`
`readOnly: true` 가 「serving can never touch what the batch is writing」 의 규칙 자체다(1줄 제거); README「배포」`:156-158`·트래커 `:161-166`(②)·
PR #92 본문(③)이 사본이다. **유지 5** — 1줄 라벨 둘(`Swap the data emptyDir for the shared claim` 은 트래커 `2026-09.md:163` 이 `∋` 인용 —
편집 후에도 1회 그대로; `Give the batch workflow the same claim …` 은 initial-pass 승계) + **판단 분기 1**(RWX·배치 Pod 동시 마운트 → `Recreate`
불요 3줄: PR #92 「뒤집을 수 있는 결정」 1 이 복원하나 **이 파일에 없는 op 의 근거**라 `deploy/base/kustomization.yaml` 「No `images:` transformer
here on purpose」 선례를 승계). **`batch-pvc.yaml`(행 남음 9 · 실측 7)은 넣지 않았다** — `check-data-format-change.py:53` `SENSITIVE_PATHS` 의
`deploy/**/*pvc*.yaml` 에 걸려 주석만 고쳐도 `review/manual-approval` 이 붙지 않는 사람 게이트이고, 9→7 은 감소라 잔여 계수 밖이며 #92 가 새로
쓴 7줄은 유지 유형(RWX 근거·efs uid/gid·storageClassName 부재)이라 사람 몫으로 행 비고에만 적었다(패스 문서 「판단이 갈린 자리」 1). 매니페스트
무접촉은 비주석 줄 동일 + `kustomize build deploy/overlays/prod` 편집 전후 바이트 동일(md5 `8b4b55c9`) + `format_changed=false` 로 확인했다.
이 패스는 행을 신설하지 않고 1행을 갱신했다(138 그대로). 다음 선은 ⑵ web 3파일 5(`Fairness.test.tsx` 2 · `Reprocess.test.tsx` 2 · `Compare.tsx` 1).

web-convergence-pass도 표적 패스다 — 직전 패스가 「다음 패스의 선은 ⑵ web 3파일 5(`Fairness.test.tsx` 2 · `Reprocess.test.tsx` 2 · `Compare.tsx` 1 —
동률이라 한 web 패스로 묶는다)」로 이름 붙인 그 묶음만 겨눴다. 세 자리는 전부 **설계 트래커 「구현 수렴 대기」 행을 닫은 슬라이스**가 들인
주석이다(#76 `9a5d32e` 여정 이탈 동선·표기 원칙 note, #102 `52fba9f` 진행 문구) — 감지 인계가 `Fairness.test.tsx` 의 +2 를 `ddaef4f` `:88-89` 로
적었으나 `git blame`·파일별 계수 이력(`ddaef4f` 16 → `9a5d32e` 18)으로 가르면 #66 의 16줄은 unrowed-files-pass 가 전량 유지한 그대로이고 자란
2줄은 #76 이 더한 표기 원칙 테스트 머리 `:121-122` 다. **기준 커밋은 #112 착지 tip `ca2f107`** = 감지 시점(2파도 0 · 열린 PR 0). **5줄 전부를
지웠다**(정정 0 · 판단 분기 0) — 복원처의 주인은 세 자리 모두 **설계 트래커 「해소된 등재 (이력)」 행**(②)이다: `Compare.tsx` 의 JSX 블록(물리 4)은
`:494`·`:495` 가 「목업은 이 카드를 워크스루 단계(`화면 2`)에 두지만 구현의 비교 화면은 단계가 접힌 한 페이지라 배치만 다르다」·「두 대상 모두
`BUILT` 라 어느 쪽도 `Placeholder` 로 보내지 않는다」로 축자 복원하고(sentiment-split-pass 가 같은 PR 의 `Sentiment.tsx` `STP-confirm-cause` 이탈
카드 블록을 걷은 것과 같은 처분), `Fairness.test.tsx` 의 테스트 머리 2줄은 `:498` 「서빙 차단이 없어 **응답 분기 밖**에 둘 수 있었고(데이터가 오기
전에도 선다), 그래서 표기 원칙이 표가 그려지기 전에 읽힌다」가 같은 문장이며(같은 PR 의 `Sentiment.test.tsx:220-221` 처분과 같다), `Reprocess.test.tsx`
의 지역 헬퍼 `subOf` 머리 2줄은 `:512` 머리 「진행 문구 2종 — …(`#s-sample-running`) · …(`#s-running`) ↔ 구현 런 표 배지」 + `:377` 「카드 sub 를
목업 문장으로 바꾸면 되고」 가 주인이고 바로 아래 선택자(`.card-h` → `h3` → `.sub`)와 `ReprocessTrigger.tsx` 의 `isActive(...) ? "표본을 새 로직으로
돌리는 중…"` 자리(①)가 앞절을 말한다(export 아닌 헬퍼라 JSDoc 요약 규칙 밖 — `Sentiment.test.tsx:159` `splitShares` 처분). PR #76·#102 본문(③)이
사본이다. 코드 무접촉은 세 파일의 주석 스트립 후(`typescript` `removeComments` + JSX 변환) 출력 바이트 동일 · `vitest` 56 passed · `tsc -b`·`eslint`
rc=0 · `check-mockup-render.py`·`check-journey-mockup.py` 출력 편집 전후 바이트 동일(블록에 `CMP-*`/`PAT-*` 마커 없음) · `check_scenario_mapping.py`
md5 `9ad08df7` 동일로 확인했다. 이 패스는 행을 신설하지 않고 3행을 갱신했다(138 그대로). **⑵ 가 0 이 되어 무인 패스의 선은 비었다** — 남는 잔여
10 은 전부 ⑴ 사람 몫(`scripts/check-data-format-change.py`)이고 `batch-pvc.yaml` 머리 7 도 사람 몫이다.

phone-media-pass도 표적 패스다 — 직전 패스가 「⑵ 가 0 이라 지문이 다시 자라야 다음 표적이 생긴다」로 닫아 둔 뒤 자매 모델
(`tbm_econ-opinion-monitor-mockup-render` / `rct_20260922-0001`, PR #115 `d6db7fe`)이 `tokens.css` 에 들인 **증가분 1줄(물리 4)**, 폰 폭
`@media (max-width:720px)` 블록의 머리 주석 하나만 판정한다. 그 블록 자신에는 주석이 없고 이 파일의 다른 `@media`(`≤1180px`)도 무주석이라
판정 표면은 이 한 자리뿐이다. 제거 1 — 세 절이 각각 복원된다: 「1180 규칙은 사이드바를 64px 레일로만 접는다 + 12칼럼 격자」는 같은 파일
30줄 위의 그 블록이(①), 증상 진단(「폰 폭에서 캔버스가 ~300px 로 떨어져 랭킹 행 고정 트랙이 대상 이름을 한 글자로 짓눌렀다」)은
**PR #114 본문 「문제」·「원인」 절**이 더 정밀하게(390px · 트랙 `26px 1fr 116px 92px 56px` · `col-4/5` 절반 폭), `Source:` 줄은 PR #115 본문이
축자로(③), 그리고 설계 트래커 「`@media` 표면의 등재 (rct_20260922-0001)」 절과 「등재된 편차」 5행이 같은 내용을 다시 적는다(②). 덧붙여
`(6 pages, byte-identical)` 는 README 가드 조항이 명시 금지한 **개수 표현**이라 목업이 7장이 되는 순간 조용히 거짓이 된다. 감지 인계는
증상 진단 한 문장을 「PR 본문·트래커 어디에도 없다」로 적어 「애매하면 남긴다」 대상(1줄 축약)으로 넘겼으나, 그것은 **#115 만 보고 #114 를
보지 않은 결과**다 — #115 본문이 자기 첫 문단에서 `#114`(`bfb5334`)를 호명하므로 경로 ③ 은 두 PR 을 함께 읽는다. 지문이 편집 후
`d888d2b2…`(= #115 착지 **전** baseline)로 **바이트 동일** 복귀해, 증가분 전량이 이 한 자리였음이 값으로 확인된다. 이 패스는 행을 신설하지
않고 1행을 갱신했다(138 그대로). **⑵ 는 다시 0 이고 무인 패스의 선은 비었다** — 잔여 10 + 7 은 web-convergence-pass 가 적은 그대로 사람 몫이다.

pin-guard-pass는 전수가 아니라 **3파일 표적 재판정**이다(핀 메커니즘을 되풀이한 자리). 줄 수는 그 시점의
풀 전체 값이고, 판정한 것은 세 파일뿐이다. 그 세 파일 안에도 **이 패스가 판정하지 않은 주석**이 있으면
아래 파일별 행의 판정 칸에 그 사실과 추적처를 적는다 — 「각 행은 마지막으로 판정한 패스 기준」 규칙 때문에,
적지 않으면 파일 전체가 판정된 것처럼 읽힌다.
