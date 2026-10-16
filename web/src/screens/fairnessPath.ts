import type { Axis, AxisScope, SpikeBaseline } from "../api/types";

export function fairnessPath(axis: Axis, subject?: string | null, baseline?: SpikeBaseline): string {
  const params = new URLSearchParams({ axis });
  if (subject) params.set("subject", subject);
  if (baseline && baseline !== "7d") params.set("baseline", baseline);
  return `/fairness?${params.toString()}`;
}

export function fairnessAxis(axis: AxisScope): Axis | null {
  return axis === "ALL" ? null : axis;
}

export const PICK_ONE_AXIS = "축을 하나 고르면 넘어갈 수 있습니다 — 공정성 화면은 한 축 안에서 수집원을 가릅니다.";
