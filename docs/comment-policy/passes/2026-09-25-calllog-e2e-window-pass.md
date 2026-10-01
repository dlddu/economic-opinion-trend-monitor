# calllog-e2e-window-pass — 기능·CI PR 둘(#134 AC4.2 · #131 e2e 크리티컬 패스)이 연 판정 표면 82줄 전량 판정

**표적 재판정이다(전수 아님).** 판정 창을 확정한 커밋은 `78e32da`(#131 착지 tip = 감지 시점의 main)이고,
**편집이 얹힌 기준 커밋은 `e92e3cc`** 다 — 준비 도중 자매 PR 둘(#135 residual-close-pass · #136 pipeline-ops
시나리오 1 spec)이 착지해 리베이스했다. 두 트리에서 **이 패스의 델타는 동일하다**(아래 「검증」).
직전 패스([runlog-window-pass](2026-09-25-runlog-window-pass.md))가 판정한 창 뒤로 **대상 레포의 기능·CI PR 둘**이
착지해 판정된 적 없는 주석을 새로 들였다. 추적 task는 `rct_20260925-0003`
(reconciler `tbm_econ-opinion-monitor-comment-necessity`).

판정 결과 요약: **판정 표면 82줄 중 제거 60 / 유지 22** — 판단 분기 2. 여기에 원장이 한 번 유예해 둔
`run.sh` 2줄을 함께 판정(유지)해 그 유예를 닫았다. 레포 전체 지문은 기준 커밋 `e92e3cc` 에서
`2766 → 2706`(파일 `152 → 152` — 남음 0 이 된 파일 없음). 편집 전 `b34a22988256…`, 편집 후 `82e0b05348d6…`.
창을 확정한 `78e32da` 위에서 같은 편집을 하면 `2637 → 2577`(`74e979feb42d…` → `55710eb5f58f…`)로,
**두 base 에서 델타가 −60(−66/+6)으로 같고 파일별 분해도 같다.**
**주석 외 한 바이트도 바뀌지 않았다** — 편집한 4파일 전부 주석 줄을 걷어낸 나머지의 md5 가 편집 전후 동일하다(아래 「검증」).

## 무엇이 들어왔나 — 귀속

직전 판정 지점은 `0e38ab1`(#133, runlog-window-pass 자신이 착지한 tip)이다. 그 지점에서 versionScript 를
재실행해 baseline `lines=2561 files=143` / `a2d3714654df…` 를 **바이트 재현**했으므로 창은 정확히
`0e38ab1..78e32da` **2커밋**이고 놓친 이벤트는 0이다.

두 커밋 다 **내 산출이 아니라 대상 레포의 기능·CI PR** 이라 소진된 트리거가 아니다.

| 커밋 | PR | 성격 | 이 파일에 들인 주석 |
|---|---|---|---|
| `58e82a2` | [#134](https://github.com/dlddu/economic-opinion-trend-monitor/pull/134) | feat(analysis) 기사별 LLM 호출 기록(AC4.2) | `llm.py` 7 · `cli.py` 6 · `test_llm_call_record.py` 8 |
| `78e32da` | [#131](https://github.com/dlddu/economic-opinion-trend-monitor/pull/131) | ci(e2e) 크리티컬 패스 단축 | `run.sh` +52−6 · `playwright-setup.sh` 9 |

지문 히트 줄 집합의 대칭차집합으로 **추가 82(gross) / 제거 6 / 순증 76**. 판정은 **gross 82 로** 했다 —
순증만 보면 `run.sh` 의 판정 대상을 46 으로 과소 진술한다(실제 추가 52). 제거된 6 중 4는 단계 표지
재작성이고 2는 같은 주석의 재들여쓰기(`# A source the CLI cannot reach …`)라 새 지식이 아니다.

`docs/comment-policy/` tree 가 창 세 지점(`0e38ab1`·`58e82a2`·`78e32da`)에서 **바이트 동일**
(`ecc5a43c85e9…`)이므로 어떤 패스도 이 82줄을 보지 않았다. 5파일 중 **2파일
(`playwright-setup.sh` 9 · `test_llm_call_record.py` 8)은 원장에 행 자체가 없었다**(신규 파일).

### 원장이 유예한 `run.sh` 2줄을 함께 닫았다

runlog-window-pass 는 「열린 PR 이 건드리는 2줄은 착지 뒤에 본다 — #131 이 `run.sh` 2 를 고친다」로
유예했다. #131 이 이 창에서 착지했으므로 그 유예는 해제됐는데, **유예 수치 2 를 그대로 승계하면 틀린다**:
#131 은 그 2줄을 고치지 않고 `run.sh` 를 +52−6 으로 다시 썼다. 유예된 2줄을 직접 특정했다 —
e2e-runner-pass 착지 트리(`da51edd`, run.sh 지문 25)와 창 시작(`0e38ab1`, 27)의 차집합은

```
# Partitioned and object datasets come back as one JSONL per dataset, so specs read
# them like any other.
```

로 `export_parts()` 머리 2줄이며(현재 `run.sh:82-83`), `535ffda`(Hive 파티션)가 들였다. 이번에 판정해
**유지**했다(아래 「판단이 갈려 남긴 것」). 따라서 `run.sh` 행은 **판정 전 73 = 25(판정됨) + 2(유예) + 46(순증)**
전량을 본 값이고, 남은 유예는 0이다.

## 복원처 — 무엇이 어디서 복원되는가

이 창의 제거는 대부분 **경로 ③(PR 본문)** 과 **경로 ②(저장소 문서·코드)** 로 닫힌다. 두 PR 본문이
설계 판단을 스스로 길게 적어 두었기 때문이다.

| 복원처 | 무엇을 복원하는가 |
|---|---|
| [#131](https://github.com/dlddu/economic-opinion-trend-monitor/pull/131) 본문 | 겹치기 전략 전체, `SKIP_BUILD`·`E2E_REUSE_CLUSTER`·`E2E_PLAYWRIGHT_SETUP_RC` 세 knob, kind `--wait` 제거 근거, 체인별 데이터 루트와 「체인끼리 서로의 루트를 읽지 않음」, 로그 고정 순서·실패 전파, apply 후 rollout 대기 |
| `.github/workflows/ci.yml:43-58` | CI 쪽 실행 순서 근거의 **주인** — 「kind 와 Playwright 를 잡 초반 백그라운드로, 그 사이 이미지 빌드, run.sh 는 필요한 지점에서만 대기」와 브라우저 캐시를 두지 않는 근거 |
| `tests/e2e/playwright-setup.sh:2-10` | Playwright 설치 계약의 **주인** — `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD`, `--with-deps` 가 `CI=true` 에서만 붙는 이유 |
| [#134](https://github.com/dlddu/economic-opinion-trend-monitor/pull/134) 본문 | 「정직하게 남긴 것」①(본문 미확보 = 호출 기록 없음, 미호출 사유는 AC4.3 몫) ②(호출 기록 이전 캐시 재사용 → `reused_from_call_id` null), 「설계 판단」①(로그를 캐시와 분리한 이유 = 실패가 되짚을 대상) ②(append-only 를 `put_object` 의 성질로), 표 ⑴(네 갈래 전부 기록) ⑷(재사용이 원 호출을 가리킴) |
| `docs/econ-opinion-monitor-prd-pipeline-ops.md:47-60`(AC4.2) · `:62-70`(AC4.3) | 기록 대상 필드, 「파싱 실패·호출 실패도 기록」, 「재사용이면 그 사실과 원 호출」, append-only, 미호출 사유는 AC4.3 |
| `llm.py:432-441`(`run_llm_analysis` docstring) | `calls`·`reply_origins` 의 의미와 null origin 의 **주인** |

## 제거 60줄 — 파일별 근거

### `tests/e2e/run.sh` 73 → 32 (제거 41)

직전 재판정([e2e-runner-pass](2026-09-21-e2e-runner-pass.md))이 이 파일에서 96줄 중 71줄을 걷었고, 그때
걷은 범주가 **「머리의 경로 목차 28줄 → lede 2줄」** 과 **「단계 표지 뒤 서술 25줄」** 이었다. #131 이
**머리 주석을 8 → 29줄로 다시 키우고** 단계 표지 뒤 서술을 재유입시켰다 — 직전에 제거 판정을 받은 바로 그 형태의 재발이다.

- **머리 21줄 전량 제거.** ⑴ 「Anything that does not depend on the previous step overlaps with it」 + 세 불릿(5줄)은
  아래 단계 표지 0)·1)·4) 가 실행 순서대로 같은 목록을 되풀이하고(경로 ①), `ci.yml:51-54` 가 같은 문장을
  **CI 쪽 주인으로** 갖는다(경로 ②). ⑵ knob 표 12줄은 세 knob 각자의 `if` 블록과 FAIL 문면이 의미를 적고
  (경로 ①), #131 본문이 세 knob 을 이름으로 열거한다(경로 ③). 「the log is read from the same path with
  .log instead of .rc」는 `PW_SETUP_LOG="${PW_SETUP_RC%.rc}.log"` 가 축자다. ⑶ `playwright-setup.sh` 를
  가리키는 2줄은 **그 파일 자신이 주인**이라 정책의 제거 유형 「다른 파일 주석의 재진술 — 설명의 주인에만 둔다」에
  그대로 걸린다. ⑷ 빈 `#` 2줄은 위 블록과 함께 사라진다.
- **단계 표지 뒤 서술 제거, 표지는 1줄로 환원.** 0) 「it needs neither the images nor the cluster」는
  `playwright-setup.sh:3-4` 가 주인이고 「used to sit on the critical path」는 #131 본문(경로 ②③).
  1) 「The cluster comes up in the background while the images build」는 `&` + `wait "$KIND_PID"`(경로 ①).
  2) 「Every ConfigMap and both stacks are applied first and only then waited for」는 apply→`rollout status`
  코드 순서와 #131 본문 「rollout 대기 겹치기」(경로 ①③). 5) 「The setup started at step 0 …」는 0) 의 재진술.
