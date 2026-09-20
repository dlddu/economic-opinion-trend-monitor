# batch-harness-pass — 2026-09-20

기준 커밋 `fc428dd` (product-surface-pass가 착지한 main). 판정 범위는 **`tests/e2e/k8s/batch/` 중
아직 원장 행이 없던 18파일 / 149줄**이다. 같은 디렉터리의 `feed-double.yaml`(8줄)은
[aggregation-harness-pass](2026-09-18-aggregation-harness-pass.md)가 이미 판정했으므로 이 패스가
다시 보지 않았고, 이 패스 뒤 그 디렉터리는 **19파일 전부가 행을 갖는다**.

레포 전체 지문: `lines=1857 files=111` → `lines=1845 files=111` (제거 12줄, 파일 수 불변 — 이번
제거로 주석이 0이 되는 파일은 없다).

## 왜 이 묶음인가

직전 패스([product-surface-pass](2026-09-19-product-surface-pass.md))가 범위 밖으로 인계한 잔여
42파일 / 664줄은 전부 e2e 하네스 축이고 네 묶음으로 갈린다 — `tests/e2e/specs`(16파일 324줄) ·
`tests/e2e/k8s/batch`(18파일 149줄) · `tests/e2e/lib`(6파일 167줄) ·
`tests/e2e/fixtures/{feeds,llm}/server.py`(2파일 24줄).

배치 하네스를 먼저 가른 것은 두 가지 때문이다.

1. **디렉터리 하나가 통째로 닫힌다.** 19파일 중 18파일만 미판정이라, 이 패스 하나로 그 축의
   원장 공백이 0이 된다. 다른 세 묶음은 어느 것도 이런 완결 경계를 갖지 않는다.
2. **제거 유형이 이 묶음 안에서 실측된다.** 아래 ①이 **바이트 동일한 주석 블록의 3중 중복**이고,
   레포 안에 그 주석 없이 같은 설정을 쓰는 **대조군 파일**까지 있다. 다른 묶음을 표본 조사했을
   때는 이 정도로 기계적인 근거가 나오지 않았다(그쪽은 대부분 「테스트가 왜 그 모양으로
   단언하는지」라 README의 명시적 유지 대상이다).

## 제거 — 12줄

### ① `ECON_LLM_*` env 주석 4줄 × 2파일 = 8줄 (「다른 파일 주석의 재진술」)

`analyze-job-agg.yaml`·`analyze-job-agg-skew.yaml`에서 제거. 블록은 이것이다.

```yaml
# 더블의 응답 묶음을 고르는 이름. 실 모델 이름 자리다.
- name: ECON_LLM_MODEL
# 운영에서는 external-secrets가 넣는 `econ-llm` Secret에서 온다. 더블은 키를 보지
# 않지만 CLI가 미설정을 operator error(exit 2)로 끊으므로 값이 있어야 한다.
# 비밀이 아닌 고정 문자열이며, 실 엔드포인트에는 쓰이지 않는다.
- name: ECON_LLM_API_KEY
```

세 파일(`analyze-job.yaml` · `analyze-job-agg.yaml` · `analyze-job-agg-skew.yaml`)에 **바이트
동일**하게 들어 있었다. README의 제거 유형 「같은 설명이 양쪽 머리에 있는 경우, 설명의
주인에만 둔다」 그대로다.

**주인은 주석 자신이 지목한다.** `analyze-job-agg.yaml` 머리가 「계약은 `analyze-job.yaml` 과
같다(같은 배치 이미지 · `econ-analysis` 커맨드 · ECON_LLM_* 환경). 바뀌는 것은 데이터 루트와
응답 묶음 이름뿐이다」라고 적고, `analyze-job-agg-skew.yaml` 머리가 「기준
상태(`analyze-job-agg.yaml`)와 모든 설정이 같고 루트만 다르다」로 그 지목을 잇는다. 체인이
`analyze-job.yaml`에서 끝나므로 거기 한 벌만 남긴다.

**대조군(레포 자신이 이미 보여주는 것):** `analyze-job-v2.yaml`은 같은 두 env를 같은
값(`ECON_LLM_MODEL: e2e-llm-v2` · `ECON_LLM_API_KEY: e2e-double-not-a-secret`)으로 쓰면서 이
주석을 **달지 않는다**. 주석 없이도 그 파일이 읽히고 있었다는 뜻이다 — 「주인에만 둔다」가
이 디렉터리에서 이미 통하는 규약이라는 실물 증거다.

### ② `aggregate-job.yaml` 머리의 과거형 프레이밍 2줄 (「작업 흔적」)

```
# 집계 배치 한 번 — 메달리온 3단(수집 → 분석 → **집계**)의 마지막 단계이고, 이 Job 이 서면서
# `python/packages/aggregation` 이 e2e 에서 처음으로 실제 실행된다. 그 전까지 서빙은 손으로 쓴
# 픽스처 Gold 를 입력으로 썼으므로 정규화·교차 집계·분위기 비율 로직은 한 번도 돌지 않았다.
```
→
```
# 집계 배치 한 번 — 메달리온 3단(수집 → 분석 → **집계**)의 마지막 단계다.
```

