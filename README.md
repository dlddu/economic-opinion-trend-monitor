# Economic Opinion Trend Monitor (경제 여론 추세 모니터)

한국·미국·전세계 3개 축을 기준으로 **경제 관점의 여론 관심사 추세**를 모니터링하는 시스템.
매시간 조회수 상위 뉴스를 수집하고, 대상 국가·핵심 서술 대상·분위기를 추출하여,
서술 대상 기준으로 추세와 비율을 시각화한다.

제품 가치·PRD·사용자 여정·디자인 시스템 문서는 [`docs/`](docs/)에 있다.

> **상태: 부트스트랩 골격.** 이 저장소는 문서만 있던 단계에서 *실제 개발을 시작할 수 있는
> 초기 코드베이스 골격*으로 부트스트랩한 결과다. 각 컴포넌트의 자리·엔트리·도구·최소 실행
> 경로만 갖추었고, **기능 로직은 페이크/스텁으로 비어 있다.** 무엇이 골격이고 무엇이 후속
> 작업인지는 아래 [범위](#범위)를 참고한다.

## 아키텍처

데이터 레이크(medallion) 구조 위에서, **스키마 우선 계약**을 단일 소스로 두는 폴리글랏 모노레포다.

```
┌────────────┐   contracts/ (codegen)   ┌────────────┐
│  Python    │ ── 타입 생성 ──┬────────▶ │    Go      │
│  배치       │                │          │  서빙       │
│ ingestion  │   bronze.json  │  gold    │  (gold 읽기) │
│ analysis   │   silver.avsc  │  reader  │  API + 정적  │
│ aggregation│   gold.avsc    │          │            │
└─────┬──────┘                          └──────┬─────┘
      │ writes                                 │ serves
      ▼                                         ▼
  data/  bronze ─▶ silver ─▶ gold          web/ (React)
  (로컬 데이터 레이크)                       대시보드 + 셸
```

- **Bronze** (수집 원문 보존): 관측 레코드 `news_item`(원문 링크 + 수집 메타데이터 + 본문 해시 참조)과
  content-addressed 본문 저장소 `news_body`(동일 본문은 1회만 저장, 수정 본문은 새 버전 append)로 분리 —
  `contracts/bronze/*.schema.json` (JSON Schema)
  - `news_item`은 **주기별 파티션**으로 누적된다: `bronze/news_item/date=<YYYY-MM-DD>/hour=<HH>/data.jsonl`.
    같은 주기를 다시 돌리면 그 파티션만 교체되고 이전 주기는 남는다 — 재처리·계보 추적의 대상이다.
    주기가 곧 파티션이므로 `--cycle`은 정시(`YYYY-MM-DDTHH:00`)만 받는다.
  - `news_body`는 레코드 1건 = 파일 1개인 **객체 데이터셋**이다:
    `bronze/news_body/body_hash_prefix=<해시 첫 글자>/<body_hash>.json` (Hive 스타일 파티션, 파일당 JSON 1줄).
    저장·중복 확인·조회가 해시 하나로 끝나 데이터셋 전체를 읽지 않는다.
  - 이전 통파일(`bronze/news_item.jsonl`, `bronze/news_body.jsonl`)은 다음 수집 실행이 새 레이아웃으로
    옮기고 `*.jsonl.migrated`로 이름을 바꾼다.
- **Silver** (LLM 분석): 대상 국가 · 핵심 서술 대상 · 분위기 — `contracts/silver/*.avsc` (Avro)
  - `analysis`는 Bronze와 같은 파티션에 둔다: `silver/analysis/date=<YYYY-MM-DD>/hour=<HH>/data.jsonl`.
    기준은 분석한 시각이 아니라 **분석 대상 관측의 수집 주기**다 — 한 주기의 Bronze·Silver가 나란히 있고,
    쓰기는 건드린 주기의 파티션만 다시 쓴다. 이전 `silver/analysis.jsonl`은 다음 분석 실행이 옮긴다
    (Bronze에 없는 레코드의 행은 버린다).
  - 매시간 분석은 **그 버전으로 아직 확정되지 않은 레코드만** 본다 — 새 주기의 관측과, 본문이 있는데
    `unanalyzed`로 남은 레코드(실패한 호출은 다음 시간에 재시도). Bronze가 전 주기를 보존하므로 이력 전체를 다시 분석하려면
    `--analyzer-version`을 올린다(AC2.6). 프롬프트·모델만 바꾸면 이후 주기에만 반영된다.
  - 운영 캐시 `silver/analysis_cache.jsonl`(계약 아님): 모델 응답을 (analyzer_version, 모델, 프롬프트) 해시로 보관해,
    매시간 다시 관측되는 미변경 기사는 모델을 다시 부르지 않는다. 본문·제목 수정, 프롬프트·모델 변경,
    `--analyzer-version` 올림(재분석, AC2.6)은 키가 바뀌어 새로 호출된다. 비우려면 파일을 지우면 된다.
- **Gold** (정규화·집계·서빙): 서술 대상 기준 추세/비율, 수집원 편차 보정 — `contracts/gold/*.avsc` (Avro)

> 골격 단계에서는 모든 계층을 **JSONL**로 직렬화한다. Avro 스키마는 *타입 계약·코드젠 소스*로
> 쓰고, 실제 Avro 바이너리 직렬화는 후속 작업이다.

## 디렉터리 구조

```
contracts/   스키마(단일 소스) + 코드젠 — bronze/*.schema.json, silver|gold/*.avsc, codegen.py
python/      uv 워크스페이스 (배치)
  packages/core         공유 도메인 + 생성 모델 + 스토리지 추상화(로컬 FS 구현)
  packages/ingestion    CLI 엔트리 · 실 RSS/Atom 피드 소스(기본) + 페이크 카탈로그 · Bronze writer
  packages/analysis     CLI 엔트리 · 실 LLM 분석기(기본) + 페이크 LLM(opt-in) · Silver writer
  packages/aggregation  CLI 엔트리 · Gold builder (정규화 스텁)
go/          Go 모듈 (서빙)
  cmd/serving           main — HTTP 서버 부트
  internal/handlers     화면별 스텁 라우트 (더미 JSON)
  internal/store        Gold 리더
  internal/static       web 빌드 산출물 정적 마운트
  gen/                  contracts -> Go 생성물
web/         Vite + React — 디자인 토큰(CSS) · 셸(PAT-screen-shell) · 대시보드 1화면 · API fetch 스텁
data/        로컬 데이터 레이크 (bronze/silver/gold) — 내용은 git-ignore, 구조만 .gitkeep
deploy/      kustomize 배포 매니페스트 (base + overlays/prod) — 외부 k8s 클러스터 배포용
tests/       교차 언어 스모크 + kind e2e (tests/e2e: 픽스처 Gold -> 클러스터 서빙 검증)
```

## 사전 요구사항

| 도구 | 버전(개발 기준) | 용도 |
|------|------|------|
| [uv](https://docs.astral.sh/uv/) | 0.8+ | Python 패키징·실행 |
| Go | 1.24+ | 서빙 빌드·실행 |
| Node.js | 22+ | 프론트 빌드 |
| make | 4+ | 통합 오케스트레이션 |
| docker + kind + kubectl | 최신 | kind e2e (선택, `make e2e` 전용) |

## 빠른 시작

```bash
make setup     # uv sync + go mod download + npm install
make gen       # contracts -> Go/Python 타입 생성
make build     # 서빙 바이너리 + 웹 번들 빌드
make test      # 3개 언어 단위 테스트 + 교차 언어 스모크
make lint      # ruff / gofmt+vet / eslint
make run       # 서빙 기동 (API + web/dist 정적 서빙)
make e2e       # kind e2e: 픽스처 Gold -> 클러스터 내 서빙 -> Playwright (docker/kind/kubectl 필요)
```

`make`(인자 없음)는 사용 가능한 타깃 목록을 출력한다.

### 골격 한 바퀴 돌려보기

```bash
make setup && make gen
# 배치 파이프라인: 페이크 입력 -> bronze -> silver -> gold (data/ 에 더미 레코드)
# ingestion 기본 소스는 실 RSS/Atom 피드(네트워크). 오프라인 데모는 --source fake 로 고정한다.
# analysis 기본 분석기도 실 chat-completions 모델(ECON_LLM_* env 필요). 오프라인 데모는 --analyzer fake 로 고정한다.
cd python && uv run python -m econ_ingestion --source fake && uv run python -m econ_analysis --analyzer fake && uv run python -m econ_aggregation && cd ..
make build-web                 # web/dist 생성
make run                       # http://localhost:8080  (대시보드 + /api/* 스텁)
```

개발 중 프론트는 `cd web && npm run dev` (Vite, `/api`는 8080의 Go 서버로 프록시)로 띄운다.

## 배포 (외부 k8s + kustomize)

이미지는 CI(`.github/workflows/image.yml`)가 **커밋 SHA 태그 하나로만** 발행한다 —
서빙은 `ghcr.io/dlddu/economic-opinion-trend-monitor:<sha>`, 배치는
`ghcr.io/dlddu/economic-opinion-trend-monitor-batch:<sha>`. `latest`는 더 이상 만들지 않는다
(예전에는 PR 빌드도 `latest`를 덮어써 미머지 코드가 운영 pull에 섞일 수 있었다).

- **운영 고정(`pin` job)**: `main` 푸시에서 두 이미지를 올린 뒤, 그 SHA로
  `deploy/` 아래 모든 이미지 참조(`deploy/base/deployment.yaml`,
  `deploy/batch/workflow-template.yaml`)를 고친 커밋을 **`deploy` 브랜치**로 force-push한다
  (= `main@SHA` + 고정 커밋 하나, `Source-Commit: <sha>` 트레일러). main은 ruleset(필수 체크
  `required`)으로 보호되어 되커밋하지 않고, Flux는 `deploy`를 추적한다. 기본 `GITHUB_TOKEN`만
  쓰므로 장기 크레덴셜이 없다. 운영이 어느 커밋을 돌리는지는 `deploy` 브랜치의 `deploy/`만
  보면 된다(main에 남은 태그는 운영과 무관). 롤백은 main에 revert PR.
- **PR 빌드**: PR head SHA 태그로 발행만 하고 매니페스트는 건드리지 않는다. 이 태그를
  PR 프리뷰가 가져다 쓴다(아래).

```
deploy/
  base/              환경 무관 서빙 스택 (Deployment + Service, /data는 emptyDir)
  batch/             환경 무관 배치 스케줄 (Argo CronWorkflow, /data는 emptyDir)
  overlays/prod/     네임스페이스(econ-monitor) + PVC(두 워크로드가 공유)
  overlays/preview/  PR 프리뷰: base 그대로 + batch(스케줄 제거, 수동 실행 전용)
```

```bash
kubectl apply -k deploy/overlays/prod   # 또는 Flux Kustomization의 path로 지정
```

- Gold 스토어는 파일이 없으면 빈 데이터셋으로 처리하므로, 배치 파이프라인이
  클러스터에 올라가기 전에도 서빙은 정상 기동한다(빈 대시보드).
- 외부 노출(Ingress 등)은 클러스터 쪽 구성에 맡긴다 — 이 오버레이는
  `econ-serving` Service(8080)까지만 만든다.
- kind e2e(`tests/e2e/k8s/`)는 같은 `deploy/base`의 오버레이라서, e2e가 돌 때마다
  배포 base가 실제 클러스터에서 검증된다.
- 수집 배치는 `deploy/batch`의 **Argo Workflows CronWorkflow**
  (`econ-ingestion-hourly`)로 배선돼 있다(기본 매시간 = AC1.1). 주기는 오버레이
  패치(`/spec/schedule`)로 환경별로 바꾼다. 배치 이미지는 `Dockerfile.batch`에서
  빌드돼 `…-batch` 이름으로 같이 발행되며, 비공개 패키지라 워크플로가
  `imagePullSecrets: [ghcr]`를 직접 들고 간다.
  `deploy/batch`는 `deploy/base`가 아니라 prod 오버레이가 직접 포함한다 —
  base는 서빙 스택 계약이고 kind e2e가 그 base를 그대로 상속하기 때문이다
  (e2e 클러스터에는 Argo 컨트롤러도 없다). 클러스터에 이미 상주하는
  cluster-scoped Argo Workflows 컨트롤러가 이 네임스페이스의 CronWorkflow를
  집어가므로 네임스페이스별 설치는 필요 없다.
- **새 CronWorkflow는 항상 `suspend: true`로 착지한다.** 이 경로는 자동 동기화되므로
  머지가 곧 적용이고, suspend가 "적용됐다"와 "돌기 시작했다"를 분리한다. 켜기 전에
  `econ-batch-pipeline`에서 워크플로를 1회 수동 제출해 이미지 pull·볼륨 쓰기·해당
  스테이지가 실제로 되는지 확인한다. 현재 두 개가 있고 **동시에 하나만 돈다**:
  `econ-ingestion-hourly`(수집만, 현재 suspend — 켜는 순간부터 `default_feeds.json`의 모든
  엔드포인트로 매시간 실제 HTTP 요청)와 `econ-pipeline-hourly`(`ingest -> analyze ->
  aggregate`, 가동 중 — 수집에 더해 본문이 있는 매 항목이 LLM 엔드포인트로 나간다). 한쪽을
  켤 때는 다른 쪽을 먼저 suspend한다.
- 배치와 서빙은 **한 클레임(`econ-batch-data`, RWX)을 공유**한다. 파이프라인이 매시간
  Bronze→Silver→Gold를 그 볼륨에 쓰고, 서빙은 같은 볼륨의 Gold를 읽기 전용으로 읽는다 —
  Gold 리더가 요청마다 파일을 여니 재시작 없이 다음 집계부터 화면에 반영된다. 서빙 전용
  클레임을 따로 두던 시절(파이프라인이 수집 전용이라 Gold를 쓰는 단계가 없던 때)의 분리는
  2026-09-21에 걷었다: 복사 단계 대신 공유를 택한 것은 두 클레임이 이미 같은 `efs`
  StorageClass의 RWX access point였고, 복사는 파일·실패 지점·시차만 더하기 때문이다.
  집계가 Gold를 다시 쓰는 수 초 동안 동시 요청이 잘린 줄을 읽을 수 있는 창은 남아 있다
  (`LocalFsStore.write_records`가 truncate+write — 원자적 교체는 후속).
- 분석 스케줄은 `econ-pipeline-hourly`로 배선돼 가동 중이고, 그 분석 스테이지는
  `econ-llm` Secret의 `api-key`를 요구한다 — `ghcr`와 마찬가지로 external-secrets가
  네임스페이스에 주입하며 이 레포에는 없다. 집계 스케줄과 원격 스토리지는 후속 작업이다.

### PR 프리뷰

PR에 `deploy/preview` 라벨을 붙이면 flux-cd-apps(`apps/econ-monitor-preview`)가 그 PR만의
환경을 띄운다: 네임스페이스 `econ-monitor-pr-<번호>`, 주소
`http://econ-monitor-pr-<번호>.<사설 도메인>`(내부망 전용). 라벨을 떼거나 PR을 닫거나
머지하면 환경이 정리된다. 동시에 최대 5개.

- 경로는 `deploy/overlays/preview`, 이미지(서빙·배치)는 PR head SHA 태그다. 그래서 **이
  오버레이와 SHA 태그 발행이 들어간 뒤의 `main`에서 갈라진(또는 그 위로 rebase한) PR만**
  프리뷰가 뜬다.
- **서빙**: `deploy/base` 그대로라 `/data`는 emptyDir이고 **대시보드는 빈 상태**로 뜬다.
  클러스터 안에는 아직 Gold를 쓰는 단계가 없다(배치는 analyze까지). 프리뷰에서 서빙은
  빌드·기동·렌더링이 되는지를 본다.
- **배치**: `econ-batch-pipeline` WorkflowTemplate만 있고 CronWorkflow는 없다 — 스케줄은
  돌지 않고 **사람이 제출할 때만** 돈다. `/data`는 PR 전용 EFS 볼륨
  `econ-pr-<번호>-batch-data`(flux 쪽에서 생성)라 `pipeline`의 ingest → analyze가 같은
  Bronze를 본다. 운영 `econ-batch-data`와는 분리돼 있다.

배치 수동 실행 (`ingest`만, 또는 `pipeline` = ingest → analyze):

```bash
PR=42  # PR 번호
kubectl -n econ-monitor-pr-$PR create -f - <<'YAML'
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  generateName: econ-batch-manual-
spec:
  workflowTemplateRef:
    name: econ-batch-pipeline
  entrypoint: ingest        # 또는 pipeline
YAML
kubectl -n econ-monitor-pr-$PR get workflows
# argo CLI가 있으면: argo submit -n econ-monitor-pr-$PR --from workflowtemplate/econ-batch-pipeline --entrypoint pipeline --watch
```

- `ingest`는 운영과 같은 기본값으로 돈다 — 실제 피드 전부에 HTTP 요청, 사이클은 현재 UTC 시각.
- `analyze`(= `pipeline`)는 네임스페이스에 **`econ-llm` Secret(`api-key`)** 이 있어야 파드가
  뜬다. 프리뷰는 이 시크릿을 자동으로 넣지 않으므로, 필요할 때 직접 만든다 — 호출은
  과금되는 실제 LLM 트래픽이다. 프리뷰가 정리되면 네임스페이스와 함께 사라진다.
  ```bash
  kubectl -n econ-monitor-pr-$PR create secret generic econ-llm --from-literal=api-key=...
  ```
- PR 전용 볼륨은 프리뷰와 함께 삭제되지만 EFS 위 디렉터리(`/econ-pr-<번호>-batch-data`)는
  남는다. 같은 PR에 라벨을 다시 붙이면 그 디렉터리(이전 Bronze·Silver)로 돌아온다.
- 로컬 빌드는 `kubectl kustomize deploy/overlays/preview`. CI가 이 오버레이를 빌드해
  CronWorkflow가 섞이지 않았는지, 이미지 retag가 배치 템플릿까지 닿는지 검사한다.

### 리뷰 게이트 (데이터 저장 형식)

PR이 데이터 저장 형식(스키마 계약·생성 타입·직렬화·레이크 경로·볼륨, 생산자가 계약
필드에 채우는 값)을 건드리지 않으면 `.github/workflows/review-gate.yml`이 PR head 커밋에
commit status `review/manual-approval` = `success`를 붙인다. 건드리면 status를 붙이지
않는다 — **status가 없으면 사람 리뷰가 필요하다**는 뜻이다. 판정 규칙은
`scripts/check-data-format-change.py`에 있고(로컬: `python3 scripts/check-data-format-change.py <base> <head>`),
근거는 워크플로 Job Summary에 남는다. `pull_request_target`으로 base 브랜치의 판정기를
돌리므로 PR이 게이트를 고쳐 스스로 통과할 수 없다. `checks.yml`의 `required`와는 독립이다.

## 범위

**골격에 포함:**
- 4개 컴포넌트의 자리·엔트리·도구·최소 실행 경로
- 스키마 우선 계약 + 양 언어 코드젠
- 페이크 소스/페이크 LLM 기반 bronze→silver→gold 더미 흐름
- 셸(topbar/sidebar/mapstrip) + 대시보드 1화면 + API fetch 스텁
- 교차 언어 스모크 + 언어별 단위 테스트 1개 + CI

**범위 밖 (후속 기능 작업):**
- 실제 LLM 연동 — 실 chat-completions 분석기가 **기본**으로 배선됨(엔드포인트·모델·키는 `ECON_LLM_*` env).
  페이크 분석기는 `--analyzer fake`로 남아 오프라인 스모크·테스트가 결정적이다. 프롬프트 튜닝·모델 선정은 후속.
  수집은 실 RSS/Atom 피드가 기본으로 배선됨(피드 목록은 큐레이션 대상)
- 실제 정규화 수식·집계 로직 (시그니처/스텁만)
- 프론트 7화면 전부 (셸 + 대시보드만; 나머지 6화면은 플레이스홀더)
- 원격(S3 등) 스토리지 (인터페이스 + 로컬 FS만)
- 배치 스케줄은 수집·분석까지 배선됨 — 가동 중인 시간당 수집(`deploy/batch/cronworkflow-ingestion.yaml`)과,
  `ingest -> analyze` 2단 파이프라인(`deploy/batch/cronworkflow-pipeline.yaml`, **suspend 상태로 착지** —
  `econ-llm` 시크릿 확인 + 수동 1회 실증 후 전환). aggregation 스테이지의 스케줄 배선은 후속
- 화면별 정식 API 데이터 계약 (스텁 라우트만)
