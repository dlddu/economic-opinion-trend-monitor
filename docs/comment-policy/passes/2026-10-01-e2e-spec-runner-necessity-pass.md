# 2026-10-01 e2e-spec-runner-necessity-pass — 남은 e2e spec 14 · 러너·하네스 설정 8 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261001-0003`.

## 판정 범위

L·D·E 표의 `—` 행 중 `tests/e2e/` 의 남은 덩어리를 예산 400줄 안에서 묶었다: spec 14파일
(`ac3-6`·`ac3-7`·`ac3-8`·`analysis-5`·`analysis-6`·`ingestion-2..7`·`pipeline-ops-1..3`)과 러너·하네스
설정 8파일(`run.sh`·`playwright-setup.sh`·`playwright.config.ts`·`kind-config.yaml`·`k8s/e2e-patch.yaml`·
`k8s/kustomization.yaml`·`check_scenario_mapping.py`·`tools/timeshift_bronze.py`). 각 파일이 한 덩어리다.
**판정 전 398줄(L 333 · D 56 · E 9) → 288줄(L 227 · D 53 · E 8), 제거 110.** 다음 덩어리
(`tests/e2e/fixtures/llm/server.py` L·D·E 39줄)는 예산을 넘어 뺐다.

직전 패스(e2e-harness-necessity-pass)가 세운 정본 — `lib/llmdouble.ts`·`lib/feeds.ts` 머리(기대값을 픽스처에서
유도하는 이유), `lib/ingestlog.ts` 머리(로그로 집계를 읽는 이유), `lib/gold.ts: CELL_SEP` — 을 기준으로 spec
머리의 사본을 걷었다.

| 파일 (`tests/e2e/` 기준) | 판정 전 | 뒤 | 제거 |
|---|---:|---:|---:|
| `specs/ac3-6-sentiment-ratio-viz.spec.ts` | 21 | 17 | 4 |
| `specs/ac3-7-three-axis-compare.spec.ts` | 36 | 15 | 21 |
| `specs/ac3-8-normalized-ratio.spec.ts` | 31 (+E 1) | 11 | 21 |
| `specs/analysis-5-low-confidence-separation.spec.ts` | 37 | 27 | 10 |
| `specs/analysis-6-traceability-reanalysis.spec.ts` | 15 | 12 | 3 |
| `specs/ingestion-2-top-n-cap.spec.ts` | 8 (+E 2) | 4 (+E 2) | 4 |
| `specs/ingestion-3-axis-tagging.spec.ts` | 7 | 4 | 3 |
| `specs/ingestion-4-link-and-body.spec.ts` | 9 (+E 2) | 8 (+E 2) | 1 |
| `specs/ingestion-5-metadata-completeness.spec.ts` | 7 | 6 | 1 |
| `specs/ingestion-6-failure-isolation.spec.ts` | 18 (+E 1) | 5 (+E 1) | 13 |
| `specs/ingestion-7-body-dedup-versioning.spec.ts` | 13 (+E 1) | 9 (+E 1) | 4 |
| `specs/pipeline-ops-1-run-stage-records.spec.ts` | 21 | 20 | 1 |
| `specs/pipeline-ops-2-llm-call-records.spec.ts` | 7 | 7 | 0 |
| `specs/pipeline-ops-3-record-run-call-links.spec.ts` | 17 | 16 | 1 |
| `run.sh` | 46 (+E 2) | 30 (+E 2) | 16 |
| `playwright-setup.sh` | 7 | 6 | 1 |
| `playwright.config.ts` | 2 | 2 | 0 |
| `kind-config.yaml` | 2 | 2 | 0 (고침) |
| `k8s/e2e-patch.yaml` | 10 | 8 | 2 |
| `k8s/kustomization.yaml` | 2 | 2 | 0 |
| `check_scenario_mapping.py` | 7 (+D 33) | 6 (+D 30) | 4 |
| `tools/timeshift_bronze.py` | 10 (+D 23) | 10 (+D 23) | 0 |

`ac3-8` 의 E 표 행은 줄 끝 주석이 0줄이 되어 지웠다. 코드 변경 0 — 주석 줄·docstring·줄 끝 주석을 걷은
나머지가 base 와 줄 단위로 같다(`ac3-8` 의 타입 두 줄은 위치가 그대로이고 그 위 doc 만 함수 위로 옮겼다).

