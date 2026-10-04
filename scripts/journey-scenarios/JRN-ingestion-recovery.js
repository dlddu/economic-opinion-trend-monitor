const pickFirstBucket = (t, w, d) => {
  const row = d.querySelector('#bk-rows tr[data-bucket]');
  if (!row) return null;
  t.click(w, row);
  return row;
};

/* 화면 1에서 '시도 0' 구간(스케줄 미실행)을 고른다 — 성공 0 과 구분되는 모양. */
const pickZeroAttemptBucket = (t, w, d) => {
  const row = [...d.querySelectorAll('#bk-rows tr[data-bucket]')]
    .find(tr => tr.children[1].textContent.trim() === '0');
  if (!row) { t.bad('(e) 시도 0 구간이 데이터에 없다 — attempt-zero 에 도달할 수 없다'); return null; }
  t.click(w, row);
  return row;
};

/* <select> 를 사용자가 하는 방식으로 고른다 — <option> 선택은 진짜 <select> 에만 있다. */
const pickOption = (t, w, el, v) => {
  const opt = [...(el.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select id=${el.id}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, el, 'change');
  return true;
};

/* 원인 라디오를 고른다 — 화면 3 전진의 선행 행동이자 진단 배너의 스위치다. */
const pickCause = (t, w, d, v) => {
  const r = d.querySelector(`input[name="cause"][value="${v}"]`);
  if (!r) { t.bad(`(c) 원인 라디오 ${v} 가 없다`); return null; }
  r.checked = true;
  t.fire(w, r, 'change');
  return r;
};

const walkToBackfill = (t, w, d) => {
  pickFirstBucket(t, w, d);
  t.click(w, d.getElementById('cta-1'));
  t.click(w, d.getElementById('cta-2'));
  pickCause(t, w, d, 'dup');
  t.click(w, d.getElementById('cta-3'));
};

module.exports = {
  unlock: {
    'STP-spot-anomaly': (t, w, d) => pickFirstBucket(t, w, d),
    'STP-diagnose-source': (t, w, d) => pickCause(t, w, d, 'api'),
    'STP-backfill': (t, w, d) => t.click(w, d.getElementById('run')),
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
    shape('axis', 'SELECT');
    shape('win', 'SELECT');
    shape('only-bad', 'INPUT', 'checkbox');
    shape('f-source', 'SELECT');
    shape('f-hour', 'SELECT');
    shape('op', 'SELECT');
    shape('batch', 'INPUT', 'number');
    shape('preserve', 'INPUT', 'checkbox');
    shape('v-window', 'SELECT');
    shape('verify-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="cause"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 원인 컨트롤이 전부 실제 <input type=radio> 다');
    t.is([...d.querySelectorAll('input[name="verdict"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 결론 컨트롤이 전부 실제 <input type=radio> 다');

    const all = d.querySelectorAll('#bk-rows tr[data-bucket]').length;
    const onlyBad = d.getElementById('only-bad');
    onlyBad.checked = true; t.fire(w, onlyBad, 'change');
    const bad = d.querySelectorAll('#bk-rows tr[data-bucket]').length;
    t.is(bad > 0 && bad < all, true, '(d) <input type=checkbox> 전환이 구간 목록을 실제로 줄인다');
    onlyBad.checked = false; t.fire(w, onlyBad, 'change');
    t.is(d.querySelectorAll('#bk-rows tr[data-bucket]').length, all, '(d) 체크를 풀면 목록이 되돌아온다');

    const labels = () => [...d.querySelectorAll('#bk-rows tr[data-bucket] td:first-child')]
      .map(td => td.textContent.trim());
    const day = labels();
    if (pickOption(t, w, d.getElementById('win'), '7d')) {
      t.is(JSON.stringify(labels()) !== JSON.stringify(day) && labels().length > 0, true,
        '(d) <select> 의 <option> 선택이 구간 목록을 실제로 바꾼다');
      pickOption(t, w, d.getElementById('win'), '24h');
    }

    pickFirstBucket(t, w, d);
    t.click(w, d.getElementById('cta-1'));
    const gapsAll = d.querySelectorAll('#gap-rows tr[data-gap]').length;
    t.is(gapsAll > 0, true, '(d) 좁히기 표가 인라인 스크립트로 렌더된다');
    pickOption(t, w, d.getElementById('f-source'), 'kr-wire');
    const gapsOne = d.querySelectorAll('#gap-rows tr[data-gap]').length;
    t.is(gapsOne > 0 && gapsOne < gapsAll, true, '(d) 소스 <select> 가 구간 행을 실제로 거른다');
    pickOption(t, w, d.getElementById('f-source'), 'all');

    t.click(w, d.getElementById('cta-2'));
    const metaBefore = d.getElementById('cause-meta').textContent;
    pickCause(t, w, d, 'api');
    t.is(d.getElementById('cause-meta').textContent !== metaBefore, true,
      '(d) <input type=radio> 선택이 수집 메타데이터 표기를 실제로 바꾼다');

    t.click(w, d.getElementById('cta-3'));
    const noteBefore = d.getElementById('preserve-note').textContent;
    const preserve = d.getElementById('preserve');
    preserve.checked = false; t.fire(w, preserve, 'change');
    t.is(d.getElementById('preserve-note').textContent !== noteBefore, true,
      '(d) 보존 <input type=checkbox> 전환이 설명을 실제로 바꾼다');

    t.click(w, d.getElementById('run'));
    await t.sleep(400);
    t.click(w, d.getElementById('cta-4'));
    const vfBefore = d.getElementById('vf-rows').textContent;
    pickOption(t, w, d.getElementById('v-window'), 'day');
    t.is(d.getElementById('vf-rows').textContent !== vfBefore, true,
      '(d) 재확인 범위 <select> 가 전후 비교 표를 실제로 다시 그린다');

    const memo = d.getElementById('verify-memo');
    memo.value = '타이핑 확인'; t.fire(w, memo, 'input');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-anomaly'), false, '(e) no-anomaly — 이상 구간이 있는 축에서는 정상 상태가 아니다');
      pickOption(t, w, d.getElementById('axis'), 'WW');
      t.is(t.shown(d, 'no-anomaly'), true, '(e) no-anomaly — 이상이 없는 축에서 「볼 것 없음」 상태에 도달');
      pickOption(t, w, d.getElementById('axis'), 'KR');
      t.is(t.shown(d, 'no-anomaly'), false, '(e) no-anomaly — 이상이 있는 축으로 돌아오면 해소된다');
    }
    {
      const { w, d } = t.boot();
      pickFirstBucket(t, w, d);
      t.is(t.shown(d, 'attempt-zero'), false, '(e) attempt-zero — 시도가 있는 구간은 이 상태가 아니다');
      pickZeroAttemptBucket(t, w, d);
      t.is(t.shown(d, 'attempt-zero'), true, '(e) attempt-zero — 시도 0 구간에서 「스케줄 미실행」 상태에 도달');
    }
    {
      const { w, d } = t.boot();
      pickFirstBucket(t, w, d);
      t.click(w, d.getElementById('cta-1'));
      t.is(t.shown(d, 'filter-empty'), false, '(e) filter-empty — 결과가 있을 때는 빈 상태가 아니다');
      pickOption(t, w, d.getElementById('f-source'), 'us-desk');
      t.is(t.shown(d, 'filter-empty'), true, '(e) filter-empty — 결과 0건에서 빈 상태에 도달');
      pickOption(t, w, d.getElementById('f-source'), 'all');
      t.is(t.shown(d, 'filter-empty'), false, '(e) filter-empty — 필터를 넓히면 해소된다');
    }
    {
      const { w, d } = t.boot();
      pickFirstBucket(t, w, d);
      t.click(w, d.getElementById('cta-1'));
      t.click(w, d.getElementById('cta-2'));
      t.is(t.shown(d, 'source-outage'), false, '(e) source-outage — 원인을 가르기 전에는 배너가 없다');
      pickCause(t, w, d, 'api');
      t.is(t.shown(d, 'source-outage'), true, '(e) source-outage — 소스 API 오류 판정에서 「복구 대기」 상태에 도달');
      t.is(t.shown(d, 'origin-gone'), false, '(e) source-outage — 두 배너가 동시에 뜨지 않는다');
      pickCause(t, w, d, 'origin');
      t.is(t.shown(d, 'origin-gone'), true, '(e) origin-gone — 원본 소실 판정에서 「영구 누락」 상태에 도달');
      t.is(t.shown(d, 'source-outage'), false, '(e) origin-gone — 앞선 배너는 해소된다');
    }
    {
      const { w, d } = t.boot();
      walkToBackfill(t, w, d);
      t.is(t.shown(d, 'running'), false, '(e) running — 실행 전에는 로딩이 아니다');
      t.click(w, d.getElementById('run'));
      t.is(t.shown(d, 'running'), true, '(e) running — 실행 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'running'), false, '(e) running — 로딩이 실제로 해소된다');
    }
    {
      const { w, d } = t.boot();
      walkToBackfill(t, w, d);
      t.click(w, d.getElementById('run'));
      await t.sleep(400);
      t.is(t.shown(d, 'dup-again'), false, '(e) dup-again — 새 버전 보존으로 실행하면 중복이 생기지 않는다');
      const preserve = d.getElementById('preserve');
      preserve.checked = false; t.fire(w, preserve, 'change');
      t.click(w, d.getElementById('run'));
      await t.sleep(400);
      t.is(t.shown(d, 'dup-again'), true, '(e) dup-again — 덮어쓰기로 실행하면 중복 재생성 상태에 도달');
      t.is(Number(d.getElementById('dup-count').textContent) > 0, true,
        '(e) dup-again — 재생성된 중복 건수가 실제로 표기된다');
    }
    {
      const { w, d } = t.boot();
      walkToBackfill(t, w, d);
      t.click(w, d.getElementById('run'));
      await t.sleep(400);
      t.click(w, d.getElementById('cta-4'));
      t.fire(w, d.getElementById('close-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
      d.querySelector('input[name="verdict"]').checked = true;
      t.fire(w, d.getElementById('close-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 결론만 있고 이력 메모가 비면 여전히 실패');
      d.getElementById('verify-memo').value = '09시 구간 kr-wire 실패 12건을 새 버전 보존으로 재수집';
      t.fire(w, d.getElementById('close-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 복구 확인 기록 성공 상태에 도달');
    }
  },

  async renders(t) {
    const { d } = t.boot();
    t.is(d.querySelectorAll('#bk-rows tr[data-bucket]').length > 0, true,
      '(h) 인라인 스크립트만으로 수집 현황 표가 렌더된다');
    t.is(d.querySelectorAll('#vf-rows tr').length > 0, true,
      '(h) 전후 비교 표가 인라인 스크립트로 렌더된다');
  },
};
