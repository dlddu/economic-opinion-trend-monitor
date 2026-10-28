/* JRN-axis-contrast — 페이지 고유 조작.
 * 단계 1~4 는 같은 화면 `compare` 를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안의 [data-role]」 로 찾는다. 단계 5 는 화면 `trend`(JRN-daily-scan 과 같은 구조). */
const S1 = 'STP-open-compare', S2 = 'STP-scan-axis-tops', S3 = 'STP-disambiguate-axis',
  S4 = 'STP-pick-outlier', S5 = 'STP-verify-in-trend';
const CMP = [S1, S2, S3, S4];
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
const colRows = (d, step, axis) => [...R(d, step, 'rows-' + axis).querySelectorAll('.cmprow')];

module.exports = {
  // 단계 1~4 의 전진은 선행 행동 없이 열려 있다(고르지 않으면 격차 후보 1위를 들고 간다).
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();

    for (const step of CMP) {
      const el = R(d, step, 'topic');
      if (!el) { t.bad(`(d) ${step} [data-role=topic] 컨트롤이 없다`); continue; }
      t.is(el.tagName, 'SELECT', `(d) ${step} 대상 국가는 실제 <select> 다`);
    }
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    t.is(R(d, S1, 'topic-form').querySelectorAll('button').length, 0,
      '(d) 대상 국가 폼에 적용 버튼이 없다 — 고르는 즉시 반영된다');
    t.is([...base(d, S1).querySelectorAll('.cmpcol h3')].map(h => h.textContent.trim()),
      ['한국 · 출처 축', '미국 · 출처 축', '전세계 · 출처 축'],
      '(d) 열 머리가 출처 축임을 밝히고, 대상 국가는 별도 컨트롤이다 — 두 기준이 분리돼 있다');
    t.is(R(d, S5, 'tr-compare').type, 'checkbox', '(d) 추세 상세의 겹쳐 보기는 실제 <input type=checkbox> 다');
    t.is([...R(d, S5, 'tr-axis').querySelectorAll('input')].every(e => e.type === 'radio'), true,
      '(d) 추세 상세의 축 전환이 실제 <input type=radio> 다');
    t.is(CMP.length && ['KR', 'US', 'GLOBAL'].every(a => colRows(d, S1, a).length === 5), true,
      '(d) 세 출처 축 열이 각각 상위 5개 대상을 그린다');
    t.is(colRows(d, S1, 'KR')[0].textContent.includes('원시'), true, '(d) 순위 행이 정규화 점유율 곁에 원시 건수를 함께 적는다');
    t.click(w, sec(d, S1).querySelector('[data-advance]'));
    {
      const tags = () => [...base(d, S2).querySelectorAll('.cmprow .nm')].map(n => n.textContent);
      const uniq = tags().filter(s => /(KR|US|GLOBAL)만/.test(s)).length;
      const common = tags().filter(s => s.includes('공통')).length;
      t.is(uniq > 0 && common > 0, true, '(d) 순위 행이 공통 대상과 한 축에만 있는 대상을 구분 표시한다');
      const before = R(d, S2, 'rows-US').innerHTML;
      pickOption(t, w, R(d, S2, 'topic'), 'KR');
      t.is(R(d, S2, 'rows-US').innerHTML !== before, true, '(d) 대상 국가 <select> 가 제출 없이 열을 실제로 좁힌다');
      t.is(colRows(d, S2, 'US')[0].dataset.subject, '반도체',
        '(d) 미국 출처 열이 「한국 경제」 로 좁히면 한국 이슈(반도체)를 1위로 보인다 — 출처 축과 대상 국가가 다르다');
      go(t, w, S3);
      t.is(R(d, S3, 'topic').value, 'KR', '(d) 단계 2 에서 고른 대상 국가가 같은 화면의 단계 3 에도 그대로다');
      pickOption(t, w, R(d, S3, 'topic'), 'ALL');
    }
    go(t, w, S4);
    {
      const rows = [...R(d, S4, 'gaplist').querySelectorAll('.trow')];
      t.is(rows.length > 0, true, '(d) 격차 후보 행이 그려진다');
      const pick = rows.find(r => r.dataset.axis === 'US') || rows[0];
      t.click(w, pick);
      t.is(t.visible(d), [S5], '(d) 격차 후보 행을 누르면 바로 추세 상세로 넘어간다');
      t.is(R(d, S5, 'tr-table').querySelector('tr.on')?.dataset.subject, pick.dataset.subject,
        '(d) 고른 대상을 그대로 승계해 추세 상세가 열린다');
      t.is(R(d, S5, 'tr-axis').querySelector('input:checked')?.value, pick.dataset.axis === 'GLOBAL' ? 'GL' : pick.dataset.axis,
        '(d) 고른 행의 축을 그대로 승계한다');
    }
    {
      go(t, w, S2);
      const row = colRows(d, S2, 'GLOBAL')[0];
      t.click(w, row);
      t.is(t.visible(d), [S5], '(d) 열의 순위 행을 눌러도 추세 상세로 넘어간다(구현 onOpen)');
      t.is([R(d, S5, 'tr-table').querySelector('tr.on')?.dataset.subject, R(d, S5, 'tr-axis').querySelector('input:checked')?.value],
        [row.dataset.subject, 'GL'], '(d) 순위 행이 놓인 열의 축과 대상을 승계한다');
    }
    {
      const chart = R(d, S5, 'tr-chart').innerHTML;
      const cmp = R(d, S5, 'tr-compare');
      cmp.checked = true; t.fire(w, cmp, 'change');
      t.is(R(d, S5, 'tr-chart').innerHTML !== chart, true, '(d) 겹쳐 보기 체크박스가 차트를 실제로 바꾼다');
      t.is(R(d, S5, 'tr-legend').querySelectorAll('span').length > 1, true, '(d) 범례가 그려진 선만큼 늘어난다');
      const tbl = R(d, S5, 'tr-table').innerHTML;
      radio(t, w, d, S5, 'tr-axis', 'KR');
      t.is(R(d, S5, 'tr-table').innerHTML !== tbl, true, '(d) 화면 안 축 전환 라디오가 비교 표를 실제로 바꾼다');
    }
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      go(t, w, S4);
      t.is(t.shown(d, 'no-outlier'), false, '(e) no-outlier — 전체 대상 국가에서는 한 축에만 있는 대상이 있다');
      pickOption(t, w, R(d, S4, 'topic'), 'GLOBAL');
      t.is(t.shown(d, 'no-outlier'), true, '(e) no-outlier — 글로벌 기사로 좁히면 「차이 없음」 에 도달');
      t.is([...base(d, S4).querySelectorAll('.cmprow .nm')].some(n => /(KR|US|GLOBAL)만/.test(n.textContent)), false,
        '(e) no-outlier — 순위 행에도 한 축에만 있는 대상이 없다');
      pickOption(t, w, R(d, S4, 'topic'), 'ALL');
      t.is(t.shown(d, 'no-outlier'), false, '(e) no-outlier — 되돌리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      w.location.hash = `#${S1}/axis-empty`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, 'axis-empty'), true, '(e) axis-empty — 딥링크로 빈 축 상태에 도달');
      t.is(R(d, S1, 'col-GLOBAL').hidden, true, '(e) axis-empty — 빈 열은 0% 행이 아니라 비교에서 빠진다');
      t.is([...R(d, S1, 'gaplist').querySelectorAll('.axpill')].some(p => p.textContent.startsWith('GLOBAL')), false,
        '(e) axis-empty — 격차 후보도 남은 두 축으로만 센다');
      t.click(w, R(d, S1, 'empty-go-GLOBAL'));
      t.is(t.visible(d), [S2], '(e) axis-empty — 「남은 두 축으로 대조 계속」 이 단계 2 로 잇는다');
      t.is(colRows(d, S2, 'GLOBAL').length === 0 && !R(d, S2, 'empty-GLOBAL').hidden, true,
        '(e) axis-empty — 단계 2 에서도 그 열은 비교에서 빠져 있다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류·집계 없음·통합 안내)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'loading'], [S1, 'api-error'], [S1, 'no-sentiment'], [S4, 'alias-merged'],
                              [S5, 'trend-loading'], [S5, 'trend-error'], [S5, 'trend-empty']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
    {
      const { w, d } = t.boot();
      w.location.hash = `#${S1}/api-error`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(base(d, S1).hidden, true, '(e) api-error — 응답이 없으면 열·이탈 카드를 그리지 않는다(화면 교체)');
    }
    {
      const { w, d } = t.boot();
      w.location.hash = `#${S4}/alias-merged`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      const tbl = d.querySelector('[data-state="alias-merged"] table');
      t.is(!!tbl && tbl.querySelectorAll('tbody tr').length >= 2 && /통합 전/.test(tbl.textContent) && /통합 후/.test(tbl.textContent), true,
        '(e) alias-merged — 통합 전후가 실제로 함께 표기된다');
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(base(d, S1).querySelectorAll('.cmprow').length, 15, '(h) 세 열의 순위 행이 렌더된다');
    t.is([...base(d, S1).querySelectorAll('.sentbar i')].filter(i => parseFloat(i.style.width) > 0).length, 15,
      '(h) 열마다 분위기 미니 막대가 렌더된다');
    t.is(R(d, S1, 'gaplist').querySelectorAll('.trow').length > 0, true, '(h) 격차 후보 행이 렌더된다');
    go(t, w, S5);
    t.is(R(d, S5, 'tr-chart').innerHTML.includes('<polyline'), true, '(h) 추세 차트가 렌더된다');
    t.is(R(d, S5, 'tr-table').querySelectorAll('tbody tr').length > 0, true, '(h) 비교 표가 렌더된다');
  },
};
