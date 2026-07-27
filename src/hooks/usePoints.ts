import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface UserPoints {
  id: string;
  user_id: string;
  total_points: number;
  last_login_bonus_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  required_points: number | null;
  required_action_count: number | null;
  action_type: string | null;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  achieved_at: string;
  achievement: Achievement;
}

export function useUserPoints() {
  const { user } = useAuth();
  
  return useQuery<UserPoints>({
    queryKey: ["userPoints", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user.id)
        .single();
        
        
      if (error) {
        // ユーザーポイントレコードが存在しない場合はサーバー側で作成
        if (error.code === 'PGRST116') {
          await supabase.rpc('ensure_user_points_row');
          // Re-fetch after init
          const { data: newData, error: refetchError } = await supabase
            .from("user_points")
            .select("*")
            .eq("user_id", user.id)
            .single();
          if (refetchError) throw refetchError;
          return newData;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });
}

export function usePointTransactions() {
  const { user } = useAuth();
  
  return useQuery<PointTransaction[]>({
    queryKey: ["pointTransactions", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("point_transactions")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

export function useUserAchievements() {
  const { user } = useAuth();
  
  return useQuery({
    queryKey: ["userAchievements", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // user_achievements と achievements を別々に取得してjoin
      const { data: userAchievements, error: userError } = await supabase
        .from("user_achievements")
        .select("*")
        .eq("user_id", user.id)
        .order("achieved_at", { ascending: false });
        
      if (userError) throw userError;
      
      if (!userAchievements || userAchievements.length === 0) {
        return [];
      }
      
      const achievementIds = userAchievements.map(ua => ua.achievement_id);
      const { data: achievements, error: achievementError } = await supabase
        .from("achievements")
        .select("*")
        .in("id", achievementIds);
        
      if (achievementError) throw achievementError;
      
      // データを結合
      const result = userAchievements.map(ua => ({
        ...ua,
        achievement: achievements?.find(a => a.id === ua.achievement_id) || null
      }));
      
      return result;
    },
    enabled: !!user?.id,
  });
}

/**
 * 未使用だった useAwardPoints / useDeductPoints と、そこからのみ呼ばれていた
 * checkAndAwardAchievements は削除した。
 *
 * - 付与は claim_reward（額はサーバー側の point_rewards が持つ）に一本化。
 *   → src/hooks/useClaimReward.ts
 * - 消費は用途ごとの専用RPC（create_custom_tag / purchase_shop_item /
 *   expand_collection_slots / create_challenge）に一本化。
 * - 称号は grant_eligible_achievements で一括評価する。
 *   従来のクライアント側判定は呼び出し元が無く、称号は付与されていなかった。
 */
