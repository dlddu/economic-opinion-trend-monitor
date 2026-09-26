#!/usr/bin/env python3
"""주석 판정 원장(docs/comment-policy/ledger.md) 게이트.

범위 추출 규칙은 모델 tbm_econ-opinion-monitor-comment-redundancy 의 as-is versionScript와
같아야 한다. 둘이 갈라지면 지문에는 있는데 원장 불변식은 모르는 파일이 생긴다.
"""

from __future__ import annotations

import ast
import hashlib
import io
import os
import re
import subprocess
import sys
import tokenize

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
FAMILIES: list[tuple[str, str, str | None]] = [
    (
        "C",
        r"\.(go|rs|java|kt|kts|scala|groovy|gradle|swift|c|h|cc|cpp|hpp|cs|m|js|jsx|mjs|cjs"
        r"|ts|tsx|mts|cts|css|scss|less|proto|jsonc)" + SUF
        + r"|(^|/)(go\.mod|go\.work|tsconfig[^/]*\.json|jsconfig[^/]*\.json"
        r"|\.devcontainer/[^/]*\.json)$",
        r"^[ \t]*(//|/\*|\*([ \t]|$)|\{/\*)",
    ),
    (
        "HASH",
        r"\.(py|pyi|rb|sh|bash|zsh|fish|pl|r|ya?ml|toml|tf|tfvars|hcl|cfg|conf|ini|mk|dockerfile"
        r"|nix|awk|sed)" + SUF
        + r"|(^|/)(Makefile|GNUmakefile|Dockerfile[^/]*|Containerfile|Caddyfile|\.gitignore"
        r"|\.dockerignore|\.gitattributes|\.helmignore|\.editorconfig|\.env[^/]*|CODEOWNERS"
        r"|requirements[^/]*\.txt)$",
        r"^[ \t]*#",
    ),
    ("DASH", r"\.(sql|lua|hs|elm|ada|adb)" + SUF, r"^[ \t]*--"),
    ("MIXED", r"\.(html?|vue|svelte|astro)" + SUF, r"^[ \t]*(<!--|//|/\*|\*([ \t]|$)|\{/\*)"),
    ("MARKUP", r"\.(xml|svg|xhtml|plist|xsd|xsl)" + SUF, r"^[ \t]*<!--"),
    (
        "NONE",
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
SURFACE_SECTIONS = {
    "파일별 원장 — L (줄머리 주석)": "L",
    "파일별 원장 — D (docstring 본문)": "D",
    "파일별 원장 — E (줄 끝·줄 중간 주석)": "E",
}
SURFACES = ["L", "D", "E"]
ALLOWED_SECTIONS = ["읽는 법", *SURFACE_SECTIONS]
FINGERPRINT_LEN = 12


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


class DE:
    """D·E 표면 추출기 — 모델 as-is versionScript의 D·E 블록과 같은 규칙.

    파싱에 실패한 파일은 `X:` 줄로 남아 `unparsed`로 세진다 — 조용히 표면에서 빠지지 않게.

    기계가 읽는 주석(`DIRECTIVE`)은 E에서도 뺀다. 다만 지시자 **뒤에 붙은 사유**
    (`# shellcheck disable=X # 이유`, `// eslint-disable-line r -- 이유`)는 사람의 문장이라
    E로 남긴다 — L이 지시자와 함께 버리기 때문이다.
    """

    DIR = re.compile(DIRECTIVE.replace(":#!|", "", 1))
    SUF_RE = re.compile(r"\.(example|sample|template|tmpl|tpl|dist|in|j2)$")
    HASH_E_EXT = {
        "sh", "bash", "zsh", "fish", "rb", "pl", "r", "yaml", "yml",
        "toml", "tf", "tfvars", "hcl", "mk", "nix", "awk",
    }
    MAKE = re.compile(r"^(Makefile|GNUmakefile)$|\.mk$")
    OPEN_OK = set(" \t=([{,:")

    def __init__(self) -> None:
        self.out: list[str] = []

    def emit(self, kind: str, path: str, text: str) -> None:
        t = re.sub(r"\s+", " ", text).strip()
        if t and not (kind == "E" and self.DIR.search(t)):
            self.out.append(f"{kind}:{path}:{t}")

    def rescue(self, path: str, comment: str, tail: str) -> None:
        if self.DIR.search(comment):
            m = re.search(tail, comment[1:])
            if m:
                self.emit("E", path, comment[1 + m.start():])

    def py(self, path: str, src: str) -> None:
        try:
            tree = ast.parse(src)
        except (SyntaxError, ValueError):
            self.out.append(f"X:{path}:ast")
            tree = None
        if tree is not None:
            for n in ast.walk(tree):
                if isinstance(n, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
                    for line in (ast.get_docstring(n, clean=True) or "").splitlines():
                        self.emit("D", path, line)
        lines = src.splitlines()
        try:
            for tok in tokenize.generate_tokens(io.StringIO(src).readline):
                if tok.type == tokenize.COMMENT:
                    r, c = tok.start
                    if lines[r - 1][:c].strip():
                        self.emit("E", path, tok.string)
                    else:
                        self.rescue(path, tok.string, r"\s#\s")
        except (tokenize.TokenError, IndentationError, SyntaxError):
            self.out.append(f"X:{path}:tokenize")

    def marker_lang(self, path: str, src: str, marker: str, quotes: str, make: bool = False) -> None:
        """`#`·`--` 계열 줄 스캐너. 줄머리 주석은 L 몫이라 건너뛰고, 코드 뒤 주석만 E로 낸다."""
        for line in src.splitlines():
            s = line.lstrip()
            if s.startswith(marker):
                self.rescue(path, s, r"\s" + re.escape(marker) + r"\s")
                continue
            q = None
            i = 0
            while i < len(line):
                ch = line[i]
                if q:
                    if ch == "\\" and q == '"':
                        i += 2
                        continue
                    if ch == q:
                        q = None
                elif ch in quotes and (i == 0 or line[i - 1] in self.OPEN_OK):
                    q = ch
                elif line.startswith(marker, i) and (marker != "#" or line[i - 1] in " \t"):
                    c = line[i:]
                    if not (make and re.match(r"^##( |$)", c)):
                        self.emit("E", path, c)
                    break
                i += 1

    def slash_lang(self, path: str, src: str, line_comments: bool) -> None:
        """C 언어군 줄 스캐너. 문자열(" ' `)과 블록 주석 상태를 줄을 넘어 따라간다. ' "는 줄 끝에서 닫는다."""
        q = None
        block = False
        for line in src.splitlines():
            s = line.lstrip()
            if q in ('"', "'"):
                q = None
            lead = not block and q is None and s.startswith(("//", "/*", "*", "{/*"))
            if lead and s.startswith("//"):
                self.rescue(path, s[1:], r"\s(--|//)\s")
            i = 0
            code = False
            while i < len(line):
                ch = line[i]
                nx = line[i + 1] if i + 1 < len(line) else ""
                if block:
                    if ch == "*" and nx == "/":
                        block = False
                        i += 2
                        continue
                    i += 1
                    continue
                if q:
                    if ch == "\\":
                        i += 2
                        continue
                    if ch == q:
                        q = None
                    i += 1
                    continue
                if ch == "\\":
                    i += 2
                    code = True
                    continue
                if line_comments and ch == "/" and nx == "/":
                    if code and not lead:
                        self.emit("E", path, line[i:])
                    break
                if ch == "/" and nx == "*":
                    end = line.find("*/", i + 2)
                    if code and not lead:
                        self.emit("E", path, line[i:] if end < 0 else line[i:end + 2])
                    if end < 0:
                        block = True
                        break
                    i = end + 2
                    continue
                if ch in "\"'`":
                    q = ch
                if not ch.isspace() and ch != "{":
                    code = True
                i += 1

    def scan(self, root: str, tagged: list[tuple[str, str]]) -> list[str]:
        """(언어군 태그, 경로) 목록에서 D·E·X 줄을 뽑는다.

        `go.mod`·`go.work`의 `// indirect`는 go mod tidy가 쓰고 읽는 표식이라 뺀다.
        """
        for tag, path in tagged:
            try:
                with open(os.path.join(root, path), encoding="utf-8") as fh:
                    src = fh.read()
            except (UnicodeDecodeError, OSError):
                self.out.append(f"X:{path}:read")
                continue
            name = self.SUF_RE.sub("", os.path.basename(path))
            ext = name.rsplit(".", 1)[1].lower() if "." in name else ""
            if tag == "C":
                n = len(self.out)
                self.slash_lang(path, src, ext != "css")
                if name in ("go.mod", "go.work"):
                    self.out[n:] = [o for o in self.out[n:] if not o.endswith(":// indirect")]
            elif tag == "DASH":
                self.marker_lang(path, src, "--", "'\"")
            elif tag in ("HASH", "SHEBANG"):
                if ext in ("py", "pyi") or (tag == "SHEBANG" and "python" in src.split("\n", 1)[0]):
                    self.py(path, src)
                elif (
                    tag == "SHEBANG"
                    or ext in self.HASH_E_EXT
                    or self.MAKE.search(name)
                    or name.startswith("requirements")
                ):
                    self.marker_lang(path, src, "#", "'\"", make=bool(self.MAKE.search(name)))
        return sorted(self.out)


def measure(root: str) -> tuple[dict[str, list[str]], list[str], list[str]]:
    """(표면별 정규화 주석 줄 목록, 미분류 파일, 파싱 실패 줄).

    L은 `경로:본문`, D·E는 `D:경로:본문`·`E:경로:본문` — as-is versionScript가 해시에 넣는
    문자열 그대로다. 그래야 원장 지문과 지문 스크립트가 같은 값을 센다.
    """
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

    rest, hits, tagged = list(scoped), [], []
    for tag, file_re, line_re in FAMILIES:
        matcher = re.compile(file_re)
        take = [f for f in rest if matcher.search(f)]
        rest = [f for f in rest if not matcher.search(f)]
        if tag in ("C", "HASH", "DASH"):
            tagged += [(tag, f) for f in take]
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
    tagged += [("SHEBANG", f) for f in shebang]
    unclassified = sorted(set(rest) - set(shebang))

    directive = re.compile(DIRECTIVE)
    surfaces = {
        "L": sorted(re.sub(r"[ \t]+", " ", h).strip(" ") for h in hits if not directive.search(h))
    }
    de = DE().scan(root, sorted(tagged, key=lambda t: t[1]))
    for surface in ("D", "E"):
        surfaces[surface] = [ln for ln in de if ln.startswith(surface + ":")]
    return surfaces, unclassified, [ln for ln in de if ln.startswith("X:")]


def by_file(surface: str, normalized: list[str]) -> dict[str, list[str]]:
    field = 0 if surface == "L" else 1
    out: dict[str, list[str]] = {}
    for hit in normalized:
        out.setdefault(hit.split(":", field + 1)[field], []).append(hit)
    return out


def fingerprint(hits: list[str]) -> str:
    body = "\n".join(sorted(hits)) + "\n"
    return hashlib.sha256(body.encode()).hexdigest()[:FINGERPRINT_LEN]


class Row:
    def __init__(self, lineno: int, cells: list[str]):
        self.lineno = lineno
        self.cells = cells
        self.date, self.scope, self.count, self.fp, self.axis, self.result = cells[:6]
        self.paths = re.findall(r"`([^`]+)`", self.scope)


def parse(root: str) -> tuple[dict[str, list[Row]], list[str], list[tuple[int, str]]]:
    """(표면별 행, 절 제목 목록, 표·「읽는 법」 밖 줄). 행은 그것이 놓인 절의 표면에 속한다."""
    path = os.path.join(root, LEDGER)
    lines = read_lines(path)
    rows: dict[str, list[Row]] = {s: [] for s in SURFACES}
    sections: list[str] = []
    surface: str | None = None
    in_table = False
    header_seen = False
    stray: list[tuple[int, str]] = []
    for idx, raw in enumerate(lines, start=1):
        line = raw.rstrip()
        if line.startswith("## "):
            title = line[3:].strip()
            sections.append(title)
            surface = SURFACE_SECTIONS.get(title)
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
            if in_table and surface:
                rows[surface].append(Row(idx, cells))
                continue
            stray.append((idx, line))
            continue
        if line and not line.startswith("#"):
            stray.append((idx, line))
    return rows, sections, stray


def axis_valid(value: str) -> bool:
    if value == AXIS_UNJUDGED:
        return True
    if not value or any(ch not in AXES for ch in value):
        return False
    return list(value) == sorted(set(value), key=AXES.index)


def check_surface(surface: str, srows: list[Row], smeasured: dict[str, list[str]],
                  fail: list[str]) -> None:
    """한 표면의 표에 행 불변식 R3~R8 을 적용한다. 표면마다 따로 성립하는 규칙이다."""
    tag = f"[{surface}] "

    for row in srows:
        if not row.paths:
            fail.append(
                f"R3 {tag}{LEDGER}:{row.lineno} 범위 칸에 파일 경로가 없다 — "
                f"손으로 적은 합계·잔량 행은 두지 않는다(집계는 이 게이트가 출력한다): {row.scope[:60]}"
            )

    for row in srows:
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", row.date):
            fail.append(
                f"R4 {tag}{LEDGER}:{row.lineno} 판정일이 YYYY-MM-DD 가 아니다: {row.date!r}"
            )

    for row in srows:
        if not axis_valid(row.axis):
            fail.append(
                f"R5 {tag}{LEDGER}:{row.lineno} 판정 축 표기가 유효하지 않다: {row.axis!r} "
                f"— {AXIS_UNJUDGED} 또는 {AXES} 의 부분집합(원래 순서)"
            )

    owner: dict[str, Row] = {}
    for row in srows:
        for p in row.paths:
            if p in owner:
                fail.append(
                    f"R6 {tag}{LEDGER}:{row.lineno} 파일이 두 행에 속한다: `{p}` "
                    f"(먼저 {LEDGER}:{owner[p].lineno})"
                )
                continue
            owner[p] = row
    missing = sorted(set(smeasured) - set(owner))
    if missing:
        fail.append(
            f"R6 {tag}판정 대상 주석이 있는데 행이 없는 파일 {len(missing)}개 "
            f"(판정 축 {AXIS_UNJUDGED} 로 행을 만든다): "
            + ", ".join(f"`{p}`" for p in missing[:8])
            + (" …" if len(missing) > 8 else "")
        )
    extra = sorted(set(owner) - set(smeasured))
    if extra:
        fail.append(
            f"R6 {tag}행은 있으나 판정 대상 주석이 없는 파일 {len(extra)}개 "
            f"(행을 지우고 이력은 passes/ 에 남긴다): "
            + ", ".join(f"`{p}`" for p in extra[:8])
            + (" …" if len(extra) > 8 else "")
        )

    for row in srows:
        hits: list[str] = []
        for p in row.paths:
            hits += smeasured.get(p, [])
        if not all(p in smeasured for p in row.paths):
            continue
        try:
            declared = int(row.count)
        except ValueError:
            fail.append(
                f"R7 {tag}{LEDGER}:{row.lineno} 현재 주석 줄 수가 정수가 아니다: {row.count!r}"
            )
            continue
        if declared != len(hits):
            fail.append(
                f"R7 {tag}{LEDGER}:{row.lineno} 현재 주석 줄 수 {declared} ≠ 실측 {len(hits)} "
                f"(범위 {', '.join('`'+p+'`' for p in row.paths)})"
            )
        want = fingerprint(hits)
        if row.fp.strip("`") != want:
            fail.append(
                f"R7 {tag}{LEDGER}:{row.lineno} 지문 {row.fp} ≠ 실측 `{want}` "
                f"(범위 {', '.join('`'+p+'`' for p in row.paths)})"
            )

    keys = [row.paths[0] for row in srows if row.paths]
    if keys != sorted(keys):
        for a, b, row in zip(keys, keys[1:], [r for r in srows if r.paths][1:]):
            if b < a:
                fail.append(
                    f"R8 {tag}{LEDGER}:{row.lineno} 행 순서가 사전순이 아니다: "
                    f"`{b}` 가 `{a}` 뒤에 있다"
                )


def main() -> int:
    root = sys.argv[1] if len(sys.argv) > 1 else "."
    surfaces, unclassified, unparsed = measure(root)
    measured = {s: by_file(s, surfaces[s]) for s in SURFACES}
    rows, sections, stray = parse(root)
    fail: list[str] = []

    if not any(rows.values()):
        print(f"ERROR: {LEDGER} 에서 원장 표를 찾지 못했다 (헤더: {' | '.join(HEADER)})")
        return 1

    unexpected = [s for s in sections if s not in ALLOWED_SECTIONS]
    if unexpected:
        fail.append(
            f"R1 원장에 허용되지 않은 절이 있다: {unexpected} "
            f"— 경위·재측정 기록·인계 문단은 passes/ 나 PR 본문으로 옮긴다"
        )
    absent = [t for t in SURFACE_SECTIONS if t not in sections]
    if absent:
        fail.append(
            f"R1 표면의 표가 없다: {absent} "
            f"— 표면마다 표를 두어야 그 표면의 주석이 원장에 등재된다"
        )

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

    for surface in SURFACES:
        check_surface(surface, rows[surface], measured[surface], fail)

    if unclassified:
        fail.append(
            f"R9 어느 언어군에도 들지 않는 텍스트 파일 {len(unclassified)}개 "
            f"(데이터·자산이면 README 의 comment-scope-exclude 블록에, 새 언어면 유형 템플릿 언어군에): "
            + ", ".join(f"`{p}`" for p in unclassified[:8])
        )

    print(f"원장: {LEDGER}")
    for surface in SURFACES:
        srows = rows[surface]
        smeasured = measured[surface]
        owned = {p for r in srows for p in r.paths}
        judged_rows = [r for r in srows if r.axis != AXIS_UNJUDGED]
        full_rows = [r for r in srows if r.axis == AXES]
        open_rows = [r for r in srows if r.axis == AXIS_UNJUDGED]

        def line_count(rs: list[Row]) -> int:
            return sum(len(smeasured.get(p, [])) for r in rs for p in r.paths)

        print(f"  표면 {surface}: 행 {len(srows)} · 파일 {len(owned)} · "
              f"판정 대상 주석 {len(surfaces[surface])}줄")
        print(f"    판정 축 {AXES} (네 경로 완료): 행 {len(full_rows)} · {line_count(full_rows)}줄")
        print(f"    일부 축만 완료:            행 {len(judged_rows) - len(full_rows)} · "
              f"{line_count(judged_rows) - line_count(full_rows)}줄")
        print(f"    미판정({AXIS_UNJUDGED}):              행 {len(open_rows)} · "
              f"{line_count(open_rows)}줄")
        for axis in AXES:
            pending = [r for r in srows if axis not in r.axis]
            print(f"    축 {axis} 미판정: 행 {len(pending)} · {line_count(pending)}줄")
    if unparsed:
        print(f"  경고: D·E 추출에 실패한 파일 {len(unparsed)}개 — 그 파일의 D·E는 표면에서 빠져 있다 "
              f"(표면 규칙은 control plane 소유다): " + ", ".join(unparsed[:8]))

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
