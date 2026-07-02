# e2e Gold 픽스처

kind e2e가 서빙 경로(픽스처 Gold → Go API → 웹 렌더링) 검증에 쓰는 정적
데이터셋입니다. 배치 파이프라인 없이 결정적으로 검증하기 위해 커밋해 둡니다.

- 레코드는 `contracts/gold/*.avsc` 스키마를 그대로 따릅니다. 스키마를 바꾸면
  이 JSONL과 `tests/e2e/specs/`의 단언(픽스처 subject 문자열 등)을 함께
  갱신하세요. (코드 쪽 계약 드리프트는 `make gen-check`가 방어합니다.)
- subject는 smoke 테스트(`tests/smoke.sh`)의 값과 겹치지 않는 e2e 전용
  문자열(`E2E 검증 서브젝트`)을 사용해 단언 모호성을 없앱니다.
