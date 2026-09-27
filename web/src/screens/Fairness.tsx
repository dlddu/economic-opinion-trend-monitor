import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Axis, ContributionsResponse, FairnessResponse, FairnessRow } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// 급등 검증의 첫 갈래: 이 급등은 관심이 몰린 것인가, 한 수집원이 쏟아낸 것인가.
//
// 순위 하나로는 답할 수 없고 **대조**가 답한다. 그래서 이 화면의 중심은 표가
// 아니라 같은 대상을 두 가지로 센 결과를 나란히 놓는 것이다 — 집계가 계산한
// 정규화 비율(소스 안에서 점유율을 먼저 내고 축으로 결합, AC3.1)과 독자가 원시
// 건수를 그냥 나눴다면 얻었을 순진한 카운트 점유율. 원시에서 앞서고 정규화에서
// 밀리는 대상이 곧 「한 매체의 편집 결정」이다.
//
// 대조가 「편중 의심」으로 기울면 다음 물음은 「그럼 실제로 무슨 기사였나」다.
// 그래서 표의 대상을 고르면 그 값에 기여한 개별 기사 목록이 열린다(AC3.10):
// 수집원·수집 시각·본문 중복 여부를 행에 적고, 수집원으로 좁혀 셀 수 있고, 각
// 행은 원문 링크와 원문 역추적으로 이어진다. 목록 건수와 그 값의 원시 카운트를
// 카드 머리에 나란히 적는 것이 이 목록의 정직성 조건이다 — 수를 설명하지 못하는
// 목록은 다른 수를 설명하는 목록이다.
//
// 목업이 그리는 여섯 단계 중 이 화면이 아직 열지 못하는 것은 하나뿐이고,
// **데이터가 없어서** 열지 않는다(허위 컨트롤 금지 — 슬라이스 5·6 의 선례):
// `STP-inspect-sources` 소스별 기여 분해. Gold 의 키는
// (subject, axis, bucket_unit, time_bucket) 라 **수집원 차원 자체가 없다** —
// 지어내면 그 순간 화면이 거짓을 말한다.
//
// 링크도 버튼도 두지 않고, 왜 없는지를 화면 안 note 로 밝힌다 — 빈 화면으로
// 보내는 동선보다 없는 이유를 읽히는 쪽이 낫다.