- **kind `--wait` 제거 근거 2줄 제거** — #131 본문이 「노드 Ready(CNI, ~20초) 대기를 빼서 `kind load`·apply 와
  겹칩니다(파드는 `rollout status` 가 기다림)」로 축자 보유(경로 ③).
- **4) 블록 6줄 → 1줄 가드.** 데이터 루트 열거 `(/data, /data/faults, …)` 는 정책이 금지한 **열거**이고
  (README「가드는 개수·열거·행 위치를 담지 않는다」) `chain_*` 함수가 각자 자기 루트를 적는다(경로 ①).
  「chains run concurrently / Jobs inside a chain stay sequential」도 `for chain … &` 와 순차 호출이 복원한다.
  남긴 것은 **금지만 말하는 가드** 한 줄 — 「A chain must not read another's root.」 체인 격리는 동시 실행의
  전제이고 깨지면 e2e 가 비결정적으로 흔들리는데 어느 한 자리도 그 전역 성질을 보여주지 못한다.
- **체인 fan-out/수집 서술 4줄 제거** — #131 본문 「로그는 체인별 파일로 모아 고정 순서로 출력하고, 하나가
  실패해도 나머지 로그를 다 보여준 뒤 실패합니다」가 네 문장 전부를 덮는다(경로 ③). 코드도 `>"$CHAIN_LOG_DIR/…"`
  · `failed_chains` 로 같은 말을 한다(경로 ①).
