import { useCallback, useMemo, useState, type ReactNode } from "react";
import { NoticeSlotContext } from "./noticeSlot";

/**
 * コレクション画面の「お知らせ枠」。
 * 予約の到着・枠の残り・重複カード・はじめてガイド・思い出 は、それぞれ条件を満たすと出るお知らせだが、
 * 全部が縦に並ぶと最初の画面がお知らせで埋まり、グッズが1つも見えなかった。
 * 枠の中では、出したいものの中で一番大事な1つ（priority の小さいもの）だけを出す。
 *
 * 枠の外（プロバイダが無い画面）で使ったときは、今までどおり条件だけで出る。
 */
export function NoticeSlotProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Record<string, number>>({});

  const set = useCallback((id: string, priority: number | null) => {
    setClaims((prev) => {
      if (priority === null) {
        if (!(id in prev)) return prev;
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return prev[id] === priority ? prev : { ...prev, [id]: priority };
    });
  }, []);

  const winner = useMemo(() => {
    let best: string | null = null;
    for (const [id, p] of Object.entries(claims)) {
      if (best === null || p < claims[best]) best = id;
    }
    return best;
  }, [claims]);

  const value = useMemo(() => ({ winner, set }), [winner, set]);
  return <NoticeSlotContext.Provider value={value}>{children}</NoticeSlotContext.Provider>;
}
