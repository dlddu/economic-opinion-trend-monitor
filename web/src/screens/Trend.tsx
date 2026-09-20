import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
//
// This screen receives three journey steps, not one: `STP-drill-trend` and
// `STP-shortlist` from `JRN-daily-scan`, plus `STP-verify-in-trend` from
// `JRN-axis-contrast` (mockup index, 「흡수된 화면의 판정 경계」). The walkthrough
// walks them; a product screen lays them out one under another, so 추림 lives
// at the bottom of the same view rather than behind a 전진 CTA.

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

// 여정 §4 의 네 번째 분기 — 「중도 이탈(목록만 보고 종료) → 다음 진입 시 마지막 조회
// 조건 복원」. 세션 스토리지를 쓰는 것이 이 화면의 주장과 맞는다: 추림이 세션 안에서만
// 사는 것과 같은 수명이라, 탭을 닫으면 조건도 함께 사라진다. 영속 저장(북마크·워치리스트)은
// 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹한 항목이라 여기서도 만들지 않는다.
const VIEW_KEY = "econ-monitor:trend:view";

type StoredView = { axis: Axis; subject?: string };

function readStoredView(): StoredView | null {
  try {
    const raw = sessionStorage.getItem(VIEW_KEY);
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
    sessionStorage.setItem(VIEW_KEY, JSON.stringify(view));
  } catch {
    // 같은 이유로 조용히 넘어간다. 저장 실패는 조회를 막지 않는다.
  }
}

