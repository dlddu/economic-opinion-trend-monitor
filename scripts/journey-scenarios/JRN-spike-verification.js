/* JRN-spike-verification — 페이지 고유 조작 시나리오.
 *
 * 범용 러너(check-journey-flow.js)가 SSOT 만으로 판정할 수 없는 것만 여기 둔다:
 * 어떤 제품 행동이 전진을 여는가(unlock), 값 변경이 렌더를 실제로 바꾸는가(inputs),
 * 각 상태에 어떤 조작으로 도달하는가(states).
 */

/* 화면 4에서 기여 뉴스 한 건을 고르는 제품 행동 — 원문으로 내려가는 선행 조건. */
const pickFirstArticle = (t, w, d) => {
  const row = d.querySelector('#artlist .trow');
  if (!row) return null;
  t.click(w, row);
  return row;
};

/* 화면 4까지 화면 안 행동만으로 내려간다. */
const walkToArticles = (t, w, d) => {
  t.click(w, d.getElementById('cta-1'));
  t.click(w, d.getElementById('cta-2'));
  t.click(w, d.getElementById('cta-3'));
};

/* 화면 6(판정)까지 내려간다 — 기사 선택이 4단계 전진의 선행 조건이다. */
const walkToJudge = (t, w, d) => {
  walkToArticles(t, w, d);
  pickFirstArticle(t, w, d);
  t.click(w, d.getElementById('cta-4'));
  t.click(w, d.getElementById('cta-5'));
};

