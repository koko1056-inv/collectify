import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentRegistration {
  user_item_id: string;
  official_item_id: string | null;
  title: string | null;
  image: string | null;
  content_name: string | null;
  created_at: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

/** 公開コレクションの直近の登録。投稿がまだ少なくても「いま誰かが動いている」を見せるための供給源。 */
export function useRecentRegistrations(limit = 12) {
  return useQuery({
    queryKey: ["recent-registrations", limit],
    queryFn: async (): Promise<RecentRegistration[]> => {
      const { data, error } = await supabase.rpc("get_recent_registrations", { _limit: limit });
      if (error) throw error;
      return (data ?? []) as RecentRegistration[];
    },
    staleTime: 1000 * 60,
  });
}
