import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserStats, calculateAndAwardHistoricalPoints, UserStats } from "@/utils/user-stats";
import { useToast } from "@/hooks/use-toast";

export function useUserStats() {
  const { user } = useAuth();
  
  return useQuery<UserStats>({
    queryKey: ["userStats", user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      return getUserStats(user.id);
    },
    enabled: !!user?.id,
  });
}

export function useCalculateHistoricalPoints() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      return calculateAndAwardHistoricalPoints(user.id);
    },
    onSuccess: (data) => {
      if (data.pointsAdded > 0) {
        toast({
          title: "過去の活動ポイントを付与しました！",
          description: `${data.pointsAdded}ポイントが追加されました`,
        });
      } else {
        toast({
          title: "ポイント計算完了",
          description: "すべての活動に対してポイントは既に付与済みです",
        });
      }
      
      // 関連するクエリを無効化して再取得
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      queryClient.invalidateQueries({ queryKey: ["pointTransactions"] });
      queryClient.invalidateQueries({ queryKey: ["userStats"] });
      queryClient.invalidateQueries({ queryKey: ["userAchievements"] });
    },
    onError: (error) => {
      toast({
        title: "エラー",
        description: "ポイント計算中にエラーが発生しました",
        variant: "destructive",
      });
    },
  });
}