import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type {
  Axis,
  SentimentAxisRow,
  SentimentDistribution,
  SentimentPoint,
  SentimentResponse,
} from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// The screen answers two questions that need different shapes: "what is the
// mood right now, and is it the same on every axis" (one bucket, three axes)
// and "is it moving" (one axis, every bucket). So the composition and the
// comparison are read at the API's single basis bucket, and the trend is the
// selected axis stacked over time.
//
// 미분석 is never folded into the four classes anywhere on this screen. The
// ratios are over the analyzed items — that is what the aggregation computed —
// so a bar that mixed them would quietly restate 40% of the analyzed half as
// 40% of everything. It is drawn as its own segment, its own legend entry, and
// its own figure beside the donut.
//
// Two things the mockup draws that are deliberately *not* here, following the
// precedent slice 5 set for 허위 컨트롤 (a control with nothing behind it):
//
//   - A 기간/단위(시간·일·주) form. Gold holds day and week rows now (AC3.3),
//     but /api/sentiment takes neither a unit nor a period parameter, so the
//     form would have nothing to submit. The unit reflects the basis instead.
//   - A 서술 대상 picker with a per-subject donut. Gold's sentiment record is
//     keyed by (axis, bucket) — there is no per-subject distribution to show,
//     and inventing one by reusing the axis's would be a fabricated number.
//     AC3.6 reads "서술 대상 **또는 축** 단위", so the axis is the honest unit
//     here; the per-subject view waits for a per-subject aggregate.

const AXES: { id: Axis; label: string; pill: string }[] = [
  { id: "KR", label: "한국", pill: "ax-kr" },
  { id: "US", label: "미국", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계", pill: "ax-gl" },
];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

const CLASSES = [
  { key: "positive", cls: "s-pos", label: "긍정", color: "var(--pos)" },
  { key: "neutral", cls: "s-neu", label: "중립", color: "var(--neu)" },
  { key: "negative", cls: "s-neg", label: "부정", color: "var(--neg)" },
  { key: "mixed", cls: "s-mix", label: "혼합", color: "var(--mix)" },
] as const;

/** Kept out of CLASSES on purpose: it is a share of the whole, not of the analyzed. */
const UNANALYZED = { key: "unanalyzed", cls: "s-na", label: "미분석", color: "var(--na)" } as const;

// Above this share of a bucket the four ratios rest on too little to read, so
// the screen says so rather than letting a confident-looking bar speak for a
// mostly unanalyzed bucket. A fixed threshold, not a control: the mockup's
// input would only restyle text the reader is already looking at.
const UNANALYZED_NOTICE = 0.1;

function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}

function bucketTick(bucket: string, unit: string): string {
  if (unit === "hour") return bucket.length >= 13 ? `${bucket.slice(11, 13)}시` : bucket;
  return bucket.slice(5) || bucket;
}

/**
 * The four class ratios are scaled by the analyzed share so that classes and
 * 미분석 together make one bar of 100% — the same scaling the dashboard bar uses.
 */
function segments(dist: SentimentDistribution): { cls: string; label: string; color: string; share: number }[] {
  const analyzed = 1 - dist.unanalyzed;
  return [
    ...CLASSES.map((c) => ({
      cls: c.cls,
      label: c.label,
      color: c.color,
      share: dist[c.key] * analyzed,
    })),
    { cls: UNANALYZED.cls, label: UNANALYZED.label, color: UNANALYZED.color, share: dist.unanalyzed },
  ];
}

/** 비율에서 되짚은 건수라 반올림 오차가 1건 범위에서 남을 수 있다. */
function unanalyzedCount(row: SentimentAxisRow): number | null {
  const analyzedShare = 1 - row.distribution.unanalyzed;
  if (analyzedShare <= 0) return null;
  return Math.max(0, Math.round(row.analyzed_total / analyzedShare) - row.analyzed_total);
}

