# 2026-10-04 scripts-harness-deploy-necessity-pass — 여정 하네스·시나리오·검사기 · 배포 일부 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261004-0003`.

## 판정 범위

남은 `—` 행 중 사람 게이트(`.github/workflows/**`·`contracts/**`·`scripts/check-data-format-change.py` — 리뷰 게이트의
`SENSITIVE_PATHS` 와 워크플로 권한)에 걸리지 않는 것을 400줄 예산까지 묶었다. 각 파일이 한 덩어리다.

- `scripts/check-journey-flow.js` + `scripts/journey-scenarios/*.js` 7파일 — L 215
- `scripts/check-journey-mockup.py`(L 46 · D 22 · E 9) · `scripts/check-mockup-render.py`(D 39 · E 2) ·
  `scripts/check-comment-ledger.py`(D 17 · E 1) — 이 셋의 L 행은 이미 `완료`라 손대지 않았다
- 배포 5파일 — `deploy/base/deployment.yaml` · `deploy/batch/kustomizeconfig.yaml` ·
  `deploy/overlays/preview/kustomization.yaml` · `deploy/overlays/prod/{batch-pvc,kustomization}.yaml` — L 48

**판정 전 399줄(L 309 · D 78 · E 12) → 193줄(L 109 · D 77 · E 7), 제거 206.** 예산 400줄에서 1줄이 남는다 —
다음으로 작은 미판정 덩어리가 2줄(`contracts/codegen.py`·`scripts/check-data-format-change.py`)이고 둘 다 사람 게이트 경로다.
남은 `—` 행(`tokens.css` · `.github/workflows/**` 4 · `deploy/batch/{cronworkflow-pipeline,workflow-template}.yaml` ·
`contracts/codegen.py` · `check-data-format-change.py` · `fake_llm.py` D 이월)은 다음 슬라이스 몫이다.

코드 변경 0 — JS 8파일은 TypeScript 프린터(`removeComments`) 출력이 base 와 같고(코드 토큰 하나를 바꾸는 음성 프로브는 DIFF),
Python 2파일은 docstring 을 걷은 `ast.dump` 가, YAML 3파일은 `yaml.safe_load_all` 결과가 base 와 같다.
`node scripts/check-journey-flow.js .` 은 편집 뒤에도 「여정 페이지 7개 · 710 passed, 0 failed」다.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---|---|---:|
| `deploy/base/deployment.yaml` | L 7 | L 5 | 2 |
| `deploy/batch/kustomizeconfig.yaml` | L 10 | L 10 | 0 |
| `deploy/overlays/preview/kustomization.yaml` | L 16 | L 16 | 0 |
| `deploy/overlays/prod/batch-pvc.yaml` | L 6 | L 5 | 1 |
| `deploy/overlays/prod/kustomization.yaml` | L 9 | L 7 | 2 |
| `scripts/check-comment-ledger.py` | D 17 · E 1 | D 17 · E 1 | 0 |
| `scripts/check-journey-flow.js` | L 41 | L 26 | 15 |
| `scripts/check-journey-mockup.py` | L 46 · D 22 · E 9 | L 25 · D 21 · E 5 | 26 |
| `scripts/check-mockup-render.py` | D 39 · E 2 | D 39 · E 1 | 1 |
| `scripts/journey-scenarios/JRN-axis-contrast.js` | L 24 | L 1 | 23 |
| `scripts/journey-scenarios/JRN-daily-scan.js` | L 24 | L 2 | 22 |
| `scripts/journey-scenarios/JRN-ingestion-recovery.js` | L 28 | L 4 | 24 |
| `scripts/journey-scenarios/JRN-judgment-debug.js` | L 25 | L 3 | 22 |
| `scripts/journey-scenarios/JRN-logic-backfill.js` | L 33 | L 2 | 31 |
| `scripts/journey-scenarios/JRN-sentiment-shift.js` | L 15 | L 2 | 13 |
| `scripts/journey-scenarios/JRN-spike-verification.js` | L 25 | L 1 | 24 |

## 제거 유형

