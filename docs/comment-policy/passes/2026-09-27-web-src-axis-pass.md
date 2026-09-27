# 2026-09-27 — web-src-axis-pass

`web/src/**` 의 L 표면 중 `screens/Fairness.tsx`·`screens/Fairness.test.tsx` 두 행을 뺀
**23행 399줄**을 ①②③④ 네 축 전건 판정. 제거 **50줄** · 개작 3자리 · **행 소멸 2**
(`web/src/App.tsx` · `web/src/screens/Placeholder.tsx` — 판정 대상 주석 0줄).

reconcile task `rct_20260927-0002` (`tbm_econ-opinion-monitor-comment-redundancy`).

## 범위를 이렇게 고른 이유

판정 미완 잔여는 슬라이스 시작 시점에 **45행 695줄**(게이트 자기출력)이고 예산은 400줄이라 최소
두 슬라이스다. L 행은 파일 집합이 서로소라 덩어리가 전부 싱글턴이므로 조합이 자유롭고, 400에
닿는 자연스러운 절단면은 둘뿐이었다 — `App.tsx + api/ + screens/`(399) 와
`web/src/** − Fairness 쌍`(399). 후자를 골랐다:

- 열린 PR 은 0건이지만 자매 모델 `tbm_econ-opinion-monitor-docs-impl` 이 **AC3.9 소스별 기여
  분해**를 계획 중이고(`rct_20260927-0003`), 그 구현은 `Fairness.tsx` 의 부재 사유 note 를 지우고
  `Fairness.test.tsx` 의 같은 문면 단정을 갈아야 한다. 두 행을 지금 판정하면 그 착지가 곧
  지문을 움직여 판정 축을 `—` 로 되돌린다 — 판정이 곧 무효가 되는 자리다.
- 그 PR 은 `contracts/gold/` 접촉이라 `SENSITIVE_PATHS` 뒤(사람 승인)이고, 이 슬라이스는
  `web/src/**` + `docs/comment-policy/` 뿐이라 `format_changed=false` 로 무인이다. 묶으면
  무인 몫이 사람 대기에 묶인다.

남는 잔여는 **22행 296줄** = `Fairness` 쌍 72 + `python/packages/**` 116 +
`go/internal/handlers/contributions{,_test}.go` 108 이고, 한 슬라이스로 닫힌다.

## 축 ④ — 비어 있음을 확인한 축

