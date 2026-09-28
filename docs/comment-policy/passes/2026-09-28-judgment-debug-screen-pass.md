# 2026-09-28 judgment-debug-screen-pass — `JRN-judgment-debug` 화면 2행 47줄 전건 판정

창 = `81c1156`→`a6edd0f`. 그중 판정 대상을 들인 것은 **`a6edd0f`(PR #199**, 자매 모델
`tbm_econ-opinion-monitor-docs-impl` 의 `rct_20260928-0006` 집행) 하나로, `Debug.tsx` 23줄 ·
`Debug.test.tsx` 24줄 = **47줄**을 판정 축 `—` 로 등재했다. 운영 규칙(「주석을 들이는 PR 은 자기 파일의
행을 더하고 판정 축을 `—` 로 둔다」)을 지킨 등재이고, **판정 의무만 남아 있었다**. 이 패스가 그 47줄을
네 축으로 판정한다 — 다른 188행은 건드리지 않는다.

`scripts/check-comment-ledger.py` 는 창 tip 에서 `rc=0`「불변식 통과」이지만 같은 출력이
`미판정(—): 행 2 · 47줄` 을 인쇄한다. **초록이 아니라 그 칸이 이 패스의 판정면**이다.

## 축별 원본

- **①** 코드 자체 — 이 두 파일에서는 대부분 **바로 아래 `it("…")` 이름**과 그 아래 단정이다.
- **②** `docs/user-journeys/JRN-judgment-debug.md`(§2 페르소나 · §3 단계 · §4 분기표) ·
  `docs/mockups/JRN-judgment-debug.html`(`data-step` 절과 그 안의 `<h3>`) ·
  PRD `pipeline-ops`(AC4.1~4.3).
- **③** PR **#199**(저작) 과 PR **#196**(`/api/debug` 조회 계약 — 「응답 형태」 절).
- **④** 스쿼시 커밋 `a6edd0f`. 본문은 `Co-authored-by:` 트레일러 둘뿐이라 **트레일러 제거 본문 0줄**이고,
  히트는 제목 「`feat(web): JRN-judgment-debug 화면 — /debug 가 조회 계약을 읽는다`」로만 가능하다.
  실측: 47줄 중 제목과 **연속 6자 이상** 일치하는 줄은 **2줄**뿐이고 둘 다 파일 머리 lede 안에 있으며,
  일치한 문자열은 `JRN-judgment-debug`(18자)·`/debug`(6자) — 둘 다 **식별자 토큰이지 명제가 아니다**.
  나머지 45줄의 최장 일치는 5자 이하다. ⇒ **④ 는 한 줄도 닫지 못했다**(공전). 그 실측을 적는 것이
  ④ 를 물은 결과이고, l-residual-axis-pass 가 ④ 로 실제 히트를 낸 것의 대조군이 된다.

## `web/src/screens/Debug.tsx` — 23줄 → 8줄 (제거 12 · 개작 3)

