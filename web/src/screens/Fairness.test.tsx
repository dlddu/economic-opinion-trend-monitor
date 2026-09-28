import { afterEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { Fairness } from "./Fairness";
import type {
  ContributionsResponse,
  FairnessResponse,
  SourceContributionsResponse,
} from "../api/types";

afterEach(() => vi.unstubAllGlobals());

// The stub is the source of every expected value below — nothing is written as
// a literal twice. It carries the case the screen exists for: "와이어 도배" owns
// 60 of the 100 raw items but only a quarter of the normalized share, so the two
// counting modes rank the axis differently.
const SKEWED = { subject: "와이어 도배 대상", raw_count: 60, raw_share: 0.6, normalized_share: 0.25 };
const EVEN = { subject: "고른 관심 대상", raw_count: 40, raw_share: 0.4, normalized_share: 0.75 };

function response(): FairnessResponse {
  return {
    axis: "KR",
    basis: {
      bucket_unit: "hour",
      time_bucket: "2026-06-23T14",
      raw_total: SKEWED.raw_count + EVEN.raw_count,
      normalized: true,
      method: "소스 내 점유율",
    },
    rows: [
      { rank: 1, ...EVEN, delta: -0.5, spark: [0.8, 0.75] },
      { rank: 2, ...SKEWED, delta: 1.5, spark: [0.2, 0.25] },
    ],
  };
}

// 기여 기사 목록은 별도 라우트라 스텁도 url 로 갈라야 한다 — 한 응답을 두 경로에
// 같이 내려주면 어느 화면 조각이 무엇을 읽는지 이 파일이 말하지 못한다.
const ARTICLES: ContributionsResponse["rows"] = [
  {
    record_id: "r-wire-1",
    source_id: "kr_wire",
    title: "와이어 도배 기사 A",
    source_url: "https://wire.example/a",
    collected_at: "2026-06-23T14:05:00Z",
    body_hash: "shared",
    body_available: true,
    body_duplicate: true,
    body_shares: 2,
  },
  {
    record_id: "r-wire-2",
    source_id: "kr_wire",
    title: "와이어 도배 기사 B(같은 본문)",
    source_url: "https://wire.example/b",
    collected_at: "2026-06-23T14:10:00Z",
    body_hash: "shared",
    body_available: true,
    body_duplicate: true,
    body_shares: 2,
  },
  {
    record_id: "r-daily-1",
    source_id: "kr_daily",
    title: "일간지 기사",
    source_url: "https://daily.example/c",
    collected_at: "2026-06-23T14:40:00Z",
    body_hash: "own",
    body_available: false,
    body_duplicate: false,
    body_shares: 1,
  },
];

function contributions(source = ""): ContributionsResponse {
  const rows = source ? ARTICLES.filter((r) => r.source_id === source) : ARTICLES;
  return {
    basis: {
      axis: "KR",
      subject: SKEWED.subject,
      bucket_unit: "hour",
      time_bucket: "2026-06-23T14",
      source,
      raw_count: ARTICLES.length,
      total: ARTICLES.length,
      listed: rows.length,
      analyzer_version: "",
    },
    sources: [
      { source_id: "kr_wire", listed: 2 },
      { source_id: "kr_daily", listed: 1 },
    ],
    rows,
  };
}

const SPLIT_WIRE = { source_id: "kr_wire", raw_count: 45, raw_share: 0.75, normalized_contribution: 0.1 };
const SPLIT_DAILY = {
  source_id: "kr_daily",
  raw_count: SKEWED.raw_count - 45,
  raw_share: 0.25,
  normalized_contribution: SKEWED.normalized_share - 0.1,
};

function sourceContributions(rows = [SPLIT_WIRE, SPLIT_DAILY]): SourceContributionsResponse {
  return {
    basis: {
      axis: "KR",
      subject: SKEWED.subject,
      bucket_unit: "hour",
      time_bucket: "2026-06-23T14",
      raw_count: SKEWED.raw_count,
      normalized_share: SKEWED.normalized_share,
      raw_total: rows.reduce((n, r) => n + r.raw_count, 0),
      normalized_total: Number(
        rows.reduce((n, r) => n + r.normalized_contribution, 0).toFixed(4),
      ),
      method: "소스 내 점유율",
    },
    concentration: {
      top_source_id: rows[0]?.source_id ?? "",
      top_share: rows[0]?.raw_share ?? 0,
      source_count: rows.length,
    },
    rows,
  };
}

function stubFairness(
  body: FairnessResponse = response(),
  articles: (url: string) => ContributionsResponse = (url) =>
    contributions(new URL(url, "http://x").searchParams.get("source") ?? ""),
  split: SourceContributionsResponse = sourceContributions(),
) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => {
        // `/source-contributions` 가 `/contributions` 를 부분 문자열로 포함하므로
        // 이 분기 순서가 곧 라우팅이다 — 뒤집으면 소스 카드가 기사 응답을 읽는다.
        if (url.includes("/source-contributions")) return split;
        if (url.includes("/contributions")) return articles(url);
        return body;
      },
    })),
  );
}

