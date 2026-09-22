# phone-media-pass — 자매 슬라이스(#115)가 `tokens.css` 에 들인 폰 폭 `@media` 머리 주석 1줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `d6db7fe`(#115 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([web-convergence-pass](2026-09-21-web-convergence-pass.md))가 말미에 「무인 패스의 다음 선은 없다 — ⑵ 가 0 이라 지문이 다시 자라야
(자매 슬라이스가 `web/src`·`go`·`python`·`tests`·`deploy` 에 주석을 들여야) 다음 표적이 생긴다」로 닫아 둔 그 조건이 성립해 열린 패스다.
자매 모델 `tbm_econ-opinion-monitor-mockup-render` / `rct_20260922-0001`(PR #115, `@media` 표면 수렴)이 `web/src/tokens/tokens.css` 에
**주석 1줄(물리 4)**을 들였고, 그 한 자리만 판정한다. 추적 task는 `rct_20260922-0001`(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **판정 표면 1줄 중 제거 1줄 / 유지 0줄** — 정정 0, 판단 분기 0. 레포 전체 지문은 `2432 → 2431`(파일 `134 → 134`;
`tokens.css` 남음 62 > 0 이라 집합 불변). 편집 후 지문이 `d888d2b26acbc2f83c093b68588fae584204b117c2644c94de8f7537cb9bb0c3` 로
**#115 착지 전 baseline 과 바이트 동일**하게 돌아온다 — 증가분 전량이 이 한 자리였다는 값 증명이다. CSS 는 주석 외 한 바이트도 바뀌지
않았다(블록 주석 스트립 후 sha256 `e7476521469f…` 편집 전후 동일).

## 무엇이 들어왔나 — 귀속

| 파일 | 행(남음) | 기준 커밋 히트 | blame |
|---|---:|---:|---|
| `web/src/tokens/tokens.css` | 62(reprocess-console-pass) | 63 | 옛 62 — 앞 세 패스의 판정 그대로 · **`d6db7fe`(#115) 1**(물리 4) `:1922-1925` |

`git blame -L1922,1925` 가 네 줄 모두 `d6db7fe` 단일 커밋이고, `d6db7fe` 의 주석 줄 변경은 이 블록 **하나뿐**(추가 2 · 삭제 0 — 물리 4줄 중
2~4행은 `Source:`·본문 연속줄이라 주석 시작 패턴에 걸리지 않는다). baseline 관측(2026-09-21T21:17:32Z) 이후 main 에 착지한 커밋은 둘
(`bfb5334` #114 · `d6db7fe` #115)인데 `bfb5334` 는 `docs/mockups/` 만 건드려 지문 범위 밖이라 값이 `10a4f3d` 와 같다 — 놓친 이벤트 0.

| 자리(기준 커밋 줄) | 내용 | 지문 줄 | 판정 |
|---|---:|---:|---|
| A `tokens.css:1922-1925` | 폰 폭 블록 머리 「`Phone (<=720px)` — 1180px rule only folds the sidebar into a 64px icon rail, so at phone width the canvas drops to ~300px and the 12-column grid and the ranking row's fixed tracks squeeze the subject name to one character. `Source: docs/mockups/JRN-*.html @media (max-width:720px) (6 pages, byte-identical).`」 | 1(물리 4) | **제거 1**(물리 −4) |

합: 1 → 0(제거 1). 지문 `tokens.css` 63 → 62 — 행의 「남음」이 실측과 다시 같다.

## 복원처 — 세 절이 각각 다른 경로로 복원된다

주석은 한 문장이 아니라 **세 절**이다. 절마다 주인이 다르므로 따로 센다.

- **⑴ 「1180px rule only folds the sidebar into a 64px icon rail」 + 「the 12-column grid」 — 경로 ①(코드).**
  같은 파일 30줄 위 `@media (max-width: 1180px)` 블록(`:1892-1920`)이 `.app{grid-template-columns:64px 1fr}` 로 64px 레일을,
  `.col-3~.col-5{grid-column:span 6}`·`.col-6~.col-9{grid-column:span 12}` 로 12칼럼 격자를 그대로 들고 있다. 주석이 말하는 것은 그 블록을
  영어로 읽은 것이고, 「only folds」라는 한정은 그 블록 자신을 보면 더 정확히 읽힌다(사이드바 레일 + 브랜드·네비 라벨 숨김 + 칼럼 재배치).
  경로 ② 로도 겹친다 — 설계 트래커 「`@media` 표면의 등재 (rct_20260922-0001)」 절이 ⑴⑵ 로 같은 내용을 적는다.
- **⑵ 증상 진단 「at phone width the canvas drops to ~300px … squeeze the subject name to one character」 — 경로 ③(PR 본문).**
  **PR #114**(`bfb5334`, 「fix(mockups): 폰 폭(≤720px) 레이아웃 깨짐 수정 — 여정 목업 6종」) 본문이 주인이고 **주석보다 정밀하다**:
  「문제」 절 「랭킹 대상 이름이 세로 한 글자씩 쌓이고, 변화량 칸이 화면 밖으로 넘침」 · 「원인」 절 「반응형 규칙이 `max-width:1180px` 하나뿐.
  사이드바를 64px 레일로 접기만 해서 폰(390px)에서 본문이 ~300px이 되고, `.rankrow`의 고정 트랙(`26px 1fr 116px 92px 56px`)이 폭을 거의 다
  써서 `1fr` 이름 칸이 사라짐. `col-4/5`는 span 6으로 남아 절반 폭.」 — 주석의 세 요소(`~300px` · 고정 트랙 · 이름 한 글자)가 전부 있고
  뷰포트(390px)와 트랙 값까지 더 적혀 있다. 검증 방법(Playwright 390×844, 넘침 13~30 → 0)도 그 본문에 있다.
- **⑶ 「Source: docs/mockups/JRN-*.html `@media (max-width:720px)` (6 pages, byte-identical)」 — 경로 ③ 축자 + ②.**
  **PR #115** 본문 첫 문단이 「`#114`(`bfb5334`)가 여정 목업 6장 전부에 `@media (max-width:720px)` 폰 폭 레이아웃을 45행씩(+270행, 6장
  바이트 동일 · 추가분 md5 `55c1728e3cb6a26df9f558798db196de`) 세웠는데」로 **축자 복원**한다(md5 까지 있어 「byte-identical」이 검증
  가능한 형태로 남는다). ② 설계 트래커 「`@media` 표면의 등재」 절 「`#114` 가 목업 6장에 폰 폭(`≤720px`) 레이아웃을 세운 뒤」.

경로 ④(커밋 메시지)도 겹친다 — `d6db7fe` 「fix(web): 폰 폭(≤720px) 레이아웃 이식 + 반응형 표면 수렴」 · `bfb5334` 「fix(mockups): 폰 폭(≤720px)
레이아웃 깨짐 수정 — 여정 목업 6종」. 두 PR 은 squash 라 제목·본문이 곧 커밋 메시지다.

**덧붙여 `(6 pages, byte-identical)` 는 README 가드 조항이 명시 금지한 「개수」 표현이다** — 「파일이 자라면 그 표현이 조용히 거짓이 되고,
가드는 아무도 검증하지 않으므로 거짓인 채로 남는다」. 여정 목업이 7장이 되는 순간 이 괄호는 거짓이 된다(현재 `docs/mockups/JRN-*.html` 6장,
전부 `max-width: 720px` 블록 보유 — 실측). 복원 여부와 무관하게 이 꼴은 유지 대상이 아니다(2026-09-18 pin-guard-pass 선례).

## 제거 1줄 — 복원 경로별 근거

| 경로 | 절 | 자리 |
|---|---|---|
| ③ PR 본문(#114 「문제」·「원인」 · #115 첫 문단) | ⑵ 전량 · ⑶ 축자 | A |
| ① 코드(`tokens.css:1892-1920` 의 `≤1180px` 블록) | ⑴ | A |
| ② 저장소 문서(설계 트래커 「`@media` 표면의 등재 (rct_20260922-0001)」 절 + 「등재된 편차」 5행 `:500-504`) | ⑴ · ⑶ | A |
| ④ 커밋 메시지(`d6db7fe` · `bfb5334` 제목) | ⑵ · ⑶ 요약 | A |

## 유지 0줄

없음. 판정 표면 1줄이 세 절 모두 다른 곳에 있다. 이 파일의 옛 62줄은 앞 세 패스(reprocess-console-pass · reprocess-surface-pass ·
trend-rejudge-pass)의 판정 그대로이고 이 패스가 다시 보지 않았다.

**남길 앵커가 없다는 것도 실측이다.** 이 파일에서 앞 패스들이 남긴 것은 `CMP-*`/`PAT-*`/`STP-*` 구획 앵커와 목업 이름 사상인데, 이 블록에는
둘 다 없다 — 마커가 없어 `check-mockup-render.py` 의 R3 모집단(주석에서 긁는 마커 집합)과 무관하고, 목업 이름을 구현 이름으로 바꾼 사상
(`.formrow` → `.trend-ov-row`·`.trace-lookup`·`.rp-form` 등)은 주석이 아니라 설계 트래커 「등재된 편차」 5행이 들고 있다. 그리고 **이 파일의
`@media` 기존 규약이 무주석이다** — `≤1180px` 블록(29줄)에 주석 0줄. 한쪽만 주석을 갖는 것이 오히려 규약 이탈이었다.

## 판단이 갈린 자리

없음. 다만 **감지 인계와 갈린 자리가 하나** 있어 적는다.

1. **감지는 증상 진단 한 문장을 「애매하면 남긴다」 대상으로 넘겼다.** 인계문은 「증상 진단 한 문장은 PR 본문·트래커 어디에도 없는 렌더링
   관측」이라며 「블록 전체 제거가 아니라 비복원 몫 1줄로 줄이는 표적 재판정」을 완료 형태로 적었다. 실측에서 그 전제가 틀렸다 — 감지가 읽은
   PR 은 **#115 하나**이고, 그 문장의 주인은 **#114** 다(위 ⑵). #115 본문 자신이 첫 문단에서 `#114`(`bfb5334`)를 호명하므로 경로 ③ 은 두 PR 을
   함께 읽는 것이 맞다. 정책의 「애매하면 남긴다」는 **복원 여부가 갈릴 때** 적용되는데, 여기서는 갈리지 않는다 — 주석보다 상세한 원문이
   있다. 그래서 1줄 축약이 아니라 전량 제거로 처분했다.
   정책 소유자가 「다른 PR 로만 복원되는 문장은 코드 옆에 요약 1줄을 남긴다」로 정하면 이 1줄은 되살릴 대상이다(원문은 이 문서 표 A).
2. **미디어 쿼리 순서 가드를 새로 넣지 않았다.** README 가 유지 대상으로 꼽는 「편집 지점에서만 효과가 있는 가드」에 가장 가까운 것은
   「1180 → 720 두 블록의 선후를 깨지 말 것」(뒤에 오는 것이 이긴다)인데, **현재 주석에는 그 문장이 없다**. 없는 것을 새로 쓰는 것은 이 패스의
   방향(복원 가능한 주석을 걷는다)이 아니고, 그 가드는 이미 설계 트래커 「`@media` 표면의 등재」 절과 PR #115 「주의사항」이 굵게 들고 있다
   (`rct_20260831-0001` 이 남긴 주의사항으로 등재). 정책 소유자가 이 가드를 코드 옆에 두기로 정하면 그때 **가드 꼴로**(금지만 말하고 출처를
   가리키는 한 줄) 넣는다 — 메커니즘·개수는 담지 않는다.

## 검증

```
$ git diff --stat d6db7fe -- web
 web/src/tokens/tokens.css | 4 ----                        # 4 deletions, 전부 주석 줄
$ python3 - <<'PY'   # 블록 주석 스트립 후 sha256 — HEAD vs 편집 후
  e7476521469f… == e7476521469f…   SAME (주석 외 무변경)
PY
$ python3 scripts/check-mockup-render.py .  | diff - before.txt   # 빈 출력(rc=0)
    R3 in-scope 27종 · R4 3축 0건 · R5 3축 0건 — 편집 전후 동일
$ python3 scripts/check-journey-mockup.py . | diff - before.txt   # 빈 출력(rc=0)
    PASS — 링크 164건 · R10/R11/R12 통과 — 편집 전후 동일
$ python3 tests/e2e/check_scenario_mapping.py                     # rc=0
$ (cd web && npm run lint)                                        # rc=0, 무출력
$ (cd web && npm test)                                            # Test Files 9 passed · Tests 56 passed
$ (cd web && npx tsc -b)                                          # rc=0
$ <지문 스크립트>   # lines=2431 files=134 / d888d2b2… = #115 착지 전 baseline 과 바이트 동일
```

파일 단독 계수 `tokens.css` 63 → 62. 원장 재계수: 파일별 원장 138행 ↔ 지문 파일별 계수를 대조해 기준 트리 ⑴ 1파일 10 · ⑵ 1파일 1 == 옛
말미 10 + 증가분 1, 행 갱신 후 ⑴ 1파일 10 · ⑵ **0**(계수 밖 감소 `batch-pvc.yaml` 9→7 · `pvc.yaml` 소멸 그대로).
`check-data-format-change.py` 는 `web/src/tokens/tokens.css` 와 `docs/comment-policy/**` 가 `SENSITIVE_PATHS` 10항목·`CONTENT_RULES`
(python·go glob) 어느 쪽에도 없어 `format_changed=false` 자리다 — `review/manual-approval` 자동 success(#115 가 같은 경로 조합으로 실측).

## 원장 반영

- 패스 이력 행 `| 2026-09-22 | phone-media-pass | d6db7fe | 2432 | 1 | 2431 | 134 → 134 |`.
- 「패스 이력」 아래 「phone-media-pass도 표적 패스다」 문단.
- 파일 행 `web/src/tokens/tokens.css` 63 / 1 / 62 (기준 패스 갱신, 행 신설 없음 — 138 그대로).
- 말미 집계 `**phone-media-pass 기준 · 레포 전체** | 2432 | 1 | 2431`, 잔여 10 그대로(⑴ 10 사람 몫 · ⑵ 0).

## 범위 밖 (다음 패스로)

- **무인 패스의 다음 선은 다시 없다** — ⑵ 가 0 이다. 지문이 또 자라야(자매 슬라이스가 판정 범위에 주석을 들여야) 다음 표적이 생긴다.
  이번 주기가 그 대기-착지-판정 사이클을 한 번 돌았다.
- ⑴ `scripts/check-data-format-change.py` 10줄 · `deploy/overlays/prod/batch-pvc.yaml` 머리 7줄(감소분 · 사람 게이트) — **사람 몫**.
  `main` ruleset 이 `review/manual-approval` 을 필수 status 로 요구하고 그 status 는 두 경로에 붙지 않는다(실측 재확인 —
  `required` · `review/manual-approval` 두 건이 필수).
- `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터 — 직전 패스 「판단이 갈린 자리」 2 그대로, 두 파일을 함께 여는 web 패스에서.
- `test_feeds.py`·`test_llm.py`·`test_aggregate.py` 의 인라인 AC 태그 — 정책 소유자가 처분을 정할 때 함께.
- 미디어 쿼리 순서 가드의 코드 옆 배치 — 위 「판단이 갈린 자리」 2.
- `ac3-8` 머리 단언 목록 표식 · 재판정 후보 5 · 원본 누락 좌표 — 직전 패스 말미 그대로.
