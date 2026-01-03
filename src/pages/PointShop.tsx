import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Star, 
  Package, 
  Home, 
  Users, 
  Tag, 
  Sparkles, 
  ShoppingCart,
  ArrowLeft,
  Gift,
  Crown,
  Zap
} from "lucide-react";
import { usePointShopItems, useUserLimits, usePurchaseShopItem, PointShopItem } from "@/hooks/usePointShop";
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

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  package: Package,
  home: Home,
  users: Users,
  tag: Tag,
  sparkles: Sparkles,
  "user-plus": Users,
};

const categoryInfo = {
  collection: { label: "コレクション", icon: Package, color: "text-blue-500" },
  room: { label: "マイルーム", icon: Home, color: "text-green-500" },
  community: { label: "コミュニティ", icon: Users, color: "text-purple-500" },
  ai: { label: "AI機能", icon: Sparkles, color: "text-amber-500" },
  special: { label: "特別", icon: Crown, color: "text-pink-500" },
};

export default function PointShop() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>("collection");
  const [confirmItem, setConfirmItem] = useState<PointShopItem | null>(null);
  
  const { data: shopItems, isLoading: itemsLoading } = usePointShopItems();
  const { data: userPoints, isLoading: pointsLoading } = useUserPoints();
  const { data: userLimits, isLoading: limitsLoading } = useUserLimits();
  const purchaseMutation = usePurchaseShopItem();

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

  const filteredItems = shopItems?.filter(item => item.category === selectedCategory) || [];
  const currentPoints = userPoints?.total_points || 0;

  const handlePurchase = (item: PointShopItem) => {
    setConfirmItem(item);
  };

  const confirmPurchase = () => {
    if (confirmItem) {
      purchaseMutation.mutate(confirmItem);
      setConfirmItem(null);
    }
  };

  const getItemIcon = (iconName: string | null) => {
    if (!iconName) return Package;
    return iconMap[iconName] || Package;
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      
      <div className="container max-w-4xl mx-auto px-4 py-6 pt-16 sm:pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate("/my-room")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingCart className="w-6 h-6 text-primary" />
              ポイントショップ
            </h1>
          </div>
        </div>

        {/* Points & Limits Summary */}
        <Card className="mb-6 bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              {/* Current Points */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-primary fill-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">保有ポイント</p>
                  {pointsLoading ? (
                    <Skeleton className="h-8 w-24" />
                  ) : (
                    <p className="text-2xl font-bold">{currentPoints.toLocaleString()} <span className="text-base font-normal text-muted-foreground">pt</span></p>
                  )}
                </div>
              </div>

              {/* Current Limits */}
              {limitsLoading ? (
                <Skeleton className="h-16 w-48" />
              ) : userLimits && (
                <div className="flex gap-4 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">コレクション枠</p>
                    <p className="font-semibold text-lg">{userLimits.collection_slots}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">ルーム数</p>
                    <p className="font-semibold text-lg">{userLimits.room_slots}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">タグ枠</p>
                    <p className="font-semibold text-lg">{userLimits.custom_tag_slots}</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Category Tabs */}
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="w-full grid grid-cols-3 mb-6">
            <TabsTrigger value="collection" className="gap-1">
              <Package className="w-4 h-4" />
              <span className="hidden sm:inline">コレクション</span>
            </TabsTrigger>
            <TabsTrigger value="room" className="gap-1">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">ルーム</span>
            </TabsTrigger>
            <TabsTrigger value="community" className="gap-1">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">コミュニティ</span>
            </TabsTrigger>
          </TabsList>

          {/* Shop Items Grid */}
          <TabsContent value={selectedCategory} className="mt-0">
            {itemsLoading ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Gift className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>このカテゴリにはアイテムがありません</p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filteredItems.map(item => {
                  const Icon = getItemIcon(item.icon);
                  const canAfford = currentPoints >= item.points_cost;
                  const categoryData = categoryInfo[item.category as keyof typeof categoryInfo];
                  
                  return (
                    <Card 
                      key={item.id} 
                      className={`transition-all ${canAfford ? 'hover:shadow-md hover:border-primary/30' : 'opacity-60'}`}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${categoryData?.color}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <Badge variant="secondary" className="gap-1">
                            <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                            {item.points_cost}
                          </Badge>
                        </div>
                        <CardTitle className="text-lg mt-2">{item.name}</CardTitle>
                        {item.description && (
                          <CardDescription>{item.description}</CardDescription>
                        )}
                      </CardHeader>
                      <CardFooter>
                        <Button 
                          className="w-full gap-2"
                          disabled={!canAfford || purchaseMutation.isPending}
                          onClick={() => handlePurchase(item)}
                        >
                          {canAfford ? (
                            <>
                              <Zap className="w-4 h-4" />
                              購入する
                            </>
                          ) : (
                            "ポイント不足"
                          )}
                        </Button>
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Free Points Info */}
        <Card className="mt-8 bg-muted/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gift className="w-5 h-5 text-green-500" />
              無料でポイントを獲得
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ログインボーナス</span>
              <span className="font-medium">+3pt / 日</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">グッズ登録</span>
              <span className="font-medium">+5pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">コンテンツ追加</span>
              <span className="font-medium">+10pt</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">7日連続ログイン</span>
              <span className="font-medium">+50pt ボーナス</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Confirmation Dialog */}
      <AlertDialog open={!!confirmItem} onOpenChange={() => setConfirmItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>購入確認</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p><strong>{confirmItem?.name}</strong>を購入しますか？</p>
              <p className="flex items-center gap-1">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{confirmItem?.points_cost}ポイント</span>を消費します
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPurchase}>
              購入する
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Footer />
    </div>
  );
}