function renderFairness() {
  return render(
    <MemoryRouter>
      <Fairness />
    </MemoryRouter>,
  );
}

async function testid(container: HTMLElement, id: string): Promise<HTMLElement> {
  let found: HTMLElement | null = null;
  await waitFor(() => {
    found = container.querySelector(`[data-testid="${id}"]`);
    expect(found, `no [data-testid="${id}"] in this render`).toBeTruthy();
  });
  return found as unknown as HTMLElement;
}

function rowFor(container: HTMLElement, subject: string): HTMLElement {
  const row = [...container.querySelectorAll("tbody tr")].find((tr) =>
    tr.textContent?.includes(subject),
  );
  if (!row) throw new Error(`no row for ${subject}`);
  return row as HTMLElement;
}

/** The two share cells of one row, in column order: raw, then normalized. */
function shareCells(row: HTMLElement): HTMLElement[] {
  return [...row.querySelectorAll(".share")] as HTMLElement[];
}

// AC6.2: the two values are present *at once* and told apart, rather than one
// standing in for the other.
it("shows the raw count and the normalized share as distinct values in one row", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(2));

  const row = rowFor(container, SKEWED.subject);
  expect(row.textContent).toContain(`원시 ${SKEWED.raw_count}건`);

  const [raw, normalized] = shareCells(row);
  expect(raw.querySelector(".pct")?.textContent).toBe(`${(SKEWED.raw_share * 100).toFixed(1)}%`);
  expect(normalized.querySelector(".pct")?.textContent).toBe(
    `${(SKEWED.normalized_share * 100).toFixed(1)}%`,
  );
  // Same subject, two different numbers — that difference is the whole point.
  expect(raw.querySelector(".pct")?.textContent).not.toBe(
    normalized.querySelector(".pct")?.textContent,
  );
});

// The toggle is only honest if pressing it changes what the screen says. It
// re-ranks on the selected mode and moves the emphasis to that column.
it("re-ranks and moves the emphasis when the counting mode is switched", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll("tbody tr").length).toBe(2));

  const firstSubject = () => container.querySelector("tbody tr td")?.textContent;
  const emphasized = () =>
    [...container.querySelectorAll("tbody tr")]
      .map((tr) => [...tr.querySelectorAll(".share")].findIndex((s) => s.classList.contains("fair-on")))
      .join(",");

  // Normalized mode: the evenly-sourced subject leads, and the normalized
  // column (index 1) is the emphasized one.
  expect(firstSubject()).toBe(EVEN.subject);
  expect(emphasized()).toBe("1,1");
  expect(container.querySelector(".norm-flag")?.textContent).toContain("정규화");

  const toggle = container.querySelector(".norm-toggle") as HTMLElement;
  expect(toggle.textContent).toContain("수집량 정규화");
  fireEvent.click(toggle);

  // Raw mode: the ranking flips to the volume leader and the raw column
  // (index 0) takes the emphasis.
  await waitFor(() => expect(firstSubject()).toBe(SKEWED.subject));
  expect(emphasized()).toBe("0,0");
  expect(container.querySelector(".raw-flag")?.textContent).toContain("원시");
});

