# 2026-09-26 core-python-docstring-pass

`econ_core` 라이브러리와 `tests/e2e` 파이썬 하네스의 **23행 378줄**(L 32 · D 332 · E 14)을 네
복원 경로로 전건 판정했다. 제거 **160줄**(D 151 · E 9), 유지 218줄, 행 소멸 1
(`E: tests/e2e/check_scenario_mapping.py`).

reconciler task `rct_20260926-0015` / 모델 `tbm_econ-opinion-monitor-comment-necessity`.

## 범위를 이렇게 고른 이유

잔여 116행 1,475줄 중 이 두 덩어리를 고른 판별식은 **파일 단위 잔여 0**이다.

- **`python/packages/core/`** (17행 252줄) — D 잔여 454줄의 46%가 여기 있다. L·D·E 세 표면을
  함께 집어 파일마다 잔여가 0이 된다.
- **`tests/e2e/` 파이썬 하네스 4파일** (6행 126줄) — L 행이 이미 `①②③④`(e2e-harness-axis-pass)라
  D·E 만 채우면 **세 표면 모두 판정 완료**가 된다.

「E 표면 50줄을 한 슬라이스로 100% 닫는다」는 대안은 실측으로 기각했다. E 잔여가 걸린 20파일 중
**14파일이 같은 파일 안에 미판정 L/D 자매를 갖는다** — 자매를 두고 E 만 집으면 다음 패스가 같은
파일을 다시 열어 판정 근거를 흔들고, 자매까지 끌어오면 `web/src`·`go/`·`tests/e2e/specs`·`contracts`
가 딸려와 예산을 크게 넘는다. 게다가 `contracts/codegen.py`(E3, `SENSITIVE_PATHS`)와
`scripts/check-comment-ledger.py`(E1, 게이트 자신이라 순환)가 포함돼 무인으로 닫히지도 않는다.

## 이 패스가 쓴 판별식

정책 본문의 「복원 경로 넷」과 「유지 대상」에 더해, 갈림이 반복된 자리에서 아래 넷을 썼다.

1. **가드 조항은 「조용한 파손」에만 걸린다.** 「무엇을 넣지 말라 / 무엇과 같아야 하는가」를 말해도
   어겼을 때 테스트가 **즉시** 붉어지면 정책이 보호하는 편집 지점 가드가 아니다.
   - 걷음 — `calllog.py` 「Why put_object and not write_object」: 바꾸면
     `test_llm_call_record.py:193` 의 `assert calllog.record_call(store, v1[0]) is False` 가 곧바로 깨진다.
   - 남김 — `calllog.py` `new_call_id` 의 「content-derived id 는 두 번째 호출을 `put_object` 가 거부해
     **조용히** 이력을 잃는다」, `silver.py` `records_of_run` 의 「목록을 실행 레코드에 실으면 한 객체가
     무한히 자란다」, `domain.py` `body_hash` 의 「여기서 정규화하지 않는다」.
2. **부재를 말하는 문장은 복원 경로 넷 어디에도 없다.** `domain.py` E 꼬리표 10줄 중 셋을
   「`# not a contract`」로 줄여 남긴 것이 이 이유다 — `contracts/` 에 파일이 **없다**는 사실은
   코드·문서·PR·커밋 어느 쪽도 적지 않는다. `check_scenario_mapping.py` 의 「AC 는 이 검사기의 축이
   아니다」·「강제하지 **않는** 것: 공백 0」, `feeds/server.py` 의 「시나리오 7 에는 서버 상태가 없다」도 같다.
3. **두 벌이면 「명제를 어길 사람이 읽는 자리」가 정본이다.**
   - `write_object` docstring(구현) ← `test_storage.py` 사본 · `put_object` 사본 · `calllog.py` 단락을 걷음.
   - `timeshift_bronze.py:116` 의 L 가드 ← 모듈 docstring 사본을 걷음(가드가 실제로 끊는 자리).
   - `fixtures/feeds/server.py`(주인) ← `fixtures/llm/server.py` 의 **바이트 동일 문단**을 걷음.
4. **선행 패스가 「주인」으로 지목한 자리는 그 자체가 ②③ 히트여도 유지한다.**
   `check_scenario_mapping.py` 모듈 docstring 의 규칙1~6 블록 13줄이 그렇다 — e2e-harness-axis-pass 가
   같은 파일 `# 규칙N —` 앵커 8줄을 걷으면서 이 블록을 규칙의 주인으로 세웠으므로, 걷으면 그 제거가
   근거를 잃는다.

## 축별로 실제 무엇이 복원했는가

- **②가 가장 많이 닫았다.** 루트 `README.md` 「아키텍처」 절(:32-51)이 `storage.py` 의 세 데이터셋
  모양과 `silver.py`·`domain.py` 의 파티션 규칙을 경로까지 축자로 적고, PRD-4(AC4.1·AC4.2)가
  `runlog.py`·`calllog.py` 모듈 docstring 본문의 태반을 적는다.
  `docs/econ-opinion-monitor-e2e-mocking-policy.md` 의 LLM-04·FEED-05·FEED-06 행은 두 더블 머리
  단락의 **낱말까지** 같고, `docs/econ-opinion-monitor-doc-tracker/2026-09.md:612-617` 은
  `check_scenario_mapping.py` 의 「해제 신호가 왜 필요한가」 여섯 문장을 절 단위로 갖는다.
  `docs/user-journeys/JRN-logic-backfill.md:61` 은 `silver.py` 가 따옴표째 인용한 원문이다.
