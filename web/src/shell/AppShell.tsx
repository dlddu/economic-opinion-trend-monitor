import { useMemo, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { TopbarContext, type TopbarOverride } from "./topbarSlot";

// PAT-screen-shell: sidebar + (topbar over the routed screen canvas).
export function AppShell() {
  const [override, setOverride] = useState<TopbarOverride | null>(null);
  const slot = useMemo(() => ({ override, setOverride }), [override]);
  return (
    <TopbarContext.Provider value={slot}>
      <div className="app">
        <Sidebar />
        <div className="main">
          <Topbar />
          <main className="canvas">
            <Outlet />
          </main>
        </div>
      </div>
    </TopbarContext.Provider>
  );
}