// 승계 계약의 받는 쪽. `Dashboard` 의 순위 행은 `/trend?axis=<축>&subject=<대상>` 으로
// 보내는데, 그 쿼리를 읽지 않으면 누른 대상이 아니라 **세션에 남아 있던 대상**이 열린다 —
// 상세로 내려간 것처럼 보이지만 다른 대상을 보고 있는 상태다. 그래서 우선순위는
// **쿼리 > 세션**이다: 쿼리는 방금 누른 동작이고 세션은 지난번에 두고 간 조건이라,
// 둘이 다르면 언제나 방금 누른 쪽이 옳다.
//
// 쿼리가 **한 조각이라도** 있으면 진입 조건 전체를 쿼리가 정한다. 축만 넘어온 진입에
// 세션의 대상을 섞으면 그 축에 없을 수도 있는 대상을 묻게 되기 때문이다.
function parseAxis(raw: string | null): Axis | undefined {
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
  const [axis, setAxis] = useState<Axis>(entry.axis ?? "KR");
  const [subject, setSubject] = useState<string | undefined>(entry.subject);
  const [data, setData] = useState<TrendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 추림 상태는 이 화면이 들고 있는다. 응답이 바뀌면 후보 카드가 잠시 사라지는데,
  // 상태가 그 안에 있으면 표에서 다른 대상을 고를 때마다 쓰던 메모까지 날아간다.
  const [picked, setPicked] = useState<string[]>([]);
  const [memo, setMemo] = useState("");
  const [shortlist, setShortlist] = useState<ShortlistVerdict>({ kind: "idle" });

  useEffect(() => {
    storeView({ axis, subject });
  }, [axis, subject]);

  // 상세로 내려간 대상을 미리 골라 둔다 — 목업 `renderCandidates()` 와 같다. 새 응답은
  // 새 모집단이므로(축을 바꾸면 대상 자체가 다르다) 고른 것은 거기에 맞춰 다시 세운다.
  useEffect(() => {
    if (!data) return;
    setPicked(data.series.filter((s) => s.selected).map((s) => s.subject));
  }, [data]);

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

            <Shortlist
              series={data.series}
              axisLabel={axisDef.label}
              unitLabel={unitLabel}
              firstBucket={data.basis.first_bucket}
              latestBucket={data.basis.latest_bucket}
              drilled={selected?.subject}
              picked={picked}
              setPicked={setPicked}
              memo={memo}
              setMemo={setMemo}
              verdict={shortlist}
              setVerdict={setShortlist}
            />
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

// STP-shortlist — 오늘 볼 대상 추리기. 목업(`JRN-daily-scan.html` 화면 5)이 그대로 스펙이다:
// 서빙에 새로 물을 것이 없고(후보는 이미 받은 `series`, 선택·메모는 화면 상태), 여정 문서가
// 「현재 범위 밖, 백로그 후보」로 파킹한 것은 **영속화(북마크·워치리스트)뿐**이라 세션 한정
// 추림까지는 만들 수 있다. recorded 배너가 그 경계를 문면으로 직접 말한다.
//
// 선택자를 전부 `.trend-sl-` 로 접두한다 — `.trace-*`·`.sent-*` 와 같은 이유다. 목업의
// `.chk`·`.fld`·`.banner` 를 `tokens.css` 에 들이면 규칙 5 가 선언 단위로 대조하기 시작해
// 대조면이 움직이는데, 이 슬라이스가 옮기는 것은 **문면과 동작**이지 레이아웃 선언이 아니다.
// 배너의 초기 문면. 목업도 정적 마크업에 이 문장을 두고 제출 시점에 무엇이 모자란지에
// 따라 덮어쓴다 — 같은 구조를 그대로 옮긴다.
const INVALID_DEFAULT = "후보를 하나 이상 고르고 메모를 채워야 확정됩니다.";

type ShortlistVerdict =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  | { kind: "recorded"; subjects: string[] };

function Shortlist({
  series,
  axisLabel,
  unitLabel,
  firstBucket,
  latestBucket,
  drilled,
  picked,
  setPicked,
  memo,
  setMemo,
  verdict,
  setVerdict,
}: {
  series: TrendSeries[];
  axisLabel: string;
  unitLabel: string;
  firstBucket: string;
  latestBucket: string;
  drilled?: string;
  picked: string[];
  setPicked: React.Dispatch<React.SetStateAction<string[]>>;
  memo: string;
  setMemo: (value: string) => void;
  verdict: ShortlistVerdict;
  setVerdict: (verdict: ShortlistVerdict) => void;
}) {
  function toggle(subject: string) {
    setPicked((prev) =>
      prev.includes(subject) ? prev.filter((s) => s !== subject) : [...prev, subject],
    );
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const note = memo.trim();
    // 두 실패를 한 문장으로 뭉치지 않는다 — 무엇이 모자란지 말해야 고칠 수 있다.
    if (picked.length === 0) {
      setVerdict({
        kind: "invalid",
        message: "후보를 하나 이상 고르세요 — 아무것도 남기지 않으면 오늘 볼 것이 없습니다.",
      });
      return;
    }
    if (!note) {
      setVerdict({
        kind: "invalid",
        message: "왜 오늘 이것을 챙기는지 한 줄이라도 적어야 내일의 자신이 읽을 수 있습니다.",
      });
      return;
    }
    setVerdict({ kind: "recorded", subjects: picked });
  }

  const recorded = verdict.kind === "recorded" ? verdict.subjects : [];

  return (
    <>
      <div className="card col-7">
        <div className="card-h">
          <h3>오늘 챙길 대상</h3>
          <span className="sub">2~3개만 남기고 세션을 닫습니다</span>
        </div>
        <div className="card-b">
          <form className="trend-sl-form" onSubmit={submit}>
            <div className="trend-sl-field">
              <span className="trend-sl-label">후보</span>
              <div className="trend-sl-cands">
                {series.map((s) => (
                  <label className="trend-sl-cand" key={s.subject}>
                    <input
                      type="checkbox"
                      name="cand"
                      value={s.subject}
                      checked={picked.includes(s.subject)}
                      onChange={() => toggle(s.subject)}
                    />
                    {s.subject}
                    <span className="trend-sl-share">· {pct(s.latest_share)}</span>
                  </label>
                ))}
              </div>
            </div>

            <label className="trend-sl-field trend-sl-memo">
              <span className="trend-sl-label">브리핑 메모</span>
              <textarea
                name="shortlist-memo"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                placeholder="왜 오늘 이것을 챙기는지 한 줄로 적어 두세요."
              />
            </label>

            <div className="trend-sl-act">
              <button type="submit" className="trend-sl-submit">
                추림 확정하고 닫기
              </button>
              <span className="trend-sl-count">{picked.length}개 선택</span>
            </div>
          </form>

          <div className="trend-sl-banner err" hidden={verdict.kind !== "invalid"}>
            {verdict.kind === "invalid" ? verdict.message : INVALID_DEFAULT}
          </div>

          <div className="trend-sl-banner good" hidden={verdict.kind !== "recorded"}>
            <b>오늘 볼 대상을 추렸습니다.</b>{" "}
            {recorded.join(" · ")} — {recorded.length}개를 오늘 볼 대상으로 남겼습니다.
            <div className="trend-sl-hint">
              이 추림은 <b>이 세션 안에서만</b>
              {" 유지됩니다 — 제품 안에 담아 두는 워치리스트는 아직 없습니다."}
            </div>
          </div>
        </div>
      </div>

      <div className="card col-5">
        <div className="card-h">
          <h3>이번 스캔 요약</h3>
          <span className="sub">닫을 때의 조건이 다음 진입에 복원됩니다</span>
        </div>
        <div className="card-b">
          {/* CMP-kv */}
          <div className="kv">
            <span className="k">축</span>
            <span className="v">{axisLabel}</span>
          </div>
          <div className="kv">
            <span className="k">기간 · 단위</span>
            <span className="v mono">
              {firstBucket} ~ {latestBucket} · {unitLabel}
            </span>
          </div>
          <div className="kv">
            <span className="k">세는 방식</span>
            <span className="v">정규화 비율</span>
          </div>
          <div className="kv">
            <span className="k">상세로 내려간 대상</span>
            <span className="v">{drilled ?? "없음"}</span>
          </div>
        </div>
      </div>
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
