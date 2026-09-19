# E2E 모킹 정책

> 정책·허용목록·차단 요인 원장의 SSOT. 2026-09-17 최초 등재 (reconciler `rct_20260917-0001`, 모델 `tbm_econ-opinion-monitor-e2e-mock-policy`).
> `docs/econ-opinion-monitor-doc-tracker/`의 「e2e 매핑」 절은 갱신이 잦은 로드맵·이력 축이므로 이 문서와 분리된다(같은 결정을 한 문서로 모으기 위한 전용 문서).

## 목적과 적용 범위

이 레포의 E2E는 **kind 실클러스터에 서빙 이미지(Go API + 웹 번들)를 `deploy/base`의 e2e 오버레이로 배포하고, API와 브라우저가 실제로 그 워크로드를 호출하는 하네스**(`tests/e2e/run.sh`, `make e2e`)가 기본이다. 배치 산출물을 대신하는 픽스처 Gold ConfigMap·결정적 더블을 고르는 스위치·상류 재배선·브라우저 네트워크 인터셉트는 **실환경으로 재현이 불가능한 경우에 한해서만** 허용하고, 그 예외는 이 문서에 등재된 것만 인정한다. 편의(실환경 준비 회피, 어서션 단순화, 플레이키 무마)를 위한 모킹은 drift다.

## 모킹으로 세는 것 (범위 경계)

이 레포의 치환은 하네스 쪽에서 일어난다. 다음 넷을 모킹으로 센다:

1. **배치 산출물 치환** — 수집→분석→집계 파이프라인 대신 커밋된 픽스처 Gold를 ConfigMap(`gold-fixtures`)으로 `/data/gold`에 마운트하는 것.
2. **더블 선택 스위치** — 제품 CLI의 결정적 오프라인 구현을 고르는 자리(`--source fake` · `--analyzer fake`).
3. **상류 재배선** — 실 상류 대신 다른 대상을 가리키게 하는 자리(`--feeds <파일>`로 피드 더블을 가리키기 · `ECON_LLM_BASE_URL`로 LLM 더블 서버를 가리키기). 2026-09-18 수집 배치 하네스가 서면서 `--feeds`가 등재됐고, 같은 날 분석 배치 하네스가 서면서 `ECON_LLM_BASE_URL`이 더해졌다. 2026-09-19 집계 배치 하네스가 서면서 두 토큰이 각각 늘어 현재 `--feeds` **8건**(FEED-05·08·10·12·14·16·18·20) · `ECON_LLM_BASE_URL` **4건**(LLM-05·06·07·08)이다. 더블이 **오류·지연을 내는 것**(FEED-06)도 이 범주로 본다 — 상류의 내용이 아니라 가용성을 재배선하는 자리다.
4. **브라우저 네트워크 인터셉트** — Playwright `page.route`·`route.fulfill` 계열. 등재 시점 0건.

더블의 **구현체**(`econ_ingestion.sources`의 페이크 카탈로그, `econ_analysis.fake_llm`)는 제품의 오프라인 모드라 지점이 아니다 — 하네스가 그것을 **고르는 자리**가 지점이다. 실 서빙 워크로드·실 kind 클러스터·port-forward는 실환경 하네스다. `tests/smoke.sh`를 범위에 넣는 것은, 배치→서빙을 한 번에 걷는 경로가 지금 그 스모크뿐이고 CI(`make test`)에서 돌기 때문이다. 단위 테스트 층(`python/packages/*/tests`·`go/**/*_test.go`·`web/src/**/*.test.ts(x)`)의 모킹은 그 층위에서 정상이므로 대상이 아니다. 운영 매니페스트(`deploy/batch/`)가 `ECON_LLM_BASE_URL`로 실 엔드포인트를 설정하는 것도 모킹이 아니다.

## 허용 카테고리 (이 밖은 불허)

- **`FEED` — 외부 수집원**: 실 RSS/Atom 피드는 가용성과 내용이 매 순간 달라 결정적 단정이 불가능하다. 제어 가능한 피드 더블(고정 피드를 `--feeds`로 가리키기, 또는 페이크 카탈로그)로 대체한다. 단정이 피드 **내용**에 의존하지 않으면 이 카테고리를 쓸 수 없다.
- **`LLM` — 비결정·과금·자격증명**: 실 chat-completions 호출은 `ECON_LLM_API_KEY`와 과금이 필요하고 응답이 비결정적이다. 라벨의 **의미적 정확도**는 이 정책이 아니라 골든 평가 하네스의 몫이며, 그것을 이유로 이 카테고리를 넓히지 않는다.
- **`GOLD` — 서빙 입력 고정**: 서빙·시각화 단정이 특정 Gold 분포(세 축이 모두 채워진 같은 버킷, 축별로 다른 상위 비율 등)를 요구하는데, 배치 경로가 E2E에 없어서 그 분포를 배치 산출물로 만들 수 없다. **배치를 `FEED`·`LLM` 더블 상류로 E2E 안에서 돌려 같은 분포를 결정적으로 만들 수 있게 되면 이 카테고리는 쓸 수 없다** — 그 시점에 픽스처 Gold는 제거 후보가 된다. 픽스처는 `contracts/gold/*.avsc` 스키마를 그대로 따라야 한다.

