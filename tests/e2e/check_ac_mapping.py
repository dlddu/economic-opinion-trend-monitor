#!/usr/bin/env python3
"""AC ↔ e2e spec 1:1 매칭 검사기 (reconciler 모델 tbm_econ-opinion-monitor-ac-e2e).

세 곳의 실측을 대조한다.

  * **AC 전집**  — ``docs/econ-opinion-monitor-prd-*.md`` 의 ``### ACn.m:`` 헤딩
  * **spec 선언** — ``tests/e2e/specs/`` 최상위 ``*.spec.ts`` 헤더의 ``// 검증 AC:`` 한 줄
  * **등재·집계** — ``docs/econ-opinion-monitor-doc-tracker.md`` 의 ``## e2e 매핑`` 절

강제하는 것(위반 시 exit 1):

  규칙2  모든 spec 파일은 정확히 하나의 AC(또는 "없음 = 스모크/인프라")를 선언한다.
  규칙1' 한 AC를 두 개 이상의 파일이 선언하지 않는다(중복은 지금 고칠 수 있는 위반).
  규칙3  AC를 선언하지 않는 파일은 doc-tracker 의 비-AC 등재 표에 있어야 한다.
  규칙4' "예외 후보 중 미등재" 표에 오른 AC(= 예외로 빼지 않기로 판정한 AC)는
         "예외 목록"에 동시에 나타날 수 없다. 판정의 조용한 회귀를 막는다.
  규칙5  선언·등재가 가리키는 AC 코드가 실재해야 한다. 예외 등재된 AC 는 동시에
         spec 파일을 가질 수 없다.
  규칙6  doc-tracker 의 집계·매핑·공백 목록이 위 실측과 정확히 일치해야 한다.
  규칙6' 로드맵 "AC↔e2e 1:1 매핑표" 가 "— 예외 등재" 로 표시한 AC 집합이 SSOT 절의
         예외 목록과 정확히 같아야 하고, 21개 AC 가 각각 정확히 한 행이어야 한다.
         두 표가 조용히 갈라져 한쪽만 낡는 것을 막는다.
  규칙7  "구현 대기" 등재의 무결성 — 등재 AC 는 실재하고, 예외 목록과 동시에 오르지 않으며,
         spec 파일을 갖지 않고, 근거·담당·해제 조건이 비어 있지 않다. 그리고 **해제 신호**
         (`파일` ∋ `문자열`)가 아직 살아 있어야 한다. 구현이 착지해 신호가 사라지면 이 게이트가
         빨개져 등재를 재판정하게 만든다 — 이 모델의 버전 추적(as-is=tests/e2e, to-be=문서)은
         구현 착지를 감지하지 못하므로, 그 사각을 등재 자신이 막는다.

강제하지 **않는** 것: 규칙1 의 "공백 0". 공백은 존재하는 것이 정상이고, 이 검사기는
공백을 **세어서 문서가 사실대로 적고 있는지**만 본다. 즉 게이트는 "격차가 없다"가
아니라 "문서가 격차를 정직하게 말한다"를 지킨다. 다만 격차의 **성격**은 구분한다 —
구현이 없어 관측 대상 자체가 없는 AC 는 "구현 대기"(규칙7, 담당은 구현 모델), 구현은
있는데 하네스가 닿지 않는 AC 는 "공백"(이 모델이 하네스로 닫는다).

표준 라이브러리만 쓴다(레포가 이미 ``python3 contracts/codegen.py`` 를 bare
python3 로 부른다). 사용법: ``python3 tests/e2e/check_ac_mapping.py``
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
SPEC_DIR = ROOT / "tests" / "e2e" / "specs"
TRACKER = DOCS / "econ-opinion-monitor-doc-tracker.md"
PRD_GLOB = "econ-opinion-monitor-prd-*.md"

AC_HEADING = re.compile(r"^### (AC\d+\.\d+):")
AC_CODE = re.compile(r"AC\d+\.\d+")
DECLARATION = re.compile(r"^//\s*검증 AC:\s*(.+?)\s*$")
NO_AC = "없음"

SMOKE_SECTION = "비-AC(스모크·인프라) 등재"
MAPPING_SECTION = "AC ↔ spec 파일 (실측)"
EXCEPTION_SECTION = "예외 목록"
COUNTS_SECTION = "집계 (실측)"
GAP_SECTION = "공백 (1:1 대상 중 파일 없음)"
NOT_EXCEPT_SECTION = "예외 후보 중 미등재 (공백으로 계수)"
PENDING_SECTION = "구현 대기 (미구현이라 관측 대상 없음)"
ROADMAP_SECTION = "AC↔e2e 1:1 매핑표"

#: 구현 대기 표의 해제 신호 셀에서 백틱 토큰 두 개(파일 경로, 문자열)를 뽑는다.
BACKTICKED = re.compile(r"`([^`]+)`")
#: 로드맵 매핑표에서 파일을 배정하지 않은 행의 표기.
ROADMAP_EXCEPT = "예외 등재"


def ac_sort_key(code: str) -> tuple[int, int]:
    major, minor = code[2:].split(".")
    return int(major), int(minor)


# --- 실측 --------------------------------------------------------------------


def read_acs() -> tuple[list[str], list[str]]:
    """PRD 전체에서 AC 코드를 모은다. (정렬된 유일 목록, 중복 목록)"""
    seen: list[str] = []
    dupes: list[str] = []
    for prd in sorted(DOCS.glob(PRD_GLOB)):
        for line in prd.read_text(encoding="utf-8").splitlines():
            m = AC_HEADING.match(line)
            if not m:
                continue
            code = m.group(1)
            (dupes if code in seen else seen).append(code)
    return sorted(set(seen), key=ac_sort_key), dupes


def read_specs() -> tuple[dict[str, str], list[str]]:
    """spec 파일 -> 선언값. 선언이 0개거나 2개 이상이면 규칙2 위반으로 모은다."""
    declarations: dict[str, str] = {}
    problems: list[str] = []
    for spec in sorted(SPEC_DIR.glob("*.spec.ts")):
        rel = spec.relative_to(ROOT).as_posix()
        found = [
            m.group(1)
            for m in (DECLARATION.match(line) for line in spec.read_text(encoding="utf-8").splitlines())
            if m
        ]
        if not found:
            problems.append(f"규칙2: {rel} 에 `// 검증 AC:` 선언이 없다")
            continue
        if len(found) > 1:
            problems.append(f"규칙2: {rel} 에 `// 검증 AC:` 선언이 {len(found)}개다 — 정확히 하나여야 한다")
            continue
        value = found[0]
        codes = AC_CODE.findall(value)
        if len(codes) > 1:
            problems.append(f"규칙2: {rel} 이 AC {len(codes)}개({', '.join(codes)})를 한 파일에서 선언한다 — AC별로 분리할 것")
            continue
        if not codes and not value.startswith(NO_AC):
            problems.append(f"규칙2: {rel} 의 선언 `{value}` 을 해석할 수 없다 — `ACn.m` 또는 `없음 (…)` 이어야 한다")
            continue
        declarations[rel] = codes[0] if codes else NO_AC
    return declarations, problems


# --- doc-tracker 파싱 --------------------------------------------------------


def tracker_sections() -> dict[str, list[str]]:
    """`## e2e 매핑` 절 안의 `### ...` 하위 절을 제목 -> 본문 줄 목록으로."""
    lines = TRACKER.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, line in enumerate(lines) if line.strip() == "## e2e 매핑")
    except StopIteration:
        sys.exit(f"FAIL: {TRACKER.relative_to(ROOT)} 에 `## e2e 매핑` 절이 없다 (모델이 지목한 SSOT)")
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith("## ")),
        len(lines),
    )
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in lines[start + 1 : end]:
        if line.startswith("### "):
            current = line[4:].strip()
            sections[current] = []
        elif current is not None:
            sections[current].append(line)
    return sections


def table_rows(section: list[str]) -> list[list[str]]:
    """마크다운 표의 데이터 행(헤더·구분선 제외)을 셀 목록으로."""
    rows = []
    for line in section:
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if all(set(c) <= set("-: ") for c in cells):  # 구분선
            continue
        rows.append(cells)
    return rows[1:] if rows else []


def strip_code(cell: str) -> str:
    return cell.strip().strip("`").strip()


def marked_block(section: list[str], marker: str, section_name: str) -> tuple[str, str | None]:
    """``<!-- <marker>:begin -->`` ~ ``:end`` 사이만 돌려준다.

    절 전체를 긁으면 설명문에 적힌 AC 코드가 목록으로 오인돼 검사가 헐거워진다(실제로
    한 번 그렇게 통과했다). 마커가 없으면 그 자체를 위반으로 보고한다 — 마커를 지워
    검사를 무력화하는 경로를 막기 위해서다.
    """
    begin = f"<!-- {marker}:begin"
    end = f"<!-- {marker}:end"
    start = next((i for i, line in enumerate(section) if line.strip().startswith(begin)), None)
    stop = next((i for i, line in enumerate(section) if line.strip().startswith(end)), None)
    if start is None or stop is None or stop <= start:
        return "", f"규칙6: `### {section_name}` 에 `{begin} -->` ~ `{end} -->` 마커 블록이 없다"
    return "\n".join(section[start + 1 : stop]), None


def roadmap_rows() -> list[list[str]]:
    """`## e2e 매핑` 밖에 있는 로드맵 `### AC↔e2e 1:1 매핑표` 의 데이터 행.

    SSOT 는 `## e2e 매핑` 절이지만 로드맵 표도 같은 사실(어느 AC가 예외라 파일을 갖지
    않는가)을 적는다. 게이트가 없으면 한쪽만 갱신돼 조용히 갈라진다 — 실제로 그렇게
    갈라진 적이 있다(로드맵이 예외 3건, SSOT 가 1건).
    """
    lines = TRACKER.read_text(encoding="utf-8").splitlines()
    start = next((i for i, line in enumerate(lines) if line.strip() == f"### {ROADMAP_SECTION}"), None)
    if start is None:
        return []
    end = next(
        (i for i in range(start + 1, len(lines)) if lines[i].startswith(("## ", "### "))),
        len(lines),
    )
    return table_rows(lines[start + 1 : end])


# --- 검사 --------------------------------------------------------------------


def main() -> int:
    problems: list[str] = []

    acs, ac_dupes = read_acs()
    for code in sorted(set(ac_dupes), key=ac_sort_key):
        problems.append(f"규칙5: {code} 헤딩이 PRD에 두 번 이상 있다 — AC 코드는 유일해야 한다")

    declarations, spec_problems = read_specs()
    problems.extend(spec_problems)

    sections = tracker_sections()
    missing = [
        name
        for name in (
            COUNTS_SECTION,
            MAPPING_SECTION,
            EXCEPTION_SECTION,
            PENDING_SECTION,
            SMOKE_SECTION,
            GAP_SECTION,
            NOT_EXCEPT_SECTION,
        )
        if name not in sections
    ]
    if missing:
        print(f"FAIL: doc-tracker `## e2e 매핑` 절의 하위 절 {len(missing)}개가 없다", file=sys.stderr)
        for name in missing:
            print(f"  - 규칙6: `### {name}` 없음", file=sys.stderr)
        return 1

    # 등재 내용
    registered_exceptions = [strip_code(r[0]) for r in table_rows(sections.get(EXCEPTION_SECTION, []))]
    registered_smoke = [strip_code(r[0]) for r in table_rows(sections.get(SMOKE_SECTION, []))]
    pending_rows = [r for r in table_rows(sections.get(PENDING_SECTION, [])) if r]
    registered_pending = [strip_code(r[0]) for r in pending_rows]
    registered_mapping = {
        strip_code(r[0]): strip_code(r[1]) for r in table_rows(sections.get(MAPPING_SECTION, [])) if len(r) >= 2
    }
    registered_counts = {
        strip_code(r[0]): strip_code(r[1]) for r in table_rows(sections.get(COUNTS_SECTION, [])) if len(r) >= 2
    }
    gap_body, gap_problem = marked_block(sections.get(GAP_SECTION, []), "gap-list", GAP_SECTION)
    if gap_problem:
        problems.append(gap_problem)
    registered_gaps = sorted(set(AC_CODE.findall(gap_body)), key=ac_sort_key)
    # 예외로 빼지 않기로 판정한 AC(레지스트리). 표의 첫 열만 읽는다 — 본문 서술이 다른
    # AC를 언급해도("AC2.2와 동일") 판정 대상으로 오인하지 않기 위해서다.
    not_excepted = [strip_code(r[0]) for r in table_rows(sections.get(NOT_EXCEPT_SECTION, [])) if r]

    # 규칙5 — 등재가 가리키는 AC 가 실재하는가
    for code in registered_exceptions:
        if code not in acs:
            problems.append(f"규칙5: 예외 목록이 존재하지 않는 AC `{code}` 를 등재하고 있다")
    for code in registered_mapping:
        if code not in acs:
            problems.append(f"규칙5: AC↔spec 표가 존재하지 않는 AC `{code}` 를 등재하고 있다")
    for code, spec in declarations.items():
        if spec != NO_AC and spec not in acs:
            problems.append(f"규칙5: {code} 이 존재하지 않는 AC `{spec}` 을 선언한다")

    # 규칙4' — "예외로 빼지 않는다"는 판정이 조용히 회귀하지 않는다
    for code in not_excepted:
        if code not in acs:
            problems.append(f"규칙5: 미등재 판정 표가 존재하지 않는 AC `{code}` 를 등재하고 있다")
        elif code in registered_exceptions:
            problems.append(
                f"규칙4': {code} 는 `{NOT_EXCEPT_SECTION}` 에 예외로 빼지 않기로 판정돼 있는데 "
                f"`{EXCEPTION_SECTION}` 에도 있다 — 판정을 뒤집으려면 미등재 표에서 행을 빼는 명시적 변경이 필요하다"
            )

    # 규칙7 — 구현 대기 등재의 무결성 + 해제 신호가 아직 살아 있는가
    for row in pending_rows:
        code = strip_code(row[0])
        if code not in acs:
            problems.append(f"규칙5: 구현 대기 표가 존재하지 않는 AC `{code}` 를 등재하고 있다")
            continue
        if code in registered_exceptions:
            problems.append(
                f"규칙7: {code} 가 `{EXCEPTION_SECTION}`(영구 면제)와 "
                f"`{PENDING_SECTION}`(임시)에 동시에 있다 — 둘은 성격이 달라 한쪽만 골라야 한다"
            )
        if len(row) < 5:
            problems.append(
                f"규칙7: 구현 대기 표의 {code} 행에 열이 {len(row)}개다 — "
                f"AC · 미구현 근거 · 담당 · 해제 조건 · 해제 신호 5개여야 한다"
            )
            continue
        for idx, label in ((1, "미구현 근거"), (2, "담당"), (3, "해제 조건")):
            if not row[idx].strip():
                problems.append(f"규칙7: 구현 대기 표의 {code} 행에 `{label}` 이 비어 있다 — 등재는 근거와 소유자를 함께 적는다")
        tokens = BACKTICKED.findall(row[4])
        if len(tokens) != 2:
            problems.append(
                f"규칙7: {code} 의 해제 신호를 해석할 수 없다 — ``파일`` ∋ ``문자열`` 형태로 "
                f"백틱 토큰 정확히 2개여야 하는데 {len(tokens)}개다"
            )
            continue
        signal_path, needle = tokens
        target = ROOT / signal_path
        if not target.is_file():
            problems.append(f"규칙7: {code} 의 해제 신호가 가리키는 `{signal_path}` 이 없다 — 신호를 다시 잡을 것")
        elif needle not in target.read_text(encoding="utf-8"):
            problems.append(
                f"규칙7: {code} 의 해제 신호가 사라졌다 — `{signal_path}` 에 `{needle}` 이 더 이상 없다. "
                f"구현이 착지했다면 구현 대기 등재를 풀고 1:1 판정 대상으로 되돌릴 것"
            )

    # 규칙6' — 로드맵 매핑표가 SSOT 예외 목록과 어긋나지 않는가
    rows = roadmap_rows()
    if not rows:
        problems.append(f"규칙6': doc-tracker 에 `### {ROADMAP_SECTION}` 표가 없다")
    else:
        roadmap_acs = [strip_code(r[0]) for r in rows if r]
        roadmap_excepted = sorted(
            (strip_code(r[0]) for r in rows if len(r) >= 2 and ROADMAP_EXCEPT in r[1]),
            key=ac_sort_key,
        )
        if sorted(set(roadmap_acs), key=ac_sort_key) != acs or len(roadmap_acs) != len(acs):
            problems.append(
                f"규칙6': 로드맵 매핑표의 AC 집합이 PRD 와 다르다(각 AC 정확히 한 행이어야 한다).\n"
                f"      문서({len(roadmap_acs)}): {', '.join(roadmap_acs)}\n"
                f"      실측({len(acs)}): {', '.join(acs)}"
            )
        if roadmap_excepted != sorted(registered_exceptions, key=ac_sort_key):
            problems.append(
                f"규칙6': 로드맵 매핑표의 `— {ROADMAP_EXCEPT}` 표기가 SSOT 예외 목록과 다르다.\n"
                f"      로드맵: {', '.join(roadmap_excepted) or '(없음)'}\n"
                f"      SSOT  : {', '.join(sorted(registered_exceptions, key=ac_sort_key)) or '(없음)'}"
            )

    # 규칙3 — AC 를 선언하지 않는 파일은 비-AC 등재가 있어야 고아가 아니다
    measured_smoke = sorted(f for f, v in declarations.items() if v == NO_AC)
    for spec in measured_smoke:
        if spec not in registered_smoke:
            problems.append(f"규칙3: {spec} 이 AC를 선언하지 않는데 비-AC 등재 표에 없다 — 고아 파일")
    for spec in registered_smoke:
        if spec not in measured_smoke:
            problems.append(f"규칙3: 비-AC 등재 표의 `{spec}` 이 실제로는 없거나 AC를 선언한다")

    # 규칙1' — 한 AC를 두 파일이 선언하지 않는다
    by_ac: dict[str, list[str]] = {}
    for spec, code in declarations.items():
        if code != NO_AC:
            by_ac.setdefault(code, []).append(spec)
    for code, specs in sorted(by_ac.items(), key=lambda kv: ac_sort_key(kv[0])):
        if len(specs) > 1:
            problems.append(f"규칙1: {code} 를 {len(specs)}개 파일이 선언한다({', '.join(specs)}) — 전용 파일 1개로 병합할 것")

    # 규칙5 — 예외로 등재한 AC 가 동시에 spec 파일을 갖지 않는다
    for code in registered_exceptions:
        if code in by_ac:
            problems.append(f"규칙5: {code} 는 예외로 등재돼 있는데 spec 파일({by_ac[code][0]})도 있다 — 예외를 해제하거나 파일을 지울 것")

    # 규칙7 — 구현 대기 AC 는 spec 파일을 가질 수 없다(가졌다면 이미 관측 대상이 있다)
    for code in registered_pending:
        if code in by_ac:
            problems.append(
                f"규칙7: {code} 는 구현 대기로 등재돼 있는데 spec 파일({by_ac[code][0]})도 있다 — "
                f"관측 대상이 있다는 뜻이므로 등재를 풀 것"
            )

    # 규칙6 — 문서의 집계·매핑·공백이 실측과 일치하는가
    measured_mapping = {code: specs[0] for code, specs in by_ac.items()}
    if registered_mapping != measured_mapping:
        problems.append(
            f"규칙6: AC↔spec 표가 실측과 다르다.\n"
            f"      문서: {registered_mapping}\n"
            f"      실측: {measured_mapping}"
        )

    targets = [
        code for code in acs if code not in registered_exceptions and code not in registered_pending
    ]
    measured_gaps = sorted((code for code in targets if code not in by_ac), key=ac_sort_key)
    if registered_gaps != measured_gaps:
        problems.append(
            f"규칙6: 공백 목록이 실측과 다르다.\n"
            f"      문서({len(registered_gaps)}): {', '.join(registered_gaps) or '(없음)'}\n"
            f"      실측({len(measured_gaps)}): {', '.join(measured_gaps) or '(없음)'}"
        )

    expected_counts = {
        "AC 전집": len(acs),
        "예외 등재": len(registered_exceptions),
        "구현 대기 등재": len(registered_pending),
        "1:1 대상 (AC − 예외 − 구현 대기)": len(targets),
        "AC 매칭 spec 파일": len(measured_mapping),
        "공백 (1:1 대상 중 파일 없음)": len(measured_gaps),
        "비-AC(스모크·인프라) spec 파일": len(measured_smoke),
    }
    for label, value in expected_counts.items():
        if label not in registered_counts:
            problems.append(f"규칙6: 집계 표에 `{label}` 행이 없다")
        elif registered_counts[label] != str(value):
            problems.append(f"규칙6: 집계 표의 `{label}` 가 {registered_counts[label]} 인데 실측은 {value} 다")

    # --- 보고 ---------------------------------------------------------------
    print("AC ↔ e2e 1:1 매칭 실측")
    for label, value in expected_counts.items():
        print(f"  {label:<28} {value}")
    if measured_gaps:
        print(f"  공백 목록                    {', '.join(measured_gaps)}")

    if problems:
        print(f"\nFAIL: {len(problems)}건", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(
        "\nOK: 규칙 1(중복)·2·3·4'·5·6·6'·7 위반 없음 — 공백·구현 대기는 위 집계대로 "
        "문서에 기록돼 있고, 구현 대기의 해제 신호는 아직 살아 있다"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
