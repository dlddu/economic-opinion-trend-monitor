# 2026-09-26 — sensitive-lane-pass (사람 리뷰 레인 · D·E 표면 완주)

`tbm_econ-opinion-monitor-comment-redundancy` / `rct_20260926-0017`. 기준 커밋 `d20825d`(= #171 착지 tip = main).

판정 **5행 55줄**(+ 이월 집행 1행) · **제거 43** · **행 소멸 1**. 이 패스로 **D·E 두 표면이
네 축 전건 완료**가 된다(미판정 0 · 일부 축 0).

## 범위 — 왜 「무인 몫」이 아니라 이 55줄인가

직전 [de-residual-axis-pass](2026-09-26-de-residual-axis-pass.md) 가 남긴 잔여는 두 갈래였다.

| 갈래 | 크기 | 벽 |
|---|---:|---|
| L 표면 잔여 | 65행 884줄 | 없음(무인) |
| D·E 잔여 + 같은 파일의 L 자매 행 | **5행 55줄** | `review/manual-approval` 사람 서명 |

무인 쪽이 열 배 넘게 크지만 **이 패스는 작은 쪽을 집는다.** 판별식은 크기가 아니라
**「미루면 돌아오는가」**다.

- 무인 L 잔여는 파일이 서로소라 아무 때나 한 덩어리씩 착지할 수 있다 — 미뤄도 돌아온다.
- 사람 레인 쪽은 **2026-09-21 이래 최소 여덟 개 패스가 이름을 들어 제외했고 사유가 매번 같았다** —
  「`SENSITIVE_PATHS` 에 걸려 주석만 고쳐도 status 가 안 붙으니 무인 몫과 묶으면 가벼운 쪽이
  사람 일정에 묶인다」. 원장 자신이 그 결과를 「영구 이월」로 명명한다. 그런데 그 사유의
  조건절은 **「무인 몫과 묶으면」**이고, 이 패스처럼 **단독 슬라이스**로 집으면 아무것도 뒤로
  미루지 않으므로 조건이 성립하지 않는다. 같은 논리로 [format-gate-pass](2026-09-25-format-gate-pass.md)
  가 같은 파일의 L 표면을 닫은 전례가 있다.

그래서 슬라이스는 **벽의 종류로** 갈렸고, 이 패스는 그 벽 뒤에 있는 것을 **전부** 담는다:

```
contracts/codegen.py                     L 5 · D 16 · E 3   (SENSITIVE_PATHS: contracts/**)
scripts/check-data-format-change.py      L 2 · D 29         (SENSITIVE_PATHS: 판정기 자신)
python/packages/analysis/src/econ_analysis/llm.py   E 2     (이월 집행 — 아래)
```

파일 단위 잔여가 앞의 두 파일에서 **0** 이 된다(세 표면 전건). `llm.py` 의 두 줄은 판정이 아니라
**예약된 처분의 집행**이다 — [batch-de-axis-pass](2026-09-26-batch-de-axis-pass.md) 가 그 행에
「제거 대상으로 판정했으나 계약 필드 대입 줄이라 `contracts/codegen.py` 몫과 함께 사람 리뷰가
붙는 다음 슬라이스에서 걷는다」고 조건을 적었고, de-residual-axis-pass 가 그 셋을 한 슬라이스로
묶으라고 다시 지목했다. 이 패스가 그 슬라이스다.

## 우회하지 않는다

`SENSITIVE_PATHS` 에서 이 경로들을 빼면 status 는 자동으로 붙지만 **그것은 해법이 아니다.**
`review-gate.yml:1-3` 이 원칙을 적고, 워크플로는 `pull_request_target` 으로 **base 쪽 판정기**를
돌린다 — PR 이 게이트를 고쳐 스스로 success 를 받을 수 없게 한 의도된 보안 속성이다. 이 PR 은
`review/manual-approval` 이 **붙지 않은 채** 열리고, 사람이 그 sha 에 status 를 붙이는 것이 정상 경로다.

실측(base `d20825d`, 양성·음성 프로브 셋):

| 프로브 | 결과 |
|---|---|
| 변경 없음(base==head) | `format_changed=false` |
| `contracts/codegen.py` 의 줄머리 주석만 삭제 | `CHANGED contracts/codegen.py — 스키마 계약` · `format_changed=true` |
| `scripts/check-data-format-change.py` 의 줄머리 주석만 삭제 | `CHANGED … 리뷰 게이트 판정기 자체` · `format_changed=true` |

즉 기대 상태는 `format_changed=true` 이고, baseline 이 false 라 프로브가 공전하지 않는다.

## 제거 — 근거별

### ② 루트 README 「리뷰 게이트」 절이 판정기 docstring 을 절 단위로 갖는다 (D 21줄 중 대부분)

`README.md:236-246` 이 `scripts/check-data-format-change.py` 모듈 docstring 본문을 축자로 복원한다 —
무엇을 건드리면 status 를 안 붙이는가 · 「status가 없으면 사람 리뷰가 필요하다」 · 판정 대상 열거 ·
「`pull_request_target`으로 base 브랜치의 판정기를 돌리므로 PR이 게이트를 고쳐 스스로 통과할 수 없다」 ·
로컬 호출 형태 · 「직렬화·레이크 경로·`data/`·볼륨·마운트 변경은 이 게이트가 보지 않는다(일반 리뷰 몫)」.
같은 여섯 명제가 ③ 에도 있다(#75 「목적」·「보안」 절 · #127 「남는 것」·「빠지는 것」 절 — 후자의 제외
목록은 낱말까지 같다).

`review-gate.yml` 행이 **이미 같은 근거로 닫혀 있다**([scope-expansion-pass](2026-09-26-scope-expansion-pass.md)
가 그 파일의 머리 주석 19줄을 README 같은 절로 걷었다) — 한 README 절이 워크플로와 판정기 양쪽의
서사를 소유하고 있었고, 이 패스가 남은 한쪽을 닫는다.

### ① 선언 자신이 더 정확하다 (D · L · E)

- `SENSITIVE_PATHS` 의 각 튜플이 이유 문자열을 **바이트 동일**로 싣는다 — docstring 의 경로 열거는
  그 값의 사본이다. 배치 생산자 절은 `PRODUCER_GLOBS` 세 glob + `COMMENT_LINE`(주석 줄 제외) +
  `contract_fields()` 가 복원한다.
- 종료 코드 줄 ← `return 0`(:261) · `return 2`(:248, :254) · `GITHUB_OUTPUT` 쓰기(:214-217) ·
  마지막 `print` 한 줄.
- `codegen.py` 의 레이어별 IDL 3줄 ← `main()` 이 bronze 의 `*.schema.json` 과 silver·gold 의
  `*.avsc` 를 그대로 열거한다. 산출 경로 2줄 ← 상수 `PY_OUT`·`GO_OUT` 의 값 자체.
- **이름 붙은 enum 통합 3줄** ← `ENUMS` 가 이름 키 dict 이고 `register_enum()` 이 같은 이름에 다른
  symbols 가 오면 `enum '...' redefined with different symbols` 로 **죽는다**. 통합은 조용한 성질이
  아니라 집행되는 불변식이고, `x-enum-name` 요구는 `resolve_json()` 의 SystemExit 문면이 적는다.
  `Axis` 예시는 정책이 가드에 금지한 열거라 함께 걷었다.
- **E 3줄** — `# union — only ["null", X] is supported` 는 두 줄 아래 SystemExit 문면
  「unsupported Avro union (only ['null', X])」와 축자다. `kind: dict  # see resolve_* below` 는
  구성 지점 둘이 `Field(f["name"], resolve_avro(...))`·`Field(n, resolve_json(d))` 로 함수 이름을
  그대로 싣는다. `# wrapper such as {"type": "string"}` 은 앞 분기들이 array·enum·record 를 이미
  처리해 폴스루가 구성상 wrapper 이고, 그 줄이 `t["type"]` 을 다시 resolve 하는 코드 자체다.
- 사설 헬퍼 `_glob_to_regex` 의 docstring 1줄 — public 이 아니고 본문 분기가 `**` 와 `*` 의 경계
  처리를 그대로 적는다.

### ③ 저작 PR #1 이 codegen docstring 을 절 단위로 소유 (D)

PR #1 「주요 변경 · 계약 + 코드젠」 절에 「bronze=JSON Schema, silver/gold=Avro」 · 「표준
라이브러리만」 · 「`make gen`이 `gofmt`/`ruff`로 정규화」 · 「생성물은 커밋되고 CI의 `make gen-check`가
최신성을 검증」 · 「공유 enum 통합」이 모두 있다. ③ 모집단은 **저작 PR 만** 셌다 — 판정 패스 PR 의
인용을 히트로 세면 자기 무효화 고리가 생긴다(format-gate-pass 가 세운 규칙).

### ①② 절 표지 · 원시 타입 표 설명 (L 3줄) — 번복 고지

`main()` 의 `# Python`·`# Go` 는 정책 「자주 나오는 제거 유형 · 구분선」 그대로 **바로 아래 식별자가
절 이름을 복원한다**: 각각 다음 줄이 `PY_OUT / "enums.py"` + `emit_python_enums()` 와
`GO_OUT / "enums.go"` + `emit_go_enums()` 다.

원시 타입 표 설명 1줄은 **튜플의 칸 순서까지 식별자가 복원한다** — 소비부가 `py, go = SCALARS_AVRO[t]`
(:94) 와 `py, go = SCALARS_JSON[jtype]`(:143) 로 언패킹하고, 두 dict 이름이 각각 Avro·JSON Schema 를 적는다.

🔴 **이 3줄은 2026-09-20 initial 판정이 유지한 줄이다.** 재판정이 재투표가 아닌 이유를 적는다:
절 표지의 유지 사유는 결과 칸에 **「애매 — 유지」**로 적혀 있고, 정책은 그것을 「판단이 갈린 주석은
남기고 그 사실을 판정 상세에 적는다」로 **미해결로 기록하는** 값으로 정의한다 — 닫힌 판정이 아니다.
새 근거는 둘이다: ⑴ 위의 ① 실측(언패킹 두 자리 · 다음 줄 식별자), ⑵ de-residual-axis-pass 가 같은
축에서 세운 선례 — `handlers.go` 의 `// screen: dash` 8줄을 「같은 줄 핸들러 이름과 바이트 동일」로
①  제거했다. 같은 판별식을 이 세 줄에 돌리면 같은 값이 나온다.

### 이월 집행 (E 2줄)

`llm.py` 의 `# AC2.1, multi (AC2.4)`·`# AC2.3` — batch-de-axis-pass 가 이미 제거 대상으로 판정했고
이 패스는 걷기만 한다. 제거 뒤 두 코드 줄은 **바이트 동일**이다.

## 유지 — 12줄

### 정책이 못박은 요약 줄 (D 4줄)

두 모듈 docstring 의 첫 줄 + public 함수 `contract_fields`·`evaluate` 의 요약 줄.

### 어기면 **조용히** 깨지는 가드 (D 4줄 · L 2줄)

- **fail-closed 2줄**(판정기 모듈 docstring) — 「애매하면 변경 있음 쪽으로 기운다. 잘못 success 를
  붙이는 비용이 리뷰 한 번 더 받는 비용보다 크기 때문이다」. fail-open 으로 돌리면 판정 실패 PR 이
  **조용히 자동 승인**된다. 명제 자체는 #75 에 있으나 **비용 비대칭의 근거는 어디에도 없다**.
- **표준 라이브러리만 1줄**(codegen 모듈 docstring) — 서드파티 import 를 넣지 말라는 「무엇을 넣지
  말라」 가드다. 정책의 「가드는 메커니즘을 담지 않는다」에 따라 같은 문장에 붙어 있던 gofmt·ruff·
  gen-check 집행 경로는 걷어 한 줄로 줄였다.
- **ruff magic-trailing-comma 회피 2줄**(L, `:255-256`) — 2026-09-20 판정을 **그대로 승계**한다.
  앞 절은 삼항 `if len(symbols) == 1` 이 복원하지만 **뒤 절(왜 그 모양에 기대는가)은 네 경로
  어디에도 없다**. format-gate-pass 가 같은 레포의 ruff 동작 의존 가드(`:147-148`)를 같은 근거로
  유지한 선례와 한 가족이다 — 한쪽만 걷으면 남는 쪽이 정본이라는 근거를 댈 수 없다.
- `_group` 의 「요약이 diff 전체가 되지 않게」 1줄 — **판단 분기**로 남겼다. 앞 절은 본문이
  복원하지만 그 의도를 적은 자리는 여기뿐이고, 정책의 「애매하면 남긴다」를 적용했다.

### 선행 판정의 근거라 건드릴 수 없는 줄 (D 2줄)

`changed_paths`·`changed_lines` 의 요약 줄. format-gate-pass 가 L `:42`·`:54` 를 지우며 **이 두
docstring 을 ① 복원처로 지목했다** — 걷으면 그 두 제거가 근거를 잃는다.

🟢 **역방향 검산 — 내 제거가 선행 판정을 무효로 만들지 않는지 전수 대조했다.** format-gate-pass 가
② 근거로 인용한 모듈 docstring `:19`·`:20-21` 은 이번에 걷혔다. 그 근거를 쓰는 행 넷(`:56`·`:59`·
`:66`·`:149`)을 전수로 다시 읽으니 **넷 모두 ① 과 ③ 을 함께 인용**하고 있어 제거 근거가 살아 있다.
`:42`·`:54` 의 ① 근거(위 두 docstring)는 유지 쪽이라 애초에 닿지 않는다.

## ④ 를 기계로 닫은 방법

이 슬라이스 세 파일의 저작 커밋 전수(`git log --follow`)는 다섯이다 — `bb1b56b8`(#1) ·
`15900503`(#29) · `66d8f980`(#75) · `6b3a2643`(#127) · `00473f96`(#144). `Co-authored-by` 트레일러를
지운 본문 길이를 재면 **본문이 있는 것은 `15900503` 하나**이고 그 본문은 reconcile task id **한 줄**뿐이다.
즉 이 슬라이스가 판정한 55줄의 명제를 복원하는 커밋 메시지는 **0건** — ④ 는 판정을 통과시키기만 하고
한 줄도 닫지 않았다. de-residual-axis-pass·journey-harness-axis-pass 와 같은 결과다.

## 「주석만 걷었다」를 코드로 증명한 방법

- **docstring 을 모두 뗀 AST 부모 대조**: `contracts/codegen.py`·`scripts/check-data-format-change.py`
  둘 다 **SAME**. CTRL 로 `main()` 에 실코드 1줄을 주입하면 **DETECTED** — 비교기가 둔감한 것이 아니다.
  줄 끝 주석(E) 제거는 AST 가 애초에 보지 않으므로 같은 증명이 D·E 를 함께 덮는다.
- **`llm.py` 와 codegen 의 E 3줄**: 줄 끝 주석만 지웠고 그 줄의 **코드 부분이 바이트 동일**하다
  (`git diff -U0` 의 비주석 추가·삭제 0줄).
- 🟢 **생성기에는 더 강한 증명이 있다 — 산출물 재생성 바이트 대조.** `make gen` 전체 레시피
  (codegen → `gofmt -w go/gen` → 락 핀 버전 ruff 0.15.18 의 `check --fix` + `format`)를 돌린 뒤
  `git diff -- go/gen python/packages/core/src/econ_core/models` 가 **비었다**. 즉 `make gen-check`
  가 통과한다 — 생성기를 고쳤는데 생성물이 한 바이트도 안 움직였다는 것이 이 파일에 대한 최종 증명이다.
  ⚠️ codegen 만 돌리고 재면 **초록이 아니다**(gofmt·ruff 정규화 전 상태라 9파일이 움직인다) — 레시피
  전체를 돌릴 것.
- **게이트 자신의 순환 차단**: 판정 대상에 `scripts/check-data-format-change.py` 가 들어 있으나
  이 PR 의 판정은 **base 쪽 판정기**가 한다(`pull_request_target`). 계측기가 자기 판정을 도와줄 경로가
  구조적으로 없다.

## 로컬 게이트 실측 (전건)

```
python3 scripts/check-comment-ledger.py .        rc=0  불변식 통과 · D·E 미판정 0
python3 scripts/check-mockup-render.py .         rc=0
python3 scripts/check-journey-mockup.py .        rc=0
node scripts/check-journey-flow.js .             rc=0
python3 tests/e2e/check_scenario_mapping.py      rc=0
python3 scripts/check-data-format-change.py <base> <head>   format_changed=true  (기대 상태)
make gen-check 대역(codegen + gofmt + ruff 0.15.18 + git diff)  생성물 무변경
cd python && ruff check . && ruff format --check .           통과
cd python && pytest -q                                       통과
```

## 완료 기준 — 절대 지문이 아니라 부모 대비 델타

| | `d20825d` | 이 패스 이후 |
|---|---:|---:|
| L 판정 대상 줄 | 2,658 | **2,655** (−3) |
| D 판정 대상 줄 | 613 | **578** (−35) |
| E 판정 대상 줄 | 49 | **44** (−5) |
| D 미판정 행 / 줄 | 2 / 45 | **0 / 0** |
| E 미판정 행 / 줄 | 1 / 3 | **0 / 0** |
| E 행 수 | 21 | **20** (codegen 행 소멸) |

## 범위 밖 (후속)

**L 표면 65행 884줄.** 이 패스는 위 세 파일 밖의 L 을 한 칸도 건드리지 않았다. 파일 집합이 서로소인
세 덩어리로 갈리고, 셋 다 `SENSITIVE_PATHS` 밖이라 **무인 착지가 가능**하다.

| 덩어리 | 행 / 줄 | 비고 |
|---|---:|---|
| `tests/e2e/specs/**` + `tests/smoke.sh` | 22행 / 364줄 | 17행이 전량 미판정. `**/tests/**` 는 `CONTENT_EXCLUDES` 라 자유롭다 |
| `web/src/**` | 24행 / 397줄 | 일곱 행은 ④ 만 비어 있어 기계로 닫힌다. `tokens.css` 62줄은 줄머리 `#`·`*` 오탐을 포함한다 |
| `python/packages/{aggregation,analysis,ingestion}` | 18행 / 116줄 | 생산자 glob 이지만 **줄머리 주석은 `COMMENT_LINE` 이 건너뛴다** — 무인 여부는 슬라이스를 고를 때 재 볼 것 |

각 덩어리가 400줄 안팎이라 한 패스에 하나가 맞는다.
