# web-convergence-pass — 「구현 수렴 대기」 행을 닫은 두 슬라이스(#76·#102)가 web 3파일에 들인 5줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `ca2f107`(#112 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([deploy-overlay-pass](2026-09-21-deploy-overlay-pass.md))가 말미에 「다음 패스의 선은 ⑵ web 3파일 5(`Fairness.test.tsx` 2 ·
`Reprocess.test.tsx` 2 · `Compare.tsx` 1 — 동률이라 한 web 패스로 묶는다)」로 이름 붙인 그 묶음만 판정한다. 세 자리는 전부 설계 트래커
「등재된 편차」의 `구현 수렴 대기` 행을 닫은 슬라이스가 들인 주석이라(#76 `9a5d32e` 여정 이탈 동선·미분석 분모 전환·세는 방식 표기 원칙 ·
#102 `52fba9f` 진행 문구·`.btn.pri:hover`) 이름을 거기서 땄다. `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터는 이 패스에
넣지 않았다 — 「판단이 갈린 자리」 2. 추적 task는 `rct_20260921-0019`(reconciler `tbm_econ-opinion-monitor-comment-necessity`).

판정 결과 요약: **판정 표면 5줄 중 제거 5줄 / 유지 0줄** — 정정 0, 판단 분기 0. 레포 전체 지문은 `2436 → 2431`(파일 `134 → 134`; 세 파일
모두 남음 > 0 이라 집합 불변). 코드는 한 바이트도 바뀌지 않았다 — 세 파일의 주석 스트립 후(`typescript` `transpileModule`
`removeComments:true` + JSX 변환) 출력이 편집 전후 **바이트 동일**, `vitest run` 56 passed(9 파일) · `tsc -b` rc=0 · `eslint .` rc=0.

## 무엇이 들어왔나 — 귀속

| 파일 | 행(남음) | 기준 커밋 히트 | blame |
|---|---:|---:|---|
| `Fairness.test.tsx` | 16(unrowed-files-pass) | 18 | `ddaef4f`(#66) 16 — unrowed-files-pass 가 전량 유지한 그대로 · **`9a5d32e`(#76) 2** `:121-122` |
| `Reprocess.test.tsx` | 23(reprocess-console-pass) | 25 | `f7e2338`(#97)·이전 23 · **`52fba9f`(#102) 2** `:232-233` |
| `Compare.tsx` | 10(regression-pass) | 11 | `39d2337`·`1590050`·`be8616f` 10 · **`9a5d32e`(#76) 1**(물리 4) `:99-102` |

감지 인계는 `Fairness.test.tsx` 의 +2 를 `ddaef4f` `:88-89`(「Normalized mode: the evenly-sourced subject leads …」)로 적었다. 파일별 계수
이력(`ddaef4f` 16 → `9a5d32e` 18)과 `git show 9a5d32e -- Fairness.test.tsx`(테스트 1건 신설, 머리 2줄)로 가르면 `:88-89` 는 #66 의 16줄
안에 있고 unrowed-files-pass 의 판정(전량 유지 — 「토글이 정직하려면 눌렀을 때 화면이 말하는 바가 바뀌어야 한다는 단정 근거」) 그대로다.
이 패스는 그 판정을 뒤집지 않는다 — 판정 표면은 #76 이 더한 `:121-122` 다.

| 자리(기준 커밋 줄) | 내용 | 지문 줄 | 판정 |
|---|---:|---:|---|
| A `Fairness.test.tsx:121-122` | 표기 원칙 테스트 머리 「표기 원칙은 데이터가 아니라 읽는 법에 대한 문면이라, 응답이 아직 없어도 서 있어야 한다 — 비율과 건수를 섞어 읽는 사고는 표가 그려지기 전에 예방되어야 의미가 있다.」 | 2 | **제거 2** |
| B `Reprocess.test.tsx:232-233` | 지역 헬퍼 `subOf` 머리 「The card sub next to a heading — the mockup names the running state there (`#s-sample-running` / `#s-running`), not in the run table.」 | 2 | **제거 2** |
| C `Compare.tsx:99-102` | 이탈 카드 그리드 위 JSX 블록 「여정 이탈 컨트롤 — `JRN-axis-contrast` 는 축 비교를 끝낸 자리에서 두 갈래로 내보낸다. 목업에서는 워크스루 단계마다 한 장씩 서 있지만, 구현의 비교 화면은 단계가 접힌 한 페이지라 두 장을 비교 그리드 아래 나란히 둔다. 두 대상 모두 `BUILT` 라 빈 화면으로 보내지 않는다.」 | 1(물리 4) | **제거 1**(물리 −4) |

합: 5 → 0(제거 5). 지문 `Fairness.test.tsx` 18 → 16 · `Reprocess.test.tsx` 25 → 23 · `Compare.tsx` 11 → 10 — 세 행의 「남음」이 실측과 다시 같다.

## 복원처 — 설계 트래커 「해소된 등재 (이력)」 행이 주인, PR 본문이 사본

세 자리 모두 **같은 구조**다: 슬라이스가 트래커의 「구현 수렴 대기」 행을 「해소된 등재 (이력)」로 옮기며 그 행의 「구현이 따라왔다」 칸에
*왜 그 모양인지*를 문장째 적었고, 같은 문장을 코드 옆에 한 번 더 적었다. 주인은 트래커 행(② — 자매 mockup-render 모델의 등재)이고
화면·테스트 주석은 그 사본이다. sentiment-split-pass 가 같은 PR #76 의 `Sentiment.tsx` 에서 `STP-confirm-cause` 이탈 카드 블록(D `:251-253`)과
`Sentiment.test.tsx:220-221`(이탈 카드 테스트 머리)을 「감지 인계가 목업 근거는 유지 후보로 넘겼으나 그 목업 근거의 주인이 트래커라는 것이
실측이다」로 걷은 처분을 그대로 승계한다.

- **A** — ② 설계 트래커 `docs/econ-opinion-monitor-design-tracker.md:498` 「세는 방식 표기 원칙 note 부재」 해소 행: 「`Fairness.tsx` 의 lede 바로
  아래 `CMP-note` 로 두 문면이 섰다. 등재가 적은 대로 서빙 차단이 없어 **응답 분기 밖**에 둘 수 있었고(데이터가 오기 전에도 선다), 그래서
  표기 원칙이 표가 그려지기 전에 읽힌다」 — 주석의 두 절(「응답이 아직 없어도 서 있어야 한다」·「표가 그려지기 전에 예방되어야」)이 이 한
  문장에 있다. ② doc-tracker `2026-09.md:735` 「`fairness` 는 표기 원칙 note 를 응답 분기 **밖**에 둬 데이터가 오기 전에도 읽히게 했다」.
  ③ PR #76 본문 표 행 「세는 방식 표기 원칙 note 부재 | `fairness` | `CMP-note` (응답 분기 밖)」 + 「note 는 표 자신이 「서빙 차단이 아니다」라고
  적는다」. ① test 제목 `states the notation principle, and states it before any data arrives` 가 「응답 전에 선다」를, 단언하는 note 문면
  「표기가 없으면 원시 건수와 점유율을 섞어 읽게 되고, 그 순간 비교는 무의미해집니다」가 「비율과 건수를 섞어 읽는 사고」를 말한다. 「테스트가 왜
  그 모양으로 단언하는지」 유형이지만 그 「왜」가 ②③① 세 경로에 문장째 있다 — unrowed-files-pass 가 이 파일 16줄을 전량 유지한 근거는
  「단정·픽스처 어느 쪽을 읽어도 복원되지 않는다」였고, 이 2줄은 그 조건을 만족하지 않는다.
- **B** — ① 바로 아래 선택자 `.card-h` → `h3` → `.sub` 가 「the card sub next to a heading」 그 자체이고, `ReprocessTrigger.tsx:168-169`·`:259-260`
  `lastSample && isActive(lastSample) ? "표본을 새 로직으로 돌리는 중…" : …` 이 「running state there」의 자리다. ② 설계 트래커 `:512` 「진행 문구
  2종」 해소 행 머리 「`표본을 새 로직으로 돌리는 중…`(`#s-sample-running`) · `범위 전체를 다시 분석하는 중…`(`#s-running`) ↔ 구현 런 표 배지
  `대기`/`실행 중` + 버튼 `제출 중…`」이 「the mockup names the running state there (`#s-sample-running` / `#s-running`), not in the run table」의
  축자이고, 본문 「표본·전량 카드 sub 가 런이 살아 있는 동안 … 목업 문장 그대로를 보이고 … 런 표 배지(`CMP-badge`)와 `제출 중…` 은 등재 사유대로
  유지 … `Reprocess.test.tsx` 가 표본 제출 직후·전량 제출 직후의 sub 를 두 문장으로 단정하고」가 테스트 모양까지 적는다; `:377` 「⑴ 진행 문구 —
  `isActive(lastSample)`/`isActive(lastFull)` 동안 카드 sub 를 목업 문장으로 바꾸면 되고 새 선택자가 필요 없다」. ③ PR #102 본문 표 행
  `ReprocessTrigger.tsx`(「표본·전량 카드 sub — 런 활성 동안 목업 `#s-sample-running`/`#s-running` 문장 그대로」)·`Reprocess.test.tsx`(「`subOf(container,
  <h3>)` 헬퍼」). `subOf` 는 export 가 아닌 지역 헬퍼라 「TS: export 함수·타입의 JSDoc 요약 1줄」 규칙 밖이고, sentiment-split-pass 가
  `Sentiment.test.tsx:159` `splitShares` 헬퍼 JSDoc 을 「바로 아래 선택자」로 걷은 것과 같은 처분이다. (PR #102 본문 「원본은 doc 쪽」 절이 「코드에 새
  주석 0줄」이라 적었으나 이 2줄이 실제로 들어왔다 — 본문의 자기 서술이 지문과 어긋난 자리이고, 이 패스가 그 둘을 맞춘다.)
- **C** — ② 설계 트래커 `:494` 「여정 이탈 컨트롤 `수집량 차이인지 정규화로 확인 →` 부재」 해소 행: 「`Compare.tsx` 의 축 비교 그리드 아래에 이탈 카드
  `격차가 의심스러우면` 이 서고 … 목업은 이 카드를 워크스루 단계(`화면 2`)에 두지만 구현의 비교 화면은 단계가 접힌 한 페이지라 배치만 다르다」 ·
  `:495` 「위 행의 짝. 이탈 카드 `분위기까지 보고 싶다면` 이 같은 그리드에 서고 … 두 대상 모두 `BUILT` 라 어느 쪽도 `Placeholder` 로 보내지
  않는다(`Compare.test.tsx` 가 라벨과 `href` 를 잠근다)」 — 블록의 세 문장이 두 행에 축자로 있다. 「`JRN-axis-contrast` 는 축 비교를 끝낸 자리에서
  두 갈래로 내보낸다」는 ② 두 행의 머리(→ `JRN-spike-verification.html#STP-check-normalized` `fairness` 귀속 · → `JRN-sentiment-shift.html`
  `sentiment` 귀속)와 doc-tracker `:735` 「`compare` 는 이탈 둘(→ `fairness` · → `sentiment`)을 그리고」. ③ PR #76 「Compare: 여정 이탈 카드 둘
  (→ /fairness, → /sentiment)」 + 「이탈 대상이 `Placeholder` 라 빈 화면으로 보낸다던 사유는 `ddaef4f`(#66)의 `fairness` 착지로 거짓이 됐고」.
  ① `App.tsx` 의 `BUILT` 집합 · 두 `<Link to="/fairness">`·`<Link to="/sentiment">` · `Compare.test.tsx` 의 라벨·`href` 단정. 절 표지 몫(「여정
  이탈 컨트롤」)은 `className="grid g-12 cmp-exits"`·`cmp-exit` 가 복원한다(구분선 유형). 블록에 `CMP-*`/`PAT-*` 마커가 없어 `check-mockup-render.py`
  의 R3 모집단(주석에서 긁는 마커 집합)과 무관하고 `JRN-axis-contrast` 토큰은 `check-journey-mockup.py` 가 목업 HTML 에서만 읽는 이름이다 —
  두 게이트 출력 편집 전후 바이트 동일.

## 제거 5줄 — 복원 경로별 근거

| 경로 | 줄 | 자리 |
|---|---:|---|
| ② 저장소 문서(설계 트래커 「해소된 등재 (이력)」 `:494`·`:495`·`:498`·`:512` + `:377` · doc-tracker `:735`·`:741`) | 5 | A · B · C — 전부 ② 만으로 축자 복원되고 아래 ①③ 이 겹친다 |
| ① 코드(test 제목·단언 문면 · `subOf` 선택자 · `ReprocessTrigger.tsx` 조건식 · `App.tsx` `BUILT` · `Link to` · `Compare.test.tsx`) | (5) | A · B · C |
| ③ PR 본문(#76 표 행·「차단 전제」 문단 · #102 표 행) | (5) | A · B · C |

경로 ④(커밋 메시지)는 squash 제목·본문이 PR 본문과 같아 따로 세지 않았다.

## 유지 0줄

없음. 판정 표면 5줄이 전부 트래커 행의 사본이었다. 세 파일의 옛 줄(16 · 23 · 10)은 앞 패스의 판정 그대로이고 이 패스가 다시 보지 않았다.

## 판단이 갈린 자리

1. **A 를 지운 것** — `Fairness.test.tsx` 의 행은 unrowed-files-pass 가 「전부 「테스트가 왜 그 모양으로 단언하는지」」로 전량 유지한 파일이라,
   같은 유형인 A 도 남기는 쪽이 「애매하면 남긴다」에 가까워 보인다. 그러나 그 패스의 유지 근거는 유형 이름이 아니라 「단정·픽스처 어느 쪽을 읽어도
   복원되지 않는다」였고, A 의 「왜」는 트래커 `:498` 에 문장째 있다(같은 PR 이 같은 트래커 행 처리의 부산물로 남긴 주석). 같은 PR 의
   `Sentiment.test.tsx:220-221` 을 sentiment-split-pass 가 같은 근거로 걷었으므로 처분을 맞췄다. 정책 소유자가 「테스트 머리 주석은 트래커 행이
   복원해도 남긴다」로 정하면 이 2줄은 되살릴 대상이다(원문은 이 문서 표 A).
2. **`Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터를 넣지 않은 것** — 직전 패스 말미가 「`Reprocess.test.tsx` 의 #102 분 2줄과
   `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터는 `Dashboard.tsx`·`Trend.tsx` 를 함께 여는 web 패스에서 본다」로 적어 두 읽기가
   가능했다. 앞 절이 「⑵ web 3파일 5 를 한 web 패스로 묶는다」고 `Reprocess.test.tsx` 2 를 이 묶음에 넣었으므로 뒷절은 `Dashboard.tsx`·`Trend.tsx`
   포인터 쌍에 붙는 조건으로 읽었다. 그 쌍은 dash-brief-pass 의 **판단 분기(유지)**라 잔여 15 에 들어 있지 않고(원장 행 `Dashboard.tsx` 남음 6 =
   실측), 처분하려면 `Trend.tsx` 포인터를 트래커 #87 행으로 옮기는 편집이 따라야 해 이 패스의 「주석만 걷는다」 경계를 넘는다. 재판정 후보로
   원장 말미에 그대로 둔다.
3. **B 의 첫 절을 포인터로 남기지 않은 것** — `Sentiment.tsx` `SplitRatios` 처분처럼 「요약 1줄」을 남길 수도 있었으나, `subOf` 는 export 가 아니라
   JSDoc 요약 규칙이 걸리지 않고 첫 절(「The card sub next to a heading」)은 바로 아래 세 선택자를 영어로 읽은 것이라 요약으로서도 값이 없다.
   `Sentiment.test.tsx:159` `splitShares` 선례(헬퍼 JSDoc 전량 제거)를 따랐다.

## 검증

```
$ git diff --stat ca2f107 -- web
 web/src/screens/Compare.tsx        | 4 ----
 web/src/screens/Fairness.test.tsx  | 2 --
 web/src/screens/Reprocess.test.tsx | 2 --                # 8 deletions, 전부 주석 줄
$ node strip.cjs        # ts.transpileModule(removeComments:true, jsx:ReactJSX) — HEAD vs 편집 후, 세 파일 SAME
$ (cd web && npx vitest run)                             # Test Files 9 passed · Tests 56 passed
$ (cd web && npx tsc -b && npx eslint .)                 # rc=0 · rc=0
$ python3 tests/e2e/check_scenario_mapping.py | md5sum   # rc=0, 9ad08df7 편집 전후 동일
$ python3 scripts/check-mockup-render.py . | diff - before.txt   # 빈 출력(rc=0)
$ python3 scripts/check-journey-mockup.py . | diff - before.txt  # 빈 출력(rc=0)
$ <지문 스크립트>                                        # lines=2431 files=134 (편집 전 2436/134 = 감지값 바이트 동일)
```

파일 단독 계수 `Fairness.test.tsx` 18 → 16 · `Reprocess.test.tsx` 25 → 23 · `Compare.tsx` 11 → 10. 원장 재계수: 파일별 원장 138행 ↔ 지문 파일별
계수를 대조해 기준 트리 ⑴ 1파일 10 · ⑵ 3파일 5 == 옛 말미 15, 행 갱신 후 ⑴ 1파일 10 · ⑵ **0** == 새 말미 10(계수 밖 감소 `batch-pvc.yaml`
9→7 · `pvc.yaml` 소멸 그대로). `check-data-format-change.py` 는 세 파일이 `SENSITIVE_PATHS`·`CONTENT_RULES` 어느 쪽에도 없어 `format_changed=false`
자리다(봇 `review/manual-approval` 경로).

## 원장 반영

- 패스 이력 행 `| 2026-09-21 | web-convergence-pass | ca2f107 | 2436 | 5 | 2431 | 134 → 134 |`.
- 「패스 이력」 아래 「web-convergence-pass도 표적 패스다」 문단.
- 파일 행 `web/src/screens/Fairness.test.tsx` 18 / 2 / 16 · `web/src/screens/Reprocess.test.tsx` 25 / 2 / 23 · `web/src/screens/Compare.tsx` 11 / 1 / 10
  (기준 패스 갱신, 행 신설 없음 — 138 그대로).
- 말미 집계 `**web-convergence-pass 기준 · 레포 전체** | 2436 | 5 | 2431`, 잔여 15 → **10**(⑴ 10 사람 몫 · ⑵ 0).

## 범위 밖 (다음 패스로)

- **무인 패스의 다음 선은 없다** — ⑵ 가 0 이다. 지문이 다시 자라야(자매 슬라이스가 판정 범위에 주석을 들여야) 다음 표적이 생긴다.
- ⑴ `scripts/check-data-format-change.py` 10줄 · `deploy/overlays/prod/batch-pvc.yaml` 머리 7줄(감소분 · 사람 게이트) — 사람 몫.
- `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터 — 「판단이 갈린 자리」 2, 두 파일을 함께 여는 web 패스에서.
- `test_feeds.py` 옛 21줄의 `(AC1.x)` 태그 · `test_llm.py` 옛 8줄 · `test_aggregate.py` 인라인 AC 태그 3줄 — 정책 소유자가 인라인 태그의 처분을
  정할 때 함께.
- `ac3-8` 머리 단언 목록 표식 · 재판정 후보 5 · 원본 누락 좌표 — 직전 패스 말미 그대로.
