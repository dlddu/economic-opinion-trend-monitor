# 2026-09-28 mirror-pointer-guard-repass — 「③④ 0」 자기선언 두 건 재판정

창 = `0c1daf8`→`a95c393` 단일 커밋(PR **#196**, 자매 모델 `tbm_econ-opinion-monitor-docs-impl` 의
`rct_20260928-0005` 집행 착지). 그 창이 원장에 행 둘을 **자기 판정 `①②③④`** 로 적으면서 양쪽에
`③④ 0` 을 선언했다. 이 패스는 **그 선언 하나**를 재실측한다 — 줄 수·지문·다른 행은 건드리지 않는다.

이 패스가 여는 것은 미판정 잔여가 아니다. 창 양 끝에서 `scripts/check-comment-ledger.py` 는 `rc=0`
「불변식 통과」이고 세 표면 미판정은 0행 0줄이다. 게이트가 세는 것은 「원장 선언 == 실측」(줄 수·지문)과
축 마커뿐이라 **판정 근거의 진위에는 구조적으로 맹목**이다. 그래서 초록과 이 결함은 모순하지 않는다.

## 실측 — ③④ 대조

`③` 의 원본은 PR #196 제목·본문, `④` 의 원본은 스쿼시 커밋 `a95c393`(본문은 `Co-authored-by:`
트레일러 둘뿐이므로 ④ 는 **제목으로만** 히트할 수 있다).

| 주석 | ③ 원본 | ④ | 남는 지식 |
|---|---|---|---|
| `store.go` 「readObject is the Go counterpart of econ_core.storage.LakeStore.get_object.」 | 본문 「리더 둘은 **파이썬 리더의 1:1 포팅**이다 — `readObject` = `econ_core.storage.LakeStore.get_object`」 | 0 | 0 |
| `store.go` 「readObjects is the Go counterpart of econ_core.storage.LakeStore.read_objects.」 | 같은 문장 「`readObjects` = `read_objects`」 | 0 | 0 |
| `debug.go` 「debugResponse walks one Silver record back to the model call and the batch run that produced it (JRN-judgment-debug).」 | 본문 「`record_id` 축의 「레코드 → 실행 → 호출」 조회 계약」 · 「그 레코드의 **Silver** 행 전부」 | 제목 「/api/debug 를 **레코드↔실행↔호출** 조회 계약으로 — **JRN-judgment-debug** 조회 경로」 | 0 |

⇒ **세 줄 모두 「③④ 0」 선언이 거짓이다.** 같은 문장(본문 31~33행)이 `store.go` 행의 유지 근거로 든
쌍둥이 셋(`readPartitions`·`objectPartitionChars`·`partitionFile`)까지 이름으로 적는다.

## 처분이 갈린다 — 판별식은 「그 줄이 편집 지점 가드인가」

③ 히트가 곧 제거는 아니다. [README「판정 절차」 2](../README.md#판정-절차) 의
「경로 ③ 과 편집 지점 가드가 갈리는 자리」가 정본이다 — 같은 명제가 저작 PR 본문에 있어도, 그 줄이
「이 값이 무엇과 같아야 하는가 / 이 순서를 바꾸면 무엇이 조용히 깨지는가」를 말하면 남긴다. PR 본문은
편집 지점에서 읽히지 않으므로 비용이 비대칭이다.

**`store.go` 2줄 — 유지.** 미러 포인터는 「이 Go 함수가 어느 파이썬 함수와 같아야 하는가」를 말하는
가드다. 한쪽만 고치면 두 런타임이 조용히 갈리고, 그 짝짓기를 적는 자리는 **레포 전체에서 이 주석들뿐**이다
— `get_object`/`read_objects` 를 이름으로 부르는 자리를 전수로 훑으면 파이썬 구현·파이썬 테스트와
이 주석 셋뿐이고, 두 런타임을 대조하는 테스트도 `contracts/` 스키마도 없다. 게다가 같은 파일의 미러
포인터 넷(패키지 주석 `:4` · `objectPartitionChars` `:39` · `partitionFile` `:120` ·
`readPartitions` `:189`)이 **같은 근거로 `①②③④` 판정받고 유지된 쌍둥이**라
([2026-09-26-deploy-serving-axis-pass](2026-09-26-deploy-serving-axis-pass.md) ·
[residual-close-pass](2026-09-25-residual-close-pass.md)), 새 둘만 걷는 것이 그 판정의 첫 이탈이 된다.
⇒ 원장은 **결론을 유지하고 근거만** 바꾼다(`③④ 0` → `③ 히트 · ④ 0`, 유지 근거는 가드 단서).

**`debug.go` lede 1줄 — 제거.** 이 줄은 가드가 아니라 **서사**다 — 지켜야 할 등식도, 바꾸면 조용히
깨지는 순서도 말하지 않고 응답 타입이 무엇을 걷는지 요약할 뿐이다. 네 요소 중 조인 방향·Silver 층·
여정 id 셋이 ③ 과 ④ 에 있고, 남는 「주체가 타입 `debugResponse` 다」는 선언 자신이다(①).
`debugResponse` 는 미export 라 정책의 「export 식별자 1줄 doc」 유지 대상도 아니다. 이 레포의 확립된
잣대와도 맞는다 — **바이트가 거의 같은 앞선 문면**(「The screen walks one Silver record back to the
batch run and the model call that produced it (JRN-judgment-debug)」)을
[runlog-window-pass](2026-09-25-runlog-window-pass.md) 가 ② 로 이미 걷었고, 이번 창은 주어만
화면→타입으로 바꿔 되살렸다. 주어 교체가 ② 를 벗어나게 한 것은 맞지만 ③④ 로 그대로 들어온다.

## 원장 반영

- `go/internal/handlers/debug.go` — L 표면 주석이 **0줄**이 되어 행을 지웠다(정책 「주석이 0줄이 된
  파일은 행을 지운다」). 지워진 행의 이력: 2026-09-26 runlog-window-pass 첫 판정(판정 전 10 · 제거 8) →
  serving-core-axis-pass(판정 전 2 · 제거 1) → 2026-09-28 #196 이 lede 를 개작(1줄 `0aed24c0ecbc` →
  `57446437de91`) → 이 패스가 제거 1. D·E 표면에는 이 파일의 행이 없었다.
- `go/internal/store/store.go` — **줄 수 32 · 지문 `69bdbb3773f2` · 축 `①②③④` 모두 불변**이고
  결과 칸의 ③④ 절만 바뀐다. 코드 무접촉이므로 지문이 움직일 수 없다.

## 관측 — 다음 패스가 알아야 할 것

주석을 들이는 PR 이 최소 의무(자기 파일 행 등재 + 축 `—`)를 넘어 **판정까지 적는 것**은 정책이 허용한다
(「증분만 판정했으면 그 결과를 적는다」). 다만 이번 창은 그렇게 적은 두 행에서 **둘 다 ③④ 를 틀렸다** —
자기 PR 본문을 ③ 의 원본으로 대조하는 단계가 빠지기 쉽다. 게이트는 이 축에 맹목이므로, 기능 PR 이
`①②③④` 를 자기선언한 행은 다음 감지가 **선언 자체를 대조 대상으로** 보는 것이 맞다.
