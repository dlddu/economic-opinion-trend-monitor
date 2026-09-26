#!/usr/bin/env python3
"""주석 판정 원장(docs/comment-policy/ledger.md) 게이트.

원장의 행 단위 불변식을 CI에서 강제하고 집계를 출력한다. 집계는 원장에 저장하지 않고
매 실행 계산한다 — 손으로 적은 합계는 원본만 고쳐질 때 조용히 낡기 때문이다.

범위 추출 규칙은 모델 tbm_econ-opinion-monitor-comment-redundancy 의 as-is versionScript와
같아야 한다. 둘이 갈라지면 지문에는 있는데 원장 불변식은 모르는 파일이 생긴다.
"""

from __future__ import annotations

import hashlib
import os
import re
import subprocess
import sys

LEDGER = "docs/comment-policy/ledger.md"
POLICY_README = "docs/comment-policy/README.md"

FIXED_EXCLUDE = (
    r"^docs/|\.md$"
    r"|(^|/)(vendor|node_modules|dist|build|target|\.venv|venv|__pycache__|\.next|coverage)/"
    r"|(^|/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|go\.sum|uv\.lock|poetry\.lock"
    r"|Cargo\.lock|Pipfile\.lock)$"
)
DIRECTIVE = (
    r":#!|//go:|nolint|eslint-|@ts-|prettier-ignore|/// <reference|istanbul ignore|c8 ignore"
    r"|# ?noqa|# ?type:|# ?pragma|# ?pylint:|# ?fmt:|shellcheck |# ?syntax=|yaml-language-server:"
    r"|검증 (AC|시나리오):|mock-exception:"
)
SUF = r"(\.(example|sample|template|tmpl|tpl|dist|in|j2))?$"
FAMILIES: list[tuple[str, str | None]] = [
    (
        r"\.(go|rs|java|kt|kts|scala|groovy|gradle|swift|c|h|cc|cpp|hpp|cs|m|js|jsx|mjs|cjs"
        r"|ts|tsx|mts|cts|css|scss|less|proto|jsonc)" + SUF
        + r"|(^|/)(go\.mod|go\.work|tsconfig[^/]*\.json|jsconfig[^/]*\.json"
        r"|\.devcontainer/[^/]*\.json)$",
        r"^[ \t]*(//|/\*|\*([ \t]|$)|\{/\*)",
    ),
    (
        r"\.(py|pyi|rb|sh|bash|zsh|fish|pl|r|ya?ml|toml|tf|tfvars|hcl|cfg|conf|ini|mk|dockerfile"
        r"|nix|awk|sed)" + SUF
        + r"|(^|/)(Makefile|GNUmakefile|Dockerfile[^/]*|Containerfile|Caddyfile|\.gitignore"
        r"|\.dockerignore|\.gitattributes|\.helmignore|\.editorconfig|\.env[^/]*|CODEOWNERS"
        r"|requirements[^/]*\.txt)$",
        r"^[ \t]*#",
    ),
    (r"\.(sql|lua|hs|elm|ada|adb)" + SUF, r"^[ \t]*--"),
    (r"\.(html?|vue|svelte|astro)" + SUF, r"^[ \t]*(<!--|//|/\*|\*([ \t]|$)|\{/\*)"),
    (r"\.(xml|svg|xhtml|plist|xsd|xsl)" + SUF, r"^[ \t]*<!--"),
    (
        r"\.(json|jsonl|ndjson|csv|tsv|txt|avsc|snap|golden|pem|crt|key|pub|patch|diff|log|lock"
        r"|sum|mod|map|http)" + SUF
        + r"|(^|/)(LICENSE[^/]*|NOTICE|AUTHORS|\.nvmrc|\.node-version|\.python-version"
        r"|\.tool-versions|\.gitkeep|py\.typed)$",
        None,
    ),
]
HASH_PATTERN = r"^[ \t]*#"

