# 2026-09-18 initial-pass — 첫 전수 판정

| 항목 | 값 |
|------|-----|
| 기준 커밋 | `9d6122b` (main) |
| 판정 전 | 776줄 / 62파일 — 지문 `05369a31…` |
| 판정 후 | 655줄 / 60파일 |
| 제거 | 121줄 (+ 1줄 부분 수정: `web/src/shell/nav.ts` 첫 줄) |
| 추적 | reconciler `tbm_econ-opinion-monitor-comment-redundancy` / `rct_20260917-0001` |

등록 시점(698줄/60파일) 이후 풀은 #25(배포 오버레이 +56), #22(목업 수렴 근거 +3), #24(시나리오축 이관 +19)로
776줄까지 자랐다. 이 패스는 그 현행 풀 전체를 판정했다. 파일별 결과는 [`../ledger.md`](../ledger.md).

## 제거 — 복원 경로별 근거

### 구분선 (복원 경로 ① 코드) — 43줄

절 이름은 바로 아래 함수·타깃·블록이 복원한다. 순수 장식이다.

- `Makefile` `## --- codegen/build/test/e2e/lint/run ---` 6줄 — `make help`는 `^타깃:.*## ` 줄만 읽으므로 기계 판독 주석이 아니다.
  `e2e` 구분선의 "docker + kind + kubectl 필요"는 README「사전 요구사항」과 `test` 타깃 정의가 복원한다.
- `contracts/codegen.py` 3줄 배너 6개(18줄)
- `go/internal/handlers/handlers.go` 3줄
- `scripts/check-journey-mockup.py` 8줄, `scripts/check-journey-flow.js` 4줄(`=====` 계열만),
  `tests/e2e/check_scenario_mapping.py` 4줄

### README 재진술 (복원 경로 ② 저장소 문서) — 49줄

- `Makefile` 머리 11줄 — 레이아웃은 README「디렉터리 구조」, "비즈니스 로직 없음 · 페이크/스텁"은 README 상태 안내가
  복원한다(게다가 실 피드·실 LLM이 기본이 된 지금은 낡았다). 18행 `Generated-output paths verified by make gen-check`는
  `gen-check` 타깃이 복원한다(①).
- `deploy/batch/cronworkflow-ingestion.yaml` ★ 문단 8줄 — "suspend로 착지 · 머지가 곧 적용 · 켜기 전 수동 1회 제출 ·
  켜면 모든 피드로 매시간 HTTP"는 README「배포」가 그대로 적는다. **실제 스펙은 `suspend: false`** 라 주석은 이미 틀려 있었다.
- `deploy/batch/cronworkflow-pipeline.yaml` ★ 머리 6줄 — 같은 README 문단의 재진술.
- `deploy/overlays/prod/kustomization.yaml` 12줄 — `kubectl apply -k deploy/overlays/prod`·Flux 경로·외부 노출은
  README「배포」, 두 CronWorkflow 중 하나만 돈다는 인계 목록은 README와 `cronworkflow-pipeline.yaml`(①)이 복원한다.
- `deploy/batch/kustomization.yaml` 3줄 — 같은 "하나만 돈다" 재진술.
- `deploy/batch/workflow-template.yaml` 머리 3줄 — "집계는 그 슬라이스가 올 때"는 README「범위」.
- `deploy/overlays/prod/batch-pvc.yaml` 4줄 — 체인 연결 시 공유 방식 결정 예고, 스스로 "see README".
- `web/src/screens/Dashboard.tsx` 1줄 — "나머지 6화면은 플레이스홀더"는 README「범위」 재진술이며 compare 착지 후 낡았다.

### 다른 코드의 재진술 (복원 경로 ① 코드) — 13줄

- `scripts/journey-scenarios/JRN-axis-contrast.js` 4줄, `JRN-sentiment-shift.js` 7줄 — 러너/시나리오 역할 분담은
  러너 `scripts/check-journey-flow.js` 머리 주석이 주인이다. sentiment-shift 쪽은 "두 가지"라 쓰고 넷을 나열해 낡아 있었다.
  시나리오 훅 목록(inputs/states/unlock/renders)은 인터페이스 설명이라 남겼다.
- `web/src/shell/nav.ts` 2줄(+첫 줄 부분 수정) — 어느 화면이 구현됐는지는 `App.tsx`가 복원하며, 주석 스스로 그렇게 말했다.

### 작업 흔적 (복원 경로 ② 저장소 문서) — 16줄

- `tests/e2e/specs/ac3-6/7/8-*.spec.ts` 각 4줄 — "그 시나리오가 선언하는 검증 AC는 AC3.x다(테스트 문서의 `검증 AC` 필드)".
  주석이 스스로 가리키듯 테스트 문서가 복원한다. 줄 1의 `// 검증 시나리오:` 선언(기계 판독)과 AC 검증 방법 인용 이하의
  단언 설계 설명은 남겼다.
