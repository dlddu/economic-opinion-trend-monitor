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

// 여정 §4 의 네 번째 분기 — 「중도 이탈(목록만 보고 종료) → 다음 진입 시 마지막 조회
// 조건 복원」. 그 분기의 귀속 단계가 `STP-open-brief`(= 이 화면)이고, 목업은 그 약속을
// `오늘의 조회 조건` 카드로 그린다.
//
// **수명은 목업 문면이 정한다.** 카드 sub 가 `어제 닫을 때의 조건으로 열립니다`, note 가
// `어제와 같은 화면에서 밤사이 변화만 보게 됩니다` 라고 약속하므로, 탭을 닫으면 사라지는
// `sessionStorage` 로는 두 문장이 거짓이 된다 — 날을 넘겨 살아남는 저장소여야 한다.
// 여정 문서가 「현재 범위 밖, 백로그 후보」로 파킹한 것은 **대상 저장**(북마크·워치리스트)
// 이지 조회 조건 보존이 아니라, 파킹으로 덮이지도 않는다.
const BRIEF_KEY = "econ-monitor:dash:brief";

type StoredBrief = { axis: Axis; q: string; restore: boolean };

const DEFAULT_BRIEF: StoredBrief = { axis: "KR", q: "", restore: true };

function readStoredBrief(): StoredBrief | null {
  try {
    const raw = localStorage.getItem(BRIEF_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredBrief>;
    const axis = AXES.find((a) => a.id === parsed.axis)?.id;
    if (!axis) return null;
    return { axis, q: typeof parsed.q === "string" ? parsed.q : "", restore: parsed.restore !== false };
  } catch {
    // 스토리지가 막힌 브라우저에서도 화면은 그대로 열려야 한다 — 복원만 포기한다.
    return null;
  }
}

function storeBrief(brief: StoredBrief): void {
  try {
    localStorage.setItem(BRIEF_KEY, JSON.stringify(brief));
  } catch {
    // 같은 이유로 조용히 넘어간다. 저장 실패는 조회를 막지 않는다.
  }
}

// 체크박스를 끈 채로 닫았으면 다음 진입은 기본값으로 연다. 다만 **끈 선택 자체는** 남겨야
// 한다 — 기억하지 않으면 매번 다시 꺼야 하고, 그러면 체크박스가 조건이 아니라 잔소리가 된다.
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
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    storeBrief({ axis, q, restore });
  }, [axis, q, restore]);

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

  // 검색은 **보기를 좁히는 것**이라 조회를 다시 걸지 않는다 — 서빙이 검색어를 받지 않고
  // (`api.dashboard(axis)`), 목업도 같은 자리에서 이미 받은 목록을 거른다(`rows()` 의
  // `indexOf`). 대소문자를 구분하는 것까지 목업과 같다.
  const needle = q.trim();
  const ranked = data ? data.top_subjects.filter((r) => r.subject.includes(needle)) : [];
  const maxShare = Math.max(...ranked.map((r) => r.normalized_share), 0.0001);

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
        지금 <span className="b">{axisLabel(axis)} 축</span>에서 경제 여론이 어떤 서술 대상에 쏠려 있고,
        시간이 흐르며 어떻게 변하는지 — 정기 수집된 데이터를 <span className="b">서술 대상 기준</span>으로
        집계해 한눈에 보여줍니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      <div className="grid g-12">
        {data?.metrics.map((m) => (
          <div key={m.label} className="card metric col-3">
            <div className="card-b">
              <div className="ml">{m.label}</div>
              <div className="mv sm">{m.value}</div>
              <div className="md">{m.note}</div>
            </div>
          </div>
        ))}

        {/* STP-open-brief — 오늘의 조회 조건. 목업(`JRN-daily-scan.html` 화면 1)이 그대로
            스펙이다: 서빙에 새로 물을 것이 없고(축은 이미 조회 인자, 검색은 받아 둔 목록을
            거르는 일), 복원은 브라우저 저장소가 맡는다. 기간·단위 컨트롤은 여기 두지
            않는다 — 서빙이 기간 파라미터를 받지 않아 동작하지 않는 컨트롤이 되고, 그
            편차는 설계 트래커가 따로 등재한 행이다.

            카드를 응답 바깥에 두는 이유: 축을 바꾸면 조회가 다시 나가며 `data` 가 잠시
            비는데, 조건을 고르는 컨트롤이 그때마다 사라지면 방금 누른 자리가 없어진다.
            나머지 카드는 응답을 그리는 것이므로 함께 비는 것이 맞다. */}
        <div className="card col-4">
          <div className="card-h">
            <h3>오늘의 조회 조건</h3>
            <span className="sub">어제 닫을 때의 조건으로 열립니다</span>
          </div>
          <div className="card-b">
            <form onSubmit={(e) => e.preventDefault()}>
              <label className="dash-brief-field">
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
              <div>
                <b>조건을 매번 다시 맞추지 않습니다.</b>{" "}
                {"닫을 때의 축·검색 조건이 그대로 복원되어, 어제와 같은 화면에서 밤사이 변화만 보게 됩니다."}
              </div>
            </div>
          </div>
        </div>

        {data && (
          <>
            <div className="card col-8">
              <div className="card-h">
                <h3>상위 서술 대상</h3>
                <span className="sub">관심 점유율 · 정규화 비율 기준</span>
                <div className="r">
                  <span className="norm-flag">▣ 정규화</span>
                </div>
              </div>
              <div className="card-b" style={{ padding: "6px 12px" }}>
                <div className="ranklist">
                  {ranked.map((row) => (
                    <div
                      key={row.subject}
                      className="rankrow"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        navigate(`/trend?axis=${axis}&subject=${encodeURIComponent(row.subject)}`)
                      }
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
                  {/* 수집이 없는 것과 검색어가 좁힌 것은 다른 사건이라 문면을 가른다 —
                      목업도 같은 자리에서 후자만 따로 말한다(`emptybox`). */}
                  {data.top_subjects.length === 0 && (
                    <div className="placeholder-note">
                      데이터 없음 — 배치 파이프라인을 먼저 실행하세요.
                    </div>
                  )}
                  {data.top_subjects.length > 0 && ranked.length === 0 && (
                    <div className="dash-brief-empty">검색어에 걸리는 대상이 없습니다.</div>
                  )}
                </div>
              </div>
            </div>

            {/* 브리프 카드가 들어오며 위 행이 목업의 `col-4 + col-8` 로 찼다. 이 카드는
                대응하는 목업이 없는 구현 표면이라 폭을 고를 근거가 목업에 없고, 5칸으로
                두면 격자에 7칸이 빈 채 혼자 남는다 — 한 행을 통으로 쓴다. */}
            <div className="card col-12">
              <div className="card-h">
                <h3>전체 분위기 구성</h3>
                <span className="sub">{axisLabel(axis)} 축</span>
              </div>
              <div className="card-b">
                <SentBar dist={data.sentiment} />
                <div className="note info" style={{ marginTop: 13 }}>
                  <div>
                    <b>미분석 {pct(data.sentiment.unanalyzed)}</b>는 비율 집계에서 분리 표기됩니다. 분위기
                    100%는 분석 완료분 기준입니다.
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
          </>
        )}
      </div>

      {data && (
        <MapStrip
          chips={[
            { value: "J1", text: "단계 1 대시보드 진입" },
            { value: "V1", text: "시계열 추세 가시화", kind: "v" },
            { text: "AC3.2 · AC3.3 · AC3.5 · AC3.8" },
          ]}
        />
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
