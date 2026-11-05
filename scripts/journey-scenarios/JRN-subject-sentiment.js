/* JRN-subject-sentiment — 페이지 고유 조작.
 * 네 단계가 모두 같은 화면 `sentiment` 를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안의 [data-role]」 로 찾는다. 축·대상을 바꾸면 응답을 다시 받는 로딩(300ms)을 거친다. */
const S1 = 'STP-open-subject-sentiment', S2 = 'STP-sentiment-unanalyzed', S3 = 'STP-sentiment-timeline', S4 = 'STP-sentiment-raw';
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
const pickSubject = (t, w, d, step, name) => {
  const sel = R(d, step, 'sent-subject');
  sel.value = name;
  t.fire(w, sel, 'change');
};
const buckets = (d, step) => [...R(d, step, 'tl-chart').querySelectorAll('g[data-bucket]')];

module.exports = {
  unlock: {},

  async inputs(t) {
    const { w, d } = t.boot();

    for (const step of [S1, S2, S3, S4]) {
      go(t, w, step);
      t.is([...R(d, step, 'sent-axis').querySelectorAll('input')].every(e => e.type === 'radio'), true, `(d) ${step} 축 전환이 실제 <input type=radio> 다`);
      t.is(R(d, step, 'sent-subject').tagName, 'SELECT', `(d) ${step} 서술 대상 고르기가 실제 <select> 다`);
      t.is(R(d, step, 'sent-source').type, 'checkbox', `(d) ${step} 출처 조건 풀기가 실제 <input type=checkbox> 다`);
      t.is([...R(d, step, 'sent-norm').querySelectorAll('input')].map(e => e.type + ':' + e.value), ['radio:norm', 'radio:raw'], `(d) ${step} 정규화 전/후 전환이 실제 라디오 두 개다`);
      t.is([...R(d, step, 'sent-unit').querySelectorAll('input')].map(e => e.value), ['hour', 'day', 'week'], `(d) ${step} 집계 단위가 시간·일·주 라디오다`);
      t.is(R(d, step, 'na-split').type, 'checkbox', `(d) ${step} 미분석 분리 표기가 실제 <input type=checkbox> 다`);
    }

    go(t, w, S1);
    {
      const inh = R(d, S1, 'sent-inherit').textContent;
      t.is(inh.includes('승계된 조건') && inh.includes('출처'), true, '(d) 단계 1 이 승계된 조건(축·기간·출처)을 머리에 고정 표기한다');
      t.is(R(d, S1, 'donut').querySelectorAll('circle[data-cls]').length, 4, '(d) 분포 도넛이 네 분류로 그려진다');
      t.is(R(d, S1, 'class-def').textContent.includes('혼합'), true, '(d) 「혼합」 의 분류 기준을 화면에서 바로 볼 수 있다');
      const withSrc = R(d, S1, 'donut-kv').textContent;
      const src = R(d, S1, 'sent-source');
      src.checked = false; t.fire(w, src, 'change');
      t.is(R(d, S1, 'sent-inherit').textContent.includes('전체 출처'), true, '(d) 출처 조건을 풀면 표기가 전체 출처로 바뀐다');
      t.is(R(d, S1, 'donut-kv').textContent !== withSrc, true, '(d) 출처 조건을 풀면 분포가 실제로 바뀐다');
      src.checked = true; t.fire(w, src, 'change');
      const kr = R(d, S1, 'donut-kv').textContent;
      radio(t, w, d, S1, 'sent-axis', 'US');
      await t.sleep(400);
      t.is(R(d, S1, 'donut-kv').textContent !== kr, true, '(d) 축 라디오가 분포를 실제로 바꾼다');
      radio(t, w, d, S1, 'sent-axis', 'KR');
      await t.sleep(400);
      const sam = R(d, S1, 'donut-kv').textContent;
      pickSubject(t, w, d, S1, '한국은행 기준금리');
      await t.sleep(400);
      t.is(R(d, S1, 'donut-kv').textContent !== sam, true, '(d) 대상 select 가 분포를 실제로 바꾼다');
      t.is(R(d, S1, 'sent-inherit').textContent.includes('한국은행 기준금리'), true, '(d) 승계 표기가 고른 대상을 따라간다');
    }

    go(t, w, S2);
    {
      const bar = R(d, S2, 'split-bar');
      const on = bar.getAttribute('data-split');
      const chk = R(d, S2, 'na-split');
      chk.checked = false; t.fire(w, chk, 'change');
      t.is(bar.getAttribute('data-split') !== on, true, '(d) 미분석 분리 체크박스가 분모를 실제로 바꾼다');
      chk.checked = true; t.fire(w, chk, 'change');
      t.is(bar.getAttribute('data-split'), on, '(d) 분리 표기로 되돌리면 복원된다');
      t.is(R(d, S2, 'na-pct').textContent.endsWith('%'), true, '(d) 미분석 비중이 항상 함께 표시된다');
    }

    go(t, w, S3);
    {
      t.is(buckets(d, S3).length, 14, '(d) 시계열이 일 단위 14칸으로 그려진다');
      radio(t, w, d, S3, 'sent-unit', 'week');
      await t.sleep(400);
      t.is(buckets(d, S3).length, 2, '(d) 주 단위로 바꾸면 칸이 2개로 굵어진다');
      t.is(R(d, S3, 'tl-sub').textContent.startsWith('주 단위'), true, '(d) 헤더 표기가 주 단위로 바뀐다');
      radio(t, w, d, S3, 'sent-unit', 'hour');
      await t.sleep(400);
      t.is(buckets(d, S3).length, 336, '(d) 시간 단위로 바꾸면 칸이 336개로 잘게 쪼개진다');
      radio(t, w, d, S3, 'sent-unit', 'day');
      await t.sleep(400);
      t.is(buckets(d, S3).length, 14, '(d) 일 단위로 되돌리면 14칸이 복원된다');
      t.is(R(d, S3, 'tl-vol').querySelectorAll('rect').length > 0, true, '(d) 비율(누적 100%)과 기사 수가 따로 그려진다');
      t.is(R(d, S3, 'bk-go').hidden, true, '(d) 구간을 고르기 전에는 기사 진입이 닫혀 있다');
      t.click(w, buckets(d, S3)[10]);
      t.is(R(d, S3, 'bk-go').hidden, false, '(d) 구간을 고르면 그 구간의 기사로 내려가는 길이 열린다');
      t.is(R(d, S3, 'bk-text').textContent.includes('10-13'), true, '(d) 고른 구간의 구성이 표시된다');
    }

    go(t, w, S4);
    {
      pickSubject(t, w, d, S4, '삼성전자');
      await t.sleep(400);
      const bars = () => R(d, S4, 'tl-chart').innerHTML;
      const norm = bars();
      t.is(R(d, S4, 'sent-flag').className, 'norm-flag', '(d) 기본은 정규화 분포이고 「정규화」 표기가 붙는다');
      radio(t, w, d, S4, 'sent-norm', 'raw');
      t.is(R(d, S4, 'sent-flag').className, 'raw-flag', '(d) 기사 수 그대로 보기에서는 「원시」 표기로 바뀐다');
      t.is(bars() !== norm, true, '(d) 정규화 전/후 라디오가 분포 모양을 실제로 바꾼다');
      t.is(R(d, S4, 'diff-note').hidden, false, '(d) 두 분포가 크게 갈리면 출처 구성을 보라는 안내가 뜬다');
      t.is(R(d, S4, 'sent-unit').querySelector('input:checked').value, 'day', '(d) 전환해도 집계 단위가 유지된다');
      t.is(R(d, S4, 'sent-subject').value, '삼성전자', '(d) 전환해도 고른 대상이 유지된다');
      radio(t, w, d, S4, 'sent-norm', 'norm');
      t.is(bars(), norm, '(d) 정규화로 되돌리면 모양이 복원된다');
      t.is(R(d, S4, 'diff-note').hidden, true, '(d) 정규화 보기에서는 갈림 안내가 닫힌다');
    }
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'unanalyzed-warning'), false, '(e) unanalyzed-warning — 미분석이 낮은 대상에서는 경고가 없다');
      radio(t, w, d, S1, 'sent-axis', 'US');
      t.is(t.shown(d, 'loading'), true, '(e) loading — 축을 바꾼 직후 「불러오는 중…」');
      await t.sleep(400);
      t.is(t.shown(d, 'loading'), false, '(e) loading — 응답이 오면 해소된다');
      t.is(t.shown(d, 'unanalyzed-warning'), true, '(e) unanalyzed-warning — 미분석 10% 이상에서 해석 보류 경고에 도달');
      radio(t, w, d, S1, 'sent-axis', 'GLOBAL');
      await t.sleep(400);
      t.is(t.shown(d, 'axis-absent'), true, '(e) axis-absent — 집계가 없는 축에서 도넛을 비움에 도달');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'thin-sample'), false, '(e) thin-sample — 기사가 충분한 대상에서는 표본 안내가 없다');
      pickSubject(t, w, d, S2, '반도체 보조금');
      await t.sleep(400);
      t.is(t.shown(d, 'thin-sample'), true, '(e) thin-sample — 분석 완료분이 적은 대상에서 표본 안내에 도달');
      radio(t, w, d, S2, 'sent-axis', 'GLOBAL');
      await t.sleep(400);
      t.is(t.shown(d, 'split-absent'), true, '(e) split-absent — 집계가 없는 축에서 분리 전후를 비움에 도달');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S3);
      t.is(t.shown(d, 'low-sample'), false, '(e) low-sample — 표본이 충분한 대상에서는 표본 부족 구간이 없다');
      t.is(t.shown(d, 'tl-reloading'), false, '(e) tl-reloading — 단위를 바꾸기 전에는 재집계 상태가 아니다');
      radio(t, w, d, S3, 'sent-unit', 'week');
      t.is(t.shown(d, 'tl-reloading'), true, '(e) tl-reloading — 단위를 바꾼 직후 재집계 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'tl-reloading'), false, '(e) tl-reloading — 재집계가 실제로 해소된다');
      pickSubject(t, w, d, S3, '반도체 보조금');
      await t.sleep(400);
      t.is(t.shown(d, 'low-sample'), true, '(e) low-sample — 최소 표본 미만 구간에서 「표본 부족」 안내에 도달');
      t.is(R(d, S3, 'tl-chart').textContent.includes('표본 부족'), true, '(e) low-sample — 그 칸은 비율 대신 「표본 부족」 으로 표기된다');
      radio(t, w, d, S3, 'sent-axis', 'GLOBAL');
      await t.sleep(400);
      t.is(t.shown(d, 'series-empty'), true, '(e) series-empty — 이 단위의 버킷이 없는 축에서 시계열을 비움에 도달');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S4);
      t.is(t.shown(d, 'diff-large'), false, '(e) diff-large — 정규화 보기에서는 갈림 안내가 없다');
      radio(t, w, d, S4, 'sent-norm', 'raw');
      t.is(t.shown(d, 'diff-large'), true, '(e) diff-large — 기사 수 그대로 보기에서 크게 갈리면 출처 구성 안내에 도달');
      pickSubject(t, w, d, S4, '원/달러 환율');
      await t.sleep(400);
      t.is(t.shown(d, 'diff-large'), false, '(e) diff-large — 거의 같은 대상에서는 안내가 해소된다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩 고정·오류·빈 집계·전량 미분석)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'api-error'], [S1, 'no-bucket'], [S2, 'all-unanalyzed']]) {
      const { w, d } = t.boot();
      go(t, w, step);
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'axisrows').querySelectorAll('.sent-axisrow').length, 3, '(h) 세 축 대조 행이 렌더된다');
    t.is(R(d, S1, 'donut-kv').querySelectorAll('.kv').length, 4, '(h) 분포 도넛 범례가 네 분류로 렌더된다');
    go(t, w, S3);
    t.is(R(d, S3, 'tl-chart').querySelectorAll('g[data-bucket]').length > 0, true, '(h) 선택 가능한 구간이 렌더된다');
  },
};