const AXES: { id: Axis; label: string; pill: string }[] = [
  { id: "KR", label: "한국", pill: "ax-kr" },
  { id: "US", label: "미국", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계", pill: "ax-gl" },
];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

/** 세는 방식. 서버가 두 값을 모두 내려주므로 전환은 실제로 값을 바꾼다. */
type Mode = "normalized" | "raw";

function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function deltaClass(d: number): string {
  if (d > 0.05) return "up";
  if (d < -0.05) return "dn";
  return "fl";
}

function deltaLabel(d: number): string {
  if (d > 0.05) return `▲ ${d.toFixed(1)}%p`;
  if (d < -0.05) return `▼ ${Math.abs(d).toFixed(1)}%p`;
  return "—";
}

/** 현재 세는 방식의 값. 두 모드가 같은 자리를 놓고 겨루게 하는 지점이다. */
function shareIn(row: FairnessRow, mode: Mode): number {
  return mode === "normalized" ? row.normalized_share : row.raw_share;
}

const ALL_SOURCES = "";

export function Fairness() {
  const [axis, setAxis] = useState<Axis>("KR");
  const [mode, setMode] = useState<Mode>("normalized");
  const [data, setData] = useState<FairnessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string>("");
  const [source, setSource] = useState<string>(ALL_SOURCES);
  const [dupOnly, setDupOnly] = useState(false);
  const [contrib, setContrib] = useState<ContributionsResponse | null>(null);
  const [contribError, setContribError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    setPicked("");
    setSource(ALL_SOURCES);
    api
      .fairness(axis)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis]);

  const axisDef = AXES.find((a) => a.id === axis) ?? AXES[0];
  const unitLabel = data ? (UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit) : "";

  // 순위는 세는 방식을 따라간다 — 그래야 "정규화하면 순위가 유지되나?" 라는
  // 질문이 화면 위에서 실제로 답해진다.
  const rows = data ? [...data.rows].sort((a, b) => shareIn(b, mode) - shareIn(a, mode)) : [];
  const leadRaw = data ? [...data.rows].sort((a, b) => b.raw_share - a.raw_share)[0] : undefined;
  const leadNorm = data
    ? [...data.rows].sort((a, b) => b.normalized_share - a.normalized_share)[0]
    : undefined;
  // 두 방식의 1위가 갈리면 그 자체가 판정의 근거다.
  const rankingDiverges = Boolean(leadRaw && leadNorm && leadRaw.subject !== leadNorm.subject);

  // 기여 기사 목록의 대상은 표에서 고른 것이고, 아무것도 고르지 않았으면 지금
  // 세는 방식의 1위다 — 화면이 열리는 순간 설명이 필요한 값이 그 값이기 때문이다.
  const subject = picked || rows[0]?.subject || "";
  const bucket = data?.basis.time_bucket ?? "";
  const bucketUnit = data?.basis.bucket_unit ?? "";

  useEffect(() => {
    if (!subject || !bucket) return;
    let active = true;
    setContrib(null);
    setContribError(null);
    api
      .contributions(axis, subject, bucketUnit, bucket, source)
      .then((d) => active && setContrib(d))
      .catch((e: unknown) => active && setContribError(String(e)));
    return () => {
      active = false;
    };
  }, [axis, subject, bucket, bucketUnit, source]);

  const articles = (contrib?.rows ?? []).filter((row) => !dupOnly || row.body_duplicate);
  const sources = contrib?.sources ?? [];
  // 목록이 그 값을 설명하는지는 건수 등식으로만 말할 수 있다(AC3.10). 좁히기 전
  // 전체 건수와 Gold 원시 카운트를 같은 자리에 적고, 어긋나면 어긋났다고 적는다.
  const reconciles = Boolean(contrib) && contrib?.basis.total === contrib?.basis.raw_count;

  return (
    <>
      <div className="dash-controls">
        {/* CMP-seg — 축 전환은 서빙이 축마다 Gold 를 다시 읽으므로 실동작한다. */}
        <div className="seg">
          {AXES.map((a) => (
            <button key={a.id} className={axis === a.id ? "on" : ""} onClick={() => setAxis(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
        {/* CMP-axpill */}
        <span className={`axpill ${axisDef.pill}`}>
          <span className="fl" />
          {axis}
        </span>
        {/* CMP-norm-toggle — 정규화 비율 ↔ 원시 카운트 전환(AC3.8).
            허위 컨트롤이 아니다: 두 값이 같은 응답에 함께 오므로 누르면 순위·막대·
            수치가 실제로 바뀐다. 스위치의 표기는 목업의 `.norm-toggle` 그대로다. */}
        <button
          type="button"
          className={`norm-toggle${mode === "raw" ? " raw" : ""}`}
          aria-pressed={mode === "raw"}
          onClick={() => setMode(mode === "normalized" ? "raw" : "normalized")}
        >
          <span className="sw" />
          {mode === "normalized" ? "수집량 정규화" : "원시 건수"}
        </button>
      </div>

      <p className="lede">
        평소보다 크게 튀었다는 것만으로는 아직 아무것도 말할 수 없습니다.{" "}
        <span className="b">많이 다뤄진 것</span>과 <span className="b">한 곳에서 많이 쏟아진 것</span>을
        먼저 갈라야 합니다 — 같은 대상을 두 방식으로 각각 세어 나란히 놓습니다.
      </p>

      {/* CMP-note — 표기 원칙. */}
      <div className="note fair-notation">
        <div>
          <b>모든 수치 옆에 세는 방식을 항상 적어 둡니다.</b>{" "}
          표기가 없으면 원시 건수와 점유율을 섞어 읽게 되고, 그 순간 비교는 무의미해집니다.
        </div>
      </div>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && rows.length === 0 && (
        <div className="placeholder-note">
          {axisDef.label} 축에 집계된 버킷이 없습니다. 빈 순위를 0%로 그리지 않고{" "}
          <b>그리지 않습니다</b> — 집계가 없는 것과 관심이 0인 것은 다릅니다.
        </div>
      )}

      {data && rows.length > 0 && (
        <>
          <div className="grid g-12">
            <div className="card col-9">
              <div className="card-h">
                <h3>원시 · 정규화 대비</h3>
                <span className="sub">
                  같은 대상, 두 가지 세는 방식 · {data.basis.time_bucket} ({unitLabel} 단위)
                </span>
                <div className="r">
                  {mode === "normalized" ? (
                    <span className="norm-flag">▣ 정규화 비율</span>
                  ) : (
                    <span className="raw-flag">▢ 원시 건수</span>
                  )}
                </div>
              </div>
              <div className="card-b fair-cmp">
                {/* PAT-raw-vs-norm — 원시 · 정규화 대비. */}
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>대상</th>
                      <th className="num">원시 건수</th>
                      <th>원시 점유율</th>
                      <th>정규화 비율</th>
                      <th className="num">평소 대비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.subject} className={r.subject === subject ? "fair-picked" : ""}>
                        <td>
                          <button
                            type="button"
                            className={`art-pick${r.subject === subject ? " on" : ""}`}
                            aria-pressed={r.subject === subject}
                            onClick={() => {
                              setPicked(r.subject);
                              setSource(ALL_SOURCES);
                            }}
                          >
                            {r.subject}
                          </button>
                        </td>
                        <td className="num">
                          <span className="meta">원시 {r.raw_count}건</span>
                        </td>
                        <td>
                          <div className={`share${mode === "raw" ? " fair-on" : " fair-off"}`}>
                            <span className="bar">
                              <i style={{ width: pct(r.raw_share) }} />
                            </span>
                            <span className="pct">{pct(r.raw_share)}</span>
                          </div>
                        </td>
                        <td>
                          <div className={`share${mode === "normalized" ? " fair-on" : " fair-off"}`}>
                            <span className="bar">
                              <i style={{ width: pct(r.normalized_share) }} />
                            </span>
                            <span className="pct">{pct(r.normalized_share)}</span>
                          </div>
                        </td>
                        <td className="num">
                          {/* CMP-delta */}
                          <span className={`delta ${deltaClass(r.delta)}`}>{deltaLabel(r.delta)}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="col-3 grid fair-side">
              <div className="card metric">
                <div className="ml">두 방식의 1위</div>
                <div className="mv fair-verdict">{rankingDiverges ? "갈림" : "일치"}</div>
                <div className="md">
                  {rankingDiverges ? (
                    <>
                      원시 <b>{leadRaw?.subject}</b> ↔ 정규화 <b>{leadNorm?.subject}</b> — 정규화하면
                      순위가 뒤집힙니다. 수집 편중을 의심할 근거입니다.
                    </>
                  ) : (
                    <>
                      두 방식 모두 <b>{leadNorm?.subject}</b> 가 1위입니다 — 이 급등은 정규화 이후에도
                      남습니다.
                    </>
                  )}
                </div>
              </div>

              {/* CMP-kv — 세는 기준. */}
              <div className="card">
                <div className="card-h">
                  <h3>세는 기준</h3>
                </div>
                <div className="card-b">
                  <div className="kv">
                    <span className="k">기준 버킷</span>
                    <span className="v mono">{data.basis.time_bucket}</span>
                  </div>
                  <div className="kv">
                    <span className="k">버킷 단위</span>
                    <span className="v">{unitLabel}</span>
                  </div>
                  <div className="kv">
                    <span className="k">원시 총 건수</span>
                    <span className="v mono">{data.basis.raw_total}건</span>
                  </div>
                  <div className="kv">
                    <span className="k">정규화 기준</span>
                    {/* CMP-badge */}
                    <span className="v">
                      <span className="badge b-neu">{data.basis.method}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* CMP-note — 열지 못한 한 단계의 사유. 링크를 달지 않는다. */}
              <div className="note">
                <div>
                  <b>소스별 기여 분해</b>는 아직 열 수 없습니다. Gold 레코드의 키가{" "}
                  <span className="mono">(대상 · 축 · 버킷)</span> 이라 <b>수집원 차원이 없고</b>,
                  수집원별 원시 건수·정규화 후 기여를 내려면 집계 산출에 차원을 하나 더해야 합니다.
                  없는 분해를 지어내는 대신 없다고 적습니다.
                </div>
              </div>
            </div>
          </div>

          {/* CMP-ranklist — 기여 뉴스. 고른 대상의 값을 만든 개별 기사들(AC3.10). */}
          <div className="card art-card">
            <div className="card-h">
              <h3>기여 뉴스</h3>
              <span className="sub">
                이 데이터 포인트를 만든 개별 기사 · {subject} · {bucket} ({unitLabel} 단위)
              </span>
              <div className="r">
                <span className="tag art-count">
                  {contrib ? `목록 ${contrib.basis.total}건 · 원시 카운트 ${contrib.basis.raw_count}건` : "불러오는 중…"}
                </span>
              </div>
            </div>
            <div className="card-b">
              <div className="formrow art-filters">
                <label className="fld art-src">
                  <span className="fl">수집원으로 좁히기</span>
                  <select
                    name="art-source"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                  >
                    <option value={ALL_SOURCES}>전체 ({contrib?.basis.total ?? 0}건)</option>
                    {sources.map((sc) => (
                      <option key={sc.source_id} value={sc.source_id}>
                        {sc.source_id} ({sc.listed}건)
                      </option>
                    ))}
                  </select>
                </label>
                <label className="chk art-dup">
                  <input
                    type="checkbox"
                    name="art-dup-only"
                    checked={dupOnly}
                    onChange={(e) => setDupOnly(e.target.checked)}
                  />
                  본문 중복으로 잡힌 것만
                </label>
              </div>

              {contribError && (
                <div className="note">
                  <div>
                    <b>기여 기사 조회 실패:</b> {contribError}
                  </div>
                </div>
              )}

              {contrib && !reconciles && (
                <div className="note art-mismatch">
                  <div>
                    <b>목록 건수가 원시 카운트와 다릅니다.</b> 목록 {contrib.basis.total}건 ↔ 원시 카운트{" "}
                    {contrib.basis.raw_count}건 — 둘이 갈리면 이 목록은 화면의 값을 설명하지 못합니다.
                    수를 맞춰 보이려고 목록을 깎지 않고, 갈렸다고 적습니다.
                  </div>
                </div>
              )}

              {contrib && articles.length === 0 && (
                <div className="placeholder-note">
                  {dupOnly
                    ? "본문 중복으로 잡힌 기사가 이 목록에 없습니다."
                    : "이 값에 기여한 기사가 없습니다 — 빈 목록을 지어내지 않습니다."}
                </div>
              )}

              <div className="art-list">
                {articles.map((row) => (
                  <div className="art-row" key={row.record_id}>
                    <div className="art-head">
                      <span className="art-title">{row.title}</span>
                      {row.body_duplicate && (
                        <span className="badge b-neu art-dup-badge">본문 중복 {row.body_shares}건</span>
                      )}
                    </div>
                    <div className="art-meta">
                      <span className="meta">수집원 {row.source_id}</span>
                      <span className="meta">수집 {row.collected_at}</span>
                      <span className="meta mono">{row.record_id}</span>
                    </div>
                    <div className="art-links">
                      <a className="btn sm" href={row.source_url} target="_blank" rel="noreferrer">
                        원문 열기 ↗
                      </a>
                      <Link className="btn sm" to={`/trace?record_id=${encodeURIComponent(row.record_id)}`}>
                        원문 역추적 →
                      </Link>
                      {!row.body_available && <span className="meta">수집 시점 본문 미확보</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "JRN-spike-verification", text: "여정" },
              { value: "STP-check-normalized · STP-drilldown-articles", text: "단계" },
              { value: "AC3.1 · AC3.8 · AC3.10", text: "정규화 · 구분 표기 · 기여 기사" },
              { text: `${rows.length}개 대상 · ${data.basis.raw_total}건` },
              { text: `${subject} 기여 기사 ${contrib?.basis.total ?? 0}건` },
            ]}
          />
        </>
      )}
    </>
  );
}
