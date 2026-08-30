#!/usr/bin/env python3
"""여정 ↔ mockup 1:1 정합성 검사기 (stdlib 전용).

tbm_econ-opinion-monitor-journey-mockup 모델의 판정 규칙을 기계적으로 재실행한다.
**기대값은 항상 여정 문서(SSOT)와 mockup 인덱스에서 파싱한다** — 페이지 자신에게서
읽어 페이지를 검사하면 자기참조라 어떤 변조도 통과한다.

  R1  여정 → 여정 페이지 유일 (미이관분은 인덱스의 '상한' 래칫으로 관리)
  R2  여정 페이지 → 여정 유일 (`data-journey` 정확히 1건)
  R3  단계 집합 양방향 일치 (문서의 `### \\`STP-…\\`` ↔ 페이지의 `data-step`)
  R4  분기: 여정 문서 §4 의 (상황, 이어지는 단계) 쌍이 순서까지 페이지에 있고 대상으로 이동
  R5  흐름 체험 장치의 정적 조건 (단계 앵커 · 전진 버튼 · 레일 · 딥링크 핸들러)
  R6  참조 무결성: 폐기 식별자(`J1`~`J5`) 재사용 금지, 없는 여정·단계 참조 금지
  R7  인덱스 ↔ 실제 파일 ↔ 허브 링크 동기화
  R8  링크 무결성: docs/ 상대 링크가 전부 해석되고, HTML 이 `.md` 를 직접 링크하지 않는다
"""
import os, re, sys, html

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
D = lambda *p: os.path.join(ROOT, *p)
JDIR = D("docs", "user-journeys")
MDIR = D("docs", "mockups")
IDX = D("docs", "mockups", "econ-opinion-monitor-mockup-index.md")
HUB = D("docs", "index.html")
TRACKER = D("docs", "econ-opinion-monitor-design-tracker.md")

fails = []
def fail(rule, msg):
    fails.append(f"[{rule}] {msg}")
def ok(rule, msg):
    print(f"  ok  [{rule}] {msg}")

def read(p):
    with open(p, encoding="utf-8") as f:
        return f.read()

# HTML 주석은 파싱 전에 걷어 낸다 — 주석 안의 태그를 실물로 세면 오탐이 난다.
def strip_comments(h):
    return re.sub(r"<!--.*?-->", "", h, flags=re.S)

# 마크다운은 펜스·인라인 코드를 걷어 낸 뒤 링크를 센다.
def strip_code(md):
    md = re.sub(r"```.*?```", "", md, flags=re.S)
    return re.sub(r"`[^`]*`", "", md)

# ---------------------------------------------------------------- SSOT 파싱
journeys = {}   # jid -> {steps:[...], branches:[(when, jid, sid)], path}
for fn in sorted(os.listdir(JDIR)):
    if not (fn.startswith("JRN-") and fn.endswith(".md")):
        continue
    jid = fn[:-3]
    doc = read(os.path.join(JDIR, fn))
    m = re.search(r"^\| 여정 식별자 \| `([^`]+)` \|", doc, re.M)
    if not m or m.group(1) != jid:
        fail("R6", f"{fn}: 문서 정보 표의 여정 식별자와 파일명 stem 이 다르다 "
                   f"({m.group(1) if m else '없음'} vs {jid})")
    body = doc.split("## 3. 단계별 상세", 1)
    steps = re.findall(r"^### `(STP-[a-z0-9-]+)`", body[1].split("## 4.", 1)[0], re.M) \
        if len(body) > 1 else []
    branches = []
    if "## 4. 분기·예외 흐름" in doc:
        b4 = doc.split("## 4. 분기·예외 흐름", 1)[1].split("\n## ", 1)[0]
        # 헤더는 '구분선 앞의 행'으로 판정한다 — 키워드('상황')로 거르면 본문의
        # 상황 설명에 그 단어가 들어간 실제 분기 행이 조용히 사라진다.
        seen_sep = False
        for line in b4.splitlines():
            if not line.startswith("|"):
                continue
            if re.match(r"^\|[\s:-]+\|", line):
                seen_sep = True
                continue
            if not seen_sep:
                continue
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if len(cells) != 3:
                continue
            ids = re.findall(r"`(JRN-[a-z0-9-]+|STP-[a-z0-9-]+)`", cells[2])
            tj = next((i for i in ids if i.startswith("JRN-")), jid)
            ts = next((i for i in ids if i.startswith("STP-")), None)
            branches.append((cells[0], tj, ts))
    journeys[jid] = {"steps": steps, "branches": branches, "path": fn}

