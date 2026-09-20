import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { Axis, TrendResponse, TrendSeries } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// The chart's job is to answer "where is attention moving", so the selected
// subject is drawn against the axis's other leaders rather than alone; a
// single line has nothing to be high or low against.
//
// Two things are deliberately *not* here:
//
//   - A 시간/일/주 switch. Gold carries all three units now (AC3.3), but
//     /api/trend settles on one itself and takes no ?unit= parameter, so the
//     control would have nothing to switch with. The design tracker calls a
//     switch with nothing behind it a 허위 컨트롤 (the normalization toggle is
//     registered as unimplemented for exactly that reason), so the bucket unit
//     is rendered as a static reflection of the basis the API answered on.
//   - A 대상 추가 button. Which subjects are comparable is the API's ranking,
//     not a free-form pick, and there is no endpoint behind "add an arbitrary
//     subject" yet. Selecting one of the compared subjects is real, so that is
//     what the comparison list does.

const AXES: { id: Axis; label: string; pill: string }[] = [
  { id: "KR", label: "한국", pill: "ax-kr" },
  { id: "US", label: "미국", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계", pill: "ax-gl" },
];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

// Line colours: the selected subject takes the brand ink, the rest take the
// neutral axis tones so the highlight reads at a glance.
const COMPARE_STROKES = ["var(--ax-us)", "var(--ax-gl)", "var(--ink-3)"];

// Chart box, in the mockup's viewBox coordinates.
const VIEW_W = 740;
const VIEW_H = 270;
const PLOT_L = 56;
const PLOT_R = 716;
const PLOT_TOP = 20;
const BASELINE = 220;
const GRID_ROWS = 5;

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

// 구간 평균 — 목업 `STP-drill-trend` 비교 표의 3번째 컬럼. 서빙에 새로 물을 것이 없다:
// 그려지는 구간의 버킷 값은 이미 `points[]` 로 와 있고, 목업 인라인 스크립트도 같은
// 자리에서 `avg(s.s)` 로 계산한다. 현재 점유율(마지막 버킷)과 나란히 놓여야 "지금이
// 평소보다 높은가"가 한 줄에서 읽힌다.
function windowMean(series: TrendSeries): number {
  if (series.points.length === 0) return 0;
  return series.points.reduce((sum, p) => sum + p.normalized_share, 0) / series.points.length;
}

function deltaClass(delta: number): string {
  if (delta > 0) return "up";
  if (delta < 0) return "dn";
  return "fl";
}

function deltaLabel(delta: number): string {
  if (delta > 0) return `▲ ${delta.toFixed(1)}%p`;
  if (delta < 0) return `▼ ${Math.abs(delta).toFixed(1)}%p`;
  return "–";
}

/** Bucket keys are ISO prefixes; the axis only needs the part that varies. */
function bucketTick(bucket: string, unit: string): string {
  if (unit === "hour") return bucket.length >= 13 ? `${bucket.slice(11, 13)}시` : bucket;
  return bucket.slice(5) || bucket;
}

function strokeFor(series: TrendSeries, compareIndex: number): string {
  return series.selected ? "var(--primary)" : COMPARE_STROKES[compareIndex % COMPARE_STROKES.length];
}

export function Trend() {
  const [axis, setAxis] = useState<Axis>("KR");
  const [subject, setSubject] = useState<string | undefined>(undefined);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .trend(axis, subject)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis, subject]);

  const axisDef = AXES.find((a) => a.id === axis) ?? AXES[0];
  const selected = data?.series.find((s) => s.selected) ?? null;
  const unitLabel = data ? (UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit) : "";

  return (
    <>
      <div className="dash-controls">
        {/* CMP-seg — the axis switch is live, so it is drawn as a control. */}
        <div className="seg">
          {AXES.map((a) => (
            <button
              key={a.id}
              className={axis === a.id ? "on" : ""}
              onClick={() => {
                setAxis(a.id);
                // Subjects are per axis; carrying a selection across would ask
                // for a subject the new axis may never have seen.
                setSubject(undefined);
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
        <span className="norm-flag">▣ 정규화 비율</span>
      </div>

      <p className="lede">
        {selected ? <span className="b">{selected.subject}</span> : "선택한 대상"}의 관심도 추세를 추적하고,{" "}
        <span className="b">같은 축의 상위 대상</span>과 겹쳐 어디로 관심이 이동하는지 비교합니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && data.series.length === 0 && (
        <div className="placeholder-note trend-empty">
          {axisDef.label} 축에 집계된 버킷이 없습니다. 빈 차트를 0%로 그리지 않고 <b>그리지 않습니다</b> — 집계가
          없는 것과 관심이 0인 것은 다릅니다.
        </div>
      )}

      {data && data.series.length > 0 && (
        <>
          <div className="grid g-12">
            <div className="card col-9">
              <div className="card-h">
                <h3>관심 점유율 추세</h3>
                <span className="sub">
                  {unitLabel} 단위 · 정규화 비율(%) · {data.basis.first_bucket} ~ {data.basis.latest_bucket}
                </span>
                <div className="r">
                  <span className="norm-flag">▣ 정규화</span>
                </div>
              </div>
              <div className="card-b">
                <TrendChart data={data} />
                {/* CMP-legend */}
                <div className="legend trend-legend">
                  {data.series.map((s, i) => (
                    <span key={s.subject}>
                      <i
                        className="d"
                        style={{ background: strokeFor(s, compareIndex(data.series, i)) }}
                      />
                      {s.subject}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-3 grid trend-side">
              <div className="card metric">
                <div className="ml">선택 대상 현재 점유율</div>
                <div className="mv">
                  {selected ? (selected.latest_share * 100).toFixed(1) : "—"}
                  <span className="small"> %</span>
                </div>
                <div className="md">
                  {/* CMP-delta */}
                  <span className={`delta ${deltaClass(selected?.delta ?? 0)}`}>
                    {deltaLabel(selected?.delta ?? 0)}
                  </span>{" "}
                  직전 {unitLabel} 대비
                </div>
              </div>

              <div className="note">
                <div>
                  이 차트는 <b>{unitLabel} 단위</b> 버킷으로 그려졌습니다. 일·주 롤업도 집계되지만
                  서빙 API 가 단위를 고르는 파라미터를 받지 않아 전환 컨트롤을 두지 않았습니다.{" "}
                  <span className="mono trend-ac">AC3.3</span>
                </div>
              </div>
            </div>

            {/* 상위 대상 비교 — 목업 `STP-drill-trend` 의 「상위 대상 비교」 표.
                행 클릭이 대상 선택이라 별도 picker 를 두지 않는다 (AC3.5 대상 선택). */}
            <div className="card col-12">
              <div className="card-h">
                <h3>상위 대상 비교</h3>
                <span className="sub">같은 기간 · 같은 축</span>
              </div>
              <div className="card-b trend-cmp">
                {/* CMP-table */}
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>대상</th>
                      <th className="num">현재 점유율</th>
                      <th className="num">구간 평균</th>
                      <th className="num">직전 {unitLabel} 대비</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.series.map((s, i) => (
                      <tr
                        key={s.subject}
                        className={`click${s.selected ? " on" : ""}`}
                        aria-selected={s.selected}
                        onClick={() => setSubject(s.subject)}
                      >
                        <td>
                          <i
                            className="d"
                            style={{ background: strokeFor(s, compareIndex(data.series, i)) }}
                          />
                          {s.subject}
                        </td>
                        <td className="num">{pct(s.latest_share)}</td>
                        <td className="num">{pct(windowMean(s))}</td>
                        <td className="num">
                          <span className={`delta ${deltaClass(s.delta)}`}>
                            {deltaLabel(s.delta)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "J1", text: "단계 3 대상 선택" },
              { value: "J1", text: "단계 4 상위 대상 비교" },
              { value: "V1", text: "시계열 추세 가시화", kind: "v" },
              { text: "AC3.5 · AC3.2" },
            ]}
          />
        </>
      )}
    </>
  );
}

/** Position of a series among the *unselected* ones, for colour assignment. */
function compareIndex(series: TrendSeries[], index: number): number {
  let n = 0;
  for (let i = 0; i < index; i += 1) {
    if (!series[i].selected) n += 1;
  }
  return n;
}

// PAT-line-chart — 시계열 라인 차트. Drawn from the API's bucket list so every
// line shares one x-axis: a subject missing a bucket leaves a gap in its
// polyline rather than sliding its later points left, which would draw a
// different subject's timeline under the same ticks.
function TrendChart({ data }: { data: TrendResponse }) {
  const buckets = data.basis.buckets;
  const peak = Math.max(...data.series.flatMap((s) => s.points.map((p) => p.normalized_share)), 0.01);
  // Round the ceiling up to a whole percentage point so the gridline labels are
  // readable numbers instead of whatever the maximum happened to be.
  const top = Math.ceil(peak * 100) / 100;

  const x = (i: number) =>
    buckets.length > 1
      ? PLOT_L + (i * (PLOT_R - PLOT_L)) / (buckets.length - 1)
      : (PLOT_L + PLOT_R) / 2;
  const y = (share: number) => BASELINE - (share / top) * (BASELINE - PLOT_TOP);

  const rows = Array.from({ length: GRID_ROWS + 1 }, (_, i) => {
    const share = (top * (GRID_ROWS - i)) / GRID_ROWS;
    return { share, y: y(share), zero: i === GRID_ROWS };
  });

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      className="trend-chart"
      role="img"
      aria-label={`${data.subject} 관심 점유율 추세`}
    >
      <g>
        {rows.map((r) => (
          <g key={r.share}>
            <line className={`gridline${r.zero ? " zero" : ""}`} x1={PLOT_L} y1={r.y} x2={PLOT_R} y2={r.y} />
            <text className="axlab" x={PLOT_L - 8} y={r.y + 4} textAnchor="end">
              {r.zero ? "0" : `${(r.share * 100).toFixed(0)}%`}
            </text>
          </g>
        ))}
      </g>
      <g>
        {buckets.map((b, i) => (
          <text key={b} className="axlab" x={x(i)} y={BASELINE + 20} textAnchor="middle">
            {bucketTick(b, data.basis.bucket_unit)}
          </text>
        ))}
      </g>
      {data.series.map((s, seriesIndex) => {
        const byBucket = new Map(s.points.map((p) => [p.time_bucket, p.normalized_share]));
        const points = buckets
          .map((b, i) => (byBucket.has(b) ? `${x(i)},${y(byBucket.get(b) ?? 0)}` : null))
          .filter((p): p is string => p !== null)
          .join(" ");
        const stroke = strokeFor(s, compareIndex(data.series, seriesIndex));
        return (
          <g key={s.subject}>
            <polyline
              fill="none"
              stroke={stroke}
              strokeWidth={s.selected ? 2.6 : 2}
              strokeDasharray={s.selected ? undefined : "2 4"}
              points={points}
            />
            {s.selected && byBucket.has(buckets[buckets.length - 1]) && (
              <circle
                fill={stroke}
                cx={x(buckets.length - 1)}
                cy={y(byBucket.get(buckets[buckets.length - 1]) ?? 0)}
                r={4.5}
              />
            )}
          </g>
        );
      })}
    </svg>
  );
}
