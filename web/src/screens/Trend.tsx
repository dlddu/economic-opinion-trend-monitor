import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Axis, TrendResponse, TrendSeries } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// AC3.5 — one subject's interest over time, with the axis's other leaders laid
// over it (J1 / V1).
//
// Two things make the chart readable as *evidence* rather than decoration.
// First, every series is drawn against one scale and one x axis: the bucket
// list comes from the API, so a subject missing from a bucket leaves a gap
// instead of sliding its neighbours left, and a line twice as high is twice the
// share no matter which subject it belongs to. Second, picking a subject is a
// round trip — the API decides which comparison subjects ride along, so this
// screen and the dashboard can never disagree about who is leading.

const AXES: Axis[] = ["KR", "US", "GLOBAL"];

// Plot box inside the viewBox. Shares map linearly onto [Y_ZERO, Y_TOP].
const VIEW_W = 740;
const VIEW_H = 270;
const X_LEFT = 56;
const X_RIGHT = 716;
const Y_TOP = 20;
const Y_ZERO = 220;
const GRID_LINES = 5;

/** Series colours: the selected line is the brand ink, comparisons are the muted axis hues. */
const SERIES_COLORS = ["var(--ax-us)", "var(--ax-gl)", "var(--ink-3)"];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

/** Bucket labels are ISO prefixes ("2026-06-23T14"); show the trailing part. */
function bucketTick(bucket: string): string {
  const t = bucket.indexOf("T");
  return t >= 0 ? `${bucket.slice(t + 1)}시` : bucket;
}

/** Round the ceiling up to a whole 5%p so the gridlines land on readable numbers. */
function scaleTop(series: TrendSeries[]): number {
  const max = Math.max(...series.flatMap((s) => s.points.map((p) => p.normalized_share)), 0);
  return Math.max(0.05, Math.ceil(max / 0.05) * 0.05);
}

function xFor(index: number, count: number): number {
  if (count <= 1) {
    return (X_LEFT + X_RIGHT) / 2;
  }
  return X_LEFT + ((X_RIGHT - X_LEFT) * index) / (count - 1);
}

function yFor(share: number, top: number): number {
  return Y_ZERO - (Y_ZERO - Y_TOP) * (share / top);
}

