import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { getUserStats, calculateAndAwardHistoricalPoints, UserStats } from "@/utils/user-stats";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("User not authenticated");
      return calculateAndAwardHistoricalPoints(user.id);
    },
    onSuccess: (data) => {
      if (data.pointsAdded > 0) {
        toast({
          title: t("notices.stats.historicalPointsTitle"),
          description: t("notices.stats.historicalPointsDesc", { points: data.pointsAdded }),
        });
      } else {
        toast({
          title: t("notices.stats.calcDoneTitle"),
          description: t("notices.stats.calcAlreadyAwardedDesc"),
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
        title: t("notices.common.errorTitle"),
        description: t("notices.stats.calcErrorDesc"),
        variant: "destructive",
      });
    },
  });
}