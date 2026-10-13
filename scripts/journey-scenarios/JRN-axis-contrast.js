const pickFirstOutlier = (t, w, d) => {
  const row = d.querySelector('#outlierlist .trow');
  if (!row) return null;
  t.click(w, row);
  return row;
};

const walkToPick = (t, w, d) => {
  t.click(w, d.getElementById('cta-1'));
  t.click(w, d.getElementById('cta-2'));
  t.click(w, d.getElementById('cta-3'));
};

module.exports = {
  unlock: {
    'STP-pick-outlier': (t, w, d) => pickFirstOutlier(t, w, d),
  },

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
    shape('range', 'SELECT');
    shape('normalize', 'INPUT', 'checkbox');
    shape('q', 'INPUT', 'search');
    shape('only-unique', 'INPUT', 'checkbox');
    shape('src-axis', 'SELECT');
    shape('topic-axis', 'SELECT');
    shape('gapthresh', 'INPUT', 'number');
    shape('alias-merge', 'INPUT', 'checkbox');
    t.is([...d.querySelectorAll('input[name="show-axis"]')].every(e => e.tagName === 'INPUT' && e.type === 'checkbox'),
      true, '(d) 표시할 축 컨트롤이 전부 실제 <input type=checkbox> 다');

    t.is(d.getElementById('src-axis') !== d.getElementById('topic-axis'), true,
      '(d) 출처 축과 대상 축이 별개의 <select> 로 분리돼 있다');

    const pickOption = (el, v) => {
      const opt = [...(el.options || [])].find(o => o.value === v);
      if (!opt) { t.bad(`(d) #${el.id} 에 <option value=${v}> 가 없다`); return false; }
      opt.selected = true; t.fire(w, el, 'change'); return true;
    };

    const topsBefore = d.getElementById('axistops').innerHTML;
    const q = d.getElementById('q');
    q.value = '존재하지-않는-대상'; t.fire(w, q, 'input');
    t.is(d.querySelectorAll('#axistops .rankrow').length, 0,
      '(d) <input type=search> 입력이 축별 순위를 실제로 필터한다');
    q.value = ''; t.fire(w, q, 'input');
    t.is(d.getElementById('axistops').innerHTML, topsBefore, '(d) 검색어를 지우면 순위가 되돌아온다');

    const allRows = d.querySelectorAll('#axistops .rankrow').length;
    const uniq = d.getElementById('only-unique');
    uniq.checked = true; t.fire(w, uniq, 'change');
    const uniqRows = d.querySelectorAll('#axistops .rankrow').length;
    t.is(uniqRows > 0 && uniqRows < allRows, true,
      '(d) <input type=checkbox> 전환이 공통 대상을 실제로 걷어 낸다');
    uniq.checked = false; t.fire(w, uniq, 'change');
    t.is(d.querySelectorAll('#axistops .rankrow').length, allRows, '(d) 해제하면 전체 순위로 되돌아온다');

    const mtxBefore = d.getElementById('axis-matrix').innerHTML;
    if (pickOption(d.getElementById('src-axis'), 'US')) {
      t.is(d.getElementById('axis-matrix').innerHTML !== mtxBefore, true,
        '(d) 출처 축 <select> 선택이 조합 표를 실제로 바꾼다');
    }
    const mtxSrc = d.getElementById('axis-matrix').innerHTML;
    if (pickOption(d.getElementById('topic-axis'), 'KR')) {
      t.is(d.getElementById('axis-matrix').innerHTML !== mtxSrc, true,
        '(d) 대상 축 <select> 선택이 조합 표를 다시 바꾼다 — 두 기준이 독립이다');
    }

    const outBefore = d.querySelectorAll('#outlierlist .trow').length;
    const th = d.getElementById('gapthresh');
    th.value = '15'; t.fire(w, th, 'input');
    const outAfter = d.querySelectorAll('#outlierlist .trow').length;
    t.is(outAfter > 0 && outAfter < outBefore, true,
      '(d) <input type=number> 임계 변경이 후보 목록을 실제로 줄인다');
    th.value = '5'; t.fire(w, th, 'input');

    const alias = d.getElementById('alias-merge');
    const mergedBefore = d.querySelectorAll('#outlierlist .trow[data-target="usdkrw"]').length;
    alias.checked = true; t.fire(w, alias, 'change');
    t.is(d.querySelectorAll('#outlierlist .trow .tag').length > 0, true,
      '(d) 표기 변형 통합 체크박스가 통합된 행을 실제로 표기한다');
    t.is(d.querySelectorAll('#outlierlist .trow[data-target="usdkrw"]').length, mergedBefore,
      '(d) 통합해도 대상 식별자는 그대로 유지된다');
    alias.checked = false; t.fire(w, alias, 'change');

    const cardsBefore = d.getElementById('axiscards').innerHTML;
    pickOption(d.getElementById('range'), '30');
    t.fire(w, d.getElementById('sync-form'), 'submit');
    await t.sleep(400);
    t.is(d.getElementById('axiscards').innerHTML !== cardsBefore, true,
      '(d) 기간 <select> + 폼 제출이 축 카드를 실제로 다시 그린다');

    walkToPick(t, w, d);
    pickFirstOutlier(t, w, d);
    t.click(w, d.getElementById('cta-4'));
    const chartBefore = d.getElementById('trendchart').innerHTML;
    const legendBefore = d.querySelectorAll('#trend-legend > span').length;
    // 고른 대상이 모든 축에 있지는 않다 — 범례에 실제로 그려진 축 하나를 끈다.
    const drawnLabel = (d.querySelector('#trend-legend > span')?.textContent || '').trim();
    const kr = [...d.querySelectorAll('input[name="show-axis"]')]
      .find(c => c.parentElement.textContent.trim() === drawnLabel);
    if (!kr) { t.bad(`(d) 범례의 축 「${drawnLabel}」 에 대응하는 표시 체크박스가 없다`); return; }
    kr.checked = false; t.fire(w, kr, 'change');
    t.is(d.getElementById('trendchart').innerHTML !== chartBefore, true,
      '(d) <input type=checkbox> 로 축을 끄면 축별 시계열이 실제로 바뀐다');
    t.is(d.querySelectorAll('#trend-legend > span').length, legendBefore - 1,
      '(d) 끈 축은 범례에서도 빠진다');
    kr.checked = true; t.fire(w, kr, 'change');
    t.is(d.getElementById('trendchart').innerHTML, chartBefore, '(d) 축을 다시 켜면 차트가 되돌아온다');
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'loading'), false, '(e) loading — 진입 직후에는 로딩이 아니다');
      t.fire(w, d.getElementById('sync-form'), 'submit');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 기준 적용 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 로딩이 실제로 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'axis-empty'), false, '(e) axis-empty — 최근 7일에는 빈 축이 없다');
      const range = d.getElementById('range');
      [...range.options].find(o => o.value === '1').selected = true;
      t.fire(w, d.getElementById('sync-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'axis-empty'), true, '(e) axis-empty — 최근 24시간에서 빈 축 상태에 도달');
      t.is(d.querySelectorAll('#axistops .axpill').length, 2,
        '(e) axis-empty — 빈 축은 0%가 아니라 비교에서 실제로 제외된다');
      [...range.options].find(o => o.value === '7').selected = true;
      t.fire(w, d.getElementById('sync-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'axis-empty'), false, '(e) axis-empty — 기간을 되돌리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-selection'), true, '(e) no-selection — 대상을 고르기 전 상태');
      walkToPick(t, w, d);
      pickFirstOutlier(t, w, d);
      t.is(t.shown(d, 'no-selection'), false, '(e) no-selection — 행을 고르면 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-outlier'), false, '(e) no-outlier — 기본 임계에서는 후보가 있다');
      const th = d.getElementById('gapthresh');
      th.value = '40'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'no-outlier'), true, '(e) no-outlier — 임계를 올리면 "차이 없음" 상태에 도달');
      t.is(d.querySelectorAll('#outlierlist .trow').length, 0, '(e) no-outlier — 후보 목록이 실제로 비어 있다');
      th.value = '5'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'no-outlier'), false, '(e) no-outlier — 임계를 되돌리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'alias-merged'), false, '(e) alias-merged — 통합 전에는 표기 없음');
      const alias = d.getElementById('alias-merge');
      alias.checked = true; t.fire(w, alias, 'change');
      t.is(t.shown(d, 'alias-merged'), true, '(e) alias-merged — 통합을 켜면 통합 전후 표기 상태에 도달');
      alias.checked = false; t.fire(w, alias, 'change');
      t.is(t.shown(d, 'alias-merged'), false, '(e) alias-merged — 통합을 끄면 해소된다');
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(d.querySelectorAll('#axistops .rankrow').length > 0, true, '(h) 인라인 스크립트만으로 축별 순위가 렌더된다');
    t.is(d.querySelectorAll('#outlierlist .trow').length > 0, true, '(h) 격차 후보 목록이 인라인 스크립트로 렌더된다');
    walkToPick(t, w, d);
    pickFirstOutlier(t, w, d);
    t.click(w, d.getElementById('cta-4'));
    t.is(d.getElementById('trendchart').innerHTML.includes('<path'), true, '(h) 축별 시계열이 인라인 스크립트로 렌더된다');
  },
};
