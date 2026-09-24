import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { TraceResponse } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// 급등 검증의 마지막 갈래: 집계가 내놓은 수치를 낳은 **기사 한 건까지** 내려간다.
//
// `fairness` 가 「정규화하면 순위가 뒤집힌다」까지 보여 줘도 그것만으로는 판정이
// 서지 않는다 — 편중을 의심할 근거일 뿐이고, 근거를 확인하려면 실제로 무엇이
// 쓰였는지 읽어야 한다. 그 내려가는 길이 이 화면이다.
//
// **이 화면의 설계 원칙은 「모자란 것을 뭉치지 않는다」이다.** 셋은 서로 다른 뜻이고
// 독자에게 다른 행동을 시킨다:
//
//   - `found=false` — 수집된 적이 없다. 추적이 시작조차 못 한다.
//   - `bronze.body_preserved=false` — 관측은 있는데 본문이 없다.
//   - `silver=null` — 수집됐지만 아직 분석되지 않았다(파이프라인이 거기까지 안 갔다).

/** 원문 주소로 **이동할 수 있는가** — http(s) 만 링크로 만든다. 수집원이 준 문자열을 그대로
 *  href 에 넣으면 `javascript:` 같은 값이 클릭 가능한 코드가 되므로 스킴을 먼저 본다. */
function openableUrl(url: string | null | undefined): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null;
}

const STATUS_LABEL: Record<string, string> = {
  analyzed: "분석됨",
  low_confidence: "저신뢰 — 분류에서 제외",
  unanalyzed: "미분석",
};

const SENTIMENT_LABEL: Record<string, string> = {
  positive: "긍정",
  neutral: "중립",
  negative: "부정",
  mixed: "혼재",
};

/** 분위기 배지 색. 미분석은 네 분류와 같은 색을 쓰지 않는다. */
function sentimentBadge(s: string | null): string {
  if (s === "positive") return "b-pos";
  if (s === "negative") return "b-neg";
  return "b-neu";
}