명시적 불허: 서빙 API가 이미 떠 있는데 브라우저에서 `/api/*` 응답을 바꿔치기하는 인터셉트, 플레이키 회피, **미구현 화면·엔드포인트의 우회**(Go 스텁 라우트의 자리표시 응답에 단정을 거는 것 포함 — 미구현은 `tbm_econ-opinion-monitor-docs-impl`의 몫), 어서션 단순화를 위한 치환, 단정 편의를 위해 픽스처를 스키마 밖 모양으로 만드는 것. 카테고리 판정이 애매하면 제거 쪽으로 기운다 — 예외는 늘지 않는 방향으로만 관리한다.

## 표기 규약

허용된 모킹 지점은 그 지점 직전 줄에 사유 주석을 단다 — YAML·Shell은 `#`:

```
# mock-exception: <CODE> — <사유>
```

같은 항목이 이 문서의 허용목록에도 있어야 한다. 주석만 있고 미등재이거나, 등재만 있고 코드에 없으면 drift다. (이 표기 주석은 자매 모델 `tbm_econ-opinion-monitor-comment-redundancy`가 기계 판독 주석에서 제외한다 — 두 모델의 축이 충돌하지 않는다.)

## 허용목록 (등재 집합 — 2026-09-19 관측, 31지점 / 18파일 / 3종)

지점은 **파일 × 토큰 쌍** 단위로 등재한다. 아래 표가 등재 집합이며, 각 행의 CODE는 코드 주석에 동일하게 부착된다. 1:1 판정 입력: (허용목록 쌍 집합) == (코드 지점 쌍 집합).

