import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { TraceResponse } from "../api/types";
import { MapStrip } from "../shell/MapStrip";

// 급등 검증의 마지막 갈래: 집계가 내놓은 수치를 낳은 **기사 한 건까지** 내려간다.
//
// `fairness` 가 「정규화하면 순위가 뒤집힌다」까지 보여 줘도 그것만으로는 판정이
// 서지 않는다 — 편중을 의심할 근거일 뿐이고, 근거를 확인하려면 실제로 무엇이
// 쓰였는지 읽어야 한다. 그 내려가는 길이 이 화면이다.
//
// 축은 `record_id` 하나다. Bronze `news_item` 이 그 키를 갖고, Silver `analysis`
// 가 같은 값을 갖고(AC2.6), 본문은 item 의 `body_hash` 로 따로 걸린다(AC1.7).
// 서빙이 세 계층을 한 응답으로 모아 주므로 화면은 조인을 다시 하지 않는다.
//
// **이 화면의 설계 원칙은 「모자란 것을 뭉치지 않는다」이다.** 셋은 서로 다른 뜻이고
// 독자에게 다른 행동을 시킨다:
//
//   - `found=false` — 수집된 적이 없다. 추적이 시작조차 못 한다.
//   - `bronze.body_preserved=false` — 관측은 있는데 본문이 없다.
//   - `silver=null` — 수집됐지만 아직 분석되지 않았다(파이프라인이 거기까지 안 갔다).
//
// 셋을 한 덩어리 「데이터 없음」으로 그리면 독자는 자기 조회가 실패했다고 읽는다.
// 그래서 계보 브레드크럼이 **끊긴 자리를 드러내며** 그려진다.
//
// 열지 않는 단계: 목업 여정의 `STP-judge`(판정과 종료)는 판정 결과의 영속화
// (검증 이력·플래그)가 필요한데, 여정 문서 자신이 그것을 「현재 범위 밖, 백로그
// 후보」로 파킹했다. 없는 저장소에 쓰는 버튼을 두는 대신 왜 없는지를 note 로 밝힌다
// (슬라이스 5·6·8 의 선례).

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
  const [recordId, setRecordId] = useState("");
  const [query, setQuery] = useState("");
  const [data, setData] = useState<TraceResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

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
            setQuery(recordId.trim());
          }}
        >
          {/* 클래스는 `.trace-` 접두사로 둔다 — 목업 인라인 CSS 와 선택자를
              공유하면 규칙 5 가 선언 단위로 대조하게 되고, 이 화면의 폼은 목업의
              폼 행과 구조가 달라 그 대조가 의미를 갖지 않는다. */}
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
          {/* PAT-lineage — 원문 계보 추적. `CMP-crumb`(Bronze→Silver→Gold 경로
              칩) + Bronze 원문 카드 + Silver 분석 카드 + 수집 메타 카드의 조합으로,
              골드 수치에서 원문까지 역추적한다(V5, AC2.6/1.4). 목업 여정 페이지의
              `STP-open-origin` 이 그리는 표면이다. */}
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
                        원래 주소는 더 이상 응답하지 않습니다. 아래는{" "}
                        <b>수집 시점에 보존한 사본</b>입니다.
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
