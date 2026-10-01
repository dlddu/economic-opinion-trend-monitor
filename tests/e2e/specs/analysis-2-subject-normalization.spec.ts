// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 2
//
// 단정하지 않는 것: 통합된 키의 **철자**. 정규 표기는 제품의 카탈로그가 정하는 값이지 테스트가
// 정할 값이 아니다. 여기서 보는 것은 "셋이 한 키로 모이는가"와 "모으는 과정에서 다른 대상이
// 사라지지 않는가"다.

import { expect, test } from "@playwright/test";

import { MODEL_V1, cannedReplies, cannedReply } from "../lib/llmdouble";
import { analyzedByTitle, analyzedTitled } from "../lib/silver";

// 같은 대상을 세 가지 표기로 지칭하는 기사들(`fixtures/feeds/analysis_corpus.rss.xml`).
const VARIANT_TITLES = [
  "삼성전자 미국 공장 증설 — 한미 공급망 재편 가속",
  "Samsung memory prices rebound on AI demand",
  "삼성 반도체 투자, 협력사 실적에도 온기",
];

// 제품 카탈로그에 없는 신규 대상 — 통합 대상이 아니므로 표기 그대로 남아야 한다.
const NOVEL_SUBJECTS = ["한미 공급망 재편", "수출 무역수지"];

const MANY_CATEGORIES_TITLE = "Samsung memory prices rebound on AI demand";
const ON_LIST_IN_REPLY_ORDER = ["반도체", "AI·테크", "주식시장"];
const OFF_LIST_ONLY_TITLE = "글로벌 공급망 운임 지수 급등 — 특정국 이슈 아니다";
const CATCH_ALL = "기타";

test("analysis: the corpus really does use three different surface forms for one subject", () => {
  // 사전 조건 점검. 픽스처가 셋 다 같은 표기로 바뀌면 아래 통합 단정이 공허해진다.
  const surfaces = VARIANT_TITLES.map((title) => cannedReply(MODEL_V1, title).narrative_subjects[0]);
  expect(new Set(surfaces).size).toBe(VARIANT_TITLES.length);
});

test("analysis: surface variants collapse into exactly one shared canonical key", () => {
  const joined = analyzedByTitle();
  const subjectSets = VARIANT_TITLES.map(
    (title) => new Set(analyzedTitled(joined, title).analysis.narrative_subjects),
  );

  const shared = [...subjectSets[0]].filter((key) => subjectSets.every((set) => set.has(key)));
  expect(shared).toHaveLength(1);

  // 정규화되지 않은 변형이 키로 남아 있으면 통합이 아니라 병렬 보존이다.
  const everyKey = new Set(
    [...joined.values()].flatMap(({ analysis }) => analysis.narrative_subjects),
  );
  for (const title of VARIANT_TITLES) {
    const surface = cannedReply(MODEL_V1, title).narrative_subjects[0];
    if (surface === shared[0]) continue; // 하나는 이미 정규 표기다
    expect(everyKey.has(surface), `${surface} 가 정규화되지 않고 남았다`).toBe(false);
  }
});

test("analysis: unifying variants drops no other subject", () => {
  const joined = analyzedByTitle();
  for (const [title, { analysis }] of joined) {
    // 통합은 **표기를 바꾸는** 일이지 **개수를 줄이는** 일이 아니다. 한 기사가 내놓은 대상이
    // 몇 개였든 그 수가 그대로 Silver 에 남아야 누락이 없다.
    expect(analysis.narrative_subjects, title).toHaveLength(
      cannedReply(MODEL_V1, title).narrative_subjects.length,
    );
  }

  // 카탈로그에 없는 신규 대상은 정규화 대상이 아니므로 표기 그대로 살아 있어야 한다.
  const everyKey = new Set(
    [...joined.values()].flatMap(({ analysis }) => analysis.narrative_subjects),
  );
  for (const subject of NOVEL_SUBJECTS) {
    expect(everyKey.has(subject), `신규 대상 ${subject} 가 사라졌다`).toBe(true);
  }
});

test("analysis: the corpus carries all three category reply shapes", () => {
  const many = cannedReply(MODEL_V1, MANY_CATEGORIES_TITLE).subject_categories ?? [];
  expect(ON_LIST_IN_REPLY_ORDER.length).toBeGreaterThanOrEqual(3);
  expect(many.filter((name) => ON_LIST_IN_REPLY_ORDER.includes(name))).toEqual(ON_LIST_IN_REPLY_ORDER);
  expect(many.length).toBeGreaterThan(ON_LIST_IN_REPLY_ORDER.length);
  expect(many.indexOf(ON_LIST_IN_REPLY_ORDER[1])).toBeGreaterThan(1);

  const offList = cannedReply(MODEL_V1, OFF_LIST_ONLY_TITLE).subject_categories ?? [];
  expect(offList.length).toBeGreaterThan(0);
  expect(offList).not.toContain(CATCH_ALL);
  expect(offList.some((name) => ON_LIST_IN_REPLY_ORDER.includes(name))).toBe(false);

  const without = [...cannedReplies(MODEL_V1)].filter(([, reply]) => !("subject_categories" in reply));
  expect(without.length).toBeGreaterThan(0);
});

test("analysis: categories keep only fixed-list values, in reply order, at most two", () => {
  const { analysis } = analyzedTitled(analyzedByTitle(), MANY_CATEGORIES_TITLE);
  expect(analysis.subject_categories).toEqual(ON_LIST_IN_REPLY_ORDER.slice(0, 2));
});

test("analysis: a reply naming only off-list categories is filed under the catch-all", () => {
  const { analysis } = analyzedTitled(analyzedByTitle(), OFF_LIST_ONLY_TITLE);
  expect(analysis.subject_categories).toEqual([CATCH_ALL]);
});

test("analysis: a reply without categories leaves them null", () => {
  const joined = analyzedByTitle();
  for (const [title, reply] of cannedReplies(MODEL_V1)) {
    if ("subject_categories" in reply) continue;
    expect(analyzedTitled(joined, title).analysis.subject_categories, title).toBeNull();
  }
});