| # | 파일 | 토큰 | CODE | 카테고리 | 지점 내용 | 실환경 불가 사유 |
|---|------|------|------|----------|-----------|------------------|
| 1 | `tests/e2e/run.sh` | `gold-fixtures` | GOLD-01 | GOLD | kind 클러스터에 커밋된 픽스처 Gold(`tests/e2e/fixtures/gold`)를 `gold-fixtures` ConfigMap으로 만든다 | 집계 경로는 E2E에 섰으나 **서빙 입력이 아직 그 파이프라인 Gold로 이어지지 않았다**(원장 R3) — AC3.6~3.8이 특정 Gold 분포(상위 비율·3축 비교)에 단정을 걸고, 그 단정은 지금 이 픽스처 위에서 돈다. R3가 닫히면 제거 대상이다 |
| 2 | `tests/e2e/k8s/kustomization.yaml` | `gold-fixtures` | GOLD-02 | GOLD | 오버레이 헤더 주석이 `gold-fixtures` 마운트 배선을 문서화한다(실제 마운트는 3행) | GOLD-01의 배선 문서화 앵커 — 지문·주석 1:1 유지를 위해 같이 등재한다 |
| 3 | `tests/e2e/k8s/e2e-patch.yaml` | `gold-fixtures` | GOLD-03 | GOLD | serving pod에 `gold` volume(ConfigMap `gold-fixtures`)을 `/data/gold`(readOnly)로 마운트한다 | 같은 R3 원인 — 서빙이 `<ECON_DATA_ROOT>/gold/*.jsonl`을 파일 시스템에서 읽는 계약이라, 서빙 입력을 파이프라인 Gold로 갈아끼우기 전까지는 픽스처를 볼륨으로 주입해야 한다 |
| 4 | `tests/smoke.sh` | `--source fake` | FEED-01 | FEED | 스모크 수집 단계를 페이크 수집원에 고정한다 | 실 RSS/Atom 피드는 가용성·내용이 매 순간 달라 결정적 단정이 불가하다 — 스모크는 오프라인·결정적으로 유지돼야 하고(CI `make test`), 단정이 피드 내용(특정 주제 관측)에 의존한다 |
| 5 | `tests/smoke.sh` | `--analyzer fake` | LLM-01 | LLM | 스모크 분석 단계를 페이크 분석기에 고정한다 | 실 chat-completions 호출은 `ECON_LLM_API_KEY`·과금·네트워크가 필요하고 응답이 비결정적이다 — 미설정 러너에서 스모크가 exit 2로 죽는다 |
| 6 | `tests/e2e/run.sh` | `feed-fixtures` | FEED-02 | FEED | kind 클러스터에 커밋된 피드 픽스처(`tests/e2e/fixtures/feeds`)를 `feed-fixtures` ConfigMap으로 만든다 | 실 RSS/Atom 엔드포인트는 가용성·내용이 매 순간 달라 "상위 100건"·"60건만 제공"·"본문 미확보" 같은 단정을 걸 대상이 고정되지 않는다 |
| 7 | `tests/e2e/k8s/batch/feed-double.yaml` | `feed-fixtures` | FEED-03 | FEED | 피드 더블 Pod가 그 ConfigMap을 `/feeds`로 마운트해 HTTP로 서빙한다 | FEED-02와 같은 원인 — 수집 CLI가 HTTP로 피드를 가져오는 계약이라 픽스처를 실제 엔드포인트로 세워야 한다 |
| 8 | `tests/e2e/k8s/batch/ingest-job.yaml` | `feed-fixtures` | FEED-04 | FEED | 수집 Job이 같은 ConfigMap을 `/feeds`로 마운트해 피드 설정(`e2e-feeds.json`)을 읽는다 | 소스 목록·축·상한이 설정이므로(제품 계약) 더블을 가리키는 설정 자체를 주입해야 한다 |
| 9 | `tests/e2e/k8s/batch/ingest-job.yaml` | `--feeds` | FEED-05 | FEED | 수집 CLI의 상류를 기본 피드 목록 대신 그 설정으로 돌린다(상류 재배선) | 같은 원인 — 실 상류로는 결정적 단정이 불가능하다. 파서·순위·절단·본문 주소화 등 **수집 로직은 제품 경로 그대로**이고 바뀌는 것은 상류뿐이다 |
| 10 | `tests/e2e/k8s/batch/feed-double.yaml` | `server.py` | FEED-06 | FEED | 더블이 정적 서빙 대신 고장 주입 서버를 돈다(`/__fail__`·`/__flaky__`·`/__slow__` 경로) | `…-test-ingestion.md#시나리오 6`이 상류의 **오류·타임아웃·중복 노출**을 사전 조건으로 요구한다 — 실 상류에 장애를 주문할 수 없고, 실제로 죽을 때까지 기다릴 수도 없다. 기본 경로는 그대로 정적 서빙이라 기존 피드 응답은 바이트 동일하다 |
| 11 | `tests/e2e/k8s/batch/ingest-job-faults.yaml` | `feed-fixtures` | FEED-07 | FEED | 고장 주입 주기의 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 12 | `tests/e2e/k8s/batch/ingest-job-faults.yaml` | `--feeds` | FEED-08 | FEED | 그 주기의 상류를 고장 주입 설정(`e2e-feeds-faults.json`)으로 돌린다 | 같은 원인 — 실패 격리·재시도·중복 제거 **로직은 제품 경로 그대로**이고 바뀌는 것은 상류의 가용성뿐이다 |
| 13 | `tests/e2e/k8s/batch/ingest-job-cycle1.yaml` | `feed-fixtures` | FEED-09 | FEED | 주기 1 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 14 | `tests/e2e/k8s/batch/ingest-job-cycle1.yaml` | `--feeds` | FEED-10 | FEED | 주기 1의 상류를 `e2e-feeds-cycle12.json`로 돌린다(상류 재배선) | `…-test-ingestion.md#시나리오 7`이 「같은 기사가 두 주기 연속 노출되고 세 번째 주기에 본문이 수정돼 있다」를 사전 조건으로 요구한다 — 실 상류에서는 그 시점을 고를 수 없다. 본문 content-addressed 병합·버전 보존 **로직은 제품 경로 그대로**다 |
| 15 | `tests/e2e/k8s/batch/ingest-job-cycle2.yaml` | `feed-fixtures` | FEED-11 | FEED | 주기 2 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 16 | `tests/e2e/k8s/batch/ingest-job-cycle2.yaml` | `--feeds` | FEED-12 | FEED | 주기 2의 상류를 `e2e-feeds-cycle12.json`로 돌린다(상류 재배선) | FEED-10과 같은 원인 — 주기 2의 상류만 그 주기용 설정으로 돌린다 |
| 17 | `tests/e2e/k8s/batch/ingest-job-cycle3.yaml` | `feed-fixtures` | FEED-13 | FEED | 주기 3 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 18 | `tests/e2e/k8s/batch/ingest-job-cycle3.yaml` | `--feeds` | FEED-14 | FEED | 주기 3의 상류를 `e2e-feeds-cycle3.json`로 돌린다(상류 재배선) | FEED-10과 같은 원인 — 주기 3의 상류만 그 주기용 설정으로 돌린다 |
| 19 | `tests/e2e/k8s/batch/ingest-job-analysis.yaml` | `feed-fixtures` | FEED-15 | FEED | 분석 묶음의 입력 주기 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 20 | `tests/e2e/k8s/batch/ingest-job-analysis.yaml` | `--feeds` | FEED-16 | FEED | 그 주기의 상류를 분석 묶음 전용 설정(`e2e-feeds-analysis.json`)으로 돌린다(상류 재배선) | `…-test-analysis.md#시나리오 1·2·3` 이 「단일·복수·글로벌 대상 기사」·「같은 대상을 다른 표기로 지칭하는 복수 기사」·「네 분위기의 대표 기사」를 사전 조건으로 요구한다 — 실 상류에서는 그런 기사 묶음이 언제 올지 고를 수 없다. 파서·순위·본문 주소화 등 **수집 로직은 제품 경로 그대로**다 |
| 21 | `tests/e2e/run.sh` | `llm-fixtures` | LLM-02 | LLM | kind 클러스터에 커밋된 LLM 응답 픽스처(`tests/e2e/fixtures/llm`)를 `llm-fixtures` ConfigMap으로 만든다 | 실 chat-completions 응답은 같은 입력에도 매번 달라 「이 기사에 어떤 대상 국가·서술 대상·분위기가 매겨졌는가」를 단정할 대상이 고정되지 않는다. 키·과금·네트워크도 CI에 끌고 들어온다 |
| 22 | `tests/e2e/k8s/batch/llm-double.yaml` | `llm-fixtures` | LLM-03 | LLM | LLM 더블 Pod가 그 ConfigMap을 `/llm`으로 마운트한다 | LLM-02와 같은 원인 — 분석 CLI가 HTTP로 chat-completions를 부르는 계약이라 픽스처를 실제 엔드포인트로 세워야 한다 |
| 23 | `tests/e2e/k8s/batch/llm-double.yaml` | `server.py` | LLM-04 | LLM | 더블이 OpenAI 호환 `/chat/completions` 응답 서버를 돈다(제목으로 고정 응답을 고르고, 없는 제목은 404) | 같은 원인 — 응답을 고정하지 않으면 라벨 전파 계약을 단언할 수 없다. 프롬프트 조립·응답 파싱·서술 대상 정규화·저신뢰 판정·Silver 적재는 **제품 경로 그대로**이고 바뀌는 것은 상류뿐이다 |
| 24 | `tests/e2e/k8s/batch/analyze-job.yaml` | `ECON_LLM_BASE_URL` | LLM-05 | LLM | 분석 CLI의 chat-completions 상류를 클러스터 안 더블로 돌린다(상류 재배선 — `ECON_LLM_BASE_URL`·`ECON_LLM_MODEL`·더미 `ECON_LLM_API_KEY` 한 묶음) | LLM-02와 같은 원인. 키는 운영에서 external-secrets가 넣는 자리이고 더블은 보지 않지만, CLI가 미설정을 operator error(exit 2)로 끊으므로 값이 있어야 한다 — 비밀이 아닌 고정 문자열이며 실 엔드포인트에는 쓰이지 않는다 |
| 25 | `tests/e2e/k8s/batch/analyze-job-v2.yaml` | `ECON_LLM_BASE_URL` | LLM-06 | LLM | 재분석 주기의 상류도 같은 더블로 돌리되 응답 묶음만 `e2e-llm-v2`로 바꾼다 | `…-test-analysis.md#시나리오 6` 이 「분석 로직을 변경해 동일 Bronze 원문을 재분석한다」를 실행 단계로 요구한다 — 실 모델에게 "이번엔 다르게 판정하라"를 주문할 수 없고, 응답이 우연히 달라지기를 기다릴 수도 없다 |
| 26 | `tests/e2e/k8s/batch/ingest-job-agg.yaml` | `feed-fixtures` | FEED-17 | FEED | 집계 묶음의 **기준 상태**를 만드는 수집 Job이 같은 ConfigMap을 `/feeds`로 마운트해 피드 설정·픽스처를 읽는다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 27 | `tests/e2e/k8s/batch/ingest-job-agg.yaml` | `--feeds` | FEED-18 | FEED | 그 주기의 상류를 집계 묶음 전용 설정(`e2e-feeds-agg.json`)으로 돌린다(상류 재배선) | `…-test-analysis.md#시나리오 4·5` · `…-test-aggregation-viz.md#시나리오 1·2·4` 가 **소스 내 정규화와 축 비교가 성립하는 corpus**(KR 2 소스 + US 1 소스)를 사전 조건으로 요구한다 — 실 상류에서는 그런 소스 구성을 고를 수 없다. 파서·순위·절단·본문 주소화 등 **수집 로직은 제품 경로 그대로**이고 바뀌는 것은 상류뿐이다 |
| 28 | `tests/e2e/k8s/batch/ingest-job-agg-skew.yaml` | `feed-fixtures` | FEED-19 | FEED | **수집량을 부풀린 상태**를 만드는 수집 Job이 같은 ConfigMap을 `/feeds`로 마운트한다 | FEED-04와 같은 원인 — 소스 목록·축·상한이 제품 계약상 설정이므로 더블을 가리키는 설정 자체를 주입해야 한다 |
| 29 | `tests/e2e/k8s/batch/ingest-job-agg-skew.yaml` | `--feeds` | FEED-20 | FEED | 그 주기의 상류를 부풀린 상태 전용 설정(`e2e-feeds-agg-skew.json`)으로 돌린다(상류 재배선) | `…-test-aggregation-viz.md#시나리오 1` 이 「한 소스의 수집량만 인위적으로 크게 늘린다」를 사전 조건으로 요구한다 — 실 상류에 물량을 주문할 수 없다. 기준 상태(FEED-18)와 **다른 것은 상류 설정 하나뿐**이라 두 Gold의 차이가 오직 수집량 차이로 읽힌다 |
| 30 | `tests/e2e/k8s/batch/analyze-job-agg.yaml` | `ECON_LLM_BASE_URL` | LLM-07 | LLM | 집계 묶음 기준 상태의 분석 CLI 상류를 클러스터 안 더블로 돌린다(BASE_URL·MODEL·더미 KEY 한 묶음, 응답 묶음 `e2e-llm-agg`) | LLM-02와 같은 원인. 응답 묶음을 분석 묶음(`e2e-llm-v1`)과 나누는 것은 기사 집합이 겹치지 않기 때문이고, 한 묶음에 섞으면 한쪽 기사를 지울 때 다른 쪽이 조용히 404로 무너진다. 분석기는 기본값인 **실 llm 분석기**라 프롬프트 조립·파싱·정규화·저신뢰 판정은 제품 경로 그대로 돈다 |
| 31 | `tests/e2e/k8s/batch/analyze-job-agg-skew.yaml` | `ECON_LLM_BASE_URL` | LLM-08 | LLM | 부풀린 상태의 분석 상류도 같은 더블·같은 응답 묶음(`e2e-llm-agg`)으로 돌린다 | LLM-02와 같은 원인 — 같은 묶음을 써야 같은 기사에 같은 라벨이 돌아와 **두 Gold의 차이가 분석 판정이 아니라 수집량에서만** 온다 |

