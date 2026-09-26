# 2026-09-26 — de-residual-axis-pass (D·E 잔여 중 무인 사정권 전량)

`tbm_econ-opinion-monitor-comment-redundancy` / `rct_20260926-0016`.

직전 [core-python-docstring-pass](2026-09-26-core-python-docstring-pass.md) 가 남긴 D·E 잔여
26행 158줄 중, **리뷰 게이트의 `SENSITIVE_PATHS` 를 건드리지 않는 23행 110줄**을 판정했다.

## 범위 — 왜 「D·E 전량」이 아닌가

감지는 「D + E 를 한 슬라이스로 묶으면 158줄로 두 표면을 동시에 100% 로 닫는다」를 1순위로
지목했다. 그 셈은 맞지만 **두 파일이 사람 게이트 뒤에 있다**. `scripts/check-data-format-change.py`
의 `SENSITIVE_PATHS` 는 다음을 경로만으로 `format_changed=true` 로 만들고, 그러면
`review-gate.yml` 이 필수 status `review/manual-approval` 을 **붙이지 않는다**:

```
contracts/**                                     ← contracts/codegen.py (D 16 · E 3)
scripts/check-data-format-change.py              ← 판정기 자신 (D 29)
go/gen/** · econ_core/models/** · review-gate.yml
```

실측(양성·음성 프로브 셋, base `d6dbe2c`):

| 프로브 | 결과 |
|---|---|
| `contracts/codegen.py` 에 빈 줄 1개 | `CHANGED contracts/codegen.py — 스키마 계약(contracts/)` · `format_changed=true` |
| `aggregation/src/**` 의 **D 표면 46줄 전량 삭제**(최대 삭제) | `format_changed=false` |
| 같은 파일에 `dict(analysis_status=1)` 1줄 주입(CTRL) | `CHANGED … 배치 생산자가 계약 필드에 채우는 값 변경` · `format_changed=true` |

즉 계약 필드 대입 규칙은 살아 있고(CTRL 이 붉다), 이 슬라이스가 고른 범위는 그 규칙에 닿지
않는다. 남은 3행 48줄은 **사람 리뷰가 붙는 다음 슬라이스**의 몫이며, 그 자리는
[batch-de-axis-pass](2026-09-26-batch-de-axis-pass.md) 가 `llm.py` E 의 AC 꼬리표 2줄을 이월하며
이미 지목해 둔 자리와 같다.

## 결과

| 표면 | 판정 행 | 판정 줄 | 제거 | 행 소멸 |
|---|---:|---:|---:|---:|
| D | 8 | 77 | 40 | 1 |
| E | 15 | 33 | 21 | 6 |
| 계 | **23** | **110** | **61** | **7** |

게이트 자기출력(판정 전 → 후): D 미판정 `10행 122줄` → `2행 45줄`, E 미판정 `16행 36줄` →
`1행 3줄`. **L 표면은 전 칸 불변**(판정 125행 1,719줄 · 일부 축 30행 521줄 · 미판정 37행 418줄).

## 제거 — 근거별

### ② 정책·PRD·README 문면의 되풀이 (D 19줄)

- `check-comment-ledger.py` 8줄 — 전부 `docs/comment-policy/README.md` 축자다. 「집계는 원장에
  저장하지 않고 매 실행 계산한다 — 손으로 적은 합계는 조용히 낡는다」 = 「합계·잔량을 원장에
  저장하지 않는다 … 손으로 쓴 집계는 원본만 고쳐질 때 조용히 낡는다」 · 「표면이 하나라도 이
  게이트 밖이면 … 게이트는 초록으로 통과시킨다」 = 「게이트는 세 표면을 모두 실측해」 문단 ·
  L·D·E 추출 규칙 = 「지문은 표면 셋을 센다」 불릿 · 「MIXED·MARKUP·NONE 은 지문도 보지 않는다」
  = 「그 뒤에도 지문이 보지 못하는 것」 불릿.
- `aggregation/__init__.py` 3줄 · `aggregate.py` 의 placeholder 문장 — 루트 `README.md`
  「범위 밖: 실제 정규화 수식·집계 로직 (시그니처/스텁만)」 + 「디렉터리 구조: packages/aggregation
  … (정규화 스텁)」. 주석 자신이 `(see README scope)` 로 복원처를 지목한다.
- `test_aggregation_run_record.py` 2줄 — PRD pipeline-ops AC4.1.
- `test_aggregate.py` 의 「롤업 시 합산이 하위 버킷 합과 일치」 — 테스트 문서
  `…-test-aggregation-viz.md` 시나리오 3 「기대 결과」의 **따옴표째 인용**.

### ③ 저작 PR 본문이 절 단위로 소유 (D 11줄)

- `aggregate.py` 롤업 6줄 ← **PR #62** 「롤업을 Gold 행의 2차 합산으로 만들지 않은 것이 핵심
  선택이다. 같은 원천 레코드를 더 굵게 자르면 일 버킷의 `raw_count` 가 그 날 떨어지는 레코드
  수이고 그것이 곧 시간 버킷들의 합이라, 합산 일관성이 구성상 성립한다.」
