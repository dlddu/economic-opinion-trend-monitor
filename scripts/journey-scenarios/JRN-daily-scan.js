/* JRN-daily-scan — 페이지 고유 조작 시나리오.
 */

/* 화면 2에서 대상 하나를 고르는 제품 행동 — 여러 시나리오가 공유한다. */
const pickFirstTarget = (t, w, d) => {
  const row = d.querySelector('#deltalist .trow');
  if (!row) { t.bad('(c) 화면 2의 변화 목록에 고를 수 있는 행이 없다'); return null; }
  t.click(w, row);
  return row;
};

/* <select> 의 <option> 을 사용자가 하는 방식으로 고른다 — 진짜 <select> 에만 있는 경로다. */
const pickOption = (t, w, sel, v) => {
  const opt = [...(sel.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select id=${sel.id}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, sel, 'change');
  return true;
};

/* 화면 1 → 2 로 넘어간다(전진은 화면 안의 행동으로만). */
const toDelta = (t, w, d) => t.click(w, d.getElementById('cta-1'));

/* 화면 2 → 3. 전진은 대상 선택을 요구하므로 선행 행동을 먼저 한다. */
const toWindow = (t, w, d) => {
  pickFirstTarget(t, w, d);
  t.click(w, d.getElementById('cta-2'));
};

module.exports = {
  /* (c) 2단계 전진은 '오늘 더 볼 대상 하나를 고른다' 는 선행 제품 행동을 요구한다. */
  unlock: {
    'STP-scan-delta': (t, w, d) => pickFirstTarget(t, w, d),
  },

  /* (d) 값 변경이 렌더를 실제로 바꾼다. */
  async inputs(t) {
    const { w, d } = t.boot();

    /* 정체 확인 — jsdom 은 <span> 에도 .value 를 붙일 수 있어서 '값을 바꿨더니 렌더가 변했다'
       만으로는 모양만 입력인 요소를 걸러 내지 못한다. 태그·타입을 먼저 못 박는다. */
    const shape = (id, tag, type) => {
      const el = d.getElementById(id);
      if (!el) return t.bad(`(d) #${id} 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) #${id} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) #${id} 의 type 은 ${type}`);
    };
    shape('axis', 'SELECT');
    shape('q', 'INPUT', 'search');
    shape('restore', 'INPUT', 'checkbox');
    shape('delta-basis', 'SELECT');
    shape('delta-thresh', 'INPUT', 'number');
    shape('only-new', 'INPUT', 'checkbox');
    shape('range', 'SELECT');
    shape('tr-compare', 'INPUT', 'checkbox');
    shape('tr-marks', 'SELECT');
    shape('shortlist-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="unit"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 집계 단위 컨트롤이 전부 실제 <input type=radio> 다');
    /* 화면 단위 목업이 쓰던 의사 세그먼트 컨트롤이 넘어오지 않았는지 — 규칙 5(d). */
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');

    /* 1) <input type=search> 가 목록을 실제로 필터한다. */
    const before = d.getElementById('ranklist').innerHTML;
    const q = d.getElementById('q');
    q.value = '존재하지-않는-대상'; t.fire(w, q, 'input');
    t.is(d.querySelectorAll('#ranklist .rankrow').length, 0,
      '(d) <input type=search> 입력이 상위 대상 목록을 실제로 필터한다');
    q.value = ''; t.fire(w, q, 'input');
    t.is(d.getElementById('ranklist').innerHTML, before, '(d) 검색어를 지우면 목록이 되돌아온다');

    /* 2) 축 <select> 가 목록을 실제로 바꾼다. */
    const kr = [...d.querySelectorAll('#ranklist .rankrow')].map(e => e.textContent.trim());
    if (pickOption(t, w, d.getElementById('axis'), 'US')) {
      const us = [...d.querySelectorAll('#ranklist .rankrow')].map(e => e.textContent.trim());
      t.is(JSON.stringify(kr) !== JSON.stringify(us) && us.length > 0, true,
        '(d) 축 <select> 의 <option> 선택이 목록을 실제로 바꾼다');
      pickOption(t, w, d.getElementById('axis'), 'KR');
    }

    /* 3) 증감 임계 <input type=number> 가 변화 목록을 좁힌다. */
    toDelta(t, w, d);
    const all = d.querySelectorAll('#deltalist .trow').length;
    const th = d.getElementById('delta-thresh');
    th.value = '5'; t.fire(w, th, 'input');
    const few = d.querySelectorAll('#deltalist .trow').length;
    t.is(few > 0 && few < all, true, '(d) <input type=number> 임계가 변화 목록을 실제로 좁힌다');
    th.value = '0'; t.fire(w, th, 'input');
    t.is(d.querySelectorAll('#deltalist .trow').length, all, '(d) 임계를 0으로 되돌리면 목록이 복원된다');

    /* 4) '새로 올라온 대상만' <input type=checkbox> 가 실제로 거른다. */
    const onlyNew = d.getElementById('only-new');
    onlyNew.checked = true; t.fire(w, onlyNew, 'change');
    const newOnly = [...d.querySelectorAll('#deltalist .trow')];
    t.is(newOnly.length > 0 && newOnly.length < all, true,
      '(d) <input type=checkbox> 가 신규 진입 대상만 남긴다');
    t.is(newOnly.every(b => b.textContent.includes('신규')), true,
      '(d) 남은 행이 실제로 신규 진입 대상이다');
    onlyNew.checked = false; t.fire(w, onlyNew, 'change');

    /* 5) 기간 <select> + 단위 <input type=radio> 제출이 순위표를 다시 그린다. */
    toWindow(t, w, d);
    const winBefore = d.getElementById('winlist').innerHTML;
    pickOption(t, w, d.getElementById('range'), '30');
    d.querySelector('input[name="unit"][value="week"]').checked = true;
    t.fire(w, d.getElementById('win-form'), 'submit');
    await t.sleep(400);
    t.is(d.getElementById('winlist').innerHTML !== winBefore, true,
      '(d) 기간 <select> + 단위 <input type=radio> 제출이 순위표를 실제로 다시 그린다');

    /* 6) 추세 화면의 <input type=checkbox> · <select> 가 차트를 다시 그린다. */
    t.click(w, d.getElementById('cta-3'));
    const chartBefore = d.getElementById('trendchart').innerHTML;
    const cmp = d.getElementById('tr-compare');
    cmp.checked = true; t.fire(w, cmp, 'change');
    t.is(d.getElementById('trendchart').innerHTML !== chartBefore, true,
      '(d) <input type=checkbox> 로 비교 대상을 겹치면 차트가 실제로 바뀐다');
    t.is(d.querySelectorAll('#trendtable tbody tr').length > 1, true,
      '(d) 비교 표에도 겹친 대상이 실제로 늘어난다');
    const marked = d.getElementById('trendchart').innerHTML;
    pickOption(t, w, d.getElementById('tr-marks'), 'all');
    t.is(d.getElementById('trendchart').innerHTML !== marked, true,
      '(d) 기여 뉴스 표기 <select> 가 차트를 실제로 바꾼다');

    /* 7) <textarea> 타이핑이 반영된다. */
    t.click(w, d.getElementById('cta-4'));
    const memo = d.getElementById('shortlist-memo');
    memo.value = '타이핑 확인'; t.fire(w, memo, 'input');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  /* (e) 각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다. */
  async states(t) {
    {
      /* empty-window — 밤사이 수집이 들어오지 않은 축 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'empty-window'), false, '(e) empty-window — 수집이 있는 축에서는 빈 상태가 아니다');
      pickOption(t, w, d.getElementById('axis'), 'GL');
      t.is(t.shown(d, 'empty-window'), true, '(e) empty-window — 수집이 빈 축에서 「데이터 없음」 상태에 도달');
      t.is(d.querySelectorAll('#ranklist .rankrow').length, 0,
        '(e) empty-window — 0% 행으로 채우지 않고 목록을 비운다');
      pickOption(t, w, d.getElementById('axis'), 'KR');
      t.is(t.shown(d, 'empty-window'), false, '(e) empty-window — 축을 되돌리면 해소된다');
    }
    {
      /* no-baseline — 저장된 기준 구간이 없어 증감을 계산할 수 없다 */
      const { w, d } = t.boot();
      toDelta(t, w, d);
      t.is(t.shown(d, 'no-baseline'), false, '(e) no-baseline — 직전 동일 구간에는 기준이 있다');
      pickOption(t, w, d.getElementById('delta-basis'), 'prev-week');
      t.is(t.shown(d, 'no-baseline'), true, '(e) no-baseline — 기준 없는 구간에서 계산 불가 상태에 도달');
      t.is([...d.querySelectorAll('#deltalist .dlt')].every(e => e.textContent.trim() === '—'), true,
        '(e) no-baseline — 증감 칸을 0 이 아니라 「—」 로 둔다');
      pickOption(t, w, d.getElementById('delta-basis'), 'prev');
      t.is(t.shown(d, 'no-baseline'), false, '(e) no-baseline — 기준이 있는 구간으로 되돌리면 해소된다');
    }
    {
      /* no-selection — 대상 미선택 */
      const { w, d } = t.boot();
      toDelta(t, w, d);
      t.is(t.shown(d, 'no-selection'), true, '(e) no-selection — 화면 2 진입 직후 대상 미선택 상태');
      pickFirstTarget(t, w, d);
      t.is(t.shown(d, 'no-selection'), false, '(e) no-selection — 대상을 고르면 해소된다');
    }
    {
      /* loading — 재집계 중 */
      const { w, d } = t.boot();
      toDelta(t, w, d);
      toWindow(t, w, d);
      t.fire(w, d.getElementById('win-form'), 'submit');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 기간 적용 직후 재집계 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 재집계가 실제로 해소된다');
    }
    {
      /* low-sample — 시간 단위 표본 부족 */
      const { w, d } = t.boot();
      toDelta(t, w, d);
      toWindow(t, w, d);
      t.is(t.shown(d, 'low-sample'), false, '(e) low-sample — 일 단위에서는 표본 부족이 없다');
      d.querySelector('input[name="unit"][value="hour"]').checked = true;
      t.fire(w, d.getElementById('win-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'low-sample'), true, '(e) low-sample — 시간 단위에서 표본 부족 상태에 도달');
      t.is(d.querySelectorAll('#winlist .thin').length > 0, true,
        '(e) low-sample — 해당 구간 수치가 실제로 흐리게 그려진다');
    }
    {
      /* invalid → recorded */
      const { w, d } = t.boot();
      toDelta(t, w, d);
      toWindow(t, w, d);
      t.click(w, d.getElementById('cta-3'));
      t.click(w, d.getElementById('cta-4'));

      t.fire(w, d.getElementById('shortlist-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 메모 없이 제출하면 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');

      const memo = d.getElementById('shortlist-memo');
      memo.value = '금리·환율 두 축이 같이 움직였는지 오전에 확인';
      [...d.querySelectorAll('input.cand')].forEach(c => { c.checked = false; t.fire(w, c, 'change'); });
      t.fire(w, d.getElementById('shortlist-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 후보를 하나도 고르지 않으면 여전히 실패');

      const first = d.querySelector('input.cand');
      first.checked = true; t.fire(w, first, 'change');
      t.fire(w, d.getElementById('shortlist-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 추림 완료 상태에 도달');
      t.is(d.getElementById('recorded-what').textContent.includes(first.value), true,
        '(e) recorded — 고른 대상이 결과에 실제로 실린다');
    }
  },

  /* (h) 인라인 스크립트만으로 실제 렌더가 일어난다. */
  async renders(t) {
    const { d } = t.boot();
    t.is(d.querySelectorAll('#ranklist .rankrow').length > 0, true,
      '(h) 인라인 스크립트만으로 상위 대상 목록이 렌더된다');
    t.is(d.querySelectorAll('#ranklist .spark').length > 0, true,
      '(h) 스파크라인이 인라인 스크립트로 렌더된다');
    t.is(d.getElementById('trendchart').innerHTML.includes('<path'), true,
      '(h) 추세 차트가 인라인 스크립트로 렌더된다');
    t.is(d.querySelectorAll('#trendtable tbody tr').length > 0, true,
      '(h) 비교 표가 인라인 스크립트로 렌더된다');
  },
};