「이것이 서기 전까지 X는 한 번도 일어나지 않았다」는 **변경 이력**이고 복원 경로 ④(커밋
메시지)의 정의 그 자체다. 같은 유형·같은 문장 구조를 aggregation-harness-pass가
`deploy/batch/workflow-template.yaml`에서 이미 지웠다 — 「Until this template existed … no
scheduled path ever produced Gold and serving fell back to empty datasets」. 그 판정은 이것을
initial-pass가 같은 파일 머리에서 지운 표현의 **과거형 재발**이라고 적었는데, 여기서 세 번째로
같은 형태가 나온 것이다.

남긴 첫 절(메달리온 3단의 마지막 단계)은 이 Job이 파이프라인 어디에 서는지라 이력이 아니다.

### ③ 데이터 루트 열거 1줄 × 2파일 = 2줄 (문면 정정)

`ingest-job-agg.yaml`·`ingest-job-analysis.yaml`에서 각각 3줄 → 2줄.

```
# 데이터 루트를 `/data/aggregation` 으로 가른다 — 정상 주기(`/data`) · 고장 주입(`/data/faults`) ·
# 3주기(`/data/cycles`) · 분석(`/data/analysis`) 과 같은 관례다. 한 루트를 공유하면 앞선 묶음의
# 소스별·건수 단정이 이 묶음의 열 건에 오염된다.
```
→
```
# 데이터 루트를 `/data/aggregation` 으로 가른다 — 묶음마다 자기 루트를 갖는 것이 이 하네스의
# 관례다. 한 루트를 공유하면 앞선 묶음의 소스별·건수 단정이 이 묶음의 수집분에 오염된다.
```

**근거는 둘이다.**

- **복원 가능(경로 ①)** — 루트 목록은 `git grep -A1 'name: ECON_DATA_ROOT' tests/e2e/k8s/batch`가
  그대로 복원한다.
- **이미 낡아 있었다** — 이 디렉터리의 루트는 실측 **여섯 개**다: `/data` · `/data/faults` ·
  `/data/cycles` · `/data/analysis` · `/data/aggregation` · `/data/aggregation-skew`.
  `ingest-job-agg.yaml`의 줄은 **넷**만 적어 `/data/aggregation-skew`를 빠뜨리고,
  `ingest-job-analysis.yaml`의 줄은 **셋**만 적어 두 집계 루트를 빠뜨린다. 두 줄 모두 자기
  파일이 속한 묶음이 늘어난 뒤로 조용히 거짓이 된 상태였다.

README가 가드 항에서 못박은 「같은 이유로 **개수·열거·행 위치**도 담지 않는다 — 파일이 자라면
그 표현이 조용히 거짓이 되고, 아무도 검증하지 않으므로 거짓인 채로 남는다」가 가리키는
바로 그 실패다. 여기서는 가드가 아니라 설계 설명이지만 실패 방식이 동일하고, 실제로 낡았다는
것이 관측됐다.

**삭제가 아니라 정정인 이유**: 뒤 절(「한 루트를 공유하면 앞선 묶음의 단정이 오염된다」)은 왜
루트를 가르는지를 설명하는 복원 불가능한 지식이다. 줄 삭제로는 근거까지 잘린다 —
`deploy/base/kustomization.yaml`(pin-guard-pass)과 `web/src/screens/Trend.tsx`
(product-surface-pass)의 문면 정정 선례를 따랐다. 같은 이유로 「열 건」·「아홉 건」이라는 건수
표현도 「수집분」으로 바꿨다(픽스처가 복원하고 픽스처가 자라면 틀려진다).

## 유지 — 137줄

배치 하네스 주석의 대부분은 README가 **명시적으로 유지 대상**으로 든 「픽스처가 실환경과
갈리는 지점」과 「클러스터·런타임 제약」이다. 대표적으로:

- `data-pvc.yaml` — Job 컨테이너는 종료하면 파일시스템째 사라져 emptyDir로는 산출물을 꺼낼 수
  없다는 것, RWO가 **노드 단위**라 같은 노드의 반출 Pod와 동시 마운트가 성립한다는 것.
- `ingest-job-cycle1.yaml` — 세 주기를 Job 하나로 합치지 않는 이유(컨테이너 command를 쉘 루프로
  바꾸면 e2e가 검증하는 것이 제품 계약이 아니게 된다), 순차 실행이 필수인 이유
  (`LakeStore.write_records`가 주기마다 덮어써 동시 실행이면 마지막 내용이 비결정적).
- `ingest-job-faults.yaml` — `--fetch-timeout 1`이 더블의 `/__slow__/5/` 지연보다 **짧아야**
  타임아웃 경로를 실제로 밟는다는 값 근거, 그리고 이 Job은 **성공하는 것이 기대값**이라는
  판독 지침(실패한 소스는 중단이 아니라 `failed_sources`로 기록되는 것이 제품 동작).
- `llm-double.yaml` — readiness를 **픽스처 로드까지** 확인하지 않으면 포트만 열린 상태로 Ready가
  돼 분석 Job이 응답 표 없이 출발해 전건 실패한다는 함정.
