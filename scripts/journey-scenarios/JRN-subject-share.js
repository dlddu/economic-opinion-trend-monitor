/* JRN-subject-share — 페이지 고유 조작.
 * 네 단계가 모두 같은 화면 `dash` 를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안의 [data-role]」 로 찾는다. 정규화 전/후 전환은 순위 목록 머리에 렌더되는
 * 라디오라 그 단계에 들어간 뒤에야 DOM 에 있다. */
const S1 = 'STP-set-scope', S2 = 'STP-scan-ranking', S3 = 'STP-toggle-raw', S4 = 'STP-pick-subject';
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const go = (t, w, step) => {
  w.location.hash = '#' + step;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
};
const pickOption = (t, w, sel, v) => {
  const opt = [...(sel.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select data-role=${sel.dataset.role}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, sel, 'change');
  return true;
};
const radio = (t, w, d, step, role, v) => {
  const el = R(d, step, role).querySelector(`input[type=radio][value="${v}"]`);
  if (!el) { t.bad(`(d) ${step} ${role} 에 value=${v} 라디오가 없다`); return; }
  el.checked = true;
  t.fire(w, el, 'change');
};
const pickRow = (t, w, d, step) => {
  const row = R(d, step, 'ranklist').querySelector('.rankrow');
  if (!row) { t.bad(`(c) ${step} 의 순위 목록에 고를 수 있는 행이 없다`); return null; }
  t.click(w, row);
  return row.dataset.subject;
};

module.exports = {
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();

    const shape = (step, role, tag, type) => {
      const el = R(d, step, role);
      if (!el) return t.bad(`(d) ${step} [data-role=${role}] 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) ${step} ${role} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) ${step} ${role} 의 type 은 ${type}`);
    };
    for (const step of [S1, S2, S3, S4]) {
      go(t, w, step);
      shape(step, 'axis', 'SELECT');
      shape(step, 'range', 'SELECT');
      shape(step, 'restore', 'INPUT', 'checkbox');
      shape(step, 'thresh', 'INPUT', 'number');
      shape(step, 'only-new', 'INPUT', 'checkbox');
      t.is([...R(d, step, 'unit').querySelectorAll('input')].every(e => e.type === 'radio'), true,
        `(d) ${step} 집계 단위 컨트롤이 전부 실제 <input type=radio> 다`);
      const norm = R(d, step, 'norm');
      t.is(!!norm && [...norm.querySelectorAll('input')].length === 2 && [...norm.querySelectorAll('input')].every(e => e.type === 'radio'),
        true, `(d) ${step} 정규화 전/후 전환이 실제 <input type=radio> 두 개다`);
    }
    go(t, w, S1);
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    t.is(R(d, S1, 'brief-form').querySelectorAll('button').length, 0,
      '(d) 조회 조건 카드에 적용 버튼이 없다 — 축·기간·단위는 고르는 즉시 반영된다');
    {
      const subBefore = R(d, S1, 'brief-sub').textContent;
      pickOption(t, w, R(d, S1, 'range'), '30');
      t.is(R(d, S1, 'brief-sub').textContent !== subBefore, true, '(d) 기간 <select> 가 제출 없이 기준 표기를 바꾼다');
      t.is(d.querySelector('[data-role="tb-pill"]').textContent.includes('최근 30일'), true, '(d) 토프바 pill 이 고른 기간을 따라간다');
      radio(t, w, d, S1, 'unit', 'week');
      await t.sleep(400);
      go(t, w, S3);
      t.is([R(d, S3, 'range').value, R(d, S3, 'unit').querySelector('input:checked')?.value], ['30', 'week'],
        '(d) 단계 1 에서 고른 기간·단위가 같은 화면의 단계 3 에도 그대로다');
      go(t, w, S1);
      pickOption(t, w, R(d, S1, 'range'), '7');
      radio(t, w, d, S1, 'unit', 'day');
      await t.sleep(400);
      t.is(R(d, S1, 'brief-sub').textContent, subBefore, '(d) 기간·단위를 되돌리면 기준 표기가 복원된다');
    }
    {
      const offered = () => [...R(d, S1, 'unit').querySelectorAll('input')]
        .filter(i => !i.parentElement.hidden).map(i => i.value);
      t.is(offered(), ['hour', 'day'], '(d) 최근 7일에는 기간보다 짧은 시간·일 단위만 고를 수 있다');
      pickOption(t, w, R(d, S1, 'range'), '1');
      t.is(offered(), ['hour'], '(d) 기간을 24시간으로 줄이면 일·주 단위가 선택지에서 빠진다');
      await t.sleep(400);
      pickOption(t, w, R(d, S1, 'range'), '7');
      radio(t, w, d, S1, 'unit', 'day');
      await t.sleep(400);
    }
    {
      const rows = () => [...R(d, S1, 'ranklist').querySelectorAll('.rankrow')].map(e => e.textContent.trim());
      const kr = rows();
      pickOption(t, w, R(d, S1, 'axis'), 'US');
      t.is(JSON.stringify(kr) !== JSON.stringify(rows()) && rows().length > 0, true, '(d) 축 <select> 가 목록을 실제로 바꾼다');
      pickOption(t, w, R(d, S1, 'axis'), 'ALL');
      t.is(R(d, S1, 'brief-sub').textContent.startsWith('전체 축'), true, '(d) 축 「전체」 가 세 축을 접은 순위로 바꾼다');
      t.is(R(d, S1, 'brief-sub').textContent.includes('균등 평균'), true, '(d) 「전체」 는 세 축 점유율의 균등 평균임을 조건 카드에 한 줄로 밝힌다');
      pickOption(t, w, R(d, S1, 'axis'), 'KR');
    }
    go(t, w, S2);
    {
      const n = () => R(d, S2, 'deltalist').querySelectorAll('.trow').length;
      const all = n();
      const th = R(d, S2, 'thresh');
      th.value = '5'; t.fire(w, th, 'input');
      t.is(n() > 0 && n() < all, true, '(d) <input type=number> 임계가 변화 목록을 실제로 좁힌다');
      th.value = '0'; t.fire(w, th, 'input');
      t.is(n(), all, '(d) 임계를 0으로 되돌리면 목록이 복원된다');
      const on = R(d, S2, 'only-new');
      on.checked = true; t.fire(w, on, 'change');
      const left = [...R(d, S2, 'deltalist').querySelectorAll('.trow')];
      t.is(left.length > 0 && left.length < all && left.every(b => b.textContent.includes('신규')), true,
        '(d) <input type=checkbox> 가 신규 진입 대상만 남긴다');
      on.checked = false; t.fire(w, on, 'change');
    }
    const picked = pickRow(t, w, d, S2);
    t.is(R(d, S2, 'ranklist').querySelector('.rankrow[aria-pressed="true"]')?.dataset.subject, picked,
      '(d) 순위 행을 누르면 그 대상이 고른 대상으로 강조된다');
    t.is(R(d, S2, 'no-selection').hidden, true, '(d) 대상을 고르면 「고른 대상」 카드가 채워진다');

    go(t, w, S3);
    {
      const pct = () => [...R(d, S3, 'ranklist').querySelectorAll('.rankrow .pct')].map(e => e.textContent);
      const names = () => [...R(d, S3, 'ranklist').querySelectorAll('.rankrow')].map(e => e.dataset.subject);
      const normNames = names();
      t.is(pct().every(v => v.endsWith('%')), true, '(d) 기본은 정규화 비율(%) 이다');
      t.is(R(d, S3, 'brief-sub').parentElement.querySelector('.norm-flag') !== null, true, '(d) 기본에서는 「정규화」 표기가 상시 붙는다');
      radio(t, w, d, S3, 'norm', 'raw');
      t.is(pct().every(v => v.endsWith('건')), true, '(d) 정규화 전/후 라디오가 값을 원시 건수로 실제로 바꾼다');
      t.is(R(d, S3, 'brief-sub').parentElement.querySelector('.raw-flag') !== null, true, '(d) 원시 건수 보기에서는 「원시 건수」 표기로 바뀐다');
      t.is(JSON.stringify(names()) !== JSON.stringify(normNames), true, '(d) 원시 건수 순위가 정규화 순위와 갈리는 대상이 있다');
      t.is(R(d, S3, 'ranklist').querySelector('.rankrow[aria-pressed="true"]')?.dataset.subject, picked,
        '(d) 전환해도 고른 대상 하이라이트가 유지된다');
      t.is(R(d, S3, 'range').value, '7', '(d) 전환해도 조회 조건이 유지된다');
      radio(t, w, d, S3, 'norm', 'norm');
      t.is(JSON.stringify(names()), JSON.stringify(normNames), '(d) 정규화로 되돌리면 순위가 복원된다');
    }

    go(t, w, S4);
    {
      t.is(R(d, S4, 'pick-entries').hidden, false, '(d) 대상을 고른 뒤 상세 진입 세 갈래가 열린다');
      t.is(R(d, S4, 'pick-detail').textContent.includes('승계할 조건'), true, '(d) 고른 대상 카드가 상세로 승계할 조건을 보여 준다');
      const row = [...R(d, S4, 'ranklist').querySelectorAll('.rankrow')].find(r => r.dataset.subject !== picked);
      t.click(w, row);
      t.is(R(d, S4, 'ranklist').querySelector('.rankrow[aria-pressed="true"]')?.dataset.subject, row.dataset.subject,
        '(d) 다른 행을 누르면 고른 대상이 바뀐다');
    }
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'empty-window'), false, '(e) empty-window — 수집이 있는 축에서는 빈 상태가 아니다');
      pickOption(t, w, R(d, S1, 'axis'), 'GL');
      t.is(t.shown(d, 'empty-window'), true, '(e) empty-window — 수집이 빈 축에서 「데이터 없음」 에 도달');
      t.is(R(d, S1, 'ranklist').querySelectorAll('.rankrow').length, 0, '(e) empty-window — 0% 행으로 채우지 않는다');
      t.is(t.shown(d, 'no-rank'), true, '(e) no-rank — 수집이 빈 축에서 순위 0건에 도달');
      pickOption(t, w, R(d, S1, 'axis'), 'KR');
      t.is(t.shown(d, 'empty-window'), false, '(e) empty-window — 축을 되돌리면 해소된다');
      pickOption(t, w, R(d, S1, 'range'), '30');
      t.is(t.shown(d, 'reloading'), true, '(e) reloading — 기간을 바꾼 직후 재집계 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'reloading'), false, '(e) reloading — 재집계가 실제로 해소된다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'no-selection'), true, '(e) no-selection — 단계 2 진입 직후 대상 미선택');
      pickRow(t, w, d, S2);
      t.is(t.shown(d, 'no-selection'), false, '(e) no-selection — 대상을 고르면 해소된다');
      const th = R(d, S2, 'thresh');
      th.value = '10'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'no-change'), true, '(e) no-change — 임계를 올리면 걸리는 변화 0건에 도달');
      th.value = '0'; t.fire(w, th, 'input');
      t.is(t.shown(d, 'no-change'), false, '(e) no-change — 임계를 내리면 해소된다');
      pickOption(t, w, R(d, S2, 'axis'), 'ALL');
      t.is(t.shown(d, 'pick-axis'), true, '(e) pick-axis — 「전체」 축에서 축을 고르라는 안내에 도달');
      pickOption(t, w, R(d, S2, 'axis'), 'KR');
      t.is(t.shown(d, 'pick-axis'), false, '(e) pick-axis — 축을 고르면 해소된다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류·Gold 없음·기준 없음)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'loading'], [S1, 'api-error'], [S1, 'no-gold'], [S2, 'no-baseline']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'ranklist').querySelectorAll('.rankrow').length > 0, true, '(h) 상위 대상 목록이 렌더된다');
    t.is(R(d, S1, 'ranklist').querySelectorAll('.spark').length > 0, true, '(h) 스파크라인이 렌더된다');
    go(t, w, S4);
    t.is(R(d, S4, 'winlist').querySelectorAll('tbody tr').length > 0, true, '(h) 기간 순위 표가 렌더된다');
  },
};