| 유형 | 자리 |
|---|---|
| 단언 메시지 재진술 | 시나리오의 조작 머리(`/* <input type=search> — 목록을 실제로 필터한다 */` 류 — 바로 아래 `t.is(…, '(d) …')` 가 같은 문장) · 상태 블록 라벨(`/* no-baseline — … */` — 아래 `t.shown(d, 'no-baseline')` 와 메시지가 같은 id 를 든다) · 하네스 (a)~(h) 배너 아래의 규칙 문장 · `check-journey-mockup.py` 의 `(b)`·`(d)`·`(e)`·`(h)` 항목 표지 |
| 이름·코드 재진술 | 시나리오 파일 머리 「`JRN-x` — 페이지 고유 조작 시나리오」(파일 이름과 하네스 머리가 든다) · `(c)`·`(d)`·`(e)`·`(h)` 메서드 머리(하네스가 `unlock`·`inputs`·`states`·`renders` 계약을 정의한다) · 단계 이동 헬퍼(`toDelta`·`walkToRun` 류) · `typeIn` · 하네스 도구상자·`readStates` · `strip_code` · `pages`·`declared` 의 자명한 키→값 · 「폰트 스택 따옴표」 · prod 오버레이 머리 요약 · 「No storageClassName」 |
| 구분선·절 표지 | 하네스 `---------- (a) … ----------` 배너 · 머리 안 `── 구조 ──` · `check-journey-mockup.py` 의 `# R3 —`…`# R7 —` 표지와 `── R10 ──`~`── R13 ──` 절 머리(모듈 docstring 의 규칙 목록이 정본이고, `fail("Rn", …)` 이 코드에서 같은 이름을 든다) |
| 저장소 문서 재진술 | 여정 문서 §3·`STP-dry-run` 인용 · `unlock` 단계별 제품 근거(「표본을 돌리기 전에는 전량 실행을 열지 않는다」 류 — 여정 문서의 단계 서술) · 모델 정의 인용(하네스·CI 부재는 drift) 2곳 · README 「운영 고정」·`rbac.yaml` 포인터 |
| 낡는 수치 | 「예외 등재(규칙 8) … 현재는 0건」 |

## 판단이 갈린 것

- **옛 판정의 번복.** 2026-09-26 journey-harness-axis-pass 는 복원 가능성 기준으로 하네스·시나리오 주석 대부분을 「전량 유지」로
  판정했다(②③ 히트가 없어 복원 경로가 없다는 근거). 필요성 시험은 복원 경로가 아니라 「지우면 틀린 판단을 하는가」를 물으므로,
  단언 메시지·하네스 계약이 같은 명제를 이미 들고 있는 머리는 사유를 대지 못한다. 옛 패스 문서는 당시 기록이라 고치지 않는다.
- **「정체 확인」 7벌은 전부 남긴다.** 시나리오마다 자기 `shape()` 헬퍼 위에 같은 2줄이 있다. 사본이지만 각 파일이 독립 모듈이고,
  그 파일의 `shape()` 를 「값 변경 단언이 이미 있으니 군더더기」로 지우려는 사람이 읽는 자리가 각자 그 위다. 공용 헬퍼로 옮기는 것은
  하네스 도구상자(`t`) 변경이라 이 판정의 범위(코드 변경 0)를 넘는다 — 그렇게 옮기면 주석도 하나로 줄일 수 있다.
- **`pickOption` 의 「진짜 `<select>` 에만 있는 경로」 4벌도 남긴다** — 같은 이유. 이 문장이 없으면 `sel.value = v` 로 「단순화」하기 쉽고,
  그러면 `.value` 를 붙인 가짜 select 도 (d) 를 통과한다.
- **`check-journey-mockup.py` 규칙 목록의 정본은 모듈 docstring.** 코드 쪽 `# R3 —` 류 표지와 `── R11 ──` 절 머리는 docstring 목록의
  사본이라 걷었다. 반대로 docstring 의 R9 항목 끝 「모델 정의」 인용은 규칙 문장의 재진술이라 걷었다.
- **`JRN-judgment-debug.js` 머리는 고쳐 썼다.** 여정 뼈대 서술(여정 문서 재진술)은 걷고, 「상태 대부분은 고른 결과로 도달」과
  「기본 결과 R-2609-0412 는 응답↔저장값 불일치 사례」(픽스처의 성질 — 상태 블록들이 그 결과를 기점으로 삼는 이유)만 2줄로 남겼다.
- **`deployment.yaml` 이미지 태그 주석은 4줄 → 3줄.** README 포인터만 걷고 「CI 소유 · 불변 태그라 `IfNotPresent` · 이름으로 재태깅」은 그대로 옮겼다.

## 유지 목록 (필요 사유)

