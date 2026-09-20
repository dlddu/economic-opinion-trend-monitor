// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 2
//
// 더블은 **변형을 그대로** 돌려준다(`삼성전자` · `Samsung` · `삼성`). 하나의 키로 모으는 것은
// 더블이 아니라 제품 코드(`econ_analysis.fake_llm.normalize_subject`, 실 분석기도 같은 함수를
// 쓴다)여야 하기 때문이다 — 더블이 미리 통합해 주면 이 시나리오가 검증하려는 통합 경로가 e2e
// 에서 한 번도 실행되지 않는다.
//
// 단정하지 않는 것: 통합된 키의 **철자**. 정규 표기는 제품의 카탈로그가 정하는 값이지 테스트가
// 정할 값이 아니다. 여기서 보는 것은 "셋이 한 키로 모이는가"와 "모으는 과정에서 다른 대상이
// 사라지지 않는가"다.

import { expect, test } from "@playwright/test";

import { MODEL_V1, cannedReply } from "../lib/llmdouble";
import { analyzedByTitle, analyzedTitled } from "../lib/silver";

// 같은 대상을 세 가지 표기로 지칭하는 기사들(`fixtures/feeds/analysis_corpus.rss.xml`).
const VARIANT_TITLES = [
  "삼성전자 미국 공장 증설 — 한미 공급망 재편 가속",
  "Samsung memory prices rebound on AI demand",
  "삼성 반도체 투자, 협력사 실적에도 온기",
];

// 제품 카탈로그에 없는 신규 대상 — 통합 대상이 아니므로 표기 그대로 남아야 한다.
const NOVEL_SUBJECTS = ["한미 공급망 재편", "수출 무역수지"];

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
