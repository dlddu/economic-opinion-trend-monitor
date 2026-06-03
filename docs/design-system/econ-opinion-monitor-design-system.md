# 경제 여론 추세 모니터 — 디자인 시스템

> mockup이 따르는 토큰 · 컴포넌트 · 패턴의 단일 정의서.
> 식별자(TKN-/CMP-/PAT-)는 `docs/mockups/econ-opinion-monitor-mockup-index.md`가 화면별 사용처를 매핑할 때 그대로 참조한다.
> 토큰 값은 7개 mockup 페이지 각각의 `<style>` 안 `:root`에 동일하게 인라인된다(자립형). 이 문서가 개념적 단일 소스이며, 값 변경 시 각 페이지의 `:root`를 함께 갱신한다.
>
> 마지막 갱신: 2026-06-03

## 디자인 방향
**"에디토리얼 인텔리전스 터미널"** — 데이터 단말의 밀도와 신문 지면의 권위를 결합한다.
- 따뜻한 종이 캔버스(`--paper`) 위에 프러시안 블루(`--primary`) 구조 + 오커(`--accent`) 강조.
- 표제는 세리프(Spectral), 본문/UI는 산세리프(IBM Plex Sans KR), 수치는 모노(IBM Plex Mono)로 역할을 분리.
- 직각에 가까운 작은 라운딩(2~10px)과 종이 톤의 옅은 그림자로 "인쇄물 같은 단정함"을 유지.
- 분위기(sentiment) 색과 지역 축(axis) 색을 **의도적으로 분리**해 한 화면에서 충돌하지 않게 한다.

---

## 디자인 토큰 (TKN)

### TKN-surface — 표면(따뜻한 종이)
| 토큰 | 값 | 용도 |
|------|----|----|
| `--paper` | `#F4EFE6` | 앱 배경 캔버스 |
| `--paper-2` | `#FAF6EE` | 한 단계 밝은 배경(사이드바 등) |
| `--panel` | `#FFFFFF` | 카드·패널 표면 |
| `--panel-2` | `#FBF9F4` | 카드 내부 보조 영역, 표 헤더 |

### TKN-ink — 잉크(텍스트 스케일)
`--ink #221F1A` · `--ink-2 #5C564C` · `--ink-3 #8C8475` · `--ink-4 #B4AC9C`
본문→보조→흐림→비활성 순으로 약해진다.

### TKN-line — 선(경계 스케일)
`--line #E7E0D1` · `--line-2 #D9D0BD` · `--line-3 #CFC4AC`
카드 테두리·구분선·표 격자.

### TKN-brand — 브랜드/구조
| 토큰 | 값 | 용도 |
|------|----|----|
| `--primary` | `#173A5E` | 상단바·네비·주요 버튼·구조 강조 |
| `--primary-2` | `#0F2942` | primary hover/짙은 변형 |
| `--primary-soft` | `#E2E8EE` | primary 배경 틴트 |
| `--accent` | `#B27518` | 강조(액션·하이라이트·키커) |
| `--accent-2` | `#8F5C10` | accent hover |
| `--accent-soft` | `#F2E5CB` | accent 배경 틴트 |

### TKN-sentiment — 분위기 4분류 + 미분석
| 분류 | 토큰 | 값 | soft |
|------|------|----|----|
| 긍정 | `--pos` | `#2E7D5B` | `#DCEBE2` |
| 중립 | `--neu` | `#7B7E85` | `#E8E8EB` |
| 부정 | `--neg` | `#B23A2E` | `#F2DEDA` |
| 혼합 | `--mix` | `#C0871F` | `#F4E7C9` |
| 저신뢰·미분석 | `--na` | `#AEA697` | `#EAE4D9` |
미분석/저신뢰는 색뿐 아니라 **빗금(hatch) 패턴**으로 분리해 4분류 합계에 섞이지 않음을 시각적으로 보장한다(AC2.5).

### TKN-axis — 지역 축(분위기 색과 분리)
| 축 | 토큰 | 값 | soft |
|----|------|----|----|
| 한국 KR | `--ax-kr` | `#173A5E` | `#E2E8EE` |
| 미국 US | `--ax-us` | `#5E7488` | `#E5EAEF` |
| 전세계 GL | `--ax-gl` | `#8A7752` | `#EFE8DA` |
채도를 낮춘 블루↔뉴트럴 계열로, 긍/부정 신호로 오인되지 않게 한다.

### TKN-type — 타이포그래피
`--serif 'Spectral'` (표제·수치 강조) · `--sans 'IBM Plex Sans KR'` (UI·본문) · `--mono 'IBM Plex Mono'` (카운트·비율·ID).
Google Fonts `<link>`로 로드하며 각각 Georgia / system-ui / ui-monospace 폴백.

### TKN-radius — 라운딩
`--r-xs 2px` · `--r-sm 4px` · `--r-md 6px` · `--r-lg 10px`

### TKN-shadow — 그림자(종이 톤)
`--sh-1`(미세) · `--sh-2`(카드) · `--sh-pop`(팝오버/강조). 모두 따뜻한 잉크색 기반 저투명 그림자.

---

## 컴포넌트 (CMP)

