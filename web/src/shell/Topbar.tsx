import { useLocation } from "react-router-dom";
import { SCREENS_BY_PATH } from "./nav";

// CMP-topbar: journey crumb + screen title, derived from the active route.
export function Topbar() {
  const { pathname } = useLocation();
  const screen = SCREENS_BY_PATH.get(pathname);
  return (
    <header className="topbar">
      <div className="crumb">
        <span className="step">여정 {screen?.journey ?? "—"}</span>
        <h2>{screen?.label ?? "경제 여론 추세 모니터"}</h2>
      </div>
      <div className="spacer" />
    </header>
  );
}
