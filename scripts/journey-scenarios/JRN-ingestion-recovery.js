/* JRN-ingestion-recovery — 페이지 고유 조작.
 * 다섯 단계가 같은 화면 `integrity`(수집 무결성 콘솔, 라우트 없음)를 같은 구조로 다시 그리므로
 * 요소를 id 가 아니라 「단계 섹션 안의 [data-role]」 로 찾는다. */
const S1 = 'STP-spot-anomaly', S2 = 'STP-locate-gap', S3 = 'STP-diagnose-source', S4 = 'STP-backfill', S5 = 'STP-verify-integrity';
const sec = (d, step) => d.querySelector(`section.jstep[data-step="${step}"]`);
const base = (d, step) => sec(d, step).querySelector('.screen[data-screen]:not([data-state])');
const R = (d, step, role) => base(d, step).querySelector(`[data-role="${role}"]`);
const cta = (d, step) => sec(d, step).querySelector('.stepact [data-advance]');
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
/* 시간대별 수집 현황에서 구간 행을 고른다 — label 이 없으면 첫 이상 구간. */
const pickBucket = (t, w, d, step, label) => {
  const rows = [...R(d, step, 'bk-rows').querySelectorAll('tr[data-bucket]')];
  const row = label ? rows.find(r => r.textContent.includes(label))
    : rows.find(r => !r.textContent.includes('정상'));
  if (!row) { t.bad(`(c) ${step} 시간대별 수집 현황에 고를 구간(${label || '이상'})이 없다`); return null; }
  t.click(w, row);
  return row;
};
/* 구간 · 소스 좁히기에서 행을 고른다 — match(행 텍스트)에 맞는 행 전부, 없으면 첫 행. */
const pickGaps = (t, w, d, step, match) => {
  const rows = () => [...R(d, step, 'gap-rows').querySelectorAll('tr[data-gap]')];
  const want = match ? rows().filter(r => match(r.textContent)).map(r => r.dataset.gap) : rows().slice(0, 1).map(r => r.dataset.gap);
  if (!want.length) { t.bad(`(c) ${step} 구간 목록에 고를 행이 없다`); return 0; }
  for (const k of want) {
    const r = rows().find(x => x.dataset.gap === k);
    if (r && r.getAttribute('aria-selected') !== 'true') t.click(w, r);
  }
  return want.length;
};
const pickCause = (t, w, d, step, v) => {
  const el = R(d, step, 'cause').querySelector(`input[type=radio][value="${v}"]`);
  if (!el) { t.bad(`(d) ${step} 원인 라디오 ${v} 가 없다`); return; }
  el.checked = true;
  t.fire(w, el, 'change');
};

/* 실패 구간(kr-wire 10/17 09–11시, 소스 API 오류)을 들고 단계 4 까지 */
const walkApiToBackfill = (t, w, d) => {
  pickBucket(t, w, d, S1, '09–12시');
  t.click(w, cta(d, S1));
  pickGaps(t, w, d, S2, s => s.includes('kr-wire'));
  t.click(w, cta(d, S2));
  pickCause(t, w, d, S3, 'api');
  t.click(w, cta(d, S3));
};
/* 중복 구간(kr-daily 10/17 13 · 14시, 링크 단위 중복)을 들고 단계 4 까지 */
const walkDupToBackfill = (t, w, d) => {
  pickBucket(t, w, d, S1, '12–15시');
  t.click(w, cta(d, S1));
  pickGaps(t, w, d, S2, s => /1[34]시/.test(s) && s.includes('중복'));
  t.click(w, cta(d, S2));
  pickCause(t, w, d, S3, 'dup-link');
  t.click(w, cta(d, S3));
};

