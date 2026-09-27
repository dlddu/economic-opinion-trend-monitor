// 검증 시나리오: econ-opinion-monitor-test-aggregation-viz.md#시나리오 10
//
// 기대 결과의 네 절을 각각 한 테스트로 단언한다.
//   (1) 목록 건수 ↔ 원시 카운트 — 응답의 두 수가 같은 것으로는 부족하다. 둘 다 이 엔드포인트가
//       내는 값이라 같은 실수로 함께 틀릴 수 있어서, 원시 카운트는 **Gold 행**과, 목록은
//       Bronze+Silver 에서 **독립적으로 다시 센** 기여 레코드 집합과 대조한다.
//   (2) 수집원별 건수의 합 ↔ 전체 — 합만 보면 좁힌 조회가 실제로 그 소스만 돌려주는지는 비어
//       있다. 그래서 소스마다 좁혀 조회해 **분할**(서로소 · 합집합 = 전체)까지 본다.
//   (3) 행의 표기 — 수집원·수집 시각·본문 중복 여부가 각 행에 적히고, 중복만 보기가 실제로
//       거른다.
//   (4) 원문 도달 — 한 행의 원문 링크가 상류가 준 주소이고, `원문 역추적` 이 그 레코드의
//       보존 원문까지 내려간다.
//
// **본문 중복이 없으면 (3) 의 절반이 공허하다.** 그래서 집계 코퍼스의 `agg_kr_daily` 첫 기사는
// wire 의 `kr-wire/samsung-fab` 본문을 바이트 그대로 싣는다(전재). 같은 대상에 중복 한 쌍과
// 비중복 한 건이 함께 있어 양방향이 모두 관측된다 — 근거는 그 픽스처 머리 주석에 있다.
//
// 기대값을 상수로 박지 않는다: 축 하나(KR)와 화면이 여는 기본 대상만 고정하고, 대상 이름·건수·
// 레코드 id·본문은 전부 응답과 반출 산출물에서 끌어온다.
//
// 재계수가 서빙 버전 선택(`select_serving`)을 흉내 내지 않는 이유: 이 루트는 분석을 한 번만
// 돌려 레코드당 Silver 행이 하나다. 재처리가 들어오는 날 이 단정은 **정당하게** 깨지고, 그때
// 재계수도 버전 선택을 갖춰야 한다(그 층은 `pipeline-ops#시나리오 3` 이 본다).
//
// 단언하지 않는 것:
//   - 집계·정규화 계산 자체(AC3.1/3.2). 여기서 Gold 는 목록이 설명해야 할 기준으로만 쓰고,
//     그 계산이 옳은지는 원천에서 다시 센 교차표와 대조하는 aggregation-1·2·4 가 본다.
//   - 소스별 **기여 분해**(AC3.9, 시나리오 9). Gold 에 수집원 차원이 없어 관측 대상이 없고
//     doc-tracker 의 구현 대기 표에 등재돼 있다. 이 spec 이 세는 수집원별 건수는 Gold 의
//     분해가 아니라 **이 목록 자신의** 내역이다.

import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";

import { aggItems } from "../lib/gold";
import { subjectTrends, trendOf } from "../lib/gold";
import { entriesOf, feedConfigs } from "../lib/feeds";
import { aggAnalyses, byRecordId } from "../lib/silver";

/** 화면이 기본으로 여는 축. `/fairness` 는 KR 로 시작하므로 API 도 같은 축으로 묻는다. */
const AXIS = "KR";

type ContributionRow = {
  record_id: string;
  source_id: string;
  title: string;
  source_url: string;
  collected_at: string;
  body_hash: string;
  body_available: boolean;
  body_duplicate: boolean;
  body_shares: number;
};

type Contributions = {
  basis: {
    axis: string;
    subject: string;
    bucket_unit: string;
    time_bucket: string;
    source: string;
    raw_count: number;
    total: number;
    listed: number;
  };
  sources: { source_id: string; listed: number }[];
  rows: ContributionRow[];
};

async function fetchContributions(
  request: APIRequestContext,
  source?: string,
): Promise<Contributions> {
  const query = source ? `&source=${encodeURIComponent(source)}` : "";
  const res = await request.get(`/api/contributions?axis=${AXIS}${query}`);
  expect(res.status()).toBe(200);
  return (await res.json()) as Contributions;
}

/**
 * 한 (대상 · 축 · 버킷) 값에 기여한 레코드를 **원천에서 다시 센다**.
 *
 * 집계가 쓰는 조인·버킷 규칙 그대로다(`lib/gold.ts: crossTab` 과 같은 규칙, 대상 하나로 좁힌
 * 것): Silver 는 `record_id` 로 Bronze 에 되돌아 붙고, 버킷은 수집 시각의 시간 접두사다.
 */