it("decomposes the chosen value by collection source", async () => {
  stubFairness();
  const { container } = renderFairness();

  // 이 파일에는 자동 cleanup 이 없어 document 전역 조회는 앞 테스트가 그린 화면까지
  // 집는다 — 조회는 이 render 의 container 안으로만 한다.
  const wire = await testid(container, `src-row-${SPLIT_WIRE.source_id}`);
  expect(wire.textContent).toContain(`${SPLIT_WIRE.raw_count}건`);
  expect(wire.querySelector(".src-raw")?.textContent).toBe(
    `${(SPLIT_WIRE.raw_share * 100).toFixed(1)}%`,
  );
  expect(wire.querySelector(".src-norm")?.textContent).toBe(
    `${(SPLIT_WIRE.normalized_contribution * 100).toFixed(1)}%`,
  );
  expect(wire.querySelector(".src-raw")?.textContent).not.toBe(
    wire.querySelector(".src-norm")?.textContent,
  );

  expect(await testid(container, `src-row-${SPLIT_DAILY.source_id}`)).toBeTruthy();
  expect(container.querySelectorAll(".src-list .src-row:not(.src-hd)").length).toBe(2);
  expect(container.querySelector(".src-conc")?.textContent).toContain(SPLIT_WIRE.source_id);
});

it("writes the two sum identities next to the value they have to match", async () => {
  stubFairness();
  const { container } = renderFairness();

  const identity = await testid(container, "src-identity");
  expect(identity.textContent).toContain("부분이 전체와 맞습니다");
  expect(container.querySelector(".src-sums")?.textContent).toBe(
    `합 ${SKEWED.raw_count}건 · 원시 카운트 ${SKEWED.raw_count}건`,
  );
});

// 수를 맞추려고 분해를 깎지 않는다: 부분과 전체가 갈린 레이크는 갈렸다고 적힌다.
// 이 단정이 없으면 위 등식 단정은 화면이 값을 베껴 쓰기만 해도 통과한다.
it("says so when the decomposition does not add up to the value", async () => {
  const short = sourceContributions([SPLIT_WIRE]);
  stubFairness(response(), undefined, short);
  const { container } = renderFairness();

  const identity = await testid(container, "src-identity");
  expect(identity.textContent).toContain("부분이 전체와 갈립니다");
  expect(identity.textContent).toContain(`${SPLIT_WIRE.raw_count}건`);
  expect(identity.textContent).toContain(`${SKEWED.raw_count}건`);
  expect(container.querySelector(".src-sums")?.textContent).toBe(
    `합 ${SPLIT_WIRE.raw_count}건 · 원시 카운트 ${SKEWED.raw_count}건`,
  );
});

// 분해가 없는 버킷은 0% 로 그리지 않는다 — 기여가 없는 것과 아직 없는 것은 다르다.
it("heads the concentration block as the mockup card does and carries its one-source caution", async () => {
  stubFairness();
  const { container } = renderFairness();

  const conc = await testid(container, "src-lede");
  expect(container.querySelector(".src-conc .src-conc-h")?.textContent).toBe(
    "한 곳에서 다 나왔나",
  );
  expect(conc.textContent?.trim()).toBe(
    "한 수집원이 절반을 넘기면 여론이 아니라 그 매체의 편집 결정을 보고 있는 것일 수 있습니다.",
  );
  expect(container.querySelector(".src-conc")?.contains(conc)).toBe(true);
});

it("draws nothing rather than zeroes when the value has no decomposition", async () => {
  stubFairness(response(), undefined, sourceContributions([]));
  const { container } = renderFairness();

  const empty = await testid(container, "src-empty");
  expect(empty.textContent).toContain("0으로 그리지 않습니다");
});

