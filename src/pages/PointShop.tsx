import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Star,
  ArrowLeft,
  Gift,
  Sparkles,
  Coins,
  Info,
  Tag as TagIcon,
  Package,
  Home,
  ImageIcon,
} from "lucide-react";
import { usePointPackages, PointPackage } from "@/hooks/usePointShop";
import { useUserPoints } from "@/hooks/usePoints";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const SPEND_GUIDE = [
  { icon: TagIcon, label: "カスタムタグを新規発行", cost: 10 },
  { icon: Package, label: "コレクション枠 +10 拡張", cost: 30 },
  { icon: ImageIcon, label: "AI画像生成 / 投稿画像生成", cost: 50 },
  { icon: Home, label: "AIマイルーム生成", cost: 100 },
];

export default function PointShop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [confirmPack, setConfirmPack] = useState<PointPackage | null>(null);

  const { data: packages, isLoading: packagesLoading } = usePointPackages();
  const { data: userPoints, isLoading: pointsLoading } = useUserPoints();

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">ログインが必要です</p>
          <Button onClick={() => navigate("/login")} className="mt-4">
            ログイン
          </Button>
        </div>
      </div>
    );
  }

  const currentPoints = userPoints?.total_points ?? 0;

  const handleConfirmPurchase = () => {
    // 決済は未接続。準備中の通知のみ。
    toast({
      title: "決済機能は準備中です",
      description: "ポイント購入機能はまもなく公開予定です。今しばらくお待ちください。",
    });
    setConfirmPack(null);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container max-w-4xl mx-auto px-4 py-6 pt-16 sm:pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" />
              ポイント
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              ポイントパックを購入したり、無料で貯めたポイントを各機能で使えます
            </p>
          </div>
        </div>

        {/* Current Balance */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Star className="w-6 h-6 text-primary fill-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">保有ポイント</p>
                {pointsLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <p className="text-2xl font-bold">
                    {currentPoints.toLocaleString()}
                    <span className="text-base font-normal text-muted-foreground"> pt</span>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Point Packages */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              ポイントパック
            </h2>
            <Badge variant="outline" className="text-[10px]">決済機能 準備中</Badge>
          </div>

          {packagesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
          ) : !packages || packages.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-sm text-muted-foreground">
                <Gift className="w-10 h-10 mx-auto mb-2 opacity-40" />
                ポイントパックはまもなく登場します
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {packages.map((pack) => {
                const totalPoints = pack.points + pack.bonus_points;
                const hasBonus = pack.bonus_points > 0;
                return (
                  <Card key={pack.id} className="hover:shadow-md hover:border-primary/30 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{pack.name}</CardTitle>
                        {hasBonus && (
                          <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30 dark:text-amber-300">
                            +{pack.bonus_points}pt ボーナス
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-baseline gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-xl font-bold text-foreground">
                          {totalPoints.toLocaleString()}
                        </span>
                        <span className="text-xs">pt</span>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex items-center justify-between">
                      <span className="text-base font-semibold">¥{pack.price.toLocaleString()}</span>
                      <Button size="sm" onClick={() => setConfirmPack(pack)}>
                        購入する
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Spend Guide */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Info className="w-5 h-5 text-primary" />
            ポイントの使いみち
          </h2>
          <Card>
            <CardContent className="pt-4 space-y-2">
              {SPEND_GUIDE.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span>{g.label}</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {g.cost}pt
                    </Badge>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground pt-2">
                各機能を使うときに、その場で確認の上ポイントが消費されます。
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Free Points */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              無料でポイントを獲得
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label="ログインボーナス" value="+10pt / 日" />
            <Row label="グッズ登録" value="+1pt" />
            <Row label="コンテンツ追加" value="+10pt" />
            <Row label="連続ログインボーナス" value="ストリーク数に応じて加算" />
          </CardContent>
        </Card>
      </div>

      {/* Purchase Confirmation */}
      <AlertDialog open={!!confirmPack} onOpenChange={(o) => !o && setConfirmPack(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmPack?.name}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 text-sm">
                <p>
                  <strong>¥{confirmPack?.price.toLocaleString()}</strong> で{" "}
                  <strong>
                    {((confirmPack?.points ?? 0) + (confirmPack?.bonus_points ?? 0)).toLocaleString()}pt
                  </strong>{" "}
                  を獲得します。
                </p>
                <p className="text-xs text-muted-foreground">
                  ※ 現在 決済機能は準備中です。実際の購入は近日中に開放予定です。
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPurchase}>
              続ける
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
