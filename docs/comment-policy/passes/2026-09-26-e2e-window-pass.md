# e2e-window-pass — 창이 들인 9파일 + e2e 배치 하네스 가족 전건 판정

기준 커밋 `dfd3bc7`(#158 착지 직후 `main`). 추적 task 는 `rct_20260926-0007`
(모델 `tbm_econ-opinion-monitor-comment-redundancy`).

**판정 대상은 원장 32행 / 주석 389줄**이고, 네 복원 경로(① 코드 ② 저장소 문서 ③ PR ④ 커밋
메시지)를 **전건** 대어 판정했다. 결과: **제거 47줄 · 유지 342줄 · 행 31개가 판정 축 `①②③④`로
닫힘 · 행 1개 삭제**(`scripts/check-comment-ledger.py` — 주석 0줄).

| 지표 | 기준 커밋 | 이 패스 뒤 |
|---|---:|---:|
| 판정 대상 주석 | 3,042줄 / 199파일 | **2,995줄 / 198파일** |
| 원장 행 | 199 | **198** |
| 판정 축 `①②③④` | 0행 · 0줄 | **31행 · 342줄** |
| 일부 축만 | 64행 · 1,123줄 | 53행 · 1,065줄 |
| 미판정 `—` | 135행 · 1,919줄 | 114행 · 1,588줄 |

## 이 슬라이스를 고른 근거

정의 「판정 슬라이스」는 판정 축이 `①②③④`가 아닌 행을 파일 공유 덩어리로 묶어 **주석 400줄까지**
채우라고 하고, 좁히는 정당한 사유는 **「파일이 실제로 겹치는 열린 PR」** 하나다.

- **⑴ 이 task 의 창이 들인 9파일 233줄** — 창 `635faad..dfd3bc7` 이 옛 범위에 **75줄**을 새로 들였고
  (#151 62줄 · #158 13줄) 그 9파일의 행은 전건 판정 축 `—`였다. 저작 PR 이 둘뿐이라 ③④ 근거를 한
  번에 읽을 수 있다.
- **⑵ 예산을 채우는 `tests/e2e/k8s/batch/` 의 완결된 가족 156줄** — `ingest-job-*` 14행 95줄 ·
  `aggregate-job-*` 4행 27줄 · 단독 5행(`bronze-shell` 3 · `data-pvc` 4 · `feed-double` 8 ·
  `kustomization` 8 · `llm-double` 11) 34줄. 가족 단위로 가져간 것은 사본 관계가 한 번에 드러나기
  때문이다.
- **뺀 것**: 열린 **PR #159**(`ea82cb08`, `review/manual-approval` 사람 게이트 대기로 BLOCKED)가
  고치는 32행 — 그 PR 은 `.github/workflows/**`·`Dockerfile*`·`.gitignore`·`web/vite.config.ts` 와
  픽스처 피드 행을 판정 중이다. **파일이 실제로 겹치므로** 정의가 인정하는 축소 사유에 해당한다.
- **예산 경계**: 389 + 다음 가장 작은 덩어리(`timeshift-job.yaml` 15)는 400을 넘는다. 그래서
  `analyze-job-*` 가족 12행 76줄과 `timeshift-job.yaml` 15줄은 다음 슬라이스의 몫이다.

## 이 패스가 새로 잰 것 — ④ 는 이 레포에서 거의 비어 있다

판정 대상 32파일의 주석을 들인 커밋 23개의 메시지를 전수 읽었다. **`#3`·`#13`·`#25`·`#28`·`#55`·
`#59`·`#121` 일곱 건 말고는 전부 「제목 한 줄 + `Co-authored-by` 트레일러」**다(squash 머지). 즉
이 레포에서 경로 ④ 는 제목이 말하는 것 — 어느 묶음의 하네스·spec 이 언제 섰는지 — 만 복원한다.
그래서 아래 판정에서 ④ 가 단독으로 무언가를 닫은 자리는 없고, 닫은 것은 ③(PR 본문)이다.

경로 ③ 을 적용할 때는 정책 `README.md` 의 판별식을 그대로 썼다 — **같은 명제가 저작 PR 본문에
있으면 ③ 으로 닫되, 그 줄이 편집자에게 「이 값이 무엇과 같아야 하는가 / 무엇을 넣지 말라 / 이
순서를 바꾸면 무엇이 조용히 깨지는가」를 말하면 남긴다.** 이 레포의 하네스 주석은 대부분 후자여서,
③ 가 서사를 닫아도 가드는 살아남았다.

## 제거 47줄 — 복원 경로별 근거

### ⑴ `tests/e2e/k8s/e2e-patch.yaml` 19 → 10 (**−9**)

#151 이 배선을 갈면서 머리를 5줄 → 19줄로 늘린 자리다.

| 지운 것 | 복원처 |
|---|---|
| 「Strategic-merge patch: never pull the side-loaded image, and point the serving store at the aggregation batch's data root … instead of giving serving fixture data of its own」 3줄 | `imagePullPolicy: Never`·`ECON_DATA_ROOT: /lake/aggregation`·`claimName` 세 선언(①) + PR #151 ⑴ 「`gold-fixtures` ConfigMap 대신 배치 클레임(`k8s/batch/data-pvc.yaml`)을 `/lake`에 readOnly로 붙이고 `ECON_DATA_ROOT=/lake/aggregation`으로 집계 기준 루트를 가리킨다」(③, 축자) |
| 「The store reads … treats missing files as empty datasets, so no restart is needed … and by the time Playwright runs the API and the browser read the batch's own output」 3줄 | PR #151 ⑴ 「store … 요청마다 `<root>/gold/*.jsonl`을 읽고 없는 파일을 빈 데이터셋으로 다루므로 **재기동이 필요 없다**: 서빙 Pod는 빈 루트로 떠서 health를 통과하고, 집계 체인이 같은 디렉터리에 Gold를 쓰고, spec이 도는 시점에는 그 값이 보인다」(③, 축자). 같은 명제의 사본이 `deploy/base/deployment.yaml` 머리에도 있었다(아래 ⑶) |
| 「additive, so the base stays the deployable seam (prod fills it with its own PVC) and this patch needs no list-replace directive」의 서술부 + 「`ECON_DATA_ROOT` is what actually decides which root serving reads」 | PR #151 ⑴ 「base의 `data` emptyDir은 **손대지 않고 옆에** 붙였다 — 오버레이 이음새(prod는 자기 PVC로 채운다)가 유지되고, 리스트 교체 지시어(`$patch: replace`) 없이 순수 가산 병합으로 끝난다」(③, 축자) · 마지막 문장은 바로 아래 `env` 선언(①). **금지 자체는 가드로 남겼다** |
| 「every batch chain owns a data root on that one claim (**run.sh 4a~4g**)」·「the aggregation chain's baseline root is the one the serving screens are asserted against (**AC3.6~3.8**)」 | README 가드 조항 「가드는 **개수·열거·행 위치**를 담지 않는다 — 파일이 자라면 그 표현이 조용히 거짓이 된다」. 루트 관례는 `tests/e2e/fixtures/feeds/README.md` 와 `ingest-job-ops.yaml`(원장이 주인으로 적은 행)이, AC 꼬리표는 spec 의 `// 검증 시나리오:` 와 doc-tracker e2e 매핑이 복원한다 |

유지 10줄: **한 kind 노드에 두 Pod 가 있어 ReadWriteOnce 로도 동시 마운트가 성립한다**는 클러스터
제약(PR #151 본문에 없다 — 그 절은 「port-forward 를 다시 세우지 않아도 된다」까지만 말한다) ·
**가산 유지 금지 가드**(리스트 교체 지시어를 넣지 말라) · **read-only 마운트 안에 runc 가
mountpoint 를 만들지 못한다**는 런타임 함정(2026-09-18 판정 승계, 정책이 유지 대상으로 예시한 항목).

### ⑵ `tests/e2e/k8s/kustomization.yaml` 6 → 2 (**−4**)

「이미지를 로컬 빌드해 `kind load docker-image` 로 사이드로드한다(imagePullPolicy: Never — 레지스트리
무관)」는 같은 파일의 `images:` 블록과 `e2e-patch.yaml` 의 `imagePullPolicy` 가 복원한다(①).
「서빙이 픽스처가 아니라 파이프라인이 쓴 Gold 를 읽는다」는 **`e2e-patch.yaml` 머리가 주인**인
사본이고 PR #151 이 축자로 적는다(③).

유지 2줄 — 「deploy/base 를 오버레이한다(e2e 전용 사본을 세우지 않는다): 배포본을 CI 에서 실제로
적용하는 것이 base 를 정직하게 유지한다」. 저작 PR #2·#3 본문에도, README 에도 없다.

### ⑶ `deploy/base/deployment.yaml` 11 → 7 (**−4**) · `deploy/base/kustomization.yaml` 9 → 5 (**−4**)

| 지운 것 | 복원처 |
|---|---|
| 「One serving Pod: API + static web at :8080」 | `replicas: 1` · `containerPort: 8080` · `service.yaml`(①) |
| 「The store reads <ECON_DATA_ROOT>/gold/*.jsonl and treats missing files as empty datasets, so the base runs (empty dashboard) even before any pipeline writes Gold」 2줄 | **저작 PR #3 본문이 축자** — 「`/data`는 emptyDir이라 Gold 파이프라인이 올라가기 전에도 정상 기동한다(빈 대시보드 — 스토어가 파일 부재를 빈 데이터셋으로 처리)」(③). `e2e-patch.yaml` 머리에 있던 같은 명제의 사본과 함께 걷었다 |
| 「Deployable serving stack (environment-agnostic): the Go API binary with the web bundle baked in, reading Gold from an emptyDir at /data」 2줄 | `resources:` 목록 + `deployment.yaml` 의 `image:`·`volumes:`(①) · PR #3 의 같은 항목(③) |
| 「Overlays swap the data volume (prod: PVC, preview/e2e: the e2e batch claim)」 | `deployment.yaml` 머리의 이음새 문장과 **같은 명제의 사본** — emptyDir 이 선언된 파일을 주인으로 뒀다 |

유지: `deployment.yaml` 은 이음새 **금지 가드 2줄**로 정정하고(「이 emptyDir 을 지우지 말라 — 오버레이가
채우거나 그대로 두고 `ECON_DATA_ROOT` 를 딴 데로 돌린다」) 앞선 패스들이 유지한 4줄(전용 신원 포인터 ·
CI 가 태그를 소유한다는 가드 · 불변 태그라 `IfNotPresent` 가 맞다는 근거)은 그대로다.
`kustomization.yaml` 은 pin-guard-pass 가 유지한 「`images:` 트랜스포머를 base 에 두지 않는 이유」
5줄이 남는다.

### ⑷ `scripts/check-comment-ledger.py` 13 → **0** (행 삭제)

#158 이 신설한 게이트 자신의 주석이다. 13줄 전량이 **구분선과 규칙 이름 앵커**였다.

| 지운 것 | 복원처 |
|---|---|
| `# R1` ~ `# R9` 9줄 | 각 블록의 `fail.append(f"R1 원장에 허용되지 않은 절이 있다 …")` 가 **같은 규칙 번호로 시작해 규칙을 다시 진술한다**(①). PR #158 본문도 아홉 규칙을 이름으로 열거한다(「절 구성(R1) · 표 밖 산문 금지(R2) · 집계 행 금지(R3) · 판정일 형식(R4) · 판정 축 표기(R5) · 파일 소속 유일·전수(R6) · 줄 수·지문 실측 일치(R7) · 사전순(R8) · 미분류 파일(R9)」 — ③). `# R9` 의 「범위가 레포 성장을 따라가지 못한 신호」는 정책 `README.md` 판정 절차 1항(「포함 목록은 레포가 자라며 생긴 새 디렉터리를 조용히 흘리기 때문이다」)이 같은 명제를 말한다(②) |
| `# ── 범위 추출 (as-is versionScript와 같은 규칙) ──`·`# ── 원장 파싱 ──`·`# ── 검사 ──`·`# ── 집계 출력 ──` 4줄 | 정책의 제거 유형 「**구분선** — 절 이름은 아래 함수·타깃 이름이 복원한다」. 넷 다 바로 아래 `def repo_exclude`/`class Row`·`def parse`/`def axis_valid`·`def main`/집계 `print` 문이 복원하고(①), 괄호절 「as-is versionScript와 같은 규칙」은 **같은 파일 모듈 docstring 이 주인**이다(「범위 추출 규칙은 모델 … as-is versionScript와 같아야 한다. 둘이 갈라지면 지문에는 있는데 원장 불변식은 모르는 파일이 생긴다」) |

주석이 0줄이 되어 원장 규칙(R6)대로 **행을 지웠다**. 파일의 자기 설명은 판정 표면 밖인 모듈
docstring 이 그대로 진다. homelab 레포의 같은 유형이 「체커에 `# Rn` 앵커를 달지 말고 설명은 함수
docstring 으로」로 이미 판정한 것과 같은 방향이다.

### ⑸ `tests/e2e/run.sh` 54 → 46 (**−8**) — 유예된 판정의 조건이 충족됐다

`e2e-runner-pass`(2026-09-21)는 머리 7줄을 **조건부로** 유지했다: 「README 「빠른 시작」 `make e2e`
설명이 복원하나 그 줄이 낡아(배치를 말하지 않는다) 원본 수정이 걸리는 자리 … README 의 그 줄이
배치까지 말하게 되면 다음 패스가 lede 를 다시 본다」. 그리고 전제 도구 줄은 「다음 표적 패스가
이 파일을 다시 볼 때 **첫 후보**」로 넘겼다.

**그 조건이 이 창에서 충족됐다.** #151 이 같은 창에서 README 를 고쳐 `README.md:101` 이 이제
「`make e2e`  # kind e2e: 배치 3단 -> 파이프라인 Gold -> 클러스터 내 서빙 -> Playwright
(docker/kind/kubectl 필요)」이고, `Makefile:56` 의 `##` 도움말도 같은 문장이다.

| 지운 것 | 복원처 |
|---|---|
| lede 2줄(「kind-based e2e: the serving stack plus the ingestion, analysis and aggregation batches, all in one throwaway kind cluster, with the Playwright specs at the end」) | `README.md:101`(②, 배치 3단까지 말한다) · `Makefile:56` 의 `## kind e2e: batch 3 stages -> pipeline Gold -> in-cluster serving -> Playwright`(①) |
| 「Local `make e2e` and the CI e2e job both run exactly this script」 | `Makefile:57` 의 `./tests/e2e/run.sh` 와 `ci.yml:214` 의 `run: make e2e`(①) |
| 「Requires docker, kind, kubectl and node/npm — it fails fast if one is missing」 | `README.md:90`·`:101` 의 「docker + kind + kubectl」·「(docker/kind/kubectl 필요)」(②) + `for tool in docker kind kubectl node npm curl` 루프와 그 실패 메시지(①). e2e-runner-pass 가 적어 둔 대로 **이 줄은 `curl` 을 빠뜨려 이미 낡았다** |
| 「Set KEEP_CLUSTER=1 to keep the cluster around for debugging」 | 그 분기의 `echo "[e2e] KEEP_CLUSTER=1 — cluster kept, inspect with: kubectl …"`(①) |
| `2)` 표지에 #151 이 붙인 2줄(「Serving has no fixture data of its own: it reads the Gold the aggregation Job writes on the batch claim (k8s/e2e-patch.yaml), so the only thing mounted here is what the *upstream* doubles serve」) | `e2e-patch.yaml` 머리(주인)의 사본 + PR #151 ⑴(③) |

남긴 1줄은 「**이 스크립트는 아무것도 설치하지 않는다 — 없는 도구는 즉시 실패이고 설치가 아니다**」다.
도구 목록과 fail-fast 는 위처럼 복원되지만 **「설치하지 않는다」는 부재 단정이라 네 경로 어디로도
복원되지 않는다**(코드에 없는 것은 코드가 말하지 않는다). `2)` 표지 2줄은 `4a~4g` 와 함께 쓰는 공유
규약이라 유지했고, #151 이 같은 창에서 넣은 **배치 선행 가드**(「배치 자원이 먼저다 — 클레임이 뒤에
생기면 서빙 Pod 가 그때까지 스케줄되지 않는다」)는 PR #151 이 같은 말을 적지만(③) 순서를 바꾸면
조용히 깨지는 편집 지점 가드라 유지했다.

### ⑹ spec 세 개 — #151 증분 재판정 (**−3**)

- `ac3-7-three-axis-compare.spec.ts` 37 → 36: 세 축 전제 가드에서 **소스 개수 열거**(「KR 2소스·US
  1소스·GLOBAL 1소스」)를 걷었다 — README 가드 조항이 금지하는 형태이고 실측은
  `fixtures/feeds/e2e-feeds-agg.json` 이 소유한다(`ingest-job-agg.yaml`·`ingest-job-ops-2.yaml` 선례).
  남긴 가드(「축이 비면 `/api/compare` 는 옛 버킷을 빌리지 않고 빈 컬럼을 내려주므로 (1)에서
  끊긴다」)는 PR #151 의 음성 프로브가 같은 사실을 적지만(③) 집계 corpus 를 고치는 사람이 읽는
  자리라 유지했다.
- `ac3-8-normalized-ratio.spec.ts` 33 → 31: `topRow` JSDoc 의 **이력 프레이밍**(「서빙 입력이 커밋된
  픽스처 Gold 이던 동안에는 픽스처의 1위 대상 이름을 spec 에 복사해 두었지만」)은 PR #151 ⑷ 가
  축자로 적고(③) 정책의 제거 유형 「작업 흔적」이다. `FairRow` JSDoc 1줄은 바로 아래
  `RankRow & { raw_share: number }` 가 그대로 복원한다(①). 건수 「(KR 축 1위 = 3건)」도 가드
  조항대로 걷었다(줄 수 불변 정정).
- `aggregation-5-subject-trend-chart.spec.ts` 51 → 51: 제거 0. #151 증분(서빙 기준 루트의 Gold 는
  수집 Job 한 번이 `collected_at` 을 한 값으로 찍어 만든 것이라 시간 버킷이 1개다)의 **메커니즘은**
  PR #151 표가 복원하지만(「기준 버킷이 하나다 — 수집 CLI가 `collected_at`을 실행 시작 시 한 번
  계산해 전 레코드에 찍는다」) 거기서 나오는 **관측 경계**(이 spec 이 보는 시계열은 버킷 1개 · 다중
  버킷은 전용 서빙 인스턴스가 필요한 별도 슬라이스)는 어느 경로에도 없다.

### ⑺ `tests/e2e/k8s/batch/aggregate-job.yaml` 9 → 7 (**−2**)

머리의 위치 표지 「집계 배치 한 번 — 메달리온 3단(수집 → 분석 → **집계**)의 마지막 단계다」와 빈
`#`. **저작 PR #50 본문이 축자**다(「메달리온 3단(수집 → 분석 → **집계**)의 마지막 단계를 e2e 안으로
들여」 — ③) 그리고 가드가 아니라 자리 선언이다(파일명 `aggregate-job.yaml` 과 `command:` 가 ①).
뒤 문장의 지시(「앞선 두 단계」)가 끊기지 않게 「수집·분석 Job」으로 정정했다.
`batch-harness-pass` 가 같은 파일에서 지운 과거형 프레이밍과 같은 유형이다.

## ③④ 를 새로 물어 닫은 행 — 제거 0 (22행)

아래 행은 앞선 패스가 ①②(코드·다른 파일 주석·저장소 문서)로 판정해 유지한 것들이다. 이 패스는
**③(저작 PR 본문)과 ④(커밋 메시지)를 물었고**, 그 결과가 유지를 뒤집지 않았다. 판정 축만 `①②③④`로
닫는다.

| 행 | ③ 저작 PR 본문이 말하는 것 | 왜 유지인가 |
|---|---|---|
| `aggregate-job-ops.yaml` | #136 이 시나리오 1 정상 실행의 단계 구성을 서술 | 남은 3줄은 시나리오·단계 자리 선언과 `aggregate-job.yaml` **주인 지목 포인터** — 정책이 권하는 해소 형태 |
| `aggregate-job-rollup.yaml` | #65 「루트를 가르는 것은 기존 관례 그대로다(`write_records` 가 데이터셋을 교체하므로 제자리 집계는 …)」 | 「이 루트를 기준 상태와 합치면 이미 매칭된 spec 이 보는 Gold 가 사라진다」는 **순서를 바꾸면 조용히 깨지는** 가드 |
| `aggregate-job-skew.yaml` | #50 「한 루트에서 두 번 돌릴 수 없다 — `write_records` 가 데이터셋을 교체해 기준 상태가 사라진다」(축자) | 같은 가드. 「같은 코드·같은 설정이어야 차이가 입력량으로 읽힌다」는 비교 설계로 ③ 에 없다 |
| `bronze-shell.yaml` | #31 「Job 컨테이너는 끝나면 사라지므로 산출물을 PVC에 남기고, 같은 클레임을 마운트한 …」 | 「이 Pod 는 읽기만 하고 아무것도 만들지 않는다」는 단정이 배치가 실제로 쓴 레코드에 걸린다는 **경계** |
| `data-pvc.yaml` | 같은 #31 문장 | 「ReadWriteOnce 는 노드 단위라 같은 노드의 반출 Pod 와 동시 마운트가 성립한다」는 **클러스터 제약이 ③④ 어디에도 없다** |
| `feed-double.yaml` | #39 가 고장 주입 세 경로를 열거 | 「가용성을 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다」는 더블의 경계 — ③ 에 없다 |
| `ingest-job-agg-skew.yaml` | #50 「상류만 부풀린 피드로 바꿔 같은 3단을 한 번 더 돌린다 · 한 루트에서 두 번 돌릴 수 없다」 | 「다른 것은 상류 설정 하나뿐이어야 한다」는 **무엇을 바꾸지 말라** 가드 |
| `ingest-job-agg.yaml` | #31·#50 「메달리온 계층 의존 때문에 수집 → 분석 → 집계 순서를 강제합니다」 | 이 Job 이 왜 따로 있는지를 편집 지점에서 말한다(지우면 집계 입력이 사라진다) |
| `ingest-job-analysis.yaml` | 같은 메달리온 선행 근거(#31·#44) | 같은 이유 + 「한 루트를 공유하면 ingestion 2~5 단정이 오염된다」 가드 |
| `ingest-job-calls1.yaml` | #141 이 두 주기 구성과 네 갈래를 축자로 서술 | 남은 1줄은 묶음·주기 포인터뿐 |
| `ingest-job-calls2.yaml` | #141 「같은 피드를 `--cycle`만 달리해 두 주기 수집하면 … 프롬프트 바이트 동일한 새 레코드가 된다」 | 남은 2줄 중 하나가 **「`--cycle` 은 달라야 하고 겹치는 건은 같아야 한다」** — 값이 무엇과 같아야 하는가 |
| `ingest-job-cycle1.yaml` | #39 「**세 주기 Job 은 순차 실행이어야 합니다.** 동시에 돌면 …」·「왜 데이터 루트를 가르는가」 | 순차 요구와 `first_seen_cycle` 비결정성은 **순서를 바꾸면 조용히 깨지는** 대표 가드 |
| `ingest-job-cycle2.yaml` · `ingest-job-cycle3.yaml` | #39 가 주기별 기대 결과를 적는다 | 남은 줄은 주인 지목 포인터 + 이 주기의 기대값 |
| `ingest-job-faults.yaml` | #39 「**`--fetch-timeout 1` 을 올리지 마세요**: 더블의 `/__slow__/5/` 지연보다 길어지면 …」(축자) | PR 본문이 같은 금지를 적어도 **편집 지점에서 읽히지 않는다** — 정책이 이 비대칭을 위해 판별식을 둔 자리 |
| `ingest-job-links1.yaml` · `ingest-job-links2.yaml` | #150 코퍼스 표가 두 주기 구성을 축자로 적는다 | 남은 줄은 포인터와 `--cycle`·픽스처 바이트 동일 가드(record-link-window-pass 가 같은 근거로 세운 형태) |
| `ingest-job-ops-2.yaml` | #136 이 `ECON_RUN_ID` 가 두 실행을 가르는 유일한 배선임을 축자로 적는다 | 그 배선은 값이 무엇이어야 하는가를 말하는 가드 · 「새 RSS 픽스처를 만들지 않은 이유」는 ③ 에 없다 |
| `ingest-job-ops.yaml` | #136 「**루트를 새로 판 이유는 둘이다.** ⑴ … 기존 루트에 얹으면 그 루트의 확정 Silver 가 분석 입력으로 섞여 들어온다 ⑵ … `failed_sources=[]` 가드를 약화시켜야 한다」(축자) | 둘 다 「기존 루트에 얹지 말라」 금지이고, 이 파일은 원장이 이 디렉터리의 `ECON_RUN_ID` 설명 **주인**으로 적은 행이다 |
| `ingest-job.yaml` | #31 은 메달리온 순서까지만 적는다 | 「e2e kind 클러스터에 Argo 컨트롤러가 없다」·「주기 id 를 고정해 레코드 id 가 실행 시각에 흔들리지 않게 한다」는 ③④ 어디에도 없다 |
| `batch/kustomization.yaml` | #31·#44 는 더블 기동·readinessProbe 만 언급 | 「**Job 은 여기 넣지 않는다** — 더블이 Ready 가 된 뒤 적용해야 첫 요청이 헛돌지 않는다」 금지가 ③ 에 없다 |
| `llm-double.yaml` | #44 는 「LLM 더블 기동·readinessProbe」를 항목으로만 적는다 | 「readiness 를 **픽스처 로드까지** 확인하지 않으면 포트만 열린 상태로 Ready 가 돼 분석 Job 이 전건 실패한다」는 함정이 ③ 에 없다 |

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| 세 spec 의 「집계 로직 자체는 `aggregation-1·2·4` 가 본다」 경계 | `ac3-7`·`ac3-8`·`aggregation-5` 에 **거의 바이트 동일한 세 벌**이 있고, 보통 이런 사본은 주인만 남긴다. 그러나 이 문장이 막는 것은 「렌더 spec 에 집계 정확성 단정을 더하는 일」이고 그 편집은 **세 파일 각각에서** 일어난다 | 셋 다 유지. 한 벌로 줄이려면 주인이 될 자리(공유 헬퍼나 `tests/e2e/README`)가 먼저 있어야 한다 |
| `e2e-patch.yaml` 의 가산 유지 금지 vs `deploy/base/deployment.yaml` 의 이음새 금지 | 같은 사실의 두 판이지만 **어기는 방법이 다르다**(패치에 `$patch: replace` 를 넣는 것 ↔ base 의 emptyDir 을 지우는 것) | 둘 다 유지. base 를 사실의 주인으로 두고 패치 쪽은 금지만 말하게 줄였다 |
| `ingest-job-agg.yaml`·`ingest-job-analysis.yaml` 의 메달리온 선행 근거 | ③(#31)이 순서 강제를 적어 서사로는 닫히지만, 이 Job 을 「중복」으로 보고 지우려는 편집을 막는 자리 | 유지 |

## 검증

- **비주석 무접촉**: 32파일 전부 `diff <(git show dfd3bc7:<f> | grep -vE '<주석 패턴>') <(grep -vE '<주석 패턴>' <f>)` 공집합.
  `scripts/check-comment-ledger.py` 만 구분선과 함께 있던 **빈 줄 3개**가 줄어(정의 앞 빈 줄 2줄은 유지) 빈 줄을
  무시하면 동일하다. `bash -n tests/e2e/run.sh` rc=0 · `yaml.safe_load_all` 4파일 rc=0 ·
  `ast.parse(check-comment-ledger.py)` rc=0 · `tsc --noEmit --strict` 로 spec 두 개 확인.
- **기계 판독 주석 무접촉**: `// 검증 시나리오:` 3줄과 `mock-exception:` 줄은 바이트 동일(지문·판정 양쪽에서 제외되는 줄).
- **게이트 전수 rc=0**: `scripts/check-comment-ledger.py`(행 198 · 파일 198 · 2,995줄 · 판정 축 `①②③④` **31행 342줄**) ·
  `tests/e2e/check_scenario_mapping.py` · `scripts/check-journey-mockup.py` · `scripts/check-journey-flow.js` ·
  `scripts/check-data-format-change.py <base> <head>` → `format_changed=false`(민감 경로 무접촉 ⇒ `review/manual-approval` 자동 success).
- **양방향 프로브**(사본에서만, 원 체크아웃 0-dirty): ⑴ 지운 주석 1줄을 되살리면 R7 이 그 행을 잡아 **rc=1** ·
  ⑵ 원장 행 하나의 판정 축을 `—` 로 되돌리면 집계 출력의 「판정 축 `①②③④`」가 **31행 → 30행**으로 줄어든다.
  게이트가 이 패스의 변경에 실제로 반응한다는 뜻이다.
- e2e 자체는 호스트에 kind 가 없어 CI(`ci / e2e`)가 집행한다 — 주석만 바뀌었으므로 실행 경로는 동일하다.

## 이 패스가 판정하지 않은 것 (다음 슬라이스의 입력)

- **`analyze-job-*` 가족 12행 76줄 + `timeshift-job.yaml` 15줄** — `tests/e2e/k8s/batch/` 의 나머지.
  예산(400줄) 경계로 빠졌다. `analyze-job-*` 는 절반이 이미 `①③` 이라 남은 축이 적다.
- **열린 PR #159 가 판정 중인 32행** — `.github/workflows/**`·`Dockerfile*`·`.gitignore`·
  `web/vite.config.ts`·`python/pyproject.toml`·픽스처 피드 21행. 그 PR 은 `review/manual-approval`
  사람 게이트를 기다리는 중이고, 착지하면 그 행은 `①②③④` 가 된다.
- **나머지 미판정 114행 1,588줄 · 일부 축만 53행 1,065줄** — 게이트 출력이 실측이다. 큰 묶음은
  `tests/e2e/specs/*`(analysis·ingestion 계열) · `tests/e2e/lib/*` · `web/src/**` · `deploy/batch/*` ·
  `scripts/journey-scenarios/*`.
- **Python docstring 본문·줄 끝 주석** — 모델 정의가 적은 지문 사각지대. 표면을 넓히는 것은
  tobe-modeler(control plane) 몫이다.
