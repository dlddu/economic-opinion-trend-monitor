# lineage-surface-pass — 계보 표면 4파일 판정 (`trace` 화면 + `go/internal/store`)

**표적 판정이다(전수 아님).** 기준 커밋 `9a5d32e`. 추적 task는 `rct_20260920-0003`
(모델 `tbm_econ-opinion-monitor-comment-redundancy`).
판정 대상은 **4파일 / 93줄** — 슬라이스 9(`4ddbdaa`/#70)가 들인 계보 표면 중
**어느 열린 PR도 건드리지 않는** 것 전부다.

판정 결과 요약: **제거 13줄 · 문면 정정 2곳(줄 수 불변) · 유지 80줄.**
레포 전체 지문은 `2467 → 2454`(파일 `124 → 124`), 파일별 원장 행은 `121 → 124`.

> **판정은 `83e1281` 트리에서 했고, 착지까지 기준 커밋이 세 번 올라왔다**
> (`83e1281` → `8bad0be` → `cfe9f8b` → `9a5d32e`).
> 그 사이 자매가 판정 대상을 건드린 것은 #79 하나이고 `Trace.test.tsx` 에 주석 2줄을 들였다 — 아래
> 「판단이 갈려 남긴 것」이 그 둘을 따로 판정한다. 나머지 셋(`Trace.tsx`·`store_test.go`·`store.go`)의
> 판정 전 줄 수는 네 지점에서 **불변**이다(36 · 6 · 29). 제거한 13줄도 어느 자매와도 겹치지 않는다.
> 마지막 이동(`cfe9f8b` → `9a5d32e`, #76)은 판정 대상 4파일을 **하나도** 건드리지 않았다 — 다른 7파일에
> 주석 39줄을 들였을 뿐이라 판정 내용은 그대로이고, 레포 전체 집계 숫자만 그 tip 에서 재측정했다.

## 무엇을 판정했나

| 파일 | 원장 상태 | 주석 | 판정 |
|---|---|---:|---|
| `web/src/screens/Trace.tsx` | 행 없음 | 36 | **제거 9줄** · 문면 정정 2곳 · 27 유지 |
| `web/src/screens/Trace.test.tsx` | 행 없음 | 22 | 전량 유지 |
| `go/internal/store/store_test.go` | 행 없음 | 6 | **제거 4줄** · 2 유지 |
| `go/internal/store/store.go` | 행 있음(남음 12) · 판정 이후 **+17 자람** | 29 | 전량 유지 — 재판정으로 행 갱신 |

앞의 셋은 unrowed-files-pass가 착지 시점 ⑴로 남긴 **4파일 99줄** 중 셋이고,
`store.go`는 같은 패스가 ⑵(행보다 자란 12파일)로 남긴 것 중 하나다. 둘을 한 패스로 묶은 것은
넷이 **같은 표면**(Bronze/Silver 계보 서빙과 그 화면)이고, `store_test.go`의 제거 근거가
`store.go`의 doc 주석이라 **둘을 같이 보지 않으면 「설명의 주인」 판단이 서지 않기** 때문이다.

### `Fairness.tsx`를 뺀 이유 (⑴의 남은 하나)

⑴의 넷째 `web/src/screens/Fairness.tsx`(판정 당시 37줄)는 슬라이스를 그을 때 **열린 PR #76**
(`reconcile/rct_20260920-0003-docs-impl`, 자매 모델 `tbm_econ-opinion-monitor-docs-impl`)이 수정
중이었다(`+10/-0`, 그중 지문에 잡히는 주석 1줄 — `{/* CMP-note — 표기 원칙 …`). 겹치는 트리 위에서
판정하면 머지 순간 판정 근거가 낡는다 — scenario-spec-pass가 `tests/e2e/lib/`를 미루고,
unrowed-files-pass가 **바로 이 파일**을 #70 때문에 미룬 것과 같은 이유다.

**그 #76은 이 패스의 착지 직전에 머지됐고(`9a5d32e`), 이 파일은 예측대로 37 → 38줄이 됐다.**
제약이 풀렸으므로 **다음 패스가 바로 집을 수 있다.** 이 패스가 앞당겨 집지 않는 것은 판정을 이미
마쳤기 때문이다 — 승인받은 범위 밖이고, 재판정은 다음 패스의 몫이다.

**감지 단계의 인계 브리프는 이 상황을 보지 못했다** — 브리프가 열거한 열린 PR은 `#72·#73·#75`
셋이고 「직전 패스가 `Fairness.tsx`를 뺀 사유는 이제 거짓이다」라고 적었다. 계획 시점에 열린 PR을
전수 재조회하니 `#76`·`#77`이 더 있었고, 그중 `#76`이 그 파일을 들고 있다. **사유는 거짓이 되지
않았고, 막은 PR의 번호만 #70에서 #76으로 바뀌었다.**

## 제거 — 복원 경로별 근거

### ⑴ 계보 조인 축 재진술 4줄 — `web/src/screens/Trace.tsx`

```
- // 축은 `record_id` 하나다. Bronze `news_item` 이 그 키를 갖고, Silver `analysis`
- // 가 같은 값을 갖고(AC2.6), 본문은 item 의 `body_hash` 로 따로 걸린다(AC1.7).
- // 서빙이 세 계층을 한 응답으로 모아 주므로 화면은 조인을 다시 하지 않는다.
- //
```

**복원 경로 ②(저장소 문서).** doc-tracker 변동 이력의 슬라이스 9 착지 행
(`docs/econ-opinion-monitor-doc-tracker/2026-09.md`)이 같은 문장을 **축자로** 적는다:
「이제 `record_id` 를 축으로 Bronze `news_item` → `news_body`(`body_hash`) → Silver `analysis` 를
실제로 조인한다 — AC2.6 이 Silver 에 심어 둔 추적 키가 그제서야 쓰인다.」
키 자체(`record_id`·`body_hash`가 어느 데이터셋에 있는가)는 `contracts/` 스키마가 한 번 더 복원한다.

**복원 경로 ①(코드 자체).** 「화면은 조인을 다시 하지 않는다」는 이 파일이 스스로 보여 준다 —
`api.trace()` 한 번을 호출해 `TraceResponse` 하나를 받고, 그 아래 JSX 어디에도 조인이 없다.

`(AC2.6)`·`(AC1.7)`은 정책의 제거 유형 「작업 흔적」이지만, 여기서는 **태그가 아니라 문장 전체가
재진술**이라 줄째로 걷었다. 뒤따르는 매달린 `//` 1줄을 함께 걷은 것은
product-surface-pass가 `Sentiment.tsx` 머리 배너를 처리한 것과 같다.

바로 위 문단(`fairness` 에서 내려오는 갈래)과 바로 아래 문단(「모자란 것을 뭉치지 않는다」)은
**남겼다** — 아래 「유지」 절.

### ⑵ 열지 않는 단계(`STP-judge`) 서술 5줄 — `web/src/screens/Trace.tsx`

```
- //
- // 열지 않는 단계: 목업 여정의 `STP-judge`(판정과 종료)는 판정 결과의 영속화
- // (검증 이력·플래그)가 필요한데, 여정 문서 자신이 그것을 「현재 범위 밖, 백로그
- // 후보」로 파킹했다. 없는 저장소에 쓰는 버튼을 두는 대신 왜 없는지를 note 로 밝힌다
- // (슬라이스 5·6·8 의 선례).
```

**복원 경로 ①(코드 자체) — 같은 파일이 그 말을 화면에 그린다.** 이 주석에서 12줄 아래,
`{/* CMP-note — 열지 않은 단계의 사유 … */}`가 붙은 `note` 블록의 **렌더되는 문면**이
같은 내용을 독자에게 직접 말한다: 「**판정 기록**은 아직 열 수 없습니다. … 여정 문서가 그 영속화를
**현재 범위 밖**으로 파킹했습니다. 쓸 곳 없는 버튼을 두는 대신 없다고 적습니다.」
주석은 그 문면의 요약일 뿐이고, 제품 문면이 바뀌면 주석만 조용히 낡는다.

**복원 경로 ②(저장소 문서).** 파킹 사실 자체는 mockup 인덱스의 `STP-judge` 행과 여정 문서가 적는다 —
주석이 스스로 그 문서를 출처로 인용하고 있다.

남긴 `CMP-note` 앵커 1줄이 이 자리에서 「왜 비었는가」를 가리키는 포인터 역할을 계속한다.

### ⑶ `store.go` doc 주석의 재진술 3줄 — `go/internal/store/store_test.go`

```
- // Lineage needs Bronze and Silver, not Gold — and the body lives in its own
- // dataset, keyed by hash rather than by record, because one body can back
- // several observations (AC1.7).
```

**복원 경로 ①(코드 자체) — 같은 패키지의 `store.go`가 설명의 주인이다.** 두 절이 각각 그대로 있다:
패키지 주석의 「Most screens read Gold … Lineage is the exception: tracing a Gold number back to the
article it came from means reading Bronze and Silver directly」와, `NewsBodies` doc 주석의
「Bodies are content-addressed by hash and stored once, so they are a separate dataset from the
observations that reference them: several observations of an unchanged article share one body」.

정책의 제거 유형 「**다른 파일 주석의 재진술** — 같은 설명이 양쪽에 있는 경우 설명의 주인에만 둔다」에
정면으로 해당한다. 주인은 구현(`store.go`)이고, 테스트는 그 계약을 **단언**하는 쪽이다.
`store.go` 쪽은 이 패스가 **전량 유지 판정**했으므로 설명은 한 자리에 온전히 남는다.

### ⑷ 테스트 이름이 복원하는 1줄 — `go/internal/store/store_test.go`

```
- // Bronze and Silver are absent until the pipeline has run, exactly like Gold.
  func TestMissingBronzeAndSilverReadEmpty(t *testing.T) {
```

**복원 경로 ①(코드 자체 — 식별자 이름).** 바로 아래 줄의 테스트 이름이 같은 문장이다.
「exactly like Gold」는 `store.go`의 Gold 리더 doc 주석 둘이 각각 `(empty if absent)`로 적고,
`readJSONL` doc 주석이 「A missing file is not an error — it yields an empty slice」로 한 번 더 적는다.

## 문면 정정 (줄 수 불변)

### ⑸ 가드에서 메커니즘 제거 — `web/src/screens/Trace.tsx`

```
- {/* 클래스는 `.trace-` 접두사로 둔다 — 목업 인라인 CSS 와 선택자를
-     공유하면 규칙 5 가 선언 단위로 대조하게 되고, 이 화면의 폼은 목업의
-     폼 행과 구조가 달라 그 대조가 의미를 갖지 않는다. */}
+ {/* 이 화면의 클래스는 `.trace-` 접두사를 벗지 않는다 — 목업 인라인 CSS 와
+     이름을 공유하면 안 된다(설계 트래커 「규칙 5」). */}
```

정책이 못박은 가드 규약 그대로다 — **가드는 메커니즘을 담지 않고, 금지만 말하고 출처를 가리킨다**
(2026-09-18 pin-guard-pass). 「규칙 5가 선언 단위로 대조한다」는 게이트의 동작이고,
설계 트래커가 규칙 5 절에서 그 동작을 정의한다(경로 ②). 그 대조 방식이 바뀌면 이 주석이 조용히
거짓이 되는데, 아무도 이 주석을 검증하지 않는다. 금지(`.trace-` 를 벗지 않는다)만 편집 지점에
남기고 근거는 출처로 넘겼다.

설계 트래커는 같은 사실을 이미 적고 있다 — 「`Trace.tsx` 가 새로 쓰는 선택자는 전부 `.trace-`
접두사라 목업 인라인 `<style>` 과 교집합을 만들지 않는다」. **가드를 통째로 지우지 않은 것**은,
지우면 다음 편집자가 접두사를 벗겨도 게이트가 상한 0을 그대로 통과시켜(공통 선택자가 없으면
대조 자체가 일어나지 않는다) 아무 신호도 나지 않기 때문이다. 편집 지점에서만 효과가 있는 가드다.

### ⑹ `PAT-lineage` 앵커에서 구성 열거 제거 — `web/src/screens/Trace.tsx`

```
- {/* PAT-lineage — 원문 계보 추적. `CMP-crumb`(Bronze→Silver→Gold 경로
-     칩) + Bronze 원문 카드 + Silver 분석 카드 + 수집 메타 카드의 조합으로,
-     골드 수치에서 원문까지 역추적한다(V5, AC2.6/1.4). 목업 여정 페이지의
-     `STP-open-origin` 이 그리는 표면이다. */}
+ {/* PAT-lineage — 원문 계보 추적. */}
```

**앵커는 유지한다** — `PAT-*`/`CMP-*` 는 원장이 유지로 못박은 추적 앵커 규약이고
(`AppShell.tsx` 의 `PAT-screen-shell`, `tokens.css` 의 앵커 분할 판정), 이 파일의 다른 앵커
여섯은 이미 **1줄 형태**다(`{/* CMP-badge — … */}`, `/* CMP-kv */`). 그 형태로 맞췄다.

지운 본문은 설계 트래커가 **축자로** 복원한다(경로 ②): 「슬라이스 9 가 `Trace.tsx` 에 계보 표면을
실제로 세웠다 — … 화면이 `CMP-crumb` + Bronze 원문 카드 + Silver 분석 카드 + 수집 메타 카드를
그린다」. 더해 구성 열거는 **코드 바로 아래가 그대로 보여 주는 것**이고(경로 ①), 정책이 금지한
「개수·열거」형 서술이라 카드가 하나 늘거나 줄면 조용히 거짓이 된다.

## 유지 — 근거

- **`Trace.tsx` 머리 남은 15줄.** ⑴ 이 화면이 `fairness` 다음 갈래인 이유(「편중을 의심할 근거일
  뿐이고, 근거를 확인하려면 실제로 무엇이 쓰였는지 읽어야 한다」), ⑵ 설계 원칙 「모자란 것을
  뭉치지 않는다」와 세 결측의 구분. **⑵를 지우지 않은 것은 doc-tracker 가 세 결측의 구분과
  원칙 이름까지는 적지만 「셋을 한 덩어리 「데이터 없음」으로 그리면 독자는 자기 조회가 실패했다고
  읽는다」는 *왜* 를 적지 않기 때문이다** — 원칙만 복원되고 근거는 복원되지 않는다.
  product-surface-pass가 `Trend.tsx`·`Sentiment.tsx` 에서 「목업도 PRD도 **왜 그렇게 그리는가**는
  적지 않는다」로 유지한 것과 같은 자리다.
- **`Trace.tsx` 본문 앵커·근거 12줄.** `CMP-*`/`PAT-*` 앵커 여섯, 「링크가 죽었는데 사본이 남아
  있는 상태 — 이 화면이 존재하는 이유 그 자체다」, 「네 분류 중 하나로 그리지 않는다 — 제외된
  것이지 중립인 것이 아니다(AC2.5)」, 조회 축을 비웠을 때 서빙이 고르는 규약,
  `sentimentBadge` 의 JSDoc 1줄.
- **`Trace.test.tsx` 22줄 전량.** 정책이 이름을 댄 유지 대상 「테스트가 **왜 그 모양으로**
  단언하는지」 그 자체다 — 픽스처를 한 번만 쓰고 기대값을 두 번 적지 않는 이유(「a fixture edit
  cannot leave a stale literal asserting the old shape」), 「The case the whole trail exists for」,
  「"Set aside" is not "neutral"」, 「Three ways to come up short, three different answers. This is
  the one the stub endpoint could never tell apart.」, 「A fallback must not read as a hit」.
  product-surface-pass가 `Sentiment.test.tsx`·`Trend.test.tsx` 를 전량 유지한 것과 같은 처분이다.
- **`store.go` 29줄 전량.** 패키지 주석과 export 식별자 doc 주석으로, 정책의 유지 대상 둘에
  직접 해당한다. 본문도 시그니처 재진술이 아니라 **데이터 계약의 비자명한 성질**이다 —
  본문이 레코드가 아니라 해시로 걸리는 이유(한 본문이 여러 관측을 받친다 · 수정된 기사는
  덮어쓰지 않고 새 버전을 덧붙인다, AC1.7), Python `LocalFsStore` 와의 대응, 「없는 파일 =
  빈 슬라이스」 계약. 직전 행(initial-pass)의 유지 판정이 **자란 17줄에도 그대로 성립한다.**
- **`store_test.go` 남은 2줄.** 「A null sentiment is a value, not a decode failure」 —
  이 테스트가 *왜* null 디코드를 성공으로 단언하는지이고, 테스트 이름
  (`TestAnalysisDecodesNullSentiment`)은 무엇을 하는지만 말한다.

## 판단이 갈려 남긴 것

- **`Trace.test.tsx` 의 인라인 `(AC1.5)`·`(AC1.4)`·`AC2.5` 태그 3자리.** 「작업 흔적」 유형으로
  읽으면 제거 후보이고, doc-tracker 의 AC↔e2e 매핑이 AC↔spec 연결을 복원한다. 그러나
  aggregation-harness-pass가 `deploy/batch/workflow-template.yaml` 에서 **`# AC3.2` 인라인 태그를
  명시적으로 유지 판정**했고(원장 그 행: 「유지: `# AC3.2` 인라인 태그(판단 분기 — `# AC1.1`·
  `# AC2.1-2.6`과 같은 형태)」), 이쪽도 산문 안에 붙은 인라인 형태다. 머리 **배너**(initial-pass
  `Compare.tsx`, product-surface-pass `Sentiment.tsx`)와는 형태가 다르다. 「애매하면 남긴다」로 유지한다.
- **`store.go` 패키지 주석의 계보 문단 4줄**(「Most screens read Gold … Lineage is the exception」).
  doc-tracker 변동 이력이 「`store.Lake` 는 그때까지 Gold 두 데이터셋만 읽었고 같은 `readJSONL[T]`
  제네릭에 세 리더가 붙었다」로 같은 사실을 적으므로 경로 ②가 성립한다고 볼 여지가 있다.
  유지하는 이유는 ⑶에서 `store_test.go` 쪽 재진술을 지우며 **이 자리를 설명의 주인으로 지목**했기
  때문이다 — 주인을 정한 같은 패스가 주인을 비우면 설명이 어디에도 남지 않는다.
- **`Trace.test.tsx` 에 #79 가 들인 2줄** (`목업 JRN-spike-verification.html#s-link-expired 의 세 문장.
  「사본을 보여준다」만이 아니라 **왜** 보여주는지와 배지가 항상 있다는 안내까지가 그 배너의 문면이다.`).
  **판정을 마친 뒤 들어왔다.** 설계 트래커 「해소된 등재」의 그 행이 거의 축자로 복원한다 —
  「구현 문면에 없던 둘이 그제서야 들어왔다 — ⑴ **왜** 사본을 보여주는지 ⑵ **배지가 항상 있다**는 안내」 —
  그리고 단언 세 줄이 그 세 문장을 코드로 들고 있다(경로 ①). 경로 ②·①이 성립하므로 제거 후보다.
  그럼에도 유지하는 것은 아래 #77 건과 **같은 이유**다: 이 패스의 범위는 그 주석이 생기기 전에 그어졌고,
  「애매하면 남긴다」가 이 유형(테스트가 왜 그 모양으로 단언하는지)의 기본값이다. 다음 패스 후보로 넘긴다.
- **`Trace.tsx` 본문 앵커 여럿의 사유 절**(`CMP-note — 링크가 죽어도 추적이 여기서 끊기지 않는
  이유(AC1.4)`, `CMP-kv — 수집 메타. 언제·어느 주기에 걷힌 관측인지(AC1.5)` 등).
  **PR #77(`tbm_econ-opinion-monitor-mockup-render` 의 `rct_20260920-0004`)이 이 패스가 판정을
  마친 뒤 머지됐다**(`8bad0be`). 그 PR 은 설계 트래커에 `trace` 화면 전수 판정을
  등재하며 이 사유들을 행 단위로 적는다 — 「구현 전용 — 수집 메타 카드」(`본문 해시`·`본문 최초
  관측`이 AC1.7 근거를, `수집 주기`·`수집 시 순위`가 AC1.5 를 받는다), 「구현 전용 — 계보 결측
  문면 3종」(「셋을 한 덩어리 「데이터 없음」으로 그리면 독자는 자기 조회가 실패했다고 읽는다」를
  **축자로** 적는다), 「`STP-judge` 판정 표면 전면 부재」, 「구현 전용 — 조회 폼」, 「링크 만료 배너
  카피」. **⇒ 경로 ②가 실제로 열렸다.**

  그럼에도 이 패스는 지우지 않는다. 판정은 `83e1281` 트리에서 그 문서 없이 끝났고, 지금 지우면
  **판정하지 않은 근거로 집행하는 것**이 된다. 대신 다음 패스에 **이름으로 넘긴다** — 아래
  「판정하지 않은 것」의 재판정 후보다. 머리 남은 15줄 중 「셋을 한 덩어리로 그리면 …」 2줄은
  이제 설계 트래커가 축자로 복원하므로, 다음 패스의 가장 확실한 제거 후보다.

## 이 패스가 판정하지 않은 것 (다음 패스의 입력)

원장 「읽는 법」의 계수 규약대로 두 몫을 합쳐 **잔여 383줄**이다(착지 기준 `9a5d32e`).

| 몫 | 내용 | 파일 | 줄 |
|---|---|---:|---:|
| ⑴ | 행이 없는 파일 — `web/src/screens/Fairness.tsx` 38 · `web/src/screens/Compare.test.tsx` 6 | 2 | 44 |
| ⑵ | 행이 있으나 판정 이후 자란 파일의 증가분 | 22 | 339 |

⑵의 상위 다섯이 `tests/e2e/run.sh`(+84) · `web/src/api/types.ts`(+43) · `web/src/screens/Trend.tsx`(+25) ·
`scripts/check-journey-mockup.py`(+23) · `web/src/tokens/tokens.css`(+22)로 **197줄 = 58%** 다.
파일 단위로 자르면 다음 패스의 선이 선다. `tokens.css` 를 막던 #76은 착지했으므로 제약이 없고,
착지 시점에 열린 PR 은 #75 하나로 ⑴·⑵ 어느 파일도 건드리지 않는다(#75가 착지하면 신설
`scripts/check-data-format-change.py` 가 ⑴ 에 새로 들어온다).

⑵가 12파일 560줄에서 22파일 339줄로 바뀐 것은 이 패스 때문이 아니다 — 계획과 착지 사이에
serving-handlers-pass(`handlers.go` +228 · `handlers_test.go` +106) · trend-surface-pass ·
dashboard-surface-pass 셋이 착지해 큰 몫을 닫았고, 그 사이 제품 커밋들이 새 증가분을 들였다.
마지막 #76(`9a5d32e`)이 rowed 5파일에 +32(`Sentiment.tsx` +17 · `Sentiment.test.tsx` +10 ·
`tokens.css` +2 · `Fairness.test.tsx` +2 · `Compare.tsx` +1)를 얹어 18파일 307줄 → 22파일 339줄이 됐고,
같은 PR 이 `Compare.test.tsx` 를 0→6줄로 지문에 편입시켜 ⑴ 에 한 파일을 더했다.

더해 **이 패스가 방금 행을 준 `Trace.tsx` 27줄과 `Trace.test.tsx` 22줄의 재판정**이 다음 패스의
입력이다 — 판정 후 머지된 #77(`8bad0be`, 설계 트래커의 `trace` 전수 판정 등재)과 #79(`Trace.test.tsx`
주석 2줄 + 「해소된 등재」 행)가 **이 패스가 판정할 때는 없던 복원 경로 ②를 열었다**.
위 「판단이 갈려 남긴 것」이 어느 주석에 어느 행이 걸리는지 적어 두었다.
원장 「읽는 법」의 「행이 있는 파일도 미판정 주석을 가질 수 있다」와는 성격이 다르다 —
**줄이 자란 것이 아니라 복원 경로가 자랐다.** 위 잔여 383줄에는 들어가지 않는다(계수 규약은 줄
수만 센다).

**범위 밖(이 모델의 task 가 다룰 것이 아니다)**: Python docstring 표면. 지문이 원리적으로 보지
못하고(줄머리가 `#` 가 아니다), 모델 정의가 표면 추가를 `tbm_econ-opinion-monitor-comment-redundancy`
의 **정의 변경**(tobe-modeler 몫)으로 못박았다.

**판정하지 않은 것을 판정했다고 적지 않는다** — 위 12파일은 행이 없거나(1) 옛 판정 시점 행을
그대로 둔 채(11) 남는다.
