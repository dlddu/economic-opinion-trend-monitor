import { NavLink } from "react-router-dom";
import { SCREENS, type ScreenDef } from "./nav";

// CMP-sidebar: brand + nav groups (Observer/Operator) + status foot.
export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="kicker">Economic Opinion</div>
        <h1>
          경제 여론
          <br />
          추세 모니터
        </h1>
        <div className="en">TREND MONITOR · v0 skeleton</div>
      </div>
      <nav className="nav">
        <NavGroup label="관찰 · Observer" screens={SCREENS.filter((s) => s.group === "observer")} />
        <NavGroup label="운영 · Operator" screens={SCREENS.filter((s) => s.group === "operator")} />
      </nav>
      <div className="sidebar-foot">
        <span className="dot" />
        수집 정상 · 12개 소스
        <br />
        마지막 수집 14:00 KST
      </div>
    </aside>
  );
}

function NavGroup({ label, screens }: { label: string; screens: ScreenDef[] }) {
  return (
    <div className="nav-group">
      <div className="gl">{label}</div>
      {screens.map((s) => (
        <NavLink
          key={s.id}
          to={s.path}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span>{s.label}</span>
          <span className="jn">{s.journey}</span>
        </NavLink>
      ))}
    </div>
  );
}
