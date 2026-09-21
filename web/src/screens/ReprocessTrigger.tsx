import { useEffect, useState } from "react";
import { api } from "../api/client";
import type {
  ReprocessDecision,
  ReprocessResponse,
  ReprocessRun,
  ReprocessSubmit,
} from "../api/types";

// 재처리 콘솔의 쓰기 절반 — `JRN-logic-backfill` 의 일으키는 세 단계(`STP-dry-run`·`STP-run-reprocess`·`STP-publish`).
// 무엇을 일으키고 왜 서빙이 쓰지 않는지, 언제 그려지는지는 이 POST 들을 받는 go/internal/handlers/reprocess_trigger.go 머리가 주인이다.

const POLL_MS = 5000;
const ACTIVE = new Set(["Pending", "Running"]);

const KIND_LABEL: Record<ReprocessRun["kind"], string> = {
  sample: "표본",
  run: "전량",
  publish: "결정",
};

const PHASE_LABEL: Record<string, { text: string; cls: string }> = {
  Pending: { text: "대기", cls: "b-neu" },
  Running: { text: "실행 중", cls: "b-mix" },
  Succeeded: { text: "완료", cls: "b-pos" },
  Failed: { text: "실패", cls: "b-neg" },
  Error: { text: "오류", cls: "b-neg" },
};

const isActive = (r: ReprocessRun) => ACTIVE.has(r.phase);
const done = (r: ReprocessRun) => r.phase === "Succeeded";
const failed = (r: ReprocessRun) => r.phase === "Failed" || r.phase === "Error";

function phaseBadge(r: ReprocessRun) {
  const p = PHASE_LABEL[r.phase] ?? { text: r.phase, cls: "b-neu" };
  return (
    <span className={`badge ${p.cls}`}>
      <span className="d" />
      {p.text}
    </span>
  );
}

type Props = {
  data: ReprocessResponse;
  scope: Pick<ReprocessSubmit, "range" | "axis" | "source">;
  /** How many compare rows cross the threshold right now (the publish gate reads it). */
  overThreshold: number;
  /** Ask the read half to fetch again — a run finished, so the counts moved. */
  onChanged: () => void;
};

