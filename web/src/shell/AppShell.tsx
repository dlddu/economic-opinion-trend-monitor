import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// PAT-screen-shell: sidebar + (topbar over the routed screen canvas).
export function AppShell() {
  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <Topbar />
        <main className="canvas">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
