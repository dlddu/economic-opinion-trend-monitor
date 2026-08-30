/* JRN-sentiment-shift.html 을 jsdom 으로 실제 구동해 규칙 5 (a)~(g) 를 단언한다.
 * 기대값(단계 순서·행동 문구·분기 대상)은 **여정 문서**에서 파싱한다 — 페이지 자신에게서
 * 읽어 페이지를 검사하면 자기참조라 어떤 뮤테이션도 통과한다. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const REPO = process.argv[2] || process.cwd();
const PAGE = path.join(REPO, 'docs/mockups/JRN-sentiment-shift.html');
const DOC  = path.join(REPO, 'docs/user-journeys/JRN-sentiment-shift.md');
const JID  = 'JRN-sentiment-shift';

let pass = 0, fail = 0;
const ok  = m => { pass++; console.log('  ok  ' + m); };
const bad = m => { fail++; console.log('  FAIL ' + m); };
const is  = (a, b, m) => (JSON.stringify(a) === JSON.stringify(b))
  ? ok(m) : bad(`${m}\n        expected ${JSON.stringify(b)}\n        actual   ${JSON.stringify(a)}`);

/* ---------- 기대값: 여정 문서에서 파싱 ---------- */
const doc = fs.readFileSync(DOC, 'utf8');
const sec3 = doc.split('## 3. 단계별 상세')[1].split('## 4.')[0];
const STEPS = [...sec3.matchAll(/^### `(STP-[a-z0-9-]+)`/gm)].map(m => m[1]);

const sec4 = doc.split('## 4. 분기·예외 흐름')[1].split('\n## ')[0];
const BRANCHES = [];
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
console.log(`기대값(여정 문서): 단계 ${STEPS.length} ${JSON.stringify(STEPS)}`);
console.log(`기대값(여정 문서): 분기 ${BRANCHES.length}`, BRANCHES.map(b => b.journey + '#' + b.step).join(', '));
console.log('');

const html = fs.readFileSync(PAGE, 'utf8');
function boot() {
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://example.invalid/docs/mockups/JRN-sentiment-shift.html',
  });
  return dom;
}
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));
const visible = d => [...d.querySelectorAll('section.jstep')].filter(s => !s.hidden).map(s => s.dataset.step);

/* ---------- (a) 모든 단계 포함 ---------- */
{
  const { window: w } = boot(); const d = w.document;
  is([...d.querySelectorAll('[data-step]')].map(e => e.dataset.step), STEPS,
     '(a) 페이지의 data-step 순서가 여정 문서의 단계 순서와 같다');
  is(d.body.dataset.journey, JID, '(a) body 가 이 여정 하나를 선언한다');
  is(d.querySelectorAll('[data-journey]').length, 1, '(a) data-journey 선언은 정확히 1건');
}

/* ---------- (b)(c) 단계 전환 + 현재 위치 ---------- */
{
  const { window: w } = boot(); const d = w.document;
  is(visible(d), [STEPS[0]], '(c) 초기 표시는 1단계 하나뿐');
  const railOn = () => [...d.querySelectorAll('.jr-item.on')].map(e => e.dataset.rail);
  is(railOn(), [STEPS[0]], '(c) 레일의 현재 위치가 1단계');
  const next = d.getElementById('jnext'), prev = d.getElementById('jprev');
  is(prev.disabled, true, '(c) 1단계에서 이전 버튼 비활성');
  for (let i = 1; i < STEPS.length; i++) {
    click(w, next);
    is(visible(d), [STEPS[i]], `(b) 다음 버튼으로 ${STEPS[i]} 도달`);
  }
  is(next.disabled, true, '(c) 마지막 단계에서 다음 버튼 비활성');
  is([...d.querySelectorAll('.jr-item.done')].map(e => e.dataset.rail), STEPS.slice(0, -1),
     '(c) 지나온 단계가 done 으로 표시된다');
  click(w, prev);
  is(visible(d), [STEPS[STEPS.length - 2]], '(b) 이전 버튼으로 되돌아간다');
}

/* ---------- (d) 각 단계의 주요 행동을 눌러 전진 ---------- */
{
  const { window: w } = boot(); const d = w.document;
  for (let i = 0; i < STEPS.length - 1; i++) {
    const cur = d.querySelector(`section.jstep[data-step="${STEPS[i]}"]`);
    const cta = cur.querySelector('.cta[data-advance]');
    if (!cta) { bad(`(d) ${STEPS[i]} 에 주요 행동 버튼이 없다`); continue; }
    is(cta.dataset.advance, STEPS[i + 1], `(d) ${STEPS[i]} 의 행동 버튼이 다음 단계를 가리킨다`);
    click(w, cta);
    is(visible(d), [STEPS[i + 1]], `(d) 행동 버튼 클릭으로 ${STEPS[i + 1]} 로 실제 전진`);
  }
  const last = d.querySelector(`section.jstep[data-step="${STEPS[STEPS.length - 1]}"]`);
  is(!!last.querySelector('.jr-done'), true, '(f) 마지막 단계에 여정 완료 표현이 있다');
}

/* ---------- (e) #<step-id> 딥링크 ---------- */
for (const sid of STEPS) {
  const { window: w } = boot(); const d = w.document;
  w.location.hash = '#' + sid;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  is(visible(d), [sid], `(e) 딥링크 #${sid} 로 그 단계가 열린다`);
}
{
  const { window: w } = boot(); const d = w.document;
  w.location.hash = '#STP-does-not-exist';
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
  is(visible(d), [STEPS[0]], '(e) 알 수 없는 해시는 1단계로 폴백한다');
}

/* ---------- (f) 분기 선택 — 문서가 선언한 대상으로 ---------- */
{
  const { window: w } = boot(); const d = w.document;
  const rows = [...d.querySelectorAll('.br-go')];
  is(rows.length, BRANCHES.length, '(f) 분기 컨트롤 수가 문서 §4 행 수와 같다');
  is(rows.map(a => a.dataset.goto), BRANCHES.map(b => `${b.journey}#${b.step}`),
     '(f) 분기 대상이 문서 §4 와 순서까지 일치');
  BRANCHES.forEach((b, i) => {
    const a = rows[i]; if (!a) return;
    if (b.journey === JID) {
      click(w, a);
      is(visible(d), [b.step], `(f) 같은 여정 분기 → ${b.step} 로 실제 이동`);
    } else {
      const href = a.getAttribute('href');
      const target = path.join(path.dirname(PAGE), href.split('#')[0]);
      is(fs.existsSync(target), true, `(f) 타 여정 분기 → 착지 파일 ${href} 실재`);
    }
  });
}

/* ---------- (g) 정적 동작: 외부 자원은 웹폰트뿐 ---------- */
{
  const { window: w } = boot(); const d = w.document;
  const ext = [...d.querySelectorAll('[src],[href]')]
    .map(e => e.getAttribute('src') || e.getAttribute('href'))
    .filter(u => /^https?:/.test(u))
    .filter(u => !/fonts\.(googleapis|gstatic)\.com/.test(u));
  is(ext, [], '(g) 웹폰트 외 외부 자원 0건 — 빌드·네트워크 없이 열린다');
  is(!!d.getElementById('sentlist').children.length, true,
     '(g) 흡수한 화면의 인라인 스크립트가 그대로 동작한다(#sentlist 렌더)');
  is(d.getElementById('senttime').innerHTML.includes('<rect'), true,
     '(g) 누적 분위기 차트(#senttime)가 렌더된다');
}

console.log(`\n${fail ? 'FAIL' : 'PASS'} — ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
