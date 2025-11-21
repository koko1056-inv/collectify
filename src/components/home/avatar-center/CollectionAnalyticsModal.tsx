import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { BarChart3, Package, TrendingUp, DollarSign } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CollectionAnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
}

interface Analytics {
  totalItems: number;
  totalQuantity: number;
  topContent: string;
  totalValue: number;
  topTags: { name: string; count: number }[];
}

export function CollectionAnalyticsModal({ isOpen, onClose, userId }: CollectionAnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]);

  const fetchAnalytics = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      // コレクションアイテムを取得
      const { data: items, error: itemsError } = await supabase
        .from("user_items")
        .select("*, user_item_tags(tag_id, tags(name))")
        .eq("user_id", userId);

      if (itemsError) throw itemsError;

      if (!items || items.length === 0) {
        setAnalytics({
          totalItems: 0,
          totalQuantity: 0,
          topContent: "なし",
          totalValue: 0,
          topTags: []
        });
        setLoading(false);
        return;
      }

      // 統計情報を計算
      const totalItems = items.length;
      const totalQuantity = items.reduce((sum, item) => sum + (item.quantity || 1), 0);
      
      // コンテンツごとの集計
      const contentCount: Record<string, number> = {};
      items.forEach(item => {
        if (item.content_name) {
          contentCount[item.content_name] = (contentCount[item.content_name] || 0) + 1;
        }
      });
      const topContent = Object.entries(contentCount).sort((a, b) => b[1] - a[1])[0]?.[0] || "なし";

      // 合計金額（価格がある場合のみ）
      const totalValue = items.reduce((sum, item) => {
        const price = item.purchase_price ? parseFloat(item.purchase_price.replace(/[^\d.]/g, '')) : 0;
        return sum + price;
      }, 0);

      // タグの集計
      const tagCount: Record<string, number> = {};
      items.forEach(item => {
        if (item.user_item_tags) {
          item.user_item_tags.forEach((tag: any) => {
            if (tag.tags?.name) {
              tagCount[tag.tags.name] = (tagCount[tag.tags.name] || 0) + 1;
            }
          });
        }
      });
      const topTags = Object.entries(tagCount)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        totalItems,
        totalQuantity,
        topContent,
        totalValue,
        topTags
      });
    } catch (error) {
      console.error("Error fetching analytics:", error);
      toast({
        variant: "destructive",
        title: "エラー",
        description: "分析データの取得に失敗しました",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            コレクション分析
          </DialogTitle>
          <DialogDescription>
            コレクションの統計情報を表示します
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* 基本統計 */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">総アイテム数</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalItems}</p>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">総数量</span>
                </div>
                <p className="text-2xl font-bold">{analytics.totalQuantity}</p>
              </div>
            </div>

            {/* 最も多いコンテンツ */}
            <div className="bg-gradient-to-br from-orange-500/10 to-red-500/10 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">最も多いコンテンツ</span>
              </div>
              <p className="text-lg font-bold">{analytics.topContent}</p>
            </div>

            {/* 合計金額 */}
            {analytics.totalValue > 0 && (
              <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">購入総額</span>
                </div>
                <p className="text-2xl font-bold">¥{analytics.totalValue.toLocaleString()}</p>
              </div>
            )}

            {/* 人気タグTOP5 */}
            {analytics.topTags.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-3">人気タグ TOP5</h4>
                <div className="space-y-2">
                  {analytics.topTags.map((tag, index) => (
                    <div key={tag.name} className="flex items-center justify-between bg-muted/50 p-2 rounded">
                      <span className="text-sm">
                        <span className="font-bold text-primary mr-2">{index + 1}.</span>
                        {tag.name}
                      </span>
                      <span className="text-sm text-muted-foreground">{tag.count}個</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">データが見つかりませんでした</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