function contributorsOf(subject: string, bucket: string): Set<string> {
  const byId = byRecordId(aggAnalyses());
  const ids = new Set<string>();
  for (const item of aggItems()) {
    if (item.axis !== AXIS) continue;
    if (item.collected_at.slice(0, 13) !== bucket) continue;
    const analysis = byId.get(item.record_id);
    if (!analysis) {
      throw new Error(`Bronze 레코드 ${item.record_id}(${item.title}) 의 Silver 분석이 없다`);
    }
    if (analysis.narrative_subjects.includes(subject)) ids.add(item.record_id);
  }
  return ids;
}

/** 본문 해시별 관측 수 — 「본문 중복」 표기가 무엇을 세야 하는지의 독립 기준(AC1.7). */
function sharesByHash(): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of aggItems()) {
    if (item.body_hash === "") continue;
    counts.set(item.body_hash, (counts.get(item.body_hash) ?? 0) + 1);
  }
  return counts;
}

/** 집계 코퍼스의 상류가 그 주소에 대해 준 본문. 보존 원문의 기준값이다. */
function providedBody(url: string): string {
  for (const config of feedConfigs("e2e-feeds-agg.json")) {
    for (const entry of entriesOf(config)) {
      if (entry.url === url) {
        if (entry.body === null) throw new Error(`상류가 ${url} 에 본문을 주지 않았다`);
        return entry.body;
      }
    }
  }
  throw new Error(`집계 코퍼스의 상류에 ${url} 이 없다`);
}

test("api: the list of articles reconciles with the Gold number it explains", async ({
  request,
}) => {
  const api = await fetchContributions(request);

  // 사전 조건부터 본다 — 한 건짜리 목록이면 아래 등식들이 통과해도 아무것도 재지 못한다.
  expect(api.basis.total, "기여 기사가 둘 미만이라 목록이 설명할 것이 없다").toBeGreaterThan(1);
  expect(api.sources.length, "수집원이 하나뿐이라 분해가 성립하지 않는다").toBeGreaterThan(1);

  // 원시 카운트는 이 엔드포인트가 센 수가 아니라 **읽어 온 Gold 값**이어야 한다.
  const gold = trendOf(subjectTrends(), AXIS, api.basis.subject);
  expect(api.basis.bucket_unit, "화면이 보는 단위가 Gold 의 기본 단위와 다르다").toBe(
    gold.bucket_unit,
  );
  expect(api.basis.time_bucket).toBe(gold.time_bucket);
  expect(api.basis.raw_count, "응답의 원시 카운트가 Gold 행과 다르다").toBe(gold.raw_count);

  // 목록은 원천에서 다시 센 기여 레코드와 **집합으로** 같다. 건수만 맞고 다른 기사가 섞이면
  // 여기서 깨진다.
  expect(api.basis.total).toBe(api.basis.raw_count);
  expect(api.rows.length).toBe(api.basis.total);
  expect(new Set(api.rows.map((row) => row.record_id))).toEqual(
    contributorsOf(api.basis.subject, api.basis.time_bucket),
  );
});

test("api: narrowing by collector partitions the whole list", async ({ request }) => {
  const whole = await fetchContributions(request);
  const tally = new Map(whole.sources.map((s) => [s.source_id, s.listed]));

  expect(
    [...tally.values()].reduce((sum, n) => sum + n, 0),
    "수집원별 건수의 합이 전체와 다르다",
  ).toBe(whole.basis.total);
  expect(new Set(tally.keys())).toEqual(new Set(whole.rows.map((row) => row.source_id)));

  const seen = new Set<string>();
  for (const [sourceId, listed] of tally) {
    const narrowed = await fetchContributions(request, sourceId);
    // 좁혀도 기준(대상·버킷·원시 카운트)은 그대로여야 한다 — 좁히기가 값을 바꾸면 그 목록은
    // 더 이상 같은 데이터 포인트를 설명하지 않는다.
    expect(narrowed.basis.subject).toBe(whole.basis.subject);
    expect(narrowed.basis.time_bucket).toBe(whole.basis.time_bucket);
    expect(narrowed.basis.raw_count).toBe(whole.basis.raw_count);
    expect(narrowed.basis.total, "좁힌 조회가 전체 건수를 함께 깎았다").toBe(whole.basis.total);

    expect(narrowed.basis.listed, `${sourceId} 의 내역 건수가 목록과 다르다`).toBe(listed);
    expect(narrowed.rows.length).toBe(listed);
    for (const row of narrowed.rows) {
      expect(row.source_id).toBe(sourceId);
      expect(seen.has(row.record_id), `${row.record_id} 가 두 수집원에 걸쳐 있다`).toBe(false);
      seen.add(row.record_id);
    }
  }
  expect(seen).toEqual(new Set(whole.rows.map((row) => row.record_id)));
});

