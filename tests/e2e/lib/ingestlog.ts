// 수집 Job이 stdout에 찍은 집계를 읽는다. run.sh가 Job마다 로그를 파일로 남기고
// ($E2E_INGEST_LOG_DIR/<job>.log) 여기서 필요한 수치만 뽑아 spec에 넘긴다.
//
// 왜 로그인가: 실패 격리·중복 제거·본문 재저장 여부는 **Bronze에 남지 않는 사실**이다.
// 걸러진 중복은 레코드가 없고, 격리된 소스도 레코드가 없다 — "없다"만 봐서는 애초에 그
// 소스가 아무것도 주지 않은 경우와 구별되지 않는다. 수집 CLI는 그 구별을 집계로 찍으므로
// (`econ_ingestion/cli.py`), 시나리오 6·7의 기대 결과는 Bronze와 이 집계를 함께 봐야 한다.

import { readFileSync } from "node:fs";
import path from "node:path";

/** 한 수집 주기가 찍은 집계. 필드 이름은 CLI의 출력 토큰을 그대로 따른다. */
export type IngestSummary = {
  /** Bronze `news_item` 에 쓰인 관측 레코드 수. */
  wrote: number;
  /** 이번 주기에 새로 저장된 본문 수. */
  bodiesNew: number;
  /** 이미 저장돼 있어 재저장하지 않은 본문 수. */
  bodiesDeduplicated: number;
  /** 주기 id (`--cycle`). */
  cycle: string;
  /** 링크가 겹쳐 관측에서 제외된 건수. */
  duplicatesSkipped: number;
  /** 재시도를 다 쓰고도 못 가져와 격리된 소스. 하나도 없으면 빈 배열. */
  failedSources: string[];
};

function logPath(job: string): string {
  const dir = process.env.E2E_INGEST_LOG_DIR;
  if (!dir) {
    throw new Error(
      "E2E_INGEST_LOG_DIR가 비어 있다 — 수집 배치 하네스를 거치지 않고 spec이 실행됐다. " +
        "`make e2e`(tests/e2e/run.sh)로 돌려야 Job 로그가 호스트로 반출된다.",
    );
  }
  return path.join(dir, `${job}.log`);
}

function need(raw: string, pattern: RegExp, what: string, job: string): RegExpMatchArray {
  const found = raw.match(pattern);
  if (!found) {
    throw new Error(
      `${job} 로그에서 ${what} 를 못 읽었다 — 수집 CLI의 출력 형식이 바뀌었을 수 있다.\n${raw}`,
    );
  }
  return found;
}

/** `failed_sources=['a', 'b']` / `failed_sources=[]` 를 문자열 배열로. */
function parseFailedSources(raw: string): string[] {
  const inner = raw.trim().replace(/^\[/, "").replace(/\]$/, "").trim();
  if (inner.length === 0) return [];
  return inner.split(",").map((part) => part.trim().replace(/^['"]|['"]$/g, ""));
}

/** 한 Job의 로그를 집계로 읽는다. 형식이 어긋나면 조용히 0을 주지 않고 예외로 끊는다. */
export function ingestSummary(job: string): IngestSummary {
  const raw = readFileSync(logPath(job), "utf-8");
  const wrote = need(raw, /wrote (\d+) bronze records/, "쓰인 레코드 수", job);
  const bodies = need(raw, /bodies: (\d+) new \/ (\d+) deduplicated/, "본문 집계", job);
  const tail = need(
    raw,
    /cycle=(\S+) duplicates_skipped=(\d+) failed_sources=(\[[^\]]*\])/,
    "주기·중복·실패 집계",
    job,
  );
  return {
    wrote: Number.parseInt(wrote[1], 10),
    bodiesNew: Number.parseInt(bodies[1], 10),
    bodiesDeduplicated: Number.parseInt(bodies[2], 10),
    cycle: tail[1],
    duplicatesSkipped: Number.parseInt(tail[2], 10),
    failedSources: parseFailedSources(tail[3]),
  };
}
