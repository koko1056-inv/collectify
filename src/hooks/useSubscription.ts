import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { PlanTier, PLAN_PERKS, PlanPerks } from "@/lib/planLimits";

export function useSubscription() {
  const { user } = useAuth();

  const { data: subscription, isLoading, isError } = useQuery({
    queryKey: ["subscription", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      // 読めなかったときは「無料」と決めつけない（isError で分かるようにする。表示は今までどおり無料扱い）。
      // プランのおすすめは、読めていない人には出さない（契約中の人に出してしまわないため）
      if (error) throw error;

      // expires_at が過去なら無効
      if (data?.expires_at && new Date(data.expires_at) < new Date()) {
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5分キャッシュ
  });

  const plan: PlanTier = (subscription?.plan as PlanTier) || "free";
  const perks: PlanPerks = PLAN_PERKS[plan];
  const isPremium = plan !== "free";

  return {
    plan,
    perks,
    isPremium,
    subscription,
    isLoading,
    isError,
  };
}

// 月次使用量
export function useMonthlyUsage(usageType: string) {
  const { user } = useAuth();

  const { data: usage = 0 } = useQuery({
    queryKey: ["monthly-usage", user?.id, usageType],
    queryFn: async () => {
      if (!user?.id) return 0;
      const periodStart = new Date();
      periodStart.setDate(1);
      periodStart.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("user_monthly_usage")
        .select("count")
        .eq("user_id", user.id)
        .eq("usage_type", usageType)
        .eq("period_start", periodStart.toISOString().split("T")[0])
        .maybeSingle();

      return data?.count || 0;
    },
    enabled: !!user?.id,
    staleTime: 30 * 1000,
  });

  return usage;
}

// 使用量をインクリメント
export async function incrementUsage(userId: string, usageType: string) {
  const { data, error } = await supabase.rpc("increment_usage", {
    p_user_id: userId,
    p_usage_type: usageType,
  });
  if (error) throw error;
  return data as number;
}