test("web: each row states its collector, collection time and body-duplicate flag", async ({
  page,
  request,
}) => {
  const api = await fetchContributions(request);
  const shares = sharesByHash();

  // 중복과 비중복이 **둘 다** 있어야 표기 단정이 양방향으로 선다.
  const duplicates = api.rows.filter((row) => row.body_duplicate);
  expect(duplicates.length, "본문 중복으로 잡힌 기사가 없어 중복 표기를 검증할 수 없다")
    .toBeGreaterThan(0);
  expect(duplicates.length, "전부 중복이라 「중복만 보기」가 거르는 것을 검증할 수 없다")
    .toBeLessThan(api.rows.length);
  // 응답의 중복 판정이 원천의 해시 공유와 같은 수를 말하는지 따로 본다.
  for (const row of api.rows) {
    expect(row.body_shares, `${row.record_id} 의 본문 공유 수가 Bronze 와 다르다`).toBe(
      shares.get(row.body_hash) ?? 0,
    );
    expect(row.body_duplicate).toBe(row.body_shares > 1);
  }

  await page.goto("/fairness");
  await expect(page.getByText("The web build was not found")).toHaveCount(0);

  await expect(page.locator(".art-card .art-count")).toHaveText(
    `목록 ${api.basis.total}건 · 원시 카운트 ${api.basis.raw_count}건`,
  );

  const rows = page.locator(".art-row");
  await expect(rows, "그려진 행 수가 응답과 다르다").toHaveCount(api.rows.length);
  for (const [i, row] of api.rows.entries()) {
    const rendered = rows.nth(i);
    await expect(rendered.locator(".art-title")).toHaveText(row.title);
    await expect(rendered.locator(".art-meta")).toContainText(`수집원 ${row.source_id}`);
    await expect(rendered.locator(".art-meta")).toContainText(`수집 ${row.collected_at}`);
    const badge = rendered.locator(".art-dup-badge");
    if (row.body_duplicate) {
      await expect(badge, `${row.title} 의 본문 중복 표기가 없다`).toHaveText(
        `본문 중복 ${row.body_shares}건`,
      );
    } else {
      await expect(badge, `${row.title} 에 중복이 아닌데 중복 표기가 붙었다`).toHaveCount(0);
    }
  }

  // 중복만 보기는 화면 안에서 거른다(같은 목록의 부분집합이어야 한다).
  await page.locator("input[name='art-dup-only']").check();
  await expect(rows).toHaveCount(duplicates.length);
  await expect(page.locator(".art-dup-badge")).toHaveCount(duplicates.length);
  await page.locator("input[name='art-dup-only']").uncheck();

  // 수집원 좁히기는 API 를 거쳐 되돌아온다.
  const [smallest] = [...api.sources].sort((a, b) => a.listed - b.listed);
  await page.locator("select[name='art-source']").selectOption(smallest.source_id);
  await expect(rows).toHaveCount(smallest.listed);
  await expect(page.locator(".art-meta").first()).toContainText(`수집원 ${smallest.source_id}`);
});

test("web: a row walks down to the article it was collected from", async ({ page, request }) => {
  const api = await fetchContributions(request);
  const target = api.rows.find((row) => row.body_duplicate) ?? api.rows[0];
  expect(target.body_available, "고른 행이 본문 미확보라 보존 원문을 볼 수 없다").toBe(true);
  const index = api.rows.indexOf(target);

  await page.goto("/fairness");
  const row = page.locator(".art-row").nth(index);
  await expect(row.locator(".art-title")).toHaveText(target.title);

  // 원문 링크는 상류가 준 주소 그대로다 — 화면이 자기 경로로 감싸면 "원문"이 아니다.
  await expect(row.locator(".art-links a.btn").first()).toHaveAttribute("href", target.source_url);

  await row.getByRole("link", { name: "원문 역추적 →" }).click();
  await expect(page).toHaveURL(new RegExp(`/trace\\?record_id=${target.record_id}$`));

  // 세 계층을 다 거쳐 내려왔다는 것이 화면에 드러난다.
  const steps = page.locator(".trace-crumb-step");
  await expect(steps).toHaveCount(3);
  await expect(page.locator(".trace-crumb-gap"), "역추적 도중 끊긴 계층이 있다").toHaveCount(0);

  // `.trace-url` 은 원문 주소와 본문 해시 두 자리에 쓰인다 — 라벨로 그 줄을 집는다.
  const urlRow = page.locator(".kv").filter({ hasText: "원문 주소" });
  await expect(urlRow.locator(".trace-url")).toHaveText(target.source_url);
  // 보존 원문은 **상류가 준 본문**과 같아야 한다. 화면이 제목이나 요약을 대신 보여 주면 깨진다.
  await expect(page.locator(".trace-body")).toHaveText(providedBody(target.source_url));
});
