import { useContext } from "react";
import { useLocation } from "react-router-dom";
import { SCREENS_BY_PATH } from "./nav";
import { TopbarContext } from "./topbarSlot";

// CMP-topbar: screen title (the route's, unless the screen lifts its own) and
// the screen's condition pill. The mockups carry no journey crumb here — the
// journey id lives in the folded 「여정 문서 정보」 layer, not on the product plane.
export function Topbar() {
  const { pathname } = useLocation();
  const { override } = useContext(TopbarContext);
  const screen = SCREENS_BY_PATH.get(pathname);
  const title = override?.title ?? screen?.label ?? "경제 여론 추세 모니터";
  return (
    <header className="topbar">
      <div className="crumb">
        <h2>{title}</h2>
      </div>
      <div className="spacer" />
      {override?.pill && (
        <div className="ctl">
          <span className="pill-ctl">{override.pill}</span>
        </div>
      )}
    </header>
  );
}
