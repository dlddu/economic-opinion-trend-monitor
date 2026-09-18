# 2026-09-18 pin-guard-pass — 핀 가드 3자리 표적 재판정

| 항목 | 값 |
|------|-----|
| 기준 커밋 | `e29dddd` (main) |
| 성격 | **표적 재판정** — 전수 패스가 아니다. 판정한 것은 아래 3파일의 핀 가드 자리뿐 |
| 판정 전 | 982줄 / 81파일 — 지문 `1a2f4fc2…` (풀 전체 값) |
| 판정 후 | 979줄 / 81파일 — 지문 `62796561…` |
| 제거 | 3줄 (+ 2곳 문면 정정) |
| 촉발 | `ce54a57` (#35 "ci: 운영 이미지 pin 을 main 되커밋 대신 deploy 브랜치로 발행") |
| 추적 | reconciler `tbm_econ-opinion-monitor-comment-redundancy` / `rct_20260918-0004` |

## 무엇이 바뀌었나

`#35`가 핀 메커니즘을 **main 되커밋 → `deploy` 브랜치 발행**으로 바꿨다. 원본 둘(`.github/workflows/image.yml`,
README「운영 고정(`pin` job)」)은 같은 커밋에서 갱신됐고, 그 메커니즘을 되풀이하던 **범위 내 주석 세 자리 중
한 곳**(`deploy/base/deployment.yaml`)만 따라 갱신됐다. 남은 둘은 옛 메커니즘을 그대로 되풀이한 채 거짓이 됐다.

- `deploy/batch/workflow-template.yaml:13-15` — "Both `image:` lines below are pinned to a main commit SHA by
  CI's `pin` job". 실측: 이 파일의 `image:` 태그는 전부 `b5a91d6`에 동결돼 있고 CI는 더 이상 건드리지 않는다.
- `deploy/base/kustomization.yaml:6-7` — "(where CI's `pin` job writes the main SHA)". 같은 이유로 거짓.

initial-pass가 이 세 자리를 유지한 근거는 "핀 태그는 CI가 **main에** 쓴다"가 참이라는 전제였다
([initial-pass](2026-09-18-initial-pass.md) 「유지 — 대표 목록」의 편집 지점 가드 항목). 그 전제가 깨졌다.

## 제거 — 복원 경로별 근거

### 핀 메커니즘 서술 (복원 경로 ① 코드 · ② 저장소 문서) — 3줄

메커니즘은 두 원본이 더 정확하게 담는다. ① `.github/workflows/image.yml` — 세 주석 중 둘이 **파일명으로 직접
지목**하던 바로 그 코드다. ② README「운영 고정(`pin` job)」 — `deploy/base/deployment.yaml`과
`deploy/batch/workflow-template.yaml`을 **이름으로 열거**하고 "main에 남은 태그는 운영과 무관"까지 적는다.

- `deploy/base/deployment.yaml` −2줄 — `deploy` 브랜치 발행·Flux 추적·"main의 값은 운영값이 아니다" 서술.
- `deploy/batch/workflow-template.yaml` −1줄 — "pinned to a main commit SHA by CI's `pin` job (…image.yml)".
- `deploy/base/kustomization.yaml` ±0 — 괄호절 하나만 삭제하고 문장을 다시 흘렸다(줄 수 불변).

**재동기화하지 않은 이유.** 거짓이 된 두 줄을 새 메커니즘으로 고쳐 쓰는 것이 더 작은 변경이지만, 그건 같은 덫을
다시 장전하는 것이다. 이 세 자리는 `#35` 이전에도 참이었고 `#35`에서 조용히 거짓이 됐다 — 다음에 핀 경로가 또
바뀌면 똑같이 거짓이 된다. 되풀이를 지우면 그 실패 모드 자체가 사라진다.

## 유지 — 가드를 메커니즘 비의존으로 다시 쓴 이유

정책 본문은 「편집 지점에서만 효과가 있는 가드」를 유지 대상으로 명시한다. 그래서 **가드는 지우지 않았다** —
다만 가드가 담고 있던 메커니즘을 걷어내고 금지와 출처만 남겼다.

| 자리 | 남은 문면 |
|---|---|
| `deploy/base/deployment.yaml` | "CI owns this tag — do not edit it by hand. Which commit production actually runs is README 「운영 고정(`pin` job)」." |
| `deploy/batch/workflow-template.yaml` | "The `image:` tags in this file are CI-owned and move in step with the serving image in deploy/base — do not edit them by hand (README 「운영 고정(`pin` job)」)." |

이 문면은 핀이 main에 커밋되든 `deploy` 브랜치로 발행되든 참이다. 절 이름 포인터는 내용의 되풀이가 아니라
**출처 지시**이므로 복원 경로와 경합하지 않는다.

이 판정에 맞춰 정책 본문(`../README.md`)의 가드 예시도 "이 태그는 CI가 **다시 쓴다**"에서 "CI가 **관리한다**"로
고치고, "가드는 메커니즘을 담지 않는다"는 한 줄을 더했다. SSOT가 방금 실패한 패턴을 모범으로 가르치고 있었다.

**개수도 담지 않는다 — 이 패스가 스스로 한 번 걸린 항목이다.** 이 문서의 초안은
`workflow-template.yaml` 가드를 "CI owns **both** `image:` tags below"로 썼다. 그 사이 `#38`(`33e24ea`)이
세 번째 `image:`(aggregate 템플릿)를 들여, 가드는 **착지하기도 전에** 거짓이 됐다. 메커니즘과 개수는 같은
부류다 — 둘 다 파일 밖/파일 안의 사실에 묶여 있고, 그 사실이 움직이면 아무도 검증하지 않는 주석만 조용히
거짓으로 남는다. 그래서 가드에서 대상을 세는 표현을 걷고("this file의 `image:` 태그"), 정책 본문의 가드 항에
**개수·열거·행 위치** 금지를 더했다. 리베이스 한 번에 같은 거부가 두 번 나지 않게 하는 것이 목적이다.

**기준 커밋이 세 번 움직였다.** 이 패스는 `be8616f` → `33e24ea` → `a62eae1` → `0125cae` → `e29dddd` 위로 차례로
리베이스됐다. `#41`(regression-pass)은 이 원장의 패스 이력·파일별 행을 함께 바꿨고 `#42`는 `scripts/`에 새 파일을 들였으므로,
여기 적힌 수치는 전부 **`e29dddd` 실측**으로 다시 맞춘 값이다. 가드 문면 자체는 이동마다 손댈 필요가
없었다 — 개수·메커니즘 비의존으로 썼기 때문이다. 그것이 이 판정의 요점이다.

복원 불가능해 문면 그대로 둔 것:

- `deployment.yaml` — 불변 태그이므로 기본 `imagePullPolicy`(IfNotPresent)가 옳다는 근거, 프리뷰·e2e가
  `images:`로 이미지 이름 기준 재태깅한다는 사실. Gold 부재 시 빈 데이터셋·emptyDir 오버레이 이음새.
- `kustomization.yaml` — base에 `images:` 트랜스포머를 두지 않는 이유(프리뷰의 Flux `spec.images`·e2e 오버레이와
  중첩된다).
- `workflow-template.yaml` — 엔트리포인트 2개 근거, `imagePullSecrets` 선언 위치, exit 2 재시도 금지 등.

## 판단이 갈려 남긴 것

| 대상 | 제거 쪽 근거 | 남긴 이유 |
|------|------|------|
| `deployment.yaml`의 "The tag is immutable, so the default imagePullPolicy (IfNotPresent) is correct" | 태그가 불변이라는 사실 자체는 README「이미지」가 복원한다 | 복원되는 것은 사실이고, 여기 적힌 것은 **그래서 이 필드를 비워 둔다**는 판단이다. 필드의 부재는 코드로 복원되지 않는다 |
| 두 가드의 README 절 이름 포인터 | 포인터도 결국 문서를 가리키는 되풀이라는 시각 | 포인터는 내용이 아니라 주소다. 메커니즘이 바뀌어도 절 이름은 그대로라 낡지 않는다 |

## 범위 밖(후속)

- **`deploy/batch/workflow-template.yaml`의 AC3.2 aggregate 주석 10줄**(136행 이후) — `#38`(`33e24ea`)이 들였다.
  같은 파일 안이지만 이 패스는 머리 가드 자리만 판정했고, 그 10줄은 `rct_20260918-0006`이 판정한다. 원장의
  이 파일 행이 "판정 전 46"인 것은 그 10줄을 **센** 값이라는 뜻이지 **판정한** 값이라는 뜻이 아니다.
  (여기서 함께 판정하지 않은 이유: 두 task가 같은 블록을 동시에 고치면 원장이 같은 줄을 두 번 판정하고
  두 PR이 같은 자리에서 부딪힌다.)
- `#36`(`2579722`)이 들인 33줄과 `#37`(목업 게이트)의 주석 — 이 패스가 리베이스되는 사이
  [regression-pass](2026-09-18-regression-pass.md)(`#41`, `0125cae`)가 이미 판정했다. 이 패스는 그 결과 위에서
  세 가드 자리만 만진다.
- `#39`(ingestion 시나리오 spec)가 들인 주석 — 이번 촉발(`ce54a57`) 밖이고, 원장 규약대로 다음 패스의 몫이다.
- 원장이 아직 덮지 않은 나머지 파일들(81파일 중 64파일만 행을 갖는다). `#42`가 들인
  `scripts/journey-scenarios/JRN-daily-scan.js`도 아직 판정 전이다 — 다음 패스의 몫이다.
- Python docstring 본문 · 줄 끝 주석 — 지문 사각지대. 이 패스도 보지 않았다.
