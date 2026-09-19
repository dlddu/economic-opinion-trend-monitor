# e2e 피드 더블 픽스처

kind e2e가 **수집 배치 경로**(`econ-ingestion --source feed` → Bronze)를 결정적으로 밟기 위해
쓰는 피드입니다. 실 RSS/Atom 엔드포인트는 가용성과 내용이 매 순간 달라 단정이 불가능하므로
클러스터 안의 피드 더블(`tests/e2e/k8s/batch/feed-double.yaml`)이 이 파일들을 그대로 서빙하고,
`e2e-feeds.json`이 수집 CLI의 상류를 그쪽으로 돌립니다. 이 치환은
`docs/econ-opinion-monitor-e2e-mocking-policy.md`의 FEED 카테고리에 등재돼 있습니다.

수집 코드(파서·순위·절단·본문 주소화)는 실제 제품 경로 그대로이고, **바뀌는 것은 상류뿐**입니다.

| 파일 | 소스 | 축 | 제공 건수 | 이 픽스처가 관측 가능하게 하는 것 |
|------|------|-----|-----------|-----------------------------------|
| `kr_wire.rss.xml` | `e2e-kr-wire` | KR | 110 | `limit: 100` 절단 — 제공분이 상한보다 많을 때 상위 N만 남는가 |
| `us_markets.atom.xml` | `e2e-us-markets` | US | 60 | 같은 `limit: 100` 설정이지만 제공분이 적을 때 패딩 없이 60건만 남는가 |
| `global_desk.rss.xml` | `e2e-global-desk` | GLOBAL | 8 (본문 없는 3건 포함) | 본문 미확보 처리 — 링크는 남고 `body_available:false` · `body_hash` 빈 값 |
| `faults_ok.rss.xml` | `e2e-faults-ok` | KR | 4 | 부분 장애 격리 — 옆 소스가 죽어도 이 소스의 관측은 남는가 |
| `faults_flaky.rss.xml` | `e2e-faults-flaky` | US | 2 | 재시도 — 처음 두 번 503 뒤에도 끝내 수집되는가 |
| `faults_dup.rss.xml` | `e2e-faults-dup` | GLOBAL | 3 (`faults_ok` 링크 2건 재노출) | 링크 중복 제거 — 관측은 한 번, 집계는 `duplicates_skipped` |
| `cycle12_main.rss.xml` | `e2e-cycle-main` | KR | 3 (전재 쌍 포함) | 주기 1·2 의 상류 — 같은 본문이 재저장되지 않는가 |
| `cycle3_main.rss.xml` | `e2e-cycle-main` | KR | 3 (주요 기사 본문만 수정) | 주기 3 의 상류 — 새 버전이 붙고 기존 버전이 보존되는가 |
| `analysis_corpus.rss.xml` | `e2e-analysis-corpus` | KR | 9 | 분석 배치의 입력 — 단일·복수·글로벌 대상 기사, 한 대상을 세 가지 표기로 지칭하는 기사, 네 분위기의 대표 기사가 **한 축의 한 소스**로 들어온다(대상 국가가 출처 축과 별개임을 그 안에서 보인다) |

- `<views>`는 **엄격히 감소**하도록 만들었습니다. 순위 부여와 상위 N 선택이 동점 처리에 기대지
  않고 결정적이 됩니다.
- **기본 3소스(`kr_wire`·`us_markets`·`global_desk`)의 링크는 전부 유일합니다.** 중복 제거는
  그 주기가 아니라 고장 주입 주기(`faults_*`)에서 관측합니다 — 섞으면 상위 N 절단 단정과
  중복 단정이 서로의 건수를 흔듭니다. 같은 이유로 네 묶음은 데이터 루트를 나눠 씁니다
  (`/data` · `/data/faults` · `/data/cycles` · `/data/analysis`).
- **분석 묶음의 기사는 의미로 고릅니다.** `analysis_corpus.rss.xml` 의 기사 아홉 건은 LLM 더블이
  돌려줄 응답(`../llm/responses.json`)과 **짝이 맞게** 쓰였습니다 — 더블이 "미국·한국 둘 다"라고
  답하는 기사는 실제로 두 나라를 다루고, "혼합"이라 답하는 기사는 실제로 상반된 톤을 담습니다.
  더블이 무엇을 답하든 spec 은 통과하겠지만, 짝이 어긋나면 픽스처가 **무엇을 세우려 했는지**가
  읽히지 않습니다. 응답 표의 키가 **제목**이므로 제목을 바꾸면 그쪽도 함께 고쳐야 합니다(빠지면
  더블이 404 를 내고 `run.sh` 의 `failed=0` 가드가 잡습니다).
- **`server.py` 는 더블 그 자체입니다.** 기본 동작은 이 디렉터리를 그대로 서빙하는 것이라 기존
  피드 URL 의 응답은 이전과 바이트 동일하고, 그 위에 세 경로만 얹힙니다 — `/__fail__/…`(항상
  503) · `/__flaky__/<n>/…`(처음 n 번만 503) · `/__slow__/<초>/…`(지연). 이 경로들이
  `…-test-ingestion.md#시나리오 6` 의 사전 조건(오류 소스·타임아웃)을 만듭니다. `e2e-feeds-faults.json`
  의 `feed_url` 이 그 경로를 가리킵니다.
- **주기별 차이는 서버 상태가 아니라 다른 파일로 만듭니다.** 시나리오 7 은 주기 1·2 가
  `cycle12_main.rss.xml` 을, 주기 3 이 `cycle3_main.rss.xml` 을 받게 해서 "본문이 3주기째에
  수정된다"를 만듭니다 — 더블에 주기 개념을 넣으면 주기 순서가 서버 상태에 얽혀 재실행이
  결정적이지 않게 됩니다.
- 도메인은 `*.invalid`입니다(RFC 2606). 더블이 아니라 실 네트워크로 새어 나가면 해석 자체가
  실패해 조용히 통과하는 일이 없습니다.
- 본문은 ASCII/한글 평문만 씁니다. XML 이스케이프가 들어가면 spec이 대조하는 "저장된 원문"과
  픽스처 원문이 달라져 단정이 흐려집니다.
