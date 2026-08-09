import { useState } from "react";
import { Star } from "lucide-react";
import { useFavoriteItems } from "@/hooks/useFavoriteItems";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOptimizedImageUrl, fallbackToOriginal } from "@/utils/optimized-image";

interface Props {
  userId: string;
}

/**
 * プロフィール上部に、お気に入りグッズを丸アイコンで横並び表示する「推し」ストリップ。
 * - 既存の useFavoriteItems（profiles.favorite_item_ids）を再利用（データ追加なし）
 * - 編集は「コレクション」タブの お気に入りTOP5 側に集約し、ここは閲覧＋詳細を開くだけ
 * - お気に入りが無ければ何も表示しない（余白を作らない）
 */
export function FavoriteItemsCircleStrip({ userId }: Props) {
  const { data: items = [], isLoading } = useFavoriteItems(userId);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const { t } = useLanguage();

  if (isLoading || items.length === 0) return null;

  return (
    <div className="px-4 mt-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500" />
        <h3 className="text-[13px] font-bold tracking-wide">{t("profileScreen.favorites.oshiHeading")}</h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setDetailItemId(item.id)}
            className="flex flex-col items-center gap-1 shrink-0 w-16 group"
          >
            <div className="relative">
              <div className="absolute -inset-0.5 rounded-full bg-gradient-to-br from-primary/50 to-primary/40 opacity-70" />
              <div className="relative w-14 h-14 rounded-full overflow-hidden bg-muted border-2 border-background">
                <img
                  src={getOptimizedImageUrl(item.image, { width: 150 })} onError={fallbackToOriginal(item.image)} loading="lazy" decoding="async"
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
              </div>
            </div>
            <span className="text-[10px] text-muted-foreground leading-tight line-clamp-1 w-full text-center">
              {item.title}
            </span>
          </button>
        ))}
      </div>

      {detailItemId && (() => {
        const it = items.find((i) => i.id === detailItemId);
        if (!it) return null;
        return (
          <ItemDetailsModal
            itemId={it.id}
            title={it.title}
            image={it.image}
            isUserItem
            userId={userId}
            isOpen={!!detailItemId}
            onClose={() => setDetailItemId(null)}
          />
        );
      })()}
    </div>
  );
}