## 제거 목록

| 파일 | 제거한 주석 | 유형 |
|---|---|---|
| `ac3-7` · `ac3-8` | 머리의 `AC3.x "…" — docs/…prd…` 배너와 「검증 방법(AC 본문)」 인용 | 작업 흔적(AC 배너) · 문서 재진술 |
| 같은 둘 | 머리의 단언 목록(`1)`~`3)` · `1)`~`4)`) | 테스트 이름 재진술 — 단, `ac3-7` 의 「기준이 화면에 없으면 주장일 뿐」은 그 단언 위로, `ac3-8` 의 「대시보드는 원시 건수를 행마다 적지 않는다」는 머리 한 문단으로 남겼다 |
| `ac3-7` | 「기대값은 상수로 박지 않는다(ac3-6·ac3-8이 세운 관례) …」 | 다른 주석의 재진술 — 주인 `ac3-6` 머리 |
| `ac3-8` | 「기대값은 전부 서빙 응답에서 끌어온다」 · `topRow` doc 의 「응답이 정한다」 문단 | 같음 |
| `ac3-6` · `ac3-7` · `ac3-8` | 번호 단언 머리 `(1)`·`(2)`·`(3)`·`(3a)`·`(3b)` 와 「각 컬럼이 일치한다」 | 바로 아래 단언·메시지 재진술 |
| `ac3-6` · `ac3-7` · `ingestion-4` · `ingestion-7` | 비공개 함수 doc(`renderedWidth`·`krDistribution`·`barWidth`·`providedBodies`·`providedBody`·`itemAt`) | 이름·타입 재진술 |
| `ac3-8` | E 「원시 건수 — 비율이 아니다」 | `topRow` doc 의 재진술 |
| `analysis-5` | `AMBIGUOUS`·`LOW_CONFIDENCE` doc | 아래 선확인 단언(`analyzable` · `< 0.6`) 재진술 |
| 같은 파일 | 강제 채움 · 「버리는 것이 아니라 표시」 · ⑴⑵ · 「셀 대상이 0개다」 · 「분석분 대비 값이고 …」 | 단언·테스트 이름 재진술 |
| 같은 파일 | 「구분자를 손으로 다시 쓰지 않고 `CELL_SEP` … 한 번 깨졌다(`ci / e2e` 실측 …)」 | 경위 — 금지는 주인 `gold.ts: CELL_SEP` doc 이 말한다 |
| `analysis-6` | 「갱신이지 추가가 아니다」 · 재판정 기사를 픽스처에서 정하는 이유 | 테스트 이름 재진술 · 주인 `llmdouble.ts` 머리 |
| `ingestion-2` · `ingestion-3` | 머리의 상한·제공분 / 축 매핑을 설정에서 유도하는 문단 | 다른 주석의 재진술 — 주인 `feeds.ts` 머리 |
| `ingestion-5` | 머리의 필드별 열거 | 테스트 이름 재진술(3줄 → 2줄 개작) |
| `ingestion-6` | 머리의 기대 결과 네 절 대응표 · 「로그와 레코드를 함께 본다」 | 테스트 이름 재진술 · 주인 `ingestlog.ts` 머리 |
| 같은 파일 | `REACHABLE` 의 「격리된 둘을 뺀」 · `providedUrls` 의 유도 원칙 · 코드·단언 재진술 2 | 개수 · 주인 `feeds.ts` · 코드 재진술 |
| `ingestion-7` | 「주기 1 이 … 새로 쓰지 않는다」 · 「보존이 요점이다」 | 단언·테스트 이름 재진술 |
| `pipeline-ops-1` · `pipeline-ops-3` | 「수집은 이 실행에서도 성공했다」 · 「재사용은 전송하지 않는다」 | 단언 재진술 |
| `run.sh` | 단계 표지 `0)`·`1)`·`2)`(2줄)·`3)`·`4)`/`4a)`·`4b)`·`4c)`·`4d)`·`4e)`(×2, 하나는 2줄)·`4f)`·`4g)`·`5)` | 코드·체인 함수 이름 재진술. 번호가 이미 틀려 있었다(`4e)`·`4f)` 가 두 번씩) — 열거는 조용히 낡는다는 사례. 체인↔시나리오 대응은 spec 의 `// 검증 시나리오:` 와 `lib/*` 의 `E2E_*_DIR` 이 진다 |
| `playwright-setup.sh` | `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 skips …` | 바로 아래 분기 재진술 |
| `k8s/e2e-patch.yaml` | 「Serving reads the batch's own output on the shared claim (…)」 | 바로 아래 `claimName` 재진술 |
| `check_scenario_mapping.py` | `SCENARIO_REF` 위 형식 설명 | 정규식 재진술 |

