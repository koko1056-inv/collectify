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
}

export const DAILY_MISSION_KEY = "daily-mission";
/** ミッションの写真を撮る画面（推しの部屋の写真タブで、撮るダイアログを開く） */
export const MISSION_SHOOT_HREF = "/oshi?tab=photo&mission=1";

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
