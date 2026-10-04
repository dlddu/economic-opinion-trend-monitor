# 2026-10-04 workflows-batch-tokens-necessity-pass — 워크플로 3 · 배치 배포 2 · tokens.css 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261004-0004`.

## 판정 범위

남은 `—` 12행(L 9 · D 3, 215줄) 중 리뷰 게이트를 사람 뒤로 보내지 않는 6행을 묶었다.

- `.github/workflows/{checks,ci,image}.yml` — L 73
- `deploy/batch/{cronworkflow-pipeline,workflow-template}.yaml` — L 50
- `web/src/tokens/tokens.css` — L 63

**판정 전 186줄 → 123줄, 제거 63.** 남은 `—` 는 `review-gate.yml`(L 7) · `contracts/codegen.py`(L 2 · D 2) ·
`scripts/check-data-format-change.py`(L 2 · D 8) · `fake_llm.py`(D 8) 29줄이다. 앞의 셋은 `SENSITIVE_PATHS`(MA1·MA5)
경로 자체이고, `fake_llm.py` 는 걷을 docstring 줄(``no_call_reason="keyword_analyzer"``)이 MA4 를 발화한다
(2026-10-04 python-packages-go-necessity-pass 실측). 넷 다 `review/manual-approval` 을 사람에게 넘기므로 무인 몫과 한 PR 에
섞지 않았다 — 이 패스로 무인 몫이 0 이 되어 다음 슬라이스는 그 29줄만 담는다.

코드 변경 0 — YAML 5파일은 `yaml.safe_load_all` 결과가 base 와 같다(`run: |` 블록 스칼라 안의 셸 줄머리 주석만 걷고 비교 —
셸이 실행하지 않는 줄이다). `tokens.css` 는 `/* … */` 를 걷고 공백을 접은 결과가 base 와 같다. 값 하나를 바꾸는 음성 프로브는
두 판정기 모두 DIFF. `check-mockup-render.py .`·`check-journey-mockup.py .` 출력은 base 와 바이트 동일(R3 마커 보존).

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---|---|---:|
| `.github/workflows/checks.yml` | L 13 | L 10 | 3 |
| `.github/workflows/ci.yml` | L 26 | L 16 | 10 |
| `.github/workflows/image.yml` | L 34 | L 19 | 15 |
| `deploy/batch/cronworkflow-pipeline.yaml` | L 19 | L 5 | 14 |
| `deploy/batch/workflow-template.yaml` | L 31 | L 25 | 6 |
| `web/src/tokens/tokens.css` | L 63 | L 48 | 15 |

## 제거 유형

| 유형 | 자리 |
|---|---|
| 틀린 주석 | `cronworkflow-pipeline.yaml` 머리의 「Before unsuspending」 3단계 절차와 과금 경고 — 이 CronWorkflow 는 이미 `suspend: false` 다(정책 README 가 첫 판정의 실례로 드는 것과 같은 꼴) · `ci.yml` 의 끊긴 문장 「Same Dockerfiles and cache scopes as image.yml. Read-only here: the」 — 사유가 문장째 잘려 있어 고칠 내용이 없다 |
| 코드 재진술 | `ci.yml` e2e 잡 머리(「Serving-path e2e on a kind cluster」 · 「Parallel to build」) · 「no provenance attestation needed」 · `image.yml` 의 `needs: [publish]`·`permissions` 머리 · 핀 스크립트의 정규식·파일 목록·잔여 검사 설명(바로 아래 잔여 검사가 실패를 즉시 드러낸다) · `checks.yml` 의 diff 실패 문장(`::warning::` 이 같은 말) |
| 다른 주석의 사본 | `image.yml` 머리 「Tags are immutable … IfNotPresent」(`deploy/base/deployment.yaml` 유지분이 정본) · `checks.yml` 의 「docs/ 를 읽는 검사는 따로 돈다」(`ci.yml` 의 두 잡 머리가 정본) · `tokens.css` 의 규칙 5 대조 규약 사본 4(`.gridline`·`.sent-*`·분리 전후 · `table.tbl` — 정본은 설계 트래커가 인용하는 「여정 이탈 카드」 머리) |
| 저장소 문서·경위 재진술 | 옛 `sha-` 태그 경위 · Source-Commit 트레일러 서술 · 롤백 절차(README 「운영 고정」) · `workflow-template.yaml` 의 여정 단계 라벨(`JRN-logic-backfill STP-…`)과 `sample` 의미(CLI 가 소유) |
| 목업 재진술 | `tokens.css` 파일 머리 3 · 버튼 리셋 · 페르소나 태그 · 열 수 수식어 · 순위 행 변화량 · 차트 아래 간격 · 선택 행 강조 · 보존된 원문 조판 |
| 구분선 | `tokens.css` 「dashboard controls」·「status / placeholder」(마커 없는 절 표지) · 빈 `#` 2 |

## 판단이 갈린 것