## 틀린 주석 고침

- `ac3-8` — `topRow` 를 설명하는 doc(「1위 행을 고르는 이유」)이 `type RankRow` 위에 붙어 있었다. 함수 위로 옮겼다.
- `kind-config.yaml` — 「다중 노드가 필요 없으니 기동을 싸게」는 단일 노드가 **필수**라는 사실을 빠뜨렸다:
  서빙과 배치 Pod 가 ReadWriteOnce 클레임 하나를 함께 마운트하고, 그것은 한 노드에서만 된다
  (`k8s/e2e-patch.yaml`). 「싸게」만 보고 노드를 늘리면 서빙 Pod 가 볼륨을 못 붙인다. 가드로 고쳤다.
- `check_scenario_mapping.py` 모듈 docstring — 「21개 시나리오 중 다수가 배치 3단 하네스를 선행으로 요구하므로
  공백은 존재하는 것이 정상」은 현재(시나리오 24 · 공백 0 — 검사기 자기 출력)와 어긋난다. 그 문장을 지우고
  「공백 0 을 강제하지 않는다 · 문서가 격차를 정직하게 말하는지만 본다」만 남겼다.
- `check_scenario_mapping.py: marked_block` — 「(AC 축 시절 실제로 한 번 그렇게 통과했다)」(경위)를 지웠다.
- `analysis-5` — 저신뢰 경계 문단의 「이 루프(산출물은 e2e 와 등재 문서뿐)의 몫이 아니다」는 reconciler 작업 범위
  이야기(작업 흔적)라, 「집계에서도 가르려면 Gold 계약(`contracts/`)부터 바뀌어야 한다」로 고쳤다.
- `ac3-6` · `ac3-7` · `ac3-8` 의 「단언하지 않는 것」 — 축 이관(AC → 시나리오) 뒤 남은 `AC3.x` 꼬리표를 빼고,
  `ac3-6` 은 그 층을 보는 spec(`aggregation-4` · `analysis-5`)을 지목했다.
- `ingestion-4` — 픽스처 설명의 「본문 요소가 없는 항목 3건」에서 개수를 뺐다.
- `run.sh` — 「4f 의 롤업 체인」은 지운 표지를 가리키므로 「롤업 체인」으로, 「Baseline aggregation, then 4f) the
  rollup root … — it must follow it」은 이유(롤업 루트가 기준 루트의 코퍼스를 다시 찍는다 —
  `k8s/batch/timeshift-job.yaml` 이 `/data/aggregation` 을 읽는다)를 단 순서 가드로 고쳤다.

## 유지 목록 (필요 사유)

### `tests/e2e/specs/`

- `// 검증 시나리오:` — 기계가 읽는 주석(시험 면제, 지문 제외).
- 사전 조건 선확인(픽스처가 절단·한계·본문 확보/미확보·중복·수정·세 축·네 갈래·두 갈래·재사용·버전 병존 상황을
  실제로 만드는지, 축별 최대 상이, 재판정 1건 이상) — 없으면 단정이 공허하게 통과한다는 이유를 모르고
  「불필요한 단언」으로 지운다.
- 단언의 모양 근거(축 기준 합 · 축 경계를 구분자까지 끊기 · 0 분자 건너뛰기 · 공통 스케일 폭 공식 · 비례 비교 ·
  미분석이 스케일 밖 · 두 기준 대조 · 관계 대 리터럴 · 정확 등식이 성립하는 조건 · 수집만 한 실행까지 말하는 등식)
  — 숫자·순서가 어디서 왔는지 없으면 단언을 고칠 때 검산할 수 없다.
- 「단언하지 않는 것」(`ac3-6`·`ac3-7`·`ac3-8`·`ingestion-2`·`ingestion-3`·`analysis-5` 의 저신뢰 경계) — 이 층에
  다른 층의 단언을 더하는 것을 막는다.
