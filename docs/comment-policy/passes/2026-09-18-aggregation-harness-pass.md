# 2026-09-18 aggregation-harness-pass — 표적 재판정 (3파일)

| 항목 | 값 |
|------|-----|
| 기준 커밋 | `e7fbcae` (main — #47 착지 직후. 귀속 창 밖이므로 아래 「기준 커밋이 귀속 창보다 앞선다」 참조) |
| 귀속 창 | `be8616f`..`a62eae1` — #38(`33e24ea`) 집계를 배치 DAG 에 배선, #39(`a62eae1`) ingestion 시나리오 6·7 spec |
| 판정 전 | 1317줄 / 94파일 — 지문 `b1caefaa…` |
| 판정 후 | 1312줄 / 94파일 — 지문 `c519bc3b…` |
| 판정한 파일 | **3개** — `deploy/batch/workflow-template.yaml`, `python/packages/aggregation/src/econ_aggregation/aggregate.py`, `tests/e2e/k8s/batch/feed-double.yaml` |
| 제거 | 지문 −5줄 — 삭제 1줄 · 이력 문장 절삭(6줄 → 3줄) · 이력 프레이밍 재작성(5줄 → 4줄) |
| 추적 | reconciler `tbm_econ-opinion-monitor-comment-necessity` / `rct_20260918-0006` |

> **기준 커밋이 귀속 창보다 앞서 있다.** 이 패스가 판정한 것은 귀속 창 `be8616f`..`a62eae1`가 들인 172줄이지만,
> 위 표의 지문은 그 뒤 main에 착지한 `e7fbcae`(#47)에서 측정했다. 그래서 「판정 전 1317줄 / 94파일」에는 귀속 창
> **밖**에서 들어온 **미판정 주석 367줄(신규 14파일)이 그대로 포함**돼 있다 — #42(`e29dddd`)의
> `scripts/journey-scenarios/JRN-daily-scan.js` 29줄(+1파일), #44(`feb454b`)의 analysis 시나리오 하네스·spec
> 193줄(+11파일), #45(`705ebe1`)의 AC3.5 추세 서빙·화면 134줄(+2파일 — `web/src/screens/Trend.tsx`·
> `Trend.test.tsx`, 그리고 기존 `handlers.go` +49 · `handlers_test.go` +27 · `tokens.css` +5 · `api/types.ts` +4 ·
> `api/client.ts` +2), #47(`e7fbcae`)의 `scripts/check-journey-mockup.py` 11줄(신규 파일 없음 — 42 → 53)이다.
> 이 패스는 그 367줄을 보지 않았다.
>
> **미판정 집계는 base가 움직일 때마다 다시 센다** — 옮겨 적지 않는다. 계산은 두 갈래다: **판정 패스가
> 들이거나 지운 줄은 「다른 패스가 판정함」으로 빼고, 판정받지 않은 증분만 더한다.** `feb454b`(1175줄)에서
> `88f5b6f`로 3줄이 줄어든 것은 #40(pin-guard-pass)이 지운 것이고, 그 3줄은 `deploy/base/deployment.yaml` 2줄 ·
> `deploy/batch/workflow-template.yaml` 1줄이다 — **둘 다 귀속 창보다 앞선 본문이고 pin-guard-pass가 판정한
> 줄**이므로 미판정에서 빠질 것이 없고 총계만 내려간다. 반대로 #45의 134줄과 #47의 11줄은 아무 패스도 판정하지
> 않았으므로 그대로 더해진다. `705ebe1` 이후 착지한 #48(`9ec9d24`)·#46(`06ea1e7`)·#49(`2acca02`)는 지문에 **0줄**을
> 더했다 — #48·#49는 `docs/*.md`뿐이라 지문 범위의 `.md` 제외에 걸리고, #46은 `scripts/check-mockup-render.py`를
> +129 −7 고쳤지만 그 파일에는 판정 대상 주석 줄이 하나도 없다(파일별 실측 0). 산술: 953(regression-pass 후)
> + 29(#42) + 193(#44) − 3(#40) + 134(#45) + 0(#48·#46·#49) + 11(#47) = **1317**,
> 미판정 = 29 + 193 + 134 + 11 = **367**.
>
> 지문을 새 base에서 재측정한 것은 원장의 「레포 전체」 산술이 **머지 시점 main과 닫히게** 하기 위함이고
> (그래야 다음 패스가 출발점을 옳게 읽는다), 그 367줄의 판정은 재감지가 여는 다음 task의 몫이다. 귀속 창 안의
> 172줄에 대한 아래 판정은 base 이동과 무관하게 그대로다 — 다만 **대상 3파일의 「판정 전」 수는 절대값이 아니라
> 델타로 읽어야 한다.** `aggregate.py` 12 · `feed-double.yaml` 9는 `0125cae`·`e29dddd`·`feb454b`·`88f5b6f`·
> `705ebe1`·`e7fbcae` 어디서 재도 바이트 일치하지만, `deploy/batch/workflow-template.yaml`은 pin-guard-pass가 머리 가드에서 1줄을
> 지워 46 → **45**가 됐다(이 패스가 지우는 3줄은 그 가드가 아니라 133행 이후 AC3.2 블록이라 그대로 얹힌다).
> 이 패스의 제거 델타는 **−3 · −1 · −1**로 base와 무관하다.

**전수가 아니라 표적 재판정이다.** 귀속 창이 들인 것은 172줄(순증 164줄 / +8파일)이고, 그중 **166줄은 정책
「유지 대상」 열거와 일치**해 손대지 않았다. 복원 가능한 내용을 담은 것은 아래 3자리 6줄뿐이다. 파일별 결과는
[`../ledger.md`](../ledger.md), 판단 기준은 [`../README.md`](../README.md).

## 무엇이 들어왔나

| 커밋 | 무엇 | 주석 델타 |
|---|---|---|
| `33e24ea` (#38) | 집계를 배치 DAG 에 배선 + delta·spark 실값화 | +27 / −3 (3파일, 파일 수 불변) |
| `a62eae1` (#39) | ingestion 시나리오 6·7 전용 e2e 하네스와 spec | +145 / −5 (12파일 중 8개 신규) |

`be8616f`에서 지문을 재측정한 값이 직전 baseline(`796/73` / `13c2eb5e…`)과 **바이트 동일**이므로 이 창 밖의
이동은 없다. 산술도 닫힌다: 796 → 820(#38) → 960(#39).

## 제거 · 절삭 · 재작성 — 복원 경로별 근거

### ① 주석이 자기 복원처를 지목한 doc 재진술 — 1줄 삭제 (복원 경로 ② 저장소 문서/`contracts/`)

`python/packages/aggregation/src/econ_aggregation/aggregate.py`

```
- # Percentage points, matching the contract's `delta` doc.
  delta = round((normalized - past[-1]) * 100, 4) if past else 0.0
```

원본은 `contracts/gold/subject_trend.avsc`의 `delta` 필드 `doc` —
`"Change vs the previous bucket, in percentage points (AC3.5)."`. 주석이 **원본의 위치를 이름으로 적고
있고**, 원본은 AC 번호까지 달아 더 정확하다. 정책 본문이 doc 주석 항에서 "본문이 시그니처·`contracts/`
스키마·PRD·README「범위」를 되풀이하는 부분은 제거 대상"이라고 문면으로 지목한 형태다. 「애매하면 남긴다」는
걸리지 않는다 — 이 지식은 유일하지 않다.

### ② 초기 패스가 같은 파일에서 지운 유형의 재발 — 이력 문장 절삭 (복원 경로 ④ 커밋 메시지 + ① 코드)

`deploy/batch/workflow-template.yaml` (6줄 → 3줄)

판정 전:

```
    # AC3.2 "핵심 서술 대상 기준 집계" — Silver -> Gold. Until this template existed
    # the `econ_aggregation` package was reachable only from the test harness, so
    # no scheduled path ever produced Gold and serving fell back to empty
    # datasets (deploy/base/deployment.yaml). No args: the CLI defaults to
    # $ECON_DATA_ROOT and rewrites both Gold datasets from whatever Silver it
    # finds.
```

판정 후:

```
    # AC3.2 "핵심 서술 대상 기준 집계" — Silver -> Gold. No args: the CLI defaults
    # to $ECON_DATA_ROOT and rewrites both Gold datasets from whatever Silver it
    # finds.
```

- initial-pass가 이 파일 **머리에서** 지운 2줄이 `# Batch pipeline templates. Ingestion (AC1.1) and
  analysis (AC2.1-2.6) are wired; / # aggregation gets its own entrypoint when that slice lands.`
  였다. #38은 그 슬라이스를 착지시키며 **같은 서술을 과거형으로 되살렸다**. 문면이 달라 바이트 비교로는
  재발 0이고, 의미 수준 대조에서만 잡힌다.
- 복원 경로 ④ — #38의 커밋 메시지가 "집계를 배치 DAG 에 배선"이다. 경로 ① — "Gold 부재 시 빈 데이터셋"은
  `deploy/base/deployment.yaml`의 주석이 담고 있고, 그 줄은 원장에서 **유지** 판정을 받았다(주석이 스스로
  그 파일을 가리킨다).
- **남긴 것**: `# AC3.2` 인라인 태그, `No args: …` 2줄(CLI 인자 부재의 의도), `Pure recomputation … so a
  retry here is always safe and never billable.` 2줄(재시도·과금 근거는 복원 불가능한 운용 지식).

### ③ 날짜와 task id 를 담은 변경 이력 — 재작성 (복원 경로 ③④ 그 자체, 제거 유형 「작업 흔적」)

`tests/e2e/k8s/batch/feed-double.yaml` (둘째 문단 5줄 → 4줄)

판정 전:

```
# 2026-09-18(rct_20260918-0004)부터 `python -m http.server` 대신 픽스처 디렉터리의
# `server.py` 를 돈다. 기본 동작은 그대로 이 디렉터리를 서빙하는 것이라 기존 피드 URL 의
# 응답은 바이트 동일하고, 그 위에 `…-test-ingestion.md#시나리오 6` 이 요구하는 고장 주입
# 경로(`/__fail__/` · `/__flaky__/` · `/__slow__/`)만 얹힌다. 상류의 **가용성**을 시나리오가
# 전제하는 대로 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다.
```

판정 후:

```
# 서버는 픽스처 디렉터리의 `server.py` 다. 기본 동작은 이 디렉터리를 그대로 서빙하는 것이고,
# 그 위에 `…-test-ingestion.md#시나리오 6` 이 요구하는 고장 주입 경로(`/__fail__/` ·
# `/__flaky__/` · `/__slow__/`)가 얹힌다. 상류의 **가용성**을 시나리오가 전제하는 대로 흔드는
# 자리이지 수집 로직을 흉내내는 곳이 아니다.
```

무엇이 **언제·어느 작업으로** 바뀌었는지는 PR·커밋 메시지의 정의 그 자체다. **삭제가 아니라 재작성**인 것은
같은 블록의 나머지가 픽스처 지식이기 때문이다 — 고장 주입 경로 3개(`/__fail__` · `/__flaky__` · `/__slow__`),
"상류의 **가용성**을 시나리오가 전제하는 대로 흔드는 자리이지 수집 로직을 흉내내는 곳이 아니다"는 그대로
살렸다. "기존 피드 URL 응답은 바이트 동일"은 *변경 전과의 대조*로만 뜻이 서는 절이라 이력 프레이밍과 함께
빠졌고, 같은 지식은 "기본 동작은 이 디렉터리를 그대로 서빙하는 것"이 담는다.

**새 문면에는 개수·날짜·식별자·구현 경로가 없다.** 자매 패스(pin-guard-pass)가 "대상을 `both`로 세던 가드
문면이 세 번째 `image:`가 들어오자 거짓이 됐다"는 교훈을 남겼다. 이 패스가 쓴 두 블록은 파일이 자라도
조용히 거짓이 될 수 없는 문면이다.

## 유지 — 근거 (귀속 창 172줄 중 166줄)

정책 「유지 대상 > 복원 불가능한 지식」 열거와 대조해 범주별로 확인했다.

- **런타임·픽스처 함정** — HTTP 상태 줄이 latin-1 이라 한글을 넣으면 연결이 끊긴다, `__slow__` 때문에
  스레딩 서버를 써야 한다, `--fetch-timeout 1 < /__slow__/5/` 가 깨지면 시나리오의 해당 항이 관측되지 않는다.
- **데이터 계약의 비자명한 성질** — `news_item` 은 주기마다 덮어쓰기라 3주기 관측이 불가능해 주기 사이
  스냅샷이 필요하다, `news_body` 만 누적된다, 버킷 키 사전식 정렬 = 시간순(모델 definition 이 **유지 예시로
  이름을 댄 바로 그 항목**).
- **격리 근거** — `/data/faults`·`/data/cycles` 를 `/data` 와 섞으면 앞선 ingestion 시나리오의 단정이
  오염된다.
- **테스트가 왜 그 모양으로 단언하는지** — "걸러진 중복·격리된 소스는 Bronze 에 흔적이 없어 상류가
  아무것도 주지 않은 경우와 구별되지 않는다 ⇒ 집계(로그)와 레코드를 함께 본다".
- **기계 판독 선언은 지문 밖** — 새 spec 2개의 첫 행 `// 검증 시나리오: …` 은 정책이 제외하는 줄이다
  (`tests/e2e/check_scenario_mapping.py` 가 읽는다). 초기 패스가 `ac3-*.spec.ts` 에서 지운 **산문형**
  시나리오↔AC 연결 설명의 재발은 0건이다.

기계 검사 3종도 같이 돌렸다(직전 판정 `rct_20260918-0003` 이 쓴 잣대와 동일): 추가분의 구분선 장식 **0건**,
초기 패스가 지운 88개 문면의 재발 **0건**(공백 줄 포함 교집합 0), 작업 흔적 — 위 ③이 유일한 히트.

## 판단이 갈려 남긴 것

| 대상 | 제거 쪽 근거 | 남긴 이유 |
|------|------|------|
| `workflow-template.yaml` `# AC3.2 "핵심 서술 대상 기준 집계"` 인라인 태그 | 정의가 꼽은 작업 흔적 유형 | 원장이 같은 파일의 `# AC1.1`·`# AC2.1-2.6` 에 내린 "판단 분기로 유지"와 같은 형태다. 어느 스텝이 어느 AC 의 구현체인지는 이 태그 말고 복원 경로가 없다 |
| `workflow-template.yaml` `No args: the CLI defaults to $ECON_DATA_ROOT …` 2줄 | 코드(`__main__` 기본값)가 복원한다 | "인자를 주지 않은 것이 의도"라는 편집 지점의 정보다. 코드는 기본값을 보여 주지만 매니페스트가 그것에 **의존한다**는 사실은 보여 주지 않는다 |
| `tests/e2e/lib/ingestlog.ts` 필드 JSDoc 6줄 | 타입 선언의 재진술로 읽힐 수 있다 | CLI 출력 토큰 ↔ 필드 대응을 적은 것이라 선언만으로는 복원되지 않는다 — 판단 분기로 유지 |
| `ingest-job-cycle2/3.yaml` "배선 설명은 cycle1 머리에 있다" | 「다른 파일 주석의 재진술」 인접 유형 | 오히려 재진술을 **정책대로 회피한** 형태다(중복 대신 포인터) |

## 이번 패스가 보지 않은 것 (후속)

1. **원장 미등재 파일** — 범위 내 94파일 중 원장은 65행(이 패스가 1행 추가). #39가 들인 신규 8파일 중
   판정한 것은 `feed-double.yaml`뿐이다. 원장 스스로 "다음 패스가 그 파일을 다시 판정하며 행을 갱신한다"고
   규정한 설계된 미완이며 위반이 아니다.
2. **다른 패스의 소관 자리** — `scripts/`(regression-pass), `deploy/base/`의 핀 가드(pin-guard-pass).
   이 패스는 그 파일들을 한 줄도 건드리지 않았다.
3. **지문의 사각지대** — Python docstring 본문·줄 끝 주석·줄 중간 블록 주석. 이번 창에서도
   `fixtures/feeds/server.py` 의 설명이 상당 부분 docstring 에 있어 지문에 잡히지 않았다. docstring 을
   별도 표면으로 더할지는 모델 definition 이 예고한 대로 다음 task 의 몫이다.
