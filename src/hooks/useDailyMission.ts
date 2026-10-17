import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** 今日のミッション（get_daily_mission の返り値） */
export interface DailyMission {
  today: string;
  prompt_id: string;
  item: { id: string; title: string; image: string | null; oshi: boolean } | null;
  completed: boolean;
  just_completed: boolean;
  photo_url: string | null;
  bonus: number;
  /** 達成した1枚が AI で作ったものか */
  photo_is_ai: boolean;
  /** 今日あと何回 AI で作れるか（1日2回まで無料） */
  ai_tries_left: number;
}

export const DAILY_MISSION_KEY = "daily-mission";
/** ミッションの写真を撮る画面（推しの部屋の写真タブで、撮るダイアログを開く） */
export const MISSION_SHOOT_HREF = "/oshi?tab=photo&mission=1";
/** ミッションを AI で作る（同じ撮影画面を開いて、すぐ作り始める） */
export const MISSION_AI_HREF = "/oshi?tab=photo&mission=1&ai=1";

/** ミッションのお題どおりの1枚を AI で作る。作った画像は自分の推しフォトのフォルダに置かれ、その URL が返る（保存は別） */
export async function generateMissionImage(
  mode: "mission" | "onboarding" = "mission"
): Promise<{ imageUrl: string; itemId: string; triesLeft: number }> {
  // onboarding: ウェルカムのお祝いで AI をためす1回（いま登録したグッズを飾った1枚。1人1回だけ無料）
  const { data, error } = await supabase.functions.invoke("generate-mission-image", { body: { mode } });
  if (error) {
    // 関数が返したエラーの種類（mission_ai_limit など）を取り出す
    let code = "generation_failed";
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error) code = body.error;
    } catch {
      /* 本文が読めなければ、ふつうの失敗として扱う */
    }
    throw new Error(code);
  }
  return data as { imageUrl: string; itemId: string; triesLeft: number };
}

/** 今日のミッション。グッズが1つも無い人は item が null */
export function useDailyMission() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [DAILY_MISSION_KEY, user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_daily_mission");
      if (error) throw error;
      return (data ?? null) as unknown as DailyMission | null;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