- **③은 PR #6·#121·#130·#134·#137 본문의 「설계 결정」 절이 전담했다.** 이 레포의 기능 PR 은 판단을
  절 단위로 길게 적어, 모듈 docstring 의 「**Why …**」 단락이 대체로 그 절의 축자 사본이다.
- **④는 거의 비어 있다.** 이 슬라이스 13파일의 저작 커밋 19개 중 제목 외 본문을 가진 것은
  **넷**이고(squash 관행), 그중 둘(`1590050`·`32e7f09`)은 주석 정책 패스 자신이 reconcile task id
  한 줄을 적은 것이라 판정 대상 명제를 담지 않는다. 남은 `535ffda`(파티션 레이아웃 요약)·`d20f2ca`
  둘을 전수로 읽어 명제를 실제로 복원한 자리는 **하나**다 —
  `d20f2ca` 본문의 「버전의 행이 있으면 확정, 재시도 목록에 있는 것만 다시 분석」이
  `silver.py` `pending_retries` 의 4줄을 닫았다. ④ 를 먼저 기계로 재면(저작 커밋 전수 → `%B` 에서
  `Co-authored-by` 를 뺀 줄 수 > 1 만 읽기) 나머지 22행의 ④ 가 몇 분에 닫힌다.
- **낡아 틀린 주석 1건.** `check_scenario_mapping.py` 머리의 셋째 bullet 이 등재 원천을
  `docs/econ-opinion-monitor-doc-tracker.md` 로 적는데, 실제 `TRACKER` 상수는 월별 폴더의 최신
  파일(`.../2026-09.md`)을 고른다. 정책 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다」.

## 판단이 갈려 남긴 것

- `storage.py` 모듈 docstring 의 경계 계약 3줄(「Records cross this boundary as plain JSON-able
  ``dict``s. Producers convert generated dataclasses with ``dataclasses.asdict`` … consumers …
  ``Model.from_dict``」). 시그니처가 `list[dict]` 라 ① 로 걷을 수 있고 어기면 직렬화가 시끄럽게
  깨지지만, 이 줄이 말하는 것은 타입이 아니라 **누가 변환을 책임지는가**라 정책의 「애매하면
  남긴다」를 적용했다. 다시 볼 때는 `dataclasses.asdict` 호출부가 생산자 쪽에 실제로 몇 곳인지부터 셀 것.
- `fixtures/llm/server.py` 의 「모르는 제목은 404 다」 단락 5줄. 첫 문장은 모킹 정책 LLM-04 행이
  적지만(②), 그 뒤 「404 가 없으면 픽스처 누락이 **조용한 통과**가 된다」는 그 행에 없고 run.sh
  가드와 짝이라 통째로 남겼다.

## 무영향 증명

주석·docstring 외에는 한 글자도 바뀌지 않았다.

| 증명 | 결과 |
|---|---|
| **모든 docstring 노드를 뗀 `ast.dump` 부모(`8901498`) 대조** | 편집한 12개 `.py` 전건 **동일** (E 줄 끝 주석 제거는 AST 가 애초에 보지 않는다) |
| `ruff check .` · `ruff format --check .` (0.15.18 = `uv.lock` 핀) | rc=0 · `42 files already formatted` |
| `pytest python/packages` (`PYTHONPATH=packages/*/src`) | **168 passed** |
| `python3 tests/e2e/check_scenario_mapping.py` (편집 대상 자신) | rc=0 — 전집 24 · 1:1 대상 23 · 매칭 23 · 공백 0 |
| `python3 scripts/check-comment-ledger.py` | rc=0 · 불변식 통과 |

## 원장 델타

| 표면 | 판정 완료 행 | 판정 완료 줄 | 잔여 줄 |
|---|---|---|---|
| L | 119 → **125** | 1,687 → **1,719** | 971 → **939** |
| D | 18 → **31** | 350 → **531** | 454 → **122** |
| E | 8 → **11** | 29 → **34** | 50 → **36** |
| 계 | 145 → **167** | 2,066 → **2,284** | 1,475 → **1,097** |

표면 전체 줄 수는 D 804 → 653, E 79 → 70 (L 2,658 무접촉). E 행 28 → 27.

## 범위 밖 — 다음 슬라이스가 가져갈 것

- **`scripts/check-comment-ledger.py`**(D 25 · E 1) — 게이트 자신이라 **순환**이다. 집으려면 옛 blob 을
  tip 트리에서 실행해 출력 무변화를 먼저 증명하는 절차가 슬라이스에 들어간다.
- **`scripts/check-data-format-change.py`**(D 29 · L 2) + **`contracts/codegen.py`**(D 16 · E 3 · L 5) —
  둘 다 `SENSITIVE_PATHS` 라 **함께 사람 승인 슬라이스**로.
- **`python/packages/aggregation/`**(D 51 · L 다수) — `src/**` 가 `PRODUCER_GLOBS` 라 **계약 필드 대입
  줄의 꼬리표는 걷지 말 것**(줄머리 주석·docstring 만 무인으로 닫힌다).
- **`web/src/`**(L 약 300줄)와 **`tests/e2e/specs/`**(L 약 280줄) — 가장 큰 L 덩어리. 화면군은 자매
  D·E 가 거의 없어 언제든 집을 수 있다.
- **L 의 「일부 축만 완료」 30행 521줄** — 남은 축만 채우면 되는 값싼 물량이다.
