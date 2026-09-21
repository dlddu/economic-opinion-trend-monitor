# feed-adapter-pass — `test_feeds.py` 가 #71 로 들인 3줄 판정

**표적 재판정이다(전수 아님).** 기준 커밋 `00a1eed`(#110 착지 tip = main, 감지 시점과 같다 — 2파도 0, 열린 PR 0).
직전 패스([unit-cache-pass](2026-09-21-unit-cache-pass.md))가 말미에 「다음 패스의 선은 ⑵ 최대
`python/packages/ingestion/tests/test_feeds.py` +3 · `deploy/overlays/prod/kustomization.yaml` +3(동률 — python 단독 무인 패스면
`test_feeds.py` 가 선)」으로 이름 붙인 두 후보 중 **python 쪽 한 파일의 증가분만** 판정한다. `deploy/` 쪽은 #92 의 내용 교체분이라
`batch-pvc.yaml`(행 남음 9 · 실측 7)과 함께 봐야 하고 트래커 `∋` 인용·efs uid/gid 유지 판정이 섞이므로 다음 `deploy/` 표적 패스로 남긴다.
blame 으로 가르면 `test_feeds.py` 지문 히트 24 = #7(`9569ca3`, RSS/Atom 수집원 신설) 21 + **#71(`11b53fee`, 실패 소스 정리 — World Bank
JSON API 어댑터) 3** 이고, #71 은 옛 줄을 갈아 쓰지 않았다(행 「남음」 21 == blame 옛 줄 21). 이름은 들어온 내용(World Bank **피드 어댑터**의
파서·피드 경로 테스트)에서 땄다. 추적 task는 `rct_20260921-0017`(reconciler `tbm_econ-opinion-monitor-comment-redundancy`).

판정 결과 요약: **판정 표면 3줄 중 제거 3줄 / 유지 0줄** — 문면 정정 없음. 레포 전체 지문은 `2442 → 2439`(파일 `134 → 134`).
실행 코드는 한 바이트도 바뀌지 않았다 — 파일을 `ast.dump` 로 펼친 결과가 편집 전후 **동일**하고(주석은 AST 에 없다), 비주석 줄 필터
(`lstrip().startswith('#')` 제외) 258/258 줄이 같으며, `pytest`(92 passed · 이 파일 15 passed)·`ruff check`·`ruff format --check` 는 편집
전후 같은 결과다.

## 무엇이 들어왔나 — 귀속

