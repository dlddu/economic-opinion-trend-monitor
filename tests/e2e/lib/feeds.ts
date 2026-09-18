// 피드 더블이 서빙하는 픽스처를 spec 쪽에서도 읽는다. 기대값을 상수로 박지 않기 위해서다 —
// "소스 A는 상위 100건", "소스 B는 제공 가능한 60건"의 **제공분**은 픽스처가 정하고 **상한**은
// `e2e-feeds.json` 이 정하므로, 단정은 그 둘에서 유도해야 픽스처를 바꿔도 여전히 옳다.
//
// 파서는 이 픽스처 전용 최소 구현이다(제품 파서는 python 쪽 `econ_ingestion.feeds`). 픽스처를
// 우리가 만들고 모양을 README에 고정해 뒀으므로 일반 RSS/Atom 대응은 필요 없고, 오히려 제품
// 파서를 TypeScript로 베끼면 같은 착각을 양쪽에서 반복하게 된다.

import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURE_DIR = path.resolve(__dirname, "..", "fixtures", "feeds");

export type FeedConfig = {
  source_id: string;
  axis: string;
  feed_url: string;
  limit: number;
};

/** 픽스처 피드가 제공하는 항목 하나(수집 전 원본). */
export type ProvidedEntry = {
  url: string;
  views: number;
  /** 본문 요소가 없으면 null — 수집 시 본문 미확보로 관측돼야 한다. */
  body: string | null;
};

/** 기본 주기가 쓰는 소스 설정. 고장 주입·다주기는 각자의 설정 파일을 쓴다. */
export function feedConfigs(file = "e2e-feeds.json"): FeedConfig[] {
  return JSON.parse(readFileSync(path.join(FIXTURE_DIR, file), "utf-8"));
}

export function feedConfig(sourceId: string): FeedConfig {
  const found = feedConfigs().find((c) => c.source_id === sourceId);
  if (!found) throw new Error(`e2e-feeds.json 에 소스 ${sourceId} 가 없다`);
  return found;
}

/** 설정의 feed_url 마지막 경로 조각이 곧 픽스처 파일명이다(더블이 디렉터리를 그대로 서빙한다). */
function fixtureFileFor(config: FeedConfig): string {
  // 고장 주입 경로(`/__flaky__/2/<파일>` 등)도 마지막 조각이 픽스처 파일명이다 — 더블이
  // 접두사를 벗겨 같은 디렉터리의 그 파일을 돌려주므로, 상류가 끝내 주는 내용은 같다.
  const name = config.feed_url.split("/").pop();
  if (!name) throw new Error(`feed_url 에서 파일명을 못 읽었다: ${config.feed_url}`);
  return path.join(FIXTURE_DIR, name);
}

function textOf(block: string, tag: string): string | null {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? match[1].trim() : null;
}

function urlOf(block: string): string {
  const rss = textOf(block, "link");
  if (rss) return rss;
  const atom = block.match(/<link\s+href="([^"]+)"/);
  if (!atom) throw new Error(`항목에서 링크를 못 읽었다: ${block.slice(0, 120)}`);
  return atom[1];
}

/** 픽스처가 그 소스에 대해 제공하는 항목 전부를, 피드에 적힌 순서 그대로. */
export function providedEntries(sourceId: string): ProvidedEntry[] {
  return entriesOf(feedConfig(sourceId));
}

/** 설정 하나가 가리키는 픽스처의 제공 항목. 소스 목록이 기본 설정 밖에 있을 때 쓴다. */
export function entriesOf(config: FeedConfig): ProvidedEntry[] {
  const raw = readFileSync(fixtureFileFor(config), "utf-8");
  const blocks = raw.match(/<(item|entry)>[\s\S]*?<\/\1>/g) ?? [];
  return blocks.map((block) => ({
    url: urlOf(block),
    views: Number.parseInt(textOf(block, "views") ?? "0", 10),
    body: textOf(block, "description") ?? textOf(block, "content"),
  }));
}

/** 조회수 내림차순 상위 `limit` 건 — 제품이 상위 N을 고르는 기준과 같은 성질만 쓴다. */
export function topByViews(entries: ProvidedEntry[], limit: number): ProvidedEntry[] {
  return [...entries].sort((a, b) => b.views - a.views).slice(0, limit);
}