if not journeys:
    fail("R1", "docs/user-journeys 에 여정 문서가 없다")
ALL_STEPS = {j: set(v["steps"]) for j, v in journeys.items()}

idx = read(IDX)

# 인덱스가 등재한 여정 페이지: | `JRN-x` | `docs/mockups/x.html` | 흡수화면 | 단계… |
registered = {}
for line in idx.splitlines():
    m = re.match(r"^\| `(JRN-[a-z0-9-]+)` \| `(docs/mockups/[^`]+\.html)` \|", line)
    if m:
        registered[m.group(1)] = m.group(2)

m = re.search(r"규칙 1 미충족 여정 상한: (\d+)", idx)
if not m:
    fail("R1", "인덱스에 '규칙 1 미충족 여정 상한: N' 등재가 없다")
    CEIL = None
else:
    CEIL = int(m.group(1))

# 예외 등재(규칙 8) — 설계 트래커에서 여정 식별자를 읽는다. 현재는 0건.
tracker = read(TRACKER) if os.path.exists(TRACKER) else ""
excepted = set(re.findall(r"^\|\s*`(JRN-[a-z0-9-]+)`\s*\|.*재검토", tracker, re.M))

# ---------------------------------------------------------------- 여정 페이지 검사
pages = {}   # path -> html
for fn in sorted(os.listdir(MDIR)):
    if fn.endswith(".html"):
        pages[fn] = read(os.path.join(MDIR, fn))

declared = {}    # jid -> filename
for fn, raw in pages.items():
    h = strip_comments(raw)
    # <body …> 태그를 먼저 떼어 낸 뒤 그 안에서 센다.
    # (한 태그 안의 두 번째 data-journey 를 탐욕적 [^>]* 가 삼키는 것을 막는다)
    btags = re.findall(r"<body\b[^>]*>", h)
    cnt = sum(len(re.findall(r"\bdata-journey\s*=", t)) for t in btags)
    cnt += len(re.findall(r"\bdata-journey\s*=", re.sub(r"<body\b[^>]*>", "", h)))
    if cnt == 0:
        continue           # 화면 단위 파일 — 이 검사기의 R2 대상이 아니다(미이관분)
    if cnt > 1:
        fail("R2", f"{fn}: data-journey 를 {cnt}건 선언했다 (정확히 1건이어야 한다)")
    vals = re.findall(r'\bdata-journey\s*=\s*"([^"]+)"', h)
    jid = vals[0] if vals else None
    if jid not in journeys:
        fail("R6", f"{fn}: 존재하지 않는 여정 `{jid}` 를 선언했다")
        continue
    if jid in declared:
        fail("R1", f"여정 `{jid}` 를 선언한 페이지가 2개다: {declared[jid]}, {fn}")
    declared[jid] = fn

if declared:
    ok("R2", f"여정 페이지 {len(declared)}개, 각 1개 여정만 선언: "
             + ", ".join(f"{v}→{k}" for k, v in declared.items()))

