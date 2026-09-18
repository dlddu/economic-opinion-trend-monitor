# E2E 모킹 정책

> 정책·허용목록·차단 요인 원장의 SSOT. 2026-09-17 최초 등재 (reconciler `rct_20260917-0001`, 모델 `tbm_econ-opinion-monitor-e2e-mock-policy`).
> `docs/econ-opinion-monitor-doc-tracker.md`의 「e2e 매핑」 절은 갱신이 잦은 로드맵·이력 축이므로 이 문서와 분리된다(같은 결정을 한 문서로 모으기 위한 전용 문서).

## 목적과 적용 범위

이 레포의 E2E는 **kind 실클러스터에 서빙 이미지(Go API + 웹 번들)를 `deploy/base`의 e2e 오버레이로 배포하고, API와 브라우저가 실제로 그 워크로드를 호출하는 하네스**(`tests/e2e/run.sh`, `make e2e`)가 기본이다. 배치 산출물을 대신하는 픽스처 Gold ConfigMap·결정적 더블을 고르는 스위치·상류 재배선·브라우저 네트워크 인터셉트는 **실환경으로 재현이 불가능한 경우에 한해서만** 허용하고, 그 예외는 이 문서에 등재된 것만 인정한다. 편의(실환경 준비 회피, 어서션 단순화, 플레이키 무마)를 위한 모킹은 drift다.

## 모킹으로 세는 것 (범위 경계)

이 레포의 치환은 하네스 쪽에서 일어난다. 다음 넷을 모킹으로 센다:

1. **배치 산출물 치환** — 수집→분석→집계 파이프라인 대신 커밋된 픽스처 Gold를 ConfigMap(`gold-fixtures`)으로 `/data/gold`에 마운트하는 것.
2. **더블 선택 스위치** — 제품 CLI의 결정적 오프라인 구현을 고르는 자리(`--source fake` · `--analyzer fake`).
3. **상류 재배선** — 실 상류 대신 다른 대상을 가리키게 하는 자리(`--feeds <파일>`로 피드 더블을 가리키기 · `ECON_LLM_BASE_URL`로 LLM 더블 서버를 가리키기). 2026-09-18 수집 배치 하네스가 서면서 `--feeds` 6건(FEED-05·08·10·12·14)이 등재됐고, `ECON_LLM_BASE_URL`은 아직 0건이다. 더블이 **오류·지연을 내는 것**(FEED-06)도 이 범주로 본다 — 상류의 내용이 아니라 가용성을 재배선하는 자리다.
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

## 허용목록 (등재 집합 — 2026-09-18 관측, 18지점 / 10파일 / 3종)

지점은 **파일 × 토큰 쌍** 단위로 등재한다. 아래 표가 등재 집합이며, 각 행의 CODE는 코드 주석에 동일하게 부착된다. 1:1 판정 입력: (허용목록 쌍 집합) == (코드 지점 쌍 집합).

| # | 파일 | 토큰 | CODE | 카테고리 | 지점 내용 | 실환경 불가 사유 |
|---|------|------|------|----------|-----------|------------------|
| 1 | `tests/e2e/run.sh` | `gold-fixtures` | GOLD-01 | GOLD | kind 클러스터에 커밋된 픽스처 Gold(`tests/e2e/fixtures/gold`)를 `gold-fixtures` ConfigMap으로 만든다 | 배치 경로가 E2E에 없어(원장 R1) 서빙 입력이 되는 Gold 분포를 배치 산출물로 만들 수 없다 — AC3.6~3.8이 특정 Gold 분포(상위 비율·3축 비교)에 단정을 건다 |
| 2 | `tests/e2e/k8s/kustomization.yaml` | `gold-fixtures` | GOLD-02 | GOLD | 오버레이 헤더 주석이 `gold-fixtures` 마운트 배선을 문서화한다(실제 마운트는 3행) | GOLD-01의 배선 문서화 앵커 — 지문·주석 1:1 유지를 위해 같이 등재한다 |
| 3 | `tests/e2e/k8s/e2e-patch.yaml` | `gold-fixtures` | GOLD-03 | GOLD | serving pod에 `gold` volume(ConfigMap `gold-fixtures`)을 `/data/gold`(readOnly)로 마운트한다 | 같은 R1 원인 — 서빙이 `<ECON_DATA_ROOT>/gold/*.jsonl`을 파일 시스템에서 읽는 계약이라 픽스처를 볼륨으로 주입해야 한다 |
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

픽스처(`tests/e2e/fixtures/gold/axis_sentiment.jsonl`·`subject_trend.jsonl`)는 `contracts/gold/axis_sentiment.avsc`·`subject_trend.avsc`를 따른다(GOLD 카테고리 요건). 브라우저 인터셉트는 여전히 **0건**이다. 상류 재배선은 2026-09-18 수집 배치 하네스가 서면서 `--feeds` 6건(FEED-05·08·10·12·14)으로 늘었고, `ECON_LLM_BASE_URL`은 아직 0건이다 — 분석 배치가 e2e에 들어올 때 LLM 카테고리로 등재된다.

**FEED 카테고리가 늘어난 것은 모킹이 깊어져서가 아니다.** FEED-06~14는 전부 상류 한 겹에 머문다 — 수집 CLI·파서·순위·절단·실패 격리·재시도·본문 주소화는 제품 경로 그대로 돌고, 더블이 정하는 것은 "무엇을 주는가"에 "언제 실패하는가"가 더해진 것뿐이다. 실패·지연을 주입하지 않으면 `…-test-ingestion.md#시나리오 6`의 사전 조건("다수 소스 중 하나가 오류를 반환하도록 구성한다")을 e2e에서 세울 방법이 없다.

