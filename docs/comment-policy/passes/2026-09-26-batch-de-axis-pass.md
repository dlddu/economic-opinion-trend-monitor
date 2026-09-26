# 2026-09-26 — batch-de-axis-pass (D·E 표면 첫 판정)

정책 본문은 [`../README.md`](../README.md), 파일별 결과는 [`../ledger.md`](../ledger.md)에 있다.

## 범위

`python/packages/analysis/**` + `python/packages/ingestion/**` 의 **D(docstring 본문) 18행 349줄 ·
E(줄 끝·줄 중간 주석) 7행 32줄 = 25행 381줄**. 2026-09-26 지문 표면 개정(#163)이 D·E 두 표를 판정 축 `—` 전량으로 등재한
뒤의 **첫 판정 슬라이스**다. L 표면은 한 행도 건드리지 않았다.

- **예산**: 정의의 덩어리 예산은 주석 400줄이고 이 슬라이스는 381줄이다. 남은 19줄에 정확히 맞는 유일한
  덩어리는 `contracts/codegen.py`(D 16 + E 3)인데, 그 경로는 리뷰 게이트 판정기
  `scripts/check-data-format-change.py` 의 `SENSITIVE_PATHS` 첫 항(`contracts/**`)이라 **한 줄만 건드려도
  이 PR 전체가 사람 승인 뒤로 간다.** 주석 19줄을 위해 381줄의 무인 착지를 잃지 않는다 — 다음 슬라이스가
  다른 `contracts/` 몫과 함께 가져간다.
- **겹치는 열린 PR 없음**: 착수 시점 열린 PR 은 #165(`tests/e2e/**` + 원장 L 행)와 #162(doc-tracker)뿐이고
  이 슬라이스의 파일 집합과 교집합이 공집합이었다. #165 는 이 패스를 준비하는 사이에 착지했고(`8def8fe`),
  그 위로 리베이스한 뒤 게이트를 다시 돌려 D·E 세 칸이 한 칸도 움직이지 않음을 확인했다 —
  #165 는 원장의 L 표만, 이 패스는 D·E 표만 고친다.

## 판정식 — D·E 표면에 처음 적용하는 네 줄

L 표면의 선례를 그대로 쓸 수 없는 자리가 있어(요약 줄·테스트 docstring) 다음을 세운다.

1. **public 모듈·클래스·함수 docstring의 요약 줄은 유지한다.** 시그니처를 말로 옮긴 것이어도
   정책이 「Python: 모듈·public 함수 docstring」을 유지 대상으로 **명시**한 자리다. 걷는 것은 본문이다.
2. **본문이 PRD 조항·테스트 문서 시나리오의 「기대 결과」·루트 `README.md` 「범위」를 옮긴 단락은 걷는다(②).**
   정책이 축자로 「본문이 시그니처·`contracts/` 스키마·PRD·README「범위」를 되풀이하는 부분은 제거 대상」이라
   적은 그 자리다.
3. **같은 명제가 여러 파일의 docstring에 있으면 설명의 주인에만 둔다.** 분석기·수집 소스 선택의 주인은
   그 플래그를 선언하는 `cli.py` 이고, `__init__.py` 와 `llm.py`·`feeds.py` 머리의 같은 문단은 사본이다.
4. **E 표면의 AC 꼬리표는 식별자와 조항 제목만 담으면 걷고, 단정이 *왜 그 모양인지*를 말하면 남긴다.**
   `# AC2.3` 은 PRD 조항 제목의 되풀이이고 명제는 바로 왼쪽 단정이 갖지만,
   `# model is never called without a body` 는 그 단정이 무엇을 지키는지를 말한다.

③ 와 편집 지점 가드가 갈리는 자리는 정책의 판별식(llm-call-harness-pass)을 그대로 썼다 — 저작 PR 본문에
같은 취지가 있어도 **그 줄을 어기는 사람이 읽는 자리**면 남긴다.

## 결과

| | 판정 전 | 제거 | 남음 |
|---|---:|---:|---:|
| D 18행 | 349 | 60 | 289 |
| E 7행 | 32 | 14 | 18 |
| **합계 25행** | **381** | **74** | **307** |

(E 는 `test_fake_llm.py` 행이 0줄이 되어 삭제됐다. 행이 사라진 것은 D 의 `__main__.py` 둘과 이 하나 — 셋 다
그 표면의 주석이 전부 걷혀서다.)

게이트 실측(`python3 scripts/check-comment-ledger.py`, rc=0 「불변식 통과」):
D 43행 886줄 → **41행 826줄**(네 축 완료 16행 289줄) · E 29행 93줄 → **28행 79줄**(네 축 완료 6행 18줄) ·
**L 세 칸은 base 와 전건 불변**(base `8def8fe` 와 이 패스 head 양쪽에서 L 표면 2788줄을 덤프해 sha256
앞 16자리가 `fcd3c6702f4dbc15` 로 동일 — 이 패스의 diff 는 줄머리 주석을 한 줄도 건드리지 않는다).

## 제거 — 근거별

### ② PRD 조항의 되풀이 (D 24줄 · E 14줄)

- `llm.py` 「AC coverage (PRD analysis)」 8줄 · `feeds.py` 「AC coverage (PRD ingestion)」 8줄 ·
  `fake_llm.py` AC 불릿 5줄 + 머리말 1줄 · `test_analysis_run_record.py` 2줄.
  `docs/econ-opinion-monitor-prd-analysis.md` 의 `### AC2.1 대상 국가 추출` ~ `### AC2.6 Bronze → Silver
  추적 키 유지`, `prd-ingestion.md` 의 `### AC1.1` ~ `### AC1.7`, `prd-pipeline-ops.md` 의 AC4.1 과 절 단위로
  대응한다.
- **③ 가 같은 것을 두 번째로 복원한다**: PR #12 본문 「이 PR이 하는 일」 1항이 AC2.1~2.6 여섯을,
  PR #7 본문 「변경」 절이 AC1.2~1.7 여섯을 같은 순서로 열거한다.
- E 표면의 AC 꼬리표 14줄(`test_llm.py` 7 · `test_fake_llm.py` 7)도 같은 근거다.
  `llm.py` 의 같은 유형 2줄은 **같은 근거로 제거 판정했지만 이 PR 에서 걷지 않았다** — 아래 「제거 보류」.

### ② 테스트 문서 시나리오의 전사 (11줄)

`test_llm_call_record.py` · `test_record_run_call_link.py` 머리의 「Transcribes that scenario's expected
results one for one: …」 단락 5+6줄. **주석 자신이 전사임을 선언한다.**
`docs/econ-opinion-monitor-test-pipeline-ops.md` 시나리오 2·3 의 「기대 결과」 항목과 절 단위로 맞는다 —
예: 「every article that reaches the model leaves a call record whatever the outcome (…a cached reply
replayed)」 ↔ 「정상·파싱 실패·호출 실패 기사 모두 호출 기록이 있고 … 이전 응답을 재사용한 기사는 재사용
사실과 원 호출 기록을 가리킨다」.

### ② README 「범위」 + 사본 (14줄)

`analysis/__init__.py` 7줄 · `ingestion/__init__.py` 7줄. 두 패키지 머리가 「두 분석기(두 소스)가 같은
출력 경로를 공유하고, 실제 쪽이 기본이며, 페이크 쪽은 오프라인 스모크용으로 남는다」를 말하는데 이 명제는
네 겹으로 복원된다 — 루트 `README.md`(②) · 같은 패키지 `cli.py` docstring(설명의 주인) ·
PR #8 본문 「이 PR의 범위」(③) · 커밋 `12acd9c` 본문 「CLI --source default fake -> feed … README update」(④).
`analysis/__init__.py` 는 자기 문장 안에서 「(see README scope)」로 복원처를 지목하기까지 한다.

### ③ 저작 PR 본문이 표로 소유 (6줄)

`cli.py` 1줄 + `llm.py` 5줄 — 「기본값을 실 모델로 전환했다 / 수집 피드 cutover 와 같은 모양이다」.
**PR #19 본문이 이 명제를 표로 갖는다**:

| | 수집 (선례) | 분석 (이 PR) |
|---|---|---|
| opt-in 착지 | #7 | #12 |
| 기본값 전환 | #8 | 이 PR |
| 스모크 고정 | `--source fake` | `--analyzer fake` |

이 줄들은 편집 지점 가드가 아니다 — 무엇을 넣지 말라거나 무엇과 같아야 하는가를 말하지 않고, 지나간
전환의 경위만 말한다.

### ① 이름·언어 규약이 복원 (5줄)

- `analysis/__main__.py` · `ingestion/__main__.py` 의 「Entry point for ``python -m econ_X``」 각 1줄 —
  파일 이름이 `__main__.py` 인 것과 `python -m` 의 언어 규약이 그대로 복원한다. 두 행은 D 표에서 삭제됐다.
- `test_record_run_call_link.py` 의 `(1)`·`(2)`·`(3)` 접두 docstring 3줄 — 접두 번호는 시나리오 3 의
  **실행 단계** 번호를 나르는 작업 흔적이고, 명제 자체는 테스트 이름이 문장으로 복원한다
  (`test_every_row_reaches_its_run_and_either_a_call_or_a_reason` ↔ 「각 유형의 레코드에서 호출 기록과
  실행 기록으로 이동한다」). 같은 파일의 나머지 한국어 세 줄은 이름이 담지 못한 조건을 갖고 있어 남겼다.

## 유지 — 전량 유지로 닫은 12행과 그 근거

- `ingestion/cli.py` 14줄 — **스케줄 계약의 근거**(정책의 유지 대상). 「인자 없이 돌면 사이클이 현재 UTC
  시각에서 떨어진다」 · 환경별 주기는 `/spec/schedule` kustomize 패치. CronWorkflow 파일 이름만으로는
  이 계약이 복원되지 않는다.
- `ingestion/sources.py` D 17 · E 7 — **픽스처가 왜 그 모양인지**. `available` 과 `limit` 를 갈라 API 상한
  케이스(AC1.2)를 만들고, 한 소스를 `broken` 으로, 한 기사를 중복으로 둬 실패 격리와 중복 제거를 발화시킨다.
- `test_cli.py` 14 · `test_llm.py` D 8 — 이 테스트들이 **무엇을 지키는가**. 「`LocalFsStore.write_records`
  가 데이터셋을 통째 교체하므로 모델에 닿지 못한 실행은 아무것도 쓰면 안 된다」 · 「모델이 판단하지 않은
  기사(`unanalyzed`)와 그 신호에 써서는 안 되는 운영 실패의 경계」. PR #12 본문 「오설정은 분석 결과가
  아니다」 절에 같은 취지가 있지만, 이 명제를 어기는 사람(= 실패를 degrade 로 바꾸려는 사람)이 읽는 자리는
  여기다 ⇒ 정책의 ③↔가드 판별식이 유지 쪽이다.
- `test_default_feeds.py` D 6 · E 1 · `test_feeds.py` D 7 — **두 테스트 파일의 경계**(「파싱·정규화는
  `test_feeds.py` 가 보고 여기서는 운영 컷오버만 단언한다」)와 픽스처 전송 더블의 계약.
- `test_ingestion_run_record.py` D 2 — 「한 Workflow 의 세 Pod 가 어떻게 합의하는가 — 템플릿이
  `$ECON_RUN_ID` 를 세운다」는 클러스터 쪽 계약이라 파일 안에서 복원되지 않는다.
- `test_llm_call_record.py` E 1 — 「the reuse sent nothing」.
- `llm.py` E 4 — 그중 2줄은 제거 보류(바로 아래).

### 제거 보류 — `llm.py` E 의 AC 꼬리표 2줄

`# AC2.1, multi (AC2.4)` · `# AC2.3` 은 위 ② 와 같은 근거로 **제거 대상으로 판정**했다. 걷지 않은 이유는
판정이 아니라 게이트다 — 두 줄이 붙은 코드 줄이 계약 필드 대입(`Analysis(target_countries=…, sentiment=…)`)이라
꼬리표만 걷어도 `scripts/check-data-format-change.py` 가 그 줄 전체를 변경으로 보고
`format_changed=true` 를 낸다(실측: `CHANGED python/…/llm.py — 배치 생산자가 계약 필드에 채우는 값 변경`).
판정기는 줄 끝 주석만의 변경을 가려내지 못하고, 판정기 자신이 `SENSITIVE_PATHS` 이며 「PR 이 게이트를 고쳐
스스로 통과하지 못한다」는 **의도된 속성**이라 고치지 않는다. ⇒ 이 두 줄은 `contracts/codegen.py`(D 16 · E 3)와
함께 **사람 리뷰가 어차피 붙는 다음 슬라이스**에서 걷는다. 원장 E 행의 결과 칸에 같은 사유를 적었다.

부분 유지로 남긴 것 중 굵은 것:

- `llm.py` 93줄 — chat-completions 엔드포인트의 **문서화되지 않은 동작**(GPT-5.x 계열이 자기 기본값 외
  temperature 를 400 으로 거절한다), 캐시가 로그가 아니라 **재생할 값한 답의 색인**인 이유, `no_call_reason`
  이 「요청이 아예 안 나갔을 때만」이라는 규칙.
- `feeds.py` 63줄 — World Bank search API 가 쓸 만한 RSS/Atom 을 내지 않아 별도 파서를 쓰고, view count 를
  노출하지 않아 `srt`/`order` 결과 순서가 랭킹을 대신한다. `default_feeds.json` 이 **검증되지 않은 스타터
  목록**이라는 경고도 남겼다(PR #8 본문이 ⚠️ 로 같은 말을 하지만 그 목록을 고치는 사람이 읽는 자리다).
- `analysis/cli.py` 37줄 — 「settled」 의 정의와 「재분석은 버전 범프이지 프롬프트·모델 변경이 아니다」,
  `_book_outcomes` 의 버킷 순서 근거(순서를 바꾸면 한 레코드가 두 버킷에 들어가고 아무것도 붉어지지 않는다).

## ④ 를 기계로 닫은 방법

이 25행이 걸친 파일의 저작 커밋은 **25개**이고, `%b` 에서 `Co-authored-by`·빈 줄을 뺀 본문 줄이 하나라도
있는 것은 **7개**뿐이다(이 레포는 squash 제목 한 줄이 관행이다). 그 일곱을 전수로 읽어 이 슬라이스의 명제를
실제로 복원하는 자리는 하나였다 — `12acd9c`(「CLI --source default fake -> feed, bundled
default_feeds.json fallback, … README update」)가 두 `__init__.py` 의 기본 소스 서술을 복원한다. 나머지 여섯
(`535ffdaf`·`d20f2caa`·`fc304c58`·`9569ca33`·`c4038e23`·`32e7f09a`)은 변경 목록이라 ①②③ 이 이미 닫은 것을
되풀이한다. ④ 는 그래서 「비어 있음을 확인한 축」으로 닫혔다.

## 수치가 기계 도출임을 보인 프로브 둘

- **양성**: `llm.py` D 행의 판정 축을 `①②③④` → `—` 로 변이하면 네 축 완료가 16행 289줄 → **15행 196줄**로
  정확히 그 행의 93줄만큼 줄고, 복원하면 되돌아온다(rc=0).
- **음성**: `sources.py` 에 줄 끝 주석 한 줄을 더하면 게이트가 rc=1 로 떨어지며
  `R7 [E] … 현재 주석 줄 수 7 ≠ 실측 8` · `지문 7444ffed9bd2 ≠ 실측 dfc7c3d82c1f` 두 건을 정확히 지목한다.

## 범위 밖 (후속)

- **D 25행 537줄 · E 22행 61줄**이 판정 축 `—` 로 남고, 여기에 위 「제거 보류」 2줄이 더해진다 —
  `python/packages/core`(D 220 · E 11) ·
  `python/packages/aggregation`(D 52 · E 2) · `scripts/`(D 137 · E 12) · `tests/e2e`(D 123 · E 19) · `contracts/codegen.py`(D 16 · E 3, 위 「예산」 참조) · `go/internal`(E 13) ·
  `web/src`(E 1).
- 이 패스는 **L 표면을 한 줄도 건드리지 않았다**. L 의 미판정 80행 1074줄은 그대로 남는다.