- `analyze-job-agg.yaml` — 응답 묶음을 분석 묶음과 가르는 이유(기사 집합이 겹치지 않아 한 묶음에
  섞으면 한쪽 기사를 지울 때 다른 쪽이 조용히 404로 무너진다).
- `aggregate-job.yaml` — 상류 더블이 필요 없어 이 Job에는 mock-exception 주석이 붙지 않는다는
  사실. **부재의 근거는 코드가 복원하지 못한다** — 없는 것을 보고 이유를 알 방법이 없다.

포인터 형태 2건(`ingest-job-cycle2.yaml`·`ingest-job-cycle3.yaml`의 「배선 설명은
ingest-job-cycle1.yaml 의 머리 주석에 있다」)도 유지했다. 이것은 재진술이 아니라 제거 유형
「다른 파일 주석의 재진술」의 **올바른 해소 형태**다 — 설명을 주인에 두고 나머지는 가리킨다.

## 판단이 갈려 남긴 것

**`ingest-job.yaml` 머리 6줄.**

```
# 한 주기의 수집 배치. 운영에서 이 CLI를 도는 것은 Argo CronWorkflow가 참조하는
# deploy/batch/workflow-template.yaml 의 `ingest` 템플릿이고, 여기서는 그 컨테이너 계약
# (같은 배치 이미지 · `econ-ingestion` 커맨드 · ECON_DATA_ROOT=/data)을 그대로 옮긴 평범한
# Job으로 돈다. e2e kind 클러스터에는 Argo 컨트롤러가 없기 때문이다 — 그래서 스케줄링
# 자체(`…-test-ingestion.md#시나리오 1`)는 여전히 예외 등재 상태이고, 이 Job이 관측하게
# 하는 것은 스케줄이 아니라 **한 주기가 무엇을 수집해 Bronze에 남기는가**다.
```

제거 쪽 근거: 괄호 안의 계약 열거(`같은 배치 이미지 · econ-ingestion 커맨드 ·
ECON_DATA_ROOT=/data`)는 두 파일을 나란히 읽으면 복원되고(경로 ①), 「시나리오 1이 예외
등재 상태」는 doc-tracker가 복원한다(경로 ②). 위 ③에서 제거한 열거와 같은 형태이기도 하다.

유지한 이유: 같은 문장이 「e2e kind 클러스터에는 Argo 컨트롤러가 없기 때문이다」라는 클러스터
제약과 「그래서 이 Job이 관측하는 것은 스케줄이 아니다」라는 **관측 경계**로 한 덩어리로
이어진다. 줄 단위로 끊으면 근거까지 잘리고, 절 단위로 정정하려면 문장 구조를 다시 짜야 하는데
그 재작성이 얻는 것(2줄 안팎)보다 잃을 위험이 크다. 「애매하면 남긴다」를 적용했다.
이 블록은 agg·analysis·faults가 「컨테이너 계약은 ingest-job.yaml 과 같다」로 가리키는
**주인**이기도 해서, 지우면 세 파일의 포인터가 빈 곳을 가리키게 된다.

다음 패스가 이 디렉터리를 다시 볼 일이 있으면(새 Job이 늘어 계약 설명이 또 복제되면) 이 블록을
먼저 본다.

## 범위 밖 — 후속

원장 행이 없는 파일이 **24개 / 515줄** 남는다. 전부 e2e 하네스 축이다.

| 묶음 | 파일 | 줄 |
|---|---:|---:|
| `tests/e2e/specs` | 16 | 324 |
| `tests/e2e/lib` | 6 | 167 |
| `tests/e2e/fixtures/{feeds,llm}/server.py` | 2 | 24 |

표본 조사 결과 `tests/e2e/specs`는 머리 주석이 대개 시나리오 본문 인용 + **그 인용에 따른 단언
설계**의 한 덩어리라, `ac3-6`~`ac3-8`이 initial 이후 받은 판정(「AC 검증 방법 인용과 그에 따른
단언 설계」는 유지)과 같은 결론으로 기울 가능성이 높다. 그래도 **판정한 적이 없으면 행이 없고,
행이 없으면 판정된 적이 없다**는 것이 이 원장의 규약이므로, 결론이 「전량 유지」여도 패스를
돌려 행을 남겨야 한다.

## 검증

- 지문 재실행: `lines=1857 files=111` → `lines=1845 files=111`. 제거 12줄이 정확히 반영됐고
  파일 수는 불변이다(주석이 0이 되는 파일 없음).
- 배치 매니페스트 19개 전부 YAML 파싱 OK(주석만 건드렸으므로 구조 무변경).
- 로컬 게이트 3종 rc=0: `scripts/check-journey-mockup.py` · `scripts/check-mockup-render.py` ·
  `tests/e2e/check_scenario_mapping.py`.
- 이 축에는 CI 게이트가 없다(`git grep -l comment-policy -- scripts Makefile .github tests`가
  공집합). 원장의 수치를 지키는 것은 패스 절차뿐이므로, 머지 직전에 지문을 다시 재고 위
  숫자와 맞는지 확인한다.
