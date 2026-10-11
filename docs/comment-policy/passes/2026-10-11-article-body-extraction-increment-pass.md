# 2026-10-11 article-body-extraction-increment-pass — 기사 페이지 본문 추출 증분 판정

창 = `2497886`→ 이 PR(`feat/ingestion-article-body-extraction`). 이 PR 이 소스별 `body_extraction` 과 기사 페이지 본문
추출(`econ_ingestion/article.py`)을 들이며 늘린 주석만 판정한다. 기존 행의 옛 판정 줄과 근거는 움직이지 않았다.

## 결과 — 작성분 중 제거 11 · 유지 20

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `python/packages/ingestion/src/econ_ingestion/article.py` · L | 6 → 3 (신설) | 제거 3 · 유지 3 |
| `python/packages/ingestion/src/econ_ingestion/article.py` · D | 10 → 7 (신설) | 제거 4(개작) · 유지 7 |
| `python/packages/ingestion/src/econ_ingestion/article.py` · E | 1 → 1 (신설) | 유지 1 |
| `python/packages/ingestion/tests/test_article.py` · L | 5 → 1 (신설) | 제거 4 · 유지 1 |
| `python/packages/ingestion/tests/test_article.py` · D | 1 → 1 (신설) | 유지 1 |
| `python/packages/ingestion/tests/test_article.py` · E | 5 → 4 (신설) | 제거 1 · 유지 4 |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` · L | 1 → 1 | 작성 3줄 제거 (증분 0) |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` · D | 20 → 22 | 작성 5줄 중 제거 3 · 유지 2 |
| `python/packages/ingestion/src/econ_ingestion/feeds.py` · E | 1 → 2 | 유지 1 |
| `python/packages/ingestion/src/econ_ingestion/sources.py` · L | 1 → 1 | 작성 2줄 제거 (증분 0) |

## 제거

- **이름 재진술** — `article.py` 의 `_SKIP_TAGS`·`_CONTAINER_TAGS`·`_BREAK_TAGS` 머리 주석 3줄.
- **PRD 재진술** — `article.py` 모듈 docstring 중 「피드가 제목·요약만 준다」 문단, `feeds.py` 의 `BODY_EXTRACTION_MODES`·
  `ARTICLE_MIN_FEED_CHARS` 머리 주석 3줄, `FeedConfig` docstring 의 `body_extraction` 설명 2줄 — 주인은
  `docs/econ-opinion-monitor-prd-ingestion.md` 「본문 확보 경로」 절이다. `_with_article_body` docstring 요약 1줄은 함수 이름 재진술.
- **이름으로 옮김** — `IngestStats` 의 기사 페이지 통계 주석 2줄. 필드 이름을 `article_kept_feed_body` 로 바꿔 코드가 말하게 했다.
- **장식** — `test_article.py` 의 `# --- extractor/collection/config ---` 구분선 3줄.
- **단언 재진술** — `test_article.py` 의 줄바꿈 단언 머리 1줄, `&nbsp; normalized` 줄 끝 1줄.

## 유지 목록 (필요 사유)

- `article.py` L — `MIN_ARTICLE_CHARS` 머리 1줄: 값을 낮추면 사진 설명·한 줄 캡션이 본문으로 채택된다는 것이 이 값의 근거다.
- `article.py` L — `_MAX_JOINED_LINK_SHARE` 머리 1줄: 본문과 같은 class 로 꾸민 관련기사 링크 목록이 본문에 섞이지 않게 하는 상한이라는 근거 — 지우면 이 값을 올려도 되는지 판단할 근거가 사라진다.
- `article.py` L — `handle_endtag` 의 짝 맞춤 1줄: 실제 기사 HTML 에는 닫히지 않은 태그·짝 없는 닫는 태그가 흔하고, 이 되감기를
  단순 pop 으로 바꾸면 스택이 어긋나 본문 텍스트가 엉뚱한 컨테이너 점수로 간다.
- `article.py` D — 모듈 요약 1줄과 공개 함수 요약 2줄: doc 주석 수준.
- `article.py` D — 모듈 본문 2줄(사이트별 셀렉터를 두지 않는 이유): 셀렉터를 더하러 온 사람이 사이트 개편 때 조용히 0건이 되는
  실패 모드를 다시 들이지 않게 한다.
- `article.py` D — 모듈 본문 2줄(같은 서명 블록을 잇는 이유): 2026-10-11 실사이트 점검에서 BBC 본문이 이미지 사이 블록 4개로 나뉘어 한 블록만 잡혔다 — 「최고 점수 블록 하나」로 단순화하면 분할형 사이트의 앞부분이 조용히 빠진다.
- `article.py` E — 넓은 `except Exception` 1줄: 파서 예외가 나도 그때까지 읽은 컨테이너로 점수를 매기려는 의도 — 좁히면 깨진 마크업
  한 건이 그 기사의 본문 확보를 통째로 날린다.
- `test_article.py` L — 요약 피드 픽스처 1줄: `SCF_URL` 의 피드 본문이 비어 있지 않은데도 교체되는 이유(제목 반복 = 요약)를 알려,
  임계값을 바꾸는 사람이 이 단언을 오해하지 않게 한다.
- `test_article.py` D — 모듈 요약: doc 주석 수준.
- `test_article.py` E — 4줄(본문 안 소제목 유지 · 본문 안 링크 텍스트 유지 · 목록 항목 유지 · 페이지는 재시도 없이 1회): 각 단언이 지키는
  추출기·수집기 동작을 가리킨다 — 링크 밀도 감점이나 `_BREAK_TAGS` 를 손볼 때 무엇이 깨지는지 이 줄이 알려 준다.
- `feeds.py` D — `_with_article_body` docstring 2줄: 재시도하지 않고 피드 본문으로 물러나는 설계 결정 — 바꾸면 사이트 하나의 장애가
  소스 실패(그 소스의 전 관측 누락)로 번진다.
- `feeds.py` E — `_with_article_body` 의 `except Exception` 1줄: 기존 `_fetch_with_retry` 와 같은 사유(transport 가 자기 예외를 던진다).
