# record-run-call-link-pass (2026-09-26)

기준 커밋 `fafceb8` — PR [#137](https://github.com/dlddu/economic-opinion-trend-monitor/pull/137)
(`feat(analysis): 레코드↔실행↔호출 연결 (PRD-4 AC4.3)`)이 착지한 main tip.
reconciler task `rct_20260926-0001` / `tbm_econ-opinion-monitor-comment-necessity`.

**표적 패스다** — #137 이 들인 주석 26줄만 판정했다. 그 아래 줄들은 직전 판정 그대로다.

## 왜 이 26줄인가

직전 패스(`format-gate-pass`)가 미판정 잔여를 0 으로 닫으면서 **이 창을 문면으로 예고했다**:
「다음 선은 `main` 밖에 있다 — 열린 #137 이 주석을 gross 29줄 더하므로 착지하면 재감지가 새 task 를 연다」.
#137 이 06:28:44Z 에 머지되며 잔여가 **0 → 26** 으로 벌어졌고, 이 패스가 그 인계를 받는다.

계수는 손으로 하지 않았다 — 원장의 파일 행을 `|` split 으로 파싱하고(정규식 금지) 창 양 끝의 live
지문을 파일별로 집계해 대조했다. 부모 `d4d0045` 에서 잔여 **0**(원장이 서명한 값과 일치), tip 에서
잔여 **26** = ⑴ 행 없는 신규 파일 12줄 + ⑵ 행보다 자란 네 파일 14줄. 계수기 공전은 음성 프로브
두 방향으로 배제했다 — `deploy/base/deployment.yaml` 행(live 10 = 남음 10)의 「남음」을 5 로 낮추면
⑵ 가 5줄을, 그 행을 통째로 지우면 ⑴ 이 10줄을 잡는다(0 → 5 · 0 → 10, 둘 다 재현).

## 판정 요약

| 파일 | 판정 전 | 제거 | 남음 |
|---|---|---|---|
| `python/packages/analysis/src/econ_analysis/llm.py` | 10 | 4 | 6 |
| `python/packages/analysis/src/econ_analysis/fake_llm.py` | 6 | 0 | 6 |
| `python/packages/analysis/tests/test_llm.py` | 12 | 3 | 9 |
| `python/packages/analysis/tests/test_llm_call_record.py` | 2 | 1 | 1 |
| `python/packages/analysis/tests/test_record_run_call_link.py` | 12 | 12 | 0 |
| **레포 전체** | **2686** | **20** | **2666** |

파일 수 160 → 159 — `test_record_run_call_link.py` 가 남음 0 이라 이후 지문에서 빠진다.

## 제거 20줄 — 근거

### ⒜ 바로 아래 단언·선언의 재진술 (경로 ①) — 8줄

`llm.py` 의 「Failed or parsed, a request went out and left a record — the row points at it …」 2줄은
바로 아래 두 줄이 그 말 자체다. 성공 경로와 `CompletionError` 경로가 합류한 **뒤에** `call_id` 를
무조건 스탬프하는 구조라, 「불통이어도 호출에 닿는다」는 분기 구조가 복원한다.

`test_record_run_call_link.py` 6줄도 같다 — 실행 도달 1(아래가 run id 집합 단언) · 배타 1(아래가
배타 단언 그대로) · 네 유형 열거 1 · 본문 미확보 1 · 타 실행 누출 1 · AC2.6 불변 1. 열거형 1줄은
특히 정책이 **가드에서도 금한 형태**다(「개수·열거·행 위치는 담지 않는다 — 파일이 자라면 조용히
거짓이 된다」). 바로 아래 루프가 같은 넷을 데이터로 들고 있다.

`test_llm.py` 3줄은 아래 두 단언이 문장 그대로 적는다: call id 목록이 다르다는 단언이 「by design 으로
다르다」를, 전건이 채워졌다는 단언이 「둘 다 남는다」를 보인다.

`test_llm_call_record.py` 1줄은 **#137 이 같은 테스트의 docstring 을 바로 그 문장으로 고쳐 썼다** —
「본문 미확보 기사는 호출 자체가 없으므로 기록도 없고, 그 자리를 미호출 사유가 채운다」. 주석은 그
docstring 의 영어 사본이다.

### ⒝ 같은 명제의 사본 — 주인만 남긴다 (정책 「다른 파일 주석의 재진술」) — 4줄

`test_record_run_call_link.py` 의 「한 홉 경유」 2줄과 「직접 가리켰다면 가리킬 대상이 없었다」 2줄은
`llm.py` 재사용 분기의 가드와 **같은 명제**다. 그 가드는 구현의 편집 지점에 있고 이 패스가 남겼으므로,
테스트 쪽 두 벌이 사본이다. 테스트 쪽은 이름과 docstring 이 이미 판별 성질을 적는다 —
`test_a_reuse_of_a_pre_call_record_cache_still_reaches_a_call_record` 와 「원 호출을 모르는 캐시를
재사용해도 레코드는 자기 호출 기록에 도달한다」가 그것이고, 아래 두 단언이 값까지 든다.

### ⒞ PR 본문 축자 (경로 ③) — 2줄

「양쪽 끝에서 읽는 같은 사실」은 #137 본문 「양방향은 그것을 **양쪽 끝에서 읽는 같은 사실**이다」의
번역이고, 타 실행 누출 1줄은 본문 음성 프로브 표의 `records_of_run` 행이 결과까지 적는다.

### ⒟ 계약 스키마 (경로 ②) — ⒜⒞ 를 한 번 더 덮는다

`contracts/silver/analysis.avsc` 의 세 필드 doc 이 판정을 두껍게 한다. `no_call_reason` doc 은
「Null exactly when call_id is set — one of the two is always present, so no row is silent about where
its judgement came from」으로 **배타 명제를 축자**로, `call_id` doc 은 재사용이 자기 호출 기록을 남긴다는
사실과 **한 홉 경유의 근거까지** 적는다. `llm.py` 모델 거절 분기 2줄도 여기서 한 번, 같은 파일
`_unanalyzed` 의 docstring(「``no_call_reason`` is set only when no request went out at all …」)에서 한 번
복원된다.

## 판단이 갈려 남긴 것 — 6줄

### `llm.py` 재사용 분기의 가드 3줄 — 편집 지점 가드

```
# The row names the record *this* run wrote, not the original reply's
# call: an entry cached before call records existed has no original to
# name, and `reused_from_call_id` is the hop AC4.3 reads (AC4.2).
```

명제 자체는 `analysis.avsc` `call_id` doc(②)과 #137 본문(③) 양쪽에 있다. 그런데도 남긴 것은
`format-gate-pass` 가 세운 규칙 때문이다 — 「같은 명제가 다른 경로에 있어도, 그 줄이 미래 편집자에게
**무엇을 넣지 말라**를 말하고 어기면 **조용히** 깨지면 남긴다」. 여기가 정확히 그 자리다: 바로 아래
줄을 「원 호출을 직접 가리키게」 고치면 타입도 테스트 이름도 변하지 않은 채 **호출 기록 이전에 쌓인
캐시 항목에서 연결이 부분 함수가 된다**. 계약 스키마와 PR 본문은 이 줄을 고치는 사람이 여는 문서가
아니다. 비용이 비대칭이라 남긴다.

대조군으로 `test_llm.py` 3줄은 같은 규칙을 적용해 **제거**했다 — 거기서 제외 목록을 건드리면 등가
비교가 **즉시 붉게** 깨진다. 조용한 파손이 아니므로 가드 조항이 보호하는 대상이 아니다.

### `#:` 모듈 속성 doc 주석 3줄 — 정책 유지 대상 + 레포 전건 선례

`llm.py` 의 `NO_CALL_BODY_UNAVAILABLE` 앞 1줄, `fake_llm.py` 의 `NO_CALL_KEYWORD_ANALYZER` 앞 2줄.

두 블록 다 내용은 `analysis.avsc` `no_call_reason` doc 의 괄호절과 **거의 축자**이고, `fake_llm.py`
쪽은 **같은 파일 모듈 docstring**(#137 이 함께 들인 문단)이 먼저 같은 말을 한다. 그럼에도 남긴 근거는 둘이다.

1. 정책 본문이 「Python: 모듈·public 함수 docstring, **모듈 속성의 `#:` 주석**」을 유지 대상으로 못박는다.
2. 레포 전건 선례가 한 방향이다 — 현재 `#:` 는 6파일 16줄이고 이를 만난 패스는 **전부 유지**했다
   (initial-pass · reprocess-python-pass · runlog-window-pass · storage.py 4줄). 그중 runlog-window-pass 는
   오히려 `ENV_RUN_ID` 의 `#:` 를 「설명의 주인」으로 세우고 `workflow-template.yaml` 의 바이트 동일 사본
   **5벌을 걷었다**. 여기서 `#:` 를 지우면 그 선례의 첫 이탈이 되고, 사본 관계의 반대쪽
   (모듈 docstring)은 **아직 판정 표면이 아니라** 지울 수단이 없다.

애매하면 남긴다는 정책대로 남기고, 대신 아래에 새 관측으로 등재한다.

## 이 패스가 남긴 새 관측

- **`#:` ↔ 모듈 docstring 중복이 실물로 나왔다.** `fake_llm.py` 는 같은 명제를 모듈 docstring 문단과
  `#:` 속성 doc 두 곳에 갖는다. 정책 README 의 사각지대 조항은 「docstring 재진술이 주요 중복 유형으로
  드러나면 docstring 을 별도 표면으로 판정에 더한다」고 적어 두었다 — 이 자리가 그 조건에 닿는 첫 표본이다.
  판정 표면을 넓히려면 지문(`versionScript`)이 docstring 을 보게 해야 하므로 **tobe-modeler 소관**이다.
- **여전히 유효한 선행 관측**: `# shellcheck disable=` 2줄이 DIRECTIVE 정규식 누락으로 판정 집합에
  들어온다 · `econ_core/calllog.py` 66줄 전량 docstring(지문 사각지대) · mockup 인덱스가 R10 스캔에서
  README 를 빠뜨린다 · 트래커의 「정적 R1~R11」이 R12 를 빠뜨린다.

## 무영향 증명 (클러스터·uv 없이)

- `git diff --shortstat` = **4 files changed, 20 deletions(-)** — 추가 0줄.
- 변경 줄 중 **비주석 0줄**(삭제 20줄 전부가 줄머리 `#`).
- 다섯 파일 전건에서 **주석을 걷어낸 본문 md5 가 부모와 바이트 동일**.
- `docs/` 밖에서 이 패스가 건드린 파일은 이 넷뿐이고, 판정 대상 주석은 런타임에 도달하지 않는다.