픽스처(`tests/e2e/fixtures/gold/axis_sentiment.jsonl`·`subject_trend.jsonl`)는 `contracts/gold/axis_sentiment.avsc`·`subject_trend.avsc`를 따른다(GOLD 카테고리 요건). 브라우저 인터셉트는 여전히 **0건**이다. 상류 재배선은 2026-09-18 수집 배치 하네스가 서면서 `--feeds`로 늘었고, 같은 날 분석 배치 하네스가 서면서 `ECON_LLM_BASE_URL`이 더해져 **LLM 카테고리가 처음 e2e 지점을 갖게 됐다**(그 전까지는 스모크의 `--analyzer fake` 한 건뿐이었다). 2026-09-19 집계 배치 하네스(기준 상태 + 부풀린 상태 두 갈래)가 서면서 **6지점이 더해져 현재 31지점 / 18파일**이다 — `--feeds` 8건 · `ECON_LLM_BASE_URL` 4건.

**FEED 카테고리가 늘어난 것은 모킹이 깊어져서가 아니다.** FEED-06~20은 전부 상류 한 겹에 머문다 — 수집 CLI·파서·순위·절단·실패 격리·재시도·본문 주소화는 제품 경로 그대로 돌고, 더블이 정하는 것은 "무엇을 주는가"에 "언제 실패하는가"가 더해진 것뿐이다. 실패·지연을 주입하지 않으면 `…-test-ingestion.md#시나리오 6`의 사전 조건("다수 소스 중 하나가 오류를 반환하도록 구성한다")을 e2e에서 세울 방법이 없다.

