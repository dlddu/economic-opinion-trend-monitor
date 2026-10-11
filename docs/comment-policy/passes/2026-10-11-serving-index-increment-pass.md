# 2026-10-11 serving-index-increment-pass — #247·#248 증분 129줄 판정

창 = `69c49f6`→`13e496e`. 주석을 움직인 커밋은 PR **#247**(`2497886`, serving OOM 해소 — 목록 API 가 레코드 전부를
쥐지 않게)과 **#248**(`13e496e`, 디버그 화면을 배치가 만드는 SQLite 서빙 인덱스로)이다. 두 PR 은 기능 PR 규칙대로
주석이 늘어난 26행(L 23 · E 3)의 줄 수·지문을 실측으로 갱신하고 판정 칸을 `—` 로 두었다. D 표면은 창 양 끝에서
바이트 동일하다. 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **두 PR 이 들인 증분만**
판정한다. 기존 행의 옛 판정 줄은 그대로다.

판정 모집단은 게이트 `measure` 를 창 양 끝에서 떠 파일별 주석 멀티셋 차로 뽑은 **추가 계수 129줄(L 124 · E 5)**이다.
행 합계 353줄 중 나머지 224줄은 옛 판정이 이미 유지한 줄이다.

복원 경로 원본: PR #247·#248 제목·본문 · 스쿼시 `2497886`·`13e496e` · 같은 PR 들이 들인 테스트
(`go/cmd/serving/main_test.go` · `go/internal/servingindex/build_test.go` · `go/internal/handlers/debug_records_test.go` ·
`web/src/screens/Debug.test.tsx` 인덱스 준비 중 단정) · `deploy/batch/workflow-template.yaml` 의 `onExit: index`.

## 결과 — 129줄 중 제거 42 · 유지 87(개작 6 포함)

| 파일 · 표면 | 판정 전 → 후 | 증분 처분 |
|---|---|---|
| `Dockerfile` · L | 4 → 2 | 제거 2 |
| `deploy/batch/workflow-template.yaml` · L | 34 → 32 | 유지 7(4줄 개작) · 제거 2 |
| `go/cmd/econ-index/main.go` · L | 2 → 2 | 유지 2(틀린 절을 걷어 개작) — **적용 이월** |
| `go/cmd/serving/main.go` · L | 8 → 7 | 유지 3 · 제거 1 |
| `go/internal/handlers/debug.go` · L | 7 → 3 | 유지 1(개작) · 제거 4 |
| `go/internal/handlers/debug_input.go` · L | 2 → 2 | 유지 2 |
| `go/internal/handlers/debug_records.go` · L | 5 → 0 | 제거 5 (행 삭제) |
| `go/internal/handlers/debug_test.go` · L | 1 → 0 | 제거 1 (행 삭제) |
| `go/internal/handlers/handlers.go` · L | 100 → 99 | 제거 1 |
| `go/internal/handlers/index.go` · L | 3 → 2 | 유지 2(개작) · 제거 1 |
| `go/internal/handlers/stages.go` · L | 6 → 6 | 유지 1 |
| `go/internal/servingindex/build.go` · L | 27 → (23) | 유지 23 · 제거 4 — **적용 이월** |
| `go/internal/servingindex/build_test.go` · L | 3 → (2) | 유지 2 · 제거 1 — **적용 이월** |
| `go/internal/servingindex/derive.sql` · L | 7 → (3) | 유지 3 · 제거 4 — **적용 이월** |
| `go/internal/servingindex/publish.go` · L | 12 → (6) | 유지 6(1줄 개작) · 제거 6 — **적용 이월** |
| `go/internal/servingindex/reader.go` · L | 19 → (18) | 유지 18 · 제거 1 — **적용 이월** |
| `go/internal/servingindex/schema.sql` · L | 8 → 8 | 유지 8 |
| `go/internal/store/store.go` · L | 37 → 37 | 유지 1 |
| `tests/e2e/k8s/batch/index-job.yaml` · L | 3 → 0 | 제거 3 (행 삭제) |
| `tests/e2e/run.sh` · L | 33 → 31 | 유지 1(개작) · 제거 2 |
| `tests/smoke.sh` · L | 1 → 0 | 제거 1 (행 삭제) |
| `web/src/api/client.ts` · L | 13 → 13 | 유지 3 |
| `web/src/screens/Debug.tsx` · L | 13 → 12 | 유지 1 · 제거 1 |
| `go/internal/handlers/debug_records_test.go` · E | 2 → 2 | 유지 2 |
| `go/internal/servingindex/build_test.go` · E | 2 → (0) | 제거 2 — **적용 이월**(적용되면 행 삭제) |
| `go/internal/servingindex/reader.go` · E | 1 → 1 | 유지 1 |

## 적용 이월 — MA6 사람 게이트

