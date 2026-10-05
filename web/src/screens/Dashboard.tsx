import { type FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type {
  Axis,
  BucketUnit,
  DashboardResponse,
  DashRange,
  DashRow,
  DashSummary,
} from "../api/types";
import { MapStrip } from "../shell/MapStrip";
import { useTopbar } from "../shell/topbarSlot";

// 화면 2·3 으로 넘어가는 컨트롤은 두지 않는다 — 설계 트래커 「허위 컨트롤 금지」.

const AXES: { id: Axis; label: string }[] = [
  { id: "KR", label: "한국" },
  { id: "US", label: "미국" },
  { id: "GLOBAL", label: "전세계" },
];

const RANGES: DashRange[] = ["24h", "7d", "30d"];
const UNITS: BucketUnit[] = ["hour", "day", "week"];

const RANGE_LABEL: Record<DashRange, string> = {
  "24h": "최근 24시간",
  "7d": "최근 7일",
  "30d": "최근 30일",
};

const UNIT_LABEL: Record<BucketUnit, string> = {
  hour: "시간 단위",
  day: "일 단위",
  week: "주 단위",
};

const PREV_LABEL: Record<BucketUnit, string> = {
  hour: "직전 시간 대비",
  day: "전일 대비",
  week: "전주 대비",
};

const NEW_LABEL: Record<BucketUnit, string> = {
  hour: "이번 시간 새로 진입",
  day: "밤사이 새로 진입",
  week: "이번 주 새로 진입",
};

const ENTRY_LABEL: Record<BucketUnit, string> = {
  hour: "이번 시간 새로 올라옴",
  day: "밤사이 새로 올라옴",
  week: "이번 주 새로 올라옴",
};

const UNIT_NAME: Record<BucketUnit, string> = {
  hour: "시간",
  day: "일",
  week: "주",
};

/** 원시 순위와 정규화 순위가 이만큼 갈리면 행에 적는다 — 한 칸 차이는 동점 처리의 흔들림이다. */
const RANK_SHIFT_NOTE = 2;

function axisLabel(axis: Axis): string {
  return AXES.find((a) => a.id === axis)?.label ?? axis;
}

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

// 목업 `dcls`·`dtext`·`scolor` 와 같은 문턱(±0.05%p)과 같은 기호.
function dcls(d: number): "up" | "dn" | "fl" {
  if (d > 0.05) return "up";
  if (d < -0.05) return "dn";
  return "fl";
}

function dtext(d: number, hasBaseline: boolean): string {
  if (!hasBaseline) return "—";
  if (d > 0.05) return `▲ ${d.toFixed(1)}%p`;
  if (d < -0.05) return `▼ ${Math.abs(d).toFixed(1)}%p`;
  return "–";
}

const SPARK_COLOR = { up: "var(--pos)", dn: "var(--neg)", fl: "var(--neu)" } as const;

// **수명은 목업 문면이 정한다.** 카드 sub 가 `어제 닫을 때의 조건으로 열립니다`, note 가
// `어제와 같은 화면에서 밤사이 변화만 보게 됩니다` 라고 약속하므로, 탭을 닫으면 사라지는
// `sessionStorage` 로는 두 문장이 거짓이 된다 — 날을 넘겨 살아남는 저장소여야 한다.
const BRIEF_KEY = "econ-monitor:dash:brief";

type StoredBrief = { axis: Axis; q: string; restore: boolean; range: DashRange; unit: BucketUnit };

const DEFAULT_BRIEF: StoredBrief = { axis: "KR", q: "", restore: true, range: "7d", unit: "day" };

function readStoredBrief(): StoredBrief | null {
  try {
    const raw = localStorage.getItem(BRIEF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBrief>;
    const axis = AXES.find((a) => a.id === parsed.axis)?.id;
    if (!axis) return null;
    return {
      axis,
      q: typeof parsed.q === "string" ? parsed.q : "",
      restore: parsed.restore !== false,
      range: RANGES.find((r) => r === parsed.range) ?? DEFAULT_BRIEF.range,
      unit: UNITS.find((u) => u === parsed.unit) ?? DEFAULT_BRIEF.unit,
    };
  } catch {
    return null;
  }
}

function storeBrief(brief: StoredBrief): void {
  try {
    localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
  } catch {
    // 삼키는 이유는 `Trend.tsx` 의 같은 두 catch 가 적는다 — 저장 실패는 조회를 막지 않는다.
  }
}

function entryBrief(stored: StoredBrief | null): StoredBrief {
  if (!stored) return DEFAULT_BRIEF;
  if (!stored.restore) return { ...DEFAULT_BRIEF, restore: false };
  return stored;
}

export function Dashboard() {
  const entry = useState(() => entryBrief(readStoredBrief()))[0];
  const [axis, setAxis] = useState<Axis>(entry.axis);
  const [q, setQ] = useState(entry.q);
  const [restore, setRestore] = useState(entry.restore);
  const [thresh, setThresh] = useState(0);
  const [onlyNew, setOnlyNew] = useState(false);
  const [target, setTarget] = useState<string | null>(null);
  const [range, setRange] = useState<DashRange>(entry.range);
  const [unit, setUnit] = useState<BucketUnit>(entry.unit);
  const [draftRange, setDraftRange] = useState<DashRange>(entry.range);
  const [draftUnit, setDraftUnit] = useState<BucketUnit>(entry.unit);
  const [reapplying, setReapplying] = useState(false);
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useTopbar(
    "아침 정기 스캔",
    `${axisLabel(axis)} · ${RANGE_LABEL[range]} · ${UNIT_LABEL[unit]}`,
  );

  useEffect(() => {
    storeBrief({ axis, q, restore, range, unit });
  }, [axis, q, restore, range, unit]);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .dashboard(axis, range, unit)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)))
      .finally(() => active && setReapplying(false));
    return () => {
      active = false;
    };
  }, [axis, range, unit]);

  function applyWindow(e: FormEvent) {
    e.preventDefault();
    if (draftRange === range && draftUnit === unit) return;
    setReapplying(true);
    setRange(draftRange);
    setUnit(draftUnit);
  }

  // 대소문자를 구분하는 것까지 목업(`rows()` 의 `indexOf`)과 같다.
  const needle = q.trim();
  const ranked = data ? data.top_subjects.filter((r) => r.subject.includes(needle)) : [];
  const maxShare = Math.max(...ranked.map((r) => r.normalized_share), 0.0001);
  const noGold = data !== null && data.basis.bucket === "";
  const emptyWindow = data !== null && !noGold && data.basis.empty_window;
  const hasBaseline = data !== null && data.basis.has_baseline;
  const deltaRows = ranked.filter((r) => {
    if (onlyNew && !r.is_new) return false;
    if (hasBaseline && Math.abs(r.delta) < thresh) return false;
    return true;
  });
  const picked = data?.top_subjects.find((r) => r.subject === target) ?? null;

  return (
    <>
      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}

      <div className="grid g-12">
        {/* CMP-metric ×4 */}
        <Metrics summary={data?.summary ?? null} unit={unit} />

        <div className="card col-4">
          <div className="card-h">
            <h3>오늘의 조회 조건</h3>
            <span className="sub">어제 닫을 때의 조건으로 열립니다</span>
          </div>
          <div className="card-b">
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="dash-brief-field">
                <span className="dash-brief-label">축</span>
                <select value={axis} onChange={(e) => setAxis(e.target.value as Axis)}>
                  {AXES.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="dash-brief-field" style={{ marginTop: 14 }}>
                <span className="dash-brief-label">대상 찾기</span>
                <input
                  type="search"
                  value={q}
                  placeholder="대상 이름으로 좁히기"
                  onChange={(e) => setQ(e.target.value)}
                />
              </label>
              <label className="dash-brief-check" style={{ marginTop: 16 }}>
                <input
                  type="checkbox"
                  checked={restore}
                  onChange={(e) => setRestore(e.target.checked)}
                />
                마지막 조회 조건으로 열기
              </label>
            </form>

            <div className="note info" style={{ marginTop: 18 }}>
              <InfoIcon />
              <div>
                <b>조건을 매번 다시 맞추지 않습니다.</b> 닫을 때의 축·기간이 그대로 복원되어, 어제와 같은
                화면에서 밤사이 변화만 보게 됩니다.
              </div>
            </div>
          </div>
        </div>

        <div className="card col-8">
          <div className="card-h">
            <h3>상위 서술 대상</h3>
            <span className="sub">
              {axisLabel(axis)} 축 · {RANGE_LABEL[range]}
            </span>
            <div className="r">
              <span className="norm-flag">▣ 정규화</span>
            </div>
          </div>
          <div className="card-b" style={{ padding: "6px 12px" }}>
            {!data && !error && <div className="dash-brief-empty">불러오는 중…</div>}
            {data && (
              <div className="ranklist">
                {ranked.map((row) => (
                  <RankRow
                    key={row.subject}
                    row={row}
                    unit={unit}
                    maxShare={maxShare}
                    hasBaseline={data.basis.has_baseline}
                    onOpen={() =>
                      navigate(`/trend?axis=${axis}&subject=${encodeURIComponent(row.subject)}`)
                    }
                  />
                ))}
                {noGold && (
                  <div className="dash-brief-empty">데이터 없음 — 배치 파이프라인을 먼저 실행하세요.</div>
                )}
                {data.top_subjects.length > 0 && ranked.length === 0 && (
                  <div className="dash-brief-empty">검색어에 걸리는 대상이 없습니다.</div>
                )}
              </div>
            )}

            {emptyWindow && (
              <div className="dash-banner warn" data-state="empty-window">
                <WarnIcon />
                <div>
                  <b>{axisLabel(axis)} 축은 밤사이 수집이 들어오지 않았습니다.</b> 0으로 그리지 않고{" "}
                  <b>데이터 없음</b>으로 둡니다 — 수집이 없는 것과 관심이 없는 것은 다릅니다. 마지막 정상
                  수집: <span className="mono">{data.basis.last_bucket || "없음"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card col-7">
          <div className="card-h">
            <h3>밤사이 변화</h3>
            <span className="sub">직전 동일 구간 대비</span>
            <div className="r">
              <span className="dash-tag">{deltaRows.length}개 대상</span>
            </div>
          </div>
          <div className="card-b">
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="dash-brief-row">
                <label className="dash-brief-field" style={{ maxWidth: 150 }}>
                  <span className="dash-brief-label">증감 임계 (%p)</span>
                  <input
                    type="number"
                    value={thresh}
                    min={0}
                    max={10}
                    step={0.5}
                    onChange={(e) => setThresh(Number(e.target.value) || 0)}
                  />
                </label>
                <label className="dash-brief-check" style={{ paddingBottom: 8 }}>
                  <input
                    type="checkbox"
                    checked={onlyNew}
                    onChange={(e) => setOnlyNew(e.target.checked)}
                  />
                  새로 올라온 대상만
                </label>
              </div>
            </form>

            <div style={{ marginTop: 6 }}>
              {data && deltaRows.length === 0 && (
                <div className="dash-brief-empty">이 조건에 걸리는 변화가 없습니다.</div>
              )}
              {data &&
                deltaRows.map((row) => (
                  <button
                    key={row.subject}
                    type="button"
                    className="dash-trow"
                    aria-pressed={target === row.subject}
                    onClick={() => setTarget(row.subject)}
                  >
                    <span className="nm">
                      {row.subject}
                      {row.is_new && (
                        <>
                          {" "}
                          <span className="badge b-pos">
                            <i className="d" />
                            신규
                          </span>
                        </>
                      )}
                    </span>{" "}
                    <span
                      className={`dlt ${hasBaseline ? dcls(row.delta) : "fl"}`}
                      style={{ float: "right" }}
                    >
                      {dtext(row.delta, hasBaseline)}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        <div className="card col-5">
          <div className="card-h">
            <h3>고른 대상</h3>
            <span className="sub">오늘 더 볼 후보</span>
          </div>
          <div className="card-b">
            {!picked && (
              <div className="dash-brief-empty" data-state="no-selection">
                왼쪽 목록에서 대상을 하나 고르면
                <br />
                여기에 어제 대비 변화가 펼쳐집니다.
              </div>
            )}
            {picked && (
              <div data-state="selection">
                <div className="kv">
                  <span className="dash-pick-k">대상</span>
                  <span className="dash-pick-v">{picked.subject}</span>
                </div>
                <div className="kv">
                  <span className="dash-pick-k">점유율</span>
                  <span className="dash-pick-v">{pct(picked.normalized_share)}</span>
                </div>
                <div className="kv">
                  <span className="dash-pick-k">직전 동일 구간 대비</span>
                  <span className="dash-pick-v">{dtext(picked.delta, hasBaseline)}</span>
                </div>
                <div className="kv">
                  <span className="dash-pick-k">진입</span>
                  <span className="dash-pick-v">
                    {!hasBaseline ? "—" : picked.is_new ? ENTRY_LABEL[unit] : "이전 구간에도 있었음"}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="card col-5">
          <div className="card-h">
            <h3>기간 · 단위</h3>
            <span className="sub">일시적 튐인지 지속 추세인지 가늠합니다</span>
          </div>
          <div className="card-b">
            <form onSubmit={applyWindow}>
              <label className="dash-brief-field" style={{ maxWidth: 220 }}>
                <span className="dash-brief-label">기간</span>
                <select
                  name="range"
                  value={draftRange}
                  onChange={(e) => setDraftRange(e.target.value as DashRange)}
                >
                  {RANGES.map((r) => (
                    <option key={r} value={r}>
                      {RANGE_LABEL[r]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="dash-brief-field" style={{ marginTop: 16 }}>
                <span className="dash-brief-label">집계 단위</span>
                <div className="dash-radios">
                  {UNITS.map((u) => (
                    <label key={u}>
                      <input
                        type="radio"
                        name="unit"
                        value={u}
                        checked={draftUnit === u}
                        onChange={() => setDraftUnit(u)}
                      />
                      {UNIT_NAME[u]}
                    </label>
                  ))}
                </div>
              </div>
              <div className="dash-stepact" style={{ marginTop: 18 }}>
                <button type="submit" className="btn pri">
                  기간 적용
                </button>
                <span className="dash-hint">고른 대상은 그대로 유지됩니다.</span>
              </div>
            </form>

            <div className="note" style={{ marginTop: 18 }}>
              <InfoIcon />
              <div>
                <b>단위를 바꾸면 순위가 뒤집힐 수 있습니다.</b> 방금 고른 대상은{" "}
                <span data-state="keep-note">
                  {picked ? (
                    <>
                      ‘{picked.subject}’ 으로 강조
                    </>
                  ) : (
                    "그대로 강조"
                  )}
                </span>
                되어, 어느 쪽을 믿을지 같은 줄에서 비교할 수 있습니다.
              </div>
            </div>
          </div>
        </div>

        <div className="card col-7">
          <div className="card-h">
            <h3>단위별 순위</h3>
            <span className="sub">
              {RANGE_LABEL[range]} · {UNIT_LABEL[unit]}
            </span>
            <div className="r">
              <span className="dash-tag">
                {range} · {unit}
              </span>
            </div>
          </div>
          <div className="card-b">
            {!data && !error && (
              <div className="dash-brief-empty" data-state="loading">
                {reapplying ? "고른 단위로 다시 집계하는 중…" : "불러오는 중…"}
              </div>
            )}
            {data && data.top_subjects.length === 0 && (
              <div className="dash-brief-empty">이 축에는 이 기간에 표시할 대상이 없습니다.</div>
            )}
            {data && data.top_subjects.length > 0 && ranked.length === 0 && (
              <div className="dash-brief-empty">검색어에 걸리는 대상이 없습니다.</div>
            )}
            {data && ranked.length > 0 && (
              <table className="tbl">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>대상</th>
                    <th className="num">{UNIT_LABEL[unit]} 점유율</th>
                    <th className="num">변화</th>
                  </tr>
                </thead>
                <tbody>
                  {ranked.map((row) => {
                    const on = target === row.subject;
                    return (
                      <tr key={row.subject} style={on ? { background: "var(--primary-soft)" } : undefined}>
                        <td className="num">{row.rank}</td>
                        <td>
                          {row.subject}
                          {on && (
                            <>
                              {" "}
                              <span className="dash-tag">고른 대상</span>
                            </>
                          )}
                        </td>
                        <td className="num">{pct(row.normalized_share)}</td>
                        <td className="num">
                          <span className={`dlt ${hasBaseline ? dcls(row.delta) : "fl"}`}>
                            {dtext(row.delta, hasBaseline)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}

            <div
              className="dash-banner"
              style={{ background: "var(--panel-2)", border: "1px solid var(--line)" }}
            >
              <ColumnsIcon />
              <div>
                <b>축마다 온도가 다른지 궁금하다면</b> 한국 · 미국 · 전세계를 같은 기준으로 나란히 놓고 볼 수 있습니다.
                <div className="dash-actions">
                  <Link className="btn sm" to="/compare">
                    3축을 나란히 비교 →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <details className="meta">
        <summary>여정 문서 정보</summary>
        <div className="metabody">
          <p>
            이 화면이 시각화하는 여정: <b>JRN-daily-scan</b> — 아침 정기 스캔 · 단계{" "}
            <span className="mono">STP-open-brief</span>·<span className="mono">STP-scan-delta</span>·
            <span className="mono">STP-adjust-window</span>. 같은 여정의{" "}
            <span className="mono">STP-drill-trend</span>·
            <span className="mono">STP-shortlist</span> 는 순위 행을 눌러 여는 추세 상세 화면이 맡는다.
          </p>
          <MapStrip
            style={{ marginTop: 16 }}
            chips={[
              { value: "JRN-daily-scan", text: "여정" },
              { value: "STP-open-brief", text: "단계" },
              { value: "STP-scan-delta", text: "단계" },
              { value: "STP-adjust-window", text: "단계" },
              { value: "V1", text: "시계열 추세 가시화", kind: "v" },
              { text: "AC3.2 · AC3.5" },
            ]}
          />
        </div>
      </details>
    </>
  );
}

function Metrics({ summary, unit }: { summary: DashSummary | null; unit: BucketUnit }) {
  const collected = summary?.collected ?? null;
  const prev = summary?.collected_prev ?? null;
  let change: { cls: "up" | "dn" | "fl"; text: string } = { cls: "fl", text: "—" };
  if (collected !== null && prev !== null && prev > 0) {
    const d = ((collected - prev) / prev) * 100;
    const cls = dcls(d);
    change = {
      cls,
      text: cls === "up" ? `▲ ${d.toFixed(1)}%` : cls === "dn" ? `▼ ${Math.abs(d).toFixed(1)}%` : "–",
    };
  }
  return (
    <>
      <div className="card metric col-3">
        <div className="card-b">
          <div className="ml">수집 항목</div>
          <div className="mv">{collected === null ? "—" : collected.toLocaleString("ko-KR")}</div>
          <div className="md">
            <span className={`delta ${change.cls}`}>{change.text}</span> {PREV_LABEL[unit]}
          </div>
        </div>
      </div>
      <div className="card metric col-3">
        <div className="card-b">
          <div className="ml">분석 완료</div>
          <div className="mv">{summary ? summary.analyzed.toLocaleString("ko-KR") : "—"}</div>
          <div className="md">
            <span className="delta fl">{summary ? pct(summary.coverage) : "—"}</span> 분석 커버리지
          </div>
        </div>
      </div>
      <div className="card metric col-3">
        <div className="card-b">
          <div className="ml">저신뢰 분리</div>
          <div className="mv sm">{summary ? pct(summary.low_confidence) : "—"}</div>
          <div className="md">
            <span className="delta fl">–</span> 집계에서 분리 표기
          </div>
        </div>
      </div>
      <div className="card metric col-3">
        <div className="card-b">
          <div className="ml">세는 방식</div>
          <div className="mv sm">점유율</div>
          <div className="md">
            <span className="norm-flag">▣ share-normalized</span>
          </div>
        </div>
      </div>
    </>
  );
}

function RankRow({
  row,
  unit,
  maxShare,
  hasBaseline,
  onOpen,
}: {
  row: DashRow;
  unit: BucketUnit;
  maxShare: number;
  hasBaseline: boolean;
  onOpen: () => void;
}) {
  const notes: string[] = [];
  if (Math.abs(row.raw_rank - row.rank) >= RANK_SHIFT_NOTE) {
    notes.push(`원시 카운트 ${row.raw_rank}위 → 정규화 ${row.rank}위`);
  }
  if (hasBaseline && row.is_new) notes.push(NEW_LABEL[unit]);
  const cls = hasBaseline ? dcls(row.delta) : "fl";
  return (
    <div className="rankrow" style={{ cursor: "pointer" }} onClick={onOpen}>
      <div className="rk">{row.rank}</div>
      <div className="nm">
        {row.subject}
        {notes.length > 0 && <span className="meta">· {notes.join(" · ")}</span>}
      </div>
      <div className="share">
        <div className="bar">
          <i style={{ width: pct(row.normalized_share / maxShare) }} />
        </div>
        <span className="pct">{pct(row.normalized_share)}</span>
      </div>
      <Spark values={row.spark} color={SPARK_COLOR[cls]} />
      <div className={`dlt ${cls}`}>{dtext(row.delta, hasBaseline)}</div>
    </div>
  );
}

// CMP-spark — 목업 `spark()` 와 같은 좌표계(88×26, 좌우 2px, 위 4px·아래 2px 여백).
function Spark({ values, color }: { values: number[]; color: string }) {
  const w = 88;
  const h = 26;
  if (!values || values.length < 2) {
    return <svg className="spark" viewBox={`0 0 ${w} ${h}`} />;
  }
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const y = (v: number) => h - 2 - ((v - min) / span) * (h - 6);
  const points = values
    .map((v, i) => `${((i / (values.length - 1)) * (w - 4) + 2).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`}>
      <polyline fill="none" stroke={color} strokeWidth="1.8" points={points} />
      <circle cx={(w - 2).toFixed(1)} cy={y(values[values.length - 1]).toFixed(1)} r="2" fill={color} />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ flex: "none", marginTop: 1 }}
    >
      <path d="M4 4v16M12 4v16M20 4v16" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg
      className="ic"
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{ flex: "none", marginTop: 1 }}
    >
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
    </svg>
  );
}
