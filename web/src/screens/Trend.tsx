import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AxisScope, TrendResponse, TrendSeries } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

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

const AXES: { id: AxisScope; label: string; pill: string }[] = [
  { id: "ALL", label: "전체", pill: "ax-all" },
  { id: "KR", label: "한국", pill: "ax-kr" },
  { id: "US", label: "미국", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계", pill: "ax-gl" },
];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

const COMPARE_STROKES = ["var(--ax-us)", "var(--ax-gl)", "var(--ink-3)"];

// Chart box, in the mockup's viewBox coordinates.
const VIEW_W = 740;
const VIEW_H = 270;
const PLOT_L = 56;
const PLOT_R = 716;
const PLOT_TOP = 20;
const BASELINE = 220;
const GRID_ROWS = 5;
// 시간 단위는 버킷이 수십~수백 개라 버킷마다 라벨을 찍으면 글자가 겹쳐 읽을 수 없다.
const MAX_X_TICKS = 7;

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

// 현재 점유율(마지막 버킷)과 나란히 놓여야 "지금이 평소보다 높은가"가 한 줄에서
// 읽힌다 — 두 값이 갈릴 때에만 구간 평균 컬럼이 무언가를 말한다.
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

function bucketTick(bucket: string, unit: string, multiDay: boolean): string {
  if (unit === "hour") {
    if (bucket.length < 13) return bucket;
    const hour = `${bucket.slice(11, 13)}시`;
    return multiDay ? `${bucket.slice(5, 10)} ${hour}` : hour;
  }
  return bucket.slice(5) || bucket;
}

function tickIndices(count: number, max: number): number[] {
  if (count <= max) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: max }, (_, i) => Math.round((i * (count - 1)) / (max - 1)));
}

function niceStep(peakPct: number, rows: number): number {
  const raw = peakPct / rows;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const factor = [1, 2, 2.5, 5, 10].find((f) => f * magnitude >= raw - 1e-9) ?? 10;
  return factor * magnitude;
}

function stepDecimals(stepPct: number): number {
  for (let d = 0; d < 6; d += 1) {
    const scaled = stepPct * 10 ** d;
    if (Math.abs(scaled - Math.round(scaled)) < 1e-6) return d;
  }
  return 6;
}

function strokeFor(series: TrendSeries, compareIndex: number): string {
  return series.selected ? "var(--primary)" : COMPARE_STROKES[compareIndex % COMPARE_STROKES.length];
}

// 그려질 계열 — 목업 `JRN-daily-scan.html` 의 `trendSeries()` 와 같은 규칙이다.
function drawnSeries(series: TrendSeries[], overlay: boolean): TrendSeries[] {
  if (overlay) return series;
  const selected = series.filter((s) => s.selected);
  return selected.length > 0 ? selected : series.slice(0, 1);
}

// 수명은 같은 복원 계약의 `dash` 표면(`Dashboard.tsx` 의 `BRIEF_KEY` 앞 주석이 근거의 주인)과 같다 —
// 한 계약의 두 표면이 다른 수명을 가지면 「닫을 때의 조건」이 화면마다 다른 닫음을 뜻하므로 `localStorage`.
const VIEW_KEY = "econ-monitor:trend:view";

type StoredView = { axis: AxisScope; subject?: string };