| 블록 | 줄 | 판정 | 근거 |
|---|---|---|---|
| 파일 머리 lede (`판단 디버깅(JRN-judgment-debug)…` 8줄) | 8 | **제거** | ② 여정 문서 §2 페르소나가 「틀린 게 모델인지, 입력인지, 우리 파서인지」를 **축자로** 갖고, §3 `STP-scan-run` 생각·감정이 「이 기사만 그런 건지, 그 시간 실행 전체가 그런 건지」를 갖는다. 「조회 축은 `record_id` 하나」는 ③ PR #196「응답 형태」절과 `selectDebugRecord`(go) 가 복원한다. ③ PR #199「무엇을 닫는가」+ 4단계 표가 같은 서사. **선례**: 같은 기능의 `debug.go` lede 를 같은 근거로 걷은 #198(mirror-pointer-guard-repass). |
| `lastJSONObject` JSDoc 6줄 | 6 → 3 | **개작(유지)** | 「모델은 초안을 낸 뒤 판단을 고쳐 다시 답하기도 한다」는 정책 유지 대상 **「chat-completions 엔드포인트의 문서화되지 않은 동작」** 그 자체다. 다만 요약 줄(「응답 원문에서 모델이 마지막으로 내놓은 JSON 을 읽는다」)은 **함수 이름이 복원**(①)하고 — 이 함수는 export 가 아니라 「TS export 함수의 JSDoc 요약 1줄」 유지 조항에도 들지 않는다 — 「목업이 `parse-mismatch` 로 그린 상태」는 ②, 「마지막 것을 최종 답으로 본다」는 ① 이라 걷었다. |
| 빈 `catch` 의 `// 코드 블록 안의 JSON 이 아닌 중괄호는 그냥 지나간다.` | 1 | **유지(판단 갈림)** | 네 축 어디에도 원본이 없고, **어겼을 때 조용히 깨진다** — 빈 `catch` 에 오류 처리를 더해도 단정 12건이 전부 통과한다. 정책의 「편집 지점에서만 효과가 있는 가드」. |
| `compareRows` JSDoc 1줄 | 1 | **제거** | ① 함수 이름·시그니처(`compareRows(version, call): CompareRow[]`)와 바로 아래 `pairs` 배열이 복원. 미export 라 유지 조항 밖. `STP-read-exchange` 귀속은 ② 목업 `data-step="STP-read-exchange"` 절의 `<h3>응답 ↔ 저장값</h3>` 이 복원. |
| 세션 한정 판정 2줄 | 2 | **제거** | ② 여정 §3 `STP-route-cause` 페인포인트가 「판정이 남지 않으면 …(현재 AC 없음 — 백로그 후보)」를 축자로 갖고, ③ PR #199「범위 밖」절이 「화면은 판정을 세션 안에만 두고 그 사실을 스스로 적는다」로 같은 문장을 적는다. ① `useState` 로 선언된 바로 아래 상태가 세션 한정임을 말한다. |
| JSX 마커 5줄 | 5 → 4 | **개작 4 · 제거 1** | `STP-*` 구분선은 ①②③ 로 닫힌다 — 바로 아래 `<h3>` 가 절 이름을 축자로 들고(`고른 결과`·`모델 호출 기록`·`응답 ↔ 저장값`·`배치 실행`·`원인 판정`), 목업의 `data-step` 절이 **같은 제목으로** 단계 귀속을 복원하며, 여정 §3 이 단계 이름의 주인이다. 반대로 **`CMP-*` 는 남긴다** — `check-mockup-render.py` 의 `markers()` 가 `web/src` 주석에서 그 이름을 읽어 R3 모집단을 만들므로 안전망을 두 벌로 유지한다(선례 web-src-axis-pass). `CMP-*` 가 없던 `STP-route-cause` 한 줄만 통째로 제거. |

## `web/src/screens/Debug.test.tsx` — 24줄 → 2줄 (제거 22)

케이스 머리 주석 14블록이 **전부** 바로 아래 `it("…")` 이름의 재진술이다. 대표 대조(왼쪽 주석 ↔ 오른쪽 테스트 이름):

| 주석 | ① 원본(테스트 이름) | 보태는 축 |
|---|---|---|
| `The reason the screen exists: request, raw reply and the run that made them…` | `puts the prompt, the raw reply and the owning run on one screen` | ② 여정 완료 기준 · ③ #199 4단계 표 |
| `The screen's sharpest judgement: the model's LAST answer disagreed with what was stored…` | `flags a field where the final reply and the stored value disagree` | ② §3 `STP-read-exchange` 생각·감정 「모델은 '혼합'이라고 답했는데 저장은 '긍정'이네… 파서가 문제다」 |
| `"어긋난 필드만 보기" narrows the table to exactly those rows.` | 바로 아래 3줄(`rowsBefore` → click → `toBeLessThan`)이 복원 | — |
| `§4 branch: a record the analyzer never called the model for…` | `shows why no call was made instead of an empty exchange` | ② §4 분기표 · ③ #196 `no-call` |
| `§4 branch: a reused answer names the original call — one hop, not a copy.` | `names the original call when this run reused an answer` | ③ #196 「재사용이면 **원 호출 한 홉 뒤**」 |
| `§4 branch: rows written before call logging existed…` | `routes rows written before call logging to sample re-analysis` | ② §4 「재현이 필요하면 표본 재분석으로 넘긴다」 · ③ #196 `unrecorded` |
| `§4 branch: a call id whose record is gone is NOT the same as "never called".` | `distinguishes a missing call record from a record that was never called` | ③ #196 `call-record-absent` |
| `A failed call reports the retry count and the last error (AC4.2).` | `reports the retry count and last error of a failed call` | ② PRD AC4.2 |
| `A record with no run record is a missing RECORD, not a missing run.` | `says the run record is missing rather than drawing an empty run` | — |
| `A lookup that found nothing must read as "nothing to replay", not as a failure.` | `separates an unknown record from an empty lake` | ③ #196 이 `requested-missing`·`empty` 를 정상 계약값으로 열거 |
| `STP-route-cause: the verdict is session-local and the screen admits it.` | `records a cause and says the verdict does not outlive the screen` | ② §3 `STP-route-cause` |
| `The parser picks the model's LAST answer: reading the first one is exactly the bug…` | `compares the model's last answer, not its first draft` | ③ #199 본문의 같은 문단. 지식의 **주인은 구현 쪽**(`lastJSONObject`)이고 그쪽은 남겼다 |
| `The reply column carries the LAST object ("mixed"), the stored column the draft…` | 바로 아래 두 단정(`toBe("mixed")` · `toBe(VERSION.sentiment)`)이 복원 | 위 블록의 재진술이기도 하다 |
| `With no raw reply there is nothing to compare — the table is absent…` | `draws no comparison table when there is no raw reply` | — |
| `The stage table is read from the run record, not from the analysis rows.` | ② §3 `STP-scan-run` 「**레이크의 실행 기록(AC4.1)을 원천으로 하고**」 | ① 타입이 대안을 막는다 — `DebugResponse.run.stages` 만 `stage_name` 을 갖고 분석 행에는 그 필드가 없다 |

