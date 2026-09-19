#!/usr/bin/env python3
"""목업 ↔ 구현 렌더링 정합성 검사기 — 규칙 3·5 (stdlib 전용).

`tbm_econ-opinion-monitor-mockup-render` 모델의 판정 규칙 중 **기계로 재현할 수 있는
두 축**을 매 PR 재실행한다.

  R3  컴포넌트·패턴 이름 대조
      디자인 시스템이 정의한 `CMP-*`/`PAT-*` 가, 그 항목을 쓴다고 mockup 인덱스가
      선언한 화면 중 **구현된 화면**(`App.tsx` 의 `BUILT`)의 소스에서 같은 이름으로
      마킹돼 있는가. 역방향(구현에만 있는 이름)도 본다.
  R5  구조·수치 대조
      in-scope 목업의 인라인 `<style>` 과 `web/src/tokens/tokens.css` 가 **공통으로
      선언한 선택자**의 선언값이 일치하는가. 양쪽 다 CSS 라 환산 없이 직접 댄다.

왜 게이트가 필요한가 — 이 두 축은 이 모델 등록 이래 사이클마다 사람이 새로 세었고
셀 때마다 수가 달라졌다(같은 tip 에서 마커가 12종으로도 15종으로도 세어졌다: `tokens.css`
만 보면 12, 셸 TSX 주석까지 보면 15). 판정면이 사람마다 다르면 수렴 여부를 말할 수 없다.
게다가 잔여를 적어 두는 `docs/econ-opinion-monitor-design-tracker.md` 는 모델의 양 side
버전 범위 **밖**이라(`docs/` 루트) 그 파일이 바뀌어도 재감지가 걸리지 않는다 — 기계가
없으면 잔여는 다음 트리거가 우연히 올 때까지 미판정으로 남는다.

**기대값은 언제나 SSOT 에서 파싱한다.**
  정의       docs/design-system/econ-opinion-monitor-design-system.md
  사용처     docs/mockups/econ-opinion-monitor-mockup-index.md
  판정 대상  web/src/App.tsx 의 `BUILT`
  허용목록   docs/econ-opinion-monitor-design-tracker.md 의 「규칙 3·5 기계 판정」 절
구현 소스에서 기대값을 읽으면 자기참조라 어떤 이탈도 통과한다.

허용목록은 **래칫**이다 — 실측이 상한을 넘으면 실패하고, 밑돌면 상한을 낮추라고 실패한다.

  python3 scripts/check-mockup-render.py [repo-root]
"""
import os
import re
import sys

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
D = lambda *p: os.path.join(ROOT, *p)

DS = D("docs", "design-system", "econ-opinion-monitor-design-system.md")
IDX = D("docs", "mockups", "econ-opinion-monitor-mockup-index.md")
TRACKER = D("docs", "econ-opinion-monitor-design-tracker.md")
APP = D("web", "src", "App.tsx")
TOKENS = D("web", "src", "tokens", "tokens.css")
WEBSRC = D("web", "src")

fails = []
notes = []


def fail(rule, msg):
    fails.append("[%s] %s" % (rule, msg))


def ok(rule, msg):
    notes.append("[%s] %s" % (rule, msg))


def read(path):
    with open(path, encoding="utf-8") as fh:
        return fh.read()


def definitions():
    """디자인 시스템이 정의한 CMP-*/PAT-* 식별자 집합 (정의 표의 첫 칸)."""
    return set(re.findall(r"^\|\s*`((?:CMP|PAT)-[a-z0-9-]+)`", read(DS), re.M))


