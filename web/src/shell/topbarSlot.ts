import { createContext, useContext, useEffect } from "react";

// CMP-topbar 의 화면별 슬롯(목업 `.ctl` 의 `pill-ctl`).

export interface TopbarOverride {
  title?: string;
  pill?: string;
}

export interface TopbarSlot {
  override: TopbarOverride | null;
  setOverride: (next: TopbarOverride | null) => void;
}

export const TopbarContext = createContext<TopbarSlot>({
  override: null,
  setOverride: () => {},
});

/** Lift a title/pill into the shell topbar while the calling screen is mounted. */
export function useTopbar(title: string | undefined, pill: string | undefined): void {
  const { setOverride } = useContext(TopbarContext);
  useEffect(() => {
    setOverride({ title, pill });
  }, [setOverride, title, pill]);
  useEffect(() => () => setOverride(null), [setOverride]);
}
