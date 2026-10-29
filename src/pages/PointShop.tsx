import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  isNativeIAPAvailable,
  getPointPackages,
  purchasePointPackage,
  IAPUserCancelledError,
  type PointPackageEntry,
} from "@/utils/iap";
import { CheckoutError, isWebCheckoutAvailable, startPointsCheckout } from "@/utils/stripeCheckout";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Gift,
  Sparkles,
  Flame,
  Info,
  Tag as TagIcon,
  Package,
  Home,
  ImageIcon,
  Cookie,
  ChevronRight,
  Shirt,
  UserRound,
} from "lucide-react";
import {
  usePointPackages,
  usePointShopItems,
  usePurchaseShopItem,
  type PointPackage,
  type PointShopItem,
} from "@/hooks/usePointShop";
import { SlotUsageMeter } from "@/components/shop/SlotUsageMeter";
import { ShopItemGroups } from "@/components/shop/ShopItemGroups";
import { PointIcon } from "@/components/ui/point-icon";
import { IconTile } from "@/components/ui/icon-tile";
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
import { AI_COSTS } from "@/lib/aiCosts";
import { COLLECTION_SLOT_EXPAND_COST } from "@/hooks/useSpendPoints";

// label は翻訳キー。モジュールスコープでは useLanguage が使えないため、描画時に t() で解決する。
const SPEND_GUIDE = [
  { icon: TagIcon, label: "screens.pointShop.spendCustomTag", cost: 10 },
  { icon: Package, label: "screens.pointShop.spendCollectionSlots", cost: COLLECTION_SLOT_EXPAND_COST },
  // AI 生成の値段は各 Edge Function と揃える（src/lib/aiCosts.ts）
  { icon: Shirt, label: "screens.pointShop.spendEditImage", cost: AI_COSTS.editImage },
  { icon: UserRound, label: "screens.pointShop.spendAvatar", cost: AI_COSTS.avatar },
  { icon: ImageIcon, label: "screens.pointShop.spendAiImage", cost: AI_COSTS.postImage },
  { icon: Home, label: "screens.pointShop.spendAiRoom", cost: AI_COSTS.aiRoom },
  // 推しグッズへのプレゼント（推しの部屋から贈る）。値段は companion_gift_kinds と揃える
  { icon: Cookie, label: "screens.pointShop.spendCompanionSnack", cost: 30 },
  { icon: Gift, label: "screens.pointShop.spendCompanionSpecial", cost: 100 },
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
  // 推しの部屋の「鍵の付いた物」から来たとき（?item=room:sakura）、その商品までスクロールして目立たせる
  const [searchParams] = useSearchParams();
  const highlightKey = searchParams.get("item");
  useEffect(() => {
    if (!highlightKey || !shopItems?.length) return;
    // 棚が描かれてから探す
    const timer = window.setTimeout(() => {
      document.getElementById(`shop-${highlightKey.replace(":", "-")}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 150);
    return () => window.clearTimeout(timer);
  }, [highlightKey, shopItems]);

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
  const currentStreak = userPoints?.login_streak ?? 0;

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
      // アプリの外（Web）では Stripe の決済ページへ。アプリ内ではストアの課金を使う決まり。
      if (!isWebCheckoutAvailable()) {
        toast(t("screens.pointShop.iosOnlyTitle"), {
          description: t("screens.pointShop.iosOnlyDesc"),
        });
        setConfirmPack(null);
        return;
      }
      const key = pack.revenuecat_package_id;
      if (!key) {
        toast.error(t("screens.pointShop.cannotPurchase"), {
          description: t("screens.pointShop.noProductConfig"),
        });
        setConfirmPack(null);
        return;
      }
      setPurchasing(true);
      try {
        toast(t("misc.checkout.redirecting"));
        await startPointsCheckout(key); // 決済ページへ移動する（戻ってこない）
      } catch (err) {
        console.error("[PointShop] web checkout failed", err);
        const code = err instanceof CheckoutError ? err.code : "unknown";
        toast.error(t("screens.pointShop.purchaseFailed"), {
          description:
            code === "stripe_not_configured"
              ? t("misc.checkout.notConfigured")
              : code === "login_required"
                ? t("misc.checkout.loginRequired")
                : t("misc.checkout.failed"),
        });
        setPurchasing(false);
      }
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
    <div className="min-h-screen bg-background pb-nav">
      <Navbar />

      <div className="container max-w-4xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            {/* 見出しの横の印は外した。下の残高カードに同じ印が大きく出るので、並ぶと重複していた
                （以前は lucide の Coins で、ほかの画面の ★ とも違う印だった） */}
            <h1 className="text-2xl font-bold">
              {t("screens.pointShop.title")}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("screens.pointShop.subtitle")}
            </p>
          </div>
        </div>

        {/* Current Balance */}
        {/* 残高。以前は primary のグラデーションの面に、primary で塗った星の丸を置いていて、
            ほかの画面のポイントの印（金色のメダル）と色が違っていた。面は落ち着いたカードにし、
            印はアプリ共通の PointIcon を大きく出す */}
        <Card data-tour="shop-balance" className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <PointIcon size={44} />
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

            {/* 枠の使用状況。枠を買うかどうかの判断材料になるのでここに出す。
                マイルームの枠は上限として使われておらず、増やす商品も販売をやめたので出さない */}
            <div className="mt-4 pt-4 border-t border-border">
              <SlotUsageMeter type="collection" compact />
            </div>
            {/* 残高のすぐ下にも「もらい方」への入口。ポイントの記録もそこで見られる */}
            <button
              type="button"
              onClick={() => navigate("/point-shop/earn")}
              className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              <Gift className="h-3.5 w-3.5" aria-hidden="true" />
              {t("screens.pointShop.earn.open")}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </CardContent>
        </Card>

        {/* Point Packages。まだ売っていないあいだは節ごと出さない（空の「まもなく登場」が2つ並んでいた） */}
        {(packagesLoading || (packages && packages.length > 0)) && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              {t("screens.pointShop.packsHeading")}
            </h2>
            {!nativeAvailable && !isWebCheckoutAvailable() && (
              <Badge variant="outline" className="text-3xs">{t("screens.pointShop.iosOnlyBadge")}</Badge>
            )}
          </div>

          {packagesLoading ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
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
                          <Badge className="bg-points-soft text-points border-points/30">
                            {t("screens.pointShop.bonusBadge", { points: pack.bonus_points })}
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="flex items-baseline gap-1">
                        <PointIcon size={16} className="self-center" />
                        <span className="text-xl font-bold text-foreground">
                          {totalPoints.toLocaleString()}
                        </span>
                        <span className="text-xs">pt</span>
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="pt-2 flex items-center justify-between">
                      <span className="text-base font-bold">¥{pack.price.toLocaleString()}</span>
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
        )}

        {/* ポイントで交換できるアイテム。
            以前は point_shop_items を読むフックと購入フックが実装済みなのに
            どの画面からも呼ばれておらず、ポイントの使い道が画面上に存在しなかった。 */}
        {(shopItemsLoading || shopItemsError || (shopItems?.length ?? 0) > 0) && (
        <section data-tour="shop-items" className="mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
            <PointIcon size={20} />
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
          ) : (
            // 棚（着せ替え / シェアカード / 枠）ごとに見出しを付けて並べる。着せ替えは見本つき
            <ShopItemGroups
              items={shopItems!}
              currentPoints={currentPoints}
              pending={purchaseShopItem.isPending}
              onExchange={setConfirmItem}
              highlightKey={highlightKey}
            />
          )}
        </section>
        )}

        {/* Spend Guide */}
        <section className="mb-8">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-3">
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
                      {/* 名前が2行になっても印が縮まないように */}
                      <Icon className="w-4 h-4 shrink-0 text-muted-foreground" />
                      <span>{t(g.label)}</span>
                    </div>
                    <Badge variant="secondary" className="gap-1 tabular-nums">
                      <PointIcon size={14} />
                      {g.cost}pt
                    </Badge>
                  </div>
                );
              })}
              <p className="text-2xs text-muted-foreground pt-2">
                {t("screens.pointShop.spendNote")}
              </p>
            </CardContent>
          </Card>
        </section>

        {/* もらい方は専用の画面にまとめた（額はサーバーの表から読む。以前はここに固定の文言で一部だけ載っていた） */}
        <EarnLinkCard onOpen={() => navigate("/point-shop/earn")} streak={currentStreak} />
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

function EarnLinkCard({ onOpen, streak }: { onOpen: () => void; streak: number }) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      onClick={onOpen}
      data-testid="earn-link"
      className="flex w-full items-center gap-3 rounded-xl border bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <IconTile tone="success" size="sm">
        <Gift />
      </IconTile>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold">{t("screens.pointShop.earn.open")}</span>
        <span className="block text-xs text-muted-foreground">{t("screens.pointShop.earn.openDesc")}</span>
      </span>
      {streak > 0 && (
        <Badge variant="secondary" className="gap-1">
          <Flame className="w-3 h-3 text-warning" />
          {t("screens.pointShop.streakDays", { n: streak })}
        </Badge>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}
