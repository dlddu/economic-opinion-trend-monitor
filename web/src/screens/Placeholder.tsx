import { useEffect, useState } from "react";
import { api } from "../api/client";
import { MapStrip } from "../shell/MapStrip";
import type { ScreenDef } from "../shell/nav";

// Stand-in for the 6 not-yet-built screens: proves routing + the API fetch
// layer by showing the screen's stub endpoint response. Real screens are
// follow-up work (shell + dashboard only scope).
export function Placeholder({ screen }: { screen: ScreenDef }) {
  const [raw, setRaw] = useState<string>("불러오는 중…");

  useEffect(() => {
    let active = true;
    api
      .screen(screen.api)
      .then((d) => active && setRaw(JSON.stringify(d, null, 2)))
      .catch((e: unknown) => active && setRaw(String(e)));
    return () => {
      active = false;
    };
  }, [screen.api]);

  return (
    <>
      <p className="lede">
        이 화면(<span className="b">{screen.label}</span>)은 셸·라우팅·API 스텁만 갖춘{" "}
        <span className="b">플레이스홀더</span>입니다. 본 구현은 후속 기능 작업입니다.
      </p>
      <div className="card">
        <div className="card-h">
          <h3>{screen.label}</h3>
          <span className="sub">
            여정 {screen.journey} · <code>/api/{screen.api}</code> 스텁 응답
          </span>
        </div>
        <div className="card-b">
          <pre className="code">{raw}</pre>
        </div>
      </div>
      <MapStrip chips={[{ value: screen.journey, text: "여정 단계" }, { text: "후속 기능 작업" }]} />
    </>
  );
}
