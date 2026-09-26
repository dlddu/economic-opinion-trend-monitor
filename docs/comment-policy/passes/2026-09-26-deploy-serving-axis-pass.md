# 2026-09-26 — deploy-serving-axis-pass

`deploy/` 전체와 `go/` 의 남은 파일을 **한 덩어리로** 가져가 네 복원 경로 전건 판정.
범위는 판정 축이 `①②③④` 가 아닌 L 행 19개 · 주석 361줄(슬라이스 예산 400줄의 90%).
제거 105줄 · 유지 256줄 · 행 하나 소멸(`deploy/batch/rbac.yaml` — 주석 0줄).

기준 커밋 `0229fe8` (자매 D·E 패스 #166 착지 직후로 리베이스; 측정은 `8def8fe` 에서 했고
리베이스 뒤 게이트가 L 표면 수치를 바이트 그대로 재인쇄한다 — 두 패스의 표면이 서로소인 증거다).

## 왜 이 덩어리인가

- 「배치를 제출하는 쪽」과 「제출되는 배치 매니페스트」가 한 판정 문맥이다 —
  `reprocess_trigger.go` → `argo.go` → `workflow-template.yaml` → 두 CronWorkflow →
  오버레이가 한 경로고, 이 19행의 저작 PR 집합이 `#1 #3 #11 #19 #25 #70 #72 #73 #92 #94 #97 #121 #130`
  으로 겹친다. 경로 ③ 을 한 번 읽어 열아홉 행에 모두 댈 수 있는 것이 가장 큰 비용 절감이었다.
- 열린 PR 과 **파일 교집합이 공집합**이다: `#166`(자매 task 의 D·E 패스)은
  `python/packages/{analysis,ingestion}` 만, `#162`는 `docs/` 1파일만 건드린다.
  그래서 정의가 인정하는 유일한 축소 사유(「파일이 실제로 겹치는 열린 PR」)에 걸리지 않는다.
  같은 이유로 `python/packages/` 덩어리(24행 148줄)는 **이번에 가져가지 않았다** —
  `#166` 이 그 파일들의 docstring·줄 끝 주석을 고치고 있다.

## 이 패스가 바꾼 것 — 축 하나가 아니라 축의 조합

직전 원장은 이 19행 중 15행을 `—` 로, 4행을 `①`·`②`·`①③` 으로 들고 있었다.
그 값들은 대부분 **①(코드 자체)만 물은 판정**이었고, 이 레포에서 실제로 닫는 축은
**③(저작 PR 본문)과 ②(README 「배포」·「PR 프리뷰」 절)** 이다. 파일별 제거 줄 수와 주된 경로:

