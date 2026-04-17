import { Coins, Gift, ShoppingBag, TrendingUp } from "lucide-react";
import { useUserPoints, usePointTransactions } from "@/hooks/usePoints";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ja } from "date-fns/locale";

// ポイント獲得/消費履歴のラベル
const TX_LABELS: Record<string, string> = {
  login_bonus: "ログインボーナス",
  item_add: "グッズ追加",
  content_add: "コンテンツ追加",
  welcome_bonus: "ようこそボーナス",
  referral_bonus: "招待ボーナス",
  shop_purchase: "ショップ購入",
  challenge_create: "チャレンジ作成",
  challenge_reward: "チャレンジ入賞",
  init: "初期化",
};

function txLabel(type: string): string {
  return TX_LABELS[type] || type;
}

export function PointBalanceCard() {
  const navigate = useNavigate();
  const { data: userPoints, isLoading } = useUserPoints();
  const { data: transactions = [] } = usePointTransactions();

  const balance = userPoints?.total_points ?? 0;
  const recentFive = transactions.slice(0, 5);
  const lifetimeEarned = transactions
    .filter((t) => t.points > 0)
    .reduce((sum, t) => sum + t.points, 0);

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-lg font-semibold">
          <Coins className="w-5 h-5 text-amber-500" />
          ポイント
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate("/point-shop")}
          className="gap-1.5"
        >
          <ShoppingBag className="w-4 h-4" />
          ショップへ
        </Button>
      </div>

      {/* 残高表示 */}
      <div className="relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br from-amber-50 via-orange-50 to-pink-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-pink-950/30 border border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">現在の残高</p>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {isLoading ? "…" : balance.toLocaleString()}
              </span>
              <span className="text-sm font-medium text-muted-foreground">pt</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center shadow-md shrink-0">
            <Coins className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* 生涯獲得 */}
        <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>累計獲得 {lifetimeEarned.toLocaleString()}pt</span>
        </div>

        {/* 装飾 */}
        <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-gradient-to-br from-pink-300/20 to-amber-300/20 blur-2xl pointer-events-none" />
      </div>

      {/* 最近の履歴 */}
      {recentFive.length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">
            最近の動き
          </p>
          <div className="space-y-1.5">
            {recentFive.map((tx) => {
              const isPositive = tx.points > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 text-sm"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Gift className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="truncate">
                        {tx.description || txLabel(tx.transaction_type)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(tx.created_at), "M/d HH:mm", { locale: ja })}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-sm font-semibold shrink-0 ml-2 ${
                      isPositive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-rose-600 dark:text-rose-400"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {tx.points}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {recentFive.length === 0 && (
        <p className="text-center text-xs text-muted-foreground py-4">
          まだポイント履歴がありません
        </p>
      )}
    </div>
  );
}