function readStoredView(): StoredView | null {
  try {
    const raw = localStorage.getItem(VIEW_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredView;
    return AXES.some((a) => a.id === parsed.axis) ? parsed : null;
  } catch {
    // 스토리지가 막힌 브라우저에서도 화면은 그대로 열려야 한다 — 복원만 포기한다.
    return null;
  }
}

function storeView(view: StoredView): void {
  try {
    localStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // 같은 이유로 조용히 넘어간다. 저장 실패는 조회를 막지 않는다.
  }
}

function parseAxis(raw: string | null): AxisScope | undefined {
  return AXES.find((a) => a.id === raw)?.id;
}

function entryView(params: URLSearchParams, restored: StoredView | null): Partial<StoredView> {
  const axis = parseAxis(params.get("axis"));
  const subject = params.get("subject") || undefined;
  if (axis !== undefined || subject !== undefined) return { axis, subject };
  return restored ?? {};
}

export function Trend() {
  const [params] = useSearchParams();
  const restored = useState(readStoredView)[0];
  const entry = useState(() => entryView(params, restored))[0];
  const [axis, setAxis] = useState<AxisScope>(entry.axis ?? "KR");
  const [subject, setSubject] = useState<string | undefined>(entry.subject);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overlay, setOverlay] = useState(false);

  useEffect(() => {
    storeView({ axis, subject });
  }, [axis, subject]);

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
  const drawn = drawnSeries(data?.series ?? [], overlay);
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
                <form className="trend-ov-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="trend-ov-row">
                    <label className="trend-ov-chk">
                      <input
                        type="checkbox"
                        name="tr-compare"
                        checked={overlay}
                        onChange={(e) => setOverlay(e.target.checked)}
                      />
                      상위 대상 3개를 겹쳐 보기
                    </label>
                  </div>
                </form>
                <TrendChart data={data} series={drawn} />
                {/* CMP-legend — 범례는 그려진 선만 말한다. 그리지 않은 대상을 범례가
                    이름 붙이면 차트와 범례가 서로 다른 집합을 가리킨다. */}
                <div className="legend trend-legend">
                  {drawn.map((s) => (
                    <span key={s.subject}>
                      <i
                        className="d"
                        style={{ background: strokeFor(s, compareIndex(data.series, data.series.indexOf(s))) }}
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
function TrendChart({ data, series }: { data: TrendResponse; series: TrendSeries[] }) {
  const buckets = data.basis.buckets;
  // 세로 스케일은 **응답 전체**에서 잡는다 — 겹쳐 보기를 켜고 끌 때 같은 대상의 선이
  // 오르내리면 토글이 값의 변화처럼 읽힌다. 눈금은 고정하고 선만 늘고 준다.
  const peak = Math.max(...data.series.flatMap((s) => s.points.map((p) => p.normalized_share)), 0);
  // 천장을 정수 %p 로 올리고 칸을 고르게 나누면 간격이 0.4%p 처럼 떨어져 반올림한 라벨이
  // 겹친다(「2% 2% 1% 1% 0%」). 간격부터 1·2·2.5·5 단위로 잡고 천장을 그 배수로 올린다.
  const peakPct = peak > 0 ? peak * 100 : 1;
  const stepPct = niceStep(peakPct, GRID_ROWS);
  const rowCount = Math.max(1, Math.ceil(peakPct / stepPct - 1e-9));
  const top = (rowCount * stepPct) / 100;
  const decimals = stepDecimals(stepPct);

  const x = (i: number) =>
    buckets.length > 1
      ? PLOT_L + (i * (PLOT_R - PLOT_L)) / (buckets.length - 1)
      : (PLOT_L + PLOT_R) / 2;
  const y = (share: number) => BASELINE - (share / top) * (BASELINE - PLOT_TOP);

  const rows = Array.from({ length: rowCount + 1 }, (_, i) => {
    const pctValue = stepPct * (rowCount - i);
    return { share: pctValue / 100, label: `${pctValue.toFixed(decimals)}%`, zero: i === rowCount };
  });

  const unit = data.basis.bucket_unit;
  const multiDay =
    unit === "hour" && buckets.length > 0 && buckets[0].slice(0, 10) !== buckets[buckets.length - 1].slice(0, 10);
  const ticks = tickIndices(buckets.length, MAX_X_TICKS);

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
          <g key={r.label}>
            <line className={`gridline${r.zero ? " zero" : ""}`} x1={PLOT_L} y1={y(r.share)} x2={PLOT_R} y2={y(r.share)} />
            <text className="axlab" x={PLOT_L - 8} y={y(r.share) + 4} textAnchor="end">
              {r.zero ? "0" : r.label}
            </text>
          </g>
        ))}
      </g>
      <g>
        {ticks.map((i) => (
          <text
            key={buckets[i]}
            className="axlab"
            x={x(i)}
            y={BASELINE + 20}
            // 날짜가 붙은 마지막 라벨은 가운데 정렬이면 도화지 오른쪽 밖으로 잘린다.
            textAnchor={multiDay && i === buckets.length - 1 && i > 0 ? "end" : "middle"}
          >
            {bucketTick(buckets[i], unit, multiDay)}
          </text>
        ))}
      </g>
      {series.map((s) => {
        const byBucket = new Map(s.points.map((p) => [p.time_bucket, p.normalized_share]));
        const points = buckets
          .map((b, i) => (byBucket.has(b) ? `${x(i)},${y(byBucket.get(b) ?? 0)}` : null))
          .filter((p): p is string => p !== null)
          .join(" ");
        // 색은 **응답 순서** 기준이다. 겹쳐 보기를 켜도 이미 보던 대상의 색이 바뀌지
        // 않아야 토글이 대상을 바꾼 것처럼 보이지 않는다.
        const stroke = strokeFor(s, compareIndex(data.series, data.series.indexOf(s)));
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
