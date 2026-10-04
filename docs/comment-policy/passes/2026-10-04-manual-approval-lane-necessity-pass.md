# 2026-10-04 manual-approval-lane-necessity-pass — 리뷰 게이트 경로 4파일 필요성 판정

reconciler task `tbm_econ-opinion-monitor-comment-necessity` / `rct_20261004-0005`.

## 판정 범위

남은 `—` 6행(L 3 · D 3, 29줄) 전부. 2026-10-04 workflows-batch-tokens-necessity-pass 가 무인 몫을 0 으로 만들며
「사람 게이트 몫」으로 남긴 4파일이다.

- `.github/workflows/review-gate.yml` — L 7 (MA5)
- `contracts/codegen.py` — L 2 · D 2 (MA1)
- `scripts/check-data-format-change.py` — L 2 · D 8 (MA5)
- `python/packages/analysis/src/econ_analysis/fake_llm.py` — D 8 (걷을 줄이 MA4 를 발화)

**판정 전 29줄 → 21줄, 제거 8.** 이 패스로 세 표면 모두 미판정 0 이다. 이 PR 은 `review-gate.yml`(MA5) 접촉과
`fake_llm.py` docstring 삭제(MA4)로 `review/manual-approval` 을 자동으로 받지 않는다 — 사람 리뷰가 붙는 것이 이 슬라이스의 전제다.
`contracts/codegen.py`·`scripts/check-data-format-change.py` 는 제거 0 이라 파일을 건드리지 않는다.

코드 변경 0 — `review-gate.yml` 은 `yaml.safe_load_all` 결과가 base 와 같다(`run: |` 블록 스칼라 안의 셸 줄머리 주석만 걷고 비교).
`fake_llm.py` 는 모든 docstring 노드를 뗀 `ast.dump` 가 base 와 같다. 값 하나를 바꾸는 음성 프로브는 두 판정기 모두 DIFF.

| 파일 | 판정 전 | 뒤 | 제거 |
|---|---|---|---:|
| `.github/workflows/review-gate.yml` | L 7 | L 4 | 3 |
| `contracts/codegen.py` | L 2 · D 2 | L 2 · D 2 | 0 |
| `scripts/check-data-format-change.py` | L 2 · D 8 | L 2 · D 8 | 0 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | D 8 | D 3 | 5 |

## 제거 유형

| 유형 | 자리 |
|---|---|
| 코드 재진술 | `review-gate.yml` 의 「왜 pull_request_target 인가」 표제(아래 가드 문장이 그 이름과 이유를 스스로 든다) · `concurrency` 머리 「새 push 가 오면 이전 판정은 버린다」(`cancel-in-progress: true`) · stale 분기 안의 「그 push 의 실행이 판정한다」(바로 아래 `::notice::` 문면) · `fake_llm.py` 모듈 본문의 실행 이름 문장(`econ_core.runlog.resolve_run_id` 재진술) |
| 다른 주석의 사본 | `fake_llm.py` 모듈 본문의 ``no_call_reason="keyword_analyzer"`` 문장 — `NO_CALL_KEYWORD_ANALYZER` 의 `#:` 주석이 정본 |

## 판단이 갈린 것

- **`fake_llm.py` 문단은 이월된 제거 판정의 집행이다.** 2026-10-04 python-packages-go-necessity-pass 가 제거로 판정했으나
  첫 줄이 `field=value` 모양이라 `check-data-format-change.py` 가 그 삭제를 MA4(배치 생산자가 계약 필드에 채우는 값 변경)로 잡았다.
  실제 값은 바뀌지 않는다(docstring 산문 · `ast.dump` 동일) — 판정기가 줄 패턴이라 생기는 거짓 양성이고, 사람 리뷰가 붙는 이 슬라이스에서 걷는다.
- **`review-gate.yml` 의 checkout 가드는 README 와 겹쳐도 남긴다.** 루트 README 「리뷰 게이트」 절이 「base 브랜치의 판정기를 돌리므로
  PR 이 게이트를 고쳐 스스로 통과할 수 없다」는 **성질**을 적지만, 그 성질을 깨는 편집(`ref:` 를 PR head 로)이 일어나는 자리는 이 step 이다.
  가드는 편집 지점에서만 효과가 있다.
- **`codegen.py`·`check-data-format-change.py` 는 앞 판정(복원 가능성 축)을 필요성 시험으로 다시 쟀고 결과가 같다.** 남은 줄이 전부
  가드이거나 doc 주석 수준이라 제거 0 이다.

## 유지 목록

| 파일 | 주석 | 필요 사유 |
|---|---|---|
| `.github/workflows/review-gate.yml` | 「PR 쪽 코드는 git 객체로만 받아 … 이 원칙을 지킬 것」 2줄 | 지우면 PR 코드를 체크아웃·실행하는 step 을 더해 `pull_request_target` 의 쓰기 토큰을 조용히 노출시킨다 |
| `.github/workflows/review-gate.yml` | `edited: base 브랜치가 바뀌면 diff 범위도 바뀐다.` | 지우면 `edited` 를 제목 편집용으로 보고 빼서, base 변경 뒤 낡은 판정이 status 로 남는다 |
| `.github/workflows/review-gate.yml` | 「base 브랜치 tip — 판정기는 반드시 여기서 가져온다」 | 지우면 checkout 을 PR head 로 바꿔 PR 이 판정기를 고쳐 스스로 통과하게 만든다 |
| `contracts/codegen.py` | ruff magic-trailing-comma 근거 2줄 | 지우면 1-튜플에만 쉼표를 다는 분기를 정리해 생성물 `enums.py` 가 줄마다 펼쳐지는데 그 원인은 다른 어디에도 없다 |
| `contracts/codegen.py` | 모듈 요약 | doc 주석 수준(모듈 docstring) |
| `contracts/codegen.py` | 「Standard library only, so ``make gen`` works before any dependency is installed.」 | 지우면 서드파티 import 를 들여 의존성 설치 전 `make gen` 을 깨뜨린다 |
| `scripts/check-data-format-change.py` | MA4 정규식 위 `ruff format` 모양 2줄 | 지우면 지역 변수 대입 `field = value` 도 잡힌다고 믿고 생산자 값 변경을 사람 리뷰 없이 통과시킨다 |
| `scripts/check-data-format-change.py` | 모듈 요약 · `contract_fields`·`changed_paths`·`changed_lines`·`evaluate` 요약 | doc 주석 수준(모듈·public 함수 docstring) |
| `scripts/check-data-format-change.py` | fail-closed 2줄 | 지워 애매한 판정을 「변경 없음」으로 돌리면 판정 실패 PR 이 조용히 자동 승인된다 |
| `scripts/check-data-format-change.py` | `_group` 요약 | 근거를 첫 줄·건수로 자르는 이유(Job Summary 가 diff 전체가 되지 않게)를 코드가 말하지 않아, 지우면 「전부 보여 주자」로 되돌린다 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | 모듈 요약 · `normalize_subject`·`analyze` 요약 | doc 주석 수준(모듈·public 함수 docstring) |
