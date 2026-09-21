# dash-brief-pass — `Dashboard.tsx`·`Dashboard.test.tsx` 가 #84 로 들인 31줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `0f4f04e`(#104 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([journey-gate-pass](2026-09-21-journey-gate-pass.md))가 말미에 「다음 패스의 선은 dash 묶음
`web/src/screens/Dashboard.tsx` +19 · `Dashboard.test.tsx` +12」로 이름 붙인 두 파일의 **증가분만** 판정한다.
추적 task는 `rct_20260921-0011`(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **제거 23줄 / 유지 8줄**(그중 정정 3자리는 지문 −0). 레포 전체 지문은 `2521 → 2498`(파일 `134 → 134`).
실행 코드는 한 바이트도 바뀌지 않았다 — 두 파일의 diff 에서 주석이 아닌 줄의 추가·삭제는 0 이고
`vitest`·`eslint`·`tsc -b` 는 편집 전후 같은 결과다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

`git blame -s` 로 두 파일의 주석 줄을 커밋별로 나누면:

| 파일 | 커밋 | 줄 수 | 판정 상태 |
|---|---|---:|---|
| `Dashboard.tsx` | `763b8f4` (#84) | 19 | **이 패스** — 머리 9 · catch 2 · `entryBrief` 머리 2 · 검색 3 · JSX 3 |
| `Dashboard.test.tsx` | `473b3cc` (#81) | 5 | dashboard-surface-pass 가 유지(남음 5) — 이 패스 무접촉 |
| `Dashboard.test.tsx` | `763b8f4` (#84) | 12 | **이 패스** — `afterEach` 3 · 테스트 본문 9 |

`Dashboard.tsx` 의 행은 dashboard-surface-pass 가 **남음 0** 으로 닫았고 #84 가 그 직후(16:40Z) 착지했으므로 19줄
전량이 증가분이다. `Dashboard.test.tsx` 의 옛 5줄은 #84 가 갈아 쓰지 않았다(전부 `473b3cc` 귀속) — 그래서 증가분만
판정해도 행의 불변식(「남음」 == 비고가 열거하는 줄 수)이 선다: 남은 7 = 5 + 2.

## 복원처 — 한 커밋이 함께 연 세 겹

이 31줄의 특징은 trend-surface-pass 가 본 것과 같다 — **복원처가 같은 커밋 안에서 함께 열렸다.** #84 는 카드를
세우며 PR 본문(③)에 설계 근거를 절마다 적었고, 같은 커밋이 설계 트래커 「해소된 등재」 행(②)과 doc-tracker
2026-09 변동 이력 행(②)에 같은 사실을 산문으로 옮겼다. 그 뒤 #87 이 트래커에 수명 계약 행을 하나 더 적었다(②).

| 복원처 | 위치 |
|---|---|
| ③ PR #84 본문 | 「무엇을 좁히는가」 표 · 「무엇이 바뀌는가」 6항 · 「검증」 |
| ② 설계 트래커 | 「해소된 등재」 `#84 (squash)` 행 · `#87 (squash)` 행 · 「등재된 편차」 `기간·단위 컨트롤` · `기간 표기` · `축 select` · `순번` 행 |
| ② doc-tracker 2026-09 | 변경 이력 2026-09-20 「`dash` `오늘의 조회 조건` 카드 착지」 행 · 「복원 계약의 저장소 수명 이식」 행 |
| ② 여정 문서 | `docs/user-journeys/JRN-daily-scan.md` §4 표 「중도 이탈 → 다음 진입 시 마지막 조회 조건 복원 \| `STP-open-brief`」 · `STP-shortlist` 페인포인트 「관심 대상 북마크·워치리스트 (현재 범위 밖, 백로그 후보)」 |
| ① 코드 | 테스트 이름 7개 · `entryBrief` 본문 · `filter(... includes(needle))` · 두 빈 상태 조건문 · `Trend.tsx` 의 같은 catch 2줄 |

## 제거 23줄 — 복원 경로별 근거

### `Dashboard.tsx` 13줄

**⑴ 머리 9줄 → 3줄 (33-41행, −6).** 지운 것은 앞 4줄(빈 `//` 포함)과 뒤 2줄.

```
// 여정 §4 의 네 번째 분기 — 「중도 이탈(목록만 보고 종료) → 다음 진입 시 마지막 조회
// 조건 복원」. 그 분기의 귀속 단계가 `STP-open-brief`(= 이 화면)이고, 목업은 그 약속을
// `오늘의 조회 조건` 카드로 그린다.
//
…
// 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹한 것은 **대상 저장**(북마크·워치리스트)
// 이지 조회 조건 보존이 아니라, 파킹으로 덮이지도 않는다.
```

| 문장 | 복원처 |
|---|---|
| 「여정 §4 의 네 번째 분기 … 귀속 단계가 `STP-open-brief`」 | **②** 여정 문서 §4 표 행이 그 셋(분기 · 복원 · `STP-open-brief`)을 한 행에 적는다. **③** PR #84 「무엇을 좁히는가」 표 셋째 행 축자. **①** 아래 JSX 앵커 `STP-open-brief — 오늘의 조회 조건` 이 같은 좌표를 단다 |
| 「목업은 그 약속을 `오늘의 조회 조건` 카드로 그린다」 | **②** 트래커 #84 해소 행 「`Dashboard.tsx` 가 `STP-open-brief` 자리에 카드를 세운다 — 제목·sub 는 목업과 바이트 동일」 |
| 「여정 문서가 파킹한 것은 대상 저장이지 조회 조건 보존이 아니라」 | **③** PR #84 「여정이 파킹한 것은 **대상 저장**이지 조회 조건 보존이 아니다」(축자). **②** doc-tracker 「여정 문서가 파킹한 것은 대상 저장(북마크·워치리스트)뿐이므로」 · 여정 문서 `STP-shortlist` 페인포인트 행 |

trend-rejudge-pass 가 `Trend.tsx` `VIEW_KEY` 앞에서 「여정 §4 분기·요약 카드 문면 3줄」을 트래커 #80 해소 행으로 지운 것과
같은 자리다. 남긴 3줄은 아래 「유지」.

**⑵ `readStoredBrief` catch 1줄 (57행) · `storeBrief` catch 1줄 정정 (66행, 지문 −0).**

```
    // 스토리지가 막힌 브라우저에서도 화면은 그대로 열려야 한다 — 복원만 포기한다.
```

`Trend.tsx` `readStoredView`·`storeView` 의 catch 가 **바이트 동일한 두 줄**을 먼저 갖고 있었고(`aca481c`/#80, 16:0xZ 착지 —
#84 보다 앞), trend-surface-pass 가 그 둘을 「`catch {}` 가 복원하는 것은 삼킨다까지고 **왜** 삼키는지는 아니다」로
**유지**했다. 그래서 설명의 주인은 `Trend.tsx` 이고 이 파일의 사본은 정책의 「다른 파일 주석의 재진술 — 설명의 주인에만
둔다」 유형이다(dashboard-surface-pass 가 `Dashboard.test.tsx` 에서 「같은 문장의 세 번째 사본」을 지운 것과 같은 처분).
**①** 테스트 이름 `still renders when the browser refuses storage` 와 **③** PR #84 「검증」 「저장소가 막힌 브라우저에서도 렌더」가
사실 자체를 적는다. 둘째 catch 는 본문이 주석뿐이라 지우면 `eslint` `no-empty`(`js.configs.recommended`) 가 빈 블록으로 잡는다 —
reprocess-console-pass 가 `client.ts` 빈 catch 에서 본 것과 같은 꼴이라 **주인 지목 포인터 1줄로 정정**했다
(「삼키는 이유는 `Trend.tsx` 의 같은 두 catch 가 적는다 — 저장 실패는 조회를 막지 않는다」). 원래 둘째 줄의 「같은 이유로」는
윗줄을 가리키고 있었으므로 윗줄을 지우면 가리킬 곳이 없어진다 — 포인터가 그 자리를 잇는다.

**⑶ `entryBrief` 머리 2줄 (70-71행).**

```
// 체크박스를 끈 채로 닫았으면 다음 진입은 기본값으로 연다. 다만 **끈 선택 자체는** 남겨야
// 한다 — 기억하지 않으면 매번 다시 꺼야 하고, 그러면 체크박스가 조건이 아니라 잔소리가 된다.
```

**①** 바로 아래 세 줄 `if (!stored.restore) return { ...DEFAULT_BRIEF, restore: false };` 가 첫 문장을 코드로 말한다(정책의
「선언 재진술」). **③** PR #84 「체크박스를 끄면 복원하지 않되 **끈 선택 자체는** 기억한다(잊으면 매번 다시 꺼야 한다)」(축자).
**②** 트래커 #84 해소 행 「체크박스를 끄면 복원하지 않되 **끈 선택 자체는** 기억한다」 · doc-tracker 「(체크박스로 끌 수 있으며
끈 선택도 기억한다)」. **①** 테스트 이름 `opens on the defaults when restoring is off — but remembers that choice`.
「잔소리」 비유는 `Dashboard.test.tsx:205` 의 사본과 함께 걷었다(아래).

**⑷ 검색 3줄 → 1줄 (104-106행, −2).**

```
  // 검색은 **보기를 좁히는 것**이라 조회를 다시 걸지 않는다 — 서빙이 검색어를 받지 않고
  // (`api.dashboard(axis)`), 목업도 같은 자리에서 이미 받은 목록을 거른다(`rows()` 의
  // `indexOf`). 대소문자를 구분하는 것까지 목업과 같다.
```

**③** PR #84 「검색은 **받아 둔 목록을 거른다** — 서빙이 검색어를 받지 않으므로(`api.dashboard(axis)`) 조회를 다시 걸지 않는다.
목업도 같은 자리에서 `rows()` 의 `indexOf` 로 거른다」(축자). **②** 트래커 「순번」 행 「검색은 **보기를 좁히는 것**이지 순위를
다시 매기는 일이 아니다」 · #84 해소 행 「검색은 받아 둔 목록을 거르고(서빙은 검색어를 받지 않는다)」. **①** `useEffect` 의존
배열이 `[axis]` 뿐이고 `filter((r) => r.subject.includes(needle))` 가 거른다. 남긴 1줄은 아래 「유지」.

**⑸ `STP-open-brief` JSX 블록 정정 (150-157행, 지문 −0 · 물리 −7).** 앵커 첫 줄만 남기고 뒤 문단 둘을 걷었다.

| 문장 | 복원처 |
|---|---|
| 「서빙에 새로 물을 것이 없고(축은 이미 조회 인자, 검색은 받아 둔 목록을 거르는 일), 복원은 브라우저 저장소가 맡는다」 | **③** PR #84 「무엇이 바뀌는가」 2·3항. **①** `api.dashboard(axis)` · `filter` · `storeBrief` |
| 「기간·단위 컨트롤은 여기 두지 않는다 — 서빙이 기간 파라미터를 받지 않아 … 설계 트래커가 따로 등재한 행」 | **②** 트래커 「등재된 편차」 `기간·단위 컨트롤 … 부재` 행(「서빙 API가 기간 파라미터를 받지 않는다」) · `기간 표기` 행 「표시할 기간 개념이 구현에 없다(`api.dashboard(axis)` 가 축 하나만 넘기고 …)」 — 주석이 스스로 「트래커가 등재한 행」이라고 복원처를 지목한다 |
| 「카드를 응답 바깥에 두는 이유: 축을 바꾸면 조회가 다시 나가며 `data` 가 잠시 비는데 … 방금 누른 자리가 없어진다」 | **③** PR #84 「카드는 응답 바깥에 둔다 — 축을 바꾸면 `data` 가 잠시 비는데, 조건을 고르는 컨트롤이 그때마다 사라지면 방금 누른 자리가 없어진다」(축자) |

**⑹ 빈 검색 결과 JSX 1줄 (230-231행).** 「수집이 없는 것과 검색어가 좁힌 것은 다른 사건이라 문면을 가른다 — 목업도 같은
자리에서 후자만 따로 말한다(`emptybox`)」. **②** 트래커 #84 해소 행 · doc-tracker 「걸리는 대상이 없으면 목업 문면
`검색어에 걸리는 대상이 없습니다.` 로 수집 부재와 구분해 말한다」. **③** PR #84 「**수집이 없는 것**과 구분해 말한다」.
**①** 바로 아래 두 조건문(`top_subjects.length === 0` / `ranked.length === 0`)이 두 사건을 갈라 렌더하고, 테스트 이름
`says the search came up empty instead of claiming there is no data` 가 같은 말을 한다.

**⑺ `col-12` JSX 1줄 (244-246행).** 「브리프 카드가 들어오며 위 행이 목업의 `col-4 + col-8` 로 찼다. 이 카드는 대응하는
목업이 없는 구현 표면이라 … 5칸으로 두면 격자에 7칸이 빈 채 혼자 남는다 — 한 행을 통으로 쓴다」. **③** PR #84
「순위 카드는 목업의 `col-4 + col-8` 배치에 맞춰 col-7 → col-8. 그 아래 `전체 분위기 구성` 카드는 대응 목업이 없는 구현
표면이고 5칸으로 두면 격자에 7칸이 빈 채 혼자 남아 col-12 로 한 행을 쓴다」(축자). 경로 ③ 단독 복원 — dashboard-surface-pass
(PR #81 본문)·e2e-runner-pass(PR #39·#44 본문) 선례.

### `Dashboard.test.tsx` 10줄

| 자리 | 지운 문장 | 복원처 |
|---|---|---|
| `afterEach` 3줄 → 1줄 (12-14행, −2) | 「브리프 카드의 복원은 **날을 넘겨 사는** 저장소를 쓴다(`localStorage`). 탭 수명이 아니라 그보다 길기 때문에」 · 「복원 자체를 단정하는 테스트가 그 수명을 이용하므로 더 그렇다」 | 수명은 `Dashboard.tsx` `BRIEF_KEY` 앞 주석(주인)·트래커 #84·#87 행(②)·PR #84(③). 「복원 단정 테스트가 그 수명을 이용한다」는 **①** 아래 두 테스트가 `cleanup()` 뒤 다시 렌더하는 모양 그 자체. 남긴 1줄은 아래 「유지」 |
| 카드 문면 테스트 2줄 → 1줄 (115-116행, −1) | 「제목과 sub 를 함께 단정한다 — sub 가 「어제」라고 적기 때문에 이 카드는 탭 수명보다 긴 저장소를 요구한다」 | **①** 테스트 이름 `draws the card the journey promises, with the copy that dates the promise` 가 「문면이 약속의 날짜를 단다」를 말한다. 수명 근거는 위와 같은 주인·②·③ |
| 검색 테스트 2줄 (137-138행) | 「서빙은 검색어를 받지 않는다(`api.dashboard(axis)`). 조회가 한 번 더 나갔다면 … **없는 파라미터로 다시 물은** 구현이라는 뜻이다」 | **①** 테스트 이름 `narrows the rank list by the search term without re-querying serving` + 단언 `toHaveLength(calls)`. **③** PR #84 「서빙이 검색어를 받지 않으므로(`api.dashboard(axis)`) 조회를 다시 걸지 않는다」. trend-rejudge-pass 「진입 상태 나레이션 2」 처분과 같은 형태 |
| 빈 검색 테스트 2줄 (155-156행) | 「수집이 없는 것과 검색어가 좁힌 것은 다른 사건이다 — 후자에 전자의 문면을 쓰면 파이프라인을 다시 돌리라고 시킨다」 | 위 ⑹ 과 같은 문장의 사본(②③). 「파이프라인을 다시 돌리라고 시킨다」는 **①** 단언이 부재를 확인하는 `.placeholder-note` 의 문면 `배치 파이프라인을 먼저 실행하세요` 그대로 |
| 탭 넘김 테스트 2줄 (172-173행) | 「`sessionStorage` 였다면 탭이 닫히는 순간 사라진다. 카드 sub 가 약속하는 것은 「어제 닫을 때의 조건」이므로, 탭을 넘겨 살아남아야 그 문장이 참이 된다」 | **①** 테스트 이름 `reopens with the conditions the reader left, across a closed tab` + 바로 아래 `sessionStorage … toBeNull()` / `localStorage … not.toBeNull()` 단언 쌍. **②** 트래커 #87 행 · doc-tracker 두 행. 주인은 `Dashboard.tsx` `BRIEF_KEY` 앞 3줄. trend-rejudge-pass 가 `Trend.test.tsx` 「저장소 수명 3줄」을 같은 근거로 지웠다 |
| 비복원 테스트 1줄 (205행) | 「끈 선택까지 잊으면 매번 다시 꺼야 한다 — 체크박스가 조건이 아니라 잔소리가 된다」 | **①** 테스트 이름 `… — but remembers that choice`. **③** PR #84 「(잊으면 매번 다시 꺼야 한다)」. `Dashboard.tsx` ⑶ 과 같은 문장의 사본 |

## 유지 8줄 — 근거

| 파일 | 줄 | 왜 남기나 |
|---|---:|---|
| `Dashboard.tsx` | `BRIEF_KEY` 앞 3 | **판단 분기 ①(아래).** 수명 근거의 **설명의 주인** — `Trend.tsx:81` 이 「`Dashboard.tsx` 의 `BRIEF_KEY` 앞 주석이 근거의 주인」이라고 지목하고 trend-rejudge-pass 가 그 전제로 `Trend.tsx` 쪽 5줄을 2줄로 줄였다 |
| `Dashboard.tsx` | `storeBrief` catch 1 | 정정 후 주인 지목 포인터 — `eslint` `no-empty` 가 빈 블록을 잡는다(위 ⑵) |
| `Dashboard.tsx` | 검색 1 | 「대소문자를 구분하는 것까지 목업(`rows()` 의 `indexOf`)과 같다」 — `includes` 와 `indexOf` 가 둘 다 대소문자를 가린다는 것은 코드에서 읽히지만, 그것이 **의도된 목업 동등성**이라는 것은 어느 문서에도 없다(PR·트래커는 대소문자를 말하지 않는다). 지우면 다음 사람이 「대소문자 무시」로 고치며 목업과 갈린다 |
| `Dashboard.tsx` | `STP-open-brief` 앵커 1 | 목업 좌표 앵커 — `Reprocess.test.tsx` 의 `STP-` 태그 · `Trace.tsx` 의 `CMP-` 앵커 · `Trend.tsx:74` 「목업 `JRN-daily-scan.html` 의 `trendSeries()` 와 같은 규칙」과 같은 꼴 |
| `Dashboard.test.tsx` | `afterEach` 1 | 「저장소도 테스트 사이에 살아남는다 — 지우지 않으면 앞 테스트가 남긴 조건이 다음 테스트의 진입 조건이 된다」 — 바로 위 `cleanup()` 의 유지 2줄(dashboard-surface-pass 「vitest 자동 cleanup 부재」)과 같은 성격의 하네스 사실. `localStorage.clear()` 가 복원하는 것은 「지운다」까지고 **왜** 지우는지는 아니다 |
| `Dashboard.test.tsx` | 카드 문면 테스트 1 | 「문면이 바뀌면 아래 복원 단정도 함께 다시 판단해야 한다」 — 편집 지점 가드(README 「편집 지점에서만 효과가 있는 가드」). 메커니즘·개수·행 위치를 담지 않는다 |
| `Dashboard.test.tsx` | 옛 5(`473b3cc`) | dashboard-surface-pass 의 판정 그대로 — 이 패스 무접촉 |

## 판단이 갈린 자리 / 감지 인계와 갈린 이유

**판단 분기 1.**

1. **`BRIEF_KEY` 앞 수명 근거 3줄을 지울 것인가.** 복원처는 실재한다 — **③** PR #84 「「어제」를 약속하는 문면은 탭이
   닫히면 사라지는 저장소로 지킬 수 없고 … 수명은 `localStorage` 다」, **②** doc-tracker 「목업 문면(…)이 날을 넘는 보존을
   약속하고 … 복원 계약의 수명을 **탭 수명이 아니라 세션 넘김**(`localStorage`)으로 확정했다」, 트래커 #84·#87 행. 정책
   문면만 보면 제거다. 그런데 `Trend.tsx:81-82` 가 이 주석을 **이름으로** 「근거의 주인」이라 지목하고, trend-rejudge-pass 가
   그 전제로 `Trend.tsx` 쪽을 2줄(대응 + 주인 지목)로 줄였으며, PR #87 본문도 「`Dashboard.tsx` `:34-41` 주석이 사유를 직접
   적는다」고 인용한다. 지우면 `Trend.tsx` 의 포인터가 **없는 것을 가리키는 거짓 주석**이 되는데 — 정책이 드는 실패 모드 그
   자체다 — `Trend.tsx` 는 trend-rejudge-pass 의 행이고 이 패스의 표적 밖이라 여기서 함께 고치지 않는다. **남긴다.** 처분은
   web 묶음이 두 파일을 함께 열 때(`Trend.tsx` 포인터를 트래커 #87 행으로 옮기며) 한 번에. 감지 인계(「그 주인 문장은 유지 쪽」)와
   같은 결론이나 이유는 「복원처 부재」가 아니라 「주인 포인터의 고아화」다.
2. **catch 사본을 주인 포인터로 바꿀 것인가, 그대로 둘 것인가.** 갈래를 닫았다 — 사본은 지우고(첫 catch), 린터가 빈 블록을
   막는 자리(둘째 catch)만 포인터로. `client.ts` 선례가 「주석이 든 블록만 비어 있지 않은 것으로 본다」를 실측했다.
3. **⑴ `scripts/check-data-format-change.py` 10줄을 이 패스에 넣을 것인가.** 넣지 않았다 — 복원처(PR #75 · 같은 파일
   docstring)와 판정 유형이 다른 묶음이고, 두 묶음을 한 패스에 섞으면 리뷰가 두 판정을 한 번에 읽어야 한다. 원장 말미의
   조건절(「#75 가 착지하면 ⑴ 에 들어온다」)은 착지 tip 기준 실측값 **1파일 10줄**로 고쳐 적고, 다음 선으로 넘긴다.

## 검증

```
$ git diff --stat 0f4f04e -- web/src
 web/src/screens/Dashboard.test.tsx | 14 ++------------
 web/src/screens/Dashboard.tsx      | 30 +++---------------------------
 2 files changed, 5 insertions(+), 39 deletions(-)     # 추가 5줄 전부 주석 · 삭제 39줄 전부 주석(JSX 연속 줄 포함)
$ (cd web && npx vitest run)                            # Test Files 9 passed · Tests 56 passed (편집 전 56)
$ (cd web && npx eslint . && npx tsc -b)                # rc=0 · rc=0
$ <지문 스크립트>                                        # lines=2498 files=134 (편집 전 2521/134)
$ diff hits-before hits-after | grep -c '^<' ; … '^>'   # 28 / 5 — Dashboard.tsx 16↓3↑ · Dashboard.test.tsx 12↓2↑
```

파일 단독 계수 `Dashboard.tsx` 19 → 6 · `Dashboard.test.tsx` 17 → 7. 지문 밖 게이트(`check-mockup-render.py`·`check-journey-mockup.py`)는
`web/src` 주석을 읽지 않으므로 무관하고, PR 의 `web` 잡(vitest·eslint·tsc)이 이 편집의 CI 집행자다.

## 원장 반영

- 패스 이력 행 `dash-brief-pass | 0f4f04e | 2521 | 23 | 2498 | 134 → 134`.
- 파일 행 `web/src/screens/Dashboard.tsx` 3/3/0 → **19/13/6**, `Dashboard.test.tsx` 7/2/5 → **17/10/7**(비고가 7 = 5 + 2 를 열거).
  신설 0, 행 수 138 그대로.
- 말미 집계 **2521/23/2498** · 잔여 ⑴ **1파일 10줄**(`scripts/check-data-format-change.py`, #75 착지 tip 실측 — 직전 말미의
  조건절을 실측값으로 정정) · ⑵ **12파일 86줄** · 보류 0 · 행>실측 1(`batch-pvc.yaml`, 변동 없음).

## 범위 밖 (다음 패스로)

잔여 96줄 — 다음 선은 `python/packages/aggregation/tests/test_aggregate.py` +18(⑵ 최대) 또는 ⑴ `scripts/check-data-format-change.py`
10줄(복원처 PR #75 본문 · 같은 파일 docstring; 감지 관찰 — `:44`·`:63`·`:64`·`:102`·`:105` 는 축자 복원 후보, `:183-185` 의
ruff-format 모양 의존 3줄은 유지 후보) → `Sentiment.tsx`·`Sentiment.test.tsx` 27 → 나머지. **`BRIEF_KEY` 앞 3줄과 `Trend.tsx:81-82`
포인터는 web 묶음이 두 파일을 함께 열 때 한 번에 처분한다**(판단 분기 ①). `batch-pvc.yaml`·`kustomization.yaml` 의 #92 내용 교체분은
다음 `deploy/` 표적 패스. 재판정 후보 5건과 원본 누락 좌표 2건(인덱스 :150 · 트래커 :25)은 원장 말미 그대로.