- 하네스가 상태를 만드는 방법(`analysis-5` 두 경로 분리 · `analysis-6` 로직 변경과 반출 스냅샷 · `ingestion-7`
  세 사전 조건과 주기별 스냅샷 · `ingestion-6` `/__flaky__/2/` · `pipeline-ops-1` `/__fail__/`·빈 레이크·사전 조건
  기계 확인) — 픽스처·러너를 고칠 때 무엇이 깨지는지 알려 준다.
- 추적·관측 근거(`analysis-6` 링크·본문 해시·분석 시각 · `ingestion-6` 격리·타임아웃 관측 · `ingestion-7` 관측 수
  불변 · `pipeline-ops-1` `running` 금지·격리 ≠ 중단·통 밖 실패·부재 관측 · `pipeline-ops-3` 같은 실행 호출·행
  복제 판별·같은 원문) — 단언이 무엇을 증명하는지가 이름만으로는 드러나지 않는다.
- 두 자리가 같아야 하는 곳 — `pipeline-ops-2` 의 `promptDigest` ↔ 제품 `econ_core.calllog.prompt_digest` ·
  `pipeline-ops-3` 의 미호출 사유 목록 ↔ 계약 doc.
- DOM·화면 근거 — `ac3-6` `.sent-na` 첫 `<b>` · `ac3-7` 플레이스홀더 부재 · `ac3-8` 웹 번들 서빙 선확인 · 토글이
  실제로 바뀌어야 하는 이유 · 대시보드가 원시 건수를 행마다 적지 않는 목업 근거.
- 픽스처 출처 지목(`agg_kr_wire.rss.xml` · `global_desk.rss.xml` · `cycle12_main`/`cycle3_main` · `e2e-feeds-agg.json`)
  — 기대값의 근거 파일. `pipeline-ops-1` 의 반출본을 테스트 안에서 읽는 이유(모듈 최상위에서 읽으면 `--list` 가 끊긴다).

### 러너 · 하네스 설정

- `run.sh` — 아무것도 설치하지 않는다(부재 단정) · bash 3.2 제약 2(빈 배열 · 연관 배열 없음) · 분할 데이터셋 반출 ·
  LLM ConfigMap 을 apply 전에 만드는 이유 · 롤업 스크립트 ConfigMap 선행 · 배치 리소스를 먼저 apply 하는 이유 ·
  체인은 루트마다 하나·남의 루트를 읽지 않는다 · 각 체인 가드의 근거(격리가 Bronze 를 조용히 줄인다 · 실패 2 가 기대
  상태 · `reused=1` 하중 · 실패 갈래는 마지막 주기 · `failed=1` · `coexisting` 은 제품 낱말 · 빈 Gold 는 배선 실패) ·
  롤업 루트 순서 · `shellcheck` 지시자의 사유(E).
- `playwright-setup.sh` — 설치 계약 요약(Chromium 빌드가 lockfile 에 묶인다) · `--with-deps` 가 `CI=true` 에서만 붙는
  이유 · 로컬 처방.
- `playwright.config.ts` — 폴백 포트가 `run.sh` 의 `E2E_PORT` 기본값과 같아야 한다.
- `kind-config.yaml`(고침) · `k8s/e2e-patch.yaml` — 단일 노드 RWO 동시 마운트 · 가산 유지 가드 · read-only 마운트와
  runc mountpoint 함정.
- `k8s/kustomization.yaml` — base 를 복제하지 않고 오버레이해야 배포 base 가 CI 에서 검증된다.
- `check_scenario_mapping.py` — 모듈 요약 · 판정 단위와 AC 를 보지 않는 이유 · 규칙 1~7(위반 메시지가 이 번호를 쓴다) ·
  공백 0 을 강제하지 않는 이유 · 마커 블록 근거 · 해제 신호 표기 · 첫 열만 읽는 이유 · 등재된 공백을 쓰는 이유 ·
  public 함수 요약 1줄.
- `tools/timeshift_bronze.py` — 수집 CLI 가 `collected_at` 을 실행 시각으로 찍는다는 사실 · 건드리지 않는 것 넷 ·
  상수 달력 근거 · `specs/` 밖 위치 가드 · 슬롯의 ISO 주 귀속과 최소 달력 · `+00:00` 고정 · public 함수 요약 1줄.