- `deploy/batch/cronworkflow-ingestion.yaml` `# AC1.1 — 정기 수집 스케줄링` 배너 2줄 — 시나리오 1↔이 파일은 doc-tracker
  「e2e 매핑」의 예외 등재가, 시나리오 1↔AC1.1은 테스트 문서가 복원한다.
- `web/src/screens/Compare.tsx` 2줄 — `AC3.7 … (J2 / V2)` 배너. 폐기 식별자 `J2`를 담고 있었다.

## 유지 — 대표 목록

- 클러스터·런타임 함정: preview 오버레이의 efs access point 연쇄 삭제, `kustomizeconfig.yaml`의 `images:` 경로 무지,
  `e2e-patch.yaml`의 runc read-only mountpoint, prod 오버레이의 Recreate/RWO, `rbac.yaml`의 workflowtaskresults 권한.
- 스케줄 계약 근거: `cronworkflow-ingestion.yaml`의 AC1.1 의무↔필드 대응(누락 보정·Forbid), 재시도 상한 근거.
- 운용 지식: `cronworkflow-pipeline.yaml`의 켜기 전 4단계 중 `analyzer_version: llm-v1` 확인, `attempted=`/`failed=` 읽기,
  exit 3의 의미 — README에 없다.
- 편집 지점 가드: `deploy/base/deployment.yaml`·`workflow-template.yaml`의 "핀 태그는 CI가 쓴다 — 손으로 고치지 않는다".
- 데이터 계약: handlers의 버킷 키 사전식=시간순 조건, store의 누락 파일=빈 슬라이스.
- 테스트 설계 근거: e2e spec의 스케일 무관 비교, 다중 버킷 픽스처, 스모크의 페이크 고정 이유.
- doc 주석: Go 패키지·export 주석, Python `#:` 속성 주석, TS JSDoc.
- 오탐: `web/src/tokens/tokens.css`의 `* {`, `#root {`는 주석이 아니다(지문 패턴이 CSS 셀렉터를 잡음).

## 판단이 갈려 남긴 것

| 대상 | 제거 쪽 근거 | 남긴 이유 |
|------|------|------|
| 단위 테스트·배치 코드·e2e spec의 AC 번호를 담은 줄(남은 풀 중 56줄) | 정의가 꼽은 작업 흔적 유형 | 테스트 문서는 **시나리오 단위**로만 AC를 적는다. 개별 단위 테스트·코드 분기가 어느 AC를 지키는지는 이 태그 말고 복원 경로가 없다 |
| `go/internal/handlers/handlers.go` `New builds Handlers backed by the given lake.` 등 export doc 주석 | 모델 정의 표본 ①(선언 재진술)이 바로 이 줄 | 같은 정의의 유지 대상 「export 식별자 이름으로 시작하는 1줄 Go doc 주석」과 충돌 — 유지 규칙 우선 |
| `deploy/overlays/preview/kustomization.yaml` 머리의 serving/batch 두 절 | README「PR 프리뷰」와 겹친다 | efs 함정·Flux 분담·delete 패치 함정과 한 덩어리 서술이라 부분 제거 시 문맥이 끊긴다 |
| `scripts/check-journey-flow.js`의 `(a)`~`(h)` 규칙 표지, `tokens.css`의 `TKN-*`/`CMP-*` 절 표지 | 구분선 모양 | 모델 규칙 문자·디자인 시스템 식별자로의 추적 앵커다 |
| `domain.py` 상수 묶음 표지, codegen 드라이버의 `# Python`/`# Go`, `run.sh`·`smoke.sh` 단계 번호 | 아래 코드가 복원 | 짧고 읽기 흐름을 돕는 정도 — 비용이 작아 제거로 기울지 않는다 |
| `cronworkflow-pipeline.yaml` 과금 경고 2줄 | README가 비슷하게 적는다 | 켜는 사람이 이 파일을 편집하는 지점의 경고라 편집 지점 가드로 본다 |

## 범위 밖(후속)

- `docs/index.html` 허브에서 이 정책으로의 링크 — 지문 표면 밖, 문서 허브를 소유한 쪽의 후속.
- **Python docstring 본문 · 줄 끝 주석**의 재진술 — 지문 사각지대. 이 패스는 보지 않았다. docstring을 별도 표면으로
  더할지는 다음 task의 몫.
- "원본이 부실해 복원이 안 되는" 사례 — 이 패스에서는 발견하지 못했다(제거한 줄의 원본은 모두 실재·건강).
