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
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const REPO = process.argv[2] || process.cwd();
const JID = 'JRN-sentiment-shift';
const PAGE = path.join(REPO, 'docs/mockups/' + JID + '.html');
const DOC = path.join(REPO, 'docs/user-journeys/' + JID + '.md');
const IDX = path.join(REPO, 'docs/mockups/econ-opinion-monitor-mockup-index.md');

let pass = 0, fail = 0;
const ok = m => { pass++; console.log('  ok  ' + m); };
const bad = m => { fail++; console.log('  FAIL ' + m); };
const is = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b))
  ? ok(m)
  : bad(`${m}\n        expected ${JSON.stringify(b)}\n        actual   ${JSON.stringify(a)}`);
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* ================= 기대값: 여정 문서 ================= */
const doc = fs.readFileSync(DOC, 'utf8');
const sec3 = doc.split('## 3. 단계별 상세')[1].split('## 4.')[0];
const STEPS = [...sec3.matchAll(/^### `(STP-[a-z0-9-]+)`/gm)].map(m => m[1]);

const sec4 = doc.split('## 4. 분기·예외 흐름')[1].split('\n## ')[0];
const BRANCHES = [];
{
  let sep = false;
  for (const line of sec4.split('\n')) {
    if (!line.startsWith('|')) continue;
    if (/^\|[\s:-]+\|/.test(line)) { sep = true; continue; }
    if (!sep) continue;
    const cells = line.trim().replace(/^\||\|$/g, '').split('|').map(s => s.trim());
    if (cells.length !== 3) continue;
    const ids = [...cells[2].matchAll(/`(JRN-[a-z0-9-]+|STP-[a-z0-9-]+)`/g)].map(m => m[1]);
    BRANCHES.push({
      journey: ids.find(i => i.startsWith('JRN-')) || JID,
      step: ids.find(i => i.startsWith('STP-')),
    });
  }
}

/* ================= 기대값: 인덱스의 상태 등재 ================= */
const idxMd = fs.readFileSync(IDX, 'utf8');
const STATES = (() => {
  const m = idxMd.split('### 상태 변형 등재')[1];
  if (!m) return [];
  const sect = m.split('#### `' + JID + '`')[1];
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
})();

console.log(`기대값(여정 문서): 단계 ${STEPS.length} ${JSON.stringify(STEPS)}`);
console.log(`기대값(여정 문서): 분기 ${BRANCHES.length} ` + BRANCHES.map(b => b.journey + '#' + b.step).join(', '));
console.log(`기대값(인덱스 등재): 상태 ${STATES.length} ${JSON.stringify(STATES)}`);
console.log('');

if (!STEPS.length) { console.log('FAIL — 여정 문서에서 단계를 하나도 못 읽었다'); process.exit(1); }
if (!STATES.length) { console.log('FAIL — 인덱스 「상태 변형 등재」에서 상태를 하나도 못 읽었다'); process.exit(1); }

/* ================= 부트스트랩 ================= */
const html = fs.readFileSync(PAGE, 'utf8');
const jsErrors = [];
function boot() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => jsErrors.push(e.message));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://example.invalid/docs/mockups/' + JID + '.html',
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
/* 화면 1에서 대상 하나를 고르는 제품 행동 — 여러 시나리오가 공유한다. */
const pickFirstTarget = (w, d) => {
  const row = d.querySelector('#targetlist .trow');
  if (!row) return null;
  click(w, row);
  return row;
};

(async function main() {

  /* ---------- (a) 모든 단계 포함 ---------- */
  {
    const { d } = boot();
    is([...d.querySelectorAll('[data-step]')].map(e => e.dataset.step), STEPS,
      '(a) 페이지의 data-step 순서가 여정 문서의 단계 순서와 같다');
    is(d.body.dataset.journey, JID, '(a) body 가 이 여정 하나를 선언한다');
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
     래퍼 네비게이션(단계 레일 · 이전/다음)을 DOM 에서 들어낸 상태에서도 완주해야 한다. */
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

      /* 1단계의 전진은 대상 선택이라는 선행 제품 행동을 요구한다 — 죽은 버튼이 아니라
         조건부로 열리는 버튼임을 확인한다. */
      if (cta.disabled) {
        click(w, cta);
        is(visible(d), [STEPS[i]], `(c) ${STEPS[i]} — 선행 행동 전에는 전진하지 않는다`);
        pickFirstTarget(w, d);
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

  /* ---------- (d) 실제 입력 요소 ----------
     모양만 입력인 요소가 아니라 진짜 폼 요소이고, 값 변경이 렌더를 실제로 바꾼다. */
  {
    const { w, d } = boot();
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
    /* 정체 확인 — jsdom 은 <span> 에도 .value 를 붙일 수 있어서, '값을 바꿨더니 렌더가 변했다'
       만으로는 모양만 입력인 요소를 걸러 내지 못한다. 태그·타입을 먼저 못 박는다. */
    const shape = (id, tag, type) => {
      const el = d.getElementById(id);
      if (!el) return bad(`(d) #${id} 컨트롤이 없다`);
      is(el.tagName, tag, `(d) #${id} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) is(el.type, type, `(d) #${id} 의 type 은 ${type}`);
    };
    shape('axis', 'SELECT');
    shape('q', 'INPUT', 'search');
    shape('nathresh', 'INPUT', 'number');
    shape('na-exclude', 'INPUT', 'checkbox');
    shape('tl-range', 'SELECT');
    shape('verdict-memo', 'TEXTAREA');
    is([...d.querySelectorAll('input[name="unit"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 단위 컨트롤이 전부 실제 <input type=radio> 다');
    is([...d.querySelectorAll('input[name="verdict"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 결론 컨트롤이 전부 실제 <input type=radio> 다');

    /* 값 변경이 렌더에 반영되는지 — 네 종류를 실제로 굴린다. */
    const before = d.getElementById('targetlist').innerHTML;
    const q = d.getElementById('q');
    q.value = '존재하지-않는-대상'; fire(w, q, 'input');
    is(d.querySelectorAll('#targetlist .trow').length, 0, '(d) <input type=search> 입력이 목록을 실제로 필터한다');
    q.value = ''; fire(w, q, 'input');
    is(d.getElementById('targetlist').innerHTML, before, '(d) 검색어를 지우면 목록이 되돌아온다');

    const axis = d.getElementById('axis');
    const kr = [...d.querySelectorAll('#targetlist .trow')].map(b => b.dataset.target);
    /* 사용자가 하는 방식으로 고른다 — <option> 선택은 진짜 <select> 에만 있다. */
    const pickOption = v => {
      const opt = [...(axis.options || [])].find(o => o.value === v);
      if (!opt) { bad(`(d) 축 <select> 에 <option value=${v}> 가 없다`); return false; }
      opt.selected = true; fire(w, axis, 'change'); return true;
    };
    if (pickOption('US')) {
      const us = [...d.querySelectorAll('#targetlist .trow')].map(b => b.dataset.target);
      is(JSON.stringify(kr) !== JSON.stringify(us) && us.length > 0, true,
        '(d) <select> 의 <option> 선택이 목록을 실제로 바꾼다');
      pickOption('KR');
    }

    pickFirstTarget(w, d);
    click(w, d.getElementById('cta-1'));
    const chk = d.getElementById('na-exclude');
    const kvBefore = d.getElementById('na-kv').textContent;
    chk.checked = false; fire(w, chk, 'change');
    is(d.getElementById('na-kv').textContent !== kvBefore, true,
      '(d) <input type=checkbox> 전환이 비율 표기를 실제로 바꾼다');

    click(w, d.getElementById('cta-2'));
    const chartBefore = d.getElementById('senttime').innerHTML;
    d.querySelector('input[name="unit"][value="week"]').checked = true;
    fire(w, d.getElementById('tl-form'), 'submit');
    await sleep(400);
    is(d.getElementById('senttime').innerHTML !== chartBefore, true,
      '(d) <input type=radio> + 폼 제출이 차트를 실제로 다시 그린다');

    click(w, d.getElementById('cta-3'));
    const memo = d.getElementById('verdict-memo');
    memo.value = '타이핑 확인'; fire(w, memo, 'input');
    is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  }

  /* ---------- (e) 상태 변형 ----------
     인덱스가 등재한 상태 집합과 페이지의 data-state 가 양방향으로 같고,
     각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다. */
  {
    const { d } = boot();
    const declared = [...d.querySelectorAll('[data-state]')].map(e => e.dataset.state);
    is([...declared].sort(), [...STATES].sort(), '(e) 페이지의 data-state 집합 == 인덱스 등재 집합');
  }
  {
    /* no-selection — 진입 직후 오른쪽 분포 패널 */
    const { w, d } = boot();
    is(shown(d, 'no-selection'), true, '(e) no-selection — 진입 직후 대상 미선택 상태');
    pickFirstTarget(w, d);
    is(shown(d, 'no-selection'), false, '(e) no-selection — 대상을 고르면 해소된다');
  }
  {
    /* empty — 검색 결과 0건 */
    const { w, d } = boot();
    is(shown(d, 'empty'), false, '(e) empty — 목록이 있을 때는 빈 상태가 아니다');
    const q = d.getElementById('q');
    q.value = '존재하지-않는-대상'; fire(w, q, 'input');
    is(shown(d, 'empty'), true, '(e) empty — 검색 결과 0건에서 빈 상태에 도달');
    q.value = ''; fire(w, q, 'input');
    is(shown(d, 'empty'), false, '(e) empty — 검색어를 지우면 해소된다');
  }
  {
    /* unanalyzed-warning — 임계를 실제 비중 아래로 내린다 */
    const { w, d } = boot();
    pickFirstTarget(w, d);
    const th = d.getElementById('nathresh');
    th.value = '99'; fire(w, th, 'input');
    is(shown(d, 'unanalyzed-warning'), false, '(e) unanalyzed-warning — 임계가 높으면 경고가 없다');
    th.value = '0'; fire(w, th, 'input');
    is(shown(d, 'unanalyzed-warning'), true, '(e) unanalyzed-warning — 임계를 내리면 경고 상태에 도달');
  }
  {
    /* loading → 해소 */
    const { w, d } = boot();
    pickFirstTarget(w, d);
    click(w, d.getElementById('cta-1'));
    click(w, d.getElementById('cta-2'));
    fire(w, d.getElementById('tl-form'), 'submit');
    is(shown(d, 'loading'), true, '(e) loading — 적용 직후 로딩 상태에 도달');
    await sleep(400);
    is(shown(d, 'loading'), false, '(e) loading — 로딩이 실제로 해소된다');
  }
  {
    /* low-sample — 시간 단위 */
    const { w, d } = boot();
    pickFirstTarget(w, d);
    click(w, d.getElementById('cta-1'));
    click(w, d.getElementById('cta-2'));
    is(shown(d, 'low-sample'), false, '(e) low-sample — 일 단위에서는 표본 부족이 없다');
    d.querySelector('input[name="unit"][value="hour"]').checked = true;
    fire(w, d.getElementById('tl-form'), 'submit');
    await sleep(400);
    is(shown(d, 'low-sample'), true, '(e) low-sample — 시간 단위에서 표본 부족 상태에 도달');
    is(d.querySelectorAll('#senttime .thin').length > 0, true, '(e) low-sample — 해당 구간이 실제로 흐리게 그려진다');
  }
  {
    /* invalid → recorded */
    const { w, d } = boot();
    pickFirstTarget(w, d);
    click(w, d.getElementById('cta-1'));
    click(w, d.getElementById('cta-2'));
    click(w, d.getElementById('cta-3'));
    fire(w, d.getElementById('verdict-form'), 'submit');
    is(shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
    is(shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
    d.querySelector('input[name="verdict"]').checked = true;
    fire(w, d.getElementById('verdict-form'), 'submit');
    is(shown(d, 'invalid'), true, '(e) invalid — 결론만 있고 메모가 비면 여전히 실패');
    const memo = d.getElementById('verdict-memo');
    memo.value = 'D-2 구간부터 부정이 지속 상승, 표본 수는 안정';
    fire(w, d.getElementById('verdict-form'), 'submit');
    is(shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
    is(shown(d, 'recorded'), true, '(e) recorded — 판별 기록 성공 상태에 도달');
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
      if (b.journey === JID) {
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
    is(d.querySelectorAll('#targetlist .trow').length > 0, true, '(h) 인라인 스크립트만으로 목록이 렌더된다');
    is(d.getElementById('senttime').innerHTML.includes('<rect'), true, '(h) 차트가 인라인 스크립트로 렌더된다');
    is(jsErrors, [], '(h) 페이지 스크립트가 오류 없이 실행된다');
  }

  console.log(`\n${fail ? 'FAIL' : 'PASS'} — ${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
