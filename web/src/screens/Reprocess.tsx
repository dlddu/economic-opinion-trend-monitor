import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Axis, ReprocessCompareRow, ReprocessResponse } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// 재처리 콘솔 — 로드맵 슬라이스 10 의 **읽기 절반**.
//
// 재처리는 이 제품의 운영 흐름 중 유일하게 무언가를 *일으키는* 쪽이다: 분석 로직의
// 버전을 올리고, 범위를 골라 다시 돌리고, 전후를 견주고, 내보내거나 되돌린다
// (`JRN-logic-backfill`). 그 어느 것도 돌리기 전에 운영자는 「이 범위에 무엇이
// 얼마나 있고, 그중 몇 건이 이미 새 로직으로 돼 있나」를 봐야 하고, 그 부분은
// Bronze·Silver 를 읽기만 하면 된다 — 그래서 먼저, 따로 착지한다.
//
// **여기서 그리지 않는 것**: 표본 실행(`STP-dry-run`)·전량 실행(`STP-run-reprocess`)·
// 반영/롤백 기록(`STP-publish`). 서빙은 아직 재처리 런을 일으킬 수 없고(응답의
// `trigger.available=false` 가 그 사실이다), 누르면 아무 일도 없는 버튼은 그리지
// 않는다 — 설계 트래커의 허위 컨트롤 금지 교리. 그 세 단계는 Silver 버전 병존
// 저장·범위 선택 CLI·Argo 제출 배선과 함께 후속 슬라이스로 온다.

const RANGES: { id: ReprocessResponse["scope"]["range"]; label: string }[] = [
  { id: "24h", label: "지난 24시간" },
  { id: "7d", label: "지난 7일" },
  { id: "30d", label: "지난 30일" },
];

