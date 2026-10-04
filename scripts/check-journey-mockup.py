#!/usr/bin/env python3
"""여정 ↔ mockup 1:1 정합성 검사기 (stdlib 전용).

tbm_econ-opinion-monitor-journey-mockup 모델의 판정 규칙을 기계적으로 재실행한다.
**기대값은 항상 여정 문서(SSOT)와 mockup 인덱스에서 파싱한다** — 페이지 자신에게서
읽어 페이지를 검사하면 자기참조라 어떤 변조도 통과한다.

  R1  여정 → 여정 페이지 유일 (미이관분은 인덱스의 '상한' 래칫으로 관리)
  R2  여정 페이지 → 여정 유일 (`data-journey` 정확히 1건)
  R3  단계 집합 양방향 일치 (문서의 `### \\`STP-…\\`` ↔ 페이지의 `data-step`)
  R4  분기: 여정 문서 §4 의 (상황, 이어지는 단계) 쌍이 순서까지 페이지에 있고 대상으로 이동
  R5  프로토타입 충실도의 정적 조건 (단계 앵커 · 화면 내 전진 버튼 · 메타 레이어 분리 ·
      실제 폼 요소 · data-state ↔ 인덱스 등재 · 딥링크 핸들러 · 외부 자원)
  R9  DOM 하네스가 레포에 있고 CI 워크플로에 실제로 걸려 있으며, **여정 페이지마다**
      그 페이지를 실제로 굴리는 시나리오가 있다
  R6  참조 무결성: 폐기 식별자(`J1`~`J5`) 재사용 금지, 없는 여정·단계 참조 금지
  R7  인덱스 ↔ 실제 파일 ↔ 허브 링크 동기화
  R8  링크 무결성: docs/ 상대 링크가 전부 해석되고, HTML 이 `.md` 를 직접 링크하지 않는다
  R10 인덱스·설계 트래커의 **서술 절이 재진술한 숫자**가 실측과 같다(규칙 7 의 기계화 —
      표와 래칫만 갱신하고 산문을 남겨 두 SSOT 가 서로 다른 사실을 말하는 것을 잡는다)
  R11 설계 트래커 「문서 목록」의 mockup 파일 등재 ↔ 실파일 양방향 일치
  R12 **현재형 서술이 가리키는 mockup 파일이 실재한다** (규칙 7 의 기계화 — R10 의 파일 참조판)
  R13 **좌측 네비에 관한 산문 주장이 실측과 같다** (규칙 7 의 기계화 — R10 의 정성 서술판).
"""
import os, re, sys, html

ROOT = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else ".")
D = lambda *p: os.path.join(ROOT, *p)
JDIR = D("docs", "user-journeys")
MDIR = D("docs", "mockups")
IDX = D("docs", "mockups", "econ-opinion-monitor-mockup-index.md")
HUB = D("docs", "index.html")
TRACKER = D("docs", "econ-opinion-monitor-design-tracker.md")
JREADME = D("docs", "user-journeys", "README.md")

def _product_plane(h):
    """메타 레이어와 <head>·<body> 여는 태그를 걷어 낸 제품 평면 마크업만 돌려준다."""
    body_only = h.split("<body", 1)[-1]
    body_only = body_only.split(">", 1)[-1]      # <body …> 태그 자체(= data-journey 선언)를 뺀다
    return re.sub(r"<details[^>]*data-meta-layer.*?</details>", "", body_only, flags=re.S)

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

def strip_code(md):
    md = re.sub(r"```.*?```", "", md, flags=re.S)
    return re.sub(r"`[^`]*`", "", md)

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

# 인덱스 「상태 변형 등재」— 여정별 상태 id 집합. 하네스와 같은 표를 읽는다(단일 등재).
registered_states = {}
_sec = idx.split("### 상태 변형 등재")
if len(_sec) > 1:
    for chunk in _sec[1].split("#### `")[1:]:
        _jid = chunk.split("`")[0]
        body = chunk.split("\n### ")[0]
        ids, sep = [], False
        for line in body.splitlines():
            if not line.startswith("|"):
                if sep and ids:
                    break
                continue
            if re.match(r"^\|[\s:-]+\|", line):
                sep = True
                continue
            if not sep:
                continue
            first = line.strip().lstrip("|").split("|")[0].strip()
            mm = re.match(r"`([a-z0-9-]+)`", first)
            if mm:
                ids.append(mm.group(1))
        registered_states[_jid] = ids