export function Sentiment() {
  const [axis, setAxis] = useState<Axis>("KR");
  const [data, setData] = useState<SentimentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [splitUnanalyzed, setSplitUnanalyzed] = useState(true);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .sentiment(axis)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis]);

  const axisDef = AXES.find((a) => a.id === axis) ?? AXES[0];
  const selected = data ? (data.by_axis.find((r) => r.axis === data.axis) ?? null) : null;
  const unitLabel = data ? (UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit) : "";
  const aggregated = Boolean(data && data.basis.bucket_unit !== "");

  return (
    <>
      <div className="dash-controls">
        {/* CMP-seg — the axis switch is live (the API re-reads Gold per axis). */}
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
        <span className="norm-flag">▣ 분석 완료분 기준</span>
      </div>

      <p className="lede">
        <span className="b">{axisDef.label}</span> 축의 분위기 구성을 보고, 같은 버킷에서{" "}
        <span className="b">세 축이 어떻게 다른지</span> 대조한 뒤, 그 구성이 시간에 따라 움직이는지
        확인합니다. <span className="b">미분석</span>은 네 분류와 합치지 않고 따로 셉니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && !aggregated && (
        <div className="placeholder-note sent-empty">
          집계된 분위기 버킷이 없습니다. 빈 도넛을 0%로 그리지 않고 <b>그리지 않습니다</b> — 집계가 없는
          것과 모든 분위기가 0인 것은 다릅니다.
        </div>
      )}

      {data && aggregated && (
        <>
          <div className="grid g-12">
            <div className="card col-5">
              <div className="card-h">
                <h3>분위기 구성</h3>
                <span className="sub">{data.basis.latest_bucket} 버킷 · {axisDef.label}</span>
              </div>
              <div className="card-b">
                {selected?.present ? (
                  <Donut row={selected} />
                ) : (
                  <div className="note sent-absent">
                    <div>
                      이 버킷에 <b>{axisDef.label}</b> 축 집계가 없습니다. 0%로 그리면 「모두 중립」처럼
                      읽히므로 비워 둡니다.
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card col-7">
              <div className="card-h">
                <h3>축별 분위기</h3>
                <span className="sub">같은 버킷 · 같은 기준</span>
                <div className="r">
                  <span className="norm-flag">▣ 정규화</span>
                </div>
              </div>
              <div className="card-b">
                {data.by_axis.map((row) => (
                  <AxisRow key={row.axis} row={row} />
                ))}
                {/* CMP-legend */}
                <div className="legend sent-legend">
                  {[...CLASSES, UNANALYZED].map((c) => (
                    <span key={c.cls}>
                      <span className="d" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card col-7 sent-split">
              <div className="card-h">
                <h3>분리 전후 비율</h3>
                <span className="sub">체크박스로 전환</span>
              </div>
              <div className="card-b">
                {selected?.present ? (
                  <SplitRatios row={selected} split={splitUnanalyzed} />
                ) : (
                  <div className="note sent-absent">
                    <div>
                      <b>{axisDef.label}</b> 축 집계가 이 버킷에 없어 두 형태를 나란히 놓을 수
                      없습니다.
                    </div>
                  </div>
                )}
                <label className="sent-split-chk">
                  <input
                    type="checkbox"
                    name="na-exclude"
                    checked={splitUnanalyzed}
                    onChange={(e) => setSplitUnanalyzed(e.target.checked)}
                  />
                  미분석 항목을 비율 분모에서 제외 (분리 표기)
                </label>
              </div>
            </div>

            <div className="card col-5 sent-exit">
              <div className="card-h">
                <h3>판별이 어렵다면</h3>
                <span className="sub">다른 흐름으로 넘깁니다</span>
              </div>
              <div className="card-b">
                <p className="sent-exit-lede">
                  분류 자체가 미심쩍으면 원문을 직접 보고, 분류 기준을 바꿔야 한다면 재처리로
                  넘기세요.
                </p>
                <Link className="btn ghost" to="/fairness">
                  정규화 비율로 다시 확인 →
                </Link>
              </div>
            </div>

            <div className="card col-12">
              <div className="card-h">
                <h3>분위기 추세</h3>
                <span className="sub">
                  {unitLabel} 단위 · {data.basis.first_bucket} ~ {data.basis.latest_bucket}
                </span>
                <div className="r">
                  <span className="sent-net">긍정 − 부정 = 순분위기</span>
                </div>
              </div>
              <div className="card-b">
                {data.series.length > 0 ? (
                  <SentimentTimeline series={data.series} unit={data.basis.bucket_unit} />
                ) : (
                  <div className="note sent-absent">
                    <div>
                      <b>{axisDef.label}</b> 축에는 이 단위의 버킷이 없습니다 — 다른 축에는 있어 위의 축별
                      대조는 성립합니다.
                    </div>
                  </div>
                )}
                <div className="note">
                  <div>
                    이 막대는 <b>{unitLabel} 단위</b> 버킷으로 그려졌습니다. 일·주 롤업도 집계되지만
                    서빙 API 가 단위를 고르는 파라미터를 받지 않아 전환 컨트롤을 두지 않았습니다.{" "}
                    <span className="mono trend-ac">AC3.3</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "J3", text: "단계 1 분포 열기" },
              { value: "J3", text: "단계 2 미분석 비중 확인" },
              { value: "V3", text: "분위기 분포 파악", kind: "v" },
              { text: "AC3.4 · AC3.6 · AC2.5" },
            ]}
          />
        </>
      )}
    </>
  );
}

