import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserLimits } from "@/hooks/usePointShop";

interface CollectionLimitStatus {
  currentCount: number;
  maxSlots: number;
  remaining: number;
  isAtLimit: boolean;
  usagePercent: number;
}

// ユーザーのコレクション数を取得
export function useCollectionCount() {
  const { user } = useAuth();
  
  return useQuery<number>({
    queryKey: ["collectionCount", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { count, error } = await supabase
        .from("user_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

// コレクション上限のステータスを取得
export function useCollectionLimitStatus(): CollectionLimitStatus | null {
  const { data: limits } = useUserLimits();
  const { data: count } = useCollectionCount();
  
  if (limits === undefined || count === undefined) {
    return null;
  }
  
  const maxSlots = limits?.collection_slots || 100;
  const currentCount = count || 0;
  const remaining = Math.max(0, maxSlots - currentCount);
  const isAtLimit = currentCount >= maxSlots;
  const usagePercent = Math.min(100, (currentCount / maxSlots) * 100);
  
  return {
    currentCount,
    maxSlots,
    remaining,
    isAtLimit,
    usagePercent,
  };
}

// ルーム数の上限チェック
export function useRoomCount() {
  const { user } = useAuth();
  
  return useQuery<number>({
    queryKey: ["roomCount", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { count, error } = await supabase
        .from("binder_pages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
}

export function useRoomLimitStatus() {
  const { data: limits } = useUserLimits();
  const { data: count } = useRoomCount();
  
  if (limits === undefined || count === undefined) {
    return null;
  }
  
  const maxSlots = limits?.room_slots || 1;
  const currentCount = count || 0;
  const remaining = Math.max(0, maxSlots - currentCount);
  const isAtLimit = currentCount >= maxSlots;
  
  return {
    currentCount,
    maxSlots,
    remaining,
    isAtLimit,
  };
}

// グループ作成権チェック
export function useGroupCreateStatus() {
  const { user } = useAuth();
  const { data: limits } = useUserLimits();
  
  const { data: createdCount } = useQuery<number>({
    queryKey: ["createdGroupCount", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { count, error } = await supabase
        .from("groups")
        .select("*", { count: "exact", head: true })
        .eq("created_by", user.id);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!user?.id,
  });
  
  if (limits === undefined || createdCount === undefined) {
    return null;
  }
  
  // group_create_countは「購入した作成権の数」
  // createdCountは「実際に作成したグループ数」
  const purchasedRights = limits?.group_create_count || 0;
  const usedRights = createdCount || 0;
  const remainingRights = Math.max(0, purchasedRights - usedRights);
  const canCreate = remainingRights > 0;
  
  return {
    purchasedRights,
    usedRights,
    remainingRights,
    canCreate,
  };
}