m5 = re.search(r"규칙 5 미충족 mockup 페이지 상한: (\d+)", idx)
if not m5:
    fail("R5", "인덱스에 '규칙 5 미충족 mockup 페이지 상한: N' 등재가 없다")
    CEIL5 = None
else:
    CEIL5 = int(m5.group(1))

m = re.search(r"규칙 1 미충족 여정 상한: (\d+)", idx)
if not m:
    fail("R1", "인덱스에 '규칙 1 미충족 여정 상한: N' 등재가 없다")
    CEIL = None
else:
    CEIL = int(m.group(1))

tracker = read(TRACKER) if os.path.exists(TRACKER) else ""
excepted = set(re.findall(r"^\|\s*`(JRN-[a-z0-9-]+)`\s*\|.*재검토", tracker, re.M))

pages = {}
for fn in sorted(os.listdir(MDIR)):
    if fn.endswith(".html"):
        pages[fn] = read(os.path.join(MDIR, fn))

declared = {}
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

    if sorted(set(page_steps)) != sorted(set(doc_steps)):
        only_doc = sorted(set(doc_steps) - set(page_steps))
        only_pg = sorted(set(page_steps) - set(doc_steps))
        fail("R3", f"{fn}: 단계 집합 불일치 — 문서에만 {only_doc}, 페이지에만 {only_pg}")
    elif len(page_steps) != len(set(page_steps)):
        fail("R3", f"{fn}: data-step 중복 선언 {page_steps}")
    else:
        ok("R3", f"{fn}: 단계 {len(doc_steps)}개 양방향 일치 ({', '.join(doc_steps)})")

    # (c)(d)(e) 의 배선·동작은 정적으로 판정할 수 없다 — 여기서는 "그 판정이 가능한 형태인가"
    # 까지만 보고, 실제 구동은 R9 가 보장하는 DOM 하네스가 맡는다.
    for sid in doc_steps:
        if not re.search(r'id\s*=\s*"' + re.escape(sid) + r'"', h):
            fail("R5", f"{fn}: 단계 `{sid}` 의 딥링크 앵커 id 가 없다")
    for i, sid in enumerate(doc_steps[:-1]):
        nxt = doc_steps[i + 1]
        if not re.search(r'data-advance\s*=\s*"' + re.escape(nxt) + r'"', h):
            fail("R5", f"{fn}: `{sid}` 에서 `{nxt}` 로 전진하는 화면 내 행동이 없다")
    if "hashchange" not in h:
        fail("R5", f"{fn}: hashchange 처리가 없다 — `#STP-` 딥링크가 동작하지 않는다")

    mlayer = re.search(r'<details([^>]*\bdata-meta-layer\b[^>]*)>', h)
    if not mlayer:
        fail("R5", f"{fn}: 문서 메타를 담는 <details data-meta-layer> 보조 레이어가 없다")
    elif re.search(r'\bopen\b', mlayer.group(1)):
        fail("R5", f"{fn}: 메타 레이어가 기본으로 펼쳐져 있다 — 제품이 지배면이어야 한다")
    else:
        outside = _product_plane(h)
        outside = re.sub(r'<(script|style)\b.*?</\1>', '', outside, flags=re.S)
        outside = re.sub(r'<[^>]+>', ' ', outside)
        leaked = sorted(set(re.findall(r'STP-[a-z0-9-]+|JRN-[a-z0-9-]+', outside)))
        if leaked:
            fail("R5", f"{fn}: 제품 평면의 텍스트에 문서 식별자가 노출된다: {leaked}")

    for sid in doc_steps:
        sec = re.search(r'<section[^>]*data-step\s*=\s*"' + re.escape(sid) + r'".*?</section>', h, re.S)
        if not sec:
            fail("R5", f"{fn}: 단계 `{sid}` 의 <section> 을 찾지 못했다")
        elif not re.search(r'<(input|select|textarea)\b', sec.group(0)):
            fail("R5", f"{fn}: 단계 `{sid}` 에 실제 폼 요소(<input>/<select>/<textarea>)가 없다")

    # (d) 모양만 입력인 관용구 금지 — 화면 단위 목업이 쓰던 <div class="seg"><button>…
    #     세그먼트 컨트롤은 실제 폼 요소가 아니다. 여정 페이지에서는 쓰지 않는다.
    if re.search(r'class\s*=\s*"[^"]*\bseg\b[^"]*"', _product_plane(h)):
        fail("R5", f"{fn}: 제품 평면에 세그먼트 의사(擬似) 컨트롤(class=\"seg\")이 있다 — "
                   "실제 <select>/<input type=radio> 로 대체해야 한다")

    want_states = registered_states.get(jid)
    got_states = re.findall(r'data-state\s*=\s*"([a-z0-9-]+)"', h)
    if want_states is None:
        fail("R5", f"{fn}: 인덱스 「상태 변형 등재」에 `{jid}` 절이 없다(규칙 5(e) 기록 누락)")
    elif sorted(set(got_states)) != sorted(set(want_states)):
        fail("R5", f"{fn}: data-state 집합 {sorted(set(got_states))} 가 "
                   f"인덱스 등재 {sorted(set(want_states))} 와 다르다")
    if len(got_states) != len(set(got_states)):
        fail("R5", f"{fn}: data-state 중복 선언 {got_states}")

    if re.search(r'<(script|link)[^>]+(src|href)\s*=\s*"https?://[^"]*"', h) and \
       not re.search(r'fonts\.(googleapis|gstatic)\.com', h):
        fail("R5", f"{fn}: 웹폰트 외의 외부 자원을 로드한다(정적 동작 위반)")
    ok("R5", f"{fn}: 앵커 {len(doc_steps)} · 화면 내 전진 {len(doc_steps)-1} · "
             f"메타 레이어 접힘 · 상태 {len(set(got_states))} · 딥링크 처리")

    want = journeys[jid]["branches"]
    got = re.findall(r'data-goto\s*=\s*"(JRN-[a-z0-9-]+)#(STP-[a-z0-9-]+)"', h)
    want_pairs = [(tj, ts) for _, tj, ts in want]
    if got != want_pairs:
        fail("R4", f"{fn}: 분기 대상이 문서 §4 와 다르다\n"
                   f"        문서: {want_pairs}\n        페이지: {got}")
    else:
        ok("R4", f"{fn}: 분기 {len(got)}건이 문서 §4 와 순서까지 일치")
    # 분기 컨트롤은 제품 화면 안에 흩어져 있다(경고 배너·이탈 버튼). 문서 순서와의 대조는
    # 클래스가 아니라 data-goto 선언 순서로 한다. 같은 여정 분기도 JS 없이 앵커로 닿아야 하므로
    # href 를 요구한다.
    rows = []
    for tag in re.findall(r'<a\b[^>]*data-goto\s*=\s*"[^"]*"[^>]*>', _product_plane(h)):
        href = (re.search(r'\bhref\s*=\s*"([^"]+)"', tag) or [None, None])[1]
        g = re.search(r'\bdata-goto\s*=\s*"(JRN-[a-z0-9-]+)#(STP-[a-z0-9-]+)"', tag)
        if href is not None and g:
            rows.append((href, g.group(1), g.group(2)))
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
            # 타 여정 인계는 그 여정이 이관되면 **파일이 아니라 그 여정의 단계**에 착지한다
            # (`JRN-x.html#STP-y`). 조각을 떼고 파일을 확인한 뒤, 조각이 있으면 그것이
            # 착지 파일에 실재하는 앵커인지까지 본다 — 조각을 무시하면 선언한 단계가 아니라
            # 상대 여정의 1단계로 떨어지는 링크를 게이트가 통과시킨다.
            path, _, frag = href.partition("#")
            target = os.path.join(MDIR, path)
            if not os.path.exists(target):
                fail("R4", f"{fn}: 분기 착지 파일 {path} 가 없다")
            elif frag:
                with open(target, encoding="utf-8") as tf:
                    th = tf.read()
                if not re.search(r'id\s*=\s*"' + re.escape(frag) + r'"', th):
                    fail("R4", f"{fn}: 분기 착지 앵커 {href} 가 {path} 에 없다")
                elif frag != ts:
                    fail("R4", f"{fn}: 분기 착지 앵커 {href} 가 선언한 단계 `{ts}` 와 다르다")

    stale = sorted(set(re.findall(r"\bJ[1-5]\b", h)))
    if stale:
        fail("R6", f"{fn}: 폐기된 구 식별자 {stale} 가 남아 있다")
    else:
        ok("R6", f"{fn}: 폐기 식별자(J1~J5) 0건")

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

