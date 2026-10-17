/* JRN-judgment-debug — 페이지 고유 조작.
 * 다섯 단계 모두 같은 화면 `debug`(Debug.tsx)를 같은 구조로 다시 그리므로 요소를 id 가 아니라
 * 「단계 섹션 안 기본 화면의 [data-role]」 로 찾는다. 목록·상세는 서빙 조회라 조건을 바꾸면
 * 잠깐 「불러오는 중」 을 거친다 — 조작 뒤 sleep 으로 응답을 기다린다. */
const S1 = 'STP-pin-record', S2 = 'STP-read-exchange', S3 = 'STP-check-input', S4 = 'STP-scan-run', S5 = 'STP-route-cause';
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const go = (w, step) => {
  w.location.hash = '#' + step;
  w.dispatchEvent(new w.HashChangeEvent('hashchange'));
};
const WAIT = 400;

const pickOption = (t, w, sel, v) => {
  const opt = [...(sel.options || [])].find(o => o.value === v);
  if (!opt) { t.bad(`(d) <select data-role=${sel.dataset.role}> 에 <option value=${v}> 가 없다`); return false; }
  opt.selected = true;
  t.fire(w, sel, 'change');
  return true;
};
/* 목록 표에서 레코드를 고른다 — 실제 <input type=radio> 의 change. */
const pickRecord = async (t, w, d, step, id) => {
  const el = R(d, step, 'rec-rows').querySelector(`input[type=radio][value="${id}"]`);
  if (!el) { t.bad(`(d) ${step} 목록에 레코드 ${id} 라디오가 없다`); return; }
  el.checked = true;
  t.fire(w, el, 'change');
  await t.sleep(WAIT);
};
const search = async (t, w, d, step, q) => {
  const inp = R(d, step, 'q');
  inp.value = q; t.fire(w, inp, 'input');
  t.fire(w, R(d, step, 'find-form'), 'submit');
  await t.sleep(WAIT);
};
const rowIds = (d, step) => [...R(d, step, 'rec-rows').querySelectorAll('input[type=radio]')].map(i => i.value);

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
    for (const step of [S1, S2, S3, S4, S5]) {
      shape(step, 'q', 'INPUT', 'search');
      shape(step, 'symptom', 'SELECT');
      shape(step, 'find-submit', 'BUTTON', 'submit');
      shape(step, 'diff-only', 'INPUT', 'checkbox');
      shape(step, 'prompt-part', 'SELECT');
      shape(step, 'body-ver', 'SELECT');
      shape(step, 'memo', 'TEXTAREA');
      t.is([...R(d, step, 'cause').querySelectorAll('input')].every(e => e.type === 'radio'), true,
        `(d) ${step} 원인 컨트롤이 전부 실제 <input type=radio> 다`);
    }
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    t.is([...R(d, S1, 'symptom').querySelectorAll('optgroup')].map(g => g.label), ['분석 상태', '호출 결과', '미호출 사유'],
      '(d) 증상 필터는 서빙이 거를 수 있는 세 묶음이다');

    /* 단계 1 — 검색은 「찾기」 제출로 조회한다 */
    {
      const all = rowIds(d, S1).length;
      const inp = R(d, S1, 'q');
      inp.value = '반도체'; t.fire(w, inp, 'input');
      t.is(rowIds(d, S1).length, all, '(d) 검색어를 치기만 해서는 목록이 바뀌지 않는다(서빙 조회는 제출로)');
      t.fire(w, R(d, S1, 'find-form'), 'submit');
      await t.sleep(WAIT);
      t.is(rowIds(d, S1), ['e48c0b93a7d2'], '(d) 「찾기」 제출이 제목으로 목록을 좁힌다');
      await search(t, w, d, S1, '');
      pickOption(t, w, R(d, S1, 'symptom'), 'call_outcome:call_failed');
      await t.sleep(WAIT);
      t.is(rowIds(d, S1), ['5be0d8a1c934'], '(d) 증상 <select> 가 목록을 호출 실패로 좁힌다');
      pickOption(t, w, R(d, S1, 'symptom'), 'no_call_reason:keyword_analyzer');
      await t.sleep(WAIT);
      t.is(rowIds(d, S1), ['4e8a1f6d93b0'], '(d) 미호출 사유 묶음으로도 거른다');
      pickOption(t, w, R(d, S1, 'symptom'), '');
      await t.sleep(WAIT);
      t.is(rowIds(d, S1).length, all, '(d) 증상을 「전체」로 되돌리면 목록이 복원된다');
      t.is(R(d, S1, 'rec-rows').textContent.includes('제목 기록 없음'), true, '(d) 수집 기록이 없는 행은 「제목 기록 없음」');
    }
    /* 단계 1 — 레코드를 고르면 같은 화면 전체가 그 레코드로 다시 그려진다 */
    {
      t.is(R(d, S1, 'pick-badge').textContent, 'a3f9c21e07b4', '(d) 제보 링크의 레코드가 먼저 골라져 있다');
      await pickRecord(t, w, d, S1, 'd6c4a90e3b72');
      t.is(R(d, S1, 'pick-badge').textContent, 'd6c4a90e3b72', '(d) 목록 라디오가 고른 결과를 바꾼다');
      t.is(R(d, S1, 'open-src-1').hidden, true, '(d) 원문 주소가 없으면 「원문 열기」 를 숨긴다');
      t.is(R(d, S1, 'pick-title').hidden, true, '(d) 제목이 없으면 제목 줄을 그리지 않는다');
      await pickRecord(t, w, d, S1, 'a3f9c21e07b4');
      t.is(R(d, S1, 'open-src-1').hidden, false, '(d) 원문 주소가 있으면 「원문 열기」 가 보인다');
    }

    /* 단계 2 — 요청·응답 */
    t.click(w, sec(d, S1).querySelector('[data-advance]'));
    {
      t.is(R(d, S2, 'pick-badge').textContent, 'a3f9c21e07b4', '(d) 고른 레코드가 다음 단계의 같은 화면에도 그대로다');
      const user = R(d, S2, 'prompt-pre').textContent;
      t.is(user.startsWith('TITLE: '), true, '(d) 보낸 요청 기본값은 사용자 메시지(제목·본문)');
      pickOption(t, w, R(d, S2, 'prompt-part'), 'system');
      t.is(R(d, S2, 'prompt-pre').textContent !== user && R(d, S2, 'prompt-pre').textContent.startsWith('You analyze'), true,
        '(d) 보낸 요청 <select> 가 시스템 지시문으로 바꾼다');
      pickOption(t, w, R(d, S2, 'prompt-part'), 'user');
      const n = () => R(d, S2, 'cmp-rows').querySelectorAll('tr').length;
      t.is(n(), 4, '(d) 응답↔저장값은 필드 넷');
      const chk = R(d, S2, 'diff-only');
      chk.checked = true; t.fire(w, chk, 'change');
      t.is(n(), 3, '(d) 「어긋난 필드만 보기」 가 같은 필드를 걷어 낸다');
      chk.checked = false; t.fire(w, chk, 'change');
      t.is(R(d, S2, 'hash').textContent.startsWith('sha256 ') && !R(d, S2, 'hash').textContent.includes('✓'), true,
        '(d) 전송본 해시는 값만 — 하지 않은 대조를 ✓ 로 주장하지 않는다');
    }

    /* 단계 3 — 원문 버전 */
    await pickRecord(t, w, d, S2, 'e48c0b93a7d2');
    t.click(w, sec(d, S2).querySelector('[data-advance]'));
    {
      const ver = R(d, S3, 'body-ver');
      t.is(ver.options.length, 3, '(d) 보관된 원문 버전이 셋');
      const before = R(d, S3, 'diff-sum').textContent;
      pickOption(t, w, ver, ver.options[0].value);
      t.is(R(d, S3, 'diff-sum').textContent !== before && R(d, S3, 'diff-sum').textContent.includes('같습니다'), true,
        '(d) 원문 버전 <select> 로 분석에 쓴 버전을 고르면 대조 요약이 「같습니다」 로 바뀐다');
      t.is(R(d, S3, 'arch-pre').textContent.includes('(속보)'), true, '(d) 고른 버전의 본문이 보인다');
    }

    /* 단계 4 — 실행 → 레코드 목록 드릴다운 (AC4.3) */
    t.click(w, sec(d, S3).querySelector('[data-advance]'));
    {
      t.is(R(d, S4, 'run-id').textContent, 'run-20260923T160002Z-3e7b14', '(d) 고른 결과가 속한 실행을 연다');
      const sum = [...R(d, S4, 'stage-rows').querySelectorAll('tr')].every(tr => tr.textContent.includes('입력 = 합'));
      t.is(sum, true, '(d) 단계 표의 결과별 건수 합 = 입력 건수');
      const drill = [...R(d, S4, 'sym-body').querySelectorAll('[data-role="sym-drill"]')]
        .find(b => b.dataset.symptom === 'analysis_status:analyzed');
      t.click(w, drill);
      await t.sleep(WAIT);
      t.is(R(d, S4, 'symptom').value, 'analysis_status:analyzed', '(d) 「목록 보기」 가 같은 화면 검색 카드의 증상을 건다');
      t.is(rowIds(d, S4).sort(), ['b05f7a2c6e19', 'e48c0b93a7d2'].sort(), '(d) 목록이 그 실행·증상의 레코드로 좁혀진다');
      t.click(w, R(d, S4, 'widen'));
      await t.sleep(WAIT);
      t.is(rowIds(d, S4).length > 2, true, '(d) 「전체 실행으로 넓히기」 가 실행 한정을 푼다');
      pickOption(t, w, R(d, S4, 'symptom'), '');
      await t.sleep(WAIT);
    }

    /* 단계 5 — 원인 판정 */
    t.click(w, sec(d, S4).querySelector('[data-advance]'));
    {
      const ev = R(d, S5, 'evidence-rows').textContent;
      t.is(ev.includes('분석 뒤 본문 수정됨'), true, '(d) 근거 표가 고른 레코드의 입력 점검 결과를 싣는다');
      const r = R(d, S5, 'cause').querySelector('input[value="input"]');
      r.checked = true; t.fire(w, r, 'change');
      const m = R(d, S5, 'memo');
      m.value = '분석 뒤 본문이 두 번 고쳐졌다'; t.fire(w, m, 'input');
      t.fire(w, R(d, S5, 'cause-form'), 'submit');
      t.is(R(d, S5, 'recorded-what').textContent, '「입력(수집)」로 1건을 판정했습니다.', '(d) 라디오·메모가 판정 기록에 실린다');
    }
  },

  async states(t) {
    /* 데이터(레코드 선택)로 도달하는 상태 */
    const viaRecord = [
      [S1, 'b05f7a2c6e19', ['multi-version']],
      [S2, '7c3d05e8b2f9', ['parse-failed']],
      [S2, '5be0d8a1c934', ['call-failed', 'no-reply']],
      [S2, 'c71e4f02ad88', ['not-called']],
      [S2, '4e8a1f6d93b0', ['not-called']],
      [S2, '0d9a6b7e2f15', ['reused']],
      [S2, '2b6e91f4c0a7', ['no-call-record']],
      [S2, 'd6c4a90e3b72', ['call-record-absent']],
      [S3, 'e48c0b93a7d2', ['body-mismatch']],
      [S3, '9f27d3c50e61', ['body-empty']],
      [S3, 'c71e4f02ad88', ['body-empty']],
      [S4, '5be0d8a1c934', ['run-stage-failed']],
      [S4, '2b6e91f4c0a7', ['no-run-record']],
    ];
    for (const [step, id, sts] of viaRecord) {
      const { w, d } = t.boot();
      go(w, step);
      for (const st of sts) t.is(t.shown(d, st), false, `(e) ${st} — 기본 레코드에서는 아니다`);
      await pickRecord(t, w, d, step, id);
      for (const st of sts) t.is(t.shown(d, st), true, `(e) ${st} — 레코드 ${id} 를 고르면 도달`);
      if (step === S4 && sts[0] === 'no-run-record') t.is(R(d, S4, 'run-grid').hidden, true, '(e) no-run-record — 실행 카드 대신 기록 없음 문면');
    }
    {
      const { w, d } = t.boot();
      go(w, S2);
      t.is(t.shown(d, 'parse-mismatch'), true, '(e) parse-mismatch — 제보 링크의 기본 레코드에서 도달');
      await pickRecord(t, w, d, S2, '0d9a6b7e2f15');
      t.is(t.shown(d, 'parse-mismatch'), false, '(e) parse-mismatch — 응답과 저장값이 같은 레코드에서는 해소');
      t.click(w, R(d, S2, 'open-orig'));
      t.is(t.shown(d, 'reused'), false, '(e) reused — 「원 호출 기록 열기」 로 원 호출이 펼쳐진다');
      t.is(R(d, S2, 'call-sub').textContent.endsWith('원 호출 기록'), true, '(e) reused — 머리가 「원 호출 기록」 으로');
    }
    {
      const { w, d } = t.boot();
      await pickRecord(t, w, d, S1, '9f27d3c50e61');
      /* 고른 직후 300ms 동안은 「불러오는 중」 — 응답을 기다리기 전에 확인 */
      const el = R(d, S1, 'rec-rows').querySelector('input[value="a3f9c21e07b4"]');
      el.checked = true; t.fire(w, el, 'change');
      t.is(t.shown(d, 'detail-loading'), true, '(e) detail-loading — 레코드를 고른 직후 도달');
      t.is(R(d, S1, 'found').hidden, true, '(e) detail-loading — 아래 카드는 응답 전까지 없다');
      await t.sleep(WAIT);
      t.is(t.shown(d, 'detail-loading'), false, '(e) detail-loading — 응답이 오면 해소');
      t.fire(w, R(d, S1, 'find-form'), 'submit');
      t.is(t.shown(d, 'list-loading'), true, '(e) list-loading — 「찾기」 제출 직후 도달');
      await t.sleep(WAIT);
      t.is(t.shown(d, 'list-loading'), false, '(e) list-loading — 응답이 오면 해소');
      await search(t, w, d, S1, 'ffffffffffff');
      t.is(t.shown(d, 'no-match'), true, '(e) no-match — 없는 번호로 찾으면 도달');
      t.is(R(d, S1, 'rec-table').hidden, true, '(e) no-match — 빈 표를 그리지 않는다');
      await search(t, w, d, S1, '');
      t.is(t.shown(d, 'no-match'), false, '(e) no-match — 검색을 비우면 해소');
    }
    {
      const { w, d } = t.boot();
      go(w, S4);
      t.is(t.shown(d, 'run-filter'), false, '(e) run-filter — 처음에는 실행 한정이 없다');
      t.click(w, R(d, S4, 'sym-body').querySelector('[data-role="sym-drill"]'));
      await t.sleep(WAIT);
      t.is(t.shown(d, 'run-filter'), true, '(e) run-filter — 「목록 보기」 로 실행 기록에서 레코드 목록으로 내려간다');
      t.is(R(d, S4, 'run-filter-id').textContent, R(d, S4, 'run-id').textContent, '(e) run-filter — 걸린 실행이 그 실행이다');
    }
    {
      const { w, d } = t.boot();
      go(w, S5);
      t.fire(w, R(d, S5, 'cause-form'), 'submit');
      t.is(t.shown(d, 'invalid'), true, '(e) invalid — 원인 없이 제출하면 도달');
      t.is(R(d, S5, 'invalid-msg').textContent, '원인을 먼저 고르세요.', '(e) invalid — 원인 미선택 문면');
      const r = R(d, S5, 'cause').querySelector('input[value="parse"]');
      r.checked = true; t.fire(w, r, 'change');
      t.fire(w, R(d, S5, 'cause-form'), 'submit');
      t.is(R(d, S5, 'invalid-msg').textContent.startsWith('무엇을 보고 판정했는지'), true, '(e) invalid — 메모 공란 문면');
      const m = R(d, S5, 'memo');
      m.value = '응답의 마지막 JSON 이 혼재인데 저장은 첫 JSON'; t.fire(w, m, 'input');
      t.fire(w, R(d, S5, 'cause-form'), 'submit');
      t.is([t.shown(d, 'invalid'), t.shown(d, 'recorded')], [false, true], '(e) recorded — 원인·메모를 채우면 기록되고 검증 실패는 걷힌다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩·오류·인덱스·미발견·자동 선택·상한·진행 중·알림 진입)는 딥링크로 연다. */
    for (const [step, st] of [[S1, 'loading'], [S1, 'index-not-ready'], [S1, 'api-error'], [S1, 'list-error'], [S1, 'truncated'],
                              [S1, 'alert-entry'], [S1, 'requested-missing'], [S1, 'no-records'], [S1, 'auto-pick'], [S4, 'run-running']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
    {
      const { w, d } = t.boot();
      w.location.hash = `#${S1}/index-not-ready`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(base(d, S1).hidden, true, '(e) index-not-ready — 기본 화면은 가려진다(화면 교체)');
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(rowIds(d, S1).length, 11, '(h) 분석 결과 목록이 렌더된다');
    t.is(R(d, S1, 'pick-kv').querySelectorAll('.kv').length, 9, '(h) 고른 결과 kv 아홉 줄(원문 주소 포함)');
    go(w, S2);
    t.is(R(d, S2, 'call-kv').querySelectorAll('.kv').length, 7, '(h) 모델 호출 기록 kv 일곱 줄');
    t.is(R(d, S2, 'reply-pre').textContent.includes('"sentiment":"mixed"'), true, '(h) 가공 전 응답 원문이 렌더된다');
    go(w, S4);
    t.is(R(d, S4, 'stage-rows').querySelectorAll('tr').length, 3, '(h) 실행 단계 표가 렌더된다');
    t.is(R(d, S4, 'sym-body').querySelectorAll('[data-role="sym-drill"]').length > 0, true, '(h) 증상 「목록 보기」 가 렌더된다');
  },
};
