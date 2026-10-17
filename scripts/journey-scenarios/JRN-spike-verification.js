/* JRN-spike-verification — 페이지 고유 조작.
 * 단계 1 은 화면 `dash`, 단계 2·3·4 는 같은 화면 `fairness`, 단계 5·6 은 같은 화면 `trace` 를 같은 구조로
 * 다시 그리므로 요소를 id 가 아니라 「단계 섹션 안의 [data-role]」 로 찾는다. */
const S1 = 'STP-notice-spike', S2 = 'STP-check-normalized', S3 = 'STP-inspect-sources',
      S4 = 'STP-drilldown-articles', S5 = 'STP-open-origin', S6 = 'STP-judge';
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const go = (w, step) => {
  w.location.hash = '#' + step;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
};
const vis = el => !!el && !el.hidden;

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
const pickSubject = (t, w, d, step, name) => {
  const b = [...R(d, step, 'fa-rows').querySelectorAll('.sv-pick')].find(x => x.dataset.subject === name);
  if (!b) { t.bad(`(d) ${step} 대비 표에 「${name}」 행이 없다`); return; }
  t.click(w, b);
};
const lookup = (t, w, d, step, id) => {
  const f = R(d, step, 'tr-lookup');
  R(d, step, 'tr-record').value = id;
  t.fire(w, f, 'submit');
};

