# 2026-11-25 ac3-12-article-detail-increment-pass — AC3.12 기사 행 분위기 · 기사 상세 인라인이 들인 주석 증분 판정

판정 모집단은 원장에서 `—` 인 행 **전부**다. 이번 착지(#295 이전 브랜치 `reconcile/rct_20261105-0001-ac3-12-article-sentiment-detail`)가
든 파일은 `go/internal/handlers/contributions.go` · `go/internal/handlers/handlers.go` · `web/src/api/types.ts` · `web/src/screens/Fairness.tsx` 네 개다. 두 파일 모두 원장에서 이미 `완료` 로 닫힌 행이므로
증분만 판정한다.

## 결과 — 증분 19줄 중 제거 0 · 유지 19

## 유지 — 사유

- `web/src/api/types.ts` `ContributionRow` 3줄 — 기사 행의 분위기 필드가 AC3.12 요구인 이유와, 값이 없을 때가 「분석 결과가
  없다」가 아니라 「AC2.5 가 저신뢰 기록을 aside 로 둔 결과」라는 뜻인 이유. 필드 이름만으로는 「빈 값 = 분석 없음」과
  「빈 값 = 분석되었고 중립」을 구분할 수 없다.
- `web/src/api/types.ts` `TraceSilver` 3줄 — `subject_categories` 가 계약에서 선택 필드라 빈 목록으로 온다는 사실. 계약이
  선택으로 두고 코드만 필수로 만들면 두 값이 어긋난다.
- `web/src/screens/Fairness.tsx` 2줄 — 기사를 열면 원문 전체·원문 링크·분석 결과·판단 근거를 목록 자리에서 함께 본다는 것.
  「원문 역추적」 링크로만 두면 기사와 판단 근거가 한 화면에 함께 있지 않는다.
- `web/src/screens/Fairness.tsx` 2줄 — AC2.5 때문에 분석 결과가 없으면 네 분류 중 어느 것으로도 칠하지 않는다는 것. 미분석을
  「중립」으로 칠하면 AC2.5 를 화면이 번복한다.

- `go/internal/handlers/contributions.go` 5줄 — 기사 행의 분위기·분석 상태 필드가 AC3.12 요구라는 이유와 AC2.5 의 「미분석」이 null 인 이유 3줄 · 그 행이 `/api/trace` 가 보여 주는 것과 같은 분석 행이라 두 화면이 어긋나지 않는다는 이유 2줄.
- `go/internal/handlers/handlers.go` 4줄 — `subject_categories` 가 AC3.12 가 요구하는 분석 결과의 나머지 절반이고 계약에서 선택 필드라 빈 목록으로 온다는 이유 4줄.

## 범위 밖

원장에 `—` 인 행이 더는 없다. 코드·데이터 형식 변경은 없다(`contracts/`·`python/`·`go/gen/` 무변 · `go/internal/handlers/` 는
이 저장소의 「의도적 제외」 구간이다).
