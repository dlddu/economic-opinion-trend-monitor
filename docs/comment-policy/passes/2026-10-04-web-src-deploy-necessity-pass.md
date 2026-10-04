# 2026-10-04 web-src-deploy-necessity-pass — `web/src` 화면·API·셸 · 배포·이미지 일부 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261004-0002`.

## 판정 범위

L 표의 `—` 행 중 `web/src/` 아래 전부(`tokens/tokens.css` 제외 — 24행 374줄)와, 예산을 채우는 배포·이미지 6행
(`Dockerfile`·`Dockerfile.batch`·`deploy/base/kustomization.yaml`·`deploy/base/rbac.yaml`·
`deploy/batch/kustomization.yaml`·`deploy/batch/cronworkflow-ingestion.yaml` — 26줄)을 묶었다. 각 파일이 한 덩어리다.
**판정 전 400줄(L 400) → 308줄, 제거 92.** 예산 400줄을 다 썼다. `tokens.css`(63줄)는 넣으면 437줄이라 예산을 넘어 뺐다.

코드 변경 0 — TS/TSX 15파일은 TypeScript 프린터(`removeComments`)로 주석을 걷은 출력이 base 와 같다
(빈 JSX 표현식 `{}`·공백 줄은 정규화; 코드 토큰 하나를 바꾸는 음성 프로브는 DIFF 로 잡힌다). 배포·이미지 6파일은 diff 가 없다.

`web/src` 의 `CMP-*`/`PAT-*` 마커 집합(`scripts/check-mockup-render.py` R3 의 구현측 모집단)은 base 와 같다(28종) —
마커를 담은 주석은 한 줄도 걷지 않았고, R3 출력은 바이트 동일하다.

doc 주석 수준(TS: export 함수의 JSDoc 요약 1줄)은 그대로 두었다(`useTopbar`). 인터페이스·비공개 함수·prop 의 JSDoc 은
수준 밖이라 필요성 시험을 받았다.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---|---|---:|
| `Dockerfile` | L 2 | L 2 | 0 |
| `Dockerfile.batch` | L 8 | L 8 | 0 |
| `deploy/base/kustomization.yaml` | L 5 | L 5 | 0 |
| `deploy/base/rbac.yaml` | L 3 | L 3 | 0 |
| `deploy/batch/cronworkflow-ingestion.yaml` | L 5 | L 5 | 0 |
| `deploy/batch/kustomization.yaml` | L 3 | L 3 | 0 |
| `web/src/api/client.ts` | L 14 | L 10 | 4 |
| `web/src/api/types.ts` | L 21 | L 11 | 10 |
| `web/src/screens/Compare.tsx` | L 10 | L 8 | 2 |
| `web/src/screens/Dashboard.test.tsx` | L 3 | L 3 | 0 |
| `web/src/screens/Dashboard.tsx` | L 12 | L 10 | 2 |
| `web/src/screens/Debug.test.tsx` | L 2 | L 2 | 0 |
| `web/src/screens/Debug.tsx` | L 8 | L 8 | 0 |
| `web/src/screens/Fairness.test.tsx` | L 26 | L 16 | 10 |
| `web/src/screens/Fairness.tsx` | L 44 | L 30 | 14 |
| `web/src/screens/Reprocess.test.tsx` | L 23 | L 10 | 13 |
| `web/src/screens/Reprocess.tsx` | L 14 | L 13 | 1 |
| `web/src/screens/ReprocessTrigger.tsx` | L 8 | L 5 | 3 |
| `web/src/screens/Sentiment.test.tsx` | L 17 | L 15 | 2 |
| `web/src/screens/Sentiment.tsx` | L 56 | L 50 | 6 |
| `web/src/screens/Trace.test.tsx` | L 20 | L 5 | 15 |
| `web/src/screens/Trace.tsx` | L 17 | L 13 | 4 |
| `web/src/screens/Trend.test.tsx` | L 15 | L 14 | 1 |
| `web/src/screens/Trend.tsx` | L 57 | L 52 | 5 |
| `web/src/shell/AppShell.tsx` | L 1 | L 1 | 0 |
| `web/src/shell/MapStrip.tsx` | L 1 | L 1 | 0 |
| `web/src/shell/Sidebar.tsx` | L 1 | L 1 | 0 |
| `web/src/shell/Topbar.tsx` | L 1 | L 1 | 0 |
| `web/src/shell/nav.ts` | L 1 | L 1 | 0 |
| `web/src/shell/topbarSlot.ts` | L 2 | L 2 | 0 |

## 제거 유형