#248 은 리뷰 게이트 판정기(`scripts/check-data-format-change.py`)에 **MA6** 을 더했다 —
`go/internal/servingindex/**`·`go/cmd/econ-index/**` 는 레이크 볼륨에 쓰는 코드라 **주석만 바꿔도** 경로 단위로
`format_changed=true` 가 되고 `review/manual-approval` 이 사람 승인 뒤에만 초록이 된다. 이 패스는 그 두 경로의 증분
**72줄(L 70 · E 2)도 판정은 끝냈지만**(위 표의 「적용 이월」 7행 — 제거 18 · 개작 2) 소스에는 손대지 않았다. 원장 행은
줄 수·지문이 그대로이고 판정 칸은 `—` 로 남으며, 결과 칸에 이 판정을 적어 두었다. 이 판정대로 적용하는 다음 슬라이스는
사람 승인(MA6)을 받는 단독 PR 이고, 적용하면 그 7행이 `완료` 로 오른다(`build_test.go` E 행은 삭제).
같은 경로의 `schema.sql` L 8줄과 `reader.go` E 1줄은 전부 유지라 소스 변경이 없으므로 이 패스에서 `완료` 다.

이 PR 이 소스에 적용한 것은 나머지 **48줄(L 46 · E 2)**의 판정 — 제거 24 · 개작 4 — 이다.

diff 는 주석 줄만 지우거나 다시 접는다. 비주석 줄 변경은 하나뿐이고 토큰은 바뀌지 않는다 — `handlers.go` 의 `index`
필드는 위 주석이 빠지자 `gofmt` 가 정렬 공백을 다시 맞췄다.

## 제거

이 절과 다음 절은 129줄 전체의 판정이다 — `go/internal/servingindex/**`·`go/cmd/econ-index/**` 항목은 위 「적용 이월」대로 아직 소스에 적용하지 않았다.


- **틀린 주석** — `econ-index` 패키지 주석의 「The batch runs it after every stage that writes Bronze or Silver.」와
  `tests/e2e/k8s/batch/index-job.yaml` 머리의 「the step the batch runs after every stage that writes Silver or Gold」:
  두 문장이 서로 다른 단계를 말하고, 실제로는 둘 다 아니다 — 템플릿은 `onExit: index` 로 **워크플로당 한 번** 돈다.
  정본은 템플릿 머리 3줄이다. 패키지 주석은 앞 문장만 남겼다(개작).
- **다른 자리의 재진술** — `Dockerfile` 의 「econ-index 를 이 이미지에 싣는 이유」 2줄: 그 선택이 지켜야 할 것(서빙의
  Go 리더로 인덱스를 만든다)은 이미지를 고르는 `workflow-template.yaml` `index` 머리가 주인이다. Dockerfile 에서
  `econ-index` 빌드를 빼면 `index` 단계가 `/app/econ-index` 부재로 즉시 실패하므로 조용히 깨지지 않는다.
  `index-job.yaml` 머리의 나머지 두 절도 Dockerfile·템플릿의 재진술이다.
- **코드 재진술** — `debug_records.go` 3블록 5줄(질의·조건 조립·맵 이름; 「예전엔 Silver 한 번·Bronze 두 번」은 경위) ·
  `debug.go` 의 `debug` 첫 줄 · `indexedAnalyses`(`ORDER BY analyzed_at DESC, seq`) · `debugRunOf`(세 `countBy`) ·
  `handlers.go` `index` 필드 · `index.go` `indexHandler` 와 「503 index_not_ready」 절 · `debug_test.go` `indexLake` ·
  `build.go` `loadCalls`·`reuse`(로그 문구가 같은 말을 한다) · `publish.go` `publish` 첫 줄·`readPointer` ·
  `reader.go` `miss` · `publish.go` `sweep` 첫 문장 · `derive.sql` 머리·`record_latest`(창 함수 SQL)·`run_call`(`WHERE decoded = 1 GROUP BY`) ·
  `smoke.sh`·`run.sh` 의 인덱스 잡 위 1줄(바로 아래 명령·FAIL 문구) · `Debug.tsx` `INDEX_NOT_READY` 위 1줄(아래
  `IndexNotReady` 카피) · `build_test.go` 단정 위 1줄과 줄 끝 시계 주석 2(E).
- **테스트가 붉게 지키는 명제** — `softMemoryLimit` 의 「"max" 는 무제한」(`TestSoftMemoryLimitIsFourFifthsOfTheCgroupLimit`
  가 `max`·빈값·0 을 단정) · `publish` 의 「교체된 인덱스 mtime = 교체 시각」 2줄
  (`TestBuildKeepsAReplacedIndexForTheGracePeriodAfterItWasReplaced` — 설정 줄을 지우면 FAIL 실측) · `readOnlyURI` 의
  「상대 경로는 URI authority 로 가 SQLite 가 거부」(`TestReaderOpensAnIndexUnderARelativeRoot` — `filepath.Abs` 를 빼면 FAIL 실측).
- **템플릿 이름·명령의 재진술** — `workflow-template.yaml` `index` 머리 첫 문장(「인덱스를 만들어 바꿔 끼운다」).
  나머지 세 문장은 유지하고 4줄로 다시 접었다.

