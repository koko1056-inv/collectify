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

interface PaywallModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reason?: string; // e.g. "家具をもっと置くには..."
}

export function PaywallModal({ open, onOpenChange, reason }: PaywallModalProps) {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>("premium");
  const [period, setPeriod] = useState<"monthly" | "yearly">("yearly");
  const [loading, setLoading] = useState(false);

  const price = PLAN_PRICES_JPY[selectedPlan][period];
  const monthlyEquiv = period === "yearly" ? Math.floor(price / 12) : price;

  const features = [
    { key: "collection", label: "コレクション上限", free: "50個", premium: "1,000個" },
    { key: "themes", label: "ルームテーマ", free: "4種類", premium: "全12種類" },
    { key: "furniture", label: "家具スロット", free: "10個", premium: "50個" },
    { key: "3d", label: "3Dモデル生成", free: "月1回", premium: "月10回" },
    { key: "conversion", label: "ディスプレイ変換", free: "月3回", premium: "月30回" },
    { key: "bgm", label: "カスタムBGM", free: "×", premium: "✓" },
    { key: "watermark", label: "シェア画像の透かし削除", free: "×", premium: "✓" },
    { key: "badge", label: "プレミアムバッジ", free: "×", premium: "✓" },
  ];

  const handlePurchase = async () => {
    setLoading(true);
    try {
      await startPurchase(selectedPlan, period);
      toast.success("プレミアムプランをご利用いただけます！");
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "購入に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full mb-2">
            <Crown className="w-8 h-8 text-white" />
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
            月額
          </button>
          <button
            onClick={() => setPeriod("yearly")}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-colors relative",
              period === "yearly" ? "bg-primary text-primary-foreground" : "bg-muted"
            )}
          >
            年額
            <span className="absolute -top-2 -right-2 bg-pink-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
              2ヶ月お得
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
                        ? "ルームを本気で作り込みたい方に"
                        : "すべてを使いこなしたいヘビーユーザーへ"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">
                      ¥{planMonthly.toLocaleString()}
                      <span className="text-xs font-normal text-muted-foreground">/月</span>
                    </p>
                    {period === "yearly" && (
                      <p className="text-xs text-muted-foreground">
                        年額 ¥{planPrice.toLocaleString()}
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
          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
          size="lg"
        >
          {loading ? "処理中..." : `¥${monthlyEquiv.toLocaleString()}/月で始める`}
        </Button>

        <p className="text-[10px] text-center text-muted-foreground leading-relaxed">
          自動更新されます。キャンセルは設定からいつでも可能です。
          <br />
          購入するとご利用規約およびプライバシーポリシーに同意したものとみなされます。
        </p>
      </DialogContent>
    </Dialog>
  );
}
