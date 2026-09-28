# e2e 픽스처

kind e2e가 쓰는 정적 입력입니다. **상류 한 겹**만 여기서 대체하고, 수집·분석·집계·서빙은
제품 경로 그대로 돕니다.

| 디렉터리 | 무엇을 대신하는가 | 문서 |
|----------|-------------------|------|
| `feeds/` | 실 RSS/Atom 엔드포인트 (`FEED` 카테고리) | `feeds/README.md` |
| `llm/` | 실 chat-completions 엔드포인트 (`LLM` 카테고리) | `llm/server.py` 모듈 docstring |

두 치환은 `docs/econ-opinion-monitor-e2e-mocking-policy.md`의 허용목록에 등재돼 있습니다.

## 서빙 입력은 픽스처가 아니다

**서빙이 읽는 Gold는 집계 배치가 이 클러스터 안에서 쓴 것입니다.** 이 디렉터리에 있던
`gold/`(커밋된 `subject_trend`·`axis_sentiment` JSONL)는 2026-09-26에 제거됐습니다 —
`run.sh`가 그 파일로 만들던 `gold-fixtures` ConfigMap 대신, 서빙 Pod가 배치 클레임
(`k8s/batch/data-pvc.yaml`)을 읽고 `ECON_DATA_ROOT=/lake/aggregation`으로 집계 기준 루트를
가리킵니다(`k8s/e2e-patch.yaml`). 정책 문서의 `GOLD` 카테고리와 원장 R3가 그 전환으로 함께
닫혔습니다.

그래서 서빙 화면 spec(`interest-trends-5`·`interest-trends-6`·`fairness-2`·`interest-trends-4`)이 기대값을 상수로 갖지
않습니다 — 서빙 응답을 먼저 읽고 화면과 대조하며, 어느 대상 행을 볼지도 응답이 정합니다.
축·대상 구성이 필요한 전제(3축이 다 차 있다 · 축별 상위 비율이 서로 다르다 · 1위 대상이
기사 여러 건을 갖는다)는 **집계 corpus**가 만들고, 그 구성 이유는 `feeds/README.md`에
있습니다.

배치 산출 Gold의 계약은 여전히 `contracts/gold/*.avsc`입니다. 스키마를 바꾸면 생산자
(`python/packages/aggregation`)와 소비자(`go/gen`)가 함께 움직여야 하고, 그 드리프트는
`make gen-check`가 방어합니다.
