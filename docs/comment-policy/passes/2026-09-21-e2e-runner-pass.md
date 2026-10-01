# e2e-runner-pass — `tests/e2e/run.sh` 한 파일 재판정

**표적 판정이다(전수 아님).** 기준 커밋 `60a8176`. 추적 task는 `rct_20260921-0002`
(모델 `tbm_econ-opinion-monitor-comment-necessity`).
판정 대상은 **1파일 / 96줄** — 직전 패스(web-api-view-pass)가 「다음 패스의 1순위」로 이름 붙인
`tests/e2e/run.sh`(원장 행 남음 12 → 실측 96, **+84** — ⑵ 잔여 315줄의 27%)다.

판정 결과 요약: **제거 71줄 · 문면 정정 1곳(머리 lede 3줄 → 2줄, 정정분은 제거 71 안에 포함) · 유지 25줄.**
레포 전체 지문은 `2428 → 2357`(파일 `122 → 122` — 남음 25 라 지문에 그대로 남는다),
파일별 원장 행은 `126 → 126`(행 신설 없음, `run.sh` 행 갱신 + `deploy/overlays/prod/pvc.yaml` 행에 파일 소멸 주기).

> 이 패스 뒤 ⑴(행이 없는 파일)은 여전히 **0** 이고, 잔여 ⑵ 는 **20파일 231줄**이다(아래 「판정하지 않은 것」).

## 무엇을 판정했나

| 파일 | 원장 상태 | 주석 | 판정 |
|---|---|---:|---|
| `tests/e2e/run.sh` | 행 있음(initial-pass, 남음 12) · 판정 이후 **+84 자람** | 96 | **제거 71줄** · 25 유지(그중 5줄은 판단 분기 — 아래) |

주석 수는 정책의 추출 규칙(줄머리 `#`, shebang·`mock-exception:` 3줄 제외)으로 센 값이다. `mock-exception:`
세 줄(GOLD-01·FEED-02·LLM-02)은 기계 판독 주석이라 **바이트 무접촉**이다 — 자매 모델
`tbm_econ-opinion-monitor-e2e-mock-policy` 의 지문이 그 줄을 센다.

### 왜 이 파일 하나인가 — 슬라이스의 판별식

