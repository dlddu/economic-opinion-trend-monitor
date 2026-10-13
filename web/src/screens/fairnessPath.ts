import type { Axis, SpikeBaseline } from "../api/types";

export function fairnessPath(axis: Axis, subject?: string | null, baseline?: SpikeBaseline): string {
  const params = new URLSearchParams({ axis });
  if (subject) params.set("subject", subject);
  if (baseline && baseline !== "7d") params.set("baseline", baseline);
  return `/fairness?${params.toString()}`;
}
