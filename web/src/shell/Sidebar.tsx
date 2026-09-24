import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { SCREENS, type ScreenDef } from "./nav";

// 목업 여정 페이지들이 공유하는 네비 아이콘(`<svg class="ic">`) 그대로. 1180px 이하에서는 라벨이
// 숨고 이 아이콘만 남으므로, 아이콘이 없으면 빈 칸이 된다.
const ICONS: Record<string, ReactNode> = {
  dash: <path d="M3 13h4v8H3zM10 9h4v12h-4zM17 5h4v16h-4z" />,
  trend: (
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </>
  ),
  compare: <path d="M4 4v16M12 4v16M20 4v16" />,
  sentiment: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v18M3 12h18" />
    </>
  ),
  fairness: (
    <path d="M12 3v18M5 7l7-4 7 4M5 7l-2 6a4 4 0 008 0L9 7M19 7l-2 6a4 4 0 008 0l-2-6" />
  ),
  trace: (
    <>
      <path d="M14 3v5h5M8 13h8M8 17h5" />
      <path d="M19 8v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2h7z" />
    </>
  ),
  reprocess: <path d="M3 12a9 9 0 0115-6.7L21 8M21 3v5h-5M21 12a9 9 0 01-15 6.7L3 16M3 21v-5h5" />,
  debug: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3M8 11h6M11 8v6" />
    </>
  ),
};

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
        <NavGroup
          label="관찰 · Observer"
          persona="P1"
          screens={SCREENS.filter((s) => s.group === "observer")}
        />
        <NavGroup
          label="운영 · Operator"
          persona="P2"
          screens={SCREENS.filter((s) => s.group === "operator")}
        />
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

function NavGroup({
  label,
  persona,
  screens,
}: {
  label: string;
  /** Persona the group serves (mockup shows it as a right-aligned tag). */
  persona: string;
  screens: ScreenDef[];
}) {
  return (
    <div className="nav-group">
      <div className="gl">
        <span>{label}</span>
        <span className="vtag">{persona}</span>
      </div>
      {screens.map((s) => (
        <NavLink
          key={s.id}
          to={s.path}
          className={({ isActive }) =>
            `nav-item${s.group === "operator" ? " op" : ""}${isActive ? " active" : ""}`
          }
          title={s.label}
        >
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {ICONS[s.id]}
          </svg>
          <span>{s.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