export function ReprocessTrigger({ data, scope, overThreshold, onChanged }: Props) {
  const [runs, setRuns] = useState<ReprocessRun[]>(data.trigger.runs);
  const [version, setVersion] = useState(data.target_version);
  const [sampleSize, setSampleSize] = useState(50);
  const [sampleMode, setSampleMode] = useState<"random" | "recent">("random");
  const [batchSize, setBatchSize] = useState(100);
  const [decision, setDecision] = useState<ReprocessDecision["decision"] | "">("");
  const [memo, setMemo] = useState("");
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState<"sample" | "run" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recorded, setRecorded] = useState<string | null>(null);

  useEffect(() => setRuns(data.trigger.runs), [data]);
  useEffect(() => {
    if (data.target_version && !version) setVersion(data.target_version);
  }, [data.target_version, version]);

  useEffect(() => {
    if (!runs.some(isActive)) return;
    const timer = setInterval(() => {
      api
        .reprocessRuns()
        .then((r) => {
          const finished = runs.some((old) => {
            const now = r.runs.find((n) => n.name === old.name);
            return isActive(old) && now && !isActive(now);
          });
          setRuns(r.runs);
          if (finished) onChanged();
        })
        .catch(() => {
          /* the next tick asks again; a missed poll is not an error to show */
        });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [runs, onChanged]);

  const samples = runs.filter((r) => r.kind === "sample" && r.parameters.version === version);
  const fulls = runs.filter((r) => r.kind === "run" && r.parameters.version === version);
  const sampleDone = samples.some(done);
  const fullDone = fulls.some(done);
  const lastFull = fulls[0];
  const lastSample = samples[0];
  const anyActive = runs.some(isActive);
  const servingVersion = data.trigger.serving_version;
  const rollbackTarget = data.compare.available ? data.compare.before_version : servingVersion;

  const submit = async (kind: "sample" | "run" | "publish") => {
    setBusy(kind);
    setError(null);
    setRecorded(null);
    try {
      let out: { run: ReprocessRun };
      if (kind === "publish") {
        if (!decision) throw new Error("반영할지 되돌릴지를 먼저 고르세요.");
        if (!memo.trim())
          throw new Error(
            "결정 근거를 적어야 기록됩니다 — 근거가 없으면 나중에 숫자가 왜 바뀌었는지 설명할 수 없습니다.",
          );
        const target = decision === "publish" ? version : rollbackTarget;
        if (!target) throw new Error("되돌릴 이전 버전이 없습니다 — 두 버전이 병존해야 되돌릴 수 있습니다.");
        out = await api.reprocessPublish({
          decision,
          analyzer_version: target,
          memo: memo.trim(),
          notify_consumer: notify,
        });
        setRecorded(
          `${decision === "publish" ? `새 결과(${target})를 반영` : `이전 버전(${target})으로 롤백`}하기로 기록했습니다.`,
        );
      } else {
        const body: ReprocessSubmit = { ...scope, analyzer_version: version.trim(), batch_size: batchSize };
        if (kind === "sample") {
          body.sample_size = sampleSize;
          body.sample_mode = sampleMode;
        }
        out = kind === "sample" ? await api.reprocessSample(body) : await api.reprocessRun(body);
      }
      setRuns((prev) => [out.run, ...prev]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const runRow = (r: ReprocessRun) => (
    <tr key={r.name}>
      <td>{KIND_LABEL[r.kind] ?? r.kind}</td>
      <td>
        <b className="mono">{r.parameters.version || r.parameters.decision || "—"}</b>
      </td>
      <td className="mono">{r.parameters.sample && r.parameters.sample !== "0" ? `${r.parameters.sample}건` : r.annotations["econ-monitor/range"] ?? "—"}</td>
      <td>{phaseBadge(r)}</td>
      <td className="mono rp-run-name">{r.name}</td>
    </tr>
  );

  return (
    <div className="rp-run-controls">
      {error && (
        <div className="note rp-block rp-error">
          <div>
            <b>실행하지 못했습니다:</b> {error}
          </div>
        </div>
      )}

      {/* ---- STP-dry-run — 표본 재분석으로 영향 가늠 ---- */}
      <div className="grid g-12 rp-block">
        <div className="card col-7">
          <div className="card-h">
            <h3>표본 재분석</h3>
            <span className="sub">
              {lastSample ? `최근 표본 ${lastSample.parameters.sample}건 · ${PHASE_LABEL[lastSample.phase]?.text ?? lastSample.phase}` : "고른 범위에서 일부만 새 로직으로 돌립니다"}
            </span>
            <div className="r">
              <span className="rp-tag">{sampleDone ? "전량 실행이 열렸습니다" : "전량은 아직 잠겨 있습니다"}</span>
            </div>
          </div>
          <div className="card-b">
            <div className="rp-form">
              <label className="rp-field">
                <span>목표 로직 버전</span>
                <input className="mono" value={version} onChange={(e) => setVersion(e.target.value)} placeholder="예: llm-v2" />
              </label>
              <label className="rp-field">
                <span>표본 크기 (건)</span>
                <input type="number" min={10} max={500} step={10} value={sampleSize} onChange={(e) => setSampleSize(Number(e.target.value) || 0)} />
              </label>
              <label className="rp-field">
                <span>표본 추출</span>
                <select value={sampleMode} onChange={(e) => setSampleMode(e.target.value as "random" | "recent")}>
                  <option value="random">무작위</option>
                  <option value="recent">최근 수집 순</option>
                </select>
              </label>
            </div>
            <button className="btn pri rp-sample" disabled={busy !== null || anyActive || !version.trim() || data.scope.todo === 0} onClick={() => submit("sample")}>
              {busy === "sample" ? "제출 중…" : "표본 실행"}
            </button>
            {data.scope.todo === 0 && (
              <p className="rp-muted">이 범위에는 목표 버전으로 다시 분석할 원문이 없습니다 — 범위나 버전을 바꿔 보세요.</p>
            )}
            {samples.length > 0 && (
              /* CMP-table */
              <table className="tbl rp-runs">
                <thead>
                  <tr>
                    <th>종류</th>
                    <th>버전</th>
                    <th>범위</th>
                    <th>상태</th>
                    <th>Workflow</th>
                  </tr>
                </thead>
                <tbody>{samples.slice(0, 5).map(runRow)}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card col-5">
          <div className="card-h">
            <h3>표본 요약</h3>
            <span className="sub">전량 실행 전의 마지막 관문</span>
          </div>
          <div className="card-b">
            {/* CMP-kv */}
            <div className="kv">
              <span className="k">표본 크기</span>
              <span className="v">{sampleSize}건</span>
            </div>
            <div className="kv">
              <span className="k">추출 방식</span>
              <span className="v">{sampleMode === "random" ? "무작위" : "최근 수집 순"}</span>
            </div>
            <div className="kv">
              <span className="k">재분류 비율</span>
              <span className="v">
                {sampleDone && data.compare.available
                  ? `임계 초과 ${overThreshold}개 / ${data.compare.rows.length}개 대상`
                  : "— (표본이 끝나면 전후 표에서 읽습니다)"}
              </span>
            </div>
            <div className="kv">
              <span className="k">전량 실행</span>
              <span className="v rp-gate">{sampleDone ? "열림" : "잠김"}</span>
            </div>
            <p className="rp-muted">
              표본을 건너뛰고 전량을 돌리면, 기준이 어긋났다는 사실을 과거 데이터가 이미 바뀐 뒤에 알게 됩니다.
            </p>
          </div>
        </div>
      </div>

      {/* ---- STP-run-reprocess — 전량 재분석 실행 ---- */}
      <div className="grid g-12 rp-block">
        <div className="card col-7">
          <div className="card-h">
            <h3>전량 재분석</h3>
            <span className="sub">
              {lastFull ? `${PHASE_LABEL[lastFull.phase]?.text ?? lastFull.phase} · ${lastFull.name}` : "고른 범위 전체에 새 로직을 적용합니다"}
            </span>
            <div className="r">
              <span className="rp-tag">원문 되짚기 키 유지</span>
            </div>
          </div>
          <div className="card-b">
            <div className="rp-form">
              <label className="rp-field">
                <span>적용할 분석 로직</span>
                <input className="mono" value={version} onChange={(e) => setVersion(e.target.value)} />
              </label>
              <label className="rp-field">
                <span>배치 크기 (건)</span>
                <input type="number" min={50} max={500} step={50} value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value) || 0)} />
              </label>
            </div>
            <p className="rp-muted rp-keep">
              이전 결과는 그대로 두고 새 버전을 나란히 쌓습니다 — 전후 비교와 되돌리기가 모두 가능합니다. 배치마다 체크포인트를 남기므로 도중에 끊겨도 그 지점부터 이어서 재개합니다.
            </p>
            <button className="btn pri rp-full" disabled={busy !== null || anyActive || !sampleDone || !version.trim()} onClick={() => submit("run")}>
              {busy === "run" ? "제출 중…" : lastFull && failed(lastFull) ? "체크포인트부터 이어서 재개" : "전량 실행"}
            </button>
            {!sampleDone && <span className="rp-hint">표본을 먼저 돌리세요.</span>}
            {lastFull && failed(lastFull) && (
              <div className="note rp-note rp-interrupted">
                <div>
                  <b>도중에 끊겼습니다.</b> 처음부터 다시 돌리지 않습니다 — 체크포인트까지는 그대로 두고 그 지점부터 이어서 재개하세요.
                  {lastFull.message && <> ({lastFull.message})</>}
                </div>
              </div>
            )}
            {fulls.length > 0 && (
              <table className="tbl rp-runs">
                <thead>
                  <tr>
                    <th>종류</th>
                    <th>버전</th>
                    <th>범위</th>
                    <th>상태</th>
                    <th>Workflow</th>
                  </tr>
                </thead>
                <tbody>{fulls.slice(0, 5).map(runRow)}</tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card col-5">
          <div className="card-h">
            <h3>실행 범위</h3>
            <span className="sub">화면 1에서 고른 그대로</span>
          </div>
          <div className="card-b">
            <div className="kv">
              <span className="k">대상</span>
              <span className="v">{data.scope.todo}건</span>
            </div>
            <div className="kv">
              <span className="k">적용 로직</span>
              <span className="v mono">{version || "—"}</span>
            </div>
            <div className="kv">
              <span className="k">배치 크기</span>
              <span className="v">{batchSize}건</span>
            </div>
            <div className="kv">
              <span className="k">보존 방식</span>
              <span className="v">버전 병존</span>
            </div>
            <p className="rp-muted">병존으로 돌리면 어느 버전을 내보낼지는 마지막 화면에서 고릅니다.</p>
          </div>
        </div>
      </div>

      {/* ---- STP-publish — 반영 또는 롤백 결정 ---- */}
      <div className="grid g-12 rp-block">
        <div className="card col-7">
          <div className="card-h">
            <h3>반영 또는 되돌리기</h3>
            <span className="sub">{overThreshold > 0 ? "설명되지 않는 변화가 남아 있습니다" : "이 결정으로 재처리를 닫습니다"}</span>
          </div>
          <div className="card-b">
            {/* CMP-table */}
            <table className="tbl rp-checks">
              <thead>
                <tr>
                  <th>확인 항목</th>
                  <th className="num">값</th>
                  <th>판정</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["표본 선행", sampleDone ? "완료" : "건너뜀", sampleDone],
                  ["전량 재분석", fullDone ? "완료" : lastFull ? (PHASE_LABEL[lastFull.phase]?.text ?? lastFull.phase) : "미실행", fullDone],
                  ["임계 초과 항목", `${overThreshold}개`, overThreshold === 0],
                  ["되돌리기 가능 여부", "가능 (버전 병존)", true],
                ].map(([k, v, good]) => (
                  <tr key={String(k)}>
                    <td>{k}</td>
                    <td className="num">
                      <b>{v}</b>
                    </td>
                    <td>
                      <span className={`badge ${good ? "b-pos" : "b-mix"}`}>
                        <span className="d" />
                        {good ? "정상" : "확인 필요"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <form
              className="rp-publish"
              onSubmit={(e) => {
                e.preventDefault();
                void submit("publish");
              }}
            >
              <div className="rp-radios">
                <label>
                  <input type="radio" name="decision" value="publish" checked={decision === "publish"} onChange={() => setDecision("publish")} />
                  새 결과를 서빙에 반영한다 — 차이가 설명된다
                </label>
                <label>
                  <input type="radio" name="decision" value="rollback" checked={decision === "rollback"} onChange={() => setDecision("rollback")} />
                  이전 버전으로 되돌린다 — 설명되지 않는 변화가 남았다
                </label>
              </div>
              <label className="rp-field rp-memo">
                <span>결정 근거</span>
                <textarea value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="무엇이 왜 달라졌고 그것을 왜 내보내도 되는지(또는 안 되는지) 한 문단으로 적어 두세요." />
              </label>
              <label className="rp-check">
                <input type="checkbox" checked={notify} onChange={(e) => setNotify(e.target.checked)} />
                소비자 화면에 반영 시각과 로직 버전을 주석으로 노출한다
              </label>
              <button type="submit" className="btn pri rp-decide" disabled={busy !== null || anyActive}>
                {busy === "publish" ? "제출 중…" : "결정 기록"}
              </button>
            </form>
            {recorded && (
              <div className="note info rp-note rp-recorded">
                <div>
                  <b>결정을 기록했습니다.</b> {recorded} 배치가 그 버전으로 Gold 를 다시 세우면 서빙 버전이 바뀝니다.
                </div>
              </div>
            )}
            {data.trigger.decisions.length > 0 && (
              <table className="tbl rp-decisions">
                <thead>
                  <tr>
                    <th>기록 시각</th>
                    <th>결정</th>
                    <th>버전</th>
                    <th>근거</th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.trigger.decisions].reverse().slice(0, 5).map((d) => (
                    <tr key={d.decided_at + d.analyzer_version}>
                      <td className="mono">{d.decided_at}</td>
                      <td>{d.decision === "publish" ? "반영" : "롤백"}</td>
                      <td>
                        <b className="mono">{d.analyzer_version}</b>
                      </td>
                      <td>{d.memo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        <div className="card col-5">
          <div className="card-h">
            <h3>되돌릴 수 있나</h3>
            <span className="sub">결정 전에 확인할 것</span>
          </div>
          <div className="card-b">
            <div className="kv">
              <span className="k">지금 서빙 버전</span>
              <span className="v mono rp-serving">{servingVersion || "— (결정 없음 · 레코드별 최신)"}</span>
            </div>
            <div className="kv">
              <span className="k">반영할 버전</span>
              <span className="v mono">{version || "—"}</span>
            </div>
            <div className="kv">
              <span className="k">되돌릴 버전</span>
              <span className="v mono">{rollbackTarget || "—"}</span>
            </div>
            <div className="kv">
              <span className="k">소비자 주석</span>
              <span className="v">{notify ? "노출" : "미노출"}</span>
            </div>
            <p className="rp-muted">병존으로 돌렸다면 되돌리기는 서빙이 가리키는 버전을 바꾸는 일이고, 그 자리는 언제나 남아 있습니다.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