# 여정 페이지가 아닌 화면 단위 mockup 은 개정된 규칙 5(프로토타입 충실도)를 구조적으로
# 만족할 수 없다(여정 워크스루가 아니다). 하드 실패시키지 않고 상한 래칫으로 관리한다.
screen_pages = sorted(fn for fn in pages
                      if fn not in declared.values() and fn != "index.html")
if CEIL5 is not None:
    if len(screen_pages) > CEIL5:
        fail("R5", f"규칙 5 미충족 mockup 페이지 {len(screen_pages)}건 > 상한 {CEIL5}: {screen_pages}")
    elif len(screen_pages) < CEIL5:
        fail("R5", f"규칙 5 미충족 페이지가 {len(screen_pages)}건으로 줄었다 — 인덱스의 상한을 "
                   f"{CEIL5} → {len(screen_pages)} 로 낮춰라(래칫)")
    else:
        ok("R5", f"규칙 5 미충족 mockup 페이지 {len(screen_pages)}건 == 상한 {CEIL5}")

HARNESS = "scripts/check-journey-flow.js"
SCEN_DIR = "scripts/journey-scenarios"
WFDIR = D(".github", "workflows")
if not os.path.exists(D(HARNESS)):
    fail("R9", f"DOM 하네스 {HARNESS} 가 없다 — 규칙 5(c)(d)(e) 를 집행할 수단이 없다")
