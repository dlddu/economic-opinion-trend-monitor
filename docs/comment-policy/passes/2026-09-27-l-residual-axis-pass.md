# 2026-09-27 — l-residual-axis-pass

L 표면의 판정 미완 잔여 **23행 347줄** 중, 열린 PR #178 이 파일을 겹치는 **4행 88줄**을 뺀
**19행 259줄**을 ①②③④ 네 축 전건 판정. 제거 **150줄**(순삭 126 · 개작 24자리) ·
**행 소멸 3**(`python/packages/ingestion/tests/test_sources.py` ·
`python/packages/analysis/tests/test_fake_llm.py` ·
`python/packages/analysis/tests/test_llm_call_record.py` — 판정 대상 주석 0줄).

reconcile task `rct_20260927-0004` (`tbm_econ-opinion-monitor-comment-redundancy`).

게이트 자기출력: L 판정 완료 **168행 2379줄 → 184행 2488줄** · 잔여(미판정 + 일부 축만)
**23행 347줄 → 4행 88줄** · L 전체 2726줄 191파일 → **2576줄 188파일**. D·E 표면 무접촉.

## 범위를 이렇게 고른 이유 — 예산 400에 259로 끝낸 근거

잔여 23행은 전부 단일 파일 행이라 파일 공유 union-find 가 싱글턴 23개다. 조합이 자유로우므로
예산 400줄 안에서 잔여 전체(347)를 한 덩어리로 가져갈 수 있었다. 그럼에도 **4행 88줄을 뺀 것은
정의가 유일하게 인정하는 축소 사유 — 「파일이 실제로 겹치는 열린 PR」** 이다:

| 뺀 행 | 줄 | PR #178 이 그 파일에 하는 일 |
|---|---:|---|
| `python/packages/aggregation/src/econ_aggregation/aggregate.py` | 13 | `+32 −15` |
| `python/packages/aggregation/src/econ_aggregation/cli.py` | 3 | `+9 −2` |
| `web/src/screens/Fairness.test.tsx` | 30 | `+116 −11` (원장 행 30 → **45**) |
| `web/src/screens/Fairness.tsx` | 42 | `+129 −15` (원장 행 42 → **44**) |

#178(자매 `tbm_econ-opinion-monitor-docs-impl/rct_20260927-0003` 슬라이스 12, AC3.9)은
`contracts/gold/` 접촉이라 `SENSITIVE_PATHS` 뒤 **사람 승인 필수**이고 지금 `BLOCKED` 다 —
임박하지 않으므로 기다려 흡수하지 않았다. 네 행을 지금 판정하면 그 착지가 곧 줄 수·지문을
움직여 판정 축을 `—` 로 되돌린다(판정이 곧 무효가 되는 자리). 또한 `Fairness` 쌍은 **원장에서도**
#178 이 같은 두 줄을 고치므로 착지 순서에 따라 충돌한다. 이 PR 의 원장 diff 는 그 네 행과
#178 이 새로 꽂는 네 행의 **어느 줄도 건드리지 않는다**.

⇒ **완료 기준은 「L 잔여 0」이 아니라 「L 잔여 = #178 이 겹치는 4행 88줄」** 이다. 그 88줄은
#178 착지로 지문이 움직인 뒤 재감지가 새 task 로 잇는다.

## 축 ④ — 이 레포에서 두 번째로 실제 히트가 난 축

