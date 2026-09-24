#!/usr/bin/env python3
"""데이터 저장 형식 변경 감지기 — 사람 리뷰 필요 여부 판정 (stdlib 전용).

PR 의 변경분(`base...head`, merge-base 기준)이 **DB 스키마 또는 데이터가 저장되는
형식**을 건드리는지 본다. 건드리지 않으면 `review-gate.yml` 이 head 커밋에
`success` commit status 를 붙이고, 건드리면 아무 status 도 붙이지 않는다.

  status 있음(success) → 저장 형식 변경 없음 → 사람 리뷰 없이 진행 가능
  status 없음          → 저장 형식 변경 있음(또는 판정 실패) → 사람 리뷰 필요

판정이 애매하면 "변경 있음" 쪽으로 기운다(fail-closed). 잘못 success 를 붙이는
비용이 리뷰 한 번 더 받는 비용보다 크기 때문이다.

보는 것은 두 가지뿐이다.
  1. 데이터 계약
     contracts/                     스키마 단일 소스(JSON Schema · Avro) + 코드젠
     go/gen/, econ_core/models/     contracts → 생성된 레코드 타입
     그리고 배치 생산자(ingestion·analysis·aggregation)에서 **계약 필드에 값을
     대입하는 줄**(주석 줄 제외 — `bucket_unit=unit`, `"bucket_unit": unit` 처럼;
     스키마는 그대로여도 저장되는 값의 형식이 바뀔 수 있다). 계약 필드 이름은
     contracts/ 에서 직접 읽는다.
  2. 게이트 자신(이 스크립트 · 워크플로)
     PR 이 판정기를 고쳐 스스로 통과하지 못하게 한다.

직렬화·레이크 경로(storage.py · domain.py · go/internal/store/ · 입출력 호출 ·
데이터셋 상수), data/, 볼륨·마운트(PVC · ECON_DATA_ROOT 등)는 **보지 않는다** —
그런 변경은 일반 리뷰 몫이다(2026-09 결정으로 규칙에서 뺐다).

  python3 scripts/check-data-format-change.py <base-sha> <head-sha>

종료 코드: 0 = 판정 완료(결과는 stdout 마지막 줄 / $GITHUB_OUTPUT), 2 = 판정 실패.
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys

# ── 경로 규칙: 이 경로의 파일이 추가·수정·삭제·이름변경되면 곧 형식 변경 ──────────
SENSITIVE_PATHS: list[tuple[str, str]] = [
    ("contracts/**", "스키마 계약(contracts/) — JSON Schema·Avro·코드젠"),
    ("go/gen/**", "contracts 에서 생성된 Go 레코드 타입"),
    ("python/packages/core/src/econ_core/models/**", "contracts 에서 생성된 Python 레코드 타입"),
    (".github/workflows/review-gate.yml", "리뷰 게이트 워크플로 자체"),
    ("scripts/check-data-format-change.py", "리뷰 게이트 판정기 자체"),
]

# 경로 규칙에서 빼는 것.
PATH_EXCLUDES: list[str] = []

# ── 내용 규칙: 추가·삭제된 줄이 이 패턴에 걸리면 형식 변경 ─────────────────────────
# (파일 glob 목록, 줄 정규식, 이유) — 고정 규칙은 없고, 계약 필드 대입 규칙
# (`field_assignment_rule`)만 contracts/ 에서 읽어 덧붙인다.
CONTENT_RULES: list[tuple[list[str], re.Pattern[str], str]] = []

# 배치 생산자 — 계약 필드에 값을 채우는 코드가 사는 곳.
PRODUCER_GLOBS: list[str] = [
    "python/packages/ingestion/src/**/*.py",
    "python/packages/analysis/src/**/*.py",
    "python/packages/aggregation/src/**/*.py",
]

# 주석 줄은 형식을 바꾸지 않는다.
COMMENT_LINE = re.compile(r"^\s*(#|//)")

# 내용 규칙에서 빼는 것 — 테스트 코드는 대상이 아니다.
CONTENT_EXCLUDES: list[str] = [
    "**/tests/**",
    "**/*_test.go",
    "**/test_*.py",
]


def _glob_to_regex(pattern: str) -> re.Pattern[str]:
    """`**` 는 디렉터리 경계를 넘고 `*`·`?` 는 넘지 않는 glob → 정규식."""
    out = []
    i = 0
    while i < len(pattern):
        c = pattern[i]
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif c == "*":
            out.append("[^/]*")
            i += 1
        elif c == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(c))
            i += 1
    return re.compile("".join(out) + r"\Z")


_GLOB_CACHE: dict[str, re.Pattern[str]] = {}


def match(path: str, pattern: str) -> bool:
    rx = _GLOB_CACHE.get(pattern)
    if rx is None:
        rx = _GLOB_CACHE[pattern] = _glob_to_regex(pattern)
    return bool(rx.match(path))


def match_any(path: str, patterns: list[str]) -> bool:
    return any(match(path, p) for p in patterns)


def contract_fields(root: str = ".") -> set[str]:
    """contracts/ 의 모든 레코드 필드 이름(Avro `fields` · JSON Schema `properties`)."""
    names: set[str] = set()

    def walk(node: object) -> None:
        if isinstance(node, dict):
            if isinstance(node.get("fields"), list):
                names.update(
                    f["name"] for f in node["fields"] if isinstance(f, dict) and "name" in f
                )
            if isinstance(node.get("properties"), dict):
                names.update(node["properties"])
            for value in node.values():
                walk(value)
        elif isinstance(node, list):
            for value in node:
                walk(value)

    for dirpath, _, files in os.walk(os.path.join(root, "contracts")):
        for name in files:
            if name.endswith((".avsc", ".schema.json")):
                with open(os.path.join(dirpath, name), encoding="utf-8") as fh:
                    walk(json.load(fh))
    return names


def field_assignment_rule(fields: set[str]) -> tuple[list[str], re.Pattern[str], str] | None:
    if not fields:
        return None
    alt = "|".join(sorted(map(re.escape, fields), key=len, reverse=True))
    return (
        PRODUCER_GLOBS,
        # ruff format 이 강제하는 모양에 기댄다: 키워드 인자는 `field=value`(공백 없음),
        # 지역 변수 대입은 `field = value`(공백 있음) — 후자는 잡지 않는다.
        # dict 리터럴 `"field": value` 도 레코드를 직접 짓는 모양이라 잡는다.
        re.compile(rf"(?<![\w.])({alt})=(?!=)|[\"']({alt})[\"']\s*:"),
        "배치 생산자가 계약 필드에 채우는 값 변경",
    )


def git(*args: str) -> str:
    return subprocess.run(
        ["git", *args], check=True, capture_output=True, text=True, encoding="utf-8"
    ).stdout


def changed_paths(base: str, head: str) -> list[str]:
    """merge-base 이후 바뀐 경로. 이름변경·복사는 옛 경로와 새 경로를 모두 센다."""
    out = git("diff", "--name-status", "-M", "-z", f"{base}...{head}")
    tokens = out.split("\0")
    paths: list[str] = []
    i = 0
    while i < len(tokens) and tokens[i]:
        status = tokens[i]
        if status[0] in "RC":
            paths += [tokens[i + 1], tokens[i + 2]]
            i += 3
        else:
            paths.append(tokens[i + 1])
            i += 2
    return sorted(set(paths))


def changed_lines(base: str, head: str, path: str) -> list[str]:
    """해당 파일에서 추가·삭제된 줄(맥락 줄 제외). 바이너리면 판정 불가로 본다."""
    out = git("diff", "-U0", "--no-color", "--no-ext-diff", f"{base}...{head}", "--", path)
    if "Binary files" in out and "differ" in out:
        return ["<binary>"]
    lines = []
    for line in out.splitlines():
        if line.startswith(("+++", "---")):
            continue
        if line.startswith(("+", "-")):
            lines.append(line[1:])
    return lines


def evaluate(base: str, head: str) -> list[tuple[str, str, str]]:
    """형식 변경 근거 목록 [(경로, 이유, 근거 줄)] — 비었으면 변경 없음."""
    hits: list[tuple[str, str, str]] = []
    content_rules = list(CONTENT_RULES)
    extra = field_assignment_rule(contract_fields())
    if extra:
        content_rules.append(extra)
    for path in changed_paths(base, head):
        path_hit = False
        if not match_any(path, PATH_EXCLUDES):
            for pattern, reason in SENSITIVE_PATHS:
                if match(path, pattern):
                    hits.append((path, reason, ""))
                    path_hit = True
                    break
        if path_hit or match_any(path, CONTENT_EXCLUDES):
            continue
        rules = [(rx, reason) for globs, rx, reason in content_rules if match_any(path, globs)]
        if not rules:
            continue
        for line in changed_lines(base, head, path):
            if COMMENT_LINE.match(line):
                continue
            for rx, reason in rules:
                if line == "<binary>" or rx.search(line):
                    hits.append((path, reason, line.strip()[:160]))
                    break
    return hits


def write_outputs(changed: bool, hits: list[tuple[str, str, str]]) -> None:
    gh_out = os.environ.get("GITHUB_OUTPUT")
    if gh_out:
        with open(gh_out, "a", encoding="utf-8") as fh:
            fh.write(f"format_changed={'true' if changed else 'false'}\n")
    summary = os.environ.get("GITHUB_STEP_SUMMARY")
    if summary:
        with open(summary, "a", encoding="utf-8") as fh:
            if not changed:
                fh.write(
                    "### ✅ 데이터 저장 형식 변경 없음\n\n"
                    "사람 리뷰 불필요 — success status 를 붙인다.\n"
                )
            else:
                fh.write("### 👀 데이터 저장 형식 변경 감지 — 사람 리뷰 필요\n\n")
                fh.write("| 파일 | 이유 | 근거 줄(첫 줄) | 건수 |\n|---|---|---|---|\n")
                for (path, reason), (line, count) in _group(hits).items():
                    cell = line.replace("|", "\\|").replace("`", "'")
                    shown = f"`{cell}`" if cell else ""
                    fh.write(f"| `{path}` | {reason} | {shown} | {count} |\n")


def _group(hits: list[tuple[str, str, str]]) -> dict[tuple[str, str], tuple[str, int]]:
    """(경로, 이유) 별로 첫 근거 줄과 건수만 남긴다 — 요약이 diff 전체가 되지 않게."""
    grouped: dict[tuple[str, str], tuple[str, int]] = {}
    for path, reason, line in hits:
        first, count = grouped.get((path, reason), (line, 0))
        grouped[(path, reason)] = (first, count + 1)
    return grouped


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__.strip().splitlines()[0], file=sys.stderr)
        print("usage: check-data-format-change.py <base-sha> <head-sha>", file=sys.stderr)
        return 2
    base, head = argv[1], argv[2]
    try:
        hits = evaluate(base, head)
    except subprocess.CalledProcessError as exc:
        print(f"::error::git 실패 — 판정 불가: {exc.stderr.strip()}", file=sys.stderr)
        return 2

    changed = bool(hits)
    for (path, reason), (line, count) in _group(hits).items():
        print(f"CHANGED  {path}  — {reason} ({count})" + (f"\n         {line}" if line else ""))
    write_outputs(changed, hits)
    print(f"format_changed={'true' if changed else 'false'}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