| 파일 | 행(남음) | 기준 커밋 히트 | blame |
|---|---:|---:|---|
| `test_feeds.py` | 21(initial-pass) | 24 | `9569ca3`(#7 신설) 21 · **`11b53fee`(#71) 3** — 옛 21 그대로 |

행의 「남음」과 blame 의 옛 줄이 일치하므로 증가분 3 만 판정해도 행의 불변식이 선다(21 + 3 → 21 + 0).

| 자리(기준 커밋 줄) | 내용 | 지문 줄 | 판정 |
|---|---:|---:|---|
| A `test_feeds.py:239` | `test_worldbank_json_parses_documents_in_api_order` 제목 단언 위 「Non-record keys (facets) and records without a URL are skipped.」 | 1 | **제거 1** |
| B `test_feeds.py:245` | 같은 test 본문 단언 위 「Full content is preferred, descr is the fallback, neither -> body unavailable (AC1.4).」 | 1 | **제거 1** |
| C `test_feeds.py:257` | `test_worldbank_json_source_runs_through_the_feed_path` rank 단언 위 「No view counts -> API order is kept and the top-N cap applies (AC1.2).」 | 1 | **제거 1** |

합: 3 → 0(제거 3). 지문 `test_feeds.py` 24 → 21.

## 복원처 — 파서 docstring 과 바로 아래 단언이 주인, PR #71 본문이 사본

- **A** — `parse_worldbank_news` docstring `feeds.py:225-226` 「``documents`` maps document ids to records in the API's result order;
  non-record keys (``facets``) and records without a URL are skipped」이 **축자 주인**이고(①), 코드 `:238-242` 의 두 `continue`
  (`not isinstance(doc, dict)` · `not url`)가 같은 규칙을 적는다(①). 픽스처 `tests/fixtures/worldbank_news.json` 은 `documents` 안에
  레코드 4 + `facets` 1 을 갖고 그중 `ZG9jLTE5` 는 URL 이 없어, 바로 아래 제목 단언이 **3건**인 것은 픽스처와 docstring 만으로 읽힌다(①).
  PR #71 「무엇을」 절 「`facets` 등 비레코드·URL 없는 레코드 제외」(③)와 「검증」 절 「픽스처는 실제 응답 구조(`cdata!` 래퍼, `facets` 키)를
  따라 축소」(③)가 사본이다.
- **B** — 코드 `feeds.py:243` `body = _cdata(doc.get("content")) or _cdata(doc.get("descr"))` 가 「content 우선, descr 폴백」을, `:249`
  `body_available=bool(body)` 가 「둘 다 없으면 unavailable」을 한 줄씩 적고(①), 바로 아래 세 단언이 세 경우를 픽스처의 세 레코드로 그대로
  펼친다 — `articles[0].body.startswith("The World Bank Group …")`(content 있음) · `articles[1].body == "Only a description is available
  …"`(descr 만) · `articles[2].body_available is False`(둘 다 없음)(①). PR #71 「무엇을」 절 「본문은 `content` → `descr` 폴백, 둘 다 없으면
  `body_available=false`(AC1.4)」가 **인라인 AC 태그까지 축자**다(③). `(AC1.4)` 의 귀속은 PRD `docs/econ-opinion-monitor-prd-ingestion.md`
  AC1.4 「본문 추출이 불가능하거나 … 본문 확보 상태를 메타데이터에 표시하며(`body_available`)」(②)와 테스트 문서의 `검증 AC: AC1.4` 항(②),
  그리고 같은 파일 옛 줄 `:109` 「Body unavailable -> link still stored, empty hash, no body, flag cleared (AC1.4).」(initial-pass 유지분)이
  잇는다.
- **C** — `parse_worldbank_news` docstring `feeds.py:226-227` 「The API exposes no view count, so the result order (``srt``/``order`` in
  the URL) stands in for ranking」이 앞 절의 주인이고(①), `FeedConfig` docstring `:66-67` 「``limit`` is the per-source top-N cap (AC1.2)」가
  뒤 절을 **태그까지 포함해** 적는다(①). 코드 `:250` `view_count=0` · test 의 `FeedConfig(…, limit=2, …)` + 단언 `rank == [1, 2]` ·
  `len(bodies) == 2` 가 「API 순서 유지 + 캡」을 값으로 적는다(①). PR #71 「무엇을」 절 「조회수가 없어 API 순서(`srt=lnchdt&order=desc`)가
  순위」(③)가 사본이고, `(AC1.2)` 의 귀속은 PRD AC1.2 「각 소스에서 조회수 기준 상위 N건」(②)·테스트 문서 `검증 AC: AC1.2`(②)·같은 파일 옛 줄
  `:87` 「kr-wire offers 3 articles but the source caps at top-2 (AC1.2).」(initial-pass 유지분)이 잇는다.

## 제거 3줄 — 복원 경로별 근거

| 경로 | 줄 | 자리 |
|---|---:|---|
| ① 코드(`parse_worldbank_news` docstring `:223-228` · `FeedConfig` docstring `:64-70` · `:238-250` 의 `continue`·`or`·`bool(body)`·`view_count=0` · test 이름과 바로 아래 단언 · 픽스처 모양) | 3 | A · B · C — 전부 ① 만으로 복원되고 아래 ②③ 이 겹친다 |
| ② 저장소 문서(PRD AC1.2·AC1.4 · 테스트 문서 `검증 AC` 항) | (2) | B·C 의 AC 귀속 |
| ③ PR 본문(#71 「무엇을」·「검증」) | (3) | A 의 제외 규칙·픽스처 축소 · B 태그까지 축자 · C 의 순위 대체 |

경로 ④(커밋 메시지)는 squash 제목만이라 근거로 쓰지 않았다.

## 유지 0줄

증가분 3줄에 「테스트가 왜 그 모양으로 단언하는지」에 해당하는 지식은 없다 — A 가 설명하는 「왜 3건인가」는 픽스처와 docstring 이,
B 가 설명하는 「왜 세 레코드인가」는 픽스처의 세 모양과 세 단언이, C 가 설명하는 「왜 rank 가 [1, 2] 인가」는 `limit=2` 와 docstring 이 적는다.
World Bank 검색 API 의 문서화되지 않은 동작(인덱스 지연·간헐 503·`format=atom` 이 깨진 XML 을 주는 것)은 정책의 유지 유형이지만 이 세 줄은
그것을 담지 않았고, 그 지식의 자리는 PR #71 「알아둘 것」 절과 `FeedConfig` docstring 「the World Bank search API, which publishes no usable
RSS/Atom」이다.

## 판단이 갈린 자리

1. **B·C 의 인라인 AC 태그(`(AC1.4)`·`(AC1.2)`)를 판단 분기로 남기지 않은 것** — initial-pass 는 이 파일 옛 21줄을 「테스트 의도(AC1.x 태그
   판단 분기)」로 통째 유지했고, rollup-test-pass 가 `test_aggregate.py` 의 태그를 남긴 판별식은 「서술은 복원되나 **태그가 잇는 귀속이
   어디에도 없다**」였다. 여기서는 그 판별식의 값이 다르다 — C 의 `(AC1.2)` 는 `FeedConfig` docstring 이 태그까지 적고, B 의 `(AC1.4)` 는
   PR #71 본문이 태그까지 축자로 적으며, 두 귀속 모두 PRD·테스트 문서·같은 파일의 옛 줄(`:87`·`:109`)에 남아 있다. unit-cache-pass E·F 와
   같은 처분이다. 옛 21줄의 `(AC1.x)` 태그는 증가분 밖이라 이 패스가 재판정하지 않는다 — 정책 소유자가 인라인 태그의 처분을 정하면
   `test_llm.py` 옛 8줄·`test_aggregate.py` 3줄과 함께 본다.
2. **B 를 「docstring 이 부실하다 → 원본을 고친다」 경로로 보지 않은 것** — `parse_worldbank_news` docstring 은 폴백 순서를 적지 않는다.
   그러나 폴백은 코드 한 줄(`or`)과 `bool(body)` 가 그대로이고 바로 아래 세 단언이 세 경우를 값으로 펼치므로 docstring 없이도 복원되며,
   PR #71 본문이 같은 문장을 태그까지 보존한다. docstring 에 한 문장을 더하는 것은 지문 밖 표면으로 옮기는 것이지 복원 경로를 새로 여는 것이
   아니라서 원본 수정 없이 제거했다.
3. **옵션 B(`deploy/` 표적 패스)를 고르지 않은 것** — 원장 말미가 「동률」로 적은 두 후보 중 `kustomization.yaml` +3 은 #92 의 내용 교체분이라
   `batch-pvc.yaml` 9→7 재판정과 묶어야 하고, 그 안에 트래커가 `∋` 좌표로 인용하는 두 문장(지우면 트래커가 끊긴다)과 efs access point
   uid/gid 고정(유지 대상)이 있어 유지·제거가 섞이는 판정이다. python 단독 무인 슬라이스가 더 깨끗하고 원장이 그 경우의 선을 이미 정해
   두었으므로 이번엔 python 을 골랐다. `deploy/` 쪽은 다음 패스의 단독 최대(⑵ +3)가 된다.

## 검증

```
$ git diff --stat 00a1eed -- python
 python/packages/ingestion/tests/test_feeds.py | 3 ---
 1 file changed, 3 deletions(-)                         # 삭제 3줄 전부 주석, 추가 0
$ python3 -c 'ast.dump(parse(git show 00a1eed:<f>)) == ast.dump(parse(<f>))'   # SAME, 비주석 줄 258/258
$ diff <(git show 00a1eed:<f> | grep -vE '^\s*#') <(grep -vE '^\s*#' <f>)   # 빈 출력
$ (cd python && ruff check . && ruff format --check .)   # All checks passed · 33 files already formatted
$ (cd python && pytest -p no:cacheprovider)              # 92 passed (편집 전 92 passed; 이 파일 15 passed 동일)
$ python3 tests/e2e/check_scenario_mapping.py            # rc=0, 출력 md5 9ad08df7 편집 전후 동일
$ python3 scripts/check-mockup-render.py · check-journey-mockup.py   # 통과 · PASS (지문 밖, 편집 전후 동일)
$ <지문 스크립트>                                        # lines=2439 files=134 (편집 전 2442/134)
$ python3 scripts/check-data-format-change.py 00a1eed HEAD   # format_changed=false
```

파일 단독 계수 `test_feeds.py` 24 → 21. 지문 밖 게이트는 python 주석을 읽지 않아 편집 전후 같은 통과이고, PR 의 `ci/build`(ruff + pytest)가
이 편집의 CI 집행자다. 원장 재계수: 파일별 원장 138행 ↔ 지문 파일별 계수를 대조해 기준 트리 ⑴ 1파일 10 · ⑵ 5파일 11 == 옛 말미 21, 행 갱신 후
⑴ 1파일 10 · ⑵ 4파일 8 == 새 말미 18.

## 원장 반영

- 패스 이력 행 `| 2026-09-21 | feed-adapter-pass | 00a1eed | 2442 | 3 | 2439 | 134 → 134 |`.
- 「패스 이력」 아래 「feed-adapter-pass도 표적 패스다」 문단.
- 파일 행 `test_feeds.py` 24 / 3 / 21(기준 패스 갱신, 행 신설 없음 — 138 그대로).
- 말미 집계 `**feed-adapter-pass 기준 · 레포 전체** | 2442 | 3 | 2439`, 잔여 21 → **18**(⑴ 10 사람 몫 + ⑵ 4파일 8).

## 범위 밖 (다음 패스로)

- ⑵ 4파일 8줄: `deploy/overlays/prod/kustomization.yaml` +3(#92 내용 교체 — `batch-pvc.yaml` 행 남음 9 · 실측 7 과 함께 `deploy/` 표적 패스
  몫; 트래커 `∋` 인용 두 문장·efs uid/gid 는 유지 대상) — **다음 선은 이것 단독**(⑵ 최대) → `web/src/screens/Fairness.test.tsx` 2 ·
  `web/src/screens/Reprocess.test.tsx` 2(#102) · `web/src/screens/Compare.tsx` 1(web 묶음).
- ⑴ `scripts/check-data-format-change.py` 10줄 — 사람 몫(sentiment-split-pass 「판단이 갈린 자리」 3).
- `test_feeds.py` 옛 21줄의 `(AC1.x)` 태그 · `test_llm.py` 옛 8줄의 `(AC2.2)`·`(AC2.5)` 태그 · `test_aggregate.py` 인라인 AC 태그 3줄 — 정책
  소유자가 인라인 태그의 처분을 정할 때 함께.
- `ac3-8` 머리 단언 목록 표식 · `Dashboard.tsx` `BRIEF_KEY` 앞 3줄 + `Trend.tsx:81-82` 포인터 · 재판정 후보 5 · 원본 누락 좌표 — 직전 패스
  말미 그대로.