| 유형 | 자리 |
|---|---|
| 테스트 이름·바로 아래 단언 재진술 | `Trace.test.tsx` 15 · `Reprocess.test.tsx` 13 · `Fairness.test.tsx` 9 · `stubSentiment`·`stubTrend`·`calledUrl` JSDoc |
| 이름·시그니처·필드 재진술 | `types.ts` 인터페이스 JSDoc 10 · `client.ts` 선택 인자 4 · `CLASSES`·`bucketTick`(두 화면)·`shareIn`·`Mode`·`COMPARE_STROKES`·`ReprocessTrigger` prop 2 |
| 다른 주석의 사본 | `Fairness.tsx` 머리의 기사 목록·「합 = 값」 문단(주인은 `reconciles`·`rawAdds` 위 주석) · `Compare.tsx` 머리의 공유 최대값(주인은 `maxShare` 위) · `Sentiment.tsx` `segments` 의 e2e spec 근거(주인은 단위 테스트의 비율 단언 주석) |
| 저장소 문서 재진술 | `Trace.tsx` 머리의 화면 존재 이유(여정 문서) · AC 번호 꼬리표 |
| 작업 흔적 | 여정·단계 표지(`JRN-daily-scan 화면 1 · STP-open-brief`·`STP-open-brief` 카드·`STP-*` 열거 머리·`#trend-form`·`STP-verify-in-trend` 위치 표지) · 「the stub endpoint could never tell apart」 경위 |

`STP-*`·`JRN-*` 표지는 어느 게이트도 `web/src` 주석에서 읽지 않는다(`check-mockup-render.py` 의 `markers()` 는 `CMP-*`/`PAT-*` 만,
`check-journey-*.{py,js}` 는 `docs/mockups/` 를 읽는다).

## 틀린 주석 고침

- `web/src/screens/Trend.tsx` — 「시간 단위는 버킷이 수십~수백 개라 버킷마다 라벨을 찍으면 글자가 겹쳐 읽을 수 없다」가
  `GRID_ROWS`(세로 칸 수) 위에 붙어 있었다. 이 사유는 x 라벨 상한 `MAX_X_TICKS` 의 것이라 그 위로 옮겼다.
- `web/src/screens/Fairness.test.tsx` — 「분해가 없는 버킷은 0% 로 그리지 않는다」가 집중도 블록 머리 테스트 위에 붙어 있었다.
  그 명제의 테스트(`draws nothing rather than zeroes …`)는 바로 아래에 있고 이름이 같은 말을 하므로, 옮기지 않고 지웠다.
- `web/src/screens/Reprocess.tsx` 머리 — 「읽는 둘 … 일으키는 셋은 `ReprocessTrigger` 가 그린다」는 단계 열거를 걷고
  쓰기 단계의 주인을 가리키는 한 줄로 개작했다.

## 판단이 갈린 것

- **설계 트래커의 줄 번호 인용은 고치지 않았다.** `docs/econ-opinion-monitor-design-tracker.md` 는 `Fairness.tsx:70`·
  `Compare.tsx:105-107`·`Sentiment.tsx:263` 처럼 화면 소스를 줄 번호로 인용한다. 이 패스의 삭제로 그 번호가 움직이지만,
  base(`a047363`)에서 이미 그 번호들 상당수가 다른 줄을 가리킨다(`Fairness.tsx:70` 은 빈 줄 · `Sentiment.tsx:263` 은 `</div>` ·
  `Compare.tsx:105-107` 은 `</div>`/그리드 여는 줄) — 인용은 등재 시점의 스냅숏이고 어느 게이트도 읽지 않는다.
  트래커가 **주석 자체**를 근거로 인용하는 자리(`Fairness.tsx:13`·`Trace.tsx:7` 의 「급등 검증」, `Trend.tsx` 머리의
  「두지 않은 두 가지」, `Sentiment.tsx` 머리의 같은 문단)는 내용을 남겨 인용의 명제가 계속 선다.
- `Trace.test.tsx` 의 `// CMP-crumb draws every hop, …` 은 바로 아래 단언의 재진술이지만 남겼다 — 마커 이름을 담은 주석을
  이 패스에서는 하나도 걷지 않는다는 규칙(R3 모집단 불변)을 예외 없이 지키기 위해서다.

## 유지 목록 (필요 사유)

