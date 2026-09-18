/* 여정 mockup 페이지를 jsdom 으로 **실제 구동**해 규칙 5(프로토타입 충실도) (a)~(h) 를 단언한다.
 *
 * 왜 정적 대조로는 안 되는가: 파일을 읽어 속성만 세면 배선이 끊긴 버튼과 살아 있는 버튼이
 * 구분되지 않고, 입력처럼 보이도록 스타일링한 <div> 와 진짜 <input> 도 구분되지 않는다.
 * (c) 전진 배선 · (d) 실제 입력 · (e) 상태 변형은 DOM 에서 굴려야만 판정된다.
 *
 * 기대값은 언제나 **페이지 밖 SSOT** 에서 파싱한다:
 *   단계·분기  ← docs/user-journeys/JRN-<슬러그>.md
 *   상태 집합  ← docs/mockups/econ-opinion-monitor-mockup-index.md 「상태 변형 등재」
 * 페이지 자신에게서 기대값을 읽으면 자기참조라 어떤 뮤테이션도 통과한다.
 *
 * ── 구조 ──────────────────────────────────────────────────────────────────
 * 이 파일은 **여정 무관 범용 러너**다. `docs/mockups/*.html` 에서 `data-journey` 를
 * 선언한 페이지를 전부 찾아 각각에 대해 (a)(b)(c)(f)(g)(h) 와 (d) 의 '단계마다 활성
 * 폼 요소가 있는가' 를 구동한다 — 이 항목들은 전부 SSOT 만으로 판정되므로 페이지 고유
 * 지식이 필요 없다.
 *
 * 페이지 고유 지식(어떤 컨트롤을 어떻게 조작하면 어떤 상태에 도달하는가, 1단계 전진을
 * 여는 선행 행동은 무엇인가)은 `scripts/journey-scenarios/<여정 식별자>.js` 로 분리한다.
 * 시나리오는 **페이지 밖**에 있으므로 자기참조 금지 원칙은 그대로 지켜진다.
 *
 * ⚠ fail-closed: `data-journey` 를 선언한 페이지에 대응 시나리오가 없으면 **실패**한다.
 * 이 한 줄이 없으면 새 여정 페이지가 (c)(d)(e) 를 한 번도 집행받지 않은 채 착지하고,
 * 두 게이트는 green 으로 남는다 — 모델 정의가 'drift' 로 규정한 상태다.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

/* require() 는 './' 로 시작하지 않는 상대 경로를 모듈 이름으로 해석한다 —
   `node scripts/check-journey-flow.js .` 처럼 상대 경로로 불려도 시나리오를 찾도록 절대화한다. */
const REPO = path.resolve(process.argv[2] || process.cwd());
const MDIR = path.join(REPO, 'docs/mockups');
const JDIR = path.join(REPO, 'docs/user-journeys');
const IDX = path.join(REPO, 'docs/mockups/econ-opinion-monitor-mockup-index.md');
const SDIR = path.join(REPO, 'scripts/journey-scenarios');