| 파일 | 제거 | 주된 경로 |
|---|---:|---|
| `deploy/batch/workflow-template.yaml` | 29 | ②(README `:161-162`·`:184-186`) · ①(사본·재진술) · 작업 흔적 배너 |
| `deploy/overlays/preview/kustomization.yaml` | 14 | ②(README 「PR 프리뷰」 `:195-204`) · ③(#25 경위) |
| `deploy/batch/cronworkflow-ingestion.yaml` | 12 | ③(#11 의 AC1.1 필드 매핑 표) · ②(README `:158-160`) |
| `deploy/batch/kustomization.yaml` | 11 | ②(README `:163-167`) · ③(#11) · ①(사본) |
| `deploy/overlays/prod/kustomization.yaml` | 11 | ①(위의 두 패치가 형태를 실물로 보여 준다) · ② · 작업 흔적 |
| `deploy/batch/cronworkflow-pipeline.yaml` | 9 | ①(`pipeline` steps) · ②③ · 작업 흔적 |
| `deploy/batch/rbac.yaml` | 6 | ③(#11 축자) — **행 소멸** |
| `go/internal/handlers/reprocess_trigger.go` | 5 | ③(#97 §4 축자) |
| `go/internal/store/store.go` | 5 | ②(PRD AC1.4·AC2.6) · ③(#70) |
| `go/internal/argo/argo.go` | 1 | ③(#97 §4) |
| `go/internal/handlers/reprocess.go` | 1 | ②(PRD AC2.5) · ③(#94) |
| `deploy/overlays/prod/batch-pvc.yaml` | 1 | ②(README `:176-178`) |
| 나머지 7행 | 0 | 전건 유지 |

④(커밋 메시지)로 닫힌 것은 **0줄**이다. 이 열아홉 행의 저작 커밋은 전부 squash 제목 한 줄이라
④ 는 판정을 통과시키기만 하고 아무것도 닫지 않는다. 그 사실 자체를 여기에 적어 둔다 —
다음 패스가 ④ 를 다시 비싸게 조사하지 않도록.

## 판정이 갈린 자리 (유지)

정책 「경로 ③ 과 편집 지점 가드가 갈리는 자리」 판별식(**어겼을 때 조용히 깨지는가**)으로 갈랐다.

| 주석 | ③ 에 있는가 | 판정 |
|---|---|---|
| `kustomizeconfig.yaml` 전량 10줄 | PR #25 §3 축자 | **유지** — 이 파일을 떼면 `images:` retag 가 **오류 없이** 먹지 않는다. 정책 본문이 이 명제를 복원 불가 제약의 예로 이름 들어 적고 있다 |
| `cronworkflow-pipeline.yaml` 상호 배타 | PR #72 · README `:171-175` | **가드 2줄만 유지** — 둘 다 켜면 아무것도 실패하지 않은 채 매시간 두 번 수집·과금된다. 경위 3줄은 제거 |
| `cronworkflow-pipeline.yaml` 켜기 전 1~3단계 | PR #72 가 **인용**만 한다 | **유지** — PR 본문이 「선행 조건(`cronworkflow-pipeline.yaml` 머리 주석 1~3)」으로 이 주석을 가리킨다. 가리키는 것은 복원이 아니다 |
| `workflow-template.yaml` GPT-5.x temperature | PR #73 축자 | **유지** — 값이 왜 `default` 여야 하는가를 편집 지점에서 말한다 |
| `preview/kustomization.yaml` 삭제 패치 | PR #25 §4 | **유지** — 나중에 더한 CronWorkflow 는 덮이지 않는다는 금지 |
| `batch/rbac.yaml` 전량 | PR #11 축자 | **제거** — 어기면 첫 스텝이 **크게** 실패한다. 조용히 깨지지 않는다 |
| `reprocess_trigger.go` 주인 문단 6줄 | PR #97 §4 가 읽기 전용 절을 적는다 | **유지** — 직전 패스가 다섯 파일의 사본을 걷으며 이 자리를 「설명의 주인」으로 지목했다. 주인을 없애면 그 제거들이 가리킬 곳을 잃는다 |
| 두 CronWorkflow 의 바이트 동일 보정 주석 | — | **양쪽 유지** — 두 CronWorkflow 는 독립 적용 단위라 각자의 필드 옆에 가드가 필요하다. 한쪽을 「사본」으로 걷으면 남는 쪽이 정본이라는 근거가 없다(애매하면 남긴다) |

## 정정 (줄 수 불변, 지문만 이동)

- `overlays/prod/kustomization.yaml` — template-wide 문단의 `every stage (ingest, analyze)` 에서
  개수 열거를 걷었다. 파이프라인이 `ingest -> analyze -> aggregate` 3단이 된 뒤로 거짓이었고,
  정책이 「가드는 개수·열거·행 위치를 담지 않는다」로 금지한 모양이다.
- `cronworkflow-pipeline.yaml` — `activeDeadlineSeconds` 앞 「Two stages now」도 같은 이유로 걷었다.

## 선행 판정의 승계와 갱신

- `workflow-template.yaml` 의 직전 축 `①③` 은 `runlog-window-pass` 가 **#130 증가분 10줄에만**
  물은 값이 원장 이전 때 행 전체로 옮겨 적힌 것이다. 이번에 파일 전체를 네 축에 다시 댔고,
  그 10줄에 대한 직전 판정은 그대로 유효하다.
- `overlays/prod/batch-pvc.yaml` 의 결과 칸이 들고 있던 「사람 게이트 뒤라 무인 패스가 판정하지
  않는다」는 사유는 2026-09-24 `#127` 이 `SENSITIVE_PATHS` 에서 `deploy/**/*pvc*.yaml` 을 빼며
  이미 해소돼 있었다(그 사실도 같은 칸에 적혀 있었다). 이번 패스가 무인으로 판정했다.

## 무영향 증명

- `kustomize build` **다섯 경로 전부 부모와 바이트 동일**:
  `deploy/base` · `deploy/batch` · `deploy/overlays/prod` · `deploy/overlays/preview` · `tests/e2e/k8s`.
  매니페스트 주석만 걷었으므로 렌더 결과가 한 바이트도 움직이지 않는다.
- `gofmt -l` 빈 출력 · `go vet ./...` · `go build ./...` · `go test ./...` 전건 통과.
- `git diff -w` 에서 주석·빈 줄을 뺀 나머지가 **공집합**이다. 단 하나의 예외:
  `reprocess.go` 의 `UnanalyzedShare` 앞 주석 한 줄을 걷자 `gofmt` 가 `reprocessCompare` 의
  필드 정렬 그룹을 합쳐 **공백만** 5줄 이동했다(토큰 변화 0).
- `scripts/check-comment-ledger.py` rc=0.