AXES = "①②③④"
AXIS_UNJUDGED = "—"
HEADER = ["판정일", "범위", "현재 주석 줄 수", "지문", "판정 축", "결과"]
ALLOWED_SECTIONS = ["읽는 법", "파일별 원장"]
FINGERPRINT_LEN = 12


# ── 범위 추출 (as-is versionScript와 같은 규칙) ────────────────────────────────

def repo_exclude(root: str) -> str:
    path = os.path.join(root, POLICY_README)
    if not os.path.exists(path):
        return ""
    out, inside = [], False
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if re.match(r"^```comment-scope-exclude[ \t]*$", line):
                inside = True
                continue
            if inside and line.startswith("```"):
                inside = False
                continue
            if inside and line.strip():
                out.append(line)
    return "|".join(out)


def is_text(path: str) -> bool:
    try:
        with open(path, "rb") as fh:
            return b"\0" not in fh.read(8192)
    except OSError:
        return False


def read_lines(path: str) -> list[str]:
    try:
        with open(path, "rb") as fh:
            return fh.read().decode("utf-8", "replace").split("\n")
    except OSError:
        return []


def measure(root: str) -> tuple[list[str], list[str]]:
    """(정규화된 `경로:주석줄` 목록, 미분류 파일 목록)."""
    tracked = subprocess.run(
        ["git", "-C", root, "ls-files"], capture_output=True, text=True, check=True
    ).stdout.splitlines()
    extra = repo_exclude(root)
    exclude = re.compile(FIXED_EXCLUDE + ("|" + extra if extra else ""))
    candidates = sorted(
        f for f in tracked if not exclude.search(f) and is_text(os.path.join(root, f))
    )
    scoped = []
    for f in candidates:
        head = "\n".join(read_lines(os.path.join(root, f))[:5])
        if "DO NOT EDIT" in head or "@generated" in head:
            continue
        scoped.append(f)

    rest, hits = list(scoped), []
    for file_re, line_re in FAMILIES:
        matcher = re.compile(file_re)
        take = [f for f in rest if matcher.search(f)]
        rest = [f for f in rest if not matcher.search(f)]
        if not line_re:
            continue
        line_matcher = re.compile(line_re)
        for f in take:
            hits += [f + ":" + ln for ln in read_lines(os.path.join(root, f)) if line_matcher.search(ln)]

    shebang = []
    for f in rest:
        try:
            with open(os.path.join(root, f), "rb") as fh:
                if fh.read(2) == b"#!":
                    shebang.append(f)
        except OSError:
            pass
    line_matcher = re.compile(HASH_PATTERN)
    for f in shebang:
        hits += [f + ":" + ln for ln in read_lines(os.path.join(root, f)) if line_matcher.search(ln)]
    unclassified = sorted(set(rest) - set(shebang))

    directive = re.compile(DIRECTIVE)
    normalized = sorted(
        re.sub(r"[ \t]+", " ", h).strip(" ") for h in hits if not directive.search(h)
    )
    return normalized, unclassified


