# 2026-09-28 service-dedup-increment-pass — #210 증분 36줄 판정

창 = `ea8a619`→`fbd2657` 단일 커밋(PR **#210**, 사람 PR — 반복 관측 이중 계상 제거 · 서술 대상 표기 변형 통합).
그 PR 은 기능 PR 규칙대로 주석이 늘어난 여덟 행(L 6 · D 2)의 줄 수·지문을 실측으로 갱신하고 판정 축을
`—` 로 되돌렸다. 이 패스는 원장 운영 규칙 「증분만 판정했으면 그 결과를 적는다」에 따라 **#210 이 들인
증분만** 네 경로로 판정한다 — 옛 판정 줄은 #210 이 한 줄도 고치지 않았고(아래 한 줄 예외) 그 판정의
근거도 움직이지 않았으므로 재판정은 같은 결론을 되풀이할 뿐이다.

판정 모집단은 순증(L +22 · D +12 = 34)이 아니라 **추가된 계수 36줄**(L 23 · D 13)이다 — 게이트
`measure`→`by_file` 의 창 양 끝 multiset 차로 뽑았고, 옛 문면 두 줄(`bodyShares` 가드 · `canonical_subject`
docstring 끝줄)을 고쳐 쓴 자리가 추가·삭제 쌍으로 잡힌다.

복원 경로 원본: ② PRD 집계 AC3.3 「계상 단위」 단락(#210 이 함께 들였다) · 테스트 문서 시나리오 3 ·
③ PR #210 제목·본문(리뷰·코멘트 0건) · ④ 스쿼시 `fbd2657`(본문은 `Co-authored-by:` 뿐 — 제목으로만 히트).

## 결과 — 36줄 중 제거 20 · 유지 16(개작 5 포함)

| 파일 · 표면 | 판정 전 → 후 | 처분 |
|---|---|---|
| `go/internal/handlers/contributions.go` · L | 38 → 34 | 제거 4 · 개작 4 |
| `go/internal/handlers/contributions_test.go` · L | 24 → 21 | 제거 3 · 개작 1 · 유지 1 |
| `…/econ_aggregation/aggregate.py` · L | 13 → 12 | 제거 1 |
| `…/aggregation/tests/test_aggregate.py` · L | 8 → 5 | 제거 3 |
| `…/econ_analysis/llm.py` · L | 11 → 9 | 제거 2 · 유지 3 |
| `…/analysis/tests/test_llm.py` · L | 9 → 8 | 제거 1 |
| `…/econ_aggregation/aggregate.py` · D | 22 → 16 | 제거 6 · 개작 1 · 유지 2 |
| `…/econ_analysis/llm.py` · D | 96 → 96 | 유지 4 |

`aggregate.py`(L)·`test_aggregate.py` 는 줄 수·지문이 **#210 이전 판정값으로 바이트 동일하게** 돌아왔다
(`55eba27682f2` · `07abbcd2d0e3`). 비주석 diff 는 0줄이다.

## 제거 — 복원 경로가 선다

- **③ 경위 서사** — `llm.py` 「Variants seen side by side in production Silver (2026-09-28)…」 2줄은 PR 본문
  배경 「서술 대상 정규화(AC2.2)도 갈라져 있었다: 세계은행 / 세계은행그룹, 국제통화기금(IMF) / …」 그대로다.
- **② 계상 단위 재진술** — `bucket_articles` docstring 본문 6줄(재수집 → 하루 ~24관측 → 오래 걸린 기사 가중
  → 버킷당 기사 한 번·마지막 관측 → 시간 버킷 불변)은 PRD AC3.3 「계상 단위」 단락의 축자 번역이다.
  `test_aggregate.py` 「Each hour holds one observation per article…」 도 같은 단락의
  「시간 버킷은 기사당 관측이 하나이므로 영향이 없고」 다. `aggregate.py` 「A subject is counted once per
  article even if the analysis repeats it.」 는 같은 단락 끝 문장이다.
- **① 바로 아래 코드·단언** — 테스트 머리 주석 다섯(`test_aggregate.py` 둘 · `test_llm.py` 하나 ·
  `contributions_test.go` 픽스처 서술 앞 문장과 「hb … not a shared body」)은 바로 아래 픽스처 리터럴,
  테스트 이름, `t.Fatalf` 메시지가 같은 명제를 말한다. `contributions.go` 조회 루프 머리의 앞절과
  `articleKey` 머리의 뒷절은 바로 아래 본문이 복원한다.
- **③ + 즉시 붉음** — `bodyShares` 머리 「counts the articles carrying each body, not the observations…」
  2줄은 PR 본문 「`body_shares` 가 관측이 아니라 **기사 수**를 센다」 축자이고, 어기면 같은 PR 의
  `TestContributionsListsAReobservedArticleOnceThroughItsLatestObservation` 의 `BodyShares != 1` 단정이
  즉시 붉다 — 편집 지점 가드로 남길 이유(무음 파손)가 없다.

## 유지 — 편집 지점 가드와 계약

- **미러 포인터 셋** — Go 조회 루프 머리(「Mirrors the pick econ_aggregation.aggregate.bucket_articles makes…」
  로 개작) · `articleKey mirrors econ_aggregation.aggregate.article_key.`(개작) · 파이썬 `bucket_articles`
  docstring 「The serving contributions list (Go ``contributions``) mirrors this pick.」(개작).
  PR 본문에 같은 명제(「기여 기사 목록이 같은 선택을 거친다 → `Total == Gold raw_count` 등식 유지」)가 있어
  ③ 히트지만, README 판정 절차 2 의 「이 값이 무엇과 같아야 하는가」 가드다. **어기면 조용히 깨진다**:
  Go 테스트는 파이썬 산출물을 **붙여 넣은** Gold 를 읽으므로 파이썬 쪽 선택을 바꿔도 초록이고, 두 런타임을
  대조하는 테스트도 `contracts/` 스키마도 없다. [mirror-pointer-guard-repass](2026-09-28-mirror-pointer-guard-repass.md)
  가 `store.go` 에서 같은 근거로 유지한 형이다. 개작은 포인터 절만 남기고 서술 절을 걷었다.
- **빈 body hash 가드** — #210 이 `bodyShares` 머리 셋째 줄로 옮기며 접두를 바꾼 줄을, 판정받은 옛 문면
  「bodyShares: an empty body hash is "no text kept", not a text they all share.」 로 되돌렸다.
- **픽스처 출처** — `contributions_test.go` 「The Gold is build_subject_trends_all_units' output for this lake,
  day unit, pasted in.」 은 같은 파일 머리의 판정받고 유지된 출처 가드와 같은 명제다(손으로 맞춘 Gold 는
  등식 단정을 공허하게 만든다).
- **단언의 모양** — `contributions_test.go` 「a13 named 환율 but a14 — the article as it last read — does not:
  only b counts.」 는 테스트가 **왜** `b14` 하나를 기대하는지를 말한다. 픽스처 JSON 넷을 맞대야 복원되고
  PR 본문·PRD 에 없다.
- **항등 별칭의 이유** — `llm.py` 「The lookup ignores spacing, so these name the spelling the unspaced form
  folds to.」 는 무의미해 보이는 `"중동 전쟁": "중동 전쟁"` 을 지우는 정리를 막는다. PR 본문은 별칭 추가만 적는다.
- **데이터 성질** — `_fold` 「Spacing is not identity in Korean press names…」 는 한국어 표기의 비자명한
  성질이고, `" ".join` 으로 되돌리는 정리를 막는 자리에 있다.
- **doc 주석** — `_ACRONYM_GLOSS` 의 `#:` doc(모듈 속성 `#:` doc 은 전건 유지 선례) · public 함수 docstring
  요약 `article_key`·`bucket_articles`·`canonical_subjects` · `canonical_subject` docstring 개정 3줄(옛
  「Unknown subjects are returned unchanged」 가 거짓이 되어 고쳐 쓴 반환 계약).

## 판단이 갈려 남긴 것

- `canonical_subject` docstring 의 괄호 예시 「국제통화기금(IMF) is 국제통화기금」 은 `_ACRONYM_GLOSS` `#:` doc
  의 예시와 겹친다. 반환 계약 문장의 일부라 애매하면 남긴다.
- `contributions_test.go` 「a13 named 환율 …」 은 ① 로 볼 여지가 있다(픽스처가 사실을 다 담는다). 다만 대조에
  리터럴 넷이 필요하고 「마지막 관측이 이긴다」는 이유는 리터럴에 없으므로 남겼다.