- **4c)·4f) 표지의 덧붙은 서술 제거** — 4c) 「Sequential *within* this chain …」은 #131 본문 「`cycles`(1→2→3
  순차 유지)」와 `for cycle in 1 2 3` 가(경로 ①③), 4f) 「which re-stamps this chain's corpus」는 #131 본문
  「rollup 이 baseline 코퍼스를 읽으므로 같은 체인 끝」이 복원한다. 4f) 는 **순서 가드 「it must follow it」만**
  한 줄에 남겼다.

### `python/packages/analysis/src/econ_analysis/llm.py` 9 → 2 (제거 7, 창이 들인 전량)

#134 가 들인 3블록 전부 제거. 파일의 기존 2줄(저신뢰 임계 공유·카탈로그 정규화 방침)은 그대로다.

- **본문 미확보 분기 3줄** — #134 본문 「정직하게 남긴 것」① 이 **거의 축자**로 같은 말을 하고
  (「모델에 가지 않았으므로 「없는 호출」의 기록을 짓지 않았다. 그 자리가 요구하는 「미호출 사유」는 AC4.3 이
  Silver 행에 다는 몫이다」), AC4.3 문면이 「모델을 호출하지 않은 레코드(본문 미확보 등)는 호출하지 않은 사유를
  가진다」로 **본문 미확보를 이름으로** 적는다(경로 ②③). 앞절 「Never reached the model」은
  `if not (item.get("body_available") and body)` 가드 자체다(경로 ①).