## 유지 — 사유

- `workflow-template.yaml` 머리 3줄 — `onExit` 로 둔 이유는 「반쯤 실패한 실행이 운영자가 가장 봐야 할 것」이다.
  마지막 DAG 단계로 옮기면 성공한 실행만 인덱스에 들어가고 아무것도 붉지 않는다.
- `workflow-template.yaml` `index` 머리 4줄 — 서빙 이미지의 Go 리더가 화면 행 순서를 정한다(이미지 태그가 어긋나면
  순서가 조용히 갈린다) · `/data/serving` 밖은 읽기 전용이라 `retryPolicy: Always` 가 안전하다 · mutex 가 예약 실행과
  재처리의 게시 순서 뒤집힘을 막는다.
- `serving/main.go` `applyMemoryLimit` 3줄 — Go 런타임은 cgroup 한도를 못 보고 힙을 살아 있는 양의 두 배까지 키운다.
  80% 의 근거이고, 테스트는 값만 단언한다(클러스터·런타임 제약).
- `debug.go` 1줄(개작) — 행은 인덱스에서, 호출·실행·본문은 레이크의 객체 하나씩 — 새 필드를 어디서 읽을지 정하는 자리.
- `debug_input.go` 2줄 — 보여 주는 것이 「분석이 읽은 것」(첫 Bronze 관측)이라는 전제. `ORDER BY seq LIMIT 1` 을 최신
  관측으로 바꾸면 화면이 조용히 다른 입력을 보인다.
- `index.go` 2줄(개작) — `fromIndex` 가 스캔 게이트 밖인 이유(질의는 몇 페이지; 게이트는 전량 스캔 OOM 때문에 있다).
- `stages.go` 1줄 — 옛 판정이 유지한 `stageClock` doc 첫 줄을 인덱스 요청까지 넓힌 정정.
- `servingindex` 패키지 — 패키지 주석 3 · export doc(`SchemaVersion`(질의가 알아챌 변경엔 올린다) · `Dir` · `Options` 와
  필드 넷 · `Stats` · `DefaultGrace` · `Build` · `ErrNotReady` · `Reader` · `NewReader` · `Snapshot` · `Acquire` ·
  `Release`(Acquire 마다 한 번)) — doc 주석 수준. 그 밖의 유지는 전부 **문서화되지 않은 외부 동작 · 공유 볼륨 제약 ·
  미러 · 동시성 가드**다:
  SQLite `lower()` 는 ASCII 만 접는다 · ATTACH 와 임시 목록은 한 연결에 산다 · 행마다 동기화하지 않게 한 트랜잭션 ·
  `listCalls` 와 `lookupKey` 가 `store.Lake` 의 파일·키 규칙의 미러 · 병렬 읽기(공유 볼륨 왕복) · 통째로 링크되는 기록이라
  한 번 못 푼 것은 영영 못 푼다 · 제자리 교체 금지(다른 노드 리더) · `writeWhole` 원자 교체 · `sweep` 은 자기 이름만 지운다
  (개작 1줄 — 공유 볼륨이고, `ours` 판정을 `true` 로 풀어도 테스트는 초록이다: `notes.txt` 는 가짜 시계 덕에 살아남는다) ·
  NFS 위 SQLite 잠금 불신 · `recheckEvery` 비용·지연 상한 · 공유 볼륨 읽기를 `mu` 밖에서 ·
  `looking` 소유 규약(E 1 포함) · 첫 요청은 진행 중인 조회를 기다린다(`TryLock` 으로 바꾸면 기동 직후 거짓 not-ready) ·
  `look` 호출 전제 · 연결별 페이지 캐시 · `analysis_run` 이 덮는 집계 규모 · `record_latest_*` 커버링 인덱스 ·
  `schema.sql` 의 `seq` 동률 규칙(스캔과 같아야 한다)·JSON 텍스트 필드·`llm_call_file` write-once·`canonical` 미러.
- `build_test.go` 2줄 — 조회가 열지 않는 파티션 픽스처의 의도 · 「grace 는 교체 시점부터」를 재는 `Chtimes` 설정의 의도
  (그 설정 줄을 빼도 테스트는 초록이다 — 그때 `publish` 회귀를 잡는 것은 가짜 시계와 실제 mtime 의 어긋남뿐이다).
- `store.go` `LlmCallHead` 첫 줄 — export doc.
- `run.sh` 1줄(개작) — 디버그 화면을 여는 spec 이 없어 이 검사가 유일하다. 지우면 커버리지가 조용히 빠진다.
- `client.ts` 3줄 — `ApiError` export doc 2 · 빈 `catch` 의 의도 1(비 JSON 실패는 상태 줄만 남긴다).
- `Debug.tsx` 1줄 — `listError !== INDEX_NOT_READY` 조건의 이유. `Debug.test.tsx` 는 `toContain` 만 봐 안내가 두 번
  나와도 초록이다.
- `debug_records_test.go` E 2 — 퍼센트 인코딩 질의의 원문(`고친`·`처음`).