module.exports = {
  async inputs(t) {
    const { w, d } = t.boot();

    const shape = (step, role, tag, type) => {
      const el = R(d, step, role);
      if (!el) return t.bad(`(d) ${step} [data-role=${role}] 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) ${step} ${role} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) ${step} ${role} 의 type 은 ${type}`);
    };
    shape(S1, 'axis', 'SELECT');
    shape(S1, 'spike-baseline', 'SELECT');
    for (const step of [S2, S3, S4]) {
      t.is([...R(d, step, 'fa-axis').querySelectorAll('input')].every(e => e.type === 'radio'), true,
        `(d) ${step} 축 전환이 실제 <input type=radio> 다`);
      shape(step, 'fa-norm', 'BUTTON');
      shape(step, 'art-source', 'SELECT');
      shape(step, 'art-dup', 'INPUT', 'checkbox');
    }
    for (const step of [S5, S6]) shape(step, 'tr-record', 'INPUT', 'text');
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    t.is(d.querySelectorAll('.branches').length, 0, '(d) 페이지 수준 분기 목록이 없다 — 분기는 화면 안 그 상황의 자리에 있다');

    /* 단계 1 — 튀는 값: 비교 구간·행 선택이 「이 급등은 진짜인가」 를 바꾼다 */
    {
      const mult = () => R(d, S1, 'spike-mult').textContent;
      const before = mult();
      pickOption(t, w, R(d, S1, 'spike-baseline'), '30d');
      t.is(mult() !== before, true, '(d) 비교 구간 <select> 가 배수를 실제로 바꾼다');
      pickOption(t, w, R(d, S1, 'spike-baseline'), '7d');
      const rows = [...R(d, S1, 'spike-list').querySelectorAll('.spk-row')];
      t.is(rows.length > 1, true, '(h) 튀는 값 목록이 렌더된다');
      t.click(w, rows[1]);
      t.is(R(d, S1, 'spike-pick').textContent, rows[1].dataset.spike, '(d) 튀는 값 행을 누르면 그 대상이 「선택한 대상」 이 된다');
      t.click(w, R(d, S1, 'spike-list').querySelector('.spk-row'));
      const picked = R(d, S1, 'spike-pick').textContent;
      t.click(w, R(d, S1, 'spike-go'));
      t.is(t.visible(d), [S2], '(c) 「정규화 전후를 대조하기 →」 가 공정성 화면으로 넘어간다');
      t.is(R(d, S2, 'fa-rows').querySelector('tr.on .sv-pick')?.dataset.subject, picked,
        '(d) 대시보드에서 고른 대상을 그대로 들고 공정성 화면이 열린다');
    }

    /* 단계 2 — 정규화 토글은 제출 없이 순위·막대·플래그를 바꾼다 */
    {
      const order = () => [...R(d, S2, 'fa-rows').querySelectorAll('.sv-pick')].map(b => b.dataset.subject).join();
      const before = order();
      t.is(R(d, S2, 'fa-flag').textContent.includes('정규화'), true, '(d) 대비 카드 플래그가 지금 세는 방식(정규화)을 적는다');
      t.click(w, R(d, S2, 'fa-norm'));
      t.is(R(d, S2, 'fa-norm').getAttribute('aria-pressed'), 'true', '(d) 정규화 토글이 원시 건수로 즉시 바뀐다');
      t.is(order() !== before, true, '(d) 세는 방식을 바꾸면 대비 표 순위가 실제로 바뀐다');
      t.is(R(d, S2, 'fa-flag').textContent.includes('원시'), true, '(d) 플래그가 원시 건수로 바뀐다');
      t.click(w, R(d, S2, 'fa-norm'));
      t.is(order(), before, '(d) 토글을 되돌리면 정규화 순위가 복원된다');
      const verdict = R(d, S2, 'fa-verdict').textContent;
      radio(t, w, d, S2, 'fa-axis', 'US');
      t.is(R(d, S2, 'fa-axpill').textContent.trim(), 'US', '(d) 화면 안 축 전환 라디오가 축 표지를 바꾼다');
      t.is(R(d, S2, 'fa-verdict').textContent !== verdict, true, '(d) 축을 바꾸면 두 방식의 1위 판정이 다시 계산된다');
      radio(t, w, d, S2, 'fa-axis', 'KR');
    }

    /* 단계 3 — 대비 표의 행을 고르면 소스별 기여가 그 대상으로 다시 그려진다 */
    t.click(w, sec(d, S2).querySelector('[data-advance]'));
    {
      const list = () => R(d, S3, 'src-list').innerHTML;
      const before = list();
      pickSubject(t, w, d, S3, '한국은행 기준금리');
      t.is(R(d, S3, 'src-subject').textContent, '한국은행 기준금리', '(d) 대비 표 행 선택이 소스별 기여의 대상을 바꾼다');
      t.is(list() !== before, true, '(d) 소스별 기여 목록이 고른 대상의 분해로 바뀐다');
      t.is(R(d, S3, 'src-sums').textContent, '합 41건 · 원시 카운트 41건', '(d) 카드 머리에 분해 합과 원시 카운트를 나란히 적는다');
      t.is(vis(R(d, S3, 'src-match')), true, '(d) 부분 합이 맞으면 「부분이 전체와 맞습니다.」');
      pickSubject(t, w, d, S3, '반도체 보조금');
    }

    /* 단계 4 — 기여 뉴스: 수집원 좁히기 · 본문 중복 필터 · 행 액션 */
    t.click(w, sec(d, S3).querySelector('[data-advance]'));
    {
      const n = () => R(d, S4, 'art-list').querySelectorAll('.sv-art-row').length;
      const all = n();
      t.is(all, 14, '(h) 기여 뉴스 목록이 원시 카운트만큼 렌더된다');
      pickOption(t, w, R(d, S4, 'art-source'), 'kr-wire');
      t.is(n() > 0 && n() < all, true, '(d) 「수집원으로 좁히기」 <select> 가 목록을 실제로 좁힌다');
      t.is(R(d, S4, 'art-count').textContent, '목록 14건 · 원시 카운트 14건', '(d) 좁혀도 카드 머리는 좁히기 전 건수와 원시 카운트를 적는다');
      pickOption(t, w, R(d, S4, 'art-source'), '');
      const dup = R(d, S4, 'art-dup');
      dup.checked = true; t.fire(w, dup, 'change');
      const left = [...R(d, S4, 'art-list').querySelectorAll('.sv-art-row')];
      t.is(left.length > 0 && left.length < all && left.every(r => r.textContent.includes('본문 중복')), true,
        '(d) 「본문 중복으로 잡힌 것만」 체크박스가 중복 기사만 남긴다');
      dup.checked = false; t.fire(w, dup, 'change');
      t.is(n(), all, '(d) 필터를 풀면 목록이 복원된다');
      const row = [...R(d, S4, 'art-list').querySelectorAll('.sv-art-row')].find(r => r.textContent.includes('수집 시점 본문 미확보'));
      t.is(!!row, true, '(h) 본문 미확보 기사 행에 「수집 시점 본문 미확보」 를 적는다');
      const id = row.querySelector('[data-trace]').dataset.trace;
      t.click(w, row.querySelector('[data-trace]'));
      t.is(t.visible(d), [S5], '(d) 행의 「원문 역추적 →」 이 원문 역추적으로 내려간다');
      t.is(R(d, S5, 'tr-record').value, id, '(d) 고른 기사의 record_id 를 들고 원문 추적 화면이 열린다');
    }

    /* 단계 5 — record_id 조회 폼 */
    {
      lookup(t, w, d, S5, 'kr-wire-20261016-0112');
      t.is(R(d, S5, 'tr-title').textContent, '정부, 반도체 보조금 3조 원 추가 투입 검토', '(d) record_id 조회 제출이 그 기사로 화면을 다시 그린다');
      t.is(R(d, S5, 'tr-link-badge').textContent, '링크 정상', '(d) 링크 상태 배지를 항상 적는다');
      t.is(R(d, S5, 'tr-rationale').textContent.length > 0, true, '(d) 분위기 라벨 옆에 판단 근거를 적는다');
      t.is(R(d, S5, 'tr-crumb').textContent.replace(/\s+/g, ' ').includes('bronze 원문 수집'), true, '(h) 계보 크럼이 렌더된다');
      t.click(w, sec(d, S5).querySelector('[data-advance]'));
      t.is(t.visible(d), [S6], '(c) 판정 단계로 넘어간다');
      t.is(R(d, S6, 'tr-record').value, 'kr-wire-20261016-0112', '(d) 판정 단계는 같은 기사를 그대로 보여 준다');
    }
  },

  async states(t) {
    /* 데이터로 도달하는 상태 */
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'spike-empty'), false, '(e) spike-empty — 집계가 있는 축에서는 빈 상태가 아니다');
      pickOption(t, w, R(d, S1, 'axis'), 'GL');
      t.is(t.shown(d, 'spike-empty'), true, '(e) spike-empty — 버킷이 빈 축에서 「급등 없음」 대신 빈 상태에 도달');
      pickOption(t, w, R(d, S1, 'axis'), 'KR');
      t.is(t.shown(d, 'spike-empty'), false, '(e) spike-empty — 축을 되돌리면 해소된다');
    }
    {
      const { w, d } = t.boot();
      t.click(w, R(d, S1, 'spike-go'));
      t.is(t.shown(d, 'normalized-away'), true, '(e) normalized-away — 원시로만 튄 대상을 들고 오면 정규화 소멸 배너에 도달');
      t.click(w, R(d, S2, 'fa-norm'));
      t.is(t.shown(d, 'normalized-away'), false, '(e) normalized-away — 원시 건수로 보면 배너가 내려간다');
      t.click(w, R(d, S2, 'fa-norm'));
      t.is(t.shown(d, 'lead-agree'), false, '(e) lead-agree — 한국 축은 두 방식의 1위가 갈린다');
      radio(t, w, d, S2, 'fa-axis', 'US');
      t.is(t.shown(d, 'lead-agree'), true, '(e) lead-agree — 미국 축에서 두 방식의 1위 일치에 도달');
      radio(t, w, d, S2, 'fa-axis', 'GLOBAL');
      t.is(t.shown(d, 'fair-empty'), true, '(e) fair-empty — 버킷이 빈 축에서 빈 순위를 그리지 않는다');
      t.is(R(d, S2, 'fa-body').hidden, true, '(e) fair-empty — 대비 표·사이드·기여 뉴스는 그리지 않는다');
      radio(t, w, d, S2, 'fa-axis', 'KR');
      t.is(t.shown(d, 'fair-empty'), false, '(e) fair-empty — 축을 되돌리면 해소된다');

      t.click(w, sec(d, S2).querySelector('[data-advance]'));
      t.is(R(d, S3, 'src-subject').textContent, '원/달러 환율', '(d) 축을 바꾸면 고른 대상이 풀려 지금 세는 방식의 1위로 돌아간다');
      pickSubject(t, w, d, S3, '반도체 보조금');
      t.is(t.shown(d, 'low-confidence'), true, '(e) low-confidence — 저신뢰 판정이 섞인 값에서 분리 표기에 도달');
      pickSubject(t, w, d, S3, '가계부채');
      t.is(t.shown(d, 'src-empty'), true, '(e) src-empty — 분해된 수집원이 없는 값에서 0 대신 빈 상태');
      t.is(t.shown(d, 'low-confidence'), false, '(e) low-confidence — 저신뢰가 없는 값에서는 내려간다');
      pickSubject(t, w, d, S3, '원/달러 환율');
      t.is(t.shown(d, 'src-mismatch'), true, '(e) src-mismatch — 부분 합이 원시 카운트와 갈리면 갈렸다고 적는다');
      t.is(t.shown(d, 'src-empty'), false, '(e) src-empty — 분해가 있는 값에서는 해소된다');

      t.click(w, sec(d, S3).querySelector('[data-advance]'));
      t.is(t.shown(d, 'art-mismatch'), true, '(e) art-mismatch — 목록 건수가 원시 카운트와 갈리면 note 에 도달');
      pickSubject(t, w, d, S4, '가계부채');
      t.is(t.shown(d, 'art-empty'), true, '(e) art-empty — 기여 기사가 없는 값에서 빈 목록을 지어내지 않는다');
      pickSubject(t, w, d, S4, '한국은행 기준금리');
      t.is(t.shown(d, 'art-empty') || t.shown(d, 'art-mismatch'), false, '(e) art-empty · art-mismatch — 목록이 원시 카운트와 맞으면 해소된다');
      const dup = R(d, S4, 'art-dup');
      dup.checked = true; t.fire(w, dup, 'change');
      t.is(t.shown(d, 'art-dup-empty'), true, '(e) art-dup-empty — 본문 중복이 없는 목록에서 「중복만」 을 켜면 0건 안내');
    }
    {
      const { w, d } = t.boot();
      go(w, S5);
      t.is(t.shown(d, 'auto-pick'), true, '(e) auto-pick — record_id 없이 열면 첫 관측을 자동으로 고른다');
      lookup(t, w, d, S5, 'kr-wire-20261016-9999');
      t.is(t.shown(d, 'trace-missing'), true, '(e) trace-missing — Bronze 에 없는 record_id 는 추적이 시작되지 않는다');
      t.is(R(d, S5, 'tr-found').hidden, true, '(e) trace-missing — 빈 계보를 그리지 않는다');
      lookup(t, w, d, S5, 'kr-portal-20261016-0907');
      t.is(t.shown(d, 'link-dead'), true, '(e) link-dead — 링크가 끊긴 기사에서 보존 원문 대체 안내에 도달');
      t.is(R(d, S5, 'tr-link-badge').textContent, '링크 끊김', '(e) link-dead — 배지가 「링크 끊김」');
      t.is(R(d, S5, 'tr-open').hidden, true, '(e) link-dead — 「원문 열기」 를 두지 않는다');
      t.is(R(d, S5, 'tr-body').textContent.length > 0, true, '(e) link-dead — 보존 원문 전체를 대신 보여 준다');
      lookup(t, w, d, S5, 'kr-econ-20261016-0233');
      t.is(t.shown(d, 'body-lost'), true, '(e) body-lost — 본문이 보존되지 않은 관측');
      t.is(t.shown(d, 'link-dead'), false, '(e) link-dead — 링크가 살아 있는 기사에서는 해소된다');
      lookup(t, w, d, S5, 'kr-market-20261016-1120');
      t.is(t.shown(d, 'silver-none'), true, '(e) silver-none — 분석 레코드가 없는 기사');
      t.is(R(d, S5, 'tr-crumb').textContent.includes('분석 없음'), true, '(e) silver-none — 계보 크럼의 분석 칸이 끊긴다');
      lookup(t, w, d, S5, 'kr-wire-20261016-0415');
      t.is(t.shown(d, 'silver-excluded'), true, '(e) silver-excluded — 저신뢰는 네 분류 어디에도 넣지 않는다');
      lookup(t, w, d, S5, 'kr-wire-20261016-0402');
      t.is(t.shown(d, 'rationale-missing'), true, '(e) rationale-missing — 판단 근거 없이 분석된 기사');
      lookup(t, w, d, S5, '');
      t.is(t.shown(d, 'auto-pick'), true, '(e) auto-pick — 비우고 조회하면 다시 첫 관측');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류·인덱스 준비 중 등)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'spike-loading'], [S1, 'spike-error'], [S1, 'spike-no-baseline'],
                              [S2, 'fair-loading'], [S2, 'fair-error'], [S3, 'src-loading'], [S3, 'src-error'],
                              [S4, 'art-loading'], [S4, 'art-index-not-ready'], [S4, 'art-error'],
                              [S5, 'trace-loading'], [S5, 'trace-error'], [S5, 'trace-index-not-ready'], [S5, 'trace-empty']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'spike-list').querySelectorAll('.spk-row').length > 0, true, '(h) 튀는 값 목록이 렌더된다');
    go(w, S2);
    t.is(R(d, S2, 'fa-rows').querySelectorAll('tr').length > 0, true, '(h) 원시·정규화 대비 표가 렌더된다');
    t.is(R(d, S2, 'src-list').querySelectorAll('.sv-src-row').length > 1, true, '(h) 소스별 기여가 렌더된다');
    t.is(R(d, S2, 'art-list').querySelectorAll('.sv-art-row').length > 0, true, '(h) 기여 뉴스가 렌더된다');
    go(w, S5);
    t.is(R(d, S5, 'tr-title').textContent.length > 1, true, '(h) 원문 카드가 렌더된다');
    t.is(R(d, S5, 'tr-hash').textContent.length, 64, '(h) 본문 해시가 접히지 않고 전부 보인다');
  },
};
