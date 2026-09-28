import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { DebugCall, DebugRecordsResponse, DebugResponse, DebugVersion } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

const STATUS_LABEL: Record<string, string> = {
  analyzed: "분석됨",
  low_confidence: "저신뢰 — 분류에서 제외",
  unanalyzed: "미분석",
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "긍정",
  neutral: "중립",
  negative: "부정",
  mixed: "혼재",
};

const NO_CALL_LABEL: Record<string, string> = {
  body_unavailable: "본문을 확보하지 못해 부르지 않음",
  keyword_analyzer: "키워드 분석기가 처리해 모델을 부르지 않음",
};

const OUTCOME_LABEL: Record<string, string> = {
  parsed: "파싱 성공",
  parse_failed: "응답을 읽지 못함",
  call_failed: "호출 실패",
  reused: "이전 응답 재사용",
};

const CAUSES = [
  { id: "input", label: "입력(수집)", to: "/reprocess", toLabel: "재처리 콘솔로 넘기기 →" },
  { id: "logic", label: "로직·프롬프트", to: "/reprocess", toLabel: "소급 적용으로 넘기기 →" },
  { id: "model", label: "모델 응답", to: "", toLabel: "" },
  { id: "parse", label: "파싱", to: "", toLabel: "" },
  { id: "oneoff", label: "일회성", to: "", toLabel: "" },
];

function sentimentBadge(s: string | null): string {
  if (s === "positive") return "b-pos";
  if (s === "negative") return "b-neg";
  return "b-neu";
}

/**
 * 모델은 초안을 낸 뒤 판단을 고쳐 다시 답하기도 한다 — 그때 첫 JSON 을 읽으면 저장값이
 * 초안에서 나오고, 파서 결함이 모델 결함처럼 보인다.
 */
function lastJSONObject(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  let found: Record<string, unknown> | null = null;
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] !== "{") continue;
    let depth = 0;
    for (let j = i; j < raw.length; j++) {
      if (raw[j] === "{") depth++;
      else if (raw[j] === "}") {
        depth--;
        if (depth === 0) {
          try {
            const parsed: unknown = JSON.parse(raw.slice(i, j + 1));
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
              found = parsed as Record<string, unknown>;
            }
          } catch {
            // 코드 블록 안의 JSON 이 아닌 중괄호는 그냥 지나간다.
          }
          break;
        }
      }
    }
  }
  return found;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map((v) => String(v)).join(", ");
  return String(value);
}

interface CompareRow {
  field: string;
  replied: string;
  stored: string;
  agrees: boolean;
}

function compareRows(version: DebugVersion, call: DebugCall | null): CompareRow[] {
  const replied = lastJSONObject(call?.response_raw ?? null);
  if (!replied) return [];
  const pairs: [string, unknown, string][] = [
    ["분위기", replied.sentiment, version.sentiment ?? ""],
    ["신뢰도", replied.confidence, String(version.confidence)],
    ["대상국", replied.target_countries, version.target_countries.join(", ")],
    ["서술 대상", replied.narrative_subjects, version.narrative_subjects.join(", ")],
  ];
  return pairs
    .filter(([, value]) => value !== undefined)
    .map(([field, value, stored]) => {
      const repliedText = asText(value);
      return { field, replied: repliedText, stored, agrees: repliedText === stored };
    });
}

