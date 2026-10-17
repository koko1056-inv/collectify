import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** 今日のポッケリング（get_daily_ring の返り値） */
export interface DailyRing {
  today: string;
  collect: boolean;
  care: boolean;
  social: boolean;
  completed: boolean;
  /** この呼び出しでリングが完成した（お祝いを出す合図。1日1回だけ true） */
  just_completed: boolean;
  streak: number;
  freezes: number;
  /** この呼び出しで使ったお休みの日の数 */
  freezes_used: number;
  bonus: number;
  week: { day: string; done: boolean; full: boolean; frozen: boolean }[];
}

export const DAILY_RING_KEY = "daily-ring";

/** 今日のリングを開く合図（どの画面からでも開けるように、表示は DailyRingHost が持つ） */
export const DAILY_RING_OPEN_EVENT = "pocke:ring-open";
export function openDailyRing() {
  window.dispatchEvent(new Event(DAILY_RING_OPEN_EVENT));
}

export const ringDoneCount = (r: Pick<DailyRing, "collect" | "care" | "social"> | null | undefined) =>
  r ? Number(r.collect) + Number(r.care) + Number(r.social) : 0;

/**
 * 今日の3つの目標（集める・育てる・つながる）と連続日数。
 * サーバーが呼ばれたときに今日の分を数え直すので、何かしたあと（画面の移動・ポッケの「やったね」）に DailyRingHost が読み直す
 */
export function useDailyRing() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DAILY_RING_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_ring");
      if (error) throw error;
      return (data ?? null) as unknown as DailyRing | null;
    },
    enabled: !!user?.id,
    staleTime: 20_000,
    refetchOnWindowFocus: true,
  });
}
