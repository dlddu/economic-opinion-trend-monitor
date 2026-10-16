import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { AxisScope, SpikeBaseline, SpikeRow, SpikesResponse } from "../api/types";
import { PICK_ONE_AXIS, fairnessAxis, fairnessPath } from "./fairnessPath";

const BASELINES: { id: SpikeBaseline; label: string }[] = [
  { id: "7d", label: "평소 = 최근 7일 평균" },
  { id: "30d", label: "평소 = 최근 30일 평균" },
];

function multipleText(row: SpikeRow): string {
  if (row.raw_multiple !== null) return `×${row.raw_multiple.toFixed(1)}`;
  return row.is_new ? "신규" : "—";
}

export function SpikeCheck({ axis, axisLabel }: { axis: AxisScope; axisLabel: string }) {
  const [baseline, setBaseline] = useState<SpikeBaseline>("7d");
  const [data, setData] = useState<SpikesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .spikes(axis, baseline)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis, baseline]);

  useEffect(() => setPicked(null), [axis]);

  const rows = data?.rows ?? [];
  const current = rows.find((r) => r.subject === picked) ?? rows[0];
  const days = baseline === "30d" ? 30 : 7;
  const target = fairnessAxis(axis);

  return (
    <>
      <div className="card col-8 dash-sp" data-testid="spike-check">
        <div className="card-h">
          <h3>튀는 값</h3>
          <span className="sub">
            {axisLabel} 축 · 평소 대비 배수 순{data?.basis.time_bucket ? ` · ${data.basis.time_bucket}` : ""}
          </span>
          <div className="r">
            <span className="raw-flag">▢ 원시 건수</span>
          </div>
        </div>
        <div className="card-b">
          <div className="dash-sp-controls">
            <label className="dash-sp-field">
              <span className="dash-sp-label">비교 구간</span>
              <select
                name="spike-baseline"
                value={baseline}
                onChange={(e) => setBaseline(e.target.value as SpikeBaseline)}
              >
                {BASELINES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          {error && (
            <div className="note">
              <div>
                <b>API 오류:</b> {error}
              </div>
            </div>
          )}
          {!data && !error && <div className="placeholder-note">불러오는 중…</div>}
          {data && rows.length === 0 && (
            <div className="placeholder-note" data-testid="spike-empty">
              {axisLabel} 축에 집계된 버킷이 없습니다 — 비교할 값이 없는 것을 「급등 없음」으로 그리지 않습니다.
            </div>
          )}
          {data && rows.length > 0 && !data.basis.has_baseline && (
            <div className="note" data-testid="spike-no-baseline">
              <div>
                <b>최근 {days}일에 비교할 버킷이 없습니다.</b> 평소를 모르므로 배수를 0이나 1로 지어내지 않고
                「—」로 둡니다.
              </div>
            </div>
          )}

          <div className="ranklist">
            {rows.map((r) => (
              <button
                key={r.subject}
                type="button"
                className="dash-sp-row"
                aria-pressed={r.subject === current?.subject}
                onClick={() => setPicked(r.subject)}
              >
                <span className="rk">{r.rank}</span>
                <span className="nm">
                  {r.subject}
                  {r.is_new && (
                    <span className="badge b-pos">
                      <i className="d" />
                      신규
                    </span>
                  )}
                </span>
                <span className="meta">
                  {r.raw_count}건 · 평소 {r.baseline_raw.toFixed(1)}건
                </span>
                <span className={`dlt ${r.spike ? "up" : "fl"}`}>{multipleText(r)}</span>
                <span className="rk">{r.spike ? "급등" : ""}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card col-4">
        <div className="card-h">
          <h3>이 급등은 진짜인가</h3>
        </div>
        <div className="card-b">
          <p className="dash-sp-lede">
            평소보다 크게 튀었다는 것만으로는 아직 아무것도 말할 수 없습니다. <b>많이 다뤄진 것</b>과{" "}
            <b>한 곳에서 많이 쏟아진 것</b>을 먼저 갈라야 합니다.
          </p>
          <div className="kv">
            <span className="k">선택한 대상</span>
            <span className="v" data-testid="spike-pick">
              {current?.subject ?? "—"}
            </span>
          </div>
          <div className="kv">
            <span className="k">평소 대비</span>
            <span className="v mono" data-testid="spike-mult">
              {current && current.raw_multiple !== null
                ? `×${current.raw_multiple.toFixed(1)} (평소 ${current.baseline_raw.toFixed(1)}건)`
                : current
                  ? multipleText(current)
                  : "—"}
            </span>
          </div>
          {current && (
            <div className="dash-sp-advance">
              {target ? (
                <Link
                  className="btn sm"
                  data-testid="spike-advance"
                  to={fairnessPath(target, current.subject, baseline)}
                >
                  정규화 전후를 대조하기 →
                </Link>
              ) : (
                <span className="dash-sp-hint" data-testid="spike-pick-axis">
                  {PICK_ONE_AXIS}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
