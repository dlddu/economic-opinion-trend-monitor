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
- **Silver** (LLM 분석): 대상 국가 · 핵심 서술 대상 · 분위기 — `contracts/silver/*.avsc` (Avro)
- **Gold** (정규화·집계·서빙): 서술 대상 기준 추세/비율, 수집원 편차 보정 — `contracts/gold/*.avsc` (Avro)

> 골격 단계에서는 모든 계층을 **JSONL**로 직렬화한다. Avro 스키마는 *타입 계약·코드젠 소스*로
> 쓰고, 실제 Avro 바이너리 직렬화는 후속 작업이다.

## 디렉터리 구조

```
contracts/   스키마(단일 소스) + 코드젠 — bronze/*.schema.json, silver|gold/*.avsc, codegen.py
python/      uv 워크스페이스 (배치)
  packages/core         공유 도메인 + 생성 모델 + 스토리지 추상화(로컬 FS 구현)
  packages/ingestion    CLI 엔트리 · 실 RSS/Atom 피드 소스(기본) + 페이크 카탈로그 · Bronze writer
  packages/analysis     CLI 엔트리 · 페이크 LLM · Silver writer (스텁)
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
cd python && uv run python -m econ_ingestion --source fake && uv run python -m econ_analysis && uv run python -m econ_aggregation && cd ..
make build-web                 # web/dist 생성
make run                       # http://localhost:8080  (대시보드 + /api/* 스텁)
```

개발 중 프론트는 `cd web && npm run dev` (Vite, `/api`는 8080의 Go 서버로 프록시)로 띄운다.

## 배포 (외부 k8s + kustomize)

서빙 이미지는 `main` 푸시마다 CI(`.github/workflows/image.yml`)가
`ghcr.io/dlddu/economic-opinion-trend-monitor`로 발행한다
(`latest` + 불변 `sha-<commit>` 태그).

```
deploy/
  base/            환경 무관 서빙 스택 (Deployment + Service, /data는 emptyDir)
  overlays/prod/   네임스페이스(econ-monitor) + PVC(gold 영속화)
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
- 배치(수집·분석·집계) CronJob 배선과 원격 스토리지는 후속 작업이다
  (스케줄러 배선 자체가 골격 범위 밖 — 아래 [범위](#범위) 참조).

## 범위

**골격에 포함:**
- 4개 컴포넌트의 자리·엔트리·도구·최소 실행 경로
- 스키마 우선 계약 + 양 언어 코드젠
- 페이크 소스/페이크 LLM 기반 bronze→silver→gold 더미 흐름
- 셸(topbar/sidebar/mapstrip) + 대시보드 1화면 + API fetch 스텁
- 교차 언어 스모크 + 언어별 단위 테스트 1개 + CI

**범위 밖 (후속 기능 작업):**
- 실제 LLM 연동 (페이크로 대체) — 수집은 실 RSS/Atom 피드가 기본으로 배선됨(피드 목록은 큐레이션 대상)
- 실제 정규화 수식·집계 로직 (시그니처/스텁만)
- 프론트 7화면 전부 (셸 + 대시보드만; 나머지 6화면은 플레이스홀더)
- 원격(S3 등) 스토리지 (인터페이스 + 로컬 FS만)
- 스케줄러 실제 배선 (CLI 트리거 자리만)
- 화면별 정식 API 데이터 계약 (스텁 라우트만)
