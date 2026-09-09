#!/usr/bin/env python3
"""시나리오 ↔ e2e spec 1:1 매칭 검사기 (reconciler 모델 tbm_econ-opinion-monitor-scenario-e2e).

세 곳의 실측을 대조한다.

  * **시나리오 전집** — ``docs/econ-opinion-monitor-test-*.md`` 의 ``### 시나리오 N:`` 헤딩
  * **spec 선언**   — ``tests/e2e/specs/`` 최상위 ``*.spec.ts`` 헤더의 ``// 검증 시나리오:`` 한 줄
  * **등재·집계**   — ``docs/econ-opinion-monitor-doc-tracker.md`` 의 ``## e2e 매핑`` 절

판정 단위는 **시나리오**(``<문서 파일명>#시나리오 <N>``)다. AC 는 이 검사기의 축이 아니다 —
어떤 시나리오가 어떤 AC 를 검증하는지는 테스트 문서가 스스로 적지만, 그 연결의 완전성은
문서 체계(doc-tracker 앞부분)가 보고 이 게이트는 보지 않는다.

강제하는 것(위반 시 exit 1):

  규칙1 한 시나리오를 두 개 이상의 파일이 선언하지 않는다(중복은 지금 고칠 수 있는 위반).
  규칙2 모든 spec 파일은 실재하는 시나리오 정확히 하나(또는 "없음 = 스모크/인프라")를 선언한다.
  규칙3 시나리오를 선언하지 않는 파일은 doc-tracker 의 비-시나리오 등재 표에 있어야 한다.
  규칙4 예외 등재가 실재 시나리오를 가리키고, 예외 시나리오는 동시에 spec 파일을 갖지 않는다.
        "예외 후보 중 미등재" 표에 오른 시나리오(= 예외로 빼지 않기로 판정한 것)는 예외 목록에
        동시에 나타날 수 없다 — 판정의 조용한 회귀를 막는다.
  규칙5 doc-tracker 의 집계·매핑·공백 목록이 위 실측과 정확히 일치하고, 네 통(매칭·예외·구현
        대기·공백)이 시나리오 전집을 **빠짐없이 겹치지 않게** 덮는다.
  규칙6 구현 대기 등재가 실재 시나리오를 가리키고, 예외·매칭과 겹치지 않으며, 각 행의
        **해제 신호**(파일 ∋ 문자열)가 아직 살아 있다.

**해제 신호가 왜 필요한가**: 이 모델의 as-is 는 ``tests/e2e`` 트리, to-be 는 테스트 문서와 이
문서다. 구현이 ``go/``·``python/``·``web/`` 에 착지해도 **어느 쪽 버전도 바뀌지 않아** 재감지가
뜨지 않고, "미구현이라 관측 대상이 없다"는 등재가 조용히 낡는다. 그래서 미구현임을 보여 주는
좌표 문자열을 등재에 적어 두고 매 CI 에서 생존을 확인한다. 문자열이 사라지면 이 검사기가
빨개지고 그 행을 다시 판정하도록 강제된다. 완전한 판별자가 아니라 **조기 경보**다 — 신호가
살아 있다고 미구현이 증명되지는 않지만, 사라지면 반드시 재판정한다.

강제하지 **않는** 것: "공백 0". 21개 시나리오 중 다수가 배치 3단(수집·분석·집계)을 e2e 에
들이는 하네스를 선행으로 요구하므로 공백은 존재하는 것이 정상이고, 이 검사기는 공백을
**세어서 문서가 사실대로 적고 있는지**만 본다. 즉 게이트는 "격차가 없다"가 아니라 "문서가
격차를 정직하게 말한다"를 지킨다.

표준 라이브러리만 쓴다(레포가 이미 ``python3 contracts/codegen.py`` 를 bare python3 로 부른다).
사용법: ``python3 tests/e2e/check_scenario_mapping.py``
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DOCS = ROOT / "docs"
SPEC_DIR = ROOT / "tests" / "e2e" / "specs"
TRACKER = DOCS / "econ-opinion-monitor-doc-tracker.md"
TEST_DOC_GLOB = "econ-opinion-monitor-test-*.md"

SCENARIO_HEADING = re.compile(r"^### 시나리오 (\d+):")
# `<문서 파일명>#시나리오 <N>` — 표·선언·산문 어디서든 같은 형태로 읽는다.
SCENARIO_REF = re.compile(r"([A-Za-z0-9._-]+\.md)#시나리오\s*(\d+)")
DECLARATION = re.compile(r"^//\s*검증 시나리오:\s*(.+?)\s*$")
# 구현 대기의 해제 신호: `<경로>` ∋ `<문자열>`
SIGNAL = re.compile(r"`([^`]+)`\s*∋\s*`([^`]+)`")
NO_SCENARIO = "없음"

COUNTS_SECTION = "집계 (실측)"
MAPPING_SECTION = "시나리오 ↔ spec 파일 (실측)"
EXCEPTION_SECTION = "예외 목록"
PENDING_SECTION = "구현 대기 (미구현이라 관측 대상 없음)"
SMOKE_SECTION = "비-시나리오(스모크·인프라) 등재"
GAP_SECTION = "공백 (1:1 대상 중 파일 없음)"
NOT_EXCEPT_SECTION = "예외 후보 중 미등재 (공백으로 계수)"


def scenario_id(doc: str, ordinal: int | str) -> str:
    return f"{doc}#시나리오 {int(ordinal)}"


def scenario_sort_key(sid: str) -> tuple[str, int]:
    doc, _, tail = sid.partition("#시나리오 ")
    return doc, int(tail)


def find_refs(text: str) -> list[str]:
    """텍스트에서 시나리오 식별자를 등장 순서대로 뽑는다(중복 유지)."""
    return [scenario_id(doc, n) for doc, n in SCENARIO_REF.findall(text)]


# --- 실측 --------------------------------------------------------------------


def read_scenarios() -> tuple[list[str], list[str]]:
    """테스트 문서 전체에서 시나리오를 모은다. (정렬된 유일 목록, 중복 목록)"""
    seen: list[str] = []
    dupes: list[str] = []
    for doc in sorted(DOCS.glob(TEST_DOC_GLOB)):
        for line in doc.read_text(encoding="utf-8").splitlines():
            m = SCENARIO_HEADING.match(line)
            if not m:
                continue
            sid = scenario_id(doc.name, m.group(1))
            (dupes if sid in seen else seen).append(sid)
    return sorted(set(seen), key=scenario_sort_key), dupes


def read_specs() -> tuple[dict[str, str], list[str]]:
    """spec 파일 -> 선언값. 선언이 0개거나 2개 이상이면 규칙2 위반으로 모은다."""
    declarations: dict[str, str] = {}
    problems: list[str] = []
    for spec in sorted(SPEC_DIR.glob("*.spec.ts")):
        rel = spec.relative_to(ROOT).as_posix()
        found = [
            m.group(1)
            for m in (
                DECLARATION.match(line) for line in spec.read_text(encoding="utf-8").splitlines()
            )
            if m
        ]
        if not found:
            problems.append(f"규칙2: {rel} 에 `// 검증 시나리오:` 선언이 없다")
            continue
        if len(found) > 1:
            problems.append(
                f"규칙2: {rel} 에 `// 검증 시나리오:` 선언이 {len(found)}개다 — 정확히 하나여야 한다"
            )
            continue
        value = found[0]
        refs = find_refs(value)
        if len(refs) > 1:
            problems.append(
                f"규칙2: {rel} 이 시나리오 {len(refs)}개({', '.join(refs)})를 한 파일에서 선언한다 "
                f"— 시나리오별로 분리할 것"
            )
            continue
        if not refs and not value.startswith(NO_SCENARIO):
            problems.append(
                f"규칙2: {rel} 의 선언 `{value}` 을 해석할 수 없다 "
                f"— `<문서 파일명>.md#시나리오 <N>` 또는 `없음 (…)` 이어야 한다"
            )
            continue
        declarations[rel] = refs[0] if refs else NO_SCENARIO
    return declarations, problems


# --- doc-tracker 파싱 --------------------------------------------------------


def tracker_sections() -> dict[str, list[str]]:
    """`## e2e 매핑` 절 안의 `### ...` 하위 절을 제목 -> 본문 줄 목록으로."""
    lines = TRACKER.read_text(encoding="utf-8").splitlines()
    try:
        start = next(i for i, line in enumerate(lines) if line.strip() == "## e2e 매핑")
    except StopIteration:
        sys.exit(
            f"FAIL: {TRACKER.relative_to(ROOT)} 에 `## e2e 매핑` 절이 없다 (모델이 지목한 SSOT)"
        )
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


def first_ref(cell: str) -> str:
    """표의 첫 열에서 시나리오 식별자 하나를 읽는다(없으면 원문 그대로 돌려 규칙이 잡게 한다)."""
    refs = find_refs(cell)
    return refs[0] if refs else strip_code(cell)


def marked_block(section: list[str], marker: str, section_name: str) -> tuple[str, str | None]:
    """``<!-- <marker>:begin -->`` ~ ``:end`` 사이만 돌려준다.

    절 전체를 긁으면 설명문에 적힌 식별자가 목록으로 오인돼 검사가 헐거워진다(AC 축 시절
    실제로 한 번 그렇게 통과했다). 마커가 없으면 그 자체를 위반으로 보고한다 — 마커를 지워
    검사를 무력화하는 경로를 막기 위해서다.
    """
    begin = f"<!-- {marker}:begin"
    end = f"<!-- {marker}:end"
    start = next((i for i, line in enumerate(section) if line.strip().startswith(begin)), None)
    stop = next((i for i, line in enumerate(section) if line.strip().startswith(end)), None)
    if start is None or stop is None or stop <= start:
        return "", f"규칙5: `### {section_name}` 에 `{begin} -->` ~ `{end} -->` 마커 블록이 없다"
    return "\n".join(section[start + 1 : stop]), None


# --- 검사 --------------------------------------------------------------------


def main() -> int:
    problems: list[str] = []

    scenarios, dupes = read_scenarios()
    for sid in sorted(set(dupes), key=scenario_sort_key):
        problems.append(f"규칙5: `{sid}` 헤딩이 테스트 문서에 두 번 이상 있다 — 서수는 유일해야 한다")

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
            print(f"  - 규칙5: `### {name}` 없음", file=sys.stderr)
        return 1

    # 등재 내용
    registered_exceptions = [first_ref(r[0]) for r in table_rows(sections[EXCEPTION_SECTION])]
    pending_rows = table_rows(sections[PENDING_SECTION])
    registered_pending = [first_ref(r[0]) for r in pending_rows]
    registered_smoke = [strip_code(r[0]) for r in table_rows(sections[SMOKE_SECTION])]
    registered_mapping = {
        first_ref(r[0]): strip_code(r[1]) for r in table_rows(sections[MAPPING_SECTION]) if len(r) >= 2
    }
    registered_counts = {
        strip_code(r[0]): strip_code(r[1]) for r in table_rows(sections[COUNTS_SECTION]) if len(r) >= 2
    }
    gap_body, gap_problem = marked_block(sections[GAP_SECTION], "gap-list", GAP_SECTION)
    if gap_problem:
        problems.append(gap_problem)
    registered_gaps = sorted(set(find_refs(gap_body)), key=scenario_sort_key)
    # 예외로 빼지 않기로 판정한 시나리오(레지스트리). 표의 첫 열만 읽는다 — 본문 서술이 다른
    # 시나리오를 언급해도("시나리오 2와 동일") 판정 대상으로 오인하지 않기 위해서다.
    not_excepted = [first_ref(r[0]) for r in table_rows(sections[NOT_EXCEPT_SECTION]) if r]

    # 규칙2/4/6 — 등재·선언이 가리키는 시나리오가 실재하는가
    for sid in registered_exceptions:
        if sid not in scenarios:
            problems.append(f"규칙4: 예외 목록이 존재하지 않는 시나리오 `{sid}` 를 등재하고 있다")
    for sid in registered_pending:
        if sid not in scenarios:
            problems.append(f"규칙6: 구현 대기 표가 존재하지 않는 시나리오 `{sid}` 를 등재하고 있다")
    for sid in registered_mapping:
        if sid not in scenarios:
            problems.append(f"규칙5: 매핑 표가 존재하지 않는 시나리오 `{sid}` 를 등재하고 있다")
    for spec, sid in declarations.items():
        if sid != NO_SCENARIO and sid not in scenarios:
            problems.append(f"규칙2: {spec} 이 존재하지 않는 시나리오 `{sid}` 를 선언한다")

    # 규칙4 — "예외로 빼지 않는다"는 판정이 조용히 회귀하지 않는다
    for sid in not_excepted:
        if sid not in scenarios:
            problems.append(f"규칙4: 미등재 판정 표가 존재하지 않는 시나리오 `{sid}` 를 등재하고 있다")
        elif sid in registered_exceptions:
            problems.append(
                f"규칙4: `{sid}` 는 `{NOT_EXCEPT_SECTION}` 에 예외로 빼지 않기로 판정돼 있는데 "
                f"`{EXCEPTION_SECTION}` 에도 있다 — 판정을 뒤집으려면 미등재 표에서 행을 빼는 "
                f"명시적 변경이 필요하다"
            )

    # 규칙3 — 시나리오를 선언하지 않는 파일은 비-시나리오 등재가 있어야 고아가 아니다
    measured_smoke = sorted(f for f, v in declarations.items() if v == NO_SCENARIO)
    for spec in measured_smoke:
        if spec not in registered_smoke:
            problems.append(
                f"규칙3: {spec} 이 시나리오를 선언하지 않는데 비-시나리오 등재 표에 없다 — 고아 파일"
            )
    for spec in registered_smoke:
        if spec not in measured_smoke:
            problems.append(
                f"규칙3: 비-시나리오 등재 표의 `{spec}` 이 실제로는 없거나 시나리오를 선언한다"
            )

    # 규칙1 — 한 시나리오를 두 파일이 선언하지 않는다
    by_scenario: dict[str, list[str]] = {}
    for spec, sid in declarations.items():
        if sid != NO_SCENARIO:
            by_scenario.setdefault(sid, []).append(spec)
    for sid, specs in sorted(by_scenario.items(), key=lambda kv: scenario_sort_key(kv[0])):
        if len(specs) > 1:
            problems.append(
                f"규칙1: `{sid}` 를 {len(specs)}개 파일이 선언한다({', '.join(specs)}) "
                f"— 전용 파일 1개로 병합할 것"
            )

    # 규칙4/6 — 면제 등재와 실제 파일이 동시에 있을 수 없다
    for sid in registered_exceptions:
        if sid in by_scenario:
            problems.append(
                f"규칙4: `{sid}` 는 예외로 등재돼 있는데 spec 파일({by_scenario[sid][0]})도 있다 "
                f"— 예외를 해제하거나 파일을 지울 것"
            )
    for sid in registered_pending:
        if sid in by_scenario:
            problems.append(
                f"규칙6: `{sid}` 는 구현 대기로 등재돼 있는데 spec 파일({by_scenario[sid][0]})도 있다 "
                f"— 구현이 착지했다면 등재를 걷을 것"
            )
        if sid in registered_exceptions:
            problems.append(
                f"규칙6: `{sid}` 가 예외 목록과 구현 대기 표에 동시에 있다 "
                f"— 영구 면제와 임시 보류를 겸할 수 없다"
            )

    # 규칙6 — 구현 대기의 해제 신호가 아직 살아 있는가
    for row in pending_rows:
        sid = first_ref(row[0])
        signals = SIGNAL.findall(" | ".join(row))
        if not signals:
            problems.append(
                f"규칙6: 구현 대기 `{sid}` 행에 해제 신호(`<파일>` ∋ `<문자열>`)가 없다 "
                f"— 신호 없는 등재는 조용히 낡는다"
            )
            continue
        for rel, needle in signals:
            target = ROOT / rel
            if not target.exists():
                problems.append(
                    f"규칙6: 구현 대기 `{sid}` 의 해제 신호 파일 `{rel}` 이 없다 — 재판정할 것"
                )
            elif needle not in target.read_text(encoding="utf-8"):
                problems.append(
                    f"규칙6: 구현 대기 `{sid}` 의 해제 신호가 사라졌다 "
                    f"(`{rel}` 에 `{needle}` 없음) — 구현이 착지했을 수 있으니 재판정할 것"
                )

    # 규칙5 — 문서의 매핑·공백·집계가 실측과 일치하는가
    measured_mapping = {sid: specs[0] for sid, specs in by_scenario.items()}
    if registered_mapping != measured_mapping:
        problems.append(
            f"규칙5: 시나리오↔spec 표가 실측과 다르다.\n"
            f"      문서: {registered_mapping}\n"
            f"      실측: {measured_mapping}"
        )

    exempt = set(registered_exceptions) | set(registered_pending)
    targets = [sid for sid in scenarios if sid not in exempt]
    measured_gaps = sorted((sid for sid in targets if sid not in by_scenario), key=scenario_sort_key)
    if registered_gaps != measured_gaps:
        problems.append(
            f"규칙5: 공백 목록이 실측과 다르다.\n"
            f"      문서({len(registered_gaps)}): {', '.join(registered_gaps) or '(없음)'}\n"
            f"      실측({len(measured_gaps)}): {', '.join(measured_gaps) or '(없음)'}"
        )

    # 규칙5 — 네 통이 전집을 빠짐없이 겹치지 않게 덮는가(회계가 닫히는가)
    buckets = {
        "매칭": set(measured_mapping),
        "예외": set(registered_exceptions),
        "구현 대기": set(registered_pending),
        "공백": set(measured_gaps),
    }
    covered: dict[str, list[str]] = {}
    for name, members in buckets.items():
        for sid in members:
            covered.setdefault(sid, []).append(name)
    for sid in scenarios:
        where = covered.get(sid, [])
        if len(where) != 1:
            problems.append(
                f"규칙5: `{sid}` 가 {len(where)}개 통에 있다({', '.join(where) or '없음'}) "
                f"— 매칭·예외·구현 대기·공백 중 정확히 하나여야 한다"
            )
    for sid in sorted(set(covered) - set(scenarios), key=scenario_sort_key):
        problems.append(f"규칙5: `{sid}` 가 등재돼 있으나 테스트 문서에 없는 시나리오다")

    expected_counts = {
        "시나리오 전집": len(scenarios),
        "예외 등재": len(registered_exceptions),
        "구현 대기 등재": len(registered_pending),
        "1:1 대상 (시나리오 − 예외 − 구현 대기)": len(targets),
        "시나리오 매칭 spec 파일": len(measured_mapping),
        "공백 (1:1 대상 중 파일 없음)": len(measured_gaps),
        "비-시나리오(스모크·인프라) spec 파일": len(measured_smoke),
    }
    for label, value in expected_counts.items():
        if label not in registered_counts:
            problems.append(f"규칙5: 집계 표에 `{label}` 행이 없다")
        elif registered_counts[label] != str(value):
            problems.append(
                f"규칙5: 집계 표의 `{label}` 가 {registered_counts[label]} 인데 실측은 {value} 다"
            )

    # --- 보고 ---------------------------------------------------------------
    print("시나리오 ↔ e2e 1:1 매칭 실측")
    for label, value in expected_counts.items():
        print(f"  {label:<34} {value}")
    if measured_gaps:
        print("  공백 목록")
        for sid in measured_gaps:
            print(f"    - {sid}")

    if problems:
        print(f"\nFAIL: {len(problems)}건", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        return 1
    print(
        "\nOK: 규칙 1·2·3·4·5·6 위반 없음 — 공백은 위 집계대로 문서에 기록돼 있다\n"
        "    (모델 불변식 「1:1 대상 = 매칭 파일」은 공백이 0이 되는 날 성립한다)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