**LLM 카테고리도 같은 깊이에 머문다.** LLM-02~08이 대체하는 것은 chat-completions 엔드포인트 하나이고, 프롬프트 조립·응답 파싱·서술 대상 정규화·저신뢰 판정·Bronze 추적 키·Silver 적재는 제품 경로 그대로 돈다. 정책이 못 박은 경계도 그대로다 — **라벨의 의미적 정확도는 이 하네스가 재지 않는다.** 더블이 답한 값이 손실·왜곡 없이 Silver까지 닿는가(전파 계약)만 본다. 더블이 **모르는 제목에 기본 응답을 주지 않고 404를 내는 것**이 그 경계를 지키는 장치다: 조용한 기본값이 있으면 픽스처가 낡아도 spec이 초록으로 지나가고, 그 순간 이 카테고리는 "편의를 위한 모킹"이 된다.

**GOLD 카테고리는 유지하되, 유지 사유가 바뀌었다 — 「만들 수 없다」가 아니라 「아직 잇지 않았다」.** 「GOLD 카테고리」의 소멸 조건은 *서빙 입력이 되는 Gold 분포를 배치 산출물로 만들 수 있게 되는 것*이고, **그 조건은 2026-09-19 기술적으로 충족됐다** — 집계 Job(`tests/e2e/k8s/batch/aggregate-job.yaml`·`aggregate-job-skew.yaml`)이 실재하고, `tests/e2e/run.sh`의 `run_aggregation_stack()`이 수집→분석→집계 3단을 기준·부풀린 두 갈래로 돌려 `export_lake … gold`로 **파이프라인이 만든 Gold**를 반출한다(종료 배너 `aggregation batch -> pipeline-produced Gold`). `python/packages/aggregation`의 집계 로직은 이제 e2e에서 **실행된다**.

**판정(2026-09-19, `rct_20260919-0004`): GOLD 카테고리 유지 — 단, GOLD-01~03은 이제 「필요한 예외」가 아니라 「제거 후보」다.** 유지하는 이유는 소멸 조건이 미충족이어서가 아니라, **서빙 스택의 입력이 아직 픽스처 Gold이기 때문**이다 — `run.sh`가 `tests/e2e/fixtures/gold`로 `gold-fixtures` ConfigMap을 만들어 서빙에 마운트하고, 반출된 파이프라인 Gold는 spec이 파일로 읽을 뿐 서빙을 띄우지 않는다. 즉 **못 만드는 것이 아니라 아직 잇지 않은 것**이며, 정의가 말한 「그 시점에 픽스처 Gold는 제거 후보가 된다」에 정확히 해당한다. 잇는 작업(= 픽스처 Gold 제거)은 하네스 슬라이스이고 원장 **R3**가 소관·선행·재검토 시점과 함께 추적한다. 앞 절(R2)이 추적하던 「집계 Job 부재」는 해소됐다.

## 차단 요인 원장

**차단 요인** = 치환이 아예 없거나 있어도 표현력이 모자라서 E2E가 그 경로를 **아예 밟지 못하는** 원인. 모킹 지점이 아니므로 코드에 토큰을 남기지 않는다. 개수 자체는 gap이 아니다 — 재는 것은 **해소 계획의 존재**다.

