/* JRN-logic-backfill — 페이지 고유 조작.
 * 다섯 단계 모두 같은 화면 `reprocess`(Reprocess.tsx + ReprocessTrigger.tsx)를 같은 구조로
 * 다시 그리므로 요소를 id 가 아니라 「단계 섹션 안 기본 화면의 [data-role]」 로 찾는다.
 * 실행(표본·전량·결정)은 모의 서버 타이머로 제출 중 → 대기 → 실행 중 → 완료/실패를 지나므로
 * 런이 끝나야 생기는 상태는 WAIT 만큼 기다린다. */
const S1 = 'STP-scope-range', S2 = 'STP-dry-run', S3 = 'STP-run-reprocess',
      S4 = 'STP-compare-before-after', S5 = 'STP-publish';
const STEPS = [S1, S2, S3, S4, S5];
const WAIT = 500;
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const RA = (d, step, role) => [...base(d, step).querySelectorAll(`[data-role="${role}"]`)];
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
const typeIn = (t, w, el, v, evt) => { el.value = String(v); t.fire(w, el, evt || 'input'); };
const check = (t, w, el, on) => { el.checked = on; t.fire(w, el, 'change'); };
const rowsText = (el) => [...el.querySelectorAll('tr')].map(tr => tr.textContent.trim());

