# 주석 판정 원장

정책 본문은 [`README.md`](README.md), 판정별 근거는 [`passes/`](passes/)에 있다. 이 원장은 **파일 단위**로
판정 전·후 주석 줄 수와 남은 주석의 성격을 적는다. 줄 수는 정책의 추출 규칙(범위·제외 경로·주석 시작 패턴·
기계 판독 주석 제외)으로 센 값이다.

## 읽는 법

- **판정 전** — 해당 패스를 시작한 시점의 주석 줄 수. **제거** — 그 패스가 지운 줄 수. **남음** — 판정 후 줄 수.
- 남음이 0이면 그 파일은 이후 지문에서 빠진다.
- 비고의 "판단 분기"는 애매해서 남긴 것 — 근거는 해당 패스 문서의 「판단이 갈려 남긴 것」.
- 새 주석이 생기면 이 원장의 행은 바뀌지 않는다. 다음 패스가 그 파일을 다시 판정하며 행을 갱신한다.
- 각 행은 그 파일을 **마지막으로 판정한 패스** 기준이며, initial-pass가 아니면 판정 칸 머리에 패스 이름을 적는다.
- 「패스 이력」의 줄 수는 **레포 전체 지문** 값이다. 표적 패스(일부 파일만 재판정)가 실제로 어떤 파일을
  판정했는지는 그 패스 문서에 있다 — 판정하지 않은 파일은 이 원장에 행을 만들지 않는다.

## 패스 이력

| 판정일 | 패스 | 기준 커밋 | 판정 전 | 제거 | 남음 | 파일 수(전→후) |
|---|---|---|---|---|---|---|
| 2026-09-18 | [initial-pass](passes/2026-09-18-initial-pass.md) | `9d6122b` | 776 | 121 | 655 | 62 → 60 |
| 2026-09-18 | [regression-pass](passes/2026-09-18-regression-pass.md) | `a62eae1` | 960 | 7 | 953 | 81 → 80 |
| 2026-09-18 | [pin-guard-pass](passes/2026-09-18-pin-guard-pass.md) | `e29dddd` | 982 | 3 | 979 | 81 → 81 |
| 2026-09-18 | [aggregation-harness-pass](passes/2026-09-18-aggregation-harness-pass.md) | `e7fbcae` | 1317 | 5 | 1312 | 94 → 94 |
| 2026-09-19 | [product-surface-pass](passes/2026-09-19-product-surface-pass.md) | `d4a4cd2` | 1859 | 2 | 1857 | 111 → 111 |
| 2026-09-20 | [batch-harness-pass](passes/2026-09-20-batch-harness-pass.md) | `32faf64` | 1954 | 12 | 1942 | 112 → 112 |

batch-harness-pass도 표적 패스다 — `tests/e2e/k8s/batch/` 의 **아직 행이 없던 18파일**(149줄)만 판정했다.
그 디렉터리의 나머지 한 파일(`feed-double.yaml`)은 aggregation-harness-pass가 이미 판정했으므로,
이 패스 뒤 그 디렉터리는 19파일 전부가 행을 갖는다.

pin-guard-pass는 전수가 아니라 **3파일 표적 재판정**이다(핀 메커니즘을 되풀이한 자리). 줄 수는 그 시점의
풀 전체 값이고, 판정한 것은 세 파일뿐이다. 그 세 파일 안에도 **이 패스가 판정하지 않은 주석**이 있으면
아래 파일별 행의 판정 칸에 그 사실과 추적처를 적는다 — 「각 행은 마지막으로 판정한 패스 기준」 규칙 때문에,
적지 않으면 파일 전체가 판정된 것처럼 읽힌다.

## 파일별 원장

