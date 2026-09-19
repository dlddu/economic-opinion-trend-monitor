// 검증 시나리오: econ-opinion-monitor-test-analysis.md#시나리오 4
//
// 사전 조건은 "다국가·복수 서술 대상을 가진 기사"이고, 실행 단계는 "분석 결과를 Silver 에
// 적재하고 **Gold 집계에서 조회**한다", 기대 결과는 "다중 값이 손실 없이 정규화 스키마로
// 저장되고, **후속 집계에서 그대로 조회된다**" 이다.
//
// 그래서 이 시나리오는 분석 묶음이 아니라 집계 묶음에 있다 — Silver 까지만 보면 기대 결과의
// 뒤 절("후속 집계에서")이 관측되지 않는다. 다중 값은 두 번 줄어들 수 있고 그 자리가 다르다:
// 한 번은 모델 응답 → Silver 적재에서(리스트가 잘리거나 첫 값만 남는 경우), 한 번은
// Silver → Gold 집계에서(한 기사를 한 대상으로만 세는 경우). 두 자리를 모두 본다.
//
// **무엇을 단정하지 않는가**: 모델이 대상국·서술 대상을 옳게 뽑았는가는 여기서 보지 않는다.
// 기대값은 더블의 응답 픽스처에서 유도하므로, 이 spec 이 지키는 것은 "모델이 답한 다중 값이
// 파이프라인 세 단을 지나며 줄어들지 않는가"라는 전파 계약이다.

import { expect, test } from "@playwright/test";

import {
  aggByTitle,
  bucketOf,
  cellKey,
  crossTab,
  subjectTrends,
  trendOf,
} from "../lib/gold";
import { MODEL_AGG, cannedReply } from "../lib/llmdouble";
import { analyzedTitled } from "../lib/silver";

// 시나리오가 요구하는 "다국가·복수 서술 대상" 기사 — 대상국 2개(대한민국·미국)와 서술 대상
// 2개(삼성전자·한미 공급망 재편)를 동시에 가진 유일한 기사다
// (`fixtures/feeds/agg_us_desk.rss.xml`).
const MULTI_VALUE = "삼성전자 미국 팹 가동 — 한미 공급망 재편";

test("analysis: multi-valued countries and subjects reach Silver without loss", () => {
  const { analysis } = analyzedTitled(aggByTitle(), MULTI_VALUE);
  const canned = cannedReply(MODEL_AGG, MULTI_VALUE);

  // 픽스처가 다중 값 사례이기를 먼저 확인한다 — 픽스처가 단일 값으로 낡으면 아래 단정은
  // 통과하면서 아무것도 검증하지 않는다.
  expect(canned.target_countries.length).toBeGreaterThan(1);
  expect(canned.narrative_subjects.length).toBeGreaterThan(1);

  // 순서까지 그대로다. 정규화 스키마가 집합이 아니라 리스트이므로 순서 변경도 손실로 본다.
  expect(analysis.target_countries).toEqual(canned.target_countries);
  // 서술 대상은 표기 정규화를 거치므로 개수만 보존을 본다(키 병합 자체는 시나리오 2 소관).
  expect(analysis.narrative_subjects).toHaveLength(canned.narrative_subjects.length);
  expect(new Set(analysis.narrative_subjects).size).toBe(analysis.narrative_subjects.length);
});

test("analysis: every subject of the multi-valued article is queryable in Gold", () => {
  const joined = aggByTitle();
  const { item, analysis } = analyzedTitled(joined, MULTI_VALUE);
  const rows = subjectTrends();

  for (const subject of analysis.narrative_subjects) {
    // 대상마다 그 축에 행이 정확히 하나 선다(`trendOf` 가 0개·2개를 끊는다).
    const row = trendOf(rows, item.axis, subject);
    expect(row.raw_count, subject).toBeGreaterThan(0);
    expect(row.time_bucket, subject).toBe(bucketOf(item));
  }
});

test("analysis: the multi-valued article contributes once to each of its subjects", () => {
  const joined = aggByTitle();
  const { item, analysis } = analyzedTitled(joined, MULTI_VALUE);
  const counts = crossTab();

  // 원천에서 다시 센 교차표에서, 이 기사의 두 대상은 서로 다른 칸에 각각 1건씩 들어간다.
  // 한 기사를 한 대상으로만 세면(다중 값 소실) 둘 중 하나의 칸이 비거나 건수가 모자란다.
  for (const subject of analysis.narrative_subjects) {
    const cell = counts.get(cellKey(item.axis, bucketOf(item), subject));
    expect(cell, subject).toBeGreaterThan(0);
  }

  // 그리고 Gold 가 그 교차표를 그대로 싣는다 — 기대 결과의 "후속 집계에서 그대로 조회된다".
  for (const subject of analysis.narrative_subjects) {
    const row = trendOf(subjectTrends(), item.axis, subject);
    expect(row.raw_count, subject).toBe(counts.get(cellKey(item.axis, bucketOf(item), subject)));
  }
});
