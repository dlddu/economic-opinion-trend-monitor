// 검증 시나리오: econ-opinion-monitor-test-interest-trends.md#시나리오 1
//
// 기대 결과의 두 절을 각각 다르게 관측한다:
//   · 키 병합 — 더블이 `삼성전자`·`Samsung`·`삼성` 세 표기로 답하게 해 두고, Silver 에서 세
//     기사가 **같은 키**로 모였는지 본다. 모으는 주체는 더블이 아니라 제품 코드
//     (`normalize_subject`)여야 하므로 기대값을 더블의 응답에서 유도한다.
//   · 교차 집계 일치 — Gold 를 Gold 와 비교하면 집계가 자기 자신을 증명하는 꼴이다. 그래서
//     Bronze(축·수집 시각) + Silver(서술 대상)에서 교차표를 **독립적으로 다시 세어**
//     (`lib/gold.ts: crossTab`) Gold 행과 대조한다.
//
// 집계가 같은 레코드를 시간·일·주 세 벌로 산출하므로(AC5.2), 아래 단정은 전부 `lib/gold.ts` 가
// **기본 단위 한 벌로 정한** 행 위에서 돈다 — 그러지 않으면 교차표의 칸마다 롤업 행이 겹쳐
// 이 시나리오가 재려던 것(원천과의 일치)이 단위 회계 문제에 묻힌다.

import { expect, test } from "@playwright/test";

import {
  aggByTitle,
  aggItems,
  bucketOf,
  cellKey,
  crossTab,
  subjectTrends,
  subjectTrendsAllUnits,
  trendOf,
} from "../lib/gold";
import { MODEL_AGG, cannedReply } from "../lib/llmdouble";
import { analyzedTitled } from "../lib/silver";

/** 한 대상의 세 표기. 셋 다 `삼성전자` 한 키로 모여야 한다. */
const VARIANTS = [
  "삼성전자 신규 팹 착공 — 국내 투자 확대",
  "Samsung 파운드리 수주 확대",
  "삼성 협력사 가동률 상승",
];
const CANONICAL = "삼성전자";

test("aggregation: surface variants of one subject collapse to a single key", () => {
  const joined = aggByTitle();

  // 픽스처가 정말 서로 다른 표기를 답하는지부터 본다 — 셋이 이미 같은 문자열이면 이 spec 은
  // 통과하면서 정규화를 한 번도 시험하지 않는다.
  const surfaces = new Set(
    VARIANTS.flatMap((title) => cannedReply(MODEL_AGG, title).narrative_subjects),
  );
  expect(surfaces.size).toBeGreaterThan(1);

  for (const title of VARIANTS) {
    expect(analyzedTitled(joined, title).analysis.narrative_subjects, title).toContain(CANONICAL);
  }
});

test("aggregation: the merged key appears once per axis, not once per surface form", () => {
  const rows = subjectTrends();
  const joined = aggByTitle();

  // 표기별로 행이 서면 같은 축에 `삼성전자` 행이 여러 개 생긴다 — `trendOf` 가 그것을 끊는다.
  const kr = trendOf(rows, "KR", CANONICAL);
  const krVariants = VARIANTS.filter((title) => analyzedTitled(joined, title).item.axis === "KR");
  expect(krVariants.length).toBeGreaterThan(1);
  // 세 표기가 한 행으로 합산된다. 병합이 빠지면 이 행의 건수가 표기 하나치로 줄어든다.
  expect(kr.raw_count).toBe(krVariants.length);
});

test("aggregation: the cross tab matches an independent recount of the source data", () => {
  const measured = crossTab();
  const fromGold = new Map(
    subjectTrends().map((row) => [cellKey(row.axis, row.time_bucket, row.subject), row.raw_count]),
  );

  // 칸의 집합과 값이 모두 같아야 한다. 한쪽에만 있는 칸은 유령 행이거나 누락 행이다.
  expect(new Set(fromGold.keys())).toEqual(new Set(measured.keys()));
  for (const [key, count] of measured) {
    expect(fromGold.get(key), key).toBe(count);
  }
});

test("aggregation: the axis dimension actually separates the same subject", () => {
  const rows = subjectTrends();
  const axes = new Set(rows.map((row) => row.axis));

  // 축이 하나면 "교차"가 퇴화한다 — corpus 가 두 축을 갖고 있어야 이 시나리오가 성립한다.
  expect(axes.size).toBeGreaterThan(1);

  // 같은 키가 두 축에 있고, 각 축은 자기 축의 건수만 센다(합쳐지지도, 서로 잠식하지도 않는다).
  const perAxis = rows.filter((row) => row.subject === CANONICAL);
  expect(new Set(perAxis.map((row) => row.axis)).size).toBeGreaterThan(1);

  const measured = crossTab();
  for (const row of perAxis) {
    expect(row.raw_count, row.axis).toBe(
      measured.get(cellKey(row.axis, row.time_bucket, row.subject)),
    );
  }
});

test("aggregation: every Gold row carries the time bucket its source records fall in", () => {
  const buckets = new Set(aggItems().map(bucketOf));
  const rows = subjectTrends();

  for (const row of rows) {
    expect(row.bucket_unit, row.subject).toBe("hour");
    expect([...buckets], row.subject).toContain(row.time_bucket);
  }

  // 위 단정이 도는 슬라이스가 **필터의 산물**이라는 사실을 그 자리에서 밝힌다: 원본 Gold 는
  // 세 단위를 다 갖고 있고, 기본 단위가 시간이라 위 행들이 시간 버킷을 든다(AC5.2
  // "기본 단위는 시간"). 롤업 합산이 하위 버킷 합과 일치하는지는 시나리오 3의 몫이라 여기서
  // 재지 않는다 — 여기서 보는 것은 필터가 단위 하나를 고른 것이지 데이터를 지운 게 아니라는 점뿐이다.
  const units = new Set(subjectTrendsAllUnits().map((row) => row.bucket_unit));
  expect([...units].sort()).toEqual(["day", "hour", "week"]);
});
