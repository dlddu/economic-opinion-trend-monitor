import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { AxisColumn, CompareResponse, SentimentDistribution } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// AC3.7 — the three axes side by side on one basis (J2 / V2).
//
// The comparison only means something if every column is read on the same
// terms, so the shared basis the API compared on (time bucket + normalized
// ratios) is shown above the columns instead of being assumed, and the share
// bars are scaled by one maximum taken across all three axes — a bar twice as
// long is twice the share no matter which column it sits in.

const AXES: { id: AxisColumn["axis"]; label: string; pill: string }[] = [
  { id: "KR", label: "한국 · 출처 축", pill: "ax-kr" },
  { id: "US", label: "미국 · 출처 축", pill: "ax-us" },
  { id: "GLOBAL", label: "전세계 · 출처 축", pill: "ax-gl" },
];

const UNIT_LABEL: Record<string, string> = { hour: "시간", day: "일", week: "주" };

function pct(x: number): string {
  return `${(x * 100).toFixed(1)}%`;
}

export function Compare() {
  const [data, setData] = useState<CompareResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api
      .compare()
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, []);

  const columns = new Map((data?.axes ?? []).map((c) => [c.axis, c]));
  // One scale for every column: shares are only comparable across axes if the
  // bars are drawn against a shared maximum.
  const maxShare = Math.max(
    ...(data?.axes ?? []).flatMap((c) => c.top_subjects.map((r) => r.normalized_share)),
    0.0001,
  );

  return (
    <>
      <p className="lede">
        같은 시점 · 같은 기준으로 <span className="b">한국 · 미국 · 전세계</span> 세 축을 나란히 두고, 무엇이 각 축의
        경제 여론 중심인지 대조합니다.
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
          <div className="cmp-basis">
            <span className="lab">세 축 공통 기준</span>
            <span className="cmp-bucket">{data.basis.time_bucket || "—"}</span>
            <span className="cmp-unit">
              {UNIT_LABEL[data.basis.bucket_unit] ?? data.basis.bucket_unit} 단위
            </span>
            {data.basis.normalized && <span className="norm-flag">▣ 정규화 비율</span>}
          </div>

          <div className="note">
            <div>
              <b>두 가지 축이 다릅니다.</b> 이 화면의 열은 뉴스를 <b>수집한 출처 축</b>(KR / US / GLOBAL)입니다.
              콘텐츠가 다루는 대상 국가는 별개이며, 미국 출처 뉴스가 한국 경제를 다룰 수 있습니다.
            </div>
          </div>

          <div className="grid">
            {AXES.map((a) => (
              <section key={a.id} className="card col-4 cmpcol" data-axis={a.id}>
                <div className="card-h">
                  <span className={`axpill ${a.pill}`}>
                    <span className="fl" />
                    {a.id}
                  </span>
                  <h3>{a.label}</h3>
                </div>
                <div className="card-b">
                  <AxisRows column={columns.get(a.id)} maxShare={maxShare} />
                </div>
              </section>
            ))}
          </div>

          <MapStrip
            chips={[
              { value: "J2", text: "3축 비교 뷰" },
              { value: "V2", text: "지역 축 간 비교", kind: "v" },
              { text: "AC3.7" },
            ]}
          />
        </>
      )}
    </>
  );
}

function AxisRows({ column, maxShare }: { column?: AxisColumn; maxShare: number }) {
  if (!column || column.top_subjects.length === 0) {
    return (
      <div className="placeholder-note cmp-empty">이 시점에 이 축의 데이터가 없습니다.</div>
    );
  }
  return (
    <>
      {column.top_subjects.map((row) => (
        <div key={row.subject} className="cmprow">
          <div className="top">
            <span className="nm">
              {row.rank}. {row.subject}
              <span className="meta">원시 {row.raw_count}건</span>
            </span>
            <span className="pct">{pct(row.normalized_share)}</span>
          </div>
          <div className="bar">
            <i style={{ width: pct(row.normalized_share / maxShare) }} />
          </div>
        </div>
      ))}
      <MiniSent dist={column.sentiment} />
    </>
  );
}

function MiniSent({ dist }: { dist: SentimentDistribution }) {
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
  const total = segs.reduce((sum, s) => sum + s.w, 0);
  if (total <= 0) {
    return <div className="placeholder-note cmp-nosent">분위기 집계 없음</div>;
  }
  return (
    <div className="cmp-sent">
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
    </div>
  );
}
