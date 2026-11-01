import { Coins, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { PLAN_PERKS } from "@/lib/planLimits";

/**
 * プランの特典（おすすめ用の短い版）。実際にサーバーで効いているものだけ:
 *   - 毎月のポイント（grant_subscription_monthly_points）
 *   - AI 生成の割引（supabase/functions/_shared/subscription.ts。画像の編集・AIルーム・アバター・投稿画像）
 * 数は PLAN_PERKS から差し込む（文言に直書きしない）。
 */
export function PlanPerkList({ className }: { className?: string }) {
  const { t } = useLanguage();
  const rows = [
    {
      key: "points",
      icon: Coins,
      title: t("planReco.perks.pointsTitle"),
      desc: t("planReco.perks.pointsDesc", {
        premium: PLAN_PERKS.premium.monthlyPoints.toLocaleString(),
        plus: PLAN_PERKS.premium_plus.monthlyPoints.toLocaleString(),
      }),
    },
    {
      key: "ai",
      icon: Wand2,
      title: t("planReco.perks.aiTitle"),
      desc: t("planReco.perks.aiDesc", {
        premium: PLAN_PERKS.premium.aiDiscountPercent,
        plus: PLAN_PERKS.premium_plus.aiDiscountPercent,
      }),
    },
  ];
  return (
    <ul className={cn("space-y-2.5", className)}>
      {rows.map((r) => (
        <li key={r.key} className="flex items-start gap-2.5 text-left">
          <r.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-bold">{r.title}</p>
            <p className="text-xs text-muted-foreground">{r.desc}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
