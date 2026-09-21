# reprocess-trigger-pass — #97 묶음 중 서빙→Argo 제출 경로의 백엔드 10파일 판정

**표적 패스다(전수 아님).** 기준 커밋 `f7e2338`(#97 squash = 판정 트리이자 main tip).
추적 task는 `rct_20260921-0005`(모델 `tbm_econ-opinion-monitor-comment-redundancy`).
겨눈 것은 **10파일 / 158줄** — 직전 패스(reprocess-surface-pass)가 「다음 패스의 선은 #97 묶음」이라고 이름 붙인 그 묶음 가운데
**서빙이 배치 Workflow 를 제출하는 경로의 백엔드**다: ⑴ 행이 없던 신설 4파일 82줄(`go/internal/argo/argo.go` 36 ·
`go/internal/handlers/reprocess_trigger.go` 29 · `go/internal/handlers/reprocess_trigger_test.go` 6 · `deploy/base/rbac.yaml` 11),
직전 패스가 「보류」한 `go/internal/handlers/reprocess.go` 머리(#97 이 갈아 쓴 12~31행 20줄, 파일 51), ⑵ 행이 있는 5파일에 #97 이
들인 증가분 42줄(`deploy/batch/workflow-template.yaml` +22 · `go/internal/handlers/handlers.go` +7 · `go/internal/store/store.go` +7 ·
`deploy/base/deployment.yaml` +2 · `go/cmd/serving/main.go` +2) + 그 두 파일에 앞서 자라 있던 보류·미판정 5줄(`handlers.go` #94 분 3 ·
`workflow-template.yaml` 의 온도 주석 2). 트리거 시점 잔여 362줄(⑴ 145 + ⑵ 217)의 34%.

**같은 #97 묶음의 나머지 — web 6파일 74줄과 python 5파일 24줄 — 는 판정하지 않았다**(아래 「판정하지 않은 것」). 백엔드를 먼저 자른
것은 이 묶음이 되풀이하는 이야기(「서빙은 레이크를 쓰지 않는다 · 제출은 WorkflowTemplate 에서 · `trigger.available` 은 프로브」)의
**설명의 주인을 먼저 정해야 사본 쪽(web) 판정이 서기** 때문이고, web 쪽은 #96 이 건 `Reprocess.tsx` 줄 번호 자물쇠 다섯의 재핀이
mockup-render 소유자 몫이라 그쪽 task 와 같은 파일을 만질 위험이 있어서다.

판정 결과 요약: **제거 47줄(argo.go 7 · reprocess_trigger.go 3 · reprocess.go 15 · handlers.go 5 · main.go 2 · rbac.yaml 8 ·
deployment.yaml 1 · workflow-template.yaml 6 · test/store 0) · 문면 정정 3곳(지문 −0) · 유지 111줄(그중 판단 분기 4자리).**
레포 전체 지문은 `2618 → 2571`(파일 `134 → 134`), 파일별 원장 행은 `129 → 133`(행 신설 4, 갱신 6).

> 이 패스 뒤 ⑴(행이 없는 파일)은 **5파일 63줄**(`ReprocessTrigger.tsx` 23 · `Reprocess.tsx` 28 · `test_silver.py` 7 · `storage.py` 3 ·
> `test_serving_version.py` 2), ⑵ 는 **20파일 172줄**, 그 밖에 **보류 1줄**(`types.ts` `trigger` JSDoc — 행의 「남음」 안). 셋 다 아래
> 「판정하지 않은 것」에 있다.

## 무엇을 판정했나

| 파일 | 원장 행 | 판정한 줄 | 결과 |
|---|---|---:|---|
| `go/internal/argo/argo.go` | 행 없음(#97 신설) | 36 | **제거 7** · 정정 1(`Kind` 값 열거) · 유지 29 |
| `go/internal/handlers/reprocess_trigger.go` | 행 없음(#97 신설) | 29 | **제거 3** · 정정 1(머리 슬라이스 배너) · 유지 26(판단 분기 1) |
| `go/internal/handlers/reprocess_trigger_test.go` | 행 없음(#97 신설) | 6 | 전량 유지(테스트 파일 선례) |
| `deploy/base/rbac.yaml` | 행 없음(#97 신설) | 11 | **제거 8** · 유지 3 |
| `go/internal/handlers/reprocess.go` | 남음 56, 실측 51 | 머리 20(보류였던 자리, #97 이 갈아 씀) | **제거 15** · 정정 1 · 유지 5 — 나머지 31 은 직전 패스 판정 그대로 |
| `go/internal/handlers/handlers.go` | 남음 235, 실측 245 | 증가분 10(#94 분 3 + #97 분 7) | **제거 5** · 유지 5 |
| `go/internal/store/store.go` | 남음 29, 실측 36 | 증가분 7 | 전량 유지(판단 분기 1) |
| `go/cmd/serving/main.go` | 남음 4, 실측 6 | 증가분 2 | **제거 2** |
| `deploy/base/deployment.yaml` | 남음 9, 실측 11 | 증가분 2 | **제거 1** · 유지 1 |
| `deploy/batch/workflow-template.yaml` | 남음 42, 실측 66 | 증가분 24(#97 분 22 + 온도 주석 2) | **제거 6** · 유지 18(판단 분기 2) |

### 감지 단계의 예측과 실측

감지는 이 묶음의 복원처를 「doc-tracker 2026-09 슬라이스 10 후반부 착지 항목 · 설계 트래커 · PR #97 본문」으로 예상했고, 매니페스트
셋은 「애매하면 남긴다 + 권한 사유·Argo 파라미터 계약이라 유지 가능성 높음」으로 봤다. 실측은 반쯤 맞았다 — 복원 경로 ②(doc-tracker
⑷ 절이 「서빙 Pod 는 `econ-serving` ServiceAccount 로 `workflows` create/get/list · `workflowtemplates` get 만 갖는다 … 서빙은 레이크를
쓰지 않는다 … `trigger.available` 은 플래그가 아니라 프로브다」를 **축자로** 적는다)가 성립하는 것은 맞지만, 지운 줄의 대부분은 문서
사본이 아니라 **같은 묶음 안 여덟 자리에 되풀이된 같은 이야기**였다(`argo.go` 패키지 주석 · `reprocess_trigger.go` 머리 · `handlers.go`
머리와 `argo` 필드 · `main.go` · `rbac.yaml` 머리 · `deployment.yaml` · `workflow-template.yaml` 머리 — 여기에 web 쪽 `ReprocessTrigger.tsx`·
`Reprocess.tsx` 머리·`client.ts`·`Reprocess.test.tsx` 나레이션이 더 있다). 그래서 이 패스의 첫 판단은 **주인 정하기**였다:
「무엇을 일으키고 왜 서빙이 쓰지 않는가」의 주인은 그 POST 를 처리하는 `reprocess_trigger.go` 머리(18~23행), 「프로브가 무엇을
증명하는가」의 주인은 그 프로브를 수행하는 `argo.TemplateReachable` doc, 「기록된 결정이 서빙 버전을 이름한다」의 주인은 그 타입
`store.ReprocessDecision` doc 이다. 나머지 자리는 그 주인을 가리키는 포인터 1줄이나 무주석으로 줄였다. 매니페스트 쪽 예측은 절반만
맞았다 — 파라미터 계약(`arguments.parameters` 가 bare submit 의 기본값 · `sample` 0/양수 · 재시도 안전성과 exit 2)은 남았고, 권한
**사유**는 doc-tracker ⑷ 절과 `reprocess_trigger.go` 머리가 축자로 복원해 포인터로 줄었다.

## 제거 — 복원 경로별 근거

### ⑴ `argo.go` — 7줄

| 지운 줄 | 복원처 |
|---|---|
| 패키지 주석 본문 5줄(「The serving Pod never writes the lake — its data mount is read-only on purpose. What it can do is ask the cluster to run the batch that does: a reprocess is a Workflow created from the batch WorkflowTemplate with the operator's range and version as parameters, and a publish/rollback is the same with the decision as parameters. This package is that one capability」) | **설명의 주인은 `reprocess_trigger.go` 머리 18~23행**(같은 문장 — 「are each one Workflow submitted from the batch WorkflowTemplate. The Pod's data mount is read-only, so nothing here touches the lake: the batch does, with the parameters the operator chose」) · doc-tracker 2026-09 「슬라이스 10 후반부」 ⑷ 절(「서빙은 레이크를 쓰지 않는다(마운트는 그대로 읽기 전용) — 쓰는 것은 언제나 이 Workflow 가 띄운 배치다」, ②) · PR #97 본문(③). 남긴 것은 이 패키지만의 결정인 「client-go 를 쓰지 않는 이유」 2줄 — doc-tracker 는 「client-go 없이 API 서버에 직접 말한다」는 사실만 적고 이유(「two verbs on one resource do not justify a dependency tree」)는 여기에만 있다 |
| `FromEnv` doc 셋째 줄(「no API server to speak to means no trigger, and the reprocess response says so instead of pretending」) | `probeArgo` 의 `h.argo == nil` 분기와 그 오류 문면 「이 서빙은 클러스터 밖에서 돌고 있어 …」(①) · `reprocess_trigger.go` 머리 「Outside a cluster … the reason is reported」(주인) |
| `New` doc 둘째 줄(「tests point it at a fake API server」) | `reprocess_trigger_test.go` 의 `fakeAPIServer` 와 그 doc(「stands in for the Kubernetes API」, ①) |

정정 1곳(지문 −0): `Kind` 필드 doc 의 값 열거(`"sample", "run" or "publish"`)를 걷었다 — 값은 `reprocess_trigger.go` 가 `Submission{Kind: …}`
로 넘기는 세 자리(①)가 복원하고, 열거는 정책의 「개수·열거」 유형이다(직전 패스가 `Reason` 값 열거를 지운 것과 같은 판단).

### ⑵ `reprocess_trigger.go` — 3줄

| 지운 줄 | 복원처 |
|---|---|
| 머리 프로브 문단 중 「the WorkflowTemplate must be readable with this Pod's ServiceAccount, which proves the wiring (Argo installed, template applied, RBAC granted) end to end」(5줄 → 4줄) | **주인은 `argo.TemplateReachable` doc**(「the cheapest proof that both the wiring (Argo installed, template applied) and the RBAC (this ServiceAccount may see it) are in place」 — 프로브를 수행하는 함수). 머리에는 제품 규칙(「A control is offered only when it can do something … a probe, not a flag … the screen draws no buttons」)과 그 주인을 가리키는 괄호만 남겼다 |
| `ServingVersion` 필드 doc 3줄 → 1줄(「the analyzer version the last decision published (or rolled back to); empty when no decision was ever recorded, in which case aggregation serves each record's newest row」) | **주인은 `store.ReprocessDecision` doc**(「The last one names the version Gold serves」, ①) · 「없으면 최신 행」은 doc-tracker ⑵ 절(「없으면 그 레코드의 최신 행(`silver.py` ∋ `def select_serving`)」, ②) · `test_serving_version.py:53` 「No decision yet: the newest version of the record serves」(①) · `types.ts:264` JSDoc(같은 문장의 세 번째 사본 — web 쪽 판정에서 다룬다) |

정정 1곳(지문 −0): 머리 첫 줄의 슬라이스 배너 「(roadmap slice 10, second half)」를 걷었다 — 작업 흔적 유형, doc-tracker 슬라이스 10 후반부
착지 행이 복원한다(②). `reprocess.go` 첫 줄의 「(roadmap slice 10)」도 같은 처분(아래).

### ⑶ `reprocess.go` 머리 — 15줄(보류였던 20줄 중)

| 지운 줄 | 복원처 |
|---|---|
| 「Reprocessing is the one operator flow that *causes* work instead of reading it: bump the analyzer version, re-analyze a range of Bronze, compare the two results, publish or roll back (JRN-logic-backfill)」 3줄 | 여정 문서 `JRN-logic-backfill` 의 단계 목록(②) · `Reprocess.tsx` 머리 9~12행이 같은 문장을 한국어로 되풀이(web 쪽 사본 — 그쪽은 이번에 판정하지 않음) · `reprocess_trigger.go` 머리(주인) |
| 「What this endpoint answers, from the lake as it is」 목록 12줄(scope · versions · compare · trigger) | **같은 파일 함수 doc 이 항목마다 주인이다**(한 파일 안의 두 벌 — serving-handlers-pass 의 `latestBucket` 처분): scope ↔ `bucketsOf` doc(「groups the selection by collection cycle and marks, per cycle, how many records Silver already carries at the target version」) · versions ↔ `versionsOf` doc · compare ↔ `compareVersions` doc(「puts the newest two versions side by side」 + 직전 패스가 남긴 「names that instead of inventing a baseline」)과 `compareRow` doc · trigger ↔ `reprocessTrigger` 타입의 필드 doc(`Available`·`Note`·`ServingVersion`·`Decisions`·`Runs`). 여정 단계 id(`STP-scope-range`·`STP-compare-before-after`)는 `Reprocess.tsx` 의 절 표지 `{/* ---- STP-scope-range ---- */}` 가 든다(①) |

남긴 5줄: 첫 줄(라우트 lede) · 「Before anything is triggered the operator has to see what the range contains, and that part is a pure read over
Bronze and Silver; the triggering itself is the POST side in reprocess_trigger.go」 3줄 — 이 파일이 왜 읽기만 하는지와 쓰기 쪽의 위치는 파일
분할의 이유라 어느 doc 도 되풀이하지 않는다(파일 이름만으로는 「왜 갈랐나」가 복원되지 않는다).

### ⑷ `handlers.go` — 5줄(증가분 10 중)

| 지운 줄 | 복원처 |
|---|---|
| 패키지 주석 9~11행(「reprocess also owns the only routes that cause work: its three POSTs submit the batch as Argo Workflows (reprocess_trigger.go) — the serving Pod itself never writes the lake」 3줄 → 1줄 포인터) | 「서빙은 레이크를 쓰지 않는다」는 `reprocess_trigger.go` 머리(주인) · doc-tracker ⑷(②). 패키지 주석의 나머지 항목이 쓰는 꼴(「(reprocess.go)」 포인터)에 맞춰 「reprocess's three POSTs are the only routes that cause work (reprocess_trigger.go)」 1줄만 남겼다 |
| `argo` 필드 doc 둘째 줄(「in which case the reprocess response reports the trigger as unavailable」) | `probeArgo` 의 nil 분기(①) · `reprocess_trigger.go` 머리(주인) |
| `now` 필드 doc 둘째 줄(「tests pin it so a fixture's timestamps stay inside the window」 — #94 분, 직전 패스 보류) | `reprocess_test.go:15-16` 「The fixture clock. Every timestamp below is written relative to it so the range windows are exact and the test does not depend on the wall clock」이 **설명의 주인**(직전 패스가 판단만 적고 보류했던 자리, ①) |
| `WithArgo` doc 2줄 → 1줄 | 시그니처(`*argo.Client` 를 받아 `h.argo` 에 둔다)와 `reprocess_trigger.go` 의 세 POST 가 `h.argo.Submit` 을 부르는 것(①) — 요약 1줄만 남겼다 |

### ⑸ `main.go` — 2줄

「In a Pod the reprocess console can submit batch Workflows; elsewhere it reports the trigger as unavailable and draws no controls」 —
바로 아래 `argo.FromEnv()` 분기와 두 `log.Printf`(「argo trigger disabled」·「argo trigger: namespace=…」)가 같은 사실을 실행 시점에
말하고(①), `FromEnv` doc 이 「returns nil when this process is not running in a Pod」를(①), `reprocess_trigger.go` 머리가 「draws no
buttons」를 든다(주인).

### ⑹ `rbac.yaml` — 8줄(11 → 3)

| 지운 줄 | 복원처 |
|---|---|
| 「start the batch. The reprocess console (JRN-logic-backfill) submits Workflows from the batch WorkflowTemplate — a sample run, a full run, a publish or rollback decision — and reads them back to show progress. Its data mount is read-only; every write to the lake is the batch's, through these Workflows」 4줄 + 빈 `#` 1줄 | `reprocess_trigger.go` 머리(주인) · doc-tracker ⑷ 절(축자, ②) · PR #97 본문(③) |
| 「it can create and read Workflows and read the template it submits from, and nothing else」 | 바로 아래 `rules:` 두 항목의 `resources`·`verbs` 그대로(①) — 규칙의 열거 |
| 「Whether this grant is in place is what `trigger.available` in /api/reprocess reports (the Pod probes the template with this identity); without it the screen offers no run controls rather than buttons that 403」 3줄 | `argo.TemplateReachable` doc(「the RBAC (this ServiceAccount may see it)」, 주인) · `reprocess_trigger.go` 머리 「a probe, not a flag … draws no buttons」(주인) · `writeArgoError` doc 「a 403 is an RBAC gap the operator has to see as such」(①) · doc-tracker ⑷(②) |

남긴 3줄: 이 신원이 무엇을 하는 신원인지의 lede 와 주인 포인터, 「verbs cut to exactly that」(최소 권한 의도 — 규칙 자체는 「왜 이만큼만」을
말하지 않는다).

### ⑺ `deployment.yaml` — 1줄(2 → 1)

「The reprocess console submits batch Workflows with this identity (rbac.yaml); the token the kubelet mounts for it is all the Pod needs」 —
첫 절은 `rbac.yaml` lede 와 같은 문장, 둘째 절(「추가 시크릿·볼륨이 필요 없다」)은 `argo.FromEnv` 가 `saDir + "/token"` 을 읽는 것(①)이
복원한다. 「Why a dedicated identity: rbac.yaml」 포인터 1줄만 남겼다.

### ⑻ `workflow-template.yaml` — 6줄(증가분 24 중)

| 지운 줄 | 복원처 |
|---|---|
| 머리 새 문단 중 「`reprocess` re-analyzes a scoped range of Bronze at a chosen analyzer version beside the existing Silver rows, and `publish` records the publish/rollback decision that names which version Gold serves, then rebuilds Gold」(6줄 → 4줄) | **같은 파일 두 템플릿 블록의 머리 주석**이 각각 같은 사실을 적는다(한 파일 안의 두 벌) · doc-tracker ⑴⑵(②). 남긴 것: 「스케줄이 아니라 서빙 Pod 가 부른다」와 **파라미터 계약**(`arguments.parameters` 가 bare submit 의 기본값) |
| `reprocess` 블록 「re-analyze only the Bronze the operator scoped, stamped with the version they named, beside the rows Silver already holds (econ_core.silver)」(7줄 → 5줄) | 아래 `args:` 의 `--analyzer-version/--since/--axis/--source`(①) · doc-tracker ⑴ 「범위 지정 재처리는 새 버전을 옛 행 옆에 쌓고」(②). 남긴 것: `sample` 0/양수 계약 · 체크포인트 재개 → 재시도가 안전한 이유(과금되는 호출인데 `retryPolicy: Always` 인 근거 — 이 파일만의 지식) |
| `publish` 블록 「(which analyzer version Gold serves, and why) … Publishing is a pointer move over rows that already coexist in Silver; a rollback is the same move back」(4줄 → 2줄) | doc-tracker ⑵ 「반영은 포인터 이동이고 롤백은 같은 이동의 되돌림이다 — 재분석은 일어나지 않는다」(축자, ②) · `store.ReprocessDecision` doc(①). 남긴 것: 「Nothing is re-analyzed here, so a retry is safe」(재시도 근거) |

## 유지 — 111줄(판정한 158줄 중)

- **`argo.go` 29줄**: 패키지 주석 첫 줄 + client-go 미사용 이유 2줄 · 이름으로 시작하는 doc 첫 줄(`Client`·`FromEnv`·`New`·`Submission`·`Run`·
  `APIError`·`TemplateReachable`·`Submit`·`List`·`IsAPIError`·`workflow`) · **`FromEnv` 의 환경 변수 표 3줄**(`KUBERNETES_SERVICE_HOST/PORT`·
  `ECON_ARGO_NAMESPACE`·`ECON_ARGO_WORKFLOW_TEMPLATE` — README·deploy 어디에도 없는 유일한 문서, 「문서화되지 않은 설정 계약」) ·
  `Annotations` 의 「so a listing can show it without reading the spec back」(설계 이유) · **`Submit` 의 타임아웃 근거 2줄**(「an hour and a half is
  the hourly pipeline's own bound with room for a 30-day range」 — 숫자의 출처) · `List` 의 정렬 근거(「names carry no order, so sort on the
  timestamp the API server stamped」) · `TemplateReachable` 의 「무엇을 증명하는가」 3줄(주인).
- **`reprocess_trigger.go` 26줄**: 머리 lede + 주인 문단 6줄 + 제품 규칙 4줄 · `Note`·`ServingVersion`(1줄) · `probeArgo` 의 캐시 이유 2줄
  (「so a screen refresh does not become an API-server call」 — 30초 TTL 의 근거) · `reprocessRuns`·`reprocessRequest`·`publishRequest` doc ·
  **`publishRequest` 의 「a decision without a memo is refused, the batch refuses it too, and neither would be able to explain the numbers
  later」**(둘이 같은 거부를 하는 이유 — doc-tracker 는 「결정 + 근거 필수」 사실만 적는다) · `writeArgoError` 의 403 통과 이유 3줄.
- **`reprocess_trigger_test.go` 6줄 전량**: 픽스처가 실환경과 갈리는 지점(`fakeAPIServer` 가 무엇을 흉내 내는가 · 「One second apart, the way
  the API server's second-resolution timestamps would separate two real submissions」)과 단언 설계(「The decision log is a lake read, so it is
  reported either way」) — `reprocess_test.go`·`handlers_test.go` 와 같은 판정.
- **`reprocess.go` 머리 5줄**(위 ⑶) + 직전 패스가 남긴 31줄 무접촉.
- **`handlers.go` 5줄**: `argo`·`now`·`trigger` 필드 doc 각 1줄 · `New` 의 「with no workflow trigger」 · `WithArgo` 1줄.
- **`store.go` 7줄 전량**: `Analyses` doc 본문 3줄(「Silver holds one row per (record_id, analyzer_version): a reprocessed record keeps its
  earlier version's row beside the new one」 — 판단 분기, 아래) · `ReprocessDecision`·`ReprocessDecisions` doc 4줄(이름으로 시작하는 doc,
  「The last one names the version Gold serves」는 이 패스가 **주인으로 지목**한 자리 · 「empty if absent」는 이 파일의 `readJSONL` 계약).
- **`deployment.yaml` 1줄**: 포인터.
- **`workflow-template.yaml` 18줄**: 머리 4줄(스케줄 아님 + 파라미터 기본값 계약) · 파라미터 그룹 표지 2줄(`# reprocess: …`·`# publish: …` —
  어느 파라미터가 어느 템플릿의 것인지는 아래 `args:` 를 두 블록 대조해야 복원되는 대응, 판단 분기) · `reprocess` 블록 5줄 · `publish` 블록
  2줄 · **exit 2 재시도 금지 2줄**(initial-pass 가 `analyze` 블록에서 유지한 것과 같은 판정) · **온도 주석 2줄**(「GPT-5.x rejects any
  temperature but its own default (400 unsupported_value)」 — chat-completions 엔드포인트의 문서화되지 않은 동작, 모델 정의가 이름 대어
  유지로 지목한 유형; #94 창에 들어와 직전 패스의 계수 밖에 있었다) · 나머지 초기 판정분 무접촉.

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| `store.go` `Analyses` doc 본문 3줄 | doc-tracker ⑴ 절이 「Silver 는 `(record_id, analyzer_version)` 별 한 행이다」를 축자로 적어 경로 ②가 성립하고, 쓰는 쪽(`econ_core/silver.py` `store_analyses`)이 값을 만드는 주인이다. 그러나 이 파일의 Go 독자에게는 「한 레코드가 여러 행으로 온다」가 `reprocess.go` 의 계수 주석(「counted once per version even if Silver holds the same record twice」)이 기대는 전제이고, lineage-surface-pass 가 이 파일의 데이터 계약 doc 을 「설명의 주인」으로 전량 유지한 선례가 있다 | 유지 |
| `reprocess_trigger.go` `publishRequest` doc 셋째 줄(「neither would be able to explain the numbers later」) | 「메모 없는 결정 거부」 사실은 doc-tracker ⑸·`econ_aggregation` CLI 의 exit 2 가 복원하지만, **왜** 서빙과 배치가 둘 다 거부하는지는 여기에만 있다 | 유지 |
| `workflow-template.yaml` 파라미터 그룹 표지 2줄 | 구분선 유형으로 볼 수도 있으나(절 이름은 파라미터 이름이 복원), 열 파라미터가 어느 템플릿의 입력인지는 두 블록의 `args:` 를 대조해야 복원되는 대응이다 | 유지 |
| `workflow-template.yaml` `reprocess` 블록의 「`sample` > 0 is the dry run; 0 is the full run」 | `econ-analysis --sample` 의 help 문면(①)과 doc-tracker ⑸(②)가 복원할 수 있으나, 이 템플릿을 bare submit 하는 사람이 파라미터 하나로 두 여정 단계를 가르는 계약을 여기서 읽어야 한다(Argo 파라미터 계약 — 감지 단계가 유지로 예측한 자리) | 유지 |

## 검증

- 비주석 코드 무변경(8파일 전부): 블록·줄 주석을 걷어내고 공백을 접은 본문이 `f7e2338` 와 동일(`nocomment.py` — Go 는 `/* */`·줄머리 `//`,
  YAML 은 줄머리 `#` 제거 후 비교). `gofmt -l .` 빈 출력.
- `go/`: `go vet ./...` rc=0 · `go test ./...` handlers·store ok(`reprocess_trigger_test.go` 3건 · `reprocess_test.go` 5건 포함).
- `deploy/`: `kustomize build` 네 곳(`base`·`batch`·`overlays/preview`·`overlays/prod`)의 렌더가 부모와 **바이트 동일**(주석은 렌더에 실리지
  않는다).
- 지문(모델 `asIs.versionScript` 그대로): `lines=2618 files=134` / `2b030a39…` → **`lines=2571 files=134`** / `e2eb74eb…`. 델타 −47/0.
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수): 기준 커밋에서 ⑴ 9파일 145 · ⑵ 25파일 217(원장 말미의 부모 시점 값 ⑴ 1/33 · ⑵ 18/148 에
  #97 을 얹은 값과 파일·수치 일치) → 이 패스 뒤 ⑴ **5파일 63** · ⑵ **20파일 172** + 보류 1(`types.ts`).
- 열린 PR: 계획 시점(11:40Z)과 PR 개설 직전 둘 다 #75 하나(`.github/`·`README.md`·`scripts/`) — 이 10파일과 교집합 0.
- web·python·e2e 는 무접촉(CI `Checks` 가 집행).

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **#97 묶음의 web 6파일 74줄** — `web/src/screens/ReprocessTrigger.tsx` 23(⑴) · `web/src/screens/Reprocess.tsx` 28(⑴ — #96 이 건
  `Reprocess.tsx:87-124`·`:240-241`·`:295-302`·`:364-372`·`:375-402` 자물쇠 다섯은 #97 의 머리 헝크(33→28)로 **이미 낡았다**; 재핀은 트래커
  소유자 mockup-render 몫이고, `rct_20260921-0006` 이 `assessing` 중이다) · `Reprocess.test.tsx` +11 · `client.ts` +5 · `types.ts` +5 +
  보류 1(`trigger` JSDoc) · `tokens.css` +1. 이 패스가 정한 주인(`reprocess_trigger.go` 머리 · `argo.TemplateReachable` · `store.ReprocessDecision`)
  의 사본이 `ReprocessTrigger.tsx:10-19`·`Reprocess.tsx:7-14`·`client.ts:29-30,77-78`·`types.ts:260-264`·`Reprocess.test.tsx:223-232` 에 있다 —
  **다음 패스의 1순위**. `Reprocess.tsx` 는 자물쇠가 낡았으므로 파일째 보류할 이유가 사라졌다(trend-rejudge-pass 의 처분: 이미 낡은 자물쇠
  위는 판정하고 재핀을 넘긴다).
- **#97 묶음의 python 5파일 24줄** — `python/packages/core/tests/test_silver.py` 7(⑴) · `python/packages/core/src/econ_core/storage.py` 3(⑴) ·
  `python/packages/aggregation/tests/test_serving_version.py` 2(⑴) · `econ_analysis/cli.py` +9(⑵, 그중 #97 분 5) · `analysis/tests/test_cli.py` +3
  (⑵). 복원처는 doc-tracker ⑴⑵⑶ 절(병존·서빙 버전 선택·체크포인트)로 백엔드와 다른 묶음이고, 테스트 3파일은 전량 유지 선례. `storage.py` 의
  `os.replace` 3줄은 doc-tracker ⑴ 「임시 파일 → `os.replace` 라 서빙이 쓰는 도중의 잘린 줄을 읽지 않는다」가 축자 복원.
- **⑵ 나머지 144줄** — 직전 패스가 적은 순서 그대로: `scripts/check-journey-mockup.py`(+23) → dash 묶음 `Dashboard.tsx`(+19)·`Dashboard.test.tsx`(+12) →
  `test_aggregate.py`(+18) 등.
- **행보다 줄어든 파일**: `deploy/overlays/prod/batch-pvc.yaml` 행 남음 9 · 실측 7(#92 내용 교체, 직전 패스 「범위 밖」) — 이번에도 열지 않았다
  (`deploy/` 표적 패스의 입력, 복원처가 다른 묶음). `reprocess.go` 는 이 패스가 머리를 판정해 행 수치를 실측(36)으로 재부착했다.
- **설계 트래커의 `handlers.go:34`·`:30-37` 인용** — #94 부터 낡아 있었고(`Register` 35행), 이 패스의 제거 4줄이 전부 그 위(9~11행·29~32행)라
  `Register` 는 **45행**이 됐다. 트래커 쪽 정정은 그 행의 소유자(mockup-render)에게 넘긴다(trend-rejudge-pass 의 `Trend.tsx:8-21` 처분).
- `#75` 가 착지하면 `scripts/check-data-format-change.py` 가 ⑴ 로 새로 들어온다 — 이 묶음 밖.
