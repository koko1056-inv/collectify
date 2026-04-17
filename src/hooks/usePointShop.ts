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
      
      // 現在のポイントを確認
      const { data: userPoints, error: pointsError } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .single();
      
      if (pointsError) throw pointsError;
      
      const currentPoints = userPoints?.total_points || 0;
      if (currentPoints < item.points_cost) {
        throw new Error("ポイントが不足しています");
      }
      
      // 現在の上限を取得
      let { data: limits, error: limitsError } = await supabase
        .from("user_limits")
        .select("*")
        .eq("user_id", user.id)
        .single();
      
      if (limitsError && limitsError.code === 'PGRST116') {
        // レコードが存在しない場合は作成
        const { data: newLimits, error: insertError } = await supabase
          .from("user_limits")
          .insert({ user_id: user.id })
          .select()
          .single();
        
        if (insertError) throw insertError;
        limits = newLimits;
      } else if (limitsError) {
        throw limitsError;
      }
      
      // 上限を更新
      const updateData: Partial<UserLimits> = {};
      switch (item.item_type) {
        case 'collection_slots':
          updateData.collection_slots = (limits?.collection_slots || 100) + item.value;
          break;
        case 'room_slot':
          updateData.room_slots = (limits?.room_slots || 1) + item.value;
          break;
        case 'custom_tags':
          updateData.custom_tag_slots = (limits?.custom_tag_slots || 10) + item.value;
          break;
        case 'group_create':
          updateData.group_create_count = (limits?.group_create_count || 0) + item.value;
          break;
        default:
          break;
      }
      
      // ポイント減算 + 履歴記録を RPC で原子化 (user_points と point_transactions の不整合防止)
      const { error: deductError } = await supabase.rpc("add_user_points", {
        _user_id: user.id,
        _points: -item.points_cost,
        _transaction_type: "shop_purchase",
        _description: `${item.name}を購入`,
        _reference_id: item.id,
      });
      if (deductError) throw deductError;
      
      // 上限を更新
      if (Object.keys(updateData).length > 0) {
        await supabase
          .from("user_limits")
          .update(updateData)
          .eq("user_id", user.id);
      }
      
      // 購入履歴に記録
      await supabase
        .from("user_point_purchases")
        .insert({
          user_id: user.id,
          shop_item_id: item.id,
          points_spent: item.points_cost
        });
      
      return { item, newPoints: currentPoints - item.points_cost };
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
