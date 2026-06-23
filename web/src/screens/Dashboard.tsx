import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { Axis, DashboardResponse, SentimentDistribution } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

const AXES: { id: Axis; label: string }[] = [
  { id: "KR", label: "한국" },
  { id: "US", label: "미국" },
  { id: "GLOBAL", label: "전세계" },
];

function axisLabel(axis: Axis): string {
  return AXES.find((a) => a.id === axis)?.label ?? axis;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
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

// Representative screen (dash). The other 6 screens are placeholders.
export function Dashboard() {
  const [axis, setAxis] = useState<Axis>("KR");
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .dashboard(axis)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis]);

  const maxShare = data
    ? Math.max(...data.top_subjects.map((r) => r.normalized_share), 0.0001)
    : 1;

  return (
    <>
      <div className="dash-controls">
        <div className="seg">
          {AXES.map((a) => (
            <button key={a.id} className={axis === a.id ? "on" : ""} onClick={() => setAxis(a.id)}>
              {a.label}
            </button>
          ))}
        </div>
        <span className="norm-flag">▣ 정규화 비율</span>
      </div>

      <p className="lede">
        지금 <span className="b">{axisLabel(axis)} 축</span>에서 경제 여론이 어떤 서술 대상에 쏠려 있는지 —
        정기 수집 데이터를 <span className="b">서술 대상 기준</span>으로 집계해 보여줍니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && (
        <>
          <div className="grid">
            {data.metrics.map((m) => (
              <div key={m.label} className="card metric col-3">
                <div className="card-b">
                  <div className="ml">{m.label}</div>
                  <div className="mv sm">{m.value}</div>
                  <div className="md">{m.note}</div>
                </div>
              </div>
            ))}

            <div className="card col-7">
              <div className="card-h">
                <h3>상위 서술 대상</h3>
                <span className="sub">관심 점유율 · 정규화 비율 기준</span>
                <div className="r">
                  <span className="norm-flag">▣ 정규화</span>
                </div>
              </div>
              <div className="card-b" style={{ padding: "6px 12px" }}>
                <div className="ranklist">
                  {data.top_subjects.map((row) => (
                    <div
                      key={row.subject}
                      className="rankrow"
                      style={{ cursor: "pointer" }}
                      onClick={() => navigate(`/trend?subject=${encodeURIComponent(row.subject)}`)}
                    >
                      <div className="rk">{row.rank}</div>
                      <div className="nm">
                        {row.subject}
                        <span className="meta">원시 {row.raw_count}건</span>
                      </div>
                      <div className="share">
                        <div className="bar">
                          <i style={{ width: pct(row.normalized_share / maxShare) }} />
                        </div>
                        <span className="pct">{pct(row.normalized_share)}</span>
                      </div>
                      <Spark values={row.spark} />
                      <div className={`dlt delta ${deltaClass(row.delta)}`}>{deltaLabel(row.delta)}</div>
                    </div>
                  ))}
                  {data.top_subjects.length === 0 && (
                    <div className="placeholder-note">
                      데이터 없음 — 배치 파이프라인을 먼저 실행하세요.
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="card col-5">
              <div className="card-h">
                <h3>전체 분위기 구성</h3>
                <span className="sub">{axisLabel(axis)} 축</span>
              </div>
              <div className="card-b">
                <SentBar dist={data.sentiment} />
                <div className="note">
                  <div>
                    <b>미분석 {pct(data.sentiment.unanalyzed)}</b>는 비율 집계에서 분리 표기됩니다. 분위기 합은
                    분석 완료분 기준입니다.
                  </div>
                </div>
                <button
                  className="btn ghost sm"
                  style={{ marginTop: 12 }}
                  onClick={() => navigate("/compare")}
                >
                  3축 나란히 비교 →
                </button>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "J1", text: "단계 1 대시보드 진입" },
              { value: "V1", text: "시계열 추세 가시화", kind: "v" },
              { text: "AC3.2 · AC3.3 · AC3.5 · AC3.8" },
            ]}
          />
        </>
      )}
    </>
  );
}

function SentBar({ dist }: { dist: SentimentDistribution }) {
  const scale = 1 - dist.unanalyzed; // sentiment ratios are over analyzed items
  const segs: { cls: string; label: string; w: number }[] = [
    { cls: "s-pos", label: "긍정", w: dist.positive * scale },
    { cls: "s-neu", label: "중립", w: dist.neutral * scale },
    { cls: "s-neg", label: "부정", w: dist.negative * scale },
    { cls: "s-mix", label: "혼합", w: dist.mixed * scale },
    { cls: "s-na", label: "미분석", w: dist.unanalyzed },
  ];
  const legendColors: Record<string, string> = {
    "s-pos": "var(--pos)",
    "s-neu": "var(--neu)",
    "s-neg": "var(--neg)",
    "s-mix": "var(--mix)",
    "s-na": "var(--na)",
  };
  return (
    <>
      <div className="sentbar">
        {segs.map((s) => (
          <i key={s.cls} className={s.cls} style={{ width: `${(s.w * 100).toFixed(1)}%` }} />
        ))}
      </div>
      <div className="legend">
        {segs.map((s) => (
          <span key={s.cls}>
            <span className="d" style={{ background: legendColors[s.cls] }} />
            {s.label} {(s.w * 100).toFixed(0)}%
          </span>
        ))}
      </div>
    </>
  );
}

function Spark({ values }: { values: number[] }) {
  const w = 88;
  const h = 26;
  const pad = 2;
  if (!values || values.length < 2) {
    return <svg className="spark" viewBox={`0 0 ${w} ${h}`} />;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const coords = values.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (values.length - 1);
    const y = h - pad - ((v - min) / span) * (h - 2 * pad);
    return { x, y };
  });
  const points = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const last = coords[coords.length - 1];
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke="var(--primary)" strokeWidth="1.8" points={points} />
      <circle cx={last.x.toFixed(1)} cy={last.y.toFixed(1)} r="2" fill="var(--primary)" />
    </svg>
  );
}
