# product-surface-pass — 이 창이 들인 제품 표면(여정 시나리오 · 신설 화면) 판정

**표적 판정이다(전수 아님).** 기준 커밋 `d4a4cd2`. 추적 task는 `rct_20260919-0001`.
판정 대상은 **7파일 / 224줄** — `scripts/journey-scenarios/` 의 신설 시나리오 3개와
`web/src/screens/` 의 신설 화면 2개(+ 각 단위 테스트 2개).

판정 결과 요약: **제거 2줄 · 문면 정정 1줄 · 유지 222줄.**
레포 전체 지문은 `1859 → 1857`(파일 `111 → 111`), 파일별 원장 행은 `65 → 72`.

직전 패스(aggregation-harness-pass) 기준 커밋 `e7fbcae` 이후 창이 넓어지며 **원장에 행이 없는
파일이 32개/443줄에서 49개/888줄로 2배**가 됐다. 이 패스는 그중 제품 표면 축을 닫고,
남은 **42파일 / 664줄(전부 e2e 하네스 축)** 은 다음 패스로 넘긴다.

## 무엇을 판정했나

| 파일 | 들어온 커밋 | 주석 | 판정 |
|---|---|---:|---|
| `scripts/journey-scenarios/JRN-daily-scan.js` | `e29dddd` (#42) | 29 | 전량 유지 |
| `scripts/journey-scenarios/JRN-ingestion-recovery.js` | `3f9b2dd` (#52) | 33 | 전량 유지 |
| `scripts/journey-scenarios/JRN-logic-backfill.js` | `96ac1cb` (#57) | 38 | 전량 유지 |
| `web/src/screens/Sentiment.tsx` | `b30a321` (#53) | 56 | **제거 2줄** · 54 유지 |
| `web/src/screens/Sentiment.test.tsx` | `b30a321` (#53) | 21 | 전량 유지 |
| `web/src/screens/Trend.tsx` | `705ebe1` (#45) | 35 | **문면 정정 1줄**(줄 수 불변) |
| `web/src/screens/Trend.test.tsx` | `705ebe1` (#45) | 12 | 전량 유지 |

## 제거 — 복원 경로별 근거

### ⑴ AC 머리 배너 2줄 — `web/src/screens/Sentiment.tsx`

```
// AC3.4 (축별·분위기별 비율 집계, 미분석 분리) + AC3.6 (분위기 비율 시각화).
//
```

**복원 경로 ②(저장소 문서).** 「이 화면이 어느 AC를 받는가」는
`docs/econ-opinion-monitor-design-tracker.md` 의 「구현 전용 — mapstrip 칩」 행이
`sentiment`: `AC3.4 · AC3.6 · AC2.5` 로 적고 있고, doc-tracker 의 e2e 매핑이 같은 연결을
시나리오 축에서 한 번 더 적는다. 화면 자신도 `MapStrip` 칩으로 그 메타를 제품 평면에 노출한다
(경로 ①) — 트래커가 그 노출을 **유지로 판정**한 표면이다.

정책의 제거 유형 「작업 흔적 — 파일 머리의 AC·슬라이스 배너」에 정면으로 해당하고,
initial-pass가 `web/src/screens/Compare.tsx` 머리에서 `AC3.7 … (J2 / V2)` 배너를 **같은 자리·같은
근거로** 지웠다. `deploy/batch/cronworkflow-ingestion.yaml` 의 AC1.1 배너 10줄도 같은 유형이다.

산문 2줄이 아니라 배너 1줄과 뒤따르는 매달린 `//` 1줄을 함께 걷어, 머리가 `Compare.tsx` 와 같은
형태(배너 없이 바로 설계 근거로 시작)가 됐다. regression-pass가 `JRN-spike-verification.js` 에서
산문과 매달린 ` *` 를 함께 걷은 것과 같은 처리다.

### ⑵ AC 배너 접두 문면 정정 — `web/src/screens/Trend.tsx` (줄 수 불변)

```
- // AC3.5 — 대상 추세 상세. The chart's job is to answer "where is attention
- // moving", so the selected subject is drawn against the axis's other leaders
- // rather than alone; a single line has nothing to be high or low against.
+ // The chart's job is to answer "where is attention moving", so the selected
+ // subject is drawn against the axis's other leaders rather than alone; a
+ // single line has nothing to be high or low against.
```

⑴과 **같은 유형**(AC 머리 배너)이지만 배너가 설계 근거와 한 줄에 붙어 있어, 줄을 지우면
복원 불가능한 근거("단일 계열은 높고 낮을 대상이 없다")까지 함께 사라진다. 그래서 삭제가 아니라
접두 삭제 + 재배치로 처리했다 — `deploy/base/kustomization.yaml` 의 문면 정정(pin-guard-pass,
`9 | 0 | 9`)과 같은 형태다.

**이것을 함께 하지 않으면** 같은 유형이 자매 화면 둘에 두 형태로 남는다. 원장의
「각 행은 마지막으로 판정한 패스 기준」 규칙상 그 상태는 다음 패스에서 「한쪽은 판정됐고 한쪽은
아니다」로 읽히지 않고 **두 판정이 갈린 것**으로 읽힌다.

### 따라온 원본 보정 — `docs/econ-opinion-monitor-design-tracker.md`

⑴의 −2줄 시프트로 트래커가 `Sentiment.tsx` 를 **줄 번호로 인용한 8곳**이 한꺼번에 낡는다.
정책의 「원본이 부실해지면 원본을 고친다」에 따라 같은 변경으로 보정했다:
`:26-31`→`:24-29` · `:32-35`→`:30-33` · `:57-60`→`:55-58` · `:61`→`:59` · `:81-92`→`:79-90` ·
`:265`→`:263` · `:313-317`→`:311-315` · `:396-398`→`:394-396`.
보정 후 13개 경계 줄이 보정 전과 **같은 내용**을 가리키는 것을 대조로 확인했다.
행 개수·처분·산문 숫자는 건드리지 않았다. 같은 행의 `aggregate.py` 인용 `:138` 은 대상이 아니다.

## 유지 — 근거

- **`JRN-*.js` 3파일 100줄 전량.** 머리는 훅 목록 4줄뿐이고(아래 절), 본문은 조작별 의도
  (`/* 화면 2 → 3. 전진은 대상 선택을 요구하므로 선행 행동을 먼저 한다. */`), 상태 라벨
  (`empty-window — 밤사이 수집이 들어오지 않은 축`, `dup-again — 덮어쓰기로 실행하면 중복이 다시 쌓인다`),
  jsdom `.value` 함정이다. 「어떤 컨트롤을 어떻게 만지면 그 상태가 되는가」는 러너도 목업 SSOT도
  적지 않는다 — 그게 이 파일들이 존재하는 이유다.
- **`Sentiment.tsx` 54줄 · `Trend.tsx` 35줄.** 미분석을 네 분류에 접지 않는 이유(접으면 분석분의
  40%가 전체의 40%로 조용히 바뀐다), 도넛이 analyzed 몫으로 닫히는 근거, `PAT-stacked-sentiment`
  의 「막대 높이는 구성이지 규모가 아니다」, 결측 버킷을 공백으로 두는 이유(당기면 다른 대상의
  타임라인을 같은 눈금 아래 그리게 된다) — 목업도 PRD도 **왜 그렇게 그리는가**는 적지 않는다.
- **단위 테스트 2파일 33줄.** 「기대값을 상수로 박지 않는다」, 스케일 상수가 상쇄되므로 비율만
  비교한다는 근거, 한 document 를 공유해 행 단위로 스코프하는 이유(자동 cleanup 부재),
  「상승 점유율은 falling y 로 와야 한다 — 반전 스케일을 잡는다」. 정책이 이름을 댄 유지 대상
  「테스트가 **왜 그 모양으로** 단언하는지」 그 자체다.

## 판단이 갈려 남긴 것

- **`JRN-*.js` 머리의 훅 목록 4줄** (`inputs(t) (d) …` / `states(t) (e) …` / `unlock (c) …` /
  `renders(t) (h) …`). 러너 `scripts/check-journey-flow.js` 가 각 훅을 이름으로 부르며 의미를
  자기 실패 메시지에 적으므로(`시나리오에 inputs() 가 없다 — (d) 의 '값 변경이 렌더를 바꾸는가' 를
  못 본다`) 경로 ①이 성립한다고 볼 여지가 있다. 그러나 initial-pass가 `JRN-sentiment-shift.js`
  에서 **이 목록을 명시적으로 유지 판정**했고(원장 행 `제거 7줄 — 역할 분담 재진술 … 유지: 시나리오 훅
  목록`), 새 3파일은 그 유지된 형태를 그대로 따른 것이다. 「애매하면 남긴다」로 유지한다.
- **`Sentiment.tsx` 의 두 블록**(허위 컨트롤 판단 `:24-29`·`:30-33`, 고정 임계 사유 `:55-58`).
  design-tracker 가 같은 근거를 등재하며 **「기준 6이 지정한 자리가 코드 주석이 아니라 여기이므로
  승격해 등재한다」**고 적었다 — 문자 그대로 읽으면 경로 ②가 성립하고 제거 대상이다. 유지하는
  이유는 트래커 행들이 이 블록을 **줄 번호로 인용**하고 있어, 제거가 자매 모델 행의 처분과 한
  덩어리이기 때문이다. 트래커가 그 행을 닫을 때 함께 본다.
- **`Trend.tsx:8-21` 의 「deliberately *not* here」 두 항.** 트래커가 같은 사유를 등재하면서
  **AC3.3 롤업이 착지할 때 이 주석과 함께 걷어낸다**고 처분 시점을 못박았다(「구현 전용 — 롤업 부재
  안내」 행). 지금 지우면 자매 모델이 예약한 처분을 앞질러 집행하는 것이 된다.

## 정정 — 「JRN 머리 형태의 선례가 갈렸다」는 오독이다

이 task의 감지 단계가 planner에 「`JRN-*.js` 훅 목록의 선례가 갈려 있다(spike는 전량 제거,
sentiment-shift는 유지)」를 갈래로 인계했다. git으로 확인한 결과 **선례는 갈리지 않았다.**

| 파일 | 신설 시점 머리 | 지운 것 | 훅 목록 |
|---|---|---|---|
| `JRN-spike-verification.js` | `2579722` — 역할 분담 산문 3줄 | 그 3줄 + 매달린 ` *` (regression-pass) | **애초에 없었다** |
| `JRN-axis-contrast.js` | `9d6122b` — 역할 분담 산문 3줄 | 그 4줄 (initial-pass) | **애초에 없었다** |
| `JRN-sentiment-shift.js` | `9d6122b` — 역할 분담 산문 5줄 **+ 훅 목록 4줄** | 역할 분담 7줄만 (initial-pass) | **유지 판정** |

즉 두 패스가 일관되게 지운 것은 **러너/시나리오 역할 분담 재진술**이고, 훅 목록은 그것을 가졌던
단 하나의 파일에서 유지됐다. 새 3파일은 역할 분담 산문 없이 훅 목록만 달고 왔으므로 **이미 판정 후
형태를 따르고 있다**. `JRN-sentiment-shift.js` 재판정도, 훅 목록을 규약으로 승격하거나 철회하는
결정도 필요 없다.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

원장에 행이 없는 파일이 **42개 / 664줄** 남는다 — 전부 e2e 하네스 축이다.

| 묶음 | 파일 | 줄 |
|---|---:|---:|
| `tests/e2e/specs/` (시나리오별 spec) | 16 | 324 |
| `tests/e2e/k8s/batch/` (Job·더블 매니페스트) | 18 | 149 |
| `tests/e2e/lib/` (계층별 단언 헬퍼) | 6 | 167 |
| `tests/e2e/fixtures/{feeds,llm}/server.py` | 2 | 24 |

더해, **이미 행이 있는 파일에 이 창이 들인 108줄**의 재판정이 원장 `읽는 법` 4번째 항목으로
예약돼 있다.

표본 조사에서 본 것(판정이 아니라 다음 패스를 위한 메모): 이 축에는 **구분선 재발이 0건**이고,
문면은 「픽스처가 실환경과 갈리는 지점」·「왜 그 모양으로 단언하는지」 계열이 많다. 제거 후보는
spec 머리의 시나리오 본문 재진술(테스트 문서가 복원)에 몰려 있을 것으로 보이나, 그 재진술이
곧바로 「그래서 이 spec 은 이렇게 쪼갰다」의 전제로 쓰이는 형태라 줄 단위로 잘라내기 어렵다.
**판정하지 않은 것을 판정했다고 적지 않는다** — 위 42파일은 원장에 행이 없는 상태로 남는다.