// PAT-donut — 분위기 도넛. The ring is the four classes over the *analyzed*
// items, so it closes at 100% of what was actually classified; 미분석 is not a
// fifth slice but the figure printed beside it. The centre carries the count
// those ratios were taken over, which is the difference between a 60% that
// stands on 500 items and one that stands on 3.
function Donut({ row }: { row: SentimentAxisRow }) {
  const R = 42;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const arcs = CLASSES.map((c) => {
    const share = row.distribution[c.key];
    const arc = { ...c, share, dash: share * C, offset };
    offset += share * C;
    return arc;
  });
  const noisy = row.distribution.unanalyzed >= UNANALYZED_NOTICE;

  return (
    <>
      <div className="sent-donut-row">
        <svg viewBox="0 0 120 120" width="128" height="128" className="sent-donut" role="img"
             aria-label={`${row.axis} 축 분위기 구성`}>
          <g transform="rotate(-90 60 60)">
            <circle cx="60" cy="60" r={R} fill="none" stroke="var(--line)" strokeWidth="16" />
            {arcs.map((a) => (
              <circle
                key={a.cls}
                data-cls={a.cls}
                cx="60"
                cy="60"
                r={R}
                fill="none"
                stroke={a.color}
                strokeWidth="16"
                strokeDasharray={`${a.dash.toFixed(2)} ${(C - a.dash).toFixed(2)}`}
                strokeDashoffset={(-a.offset).toFixed(2)}
              />
            ))}
          </g>
          <text className="sent-donut-v" x="60" y="58" textAnchor="middle">
            {row.analyzed_total}
          </text>
          <text className="sent-donut-l" x="60" y="74" textAnchor="middle">
            분석 완료
          </text>
        </svg>

        {/* CMP-kv — one .kv element per pair, the way tokens.css declares it. */}
        <div className="sent-donut-kv">
          {arcs.map((a) => (
            <div className="kv" key={a.cls}>
              <span className="k">
                <span className="d" style={{ background: a.color }} />
                {a.label}
              </span>
              <span className="v" data-cls={a.cls}>
                {pct(a.share)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="sent-na" data-cls={UNANALYZED.cls}>
        <span className="d" style={{ background: UNANALYZED.color }} />
        미분석 <b>{pct(row.distribution.unanalyzed)}</b> — 위 네 비율은 이 몫을 뺀{" "}
        <b>분석 완료분</b> 기준입니다.
      </div>

      {noisy && (
        <div className="note sent-warn">
          <div>
            미분석 비중이 {pct(row.distribution.unanalyzed, 0)}입니다. 이 구간의 분위기 변화는 구성 변화가
            만든 착시일 수 있으니 해석을 보류하세요. <span className="mono trend-ac">AC2.5</span>
          </div>
        </div>
      )}
    </>
  );
}

/** The same bucket under the two denominators the journey's step 2 argues about. */
function SplitRatios({ row, split }: { row: SentimentAxisRow; split: boolean }) {
  const mixed = segments(row.distribution);
  const separated = CLASSES.map((c) => ({
    cls: c.cls,
    label: c.label,
    color: c.color,
    share: row.distribution[c.key],
  }));
  const shown = split ? separated : mixed;
  const naCount = unanalyzedCount(row);

  return (
    <>
      <div className="sentbar sent-split-bar" data-split={split}>
        {shown.map((s) => (
          <i key={s.cls} className={s.cls} style={{ width: pct(s.share) }} />
        ))}
      </div>

      <div className="sent-split-kv">
        {shown.map((s) => (
          <div className="kv" key={s.cls}>
            <span className="k">
              <span className="d" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="v" data-cls={s.cls}>
              {pct(s.share)}
            </span>
          </div>
        ))}
      </div>

      <p className="sent-split-note">
        {split ? (
          naCount === null ? (
            <>이 버킷은 전량 미분석이라 분모로 쓸 분석 완료분이 없습니다.</>
          ) : (
            <>
              지금 보는 비율은 분석된 {row.analyzed_total}건만을 분모로 씁니다. 미분석 {naCount}건은
              분리해 따로 셉니다.
            </>
          )
        ) : (
          <>미분석을 분모에 섞으면 각 비율이 그만큼 눌립니다 — 어느 쪽이 줄었는지 구분되지 않습니다.</>
        )}
      </p>
    </>
  );
}

/** One axis of the comparison — CMP-sentbar, or a marked gap when Gold has no row. */
function AxisRow({ row }: { row: SentimentAxisRow }) {
  const label = AXES.find((a) => a.id === row.axis)?.label ?? row.axis;
  if (!row.present) {
    return (
      <div className="sent-axisrow" data-axis={row.axis} data-present="false">
        <span className="sent-axisname">{label}</span>
        <span className="sent-absent-inline">집계 없음</span>
      </div>
    );
  }
  return (
    <div className="sent-axisrow" data-axis={row.axis} data-present="true">
      <span className="sent-axisname">{label}</span>
      <div className="sent-axisbar">
        {/* CMP-sentbar */}
        <div className="sentbar">
          {segments(row.distribution).map((s) => (
            <i key={s.cls} className={s.cls} style={{ width: pct(s.share) }} />
          ))}
        </div>
      </div>
      <span className="sent-axistotal">{row.analyzed_total}건</span>
    </div>
  );
}

// PAT-stacked-sentiment — 시간축 위 분위기 누적 막대(미분석 분리). Every bar is
// one bucket and reaches the same height, because the question is composition,
// not volume; how much each bar stands on is the analyzed count under its tick.
// 미분석 is the top segment rather than a share folded into the classes, so the
// eye can see a bucket's classified portion shrink even while its 부정 ratio
// holds steady — which is exactly the 착시 the journey's step 2 is about.
function SentimentTimeline({ series, unit }: { series: SentimentPoint[]; unit: string }) {
  const VIEW_W = 740;
  const VIEW_H = 200;
  const PLOT_L = 40;
  const PLOT_R = 724;
  const TOP = 14;
  const BASELINE = 164;
  const height = BASELINE - TOP;

  const span = (PLOT_R - PLOT_L) / series.length;
  const barW = Math.min(46, span * 0.62);

  return (
    <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} width="100%" className="sent-chart" role="img"
         aria-label="분위기 구성 추세">
      <line className="gridline zero" x1={PLOT_L} y1={BASELINE} x2={PLOT_R} y2={BASELINE} />
      {series.map((point, i) => {
        const cx = PLOT_L + span * (i + 0.5);
        let y = TOP;
        return (
          <g key={point.time_bucket} data-bucket={point.time_bucket}>
            {segments(point.distribution).map((s) => {
              const h = s.share * height;
              const rect = (
                <rect
                  key={s.cls}
                  data-cls={s.cls}
                  x={(cx - barW / 2).toFixed(2)}
                  y={y.toFixed(2)}
                  width={barW.toFixed(2)}
                  height={Math.max(h, 0).toFixed(2)}
                  fill={s.color}
                />
              );
              y += h;
              return rect;
            })}
            <text className="axlab" x={cx} y={BASELINE + 18} textAnchor="middle">
              {bucketTick(point.time_bucket, unit)}
            </text>
            <text className="axlab" x={cx} y={BASELINE + 32} textAnchor="middle">
              {point.analyzed_total}건
            </text>
          </g>
        );
      })}
    </svg>
  );
}
