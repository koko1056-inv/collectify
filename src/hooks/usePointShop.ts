import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export interface PointPackage {
  id: string;
  name: string;
  price: number;
  points: number;
  bonus_points: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface PointShopItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  item_type: string;
  points_cost: number;
  value: number;
  is_active: boolean;
  icon: string | null;
  sort_order: number;
  created_at: string;
}

export interface UserLimits {
  id: string;
  user_id: string;
  collection_slots: number;
  room_slots: number;
  custom_tag_slots: number;
  group_create_count: number;
  ai_image_uses_today: number;
  ai_image_last_reset: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserPointPurchase {
  id: string;
  user_id: string;
  shop_item_id: string;
  points_spent: number;
  purchased_at: string;
}

// ポイントパック一覧を取得
export function usePointPackages() {
  return useQuery<PointPackage[]>({
    queryKey: ["pointPackages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("point_packages")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
  });
}

// ショップアイテム一覧を取得
export function usePointShopItems(category?: string) {
  return useQuery<PointShopItem[]>({
    queryKey: ["pointShopItems", category],
    queryFn: async () => {
      let query = supabase
        .from("point_shop_items")
        .select("*")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      
      if (category) {
        query = query.eq("category", category);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });
}

// ユーザーの上限設定を取得
export function useUserLimits() {
  const { user } = useAuth();
  
  return useQuery<UserLimits>({
    queryKey: ["userLimits", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("user_limits")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (error) {
        // レコードが存在しない場合は作成
        if (error.code === 'PGRST116') {
          const { data: newRecord, error: insertError } = await supabase
            .from("user_limits")
            .insert({ user_id: user.id })
            .select()
            .single();
          
          if (insertError) throw insertError;
          return newRecord;
        }
        throw error;
      }
      
      return data;
    },
    enabled: !!user?.id,
  });
}

// ユーザーの購入履歴を取得
export function useUserPurchases() {
  const { user } = useAuth();
  
  return useQuery<UserPointPurchase[]>({
    queryKey: ["userPurchases", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("user_point_purchases")
        .select("*")
        .eq("user_id", user.id)
        .order("purchased_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
}

// ショップアイテムを購入
export function usePurchaseShopItem() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: PointShopItem) => {
      if (!user?.id) throw new Error("User not authenticated");

      // サーバー側で原子的にポイント減算 + 上限増加 + 履歴記録を実行
      const { data, error } = await supabase.rpc("purchase_shop_item", {
        _shop_item_id: item.id,
      });

      if (error) {
        if (error.message?.includes("Insufficient points")) {
          throw new Error("ポイントが不足しています");
        }
        throw error;
      }

      const result = (data as { success?: boolean; new_points?: number }) || {};
      return { item, newPoints: result.new_points ?? 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["userLimits"] });
      queryClient.invalidateQueries({ queryKey: ["userPurchases"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      
      toast({
        title: "購入完了！",
        description: `${data.item.name}を購入しました`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "購入エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