export function Trace() {
  // 조회 대상은 URL 의 `?record_id=` 가 소유한다. 다른 화면(판단 디버깅의 「원문 추적 상세」
  // CTA 등)이 고른 결과를 실어 보내면 그 기사로 바로 열리고, 여기서 조회하면 주소가 따라
  // 바뀌어 지금 보는 기사를 링크로 공유할 수 있다.
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get("record_id")?.trim() ?? "";
  const [recordId, setRecordId] = useState(query);
  const [data, setData] = useState<TraceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 주소가 바뀌면(뒤로 가기, 다른 화면에서 온 링크) 입력칸도 그 값을 따른다.
  useEffect(() => {
    setRecordId(query);
  }, [query]);

  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    api
      .trace(query || undefined)
      .then((d) => active && setData(d))
      .catch((e: unknown) => active && setError(String(e)));
    return () => {
      active = false;
    };
  }, [query]);

  const bronze = data?.bronze ?? null;
  const silver = data?.silver ?? null;
  // 링크가 죽었는데 사본이 남아 있는 상태 — 이 화면이 존재하는 이유 그 자체다.
  const linkDead = Boolean(bronze && !bronze.body_available);
  const bodyLost = Boolean(bronze && !bronze.body_preserved);

  return (
    <>
      <div className="dash-controls">
        {/* 조회 축은 record_id 하나다. 비우면 서빙이 첫 관측을 고르고, 무엇을
            골랐는지 응답이 말한다 — 화면이 이름을 먼저 지어내지 않는다. */}
        <form
          className="trace-lookup"
          onSubmit={(e) => {
            e.preventDefault();
            const next = recordId.trim();
            setSearchParams(next ? { record_id: next } : {});
          }}
        >
          {/* 이 화면의 클래스는 `.trace-` 접두사를 벗지 않는다 — 목업 인라인 CSS 와
              이름을 공유하면 안 된다(설계 트래커 「규칙 5」). */}
          <label className="trace-field">
            <span className="trace-field-label">record_id</span>
            <input
              type="text"
              value={recordId}
              placeholder="비우면 첫 관측"
              onChange={(e) => setRecordId(e.target.value)}
            />
          </label>
          <button type="submit">원문까지 내려가기</button>
        </form>
      </div>

      <p className="lede">
        순위가 뒤집힌다는 것까지는 집계가 말해 줍니다. 그것이{" "}
        <span className="b">실제로 무엇이었는지</span>는 원문을 읽어야 압니다 — 집계 수치에서
        분석 레코드를 거쳐 수집된 기사 한 건까지 내려갑니다.
      </p>

      {error && (
        <div className="note">
          <div>
            <b>API 오류:</b> {error} — Go 서빙(:8080)이 떠 있고 파이프라인이 실행됐는지 확인하세요.
          </div>
        </div>
      )}
      {!data && !error && <div className="placeholder-note">불러오는 중…</div>}

      {data && !data.found && (
        <div className="placeholder-note">
          {data.selection === "requested-missing" ? (
            <>
              <span className="mono">{data.record_id}</span> 는 Bronze 에 없습니다 — 수집된 적이
              없거나 다른 주기의 레코드입니다. <b>조회가 실패한 것이 아니라 추적이 시작되지
              않습니다.</b>
            </>
          ) : (
            <>
              수집된 레코드가 아직 하나도 없습니다. 파이프라인이 한 번도 돌지 않은 상태와 추적
              실패는 다릅니다 — <b>빈 계보를 그리지 않습니다.</b>
            </>
          )}
        </div>
      )}

      {data && data.found && bronze && (
        <>
          {/* PAT-lineage — 원문 계보 추적. */}
          <div className="trace-crumb">
            {/* CMP-crumb — 계보 경로 칩 스트립. 없는 홉을 숨기지 않고 끊긴 자리를
                드러낸다: 「분석 없음」과 「수집 없음」은 독자에게 다른 뜻이다. */}
            {data.crumb.map((step, i) => (
              <span key={step.layer}>
                {i > 0 && <span className="trace-crumb-sep">→</span>}
                <span className={`trace-crumb-step${step.present ? "" : " trace-crumb-gap"}`}>
                  <span className="mono">{step.layer}</span> {step.label}
                  {!step.present && " 없음"}
                </span>
              </span>
            ))}
            {data.selection === "auto" && (
              <span className="trace-auto">
                조회 없이 열어 <b>첫 관측</b>을 골랐습니다
              </span>
            )}
          </div>

          <div className="grid g-12">
            <div className="card col-7">
              <div className="card-h">
                <h3>{bronze.title}</h3>
                <span className="sub">
                  {bronze.source_id} · {data.ingestion.collected_at} 수집
                </span>
                <div className="r">
                  {/* CMP-badge — 링크 상태는 항상 표시한다(목업 `link-badge`). */}
                  <span className={`badge ${linkDead ? "b-neg" : "b-pos"}`}>
                    {linkDead ? "링크 끊김" : "링크 정상"}
                  </span>
                </div>
              </div>
              <div className="card-b">
                {/* CMP-note — 링크가 죽어도 추적이 여기서 끊기지 않는 이유(AC1.4). */}
                <div className="note">
                  <div>
                    {linkDead ? (
                      <>
                        <b>원문 주소가 열리지 않습니다.</b>{" "}
                        추적이 여기서 끊기지 않도록, 수집 시점에{" "}
                        <b>보존해 둔 원문 전체</b>를 대신 보여 줍니다.{" "}
                        링크 상태는 위에 배지로 항상 표시됩니다.
                      </>
                    ) : (
                      <>원래 주소가 정상 응답합니다. 보존 사본과 함께 대조해 볼 수 있습니다.</>
                    )}
                  </div>
                </div>

                <div className="kv">
                  <span className="k">원문 주소</span>
                  <span className="v mono trace-url">{bronze.source_url}</span>
                </div>
                {/* 원래 기사로 나간다(새 탭). 링크가 끊긴 기사에는 열리지 않을 버튼을 두지 않는다 —
                    그때는 위 안내대로 보존 사본이 원문 역할을 한다. */}
                {!linkDead && openableUrl(bronze.source_url) && (
                  <div className="trace-open">
                    <a
                      className="btn sm"
                      href={openableUrl(bronze.source_url) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      원문 열기 ↗
                    </a>
                  </div>
                )}

                {bodyLost ? (
                  <div className="placeholder-note">
                    본문이 보존되지 않았습니다(<span className="mono">{bronze.body_hash}</span> 에
                    대응하는 레코드 없음). <b>관측은 남아 있고 본문만 없습니다</b> — 수집은 됐다는
                    뜻이라 위 메타는 그대로 읽을 수 있습니다.
                  </div>
                ) : (
                  <p className="trace-body">{bronze.body_text}</p>
                )}
              </div>
            </div>

            <div className="col-5 grid trace-side">
              <div className="card">
                <div className="card-h">
                  <h3>분석</h3>
                  <span className="sub">이 기사가 어떻게 분류됐는가</span>
                </div>
                <div className="card-b">
                  {silver ? (
                    /* CMP-kv */
                    <>
                      <div className="kv">
                        <span className="k">상태</span>
                        <span className="v">
                          {STATUS_LABEL[silver.analysis_status] ?? silver.analysis_status}
                        </span>
                      </div>
                      <div className="kv">
                        <span className="k">분위기</span>
                        <span className="v">
                          {silver.sentiment ? (
                            <span className={`badge ${sentimentBadge(silver.sentiment)}`}>
                              {SENTIMENT_LABEL[silver.sentiment] ?? silver.sentiment}
                            </span>
                          ) : (
                            /* 네 분류 중 하나로 그리지 않는다 — 제외된 것이지
                               중립인 것이 아니다(AC2.5). */
                            <span className="meta">분류에서 제외됨 — 네 분류 어디에도 넣지 않습니다</span>
                          )}
                        </span>
                      </div>
                      <div className="kv">
                        <span className="k">대상국</span>
                        <span className="v">{silver.target_countries.join(" · ") || "—"}</span>
                      </div>
                      <div className="kv">
                        <span className="k">서술 대상</span>
                        <span className="v">{silver.narrative_subjects.join(" · ") || "—"}</span>
                      </div>
                      <div className="kv">
                        <span className="k">신뢰도</span>
                        <span className="v mono">{silver.confidence.toFixed(2)}</span>
                      </div>
                      <div className="kv">
                        <span className="k">analyzer</span>
                        <span className="v mono">{silver.analyzer_version}</span>
                      </div>
                    </>
                  ) : (
                    <div className="placeholder-note">
                      이 기사는 <b>아직 분석되지 않았습니다</b> — 분석 레코드 자체가 없습니다.
                      미분석으로 분류된 것과는 다릅니다: 저쪽은 분석이 판단을 내린 결과이고, 이쪽은
                      파이프라인이 아직 거기까지 가지 않은 것입니다.
                    </div>
                  )}
                </div>
              </div>

              {/* CMP-kv — 수집 메타. 언제·어느 주기에 걷힌 관측인지(AC1.5). */}
              <div className="card">
                <div className="card-h">
                  <h3>수집 메타</h3>
                </div>
                <div className="card-b">
                  <div className="kv">
                    <span className="k">수집 시각</span>
                    <span className="v mono">{data.ingestion.collected_at}</span>
                  </div>
                  <div className="kv">
                    <span className="k">수집 주기</span>
                    <span className="v mono">{data.ingestion.collection_cycle}</span>
                  </div>
                  <div className="kv">
                    <span className="k">수집 시 순위</span>
                    <span className="v mono">{data.ingestion.rank}</span>
                  </div>
                  <div className="kv">
                    <span className="k">조회수</span>
                    <span className="v mono">{data.ingestion.view_count}</span>
                  </div>
                  <div className="kv">
                    <span className="k">본문 해시</span>
                    <span className="v mono trace-url">{bronze.body_hash}</span>
                  </div>
                  {!bodyLost && (
                    <div className="kv">
                      <span className="k">본문 최초 관측</span>
                      <span className="v mono">{bronze.body_first_seen_cycle}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CMP-note — 열지 않은 단계의 사유. 링크도 버튼도 두지 않는다. */}
              <div className="note">
                <div>
                  <b>판정 기록</b>은 아직 열 수 없습니다. 「유효한 신호」/「수집 편중」 판정을
                  남기려면 검증 이력을 저장할 곳이 있어야 하는데, 여정 문서가 그 영속화를{" "}
                  <b>현재 범위 밖</b>으로 파킹했습니다. 쓸 곳 없는 버튼을 두는 대신 없다고 적습니다.
                </div>
              </div>
            </div>
          </div>

          <MapStrip
            chips={[
              { value: "JRN-spike-verification", text: "여정" },
              { value: "STP-open-origin", text: "단계" },
              { value: "AC2.6 · AC1.4", text: "추적 키 · 원문 보존" },
              {
                text: `${data.crumb.filter((s) => s.present).length}/3 계층 · ${bronze.record_id}`,
              },
            ]}
          />
        </>
      )}
    </>
  );
}
