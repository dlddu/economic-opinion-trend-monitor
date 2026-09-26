# record-link-window-pass (2026-09-26)

판정 대상 창은 **#150 의 1커밋 `3122195..fdfb1cb`** 이고, 편집이 얹힌 기준 커밋은 `bcaa60d`(자매 #152·#154
착지 뒤 리베이스). 판정 범위는 **#150 이 들인 미판정 주석 124줄 전량**이며 그 밖의 파일은 건드리지 않았다.
지문 `lines=2792 files=166` → `lines=2734 files=166`(**부모 대비 −58 · 파일 수 불변**).
원장은 [`../ledger.md`](../ledger.md), 정책 본문은 [`../README.md`](../README.md).

## 이 창은 이미 판정된 쌍둥이를 갖는다

새 규칙을 세우지 않았다. 이 창의 열 파일은 시나리오 2 의 `…-calls*` 묶음과 **구조가 1:1** 이고,
그 묶음은 [llm-call-harness-pass](2026-09-25-llm-call-harness-pass.md)(PR #141)가 이미 전건 판정했다.
그래서 유형마다 처분이 원장에 서명돼 있고, 이 패스는 그것을 같은 유형에 적용한 것이다.

| 유형 | 선행 판정 | 이 창의 처분 |
|---|---|---|
| 묶음·주기 포인터(파일 머리 1줄) | `ingest-job-calls1.yaml` 이 **유일하게 남긴 줄** | 5매니페스트 전건 **유지** |
| 인자의 부재 가드(`--analyzer-version` 을 주지 않는다) | `analyze-job-calls2.yaml` **유지** — `args: []` 만 보고는 왜 비었는지 알 수 없다 | **유지**(존재 쪽인 `--source` 가드도 같은 근거) |
| 값 일치 가드(`--cycle` 은 달라야, 겹치는 건은 같아야) | `ingest-job-calls2.yaml` **유지** | **유지**(문장을 단독으로 서게 고침) |
| `ECON_RUN_ID` 배선 설명 | 세 행이 **제거**, 주인 `ingest-job-ops.yaml`, 대조군 `analyze-job-ops-stopped.yaml` | 사본 4벌 **제거** |
| 응답 캐시 키 설명 | 주인 1(`analyze-job-calls1.yaml`) + 포인터 1 + 제거 1 | 주인 1(`analyze-job-links1.yaml`) + 포인터 1 + 제거 1 |
| 코퍼스 열거·기대 결과 서사 | **제거** — PR 본문 표가 축자(③) | **제거** |

## 제거 58줄 — 근거

**⑴ 창 안의 바이트 동일 사본(9인스턴스 → 주인 하나).** `ECON_RUN_ID` 를 설명하는 3줄 블록이
`ingest-job-links{1,2}.yaml` 두 벌, 「세 분석 Job 이 같은 이름을 써야 응답 캐시 키가 맞는다」가
`analyze-job-links{1,2,-v2}.yaml` 세 벌이었다. 앞의 것은 이 디렉터리에 **이미 주인이 있다**
(`ingest-job-ops.yaml`) — 원장이 그 행에 「이 디렉터리에서 `ECON_RUN_ID` 배선 설명의 **주인**」이라고
적어 두었고 calls 묶음 세 행이 같은 근거로 걷혔다. 뒤의 것은 이 묶음 안에서 주인을 세우고
(`analyze-job-links1.yaml`) 한 벌은 주인 지목 포인터로, 한 벌은 제거로 처분했다.
**한 파일만 고치면 첫 위반이 되는 구조라 세 벌을 한 패스에서 함께 처리했다.**

**⑵ PR #150 본문이 절 단위로 소유한 서사.** 저작 PR 본문이 이례적으로 촘촘하다 — 「코퍼스가 시나리오의
전제를 통째로 담는다」 표가 여섯 갈래를 갈래별로 적고, 「단정 (5개)」 절이 spec 의 다섯 단정을 문장으로
적고, 「실패 갈래를 마지막 주기에 둔 이유」가 전용 절을 갖는다. 코퍼스 열거와 단정 서사는 그 경로 ③ 으로
닫았다. **다만 같은 절이 미래 편집자에게 「무엇이 조용히 깨지는가」를 말하는 자리는 남겼다** — 아래 참조.

**⑶ 주석이 스스로 지목한 주인.** 세 자리가 자기 출처를 괄호로 적고 있었고, 실측으로 그 원본이 명제를
전부 담는 것을 확인했다.

- `lib/recordlinks.ts` 머리 「…AC4.3 의 설계 판단이다(`econ_core.silver.records_of_run` docstring)」 →
  그 docstring 이 마지막 문장까지 소유한다(「A scan is what makes the two directions the *same* fact read
  from two ends.」). `runlog.ts` 행이 `econ_core/runlog.py` 모듈 docstring 을 두고 받은 처분과 같은 모양이다(①).
- spec 의 한 홉 설계 판단 4줄 「…(analysis.avsc 의 doc 이 그 근거를 적는다)」 → `contracts/silver/analysis.avsc`
  의 `call_id` doc 이 한 홉과 그 이유(캐시 항목에서 부분 함수가 된다)를 전부 담는다(②). 이 명제의 주인은
  **제품 쪽 가드**(`llm.py` 재사용 분기)라 테스트 사본을 걷는 쪽이 정책의 「설명의 주인에만 둔다」다.
- `run.sh` 「A dedicated root again, for the reason the fixtures README gives …」 → 실제 주인은
  `tests/e2e/fixtures/feeds/README.md` 의 「같은 이유로 각 묶음은 데이터 루트를 나눠 씁니다」와,
  원장이 「루트를 새로 판 이유」의 주인으로 적은 `ingest-job-ops.yaml` 이다. `ingest-job-calls1.yaml` 이
  같은 문장을 그 근거로 이미 걷었다(②).

**⑷ 선언 재진술.** `AnalysisLink` 의 필드 doc 3줄(`run_id` 의 「계약상 non-null」은 타입 선언
`run_id: string` ↔ `call_id: string | null` 대비가, 나머지 둘은 avsc doc 이 배타성까지 소유)과
`linkCalls`·`linkRuns`·`linkBodies` 의 JSDoc 3줄(이름과 반환 타입이 그대로 복원 — `gold.ts` 의
`goldDir`·`goldSkewDir` 선례), spec 의 지역 헬퍼 `callOf` JSDoc 1줄(바로 아래 두 `expect` 메시지가
같은 말을 한다 — export 아닌 지역 헬퍼는 JSDoc 유지 규칙 밖이고 `Reprocess.test.tsx` 의 `subOf`,
`Sentiment.test.tsx` 의 `splitShares` 가 선례다).

## 유지 66줄 — 「서사는 ③ 로 닫고, 편집 지점 가드는 남긴다」

직전 [record-run-call-link-pass](2026-09-26-record-run-call-link-pass.md)가 세운 규칙을 그대로 썼다.
유지한 줄은 전부 다음 넷 중 하나다.

- **공전 가드**(spec 6줄) — 「한 통이라도 비면 아래 단정들은 조용히 통과하고, 그 초록은 "연결이 성립한다"가
  아니라 "그 유형이 없었다"는 뜻이 된다」 · 「두 갈래가 둘 다 있어야 배타 단정이 양방향으로 하중을 받는다」 ·
  「재사용 갈래가 없으면 이 테스트 전체가 공허하다」 · 「실행이 하나뿐이면 아래 단정이 공허하다」.
  코퍼스가 줄면 **테스트는 초록인 채로 의미를 잃는다** — 정확히 「조용히 깨지는가」에 걸린다.
- **순서·값 가드**(run.sh 7줄, 매니페스트 4줄) — 실패 갈래를 마지막 주기에 둬야 재시도가 앞 실행의 행을
  덮어쓰지 않는다 · `reused=1`/`failed=1` 이 왜 부하를 받는가 · `coexisting` 은 **제품이 찍는 낱말**이라
  환언이 아니라 그 낱말에 가드를 맞춰야 한다 · `--analyzer-version` 을 주지 말 것 · `--cycle` 은 다르고
  겹치는 픽스처는 바이트 동일해야 할 것 · `--source` 를 빼면 앞 버전 행이 사라질 것.
- **계약과 함께 움직여야 한다는 가드**(spec 2줄) — 「새 사유가 생기면 이 목록과 계약 doc 이 함께 움직여야
  한다 — 자유 문자열이 되면 「왜 호출하지 않았는가」가 집계 불가능해진다」.
- **관측 설계**(`recordlinks.ts` 12줄, `runlog.ts` 2줄, calllog 포인터 1줄) — 네 데이터셋이 **한 벌**이 아니면
  질문 자체가 성립하지 않는다는 근거, `lib/silver.ts` 의 `Analysis` 를 넓히지 않은 이유, 루트를 가르는 이유.

## 판단이 갈려 남긴 것

- **`tests/e2e/lib/runlog.ts` 의 「루트를 가르는 이유」 2줄.** PR #150 과 `feeds/README.md` 양쪽에 같은
  명제가 있어 ③②로 닫을 수 있어 보인다. 남긴 것은 **같은 디렉터리의 세 행이 반대로 판정돼 있기 때문**이다 —
  `bronze.ts`(넷) · `gold.ts`(둘) · `silver.ts`(둘)가 모두 「반출 지점을 가르는 이유」를 유지로 닫았다.
  여기만 걷으면 그 판정에서 **첫 이탈**이 된다. 이 유형을 정리하려면 네 파일을 한 패스에서 함께 재판정해야
  한다(다음 패스의 후보로 남긴다).
- **spec 의 「재처리가 앞 버전의 호출을 물려받는 사고가 여기서 드러난다」 2줄.** 앞 절반은 PR 단정 2 가
  축자지만 뒤 절반은 **이 단정이 무엇을 잡는 그물인지**를 말하고, 그 사고는 초록인 채로 지나갈 수 있다.
- **`analyze-job-links-v2.yaml` 의 `--source` 가드 2줄.** PR #150 본문이 같은 말을 하고 `run.sh` 가 그 낱말을
  가드로 잡는다. 그럼에도 남긴 것은 `args` 를 고치는 사람이 읽는 자리가 여기뿐이고, calls 묶음이 **인자의
  부재** 가드를 같은 근거로 유지했기 때문이다(부재/존재는 같은 규칙의 두 값이다).

## 무영향 증명 (클러스터 없이)

- **비주석 diff 0줄.** 코드 10파일 74삭제 16추가가 전부 주석이고, 주석·`*/` 줄을 걷어낸 본문 md5 가 부모와
  **파일별로 바이트 동일**하다(17파일 대조, 불일치 0).
- **기계 판독 선언 동수** — `검증 시나리오:` 28 · `mock-exception:` 52 · `shellcheck disable` 2, 부모와 같다.
  `mock-exception:` 은 지문 DIRECTIVE 라 판정 대상이 아니고 한 줄도 건드리지 않았다.
- **게이트 4종 로컬 rc=0** — `tests/e2e/check_scenario_mapping.py` · `scripts/check-journey-mockup.py` ·
  `scripts/check-mockup-render.py` · `scripts/check-journey-flow.js`. `bash -n tests/e2e/run.sh` 와
  `tsc --noEmit --strict`(`lib/*.ts` + `specs/*.spec.ts`)도 rc=0.
- **잔여 계수기 음성 프로브 두 방향** — 이 패스가 새로 세운 `lib/recordlinks.ts` 행의 「남음」을 −5 하면
  ⑵ 가 5줄을, 그 행을 통째로 지우면 ⑴ 이 18줄을 잡는다. 둘 다 예측대로 발화했으므로 계수기는 살아 있다.
  ⚠️ 「남음」을 **올리는** 프로브는 아무것도 잡지 못한다 — ⑵ 의 부등호가 `live > 남음` 이기 때문이다.

## 범위 밖 — 다음 패스로

- **`python/packages/analysis/tests/test_cli.py` 의 2줄** — 이 패스가 #150 창을 판정하는 사이 **#154**
  (AC4.3 이전 Silver 행 재연결)가 착지하며 들였다. 저작 PR 이 다르므로 복원 경로를 그 본문에서 따로 재야 하고,
  **범위를 넓혀 잔여 0 을 맞추지 않았다** — 착지 직후 잔여는 **2**(전량 이 파일)이고 #150 창의 몫은 0 이다.
- **열린 자매 PR #151** 이 `tests/e2e/run.sh` 와 spec 3종을 건드려 착지하면 주석이 더 는다. 그 증분도
  이 패스의 창 밖이고, 재감지가 새 task 로 연다. 코드 파일은 겹치지 않는다(이 패스가 만진 열 파일 중
  #151 과 겹치는 것은 `run.sh` 하나이고 헝크가 다르다).
- **`bronze.ts`·`gold.ts`·`silver.ts`·`runlog.ts` 의 「루트를 가르는 이유」 네 벌** — 위 「판단이 갈려 남긴 것」.
- **지문 사각지대**(Python docstring 본문 · 줄 끝 주석 · 줄 중간 블록 주석)와 `# shellcheck disable=` 오탐 —
  해소는 모델 `versionScript` 개정이라 이 루프의 판정 표면 밖이다.
