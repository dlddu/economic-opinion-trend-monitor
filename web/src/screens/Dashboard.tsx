import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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

// JRN-daily-scan 화면 1 · STP-open-brief (`docs/mockups/JRN-daily-scan.html`).
// 목업이 그대로 스펙이다 — 지표 카드 넷, `오늘의 조회 조건` 카드, `상위 서술 대상` 순위,
// 토프바의 조건 pill. 같은 페이지의 화면 2·3(STP-scan-delta · STP-adjust-window)은 아직
// 구현이 없어서, 그리로 넘어가는 CTA(`어제 대비 변화 훑기 →`)와 빈 창 배너의 `해석은
// 보류하고 변화만 훑기` 는 두지 않는다 — 눌러도 갈 곳이 없는 컨트롤이 된다.

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

/** 수집 항목 카드의 비교 기준 — 직전 버킷이 무엇인지는 단위가 정한다. */
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
// 기간·단위도 같은 조건에 들어 있다. 이 화면에는 아직 그것을 고르는 컨트롤이 없지만
// (화면 3 몫) 저장·복원·조회는 이미 그 값으로 한다.
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
  const range = entry.range;
  const unit = entry.unit;
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
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [axis, range, unit]);

  // 대소문자를 구분하는 것까지 목업(`rows()` 의 `indexOf`)과 같다.
  const needle = q.trim();
  const ranked = data ? data.top_subjects.filter((r) => r.subject.includes(needle)) : [];
  const maxShare = Math.max(...ranked.map((r) => r.normalized_share), 0.0001);
  const noGold = data !== null && data.basis.bucket === "";
  const emptyWindow = data !== null && !noGold && data.basis.empty_window;

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

        {/* STP-open-brief — 오늘의 조회 조건 */}
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
      </div>

      {/* 보조 레이어 — 문서 메타는 제품 평면이 아니라 접힌 자리에 둔다(목업 `details.meta`). */}
      <details className="meta">
        <summary>여정 문서 정보</summary>
        <div className="metabody">
          <p>
            이 화면이 시각화하는 여정: <b>JRN-daily-scan</b> — 아침 정기 스캔 · 단계{" "}
            <span className="mono">STP-open-brief</span>. 같은 여정의{" "}
            <span className="mono">STP-scan-delta</span>·<span className="mono">STP-adjust-window</span>{" "}
            는 아직 구현되지 않았고, <span className="mono">STP-drill-trend</span>·
            <span className="mono">STP-shortlist</span> 는 순위 행을 눌러 여는 추세 상세 화면이 맡는다.
          </p>
          <MapStrip
            style={{ marginTop: 16 }}
            chips={[
              { value: "JRN-daily-scan", text: "여정" },
              { value: "STP-open-brief", text: "단계" },
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