for jid, fn in sorted(declared.items()):
    h = strip_comments(pages[fn])
    doc_steps = journeys[jid]["steps"]
    page_steps = re.findall(r'\bdata-step\s*=\s*"([^"]+)"', h)

    # R3 — 양방향 일치 (기대값은 문서에서 왔다)
    if sorted(set(page_steps)) != sorted(set(doc_steps)):
        only_doc = sorted(set(doc_steps) - set(page_steps))
        only_pg = sorted(set(page_steps) - set(doc_steps))
        fail("R3", f"{fn}: 단계 집합 불일치 — 문서에만 {only_doc}, 페이지에만 {only_pg}")
    elif len(page_steps) != len(set(page_steps)):
        fail("R3", f"{fn}: data-step 중복 선언 {page_steps}")
    else:
        ok("R3", f"{fn}: 단계 {len(doc_steps)}개 양방향 일치 ({', '.join(doc_steps)})")

    # R5 — 흐름 체험 장치의 정적 조건
    for sid in doc_steps:
        if not re.search(r'id\s*=\s*"' + re.escape(sid) + r'"', h):
            fail("R5", f"{fn}: 단계 `{sid}` 의 딥링크 앵커 id 가 없다")
    for i, sid in enumerate(doc_steps[:-1]):
        nxt = doc_steps[i + 1]
        if not re.search(r'data-advance\s*=\s*"' + re.escape(nxt) + r'"', h):
            fail("R5", f"{fn}: `{sid}` 에서 `{nxt}` 로 전진하는 주요 행동 버튼이 없다")
    for sid in doc_steps:
        if not re.search(r'data-rail\s*=\s*"' + re.escape(sid) + r'"', h):
            fail("R5", f"{fn}: 단계 레일에 `{sid}` 항목이 없다(현재 위치 표시 불가)")
    if "hashchange" not in h:
        fail("R5", f"{fn}: hashchange 처리가 없다 — `#STP-` 딥링크가 동작하지 않는다")
    if re.search(r'<(script|link)[^>]+(src|href)\s*=\s*"https?://[^"]*"', h) and \
       not re.search(r'fonts\.(googleapis|gstatic)\.com', h):
        fail("R5", f"{fn}: 웹폰트 외의 외부 자원을 로드한다(정적 동작 위반)")
    if not fails:
        pass
    ok("R5", f"{fn}: 앵커 {len(doc_steps)} · 전진 버튼 {len(doc_steps)-1} · 레일 {len(doc_steps)} · 딥링크 처리")

    # R4 — 분기: 문서가 선언한 (상황, 대상) 쌍을 순서까지 대조
    want = journeys[jid]["branches"]
    got = re.findall(r'data-goto\s*=\s*"(JRN-[a-z0-9-]+)#(STP-[a-z0-9-]+)"', h)
    want_pairs = [(tj, ts) for _, tj, ts in want]
    if got != want_pairs:
        fail("R4", f"{fn}: 분기 대상이 문서 §4 와 다르다\n"
                   f"        문서: {want_pairs}\n        페이지: {got}")
    else:
        ok("R4", f"{fn}: 분기 {len(got)}건이 문서 §4 와 순서까지 일치")
    # 분기 대상이 실재하는 여정·단계인가 + 실제 이동 대상이 해석되는가
    rows = re.findall(r'<a class="br-go" href="([^"]+)"\s*\n?\s*data-goto="(JRN-[a-z0-9-]+)#(STP-[a-z0-9-]+)"', h)
    if len(rows) != len(want_pairs):
        fail("R4", f"{fn}: 분기 링크 {len(rows)}건 / 선언 {len(want_pairs)}건 — 선택 불가능한 분기가 있다")
    for href, tj, ts in rows:
        if tj not in journeys or ts not in ALL_STEPS.get(tj, set()):
            fail("R6", f"{fn}: 분기가 존재하지 않는 식별자 `{tj}#{ts}` 를 가리킨다")
        if href.startswith("#"):
            if tj != jid:
                fail("R4", f"{fn}: 다른 여정 `{tj}` 분기를 페이지 내 앵커로 보낸다")
            elif not re.search(r'id\s*=\s*"' + re.escape(href[1:]) + r'"', h):
                fail("R4", f"{fn}: 분기 앵커 {href} 가 페이지에 없다")
        else:
            if not os.path.exists(os.path.join(MDIR, href)):
                fail("R4", f"{fn}: 분기 착지 파일 {href} 가 없다")

    # R6 — 폐기 식별자 재사용 금지
    stale = sorted(set(re.findall(r"\bJ[1-5]\b", h)))
    if stale:
        fail("R6", f"{fn}: 폐기된 구 식별자 {stale} 가 남아 있다")
    else:
        ok("R6", f"{fn}: 폐기 식별자(J1~J5) 0건")

    # R7 — 인덱스 등재와 실제 파일 일치
    want_path = f"docs/mockups/{fn}"
    if registered.get(jid) != want_path:
        fail("R7", f"인덱스의 `{jid}` 등재 경로({registered.get(jid)})가 실제({want_path})와 다르다")
    idx_steps = set(re.findall(r"`(STP-[a-z0-9-]+)`",
                               "".join(l for l in idx.splitlines()
                                       if l.startswith(f"| `{jid}` |"))))
    if idx_steps and idx_steps != set(doc_steps):
        fail("R7", f"인덱스가 등재한 `{jid}` 단계 {sorted(idx_steps)} 가 문서 {sorted(doc_steps)} 와 다르다")

