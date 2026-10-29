import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Coins, Sparkles, Wand2 } from "lucide-react";
import { IconTile } from "@/components/ui/icon-tile";
import { cn } from "@/lib/utils";
import {
  discountedAiCost,
  PLAN_NAMES,
  PLAN_PERKS,
  PLAN_PRICES_JPY,
  PlanTier,
} from "@/lib/planLimits";
import { AI_COSTS } from "@/lib/aiCosts";
import { startPurchase } from "@/utils/iap";
import { CheckoutError, openBillingPortal } from "@/utils/stripeCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string; // e.g. "家具をもっと置くには..."
}

export function PaywallModal({ open, onOpenChange, reason }: PaywallModalProps) {
  const { t } = useLanguage();
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("premium");
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);
  const { isPremium, subscription } = useSubscription();
  const isWebSubscriber = isPremium && subscription?.platform === "web";

  const price = PLAN_PRICES_JPY[selectedPlan][period];
  const monthlyEquiv = period === "yearly" ? Math.floor(price / 12) : price;

  // 特典は、実際にサーバーで効いているもの（毎月のポイント・AI生成の割引）だけを出す。
  // 以前はコレクション上限・テーマ・家具・ディスプレイ変換・BGM・透かし・バッジの表を出していたが、
  // どれも有料プランで変わる仕組みが無かった（src/lib/planLimits.ts の説明を参照）。
  // 「3Dモデル生成」も、アプリから呼ぶ経路が無いので出さない。
  const perkLines = [
    {
      key: "points",
      icon: Coins,
      title: t("misc.premium.perkMonthlyPointsTitle"),
      desc: t("misc.premium.perkMonthlyPointsDesc"),
    },
    {
      key: "ai",
      icon: Wand2,
      title: t("misc.premium.perkAiDiscountTitle"),
      desc: t("misc.premium.perkAiDiscountDesc", {
        premium: discountedAiCost(AI_COSTS.aiRoom, "premium"),
        plus: discountedAiCost(AI_COSTS.aiRoom, "premium_plus"),
      }),
    },
  ];

  const checkoutMessage = (e: unknown): string => {
    if (e instanceof CheckoutError) {
      switch (e.code) {
        case "already_subscribed": return t("misc.checkout.alreadySubscribed");
        case "subscribed_on_other_platform": return t("misc.checkout.otherPlatform");
        case "stripe_not_configured": return t("misc.checkout.notConfigured");
        case "login_required": return t("misc.checkout.loginRequired");
        default: return t("misc.checkout.failed");
      }
    }
    // アプリ内（ネイティブ）では、まだアプリ内課金の購読を用意していない
    return t("misc.checkout.appOnly");
  };

  const handlePurchase = async () => {
    setLoading(true);
    try {
      // Web は Stripe の決済ページへ移動する（戻ってこないので、成功の表示はしない）
      await startPurchase(selectedPlan, period);
      toast(t("misc.checkout.redirecting"));
    } catch (e) {
      console.error("[Paywall] purchase failed", e);
      toast.error(checkoutMessage(e));
      setLoading(false);
    }
  };

  const handleManage = async () => {
    setLoading(true);
    try {
      toast(t("misc.checkout.managing"));
      await openBillingPortal();
    } catch (e) {
      console.error("[Paywall] portal failed", e);
      toast.error(checkoutMessage(e));
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          {/* 以前は primary のグラデーションの丸に白い王冠。アプリ共通の IconTile（薄い面の角丸）にそろえる */}
          <IconTile tone="primary" size="lg" className="mx-auto mb-2">
            <Crown />
          </IconTile>
          <DialogTitle className="text-center text-2xl">
            {t("misc.premium.title")}
          </DialogTitle>
          {reason && (
            <p className="text-center text-sm text-muted-foreground">{reason}</p>
          )}
        </DialogHeader>

        {/* Period toggle */}
        <div className="flex items-center justify-center gap-2 my-3">
          <button
            onClick={() => setPeriod("monthly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors",
              period === "monthly" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {t("misc.premium.monthly")}
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative",
              period === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            {t("misc.premium.yearly")}
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-3xs px-1.5 py-0.5 rounded-full">
              {t("misc.premium.yearlyBadge")}
            </span>
          </button>
        </div>

        {/* Plan cards */}
        <div className="space-y-2">
          {(["premium", "premium_plus"] as PlanTier[]).map((p) => {
            const isSelected = selectedPlan === p;
            const planPrice = PLAN_PRICES_JPY[p][period];
            const planMonthly = period === "yearly" ? Math.floor(planPrice / 12) : planPrice;
            return (
              <button
                key={p}
                onClick={() => setSelectedPlan(p)}
                className={cn(
                  "w-full p-4 rounded-xl border-2 transition-all text-left",
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      {/* 以前は yellow-500 の直書き。上位プランの印は primary の線だけにする */}
                      {p === "premium_plus" && <Sparkles className="w-4 h-4 text-primary" />}
                      <p className="font-bold">
                        {p === "premium" ? "Premium" : "Premium+"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p === "premium"
                        ? t("misc.premium.premiumTagline")
                        : t("misc.premium.premiumPlusTagline")}
                    </p>
                    <p className="text-xs font-medium text-points mt-1">
                      {t("misc.premium.perkMonthlyPoints", { n: PLAN_PERKS[p].monthlyPoints.toLocaleString() })}
                      {" · "}
                      {t("misc.premium.perkAiDiscount", { n: PLAN_PERKS[p].aiDiscountPercent })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ¥{planMonthly.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">{t("misc.premium.perMonth")}</span>
                    </p>
                    {period === "yearly" && (
                      <p className="text-xs text-muted-foreground">
                        {t("misc.premium.yearlyPrice", { price: planPrice.toLocaleString() })}
                      </p>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 特典 */}
        <div className="border border-border rounded-xl p-4 mt-2 space-y-3">
          <p className="text-sm font-bold">{t("misc.premium.perksHeading")}</p>
          {perkLines.map((f) => (
            <div key={f.key} className="flex items-start gap-2 text-sm">
              <f.icon className="h-4 w-4 mt-0.5 shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0">
                <p className="font-medium">{f.title}</p>
                <p className="text-xs text-muted-foreground">{f.desc}</p>
              </div>
            </div>
          ))}
          <p className="text-2xs text-muted-foreground">{t("misc.premium.perksNote")}</p>
        </div>

        {isWebSubscriber && (
          <div className="rounded-xl border border-border bg-muted/40 p-3 text-sm space-y-2">
            <p className="font-medium">{t("misc.checkout.currentPlan")}: {PLAN_NAMES[(subscription?.plan as PlanTier) ?? "premium"] ?? PLAN_NAMES.premium}</p>
            {subscription?.expires_at && (
              <p className="text-xs text-muted-foreground">
                {t(subscription.cancel_at_period_end ? "misc.checkout.endsOn" : "misc.checkout.renewsOn", {
                  date: new Date(subscription.expires_at).toLocaleDateString(),
                })}
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleManage} disabled={loading} className="w-full">
              {t("misc.checkout.manage")}
            </Button>
          </div>
        )}

        <Button
          onClick={handlePurchase}
          disabled={loading || isWebSubscriber}
          className="w-full font-bold"
          size="lg"
        >
          {loading
            ? t("misc.common.processing")
            : t("misc.premium.startCta", { price: monthlyEquiv.toLocaleString() })}
        </Button>

        <p className="text-3xs text-center text-muted-foreground leading-relaxed">
          {t("misc.premium.autoRenew")}
          <br />
          {t("misc.premium.terms")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