def screen_files():
    """화면 id -> mockup 파일 경로 (「Mockup 파일」 표)."""
    out = {}
    for line in read(IDX).splitlines():
        m = re.match(r"^\|\s*`([a-z]+)`\s*\|\s*`([^`]+\.html)`", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def absorbed_screens():
    """여정 식별자 -> 흡수한 화면 id **집합** (「여정 페이지」 표).

    한 여정 페이지는 화면을 **여럿** 흡수한다(`JRN-daily-scan` ∋ `dash`·`trend`,
    `JRN-spike-verification` ∋ `fairness`·`trace`). 이전 판은 「흡수한 화면」 칸의 첫 id
    하나만 집어 둘째 화면을 조용히 버렸고, 그 화면이 `BUILT` 에 들어오는 순간
    `items_by_screen()` 이 키를 만들지 못해 「인덱스에 디자인 시스템 항목 절이 없다」로
    떨어졌다 — 인덱스는 그 화면의 행도 항목 절도 갖고 있는데도. 칸 전체에서 읽는다.
    """
    out = {}
    for line in read(IDX).splitlines():
        m = re.match(r"^\|\s*`(JRN-[a-z0-9-]+)`\s*\|\s*`[^`]+`\s*\|([^|]*)\|", line)
        if m:
            out[m.group(1)] = set(re.findall(r"`([a-z]+)`", m.group(2)))
    return out


def items_by_screen():
    """화면 id -> 그 화면이 쓴다고 인덱스가 선언한 디자인 시스템 항목 집합.

    섹션 제목의 백틱 토큰이 화면 id 이거나(`reprocess`), 화면을 흡수한 여정 식별자다
    (`JRN-axis-contrast` -> `compare`, `JRN-daily-scan` -> `dash`·`trend`). 여정 절의
    항목은 그 여정이 흡수한 **모든** 화면에 귀속된다 — 흡수된 화면들은 한 페이지를
    공유하므로 같은 항목 집합을 갖는다.
    """
    absorbed = absorbed_screens()
    out = {}
    key = None
    for line in read(IDX).splitlines():
        if line.startswith("### "):
            m = re.search(r"`([A-Za-z0-9-]+)`", line)
            key = m.group(1) if m else None
            continue
        if key and line.startswith("- **디자인 시스템 항목**"):
            items = set(re.findall(r"`((?:CMP|PAT)-[a-z0-9-]+)`", line))
            for screen in absorbed.get(key, {key}):
                out.setdefault(screen, set()).update(items)
            key = None
    return out


def built_screens():
    """구현이 실제 화면을 렌더하는 화면 id 집합 (`App.tsx` 의 `BUILT`)."""
    m = re.search(r"const\s+BUILT\s*=\s*new\s+Set\(\[(.*?)\]\)", read(APP), re.S)
    if not m:
        fail("R3", "web/src/App.tsx 에서 `BUILT` 집합을 찾지 못했다 — 판정 대상을 정할 수 없다")
        return set()
    return set(re.findall(r'"([a-z]+)"', m.group(1)))


def markers():
    """web/src 의 주석에 마킹된 CMP-*/PAT-* 이름 집합.

    CSS 구획 주석과 TS/TSX 줄 주석을 모두 본다 — 셸 컴포넌트는 CSS 가 아니라 TSX 에서
    이름을 갖는다. `CMP-a / b` 형태의 결합 마커는 이름별로 분해해 센다.
    """
    found = set()
    for base, _dirs, files in os.walk(WEBSRC):
        for name in sorted(files):
            if not name.endswith((".css", ".ts", ".tsx")):
                continue
            text = read(os.path.join(base, name))
            comments = re.findall(r"/\*.*?\*/", text, re.S) + re.findall(r"//[^\n]*", text)
            for c in comments:
                found.update(re.findall(r"(?:CMP|PAT)-[a-z0-9-]+", c))
                for pref, tail in re.findall(
                        r"((?:CMP|PAT))-[a-z0-9-]+((?:\s*/\s*[a-z0-9-]+)+)", c):
                    for part in tail.split("/")[1:]:
                        found.add("%s-%s" % (pref, part.strip()))
    return found


def tracker_section():
    """tracker 의 「규칙 3·5 기계 판정」 절 본문."""
    m = re.search(r"### 규칙 3·5 기계 판정.*?(?=\n## |\Z)", read(TRACKER), re.S)
    if not m:
        fail("R0", "tracker 에 「규칙 3·5 기계 판정」 절이 없다 — 게이트가 읽을 허용목록이 없다")
        return ""
    return m.group(0)


def r3_exceptions(section):
    """식별자 -> 종류 (`미구현` / `구현 전용` / `귀속`)."""
    out = {}
    for line in section.splitlines():
        m = re.match(r"^\|\s*`((?:CMP|PAT)-[a-z0-9-]+)`\s*\|\s*([^|]+?)\s*\|", line)
        if m:
            out[m.group(1)] = m.group(2)
    return out


def r5_caps(section):
    caps = {}
    for label, key in (("값 충돌", "conflict"),
                       ("목업 전용 선언", "mock_only"),
                       ("구현 전용 선언", "impl_only")):
        m = re.search(r"%s 상한: (\d+)" % label, section)
        if m:
            caps[key] = int(m.group(1))
    return caps


def css_rules(css):
    """최상위 규칙을 (선택자, 선언 본문) 목록으로 쪼갠다."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    depth, buf, sel, out = 0, "", None, []
    for ch in css:
        if ch == "{":
            if depth == 0:
                sel, buf = buf.strip(), ""
            else:
                buf += ch
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                out.append((sel, buf.strip()))
                buf, sel = "", None
            else:
                buf += ch
        else:
            buf += ch
    return out


def norm_value(v):
    """표기 차이를 지운다 — 값이 같은데 다르게 적힌 것을 차이로 세지 않기 위해."""
    v = " ".join(v.split()).strip().rstrip(";")
    v = v.replace("'", '"')                                    # 폰트 스택 따옴표
    v = re.sub(r"(?<![\w.])\.(\d)", r"0.\1", v)                # .03em -> 0.03em
    v = re.sub(r"-\.(\d)", r"-0.\1", v)
    v = re.sub(r"#([0-9a-fA-F]{3,8})", lambda m: "#" + m.group(1).lower(), v)
    v = re.sub(r"\s*,\s*", ",", v)
    v = re.sub(r"(\d)\.(\d*?)0+\b", lambda m: m.group(1) + ("." + m.group(2) if m.group(2) else ""), v)
    v = re.sub(r"\b(\d+)\.\b", r"\1", v)
    v = re.sub(r"\b0px\b", "0", v)
    return v


def expand(prop, value):
    """margin/padding shorthand 를 longhand 로 펴 표기 차이를 지운다."""
    if prop not in ("margin", "padding"):
        return {prop: value}
    parts = value.split()
    if len(parts) == 1:
        top = right = bottom = left = parts[0]
    elif len(parts) == 2:
        top = bottom = parts[0]
        right = left = parts[1]
    elif len(parts) == 3:
        top, right, bottom = parts
        left = right
    elif len(parts) == 4:
        top, right, bottom, left = parts
    else:
        return {prop: value}
    return {"%s-top" % prop: top, "%s-right" % prop: right,
            "%s-bottom" % prop: bottom, "%s-left" % prop: left}


def declarations(body):
    out = {}
    for decl in re.split(r";(?![^(]*\))", body):
        if ":" not in decl:
            continue
        prop, value = decl.split(":", 1)
        prop = prop.strip().lower()
        if not prop or prop.startswith("/"):
            continue
        for key, val in expand(prop, " ".join(value.split())).items():
            out[key] = norm_value(val)
    return out


def css_index(rules):
    """선택자 -> 선언 맵. `@media` 블록은 조건이 달라 대조 대상에서 뺀다."""
    out = {}
    for sel, body in rules:
        if sel.startswith("@"):
            continue
        for one in sel.split(","):
            one = " ".join(one.split())
            out.setdefault(one, {}).update(declarations(body))
    return out


def inline_css(html):
    return "\n".join(re.findall(r"<style[^>]*>(.*?)</style>", html, re.S))


def check_r3(section):
    defined = definitions()
    if not defined:
        fail("R3", "디자인 시스템 문서에서 `CMP-*`/`PAT-*` 정의를 하나도 읽지 못했다")
        return
    per_screen = items_by_screen()
    built = built_screens()
    unknown = built - set(per_screen)
    if unknown:
        fail("R3", "`BUILT` 의 화면 %s 가 mockup 인덱스에 디자인 시스템 항목 절을 갖지 않는다"
             % ", ".join(sorted(unknown)))
    in_scope = set()
    for screen in built:
        in_scope |= per_screen.get(screen, set())
    undefined = in_scope - defined
    if undefined:
        fail("R3", "인덱스가 참조하는데 디자인 시스템에 정의되지 않은 항목: %s"
             % ", ".join(sorted(undefined)))

    marked = markers()
    exceptions = r3_exceptions(section)
    missing = sorted((in_scope & defined) - marked)
    extra = sorted(marked - defined)
    allowed_missing = sorted(k for k, v in exceptions.items() if v != "구현 전용")
    allowed_extra = sorted(k for k, v in exceptions.items() if v == "구현 전용")

    only_real = [x for x in missing if x not in allowed_missing]
    only_stale = [x for x in allowed_missing if x not in missing]
    if only_real:
        fail("R3", "구현에 이름이 없는 in-scope 항목이 허용목록에 없다: %s — 마커를 달거나 "
                   "「규칙 3·5 기계 판정」 표에 사유와 함께 등재하라" % ", ".join(only_real))
    if only_stale:
        fail("R3", "허용목록에 있는데 실측에서는 해소된 항목: %s — 등재를 걷어라(래칫)"
             % ", ".join(only_stale))

    only_real = [x for x in extra if x not in allowed_extra]
    only_stale = [x for x in allowed_extra if x not in extra]
    if only_real:
        fail("R3", "디자인 시스템에 없는 이름이 구현에 마킹돼 있다: %s — 정의에 넣거나 "
                   "「구현 전용」으로 등재하라" % ", ".join(only_real))
    if only_stale:
        fail("R3", "「구현 전용」으로 등재됐는데 실측에 없는 이름: %s — 등재를 걷어라(래칫)"
             % ", ".join(only_stale))

    ok("R3", "in-scope %d종(%s) — 이름 대조 성립 %d · 등재 예외 %d · 구현 전용 %d"
       % (len(in_scope & defined), " ∪ ".join(sorted(built)),
          len((in_scope & defined)) - len(missing), len(missing), len(extra)))


def check_r5(section):
    built = built_screens()
    files = screen_files()
    impl = css_index(css_rules(read(TOKENS)))

    conflict, mock_only, impl_only = [], [], []
    for screen in sorted(built):
        rel = files.get(screen)
        if not rel:
            fail("R5", "`BUILT` 의 화면 `%s` 에 대응하는 mockup 파일이 인덱스 표에 없다" % screen)
            continue
        path = D(*rel.split("/"))
        if not os.path.exists(path):
            fail("R5", "인덱스가 가리키는 mockup 파일이 없다: %s" % rel)
            continue
        mock = css_index(css_rules(inline_css(read(path))))
        for sel in sorted(set(mock) & set(impl)):
            a, b = mock[sel], impl[sel]
            for prop in sorted(set(a) | set(b)):
                if prop in a and prop in b:
                    if a[prop] != b[prop]:
                        conflict.append((screen, sel, prop, a[prop], b[prop]))
                elif prop in a:
                    mock_only.append((screen, sel, prop, a[prop]))
                else:
                    impl_only.append((screen, sel, prop, b[prop]))

    caps = r5_caps(section)
    if len(caps) < 3:
        fail("R5", "tracker 의 「규칙 3·5 기계 판정」 절에서 상한 3종(값 충돌 · 목업 전용 선언 · "
                   "구현 전용 선언)을 모두 읽지 못했다")
        return

    for label, key, rows, render in (
        ("값 충돌", "conflict", conflict,
         lambda r: "%s  %s { %s: 목업 %s ↔ 구현 %s }" % r),
        ("목업 전용 선언", "mock_only", mock_only,
         lambda r: "%s  %s { %s: %s } 가 구현에 없음" % r),
        ("구현 전용 선언", "impl_only", impl_only,
         lambda r: "%s  %s { %s: %s } 가 목업에 없음" % r),
    ):
        cap, actual = caps[key], len(rows)
        if actual > cap:
            listing = "\n      ".join(render(r) for r in rows[:40])
            more = "" if actual <= 40 else "\n      … 외 %d건" % (actual - 40)
            fail("R5", "%s %d건이 상한 %d 을 넘는다:\n      %s%s"
                 % (label, actual, cap, listing, more))
        elif actual < cap:
            fail("R5", "%s 실측 %d건이 상한 %d 보다 적다 — 상한을 %d 로 낮춰라(래칫)"
                 % (label, actual, cap, actual))
        else:
            ok("R5", "%s %d건 = 상한 %d" % (label, actual, cap))


def report():
    for line in notes:
        print("  ok   %s" % line)
    for line in fails:
        print("  FAIL %s" % line)
    if fails:
        print("\n목업 ↔ 구현 렌더링 정합성(규칙 3·5) 실패 %d건" % len(fails))
        return 1
    print("\n목업 ↔ 구현 렌더링 정합성(규칙 3·5) 통과")
    return 0


def main():
    for path in (DS, IDX, TRACKER, APP, TOKENS):
        if not os.path.exists(path):
            fail("R0", "필수 파일 없음: %s" % os.path.relpath(path, ROOT))
    if fails:
        return report()
    section = tracker_section()
    check_r3(section)
    check_r5(section)
    return report()


if __name__ == "__main__":
    sys.exit(main())
