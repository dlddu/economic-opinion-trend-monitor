# trend-rejudge-pass — `Trend.tsx` · `tokens.css` · `Trend.test.tsx` 증가분 재판정

**표적 재판정이다(전수 아님).** 기준 커밋 `da51edd`. 추적 task는 `rct_20260921-0003`
(모델 `tbm_econ-opinion-monitor-comment-necessity`).
판정 대상은 **3파일 / 증가분 86줄** — 직전 패스(e2e-runner-pass)가 「다음 패스의 선」으로 이름 붙인 묶음이다:
`web/src/screens/Trend.tsx`(행 남음 47 → 실측 89, **+42**) · `web/src/tokens/tokens.css`(38 → 61, **+23**) ·
`web/src/screens/Trend.test.tsx`(25 → 46, **+21**). ⑵ 잔여 231줄의 37%.

판정 결과 요약: **제거 51줄(34 · 1 · 16) · 문면 정정 13곳(지문 −0) · 유지 35줄(그중 판단 분기 4).**
레포 전체 지문은 `2357 → 2306`(파일 `122 → 122`), 파일별 원장 행은 `126 → 126`(행 신설 없음, 세 행 갱신).

> 판정 기준 `da51edd` 에서 이 패스 뒤 ⑴(행이 없는 파일)은 **0**, 잔여 ⑵ 는 **17파일 145줄**이다(아래 「판정하지 않은 것」).
> **준비 중 자매 #94(`2fede44`, docs-impl 슬라이스 10)가 착지**해 브랜치를 그 위로 옮겼다 — 머지 트리 지문은 `2509 → 2458`(파일 126)이고
> 잔여는 ⑴ **4파일 140줄**(#94 신설 `reprocess.go`·`Reprocess.tsx`·`reprocess_test.go`·`Reprocess.test.tsx`) + ⑵ **21파일 157줄**(145 + #94 가
> 기존 파일에 들인 12: `types.ts` +5 · `handlers.go` +3 · `client.ts` +3 · `tokens.css` +1) = **297줄**. 원장 말미 집계는 이 머지 트리 값이다.

## 무엇을 판정했나

| 파일 | 원장 상태 | 주석 | 판정 |
|---|---|---:|---|
| `web/src/screens/Trend.tsx` | 행 있음(trend-surface-pass, 남음 47) · 이후 **+42** | 89 | **제거 34** · 55 유지(판단 분기 1) |
| `web/src/tokens/tokens.css` | 행 있음(regression-pass, 남음 38) · 이후 **+23** | 61 | **제거 1** · 정정 11블록 · 60 유지(판단 분기 2) |
| `web/src/screens/Trend.test.tsx` | 행 있음(trend-surface-pass, 남음 25) · 이후 **+21** | 46 | **제거 16** · 30 유지(판단 분기 1) |

주석 수는 정책의 추출 규칙으로 센 값이다 — **블록 주석은 첫 줄만** 센다(`/* …` 뒤의 이어지는 줄은 `*` 로 시작하지
않으면 지문에 없다). 그래서 `tokens.css` 의 정정 11블록은 계수에 보이지 않는다(아래 ⑶).

### 감지 단계의 예측과 실측이 갈린 자리

감지 단계는 이 묶음의 복원처를 「목업 `JRN-axis-contrast.html` · 설계 트래커 `STP-verify-in-trend` 행 · PR #91 본문」
**하나**로 예상했다. 실측한 증가분은 **세 착지의 합**이다:

| 착지 | `Trend.tsx` | `Trend.test.tsx` | `tokens.css` | 복원처 묶음 |
|---|---:|---:|---:|---|
| #85 겹쳐 보기 opt-in (`c887503`) | +12 | +9 | +2 | 목업 `JRN-daily-scan.html#trend-form`·`trendSeries()` · 트래커 「해소된 등재」 #85 행 · 편차 행 「상위 대상 비교 표가 겹쳐 보기를 따르지 않는다」 · PR #85 |
| #87 복원 조건 수명 (`a5bc6eb`) | +13 | +4 | 0 | `Dashboard.tsx` `BRIEF_KEY` 앞 주석(설명의 주인) · 트래커 #87 행 · PR #87 |
| #91 온도차 판별 폼 (`48d1dba`) | +17 | +8 | +1 | 목업 `JRN-axis-contrast.html#verdict-form`·`submitVerdict()` · 트래커 #91 행 · PR #91 |
| `tokens.css` 나머지 20줄 | — | — | +20 | #45·#53·#66·#70·#76·#80·#84 — 여섯 화면의 구획 주석. 주인은 트래커 「규칙 3·4(네비)·5 기계 판정」 절 |