- **B1 인계 수신**: 이 모델을 소관으로 지목한 문장(reconciler 다른 모델의 task 문맥)마다 행이 있어야 한다. 현재 **지목 문맥 4건**(2026-09-19 전수 재확인) — 전부 자매 모델 `tbm_econ-opinion-monitor-scenario-e2e`가 넘긴 것이다: `rct_20260918-0002`·`rct_20260918-0004`(「원장 R1의 판정은 이 task가 바꾸지 않는다 — 자매 모델 소관」) · `rct_20260918-0005`(「원장 R1 판정·GOLD 카테고리 소멸 여부」 + 잔여 공백 5건이 **집계 하네스 한 덩어리**로 닫힌다는 측정) · **`rct_20260919-0001`(신규)**(집계 하네스를 착지시키면서 「서빙 입력을 픽스처 Gold에서 파이프라인 Gold로 갈아끼우는 일 = GOLD 카테고리 소멸, 판정은 자매 모델 소관」을 축자로 넘겼다 — 대상 레포 `docs/econ-opinion-monitor-doc-tracker/2026-09.md`에도 같은 문장이 적혀 있다). 지목된 원인은 셋으로 갈린다 — **수집·분석 경로**는 R1이 받아 닫혔고, **집계 Job 부재**는 R2가 받아 이번에 닫혔으며(둘 다 아래 「해소된 차단 요인」), **서빙 입력 전환**이 새 지목이라 **R3로 신설**해 받는다 ⇒ **B1 위반 0**. (직전 관측 「지목 문맥 3건」은 자매 `rct_20260919-0001`이 `succeeded`로 닫히며 4건이 됐다.)
- **B2 계획 완비**: 각 행은 해소 방향 · 소관 · 선행(없으면 「없음」 — 그 행은 착수 가능) · 재검토 시점(날짜는 등재일로부터 최장 90일)을 행 안에서 기계적으로 읽을 수 있게 갖춘다.
- **B3 개수 변화**: 증가면 새 행에 B1·B2 적용, 감소면 해소 방향이 실제 반영됐는지 확인, 불변이면 재검토 시점 도과만 본다.

| 행 | 차단 요인 | 해소 방향 | 소관 | 선행 | 재검토 시점 |
|----|-----------|-----------|------|------|-------------|
| R3 | **파이프라인 Gold가 산출되는데 서빙 입력은 아직 픽스처 Gold다** — 집계 Job(`aggregate-job.yaml`·`aggregate-job-skew.yaml`)이 서서 `run.sh`의 `run_aggregation_stack()`이 두 갈래로 Gold를 만들고 `export_lake … gold`로 반출하지만, 서빙 스택은 여전히 `tests/e2e/fixtures/gold`로 만든 `gold-fixtures` ConfigMap(GOLD-01~03)을 입력으로 받는다. 반출된 Gold는 spec이 **파일로 읽을 뿐** 서빙을 띄우지 않아, 서빙·시각화 단정(AC3.6~3.8)이 배치 산출물 분포 위에서 돌지 않는다 — 출처: 자매 `rct_20260919-0001`의 인계(「서빙 입력을 파이프라인 Gold로 갈아끼우는 일 = GOLD 카테고리 소멸, 판정은 자매 모델 소관」)와 `docs/econ-opinion-monitor-doc-tracker/2026-09.md`의 같은 문장 | 등재가 아니라 실환경 대체로 닫는다: 서빙 오버레이의 Gold 입력을 `gold-fixtures`에서 **집계 Job이 만든 Gold**로 갈아끼우고 **GOLD-01~03을 허용목록에서 제거**한다(픽스처 `tests/e2e/fixtures/gold` 삭제 포함). 분포가 달라지므로 이미 매칭된 `ac3-6·7·8` 단정을 함께 옮기는 것이 같은 슬라이스에 들어간다 | `tbm_econ-opinion-monitor-scenario-e2e` — 서빙 오버레이·spec 단정을 바꾸는 하네스 작업이다. 본 모델은 **픽스처 Gold 제거 여부의 판정**만 하고 그 판정은 이 행으로 이미 내려져 있다(소멸 조건 충족 · 제거 후보) | 없음(집계 Job·PVC·반출 경로가 모두 main에 있다 — 착수 가능하나 소관이 본 모델이 아니다) | 2026-12-18 |

**R3가 닫히면 GOLD 카테고리 자체가 사라진다**: 서빙 입력이 파이프라인 Gold로 바뀌는 순간 「배치 산출물로 만들 수 없다」는 전제가 남김없이 소멸해 GOLD-01~03이 제거되고, 허용 카테고리는 FEED·LLM 둘만 남는다. **소멸 조건은 이미 충족됐고 남은 것은 배선뿐이라는 점**이 R2와 R3의 차이다 — R2는 「만들 수 없다」(능력 부재)였고 R3는 「아직 잇지 않았다」(배선 미완)다. 그래서 R3는 **닫히는 방향으로만** 움직여야 하며, 재검토 시점에 배선이 그대로면 「유지」가 아니라 **왜 잇지 않았는지**를 적어야 한다.

**AC3.3·AC3.5는 R3의 대상이 아니다.** 둘은 doc-tracker에서 공백이 아니라 **「구현 대기」**로 갈려 있다 — 일·주 롤업이 아직 산출되지 않고(`aggregate.py` ∋ `BUCKET_UNIT = "hour"`), `/api/trend`·`/trend`가 스텁·플레이스홀더라 **관측할 대상 자체가 없다**. 하네스가 없어서가 아니라 구현이 없어서이므로 차단 요인이 아니고, 소관은 `tbm_econ-opinion-monitor-docs-impl`이다. 이 원장은 **구현은 있는데 하네스가 닿지 않아 밟지 못하는** 원인만 행으로 가진다 — R2가 들었던 5건(analysis 4·5 · aggregation-viz 1·2·4 = AC2.4·AC2.5·AC3.1·AC3.2·AC3.4)이 정확히 그 부류였고, 집계 하네스가 서면서 그 5건의 공백 원인은 소멸했다. R3가 드는 것은 **그 뒤에 남은 배선 한 칸**(서빙 입력)이다.

### 해소된 차단 요인

조용히 지우지 않고 남긴다 — 행이 예고만 남기고 사라지면 B3가 금지한 **영구 면제**가 되기 때문이다. 각 행은 해소일과 **관측 가능한 근거**를 갖는다.

