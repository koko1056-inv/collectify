import { createContext, useContext, useEffect } from "react";

export interface NoticeSlotValue {
  winner: string | null;
  set: (id: string, priority: number | null) => void;
}

export const NoticeSlotContext = createContext<NoticeSlotValue | null>(null);

/** このお知らせを今出してよいか。wants = 出したい条件を満たしているか */
export function useNoticeTurn(id: string, priority: number, wants: boolean): boolean {
  const ctx = useContext(NoticeSlotContext);
  const set = ctx?.set;
  useEffect(() => {
    if (!set) return;
    set(id, wants ? priority : null);
    return () => set(id, null);
  }, [set, id, priority, wants]);
  if (!ctx) return wants;
  return wants && ctx.winner === id;
}

/** 大事な順（小さいほど先） */
export const NOTICE_PRIORITY = {
  preorders: 1,
  slots: 2,
  duplicates: 3,
  onboarding: 4,
  onThisDay: 5,
  secretQuestion: 6,
} as const;
