/* JRN-logic-backfill — 페이지 고유 조작 시나리오.
 *
 *   inputs(t)  (d) 값 변경이 렌더를 **실제로** 바꾸는가
 *   states(t)  (e) 인덱스가 등재한 상태에 프로토타입 안의 조작만으로 도달하는가
 *   unlock     (c) 전진이 비활성인 단계를 여는 선행 제품 행동
 *   renders(t) (h) 인라인 스크립트만으로 실제 렌더가 일어나는가
 *
 * 이 여정의 뼈대는 **표본이 전량의 관문**이라는 것이다(여정 문서 `STP-dry-run` 의
 * 「표본 실행을 기본 경로로 두고 전량 실행은 그 뒤에 열기」). 그래서 2·3단계의 전진이
 * 기본 비활성이고, 그것을 여는 것은 래퍼 네비가 아니라 화면 안의 실행 버튼이다.
 */

/* <select> 를 사용자가 하는 방식으로 고른다 — <option> 선택은 진짜 <select> 에만 있다. */
const pickOption = (t, w, el, v) => {
  const opt = [...(el.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select id=${el.id}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, el, 'change');
  return true;
};

/* 숫자·텍스트 입력에 값을 넣는다 — 'input' 으로 통지한다(타이핑과 같은 경로). */
const typeIn = (t, w, el, v, evt) => {
  el.value = String(v);
  t.fire(w, el, evt || 'input');
};

const check = (t, w, el, on) => { el.checked = on; t.fire(w, el, 'change'); };

/* 1→2 단계: 범위는 기본값을 그대로 쓰고 표본만 돌린다. */
const walkToDryRun = (t, w, d) => {
  t.click(w, d.getElementById('cta-1'));
};

/* 1→3 단계: 표본을 통과시킨 뒤 전량 실행 화면까지 간다. */
const walkToRun = (t, w, d) => {
  walkToDryRun(t, w, d);
  t.click(w, d.getElementById('dry-run'));
  t.click(w, d.getElementById('cta-2'));
};

/* 1→4 단계: 전량까지 끝내고 전후 비교 화면으로. */
const walkToCompare = (t, w, d) => {
  walkToRun(t, w, d);
  t.click(w, d.getElementById('run'));
  t.click(w, d.getElementById('cta-3'));
};

module.exports = {
  /* (c) 전진이 비활성인 두 단계를 여는 선행 제품 행동. */
  unlock: {
    /* 표본을 돌리기 전에는 전량 실행을 열지 않는다. */
    'STP-dry-run': (t, w, d) => t.click(w, d.getElementById('dry-run')),
    /* 전량을 돌리기 전에는 비교할 전후가 없다. */
    'STP-run-reprocess': (t, w, d) => t.click(w, d.getElementById('run')),
  },

  /* (d) 값 변경이 렌더를 실제로 바꾼다. */
  async inputs(t) {
    const { w, d } = t.boot();

    /* 정체 확인 — jsdom 은 <span> 에도 .value 를 붙일 수 있어서 '값을 바꿨더니 렌더가 변했다'
       만으로는 모양만 입력인 요소를 걸러 내지 못한다. 태그·타입을 먼저 못박는다. */
    const shape = (id, tag, type) => {
      const el = d.getElementById(id);
      if (!el) return t.bad(`(d) #${id} 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) #${id} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) #${id} 의 type 은 ${type}`);
    };
    shape('range', 'SELECT');
    shape('axis', 'SELECT');
    shape('source', 'SELECT');
    shape('sample-size', 'INPUT', 'number');
    shape('sample-mode', 'SELECT');
    shape('version', 'SELECT');
    shape('batch', 'INPUT', 'number');
    shape('keep-version', 'INPUT', 'checkbox');
    shape('sortby', 'SELECT');
    shape('threshold', 'INPUT', 'number');
    shape('split-unanalyzed', 'INPUT', 'checkbox');
    shape('notify-consumer', 'INPUT', 'checkbox');
    shape('publish-memo', 'TEXTAREA');
    t.is([...d.querySelectorAll('input[name="decision"]')].every(e => e.tagName === 'INPUT' && e.type === 'radio'),
      true, '(d) 결정 컨트롤이 전부 실제 <input type=radio> 다');

    /* 화면 1 — 기간 <select> 가 구간 목록을 실제로 다시 그린다. */
    const scopeLabels = () => [...d.querySelectorAll('#scope-rows tr td:first-child')]
      .map(td => td.textContent.trim());
    const week = scopeLabels();
    t.is(week.length > 0, true, '(d) 범위 표가 인라인 스크립트로 렌더된다');
    if (pickOption(t, w, d.getElementById('range'), '30d')) {
      t.is(JSON.stringify(scopeLabels()) !== JSON.stringify(week) && scopeLabels().length > 0, true,
        '(d) 기간 <select> 의 <option> 선택이 구간 목록을 실제로 바꾼다');
      pickOption(t, w, d.getElementById('range'), '7d');
    }

    /* 화면 1 — 축 <select> 가 대상 건수를 실제로 바꾼다. */
    const scopeKv = () => d.getElementById('scope-kv').textContent;
    const kr = scopeKv();
    pickOption(t, w, d.getElementById('axis'), 'US');
    t.is(scopeKv() !== kr, true, '(d) 축 <select> 가 재분석 대상 건수를 실제로 다시 센다');
    pickOption(t, w, d.getElementById('axis'), 'KR');

    /* 화면 2 — 표본 크기 <input type=number> 가 요약을 바꾸고, 표본 결과 표가 렌더된다. */
    walkToDryRun(t, w, d);
    const dryBefore = d.getElementById('dry-kv').textContent;
    typeIn(t, w, d.getElementById('sample-size'), 120);
    t.is(d.getElementById('dry-kv').textContent !== dryBefore, true,
      '(d) 표본 크기 <input type=number> 타이핑이 요약을 실제로 바꾼다');
    t.click(w, d.getElementById('dry-run'));
    await t.sleep(400);
    t.is(d.querySelectorAll('#dry-rows tr').length > 0, true,
      '(d) 표본 실행이 전후 판정 표를 실제로 렌더한다');

    /* 화면 3 — 배치 크기와 보존 방식이 실행 요약·설명을 바꾼다. */
    t.click(w, d.getElementById('cta-2'));
    const runBefore = d.getElementById('run-kv').textContent;
    typeIn(t, w, d.getElementById('batch'), 250);
    t.is(d.getElementById('run-kv').textContent !== runBefore, true,
      '(d) 배치 크기 <input type=number> 가 실행 요약을 실제로 바꾼다');
    const noteBefore = d.getElementById('keep-note').textContent;
    check(t, w, d.getElementById('keep-version'), false);
    t.is(d.getElementById('keep-note').textContent !== noteBefore, true,
      '(d) 보존 <input type=checkbox> 전환이 설명을 실제로 바꾼다');
    check(t, w, d.getElementById('keep-version'), true);
    const verBefore = d.getElementById('run-kv').textContent;
    pickOption(t, w, d.getElementById('version'), 'v2.5-rc');
    t.is(d.getElementById('run-kv').textContent !== verBefore, true,
      '(d) 적용 로직 <select> 가 실행 요약을 실제로 바꾼다');
    pickOption(t, w, d.getElementById('version'), 'v2.4');

    /* 화면 4 — 정렬 <select> 가 행 순서를, 임계 <input> 이 판정을 바꾼다. */
    t.click(w, d.getElementById('run'));
    await t.sleep(400);
    t.click(w, d.getElementById('cta-3'));
    const order = () => [...d.querySelectorAll('#cmp-rows tr td:first-child')].map(td => td.textContent.trim());
    const byDelta = order();
    t.is(byDelta.length > 0, true, '(d) 전후 비교 표가 인라인 스크립트로 렌더된다');
    if (pickOption(t, w, d.getElementById('sortby'), 'share')) {
      t.is(JSON.stringify(order()) !== JSON.stringify(byDelta), true,
        '(d) 정렬 <select> 가 비교 표의 행 순서를 실제로 바꾼다');
      pickOption(t, w, d.getElementById('sortby'), 'delta');
    }
    const cmpBefore = d.getElementById('cmp-sub').textContent;
    typeIn(t, w, d.getElementById('threshold'), 5);
    t.is(d.getElementById('cmp-sub').textContent !== cmpBefore, true,
      '(d) 주목 임계 <input type=number> 가 판정 집계를 실제로 다시 센다');
    typeIn(t, w, d.getElementById('threshold'), 2);

    /* 화면 5 — 주석 노출 체크박스와 <textarea> 타이핑. */
    t.click(w, d.getElementById('cta-4'));
    const pubBefore = d.getElementById('pub-kv').textContent;
    check(t, w, d.getElementById('notify-consumer'), false);
    t.is(d.getElementById('pub-kv').textContent !== pubBefore, true,
      '(d) 소비자 주석 <input type=checkbox> 전환이 결정 요약을 실제로 바꾼다');
    const memo = d.getElementById('publish-memo');
    typeIn(t, w, memo, '타이핑 확인');
    t.is(memo.value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
  },

  /* (e) 각 상태가 프로토타입 안의 조작으로 실제 도달 가능하다. */
  async states(t) {
    {
      /* empty-scope — 그 축에 없는 소스로 좁힌다 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'empty-scope'), false, '(e) empty-scope — 대상이 있을 때는 빈 상태가 아니다');
      pickOption(t, w, d.getElementById('source'), 'us-desk');
      t.is(t.shown(d, 'empty-scope'), true, '(e) empty-scope — 한국 축에 없는 소스로 좁히면 대상 0건 상태에 도달');
      pickOption(t, w, d.getElementById('source'), 'all');
      t.is(t.shown(d, 'empty-scope'), false, '(e) empty-scope — 소스를 넓히면 해소된다');
    }
    {
      /* over-budget — 기간을 넓혀 한 번에 돌리기 어려운 범위를 만든다 */
      const { w, d } = t.boot();
      t.is(t.shown(d, 'over-budget'), false, '(e) over-budget — 기본 범위는 한 번에 돌릴 수 있다');
      pickOption(t, w, d.getElementById('range'), '30d');
      t.is(t.shown(d, 'over-budget'), true, '(e) over-budget — 기간을 넓히면 「범위가 크다」 상태에 도달');
      t.is(Number(d.getElementById('budget-count').textContent) > 0, true,
        '(e) over-budget — 대상 건수가 실제로 표기된다');
      pickOption(t, w, d.getElementById('range'), '7d');
      t.is(t.shown(d, 'over-budget'), false, '(e) over-budget — 기간을 줄이면 해소된다');
    }
    {
      /* sample-running → 해소 */
      const { w, d } = t.boot();
      walkToDryRun(t, w, d);
      t.is(t.shown(d, 'sample-running'), false, '(e) sample-running — 실행 전에는 로딩이 아니다');
      t.click(w, d.getElementById('dry-run'));
      t.is(t.shown(d, 'sample-running'), true, '(e) sample-running — 표본 실행 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'sample-running'), false, '(e) sample-running — 로딩이 실제로 해소된다');
    }
    {
      /* sample-mismatch — 새 로직이 건드리는 대상만 뽑으면 재분류가 임계를 넘는다 */
      const { w, d } = t.boot();
      walkToDryRun(t, w, d);
      t.click(w, d.getElementById('dry-run'));
      await t.sleep(400);
      t.is(t.shown(d, 'sample-mismatch'), false, '(e) sample-mismatch — 무작위 표본은 의도와 어긋나지 않는다');
      t.is(d.getElementById('cta-2').disabled, false, '(e) sample-mismatch — 그때는 전량 실행이 열려 있다');
      pickOption(t, w, d.getElementById('sample-mode'), 'touched');
      await t.sleep(400);
      t.is(t.shown(d, 'sample-mismatch'), true, '(e) sample-mismatch — 재분류가 임계를 넘으면 불일치 상태에 도달');
      t.is(d.getElementById('cta-2').disabled, true, '(e) sample-mismatch — 그 상태에서는 전량 실행이 다시 잠긴다');
      t.is(Number(d.getElementById('mismatch-rate').textContent) > 0, true,
        '(e) sample-mismatch — 재분류 비율이 실제로 표기된다');
    }
    {
      /* running → 해소 */
      const { w, d } = t.boot();
      walkToRun(t, w, d);
      t.is(t.shown(d, 'running'), false, '(e) running — 실행 전에는 로딩이 아니다');
      t.click(w, d.getElementById('run'));
      t.is(t.shown(d, 'running'), true, '(e) running — 전량 실행 직후 로딩 상태에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'running'), false, '(e) running — 로딩이 실제로 해소된다');
    }
    {
      /* overwrite-warning — 병존 체크를 풀면 되돌릴 자리가 사라진다 */
      const { w, d } = t.boot();
      walkToRun(t, w, d);
      t.is(t.shown(d, 'overwrite-warning'), false, '(e) overwrite-warning — 병존으로 두면 경고가 아니다');
      check(t, w, d.getElementById('keep-version'), false);
      t.is(t.shown(d, 'overwrite-warning'), true, '(e) overwrite-warning — 덮어쓰기로 바꾸면 경고 상태에 도달');
      check(t, w, d.getElementById('keep-version'), true);
      t.is(t.shown(d, 'overwrite-warning'), false, '(e) overwrite-warning — 병존으로 되돌리면 해소된다');
    }
    {
      /* interrupted — 배치를 크게 잡으면 도중에 끊긴다 */
      const { w, d } = t.boot();
      walkToRun(t, w, d);
      t.click(w, d.getElementById('run'));
      await t.sleep(400);
      t.is(t.shown(d, 'interrupted'), false, '(e) interrupted — 기본 배치는 끝까지 돈다');
      typeIn(t, w, d.getElementById('batch'), 450);
      t.click(w, d.getElementById('run'));
      await t.sleep(400);
      t.is(t.shown(d, 'interrupted'), true, '(e) interrupted — 큰 배치로 돌리면 중단 상태에 도달');
      t.is(Number(d.getElementById('ckpt').textContent) > 0, true,
        '(e) interrupted — 체크포인트까지의 처리 건수가 실제로 표기된다');
      t.is(d.getElementById('cta-3').disabled, true,
        '(e) interrupted — 중단 상태에서는 전후 비교로 넘어가지 않는다');
    }
    {
      /* over-threshold — 임계를 낮추면 검토 대상이 드러난다 */
      const { w, d } = t.boot();
      walkToCompare(t, w, d);
      typeIn(t, w, d.getElementById('threshold'), 5);
      t.is(t.shown(d, 'over-threshold'), false, '(e) over-threshold — 임계가 높으면 주목 대상이 없다');
      typeIn(t, w, d.getElementById('threshold'), 2);
      t.is(t.shown(d, 'over-threshold'), true, '(e) over-threshold — 임계를 낮추면 초과 항목 상태에 도달');
      t.is(Number(d.getElementById('over-count').textContent) > 0, true,
        '(e) over-threshold — 초과 항목 수가 실제로 표기된다');
    }
    {
      /* low-confidence — 판단 보류분을 따로 뗀다 */
      const { w, d } = t.boot();
      walkToCompare(t, w, d);
      const rows = d.querySelectorAll('#cmp-rows tr').length;
      t.is(t.shown(d, 'low-confidence'), false, '(e) low-confidence — 분리 전에는 보류 비중을 따로 세지 않는다');
      check(t, w, d.getElementById('split-unanalyzed'), true);
      t.is(t.shown(d, 'low-confidence'), true, '(e) low-confidence — 분리 표기에서 보류 비중 상태에 도달');
      t.is(d.querySelectorAll('#cmp-rows tr').length > rows, true,
        '(e) low-confidence — 분리한 보류분이 비교 표에 실제로 한 행으로 올라온다');
      check(t, w, d.getElementById('split-unanalyzed'), false);
      t.is(t.shown(d, 'low-confidence'), false, '(e) low-confidence — 체크를 풀면 해소된다');
    }
    {
      /* invalid → recorded */
      const { w, d } = t.boot();
      walkToCompare(t, w, d);
      t.click(w, d.getElementById('cta-4'));
      t.fire(w, d.getElementById('publish-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패 상태에 도달');
      t.is(t.shown(d, 'recorded'), false, '(e) invalid — 검증 실패 시 성공 상태가 아니다');
      d.querySelector('input[name="decision"]').checked = true;
      t.fire(w, d.getElementById('publish-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 결정만 있고 근거가 비면 여전히 실패');
      typeIn(t, w, d.getElementById('publish-memo'),
        '가계부채 상승분은 표기 변형 통합의 의도된 결과이고 나머지는 임계 안이다');
      t.fire(w, d.getElementById('publish-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) recorded — 채워서 제출하면 검증 실패가 해소된다');
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 반영·롤백 결정 기록 성공 상태에 도달');
    }
  },

  /* (h) 인라인 스크립트만으로 실제 렌더가 일어난다. */
  async renders(t) {
    const { d } = t.boot();
    t.is(d.querySelectorAll('#scope-rows tr').length > 0, true,
      '(h) 인라인 스크립트만으로 범위 표가 렌더된다');
    t.is(d.querySelectorAll('#cmp-rows tr').length > 0, true,
      '(h) 전후 비교 표가 인라인 스크립트로 렌더된다');
    t.is(d.querySelectorAll('#pub-rows tr').length > 0, true,
      '(h) 결정 전 확인 표가 인라인 스크립트로 렌더된다');
  },
};
