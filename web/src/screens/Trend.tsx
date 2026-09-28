import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { Axis, TrendResponse, TrendSeries } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// Two things are deliberately *not* here:
//
//   - A 시간/일/주 switch. Gold carries all three units now (AC5.2), but
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

/** Bucket keys are ISO prefixes; the axis only needs the part that varies. */
function bucketTick(bucket: string, unit: string): string {
  if (unit === "hour") return bucket.length >= 13 ? `${bucket.slice(11, 13)}시` : bucket;
  return bucket.slice(5) || bucket;
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

type StoredView = { axis: Axis; subject?: string };

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
  // 온도차 판별도 같은 이유로 화면이 든다 — 축을 오가며 보다가 결론을 적는 폼이라,
  // 응답이 바뀔 때마다 고른 결론과 메모가 날아가면 판별 자체가 성립하지 않는다.
  const [contrast, setContrast] = useState<ContrastPick>({ verdict: undefined, memo: "" });
  const [contrastVerdict, setContrastVerdict] = useState<ContrastVerdict>({ kind: "idle" });
  const [overlay, setOverlay] = useState(false);

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
                {/* 목업 `STP-drill-trend` 의 `#trend-form` — 겹쳐 보기 opt-in. */}
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
                  <span className="mono trend-ac">AC5.2</span>
                </div>
              </div>
            </div>

            {/* 상위 대상 비교 — 목업 `STP-drill-trend` 의 「상위 대상 비교」 표.
                행 클릭이 대상 선택이라 별도 picker 를 두지 않는다 (AC5.4 대상 선택). */}
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

            <Contrast
              pick={contrast}
              setPick={setContrast}
              verdict={contrastVerdict}
              setVerdict={setContrastVerdict}
            />
          </div>

          <MapStrip
            chips={[
              { value: "J1", text: "단계 3 대상 선택" },
              { value: "J1", text: "단계 4 상위 대상 비교" },
              { value: "V1", text: "시계열 추세 가시화", kind: "v" },
              { text: "AC5.4 · AC5.1" },
            ]}
          />
        </>
      )}
    </>
  );
}

// 목업의 `.chk`·`.fld`·`.banner` 를 `tokens.css` 에 들이지 않는다 — 이 화면의 선택자는
// `.trace-*`·`.sent-*` 처럼 `.trend-sl-` 로 접두한다. 근거는 설계 트래커의 규칙 5 대조 규약.
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

// 목업 `JRN-axis-contrast.html` 의 `STP-verify-in-trend` — 「온도차 판별」(`#verdict-form` · `submitVerdict()`).
const CONTRAST_INVALID_DEFAULT = "결론과 근거 메모를 모두 채워야 기록됩니다.";

type ContrastKind = "persistent" | "transient" | "none";

const CONTRAST_OPTIONS: { value: ContrastKind; label: string; recorded: string }[] = [
  {
    value: "persistent",
    label: "지속적인 온도차다 — 기간 내내 격차가 유지된다",
    recorded: "지속적인 온도차",
  },
  {
    value: "transient",
    label: "이번 구간만의 격차다 — 최근 며칠에만 벌어졌다",
    recorded: "이번 구간만의 격차",
  },
  { value: "none", label: "차이 없음 — 축 간 관심사가 사실상 같다", recorded: "차이 없음" },
];

type ContrastPick = { verdict?: ContrastKind; memo: string };

type ContrastVerdict =
  | { kind: "idle" }
  | { kind: "invalid"; message: string }
  | { kind: "recorded"; verdict: ContrastKind };

function Contrast({
  pick,
  setPick,
  verdict,
  setVerdict,
}: {
  pick: ContrastPick;
  setPick: React.Dispatch<React.SetStateAction<ContrastPick>>;
  verdict: ContrastVerdict;
  setVerdict: (verdict: ContrastVerdict) => void;
}) {
  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pick.verdict === undefined) {
      setVerdict({ kind: "invalid", message: "결론을 하나 고르세요." });
      return;
    }
    if (!pick.memo.trim()) {
      setVerdict({
        kind: "invalid",
        message: "근거 메모를 적어야 기록됩니다 — 어느 축이 언제부터 벌어졌는지가 결론의 실체입니다.",
      });
      return;
    }
    setVerdict({ kind: "recorded", verdict: pick.verdict });
  }

  const recorded =
    verdict.kind === "recorded"
      ? CONTRAST_OPTIONS.find((o) => o.value === verdict.verdict)?.recorded
      : undefined;

  return (
    <div className="card col-7">
      <div className="card-h">
        <h3>온도차 판별</h3>
        <span className="sub">한 문장으로 설명할 수 있는 상태로 마칩니다</span>
      </div>
      <div className="card-b">
        <form className="trend-vd-form" onSubmit={submit}>
          <div className="trend-sl-field">
            <span className="trend-sl-label">결론</span>
            <div className="trend-vd-radios">
              {CONTRAST_OPTIONS.map((o) => (
                <label className="trend-vd-radio" key={o.value}>
                  <input
                    type="radio"
                    name="verdict"
                    value={o.value}
                    checked={pick.verdict === o.value}
                    onChange={() => setPick((prev) => ({ ...prev, verdict: o.value }))}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <label className="trend-sl-field trend-sl-memo">
            <span className="trend-sl-label">근거 메모</span>
            <textarea
              name="verdict-memo"
              value={pick.memo}
              onChange={(e) => setPick((prev) => ({ ...prev, memo: e.target.value }))}
              placeholder="어느 축이 언제부터 얼마나 벌어졌는지 적어 두세요."
            />
          </label>

          <div className="trend-sl-act">
            <button type="submit" className="trend-sl-submit">
              온도차 기록
            </button>
          </div>
        </form>

        <div className="trend-sl-banner err" hidden={verdict.kind !== "invalid"}>
          {verdict.kind === "invalid" ? verdict.message : CONTRAST_INVALID_DEFAULT}
        </div>

        {/* `으로 판별했습니다.` 는 목업 `submitVerdict()` 의 문면 그대로다 — 조사는 목업이 정한다. */}
        <div className="trend-sl-banner good" hidden={verdict.kind !== "recorded"}>
          <b>온도차를 기록했습니다.</b> {recorded !== undefined && `${recorded}으로 판별했습니다.`}
        </div>
      </div>
    </div>
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