| 행 | 차단 요인 (해소 당시 문면) | 해소일 | 해소 근거 (관측 좌표) |
|----|---------------------------|--------|----------------------|
| R1 | 수집·분석 배치를 e2e에 들이는 하네스(배치 이미지 · Job · 제어 가능한 피드/LLM 더블)가 없어, E2E가 수집→분석→집계 배치 경로를 한 번도 밟지 못한다 — 등재일 2026-09-17, 소관은 doc-tracker 슬라이스 2(실수집→실 Bronze)·3(실분석→실 Silver) | 2026-09-19 (판정 `rct_20260919-0001`) | R1이 적은 해소 방향(「배치를 `FEED`·`LLM` 더블 **상류**로 E2E 안에서 구동한다」)이 **자기 범위에서 실제로 반영됐다** — 예고가 아니라 착지다. 수집: `tests/e2e/k8s/batch/{feed-double,ingest-job,ingest-job-cycle1..3,ingest-job-faults}.yaml`(`rct_20260918-0002`·`rct_20260918-0004`). 분석: 같은 디렉터리의 `{llm-double,ingest-job-analysis,analyze-job,analyze-job-v2}.yaml`(`rct_20260918-0005`, 커밋 `feb454b`). 두 단계 모두 **실 배치 CLI·이미지 경로를 그대로** 돌고 상류만 더블이다. doc-tracker 「공백 해소 경로」의 수집·분석 묶음이 **착지**로 표시되고, 그 12건(AC1.2~1.7·AC2.1~2.6)의 공백 원인이 소멸했다 |
| R2 | **집계 Job이 e2e 하네스에 없어**, 서빙 입력이 되는 Gold 분포를 배치 산출물로 만들 수 없다 — `tests/e2e/k8s/batch/`에 수집·분석 Job은 서 있으나 집계 Job이 없어 `python/packages/aggregation`의 집계 로직이 e2e에서 **한 번도 실행되지 않는다** — 등재일 2026-09-19, 소관은 `tbm_econ-opinion-monitor-scenario-e2e`(집계 묶음 슬라이스) | 2026-09-19 (판정 `rct_20260919-0004`) | R2가 적은 해소 방향(「**집계 Job 한 단계**를 e2e 하네스에 더한다」)이 **같은 날 착지했다**(커밋 `d422b38`, PR #50, 자매 `rct_20260919-0001`의 산출). 관측 좌표: `tests/e2e/k8s/batch/aggregate-job.yaml`·`aggregate-job-skew.yaml` 실재 · `tests/e2e/run.sh`의 `run_aggregation_stack()`이 수집→분석→집계 3단을 기준·부풀린 두 갈래로 구동 · `export_lake … gold "$GOLD_DIR"`·`"$GOLD_SKEW_DIR"` 반출 · 종료 배너 `[e2e] OK: aggregation batch -> pipeline-produced Gold (baseline + skewed volume)`. 새 지점 6건(FEED-17~20·LLM-07~08)도 같은 착지에서 왔다. **다만 R2의 해소가 GOLD 카테고리를 소멸시키지는 않았다** — 「만들 수 있다」가 참이 됐을 뿐 서빙 입력은 아직 픽스처이고, 그 배선 한 칸은 **R3**가 이어 받는다 |

**R1·R2의 범위는 각 행 자신의 소관 열이 정한다** — R1은 doc-tracker 슬라이스 2·3(수집·분석), R2는 집계 묶음 슬라이스다. 남은 원인은 앞 행의 범위가 아니라 **별도 원인**이므로 행을 넓히지 않고 각각 R2·R3로 신설했다. 한 행에 뭉치면 B3(개수 변화)의 감사 흔적이 지워진다 — 실제로 R1→R2→R3는 「능력 부재(수집·분석)」 → 「능력 부재(집계)」 → 「배선 미완(서빙 입력)」으로 원인의 성격이 매번 바뀌었고, 뭉쳤다면 그 이동이 보이지 않았을 것이다.

## 변동 이력

| 날짜 | task | 내용 |
|------|------|------|
| 2026-09-19 | rct_20260919-0004 | **집계 배치 하네스(#50 `d422b38`) 착지분 등재 + 원장 재판정.** ⑴ **등재 6행 추가**(FEED-17~20 · LLM-07~08, **25→31지점 / 14→18파일**, 3종 불변): `ingest-job-agg.yaml`·`ingest-job-agg-skew.yaml`·`analyze-job-agg.yaml`·`analyze-job-agg-skew.yaml`. ⑵ **CODE 재번호 6곳** — #50이 새 4파일에 예외 주석을 달면서 기존 `FEED-15`·`FEED-16`·`LLM-05`를 **재사용**해 「CODE 1개 = (파일, 대상) 1쌍」 규약이 깨져 있었다(미등재 6 · 고아 0). 주석의 CODE만 새 번호로 바꿨고 **사유 문면·지점은 무접촉**이라 as-is 지문은 바이트 불변(`sites=31 files=18` / `46c549f1…c548004`) — 지문 패턴이 `mock-exception: *[A-Z]+`로 숫자를 보지 않기 때문이고, 이것이 「모킹이 늘지도 줄지도 않았다」의 기계 증명이다. ⑶ **R2 마감 → R3 신설**: R2의 차단 원인(「집계 Job이 없어」)이 #50으로 거짓이 됐다. 「해소된 차단 요인」에 근거와 함께 남기고, 실제로 남은 원인(「파이프라인 Gold는 나오는데 **서빙 입력은 아직 픽스처**」)을 R3로 받았다(소관 `tbm_econ-opinion-monitor-scenario-e2e`, 선행 없음, 재검토 2026-12-18). ⑷ **GOLD 유지 판정의 사유 교체**: 「배치 산출물로 **만들 수 없다**」(거짓) → 「**만들 수 있으나 아직 잇지 않았다**」. 소멸 조건은 충족됐으므로 GOLD-01~03은 필요한 예외가 아니라 **제거 후보**이고 R3가 추적한다. 허용목록 GOLD-01·03 사유 열과 `tests/e2e/run.sh`의 GOLD-01 주석(「배치 경로 부재(원장 R1)로 … 만들 수 없어」)도 같은 이유로 정정. ⑸ **B1 3→4건**(자매 `rct_20260919-0001`의 신규 지목을 R3가 받는다) ⇒ 위반 0 |
| 2026-09-19 | rct_20260919-0001 | **원장 단독 정정 — 허용목록·코드는 무접촉(25지점 / 14파일 / 3종 불변, 등재↔주석 1:1 유지).** ⑴ **R1 마감**: 「수집·분석 배치 하네스가 없어」가 거짓이 됐다(`tests/e2e/k8s/batch/`에 수집 6종·분석 4종 실재, `rct_20260918-0002`·`-0004`·`-0005`). 열린 표에서 내리되 조용히 지우지 않고 「해소된 차단 요인」 소절에 근거와 함께 남겼다 — 예고만 남기고 사라지면 B3가 금지한 영구 면제다. ⑵ **R2 신설**: 「집계 Job이 e2e 하네스에 없어 서빙 입력 Gold를 배치 산출물로 만들 수 없다」(출처: doc-tracker 「공백 해소 경로」 집계 묶음 5건 + 자매 `rct_20260918-0005` 인계). 소관은 `tbm_econ-opinion-monitor-scenario-e2e`, 선행 없음, 재검토 2026-12-18. ⑶ **GOLD 소멸 조건의 연결 대상을 R1 → R2로 이설**: R1만 닫고 그대로 뒀으면 「R1이 닫히면 GOLD 전제도 사라진다」가 **아직 필요한 GOLD-01~03을 제거 후보로 만드는 거짓 귀결**을 낳았다. 허용목록 GOLD-01·03의 `실환경 불가 사유` 열 참조도 함께 재지시(파일·토큰·CODE 열 불변). ⑷ **B1 절 갱신**: 「지목 문맥 0건(2026-09-17)」 → 3건(2026-09-19 전수 재확인), R2 신설로 위반 0. ⑸ **GOLD 카테고리 유지 판정**: 앞선 재감지가 넘긴 판정을 받아 확정 — 집계 Job 부재 실측 |
| 2026-09-17 | rct_20260917-0001 | 문서 신설: 정책·허용목록 5지점(GOLD 3·FEED 1·LLM 1)·원장 R1(doc-tracker 공백 산문의 이행) 확정 |
| 2026-09-18 | rct_20260918-0005 | 분석 배치 하네스 착지에 따라 LLM 5지점·FEED 2지점 추가 등재(LLM-02~06 · FEED-15~16, 18→25지점 / 10→14파일). **LLM 카테고리가 처음 e2e 지점을 갖는다** — 그 전까지는 스모크의 `--analyzer fake` 한 건뿐이었다. 새 축은 chat-completions **응답의 고정**이고, 프롬프트 조립·파싱·정규화·저신뢰 판정·Silver 적재는 제품 경로 그대로다. 더블이 모르는 제목에 기본값을 주지 않고 404를 내는 것이 「편의를 위한 모킹」으로 번지지 않게 하는 경계다. `…-test-analysis.md#시나리오 1·2·3·6`의 공백이 닫혔다(공백 9→5). **원장 R1의 판정은 이 task가 바꾸지 않는다**(자매 모델 소관): 사실만 적으면 R1이 지목한 3단 중 **수집·분석**이 e2e 안으로 들어왔고 집계만 남았다 |
| 2026-09-18 | rct_20260918-0004 | 고장 주입 더블·주기별 상류 착지에 따라 FEED 9지점 추가 등재(FEED-06~14, 9→18지점). 새 축은 상류의 **가용성**(오류·타임아웃)과 **주기별 내용**이고, 수집 로직은 여전히 제품 경로 그대로다. `…-test-ingestion.md#시나리오 6·7`의 공백이 닫혔다(공백 11→9). **원장 R1의 판정은 이 task가 바꾸지 않는다**(자매 모델 소관): 3단 중 수집만 e2e 안에 있다는 사실은 그대로다 |
| 2026-09-18 | rct_20260918-0002 | 수집 배치 하네스 착지에 따라 FEED 4지점 추가 등재(FEED-02~05, 5→9지점). 등재가 아니라 **실환경 대체**로 늘어난 지점이다 — 수집 로직은 제품 경로 그대로 돌고 상류만 더블이다. **원장 R1의 판정은 이 task가 바꾸지 않는다**(자매 모델 `tbm_econ-opinion-monitor-e2e-mock-policy` 소관): 사실만 적으면 R1이 지목한 3단 중 **수집만** e2e 안으로 들어왔고 분석·집계는 그대로다 |