- **parse_failed ↔ call_failed 3줄** — AC4.2 「파싱에 실패했거나 형식이 깨진 응답, 모델 호출 자체가 실패한
  경우도 기록한다」와 #134 본문 표 ⑴ 이 구분을 적고(경로 ②③), 「`replies` holding the transmitted pair is
  exactly the difference」는 바로 아래 `outcome="parse_failed" if replies else "call_failed"` 의 산문 번역이다(경로 ①).
- **캐시 항목의 `call_id` 1줄** — #134 본문 표 ⑷「재사용이 원 호출 기록을 가리킴 … (캐시에 `call_id` 동승)」이
  축자이고, 필드 이름 `call_id` 와 `reply_origins` 가 스스로 말한다(경로 ①③).

### `python/packages/analysis/tests/test_llm_call_record.py` 8 → 1 (제거 7)

행이 없던 신규 파일. 7줄 제거의 공통 근거는 **바로 아래 단언이 같은 말을 한다**는 것(경로 ①)이고, 그 위에
AC4.2·#134 본문이 겹친다.

- 「A reply that came back and would not parse is recorded *with* the reply — that is the case somebody reads
  back …」 2줄 → 아래 `call_outcome == "parse_failed"` + `response_raw == "not json at all"` 가 앞절을,
  AC4.2 「가공 전 응답 원문」과 #134 「설계 판단」①「실패야말로 되짚는 대상」이 뒷절을 복원.
- 「A request that never came back has no reply to keep, but still a record.」 1줄 → 아래
  `call_outcome == "call_failed"` + `response_raw is None` 두 줄이 문장 그대로다.
- 「Still a *new* record, so the log counts the reuse rather than hiding it.」 1줄 → 아래 `call_id != origin`
  과 AC4.2 「그 사실과 재사용한 원 호출 기록을 남긴다」.
- 「A version bump re-asks the model about the same article (a different cache key).」 1줄 → `"llm-v2"` 인자와
  `reply_cache_key(analyzer_version, …)` 시그니처가 복원하고, **게다가 이 테스트는 `reply_cache` 를 아예 넘기지
  않아 괄호절이 이미 낡았다**(정책: 되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다).
- 「Append-only is a property of the write, not a convention: …」 2줄 → #134 「설계 판단」② 가 축자
  (「append-only 를 관례가 아니라 저장 계층의 성질로 만들었다 … `put_object` … 교체를 거부한다」)이고 아래
  `record_call(...) is False` 단언이 그 성질을 잰다.

### `python/packages/analysis/src/econ_analysis/cli.py` 14 → 9 (제거 5)

- **`reply_origins` 머리 3줄 전량 제거** — 앞절은 AC4.2 ⑷ 와 필드·변수 이름이(경로 ①②), 뒷절
  「Entries written before call records existed have no call_id … null origin」은 **`run_llm_analysis`
  docstring(`llm.py:439-441`)이 같은 말을 더 정확히 갖고** 있고 #134 본문 「정직하게 남긴 것」② 가 축자다
  (경로 ①③). 설명의 주인은 그 계약을 구현하는 함수 쪽이다.
- **`calllog.record_call` 앞 3줄 → 1줄.** 「the call log is what AC4.2 asks for *about* failures」는 #134
  「설계 판단」① 이, 「a batch nobody answered is exactly the one whose call records must survive」는 같은 절의
  「실패야말로 되짚는 대상」이 복원한다(경로 ③). **어느 경로에도 없는 것은 순서뿐이다** — 「all-calls-failed
  exit 보다 앞에 써야 한다」는 제약은 코드가 현재 순서를 보여줄 뿐 그 순서가 **불변식**임을 말하지 못하고,
  두 PR 본문·PRD·커밋 메시지 어디에도 없다. 그래서 절 단위로 갈라 **금지만 말하는 가드 한 줄**만 남겼다:
  `# Must stay ahead of the all-calls-failed exit below (AC4.2).`

