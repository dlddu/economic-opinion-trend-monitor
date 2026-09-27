// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 1
//
// 기대값을 여기 적지 않고 더블의 응답 픽스처에서 읽는다 — 이 층이 보는 것은 "모델이 옳게
// 판단했는가"(의미적 품질, 오프라인 골든 평가의 몫)가 아니라 "모델이 답한 대상 국가가 손실·
// 왜곡 없이 Silver 까지 닿는가"라는 계약이다. 픽스처가 바뀌어도 이 단정은 그대로 옳다.

import { expect, test } from "@playwright/test";

import { analysisBronzeDir, newsItems } from "../lib/bronze";
import { MODEL_V1, cannedReply } from "../lib/llmdouble";
import { analyzedByTitle } from "../lib/silver";

test("analysis: every article's target countries reach Silver exactly as the model gave them", () => {
  const joined = analyzedByTitle();
  expect(joined.size).toBeGreaterThan(0);

  for (const [title, { analysis }] of joined) {
    // 순서까지 보는 이유: 다중 값이 집합으로 뭉개지지 않는지도 이 자리에서 드러난다.
    expect(analysis.target_countries, title).toEqual(cannedReply(MODEL_V1, title).target_countries);
  }
});

test("analysis: single / multi / GLOBAL articles are each represented", () => {
  const joined = analyzedByTitle();
  const shapes = { single: 0, multi: 0, global: 0 };
  for (const [title, { analysis }] of joined) {
    const countries = analysis.target_countries;
    if (countries.includes("GLOBAL")) {
      shapes.global += 1;
      // 글로벌 이슈는 특정 국가와 섞이지 않는다 — 섞이면 "해당 없음"이 아니라 부분 귀속이 된다.
      expect(countries, title).toEqual(["GLOBAL"]);
    } else if (countries.length > 1) {
      shapes.multi += 1;
    } else {
      expect(countries, title).toHaveLength(1);
      shapes.single += 1;
    }
  }
  // 셋이 다 있어야 시나리오의 사전 조건이 선 것이다 — 아니면 위 단정이 공허해진다.
  expect(shapes.single).toBeGreaterThan(0);
  expect(shapes.multi).toBeGreaterThan(0);
  expect(shapes.global).toBeGreaterThan(0);
});

test("analysis: target countries are content-derived, not copied from the source axis", () => {
  const items = newsItems(analysisBronzeDir());
  // 묶음 전체가 한 축의 한 소스다. 이 전제가 깨지면 아래 비교가 "축이 여럿이라 갈렸다"로
  // 읽혀 버리므로 먼저 못 박는다.
  expect(new Set(items.map((item) => item.axis))).toEqual(new Set(["KR"]));
  expect(new Set(items.map((item) => item.source_id)).size).toBe(1);

  const countries = new Set(
    [...analyzedByTitle().values()].flatMap(({ analysis }) => analysis.target_countries),
  );
  // 같은 축에서 들어온 기사들이 서로 다른 대상 국가를 갖는다 = 축을 베낀 것이 아니다.
  expect(countries.size).toBeGreaterThan(1);
  expect(countries.has("GLOBAL")).toBe(true);
});