module.exports = {
  unlock: {
    [S1]: (t, w, d) => pickBucket(t, w, d, S1),
    [S2]: (t, w, d) => pickGaps(t, w, d, S2),
    [S3]: (t, w, d) => pickCause(t, w, d, S3, 'api'),
    [S4]: (t, w, d) => t.click(w, R(d, S4, 'run')),
  },

  async inputs(t) {
    const { w, d } = t.boot();

    const shape = (step, role, tag, type) => {
      const el = R(d, step, role);
      if (!el) return t.bad(`(d) ${step} [data-role=${role}] 컨트롤이 없다`);
      t.is(el.tagName, tag, `(d) ${step} ${role} 는 실제 <${tag.toLowerCase()}> 다`);
      if (type) t.is(el.type, type, `(d) ${step} ${role} 의 type 은 ${type}`);
    };
    for (const step of [S1, S2, S3, S4, S5]) {
      shape(step, 'axis', 'SELECT');
      shape(step, 'only-bad', 'INPUT', 'checkbox');
      shape(step, 'f-source', 'SELECT');
      shape(step, 'f-band', 'SELECT');
      shape(step, 'op', 'SELECT');
      t.is([...R(d, step, 'cause').querySelectorAll('input')].every(e => e.type === 'radio'), true,
        `(d) ${step} 원인 컨트롤이 전부 실제 <input type=radio> 다`);
    }
    t.is(d.querySelectorAll('.seg').length, 0, '(d) 제품 평면에 class="seg" 의사 컨트롤이 없다');
    t.is(d.querySelectorAll('[name^="preserve"], [name^="batch"], [name^="v-window"], textarea').length, 0,
      '(d) 걷어낸 목업 전용 컨트롤(보존 체크박스 · 배치 크기 · 재확인 범위 · 이력 메모)이 없다');

    /* 단계 1 — 축 · 이상 구간만 */
    {
      const labels = () => [...R(d, S1, 'bk-rows').querySelectorAll('tr[data-bucket]')].map(r => r.textContent.trim());
      const all = labels();
      const ob = R(d, S1, 'only-bad');
      ob.checked = true; t.fire(w, ob, 'change');
      t.is(labels().length > 0 && labels().length < all.length, true, '(d) <input type=checkbox> 가 이상 구간만 남긴다');
      ob.checked = false; t.fire(w, ob, 'change');
      t.is(labels().length, all.length, '(d) 체크를 풀면 목록이 되돌아온다');
      const m = R(d, S1, 'm-ok').textContent;
      pickOption(t, w, R(d, S1, 'axis'), 'US');
      t.is(R(d, S1, 'm-ok').textContent !== m, true, '(d) 축 <select> 가 무결성 지표를 실제로 바꾼다');
      t.is(d.querySelector('[data-role="tb-pill"]').textContent.startsWith('미국'), true, '(d) 토프바 pill 이 고른 축을 따라간다');
      t.is(R(d, S1, 'gap-axis').textContent.trim(), 'US', '(d) 좁히기 카드의 축 배지가 같은 축을 따라간다');
      pickOption(t, w, R(d, S1, 'axis'), 'KR');
      t.is(R(d, S1, 'log-rows').querySelectorAll('tr').length > 1, true, '(d) 이벤트 로그가 축의 실패 · 중복 · 미실행을 적는다');
    }

    /* 단계 1 → 2 — 구간을 고르면 그 시간대로 좁혀진다 */
    pickBucket(t, w, d, S1, '09–12시');
    t.is(R(d, S1, 'sum-kv').textContent.includes('재시도'), true, '(d) 구간 행을 고르면 구간 요약이 시도 · 성공 · 실패 · 재시도 · 중복으로 열린다');
    t.click(w, cta(d, S1));
    t.is(R(d, S2, 'f-band').value, 'b6', '(d) 단계 1 에서 고른 구간이 같은 화면의 시간대 필터로 이어진다');
    {
      const n = () => R(d, S2, 'gap-rows').querySelectorAll('tr[data-gap]').length;
      const inBand = n();
      pickOption(t, w, R(d, S2, 'f-band'), 'all');
      const allN = n();
      t.is(allN > inBand && inBand > 0, true, '(d) 시간대 <select> 가 시간 × 소스 행을 실제로 거른다');
      pickOption(t, w, R(d, S2, 'f-source'), 'kr-daily');
      t.is(n() > 0 && n() < allN && [...R(d, S2, 'gap-rows').querySelectorAll('tr')].every(r => r.textContent.includes('kr-daily')), true,
        '(d) 소스 <select> 가 그 소스의 행만 남긴다');
      pickOption(t, w, R(d, S2, 'f-source'), 'all');
      pickOption(t, w, R(d, S2, 'f-band'), 'b6');
    }
    pickGaps(t, w, d, S2, s => s.includes('kr-wire'));
    t.is(R(d, S2, 'gap-rows').querySelectorAll('tr[aria-selected="true"]').length, 3, '(d) 행을 누르면 그 구간이 선택 상태가 된다');
    t.is(R(d, S2, 'gap-rows').querySelectorAll('input[type=checkbox]:checked').length, 3, '(d) 고른 행의 체크박스가 실제로 체크된다');

    /* 단계 3 — 원인 */
    t.click(w, cta(d, S2));
    t.is(R(d, S3, 'meta-kv').textContent.includes('run-20261017-0900'), true, '(d) 수집 메타데이터가 고른 구간의 실행 ID 를 보인다');
    t.is(R(d, S3, 'rec-rows').querySelectorAll('tr').length, 5, '(d) 수집 레코드가 순위 · 조회수 · 수집 시각과 함께 렌더된다');
    t.is(R(d, S3, 'meta-badges').textContent.includes('upstream_unavailable'), true, '(d) 기록된 실패 사유가 상태 배지로 보인다');
    {
      const before = R(d, S3, 'cause-hint').textContent;
      pickCause(t, w, d, S3, 'schedule');
      t.is(R(d, S3, 'cause-hint').textContent !== before, true, '(d) <input type=radio> 선택이 진단 안내를 실제로 바꾼다');
      pickCause(t, w, d, S3, 'dup-link');
      t.is(R(d, S3, 'op').value, 'dedup', '(d) 중복 원인을 고르면 작업이 「중복 정리」 로 맞춰진다');
      pickCause(t, w, d, S3, 'api');
      t.is(R(d, S3, 'op').value, 'refetch', '(d) 소스 오류 원인이면 작업이 「재수집」 이다');
    }

    /* 단계 4 — 작업 */
    t.click(w, cta(d, S3));
    {
      const before = R(d, S4, 'target-kv').textContent;
      pickOption(t, w, R(d, S4, 'op'), 'dedup');
      t.is(R(d, S4, 'target-kv').textContent !== before, true, '(d) 작업 <select> 가 실행 대상 요약을 실제로 바꾼다');
      t.is(R(d, S4, 'keep-note').textContent.includes('덮어쓰지 않습니다'), true, '(d) 어떤 작업이든 덮어쓰지 않는다는 안내가 고정으로 있다');
      pickOption(t, w, R(d, S4, 'op'), 'refetch');
    }
    t.click(w, R(d, S4, 'run'));
    await t.sleep(400);
    t.is(R(d, S4, 'run-kv').textContent.includes('새 버전 추가'), true, '(d) 실행 결과가 본문 버전 보존 결과를 적는다');
    t.is(R(d, S4, 'log-rows').textContent.includes('재처리'), true, '(d) 보정 실행이 이벤트 로그에 실행 기록으로 남는다');

    /* 단계 5 — 전후 비교 */
    t.click(w, cta(d, S4));
    t.is(R(d, S5, 'vf-rows').textContent.includes('100.0%'), true, '(d) 전후 비교 표가 보정 후 성공률을 그린다');
    t.is([...R(d, S5, 'gap-rows').querySelectorAll('tr')].filter(r => r.textContent.includes('보정됨')).length, 3,
      '(d) 보정한 구간이 같은 화면의 구간 목록에서 「보정됨」 으로 바뀐다');
  },

  async states(t) {
    /* 단계 1 */
    {
      const { w, d } = t.boot();
      t.is(t.shown(d, 'no-bucket'), true, '(e) no-bucket — 단계 1 진입 직후 구간 미선택');
      t.is(t.shown(d, 'no-anomaly'), false, '(e) no-anomaly — 이상이 있는 축에서는 정상 상태가 아니다');
      pickOption(t, w, R(d, S1, 'axis'), 'GL');
      t.is(t.shown(d, 'no-anomaly'), true, '(e) no-anomaly — 이상이 없는 축에서 「볼 것 없음」 에 도달');
      pickOption(t, w, R(d, S1, 'axis'), 'KR');
      t.is(t.shown(d, 'no-anomaly'), false, '(e) no-anomaly — 축을 되돌리면 해소된다');
      pickBucket(t, w, d, S1, '09–12시');
      t.is(t.shown(d, 'no-bucket'), false, '(e) no-bucket — 구간을 고르면 해소된다');
      t.is(t.shown(d, 'attempt-zero'), false, '(e) attempt-zero — 시도가 있는 구간은 이 상태가 아니다');
      pickBucket(t, w, d, S1, '03–06시');
      t.is(t.shown(d, 'attempt-zero'), true, '(e) attempt-zero — 시도 0 구간에서 「스케줄 미실행」 에 도달');
      t.is(R(d, S1, 'az-catchup').textContent.includes('보정'), true, '(e) attempt-zero — 다음 주기 보정 결과가 함께 적힌다');
    }
    /* 단계 2 */
    {
      const { w, d } = t.boot();
      go(t, w, S2);
      t.is(t.shown(d, 'no-gap'), true, '(e) no-gap — 단계 2 진입 직후 고른 구간 없음');
      pickGaps(t, w, d, S2);
      t.is(t.shown(d, 'no-gap'), false, '(e) no-gap — 행을 고르면 해소된다');
      pickOption(t, w, R(d, S2, 'f-source'), 'us-desk');
      t.is(t.shown(d, 'filter-empty'), true, '(e) filter-empty — 그 축에 없는 소스로 좁히면 0건');
      pickOption(t, w, R(d, S2, 'f-source'), 'all');
      t.is(t.shown(d, 'filter-empty'), false, '(e) filter-empty — 필터를 넓히면 해소된다');
    }
    /* 단계 3 · 4 — 분기 1 (소스 장애 → 복구 대기) */
    {
      const { w, d } = t.boot();
      walkApiToBackfill(t, w, d);
      go(t, w, S3);
      t.is(t.shown(d, 'source-outage'), true, '(e) source-outage — 소스 API 오류 판정에서 장애 배너에 도달');
      t.is(t.shown(d, 'origin-gone'), false, '(e) source-outage — 두 배너가 동시에 뜨지 않는다');
      t.click(w, R(d, S3, 'outage-go'));
      t.is(t.visible(d), [S4], '(e) retry-pending — 재시도 예약이 보정 실행 단계로 간다');
      t.is(t.shown(d, 'retry-pending'), true, '(e) retry-pending — 도착 단계에 「복구 대기」 가 보인다');
      t.is([...R(d, S4, 'gap-rows').querySelectorAll('tr')].filter(r => r.textContent.includes('복구 대기')).length, 3,
        '(e) retry-pending — 구간 목록의 고른 행이 「복구 대기」 배지로 바뀐다');
    }
    /* 단계 3 · 5 — 분기 2 (원본 소실 → 영구 누락 → 데이터 없음) */
    {
      const { w, d } = t.boot();
      pickBucket(t, w, d, S1, '18–21시');
      t.click(w, cta(d, S1));
      pickGaps(t, w, d, S2, s => s.includes('kr-daily'));
      t.click(w, cta(d, S2));
      pickCause(t, w, d, S3, 'origin');
      t.is(t.shown(d, 'origin-gone'), true, '(e) origin-gone — 원본 소실 판정에서 영구 누락 배너에 도달');
      t.is(t.shown(d, 'source-outage'), false, '(e) origin-gone — 앞선 배너는 뜨지 않는다');
      t.click(w, R(d, S3, 'origin-go'));
      t.is(t.visible(d), [S5], '(e) perm-missing — 영구 누락 확정이 복구 확인 단계로 간다');
      t.is(t.shown(d, 'perm-missing'), true, '(e) perm-missing — 도착 단계에 영구 누락 배너');
      t.is(t.shown(d, 'recovered'), false, '(e) perm-missing — 「복구됨」 이 아니다');
      t.is(R(d, S5, 'vf-rows').textContent.includes('데이터 없음'), true, '(e) perm-missing — 보정 후 칸이 「데이터 없음」');
    }
    /* 단계 4 — 대상 미선택 · 제출 중 · 실행 결과 · 복구 */
    {
      const { w, d } = t.boot();
      go(t, w, S4);
      t.is(t.shown(d, 'no-target'), true, '(e) no-target — 고른 구간 없이 보정 실행 단계에 오면 차단');
      t.is(R(d, S4, 'run').disabled, true, '(e) no-target — 「보정 실행」 이 비활성');
    }
    {
      const { w, d } = t.boot();
      walkApiToBackfill(t, w, d);
      t.is(t.shown(d, 'no-target'), false, '(e) no-target — 구간을 고르고 오면 차단이 없다');
      /* 행을 누를 때마다 표가 다시 그려지므로 매번 다시 찾는다 */
      for (let r; (r = R(d, S4, 'gap-rows').querySelector('tr[aria-selected="true"]'));) t.click(w, r);
      t.is(t.shown(d, 'no-target'), true, '(e) no-target — 고른 구간을 모두 풀면 차단에 도달');
      pickGaps(t, w, d, S4, s => s.includes('kr-wire'));
      t.is(t.shown(d, 'running'), false, '(e) running — 실행 전에는 제출 중이 아니다');
      t.click(w, R(d, S4, 'run'));
      t.is(t.shown(d, 'running'), true, '(e) running — 실행 직후 제출 중에 도달');
      await t.sleep(400);
      t.is(t.shown(d, 'running'), false, '(e) running — 제출 중이 실제로 해소된다');
      t.is(t.shown(d, 'run-done'), true, '(e) run-done — 실행 결과에 도달');
      t.is(t.shown(d, 'dup-again'), false, '(e) run-done — 실패 구간 재수집은 중복을 만들지 않는다');
      t.click(w, cta(d, S4));
      t.is(t.shown(d, 'recovered'), true, '(e) recovered — 정상 범위로 복구됨에 도달');
      t.is(t.shown(d, 'no-run'), false, '(e) recovered — 실행 전 상태가 아니다');
    }
    /* 단계 4 — 분기 3 (재수집이 중복을 다시 만듦) · 중복 정리 확인 */
    {
      const { w, d } = t.boot();
      walkDupToBackfill(t, w, d);
      t.click(w, R(d, S4, 'run'));
      t.is(t.shown(d, 'dedup-confirm'), true, '(e) dedup-confirm — 「중복 정리」 는 확인 대화상자를 먼저 연다');
      t.is(t.shown(d, 'running'), false, '(e) dedup-confirm — 확인 전에는 제출하지 않는다');
      t.click(w, R(d, S4, 'dlg-cancel'));
      t.is(t.shown(d, 'dedup-confirm'), false, '(e) dedup-confirm — 취소하면 닫힌다');
      pickOption(t, w, R(d, S4, 'op'), 'refetch');
      t.click(w, R(d, S4, 'run'));
      await t.sleep(400);
      t.is(t.shown(d, 'dup-again'), true, '(e) dup-again — 중복 구간을 재수집하면 중복 재생성에 도달');
      t.is(Number(R(d, S4, 'dup-count').textContent) > 0, true, '(e) dup-again — 다시 생긴 중복 건수가 적힌다');
      t.click(w, R(d, S4, 'dup-go'));
      t.is(t.visible(d), [S3], '(e) dup-again — 중복 규칙 재확인으로 원인 진단에 돌아간다');
    }
    /* 단계 4 → 2 — 분기 5 (미해결로 남기고 닫기) */
    {
      const { w, d } = t.boot();
      walkApiToBackfill(t, w, d);
      t.click(w, R(d, S4, 'leave-go'));
      t.is(t.visible(d), [S2], '(e) unresolved — 미해결로 남기면 구간 목록으로 돌아간다');
      t.is(t.shown(d, 'unresolved'), true, '(e) unresolved — 미해결 구간이 다시 뜬다');
      t.is(R(d, S2, 'gap-rows').querySelector('tr').textContent.includes('미해결'), true, '(e) unresolved — 미해결 행이 맨 위다');
    }
    /* 단계 5 — 실행 전 */
    {
      const { w, d } = t.boot();
      go(t, w, S5);
      t.is(t.shown(d, 'no-run'), true, '(e) no-run — 보정 없이 복구 확인에 오면 「보정 후」 가 비어 있다');
    }
    /* 데이터로 도달할 수 없는 상태(로딩 · 오류 · 인덱스 준비 중 · 제출 실패)는 딥링크로 연다 — 하네스 (i) 가 전부 확인한다. */
    for (const [step, st] of [[S1, 'loading'], [S1, 'api-error'], [S1, 'index-not-ready'], [S4, 'run-failed']]) {
      const { w, d } = t.boot();
      w.location.hash = `#${step}/${st}`;
      w.dispatchEvent(new w.HashChangeEvent('hashchange'));
      t.is(t.shown(d, st), true, `(e) ${st} — 딥링크 #${step}/${st} 로 도달`);
    }
  },

  async renders(t) {
    const { w, d } = t.boot();
    t.is(R(d, S1, 'bk-rows').querySelectorAll('tr[data-bucket]').length, 8, '(h) 시간대별 수집 현황 8구간이 렌더된다');
    t.is(R(d, S1, 'gap-rows').querySelectorAll('tr[data-gap]').length > 0, true, '(h) 구간 · 소스 좁히기 표가 렌더된다');
    t.is(R(d, S1, 'log-rows').querySelectorAll('tr').length > 0, true, '(h) 이벤트 로그가 렌더된다');
    go(t, w, S5);
    t.is(R(d, S5, 'vf-rows').querySelectorAll('tr').length, 3, '(h) 전후 비교 표가 렌더된다');
  },
};