## 유지 22줄

### `tests/e2e/playwright-setup.sh` 9 → 9 (제거 0)

신규 파일이지만 **전량 유지**다. 이 파일은 #131 이 Playwright 설치 계약을 한곳으로 모으려고 만든 것이고,
`run.sh:28-29` 를 제거한 근거가 바로 「설명의 주인은 이쪽」이다 — 여기까지 지우면 그 지식이 저장소에서 사라진다.
유지 내용: 백그라운드 실행 전제, `--with-deps` 가 `CI=true` 에서만 붙는 이유(백그라운드에는 sudo 프롬프트에
답할 터미널이 없다 — 런타임 제약), 로컬에서 Chromium 이 안 뜰 때의 처방, `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` 의 효과.

### `tests/e2e/run.sh` 유지 32

머리 8(lede 2 · 빈 `#` · `make e2e`/CI 동일 스크립트 · 전제 도구 · `KEEP_CLUSTER` — e2e-runner-pass 승계),
단계 표지 0)~5)·4a)~4f) 의 1줄 표지(시나리오 포인터 포함), 체인 격리 가드 1, 4f) 순서 가드 1,
`export_parts` 머리 2(판단 분기 — 아래), 정상 주기 가드 2 · 빈 Gold 가드 3(테스트가 왜 그 모양으로 단언하는지),
llm-fixtures 선행 2(ConfigMap 볼륨이 없는 Pod 는 영영 Ready 가 안 된다는 클러스터 제약),
`rollup-timeshift` 선행 1, bash 3.2 의 빈 배열 + `set -u` 제약 1(복원 불가능한 런타임 제약), 그 밖 승계분.

### 그 밖의 유지

`llm.py` 2 · `cli.py` 9(그중 이번에 쓴 순서 가드 1) · `test_llm_call_record.py` 1.

## 판단이 갈려 남긴 것

1. **`run.sh:82-83` `export_parts` 머리 2줄** — 「Partitioned and object datasets come back as one JSONL per
   dataset, so specs read them like any other.」 함수 본문의 단일 `.jsonl` 리다이렉트가 앞절을 복원하므로
   제거 쪽 논거가 있다. 그러나 뒷절은 **spec 쪽이 그 평탄화에 의존한다**는 파일 경계 넘는 전제이고, 어느 한
   자리도 그것을 보여주지 못한다(`export_news_item`/`export_body`/`export_analysis` 세 호출부는 글롭만 넘긴다).
   정책의 「애매하면 남긴다」와 유지 대상 「테스트가 왜 그 모양으로 단언하는지」를 적용해 남겼다.
   **원장이 한 번 유예한 자리이므로, 이번 판정으로 유예가 아니라 「물었고 유지」가 됐다.**
2. **`playwright-setup.sh:3-5` 의 호출자 열거** — 「callers run it in the background — run.sh from its first
   line, the CI e2e job from the top of the job」은 `run.sh` 와 `ci.yml` 이 복원하고 정책이 금지한 **열거**에
   가깝다. 다만 이 파일이 그 계약의 주인이라 호출 규약을 여기서 지우면 「왜 백그라운드 전제인가」가
   호출자 쪽에만 남는다 — 주인 쪽을 깎는 방향이라 보류했다. 다음에 `run.sh` 를 다시 볼 때 함께 판정할 자리다.

## 검증

| 검사 | 결과 |
|---|---|
| `ruff check .`(0.15.18, `python/uv.lock` 핀) | rc=0 — All checks passed |
| `ruff format --check .` | rc=0 — 41 files already formatted |
| `pytest`(`python/`, 워크스페이스 4패키지) | **161 passed** in 0.32s |
| `tests/e2e/check_scenario_mapping.py` | rc=0 — 규칙 1~6 위반 없음 |
| `bash -n tests/e2e/run.sh` · `playwright-setup.sh` | rc=0 |
| `scripts/check-data-format-change.py <base> <head>` | `format_changed=false` |
| as-is versionScript(기준 `e92e3cc`) | `lines=2766 files=152` / `b34a2298…` → `lines=2706 files=152` / `82e0b053…` |
| 같은 편집을 `78e32da` 위에서 | `lines=2637 files=145` / `74e979fe…` → `lines=2577 files=145` / `55710eb5…` — **델타 −60 불변** |