23행의 저작 커밋은 전수 **43개**다. 트레일러(`Co-authored-by`)를 뺀 본문을 가진 것은 **5개**이고,
그중 넷은 제목 + `reconcile <task id>` 한 줄이라 판정 대상 명제를 담지 않는다
(`15900503`·`32faf64d`·`82ceba28`·`b19905fb`). 실질 본문은 **`9a5d32e`(#76) 하나**이고 그 세
명제는 ⑴ compare 여정 이탈 카드 둘 ⑵ sentiment 분모 전환 체크박스 + `STP-confirm-cause` 이탈 카드
⑶ fairness 세는 방식 표기 원칙 note 다. **셋 다 web-convergence-pass·sentiment-split-pass 가 이미
걷은 자리**라 현재 지문에 남은 줄과 겹치지 않는다. ⇒ 23행 전건에 대해 축 ④ 는 히트 0.

## 판정을 가른 판별식 넷

1. **마커는 기계 판독 자리다 — 단, 게이트는 두 번 적힌 이름에 눈이 먼다.**
   `scripts/check-mockup-render.py` 의 `markers()` 가 `web/src` 의 **모든 주석**에서
   `CMP-*`/`PAT-*` 를 긁어 R3 모집단(in-scope 27종)을 만든다. 그래서 `tokens.css` 의
   `/* ---- CMP-… ---- */` 구분선과 화면들의 `{/* CMP-… */}` 앵커는 구분선 유형이어도 걷지
   않았다. ⚠️ **다만 이 논거를 프로브로 재 보니 반만 맞다**: `markers()` 는 파일이 아니라
   이름의 **집합**을 만들므로, 같은 이름이 화면 쪽 주석에도 있으면 `tokens.css` 쪽을 지워도
   R3 이 조용히 통과한다(실측: `CMP-spark` 제거 → rc=0 — `Dashboard.tsx` 가 같은 이름을
   적는다). `tokens.css` 에만 있는 이름은 **넷**(`CMP-btn`·`CMP-card`·`CMP-nav-item`·
   `PAT-axis-compare`)이고 그 넷에 대해서만 게이트가 발화한다(음성 프로브 ⑸ 는 `CMP-card`
   로 rc=1 을 냈다). 나머지 마커의 유지 근거는 「지우면 즉시 붉는다」가 아니라 **R3 이 이름을
   잃지 않게 하는 안전망을 둘로 유지한다**는 것이고, 한쪽을 걷으면 그 사각을 내가 만든다.
   반면 `STP-*`·`TKN-*` 는 어느 게이트도 `web/src` 주석에서 읽지 않아 같은 보호가 없다 —
   그래서 이 슬라이스가 걷은 구분선 5개는 전부 `STP-*` 쪽이다.
2. **설계 트래커가 주석을 「근거」로 지목한 자리는 ② 히트가 아니다.** 트래커 `:655` 는
   「구현은 규칙 5 대조 규약에 따라 목업 `.formrow` 를 이름째 빌리지 않고 … 접두해 다시
   선언한다(**근거는 `tokens.css` 의 각 주석**)」로 적는다. 가리키는 것은 복원이 아니라 그
   주석이 원본이라는 증거다(deploy-serving-axis-pass 의 #72 처분과 같다). 같은 이유로
   `Trend.tsx` 의 수명 근거 주석도 전량 유지했다 — #87 본문이 그 주석을 가리킨다.
3. **쌍둥이가 유지로 판정돼 있으면 한쪽만 걷는 것이 번복이다.** 디자인 시스템 표는
   `PAT-screen-shell`·`CMP-mapstrip`·`CMP-sidebar` 셋의 역할을 각각 한 칸에 적는데,
   `CMP-sidebar` 머리 1줄은 residual-close-pass 가 ①②③ 로 판정하고 **유지**했다. 그래서
   `AppShell.tsx`·`MapStrip.tsx` 의 같은 모양도 유지했다. 거꾸로 `Sidebar.tsx` 의 `persona`
   필드 JSDoc 은 `tokens.css` 의 `.vtag { margin-left: auto }` 와 그 앞 주석이 같은 명제를
   갖는 **사본**이고, 두 자리를 **한 슬라이스가 처음 함께** 들었으므로 주인을 정해 걷었다.
4. **구분선은 아래 선언이 절 이름을 축자로 들 때 닫힌다.** `Reprocess.tsx`·
   `ReprocessTrigger.tsx` 의 `STP-*` 구분선 5개는 ⑴ 같은 파일이 이미 그 id 들을 열거하고
   (`CMP-mapstrip` 칩 · 머리 2줄, **JSX 블록과 같은 순서**) ⑵ 각 구분선 **바로 아래**
   `<h3>재처리 범위</h3>`·`<h3>재처리 전후 비교</h3>`·`<h3>표본 재분석</h3>`·
   `<h3>전량 재분석</h3>`·`<h3>반영 또는 되돌리기</h3>` 가 절 이름을 든다 ⑶ 여정 문서
   `JRN-logic-backfill.md` §3 가 단계 이름의 주인이다.

## 유지로 갈린 자리 (근거 요약)

- **`api/types.ts` 21줄 전량** — 머리 3줄은 「이 타입은 `contracts/` 코드젠 산출이 아니라 손으로
  유지하는 서빙 API 뷰다」를 말하는 편집 지점 가드(어기면 코드젠으로 덮어써 조용히 갈린다)이고,
  나머지 18줄은 export 타입의 JSDoc 요약 1줄이라 정책의 명시 유지 대상이다. **필드** JSDoc 을
  전량 걷은 dash-rebuild-pass 와 같은 잣대의 반대편이다.
- **「왜 그 모양으로 단언하는지」** — `Trend.test.tsx` 9줄(반전 스케일 · 선택이 서버에서 풀리는
  이유 · 구간 평균 ≠ 최신 점유율), `Trace.test.tsx` 의 「저신뢰는 중립이 아니다」 3줄
  (AC2.5 를 인용하지만 「그래서 화면은 네 분류 중 하나로 그려서는 안 된다」를 말한다 —
  de-residual-axis-pass 가 E 표면에 세운 「식별자+조항 제목만이면 걷는다」의 반대편).
- **부재를 말하는 문장** — `tokens.css` 의 「목업에 선택 행 규칙이 없다」·「목업은 note 간격을
  인스턴스에 둔다」는 복원 경로 넷 어디에도 없다.
- **하네스 사실** — vitest globals 를 켜지 않아 자동 cleanup 이 없다는 것, `Link` 때문에 라우터
  컨텍스트 없이는 렌더가 던진다는 것.

## 판단이 갈려 남긴 것

- `Trend.test.tsx` 의 「추림 폼의 배너는 이 폼의 제출에 반응하지 않는다 — 두 기록은 별개다」 —
  `Trend.tsx` 의 두 상태가 별개라는 사실은 ① 이지만, 이 줄은 **왜 다른 쪽 배너의 부재를
  단정하는지**를 말한다. 「애매하면 남긴다」.
- `tokens.css` 의 접두 규약 산문 10자리 — 내부적으로 이미 정본(`.trace-`·`.trend-sl-` 두 곳이
  이유 전문을 들고 나머지는 「같은 이유다」 포인터)으로 접혀 있어 더 걷을 여지가 없다고 봤다.

## 무영향 증명

- **비주석 diff 0줄** — 바뀐 12파일을 「주석·공백 제거 후 바이트 대조」로 부모와 비교해
  **12/12 동일**(문자열·템플릿 리터럴을 추적하는 스캐너 + JSX `{/* … */}` 컨테이너를 한 단위로
  떼는 처리; 그 처리를 넣기 전에는 `{}` 쌍 때문에 3파일이 거짓 DIFF 로 잡혔다).
- **게이트 6종 rc=0** — `check-comment-ledger`(불변식 통과) · `check-mockup-render`(R3 in-scope
  27종 · R4·R5 상한 6종 전부 0) · `check-journey-mockup` · `check-journey-flow`(710 단언) ·
  `check_scenario_mapping`(규칙 1~6) · `check-data-format-change`(`format_changed=false`).
- **테스트·타입·린트** — `vitest run` 9파일 80케이스 전건 통과 · `tsc -b` rc=0 · `eslint .` rc=0.

## 음성 프로브 (전부 발화)

1. 판정된 파일(`web/src/shell/Topbar.tsx`)에 주석 1줄 추가 → `check-comment-ledger` rc=1
   (`R7` 줄 수·지문 불일치).
2. `web/src/shell/nav.ts` 행 삭제 → rc=1 (`R6` 주석이 있는데 행이 없는 파일).
3. `web/src/tokens/tokens.css` 행의 판정 축을 `①②③` 로 되돌림 → 게이트는 rc=0 이지만
   축별 미판정 집계가 움직인다(`축 ④ 미판정: 행 22 · 296줄 → 행 23 · 356줄`) — 이 표면의
   **진척은 rc 가 아니라 집계 칸이 진실**이라는 것의 재확인.
4. `python/packages/analysis/src/econ_analysis/cli.py`(PRODUCER_GLOBS)에 **비주석**
   `PROBE = dict(analyzer_version=1)` 1줄 추가 → `check-data-format-change`
   `format_changed=true`. CTRL: 같은 파일에 `# PROBE analyzer_version=1` 줄머리 주석으로
   추가하면 `false`. ⚠️ 첫 시도의 `X = 1` 은 **발화하지 않았다** — 생산자 규칙은
   `field=value`(키워드 인자, 공백 없음) 또는 `"field":` 만 잡고 `field = value` 는
   일부러 보지 않는다(판정기 주석이 그 의도를 적는다). 프로브를 짤 때 이 모양을 맞춰야 한다.
5. `tokens.css` 에서 `/* ---- CMP-card ---- */` 의 마커 이름 제거 →
   `check-mockup-render` rc=1 (`R3` 「구현에 이름이 없는 in-scope 항목이 허용목록에 없다:
   CMP-card」, 성립 26 → 25 · 등재 예외 1 → 2). **`CMP-spark` 로 먼저 시도했을 때는 rc=0
   이었다** — 판별식 1 의 ⚠️ 가 그 실측이다.
