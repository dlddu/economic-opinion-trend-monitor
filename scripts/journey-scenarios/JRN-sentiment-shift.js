/* JRN-sentiment-shift — 페이지 고유 조작.
 * 네 단계 모두 같은 화면 `sentiment` 를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안의 [data-role]」 로 찾는다. 축을 바꾸면 구현처럼 응답을 다시 받는 동안
 * 「불러오는 중…」 을 거치므로, 축 전환 뒤에는 잠깐 기다린다. */
const S1 = 'STP-open-sentiment', S2 = 'STP-check-unanalyzed', S3 = 'STP-overlay-time', S4 = 'STP-confirm-cause';
const STEPS = [S1, S2, S3, S4];
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const go = (t, w, step) => {
  w.location.hash = '#' + step;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
};
const LOAD = 400;

const axis = async (t, w, d, step, v) => {
  const el = R(d, step, 'sent-axis').querySelector(`input[type=radio][value="${v}"]`);
  if (!el) { t.bad(`(d) ${step} 축 전환에 value=${v} 라디오가 없다`); return; }
  el.checked = true;
  t.fire(w, el, 'change');
  await t.sleep(LOAD);
};

module.exports = {
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();

    for (const step of STEPS) {
      const radios = [...R(d, step, 'sent-axis').querySelectorAll('input')];
      t.is(radios.length === 3 && radios.every(e => e.tagName === 'INPUT' && e.type === 'radio'), true,
        `(d) ${step} 축 전환이 실제 <input type=radio> 3개다`);
      const chk = R(d, step, 'na-split');
      t.is([chk && chk.tagName, chk && chk.type], ['INPUT', 'checkbox'], `(d) ${step} 분리 표기 전환이 실제 <input type=checkbox> 다`);
    }
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다 — 구현의 축 세그먼트는 라디오로 그린다');
    t.is(d.querySelectorAll('.topbar .pill-ctl').length, 0, '(d) 토프바에 pill 이 없다 — 구현 화면 sentiment 는 pill 을 걸지 않는다');

    /* 단계 1 — 축 전환 */
    {
      const sub = () => R(d, S1, 'dn-sub').textContent;
      const kv = () => R(d, S1, 'donut-kv').textContent;
      const before = [sub(), kv()];
      await axis(t, w, d, S1, 'US');
      t.is(sub() !== before[0] && kv() !== before[1], true, '(d) 축 라디오가 도넛과 그 기준 표기를 실제로 바꾼다');
      t.is(R(d, S1, 'sent-axpill').textContent.trim(), 'US', '(d) 축 pill 이 고른 축을 따라간다');
      t.is(R(d, S1, 'lede-axis').textContent, '미국', '(d) 도입 문단의 축 이름이 고른 축을 따라간다');
      go(t, w, S3);
      t.is(R(d, S3, 'sent-axis').querySelector('input:checked')?.value, 'US', '(d) 단계 1 에서 고른 축이 같은 화면의 단계 3 에도 그대로다');
      go(t, w, S1);
      await axis(t, w, d, S1, 'KR');
      t.is([sub(), kv()], before, '(d) 축을 되돌리면 도넛이 복원된다');
      t.is(R(d, S1, 'axisrows').querySelectorAll('.sent-axisrow').length, 3, '(d) 축별 분위기가 세 축을 같은 버킷에서 대조한다');
      t.is(R(d, S1, 'axisrows').querySelector('[data-present="false"]')?.textContent.includes('집계 없음'), true,
        '(d) 기준 버킷에 없는 축은 0% 막대가 아니라 「집계 없음」 이다');
      t.is(R(d, S1, 'class-def').textContent.includes('상반된 톤'), true, '(d) 분류 기준(「혼합」 정의)이 화면에 보인다');
    }

    /* 단계 2 — 분모 전환 */
    t.click(w, sec(d, S1).querySelector('[data-advance]'));
    {
      const chk = R(d, S2, 'na-split');
      const kvBefore = R(d, S2, 'split-kv').textContent;
      const noteBefore = R(d, S2, 'split-note').textContent;
      chk.checked = false; t.fire(w, chk, 'change');
      t.is(R(d, S2, 'split-kv').textContent !== kvBefore, true, '(d) 체크박스 전환이 비율 표기를 실제로 바꾼다');
      t.is(R(d, S2, 'split-kv').textContent.includes('미분석'), true, '(d) 분모에 섞으면 미분석이 다섯째 몫으로 들어온다');
      t.is(R(d, S2, 'split-note').textContent !== noteBefore, true, '(d) 체크박스 전환이 해설 문장을 바꾼다');
      chk.checked = true; t.fire(w, chk, 'change');
      t.is(R(d, S2, 'split-kv').textContent, kvBefore, '(d) 다시 켜면 분석 완료분 기준으로 돌아온다');
    }

    /* 단계 3 — 시계열 · 절대량 · 구간 고르기 */
    t.click(w, sec(d, S2).querySelector('[data-advance]'));
    {
      t.is(R(d, S3, 'tl-chart').querySelectorAll('g[data-bucket]').length, 7, '(d) 분위기 추세가 버킷마다 막대 하나다');
      t.is(R(d, S3, 'tl-vol').querySelectorAll('rect').length > 0, true, '(d) 비율 막대와 따로 구간별 건수(절대량)가 그려진다');
      const g = R(d, S3, 'tl-chart').querySelector('g[data-bucket="2026-10-14"]');
      t.click(w, g);
      t.is(R(d, S3, 'bk-text').textContent.includes('2026-10-14'), true, '(d) 막대를 누르면 그 구간이 골라진다');
      t.is(R(d, S3, 'bk-go').hidden, false, '(d) 구간을 고르면 그 구간의 기여 뉴스로 내려가는 링크가 열린다');
    }

    /* 단계 4 — 같은 화면, 고른 구간 유지 */
    t.click(w, sec(d, S3).querySelector('[data-advance]'));
    t.is(R(d, S4, 'bk-text').textContent.includes('2026-10-14'), true, '(d) 단계 3 에서 고른 구간이 단계 4 에도 그대로다');
    const chk4 = R(d, S4, 'na-split');
    chk4.checked = false; t.fire(w, chk4, 'change');
    t.is(R(d, S4, 'split-kv').textContent.includes('미분석'), true, '(d) 단계 4 의 체크박스도 실제로 분모를 바꾼다');
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'loading'), false, '(e) loading — 첫 화면은 응답이 그려진 상태다');
      const el = R(d, S1, 'sent-axis').querySelector('input[value="US"]');
      el.checked = true; t.fire(w, el, 'change');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 축을 바꾼 직후 「불러오는 중…」 에 도달');
      t.is(R(d, S1, 'sent-body').hidden, true, '(e) loading — 카드는 응답이 올 때까지 그리지 않는다');
      await t.sleep(LOAD);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 응답이 오면 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'unanalyzed-warning'), false, '(e) unanalyzed-warning — 미분석 6.2% 인 한국 축에서는 경고가 없다');
      await axis(t, w, d, S1, 'US');
      t.is(t.shown(d, 'unanalyzed-warning'), true, '(e) unanalyzed-warning — 미분석 14% 인 미국 축에서 경고에 도달');
      t.is(R(d, S1, 'na-cause').textContent.includes('분석 실패') && R(d, S1, 'na-cause').textContent.includes('저신뢰'), true,
        '(e) unanalyzed-warning — 원인(분석 실패 · 저신뢰)을 함께 보인다');
      t.is(t.shown(d, 'axis-absent'), false, '(e) axis-absent — 집계가 있는 축에서는 도넛이 그려진다');
      await axis(t, w, d, S1, 'GLOBAL');
      t.is(t.shown(d, 'axis-absent'), true, '(e) axis-absent — 기준 버킷에 없는 축에서 도넛을 비운다');
      t.is(R(d, S1, 'dn-present').hidden, true, '(e) axis-absent — 0% 도넛을 그리지 않는다');
      await axis(t, w, d, S1, 'KR');
      t.is(t.shown(d, 'axis-absent'), false, '(e) axis-absent — 축을 되돌리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'split-absent'), false, '(e) split-absent — 집계가 있는 축에서는 분리 전후가 그려진다');
      await axis(t, w, d, S2, 'GLOBAL');
      t.is(t.shown(d, 'split-absent'), true, '(e) split-absent — 기준 버킷에 없는 축에서 분리 전후를 비운다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S3);
      t.is(t.shown(d, 'low-sample'), false, '(e) low-sample — 한국 축은 모든 구간이 최소 표본 이상이다');
      await axis(t, w, d, S3, 'US');
      t.is(t.shown(d, 'low-sample'), true, '(e) low-sample — 6건 구간이 있는 미국 축에서 표본 부족에 도달');
      t.is(R(d, S3, 'tl-chart').querySelectorAll('rect.thin').length > 0, true, '(e) low-sample — 그 구간 막대가 실제로 흐리게 그려진다');
      t.is(R(d, S3, 'tl-chart').textContent.includes('표본 부족'), true, '(e) low-sample — 그 구간에 「표본 부족」 이 얹힌다');
      t.is(t.shown(d, 'series-empty'), false, '(e) series-empty — 버킷이 있는 축에서는 막대가 그려진다');
      await axis(t, w, d, S3, 'GLOBAL');
      t.is(t.shown(d, 'series-empty'), true, '(e) series-empty — 이 단위의 버킷이 없는 축에서 안내에 도달');
      t.is(R(d, S3, 'tl-present').hidden, true, '(e) series-empty — 빈 차트를 그리지 않는다');
    }
    /* 데이터로 도달할 수 없는 상태(오류·버킷 없음·전량 미분석)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st, hides] of [[S1, 'api-error', 'sent-body'], [S1, 'no-bucket', 'sent-body'], [S1, 'loading', 'sent-body'],
                                     [S2, 'all-unanalyzed', 'split-note']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
      t.is(R(d, step, hides).hidden, true, `(e) ${st} — 가리는 표면(${hides})이 실제로 가려진다`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'donut').querySelectorAll('circle').length, 5, '(h) 도넛이 렌더된다(바탕 + 네 분류)');
    t.is(R(d, S1, 'donut').textContent.includes('분석 완료'), true, '(h) 도넛 중앙에 분석 완료 건수가 있다');
    t.is(R(d, S1, 'axisrows').querySelectorAll('.sentbar').length, 2, '(h) 축별 분위기 막대가 렌더된다');
    go(t, w, S3);
    t.is(R(d, S3, 'tl-chart').innerHTML.includes('<rect'), true, '(h) 분위기 추세 막대가 렌더된다');
    t.is(/\d+건/.test(R(d, S3, 'tl-chart').textContent), true, '(h) 버킷마다 분석 완료 건수가 찍힌다');
  },
};
