/* JRN-subject-trend — 페이지 고유 조작.
 * 네 단계가 모두 같은 화면 `trend` 를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안의 [data-role]」 로 찾는다. 칸 선택은 라인·막대 어느 쪽의 [data-cell] 을 눌러도 같다. */
const S1 = 'STP-open-subject-trend', S2 = 'STP-change-resolution', S3 = 'STP-trend-raw', S4 = 'STP-locate-change';
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const go = (t, w, step) => {
  w.location.hash = '#' + step;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
};
const radio = (t, w, d, step, role, v) => {
  const el = R(d, step, role).querySelector(`input[type=radio][value="${v}"]`);
  if (!el) { t.bad(`(d) ${step} ${role} 에 value=${v} 라디오가 없다`); return; }
  el.checked = true;
  t.fire(w, el, 'change');
};
const bars = (d, step) => [...R(d, step, 'tr-bars').querySelectorAll('rect[data-cell]')];

module.exports = {
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();

    for (const step of [S1, S2, S3, S4]) {
      go(t, w, step);
      t.is([...R(d, step, 'tr-axis').querySelectorAll('input')].every(e => e.type === 'radio'), true, `(d) ${step} 축 전환이 실제 <input type=radio> 다`);
      t.is([...R(d, step, 'tr-unit').querySelectorAll('input')].map(e => e.value), ['hour', 'day', 'week'], `(d) ${step} 집계 단위가 시간·일·주 라디오다`);
      t.is([...R(d, step, 'tr-norm').querySelectorAll('input')].map(e => e.type + ':' + e.value), ['radio:norm', 'radio:raw'], `(d) ${step} 정규화 전/후 전환이 실제 라디오 두 개다`);
      t.is(R(d, step, 'tr-compare').type, 'checkbox', `(d) ${step} 겹쳐 보기는 실제 <input type=checkbox> 다`);
    }

    go(t, w, S1);
    {
      t.is(R(d, S1, 'tr-inherit').textContent.includes('승계된 조건'), true, '(d) 단계 1 이 승계된 조건(축·기간·단위)을 보여 준다');
      t.is(R(d, S1, 'tr-chart').querySelectorAll('polyline').length > 0, true, '(d) 비율 라인이 그려진다');
      t.is(bars(d, S1).length, 14, '(d) 건수 막대가 일 단위 14칸으로 그려진다');
      const kr = R(d, S1, 'tr-legend').textContent;
      radio(t, w, d, S1, 'tr-axis', 'US');
      t.is(R(d, S1, 'tr-legend').textContent !== kr, true, '(d) 축 라디오가 추세를 실제로 바꾼다');
      radio(t, w, d, S1, 'tr-axis', 'KR');
      const cmp = R(d, S1, 'tr-compare');
      cmp.checked = true; t.fire(w, cmp, 'change');
      t.is(R(d, S1, 'tr-chart').querySelectorAll('polyline').length > 1, true, '(d) 겹쳐 보기가 상위 대상 선을 더한다');
      cmp.checked = false; t.fire(w, cmp, 'change');
      const row = [...R(d, S1, 'tr-table').querySelectorAll('tr.click')].find(r => r.getAttribute('aria-selected') !== 'true');
      const name = row.dataset.subject;
      t.click(w, row);
      t.is(R(d, S1, 'tr-legend').textContent.includes(name), true, '(d) 비교 표 행을 누르면 그 대상이 선택 대상이 된다');
      t.is(R(d, S1, 'tr-inherit').textContent.includes(name), true, '(d) 승계 표기가 선택 대상을 따라간다');
      t.click(w, [...R(d, S1, 'tr-table').querySelectorAll('tr.click')][0]);
    }

    go(t, w, S2);
    {
      radio(t, w, d, S2, 'tr-unit', 'week');
      await t.sleep(400);
      t.is(bars(d, S2).length, 2, '(d) 주 단위로 바꾸면 칸이 2개로 굵어진다');
      t.is(R(d, S2, 'tr-sub').textContent.startsWith('주 단위'), true, '(d) 헤더 표기가 주 단위로 바뀐다');
      radio(t, w, d, S2, 'tr-unit', 'hour');
      await t.sleep(400);
      t.is(bars(d, S2).length, 336, '(d) 시간 단위로 바꾸면 칸이 336개로 잘게 쪼개진다');
      radio(t, w, d, S2, 'tr-unit', 'day');
      await t.sleep(400);
      t.is(bars(d, S2).length, 14, '(d) 일 단위로 되돌리면 14칸이 복원된다');
    }

    go(t, w, S3);
    {
      const ys = () => R(d, S3, 'tr-chart').querySelector('polyline').getAttribute('points');
      const norm = ys();
      t.is(R(d, S3, 'tr-flag').className, 'norm-flag', '(d) 기본은 정규화 비율이고 「정규화」 표기가 붙는다');
      radio(t, w, d, S3, 'tr-norm', 'raw');
      t.is(R(d, S3, 'tr-flag').className, 'raw-flag', '(d) 원시 비율 보기에서는 「원시」 표기로 바뀐다');
      t.is(ys() !== norm, true, '(d) 정규화 전/후 라디오가 라인 모양을 실제로 바꾼다');
      t.is(R(d, S3, 'tr-diff-note').hidden, false, '(d) 원시 비율 보기에서는 두 모양이 갈리는 칸을 짚어 준다');
      t.is(R(d, S3, 'tr-unit').querySelector('input:checked').value, 'day', '(d) 전환해도 집계 단위가 유지된다');
      radio(t, w, d, S3, 'tr-norm', 'norm');
      t.is(ys(), norm, '(d) 정규화로 되돌리면 모양이 복원된다');
    }

    go(t, w, S4);
    {
      t.is(R(d, S4, 'tr-cell-none').hidden, false, '(d) 칸을 고르기 전에는 안내가 보인다');
      t.click(w, bars(d, S4)[10]);
      t.is(R(d, S4, 'tr-cell-detail').hidden, false, '(d) 칸을 고르면 고른 칸 카드가 채워진다');
      t.is(R(d, S4, 'tr-cell-detail').textContent.includes('승계할 조건'), true, '(d) 고른 칸 카드가 기사로 승계할 조건을 보여 준다');
      t.is(R(d, S4, 'tr-cell-entries').hidden, false, '(d) 기사·분위기 진입이 열린다');
      t.click(w, R(d, S4, 'tr-chart').querySelector('rect[data-cell="12"]'));
      t.is(R(d, S4, 'tr-cell-detail').textContent.includes('10-15'), true, '(d) 라인 위의 칸을 눌러도 그 칸이 선택된다');
    }
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'trend-empty'), false, '(e) trend-empty — 수집이 있는 축에서는 빈 상태가 아니다');
      radio(t, w, d, S1, 'tr-axis', 'GL');
      t.is(t.shown(d, 'trend-empty'), true, '(e) trend-empty — 수집이 빈 축에서 「그리지 않음」 에 도달');
      radio(t, w, d, S1, 'tr-axis', 'KR');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'tr-reloading'), false, '(e) tr-reloading — 단위를 바꾸기 전에는 재집계 상태가 아니다');
      radio(t, w, d, S2, 'tr-unit', 'week');
      t.is(t.shown(d, 'tr-reloading'), true, '(e) tr-reloading — 단위를 바꾼 직후 재집계 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'tr-reloading'), false, '(e) tr-reloading — 재집계가 실제로 해소된다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S4);
      t.is(t.shown(d, 'cell-unselected'), true, '(e) cell-unselected — 단계 4 진입 직후 칸 미선택');
      t.click(w, bars(d, S4)[10]);
      t.is(t.shown(d, 'cell-unselected'), false, '(e) cell-unselected — 칸을 고르면 해소된다');
      t.is(t.shown(d, 'cell-empty'), false, '(e) cell-empty — 기사가 있는 칸은 빈 칸이 아니다');
      const rows = [...R(d, S4, 'tr-table').querySelectorAll('tr.click')];
      const semi = rows.find(r => r.dataset.subject === '반도체 보조금');
      t.click(w, semi);
      t.is(R(d, S4, 'tr-gap-note').hidden, false, '(e) 한 번도 나오지 않은 칸이 있으면 빈 칸 안내가 보인다');
      t.is(R(d, S4, 'tr-chart').querySelectorAll('circle[stroke]').length > 0, true, '(e) 빈 칸은 0 으로 잇지 않고 비워 그린다');
      t.click(w, bars(d, S4)[0]);
      t.is(t.shown(d, 'cell-empty'), true, '(e) cell-empty — 대상이 나오지 않은 칸에서 「이 칸엔 언급 없음」 에 도달');
      t.is(R(d, S4, 'tr-cell-entries').hidden, true, '(e) cell-empty — 기사 목록으로 내려가는 진입이 닫힌다');
      t.click(w, bars(d, S4)[13]);
      t.is(t.shown(d, 'cell-empty'), false, '(e) cell-empty — 기사가 있는 칸을 고르면 해소된다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'trend-loading'], [S1, 'trend-error']]) {
      const { w, d } = t.boot();
      go(t, w, step);
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'tr-table').querySelectorAll('tbody tr').length > 0, true, '(h) 상위 대상 비교 표가 렌더된다');
    t.is(R(d, S1, 'tr-bars').querySelectorAll('rect[data-cell]').length > 0, true, '(h) 건수 막대가 렌더된다');
    go(t, w, S4);
    t.is(R(d, S4, 'tr-chart').querySelectorAll('rect[data-cell]').length > 0, true, '(h) 선택 가능한 칸이 렌더된다');
  },
};