let pass = 0, fail = 0;
const ok = m => { pass++; console.log('  ok  ' + m); };
const bad = m => { fail++; console.log('  FAIL ' + m); };
const is = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b))
  ? ok(m)
  : bad(`${m}\n        expected ${JSON.stringify(b)}\n        actual   ${JSON.stringify(a)}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

function readSteps(doc) {
  const sec3 = doc.split('## 3. 단계별 상세')[1];
  if (!sec3) return [];
  return [...sec3.split('## 4.')[0].matchAll(/^### `(STP-[a-z0-9-]+)`/gm)].map(m => m[1]);
}

function readBranches(doc, jid) {
  const sec4raw = doc.split('## 4. 분기·예외 흐름')[1];
  if (!sec4raw) return [];
  const sec4 = sec4raw.split('\n## ')[0];
  const out = [];
  let sep = false;
  for (const line of sec4.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/^\|[\s:-]+\|/.test(line)) { sep = true; continue; }
    if (!sep) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (cells.length !== 3) continue;
    const ids = [...cells[2].matchAll(/`(JRN-[a-z0-9-]+|STP-[a-z0-9-]+)`/g)].map(m => m[1]);
    out.push({
      journey: ids.find(i => i.startsWith('JRN-')) || jid,
      step: ids.find(i => i.startsWith('STP-')),
    });
  }
  return out;
}

/* 인덱스 「상태 변형 등재」의 여정별 절에서 상태 id 를 읽는다. */
function readStates(idxMd, jid) {
  const m = idxMd.split('### 상태 변형 등재')[1];
  if (!m) return [];
  const sect = m.split('#### `' + jid + '`')[1];
  if (!sect) return [];
  const body = sect.split('\n####')[0].split('\n### ')[0];
  const out = [];
  let sep = false;
  for (const line of body.split('\n')) {
    if (!line.startsWith('|')) { if (sep && out.length) break; continue; }
    if (/^\|[\s:-]+\|/.test(line)) { sep = true; continue; }
    if (!sep) continue;
    const first = line.trim().replace(/^\|/, '').split('|')[0].trim();
    const id = (first.match(/`([a-z0-9-]+)`/) || [])[1];
    if (id) out.push(id);
  }
  return out;
}

/* 화면 단위 파일은 data-journey 를 선언하지 않으므로 자연히 제외된다(미이관분). */
function discover() {
  const found = [];
  for (const fn of fs.readdirSync(MDIR).sort()) {
    if (!fn.endsWith('.html')) continue;
    const html = fs.readFileSync(path.join(MDIR, fn), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
    const m = html.match(/<body\b[^>]*\bdata-journey\s*=\s*"([^"]+)"/);
    if (m) found.push({ jid: m[1], file: fn });
  }
  return found;
}

async function runJourney({ jid, file }, idxMd) {
  console.log(`\n${'='.repeat(72)}\n여정 페이지: ${file}  →  ${jid}\n${'='.repeat(72)}`);

  const PAGE = path.join(MDIR, file);
  const DOC = path.join(JDIR, jid + '.md');
  if (!fs.existsSync(DOC)) { bad(`${jid}: 여정 문서 ${path.relative(REPO, DOC)} 가 없다`); return; }

  const doc = fs.readFileSync(DOC, 'utf8');
  const STEPS = readSteps(doc);
  const BRANCHES = readBranches(doc, jid);
  const STATES = readStates(idxMd, jid);

  console.log(`기대값(여정 문서): 단계 ${STEPS.length} ${JSON.stringify(STEPS)}`);
  console.log(`기대값(여정 문서): 분기 ${BRANCHES.length} ` + BRANCHES.map(b => b.journey + '#' + b.step).join(', '));
  console.log(`기대값(인덱스 등재): 상태 ${STATES.length} ${JSON.stringify(STATES)}`);
  console.log('');

  if (!STEPS.length) { bad(`${jid}: 여정 문서에서 단계를 하나도 못 읽었다`); return; }
  if (!STATES.length) { bad(`${jid}: 인덱스 「상태 변형 등재」에서 상태를 하나도 못 읽었다`); return; }

  /* --- fail-closed: 시나리오가 없으면 (c)(d)(e) 를 집행할 수단이 없다 --- */
  const SCEN = path.join(SDIR, jid + '.js');
  if (!fs.existsSync(SCEN)) {
    bad(`${jid}: 시나리오 ${path.relative(REPO, SCEN)} 가 없다 — 규칙 5(c)(d)(e) 의 `
      + `페이지별 조작을 집행할 수 없다. 여정 페이지를 추가했다면 시나리오도 함께 추가하라.`);
    return;
  }
  const scenario = require(SCEN);

  const html = fs.readFileSync(PAGE, 'utf8');
  const jsErrors = [];
  function boot() {
    const vc = new VirtualConsole();
    vc.on('jsdomError', e => jsErrors.push(e.message));
    const dom = new JSDOM(html, {
      runScripts: 'dangerously',
      url: 'https://example.invalid/docs/mockups/' + file,
      virtualConsole: vc,
    });
    return { w: dom.window, d: dom.window.document };
  }
  const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
  const fire = (w, el, type) => el.dispatchEvent(new w.Event(type, { bubbles: true, cancelable: true }));
  const visible = d => [...d.querySelectorAll('section.jstep')].filter(s => !s.hidden).map(s => s.dataset.step);
  const shown = (d, sid) => {
    const el = d.querySelector(`[data-state="${sid}"]`);
    return !!el && !el.hidden;
  };
  /* 시나리오에 넘기는 도구상자 — 단언·조작·부트스트랩을 공유한다. */
  const t = { ok, bad, is, sleep, boot, click, fire, visible, shown, STEPS, BRANCHES, STATES, jid };

  /* ---------- (a) 모든 단계 포함 ---------- */
  {
    const { d } = boot();
    is([...d.querySelectorAll('[data-step]')].map(e => e.dataset.step), STEPS,
      '(a) 페이지의 data-step 순서가 여정 문서의 단계 순서와 같다');
    is(d.body.dataset.journey, jid, '(a) body 가 이 여정 하나를 선언한다');
    is(d.querySelectorAll('[data-journey]').length, 1, '(a) data-journey 선언은 정확히 1건');
  }

  /* ---------- (b) 제품 화면이 지배면 ----------
     문서 메타는 기본 접힌 보조 레이어 안에만 있어야 한다. 연 직후 보이는 것은 제품이다. */
  {
    const { d } = boot();
    const layer = d.querySelector('[data-meta-layer]');
    if (!layer) {
      bad('(b) 보조 메타 레이어([data-meta-layer])가 없다');
    } else {
      is(layer.tagName, 'DETAILS', '(b) 메타 레이어가 <details> 다');
      is(layer.hasAttribute('open'), false, '(b) 메타 레이어가 기본으로 접혀 있다');

      /* 메타 레이어를 들어낸 사본의 렌더 텍스트에 문서 메타가 남아 있으면 안 된다. */
      const clone = d.body.cloneNode(true);
      clone.querySelectorAll('[data-meta-layer]').forEach(n => n.remove());
      clone.querySelectorAll('script,style').forEach(n => n.remove());
      const text = clone.textContent.replace(/\s+/g, ' ');

      const forbidden = [
        ['여정 식별자', /JRN-[a-z0-9-]+/g],
        ['단계 식별자', /STP-[a-z0-9-]+/g],
        ['단계 번호', /단계\s*\d\s*\/\s*\d/g],
        ['터치포인트', /터치포인트/g],
        ['연결 AC', /AC\d+\.\d+/g],
      ];
      for (const [label, re] of forbidden) {
        const hits = [...new Set(text.match(re) || [])];
        is(hits, [], `(b) 제품 평면에 ${label}가 노출되지 않는다`);
      }
      /* 반대 방향 — 메타는 사라진 게 아니라 레이어 안에 있어야 한다. */
      const meta = layer.textContent;
      is(STEPS.every(s => meta.includes(s)), true, '(b) 단계 식별자는 메타 레이어 안에 보존돼 있다');
    }
  }

  /* ---------- (c) 화면 안의 행동으로 전진 ----------
     래퍼 네비게이션(단계 레일 · 이전/다음)을 DOM 에서 들어낸 상태에서도 완주해야 한다.
     전진이 선행 행동을 요구하는 단계는 시나리오의 unlock 훅이 그 행동을 대신한다 —
     '죽은 버튼' 과 '조건부로 열리는 버튼' 을 구분하기 위함이다. */
  {
    const { w, d } = boot();
    d.querySelectorAll('.jrail, #jprev, #jnext, [data-goto-step]').forEach(n => n.remove());

    is(visible(d), [STEPS[0]], '(c) 래퍼 네비 제거 후에도 초기 표시는 1단계 하나');

    for (let i = 0; i < STEPS.length - 1; i++) {
      const cur = d.querySelector(`section.jstep[data-step="${STEPS[i]}"]`);
      const cta = cur.querySelector('[data-advance]');
      if (!cta) { bad(`(c) ${STEPS[i]} 의 화면 안에 전진 행동이 없다`); continue; }
      if (cta.closest('[data-meta-layer]')) { bad(`(c) ${STEPS[i]} 의 전진 행동이 메타 레이어 안에 있다`); continue; }
      is(cta.dataset.advance, STEPS[i + 1], `(c) ${STEPS[i]} 의 화면 내 행동이 다음 단계를 가리킨다`);

      if (cta.disabled) {
        const unlock = (scenario.unlock || {})[STEPS[i]];
        if (!unlock) {
          bad(`(c) ${STEPS[i]} 의 전진이 비활성인데 시나리오에 unlock 훅이 없다`);
          continue;
        }
        click(w, cta);
        is(visible(d), [STEPS[i]], `(c) ${STEPS[i]} — 선행 행동 전에는 전진하지 않는다`);
        unlock(t, w, d);
        is(cta.disabled, false, `(c) ${STEPS[i]} — 화면 안 선행 행동으로 전진이 열린다`);
      }
      click(w, cta);
      is(visible(d), [STEPS[i + 1]], `(c) 화면 내 행동 클릭으로 ${STEPS[i + 1]} 도달`);
    }
    /* 마지막 단계는 전진이 아니라 여정을 닫는 제출을 가진다. */
    const last = d.querySelector(`section.jstep[data-step="${STEPS[STEPS.length - 1]}"]`);
    is(!!last.querySelector('form button[type="submit"], form input[type="submit"]'), true,
      '(c) 마지막 단계에 여정을 닫는 제출 행동이 있다');
  }

  /* ---------- (d) 실제 입력 요소 — 여정 무관 부분 ----------
     단계마다 진짜 폼 요소가 있고 비활성이 아니다. '값을 바꾸면 렌더가 바뀌는가' 는
     페이지 고유 지식이라 시나리오가 본다. */
  {
    const { d } = boot();
    const SEL = 'input, select, textarea';
    for (const sid of STEPS) {
      const sec = d.querySelector(`section.jstep[data-step="${sid}"]`);
      const fields = [...sec.querySelectorAll(SEL)];
      if (!fields.length) { bad(`(d) ${sid} 에 실제 폼 요소가 없다`); continue; }
      ok(`(d) ${sid} 에 실제 폼 요소 ${fields.length}개 (${[...new Set(fields.map(f => f.tagName.toLowerCase() + (f.type ? ':' + f.type : '')))].join(', ')})`);
      for (const f of fields) {
        if (f.disabled) bad(`(d) ${sid} 의 ${f.id || f.name || f.tagName} 이 비활성이다`);
      }
    }
  }

  /* ---------- (d) 페이지 고유 — 값 변경이 렌더를 실제로 바꾼다 ---------- */
  if (typeof scenario.inputs === 'function') {
    await scenario.inputs(t);
  } else {
    bad(`${jid}: 시나리오에 inputs() 가 없다 — (d) 의 '값 변경이 렌더를 바꾸는가' 를 못 본다`);
  }

  /* ---------- (e) 상태 변형 ----------
     인덱스가 등재한 상태 집합과 페이지의 data-state 가 양방향으로 같고(여정 무관),
     각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다(시나리오). */
  {
    const { d } = boot();
    const declared = [...d.querySelectorAll('[data-state]')].map(e => e.dataset.state);
    is([...declared].sort(), [...STATES].sort(), '(e) 페이지의 data-state 집합 == 인덱스 등재 집합');
  }
  if (typeof scenario.states === 'function') {
    await scenario.states(t);
  } else {
    bad(`${jid}: 시나리오에 states() 가 없다 — (e) 의 상태 도달을 못 본다`);
  }

  /* ---------- (f) 딥링크 ---------- */
  for (const sid of STEPS) {
    const { w, d } = boot();
    w.location.hash = '#' + sid;
    w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    is(visible(d), [sid], `(f) 딥링크 #${sid} 로 그 단계가 열린다`);
  }
  {
    const { w, d } = boot();
    w.location.hash = '#STP-does-not-exist';
    w.dispatchEvent(new w.HashChangeEvent('hashchange'));
    is(visible(d), [STEPS[0]], '(f) 알 수 없는 해시는 1단계로 폴백한다');
  }

  /* ---------- (g) 분기와 끝 ---------- */
  {
    const { w, d } = boot();
    const controls = [...d.querySelectorAll('[data-goto]')].filter(e => !e.closest('[data-meta-layer]'));
    is(controls.length, BRANCHES.length, '(g) 제품 평면의 분기 컨트롤 수가 문서 §4 행 수와 같다');
    is(controls.map(a => a.dataset.goto), BRANCHES.map(b => `${b.journey}#${b.step}`),
      '(g) 분기 대상이 문서 §4 와 순서까지 일치');
    BRANCHES.forEach((b, i) => {
      const a = controls[i]; if (!a) return;
      if (b.journey === jid) {
        click(w, a);
        is(visible(d), [b.step], `(g) 같은 여정 분기 → ${b.step} 로 실제 이동`);
      } else {
        const href = a.getAttribute('href');
        const target = path.join(path.dirname(PAGE), href.split('#')[0]);
        is(fs.existsSync(target), true, `(g) 타 여정 분기 → 착지 파일 ${href} 실재`);
      }
    });
  }

  /* ---------- (h) 정적 동작 ---------- */
  {
    const { d } = boot();
    const ext = [...d.querySelectorAll('[src],[href]')]
      .map(e => e.getAttribute('src') || e.getAttribute('href'))
      .filter(u => /^https?:/.test(u))
      .filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
    is(ext, [], '(h) 웹폰트 외 외부 자원 0건 — 빌드·네트워크 없이 열린다');
    is(/fetch\(|XMLHttpRequest|import\s*\(/.test(html), false, '(h) 런타임 네트워크 호출이 없다');
    if (typeof scenario.renders === 'function') await scenario.renders(t);
    is(jsErrors, [], '(h) 페이지 스크립트가 오류 없이 실행된다');
  }
}

(async function main() {
  const idxMd = fs.readFileSync(IDX, 'utf8');
  const pages = discover();
  if (!pages.length) {
    console.log('FAIL — docs/mockups 에 data-journey 를 선언한 여정 페이지가 하나도 없다');
    process.exit(1);
  }
  console.log(`여정 페이지 ${pages.length}건 발견: ` + pages.map(p => p.file).join(', '));
  for (const p of pages) await runJourney(p, idxMd);

  console.log(`\n${fail ? 'FAIL' : 'PASS'} — 여정 페이지 ${pages.length}개 · ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