| 식별자 | 이름 | 설명 |
|--------|------|------|
| `CMP-topbar` | 상단 바 | 좌측 브랜드 + 중앙 컨텍스트 메타(축/기간/단위 라벨) + 우측 정규화 토글 자리. 화면 전환 시 META 라벨 갱신. |
| `CMP-sidebar` | 좌측 네비게이션 | `CMP-nav-item`을 그룹으로 묶은 세로 네비 + 하단 푸터. |
| `CMP-nav-item` | 네비 항목 | `data-screen`로 화면 전환. active 상태 강조. |
| `CMP-card` | 카드 | `card-h`(헤더: 제목+서브) + `card-b`(본문). 모든 콘텐츠 블록의 기본 그릇. |
| `CMP-metric` | 지표 타일 | 큰 수치(mono) + 라벨 + 증감. 대시보드 상단 요약. |
| `CMP-badge` | 배지/태그 | 분위기 배지(`b-pos/neu/neg/mix/na`), 일반 태그, 대상국 플래그, 칩. |
| `CMP-axpill` | 축 필 | KR/US/GL 알약형 라벨(`ax-kr/us/gl`). 깃발 점 + 코드. |
| `CMP-sentbar` | 분위기 막대 | 긍/중/부/혼 4세그먼트 + 미분석 분리 세그먼트의 가로 비율 막대. |
| `CMP-ranklist` | 순위 목록 | `rankrow` 반복: 순위·대상명·스파크라인·점유 막대·분위기 미니바. |
| `CMP-spark` | 스파크라인 | 추세 미리보기용 소형 SVG 라인(`spark()` 헬퍼). |
| `CMP-table` | 데이터 표 | `tbl`. 비교/원천/계보/전후 데이터의 정렬 가능한 표. 수치 칼럼은 mono. |
| `CMP-seg` | 세그먼트 컨트롤 | 기간·단위·범위 등 상호배타 옵션 토글(`seg` 버튼 그룹, `on` 상태). |
| `CMP-norm-toggle` | 정규화 토글 | 정규화 비율 ↔ 원시 카운트 전환 스위치(AC3.8). raw/norm 플래그와 연동. |
| `CMP-delta` | 증감 표시 | 상승/하락/보합(`up/dn/delta`) 방향 + 값. mono. |
| `CMP-note` | 주의/정보 노트 | `note`/`info` 박스. 축 기준(수집원 vs 대상국) 같은 해석 주의 강조. |
| `CMP-legend` | 범례 | 차트 색-의미 대응 표시. |
| `CMP-kv` | 키-값 행 | 메타데이터·스냅샷의 라벨↔값 한 줄 표시. |
| `CMP-crumb` | 계보 브레드크럼 | Bronze→Silver→Gold 단계 경로 칩 스트립. |
| `CMP-mapstrip` | 매핑 스트립 | 각 화면 하단 고정. 이 화면이 시각화하는 여정/가치/AC를 명시(추적성). |

---

## 패턴 (PAT)

| 식별자 | 이름 | 구성 | 시각화 의도 |
|--------|------|------|-------------|
| `PAT-screen-shell` | 화면 셸 | `CMP-topbar` + `CMP-sidebar` + main + `CMP-mapstrip` | 모든 화면 공통 레이아웃 골격. |
| `PAT-line-chart` | 다중 선 추세 차트 | 손수 그린 SVG 축·격자·다중 라인 + `CMP-legend` | 대상별 시계열 추세 비교(V1). |
| `PAT-stacked-sentiment` | 분위기 누적 추세 | 시간축 위 분위기 누적 막대(미분석 분리) | 분위기 비율의 시간 변화(V3+V1). |
| `PAT-donut` | 분위기 도넛 | 단일 대상의 분위기 비율 도넛 + 중앙 합계 | 한 대상의 현재 분위기 구성(V3). |
| `PAT-raw-vs-norm` | 원시 vs 정규화 비교 | 동일 대상의 원시 카운트 막대 ↔ 정규화 비율 막대 병치 | 편차 보정 효과 가시화(V4, AC3.1/3.8). |
| `PAT-axis-compare` | 3축 병렬 비교 | KR/US/GL 3열, 각 열 상위 대상 + 미니 분위기바 + 대상국 플래그 | 지역 축 비교 + 축 기준 인지(V2, AC1.3/2.1). |
| `PAT-lineage` | 원문 계보 추적 | `CMP-crumb` + Bronze 원문 카드 + Silver 분석 카드 + 수집 메타 카드 | 골드 수치에서 원문까지 역추적(V5, AC2.6/1.4). |
| `PAT-before-after` | 재처리 전후 비교 | 재분석 전/후 값 `CMP-table` 대조 | 재처리 영향 확인(V5, AC3.2/3.3). |
| `PAT-integrity-panel` | 수집 무결성 패널 | 성공/재시도/중복/누락 지표 + 이벤트 로그 | 수집 건강성 점검(AC1.6). |

---

## 사용 원칙
1. **새 색을 임의로 추가하지 않는다.** 색은 TKN-surface/ink/line/brand/sentiment/axis 안에서만 고른다(임의 스타일 mockup 방지).
2. **분위기 색과 축 색을 한 요소에 겹쳐 쓰지 않는다.** 분위기는 의미, 축은 분류다.
3. **미분석·저신뢰는 항상 분리 세그먼트 + 빗금**으로 표기한다(4분류 합에 섞지 않음).
4. **수치·비율·ID는 mono**, 표제는 serif, 그 외 UI는 sans.
5. **모든 화면은 `PAT-screen-shell`을 쓰고 하단에 `CMP-mapstrip`을 둔다**(추적성 보장).
6. 새 화면/컴포넌트 추가 시 이 문서의 식별자를 먼저 정의하고 mockup 인덱스에 매핑한다.
