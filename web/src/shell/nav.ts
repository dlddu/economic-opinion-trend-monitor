// The screens (mockup index) -> client routes.

export interface ScreenDef {
  id: string;
  path: string;
  label: string;
  journey: string;
  group: "observer" | "operator";
  api: string;
}

export const SCREENS: ScreenDef[] = [
  { id: "dash", path: "/dashboard", label: "추세 대시보드", journey: "J1", group: "observer", api: "dashboard" },
  { id: "trend", path: "/trend", label: "대상 추세 상세", journey: "J1", group: "observer", api: "trend" },
  { id: "compare", path: "/compare", label: "3축 비교", journey: "J2", group: "observer", api: "compare" },
  { id: "sentiment", path: "/sentiment", label: "분위기 분포", journey: "J3", group: "observer", api: "sentiment" },
  { id: "fairness", path: "/fairness", label: "공정성·원천 추적", journey: "J4", group: "observer", api: "fairness" },
  { id: "trace", path: "/trace", label: "원문 추적 상세", journey: "J4", group: "observer", api: "trace" },
  { id: "reprocess", path: "/reprocess", label: "재처리 콘솔", journey: "J5", group: "operator", api: "reprocess" },
  { id: "debug", path: "/debug", label: "판단 디버깅", journey: "JRN-judgment-debug", group: "operator", api: "debug" },
];

export const SCREENS_BY_PATH = new Map(SCREENS.map((s) => [s.path, s]));
