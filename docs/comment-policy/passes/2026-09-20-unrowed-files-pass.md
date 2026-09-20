# unrowed-files-pass — 행 없던 파일 11개 판정 (2026-09-20)

기준 커밋 `473a965` · 판정 범위 **11파일 298줄** · 제거 **33줄** · 남음 **265줄**
(레포 전체 지문 `2159 → 2126`, 파일 수 `118 → 118`)

정책 본문은 [`../README.md`](../README.md), 파일별 결과는 [`../ledger.md`](../ledger.md)에 있다.

## 왜 이 범위인가

직전 [scenario-spec-pass](2026-09-20-scenario-spec-pass.md)가 닫힌 뒤 원장의 잔여는 **766줄**이었다 —
⑴ 행이 없는 12파일 332줄 + ⑵ 행이 있으나 그 뒤 자란 10파일 434줄. 이 패스는 그중 **⑴을 닫는다.**

⑴을 고른 것은 그것이 **완결되는 경계**이기 때문이다. ⑵는 행을 이미 가진 파일의 재판정이라 어디서 끊어도
임의의 선이 되지만, ⑴은 "아직 아무도 보지 않은 파일"이라는 성질로 스스로 닫힌다. 12파일 중 11파일만
판정한 유일한 예외가 `web/src/screens/Fairness.tsx`(34줄)다 — 열린 PR #70이 그 파일을 수정 중이라 뺐다.
겹치는 트리 위에서 판정하면 머지 순간 「판정 전」 줄 수와 판정 근거가 함께 낡는다. scenario-spec-pass가
같은 이유로 `tests/e2e/lib/` 를 미뤘고, 이 패스가 그 미룬 몫을 받는다.

