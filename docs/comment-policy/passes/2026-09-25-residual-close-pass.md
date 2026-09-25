# residual-close-pass (2026-09-25)

판정 트리 `0e38ab1f`(= #133 착지 tip), **머지 기준 커밋 `78e32da`**. 판정 표면 **75줄 / 10파일**
— 원장 말미가 「무인 패스의 다음 선」으로 이름 붙인 잔여 전량.
**제거 38 · 유지 37 · 판단 분기 9 · 문면 정정 1.**

## 판정 중에 자매 PR 둘이 착지했다

판정을 마치고 PR 을 열기 직전 재측정에서 main 이 `0e38ab1f` → `78e32da` 로 옮겨 있었다
(#134 `58e82a2` AC4.2 · #131 `78e32da` e2e 크리티컬 패스). **판정은 그대로 선다** — 두 PR 이
바꾼 17파일에 이 패스의 10파일이 **하나도 없다**(`docs/comment-policy/` 무접촉). 리베이스 후
다시 재 델타가 불변임을 값으로 확인했다:

| | 판정 트리 `0e38ab1f` | 머지 기준 `78e32da` |
|---|---|---|
| 편집 전 | `lines=2561 files=143` / `a2d37146…` | `lines=2637 files=145` / `74e979fe…` |
| 편집 후 | `lines=2523 files=143` / `cf6c61e3…` | `lines=2599 files=145` / `4a2a810f…` |
| **순 제거** | **38** | **38** |

완료 기준을 절대 지문이 아니라 **부모 대비 순 제거 38줄**로 잡았기 때문에 base 가 움직여도
판정이 낡지 않는다. 원장의 말미 잔여만 착지 시점 값으로 다시 계산했다(아래).

### 착지가 바꾼 것 — 잔여 요약

착지 시점 잔여는 **89줄**이다(이 패스 진입 시 88 − 판정 75 + 두 PR 이 새로 들인 76).
그중 **`tests/e2e/run.sh` 는 유예 2줄이 아니라 +48 로 자랐다** — #131 이 같은 파일을 344 changes 로
고쳤기 때문이다. **유예한 줄 수는 착지하면 낡는다**: 다음 패스는 원장의 「열린 PR 몫 2」를
승계하지 말고 새로 재야 한다. #134 가 들인 `calllog.py` 는 주석이 전부 docstring 이라 지문에
**한 줄도 잡히지 않는다** — 모델 정의가 열어 둔 사각지대의 실례다.

## 왜 쪼개지 않았나

직전 감지는 이 잔여를 「표적 A(`JRN-judgment-debug.js` 30줄) vs 표적 B(기능 PR 유래 34줄)
양자택일」로 넘겼다. **패스 이력을 재실측해 그 전제를 기각한다** — 직전 두 패스가 한 패스에서
각각 67줄(runlog-window-pass)·85줄(dash-rebuild-pass)을 판정했으므로 75줄은 이 모델의 통상
패스 크기 안이다. 쪼개면 남는 쪽이 다음 감지에서 다시 1순위로 올라오고, 특히 표적 A 는
**원장 행이 없어** 판정을 미루는 한 영구히 재등장한다(「각 행은 마지막으로 판정한 패스 기준」
규약). 한 패스로 닫아 잔여를 「사람 몫 11 + 열린 PR 몫 2」만 남겼다.

## 판정 표면을 어떻게 뽑았나 (재현 절차)

1. `versionScript` 파이프라인을 파일별로 재실행 → `lines=2561 files=143`.
2. 「파일별 원장」 147행을 파싱해 「읽는 법」의 계수 규약대로 두 몫을 합산 →
   미판정 **88줄** = ⑴ 행 없는 2파일 **41** + ⑵ 행이 있으나 자란 10파일 **+47**.
3. 제외 2건을 덜어 무인 사정권 **75줄 / 10파일**.

### 증분 추출의 두 함정

- **경로 접두사** — 지문은 `grep -EH` 로 **경로가 앞에 붙은** 줄에 `DIRECTIVE` 를 적용한다.
  접두사 없이 재현하면 `:#!/` 가 shebang 을 거르지 못해 파일당 1줄이 부푼다
  (`check-journey-mockup.py` 를 58줄로 세게 된다 — 실제 57).
- **gross ≠ net** — 기존 주석이 **개작**되면 순증가분보다 판정할 줄이 많다. 두 파일이 실제로
  그렇다: `store.go` 순증 **3** / 신규 **12**(#121 이 `readPartitions`·`NewsBody`·패키지 주석을
  통째로 고쳐 썼다), `test_cli.py` 순증 **4** / 신규 **5**. 증분은 gross 로 뽑고 원장 산술은
  net 으로 맞춘다. 순증만 보면 `store.go` 의 표면을 **1/4 로 과소 진술**한다.

증분의 실제 줄은 그 행이 지목한 패스의 **기준 커밋 스냅샷 ↔ HEAD** 차집합으로 뽑는다.
「그 파일을 마지막으로 고친 `docs(comment-policy):` 커밋」으로 잡으면 **제거 0 줄 행에서 실패한다**
— 그런 패스는 트리를 건드리지 않아 `git log -- <파일>` 에 나오지 않는다(`test_cli.py`·`store.go`·
`test_silver.py`·`Sidebar.tsx` 넷이 그 경우다).

## 범위 밖 (후속)

| 자리 | 줄 | 왜 |
|---|---:|---|
| `scripts/check-data-format-change.py` | 11 | `SENSITIVE_PATHS`(`:48`)에 **판정기 자신**이 등재돼 있어 주석만 고쳐도 `review/manual-approval` 이 붙지 않는다 → 사람 몫. 게이트 소스를 직접 읽어 재확인 |
| `tests/e2e/run.sh` | 2 | #131 이 여전히 open 이고 같은 파일을 고친다(PR files 3건 전수 확인 — `ci.yml`·`playwright-setup.sh`·`run.sh`, `docs/comment-policy/` 무접촉). 착지 뒤에 본다 |
| 지문 사각지대 확장 | — | Python docstring 본문·줄 끝 주석은 `versionScript` 개정이라 **tobe-modeler 소관**(data plane 밖) |

자매 staged PR **#134** 는 files 14건이 이 잔여 10파일과 **겹침 0** 이라 기다릴 이유가 없었다.

## 판단이 갈려 남긴 것 (9)

- **`JRN-judgment-debug.js` 머리 범례 4줄** — 7개 시나리오 중 **5개가 나눠 갖는 바이트 동일
  사본**이다(`JRN-daily-scan`·`JRN-ingestion-recovery`·`JRN-sentiment-shift` 는 범례 본문 md5
  `b6480dd0` 로 완전 동일). 복원처는 있다 — `check-journey-flow.js` 의 `:257`·`:271`·`:219`
  fail 문면과 `:12-21` 「구조」 절이 (d)(e)(c) 의 뜻을 그대로 적는다(①). 그러나 **한 파일에서만
  걷으면 사본 다섯 벌 중 하나만 갈라져 이 패스가 첫 발산을 만든다.** 같은 종류의 하네스
  `JRN-logic-backfill.js` 38줄을 product-surface-pass 가 전량 유지로 판정한 선례도 그 방향이다.
  처분은 **다섯 파일을 함께 판정하는 패스**의 몫으로 남긴다.
- **`JRN-judgment-debug.js` 여정 뼈대 4줄** — backfill 머리 3줄을 판단 분기로 남긴 처분의 승계.
  앞절(「고른 결과 하나가 이후 화면 전부의 맥락」)은 여정 문서 `STP-pin-record` 이후 단계가
  전부 「대상 레코드」를 주어로 쓰는 것이 복원하나(②), 뒷절(기본 결과 `R-2609-0412` 가
  응답↔저장값이 어긋난 사례)이 `states()` 가 결과 교체만으로 12개 상태에 닿는 **구조의 근거**라
  한 덩어리다.
- **`test_cli.py` 테스트 머리 3자리** — 세 머리 모두 테스트 이름과 겹치는 절을 갖지만 **이름이
  담지 못한 도메인 전제**를 함께 적는다(Bronze 가 사이클을 모두 보존한다 · 재관측이 전제다 ·
  재시도는 장애일 때만 한 시간 값어치가 있다). 이 파일 행의 직전 판정(「유지 8줄 전량 —
  테스트 의도」)과 같은 처분.
- **`test_llm.py` 1줄** — 「Substring folding would merge these into …」는 **반사실**이다.
  이름과 parametrize 값은 「접히지 않는다」까지만 복원하고, 접혔다면 무엇으로 접혔을지(= 이
  픽스처가 왜 판별력을 갖는지)는 어느 경로에도 없다.

`Trace.test.tsx` 의 테스트 의도 주석을 **전량 제거**한 것과 위 둘이 갈리는 지점은 **이름의
서술력**이다 — `it("offers no open button for a dead link or a non-http address")` 는 전제까지
담지만 `test_temperature_can_be_omitted` 류는 담지 못한다.

## 제거의 복원 경로 (요약)

| 파일 | 제거 | 주된 경로 |
|---|---:|---|
| `scripts/check-journey-mockup.py` | 11 | ③ 저작 PR **#129** 가 열한 줄을 축자 소유 + ① 같은 파일 `fail()` 문면 |
| `web/src/screens/Trace.test.tsx` | 9 | ① `it(...)` 이름 + ③ #126·#128 |
| `web/src/screens/Trace.tsx` | 7 | ③ #128(`javascript:` 절 축자)·#126(URL 왕복 축자) + ① 바로 아래 배선 |
| `web/src/tokens/tokens.css` | 5 | ① 바로 아래 선택자가 그대로 적는 목업 매핑 |
| `go/internal/store/store.go` | 4 | ① 시그니처·상수·순회 본문 재진술 |
| `web/src/shell/Sidebar.tsx` | 2 | ② 목업 셸 원본 + ③ #126 「접힌 레일이 비지 않도록」 |

**유지의 핵심**: `store.go` 의 `econ_core.storage` **미러 포인터 3줄**(두 런타임이 같은 상수를
따로 들고 있다는 사실 — 사라지면 한쪽만 바꿔도 조용히 갈린다), `tokens.css` `.rankrow .dlt` 의
**부정 진술**(「`.delta` 칩을 쓰지 않는다」 — 쓰지 않기로 한 것은 코드에 자국을 남기지 않는다).

## 게이트가 주석을 읽는 자리 (보존 확인)

`scripts/check-mockup-render.py` 의 `markers()`(`:136`)가 **`web/src` 주석에서 `CMP-*`/`PAT-*`
모집단**을 읽는다. 이 패스는 `web/src` 4파일을 건드리므로 편집 전후 마커 집합을 직접 재
**28종 동일**(대칭차 공집합)을 확인했다. eslint `js.configs.recommended` 의 `no-empty`(주석만 든
블록을 비어 있지 않은 것으로 본다)에 걸리는 자리는 이 패스 범위에 없다 — 알려진 그 자리는
`web/src/api/client.ts` 의 빈 `catch` 이고 손대지 않았다.

## 검증 (전부 로컬 실측)

| 검사 | 편집 전 | 편집 후 |
|---|---|---|
| `python3 scripts/check-journey-mockup.py .` | rc=0 | **rc=0** (링크 199건) |
| `python3 scripts/check-mockup-render.py .` | rc=0 | **rc=0** (규칙 3·4·5) |
| `node scripts/check-journey-flow.js .` | rc=0 (710 passed) | **rc=0 (710 passed)** |
| `python3 tests/e2e/check_scenario_mapping.py` | rc=0 | **rc=0** |
| `ruff check .` / `ruff format --check .` | — | **rc=0 / 39 files already formatted** |
| `gofmt -l .` / `go vet ./...` | — | **빈 출력 / rc=0** |
| `go test ./internal/store/...` | — | **ok** |
| `npx tsc -b` / `npm run lint` / `npx vitest run` | — | **rc=0 / rc=0 / 73 passed** |

**코드 무접촉**: `git diff` 의 +/- 줄 중 주석 시작 패턴에 걸리지 않는 것은 2줄뿐이고 둘 다
블록 주석 `/* … */` 의 **연속 줄**이다(`Trace.tsx` JSX 머리의 둘째 줄 · `tokens.css` 빈 창 배너의
둘째 줄) — 주석 외 바이트 변경 0.
