import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  isNativeIAPAvailable,
  getPointPackages,
  purchasePointPackage,
  IAPUserCancelledError,
  type PointPackageEntry,
} from "@/utils/iap";
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
import {
  usePointPackages,
  usePointShopItems,
  usePurchaseShopItem,
  type PointPackage,
  type PointShopItem,
} from "@/hooks/usePointShop";
import { EmptyState } from "@/components/ui/empty-state";
import { QueryErrorState } from "@/components/ui/query-error-state";
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
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const SPEND_GUIDE = [
  { icon: TagIcon, label: "screens.pointShop.spendCustomTag", cost: 10 },
  { icon: Package, label: "screens.pointShop.spendCollectionSlots", cost: 30 },
  { icon: ImageIcon, label: "screens.pointShop.spendAiImage", cost: 50 },
  { icon: Home, label: "screens.pointShop.spendAiRoom", cost: 100 },
];

export default function PointShop() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [confirmPack, setConfirmPack] = useState<PointPackage | null>(null);
  const [confirmItem, setConfirmItem] = useState<PointShopItem | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [rcPackages, setRcPackages] = useState<PointPackageEntry[]>([]);
  const nativeAvailable = isNativeIAPAvailable();

  const { data: packages, isLoading: packagesLoading } = usePointPackages();
  const { data: userPoints, isLoading: pointsLoading } = useUserPoints();
  const {
    data: shopItems,
    isLoading: shopItemsLoading,
    isError: shopItemsError,
    refetch: refetchShopItems,
  } = usePointShopItems();
  const purchaseShopItem = usePurchaseShopItem();

  // Load RevenueCat offerings once on native platforms.
  useEffect(() => {
    if (!nativeAvailable) return;
    let cancelled = false;
    getPointPackages()
      .then((list) => {
        if (!cancelled) setRcPackages(list);
      })
      .catch((err) => {
        console.error("[PointShop] getPointPackages failed", err);
      });
    return () => {
      cancelled = true;
    };
  }, [nativeAvailable]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-muted-foreground">{t("screens.pointShop.loginRequired")}</p>
          <Button onClick={() => navigate("/login")} className="mt-4">
            {t("screens.pointShop.login")}
          </Button>
        </div>
      </div>
    );
  }

  const currentPoints = userPoints?.total_points ?? 0;

  const handleConfirmExchange = async () => {
    const item = confirmItem;
    if (!item) return;
    try {
      // 残高検証・減算・上限反映・履歴記録はすべて purchase_shop_item が原子的に行う
      await purchaseShopItem.mutateAsync(item);
    } finally {
      setConfirmItem(null);
    }
  };

  const handleConfirmPurchase = async () => {
    const pack = confirmPack;
    if (!pack) return;

    if (!nativeAvailable) {
      toast(t("screens.pointShop.iosOnlyTitle"), {
        description: t("screens.pointShop.iosOnlyDesc"),
      });
      setConfirmPack(null);
      return;
    }

    const rcId = pack.revenuecat_package_id;
    if (!rcId) {
      toast.error(t("screens.pointShop.cannotPurchase"), {
        description: t("screens.pointShop.noProductConfig"),
      });
      setConfirmPack(null);
      return;
    }

    const match = rcPackages.find((p) => p.identifier === rcId);
    if (!match) {
      toast.error(t("screens.pointShop.cannotPurchase"), {
        description: t("screens.pointShop.storeLoadFailed"),
      });
      setConfirmPack(null);
      return;
    }

    setPurchasing(true);
    try {
      await purchasePointPackage(match.package);
      // Server-side webhook grants the points; refresh balance after a short delay.
      queryClient.invalidateQueries({ queryKey: ["userPoints"] });
      toast.success(t("screens.pointShop.purchaseComplete"), {
        description: t("screens.pointShop.purchaseCompleteDesc"),
      });
      setConfirmPack(null);
    } catch (err) {
      if (err instanceof IAPUserCancelledError) {
        // Silent — user cancelled the purchase.
        setConfirmPack(null);
      } else {
        console.error("[PointShop] purchase failed", err);
        toast.error(t("screens.pointShop.purchaseFailed"), {
          description: err instanceof Error ? err.message : t("screens.pointShop.tryAgain"),
        });
      }
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Coins className="w-6 h-6 text-primary" />
              {t("screens.pointShop.title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("screens.pointShop.subtitle")}
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
                <p className="text-sm text-muted-foreground">{t("screens.pointShop.balance")}</p>
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
              {t("screens.pointShop.packsHeading")}
            </h2>
            {!nativeAvailable && (
              <Badge variant="outline" className="text-[10px]">{t("screens.pointShop.iosOnlyBadge")}</Badge>
            )}
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
                {t("screens.pointShop.packsComingSoon")}
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
                            {t("screens.pointShop.bonusBadge", { points: pack.bonus_points })}
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
                        {t("screens.pointShop.buy")}
                      </Button>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* ポイントで交換できるアイテム。
            以前は point_shop_items を読むフックと購入フックが実装済みなのに
            どの画面からも呼ばれておらず、ポイントの使い道が画面上に存在しなかった。 */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
            <Coins className="w-5 h-5 text-primary" />
            {t("screens.pointShop.exchangeHeading")}
          </h2>

          {shopItemsLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          ) : shopItemsError ? (
            <QueryErrorState
              title={t("screens.pointShop.exchangeLoadFailed")}
              onRetry={() => refetchShopItems()}
            />
          ) : (shopItems?.length ?? 0) === 0 ? (
            <EmptyState icon={Coins} title={t("screens.pointShop.exchangeEmpty")} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {shopItems!.map((item) => {
                const affordable = currentPoints >= item.points_cost;
                return (
                  <Card key={item.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      {item.description && (
                        <CardDescription>{item.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardFooter className="flex items-center justify-between pt-0">
                      <Badge variant="secondary" className="gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        {item.points_cost}pt
                      </Badge>
                      <Button
                        size="sm"
                        disabled={!affordable || purchaseShopItem.isPending}
                        onClick={() => setConfirmItem(item)}
                      >
                        {affordable
                          ? t("screens.pointShop.exchangeBuy")
                          : t("screens.pointShop.exchangeInsufficient")}
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
            {t("screens.pointShop.spendHeading")}
          </h2>
          <Card>
            <CardContent className="pt-4 space-y-2">
              {SPEND_GUIDE.map((g) => {
                const Icon = g.icon;
                return (
                  <div key={g.label} className="flex items-center justify-between py-2 border-b last:border-b-0">
                    <div className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span>{t(g.label)}</span>
                    </div>
                    <Badge variant="secondary" className="gap-1">
                      <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                      {g.cost}pt
                    </Badge>
                  </div>
                );
              })}
              <p className="text-[11px] text-muted-foreground pt-2">
                {t("screens.pointShop.spendNote")}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* Free Points */}
        <Card className="bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              {t("screens.pointShop.freeHeading")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <Row label={t("screens.pointShop.freeLoginBonus")} value={t("screens.pointShop.freeLoginBonusValue")} />
            <Row label={t("screens.pointShop.freeAddGoods")} value="+1pt" />
            <Row label={t("screens.pointShop.freeAddContent")} value="+10pt" />
            <Row label={t("screens.pointShop.freeStreak")} value={t("screens.pointShop.freeStreakValue")} />
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
                  <strong>¥{confirmPack?.price.toLocaleString()}</strong> {t("screens.pointShop.confirmMid")}{" "}
                  <strong>
                    {((confirmPack?.points ?? 0) + (confirmPack?.bonus_points ?? 0)).toLocaleString()}pt
                  </strong>{" "}
                  {t("screens.pointShop.confirmSuffix")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {nativeAvailable
                    ? t("screens.pointShop.confirmNoteNative")
                    : t("screens.pointShop.confirmNoteWeb")}
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchasing}>{t("screens.pointShop.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmPurchase} disabled={purchasing}>
              {purchasing ? t("screens.pointShop.processing") : t("screens.pointShop.continue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ポイント交換の確認 */}
      <AlertDialog open={!!confirmItem} onOpenChange={(o) => !o && setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("screens.pointShop.exchangeConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("screens.pointShop.exchangeConfirmDesc", {
                name: confirmItem?.name ?? "",
                cost: confirmItem?.points_cost ?? 0,
                balance: currentPoints,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={purchaseShopItem.isPending}>
              {t("screens.pointShop.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmExchange}
              disabled={purchaseShopItem.isPending}
            >
              {purchaseShopItem.isPending
                ? t("screens.pointShop.processing")
                : t("screens.pointShop.exchangeBuy")}
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
