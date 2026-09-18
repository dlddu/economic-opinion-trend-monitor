/* JRN-sentiment-shift — 페이지 고유 조작 시나리오.
 *
 *   inputs(t)  (d) 값 변경이 렌더를 **실제로** 바꾸는가
 *   states(t)  (e) 인덱스가 등재한 상태에 프로토타입 안의 조작만으로 도달하는가
 *   unlock     (c) 전진이 비활성인 단계를 여는 선행 제품 행동
 *   renders(t) (h) 인라인 스크립트만으로 실제 렌더가 일어나는가
 */

/* 화면 1에서 대상 하나를 고르는 제품 행동 — 여러 시나리오가 공유한다. */
const pickFirstTarget = (t, w, d) => {
  const row = d.querySelector('#targetlist .trow');
  if (!row) return null;
  t.click(w, row);
  return row;
};

module.exports = {
  /* (c) 1단계 전진은 '대상 선택' 이라는 선행 제품 행동을 요구한다. */
  unlock: {
    'STP-open-sentiment': (t, w, d) => pickFirstTarget(t, w, d),
  },

  /* (d) 값 변경이 렌더를 실제로 바꾼다. */
  async inputs(t) {
    const { w, d } = t.boot();

    /* 정체 확인 — jsdom 은 <span> 에도 .value 를 붙일 수 있어서, '값을 바꿨더니 렌더가 변했다'
       만으로는 모양만 입력인 요소를 걸러 내지 못한다. 태그·타입을 먼저 못 박는다. */
    const shape = (id, tag, type) => {
      const el = d.getElementById(id);
      if (!el) return t.bad(`(d) #${id} 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) #${id} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) #${id} 의 type 은 ${type}`);
    };
    shape('axis', 'SELECT');
    shape('q', 'INPUT', 'search');
    shape('nathresh', 'INPUT', 'number');
    shape('na-exclude', 'INPUT', 'checkbox');
    shape('tl-range', 'SELECT');
    shape('verdict-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="unit"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 단위 컨트롤이 전부 실제 <input type=radio> 다');
    t.is([...d.querySelectorAll('input[name="verdict"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 결론 컨트롤이 전부 실제 <input type=radio> 다');

    /* 값 변경이 렌더에 반영되는지 — 네 종류를 실제로 굴린다. */
    const before = d.getElementById('targetlist').innerHTML;
    const q = d.getElementById('q');
    q.value = '존재하지-않는-대상'; t.fire(w, q, 'input');
    t.is(d.querySelectorAll('#targetlist .trow').length, 0, '(d) <input type=search> 입력이 목록을 실제로 필터한다');
    q.value = ''; t.fire(w, q, 'input');
    t.is(d.getElementById('targetlist').innerHTML, before, '(d) 검색어를 지우면 목록이 되돌아온다');

    const axis = d.getElementById('axis');
    const kr = [...d.querySelectorAll('#targetlist .trow')].map(b => b.dataset.target);
    /* 사용자가 하는 방식으로 고른다 — <option> 선택은 진짜 <select> 에만 있다. */
    const pickOption = v => {
      const opt = [...(axis.options || [])].find(o => o.value === v);
      if (!opt) { t.bad(`(d) 축 <select> 에 <option value=${v}> 가 없다`); return false; }
      opt.selected = true; t.fire(w, axis, 'change'); return true;
    };
    if (pickOption('US')) {
      const us = [...d.querySelectorAll('#targetlist .trow')].map(b => b.dataset.target);
      t.is(JSON.stringify(kr) !== JSON.stringify(us) && us.length > 0, true,
        '(d) <select> 의 <option> 선택이 목록을 실제로 바꾼다');
      pickOption('KR');
    }

    pickFirstTarget(t, w, d);
    t.click(w, d.getElementById('cta-1'));
    const chk = d.getElementById('na-exclude');
    const kvBefore = d.getElementById('na-kv').textContent;
    chk.checked = false; t.fire(w, chk, 'change');
    t.is(d.getElementById('na-kv').textContent !== kvBefore, true,
      '(d) <input type=checkbox> 전환이 비율 표기를 실제로 바꾼다');

    t.click(w, d.getElementById('cta-2'));
    const chartBefore = d.getElementById('senttime').innerHTML;
    d.querySelector('input[name="unit"][value="week"]').checked = true;
    t.fire(w, d.getElementById('tl-form'), 'submit');
    await t.sleep(400);
    t.is(d.getElementById('senttime').innerHTML !== chartBefore, true,
      '(d) <input type=radio> + 폼 제출이 차트를 실제로 다시 그린다');

    t.click(w, d.getElementById('cta-3'));
    const memo = d.getElementById('verdict-memo');
    memo.value = '타이핑 확인'; t.fire(w, memo, 'input');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  /* (e) 각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다. */
  async states(t) {
    {
      /* no-selection — 진입 직후 오른쪽 분포 패널 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-selection'), true, '(e) no-selection — 진입 직후 대상 미선택 상태');
      pickFirstTarget(t, w, d);
      t.is(t.shown(d, 'no-selection'), false, '(e) no-selection — 대상을 고르면 해소된다');
    }
    {
      /* empty — 검색 결과 0건 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'empty'), false, '(e) empty — 목록이 있을 때는 빈 상태가 아니다');
      const q = d.getElementById('q');
      q.value = '존재하지-않는-대상'; t.fire(w, q, 'input');
      t.is(t.shown(d, 'empty'), true, '(e) empty — 검색 결과 0건에서 빈 상태에 도달');
      q.value = ''; t.fire(w, q, 'input');
      t.is(t.shown(d, 'empty'), false, '(e) empty — 검색어를 지우면 해소된다');
    }
    {
      /* unanalyzed-warning — 임계를 실제 비중 아래로 내린다 */
      const { w, d } = t.boot();
      pickFirstTarget(t, w, d);
      const th = d.getElementById('nathresh');
      th.value = '99'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'unanalyzed-warning'), false, '(e) unanalyzed-warning — 임계가 높으면 경고가 없다');
      th.value = '0'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'unanalyzed-warning'), true, '(e) unanalyzed-warning — 임계를 내리면 경고 상태에 도달');
    }
    {
      /* loading → 해소 */
      const { w, d } = t.boot();
      pickFirstTarget(t, w, d);
      t.click(w, d.getElementById('cta-1'));
      t.click(w, d.getElementById('cta-2'));
      t.fire(w, d.getElementById('tl-form'), 'submit');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 적용 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 로딩이 실제로 해소된다');
    }
    {
      /* low-sample — 시간 단위 */
      const { w, d } = t.boot();
      pickFirstTarget(t, w, d);
      t.click(w, d.getElementById('cta-1'));
      t.click(w, d.getElementById('cta-2'));
      t.is(t.shown(d, 'low-sample'), false, '(e) low-sample — 일 단위에서는 표본 부족이 없다');
      d.querySelector('input[name="unit"][value="hour"]').checked = true;
      t.fire(w, d.getElementById('tl-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'low-sample'), true, '(e) low-sample — 시간 단위에서 표본 부족 상태에 도달');
      t.is(d.querySelectorAll('#senttime .thin').length > 0, true, '(e) low-sample — 해당 구간이 실제로 흐리게 그려진다');
    }
    {
      /* invalid → recorded */
      const { w, d } = t.boot();
      pickFirstTarget(t, w, d);
      t.click(w, d.getElementById('cta-1'));
      t.click(w, d.getElementById('cta-2'));
      t.click(w, d.getElementById('cta-3'));
      t.fire(w, d.getElementById('verdict-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
      d.querySelector('input[name="verdict"]').checked = true;
      t.fire(w, d.getElementById('verdict-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 결론만 있고 메모가 비면 여전히 실패');
      const memo = d.getElementById('verdict-memo');
      memo.value = 'D-2 구간부터 부정이 지속 상승, 표본 수는 안정';
      t.fire(w, d.getElementById('verdict-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 판별 기록 성공 상태에 도달');
    }
  },

  /* (h) 인라인 스크립트만으로 실제 렌더가 일어난다. */
  async renders(t) {
    const { d } = t.boot();
    t.is(d.querySelectorAll('#targetlist .trow').length > 0, true, '(h) 인라인 스크립트만으로 목록이 렌더된다');
    t.is(d.getElementById('senttime').innerHTML.includes('<rect'), true, '(h) 차트가 인라인 스크립트로 렌더된다');
  },
};