export function Trend() {
  const [data, setData] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The dashboard hands a subject over through the URL, so the query string —
  // not component state — is where the selection lives: the same link always
  // opens the same view.
  const [params, setParams] = useSearchParams();
  const queried = params.get("axis");
  const axis: Axis = AXES.includes(queried as Axis) ? (queried as Axis) : "KR";
  const subject = params.get("subject") ?? undefined;

  const pick = (next: string) => {
    setParams({ axis, subject: next }, { replace: true });
  };

  useEffect(() => {
    let active = true;
    api
      .trend(axis, subject)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis, subject]);

  if (error) {
    return (
      <div className="note">
        <div>
          <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
        </div>
      </div>
    );
  }
  if (!data) {
    return <div className="placeholder-note">불러오는 중…</div>;
  }

  const selected = data.series.find((s) => s.selected);
  const buckets = data.basis.buckets;
  const top = scaleTop(data.series);

  return (
    <>
      <p className="lede">
        <span className="b">{data.subject || "선택된 대상 없음"}</span>의 시간대별 관심도 추세를 추적하고,{" "}
        <span className="b">상위 대상들을 겹쳐</span> 어디로 관심이 이동하는지 비교합니다.
      </p>

      {buckets.length === 0 && <div className="placeholder-note">집계된 시계열이 없습니다.</div>}

      {buckets.length > 0 && (
        <div className="grid">
          <section className="card col-7 trendchart">
            <div className="card-h">
              <h3>관심 점유율 추세</h3>
              <span className="sub">
                {UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit} 단위 · 정규화 비율(%)
              </span>
              <div className="r">{data.basis.normalized && <span className="norm-flag">▣ 정규화</span>}</div>
            </div>
            <div className="card-b">
              <Chart series={data.series} buckets={buckets} top={top} />
              <div className="legend trend-legend">
                {data.series.map((s, i) => (
                  <span key={s.subject}>
                    <span className="d" style={{ background: colorOf(s, i), borderRadius: 2 }} />
                    {s.subject}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <div className="col-5 grid trend-side">
            <section className="card col-12 metric trend-metric">
              <div className="card-b">
                <div className="ml">선택 대상 현재 점유율</div>
                <div className="mv">
                  {selected ? pct(selected.latest_share) : "—"}
                </div>
                <div className="md">
                  <span className={`delta ${deltaClass(selected?.delta ?? 0)}`}>
                    {deltaText(selected?.delta ?? 0)}
                  </span>
                  직전 {UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit} 대비
                </div>
              </div>
            </section>

            <section className="card col-12 trend-pick">
              <div className="card-h">
                <h3>비교 대상</h3>
                <span className="sub">눌러서 선택</span>
              </div>
              <div className="card-b">
                {data.series.map((s, i) => (
                  <button
                    key={s.subject}
                    type="button"
                    className="kv trend-pick-item"
                    data-subject={s.subject}
                    data-selected={s.selected}
                    aria-pressed={s.selected}
                    onClick={() => pick(s.subject)}
                  >
                    <span className="k">
                      <span className="d" style={{ background: colorOf(s, i), borderRadius: 2 }} />
                      {s.subject}
                    </span>
                    <span className="v">
                      {pct(s.latest_share)}{" "}
                      <span className={`dlt mono delta ${deltaClass(s.delta)}`}>{deltaMark(s.delta)}</span>
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      <MapStrip
        chips={[
          { value: "J1", text: "대상 추세 상세" },
          { value: "V1", text: "시계열 추세 가시화", kind: "v" },
          { text: "AC3.5" },
        ]}
      />
    </>
  );
}

function colorOf(series: TrendSeries, index: number): string {
  if (series.selected) {
    return "var(--primary)";
  }
  return SERIES_COLORS[index % SERIES_COLORS.length];
}

function deltaClass(delta: number): string {
  if (delta > 0) return "up";
  if (delta < 0) return "dn";
  return "fl";
}

function deltaText(delta: number): string {
  return `${deltaMark(delta)} ${Math.abs(delta).toFixed(1)}%p`;
}

function deltaMark(delta: number): string {
  if (delta > 0) return "▲";
  if (delta < 0) return "▼";
  return "–";
}

function Chart({
  series,
  buckets,
  top,
}: {
  series: TrendSeries[];
  buckets: string[];
  top: number;
}) {
  const index = new Map(buckets.map((b, i) => [b, i]));
  const gridY = Array.from({ length: GRID_LINES }, (_, i) => Y_TOP + ((Y_ZERO - Y_TOP) * i) / GRID_LINES);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" style={{ display: "block" }} role="img">
      <g className="trend-grid">
        {gridY.map((y, i) => (
          <g key={y}>
            <line className="gridline" x1={X_LEFT} y1={y} x2={X_RIGHT} y2={y} />
            <text className="axlab" x={X_LEFT - 8} y={y + 4} textAnchor="end">
              {((top * (1 - i / GRID_LINES)) * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <line className="gridline zero" x1={X_LEFT} y1={Y_ZERO} x2={X_RIGHT} y2={Y_ZERO} />
        <text className="axlab" x={X_LEFT - 8} y={Y_ZERO + 4} textAnchor="end">
          0
        </text>
      </g>

      <g className="trend-x">
        {buckets.map((b, i) => (
          <text
            key={b}
            className="axlab"
            data-bucket={b}
            x={xFor(i, buckets.length)}
            y={Y_ZERO + 20}
            textAnchor="middle"
          >
            {bucketTick(b)}
          </text>
        ))}
      </g>

      {series.map((s, i) => (
        <polyline
          key={s.subject}
          className="tseries"
          data-subject={s.subject}
          data-selected={s.selected}
          fill="none"
          stroke={colorOf(s, i)}
          strokeWidth={s.selected ? 2.6 : 2}
          points={s.points
            .map((p) => `${xFor(index.get(p.time_bucket) ?? 0, buckets.length)},${yFor(p.normalized_share, top)}`)
            .join(" ")}
        />
      ))}
    </svg>
  );
}