감지 단계는 잔여 ⑵ 21파일 315줄을 **복원처 묶음**으로 세 순위로 갈랐다 — 1순위 `run.sh`(+84, 복원처: 테스트
문서 셋 · e2e 모킹 정책 · README) · 2순위 `Trend.tsx`/`Trend.test.tsx`/`tokens.css`(+86, 복원처: 목업
`JRN-axis-contrast.html` · 설계 트래커 · PR #91 본문) · 3순위 `check-journey-mockup.py`(+23). 직전 패스
(web-api-view-pass)의 판별식 「복원처의 묶음이 같은 것끼리」를 승계해 1순위만 집었다.

다만 실제로 조사해 보니 `run.sh` 의 복원처는 감지가 예상한 문서 셋이 **주가 아니다** — 84줄 증분의 주인은
**`tests/e2e/k8s/batch/` 매니페스트 머리 주석**(batch-harness-pass · unrowed-files-pass 가 「전량 유지」 판정한
설명의 주인)과 **`tests/e2e/lib/ingestlog.ts` · `tests/e2e/tools/timeshift_bronze.py` 머리말**이었고, 그 다음이
그 줄을 들인 **PR #39·#44·#50·#65 본문**이다. 테스트 문서는 `…#시나리오 N` 포인터의 목적지일 뿐 문장을 되풀이하지
않는다. 즉 제거 유형은 「README 재진술」이 아니라 대부분 **「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」**(경로
①)와 **PR 본문 축자**(경로 ③)다. 계획 시점 열린 PR 은 #75 하나(`.github/`·`README.md`·`scripts/`)라 파일 겹침 0.

## 제거 — 복원 경로별 근거

### ⑴ 머리의 네 경로 목차 (2~29행, 28줄 → lede 2줄 + 빈 `#` 1줄, **−25**)

#31·#39·#44·#50·#65 가 하네스를 넓힐 때마다 머리 문단을 한 항목씩 늘려 「serving / ingestion batch / analysis
batch / aggregation batch」 네 경로가 각각 4~10줄로 서술돼 있었다. 그 내용은 **이 파일 자신**이 두 번 더 말한다 —
단계 표지 `1)`~`5)`·`4b)`~`4f)` 와 그 아래 코드, 그리고 말미 배너 여섯 줄(`[e2e] OK: feed double -> in-cluster
ingestion batch -> Bronze` …)이 같은 목록을 실행 순서대로 찍는다(경로 ①). scenario-spec-pass 가 이미 이 자리를
「복원 유형 ②를 담고 스스로 복원처를 지목한다(“that pair is what scenario 1 of the aggregation-viz doc
compares”)」로 이름 붙여 두었다. 각 항목의 근거 문장은 아래 ⑵~⑹ 의 복원처와 같다.

lede 는 initial-pass 가 유지한 3줄(「kind-based e2e for the serving path: …」)을 승계해 **2줄로 정정**했다 — 네 경로를
열거하지 않고 「서빙 스택 + 수집·분석·집계 배치, 한 kind 클러스터, 끝에 Playwright」만 말한다. 이 2줄은 README
「빠른 시작」의 `make e2e` 한 줄 설명이 복원하나 그 줄이 낡아(「픽스처 Gold -> 클러스터 내 서빙 -> Playwright」 —
배치를 말하지 않는다) 「원본이 부실하면 원본을 고친다」가 걸리는 자리다. README 는 열린 PR #75 가 수정 중이고
문서 자체의 품질은 이 모델의 판정 표면이 아니므로 **README 는 손대지 않고** lede 를 판단 분기(유지)로 둔다.

### ⑵ `run_batch_job` · `export_lake` 머리와 PVC/셸 Pod 설명 (76~79 · 94~96 · 149~150행, **−9**)

| 지운 줄 | 복원처 |
|---|---|
| 「keep its log — the specs assert on the counts it prints (failed_sources, duplicates_skipped, bodies new/deduplicated; low_confidence, unanalyzed, model calls), so a lost log is a lost observation」 4줄 | `tests/e2e/lib/ingestlog.ts` 머리 「**왜 로그인가** — 걸러진 중복도 격리된 소스도 Bronze 에 남지 않는 사실이다 … CLI 는 그 구별을 집계로 찍으므로」(unrowed-files-pass 가 유지한 설명의 주인, 경로 ①) · PR #39 「왜 Job 로그까지 반출하는가」(경로 ③). 함수 본문 `logs "job/$job" > "$LOG_DIR/$job.log"` 가 무엇을 하는지는 코드 |
| 「Copy a dataset off the PVC through the shell Pod. The Job's own container is gone by now, so the claim is the only place the records still exist. The layer is a parameter because analysis writes Silver next to the Bronze」 3줄 | `k8s/batch/bronze-shell.yaml` 머리 「수집 Job이 PVC에 남긴 Bronze를 호스트로 꺼내기 위한 대기 Pod. run.sh가 여기에 `kubectl exec ... cat`」 · `data-pvc.yaml` 머리 「Job 컨테이너는 종료하면 파일시스템째 사라지므로」(batch-harness-pass 유지분, 경로 ①). layer 인자는 호출 자리 `export_lake /data/analysis silver …` 가 말한다 |
| 「Bronze lives on the Job's PVC; a Job's container is gone once it finishes, so every export below reads the claim through this shell Pod」 2줄 | 위와 같은 사실의 **세 번째 사본**(같은 파일 94~96행 + `data-pvc.yaml`·`bronze-shell.yaml`) |

### ⑶ 더블 선행·가드 설명 (134~137 · 157~158 · 205~208 · 216~217행, **−12**)

| 지운 줄 | 복원처 |
|---|---|
| 「The double has to answer before the Job starts — `econ-ingestion` isolates a source it cannot fetch instead of failing, so a Job that runs too early would "succeed" with an empty Bronze …」 4줄 | `k8s/batch/kustomization.yaml` 머리 「Job 은 여기 넣지 않는다 — **더블이 Ready 가 된 뒤에 적용해야 첫 요청이 헛돌지 않기 때문**」(batch-harness-pass 유지분, 경로 ①) + 같은 파일 155~156행(유지)의 격리→축소 문장. 한 근거의 사본 셋 중 둘 |
| 「This guard is for the *healthy* cycle only; the fault-injection cycle below expects a non-empty failed_sources and must not be held to it」 2줄 | PR #39 주의사항 「**`run.sh` 의 `failed_sources=[]` 가드는 정상 주기 전용**입니다. 고장 주입 주기는 그 반대(비어 있으면 실패)를 확인합니다」(경로 ③, 축자) + 바로 아래 4b 의 역방향 `case`(`*"failed_sources=[]"*) echo "[e2e] FAIL: the fault-injection cycle isolated no source …`)가 코드로 말한다(경로 ①) |
| 「A canned reply the double does not have is a 404, which the CLI degrades to one unanalyzed record and *counts*. Without this guard a stale fixture would quietly turn into "the model declined to judge" …」 4줄 | PR #44 「모르는 제목에는 기본값 대신 **404** 를 낸다 — 조용한 기본 응답이 있으면 픽스처가 낡아도 spec 이 초록으로 지나간다. 그 404 는 제품 경로에서 `failed` 카운트로 드러나고 `run.sh` 가 `failed=0` 가드로 잡는다」(경로 ③, 축자) · `k8s/batch/llm-double.yaml` readiness 주석 「포트만 열린 상태로 Ready 가 되면 분석 Job 이 응답 표 없이 출발해 전건 실패로 끝난다」 · 가드의 echo 문면 「the LLM double has no canned reply for some article (see fixtures/llm/responses.json)」(경로 ①) |
| 「Re-analysis replaces this dataset, so the first pass has to be taken off the PVC *now* — scenario 6 compares the two」 2줄 | `k8s/batch/analyze-job-v2.yaml` 머리 「데이터 루트는 **같다** — 재분석은 새 데이터셋을 만드는 것이 아니라 같은 Silver 를 갱신하는 것」(경로 ①) · PR #44 「1차 Silver 는 재분석 **전에** 반출한다(재분석은 교체지 추가가 아니다)」(경로 ③) |

### ⑷ 단계 표지에 붙은 서술 — 4b·4c·4d·4e·4f (167~169 · 180~183 · 191~193 · 231~242 · 287~295행, **−25**)

표지 자체(「4b) … (…-test-ingestion.md#시나리오 6).」 꼴, 시나리오 포인터 포함)는 initial-pass 의 「단계 번호 —
짧고 읽기 흐름을 돕는 정도」 판정을 승계해 **1줄(4e 는 2줄)로 남기고**, 뒤에 붙은 서술만 걷었다.

| 지운 서술 | 복원처 |
|---|---|
| 4b 「one more cycle against the same double, this time through its failure/flaky/slow paths. Writes to its own data root so the healthy cycle's Bronze … is untouched」 | `k8s/batch/ingest-job-faults.yaml` 머리(상류 = `/__fail__/`·`/__flaky__/`·`/__slow__/` · 데이터 루트 `/data/faults` 와 오염 근거 — batch-harness-pass 유지분) · `feed-double.yaml` 머리(고장 주입 경로) |
| 4c 「news_item is rewritten every cycle by the store, so the per-cycle snapshot has to be taken between runs — the final file only holds cycle 3. news_body accumulates …」 | `k8s/batch/ingest-job-cycle1.yaml` 머리 「그 데이터셋은 주기마다 **덮어쓰기**라 (`LakeStore.write_records`) … 본문 저장소(`news_body`)는 주기를 가로질러 누적되는 것이 관측 대상」 · PR #39 「왜 주기별 스냅샷인가」(축자) · `econ_core/storage.py` `merge_records` docstring(「re-merging an unchanged body is a no-op, while a new key (an edited body) appends」) · `…-test-ingestion.md#시나리오 7` 기대 결과 |
| 4d 「one more collection cycle builds the analysis corpus in its own lake root, then the real analysis CLI runs against the in-cluster chat-completions double and writes Silver beside it」 | `k8s/batch/ingest-job-analysis.yaml` 머리(「분석 묶음의 입력이 되는 한 주기 수집 … 데이터 루트를 `/data/analysis` 로 가른다」) · `analyze-job.yaml` 머리(실 분석기·`ECON_LLM_BASE_URL` 만 다름) · `llm-double.yaml` 머리 |
| 4e 「The third medallion stage: this is where `python/packages/aggregation` runs for the first time in e2e — until now serving was fed hand-written fixture Gold …」 + 코퍼스 설계(「two KR sources so the within-source-then-average normalization has something to average, one US source so the axis dimension actually crosses」) + 두 루트 근거(「`write_records` replaces a dataset, so a second pass in the same root would erase the baseline」) 10줄 | 모킹 정책 원장 R2(해소됨) 「집계 로직이 e2e 에서 **한 번도 실행되지 않는다**」·R3 · `aggregate-job.yaml` 머리(「메달리온 3단의 마지막 단계」) · `ingest-job-agg.yaml`/`ingest-job-agg-skew.yaml`/`aggregate-job-skew.yaml` 머리(루트 분리와 `write_records` 교체 근거 — 세 파일이 각자 든다) · PR #50 「KR 축에 소스 2개 — 정규화가 *소스 안에서 점유율을 낸 뒤 축 단위로 평균*하는 식이라 … US 축 1개 — 축이 하나면 교차 집계가 한 줄로 퇴화 … 한 루트에서 두 번 돌릴 수 없다 — `write_records` 가 데이터셋을 교체해 기준 상태가 사라진다」(축자) |
| 4f 「only `collected_at` re-stamped onto a fixed calendar … Collection stamps `collected_at` with the run clock (econ_ingestion/cli.py, regardless of --cycle), so every record of one Job lands in the same hour bucket — "a day is the sum of its hours" would be the sum of a single bucket … the aggregation being measured still runs for real … `write_records` replaces a dataset」 8줄 | `tests/e2e/tools/timeshift_bronze.py` 머리말(unrowed-files-pass 전량 유지 — 「수집 CLI 는 `collected_at` 을 **실행 시각**으로 찍으므로(`econ_ingestion/cli.py` — `--cycle` 과 무관) … "일 버킷 = 시간 버킷들의 합"이 버킷 **하나**의 합이 돼 … 피검체는 집계 CLI 그대로다」, 거의 축자) · `timeshift-job.yaml`·`aggregate-job-rollup.yaml` 머리(「루트를 가르는 이유는 다른 루트들과 같다: `write_records` 가 데이터셋을 교체하므로」) · PR #65 본문 |

## 유지 — 25줄

- **머리 7줄**(2~8행): lede 2줄(판단 분기 — 위 ⑴), 빈 `#`, 「Local `make e2e` and the CI e2e job both run exactly
  this script」·전제 도구·「never installs tools itself」·`KEEP_CLUSTER=1` 4줄 — initial-pass 유지분 승계(복원 경로가
  자라지 않았다. 도구 목록이 코드의 `for tool in …` 과 겹치는 것은 그때도 같았고 「애매 — 유지」였다).
- **단계 표지 11줄**: `1)`·`2)`·`3)`·`4)`·`4b)`·`4c)`·`4d)`·`4e)`(2줄)·`4f)`·`5)` — 시나리오 포인터를 든 1줄 표지.
  initial-pass 의 「단계 번호 — 비용이 작아 제거로 기울지 않는다」 승계. `1)` 의 「(no registry: kind load)」·`2)` 의
  「(e2e overlay of deploy/base)」 는 `tests/e2e/k8s/kustomization.yaml` 머리가 복원하지만 판정 시점부터 표지의 일부였다.
- **llm-fixtures 선행 2줄**(104~105행, 판단 분기): 「더블 Deployment 가 이 ConfigMap 을 마운트하므로 apply 전에 만들어
  둔다 — 없으면 Pod 가 볼륨을 못 붙여 영영 Ready 가 되지 않는다」. 첫 문장은 `mock-exception: LLM-02` 와
  `llm-double.yaml` 이 복원하나, ConfigMap 볼륨이 없는 Pod 가 ContainerCreating 에 영영 머문다는 **클러스터 제약**과
  그래서 생기는 순서 조건은 `k8s/batch/kustomization.yaml` 머리(「run.sh 가 만든다」까지만)에도 다른 어디에도 없다.
  「애매하면 남긴다」.
- **정상 주기 가드 2줄**(117~118행): 「A source the CLI cannot reach is isolated, not fatal — correct for production, but
  here it would quietly shrink Bronze and surface as a puzzling spec failure」 — 제품 동작(격리)은
  `ingest-job-faults.yaml` 머리가 주인이지만, **이 가드가 왜 여기 있는가**(축소된 Bronze 가 데이터 문제로 읽히는 것을
  막는다)는 「테스트가 왜 그 모양으로 단언하는지」 유형이고 PR 본문·문서 어디에도 같은 문장이 없다.
- **빈 Gold 가드 3줄**(200~202행): 「An empty Gold is a wiring failure, not a data story: the CLI exits 0 even when the
  join finds nothing …」 — 같은 유형. `timeshift_bronze.py` 머리말의 「조인이 끊기면 … spec 이 "집계가 틀렸다"로
  읽히는데 실제로는 이 스텝이 깨진 것」은 롤업 루트 이야기이고, 기준·부풀림 루트의 가드 근거는 여기뿐이다.

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| 머리 lede 2줄 | README 「빠른 시작」 `make e2e` 설명이 복원하나 낡아서(배치 미언급) 원본 수정이 걸리는데, README 는 열린 PR #75 가 만지고 문서 품질은 이 모델 밖 | 유지. README 의 그 줄이 배치까지 말하게 되면 다음 패스가 lede 를 다시 본다 |
| llm-fixtures 선행 2줄 | 첫 문장은 복원 가능, 둘째 문장(ConfigMap 볼륨 부재 → 영영 Ready 안 됨)은 클러스터 제약 | 유지 |
| 전제 도구 1줄(「Requires docker, kind, kubectl and node/npm」) | 코드의 `for tool in docker kind kubectl node npm curl` 이 복원하고 `curl` 이 빠져 낡았다 | initial-pass 유지 승계 — 이 패스는 증분(+84)을 닫는 패스라 판정 시점부터 있던 12줄의 재판정은 열지 않았다. 다음 표적 패스가 이 파일을 다시 볼 때 첫 후보 |

## 검증

- 비주석 코드 무변경: `diff <(git show 60a8176:tests/e2e/run.sh | grep -vE '^\s*#') <(grep -vE '^\s*#' tests/e2e/run.sh)` 공집합.
  `mock-exception:` 3줄 바이트 동일. `bash -n tests/e2e/run.sh` rc=0.
- 지문(모델 `asIs.versionScript` 그대로): `lines=2428 files=122` / `6f62db5a…` → **`lines=2357 files=122`** / `a1792b6b…`.
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수, 독립 파서): 기준 커밋에서 ⑴ 0 · ⑵ 21파일 315줄(감지 단계 값과 파일별
  일치) → 이 패스 뒤 ⑴ 0 · ⑵ **20파일 231줄**.
- e2e 자체는 호스트에 kind 가 없어 CI(`ci / e2e`)가 집행한다 — 주석만 바뀌었으므로 실행 경로는 동일하다.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **⑵ 잔여 231줄 / 20파일**: `web/src/screens/Trend.tsx` 47→89(+42) · `scripts/check-journey-mockup.py` 42→65(+23) ·
  `web/src/tokens/tokens.css` 38→61(+23) · `web/src/screens/Trend.test.tsx` 25→46(+21) · `web/src/screens/Dashboard.tsx`
  0→19 · `python/packages/aggregation/tests/test_aggregate.py` 1→19 · `web/src/screens/Sentiment.tsx` 54→71 ·
  `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` 48→61 · `tests/e2e/run.sh` **12→25(+13, 이 패스가
  유지한 증분 — 원장 행 갱신으로 다음 재계수에서는 0)** · `web/src/screens/Dashboard.test.tsx` 5→17 ·
  `web/src/screens/Sentiment.test.tsx` 21→31 · `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` 22→31 ·
  `econ_aggregation/aggregate.py` 11→15 · `econ_analysis/cli.py` 7→11 · `test_llm.py` 8→12 · `test_feeds.py` 21→24 ·
  `deploy/overlays/prod/kustomization.yaml` 20→23 · `deploy/batch/workflow-template.yaml` 42→44 ·
  `web/src/screens/Fairness.test.tsx` 16→18 · `web/src/screens/Compare.tsx` 10→11 · `test_cli.py` 5→6.
  **다음 패스의 선은 감지 단계의 2순위 묶음** — `Trend.tsx`·`Trend.test.tsx`·`tokens.css`(+86, 잔여의 37%): 복원처가
  목업 `JRN-axis-contrast.html#verdict-form`·`submitVerdict()`, 설계 트래커 `STP-verify-in-trend` 행, PR #91 본문으로
  하나의 묶음이다(#91 증분 26줄은 그 셋을 스스로 인용하는 문장).
- **`deploy/` 재판정 후보(잔여 계수 밖, 감지 단계 인계 ⓑ·ⓒ)**: `deploy/overlays/prod/batch-pvc.yaml` 은 행 남음 9 인데
  실측 7 — #92 가 옛 전제(RWO 분리) 6줄을 지우고 RWX/`efs` access point 근거 5줄을 새로 썼다(내용 교체, 재판정 행 필요).
  `deploy/overlays/prod/kustomization.yaml` 20→23 도 같은 커밋의 내용 교체. 둘의 새 문장은 README 「배포」·doc-tracker
  「운영 — 서빙 Gold 연결(#92)」 착지 행에 거의 축자이나, 트래커가 `∋` 좌표로 인용하는 두 문장은 지우면 트래커가
  끊기고 「클러스터 제약(efs access point uid/gid 고정)」은 유지 대상이다 — 복원처 묶음이 다르므로 이 패스는 손대지
  않았다. `deploy/overlays/prod/pvc.yaml` 은 #92 로 **파일 소멸** — 원장 행에 그 사실만 적었다(숫자 무변경).
- `Fairness.tsx` 118행 위 28줄 — 설계 트래커 `Fairness.tsx:110-118` 인용 자물쇠, 미발화(창 안 트래커 변경은 #91 의
  `STP-verify-in-trend` 행 1줄뿐).
- Python docstring 표면 — 모델 정의의 사각지대, tobe-modeler 몫.
