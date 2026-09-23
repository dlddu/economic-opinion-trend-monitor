import { createContext, useContext, useEffect } from "react";

// CMP-topbar 의 화면별 슬롯. 목업의 토프바는 여정 페이지마다 제목과 조건 pill(`.ctl` 의
// `pill-ctl`)이 다르다 — 셸은 라우트에서 유도한 제목을 기본값으로 두고, 화면이 자기
// 제목·pill 을 올리면 그것을 그린다. 올리지 않은 화면은 종전 그대로다.

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