19행의 저작 커밋 중 트레일러를 뺀 본문을 가진 것은 **넷**(`fc304c5`#12 · `d20f2ca`#125 ·
`535ffda`#121 · `bcaa60d`#154)이고, 그중 셋이 판정 대상 명제를 담았다.

- **`fc304c5`(#12)** 「misconfiguration exits 2 before reading Bronze; all-calls-failed exits 3
  without writing Silver」 ⇒ `analysis/cli.py` 의 전송 먼저 구성 2줄 ·
  `analysis/tests/test_llm.py` 의 구성 시점 실패 1줄. **③ 뿐 아니라 ④ 로도 닫힌다.**
- **`d20f2ca`(#125)** 제목 「모델이 거부한 unanalyzed는 확정, 호출 실패만 재시도」 + 본문
  「버전의 행이 있으면 확정, 재시도 목록에 있는 것만 다시 분석」 ⇒ `test_cli.py` 의 거부·확정 2줄.
- **`bcaa60d`(#154)** 제목 「AC4.3 이전 Silver 행(run_id 없음)을 다시 연결한다」 ⇒ `test_cli.py`
  의 프로덕션 마이그레이션 전제 2줄(뒷절은 `test_llm_call_record.py` 쪽이 정본이었다).
- `535ffda`(#121) 의 다섯 불릿은 파티션 레이아웃이고, 남은 줄과 겹치지 않는다.

## 판정을 가른 판별식 — 「어겼을 때 조용히 깨지는가」

이 슬라이스의 대상 중 절반은 **reconciler 저작 PR**(#174 · #177)이 들인 주석이다. 그 본문은 설계
판단을 절 단위로 길게 적으므로 경로 ③ 을 문면 그대로 적용하면 유지가 0 에 수렴한다. 정책의
「편집 지점에서만 효과가 있는 가드」 조항을 **작동하는 판별식**으로 좁혀 썼다:

> 그 줄이 말하는 것을 어긴 편집이 **테스트를 즉시 붉히는가**. 붉히면 경로 ③ 이 닫는다
> (편집자는 PR 본문을 읽지 않아도 붉은 것을 본다). **통과하면서 조용히 무의미해지면** 남긴다.

PR #174 가 실측해 둔 음성 프로브 표가 이 판별식의 입력이 됐다 — `selectServing` 우회 3건 FAIL ·
버킷 절단 오조준 5건 FAIL. 즉 **조인 유지·재분석 1회 계상은 즉시 붉는다**. 반면:

- **`RawCount` 를 이 엔드포인트가 세는 편집**은 `Total == RawCount` 를 **자동으로 성립시켜**
  테스트를 통과시킨다. 등식의 두 변이 서로 다른 출처에서 와야 한다는 것이 그 등식의 전부이므로
  이것이 **유일한 무음 파손**이다 ⇒ 2줄 가드로 유지.
- **`contributions_test.go` 의 Gold 리터럴을 손으로 맞추는 편집**도 통과한다 ⇒ 3줄 가드로 유지.
- **spec 의 기대값을 상수로 박는 편집**도 통과하면서 관측을 멈춘다 ⇒ 1줄 가드로 유지.
- **`sources.py::_body` 의 마커 포맷**은 fake LLM 추출과 바이트로 맞물려 있다 ⇒ 유지.
- **`feeds.py` 의 안정 정렬**은 동점(전건 0 조회수)을 단언하는 테스트가 없다 ⇒ 유지.

## 정본/사본 판정이 가장 크게 수확한 자리

`python/packages/ingestion/tests/test_sources.py`(**10 → 0**)와
`python/packages/ingestion/tests/test_feeds.py`(**21 → 2**).

두 파일은 같은 수집 계약을 페이크 소스와 실 피드 어댑터 양쪽에서 단언하는 **쌍둥이**이고,
주석도 거의 바이트 근접 쌍이었다(`Bodies are unique by content hash within a run (AC1.7).` ·
`Every item is axis-tagged (AC1.3).` · `Uncaptured bodies keep the link but reference nothing
(AC1.4).` · 본문 수정 → 새 content key 2줄). 정책 「다른 파일 주석의 재진술 — 설명의 주인에만
둔다」로 실 어댑터 쪽(`test_feeds.py`)을 정본으로 세운 뒤, **그 정본조차 AC1.2·1.3·1.4·1.5·1.7
PRD 문면의 축자**임을 확인해 19줄을 걷었다. 두 파일에서 유지된 것은 **PRD 에 없는 것 둘**뿐이다:

- `# The /kr/fx URL appears in both feeds -> de-duplicated once (AC1.6).` — 어느 픽스처 URL 이
  중복을 만드는지는 `stats.duplicates == 1` 이 말하지 않는다.
- `# The failing fetch is retried (default retries=2 -> 3 attempts) before isolation.` —
  `fetcher.calls[FLAKY_URL] == 3` 의 3 이 어디서 오는지(기본값은 `feeds.py` 에 있다).

Atom `<link href>` 파싱 지식의 정본은 `feeds.py::_find_link` 의 docstring
(`"""Extract the article URL from an RSS ``<link>`` text or Atom ``<link href>``."""`,
**D 표면 · 판정 완료**)이라 `test_feeds.py` 쪽 1줄은 사본이었다.

## 계약 스키마(②)가 닫은 자리 — 주석이 이미 어긋나 있었다

`python/packages/aggregation/tests/test_aggregate.py` 의
`# The second reads its own previous bucket, in percentage points (AC3.3).` 는
`contracts/gold/subject_trend.avsc` 의 `delta` doc
`Change vs the previous bucket, in percentage points (AC3.5).` 와 **축자로 같고**, 주석의 AC
꼬리표만 다르다(AC3.3 vs AC3.5). 정책 「되풀이된 주석이 낡아 틀려 있으면 제거 근거가 강해진다」
그대로다.

같은 파일의 `# Raw counts stay per-bucket rather than cumulative (AC3.8).` 는 **유지**했다 —
`raw_count` doc 은 `Raw collected count before normalization, shown alongside the share (AC3.8).`
로 **누적/비누적을 적지 않는다**. AC3.8 본문도 적지 않는다.

## 판단이 갈려 남긴 것 (「애매하면 남긴다」)

- **`#:` 모듈 속성 doc 다섯 줄**(`analysis/cli.py` 2 · `analysis/llm.py` 2 ·
  `analysis/fake_llm.py` 2 중 2) — `cli.py` 의 두 줄은 #12 본문이 두 종료 코드를 적으므로 ③④ 히트가
  있다. 그런데 정책 「유지 대상 · doc 주석」이 `#:` 를 명시적으로 열거하고, 이 레포는 **`#:` 전건
  유지 선례**가 서 있다(2026-09-26 `de-residual-axis-pass`). 유지 대상의 제거 조건은
  「시그니처·`contracts/` 스키마·PRD·README 「범위」 되풀이」로 열거돼 있고 커밋 메시지는 그
  목록에 없다 ⇒ **유지**. 이 판단이 뒤집히면 다섯 줄이 함께 움직인다.
- **`contributionRow` 의 두 필드 근거**(`BodyDuplicate`/`BodyShares`) — AC1.7 PRD 가
  「전재(다른 링크·같은 본문)」까지 적지만 **왜 플래그와 개수를 둘 다 내는지**(전재의 폭 vs 같은
  기사의 반복 관측)는 PRD·PR #174 본문 어디에도 없다 ⇒ 정본으로 유지.
- **`test_cli.py` 의 도메인 전제 다섯 줄** — 가드 오발 경계(`전건 미분석인데 실패 0` 은 걸려서는
  안 된다) · 재관측 전제 · 코드 미상향 · Bronze 주기 누적. 테스트 이름이 담지 못하는 전제다.
- **`aggregation/tests/test_aggregation_run_record.py` 1줄 전건 유지** — `--memo` 없는 publish 가
  거부된다는 명제가 PRD AC4.1 · doc-tracker(`--version V --memo …` 는 기록 쪽만 적는다) ·
  PR #130 본문 · 커밋 본문 **전부 0히트**였다.
- **spec 의 `select_serving` 미모방 3줄** — 「이 루트는 분석을 한 번만 돌려 레코드당 Silver 행이
  하나다. 재처리가 들어오는 날 이 단정은 정당하게 깨진다」는 **유효 조건의 기술**이고 PR #177
  본문에 없다. 언제 이 spec 의 재계수가 production 과 갈라지는지를 아는 유일한 자리다.

## 남긴 관측 (표면 소유권 규칙 안)

없다. 새로 발화한 사각지대도, 등재된 사각지대가 판정을 틀리게 만든 실례도 없었다.
게이트 재계수는 6칸 전부 자기 출력과 일치했고 파싱 실패 0이다.