즉 「복원처 묶음이 같은 것끼리」 판별식으로는 이 세 파일이 한 묶음이 아니다 — 세 파일이 묶이는 것은 **같은 화면의
표면**이라는 사실뿐이다. 그럼에도 세 파일을 통째 닫은 것은, 원장 행이 「남음 = 실측」이 되려면 파일 단위로 판정해야
하기 때문이다(부분 판정은 행을 갱신할 수 없어 ⑵ 에 그대로 남는다). 계획 시점 열린 PR 은 #75 하나(`.github/`·`README.md`·
`scripts/`)라 파일 겹침 0.

## 제거 — 복원 경로별 근거

### ⑴ `Trend.tsx` — 34줄

| 지운 줄 | 복원처 |
|---|---|
| **머리 4줄**(#85 가 「차트가 답하는 질문」을 「고른 대상 하나 + opt-in 겹침」 서술로 바꿔 쓴 것) + 매달린 옛 `//` 1줄 | `drawnSeries()` 본문 3줄과 체크박스 JSX 가 동작을 말한다(①). 트래커 「해소된 등재」 #85 행 「기본 unchecked … 꺼짐이면 고른 대상 하나(고른 것이 없으면 선두 하나), 켜짐이면 응답이 준 비교 대상 전부」(②, 축자). 같은 문장이 이 파일 안에 세 벌 더 있었다(`drawnSeries`·`overlay` 상태·JSX) |
| `drawnSeries` 3줄(규칙 서술 + 「서빙이 이미 3개로 잘라 내려주므로」) | 함수 본문(①) · 트래커 #85 행 「서빙이 이미 3개로 잘라 내려주므로(`trendSeriesLimit = 3`) 「상위 대상 3개」는 화면이 다시 자를 것이 없다」(②) · PR #85 같은 문장(③). 목업 `trendSeries()` 포인터 1줄만 남겼다 |
| `overlay` 상태 2줄 | `useState(false)`(①) + 위와 같은 문장의 세 번째 사본 |
| **`VIEW_KEY` 앞 13줄 → 2줄** — 여정 §4 분기·요약 카드 문면 3줄 | 트래커 #80 해소 행 「요약 카드의 `닫을 때의 조건이 다음 진입에 복원됩니다` 는 실제 동작이 됐다(여정 §4 네 번째 분기)」(②, 축자) |
| 〃 수명 근거 5줄 → 2줄(정정) | `Dashboard.tsx` `BRIEF_KEY` 앞 주석이 수명의 근거(목업 문면 `어제 닫을 때의 조건`)를 적는 **설명의 주인**이고(PR #87 「`Dashboard.tsx` `:34-41` 주석이 사유를 직접 적는다」), 트래커 #87 행이 「한 계약의 두 표면이 서로 다른 수명을 가지면 「닫을 때의 조건」이 화면마다 다른 닫음을 뜻하게 된다」를 축자로 적는다(②). 남긴 2줄은 「두 표면 대응 + 주인 지목」 뿐이다 |
| 〃 추림·대상 저장 경계 3줄 | 트래커 #87 행 「같은 화면의 추림(`Shortlist`)은 저장소를 쓰지 않는 화면 상태라 … 여정 문서가 파킹한 대상 저장(북마크·워치리스트)은 그대로다」(②, 축자) · PR #87(③) · 같은 파일 추림 상태 주석과 recorded 배너 문면 `이 세션 안에서만`(①) |
| **`Contrast` 머리 13줄 → 1줄** — 성격·저장소 미사용 4줄 | 트래커 #91 행 「기록은 저장소를 쓰지 않는 화면 상태다(… 「영속화 없이 세션 안에서 성립한다」 그대로)」(②) · PR #91 「상태는 화면 state — 저장소 미사용」(③). 목업 포인터(`#verdict-form`·`submitVerdict()`) 1줄만 남겼다 |
| 〃 「진입 맥락으로 가리지 않고 추림처럼 항상 그린다」 5줄 | 트래커 #91 행 해소 칸이 **문단째 축자**(「`Compare.tsx` 에는 아직 `/trend` 로 보내는 배선이 없고(그 배선은 위 `compare` 「축 간 격차 패널 전면 부재」 행 소유) 진입 쿼리 `?axis=&subject=` 는 dash 드릴도 같은 모양이라 여정을 구분할 수 없다 … 목업의 짝 카드 `승계된 설정`(`col-5`)은 되비출 기간 값이 없어 세우지 않았다 — 위 「승계 표면 전체」 행이 그 자리다」)(②) · PR #91 「왜 항상 그리나」 절(③) |
| 〃 접두 2줄 | 같은 파일 `.trend-sl-` 가드 2줄(「근거는 설계 트래커의 규칙 5 대조 규약」)이 주인 · `tokens.css` `STP-verify-in-trend` 구획 첫 줄이 사상을 적는다(①) |
| `submit` 분기 1줄(「목업 `submitVerdict()` 와 같은 분기 — 무엇이 비었는지를 말한다」) | 코드의 두 분기와 메시지(①) · 트래커 #91 행 「제출 분기는 목업 `submitVerdict()` 그대로다(…)」(②) · 같은 파일 `Shortlist` 의 「두 실패를 한 문장으로 뭉치지 않는다」 가 근거의 주인 |

문면 정정(지문 −0): 체크박스 JSX 의 「선택자는 `.trend-sl-*` 와 같은 이유로 `.trend-ov-` 로 접두한다」 문장 삭제(포인터
1줄 유지). `CMP-legend` 앵커에 #85 가 붙인 「범례는 그려진 선만 말한다 …」 문장은 **유지** — 테스트 쪽 사본을 지우며
이 자리를 설명의 주인으로 지목했다.

### ⑵ `Trend.test.tsx` — 16줄

| 지운 줄 | 복원처 |
|---|---|
| `legendNames` JSDoc 1줄 | 다섯 줄 헬퍼의 이름이 하는 일을 말한다(①) — web-api-view-pass 의 `Compare.test.tsx` `exitCard` 처분과 같다 |
| 「겹쳐 보기는 기본이 꺼짐이므로 진입 직후의 선은 고른 대상 하나다」 · 「체크박스가 unchecked 로 서 있는 상태가 진입 상태다」 2줄 | 테스트 이름 `draws the picked subject alone until 겹쳐 보기 is opted into` 와 `expect(box.checked).toBe(false)`(①) · 트래커 #85 행(②) |
| 범례 2줄 | 구현 `CMP-legend` 앵커 문장이 주인(「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」) |
| 「표는 겹쳐 보기와 무관하게 전건이다 … (등재된 편차)」 2줄 | 주석이 자기 복원처를 이름으로 지목한다 — 트래커 「등재된 편차」 행 「겹쳐 보기를 껐다고 행을 감추면 다른 대상으로 옮겨갈 길이 함께 사라진다」(②, 축자) |
| 「켜고 끄는 것은 선의 수뿐이다 … 세로 스케일은 응답 전체로」 2줄 | 구현 `TrendChart` 의 세로 스케일 2줄·색 배정 2줄이 주인 — trend-surface-pass 가 `renderCandidates()` 사본을 지운 것과 같은 방향 |
| 라디오 3종 2줄 | 테스트 이름 `… with the mockup's three verdicts and memo prompt` + 라벨 단정 자체(①) · 트래커 #91 행 「라벨은 목업 바이트 동일」(②) |
| 「기록은 아직 없다 — 두 배너 다 접혀 있어야 한다」 1줄 | 바로 아래 `hidden` 단정 두 줄의 나레이션(①) |
| 「기록은 저장소에 남지 않는다 — … 트래커 행의 약속이다」 1줄 | 자기 복원처 지목 — 트래커 #91 행 「`Trend.test.tsx` 가 제출 뒤 `localStorage` 키가 조회 조건 하나뿐임을 잠근다」(②) |
| 저장소 수명 3줄 | 테스트 이름 `keeps the reader's conditions past the tab, like the dash brief card does`(①) · `Trend.tsx` `VIEW_KEY` 주석(정정 후 2줄, 주인) · 트래커 #87 행(②) |

### ⑶ `tokens.css` — 1줄 + 정정 11블록(지문 −0)

제거 1줄: `.raw-flag` 의 「The raw-mode counterpart of .norm-flag, also the mockup's declarations」 — `.raw-flag`/`.norm-flag`
이름 짝이 「counterpart」를 말하고(①), 목업 선언 공유 여부는 규칙 5 게이트가 센다.

정정 11블록 — 아홉 PR 이 구획 주석마다 **규칙 5 게이트의 메커니즘**을 한 벌씩 되풀이했다: 「목업이 쓰는 이름을 여기
들이면 규칙 5 가 그 선택자를 선언 단위로 대조하기 시작하는데, 세 상한이 전부 0 이라 대조면이 그 순간 움직인다」(한국어
5블록) · 「the render gate compares them declaration by declaration and all three caps are zero」(영어 5블록) ·
`table.tbl tr.click.on td` 의 「not part of the declaration comparison」. 주인은 설계 트래커 「규칙 3·4(네비)·5 기계 판정」
절(판정 범위 · 「게이트가 보지 못하는 것 — 한쪽에만 있는 선택자」 · 래칫)이고(②), `Trend.tsx` 의 `.trend-sl-` 가드 2줄이
이미 「근거는 설계 트래커의 규칙 5 대조 규약」 한 구절로 가리키는 pin-guard-pass 꼴이다. 각 블록을 **구획 앵커 + 목업
대응 규칙(이름 사상) + 「(규칙 5 대조 규약)」 포인터**로 줄였다. 「슬라이스 8」·「slice 5」 작업 흔적(초기 판정의 제거
유형 ③)도 함께 걷었다. 첫 줄은 전부 남았으므로 지문은 이 정정을 보지 못한다 — 원장 행의 「제거 1」이 그 사실을 적는다.

## 유지 — 35줄(증가분 86 중)

- **`Trend.tsx` 8줄**: 온도차 상태 소유 2(추림 상태 2 와 같은 유형 — 「응답이 바뀔 때마다 고른 결론과 메모가 날아가면 판별
  자체가 성립하지 않는다」, 트래커·PR 어디에도 없다) · 세로 스케일 2 · 색 배정 2(둘 다 「토글이 값·대상 변화처럼 읽히는 것을
  막는다」는 근거 — PR #85 는 「스케일과 색 불변」 단정 사실만 적는다) · `trendSeries()` 포인터 1 · `STP-verify-in-trend` 포인터 1
  (`Shortlist` 머리의 목업 포인터와 같은 규약).
- **`Trend.test.tsx` 5줄**: `afterEach` 정리 3(직전 유지 2줄 승계 + 「옛 자리에 남은 값이 되살아나지 않게 둘 다 비운다」 — 자동
  cleanup 부재라는 하네스 사실의 연장) · 온도차 폼 배너 지목 2(「아무것도 고르지 않고 제출 — 결론 쪽」·「메모는 공백 — 공백만
  있는 메모는 비어 있는 것」: trend-surface-pass 가 유지한 추림 테스트의 배너 지목 2줄과 같은 꼴) · 폼 분리 1(「추림 폼의
  배너는 이 폼의 제출에 반응하지 않는다 — 두 기록은 별개다」: 왜 그 단정인지).
- **`tokens.css` 22줄**(첫 줄 기준): `CMP-*`/`PAT-*`/`STP-*` 구획 앵커 전부 — `check-mockup-render.py` 의 `markers()` 가
  **주석에서** 이름을 긁으므로 `CMP-table`·`PAT-line-chart`·`PAT-donut`·`PAT-stacked-sentiment`·`CMP-norm-toggle`·
  `PAT-raw-vs-norm`·`PAT-lineage`·`CMP-crumb` 은 지우면 R3 가 깨진다(`Trend.tsx` `{/* CMP-kv */}` 와 같은 자물쇠); 목업
  대응 규칙의 이름 사상(`.radios`→`.trend-vd-` · `.fld`·`.chk`·`.banner`→`.trend-sl-`/`.dash-brief-` · `.muted` 인라인) — 목업
  이름은 코드 어디에도 없어 이 줄이 유일한 대조 좌표다; `PAT-lineage` 의 trace 전용 근거(「목업이 인라인 스크립트로 조립하는
  구조와 달라 그 대조가 신호를 주지 못한다」 — 트래커 규칙 5 절은 「교집합을 만들지 않는다」까지만 적는다); `.col-8` 예외
  근거; `PAT-raw-vs-norm`·`.fair-cmp .meta` 의 시각 논증; `.trace-body`·`.trace-url` 근거.

## 판단이 갈려 남긴 것

| 자리 | 갈린 이유 | 처분 |
|---|---|---|
| `Trend.tsx` 「`으로 판별했습니다.` 는 목업 `submitVerdict()` 의 문면 그대로다 — 조사는 목업이 정한다」 1줄 | 트래커 #91 행이 「조사 `으로` 는 목업 스크립트의 문면 그대로 … 표기를 다듬는 자리는 목업 쪽이다」를 적어 경로 ② 성립 | 유지 — 코드 독자가 오탈자로 보고 고치는 것을 막는 **핀**이고 출처(목업)를 가리킨다(pin-guard-pass 「금지만 말하고 출처를 가리킨다」) |
| `Trend.test.tsx` 「배너 문장은 목업 `submitVerdict()` 가 조립하는 그대로다 — 조사까지 목업의 것이다」 1줄 | 위와 같은 핀의 테스트 쪽 짝(`이번 구간만의 격차으로` 기대값) | 유지 — 구현 쪽 핀과 짝. 목업이 조사를 고치면 둘 다 함께 걷는다 |
| `tokens.css` `.trend-ov-form` 「차트와 겹치지 않게 폼 아래에만 간격을 준다 — 목업도 `#trendchart` 쪽(`margin-top:10px`)에 같은 자리의 간격을 둔다」 | 목업 파일이 값을 복원하나, 목업은 차트 쪽에 두고 구현은 폼 쪽에 두는 **자리가 다른 대응**이라 목업만 읽어서는 이 규칙의 이유가 나오지 않는다 | 유지 |
| `tokens.css` `.dash-brief-empty` 「「데이터가 없다」와 같은 자리에 같은 모양으로 그리되 문면은 갈린다 — 수집이 없는 것과 검색어가 좁힌 것은 다른 사건이다」 | 트래커 #84 해소 행 「수집 부재와 구분해 말한다」가 거의 축자 | 유지 — CSS 규칙이 **왜 빈 상태와 같은 모양인지**는 여기뿐이고, dash 묶음 재판정(다음 패스 후보)이 `Dashboard.tsx` 와 함께 다시 본다 |

## 검증

- 비주석 코드 무변경(세 파일 모두): 블록·줄·JSX 주석을 걷어낸 본문이 `da51edd` 와 바이트 동일(`strip.py` — `{/* */}` · `/* */` ·
  줄머리 `//` 제거 후 비교).
- `web/`: `tsc -b` rc=0 · `eslint .` rc=0 · `vitest run` **47 passed / 8 files**(Trend 18/18, 착지 전과 같은 수).
- 게이트: `scripts/check-mockup-render.py .` rc=0 **출력 바이트 동일**(R3 in-scope 25 · 성립 25 · 등재 예외 0 · 구현 전용 1 ·
  R4·R5 상한 6종 0) · `scripts/check-journey-mockup.py .` rc=0 출력 동일 · `tests/e2e/check_scenario_mapping.py` OK.
- 지문(모델 `asIs.versionScript` 그대로): `lines=2357 files=122` / `a1792b6b…` → **`lines=2306 files=122`** / `0fb3d0ff…`.
  자매 #94 위로 옮긴 뒤(머지 트리): `lines=2509 files=126` → **`lines=2458 files=126`** / `c90a464e…` — 델타 −51/0 동일.
- 잔여 재계수(원장 행 파싱 ↔ 지문 파일별 줄 수): 기준 커밋에서 ⑴ 0 · ⑵ 20파일 231줄(감지 값과 파일별 일치) → 이 패스 뒤
  ⑴ 0 · ⑵ **17파일 145줄**(231 − 86).
- e2e 는 CI(`ci / e2e`)가 집행한다 — 주석만 바뀌었으므로 실행 경로는 동일하다.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

- **#94 묶음(⑴ 4파일 140줄 + ⑵ 12줄 = 152줄, 머지 트리 잔여의 51%)** — 한 착지·한 복원처(트래커 슬라이스 10 행 · doc-tracker 2026-09 행 · PR #94 · `contracts/` 스키마)라 **다음 패스의 1순위**다.
- **⑵ 잔여 145줄 / 17파일**(판정 기준 트리; #94 분 제외): `scripts/check-journey-mockup.py` 42→65(+23) · `web/src/screens/Dashboard.tsx` 0→19 ·
  `python/packages/aggregation/tests/test_aggregate.py` 1→19 · `web/src/screens/Sentiment.tsx` 54→71 ·
  `tests/e2e/specs/aggregation-5-subject-trend-chart.spec.ts` 48→61 · `web/src/screens/Dashboard.test.tsx` 5→17 ·
  `web/src/screens/Sentiment.test.tsx` 21→31 · `tests/e2e/specs/ac3-8-normalized-ratio.spec.ts` 22→31 ·
  `econ_aggregation/aggregate.py` 11→15 · `econ_analysis/cli.py` 7→11 · `test_llm.py` 8→12 · `test_feeds.py` 21→24 ·
  `deploy/overlays/prod/kustomization.yaml` 20→23 · `deploy/batch/workflow-template.yaml` 42→44 ·
  `web/src/screens/Fairness.test.tsx` 16→18 · `web/src/screens/Compare.tsx` 10→11 · `test_cli.py` 5→6.
  **#94 묶음 다음의 선은 `scripts/check-journey-mockup.py`(+23)** — 증분은 #47·#61 이 들였고 복원처는 스크립트 머리
  docstring 의 규칙 목록 · 설계 트래커 「규칙 8 예외 등재」 절 · 두 PR 본문이다. 그다음은 dash 묶음 `Dashboard.tsx`(+19)·
  `Dashboard.test.tsx`(+12) 31줄 — 복원처는 트래커 #84 해소 행이고, `Dashboard.tsx` `BRIEF_KEY` 앞 주석은 이 패스가
  `Trend.tsx` 수명 주석의 **주인**으로 지목했으므로 그 판정은 이 처분과 맞물린다(주인을 지우면 `Trend.tsx` 의 2줄이 고아가 된다).
- **설계 트래커의 `Trend.tsx:8-21` 인용**(행 「구현 전용 — 버킷 단위 안내 `note`」)은 #81 이 import 를 더한 시점부터 11~22행으로
  낡아 있었고 이 패스가 머리 4줄을 걷어 **7~18행**이 됐다. 트래커는 `docs/` 루트라 이 모델의 양 side 밖이고 그 행의 소유자는
  `tbm_econ-opinion-monitor-mockup-render` 이므로 여기서 고치지 않는다 — 그 행이 「단위가 선택 가능해질 때」 열릴 때 함께 정정.
- **`deploy/` 재판정 후보**(잔여 계수 밖): `batch-pvc.yaml` 행 남음 9 · 실측 7 · `prod/kustomization.yaml` 20→23 — e2e-runner-pass
  가 넘긴 그대로(복원처 README 「배포」·doc-tracker #92 행, `∋` 좌표 두 문장은 자물쇠).
- `Fairness.tsx` 118행 위 28줄 — 트래커 `Fairness.tsx:110-118` 자물쇠, 미발화.
- Python docstring 표면 — 모델 정의의 사각지대, tobe-modeler 몫.
