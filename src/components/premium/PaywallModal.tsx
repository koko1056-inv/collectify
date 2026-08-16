import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Crown, Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLAN_LIMITS,
  PLAN_PRICES_JPY,
  PlanTier,
} from "@/lib/planLimits";
import { startPurchase } from "@/utils/iap";
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

  const price = PLAN_PRICES_JPY[selectedPlan][period];
  const monthlyEquiv = period === "yearly" ? Math.floor(price / 12) : price;

  // 「3Dモデル生成」の行はここにあったが外した。
  // generate-3d-model 関数はサーバー側に置かれているものの、アプリから呼ぶ
  // 経路が一度も作られておらず、誰も生成できない。使えないものを有料の
  // 特典として並べることはできない。呼べるようにしてから戻すこと。
  const features = [
    {
      key: "collection",
      label: t("misc.premium.featureCollection"),
      free: t("misc.premium.valueCollectionFree"),
      premium: t("misc.premium.valueCollectionPremium"),
    },
    {
      key: "themes",
      label: t("misc.premium.featureThemes"),
      free: t("misc.premium.valueThemesFree"),
      premium: t("misc.premium.valueThemesPremium"),
    },
    {
      key: "furniture",
      label: t("misc.premium.featureFurniture"),
      free: t("misc.premium.valueFurnitureFree"),
      premium: t("misc.premium.valueFurniturePremium"),
    },
    {
      key: "conversion",
      label: t("misc.premium.featureConversion"),
      free: t("misc.premium.valueConversionFree"),
      premium: t("misc.premium.valueConversionPremium"),
    },
    { key: "bgm", label: t("misc.premium.featureBgm"), free: "×", premium: "✓" },
    { key: "watermark", label: t("misc.premium.featureWatermark"), free: "×", premium: "✓" },
    { key: "badge", label: t("misc.premium.featureBadge"), free: "×", premium: "✓" },
  ];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await startPurchase(selectedPlan, period);
      toast.success(t("misc.premium.purchaseSuccess"));
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("misc.premium.purchaseFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-primary to-primary/70 rounded-full mb-2">
            <Crown className="w-8 h-8 text-primary-foreground" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Collectify Premium
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
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
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
                      {p === "premium_plus" && <Sparkles className="w-4 h-4 text-yellow-500" />}
                      <p className="font-semibold">
                        {p === "premium" ? "Premium" : "Premium+"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {p === "premium"
                        ? t("misc.premium.premiumTagline")
                        : t("misc.premium.premiumPlusTagline")}
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

        {/* Features list */}
        <div className="border border-border rounded-xl p-4 mt-2 space-y-2">
          {features.map((f) => (
            <div key={f.key} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{f.label}</span>
              <span className="font-medium">
                <span className="text-muted-foreground line-through text-xs mr-2">
                  {f.free}
                </span>
                {f.premium}
              </span>
            </div>
          ))}
        </div>

        <Button
          onClick={handlePurchase}
          disabled={loading}
          className="w-full bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/60 text-primary-foreground font-semibold"
          size="lg"
        >
          {loading
            ? t("misc.common.processing")
            : t("misc.premium.startCta", { price: monthlyEquiv.toLocaleString() })}
        </Button>

        <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
          {t("misc.premium.autoRenew")}
          <br />
          {t("misc.premium.terms")}
        </p>
      </DialogContent>
    </Dialog>
  );
}