else:
    wired = []
    if os.path.isdir(WFDIR):
        for wf in sorted(os.listdir(WFDIR)):
            if not wf.endswith((".yml", ".yaml")):
                continue
            body = read(os.path.join(WFDIR, wf))
            if HARNESS in body and re.search(r"^\s*(-\s*)?run:.*" + re.escape(HARNESS),
                                             body, re.M):
                wired.append(wf)
    if not wired:
        fail("R9", f"{HARNESS} 를 실제로 실행하는 CI 워크플로가 없다 — "
                   "하네스가 커밋만 되고 게이트로 걸려 있지 않다")
    else:
        ok("R9", f"DOM 하네스가 CI 에 걸려 있다: {', '.join(wired)}")
    # 하네스는 여정 무관 범용 러너이고, 페이지 고유 조작((c) 선행 행동 · (d) 값 변경 ·
    # (e) 상태 도달)은 여정별 시나리오가 맡는다. 시나리오가 없으면 그 페이지는 (c)(d)(e) 를
    # 한 번도 집행받지 않는다 — 하네스도 fail-closed 로 막지만, 정적으로도 잡는다.
    missing_scen = []
    for jid in sorted(declared):
        scen = f"{SCEN_DIR}/{jid}.js"
        if not os.path.exists(D(*scen.split("/"))):
            missing_scen.append(jid)
            fail("R9", f"여정 페이지 `{jid}` 의 하네스 시나리오 {scen} 가 없다 — "
                       "규칙 5(c)(d)(e) 를 그 페이지에 대해 집행할 수단이 없다")
    if declared and not missing_scen:
        ok("R9", f"여정 페이지 {len(declared)}개 전부 하네스 시나리오 보유")

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

def _expand_braces(tok):
    m = re.search(r"\{([^}]*)\}", tok)
    if not m:
        return [tok]
    out = []
    for part in m.group(1).split(","):
        out += _expand_braces(tok[:m.start()] + part.strip() + tok[m.end():])
    return out

_sec = re.split(r"^## ", tracker, flags=re.M)
_doclist = next((s for s in _sec if s.startswith("문서 목록")), "")
listed = set()
for tok in re.findall(r"`(mockups/[^`]+)`", _doclist):
    for one in _expand_braces(tok):
        if one.endswith(".html"):
            listed.add(os.path.basename(one))
actual = set(pages)
if not _doclist:
    fail("R11", "설계 트래커에 「## 문서 목록」 절이 없다 — mockup 실파일 등재를 대조할 수 없다")
else:
    ghost = sorted(listed - actual)
    unlisted = sorted(actual - listed)
    if ghost:
        fail("R11", f"트래커 문서 목록이 실재하지 않는 mockup 파일을 등재한다: {ghost}")
    if unlisted:
        fail("R11", f"실재하는 mockup 파일이 트래커 문서 목록에 없다: {unlisted}")
    if not ghost and not unlisted:
        ok("R11", f"트래커 문서 목록의 mockup 파일 {len(listed)}건 == 실파일 {len(actual)}건")

_nav_dest = {}                      # data-id -> {목적지 파일}
for _fn, _raw in pages.items():
    _nb = re.search(r'<nav class="nav">(.*?)</nav>', strip_comments(_raw), re.S)
    if not _nb:
        continue                     # index.html(리다이렉트)처럼 셸이 없는 파일
    for _i, _href in re.findall(
            r'<a class="nav-item[^"]*" data-id="([^"]+)"[^>]*href="([^"]+)"', _nb.group(1)):
        _nav_dest.setdefault(_i, set()).add(html.unescape(_href).split("#")[0])