def by_file(normalized: list[str]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {}
    for hit in normalized:
        out.setdefault(hit.split(":", 1)[0], []).append(hit)
    return out


def fingerprint(hits: list[str]) -> str:
    body = "\n".join(sorted(hits)) + "\n"
    return hashlib.sha256(body.encode()).hexdigest()[:FINGERPRINT_LEN]


# ── 원장 파싱 ────────────────────────────────────────────────────────────────

class Row:
    def __init__(self, lineno: int, cells: list[str]):
        self.lineno = lineno
        self.cells = cells
        self.date, self.scope, self.count, self.fp, self.axis, self.result = cells[:6]
        self.paths = re.findall(r"`([^`]+)`", self.scope)


def parse(root: str) -> tuple[list[Row], list[str], list[tuple[int, str]]]:
    path = os.path.join(root, LEDGER)
    lines = read_lines(path)
    rows: list[Row] = []
    sections: list[str] = []
    in_table = False
    header_seen = False
    stray: list[tuple[int, str]] = []
    for idx, raw in enumerate(lines, start=1):
        line = raw.rstrip()
        if line.startswith("## "):
            sections.append(line[3:].strip())
            in_table = False
            header_seen = False
            continue
        if line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if not header_seen and cells[: len(HEADER)] == HEADER:
                header_seen = True
                in_table = True
                continue
            if in_table and all(set(c) <= set("-: ") for c in cells):
                continue
            if in_table:
                rows.append(Row(idx, cells))
                continue
            stray.append((idx, line))
            continue
        if line and not line.startswith("#"):
            stray.append((idx, line))
    return rows, sections, stray


# ── 검사 ────────────────────────────────────────────────────────────────────

def axis_valid(value: str) -> bool:
    if value == AXIS_UNJUDGED:
        return True
    if not value or any(ch not in AXES for ch in value):
        return False
    return list(value) == sorted(set(value), key=AXES.index)


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    normalized, unclassified = measure(root)
    measured = by_file(normalized)
    rows, sections, stray = parse(root)
    fail: list[str] = []

    if not rows:
        print(f"ERROR: {LEDGER} 에서 원장 표를 찾지 못했다 (헤더: {' | '.join(HEADER)})")
        return 1

    # R1 절 구성 — 표와 「읽는 법」만.
    unexpected = [s for s in sections if s not in ALLOWED_SECTIONS]
    if unexpected:
        fail.append(
            f"R1 원장에 허용되지 않은 절이 있다: {unexpected} "
            f"— 경위·재측정 기록·인계 문단은 passes/ 나 PR 본문으로 옮긴다"
        )

    # R2 표 밖 산문 금지 — 첫 절 앞의 머리말과 「읽는 법」 절 안은 허용한다.
    allowed_lines = set()
    in_allowed = True  # 첫 `## ` 앞은 머리말
    for idx, raw in enumerate(read_lines(os.path.join(root, LEDGER)), start=1):
        line = raw.rstrip()
        if line.startswith("## "):
            in_allowed = line[3:].strip() == "읽는 법"
        if in_allowed:
            allowed_lines.add(idx)
    outside = [(n, t) for n, t in stray if n not in allowed_lines]
    if outside:
        fail.append(
            "R2 표·「읽는 법」 밖의 산문 "
            + ", ".join(f"{LEDGER}:{n}" for n, _ in outside[:6])
            + (" …" if len(outside) > 6 else "")
        )

    # R3 집계 행(범위 칸에 파일 경로가 없는 행) 금지.
    for row in rows:
        if not row.paths:
            fail.append(
                f"R3 {LEDGER}:{row.lineno} 범위 칸에 파일 경로가 없다 — "
                f"손으로 적은 합계·잔량 행은 두지 않는다(집계는 이 게이트가 출력한다): {row.scope[:60]}"
            )

    # R4 판정일 형식.
    for row in rows:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row.date):
            fail.append(f"R4 {LEDGER}:{row.lineno} 판정일이 YYYY-MM-DD 가 아니다: {row.date!r}")

    # R5 판정 축 표기.
    for row in rows:
        if not axis_valid(row.axis):
            fail.append(
                f"R5 {LEDGER}:{row.lineno} 판정 축 표기가 유효하지 않다: {row.axis!r} "
                f"— {AXIS_UNJUDGED} 또는 {AXES} 의 부분집합(원래 순서)"
            )

    # R6 파일 소속 유일 · 전수.
    owner: dict[str, Row] = {}
    for row in rows:
        for p in row.paths:
            if p in owner:
                fail.append(
                    f"R6 {LEDGER}:{row.lineno} 파일이 두 행에 속한다: `{p}` "
                    f"(먼저 {LEDGER}:{owner[p].lineno})"
                )
                continue
            owner[p] = row
    missing = sorted(set(measured) - set(owner))
    if missing:
        fail.append(
            f"R6 판정 대상 주석이 있는데 행이 없는 파일 {len(missing)}개 "
            f"(판정 축 {AXIS_UNJUDGED} 로 행을 만든다): "
            + ", ".join(f"`{p}`" for p in missing[:8])
            + (" …" if len(missing) > 8 else "")
        )
    extra = sorted(set(owner) - set(measured))
    if extra:
        fail.append(
            f"R6 행은 있으나 판정 대상 주석이 없는 파일 {len(extra)}개 "
            f"(행을 지우고 이력은 passes/ 에 남긴다): "
            + ", ".join(f"`{p}`" for p in extra[:8])
            + (" …" if len(extra) > 8 else "")
        )

    # R7 줄 수 · 지문 실측 일치.
    for row in rows:
        hits: list[str] = []
        for p in row.paths:
            hits += measured.get(p, [])
        if not all(p in measured for p in row.paths):
            continue
        try:
            declared = int(row.count)
        except ValueError:
            fail.append(f"R7 {LEDGER}:{row.lineno} 현재 주석 줄 수가 정수가 아니다: {row.count!r}")
            continue
        if declared != len(hits):
            fail.append(
                f"R7 {LEDGER}:{row.lineno} 현재 주석 줄 수 {declared} ≠ 실측 {len(hits)} "
                f"(범위 {', '.join('`'+p+'`' for p in row.paths)})"
            )
        want = fingerprint(hits)
        if row.fp.strip("`") != want:
            fail.append(
                f"R7 {LEDGER}:{row.lineno} 지문 {row.fp} ≠ 실측 `{want}` "
                f"(범위 {', '.join('`'+p+'`' for p in row.paths)})"
            )

    # R8 행 정렬 — 범위 첫 파일 경로 사전순.
    keys = [row.paths[0] for row in rows if row.paths]
    if keys != sorted(keys):
        for a, b, row in zip(keys, keys[1:], [r for r in rows if r.paths][1:]):
            if b < a:
                fail.append(
                    f"R8 {LEDGER}:{row.lineno} 행 순서가 사전순이 아니다: `{b}` 가 `{a}` 뒤에 있다"
                )

    # R9 미분류 파일 — 범위가 레포 성장을 따라가지 못한 신호.
    if unclassified:
        fail.append(
            f"R9 어느 언어군에도 들지 않는 텍스트 파일 {len(unclassified)}개 "
            f"(데이터·자산이면 README 의 comment-scope-exclude 블록에, 새 언어면 유형 템플릿 언어군에): "
            + ", ".join(f"`{p}`" for p in unclassified[:8])
        )

    # ── 집계 출력 ──
    judged_rows = [r for r in rows if r.axis != AXIS_UNJUDGED]
    full_rows = [r for r in rows if r.axis == AXES]
    open_rows = [r for r in rows if r.axis == AXIS_UNJUDGED]

    def line_count(rs: list[Row]) -> int:
        return sum(len(measured.get(p, [])) for r in rs for p in r.paths)

    print(f"원장: {LEDGER}")
    print(f"  행 {len(rows)} · 파일 {len(owner)} · 판정 대상 주석 {len(normalized)}줄")
    print(f"  판정 축 {AXES} (네 경로 완료): 행 {len(full_rows)} · {line_count(full_rows)}줄")
    print(f"  일부 축만 완료:            행 {len(judged_rows) - len(full_rows)} · "
          f"{line_count(judged_rows) - line_count(full_rows)}줄")
    print(f"  미판정({AXIS_UNJUDGED}):              행 {len(open_rows)} · {line_count(open_rows)}줄")
    for axis in AXES:
        pending = [r for r in rows if axis not in r.axis]
        print(f"  축 {axis} 미판정: 행 {len(pending)} · {line_count(pending)}줄")

    if fail:
        print()
        print(f"실패 {len(fail)}건:")
        for msg in fail:
            print(f"  - {msg}")
        return 1
    print("  불변식 통과")
    return 0


if __name__ == "__main__":
    sys.exit(main())
