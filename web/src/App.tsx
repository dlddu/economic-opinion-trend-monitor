import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./shell/AppShell";
import { Compare } from "./screens/Compare";
import { Dashboard } from "./screens/Dashboard";
import { Fairness } from "./screens/Fairness";
import { Placeholder } from "./screens/Placeholder";
import { Sentiment } from "./screens/Sentiment";
import { Trace } from "./screens/Trace";
import { Trend } from "./screens/Trend";
import { SCREENS } from "./shell/nav";

// Screens that have landed as real views; the rest still render Placeholder.
const BUILT = new Set(["dash", "compare", "trend", "sentiment", "fairness", "trace"]);

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/compare" element={<Compare />} />
        <Route path="/trend" element={<Trend />} />
        <Route path="/sentiment" element={<Sentiment />} />
        <Route path="/fairness" element={<Fairness />} />
        <Route path="/trace" element={<Trace />} />
        {SCREENS.filter((s) => !BUILT.has(s.id)).map((s) => (
          <Route key={s.id} path={s.path} element={<Placeholder screen={s} />} />
        ))}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  );
}