- `Dockerfile` — L: Gold 데이터가 이미지에 없고 실행 시 `ECON_DATA_ROOT` 마운트로 온다는 2줄(지우면 데이터를 이미지에 굽는 쪽으로 판단한다).
- `Dockerfile.batch` — L: 배치 이미지의 데이터 레이크 마운트 2줄 · uv 이미지 단일 스테이지인 이유 4줄(`uv sync` 가 venv 콘솔 스크립트에 절대 경로를 굽는다 — 지우면 멀티 스테이지로 「최적화」해 깨뜨린다) · `--frozen`·`--no-dev` 플래그 이유 2줄.
- `deploy/base/kustomization.yaml` — L: `images:` 변환기를 두지 않는 이유 5줄(태그 출처는 `deployment.yaml` 의 `image:` 하나 — 지우면 두 번째 항목을 더해 preview·e2e 재태깅과 겹친다).
- `deploy/base/rbac.yaml` — L: 서빙 SA 가 Workflow 제출·조회만 하도록 동사를 깎은 이유 3줄(지우면 권한을 넓혀도 되는 것으로 읽는다).
- `deploy/batch/cronworkflow-ingestion.yaml` — L: 주기 id 파생·주기 멱등 3줄 · 30분 누락 보정 1줄 · 다음 틱 전에 포기해 `Forbid` 가 막지 않게 하는 1줄 — 스케줄 계약의 근거.
- `deploy/batch/kustomization.yaml` — L: 오버레이가 배치를 명시적으로 들이는 이유 3줄(kind e2e 오버레이가 상속하면 `kind load` 가 싣지 않은 배치 이미지를 당긴다).
- `web/src/api/client.ts` — L: 상대 `/api` 기반이 dev·prod 양쪽에서 맞는 이유 3줄 · 쓰기 경로 거절 문면을 그대로 보여 준다는 1줄 · 비JSON 거절의 상태 줄 1줄 · `sentiment` 축이 서버 파라미터인 이유 2줄(비교 버킷이 모든 축에서 골라진다) · `reprocess` 선택이 서버 측인 이유 3줄.
- `web/src/api/types.ts` — L: 손으로 유지하는 서빙 API 뷰라는 머리 3줄(지우면 codegen 산출물로 보고 재생성을 찾는다) · 필드로 드러나지 않는 의미 JSDoc 6줄(`DashRow` 최신 버킷 · `TrendSeries` `selected` 정확히 하나 · `SentimentAxisRow` 비교 버킷 · `FairnessRow` 같은 버킷의 두 계수 · `ReprocessScope` 목표 분석기 버전 기준 · `ReprocessDecision` 마지막 항목이 Gold 서빙 버전) · `CMP-crumb`·`PAT-before-after` 마커 2줄(`check-mockup-render.py` R3 가 읽는다).
- `web/src/screens/Compare.tsx` — L: 머리 3줄(공통 기준을 가정하지 않고 열 위에 적는 이유) · 공유 최대값 2줄 · 수집 없는 축을 0% 로 그리지 않는 이유 3줄.
- `web/src/screens/Dashboard.test.tsx` — L: 자동 cleanup 이 없어 `cleanup()`·`localStorage.clear()` 를 부르는 이유 3줄.
- `web/src/screens/Dashboard.tsx` — L: 화면 2·3 컨트롤을 두지 않는 가드 1줄 · `RANK_SHIFT_NOTE` 문턱 근거 1줄 · 목업 `dcls` 문턱과 같아야 하는 1줄 · 저장소 수명을 `localStorage` 로 정한 근거 3줄 · catch 근거의 주인을 가리키는 1줄 · 대소문자 구분이 목업과 같다는 1줄 · `CMP-metric`·`CMP-spark` 마커 2줄(R3).
- `web/src/screens/Debug.test.tsx` — L: 픽스처 객체에서 기대값을 읽는 이유 2줄(리터럴 사본이 낡지 않게).
- `web/src/screens/Debug.tsx` — L: 마지막 JSON 을 읽는 이유 3줄(초안을 읽으면 파서 결함이 모델 결함처럼 보인다) · catch 가 비JSON 중괄호를 지나치는 1줄 · `CMP-kv`·`CMP-table`·`CMP-metric` 마커 4줄(R3 — 수집 패널을 세우지 않는 가드 포함).
- `web/src/screens/Fairness.test.tsx` — L: 스텁이 기대값의 출처라는 4줄 · 기사 목록 스텁을 url 로 가르는 이유 2줄 · 분기 순서가 곧 라우팅인 2줄 · `shareCells` 열 순서 1줄 · container 범위 조회 이유 2줄 · 등식 단정이 공전하지 않게 하는 2줄 · 목록 불일치 note 가 없으면 검증 없이 통과하는 2줄 · 좁혀도 전체 건수를 적는 1줄.
- `web/src/screens/Fairness.tsx` — L: 머리 「급등 검증」 크럼 1줄(설계 트래커가 이 줄을 인용한다) · 대조가 화면의 중심인 이유 5줄 · 분해가 집계의 항 그대로여야 하는 이유 4줄 · 순위가 세는 방식을 따르는 2줄 · 기본 대상 2줄 · 두 합 등식 2줄 · 건수 등식 2줄 · `CMP-*`/`PAT-*` 마커 10줄(R3, 허위 컨트롤 아님 근거 포함) · 문단 사이 빈 `//` 2줄.
- `web/src/screens/Reprocess.test.tsx` — L: 스텁이 기대값의 출처라는 1줄 · 서버 순서 픽스처 1줄 · `stubWrites` 동작 1줄 · 축 전환이 소스를 버리는 이유 1줄 · 실패한 전체 실행이 재시작이 아니라 재개인 근거 3줄 · 결정 기록 단언의 범위 3줄.
- `web/src/screens/Reprocess.tsx` — L: 쓰기 단계 주인 지시 1줄 · 서버 정렬 기본 1줄 · 임계가 화면 상태인 이유 1줄 · 소스를 축 사이로 들고 가지 않는 1줄 · `CMP-*`/`PAT-*` 마커 9줄(R3).
- `web/src/screens/ReprocessTrigger.tsx` — L: 무엇을·왜·언제의 주인이 `reprocess_trigger.go` 머리라는 1줄 · 놓친 폴링을 오류로 보이지 않는 1줄 · `CMP-table`·`CMP-kv` 마커 3줄(R3).
- `web/src/screens/Sentiment.test.tsx` — L: 스텁 유도 2줄 · 라우터 컨텍스트 이유 1줄 · 비율로 단언하는 이유 3줄 · 미분석을 합치면 갈림이 무너지는 3줄 · 행 범위 조회 3줄 · 컨트롤로 조회하는 이유 2줄 · 두 형태가 실제로 다름을 먼저 막는 1줄.
- `web/src/screens/Sentiment.tsx` — L: 두 물음·두 모양 5줄 · 미분석을 접지 않는 불변식 5줄 · 목업이 그리는데 두지 않은 두 가지 11줄(설계 트래커가 인용한다) · `UNANALYZED` 분리 1줄 · 고정 임계 4줄 · 대시보드 막대와 같은 스케일 3줄 · 반올림 오차 1줄 · `SplitRatios` 두 분모 1줄 · 마커·근거 블록(`CMP-*`·`PAT-donut`·`PAT-stacked-sentiment` — R3) 17줄 · 문단 사이 빈 `//` 2줄.
- `web/src/screens/Trace.test.tsx` — L: 픽스처 유도 3줄 · `CMP-crumb` 단언 1줄 · 제외된 레코드도 분석은 됐다는 1줄(크럼에 gap 이 없어야 하는 근거).
- `web/src/screens/Trace.tsx` — L: 「급등 검증」 크럼 1줄(설계 트래커가 인용한다) · 미분석 배지 색 1줄 · `linkDead` 의미 1줄 · 조회 축·접두 가드 2줄 · `CMP-*`/`PAT-lineage` 마커 7줄(R3 — 열지 않은 단계 note 포함) · 제외 ≠ 중립 가드 1줄.
- `web/src/screens/Trend.test.tsx` — L: 저장소 정리 1줄 · 뒤집힌 스케일을 잡는 이유 3줄 · `[hidden]` 캐스케이드를 토큰에서 보는 이유 3줄 · 비교 표가 picker 인 이유 3줄 · 평균이 헤드라인 값과 달라야 하는 3줄 · 두 폼 배너가 별개인 1줄.
- `web/src/screens/Trend.tsx` — L: 목업이 그리는데 두지 않은 두 가지 12줄(설계 트래커가 인용한다) · viewBox 좌표 1줄 · x 라벨 상한 1줄 · 구간 평균 2줄 · 목업 `trendSeries()` 와 같은 규칙 1줄 · 수명 2줄 · 스토리지 실패 2줄 · 화면이 드는 상태 6줄 · 축 사이 선택 버림 2줄 · picker 를 두지 않는 1줄 · 접두 가드 2줄 · 실패 분리 1줄 · 목업 조사 1줄 · `compareIndex` 1줄 · 차트 스케일·간격·라벨·색 7줄 · `CMP-*`/`PAT-line-chart` 마커 10줄(R3).
- `web/src/shell/AppShell.tsx` — L: `PAT-screen-shell` 마커 1줄(R3).
- `web/src/shell/MapStrip.tsx` — L: `CMP-mapstrip` 마커 1줄(R3).
- `web/src/shell/Sidebar.tsx` — L: `CMP-sidebar` 마커 1줄(R3).
- `web/src/shell/Topbar.tsx` — L: `CMP-topbar` 마커 1줄(R3).
- `web/src/shell/nav.ts` — L: 화면 id 가 목업 인덱스의 화면이라는 1줄(라우트 표를 목업과 맞춰 고치게 한다).
- `web/src/shell/topbarSlot.ts` — L: `CMP-topbar` 화면별 슬롯 마커 1줄(R3) · export 함수 `useTopbar` 요약 1줄 — doc 주석 수준.