- `aggregate.py` delta·spark 3줄 ← **PR #38** 「버킷별 share 를 모두 계산한 뒤 (axis, subject)
  계열을 시간순으로 훑어 직전 버킷 대비 %p(`delta`)와 최근 share 수열(`spark`, 최대 6개)을
  싣는다.」
- `_bucket` 라벨 예시 2줄 ← **PR #62** 1항의 `hour`/`day`/`week` 라벨 표.

### ① 코드·이름이 복원 (D 10줄 · E 15줄)

- `cli.py` 4줄 — 서빙 버전의 정의는 `econ_core.silver.select_serving` docstring 「One Silver row
  per record: the serving version's when present, else the newest.」 의 긴 사본이다. 정책의
  「같은 명제가 여러 곳에 있으면 설명의 주인에만 둔다」 — 주인은 그 함수가 선언된 곳이다.
- `*_all_units` 2줄 · `test_aggregate.py` 2줄 — 함수·테스트 이름이 문장으로 복원한다
  (`test_rollup_raw_counts_equal_the_sum_of_the_finer_buckets`).
- `aggregate.py` Bronze 조인·Gold 데이터셋 열거 — `by_id = {b["record_id"]: b …}` 와
  `SubjectTrend(subject=…, raw_count=…, normalized_share=…)` 가 그대로 적는다.
- `handlers.go` 의 `// screen: dash` 등 8줄 — 같은 줄의 핸들러 이름(`h.dashboard`)과 **바이트
  동일**하다.
- `dashboard.go` `// bucket -> subject -> row` — 15줄 아래 `shares[t.TimeBucket][t.Subject] = t`.
- `static.go` `// SPA fallback` — 그 줄 자체가 `http.ServeFile(w, r, index)` 다.
- `gold.ts` `// Mon=0 … Sun=6` — 식별자 `mondayBased`.
- `ac3-8` 「비율 (0~1)」 · `ingestion-7` 「전재 쌍은 링크가 다르다」 — 바로 왼쪽 단정의 한국어 사본.
- `ingestion-2` 상수 꼬리표 2줄 — 이름 `CAPPED`·`SHORT` + 그 아래 테스트 이름.

### ② 여정 문서·설계 트래커가 라우트↔단계를 짝짓는다 (E 3줄)

`handlers.go` 의 `// STP-dry-run`·`// STP-run-reprocess`·`// STP-publish` 는 라우트와 여정 단계를
묶는데, `docs/econ-opinion-monitor-design-tracker.md` 의 세 행이 같은 쌍을 축자로 적는다 —
`STP-dry-run … 『표본 실행』 이 POST /api/reprocess/sample 로`, `STP-run-reprocess … 『전량 실행』 이
POST /api/reprocess/run 을 제출한다`, `STP-publish … POST /api/reprocess/publish`.
[runlog-window-pass](2026-09-25-runlog-window-pass.md) 의 「STP-publish·JRN-logic-backfill 이라는
이름은 여정 문서가 복원한다(①②)」 와 같은 근거다.

### ② `web/src/screens/Compare.tsx` (E 1줄)

`// sentiment ratios are over analyzed items` 는 PRD AC3.4 「저신뢰/미분석(AC2.5)은 비율 집계에서
분리하거나 별도 항목으로 표시한다」이고, 같은 명제의 **주인**은 그 값을 만드는
`aggregate.py:144` 의 L 주석이다(소비 화면이 아니라 생산자가 설명의 주인).

## 유지 — 49줄

### 정책이 유지 대상으로 **축자 등재한** 자리 (D 5줄)

`_bucket` 의 「버킷 키의 사전식 정렬이 시간순과 같아지는 조건」. 정책 README 「복원 불가능한
지식」의 두 번째 불릿이 이 예를 그대로 든다 — *「데이터 계약의 비자명한 성질(예: Gold 버킷 키의
사전식 정렬이 시간순과 같아지는 조건)」*. 단위를 넘으면 성립하지 않는다는 반례
(`2026-W26` > `2026-06-23T14`)까지 한 문단이라 함께 남겼다.

### 어기면 **조용히** 깨지는 편집 지점 가드 (D 6줄 · E 9줄)

정책의 ③↔가드 판별식이 유지 쪽인 자리다 — ③ 에 같은 취지가 있어도 PR 본문은 편집 지점에서
읽히지 않는다.

- `aggregate.py` 「첫 버킷의 퇴화는 정직한 답이지 메울 자리가 아니다」 — PR #38 이 실제로 걷어낸
  가짜 램프 `_spark()` 가 돌아오는 자리다.
- `aggregate.py` 「`normalized_share` 를 더 굵은 버킷에서 더하지 않는다」 — 더하면 분포가 아니게
  되는데 타입은 그대로 `float` 다.
- `cli.py` 「결정은 포인터 이동이고 롤백은 같은 이동의 역방향 — 어느 쪽도 재분석이 아니다」.
- `check-comment-ledger.py` — 모델 as-is `versionScript` 와 **같아야 한다**는 가드(레포 밖 값이라
  ①~④ 어디에도 없다), 파싱 실패를 `X:` 로 남겨 조용히 빠지지 않게 하는 이유, 지시자 뒤 사유를
  E 로 건지는 규약(원장의 `run.sh` 행이 그 규약 위에 서 있다), 줄 스캐너 둘의 문자열 추적 한계.