판정 직전 열린 PR **셋 전부**(#70 · #71 · #72)의 파일 목록을 다시 조회해 이 11파일과 **겹침 0**을 확인했다.
(#71은 `python/packages/ingestion/` 다섯 파일, #72는 `README.md` 와 `deploy/batch/cronworkflow-*.yaml` 둘.)

판정 후 `tests/e2e/lib/` 는 6파일 전부가, `tests/e2e/k8s/batch/` 는 21파일 전부가 행을 갖는다.

## 제거한 것 (33줄)

### ① 다섯 파일에 바이트째 되풀이된 디렉터리 설명 (20줄)

`tests/e2e/lib/` 의 여섯 파일 중 **다섯**(`bronze` · `gold` · `ingestlog` · `llmdouble` · `silver`)이
머리에 같은 블록을 **글자 그대로** 달고 있었다.

```
// 이 디렉터리는 `specs/` 밖이다 — `tests/e2e/specs/*.spec.ts` 만이 시나리오 매칭 단위이고
// (docs/econ-opinion-monitor-doc-tracker.md 「e2e 매핑 › 매칭 규약」), 헬퍼가 그 집합에
// 섞이면 `check_scenario_mapping.py` 가 선언 없는 매칭 단위로 읽는다.
```

복원 경로가 **둘 다 열려 있다**:

- **① 코드** — `tests/e2e/check_scenario_mapping.py:104` 가 `SPEC_DIR.glob("*.spec.ts")` 로 훑는다.
  `SPEC_DIR` 은 `tests/e2e/specs`(:51)이므로 `lib/` 는 애초에 스캔 대상이 아니다. "섞이면 어떻게 되는가"는
  일어날 수 없는 일의 가정이고, 그 판정을 하는 코드가 바로 옆 디렉터리에 있다.
- **② 저장소 문서** — doc-tracker 「e2e 매핑 › 매칭 규약」 첫 항이 "매칭 단위: `tests/e2e/specs/` 최상위
  `*.spec.ts` **파일**. … `fixtures/`·`k8s/`·`run.sh`·… 는 실행 하네스라 매칭 단위가 아니다"를 못박는다.

**주석이 자기 복원처를 스스로 인용한다**는 점에서 scenario-spec-pass가 지운 「사전 조건은 "…"이다」와
같은 자리다. 되풀이 주석의 비용도 이미 드러나 있었다 — 인용한 경로 `docs/econ-opinion-monitor-doc-tracker.md`
는 **다섯 파일 전부에서 낡아 있다**. 그 문서는 월별 디렉터리(`docs/econ-opinion-monitor-doc-tracker/2026-09.md`)로
갈라졌고, 원본 한 곳만 고쳐질 때 사본 다섯이 조용히 거짓이 되는 것이 정책이 이 유형을 드는 이유다.

여섯 번째 파일 `feeds.ts` 에는 이 블록이 없다. 같은 디렉터리·같은 역할인데 블록 없이도 아무 문제가
없다는 **레포 안의 대조군**이다.

### ② 시나리오 재진술 (4줄)

`tests/e2e/specs/aggregation-3-bucket-rollup.spec.ts` 의 머리가 사전 조건·실행 단계·기대 결과를
따옴표째 옮겨 적는다. scenario-spec-pass가 자매 spec 16개에서 지운 것과 **같은 유형·같은 자리**이고,
이 파일은 그 패스의 슬라이스가 확정된 뒤 #65로 들어와 행을 받지 못했다. 판정 기준은 이미 서 있으므로
같은 잣대를 그대로 적용했다 — 바로 윗줄 `// 검증 시나리오:` 가 문서와 앵커를 기계 판독 형식으로
가리키므로 복원 경로 ②가 완전히 열려 있다.

### ③ 복원처를 지목한 뒤 그 요지를 다시 적은 절 (5줄)

`tests/e2e/k8s/batch/timeshift-job.yaml` 의 둘째 문단이다.

```
# 집계 코퍼스(`/data/aggregation`)가 이미 만들어 둔 Bronze·Silver 를 읽어, 수집 시각만 고정
# 달력으로 다시 찍어 `/data/aggregation-rollup` 에 심는다. 왜 필요한지는 스크립트 머리말에
# 있다 — 요지는 수집 CLI 가 `collected_at` 을 실행 시각으로 찍어서 한 Job 의 레코드가 전부
# 같은 시간 버킷에 떨어진다는 것이다.
```

앞 절(무엇을 어디서 어디로)은 같은 파일의 `command` 와 `args: --from /data/aggregation --to
/data/aggregation-rollup` 이 그대로 복원한다. 뒤 절은 **"왜 필요한지는 스크립트 머리말에 있다"고
복원처를 직접 지목한 다음 그 요지를 다시 적는다** — `tools/timeshift_bronze.py` 머리말이 같은 사실을
더 길고 정확하게 담고 있다. `ingest-job-cycle2.yaml` 이 보여준 **주인 지목 포인터**는 README가 권하는
형태이므로, 포인터를 없애는 대신 되풀이만 걷었다.

### ④ 구분선과 선언 재진술 (4줄, `lib/gold.ts`)

- `/* ── 롤업 루트(시나리오 3) ── */` — 제거 유형 ④ 구분선. `contracts/codegen.py` 배너 6줄과
  `Makefile` 의 `## ---` 6줄 선례를 따른다.
- 선언 재진술 JSDoc 3줄 — `goldDir()`·`goldSkewDir()` 은 본문이 각각
  `exportedDir("E2E_GOLD_DIR")`·`exportedDir("E2E_GOLD_SKEW_DIR")` 한 줄이고, **한글 뜻풀이까지 같은 파일
  머리 주석이 이미 달아 두었다**(`$E2E_GOLD_DIR(기준 상태) · $E2E_GOLD_SKEW_DIR(수집량을 부풀린 상태)`).
  `axisSentiments()` 의 `/** 기본 단위의 axis_sentiment 행. */` 은 바로 아랫줄
  `inFinestUnit(axisSentimentsAllUnits(dir))` 이 복원한다. 정책이 "TS는 export 함수의 JSDoc 요약 1줄을
  유지한다"면서 단 단서 — "본문이 시그니처를 되풀이하는 부분은 제거 대상" — 에 정확히 걸린다.

## 유지한 것 (265줄)

이 슬라이스의 **89%가 유지**다. 네 파일(`feeds.ts` · `aggregate-job-rollup.yaml` ·
`timeshift_bronze.py` · `Fairness.test.tsx`)은 **전량 유지**다.

- **관측 설계** — "Gold 를 Gold 로 증명하지 않는다"(`gold.ts` · `aggregation-3`), 걸러진 중복도 격리된
  소스도 Bronze 에 레코드가 없어 "없다"만으로는 애초에 아무것도 주지 않은 경우와 구별되지 않는다는
  근거(`ingestlog.ts`), 저신뢰·미분석과 모델 호출 실패가 레코드만으로는 갈리지 않는다는 근거(`silver.ts`).
- **데이터 계약의 비자명한 성질** — `2026-W26` 이 `2026-06-23T14` 보다 크게 정렬되지만 **더 나중이라서가
  아니다**(`gold.ts`). 모델 정의가 유지 유형으로 이름 대어 지목한 바로 그 지식이다.
- **부재의 근거** — `timeshift-job.yaml` 에 `mock-exception:` 이 **붙지 않는** 이유(주입하는 상류가 없다).
  무엇이 없다는 사실은 코드가 복원하지 못한다. `analyze-job.yaml` 의 같은 판정 선례를 따른다.
- **함정·런타임 제약** — 인터프리터를 `/app/.venv/bin/python` 으로 못박는 이유(`python3` 면 시스템
  인터프리터가 먼저 잡혀 `ModuleNotFoundError` 로 죽고, 그 실패가 "코퍼스가 이상하다"로 오독된다),
  `CELL_SEP` 을 상수로 내보내는 이유(손으로 조립한 키가 보이지 않는 NUL 과 어긋났고 git 이 그 파일을
  바이너리로 취급해 diff 조차 나오지 않았다).
- **공허 통과 방지의 근거** — 버킷이 단위마다 하나뿐이면 롤업 단정이 `x = x` 로 통과해 시나리오 3이
  초록인데 아무것도 시험하지 않게 된다(`timeshift_bronze.py` 가드 · `aggregation-3` 첫 테스트).
- **테스트가 왜 그 모양으로 단언하는지** — 스텁이 모든 기대값의 출처라는 설계, 토글이 정직하려면 눌렀을
  때 화면이 말하는 바가 바뀌어야 한다는 근거, **허위 컨트롤 금지**(`Fairness.test.tsx`).
  `Sentiment.test.tsx`·`Trend.test.tsx` 가 전량 유지된 것과 같은 유형이다.

## 판단이 갈려 남긴 것

- **`aggregate-job-rollup.yaml` 전량 (10줄)** — 첫 줄 "「`aggregate-job.yaml` 과 **데이터 루트만** 다르다」"는
  두 매니페스트를 나란히 읽으면 복원되지만(경로 ①), 같은 덩어리가 "수집 시각만 여러 버킷으로 흩어져
  있으므로 이 Job 이 쓴 Gold 는 세 단위가 모두 버킷을 여럿 갖는다"는 **기대 산출물의 근거**로 이어진다.
  그 결론은 이 파일에도 `timeshift-job.yaml` 에도 적혀 있지 않고 **두 Job 의 조합에서만** 나온다. 줄
  단위로 끊으면 근거까지 잘리므로 「애매하면 남긴다」로 유지했다(`ingest-job.yaml` 선례).
- **`silver.ts`·`ingestlog.ts` 의 필드별 JSDoc (도합 20줄)** — `/** Silver에 쓰인 레코드 수. */` 류는
  선언 재진술에 가깝다. 다만 이 필드들은 **CLI 출력 토큰을 그대로 따른 축약 이름**(`wrote` ·
  `attempted` · `failed` · `bodiesNew`)이고, 주석이 그 축약을 푸는 대응표 노릇을 한다. `gold.ts` 에서
  지운 셋과 달리 **본문 한 줄이 곧 답인 형태가 아니라** 로그 형식과의 대응이라 유지했다.
- **`…avsc 가 계약의 SSOT다」 1줄 주석 3건** (`bronze.ts` · `silver.ts` · `gold.ts` 2) — 타입이 avsc 를
  반영하는 것은 맞으나, **그 방향성**(누가 SSOT인가)은 타입 선언이 말해 주지 않는다. 유지.

## 범위 밖 관측 — 지문의 사각지대

`tests/e2e/tools/timeshift_bronze.py` 의 모듈 docstring(1–29행)에도 위 ①과 **같은 되풀이**가 있다
("``tests/e2e/specs/`` 밖에 있다 — 매칭 단위는 spec 파일뿐이고 …"). 지우지 않았다: docstring 본문은
줄머리가 `#` 가 아니어서 as-is 지문이 보지 않는 **사각지대**이고, 모델 정의가 "docstring 재진술이 주요
중복 유형으로 드러나면 docstring 을 별도 표면으로 지문에 더하는 것을 다음 task에서 다룬다"고 표면 확장을
tobe-modeler 몫으로 못박았기 때문이다. 판정 표면 밖을 손으로 고치면 원장의 줄 수와 지문이 어긋난다.

**이 패스가 그 유형의 실물 근거 하나를 보탠다** — 같은 문장이 여섯 자리(`lib/` 다섯 + 이 docstring)에
복사돼 있었고, 그중 지문이 보는 다섯 곳은 전부 낡은 경로를 인용하고 있었다.

## 다음 패스로 넘기는 것 (범위 밖)

이 패스 뒤 잔여는 **468줄**이다(「읽는 법」의 계수 규약대로 두 몫).

- **⑴ 행 없는 1파일 34줄** — `web/src/screens/Fairness.tsx`. PR #70 머지 후 재감지가 새 task로 잇는다.
- **⑵ 행보다 자란 10파일 434줄** — `handlers.go` +173 · `handlers_test.go` +86 · `run.sh` +84 ·
  `check-journey-mockup.py` +23 · `types.ts` +19 · `test_aggregate.py` +18 · `tokens.css` +11 ·
  `ac3-8-normalized-ratio.spec.ts` +9 · `client.ts` +7 · `aggregate.py` +4.
  이 중 여섯(`handlers.go`·`handlers_test.go`·`types.ts`·`client.ts`·`tokens.css`, 그리고 ⑴의
  `Fairness.tsx`)은 PR #70이 수정 중이므로 **그 머지 뒤에 재판정해야** 근거가 낡지 않는다.
  겹치지 않는 다섯(`run.sh` +84 · `check-journey-mockup.py` +23 · `test_aggregate.py` +18 ·
  `ac3-8` +9 · `aggregate.py` +4 — 도합 138줄)이 다음 슬라이스의 자연스러운 후보다.
- **Python docstring 표면** — 위 「범위 밖 관측」. 표면 확장은 tobe-modeler 몫이다.