_split = sorted(i for i, d in _nav_dest.items() if len(d) > 1)
if _split:
    fail("R13", "좌측 네비 항목의 목적지가 페이지마다 갈린다: "
                + ", ".join(f"`{i}` -> {sorted(_nav_dest[i])}" for i in _split))
M_NAV = len(_nav_dest)
M_NAVDEST = len({next(iter(d)) for d in _nav_dest.values() if len(d) == 1})
_dest_of = {i: next(iter(d)) for i, d in _nav_dest.items() if len(d) == 1}
_navpages = set(_dest_of.values())

_navclaims, _bad = 0, []
for _path, _body in ((IDX, idx), (TRACKER, tracker), (JREADME, (read(JREADME) if os.path.exists(JREADME) else ''))):
    _rel, _fenced = os.path.relpath(_path, ROOT), False
    for _i2, _ln in enumerate(_body.splitlines(), 1):
        if _ln.lstrip().startswith("```"):
            _fenced = not _fenced
            continue
        if _fenced or _ln.lstrip().startswith(">"):
            continue
        _jids = re.findall(r"`(JRN-[a-z0-9-]+)`", _ln)
        _only = _jids[0] if len(_jids) == 1 else None
        if "좌측 네비 항목 없음" in _ln and _only:
            _navclaims += 1
            _pg = declared.get(_only)
            if _pg and _pg in _navpages:
                _via = sorted(i for i, d in _dest_of.items() if d == _pg)
                _bad.append(f"{_rel}:{_i2} 「좌측 네비 항목 없음」 — 실측은 `{_only}` 페이지"
                            f"({_pg})가 네비 항목 {_via} 의 목적지다")
        for _m in re.finditer(r"좌측 네비 항목 `([A-Za-z0-9_-]+)`", _ln):
            _navclaims += 1
            _nid = _m.group(1)
            if _nid not in _dest_of:
                _bad.append(f"{_rel}:{_i2} 좌측 네비 항목 `{_nid}` 가 실측 네비에 없다 "
                            f"(실측 {sorted(_dest_of)})")
            elif _only and declared.get(_only) and _dest_of[_nid] != declared[_only]:
                _bad.append(f"{_rel}:{_i2} 좌측 네비 항목 `{_nid}` 는 {_dest_of[_nid]} 로 가는데 "
                            f"그 행의 여정 `{_only}` 페이지는 {declared[_only]} 다")
        for _m in re.finditer(r"`([A-Za-z0-9_-]+)`\s*로 좌측 네비에 들어갔", _ln):
            _navclaims += 1
            if _m.group(1) not in _dest_of:
                _bad.append(f"{_rel}:{_i2} 「`{_m.group(1)}` 로 좌측 네비에 들어갔」 — "
                            f"실측 네비에 그 항목이 없다 (실측 {sorted(_dest_of)})")
if _bad:
    fail("R13", f"좌측 네비 산문 주장 {len(_bad)}건이 실측과 다르다(규칙 7 — 한쪽만 갱신됨):\n    "
                + "\n    ".join(_bad))
elif not _navclaims:
    fail("R13", "세 문서에 좌측 네비 주장이 한 건도 없다 — R13 이 공전한다. "
                "네비 서술을 지우지 말고 실측과 맞춰 남길 것")
else:
    ok("R13", f"좌측 네비 실측 {M_NAV}항목 / 목적지 {M_NAVDEST}파일 · "
              f"산문 주장 {_navclaims}건 전부 실측과 일치")

_unvis_steps = []
_cov = next((s for s in re.split(r"^## ", idx, flags=re.M) if s.startswith("여정 단계 커버리지")), "")
for line in _cov.splitlines():
    cols = [c.strip() for c in line.strip().strip("|").split("|")] if line.startswith("|") else []
    if len(cols) >= 3 and cols[2] == "(없음)":
        _unvis_steps += re.findall(r"`(STP-[a-z0-9-]+)`", cols[1])