**남긴 2줄** — 픽스처 머리의
`One fully-recorded exchange. Every expectation reads off these objects rather than repeating a literal,
so a fixture edit cannot leave a stale assertion.`

네 축 어디에도 없고, **어겨도 조용히 통과한다** — 단정 하나를 리터럴로 바꿔 적어도 12건이 전부 초록이고
픽스처를 고친 뒤에야 낡은 단정이 드러난다. 정책 「편집 지점에서만 효과가 있는 가드」이며 개수·행 위치를
담지 않는다.

## 무접촉 증명

- **비주석 코드 바이트 동일.** 두 파일에서 `{/* */}`·`/* */`·`//` 를 떼고 빈 줄을 지운 텍스트가
  `HEAD` 와 브랜치에서 **완전 일치**한다(두 파일 모두 `IDENTICAL`). 그래서 `vitest` 12건·`tsc`·`eslint`
  결과가 움직일 수 없다.
- **다른 188행 불변.** 게이트 파서로 `{(표면, 첫 경로): (줄 수, 지문, 축)}` 을 base 와 브랜치에서 떠
  대조하면 **움직인 행은 2개**(이 패스의 두 행)뿐이다.
- **D·E 표면 무접촉** — 42행 603줄 · 20행 44줄, 지문·축 전건 불변.

## 음성 프로브 — 유지 두 건이 「조용히 깨지는가」를 실측

`vitest run src/screens/Debug.test.tsx`(12건) 기준. 판정의 근거가 된 판별식은
「그 줄을 어긴 편집이 테스트를 **즉시 붉히는가**」이고, 붉히면 그 줄은 경로 ①/③ 이 닫는다.

| 프로브 | 변이 | 결과 | 읽는 법 |
|---|---|---|---|
| **P1** | 빈 `catch {}` 에 `console.error` 를 더한다 | **12 passed** | 어겨도 조용하다 ⇒ 그 한 줄은 편집 지점 가드 **유지** |
| **P2** | `expect(cells[2]).toBe(VERSION.sentiment)` → `toBe("positive")` (리터럴 재진술) | **12 passed** | 픽스처 규약 가드를 어겨도 조용하다 ⇒ 남긴 2줄 **유지** |
| **CTRL** | `lastJSONObject` 가 **첫** JSON 을 고르게 한다 | **2 failed / 10 passed** | 스위트가 살아 있고, 「마지막 답을 읽는다」는 **붉게** 지켜진다 ⇒ 같은 명제를 적은 테스트 머리 주석 2줄은 ①③ 로 **제거** |

원장 쪽 세 발(`check-comment-ledger.py`):

| 프로브 | 변이 | rc | 출력 |
|---|---|---|---|
| ⒜ | `Debug.test.tsx` 행의 축 `①②③④` → `—` | **0** | `미판정(—): 행 1 · 2줄` — **rc 는 판정면이 아니다**. 완료 기준은 이 칸이다 |
| ⒝ | 같은 행의 줄 수 `2` → `3` 오기 | **1** | 불변식 위반 |
| ⒞ | `Debug.tsx` 에 주석 1줄 추가하고 원장 무갱신 | **1** | 불변식 위반 |

## 게이트 (로컬 전수)

```
python3 scripts/check-comment-ledger.py .        # rc=0 · 세 표면 미판정 0행 0줄
python3 scripts/check-mockup-render.py .         # rc=0 · 출력 md5 base 와 바이트 동일 (d2fcb4f7488f)
python3 scripts/check-journey-mockup.py .        # rc=0 · 출력 md5 base 와 바이트 동일 (db992d239c87)
node   scripts/check-journey-flow.js .           # PASS — 710 passed, 0 failed
python3 tests/e2e/check_scenario_mapping.py .    # rc=0
python3 scripts/check-data-format-change.py 6243bbd HEAD   # format_changed=false
cd web && npm run lint && npx tsc -b && npx vitest run && npm run build   # 0 errors · 98 passed · build ok
```

`check-mockup-render.py` 출력이 **바이트 동일**인 것이 「`CMP-*` 는 남기고 `STP-*` 만 걷었다」의 기계 증명이다
— R3 의 `markers()` 모집단이 움직이지 않았다.