**주석 외 불변 증명.** e2e 는 docker·kind 가 필요해 이 워커에서 돌릴 수 없으므로, 「돌려 봤다」보다 강한
증명을 썼다: 편집한 5파일 전부에 대해 `grep -vE '^\s*#'` 로 주석 줄을 걷어낸 나머지의 md5 가
`origin/main` 과 **완전히 동일**하다. 또한 diff 의 모든 `+`/`-` 줄이 주석 또는 빈 줄임을 기계로 확인했다
(`git diff -U0 | grep -E '^[+-]' | grep -vE '^[+-]\s*(#|$)'` 가 빈 출력). 즉 `run.sh` 의 제어 흐름과
Python 런타임 동작은 바뀔 수 없다.

## 원장 반영

- 패스 이력에 행 추가(`e92e3cc` / 2766 → 2706 / 152 → 152).
- 파일 행 갱신: `run.sh` 73/41/32 · `llm.py` 9/7/2 · `cli.py` 14/5/9.
- 파일 행 신설: `playwright-setup.sh` 9/0/9 · `test_llm_call_record.py` 8/7/1.
- 말미 요약을 이 패스 기준으로 교체. **미판정 잔여 86줄**(⑴ 행 없는 파일 2개 41 + ⑵ 행이 있으나 자란 파일 9개 45),
  계수 밖 「보류」는 0, 남은 유예도 0.

## 범위 밖 (다음 패스로)

- **`scripts/check-data-format-change.py` 11 은 여전히 사람 몫.** `main` ruleset 이 `review/manual-approval` 을
  필수 status 로 요구하고 그 status 는 이 스크립트가 `format_changed=false` 일 때만 붙는데, `SENSITIVE_PATHS`
  (`:43-49`)에 **스크립트 자신이 들어 있어** 주석만 고쳐도 PR 이 사람 리뷰 뒤로 간다(게이트 소스 직접 확인).
- **#136 이 `run.sh` 에 들인 32줄은 이 패스의 범위가 아니다.** 준비 도중 착지한 새 창이라 판정 표면이
  아직 열린 적이 없다 — 재감지가 새 task 로 잇는다. 그래서 `run.sh` 행의 남음 32 는 **내 창 기준**이고
  현재 파일은 64줄이라, 원장의 계수 규약대로 그 차이 32 가 ⑵ 로 잔여에 잡힌다(숨지 않는다).
- **#135(residual-close-pass)는 준비 도중 착지했다.** 내 창의 5파일과 **파일 겹침 0** 이라 코드는 충돌하지
  않았고, 이 원장과 `passes/` 만 같은 줄을 건드려 planner 가 직접 리베이스했다. `git reset --hard origin/main`
  뒤 같은 편집 스크립트를 재생해 20개 치환이 전부 1:1 로 맞았고 델타가 불변임을 확인했다.
- **지문 사각지대가 이 창에서 실제로 발화했다.** #134 가 들인 신규 파일
  `python/packages/core/src/econ_core/calllog.py` 는 **66줄 전체가 docstring** 이고 줄머리 `#` 이 0 이라
  지문 히트가 0 인데, 그 본문이 `AC4.2 makes the call log append-only` 처럼 PRD 를 되풀이한다 — 정의가
  「복원 가능」이라 부르는 내용이 판정 집합에 **구조적으로 들어오지 못한다**. 같은 창의 `llm.py`
  `run_llm_analysis` docstring 증설분도 마찬가지다. README「알려진 사각지대」가 「docstring 재진술이 주요
  중복 유형으로 드러나면 별도 표면으로 더한다」고 열어 두었고, 이번 창이 그 조건을 처음 **실측으로** 충족했다.
  해소는 `versionScript` 개정이라 **이 패스의 소관이 아니다**(reconciler tobe-modeler 몫).
- 계수 밖 재판정 후보(감소라 잔여에 안 들어감): `handlers.go` 233 · `handlers_test.go` 112 ·
  `batch-pvc.yaml` 7 · `ac3-8` 25 · `Dashboard.test.tsx` 6.