| 파일 | 판정 전 | 제거 | 남음 | 판정 |
|---|---:|---:|---:|---|
| `Makefile` | 18 | 18 | 0 | 전량 제거 — 머리 11줄은 README「디렉터리 구조」「상태」재진술(골격·페이크 서술은 낡음), 18행은 `gen-check` 타깃이 복원, `## ---` 6줄은 구분선(help 파서 `^타깃:.*## `에 걸리지 않는 장식) |
| `contracts/codegen.py` | 23 | 18 | 5 | 구분선 배너 6개(18줄) 제거. 유지: 원시 타입 표 설명, ruff magic-trailing-comma 회피 근거, 드라이버의 `# Python`/`# Go` 절 표지(애매 — 유지) |
| `deploy/base/deployment.yaml` | 11 | 2 | 9 | **pin-guard-pass** — 제거 2줄: `deploy` 브랜치 발행 메커니즘 서술(어디로 발행되는지·무엇을 Flux가 추적하는지·어느 값이 운영값인지 — `.github/workflows/image.yml`과 README「운영 고정(`pin` job)」이 복원). 수기 편집 금지 가드는 **메커니즘 비의존 문면**으로 다시 써 유지. 유지: Gold 부재 시 빈 데이터셋·emptyDir 오버레이 이음새, 불변 태그라 IfNotPresent가 옳다는 근거 |
| `deploy/base/kustomization.yaml` | 9 | 0 | 9 | **pin-guard-pass** — 줄 수 불변, 문면 정정 1곳: 거짓이 된 괄호절 `(where CI's \`pin\` job writes the main SHA)` 삭제(#35 이후 CI는 main에 쓰지 않는다). 유지 — `images:` 트랜스포머를 base에 두지 않는 이유(프리뷰·e2e 재태깅과의 중첩) |
| `deploy/batch/cronworkflow-ingestion.yaml` | 27 | 10 | 17 | 제거 10줄 — AC1.1 배너(시나리오1↔이 파일은 doc-tracker e2e 매핑이 복원), ★suspend 착지 문단(README「배포」재진술 + 실제 `suspend: false`와 어긋난 낡은 서술). 유지: AC1.1 의무↔필드 대응·누락 보정 근거(스케줄 계약) |
| `deploy/batch/cronworkflow-pipeline.yaml` | 34 | 6 | 28 | 제거 6줄 — ★suspend 착지 이유(README「배포」재진술). 유지: 상호 배타 근거, 켜기 전 4단계(analyzer_version·attempted=/failed=·exit 3 등 README에 없는 운용 지식), 과금 경고 |
| `deploy/batch/kustomization.yaml` | 17 | 3 | 14 | 제거 3줄 — 두 스케줄 중 하나만 돈다(README「배포」재진술). 유지: base 밖에 두는 이유(kind e2e·Argo 부재), 클러스터 범위 컨트롤러, kustomizeconfig 연결 |
| `deploy/batch/kustomizeconfig.yaml` | 10 | 0 | 10 | 유지 — kustomize `images:` 트랜스포머가 WorkflowTemplate 경로를 모르는 함정과 선언 위치 근거 |
| `deploy/batch/rbac.yaml` | 6 | 0 | 6 | 유지 — workflowtaskresults 권한이 없으면 첫 단계가 실패하는 런타임 제약 |
| `deploy/batch/workflow-template.yaml` | 45 | 3 | 42 | **aggregation-harness-pass — AC3.2 aggregate 블록만 판정(파일 전체 아님)** — 제거 3줄(6줄 → 3줄): "Until this template existed … no scheduled path ever produced Gold and serving fell back to empty datasets (deploy/base/deployment.yaml)"는 #38 커밋 메시지(경로 ④)와 `deploy/base/deployment.yaml`의 유지 판정 주석(경로 ①)이 복원하며, **initial-pass가 이 파일 머리에서 지운 "aggregation gets its own entrypoint when that slice lands"의 과거형 재발**이다. 유지: `# AC3.2` 인라인 태그(판단 분기 — `# AC1.1`·`# AC2.1-2.6`과 같은 형태), `No args: …` 2줄, `Pure recomputation … never billable` 2줄. **직전 행(pin-guard-pass)이 남긴 「미판정 10줄」 포인터는 이 패스가 해소했다** — 그 10줄이 곧 여기서 판정한 #38(`33e24ea`)의 AC3.2 aggregate 블록이다. **머리 가드 2줄("The `image:` tags in this file are CI-owned … README 「운영 고정(`pin` job)」")은 pin-guard-pass의 판정분이고 이 패스는 판정하지 않았다** — 판정 전 45는 pin-guard-pass가 그 가드를 3줄 → 2줄로 줄인 뒤의 실측값이다. 이 블록 밖의 줄은 initial-pass(머리 배너 3줄 제거 — AC 흔적 + 집계 후속 = README「범위」재진술)와 pin-guard-pass의 판정이 유효하다: 엔트리포인트 2개 근거, imagePullSecrets 선언 위치, exit 2 재시도 금지, Secret required 근거 등 유지 |
| `deploy/overlays/preview/kustomization.yaml` | 30 | 0 | 30 | 유지 — efs StorageClass가 PVC 이름으로 access point를 재사용·연쇄 삭제하는 함정, Flux 분담, delete 패치가 이름 기준이라 새 CronWorkflow를 덮지 않는 함정. 머리의 serving/batch 두 절은 README「PR 프리뷰」와 겹치나 함정 서술과 한 덩어리라 판단 분기로 유지 |
| `deploy/overlays/prod/batch-pvc.yaml` | 13 | 4 | 9 | 제거 4줄 — 체인 연결 시 공유 방식 결정 예고(README「배포」재진술, 스스로 'see README'). 유지: RWO 멀티어태치 근거, storageClassName 부재 의도 |
| `deploy/overlays/prod/kustomization.yaml` | 32 | 12 | 20 | 제거 12줄 — `kubectl apply -k` 적용법·외부 노출(README「배포」재진술), 두 CronWorkflow 인계 목록(README·cronworkflow-pipeline.yaml 재진술). 유지: Recreate/RWO 근거, template-wide 볼륨, 주기 오버라이드 패치 예시(cronworkflow-ingestion.yaml이 가리키는 위치) |
| `deploy/overlays/prod/pvc.yaml` | 1 | 0 | 1 | 유지 — storageClassName 부재 의도(프리뷰의 efs 함정과 대비되는 의도적 기본값) |
| `go/cmd/serving/main.go` | 4 | 0 | 4 | 유지 — 패키지(command) doc 주석, 프로브를 액세스 로그에서 빼는 이유 |
| `go/internal/handlers/handlers.go` | 27 | 3 | 24 | 제거 3줄 — `// --- … ---` 구분선. 유지: 패키지·export doc 주석(`New builds Handlers…`는 정의 표본 ①과 doc 주석 유지 규칙이 충돌 — 유지 규칙 우선), compare의 동일 기준 근거, 버킷 키 사전식=시간순 조건 |
| `go/internal/handlers/handlers_test.go` | 14 | 0 | 14 | 유지 — 다중 버킷 픽스처 설계 근거, 단위/e2e 분담. AC3.7 태그는 판단 분기로 유지 |
| `go/internal/static/static.go` | 6 | 0 | 6 | 유지 — 패키지·export doc 주석(SPA 폴백 동작 설명) |
| `go/internal/store/store.go` | 12 | 0 | 12 | 유지 — 패키지·export doc 주석, Python LocalFsStore와의 대응, 누락 파일=빈 슬라이스 계약 |
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` | 12 | 1 | 11 | **aggregation-harness-pass** — 제거 1줄: `# Percentage points, matching the contract's \`delta\` doc.` — 주석이 자기 복원처를 이름으로 지목하고 원본(`contracts/gold/subject_trend.avsc` `delta` 필드 `doc`)이 AC 번호까지 달아 더 정확하다(정책 doc 주석 항의 `contracts/` 스키마 재진술). 유지: 중첩 dict 형태 표기, 버킷 키 사전식=시간순 근거, "없는 버킷은 0이 아니다", AC3.4 분리 근거(태그는 판단 분기) |
| `python/packages/aggregation/tests/test_aggregate.py` | 1 | 0 | 1 | 유지 — 테스트 의도(AC 태그 판단 분기) |
| `python/packages/analysis/src/econ_analysis/cli.py` | 7 | 0 | 7 | 유지 — 종료 코드 의미(`#:` 속성 doc), 운영자 오류를 레이크 접근 전에 실패시키는 근거, 전량 실패 시 Silver 보존 근거 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | 4 | 0 | 4 | 유지 — 페이크 모델의 판정 규칙 근거(AC 태그 판단 분기) |
| `python/packages/analysis/src/econ_analysis/llm.py` | 2 | 0 | 2 | 유지 — 저신뢰 임계 공유, 카탈로그 정규화 방침 |
| `python/packages/analysis/tests/test_cli.py` | 5 | 0 | 5 | 유지 — 테스트 의도(기본값 전환·장애 가드) |
| `python/packages/analysis/tests/test_fake_llm.py` | 2 | 0 | 2 | 유지 — 테스트 의도(AC 태그 판단 분기) |
| `python/packages/analysis/tests/test_llm.py` | 8 | 0 | 8 | 유지 — 분석 결과 vs 운영 실패 구분 근거(AC 태그 판단 분기) |
| `python/packages/core/src/econ_core/domain.py` | 3 | 0 | 3 | 유지 — 상수 묶음 표지 3줄(재진술성이나 짧고 애매 — 유지) |
| `python/packages/core/tests/test_storage.py` | 3 | 0 | 3 | 유지 — 테스트 의도(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/cli.py` | 2 | 0 | 2 | 유지 — content-addressed 병합 규칙(AC1.7 태그 판단 분기) |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` | 1 | 0 | 1 | 유지 — 안정 정렬 의도 |
| `python/packages/ingestion/src/econ_ingestion/sources.py` | 4 | 0 | 4 | 유지 — 페이크 카탈로그 설계 근거(목업 연동·결정성) |
| `python/packages/ingestion/tests/test_default_feeds.py` | 3 | 0 | 3 | 유지 — 테스트 의도 |
| `python/packages/ingestion/tests/test_feeds.py` | 21 | 0 | 21 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `python/packages/ingestion/tests/test_sources.py` | 10 | 0 | 10 | 유지 — 테스트 의도(AC1.x 태그 판단 분기) |
| `scripts/check-journey-flow.js` | 45 | 4 | 41 | 제거 4줄 — `/* ===== … ===== */` 구분선. 유지: 정적 대조로 안 되는 이유·자기참조 금지·fail-closed 근거, (a)~(h) 규칙 표지(규칙 문자로 모델 정의와 대응 — 애매, 유지) |
| `scripts/check-journey-mockup.py` | 42 | 0 | 42 | regression-pass — 전량 유지. `#36`이 들인 4줄은 「조각(`#STP-`)을 무시하면 상대 여정의 1단계로 떨어지는 링크를 게이트가 통과시킨다」는 게이트 설계 근거로 복원 불가. initial-pass가 남긴 38줄(오탐 회피·헤더 판정 방식·래칫·모델 정의 인용)의 판정은 유효 |
| `scripts/check-mockup-render.py` | 3 | 3 | 0 | regression-pass — 전량 제거. 지문에 걸린 주석이 구분선 배너 3줄뿐이었다(`# ---- SSOT 파싱`·`CSS 파싱`·`판정`). 절 이름은 바로 아래 함수 이름이 복원한다(`definitions()` / `css_rules(css)` / `check_r3()`·`check_r5()`). 파일 설명은 모듈 docstring에 있고 docstring은 지문의 사각지대라 이 파일은 지문에서 빠진다 |
| `scripts/journey-scenarios/JRN-axis-contrast.js` | 28 | 4 | 24 | 제거 4줄 — 러너/시나리오 역할 분담 설명(check-journey-flow.js 머리 주석의 재진술). 유지: 조작별 의도·jsdom `.value` 함정 |
| `scripts/journey-scenarios/JRN-daily-scan.js` | 29 | 0 | 29 | **product-surface-pass** — 전량 유지. 머리는 훅 목록 4줄뿐이고 역할 분담 산문이 없다(= initial-pass가 `JRN-sentiment-shift.js`에서 유지 판정한 형태 그대로). 나머지 25줄은 조작별 의도(`/* 화면 2 → 3. 전진은 대상 선택을 요구하므로 … */`), 상태 라벨 12개(`empty-window`·`no-baseline` 등 — 어떤 조작으로 그 상태에 닿는지), jsdom `.value` 함정으로 복원 불가 |
| `scripts/journey-scenarios/JRN-ingestion-recovery.js` | 33 | 0 | 33 | **product-surface-pass** — 전량 유지. 같은 사유. 상태 라벨이 원인 분기(`source-outage / origin-gone`)·재실행 부작용(`dup-again — 덮어쓰기로 실행하면 중복이 다시 쌓인다`)까지 담아 러너·목업 어느 쪽으로도 복원되지 않는다 |
| `scripts/journey-scenarios/JRN-logic-backfill.js` | 38 | 0 | 38 | **product-surface-pass** — 전량 유지. 머리의 여정 뼈대 3줄(`표본이 전량의 관문` — 여정 문서 `STP-dry-run` 인용)은 **판단 분기**로 남긴다: 앞 절은 여정 문서가 복원하나 뒤 절(「그래서 2·3단계 전진이 기본 비활성이고 그것을 여는 것은 화면 안의 실행 버튼이다」)이 이 파일의 `unlock` 구조를 설명해 한 덩어리다. 나머지는 조작별 의도·상태 라벨 |
| `scripts/journey-scenarios/JRN-sentiment-shift.js` | 27 | 7 | 20 | 제거 7줄 — 역할 분담 재진술(러너 머리 주석; '두 가지'라 쓰고 넷을 나열한 낡은 서술 포함). 유지: 시나리오 훅 목록(inputs/states/unlock/renders) |
| `scripts/journey-scenarios/JRN-spike-verification.js` | 29 | 4 | 25 | regression-pass — 제거 4줄: 머리의 러너/시나리오 역할 분담 산문 3줄(`check-journey-flow.js` 「── 구조 ──」 절의 재진술) + 매달린 ` *` 1줄. `JRN-axis-contrast.js`와 같은 식별 1줄 형태로 줄였다. 유지: 훅별 `(c)(d)(e)(h)` 주석 4줄, 조작별 의도, jsdom `.value` 함정 |
| `tests/e2e/check_scenario_mapping.py` | 22 | 4 | 18 | 제거 4줄 — `# --- … ---` 구분선. 유지: 판정 규칙 근거(첫 열만 읽는 이유, 등재 공백을 쓰는 이유 등) |
| `tests/e2e/k8s/batch/aggregate-job-skew.yaml` | 5 | 0 | 5 | **batch-harness-pass** — 전량 유지. 기준 상태와 루트만 다르게 두는 이유(같은 코드가 같은 설정으로 돌아야 두 Gold의 차이가 집계 로직의 변덕이 아니라 입력량 차이로 읽힌다)와, 한 루트에서 두 번 돌리면 `write_records`가 데이터셋을 교체해 기준 상태가 사라진다는 함정. 둘 다 매니페스트·테스트 문서 어느 쪽으로도 복원되지 않는다 |
| `tests/e2e/k8s/batch/aggregate-job.yaml` | 11 | 2 | 9 | **batch-harness-pass** — 제거 2줄: 머리의 과거형 프레이밍(「이 Job이 서면서 `python/packages/aggregation`이 e2e에서 처음으로 실제 실행된다. 그 전까지 서빙은 손으로 쓴 픽스처 Gold를 입력으로 썼으므로 … 한 번도 돌지 않았다」). aggregation-harness-pass가 `deploy/batch/workflow-template.yaml`에서 지운 「Until this template existed … no scheduled path ever produced Gold」와 **같은 유형·같은 복원 경로**(④ 커밋 이력)다. 유지 9줄: 배치 이미지 ENTRYPOINT가 `econ-ingestion`이라 집계는 `command`로 덮어써야 한다는 근거, 상류 더블이 필요 없는 이유와 그래서 이 Job에는 mock-exception이 붙지 않는다는 사실(부재의 근거는 코드가 복원하지 못한다) |
| `tests/e2e/k8s/batch/analyze-job-agg-skew.yaml` | 8 | 4 | 4 | **batch-harness-pass** — 제거 4줄: `ECON_LLM_MODEL`·`ECON_LLM_API_KEY`의 env 주석이 `analyze-job.yaml`의 것과 **바이트 동일**이다(제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」). 주인 지목은 주석 자신이 한다: 이 파일 머리가 `analyze-job-agg.yaml`을, 그 파일이 다시 `analyze-job.yaml`을 계약의 주인으로 적는다. 같은 두 env를 같은 값으로 쓰면서 이 주석이 없는 `analyze-job-v2.yaml`이 레포 안의 대조군이다. 유지 4줄: 기준 상태와 모든 설정이 같고 루트만 다른 이유, 부풀린 쪽에만 있는 여섯 건의 응답도 같은 묶음에 들어 있어 404(→ `failed>0`)가 나지 않는다는 픽스처 지식 |
| `tests/e2e/k8s/batch/analyze-job-agg.yaml` | 14 | 4 | 10 | **batch-harness-pass** — 제거 4줄: 위와 같은 env 주석 재진술. 유지 10줄: 응답 묶음을 `e2e-llm-agg`로 가르는 이유(분석 묶음과 기사 집합이 겹치지 않아 한 묶음에 섞으면 한쪽 기사를 지울 때 다른 쪽이 조용히 404로 무너진다), 인자를 주지 않아 기본값인 실 llm 분석기로 도는 이유(페이크로 돌리면 프롬프트 조립·응답 파싱·정규화·저신뢰 판정이 통째로 빠져 Gold까지 잇겠다는 전파 계약이 한 번도 실행되지 않는다) |
| `tests/e2e/k8s/batch/analyze-job-v2.yaml` | 7 | 0 | 7 | **batch-harness-pass** — 전량 유지. 재분석이 새 데이터셋을 만드는 것이 아니라 같은 Silver를 갱신하는 것이고 그 갱신이 추적 키를 잃지 않는지가 시나리오의 기대 결과라는 설계 근거. 같은 `ECON_LLM_*` env를 쓰면서 그 설명을 달지 않아 이 패스의 env 제거 판정에 **대조군**이 된다 |
| `tests/e2e/k8s/batch/analyze-job.yaml` | 12 | 0 | 12 | **batch-harness-pass** — 전량 유지. 이 디렉터리에서 `ECON_LLM_*` 계약 설명의 **주인**이다(agg·agg-skew가 여기로 가리킨다). 유지: 운영 대비 바뀌는 것이 `ECON_LLM_BASE_URL`이 가리키는 곳뿐이라는 경계, 기본값 실 llm 분석기를 쓰는 이유, 더블은 키를 보지 않지만 CLI가 미설정을 operator error(exit 2)로 끊으므로 값이 있어야 한다는 런타임 제약 |
| `tests/e2e/k8s/batch/bronze-shell.yaml` | 3 | 0 | 3 | **batch-harness-pass** — 전량 유지. Job이 PVC에 남긴 산출물을 호스트로 꺼내는 경로(`kubectl exec … cat` → Playwright가 그 파일을 읽는다)와, 이 Pod는 읽기만 하고 아무것도 만들지 않는다는 경계(단정이 배치가 실제로 쓴 레코드에 걸린다는 근거) |
| `tests/e2e/k8s/batch/data-pvc.yaml` | 4 | 0 | 4 | **batch-harness-pass** — 전량 유지. Job 컨테이너는 종료하면 파일시스템째 사라져 emptyDir로는 산출물을 꺼낼 수 없다는 제약과, RWO가 노드 단위라 같은 노드의 반출 Pod와 동시 마운트가 성립한다는 클러스터 지식 |
| `tests/e2e/k8s/batch/feed-double.yaml` | 9 | 1 | 8 | **aggregation-harness-pass** — 이력 프레이밍 재작성(둘째 문단 5줄 → 4줄): "2026-09-18(rct_20260918-0004)부터 `python -m http.server` 대신 …"은 날짜·task id를 담은 변경 이력이라 복원 경로 ③④의 정의 그 자체이자 제거 유형 「작업 흔적」. 삭제가 아니라 재작성인 것은 같은 블록의 픽스처 지식을 살리기 위함이다. 유지: 이미지 재빌드 회피(사이드로드 이미지 재사용), 고장 주입 경로 3개, "가용성을 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다" |
| `tests/e2e/k8s/batch/ingest-job-agg-skew.yaml` | 9 | 0 | 9 | **batch-harness-pass** — 전량 유지. 기준 상태와 **다른 것이 상류 설정 하나뿐**이어야 두 Gold의 차이가 오직 수집량 차이로 읽힌다는 설계(같은 축의 다른 소스와 US 축은 두 상태에서 같은 파일을 받고 주기도 같다), 루트를 따로 두지 않으면 `write_records`가 데이터셋을 교체해 기준 상태가 사라진다는 함정 |
| `tests/e2e/k8s/batch/ingest-job-agg.yaml` | 7 | 1 | 6 | **batch-harness-pass** — 문면 정정 1곳(3줄 → 2줄): 데이터 루트 **열거**(`정상 주기(/data) · 고장 주입(/data/faults) · 3주기(/data/cycles) · 분석(/data/analysis) 과 같은 관례다`)를 걷어냈다. 열거는 `git grep ECON_DATA_ROOT tests/e2e/k8s/batch`가 복원하고(경로 ①), **이미 낡아 있었다** — 이 디렉터리의 루트는 실측 여섯 개(`/data`·`/data/faults`·`/data/cycles`·`/data/analysis`·`/data/aggregation`·`/data/aggregation-skew`)인데 이 줄은 넷만 적어 `/data/aggregation-skew`를 빠뜨린다. README가 가드 항에서 못박은 「**개수·열거·행 위치**는 담지 않는다 — 파일이 자라면 그 표현이 조용히 거짓이 된다」와 같은 근거다. 삭제가 아니라 정정인 것은 뒤 절(한 루트를 공유하면 앞선 묶음의 소스별·건수 단정이 오염된다)이 복원 불가능한 설계 근거이기 때문 — `deploy/base/kustomization.yaml`의 문면 정정 선례. 유지: 메달리온 계층상 집계 앞에 수집 → 분석이 한 번씩 더 필요한 이유 |
| `tests/e2e/k8s/batch/ingest-job-analysis.yaml` | 6 | 1 | 5 | **batch-harness-pass** — 같은 정정(3줄 → 2줄). 이 줄은 셋만 적어 두 집계 루트를 빠뜨린다. 유지: 분석이 Bronze를 입력으로 받으므로 분석 Job 앞에 수집이 한 번 더 필요하다는 이유, 한 루트를 공유하면 ingestion 2~5의 소스별 건수 단정이 오염된다는 근거 |
| `tests/e2e/k8s/batch/ingest-job-cycle1.yaml` | 14 | 0 | 14 | **batch-harness-pass** — 전량 유지. 세 주기 배선 설명의 **주인**이다(cycle2·cycle3가 여기로 가리킨다). 유지: 주기를 Job 하나로 합치지 않는 이유(컨테이너 command를 쉘 루프로 바꾸면 e2e가 검증하는 것이 제품 계약이 아니게 된다), 세 Job이 **순차**여야 하는 이유(같은 데이터셋을 주기마다 덮어쓰는 `LakeStore.write_records` 때문에 동시 실행이면 마지막 내용이 비결정적), 루트를 `/data/cycles`로 가르되 본문 저장소는 주기를 가로질러 누적돼야 해 세 주기가 같은 루트를 공유한다는 이음새 |
| `tests/e2e/k8s/batch/ingest-job-cycle2.yaml` | 4 | 0 | 4 | **batch-harness-pass** — 전량 유지. 「배선 설명은 ingest-job-cycle1.yaml의 머리 주석에 있다」는 재진술이 아니라 README가 권하는 **주인 지목 포인터**다(제거 유형 「다른 파일 주석의 재진술」의 올바른 해소 형태). 나머지는 이 주기의 기대 결과(같은 상류를 받아 본문이 재저장되지 않는 것 — `bodies: 0 new / N deduplicated`) |
| `tests/e2e/k8s/batch/ingest-job-cycle3.yaml` | 3 | 0 | 3 | **batch-harness-pass** — 전량 유지. 같은 포인터 형태 + 이 주기의 기대 결과(새 해시의 본문 레코드가 한 건 추가되고 기존 버전은 보존) |
| `tests/e2e/k8s/batch/ingest-job-faults.yaml` | 16 | 0 | 16 | **batch-harness-pass** — 전량 유지. 고장 주입 경로 3종(`/__fail__/`·`/__flaky__/`·`/__slow__/`)이 어느 픽스처에 섞여 있는지, `--fetch-timeout 1`이 더블의 5초 지연보다 **짧아야** 타임아웃 경로를 실제로 밟는다는 값 근거(5 이상이면 시나리오의 (3)항이 관측되지 않는다), 이 Job은 **성공(completed)하는 것이 기대값**이라는 판독 지침(실패한 소스는 중단이 아니라 `failed_sources`로 기록되는 것이 제품 동작). 셋 다 매니페스트·테스트 문서 어느 쪽으로도 복원되지 않는다 |
| `tests/e2e/k8s/batch/ingest-job.yaml` | 7 | 0 | 7 | **batch-harness-pass** — 전량 유지. **판단 분기**: 머리의 「운영에서 이 CLI를 도는 것은 … `ingest` 템플릿이고, 여기서는 그 컨테이너 계약(…)을 그대로 옮겼다」는 두 파일을 나란히 읽으면 복원되지만(경로 ①), 같은 문장이 「e2e kind 클러스터에는 Argo 컨트롤러가 없기 때문이다」라는 클러스터 제약과 「그래서 이 Job이 관측하는 것은 스케줄이 아니라 한 주기가 무엇을 수집하는가다」라는 경계로 한 덩어리로 이어진다. 줄 단위로 끊으면 근거까지 잘리므로 「애매하면 남긴다」로 유지한다. 이 디렉터리에서 컨테이너 계약 설명의 **주인**이기도 하다(agg·analysis·faults가 여기로 가리킨다). 유지: 주기 id를 고정해 레코드 id와 `collection_cycle`이 실행 시각에 흔들리지 않게 하는 근거 |
| `tests/e2e/k8s/batch/kustomization.yaml` | 8 | 0 | 8 | **batch-harness-pass** — 전량 유지. **상시 자원만** 모으고 Job은 넣지 않는 이유(더블이 Ready가 된 뒤에 적용해야 첫 요청이 헛돌지 않는다), ConfigMap을 run.sh가 픽스처 디렉터리에서 만든다는 배선, serving 쪽 오버레이와 달리 이쪽은 순수 e2e 자원이고 운영 배치는 Argo WorkflowTemplate이 담당한다는 경계 |
| `tests/e2e/k8s/batch/llm-double.yaml` | 11 | 0 | 11 | **batch-harness-pass** — 전량 유지. 새 이미지를 끌어오지 않도록 이미 사이드로드된 배치 이미지로 stdlib HTTP 서버만 띄우는 배선, 더블이 대신하는 것이 chat-completions **한 겹**뿐이고 프롬프트 조립·정규화·저신뢰 판정·Silver 적재는 제품 경로가 그대로 한다는 경계, readiness를 **픽스처 로드까지** 확인하지 않으면 포트만 열린 상태로 Ready가 돼 분석 Job이 응답 표 없이 출발해 전건 실패한다는 함정 |
| `tests/e2e/k8s/e2e-patch.yaml` | 5 | 0 | 5 | 유지 — runc가 read-only 마운트 안에 mountpoint를 못 만드는 런타임 함정 |
| `tests/e2e/k8s/kustomization.yaml` | 5 | 0 | 5 | 유지 — side-load·ConfigMap 픽스처 배선 근거 |
| `tests/e2e/kind-config.yaml` | 2 | 0 | 2 | 유지 — 단일 노드 선택 근거 |
| `tests/e2e/playwright.config.ts` | 2 | 0 | 2 | 유지 — BASE_URL/포트 폴백과 run.sh의 관계 |
| `tests/e2e/run.sh` | 12 | 0 | 12 | 유지 — 전제 도구·KEEP_CLUSTER·단계 표지(애매 — 유지) |
| `tests/e2e/specs/ac3-6-sentiment-ratio-viz.spec.ts` | 28 | 4 | 24 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드가 복원). 유지: AC 검증 방법 인용과 그에 따른 단언 설계, 스케일 무관 비교 근거 |
| `tests/e2e/specs/ac3-7-three-axis-compare.spec.ts` | 36 | 4 | 32 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드). 유지: 세 낱말 분해 단언 설계, 공통 스케일 근거 |
| `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` | 26 | 4 | 22 | 제거 4줄 — 시나리오→AC 연결 설명(테스트 문서 `검증 AC` 필드). 유지: 단언 설계·픽스처 대응 |
| `tests/e2e/specs/smoke-serving.spec.ts` | 6 | 0 | 6 | 유지 — 비-시나리오 spec이 고아가 아닌 이유(doc-tracker 등재 위치 안내) |
| `tests/smoke.sh` | 11 | 0 | 11 | 유지 — 페이크 소스·분석기 고정 근거(오프라인·결정성, exit 2 회피) |
| `web/src/App.tsx` | 1 | 0 | 1 | 유지 — 실화면/플레이스홀더 목록의 역할 |
| `web/src/api/client.ts` | 5 | 0 | 5 | 유지 — 상대 /api 베이스가 dev·prod 모두에서 되는 이유 |
| `web/src/api/types.ts` | 5 | 0 | 5 | 유지 — 손으로 유지하는 서빙 API 뷰라는 경계, export JSDoc |
| `web/src/screens/Compare.tsx` | 10 | 0 | 10 | regression-pass — 전량 유지. `#37`이 들인 3줄은 「수집 0인 축을 `0%`로 그리지 않고 '비교 제외'로 적는 이유 — `0%`는 '거기선 아무도 말하지 않았다'로 읽힌다」는 제품 의미론의 근거로 코드·문서 어디서도 복원되지 않는다. initial-pass가 지운 `AC3.7 … (J2 / V2)` 배너는 재발하지 않았다 |
| `web/src/screens/Sentiment.tsx` | 56 | 2 | 54 | **product-surface-pass** — 제거 2줄: 머리의 AC 배너 `// AC3.4 (축별·분위기별 비율 집계, 미분석 분리) + AC3.6 (분위기 비율 시각화).` 와 매달린 `//`. 제거 유형 「작업 흔적」이고 AC↔화면 대응은 `docs/econ-opinion-monitor-design-tracker.md` 「구현 전용 — mapstrip 칩」 행과 doc-tracker e2e 매핑이 복원한다(경로 ②). initial-pass가 `Compare.tsx`에서 `AC3.7 … (J2 / V2)` 배너를 지운 것과 같은 자리·같은 근거이고, 판정 후 머리가 `Compare.tsx`와 같은 형태(배너 없이 바로 설계 근거)가 된다. 유지 54줄: 미분석을 네 분류에 접지 않는 이유, 도넛이 analyzed 몫으로 닫히는 근거, `PAT-stacked-sentiment` 의 「막대 높이는 구성이지 규모가 아니다」, `CMP-*` 앵커. **판단 분기 — design-tracker 가 승격 등재한 두 블록**(허위 컨트롤 판단 `:24-29`·`:30-33`, 고정 임계 사유 `:55-58`)은 트래커가 「기록 위치를 승격한다」고 적어 복원 경로 ②가 성립하나, 트래커 행들이 이 블록을 **줄 번호로 인용**하고 있어 제거가 자매 모델 행의 처분과 묶인다. 「애매하면 남긴다」로 유지하고 트래커의 처분 시점에 다시 본다 |
| `web/src/screens/Sentiment.test.tsx` | 21 | 0 | 21 | **product-surface-pass** — 전량 유지. 「기대값을 상수로 박지 않는다」는 단언 설계 근거, 스케일 상수가 상쇄되므로 비율만 비교한다는 근거, 한 document 를 공유해 행 단위로 스코프하는 이유(자동 cleanup 부재) — 모두 「테스트가 왜 그 모양으로 단언하는지」 |
| `web/src/screens/Trend.tsx` | 35 | 0 | 35 | **product-surface-pass** — 줄 수 불변, 문면 정정 1곳: 머리 첫 줄의 `AC3.5 — 대상 추세 상세.` 접두 삭제(위 `Sentiment.tsx` 와 같은 AC 배너 유형이나 산문과 한 줄에 붙어 있어 줄 삭제로는 근거까지 지워진다 — `deploy/base/kustomization.yaml` 의 문면 정정 선례). 유지: 한 x축 공유·결측 버킷을 공백으로 두는 근거, 색 배정 규칙, 눈금 반올림 이유. **판단 분기 — `:8-21` 의 「deliberately *not* here」 두 항**은 design-tracker 가 같은 사유를 등재하면서 **AC3.3 롤업 착지 시 이 주석과 함께 걷어낸다**고 처분 시점을 못박았다. 지금 지우면 자매 모델의 예약된 처분을 앞질러 집행하는 것이라 유지 |
| `web/src/screens/Trend.test.tsx` | 12 | 0 | 12 | **product-surface-pass** — 전량 유지. 「상승 점유율이 falling y 로 와야 한다 — 반전 스케일을 잡는다」, 비교 표가 피커를 겸하는 이유(비교 집합 자체가 선택에 의존해 서버에서 풀린다), 「모든 버튼은 무언가를 해야 한다」 단언의 근거 |
| `web/src/screens/Dashboard.tsx` | 1 | 1 | 0 | 제거 1줄 — '다른 6화면은 플레이스홀더'(README「범위」재진술이며 compare 착지 후 낡음) |
| `web/src/screens/Placeholder.tsx` | 3 | 0 | 3 | 유지 — 플레이스홀더가 증명하는 것 |
| `web/src/shell/AppShell.tsx` | 1 | 0 | 1 | 유지 — 디자인 시스템 패턴 식별자(PAT-screen-shell) |
| `web/src/shell/MapStrip.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 목업을 따르는 칩 구분자 규약 |
| `web/src/shell/Sidebar.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 페르소나 태그의 목업 근거 |
| `web/src/shell/Topbar.tsx` | 1 | 0 | 1 | 유지 — 컴포넌트 식별자 |
| `web/src/shell/nav.ts` | 4 | 2 | 2 | 수정 — 첫 줄의 '어느 화면이 구현됐는가' 절 2줄 제거(App.tsx가 복원하며 스스로 그렇게 말함), 목업 인덱스 출처 표기는 유지 |
| `web/src/tokens/tokens.css` | 38 | 0 | 38 | regression-pass — 전량 유지. `#37`이 들인 7줄 중 4줄은 `CMP-*`/`PAT-*` 앵커 분할·신설(원장이 유지로 못박은 추적 앵커 규약을 더 정확히 따른 것), 3줄은 목업 규약 근거(버튼 리셋을 한 번만 두는 이유·열 수가 `.grid`의 일부가 아닌 이유·note 여백의 소유자)로 목업이 보여주지 않는 **왜 그렇게 쪼갰는가**라 복원 불가. 2줄(`* {`, `#root {`)은 여전히 셀렉터 오탐 |
| **batch-harness-pass 기준 · 레포 전체** | **1954** | **12** | **1942** | 지문 값(`32faf64` → 이 패스 후). 이 표는 그중 **90개 파일**을 덮는다 — 행마다 기준 패스가 다르므로 위 열의 단순 합과는 다르다. 지문 112파일 중 **아직 행이 없는 파일이 25개(540줄)** 남아 있다 — 대부분 e2e 하네스 축이지만 전부는 아니다(`tests/e2e/specs` 16파일 333줄 · `tests/e2e/lib` 6파일 180줄 · `tests/e2e/fixtures/*/server.py` 2파일 24줄 · `python/packages/aggregation/src/econ_aggregation/cli.py` 1파일 3줄 — 마지막 하나는 하네스가 아니라 제품 코드다). `tests/e2e/k8s/batch`는 이 패스로 19파일 전부가 행을 갖는다 |
