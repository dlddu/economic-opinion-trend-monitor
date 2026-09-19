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
| `scripts/journey-scenarios/JRN-sentiment-shift.js` | 27 | 7 | 20 | 제거 7줄 — 역할 분담 재진술(러너 머리 주석; '두 가지'라 쓰고 넷을 나열한 낡은 서술 포함). 유지: 시나리오 훅 목록(inputs/states/unlock/renders) |
| `scripts/journey-scenarios/JRN-spike-verification.js` | 29 | 4 | 25 | regression-pass — 제거 4줄: 머리의 러너/시나리오 역할 분담 산문 3줄(`check-journey-flow.js` 「── 구조 ──」 절의 재진술) + 매달린 ` *` 1줄. `JRN-axis-contrast.js`와 같은 식별 1줄 형태로 줄였다. 유지: 훅별 `(c)(d)(e)(h)` 주석 4줄, 조작별 의도, jsdom `.value` 함정 |
| `tests/e2e/check_scenario_mapping.py` | 22 | 4 | 18 | 제거 4줄 — `# --- … ---` 구분선. 유지: 판정 규칙 근거(첫 열만 읽는 이유, 등재 공백을 쓰는 이유 등) |
| `tests/e2e/k8s/batch/feed-double.yaml` | 9 | 1 | 8 | **aggregation-harness-pass** — 이력 프레이밍 재작성(둘째 문단 5줄 → 4줄): "2026-09-18(rct_20260918-0004)부터 `python -m http.server` 대신 …"은 날짜·task id를 담은 변경 이력이라 복원 경로 ③④의 정의 그 자체이자 제거 유형 「작업 흔적」. 삭제가 아니라 재작성인 것은 같은 블록의 픽스처 지식을 살리기 위함이다. 유지: 이미지 재빌드 회피(사이드로드 이미지 재사용), 고장 주입 경로 3개, "가용성을 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다" |
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
| `web/src/screens/Dashboard.tsx` | 1 | 1 | 0 | 제거 1줄 — '다른 6화면은 플레이스홀더'(README「범위」재진술이며 compare 착지 후 낡음) |
| `web/src/screens/Placeholder.tsx` | 3 | 0 | 3 | 유지 — 플레이스홀더가 증명하는 것 |
| `web/src/shell/AppShell.tsx` | 1 | 0 | 1 | 유지 — 디자인 시스템 패턴 식별자(PAT-screen-shell) |
| `web/src/shell/MapStrip.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 목업을 따르는 칩 구분자 규약 |
| `web/src/shell/Sidebar.tsx` | 2 | 0 | 2 | 유지 — 컴포넌트 식별자, 페르소나 태그의 목업 근거 |
| `web/src/shell/Topbar.tsx` | 1 | 0 | 1 | 유지 — 컴포넌트 식별자 |
| `web/src/shell/nav.ts` | 4 | 2 | 2 | 수정 — 첫 줄의 '어느 화면이 구현됐는가' 절 2줄 제거(App.tsx가 복원하며 스스로 그렇게 말함), 목업 인덱스 출처 표기는 유지 |
| `web/src/tokens/tokens.css` | 38 | 0 | 38 | regression-pass — 전량 유지. `#37`이 들인 7줄 중 4줄은 `CMP-*`/`PAT-*` 앵커 분할·신설(원장이 유지로 못박은 추적 앵커 규약을 더 정확히 따른 것), 3줄은 목업 규약 근거(버튼 리셋을 한 번만 두는 이유·열 수가 `.grid`의 일부가 아닌 이유·note 여백의 소유자)로 목업이 보여주지 않는 **왜 그렇게 쪼갰는가**라 복원 불가. 2줄(`* {`, `#root {`)은 여전히 셀렉터 오탐 |
| **aggregation-harness-pass 기준 · 레포 전체** | **1317** | **5** | **1312** | 지문 값(`e7fbcae` → 이 패스 후). 이 표는 그중 **65개 파일**을 덮는다 — 행마다 기준 패스가 다르므로 위 열의 단순 합과는 다르다 |
