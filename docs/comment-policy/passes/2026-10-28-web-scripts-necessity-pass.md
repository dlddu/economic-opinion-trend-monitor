# 2026-10-28 web-scripts-necessity-pass — web 화면 4 · 여정 하네스 9 파일 필요성 판정

판정 모집단은 원장에서 아직 `—` 인 행 가운데 **열린 PR #270 이 가져간 파일(`go/**` · `python/**` · `tests/e2e/lib/gold.ts`)을 뺀 나머지 전부**다.
두 덩어리이고 둘을 합쳐 **L 315줄**(web 124 · scripts 191) + D 26 + E 13 이 예산(400줄) 안에 든다.

- web — `web/src/api/types.ts` · `web/src/screens/Dashboard.tsx` · `web/src/screens/Sentiment.tsx`(웹 수렴 fix #269~#273 이 5줄을 더했다) · `web/src/tokens/tokens.css`
- scripts — `scripts/check-journey-flow.js` · `scripts/check-journey-mockup.py`(L · D · E) · `scripts/journey-scenarios/JRN-*.js` 7파일(요건 9 재작업이 다시 쓴 시나리오)

옛 판정은 `passes/2026-10-04-*` 등이 정본이다. 이 패스는 그 줄들의 **현재 지문**에 대해 다시 시험했고, 옛 유지 사유가 그대로 서는 줄은 같은 사유로 유지했다.

## 결과 — L 315줄 중 제거 77 · 유지 238 / D 26 · E 13 전량 유지

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `web/src/api/types.ts` · L | 12 → 12 | 유지 12 |
| `web/src/screens/Dashboard.tsx` · L | 11 → 10 | 제거 1 |
| `web/src/screens/Sentiment.tsx` · L | 55 → 43 | 제거 12 |
| `web/src/tokens/tokens.css` · L | 46 → 46 | 유지 46(`* {` 1줄은 주석이 아니다) |
| `scripts/check-journey-flow.js` · L / E | 30 → 24 / 1 → 1 | 제거 6 / 유지 1 |
| `scripts/check-journey-mockup.py` · L / D / E | 38 → 26 / 26 → 26 / 12 → 12 | 제거 12 / 유지 / 유지 |
| `scripts/journey-scenarios/JRN-*.js` 7 · L | 84 → 38 | 제거 46 |

## 제거

- **작업 흔적·이름의 재진술 — 시나리오 7파일의 「단계 N — 제목」 구분 주석(41줄)**. 제목은 여정 문서의 단계 제목을 옮긴 것이고 코드는 이미 `S1`~`S5` 상수로 단계를 말한다. 2026-10-04 판정이 같은 구분 주석을 같은 이유로 걷었는데 요건 9 재작업이 다시 들였다. 「데이터로 도달하는 상태」 구분 2줄도 같은 종류다.
- **이름의 재진술** — `JRN-ingestion-recovery.js` 구간·소스 고르기 보조 함수 doc 2줄 · `JRN-judgment-debug.js` 레코드 고르기 doc 1줄(바로 아래 분기가 폴백을 그대로 읽힌다).
- **다른 주석의 사본** — `check-journey-mockup.py` 의 `R14` 절 머리 상자 12줄(모듈 docstring `R14` 항목이 같은 규칙과 같은 조건을 적는다. 정본은 docstring 이다). `check-journey-flow.js` 머리의 「범용 러너 · 항목 나열」 5줄(바로 아래 코드와 시나리오 분리 문단이 말한다) · 「화면 단위 파일은 자연히 제외」 1줄(`check-journey-mockup.py` 의 같은 `continue` 가 주인).
- **코드 재진술** — `Dashboard.tsx` `applyWindow` 위 「고르는 즉시 다시 조회한다」(`useEffect` 의존 배열과 `setReapplying` 호출).
- **사본 + 재진술** — `Sentiment.tsx` 화면 머리 「두 질문에 두 모양」 6줄(컴포넌트 구성이 말한다) · `MIN_SAMPLE` 둘째 줄 · `SentimentAxisRow` 위 JSDoc(`CMP-sentbar` 마커는 JSX 안에 있다) · 구간 고르기 JSDoc · `PAT-donut` 의 고리 서술 3줄(머리의 「미분석을 접지 않는다」와 같은 말).
- **개작(줄 수 불변)** — `Sentiment.tsx` `CMP-seg` 꼬리 설명 · 구간별 건수 끝 문장(`unanalyzedCount` doc 이 주인).

## 유지 — 사유

- `types.ts` 12 — 손으로 유지하는 서빙 API 뷰라는 머리 3줄(지우면 codegen 산출물로 보고 재생성을 찾는다) · `AxisSource` 의 `ALL` 은 세 축을 접은 범위이고 대시보드·추이만 서빙한다(다른 화면 타입에 쓰면 서빙이 거부한다) · 필드로 드러나지 않는 의미 JSDoc 6 · `CMP-crumb`·`PAT-before-after` 마커 2(`check-mockup-render.py` R3 이 읽는다).
- `Dashboard.tsx` 10 — 화면 2·3 컨트롤을 두지 않는 가드(허위 컨트롤 금지) · 순위·증감은 기간 전체 기준이고 단위는 스파크라인 칸일 뿐이라는 1줄(단위가 순위를 바꾼다고 읽기 쉽다) · 단위 칸 수가 서빙의 시간 단위 읽기와 같아야 한다 · 목업 `dcls` 문턱과 같아야 하는 2줄 · 저장소 수명 근거 2줄 · catch 근거의 주인 포인터 · `CMP-metric`·`CMP-spark` 마커.
- `Sentiment.tsx` 43 — 미분석을 접지 않는 이유(지우면 분석된 절반의 비율을 전체의 비율로 읽는다) 5 · 목업에는 있으나 두지 않은 기간/단위 폼·대상 picker와 그 근거 11(지우면 받는 곳 없는 폼을 되살린다) · `UNANALYZED` 분리 이유 · 고정 문턱 4 · 분위기 스케일이 대시보드와 같아야 하는 3 · 되짚은 건수의 반올림 오차 1 · `MIN_SAMPLE` 근거 1 · 마커 5 · `PAT-donut` 중심 건수가 표본 크기를 말한다 2 · 두 분모 1 · `PAT-stacked-sentiment` 의 같은 높이·미분석 맨 위 6 · 구간별 건수 2.
- `tokens.css` 46 — `TKN-*` 9 · `CMP-*`/`PAT-*`/`STP-*` 절 머리는 디자인 시스템·목업 단계와 값이 **같아야 하는** 자리의 추적 앵커(2026-10-04 패스의 판정 그대로) · 사이드바 레일·note 간격·`1180px` 우선순위·`<button>` 리셋 해제·정규화 대비·건수 구분·`.trace-` 접두·끊긴 홉·주소 생략 금지·`.btn.pri` 공유 예외·`.dbg-metric` 패딩(옛 판정 유지분, 지우면 조용히 뒤쪽 규칙이 이기거나 목업 대조가 신호를 못 준다) · `ALL` 을 중립색으로 그리는 이유 · 접두 규약 절 머리 4(`.trend-ov-`·`.dash-brief-`·`.rp-` — 어느 목업 선언을 옮겼고 예외가 무엇인지). `* {` 는 CSS 선택자이고 주석이 아니라 지문 스캐너 오탐이다.
- `check-journey-flow.js` 24 — 동적 구동이어야 하는 이유(배선 끊긴 버튼과 살아 있는 버튼은 정적으로 같다) · 기대값은 페이지 밖 SSOT(자기참조는 어떤 변조도 통과) · 시나리오 분리와 fail-closed · `require` 상대 경로 해석 · 상태 표 첫 칸만 읽는다 · unlock 훅 · 마지막 단계에 닫는 폼을 요구하지 않는 이유 2 · `(i)` 규칙 머리. E 1 — 집합 불일치는 `(e)` 가 이미 잡는다.
- `check-journey-mockup.py` L 26 · D 26 · E 12 — 옛 판정 유지분 그대로(HTML 주석 선제거 · 헤더 판정 · `<body>` 선분리 · 정적 판정의 한계 · `.seg` 관용구 금지 · 분기 대조 순서 · 타 여정 조각 착지 · 상한 래칫 · 템플릿 오탐) + 모듈 docstring 의 `R1`~`R14` 규칙 목록(정본). E 는 빈 리터럴 `{}` 가 가리는 값 모양과 `continue` 이유.
- 시나리오 7파일 38 — 같은 화면을 단계마다 다시 그려 id 가 겹치므로 `[data-role]` 로 찾는다는 머리 · `unlock` 이 비어 있거나 조건을 요구하는 이유 · 픽스처 구간에 묶인 값 · 표가 다시 그려져 매번 다시 찾는다 · 300ms 로딩 확인 · 데이터로 도달할 수 없는 상태는 딥링크로 열고 하네스 `(i)` 가 확인한다.

## 범위 밖 (이 패스가 가져가지 않은 것)

PR #270(`rct_20261028-0001`)이 가져간 14행(`go/**` · `python/**` · `tests/e2e/lib/gold.ts`)은 #270 이 착지하면 `완료` 가 된다. 두 PR 은 원장의 서로 다른 행만 건드린다.