- `deploy/base/deployment.yaml` — L: `data` emptyDir 이음새 금지 2줄(오버레이가 채우거나 그대로 두고 `ECON_DATA_ROOT` 를 돌린다 — 지우면 kind e2e·prod 가 함께 깨진다) · 이미지 태그 3줄(CI 소유라 손으로 고치지 않는다 · 불변 태그라 `IfNotPresent` 가 맞다 — 지우면 `Always` 로 바꾸거나 태그를 손으로 올린다 · preview·e2e 가 이미지 이름으로 재태깅한다 — 이름을 바꾸면 재태깅이 조용히 빠진다).
- `deploy/batch/kustomizeconfig.yaml` — L: 변환기가 Pod 모양 경로만 알아 WorkflowTemplate 의 이미지를 조용히 건너뛴다 5줄 · 오버레이가 아니라 여기 둬야 모든 오버레이가 상속한다 4줄(+빈 줄 1) — 지우면 「쓸데없는 설정」으로 지워 재태깅이 배치에서 조용히 빠진다.
- `deploy/overlays/preview/kustomization.yaml` — L: flux-cd-apps 의 `apps/econ-monitor-preview` 가 이 경로를 가리킨다 2줄(옮기면 레포 밖이 끊긴다) · PVC 를 두지 않는 이유 7줄(`efs` 가 PVC 이름으로 액세스 포인트를 공유 — 고정 이름이면 한 프리뷰 삭제가 전부를 지운다) · Flux 없이는 단계 간 볼륨이 없다 2줄 · 스케줄 삭제 패치는 이름으로 걸리니 새 CronWorkflow 는 같은 변경에 삭제를 더해야 한다 4줄(+빈 줄 1).
- `deploy/overlays/prod/batch-pvc.yaml` — L: 배치·서빙이 아무 노드에서 동시에 붙어 RWX 여야 한다 2줄 · `efs` 가 고정 uid/gid 라 fsGroup 처리가 필요 없다 3줄.
- `deploy/overlays/prod/kustomization.yaml` — L: RWX 라 롤링 업데이트에 Recreate 가드가 필요 없다 3줄(지우면 RWO 시절의 `Recreate` 를 되살린다) · `/spec/volumes` 가 템플릿 전역이라 단계를 더해도 패치가 필요 없다 4줄.
- `scripts/check-comment-ledger.py` — D: 모듈(versionScript 와 추출 규칙이 갈라지면 원장이 모르는 파일이 생긴다) 3줄 · D·E 추출기(`X:` 로 파싱 실패를 드러낸다 · 지시자 뒤 사유는 E 로 남긴다) 6줄 · 줄 스캐너 둘의 범위·문자열 추적 2줄 · `// indirect` 제외 이유 2줄 · `measure` 반환이 versionScript 해시 입력과 같아야 하는 이유 3줄 · `parse`·`check_surface` 요약 1줄씩. E: 「첫 `## ` 앞은 머리말」 — `in_allowed = True` 초기값의 이유.
- `scripts/check-journey-flow.js` — L: 머리 — DOM 에서 굴려야만 판정되는 이유 3줄 · 기대값은 페이지 밖 SSOT 에서(자기참조면 어떤 뮤테이션도 통과) 4줄 · 러너는 여정 무관, 페이지 고유 지식은 시나리오로 분리 8줄 · fail-closed 3줄(+빈 줄) · `require()` 절대화 1줄(상대 경로로 불리면 시나리오를 못 찾는다) · 화면 단위 파일이 `data-journey` 미선언으로 자연히 빠진다 1줄(명시 필터를 「더하려는」 사람에게) · `unlock` 훅이 죽은 버튼과 조건부 버튼을 가른다 1줄.
- `scripts/check-journey-mockup.py` — L: HTML 주석 선제거(주석 안 태그 오탐) · 헤더는 구분선 앞 행으로(키워드로 거르면 분기 행이 조용히 사라진다) 2줄 · 인덱스 표 행 모양 · 상태 표는 하네스와 같은 표를 읽는다(단일 등재) · `<body>` 선분리(탐욕 `[^>]*` 가 두 번째 선언을 삼킨다) 2줄 · 정적 판정은 「판정 가능한 형태인가」까지 2줄 · `.seg` 관용구 금지 2줄 · 분기 대조를 `data-goto` 선언 순서로, 같은 여정 분기도 `href` 요구 3줄 · 타 여정 조각 착지 4줄 · 화면 단위 페이지는 상한 래칫 2줄 · 시나리오 부재를 정적으로도 잡는 이유 3줄 · `<script>`/`<style>` 안 템플릿 오탐 2줄. D: 모듈 요약 · 기대값은 SSOT 에서 · R1~R13 규칙 목록(코드 표지의 정본) · `_product_plane` 요약. E: `<body …>` 태그를 빼는 이유(그 태그가 `data-journey` 선언) · `journeys` 중첩 모양 · 화면 단위 파일 `continue` · `_nav_dest` 모양 · 셸 없는 파일 `continue`.
- `scripts/check-mockup-render.py` — D: 모듈(기계로 재현할 수 있는 세 축 · R4 가 네비 항목만 보는 범위 · 기대값은 SSOT 에서 · 사용법) · 함수 요약(각 표의 출처·반환 모양) · 여정 절 항목이 흡수 화면 전부에 귀속되는 이유 · 네비 그룹을 등장 순서로 정하는 이유(`·`/`&middot;` 표기 차가 실체 없는 차이를 만든다). E: `.03em -> 0.03em` — 정규식의 의도를 예로 보인다.
- `scripts/journey-scenarios/*.js` — L: 「정체 확인」 7벌(jsdom 은 `<span>` 에도 `.value` 를 붙여 값 변경 단언만으로는 모양만 입력인 요소를 못 거른다 — 지우면 `shape()` 를 군더더기로 지운다) · `pickOption` 4벌(daily-scan · ingestion-recovery · logic-backfill · sentiment-shift — `<option>.selected` 경로는 진짜 `<select>` 에만 있다) · ingestion-recovery 「시도 0」 구간이 성공 0 과 구분되는 모양 · 원인 라디오가 전진 선행 행동이자 진단 배너 스위치 · judgment-debug 머리 2줄(위 「판단이 갈린 것」) · 원문 열기를 `data-url` 로 단언하는 이유((h) 정적 동작 — 지우면 `href` 로 「고쳐」 외부 자원을 품게 된다).