it("states the notation principle, and states it before any data arrives", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  );
  const { container } = renderFairness();

  expect(container.querySelectorAll("tbody tr").length).toBe(0);

  const note = [...container.querySelectorAll(".note")].find((n) =>
    n.textContent?.includes("세는 방식을 항상 적어"),
  );
  expect(note, "표기 원칙 note 가 화면에 없다").toBeTruthy();
  expect(note?.textContent).toContain("모든 수치 옆에 세는 방식을 항상 적어 둡니다.");
  expect(note?.textContent).toContain(
    "표기가 없으면 원시 건수와 점유율을 섞어 읽게 되고, 그 순간 비교는 무의미해집니다.",
  );
});

it("lists the contributing articles and prints the count beside the raw count", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const tag = container.querySelector(".art-count");
  expect(tag?.textContent).toContain(`목록 ${ARTICLES.length}건`);
  expect(tag?.textContent).toContain(`원시 카운트 ${ARTICLES.length}건`);
  expect(container.querySelector(".art-mismatch")).toBeNull();

  const first = container.querySelector(".art-row") as HTMLElement;
  expect(first.textContent).toContain(`수집원 ${ARTICLES[0].source_id}`);
  expect(first.textContent).toContain(ARTICLES[0].collected_at);
  expect(first.querySelector(".art-dup-badge")?.textContent).toContain(
    `본문 중복 ${ARTICLES[0].body_shares}건`,
  );
  expect(first.querySelector(`a[href="${ARTICLES[0].source_url}"]`)).toBeTruthy();
  expect(first.querySelector(`a[href="/trace?record_id=${ARTICLES[0].record_id}"]`)).toBeTruthy();
});

// 목록 건수가 원시 카운트와 갈리면 화면이 그것을 숨기지 않는다 — 이 note 가 없으면
// 「목록이 그 값을 설명한다」는 주장이 검증 없이 통과한다.
it("says so when the list does not reconcile with the raw count", async () => {
  stubFairness(response(), () => {
    const body = contributions();
    body.basis.raw_count = ARTICLES.length + 1;
    return body;
  });
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelector(".art-mismatch")).toBeTruthy());
  expect(container.querySelector(".art-mismatch")?.textContent).toContain("원시 카운트와 다릅니다");
});

it("narrows the list by collector with a fresh request", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const select = container.querySelector(".art-src select") as HTMLSelectElement;
  const options = [...select.querySelectorAll("option")].map((o) => o.textContent);
  expect(options[0]).toContain("전체");
  expect(options.join(" ")).toContain("kr_wire (2건)");

  fireEvent.change(select, { target: { value: "kr_wire" } });

  const wire = ARTICLES.filter((r) => r.source_id === "kr_wire");
  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(wire.length));
  for (const row of [...container.querySelectorAll(".art-row")]) {
    expect(row.textContent).toContain("수집원 kr_wire");
  }
  // 좁혀도 전체 건수는 그대로 적힌다 — 좁힌 수가 그 값의 전부인 것처럼 읽히면 안 된다.
  expect(container.querySelector(".art-count")?.textContent).toContain(`목록 ${ARTICLES.length}건`);
});

it("keeps only the duplicated-body rows when that filter is on", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));

  const dup = container.querySelector(".art-dup input") as HTMLInputElement;
  fireEvent.click(dup);

  const duplicated = ARTICLES.filter((r) => r.body_duplicate);
  await waitFor(() =>
    expect(container.querySelectorAll(".art-row").length).toBe(duplicated.length),
  );
  expect(duplicated.length).toBeLessThan(ARTICLES.length);
});

it("opens the list on the leading subject and follows the picked one", async () => {
  stubFairness();
  const { container } = renderFairness();

  await waitFor(() => expect(container.querySelectorAll(".art-row").length).toBe(ARTICLES.length));
  expect(container.querySelector(".art-card .sub")?.textContent).toContain(EVEN.subject);

  const pick = [...container.querySelectorAll(".art-pick")].find(
    (b) => b.textContent === SKEWED.subject,
  ) as HTMLElement;
  fireEvent.click(pick);

  await waitFor(() =>
    expect(container.querySelector(".art-card .sub")?.textContent).toContain(SKEWED.subject),
  );
  expect(pick.getAttribute("aria-pressed")).toBe("true");
});
