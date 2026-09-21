import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Axis, FairnessResponse, FairnessRow } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// 급등 검증의 첫 갈래: 이 급등은 관심이 몰린 것인가, 한 수집원이 쏟아낸 것인가.
//
// 순위 하나로는 답할 수 없고 **대조**가 답한다. 그래서 이 화면의 중심은 표가
// 아니라 같은 대상을 두 가지로 센 결과를 나란히 놓는 것이다 — 집계가 계산한
// 정규화 비율(소스 안에서 점유율을 먼저 내고 축으로 결합, AC3.1)과 독자가 원시
// 건수를 그냥 나눴다면 얻었을 순진한 카운트 점유율. 원시에서 앞서고 정규화에서
// 밀리는 대상이 곧 「한 매체의 편집 결정」이다.
//
// 목업이 그리는 여섯 단계 중 이 화면이 여는 것은 `STP-check-normalized` 하나이고,
// 나머지 둘은 **데이터가 없어서** 열지 않는다(허위 컨트롤 금지 — 슬라이스 5·6 의
// 선례):
//
//   - `STP-inspect-sources` 소스별 기여 분해. Gold 의 키는
//     (subject, axis, bucket_unit, time_bucket) 라 **수집원 차원 자체가 없다**.
//     지어내면 그 순간 화면이 거짓을 말한다.
//   - `STP-drilldown-articles` 기여 뉴스 목록. **이 대상에 기여한 기사들**을 추리려면
//     대상 ↔ 기사의 대응이 있어야 하는데, 그 대응은 위와 같은 이유로 없다 —
//     Gold 가 대상 단위로 뭉개 놓았고 어느 기사가 얼마를 보탰는지는 남지 않는다.
//     (슬라이스 9 이후 `/api/trace` 로 **개별 레코드 하나**를 내려가는 길은 열렸지만,
//     그것은 record_id 를 이미 아는 경우다. 목록을 뽑는 것과는 다른 문제다.)
//
// 둘 다 링크도 버튼도 두지 않고, 왜 없는지를 화면 안 note 로 밝힌다 — 빈 화면으로
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

export function Fairness() {
  const [axis, setAxis] = useState<Axis>("KR");
  const [mode, setMode] = useState<Mode>("normalized");
  const [data, setData] = useState<FairnessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
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
                      <tr key={r.subject}>
                        <td>{r.subject}</td>
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

              {/* CMP-note — 열지 못한 두 단계의 사유. 링크를 달지 않는다. */}
              <div className="note">
                <div>
                  <b>소스별 기여 분해</b>와 <b>기여 뉴스 목록</b>은 아직 열 수 없습니다. Gold 레코드의
                  키가 <span className="mono">(대상 · 축 · 버킷)</span> 이라 <b>수집원 차원이 없고</b>,
                  개별 기사는 Bronze/Silver 조인이 필요한데 서빙에 그 경로가 없습니다. 없는 분해를
                  지어내는 대신 없다고 적습니다.
                </div>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "JRN-spike-verification", text: "여정" },
              { value: "STP-check-normalized", text: "단계" },
              { value: "AC3.1 · AC3.8", text: "정규화 · 구분 표기" },
              { text: `${rows.length}개 대상 · ${data.basis.raw_total}건` },
            ]}
          />
        </>
      )}
    </>
  );
}