export function Debug() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("record_id")?.trim() ?? "";
  const listQuery = searchParams.get("q")?.trim() ?? "";
  const symptom = searchParams.get("symptom")?.trim() ?? "";
  const runFilter = searchParams.get("run_id")?.trim() ?? "";
  const [search, setSearch] = useState(listQuery);
  const [list, setList] = useState<DebugRecordsResponse | null>(null);
  const [listError, setListError] = useState<string | null>(null);
  const [data, setData] = useState<DebugResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [promptPart, setPromptPart] = useState<"user" | "system">("user");
  const [diffOnly, setDiffOnly] = useState(false);
  const [cause, setCause] = useState("");
  const [memo, setMemo] = useState("");
  const [recorded, setRecorded] = useState<string | null>(null);
  const [bodyVer, setBodyVer] = useState("");

  useEffect(() => {
    setSearch(listQuery);
  }, [listQuery]);

  useEffect(() => {
    let active = true;
    setList(null);
    setListError(null);
    api
      .debugRecords(listQuery, runFilter, symptom)
      .then((d) => active && setList(d))
      .catch((e: unknown) => active && setListError(String(e)));
    return () => {
      active = false;
    };
  }, [listQuery, runFilter, symptom]);

  const updateParams = (patch: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setSearchParams(next);
  };

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    setRecorded(null);
    setBodyVer("");
    api
      .debug(query || undefined)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [query]);

  const selected = useMemo(
    () => data?.versions.find((v) => v.selected) ?? data?.versions[0] ?? null,
    [data],
  );
  const exchange = selected?.exchange ?? null;
  const call = exchange?.call ?? null;
  const rows = useMemo(
    () => (selected ? compareRows(selected, call) : []),
    [selected, call],
  );
  const mismatched = rows.filter((r) => !r.agrees);
  const listRows = list?.rows ?? [];
  const run = data?.run ?? null;
  const input = data?.input ?? null;
  const bodies = input?.versions ?? [];
  const latestBody = bodies.find((b) => b.latest) ?? null;
  const shownBody = bodies.find((b) => b.body_hash === bodyVer) ?? latestBody;
  const bodyLabel = (hash: string) => {
    const at = bodies.findIndex((b) => b.body_hash === hash);
    return at < 0 ? hash.slice(0, 12) : `v${at + 1}`;
  };
  const sentKnown = exchange?.state === "call" && !!input && input.body_hash !== "";
  const sentBody = bodies.find((b) => b.analyzed) ?? null;
  const staleBy =
    sentKnown && sentBody && latestBody && !sentBody.latest
      ? bodies.indexOf(latestBody) - bodies.indexOf(sentBody)
      : 0;
  const emptyish =
    !!input && (bodies.length === 0 || (!!shownBody && shownBody.raw_text.length < 60));

  return (
    <>
      <p className="lede">
        분석 결과 하나를 <span className="b">그것을 만든 기록</span>까지 되짚습니다 — 모델이
        무엇을 받고 무엇을 답했는지, 그리고 그 판단이 속한 실행 전체가 어땠는지.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      <div className="grid g-12">
        <div className="card col-12">
          <div className="card-h">
            <h3>분석 결과 찾기</h3>
            <span className="sub">
              {list ? `${list.matched}건 · ` : ""}제목·레코드 번호로 찾거나 증상으로 좁힙니다
            </span>
            <div className="r">
              <span className="tag">제보 링크로 들어오면 그 레코드가 먼저 골라져 있습니다</span>
            </div>
          </div>
          <div className="card-b">
            <form
              className="dbg-formrow"
              onSubmit={(e) => {
                e.preventDefault();
                updateParams({ q: search.trim() });
              }}
            >
              <label className="dbg-fld">
                <span className="dbg-fl">검색</span>
                <input
                  type="search"
                  value={search}
                  placeholder="제목 또는 레코드 번호"
                  onChange={(e) => setSearch(e.target.value)}
                />
              </label>
              <label className="dbg-fld">
                <span className="dbg-fl">증상</span>
                <select value={symptom} onChange={(e) => updateParams({ symptom: e.target.value })}>
                  <option value="">전체</option>
                  <optgroup label="분석 상태">
                    {Object.entries(STATUS_LABEL).map(([name, label]) => (
                      <option key={name} value={`analysis_status:${name}`}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="호출 결과">
                    {Object.entries(OUTCOME_LABEL).map(([name, label]) => (
                      <option key={name} value={`call_outcome:${name}`}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="미호출 사유">
                    {Object.entries(NO_CALL_LABEL).map(([name, label]) => (
                      <option key={name} value={`no_call_reason:${name}`}>
                        {label}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <button type="submit">찾기</button>
            </form>

            {runFilter && (
              <div className="note">
                <div>
                  실행 <span className="mono">{runFilter}</span> 안에서만 찾고 있습니다 — 증상이 이
                  실행에 몰렸는지 보는 중입니다.{" "}
                  <button
                    type="button"
                    className="btn sm"
                    onClick={() => updateParams({ run_id: "" })}
                  >
                    전체 실행으로 넓히기
                  </button>
                </div>
              </div>
            )}
            {listError && (
              <div className="note">
                <div>
                  <b>API 오류:</b> {listError}
                </div>
              </div>
            )}
            {!list && !listError && <div className="placeholder-note">불러오는 중…</div>}
            {list && listRows.length > 0 && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th />
                    <th>레코드</th>
                    <th>제목</th>
                    <th>분석 결과</th>
                    <th>수집</th>
                  </tr>
                </thead>
                <tbody>
                  {listRows.map((row) => (
                    <tr key={row.record_id}>
                      <td>
                        <input
                          type="radio"
                          name="rec"
                          value={row.record_id}
                          aria-label={`${row.record_id} 고르기`}
                          checked={row.record_id === data?.record_id}
                          onChange={() => updateParams({ record_id: row.record_id })}
                        />
                      </td>
                      <td className="mono">{row.record_id}</td>
                      <td>{row.title || <span className="meta">제목 기록 없음</span>}</td>
                      <td>
                        {row.sentiment ? (
                          <span className={`badge ${sentimentBadge(row.sentiment)}`}>
                            {SENTIMENT_LABEL[row.sentiment] ?? row.sentiment}
                          </span>
                        ) : (
                          <span className="meta">
                            {STATUS_LABEL[row.analysis_status] ?? row.analysis_status}
                          </span>
                        )}
                      </td>
                      <td className="mono">{row.collected_at || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {list && listRows.length === 0 && (
              <div className="dbg-emptybox">
                찾는 분석 결과가 없습니다.
                <br />
                레코드 번호는 제보 링크 끝 <span className="mono">record_id=</span> 뒤의 값입니다 —
                증상 필터를 ‘전체’로 넓혀 보세요.
              </div>
            )}
            {list?.truncated && (
              <div className="note">
                <div>
                  맞는 결과 {list.matched}건 가운데 앞 {list.limit}건만 보입니다 — 검색이나 증상으로
                  좁히세요.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {data && !data.found && (
        <div className="placeholder-note">
          {data.selection === "requested-missing" ? (
            <>
              <span className="mono">{data.record_id}</span> 의 분석 결과가 없습니다 — 분석된 적이
              없거나 다른 주기의 레코드입니다. <b>조회가 실패한 것이 아니라 되짚을 판단이
              없습니다.</b>
            </>
          ) : (
            <>분석된 레코드가 아직 하나도 없습니다 — 파이프라인이 한 번도 분석을 돌리지 않았습니다.</>
          )}
        </div>
      )}

      {data && data.found && selected && exchange && (
        <>
          <div className="grid g-12">
            {/* CMP-kv */}
            <div className="card col-5">
              <div className="card-h">
                <h3>고른 결과</h3>
                <span className="sub">이 판단이 어디서 나왔는지 되짚습니다</span>
                <div className="r">
                  <span className="badge b-neu mono">{data.record_id}</span>
                </div>
              </div>
              <div className="card-b">
                {input?.title && <p className="dbg-verdict">{input.title}</p>}
                {data.selection === "auto" && (
                  <div className="note">
                    <div>
                      조회 없이 열어 <b>첫 레코드</b>를 골랐습니다.
                    </div>
                  </div>
                )}
                <div className="kv">
                  <span className="k">상태</span>
                  <span className="v">
                    {STATUS_LABEL[selected.analysis_status] ?? selected.analysis_status}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">분위기</span>
                  <span className="v">
                    {selected.sentiment ? (
                      <span className={`badge ${sentimentBadge(selected.sentiment)}`}>
                        {SENTIMENT_LABEL[selected.sentiment] ?? selected.sentiment}
                      </span>
                    ) : (
                      <span className="meta">분류에서 제외됨</span>
                    )}
                  </span>
                </div>
                <div className="kv">
                  <span className="k">신뢰도</span>
                  <span className="v mono">{selected.confidence}</span>
                </div>
                <div className="kv">
                  <span className="k">대상국</span>
                  <span className="v">{selected.target_countries.join(", ") || "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">서술 대상</span>
                  <span className="v">{selected.narrative_subjects.join(", ") || "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">로직 버전</span>
                  <span className="v mono">{selected.analyzer_version}</span>
                </div>
                <div className="kv">
                  <span className="k">분석 시각</span>
                  <span className="v mono">{selected.analyzed_at}</span>
                </div>
                <div className="kv">
                  <span className="k">실행</span>
                  <span className="v mono">{selected.run_id || "—"}</span>
                </div>
                {input?.source_url && (
                  <div className="kv">
                    <span className="k">원문 주소</span>
                    <span className="v mono dbg-url">{input.source_url}</span>
                  </div>
                )}
                {data.versions.length > 1 && (
                  <div className="note">
                    <div>
                      이 레코드에는 분석 버전이 <b>{data.versions.length}</b>개 있습니다 — 위는
                      가장 최근 것이고, 나머지는 소급 적용 이전의 판단입니다.
                    </div>
                  </div>
                )}
                <div className="note info dbg-note">
                  <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 8h.01M11 12h1v4h1" />
                  </svg>
                  <div>
                    결과마다 그것을 만든 실행과 모델 호출이 붙어 있습니다. 원문으로 되짚는 키도
                    그대로입니다.
                  </div>
                </div>
                <div className="dbg-actions">
                  {input?.source_url && (
                    <a className="btn sm" href={input.source_url} target="_blank" rel="noreferrer">
                      원문 열기 ↗
                    </a>
                  )}
                  <a className="btn sm" href={`/trace?record_id=${encodeURIComponent(data.record_id)}`}>
                    원문 추적 상세에서 보기 →
                  </a>
                </div>
              </div>
            </div>

            {/* CMP-kv */}
            <div className="card col-7">
              <div className="card-h">
                <h3>모델 호출 기록</h3>
                <span className="sub">보낸 그대로 · 받은 그대로</span>
              </div>
              <div className="card-b">
                {exchange.state === "no-call" && (
                  <div className="note">
                    <div>
                      <b>이 결과는 모델을 부르지 않았습니다</b> —{" "}
                      {NO_CALL_LABEL[exchange.no_call_reason ?? ""] ?? exchange.no_call_reason}.
                      볼 요청·응답이 없으니 모델이 무엇을 받았어야 했는지부터 봅니다.
                    </div>
                  </div>
                )}
                {exchange.state === "call-record-absent" && (
                  <div className="note">
                    <div>
                      <b>호출 기록을 찾지 못했습니다.</b> 이 결과는{" "}
                      <span className="mono">{exchange.call_id}</span> 호출을 가리키는데 그 기록이
                      레이크에 없습니다 — 되짚을 요청·응답이 남아 있지 않습니다.
                    </div>
                  </div>
                )}
                {exchange.state === "unrecorded" && (
                  <div className="note">
                    <div>
                      <b>이 결과에는 호출 기록이 없습니다.</b> 호출 기록을 남기기 전에 분석된
                      결과라 요청·응답을 되짚을 수 없습니다 — 판단을 재현하려면 표본 재분석으로
                      넘기세요.
                      <div className="dbg-actions">
                        <a className="btn sm" href="/reprocess">
                          표본 재분석으로 재현하기 →
                        </a>
                      </div>
                    </div>
                  </div>
                )}
                {exchange.state === "call" && call && (
                  <>
                    {exchange.reused_from && (
                      <div className="note">
                        <div>
                          <b>이번 실행은 모델을 다시 부르지 않았습니다.</b> 같은 입력의 이전 응답을
                          재사용했습니다 — 판단은{" "}
                          <span className="mono">{exchange.reused_from.call_id}</span> 호출에서
                          나왔습니다.
                        </div>
                      </div>
                    )}
                    {call.call_outcome === "call_failed" && (
                      <div className="note">
                        <div>
                          <b>모델 호출이 실패해 결과를 채우지 않았습니다.</b> 재시도{" "}
                          {call.call_attempt_count}회 뒤에도 응답을 받지 못했습니다. 마지막 오류:{" "}
                          <span className="mono">{call.call_failure_reason ?? "—"}</span>
                        </div>
                      </div>
                    )}
                    <div className="kv">
                      <span className="k">모델</span>
                      <span className="v mono">{call.call_model}</span>
                    </div>
                    <div className="kv">
                      <span className="k">temperature</span>
                      <span className="v mono">
                        {call.call_temperature === null ? "—" : call.call_temperature}
                      </span>
                    </div>
                    <div className="kv">
                      <span className="k">로직 버전</span>
                      <span className="v mono">{call.analyzer_version}</span>
                    </div>
                    <div className="kv">
                      <span className="k">결과</span>
                      <span className="v">
                        {OUTCOME_LABEL[call.call_outcome] ?? call.call_outcome}
                      </span>
                    </div>
                    <div className="kv">
                      <span className="k">재시도</span>
                      <span className="v mono">{call.call_attempt_count}</span>
                    </div>
                    <div className="kv">
                      <span className="k">호출 시각</span>
                      <span className="v mono">
                        {call.called_at} · {call.duration_ms}ms
                      </span>
                    </div>

                    <div className="dbg-formrow">
                      <label className="dbg-fld">
                        <span className="dbg-fl">보낸 요청</span>
                        <select
                          value={promptPart}
                          onChange={(e) => setPromptPart(e.target.value as "user" | "system")}
                        >
                          <option value="user">사용자 메시지</option>
                          <option value="system">시스템 지시문</option>
                        </select>
                      </label>
                      <span className="meta mono">sha256 {call.prompt_sha256}</span>
                    </div>
                    <pre className="code">
                      {promptPart === "user" ? call.prompt_user : call.prompt_system}
                    </pre>
                    <div className="dbg-seclabel">받은 응답 (가공 전)</div>
                    {call.response_raw === null ? (
                      <div className="placeholder-note">
                        응답을 받지 못했습니다 — 보여 줄 원문이 <b>없습니다</b>. 빈 칸으로 두지
                        않고 없다고 적습니다.
                      </div>
                    ) : (
                      <pre className="code">{call.response_raw}</pre>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* CMP-table */}
          {rows.length > 0 && (
            <div className="card">
              <div className="card-h">
                <h3>응답 ↔ 저장값</h3>
                <span className="sub">필드마다 모델의 최종 답과 저장된 값을 맞춰 봅니다</span>
                <div className="r">
                  <span className={`badge ${mismatched.length ? "b-neg" : "b-pos"}`}>
                    어긋난 필드 {mismatched.length}
                  </span>
                </div>
              </div>
              <div className="card-b">
                {mismatched.length > 0 && (
                  <div className="note">
                    <div>
                      <b>응답의 최종 판단과 저장값이 다릅니다.</b> 모델이 아니라{" "}
                      <b>읽는 쪽</b>을 먼저 의심할 근거입니다 — 응답 안에 판단이 여러 번 나오면
                      저장값이 초안에서 읽혔을 수 있습니다.
                    </div>
                  </div>
                )}
                <label className="chk">
                  <input
                    type="checkbox"
                    checked={diffOnly}
                    onChange={(e) => setDiffOnly(e.target.checked)}
                  />{" "}
                  어긋난 필드만 보기
                </label>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>필드</th>
                      <th>응답</th>
                      <th>저장값</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {(diffOnly ? mismatched : rows).map((r) => (
                      <tr key={r.field}>
                        <td>{r.field}</td>
                        <td className="mono">{r.replied || "—"}</td>
                        <td className="mono">{r.stored || "—"}</td>
                        <td>
                          <span className={`badge ${r.agrees ? "b-pos" : "b-neg"}`}>
                            {r.agrees ? "일치" : "어긋남"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="grid g-12">
            <div className="card col-6">
              <div className="card-h">
                <h3>모델이 받은 입력</h3>
                <span className="sub">
                  {sentKnown && input
                    ? `요청의 제목·본문 · 본문 ${bodyLabel(input.body_hash)}`
                    : "재구성할 요청이 없습니다"}
                </span>
              </div>
              <div className="card-b">
                <pre className="code">
                  {exchange.state === "no-call"
                    ? "(모델에 보내지 않음)"
                    : exchange.state === "call" && call
                      ? call.prompt_user
                      : "(호출 기록이 없어 모델이 받은 입력을 재구성할 수 없습니다)"}
                </pre>
              </div>
            </div>
            <div className="card col-6">
              <div className="card-h">
                <h3>보관된 원문</h3>
                <span className="sub">수정될 때마다 새 버전으로 쌓입니다</span>
              </div>
              <div className="card-b">
                <label className="dbg-fld dbg-fld-narrow">
                  <span className="dbg-fl">원문 버전</span>
                  <select
                    value={shownBody?.body_hash ?? ""}
                    onChange={(e) => setBodyVer(e.target.value)}
                  >
                    {bodies.length ? (
                      bodies.map((b) => (
                        <option key={b.body_hash} value={b.body_hash}>
                          {bodyLabel(b.body_hash)} · {b.first_seen_at}
                          {b.analyzed && sentKnown ? " · 분석에 쓴 버전" : ""}
                          {b.latest ? " · 최신" : ""}
                        </option>
                      ))
                    ) : (
                      <option value="">보관된 본문 없음</option>
                    )}
                  </select>
                </label>
                <pre className="code">
                  {shownBody && input
                    ? `TITLE: ${input.title}\n\nBODY:\n${shownBody.raw_text}`
                    : "(본문 없음 — 원문 링크만 보관)"}
                </pre>
                <div className="dbg-actions dbg-actions-tight">
                  {input?.source_url && (
                    <a className="btn sm" href={input.source_url} target="_blank" rel="noreferrer">
                      원문 열기 ↗
                    </a>
                  )}
                  <a className="btn sm" href={`/trace?record_id=${encodeURIComponent(data.record_id)}`}>
                    원문 추적 상세에서 전체 보기 →
                  </a>
                </div>
              </div>
            </div>
            <div className="card col-12">
              <div className="card-b">
                <p className="dbg-verdict">
                  {!shownBody
                      ? "비교할 원문이 없습니다"
                      : !sentKnown || !input
                        ? "모델이 받은 입력을 알 수 없어 원문만 보여 줍니다"
                        : shownBody.analyzed
                          ? "고른 원문 버전이 모델이 받은 본문과 같습니다"
                          : `고른 원문 버전이 모델이 받은 본문과 다릅니다 (${bodyLabel(input.body_hash)} ↔ ${bodyLabel(shownBody.body_hash)})`}
                </p>
                <p className="dbg-vsub">
                  {bodies.length && latestBody
                    ? `보관 버전 ${bodies.length}개 · 분석에 쓴 버전 ${
                        sentKnown && input ? bodyLabel(input.body_hash) : "알 수 없음"
                      } · 최신 ${bodyLabel(latestBody.body_hash)}`
                    : "보관 버전 0개"}
                </p>
                {staleBy > 0 && (
                  <div className="dbg-banner warn">
                    <div>
                      <b>분석에 쓴 본문과 지금 보관된 최신 본문이 다릅니다.</b> 기사가 분석 뒤에{" "}
                      {staleBy}번 수정됐습니다. 판단은 당시 본문 기준으로는 맞았을 수 있습니다 — 이
                      경우 고칠 곳은 모델이 아니라 수정본을 다시 분석하는 흐름입니다.
                    </div>
                  </div>
                )}
                {emptyish && (
                  <div className="dbg-banner warn">
                    <div>
                      <b>본문이 사실상 비어 있습니다.</b>{" "}
                      {bodies.length === 0
                        ? "원문 링크만 있고 본문이 수집되지 않았습니다."
                        : "보관된 본문이 구독·저작권 안내 문구뿐입니다."}{" "}
                      이 입력으로는 어떤 모델도 판단할 수 없습니다 — 수집 쪽을 먼저 봐야 합니다.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* CMP-table + CMP-metric. 수집 단계의 구간별 집계 패널은 다른 여정
              (JRN-ingestion-recovery)의 것이라 여기서 세우지 않는다. */}
          {run ? (
            <div className="grid g-12">
              <div className="card col-7">
                <div className="card-h">
                  <h3>배치 실행</h3>
                  <span className="sub">
                    <span className="mono">{run.run_id}</span> · {run.run_trigger} ·{" "}
                    {run.run_started_at}
                  </span>
                  <div className="r">
                    <span className={`badge ${run.run_status === "failed" ? "b-neg" : "b-pos"}`}>
                      {run.run_status}
                    </span>
                  </div>
                </div>
                <div className="card-b">
                  <div className="kv">
                    <span className="k">끝난 시각</span>
                    <span className="v mono">{run.run_ended_at ?? "아직 진행 중"}</span>
                  </div>
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>단계</th>
                        <th>상태</th>
                        <th className="num">입력</th>
                        <th>처리 결과</th>
                        <th className="num">소요</th>
                      </tr>
                    </thead>
                    <tbody>
                      {run.stages.map((stage) => (
                        <tr key={stage.stage_name}>
                          <td>{stage.stage_name}</td>
                          <td>
                            <span
                              className={`badge ${stage.stage_status === "failed" ? "b-neg" : "b-pos"}`}
                            >
                              {stage.stage_status}
                            </span>
                          </td>
                          <td className="num mono">{stage.input_count}</td>
                          <td>
                            {stage.outcomes.length === 0
                              ? "—"
                              : stage.outcomes
                                  .map((o) => `${o.outcome_name} ${o.outcome_count}`)
                                  .join(" · ")}
                            {stage.failure_reason && (
                              <>
                                {" "}
                                <span className="mono">({stage.failure_reason})</span>
                              </>
                            )}
                          </td>
                          <td className="num mono">{stage.duration_ms}ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {run.stages.some((s) => s.stage_status === "failed") && (
                    <div className="note">
                      <div>
                        <b>이 실행은 도중에 멈췄습니다.</b> 멈춘 지점까지의 건수와 사유가 위 표에
                        남아 있습니다 — 뒤 단계는 돌지 않았습니다.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="card col-5">
                <div className="card-h">
                  <h3>증상이 몰렸나</h3>
                  <span className="sub">이 결과 하나인지, 실행 전체인지</span>
                </div>
                <div className="card-b">
                  <div className="metric dbg-metric">
                    <div className="ml">이 실행이 건드린 결과</div>
                    <div className="mv">
                      {run.symptoms.records}
                      <small>건</small>
                    </div>
                    <div className="md">모델 호출 {run.symptoms.calls}건</div>
                  </div>
                  <div className="dbg-seclabel">분석 상태</div>
                  {run.symptoms.analysis_status.map((t) => (
                    <div className="kv" key={t.name}>
                      <span className="k">{STATUS_LABEL[t.name] ?? t.name}</span>
                      <span className="v mono">
                        <button
                          type="button"
                          className="btn sm"
                          onClick={() =>
                            updateParams({
                              symptom: `analysis_status:${t.name}`,
                              run_id: run.run_id,
                              q: "",
                            })
                          }
                        >
                          {t.count}건 ·{" "}
                          {run.symptoms.records
                            ? Math.round((t.count / run.symptoms.records) * 1000) / 10
                            : 0}
                          % 목록 보기
                        </button>
                      </span>
                    </div>
                  ))}
                  {run.symptoms.call_outcome.length > 0 && (
                    <>
                      <div className="dbg-seclabel">호출 결과</div>
                      {run.symptoms.call_outcome.map((t) => (
                        <div className="kv" key={t.name}>
                          <span className="k">{OUTCOME_LABEL[t.name] ?? t.name}</span>
                          <span className="v mono">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() =>
                                updateParams({
                                  symptom: `call_outcome:${t.name}`,
                                  run_id: run.run_id,
                                  q: "",
                                })
                              }
                            >
                              {t.count}건 목록 보기
                            </button>
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                  {run.symptoms.no_call_reason.length > 0 && (
                    <>
                      <div className="dbg-seclabel">미호출 사유</div>
                      {run.symptoms.no_call_reason.map((t) => (
                        <div className="kv" key={t.name}>
                          <span className="k">{NO_CALL_LABEL[t.name] ?? t.name}</span>
                          <span className="v mono">
                            <button
                              type="button"
                              className="btn sm"
                              onClick={() =>
                                updateParams({
                                  symptom: `no_call_reason:${t.name}`,
                                  run_id: run.run_id,
                                  q: "",
                                })
                              }
                            >
                              {t.count}건 목록 보기
                            </button>
                          </span>
                        </div>
                      ))}
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="placeholder-note">
              이 결과가 가리키는 실행 기록이 레이크에 없습니다 — 실행 기록을 남기기 전에 분석된
              결과입니다. <b>실행이 없었던 것이 아니라 기록이 없습니다.</b>
            </div>
          )}

          <div className="grid g-12">
            <div className="card col-7">
              <div className="card-h">
                <h3>원인 판정</h3>
                <span className="sub">모은 근거로 원인을 하나 고릅니다</span>
              </div>
              <div className="card-b">
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>모은 근거</th>
                      <th>본 것</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>모델 호출</td>
                      <td>
                        {exchange.state === "call"
                          ? `${OUTCOME_LABEL[call?.call_outcome ?? ""] ?? call?.call_outcome} · 재시도 ${call?.call_attempt_count}회`
                          : exchange.state === "no-call"
                            ? `부르지 않음 — ${NO_CALL_LABEL[exchange.no_call_reason ?? ""] ?? exchange.no_call_reason}`
                            : "기록 없음"}
                      </td>
                    </tr>
                    <tr>
                      <td>응답 ↔ 저장값</td>
                      <td>
                        {rows.length === 0
                          ? "대조할 응답 원문이 없음"
                          : mismatched.length === 0
                            ? "전 필드 일치"
                            : `${mismatched.length}개 필드가 어긋남`}
                      </td>
                    </tr>
                    <tr>
                      <td>실행 전체</td>
                      <td>
                        {run
                          ? `${run.symptoms.records}건 중 호출 ${run.symptoms.calls}건 · 상태 ${run.symptoms.analysis_status.map((t) => `${t.name} ${t.count}`).join(" · ")}`
                          : "실행 기록 없음"}
                      </td>
                    </tr>
                  </tbody>
                </table>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (!cause) return;
                    setRecorded(CAUSES.find((c) => c.id === cause)?.label ?? cause);
                  }}
                >
                  <div className="dbg-fld">
                    <span className="dbg-fl">원인</span>
                    <div className="radios">
                      {CAUSES.map((c) => (
                        <label key={c.id}>
                          <input
                            type="radio"
                            name="cause"
                            value={c.id}
                            checked={cause === c.id}
                            onChange={() => setCause(c.id)}
                          />{" "}
                          {c.label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="dbg-fld">
                    <span className="dbg-fl">판정 메모</span>
                    <textarea
                      value={memo}
                      placeholder="무엇을 보고 이렇게 판정했는지"
                      onChange={(e) => setMemo(e.target.value)}
                    />
                  </label>
                  <div className="dbg-actions">
                    <button type="submit" disabled={!cause}>
                      판정 기록
                    </button>
                  </div>
                </form>
                {recorded && (
                  <div className="note">
                    <div>
                      <b>{recorded}</b> 로 판정했습니다. 이 판정은 <b>이 화면 안에서만</b>{" "}
                      유지됩니다 — 판정 보존은 아직 제품에 없습니다.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-h">
                <h3>판정 뒤 이어지는 길</h3>
                <span className="sub">조치가 필요하면 그 흐름으로 넘깁니다</span>
              </div>
              <div className="card-b">
                <div className="kv">
                  <span className="k">입력(수집)이 문제였다면</span>
                  <span className="v">
                    빈 본문·빠진 버전을 다시 수집해 소급 적용합니다.{" "}
                    <a href="/reprocess">재처리 콘솔 →</a>
                  </span>
                </div>
                <div className="kv">
                  <span className="k">로직·프롬프트가 문제였다면</span>
                  <span className="v">
                    고친 뒤 표본부터 소급 적용합니다. <a href="/reprocess">표본 재분석 →</a>
                  </span>
                </div>
                <div className="kv">
                  <span className="k">원문이 의심되면</span>
                  <span className="v">
                    수집된 원문까지 내려가 확인합니다.{" "}
                    <a href={`/trace?record_id=${encodeURIComponent(data.record_id)}`}>
                      원문 추적 상세 →
                    </a>
                  </span>
                </div>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: data.record_id, text: "되짚는 레코드" },
              { value: String(data.versions.length), text: "분석 버전" },
              { value: run ? run.run_id : "—", text: "속한 실행" },
            ]}
          />
        </>
      )}
    </>
  );
}