M_PAGES, M_JRN = len(declared), len(journeys)
M_SCREENS, M_UNVIS = len(screen_pages), len(_unvis_steps)
CLAIMS = [
    ("이관 진척",   r"(?:이관|재편)[^\n]{0,40}?(\d+)\s*/\s*(\d+)", (M_PAGES, M_JRN), None),
    ("미시각화 단계", r"미시각화\s*(\d+)\s*단계",                    (M_UNVIS,),      None),
    ("미시각화 단계", r"미시각화\s*단계\s*(\d+)\s*개",               (M_UNVIS,),      None),
    ("미시각화 단계", r"(\d+)\s*미시각화",                           (M_UNVIS,),      None),
    ("여정 페이지 수", r"여정 페이지\s*(\d+)",                        (M_PAGES,),      None),
    ("화면 단위 수",  r"화면(?:\s*단위)?(?:\s*파일)?\s*(\d+)\s*개",   (M_SCREENS,),    r"여정 페이지\s*\d+"),
    ("이관 완료 수",  r"이관된\s*(\d+)\s*개",                         (M_PAGES,),      None),
    ("미이관 수",    r"나머지\s*(\d+)\s*개",                          (M_JRN - M_PAGES,), r"이관|화면 단위|여정 페이지"),
    ("네비 항목 수",  r"화면\s*\*{0,2}(\d+)\s*항목",                  (M_NAV,),        r"좌측 네비"),
    ("네비 목적지 수", r"목적지는\s*\*{0,2}(\d+)\s*파일",              (M_NAVDEST,),    r"좌측 네비"),
]
stale = []
_jreadme = read(JREADME) if os.path.exists(JREADME) else ""
for path, body in ((IDX, idx), (TRACKER, tracker), (JREADME, _jreadme)):
    rel, fenced = os.path.relpath(path, ROOT), False
    for i, line in enumerate(body.splitlines(), 1):
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if fenced or line.lstrip().startswith(">"):
            continue
        for name, pat, want, ctx in CLAIMS:
            if ctx and not re.search(ctx, line):
                continue
            for mm in re.finditer(pat, line):
                got = tuple(int(g) for g in mm.groups() if g is not None)
                if got != want:
                    stale.append(f"{rel}:{i} [{name}] 「{mm.group(0).strip()}」 "
                                 f"— 실측 {'/'.join(map(str, want))}")
if stale:
    fail("R10", f"서술 절의 숫자 {len(stale)}건이 실측과 다르다(규칙 7 — 한쪽만 갱신됨):\n    "
                + "\n    ".join(stale))
else:
    ok("R10", f"서술 절의 재진술 숫자 전부 실측과 일치 "
              f"(이관 {M_PAGES}/{M_JRN} · 여정 페이지 {M_PAGES} · 화면 단위 {M_SCREENS} · "
              f"미시각화 {M_UNVIS}단계)")

_real_mockups = set(os.listdir(MDIR)) if os.path.isdir(MDIR) else set()
_CURRENT_FORM = (
    (JDIR, lambda ln: ln.startswith("| 연결 문서") or ln.startswith("- **터치포인트**")),
    (MDIR, lambda ln: ln.startswith("- **파일**")),
)
_dangling, _scanned = [], 0
for _dir, _is_row in _CURRENT_FORM:
    for _fn in sorted(os.listdir(_dir)) if os.path.isdir(_dir) else []:
        if not _fn.endswith(".md"):
            continue
        for _i, _ln in enumerate(read(os.path.join(_dir, _fn)).splitlines(), 1):
            if not _is_row(_ln.strip()):
                continue
            _scanned += 1
            for _tok in re.findall(r"`([A-Za-z0-9_.-]+\.html)`", _ln):
                if _tok not in _real_mockups:
                    _dangling.append(
                        f"{os.path.relpath(os.path.join(_dir, _fn), ROOT)}:{_i} "
                        f"「{_tok}」 — docs/mockups/ 에 없다")
if _dangling:
    fail("R12", f"현재형 서술이 실재하지 않는 mockup 파일 {len(_dangling)}건을 가리킨다"
                f"(규칙 7 — 한쪽만 갱신됨):\n    " + "\n    ".join(_dangling))
else:
    ok("R12", f"현재형 서술 행 {_scanned}건의 mockup 파일 참조 전부 실재")

print()
if fails:
    print(f"FAIL — 위반 {len(fails)}건")
    for f in fails:
        print("  " + f)
    sys.exit(1)
print(f"PASS — 여정 {len(journeys)}개 · 여정 페이지 {len(declared)}개 · 미이관 {len(unmigrated)}"
      f"(상한 {CEIL}) · 규칙 5 미충족 페이지 {len(screen_pages)}(상한 {CEIL5}) · 링크 {total}건")
