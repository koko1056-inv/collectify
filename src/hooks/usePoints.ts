import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
      
      console.log("[useUserPoints] Fetching points for user:", user.id);
      
      const { data, error } = await supabase
        .from("user_points")
        .select("*")
        .eq("user_id", user.id)
        .single();
        
      console.log("[useUserPoints] Query result:", { data, error });
        
      if (error) {
        // ユーザーポイントレコードが存在しない場合は作成
        if (error.code === 'PGRST116') {
          console.log("[useUserPoints] No user points record found, initializing via RPC");
          await supabase.rpc('add_user_points', {
            _user_id: user.id,
            _points: 0,
            _transaction_type: 'init',
            _description: '初期化'
          });
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
      
      console.log("[useUserPoints] Returning points:", data?.total_points);
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

export function useAwardPoints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      points,
      transactionType,
      description,
      referenceId
    }: {
      points: number;
      transactionType: string;
      description?: string;
      referenceId?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // ログインボーナスの場合は1日1回の制限をチェック
      if (transactionType === 'login_bonus') {
        const today = new Date().toISOString().split('T')[0];
        const { data: userPoints } = await supabase
          .from("user_points")
          .select("last_login_bonus_date")
          .eq("user_id", user.id)
          .single();
          
        if (userPoints?.last_login_bonus_date === today) {
          throw new Error("今日は既にログインボーナスを受け取りました");
        }
      }
      
      // ポイント残高を更新
      const { data: currentPoints } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .single();
        
      const newTotal = (currentPoints?.total_points || 0) + points;
      
      const updateData: any = { total_points: newTotal };
      if (transactionType === 'login_bonus') {
        updateData.last_login_bonus_date = new Date().toISOString().split('T')[0];
      }
      
      await supabase
        .from("user_points")
        .update(updateData)
        .eq("user_id", user.id);
      
      // ポイント履歴に記録
      await supabase
        .from("point_transactions")
        .insert({
          user_id: user.id,
          points,
          transaction_type: transactionType,
          description,
          reference_id: referenceId
        });
        
      // 称号チェック
      await checkAndAwardAchievements(user.id, newTotal, transactionType);
      
      return { points, newTotal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["userAchievements"] });
      
      toast({
        title: "ポイント獲得！",
        description: `${data.points}ポイントを獲得しました`,
      });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useDeductPoints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      points,
      transactionType,
      description,
      referenceId
    }: {
      points: number;
      transactionType: string;
      description?: string;
      referenceId?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");
      
      // 現在のポイント残高を取得
      const { data: currentPoints, error: fetchError } = await supabase
        .from("user_points")
        .select("total_points")
        .eq("user_id", user.id)
        .single();
        
      if (fetchError) {
        // レコードがない場合は作成
        if (fetchError.code === 'PGRST116') {
          await supabase
            .from("user_points")
            .insert({ user_id: user.id, total_points: 0 });
          throw new Error("ポイントが不足しています");
        }
        throw fetchError;
      }
      
      const currentTotal = currentPoints?.total_points || 0;
      
      // ポイント残高チェック
      if (currentTotal < points) {
        throw new Error(`ポイントが不足しています（現在: ${currentTotal}pt、必要: ${points}pt）`);
      }
      
      const newTotal = currentTotal - points;
      
      // ポイント残高を更新
      await supabase
        .from("user_points")
        .update({ total_points: newTotal })
        .eq("user_id", user.id);
      
      // ポイント履歴に記録（消費なのでマイナス値で記録）
      await supabase
        .from("point_transactions")
        .insert({
          user_id: user.id,
          points: -points,
          transaction_type: transactionType,
          description,
          reference_id: referenceId
        });
      
      return { points, newTotal };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

async function checkAndAwardAchievements(userId: string, totalPoints: number, actionType: string) {
  // ポイント数による称号チェック
  const { data: pointAchievements } = await supabase
    .from("achievements")
    .select("*")
    .not("required_points", "is", null)
    .lte("required_points", totalPoints);
    
  // アクション回数による称号チェック
  let actionCount = 0;
  if (actionType === 'item_add') {
    const { count } = await supabase
      .from("point_transactions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("transaction_type", "item_add");
    actionCount = count || 0;
  } else if (actionType === 'content_add') {
    const { count } = await supabase
      .from("point_transactions")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("transaction_type", "content_add");
    actionCount = count || 0;
  }
  
  const { data: actionAchievements } = await supabase
    .from("achievements")
    .select("*")
    .eq("action_type", actionType)
    .not("required_action_count", "is", null)
    .lte("required_action_count", actionCount);
    
  const allEligibleAchievements = [
    ...(pointAchievements || []),
    ...(actionAchievements || [])
  ];
  
  // 既に獲得済みの称号を除外
  const { data: existingAchievements } = await supabase
    .from("user_achievements")
    .select("achievement_id")
    .eq("user_id", userId);
    
  const existingIds = existingAchievements?.map(a => a.achievement_id) || [];
  const newAchievements = allEligibleAchievements.filter(
    a => !existingIds.includes(a.id)
  );
  
  // 新しい称号を付与
  for (const achievement of newAchievements) {
    await supabase
      .from("user_achievements")
      .insert({
        user_id: userId,
        achievement_id: achievement.id
      });
  }
}