- **`CMP-*`/`PAT-*` 절 머리는 전부 남긴다.** `check-mockup-render.py` 의 `markers()` 가 `web/src` 주석에서 이 이름을 읽어 R3 의
  구현측 모집단을 만든다. 정책의 「기계가 읽는 주석」 열거에는 없지만, 지우면 필수 `required` 가 깨진다는 사유가 선다.
  `TKN-*` 9줄과 `STP-*` 절 머리는 게이트가 읽지 않는데도 남긴다 — 값이 디자인 시스템 정의·목업 단계와 **같아야 하는** 자리를
  가리키는 유일한 표지라, 지우면 토큰을 고치러 온 사람이 대응 정의를 찾는 데 파일 전체를 뒤져야 한다.
- **규칙 5 대조 규약은 정본 하나만 남긴다.** 접두 선택자 블록마다 「목업에 없는 이름으로 선언한다(규칙 5 대조 규약)」가
  되풀이돼 있었다. 설계 트래커(「`tokens.css:992-993` 이 자기선언한다」)가 「여정 이탈 카드 (compare)」 머리를 그 규약의 자리로 인용하므로
  그것을 정본으로 두고 사본 넷을 걷었다. 줄 번호 인용 자체는 이미 낡은 스냅숏이라 손대지 않는다. 사본이 아니라 **그 블록만의 사유**를
  말하는 머리(`.trace-` — 목업이 인라인 스크립트로 조립해 대조가 신호를 못 준다 · `.col-8` 예외 · `.btn.pri` 공유 예외)는 남겼다.
- **`cronworkflow-pipeline.yaml` 의 상호 배타 가드는 개작해 남긴다.** 옛 문면은 「이것을 켜려면 저것을 끄라」였는데 이것은 이미 켜져 있다.
  지금 틀린 판단을 할 사람은 `econ-ingestion-hourly` 를 켜려는 사람이므로 「둘 다 켜 두지 않는다」로 대칭으로 다시 썼다.
- **`ci.yml` 의 끊긴 문장은 고치지 않고 지운다.** 「Read-only here」 의 사유(왜 e2e 는 `cache-to` 를 두지 않는가)를 이 패스에서
  재구성하면 근거 없는 주석을 새로 짓는 것이 된다. 캐시 스코프를 공유한다는 사실은 위 arm64 머리가 이미 든다.

## 유지 목록