module.exports = {
  /* (c) 4단계 전진은 '기여 뉴스 선택' 이라는 선행 제품 행동을 요구한다. */
  unlock: {
    'STP-drilldown-articles': (t, w, d) => pickFirstArticle(t, w, d),
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
    shape('range', 'SELECT');
    shape('normalize', 'INPUT', 'checkbox');
    shape('src-q', 'INPUT', 'search');
    shape('split-lowconf', 'INPUT', 'checkbox');
    shape('art-q', 'INPUT', 'search');
    shape('dup-only', 'INPUT', 'checkbox');
    shape('link-state', 'SELECT');
    shape('judge-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="verdict"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 결론 컨트롤이 전부 실제 <input type=radio> 다');

    const pickOption = (el, v) => {
      const opt = [...(el.options || [])].find(o => o.value === v);
      if (!opt) { t.bad(`(d) #${el.id} 에 <option value=${v}> 가 없다`); return false; }
      opt.selected = true; t.fire(w, el, 'change'); return true;
    };

    /* 축 <select> — 급등 순위 목록 자체가 바뀐다(축마다 대상 집합이 다르다). */
    const spikesBefore = d.querySelectorAll('#spikelist .rankrow').length;
    if (pickOption(d.getElementById('axis'), 'WW')) {
      const after = d.querySelectorAll('#spikelist .rankrow').length;
      t.is(after > 0 && after !== spikesBefore, true,
        '(d) 축 <select> 변경이 급등 순위 목록을 실제로 바꾼다');
    }
    pickOption(d.getElementById('axis'), 'KR');
    t.is(d.querySelectorAll('#spikelist .rankrow').length, spikesBefore,
      '(d) 축을 되돌리면 순위가 되돌아온다');

    /* 비교 구간 <select> — 평소 대비 배수 표기가 바뀐다. */
    const multBefore = d.getElementById('spike-mult').textContent;
    if (pickOption(d.getElementById('range'), '30')) {
      t.is(d.getElementById('spike-mult').textContent !== multBefore, true,
        '(d) 비교 구간 <select> 변경이 평소 대비 배수를 실제로 다시 계산한다');
    }
    pickOption(d.getElementById('range'), '7');

    /* 정규화 <input type=checkbox> + 폼 제출 — 대비 표를 다시 그린다. */
    const normBefore = d.getElementById('normbody').innerHTML;
    const norm = d.getElementById('normalize');
    norm.checked = true; t.fire(w, norm, 'change');
    t.fire(w, d.getElementById('norm-form'), 'submit');
    await t.sleep(400);
    t.is(d.getElementById('normbody').innerHTML !== normBefore, true,
      '(d) 정규화 <input type=checkbox> + 제출이 원시↔정규화 대비 표를 실제로 다시 그린다');
    /* 규칙: 모든 수치 옆에 세는 방식이 상시 표시된다. */
    t.is(d.getElementById('tb-basis').textContent.includes('정규화'), true,
      '(d) 세는 방식이 전환되면 상시 표기도 함께 바뀐다');
    norm.checked = false; t.fire(w, norm, 'change');
    t.fire(w, d.getElementById('norm-form'), 'submit');
    await t.sleep(400);

    /* 수집원 <input type=search> — 소스 표를 실제로 필터한다. */
    const srcAll = d.querySelectorAll('#srcbody .srcrow').length;
    const srcQ = d.getElementById('src-q');
    srcQ.value = '존재하지-않는-수집원'; t.fire(w, srcQ, 'input');
    t.is(d.querySelectorAll('#srcbody .srcrow').length, 0,
      '(d) 수집원 <input type=search> 입력이 소스 표를 실제로 필터한다');
    srcQ.value = ''; t.fire(w, srcQ, 'input');
    t.is(d.querySelectorAll('#srcbody .srcrow').length, srcAll, '(d) 검색어를 지우면 소스 표가 되돌아온다');

    /* 분리 표기 <input type=checkbox> — 저신뢰 행을 집계에서 실제로 뺀다. */
    const topShareBefore = d.getElementById('top-src-share').textContent;
    const split = d.getElementById('split-lowconf');
    split.checked = true; t.fire(w, split, 'change');
    t.is(d.querySelectorAll('#srcbody .srcrow.split').length > 0, true,
      '(d) 분리 표기 체크박스가 저신뢰 행을 별도 항목으로 실제로 표기한다');
    t.is(d.getElementById('top-src-share').textContent !== topShareBefore, true,
      '(d) 분리한 만큼 기여 비중이 실제로 재계산된다');
    split.checked = false; t.fire(w, split, 'change');

    /* 기사 <input type=search> 와 중복 <input type=checkbox> — 목록을 실제로 줄인다. */
    const artAll = d.querySelectorAll('#artlist .trow').length;
    const dup = d.getElementById('dup-only');
    dup.checked = true; t.fire(w, dup, 'change');
    const dupRows = d.querySelectorAll('#artlist .trow').length;
    t.is(dupRows > 0 && dupRows < artAll, true,
      '(d) 본문 중복 체크박스가 재탕 기사만 실제로 남긴다');
    dup.checked = false; t.fire(w, dup, 'change');
    const artQ = d.getElementById('art-q');
    artQ.value = '존재하지-않는-제목'; t.fire(w, artQ, 'input');
    t.is(d.querySelectorAll('#artlist .trow').length, 0,
      '(d) 제목 <input type=search> 입력이 기여 뉴스 목록을 실제로 필터한다');
    artQ.value = ''; t.fire(w, artQ, 'input');
    t.is(d.querySelectorAll('#artlist .trow').length, artAll, '(d) 검색어를 지우면 기사 목록이 되돌아온다');

    /* 링크 상태 <select> — 원문 패널을 실제로 바꾼다. */
    const originBefore = d.getElementById('origin-body').innerHTML;
    if (pickOption(d.getElementById('link-state'), 'expired')) {
      t.is(d.getElementById('origin-body').innerHTML !== originBefore, true,
        '(d) 링크 상태 <select> 변경이 원문 패널을 실제로 바꾼다');
      t.is(d.getElementById('link-badge').textContent.includes('끊김'), true,
        '(d) 링크 상태가 배지로 상시 표시된다');
    }
    pickOption(d.getElementById('link-state'), 'ok');

    /* 기사 선택 — 근거 요약이 실제로 갱신된다(화면 6의 입력값이 된다). */
    const evidenceBefore = d.getElementById('evidence').innerHTML;
    walkToArticles(t, w, d);
    pickFirstArticle(t, w, d);
    t.is(d.getElementById('evidence').innerHTML !== evidenceBefore, true,
      '(d) 기사를 고르면 판정 화면의 근거 요약이 실제로 갱신된다');

    /* <textarea> — 타이핑이 반영된다. */
    t.click(w, d.getElementById('cta-4'));
    t.click(w, d.getElementById('cta-5'));
    const memo = d.getElementById('judge-memo');
    memo.value = '타이핑 확인'; t.fire(w, memo, 'input');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  /* (e) 각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다. */
  async states(t) {
    {
      /* loading — 세는 방식 적용 직후 → 해소 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'loading'), false, '(e) loading — 진입 직후에는 로딩이 아니다');
      t.fire(w, d.getElementById('norm-form'), 'submit');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 세는 방식 적용 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 로딩이 실제로 해소된다');
    }
    {
      /* normalized-away — 정규화하면 급등이 사라지는 갈래 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'normalized-away'), false, '(e) normalized-away — 원시 건수로는 급등이 남아 있다');
      const norm = d.getElementById('normalize');
      norm.checked = true; t.fire(w, norm, 'change');
      t.fire(w, d.getElementById('norm-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'normalized-away'), true, '(e) normalized-away — 정규화 후 급등 소멸 상태에 도달');
      norm.checked = false; t.fire(w, norm, 'change');
      t.fire(w, d.getElementById('norm-form'), 'submit');
      await t.sleep(400);
      t.is(t.shown(d, 'normalized-away'), false, '(e) normalized-away — 원시로 되돌리면 해소된다');
    }
    {
      /* low-confidence — 저신뢰·미분석 분리 표기 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'low-confidence'), false, '(e) low-confidence — 분리 전에는 경고가 없다');
      const split = d.getElementById('split-lowconf');
      split.checked = true; t.fire(w, split, 'change');
      t.is(t.shown(d, 'low-confidence'), true, '(e) low-confidence — 분리 표기를 켜면 상태에 도달');
      t.is(d.querySelectorAll('#srcbody .srcrow.split').length > 0, true,
        '(e) low-confidence — 저신뢰 행이 실제로 별도 항목으로 갈라진다');
      split.checked = false; t.fire(w, split, 'change');
      t.is(t.shown(d, 'low-confidence'), false, '(e) low-confidence — 끄면 해소된다');
    }
    {
      /* no-selection — 화면 4 진입 직후 오른쪽 패널 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-selection'), true, '(e) no-selection — 기사를 고르기 전 상태');
      walkToArticles(t, w, d);
      pickFirstArticle(t, w, d);
      t.is(t.shown(d, 'no-selection'), false, '(e) no-selection — 기사를 고르면 해소된다');
    }
    {
      /* link-expired — 원문 주소가 열리지 않는 갈래 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'link-expired'), false, '(e) link-expired — 링크가 정상이면 대체 표시가 없다');
      const ls = d.getElementById('link-state');
      [...ls.options].find(o => o.value === 'expired').selected = true;
      t.fire(w, ls, 'change');
      t.is(t.shown(d, 'link-expired'), true, '(e) link-expired — 만료 선택으로 보존 원문 대체 상태에 도달');
      t.is(d.getElementById('preserved').textContent.trim().length > 0, true,
        '(e) link-expired — 추적이 끊기지 않도록 보존 원문이 실제로 남아 있다');
      [...ls.options].find(o => o.value === 'ok').selected = true;
      t.fire(w, ls, 'change');
      t.is(t.shown(d, 'link-expired'), false, '(e) link-expired — 링크를 정상으로 되돌리면 해소된다');
    }
    {
      /* invalid → recorded */
      const { w, d } = t.boot();
      walkToJudge(t, w, d);
      t.fire(w, d.getElementById('judge-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
      d.querySelector('input[name="verdict"]').checked = true;
      t.fire(w, d.getElementById('judge-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 결론만 있고 메모가 비면 여전히 실패');
      const memo = d.getElementById('judge-memo');
      memo.value = '정규화하면 배수가 1.5 아래로 내려가고, 본문 중복 재탕이 2건 섞여 있다';
      t.fire(w, d.getElementById('judge-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 판정 기록 성공 상태에 도달');
    }
  },

  /* (h) 인라인 스크립트만으로 실제 렌더가 일어난다. */
  async renders(t) {
    const { w, d } = t.boot();
    t.is(d.querySelectorAll('#spikelist .rankrow').length > 0, true,
      '(h) 인라인 스크립트만으로 급등 순위가 렌더된다');
    t.is(d.querySelectorAll('#srcbody .srcrow').length > 0, true,
      '(h) 소스별 기여 표가 인라인 스크립트로 렌더된다');
    t.is(d.querySelectorAll('#artlist .trow').length > 0, true,
      '(h) 기여 뉴스 목록이 인라인 스크립트로 렌더된다');
    walkToJudge(t, w, d);
    t.is(d.getElementById('evidence').querySelectorAll('.kv').length > 0, true,
      '(h) 판정 화면의 근거 요약이 인라인 스크립트로 렌더된다');
  },
};
