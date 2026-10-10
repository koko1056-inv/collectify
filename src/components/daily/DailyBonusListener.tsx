import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

/** AuthContext が、その日のログインボーナスを受け取れたときに投げるイベント名 */
export const DAILY_BONUS_EVENT = "collectify:daily-bonus-claimed";

/**
 * ログインボーナスを受け取れたとき、「連続◯日・+◯pt」を一度だけ見せる。
 * これまでは黙って付与されていて、連続ログインを続けている実感がなかった。
 */
export function DailyBonusListener() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const onClaimed = async () => {
      try {
        const [{ data: pts }, { data: tiers }] = await Promise.all([
          supabase.from("user_points").select("login_streak").eq("user_id", uid).maybeSingle(),
          supabase.from("login_bonus_tiers").select("min_streak, points").order("min_streak", { ascending: true }),
        ]);
        const streak = pts?.login_streak ?? 1;
        const sorted = tiers ?? [];
        const current = [...sorted].reverse().find((x) => x.min_streak <= streak);
        const next = sorted.find((x) => x.min_streak > streak);
        const points = current?.points ?? 10;
        toast(t("engage.dailyHub.toastTitle", { n: streak, points }), {
          // 連続（炎）は warning のトークン（以前は orange-500 の直書き）
          icon: <Flame className="h-4 w-4 text-warning" />,
          description: next
            ? t("engage.dailyHub.next", { days: next.min_streak - streak, points: next.points })
            : t("engage.dailyHub.toastMax"),
          duration: 5000,
        });
      } catch (e) {
        console.error("[DailyBonusListener] failed:", e);
      }
      void queryClient.invalidateQueries({ queryKey: ["daily-hub-points", uid] });
      void queryClient.invalidateQueries({ queryKey: ["userPoints"] });
    };
    window.addEventListener(DAILY_BONUS_EVENT, onClaimed);
    return () => window.removeEventListener(DAILY_BONUS_EVENT, onClaimed);
  }, [user?.id, t, queryClient]);

  return null;
}