| 파일 | 주석 | 필요 사유 |
|---|---|---|
| `checks.yml` | 머리 4줄 (`always()`) | 지우면 의존 잡 실패가 `required` 를 *건너뛰게* 하고 GitHub 는 건너뛴 필수 체크를 통과로 본다 — 조용히 게이트가 열린다 |
| `checks.yml` | `changes` 머리 5줄 | 워크플로 레벨 `paths:` 로 바꾸면 필수 체크가 생기지 않아 영원히 pending 이 된다 · `code` 는 확인된 경로만 빼는 제외 목록이라 새 경로를 함부로 넣으면 build·e2e 가 조용히 건너뛰어진다 |
| `checks.yml` | merge ref 1줄 | `HEAD^1..HEAD` 가 왜 「머지되면 바뀌는 파일」인지 — `fetch-depth`·비교 기준을 바꾸려는 사람이 확인할 사실 |
| `ci.yml` | `scenario-mapping`·`comment-ledger` 머리 각 2줄 | build 에 접어 넣으면 `code=false` 인 문서·원장 PR 에서 그 검사가 조용히 빠진다 |
| `ci.yml` | arm64 4줄 | amd64 로 바꾸면 `serving`·`batch` 캐시 스코프(arm64 층)를 못 써 매 PR 이 콜드 빌드가 된다 |
| `ci.yml` | `cluster_name` 1줄 | `E2E_CLUSTER` 와 같아야 한다 — 어긋나면 post 단계가 엉뚱한 이름을 지운다 |
| `ci.yml` | 백그라운드 서브셸 2줄 | stdio 를 끊지 않으면 러너가 스텝 출력이 닫히길 기다리며 멈춘다(러너 동작) |
| `ci.yml` | preview 오버레이 2줄 · 재태깅 확인 3줄 | Flux 만 빌드하는 오버레이라 이 검사가 유일한 감시이고, `images:` 는 모르는 경로를 조용히 건너뛴다 · 사본을 오버레이 옆에 두는 것은 상대 경로 때문이다 |
| `image.yml` | PR 경로 필터 없음 3줄 | 필터를 걸면 문서 전용 PR 의 preview 가 존재하지 않는 head SHA 이미지를 당긴다 |
| `image.yml` | main push 필터 5줄 | 필터를 걷으면 무관한 머지마다 운영 Pod 가 재시작되고, 제외 경로를 함부로 늘리면 Dockerfile·Flux 가 읽는 변경이 배포되지 않는다 |
| `image.yml` | PR head SHA 2줄 | `github.sha` 로 되돌리면 임시 merge 커밋으로 태깅돼 preview 가 찾는 태그가 없다 |
| `image.yml` | 캐시 스코프 1줄 | 스코프를 합치면 두 이미지가 서로의 캐시를 밀어낸다(`ci.yml` e2e 도 같은 스코프를 읽는다) |
| `image.yml` | `pin` checkout 2줄 | `ref`를 main HEAD 로 바꾸면 빌드하지 않은 커밋을 배포하고, `fetch-depth: 0` 을 빼면 조상 판정이 `2>/dev/null` 에 묻혀 늦은 실행이 새 배포를 덮는다 |
| `image.yml` | 재귀 없음 2줄 | PAT 로 바꾸거나 `deploy` push 에 워크플로를 걸면 재귀가 생긴다 — 기본 토큰의 플랫폼 동작에 기대는 자리 |
| `image.yml` | 늦은 실행 2줄 · lease 1줄 | 건너뛰기 판정과 빈 lease(=브랜치가 없어야 함)의 의미는 코드만으로 읽기 어렵고, 잘못 고치면 옛 이미지가 조용히 배포된다 |
| `cronworkflow-pipeline.yaml` | 상호 배타 2줄 | 둘 다 켜면 매시간 두 번 수집한다 — 편집 지점 가드 |
| `cronworkflow-pipeline.yaml` | 누락 보정 1줄 · 실행 상한 2줄 | 스케줄 계약의 근거 — `cronworkflow-ingestion.yaml` 유지분과 같다 |
| `workflow-template.yaml` | 머리 3줄 | `reprocess`·`publish` 는 CronWorkflow 가 참조하지 않아 죽은 템플릿처럼 보인다 — 서빙 Pod 가 제출하고 운영 입력이 파라미터 기본값으로 온다 |
| `workflow-template.yaml` | CI 소유 태그 2줄 | 편집 지점 가드(금지 + 출처) |
| `workflow-template.yaml` | 오버레이 이음새 1줄 | `data` 볼륨 이름을 바꾸면 prod 패치가 PVC 를 다른 볼륨으로 더하고 템플릿은 emptyDir 에 쓴다 |
| `workflow-template.yaml` | `command` 명시 3줄 | 지우면 emissary 가 비공개 레지스트리에서 엔트리포인트를 조회해야 해 Pod 가 뜨지 않는다 |
| `workflow-template.yaml` | 순차 1줄 | 단계를 병렬로 바꾸면 앞 단계 산출을 읽지 못한다 |
| `workflow-template.yaml` | exit 2 비재시도 3+2줄 | 운영자 오류·거부 결정은 재시도로 풀리지 않는다 — `expression` 을 걷으려는 사람이 읽을 근거 |
| `workflow-template.yaml` | temperature 2줄 | chat-completions 의 문서화되지 않은 동작(GPT-5.x 는 기본값 외 temperature 를 400 으로 거부) |
| `workflow-template.yaml` | Secret 필수 2줄 | `optional` 로 바꾸면 Pod 가 떠서 매 재시도마다 exit 2 로 끝난다 |
| `workflow-template.yaml` | 재시도 안전성 3+1+2줄 | 과금되는 단계에서 재시도를 켜 둔 근거(체크포인트 재개) · 재분석이 없는 단계 · 순수 재계산 |
| `tokens.css` | `TKN-*` 9 · `CMP-*`/`PAT-*`/`STP-*` 절 머리 | 위 「판단이 갈린 것」 첫 항 |
| `tokens.css` | 「여정 이탈 카드」 머리 | 규칙 5 대조 규약의 정본 — 설계 트래커가 이 자리를 인용한다 |
| `tokens.css` | 사이드바 레일 1 | 전체 페이지 캡처처럼 스티키가 따라오지 않는 렌더에서 첫 화면 아래 남색이 끊긴다 |
| `tokens.css` | note 간격 1 | 컴포넌트에 간격을 주면 인스턴스의 인라인 간격과 겹쳐 두 배가 된다 |
| `tokens.css` | `1180px` 우선순위 1 · `<button>` 리셋 해제 1 | 선택자를 단순화하면 뒤쪽 공용 규칙·셸 리셋이 조용히 이긴다 |
| `tokens.css` | 정규화 대비 1 · 건수 구분 1 | 흐림·분리를 걷으면 「구분 표기」가 참이지만 보이지 않게 된다 |
| `tokens.css` | `.trace-` 접두 1 · 끊긴 홉 1 · 주소 생략 금지 1 | 목업 이름을 쓰면 규칙 5 대조가 신호를 주지 못한다 · 없는 계층을 숨기면 「분석 없음」과 「수집 없음」이 구분되지 않는다 · 잘라 내면 대조에 못 쓴다 |
| `tokens.css` | 검색 빈 상태 1 | 「데이터 없음」과 합치면 다른 두 사건이 같은 문면이 된다 |
| `tokens.css` | `.btn.pri` 공유 예외 1 · `.dbg-metric` 1 | 접두 규약의 예외인 이유 · `.metric` 을 재사용하면 카드용 패딩이 붙는다 |