module.exports = {
  unlock: {
    /* 전량 실행으로 넘어가는 단계 CTA 는 표본을 제출해야 열린다(구현의 전량 실행 버튼은 표본이 「완료」 여야 열린다). */
    [S2]: (t, w, d) => t.click(w, R(d, S2, 'sample-btn')),
  },

  async inputs(t) {
    const { w, d } = t.boot();

    const shape = (step, role, tag, type) => {
      const el = R(d, step, role);
      if (!el) return t.bad(`(d) ${step} [data-role=${role}] 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) ${step} ${role} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) ${step} ${role} 의 type 은 ${type}`);
    };
    for (const step of STEPS) {
      for (const g of ['range', 'axis', 'sort', 'decision'])
        t.is([...R(d, step, g).querySelectorAll('input')].every(e => e.type === 'radio'), true,
          `(d) ${step} ${g} 컨트롤이 전부 실제 <input type=radio> 다`);
      shape(step, 'source', 'SELECT');
      shape(step, 'threshold', 'INPUT', 'number');
      shape(step, 'ts-subject', 'SELECT');
      shape(step, 'sample-size', 'INPUT', 'number');
      shape(step, 'sample-mode', 'SELECT');
      shape(step, 'batch-size', 'INPUT', 'number');
      shape(step, 'memo', 'TEXTAREA');
      shape(step, 'notify', 'INPUT', 'checkbox');
      t.is(RA(d, step, 'version').map(e => e.tagName + ':' + e.type), ['INPUT:text', 'INPUT:text'],
        `(d) ${step} 목표 로직 버전·적용할 분석 로직이 자유 입력 <input type=text> 둘이다`);
    }
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    {
      const rows = () => R(d, S1, 'scope-rows').querySelectorAll('tr').length;
      const week = rows();
      radio(t, w, d, S1, 'range', '30d');
      t.is(rows() > week, true, '(d) 기간 라디오가 범위 표의 구간을 실제로 다시 센다');
      t.is(d.querySelector('[data-role="tb-pill"]').textContent.includes('지난 30일'), true, '(d) 토프바 pill 이 고른 기간을 따라간다');
      go(t, w, S3);
      t.is(R(d, S3, 'range').querySelector('input:checked')?.value, '30d', '(d) 단계 1 에서 고른 기간이 같은 화면의 단계 3 에도 그대로다');
      go(t, w, S1);
      radio(t, w, d, S1, 'range', '7d');
      t.is(rows(), week, '(d) 기간을 되돌리면 구간 표가 복원된다');
    }
    {
      const opts = () => [...R(d, S1, 'source').options].map(o => o.value);
      t.is(opts(), ['', 'kr-wire', 'kr-daily'], '(d) 소스 <select> 의 옵션은 고른 축의 소스에서 온다');
      radio(t, w, d, S1, 'axis', 'US');
      t.is(opts(), ['', 'us-desk', 'us-wire'], '(d) 축을 바꾸면 소스 옵션이 그 축의 것으로 바뀐다');
      t.is(R(d, S1, 'axpill').textContent.trim(), 'US', '(d) 축 pill 이 고른 축을 따라간다');
      const todo = R(d, S1, 'kv-todo').textContent;
      pickOption(t, w, R(d, S1, 'source'), 'us-desk');
      t.is(R(d, S1, 'scope-sub').textContent.includes('us-desk'), true, '(d) 소스 <select> 가 범위 sub 를 바꾼다');
      t.is(R(d, S1, 'kv-todo').textContent !== todo, true, '(d) 소스 <select> 가 재분석 대상 건수를 다시 센다');
      radio(t, w, d, S1, 'axis', 'KR');
      t.is(R(d, S1, 'source').value, '', '(d) 축을 바꾸면 다른 축의 소스를 들고 가지 않는다');
    }
    go(t, w, S2);
    typeIn(t, w, R(d, S2, 'sample-size'), 120);
    t.is(R(d, S2, 'sum-size').textContent, '120건', '(d) 표본 크기 <input type=number> 가 표본 요약을 바꾼다');
    pickOption(t, w, R(d, S2, 'sample-mode'), 'recent');
    t.is(R(d, S2, 'sum-mode').textContent, '최근 수집 순', '(d) 표본 추출 <select> 가 표본 요약을 바꾼다');
    typeIn(t, w, R(d, S2, 'sample-size'), 50);
    pickOption(t, w, R(d, S2, 'sample-mode'), 'random');
    go(t, w, S3);
    {
      const [va, vb] = RA(d, S3, 'version');
      typeIn(t, w, vb, 'llm-v3');
      t.is(R(d, S3, 'x-ver').textContent, 'llm-v3', '(d) 적용할 분석 로직 입력이 실행 범위 KV 를 바꾼다');
      t.is(va.value, 'llm-v3', '(d) 두 버전 입력은 같은 값을 공유한다');
      typeIn(t, w, vb, '');
      t.is([R(d, S3, 'sample-btn').disabled, R(d, S3, 'run-btn').disabled], [true, true], '(d) 버전을 비우면 실행 버튼이 잠긴다');
      typeIn(t, w, vb, 'llm-v2');
      typeIn(t, w, R(d, S3, 'batch-size'), 250);
      t.is(R(d, S3, 'x-batch').textContent, '250건', '(d) 배치 크기 <input type=number> 가 실행 범위 KV 를 바꾼다');
      typeIn(t, w, R(d, S3, 'batch-size'), 100);
    }
    go(t, w, S4);
    {
      const order = () => rowsText(R(d, S4, 'cmp-rows'));
      const byDelta = order();
      t.is(byDelta.length > 0, true, '(d) 전후 비교 표가 그려진다');
      radio(t, w, d, S4, 'sort', 'share');
      t.is(JSON.stringify(order()) !== JSON.stringify(byDelta), true, '(d) 정렬 라디오가 비교 표의 행 순서를 바꾼다');
      radio(t, w, d, S4, 'sort', 'delta');
      const sub = R(d, S4, 'cmp-sub').textContent;
      typeIn(t, w, R(d, S4, 'threshold'), 10);
      t.is(R(d, S4, 'cmp-sub').textContent !== sub, true, '(d) 주목 임계 <input type=number> 가 넘는 항목을 다시 센다');
      typeIn(t, w, R(d, S4, 'threshold'), 2);
      const chart = R(d, S4, 'ts-chart').innerHTML;
      pickOption(t, w, R(d, S4, 'ts-subject'), '__ua');
      t.is(R(d, S4, 'ts-chart').innerHTML !== chart, true, '(d) 전후 추이의 대상 <select> 가 차트를 바꾼다');
    }
    go(t, w, S5);
    {
      check(t, w, R(d, S5, 'notify'), false);
      t.is(R(d, S5, 'notify-kv').textContent, '미노출', '(d) 소비자 주석 체크박스가 KV 를 바꾼다');
      check(t, w, R(d, S5, 'notify'), true);
      radio(t, w, d, S5, 'decision', 'rollback');
      t.is(R(d, S5, 'decision').querySelector('input:checked')?.value, 'rollback', '(d) 결정 라디오가 실제로 고른다');
      typeIn(t, w, R(d, S5, 'memo'), '타이핑 확인');
      t.is(R(d, S5, 'memo').value, '타이핑 확인', '(d) <textarea> 에 타이핑이 반영된다');
    }
  },

  async states(t) {
    {
      const { w, d } = t.boot();
      t.is([t.shown(d, 'empty-scope'), t.shown(d, 'no-silver')], [false, false], '(e) empty-scope·no-silver — 원문이 있는 범위에서는 아니다');
      radio(t, w, d, S1, 'range', '24h');
      radio(t, w, d, S1, 'axis', 'GLOBAL');
      t.is([t.shown(d, 'empty-scope'), t.shown(d, 'no-silver')], [true, true], '(e) empty-scope·no-silver — 전세계 최근 24시간(수집 없음)에서 도달');
      t.is(d.querySelector('[data-role="tb-pill"]').textContent, '범위 미확정', '(e) empty-scope — pill 이 「범위 미확정」');
      t.is(sec(d, S1).querySelector('[data-advance]').disabled, true, '(e) empty-scope — 표본으로 넘어가는 CTA 가 잠긴다');
      radio(t, w, d, S1, 'axis', 'KR');
      t.is(t.shown(d, 'empty-scope'), false, '(e) empty-scope — 축을 바꾸면 해소된다');
      t.is([t.shown(d, 'single-version'), t.shown(d, 'all-done')], [true, true], '(e) single-version·all-done — 한국 최근 24시간(새 로직만)에서 도달');
      t.is(R(d, S1, 'ver-rows').querySelectorAll('tr').length, 1, '(e) single-version — 버전 표가 한 버전을 보여 준다');
      t.is(rowsText(R(d, S1, 'scope-rows')).every(r => r.endsWith('완료')), true, '(e) all-done — 구간 배지가 전부 「완료」');
      t.is(R(d, S1, 'sample-btn').disabled, true, '(e) all-done — 표본 실행이 잠긴다');
      radio(t, w, d, S1, 'range', '7d');
      t.is([t.shown(d, 'single-version'), t.shown(d, 'all-done')], [false, false], '(e) single-version·all-done — 기간을 넓히면 해소된다');
      radio(t, w, d, S1, 'axis', 'US');
      t.is(t.shown(d, 'eta-unobserved'), true, '(e) eta-unobserved — 미국 축에서 「관측된 처리 속도 없음」 에 도달');
      radio(t, w, d, S1, 'axis', 'KR');
      t.is(t.shown(d, 'eta-unobserved'), false, '(e) eta-unobserved — 처리 속도가 관측된 축에서는 분 단위 예상');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'full-unlocked'), false, '(e) full-unlocked — 표본 전에는 전량이 잠겨 있다');
      t.click(w, R(d, S2, 'sample-btn'));
      t.is(t.shown(d, 'sample-submitting'), true, '(e) sample-submitting — 표본 실행 직후 「제출 중…」');
      await t.sleep(110);
      t.is(t.shown(d, 'sample-active'), true, '(e) sample-active — 제출된 표본 런이 대기·실행 중');
      t.is(R(d, S2, 'sample-run-rows').querySelectorAll('tr').length, 1, '(e) sample-active — 런 표에 한 행이 생긴다');
      t.is(R(d, S2, 'run-btn').disabled, true, '(e) sample-active — 진행 중에는 다른 실행이 잠긴다');
      await t.sleep(WAIT);
      t.is(t.shown(d, 'sample-active'), false, '(e) sample-active — 폴링이 끝을 보면 해소된다');
      t.is(t.shown(d, 'full-unlocked'), true, '(e) full-unlocked — 표본이 「완료」 되면 「전량 실행이 열렸습니다」');
      t.is(R(d, S2, 'sample-run-rows').textContent.includes('완료'), true, '(e) full-unlocked — 런 표 배지가 「완료」');
      t.is(R(d, S2, 'redo').hidden, false, '(e) full-unlocked — 「로직을 고치고 표본부터 다시」 가 보인다');
      typeIn(t, w, R(d, S2, 'sample-size'), 600);
      t.click(w, R(d, S2, 'sample-btn'));
      await t.sleep(110);
      t.is(t.shown(d, 'submit-failed'), true, '(e) submit-failed — 서빙이 거절하면 「실행하지 못했습니다」');
      t.is(R(d, S2, 'err-submit-msg').textContent.includes('sample_size'), true, '(e) submit-failed — 서빙 오류 문면을 그대로 보인다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S3);
      t.is(t.shown(d, 'run-locked'), true, '(e) run-locked — 표본 없이 오면 「표본을 먼저 돌리세요.」');
      t.is(R(d, S3, 'run-btn').disabled, true, '(e) run-locked — 전량 실행이 잠겨 있다');
      t.click(w, R(d, S3, 'sample-btn'));
      await t.sleep(WAIT);
      t.is([t.shown(d, 'run-locked'), R(d, S3, 'run-btn').disabled], [false, false], '(e) run-locked — 표본이 끝나면 해소된다');
      t.click(w, R(d, S3, 'run-btn'));
      await t.sleep(110);
      t.is(t.shown(d, 'run-active'), true, '(e) run-active — 전량 런이 실행 중');
      await t.sleep(WAIT);
      t.is(t.shown(d, 'run-active'), false, '(e) run-active — 런이 끝나면 해소된다');
      t.is(R(d, S3, 'sample-none').hidden, false, '(e) all-done — 전량이 끝나면 이 범위의 재분석 대상이 0건(같은 화면의 안내가 단계 3 에서도 뜬다)');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S3);
      t.click(w, R(d, S3, 'sample-btn'));
      await t.sleep(WAIT);
      typeIn(t, w, R(d, S3, 'batch-size'), 450);
      t.click(w, R(d, S3, 'run-btn'));
      await t.sleep(WAIT);
      t.is(t.shown(d, 'interrupted'), true, '(e) interrupted — 큰 배치의 전량 런이 끊기면 도달');
      t.is(R(d, S3, 'run-run-rows').textContent.includes('실패'), true, '(e) interrupted — 런 표에 「실패」 행');
      t.is(R(d, S3, 'run-resume').hidden, false, '(e) interrupted — 실행 버튼 문면이 「체크포인트부터 이어서 재개」');
      t.click(w, R(d, S3, 'resume-go'));
      await t.sleep(WAIT);
      t.is(t.shown(d, 'interrupted'), false, '(e) interrupted — 재개가 끝나면 해소된다');
      t.is(R(d, S3, 'run-run-rows').querySelectorAll('tr').length, 2, '(e) interrupted — 재개는 새 런으로 쌓인다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S4);
      t.is(t.shown(d, 'over-threshold'), true, '(e) over-threshold — 기본 임계 2%p 에서 넘는 항목이 있다');
      t.is(Number(R(d, S4, 'over-count').textContent) > 0, true, '(e) over-threshold — 넘는 항목 수가 표기된다');
      typeIn(t, w, R(d, S4, 'threshold'), 10);
      t.is(t.shown(d, 'over-threshold'), false, '(e) over-threshold — 임계를 올리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S5);
      t.is(t.shown(d, 'no-decision'), true, '(e) no-decision — 결정 전 서빙 버전은 「결정 없음 · 레코드별 최신」');
      t.fire(w, R(d, S5, 'publish-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 빈 제출이 검증 실패');
      radio(t, w, d, S5, 'decision', 'publish');
      t.fire(w, R(d, S5, 'publish-form'), 'submit');
      t.is([t.shown(d, 'invalid'), R(d, S5, 'err-invalid-msg').textContent.startsWith('결정 근거')], [true, true],
        '(e) invalid — 근거가 비면 근거 문구로 실패');
      typeIn(t, w, R(d, S5, 'memo'), '부동산·주택 상승분은 새 분류 기준의 의도된 결과다');
      t.fire(w, R(d, S5, 'publish-form'), 'submit');
      t.is(t.shown(d, 'invalid'), false, '(e) invalid — 채워서 제출하면 해소된다');
      await t.sleep(110);
      t.is(t.shown(d, 'recorded'), true, '(e) recorded — 결정 기록 성공');
      t.is(t.shown(d, 'decide-locked'), true, '(e) decide-locked — 결정 런이 끝날 때까지 결정 기록이 잠긴다');
      await t.sleep(WAIT);
      t.is(t.shown(d, 'decide-locked'), false, '(e) decide-locked — 런이 끝나면 해소된다');
      t.is(t.shown(d, 'decision-history'), true, '(e) decision-history — 레이크에 남은 결정이 이력 표로');
      t.is([t.shown(d, 'no-decision'), R(d, S5, 'serving').textContent], [false, 'llm-v2'], '(e) decision-history — 마지막 결정이 지금 서빙 버전');
    }
    {
      const { w, d } = t.boot();
      go(t, w, S5);
      radio(t, w, d, S5, 'range', '24h');
      radio(t, w, d, S5, 'decision', 'rollback');
      typeIn(t, w, R(d, S5, 'memo'), '설명되지 않는 변화');
      t.fire(w, R(d, S5, 'publish-form'), 'submit');
      t.is(t.shown(d, 'no-rollback'), true, '(e) no-rollback — 한 버전뿐이고 결정도 없으면 되돌릴 버전이 없다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류·인덱스 준비 중·실행 배선 없음)는 딥링크로 연다. */
    for (const st of ['loading', 'api-error', 'index-not-ready', 'trigger-off']) {
      const { w, d } = t.boot();
      w.location.hash = `#${S1}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${S1}/${st} 로 도달`);
      t.is(base(d, S1).hidden, true, `(e) ${st} — 기본 화면은 가려진다(화면 교체)`);
      if (st !== 'trigger-off')
        t.is(d.querySelector('.topbar .ctl').hidden, true, `(e) ${st} — 데이터가 없으니 토프바 pill 도 없다`);
    }
    {
      const { w, d } = t.boot();
      w.location.hash = `#${S1}/trigger-off`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      const scr = d.querySelector('[data-state="trigger-off"]');
      t.is([!!scr.querySelector('[data-role="sample-btn"]'), !!scr.querySelector('[data-role="cmp-rows"]')], [false, true],
        '(e) trigger-off — 실행 카드는 사라지고 범위·전후 비교는 남는다');
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'scope-rows').querySelectorAll('tr').length > 0, true, '(h) 범위 표가 인라인 스크립트로 렌더된다');
    t.is(R(d, S1, 'cmp-rows').querySelectorAll('tr').length > 0, true, '(h) 전후 비교 표가 렌더된다');
    t.is(R(d, S1, 'ts-chart').innerHTML.includes('<polyline'), true, '(h) 전후 추이 차트가 렌더된다');
    t.is(R(d, S1, 'check-rows').querySelectorAll('tr').length, 4, '(h) 결정 전 확인 표가 렌더된다');
    t.is(R(d, S1, 'source').options.length > 1, true, '(h) 소스 옵션이 응답(모의)에서 렌더된다');
  },
};