const AXES: { id: Axis; label: string; pill: string }[] = [
  { id: "KR", label: "한국", pill: "ax-kr" },
  { id: "US", label: "미국", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계", pill: "ax-gl" },
];

type SortBy = "delta" | "share";

const REASON_TEXT: Record<string, string> = {
  "no-silver": "이 범위에는 분석 레코드가 아직 없습니다 — 파이프라인이 여기까지 돌지 않았습니다.",
  "single-version":
    "이 범위의 Silver 는 한 버전뿐입니다. 견줄 다른 버전이 없으면 표를 그리지 않습니다 — " +
    "지금은 매시간 실행이 Silver 를 통째로 새 버전으로 바꾸므로, 병존 저장이 착지해야 전후가 생깁니다.",
};

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const pp = (v: number) => `${v > 0 ? "+" : ""}${(v * 100).toFixed(1)}`;

/** 정렬은 서버가 |delta| 순으로 내려준 것을 기본으로 두고, 화면에서만 바꾼다. */
function sortRows(rows: ReprocessCompareRow[], by: SortBy): ReprocessCompareRow[] {
  const list = [...rows];
  if (by === "share") list.sort((a, b) => b.after_share - a.after_share);
  return list;
}

export function Reprocess() {
  const [range, setRange] = useState<ReprocessResponse["scope"]["range"]>("7d");
  const [axis, setAxis] = useState<Axis>("KR");
  const [source, setSource] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("delta");
  // 주목 임계(%p). 여정이 「임계 초과를 배지 표시」로 요구한 값이고, 임계 자체는
  // 제품 결정이 아니라 운영자 입력이라 화면 상태로 둔다.
  const [threshold, setThreshold] = useState(2);
  const [data, setData] = useState<ReprocessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .reprocess(range, axis, source)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [range, axis, source]);

  const axisDef = AXES.find((a) => a.id === axis) ?? AXES[0];
  const rangeDef = RANGES.find((r) => r.id === range) ?? RANGES[1];
  const scope = data?.scope;
  const compare = data?.compare;
  const rows = compare?.available ? sortRows(compare.rows, sortBy) : [];
  const over = rows.filter((r) => Math.abs(r.delta) * 100 >= threshold);
  const largest = compare?.available && compare.rows.length ? compare.rows[0] : null;

  return (
    <>
      <div className="dash-controls">
        {/* CMP-seg — 기간·축은 서버가 범위를 다시 세므로 전환이 실동작한다. */}
        <div className="seg" aria-label="기간">
          {RANGES.map((r) => (
            <button key={r.id} className={range === r.id ? "on" : ""} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <div className="seg" aria-label="출처 축">
          {AXES.map((a) => (
            <button
              key={a.id}
              className={axis === a.id ? "on" : ""}
              onClick={() => {
                setAxis(a.id);
                // 소스 목록은 축마다 다르다 — 다른 축의 소스를 들고 가지 않는다.
                setSource("");
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
        {/* CMP-axpill */}
        <span className={`axpill ${axisDef.pill}`}>
          <span className="fl" />
          {axis}
        </span>
        {/* 소스 목록은 응답이 준다(그 축이 그 기간에 실제로 가진 소스). 필터를 걸어도
            목록은 줄지 않으므로 다른 소스로 옮겨 갈 수 있다. */}
        <label className="rp-source">
          <span>소스</span>
          <select value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">전체 소스</option>
            {(scope?.sources ?? []).map((s) => (
              <option key={s.source_id} value={s.source_id}>
                {s.source_id} ({s.kept})
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="lede">
        원문은 그대로 두고 <span className="b">분석 결과만 다시 씁니다.</span> 돌리기 전에 이
        범위에 원문이 몇 건 있고 그중 몇 건이 이미 새 로직으로 돼 있는지부터 셉니다 — 건수와
        예상 소요가 보이지 않으면 범위를 감으로 정하게 됩니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && scope && (
        <>
          {/* ---- STP-scope-range — 재처리 범위 ---- */}
          <div className="grid g-12 rp-block">
            <div className="card col-7">
              <div className="card-h">
                <h3>재처리 범위</h3>
                <span className="sub">
                  {rangeDef.label} · {axisDef.label} · {source || "전체 소스"}
                </span>
                <div className="r">
                  <span className="rp-tag">고르는 즉시 건수와 예상 소요를 셉니다</span>
                </div>
              </div>
              <div className="card-b">
                {scope.total === 0 ? (
                  <div className="rp-empty">
                    이 조합에는 보관된 원문이 없습니다.
                    <br />
                    그 축에 없는 소스를 고르면 재분석할 대상이 0건입니다 — 기간이나 소스를 넓혀
                    보세요.
                  </div>
                ) : (
                  /* CMP-table — 수집 주기 하나가 한 구간이다. 「이미 새 로직」은 목표
                     버전(`target_version`)이 찍힌 레코드 수라, 버전을 올리기 전엔 전부가
                     이미 새 로직이고 올리는 순간 전부가 대상이 된다 — 그것이 현재 Silver
                     의 실제 모양이다. */
                  <table className="tbl rp-scope">
                    <thead>
                      <tr>
                        <th>구간</th>
                        <th className="num">원문</th>
                        <th className="num">이미 새 로직</th>
                        <th className="num">재분석 대상</th>
                        <th>상태</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scope.buckets.map((b) => {
                        const cls = b.todo === 0 ? "b-pos" : b.done > 0 ? "b-mix" : "b-neg";
                        const label = b.todo === 0 ? "완료" : b.done > 0 ? "일부 완료" : "재분석 필요";
                        return (
                          <tr key={b.cycle}>
                            <td>
                              <b className="mono">{b.cycle}</b>
                            </td>
                            <td className="num">{b.kept}</td>
                            <td className="num">{b.done}</td>
                            <td className="num">{b.todo}</td>
                            <td>
                              {/* CMP-badge */}
                              <span className={`badge ${cls}`}>
                                <span className="d" />
                                {label}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-h">
                <h3>고른 범위</h3>
                <span className="sub">이 범위만 다시 분석합니다</span>
              </div>
              <div className="card-b">
                {/* CMP-kv */}
                <div className="kv">
                  <span className="k">기간</span>
                  <span className="v">{rangeDef.label}</span>
                </div>
                <div className="kv">
                  <span className="k">출처 축</span>
                  <span className="v">{axisDef.label}</span>
                </div>
                <div className="kv">
                  <span className="k">소스</span>
                  <span className="v">{source || "전체 소스"}</span>
                </div>
                <div className="kv">
                  <span className="k">목표 로직 버전</span>
                  <span className="v mono">{data.target_version || "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">재분석 대상</span>
                  <span className="v rp-todo">
                    {scope.todo}건 <span className="rp-dim">/ 원문 {scope.total}건</span>
                  </span>
                </div>
                <div className="kv">
                  <span className="k">예상 소요</span>
                  {/* 예상은 Silver 가 목표 버전을 찍은 속도(analyzed_at 분포)에서
                      읽는다. 읽을 관측이 없으면 숫자를 지어내지 않는다. */}
                  <span className="v rp-eta">
                    {scope.eta_minutes === null
                      ? "— (관측된 처리 속도 없음)"
                      : `${scope.eta_minutes}분 (${scope.throughput_per_minute?.toFixed(1)}건/분 실측)`}
                  </span>
                </div>
                <div className="note info rp-note">
                  <div>
                    원문은 그대로 두고 분석 결과만 다시 씁니다. 원문으로 되짚는 키는 재분석 뒤에도
                    유지됩니다.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ---- 실행 — 이 서빙이 아직 못 하는 것을 그대로 말한다 ---- */}
          {/* CMP-note — 표본·전량·반영은 여기서 버튼으로 그리지 않는다. 응답이
              `trigger.available=false` 인 한 그 버튼은 아무 일도 하지 않을 것이고,
              그런 컨트롤은 그리지 않는다. */}
          <div className="note rp-block rp-trigger">
            <div>
              <b>표본 실행 · 전량 실행 · 반영/되돌리기는 아직 이 화면에서 일으킬 수 없습니다.</b>{" "}
              {data.trigger.note}
              {data.target_version && (
                <>
                  {" "}
                  지금 재분석은 파이프라인의 분석 단계에 <span className="mono">--analyzer-version</span>
                  을 올려 주는 방식으로만 일어나며, 그 결과가 이 범위의 「이미 새 로직」 열로 돌아옵니다.
                </>
              )}
            </div>
          </div>

          {/* ---- STP-compare-before-after — 재처리 전후 비교 ---- */}
          <div className="grid g-12 rp-block">
            <div className="card col-7">
              <div className="card-h">
                <h3>재처리 전후 비교</h3>
                <span className="sub">
                  {compare?.available
                    ? `${compare.before_version} → ${compare.after_version} · 주목 임계 ${threshold}%p · 넘는 항목 ${over.length}건`
                    : "같은 범위를 두 로직으로 나란히 놓습니다"}
                </span>
                <div className="r">
                  <span className="rp-tag">언급 점유율 · 합계는 전후 모두 100%</span>
                </div>
              </div>
              <div className="card-b">
                {compare?.available ? (
                  <>
                    <div className="dash-controls rp-cmp-controls">
                      {/* CMP-seg */}
                      <div className="seg" aria-label="정렬">
                        <button className={sortBy === "delta" ? "on" : ""} onClick={() => setSortBy("delta")}>
                          변화가 큰 순
                        </button>
                        <button className={sortBy === "share" ? "on" : ""} onClick={() => setSortBy("share")}>
                          이후 점유율 순
                        </button>
                      </div>
                      <label className="rp-threshold">
                        <span>주목 임계 (%p)</span>
                        <input
                          type="number"
                          min={0.5}
                          max={20}
                          step={0.5}
                          value={threshold}
                          onChange={(e) => setThreshold(Number(e.target.value) || 0)}
                        />
                      </label>
                    </div>
                    {/* PAT-before-after — 같은 대상을 두 버전으로 나란히. 점유율은 그 버전이
                        이 범위에서 낸 언급 전체 중 몫(원시)이고, Gold 의 AC3.1 정규화
                        점유율이 아니다 — 새 로직이 *무엇을 말했나* 를 집계가 다시 재기
                        전에 보는 표다. */}
                    <table className="tbl rp-cmp">
                      <thead>
                        <tr>
                          <th>서술 대상</th>
                          <th className="num">이전</th>
                          <th className="num">이후</th>
                          <th className="num">차이 (%p)</th>
                          <th>판정</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((r) => {
                          const flagged = Math.abs(r.delta) * 100 >= threshold;
                          const cls = flagged ? "b-mix" : r.delta === 0 ? "b-neu" : "b-pos";
                          const label = flagged ? "검토 필요" : r.delta === 0 ? "변동 없음" : "임계 이내";
                          return (
                            <tr key={r.subject} className={flagged ? "rp-flagged" : ""}>
                              <td>
                                <b>{r.subject}</b>
                              </td>
                              <td className="num">{pct(r.before_share)}</td>
                              <td className="num">
                                <b>{pct(r.after_share)}</b>
                              </td>
                              <td className="num rp-delta">{pp(r.delta)}</td>
                              <td>
                                <span className={`badge ${cls}`}>
                                  <span className="d" />
                                  {label}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {over.length > 0 && (
                      <div className="note rp-note rp-over">
                        <div>
                          <b>임계를 넘는 항목이 {over.length}건 있습니다.</b> 설명되지 않는 변화를
                          그대로 내보내면 어제 본 숫자가 왜 바뀌었는지 아무도 답할 수 없습니다.
                        </div>
                      </div>
                    )}
                    {/* 판단 보류 몫은 비율에 섞지 않고 따로 보고한다(AC2.5 의 잣대). */}
                    <div className="note info rp-note rp-unanalyzed">
                      <div>
                        미분석 · 저신뢰를 따로 떼면 이전{" "}
                        <b>{pct(compare.unanalyzed_share.before)}</b> → 이후{" "}
                        <b>{pct(compare.unanalyzed_share.after)}</b> 입니다. 급증한 것이 관심인지
                        보류인지는 이 몫을 따로 세야 갈립니다.
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rp-empty rp-single">
                      {REASON_TEXT[compare?.reason ?? ""] ?? "비교할 수 없습니다."}
                    </div>
                    {data.versions.length > 0 && (
                      /* 견줄 상대는 없어도 무엇이 있는지는 보여 준다 — 「비교 불가」와
                         「데이터 없음」은 다른 뜻이다. */
                      <table className="tbl rp-versions">
                        <thead>
                          <tr>
                            <th>로직 버전</th>
                            <th className="num">레코드</th>
                            <th>처음 분석</th>
                            <th>마지막 분석</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.versions.map((v) => (
                            <tr key={v.analyzer_version}>
                              <td>
                                <b className="mono">{v.analyzer_version}</b>
                              </td>
                              <td className="num">{v.records}</td>
                              <td className="mono">{v.first_analyzed_at}</td>
                              <td className="mono">{v.last_analyzed_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="card col-5">
              <div className="card-h">
                <h3>무엇이 움직였나</h3>
                <span className="sub">비교 요약</span>
              </div>
              <div className="card-b">
                <div className="kv">
                  <span className="k">비교 대상</span>
                  <span className="v">{compare?.available ? `${compare.rows.length}개` : "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">임계 초과</span>
                  <span className="v">{compare?.available ? `${over.length}개` : "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">가장 큰 변화</span>
                  <span className="v">{largest ? `${largest.subject} (${pp(largest.delta)}%p)` : "—"}</span>
                </div>
                <div className="kv">
                  <span className="k">Silver 의 버전 수</span>
                  <span className="v">{data.versions.length}</span>
                </div>
                <p className="rp-muted">
                  변화가 큰 항목이 먼저 오도록 정렬해 두면 표를 눈으로 훑지 않아도 됩니다.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* CMP-mapstrip */}
      <MapStrip
        chips={[
          { value: "JRN-logic-backfill", text: "STP-scope-range · STP-compare-before-after" },
          { value: "V5", text: "원문 추적성 · 재처리 가능성", kind: "v" },
          { text: "실행·반영은 후속 슬라이스" },
        ]}
      />
    </>
  );
}
