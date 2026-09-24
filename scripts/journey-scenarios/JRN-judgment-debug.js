/* JRN-judgment-debug — 페이지 고유 조작 시나리오.
 *
 *   inputs(t)  (d) 값 변경이 렌더를 **실제로** 바꾸는가
 *   states(t)  (e) 인덱스가 등재한 상태에 프로토타입 안의 조작만으로 도달하는가
 *   unlock     (c) 전진이 비활성인 단계를 여는 선행 제품 행동 — 이 여정에는 없다
 *   renders(t) (h) 인라인 스크립트만으로 실제 렌더가 일어나는가
 *
 * 이 여정의 뼈대는 **고른 결과 하나가 이후 화면 전부의 맥락**이라는 것이다. 화면 1 에서
 * 결과를 바꾸면 호출·입력·실행·판정 근거가 전부 그 결과 기준으로 다시 그려진다. 그래서
 * 상태 대부분은 「어떤 결과를 고르느냐」로 도달한다 — 제보 링크로 들어온 기본 결과
 * (R-2609-0412)는 응답과 저장값이 어긋난 사례다.
 */

const pickOption = (t, w, el, v) => {
  const opt = [...(el.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select id=${el.id}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, el, 'change');
  return true;
};
const typeIn = (t, w, el, v, evt) => { el.value = String(v); t.fire(w, el, evt || 'input'); };
const check = (t, w, el, on) => { el.checked = on; t.fire(w, el, 'change'); };

/* 화면 1 에서 결과 하나를 라디오로 고른다 — 사용자가 하는 방식 그대로. */
const pickRec = (t, w, d, id) => {
  const r = d.querySelector(`#rec-rows input[name="rec"][value="${id}"]`);
  if (!r) { t.bad(`(e) 결과 ${id} 의 선택 라디오가 목록에 없다`); return; }
  r.checked = true;
  t.fire(w, r, 'change');
};
const adv = (t, w, d, n) => { for (let i = 1; i <= n; i++) t.click(w, d.getElementById('cta-' + i)); };

module.exports = {
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();
    const shape = (id, tag, type) => {
      const el = d.getElementById(id);
      if (!el) return t.bad(`(d) #${id} 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) #${id} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) #${id} 의 type 은 ${type}`);
    };
    shape('q', 'INPUT', 'search');
    shape('symptom', 'SELECT');
    shape('prompt-part', 'SELECT');
    shape('diff-only', 'INPUT', 'checkbox');
    shape('body-ver', 'SELECT');
    shape('run-pick', 'SELECT');
    shape('run-symptom', 'SELECT');
    shape('conc-th', 'INPUT', 'number');
    shape('apply-same', 'INPUT', 'checkbox');
    shape('cause-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="cause"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 원인 컨트롤이 전부 실제 <input type=radio> 다');
    t.is([...d.querySelectorAll('input[name="rec"]')].every(e => e.type === 'radio'),
      true, '(d) 결과 선택이 전부 실제 <input type=radio> 다');

    /* 화면 1 — 검색 타이핑과 증상 <select> 가 목록을 실제로 바꾼다. */
    const rows = () => d.querySelectorAll('#rec-rows tr').length;
    const all = rows();
    t.is(all > 0, true, '(d) 결과 목록이 인라인 스크립트로 렌더된다');
    typeIn(t, w, d.getElementById('q'), '반도체');
    t.is(rows() > 0 && rows() < all, true, '(d) 검색 <input type=search> 타이핑이 목록을 실제로 좁힌다');
    typeIn(t, w, d.getElementById('q'), '');
    pickOption(t, w, d.getElementById('symptom'), 'failed');
    t.is(rows() > 0 && rows() < all, true, '(d) 증상 <select> 가 목록을 실제로 좁힌다');
    pickOption(t, w, d.getElementById('symptom'), 'all');

    /* 화면 1 — 결과를 바꾸면 고른 결과 요약이 바뀐다. */
    const pickBefore = d.getElementById('pick-kv').textContent;
    pickRec(t, w, d, 'R-2609-0351');
    t.is(d.getElementById('pick-kv').textContent !== pickBefore, true, '(d) 결과 라디오가 고른 결과 요약을 실제로 바꾼다');
    pickRec(t, w, d, 'R-2609-0412');

    /* 화면 2 — 요청 부분 <select> 가 원문 블록을, 체크박스가 대조 표를 바꾼다. */
    adv(t, w, d, 1);
    const pre = d.getElementById('prompt-pre').textContent;
    pickOption(t, w, d.getElementById('prompt-part'), 'system');
    t.is(d.getElementById('prompt-pre').textContent !== pre, true, '(d) 요청 부분 <select> 가 보여 주는 원문을 실제로 바꾼다');
    pickOption(t, w, d.getElementById('prompt-part'), 'user');
    const cmp = d.querySelectorAll('#cmp-rows tr').length;
    check(t, w, d.getElementById('diff-only'), true);
    t.is(d.querySelectorAll('#cmp-rows tr').length < cmp, true, '(d) 「어긋난 필드만」 체크박스가 대조 표를 실제로 좁힌다');
    check(t, w, d.getElementById('diff-only'), false);

    /* 화면 3 — 원문 버전 <select> 가 원문과 대조 결론을 바꾼다. */
    t.click(w, d.getElementById('cta-2'));
    const arch = d.getElementById('arch-body').textContent;
    const sum = d.getElementById('diff-sum').textContent;
    pickOption(t, w, d.getElementById('body-ver'), 'v1');
    t.is(d.getElementById('arch-body').textContent !== arch, true, '(d) 원문 버전 <select> 가 보관 원문을 실제로 바꾼다');
    t.is(d.getElementById('diff-sum').textContent !== sum, true, '(d) 원문 버전 <select> 가 대조 결론을 실제로 바꾼다');

    /* 화면 4 — 실행 <select>·증상 <select>·기준 <input> 이 각각 렌더를 바꾼다. */
    t.click(w, d.getElementById('cta-3'));
    const stages = d.getElementById('stage-rows').textContent;
    pickOption(t, w, d.getElementById('run-pick'), 'R0200');
    t.is(d.getElementById('stage-rows').textContent !== stages, true, '(d) 실행 <select> 가 단계 표를 실제로 바꾼다');
    pickOption(t, w, d.getElementById('run-pick'), 'R0300');
    const cnt = d.getElementById('sym-count').textContent;
    pickOption(t, w, d.getElementById('run-symptom'), 'notcalled');
    t.is(d.getElementById('sym-count').textContent !== cnt, true, '(d) 증상 <select> 가 건수를 실제로 다시 센다');
    pickOption(t, w, d.getElementById('run-symptom'), 'mismatch');
    const why = d.getElementById('conc-why').textContent;
    typeIn(t, w, d.getElementById('conc-th'), 3);
    t.is(d.getElementById('conc-why').textContent !== why, true, '(d) 몰림 기준 <input type=number> 가 판정 문구를 실제로 바꾼다');
    typeIn(t, w, d.getElementById('conc-th'), 2);

    /* 화면 5 — 같은 증상 적용 체크박스와 <textarea> 타이핑. */
    t.click(w, d.getElementById('cta-4'));
    const ckv = d.getElementById('cause-kv').textContent;
    check(t, w, d.getElementById('apply-same'), true);
    t.is(d.getElementById('cause-kv').textContent !== ckv, true, '(d) 「같은 증상에도 적용」 체크박스가 판정 대상 건수를 실제로 바꾼다');
    const memo = d.getElementById('cause-memo');
    typeIn(t, w, memo, '타이핑 확인');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  async states(t) {
    {
      /* no-match — 없는 번호로 찾는다 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-match'), false, '(e) no-match — 기본 목록은 비어 있지 않다');
      typeIn(t, w, d.getElementById('q'), 'R-0000-9999');
      t.is(t.shown(d, 'no-match'), true, '(e) no-match — 없는 레코드 번호로 찾으면 빈 결과 상태에 도달');
      typeIn(t, w, d.getElementById('q'), '');
      t.is(t.shown(d, 'no-match'), false, '(e) no-match — 검색어를 지우면 해소된다');
    }
    {
      /* parse-mismatch ↔ call-failed — 결과를 바꿔 호출 기록의 모양을 바꾼다 */
      const { w, d } = t.boot();
      adv(t, w, d, 1);
      t.is(t.shown(d, 'parse-mismatch'), true, '(e) parse-mismatch — 제보된 결과는 응답과 저장값이 어긋난 상태로 열린다');
      t.is(d.getElementById('cmp-rows').textContent.includes('다름'), true, '(e) parse-mismatch — 대조 표에 어긋난 필드가 실제로 표기된다');
      pickRec(t, w, d, 'R-2609-0398');
      t.is(t.shown(d, 'parse-mismatch'), false, '(e) parse-mismatch — 다른 결과를 고르면 해소된다');
      t.is(t.shown(d, 'call-failed'), true, '(e) call-failed — 호출이 실패한 결과를 고르면 호출 실패 상태에 도달');
      t.is(d.getElementById('fail-err').textContent.length > 0, true, '(e) call-failed — 마지막 오류가 실제로 표기된다');
    }
    {
      /* not-called — 본문 없이 모델을 부르지 않은 결과 */
      const { w, d } = t.boot();
      pickRec(t, w, d, 'R-2609-0377');
      adv(t, w, d, 1);
      t.is(t.shown(d, 'not-called'), true, '(e) not-called — 미호출 결과를 고르면 미호출 상태에 도달');
      t.is(d.getElementById('exchange').hidden, true, '(e) not-called — 없는 요청·응답을 그리지 않는다');
    }
    {
      /* reused → 원 호출 열기 */
      const { w, d } = t.boot();
      pickRec(t, w, d, 'R-2609-0365');
      adv(t, w, d, 1);
      t.is(t.shown(d, 'reused'), true, '(e) reused — 재사용 결과를 고르면 재사용 상태에 도달');
      t.click(w, d.getElementById('open-orig'));
      t.is(t.shown(d, 'reused'), false, '(e) reused — 원 호출 기록을 열면 해소된다');
      t.is(d.getElementById('call-kv').textContent.includes('C-6980'), true, '(e) reused — 원 호출의 기록이 실제로 열린다');
    }
    {
      /* no-call-record — 기록 도입 이전 결과 */
      const { w, d } = t.boot();
      pickRec(t, w, d, 'R-2608-2210');
      adv(t, w, d, 1);
      t.is(t.shown(d, 'no-call-record'), true, '(e) no-call-record — 기록 이전 결과를 고르면 기록 없음 상태에 도달');
    }
    {
      /* body-mismatch — 분석 뒤 수정된 기사 */
      const { w, d } = t.boot();
      adv(t, w, d, 2);
      t.is(t.shown(d, 'body-mismatch'), false, '(e) body-mismatch — 분석에 쓴 본문이 최신이면 경고가 아니다');
      t.click(w, d.querySelector('[data-goto-step="STP-pin-record"]'));
      pickRec(t, w, d, 'R-2609-0351');
      adv(t, w, d, 2);
      t.is(t.shown(d, 'body-mismatch'), true, '(e) body-mismatch — 분석 뒤 수정된 기사를 고르면 본문 불일치 상태에 도달');
      t.is(Number(d.getElementById('stale-n').textContent) > 0, true, '(e) body-mismatch — 분석 뒤 수정 횟수가 실제로 표기된다');
    }
    {
      /* body-empty — 안내 문구뿐인 본문 */
      const { w, d } = t.boot();
      pickRec(t, w, d, 'R-2609-0420');
      adv(t, w, d, 2);
      t.is(t.shown(d, 'body-empty'), true, '(e) body-empty — 안내 문구뿐인 본문을 고르면 빈 본문 상태에 도달');
      t.click(w, d.querySelector('[data-goto-step="STP-pin-record"]'));
      pickRec(t, w, d, 'R-2609-0412');
      adv(t, w, d, 2);
      t.is(t.shown(d, 'body-empty'), false, '(e) body-empty — 본문이 있는 결과로 바꾸면 해소된다');
    }
    {
      /* run-concentrated — 기준을 올리면 해소, 내리면 도달 */
      const { w, d } = t.boot();
      adv(t, w, d, 3);
      t.is(t.shown(d, 'run-concentrated'), true, '(e) run-concentrated — 제보된 결과의 실행에는 불일치가 몰려 있다');
      typeIn(t, w, d.getElementById('conc-th'), 10);
      t.is(t.shown(d, 'run-concentrated'), false, '(e) run-concentrated — 기준을 올리면 해소된다');
      typeIn(t, w, d.getElementById('conc-th'), 2);
      t.is(t.shown(d, 'run-concentrated'), true, '(e) run-concentrated — 기준을 되돌리면 다시 도달');
      pickOption(t, w, d.getElementById('run-pick'), 'R0200');
      t.is(t.shown(d, 'run-concentrated'), false, '(e) run-concentrated — 직전 실행에는 그 증상이 몰려 있지 않다');
    }
    {
      /* run-stage-failed — 분석 단계에서 멈춘 실행 */
      const { w, d } = t.boot();
      adv(t, w, d, 3);
      t.is(t.shown(d, 'run-stage-failed'), false, '(e) run-stage-failed — 완료된 실행은 중단 상태가 아니다');
      pickOption(t, w, d.getElementById('run-pick'), 'R2300');
      t.is(t.shown(d, 'run-stage-failed'), true, '(e) run-stage-failed — 멈춘 실행을 고르면 단계 중단 상태에 도달');
      t.is(d.getElementById('stage-rows').textContent.includes('✓ 입력 = 합'), true,
        '(e) run-stage-failed — 멈춘 단계도 입력과 결과별 합이 맞게 기록돼 있다');
    }
    {
      /* invalid → recorded */
      const { w, d } = t.boot();
      adv(t, w, d, 4);
      t.fire(w, d.getElementById('cause-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
      d.querySelector('input[name="cause"][value="parse"]').checked = true;
      t.fire(w, d.getElementById('cause-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 원인만 있고 메모가 비면 여전히 실패');
      typeIn(t, w, d.getElementById('cause-memo'), '응답의 최종 JSON 은 혼합인데 초안 JSON 이 저장됐다. 이 실행부터 분석 코드가 바뀌었다');
      t.fire(w, d.getElementById('cause-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 원인 판정 기록 성공 상태에 도달');
    }
  },

  async renders(t) {
    const { d } = t.boot();
    t.is(d.querySelectorAll('#rec-rows tr').length > 0, true, '(h) 인라인 스크립트만으로 결과 목록이 렌더된다');
    t.is(d.querySelectorAll('#cmp-rows tr').length > 0, true, '(h) 응답↔저장값 대조 표가 인라인 스크립트로 렌더된다');
    t.is(d.querySelectorAll('#stage-rows tr').length > 0, true, '(h) 실행 단계 표가 인라인 스크립트로 렌더된다');
    t.is(d.querySelectorAll('#evidence-rows tr').length > 0, true, '(h) 판정 근거 표가 인라인 스크립트로 렌더된다');
    /* 원문 열기 — 고른 결과의 원래 주소를 새 탭으로. 외부 주소는 href 가 아니라 data-url 에 두어
       페이지가 외부 자원을 품지 않게 한다((h) 정적 동작). */
    for (const id of ['open-source-1', 'open-source-3']) {
      const b = d.getElementById(id);
      t.is(!!b && b.tagName === 'BUTTON' && !b.closest('[data-meta-layer]'), true, `(h) #${id} 원문 열기 버튼이 제품 평면에 있다`);
      if (b) t.is(/^https:\/\//.test(b.getAttribute('data-url') || ''), true, `(h) #${id} 가 고른 결과의 원문 주소를 싣는다`);
    }
    /* 원문 추적 상세로 가는 CTA — 고른 결과를 들고 원문 추적 화면에 착지한다. */
    for (const id of ['to-trace-1', 'to-trace-3']) {
      const a = d.getElementById(id);
      t.is(!!a && !a.closest('[data-meta-layer]'), true, `(h) #${id} 원문 추적 CTA 가 제품 평면에 있다`);
      if (a) t.is(a.getAttribute('href'), 'JRN-spike-verification.html?record_id=R-2609-0412#STP-open-origin',
        `(h) #${id} 가 고른 결과를 들고 원문 추적 단계로 간다`);
    }
  },
};