**GOLD 카테고리는 아직 살아 있다.** 「GOLD 카테고리」의 소멸 조건은 *서빙 입력이 되는 Gold 분포를 배치 산출물로 만들 수 있게 되는 것*인데, 이번에 e2e에 들어온 것은 **수집 단계뿐**이라 서빙은 여전히 픽스처 Gold를 입력으로 받는다(집계 Job이 e2e에 없다). GOLD-01~03은 그대로 필요하다.

## 차단 요인 원장

**차단 요인** = 치환이 아예 없거나 있어도 표현력이 모자라서 E2E가 그 경로를 **아예 밟지 못하는** 원인. 모킹 지점이 아니므로 코드에 토큰을 남기지 않는다. 개수 자체는 gap이 아니다 — 재는 것은 **해소 계획의 존재**다.

- **B1 인계 수신**: 이 모델을 소관으로 지목한 문장(reconciler 다른 모델의 task 문맥)마다 행이 있어야 한다. 현재 **지목 문맥 0건**(2026-09-17 전수 확인) — B1 위반 0.
- **B2 계획 완비**: 각 행은 해소 방향 · 소관 · 선행(없으면 「없음」 — 그 행은 착수 가능) · 재검토 시점(날짜는 등재일로부터 최장 90일)을 행 안에서 기계적으로 읽을 수 있게 갖춘다.
- **B3 개수 변화**: 증가면 새 행에 B1·B2 적용, 감소면 해소 방향이 실제 반영됐는지 확인, 불변이면 재검토 시점 도과만 본다.

| 행 | 차단 요인 | 해소 방향 | 소관 | 선행 | 재검토 시점 |
|----|-----------|-----------|------|------|-------------|
| R1 | 수집·분석 배치를 e2e에 들이는 하네스(배치 이미지 · Job · 제어 가능한 피드/LLM 더블)가 없어, E2E가 수집→분석→집계 배치 경로를 한 번도 밟지 못한다 — 출처: `docs/econ-opinion-monitor-doc-tracker.md` 「e2e 매핑 › 공백」 산문(AC1.2~1.7·AC2.1~2.6 12건의 공백 원인) | 등재가 아니라 실환경 대체로 닫는다: 배치를 `FEED`·`LLM` 더블 **상류**로 E2E 안에서 구동한다(실 배치 이미지·CLI 경로를 그대로, 상류만 더블) — 그러면 E2E가 실 배치 경로를 밟고, 같은 Gold 분포를 배치 산출물로 결정적으로 만들 수 있다 | doc-tracker 「AC↔e2e 1:1 매핑표」 슬라이스 2(실수집→실 Bronze)·3(실분석→실 Silver) — AC1.x·AC2.x의 e2e spec 착지와 그 하네스 | 없음(페이크 더블 카탈로그·배치 이미지·Job 계약은 이미 main에 있다 — 착수 가능하나 소관이 본 모델이 아니다) | 2026-12-16 |

**R1이 닫히면 GOLD 카테고리의 전제도 함께 사라진다**: 배치가 더블 상류로 E2E 안에서 구동되는 순간, 서빙 입력이 되는 Gold 분포를 배치 산출물로 만들 수 있게 되어 픽스처 Gold(GOLD-01..03)는 제거 후보가 된다 — 「GOLD 카테고리」의 소멸 조건과 묶인다.

AC3.1~3.5의 공백 원인(실집계 Gold와 해당 화면 착지 선행)은 같은 산문의 다른 갈래다 — 배치 경로 치환과는 별개 원인이므로 다음 감지가 재판정하며, 이 원장은 배치 경로 원인만 행으로 가진다.

## 변동 이력

| 날짜 | task | 내용 |
|------|------|------|
| 2026-09-17 | rct_20260917-0001 | 문서 신설: 정책·허용목록 5지점(GOLD 3·FEED 1·LLM 1)·원장 R1(doc-tracker 공백 산문의 이행) 확정 |
| 2026-09-18 | rct_20260918-0004 | 고장 주입 더블·주기별 상류 착지에 따라 FEED 9지점 추가 등재(FEED-06~14, 9→18지점). 새 축은 상류의 **가용성**(오류·타임아웃)과 **주기별 내용**이고, 수집 로직은 여전히 제품 경로 그대로다. `…-test-ingestion.md#시나리오 6·7`의 공백이 닫혔다(공백 11→9). **원장 R1의 판정은 이 task가 바꾸지 않는다**(자매 모델 소관): 3단 중 수집만 e2e 안에 있다는 사실은 그대로다 |
| 2026-09-18 | rct_20260918-0002 | 수집 배치 하네스 착지에 따라 FEED 4지점 추가 등재(FEED-02~05, 5→9지점). 등재가 아니라 **실환경 대체**로 늘어난 지점이다 — 수집 로직은 제품 경로 그대로 돌고 상류만 더블이다. **원장 R1의 판정은 이 task가 바꾸지 않는다**(자매 모델 `tbm_econ-opinion-monitor-e2e-mock-policy` 소관): 사실만 적으면 R1이 지목한 3단 중 **수집만** e2e 안으로 들어왔고 분석·집계는 그대로다 |