for jid, path in registered.items():
    if not os.path.exists(D(*path.split("/"))):
        fail("R7", f"인덱스가 등재한 여정 페이지 {path} 가 실재하지 않는다")
    if jid not in declared:
        fail("R7", f"인덱스는 `{jid}` 를 여정 페이지로 등재했는데 그 파일이 data-journey 를 선언하지 않았다")

# ---------------------------------------------------------------- R1 래칫
unmigrated = sorted(set(journeys) - set(declared) - excepted)
if CEIL is not None:
    if len(unmigrated) > CEIL:
        fail("R1", f"여정 페이지도 예외 등재도 없는 여정 {len(unmigrated)}건 > 상한 {CEIL}: {unmigrated}")
    elif len(unmigrated) < CEIL:
        fail("R1", f"미충족 여정이 {len(unmigrated)}건으로 줄었다 — 인덱스의 상한을 "
                   f"{CEIL} → {len(unmigrated)} 로 낮춰라(래칫)")
    else:
        ok("R1", f"미이관 여정 {len(unmigrated)}건 == 상한 {CEIL} (이관 완료 "
                 f"{len(declared)}/{len(journeys)})")

# ---------------------------------------------------------------- R7 허브
hub = strip_comments(read(HUB))
hub_mock = re.findall(r'<a class="mock" href="mockups/([^"]+)"', hub)
missing = [h for h in hub_mock if not os.path.exists(os.path.join(MDIR, h))]
if missing:
    fail("R7", f"허브가 없는 mockup 파일을 링크한다: {missing}")
for jid, fn in declared.items():
    row = [l for l in hub.splitlines() if f"user-journeys/{jid}.md" in l]
    if not row:
        fail("R7", f"허브에 `{jid}` 행이 없다")
    elif f'href="mockups/{fn}"' not in "".join(row):
        fail("R7", f"허브의 `{jid}` 행이 여정 페이지 {fn} 를 가리키지 않는다")
if not missing:
    ok("R7", f"허브의 mockup 링크 {len(hub_mock)}건 전부 실재 + 이관 여정은 여정 페이지를 가리킴")

# ---------------------------------------------------------------- R8 링크 무결성
DOCS = D("docs")
total = broken = 0
md_from_html = []
for dirpath, _, files in os.walk(DOCS):
    for fn in files:
        p = os.path.join(dirpath, fn)
        if fn.endswith(".md"):
            body = strip_code(read(p))
            links = re.findall(r"\]\(([^)\s]+)\)", body)
        elif fn.endswith(".html"):
            # <script>/<style> 안의 문자열은 링크가 아니다 — reader.html 의 마크다운
            # 렌더러가 만들어 내는 `href="$2"` 같은 템플릿을 링크로 세면 오탐이 난다.
            body = strip_comments(read(p))
            body = re.sub(r"<script\b.*?</script>", "", body, flags=re.S | re.I)
            body = re.sub(r"<style\b.*?</style>", "", body, flags=re.S | re.I)
            links = re.findall(r'(?:href|src)\s*=\s*"([^"]+)"', body)
        else:
            continue
        for l in links:
            l = html.unescape(l)
            if l.startswith(("http://", "https://", "#", "mailto:", "data:")):
                continue
            target = l.split("#")[0].split("?")[0]
            if not target:
                continue
            total += 1
            if not os.path.exists(os.path.normpath(os.path.join(dirpath, target))):
                broken += 1
                fail("R8", f"{os.path.relpath(p, ROOT)}: 깨진 링크 {l}")
            if fn.endswith(".html") and target.endswith(".md") and "reader.html" not in l:
                md_from_html.append(f"{os.path.relpath(p, ROOT)} → {l}")
if md_from_html:
    fail("R8", ".nojekyll 환경에서 HTML 이 .md 를 직접 링크한다(클릭 시 다운로드) — "
               "reader.html 경유로: " + "; ".join(md_from_html))
if not broken and not md_from_html:
    ok("R8", f"docs/ 상대 링크 {total}건 전부 해석 · HTML→.md 직접 링크 0건")

# ---------------------------------------------------------------- 결과
print()
if fails:
    print(f"FAIL — 위반 {len(fails)}건")
    for f in fails:
        print("  " + f)
    sys.exit(1)
print(f"PASS — 여정 {len(journeys)}개 · 여정 페이지 {len(declared)}개 · 미이관 {len(unmigrated)}"
      f"(상한 {CEIL}) · 링크 {total}건")