- `run.sh` 2줄 — 「연관 배열은 bash 3.2 에 없다」(연관 배열로 고치면 개발 머신의 bash 5 에서는
  돌고 CI·macOS 에서만 깨진다) · `SC2086` 지시자 **뒤에 붙은 사유**.
- `check-comment-ledger.py` E 「첫 `## ` 앞은 머리말」 — `in_allowed` 의 초기값이 왜 True 인지.

### 「공허한 초록」을 막는 선행 단정의 사유 (E 7줄)

`ingestion-2`(2) · `ingestion-4`(2) · `ingestion-6`(1) · `ingestion-7`(1) · `aggregation-4`(1) 의
「픽스처가 … 를 실제로 만드는지」 계열. 픽스처가 조건을 만들지 않으면 **본 단정이 통과하면서
아무것도 시험하지 않는다** — 정책의 「테스트가 왜 그 모양으로 단언하는지」이고
[core-python-docstring-pass](2026-09-26-core-python-docstring-pass.md) 가 `test_silver.py` 의
「os.replace would give a new inode」를 같은 근거로 유지한 선례를 따른다.

### 정책이 유지 대상으로 못박은 요약 줄 (D 4줄)

`__init__.py` · `__main__.py` · `test_serving_version.py` · `test_aggregation_run_record.py`.
`analysis/__init__.py`(batch-de-axis-pass) · `core/tests/test_silver.py`(core-python-docstring-pass)
와 같은 모양이다.

### 픽스처가 실환경과 갈리는 지점 (E 1줄 + 2줄)

`analysis-2` 「하나는 이미 정규 표기다」(픽스처 쪽 사실이라 spec 안에서는 복원되지 않는다) ·
`ac3-8` 「원시 건수 — 비율이 아니다」(단정이 왜 `toBeGreaterThan(1)` 인지 — 비율이라면 있을 수
없는 상계 위반이 여기서는 정상이라는 AC3.8 의 구분점).

## ④ 를 기계로 닫은 방법

이 슬라이스 23행의 파일 14개에 대해 `git log --follow` 로 저작 커밋 후보 **40개**를 뽑고,
`Co-authored-by` 트레일러를 지운 본문 길이를 쟀다 — **본문이 있는 커밋은 8개**이고, 그 여덟의
본문에 이 슬라이스가 걷은 61줄의 명제는 **0건**이다(가장 가까운 `9a5d32e6` 은 Compare 의 여정
이탈 카드를 적을 뿐 `scale = 1 - dist.unanalyzed` 의 명제를 담지 않는다). ④ 는 판정을
통과시키기만 하고 한 줄도 닫지 않았다 — journey-harness-axis-pass 와 같은 결과다.

## 「주석만 걷었다」를 코드로 증명한 방법

- **Python 6파일**: docstring 을 걷어낸 AST 를 편집 전후로 비교해 **SAME 6/6**. CTRL 로 실코드
  1줄(`trends.append({})`)을 주입하면 **DETECTED** — 비교기가 둔감한 것이 아니다.
- **Go·TS 8파일**: 줄 끝 주석만 지웠고 그 줄의 **코드 부분이 바이트 동일**하다(`git diff -U0` 의
  비주석 `+`/`-` 0줄). `gofmt -l go/` 는 빈 출력(정렬 공백까지 같이 걷었다).
- **게이트 자신(`check-comment-ledger.py`)의 순환 차단**: 편집 **전** blob 을 편집 **후** 트리에서
  실행해 출력이 편집 후 blob 의 출력과 **바이트 동일**함을 확인한 뒤 판정했다. 계측기가 자기
  판정을 도와주지 않는다는 것을 먼저 보인 것이다.

## 로컬 게이트 실측 (전건)

```
python3 scripts/check-comment-ledger.py        rc=0  불변식 통과
python3 tests/e2e/check_scenario_mapping.py    rc=0  규칙 1·2·3·4·5·6 위반 없음
python3 scripts/check-mockup-render.py         rc=0
python3 scripts/check-journey-mockup.py        rc=0
python3 scripts/check-data-format-change.py    format_changed=false
cd python && ruff check . && ruff format --check .   All checks passed · 42 files already formatted
cd python && pytest -q                         168 passed
cd go && gofmt -l . (빈 출력) && go vet ./... && go test ./...   ok
cd web && npm run lint && npm test              eslint rc=0 · vitest 75 passed (9 files)
```

## 범위 밖 (후속)

- **D 2행 45줄 · E 1행 3줄** — `contracts/codegen.py`(D 16 · E 3) · `scripts/check-data-format-change.py`
  (D 29). 위 「범위」의 사람 게이트 때문이며, `llm.py` E 의 이월 2줄과 **한 슬라이스**로 묶여야
  한다(셋 다 같은 `review/manual-approval` 한 번으로 닫힌다).
- **L 표면 67행 939줄** — 이 슬라이스는 L 을 한 칸도 건드리지 않았다.
