import { useState } from "react";
import { Star, Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useFavoriteItems, FAVORITE_ITEMS_LIMIT } from "@/hooks/useFavoriteItems";
import { FavoriteItemsEditModal } from "./FavoriteItemsEditModal";
import { ItemDetailsModal } from "@/components/ItemDetailsModal";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface FavoriteItemsTop5Props {
  userId: string;
  isOwnProfile: boolean;
}

/**
 * プロフィール「コレクション」タブの最上部に表示するお気に入り TOP5 セクション。
 * - 横スクロールカード
 * - 自分のページなら編集ボタンと未設定時の追加プレースホルダー
 * - 他人のページで未設定なら非表示
 */
export function FavoriteItemsTop5({ userId, isOwnProfile }: FavoriteItemsTop5Props) {
  const { data: items = [], isLoading } = useFavoriteItems(userId);
  const [editOpen, setEditOpen] = useState(false);
  const [detailItemId, setDetailItemId] = useState<string | null>(null);

  // 他人のページで0件は非表示
  if (!isOwnProfile && !isLoading && items.length === 0) {
    return null;
  }

  // 5枠を埋める（足りない分はnull）
  const slots: ((typeof items)[number] | null)[] = [
    ...items,
    ...Array(Math.max(0, FAVORITE_ITEMS_LIMIT - items.length)).fill(null),
  ].slice(0, FAVORITE_ITEMS_LIMIT);

  return (
    <div className="px-4 mb-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5 min-w-0">
            <Star className="w-4 h-4 text-yellow-500 fill-yellow-500 shrink-0" />
            <h3 className="text-sm font-bold truncate">
              お気に入り TOP{FAVORITE_ITEMS_LIMIT}
            </h3>
            {items.length > 0 && (
              <span className="text-[10px] text-muted-foreground shrink-0">
                ({items.length}/{FAVORITE_ITEMS_LIMIT})
              </span>
            )}
          </div>
          {isOwnProfile && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditOpen(true)}
              className="h-7 gap-1 text-xs"
            >
              <Pencil className="w-3 h-3" />
              編集
            </Button>
          )}
        </div>

        {/* カード（横スクロール） */}
        {isLoading ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-28 h-36 rounded-xl shrink-0" />
            ))}
          </div>
        ) : (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {slots.map((item, idx) => (
              <FavoriteSlot
                key={item?.id ?? `empty-${idx}`}
                rank={idx + 1}
                item={item}
                isOwnProfile={isOwnProfile}
                onClickItem={() => item && setDetailItemId(item.id)}
                onClickEmpty={() => isOwnProfile && setEditOpen(true)}
              />
            ))}
          </div>
        )}

        {/* 自分のページで0件なら大きめCTA */}
        {isOwnProfile && !isLoading && items.length === 0 && (
          <p className="text-[11px] text-muted-foreground mt-2 text-center">
            タップして、推しグッズを最大5個まで選ぼう ⭐
          </p>
        )}
      </div>

      {/* 編集モーダル */}
      {isOwnProfile && (
        <FavoriteItemsEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          userId={userId}
        />
      )}

      {/* 詳細モーダル */}
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

// ==================== スロット ====================
function FavoriteSlot({
  rank,
  item,
  isOwnProfile,
  onClickItem,
  onClickEmpty,
}: {
  rank: number;
  item: { id: string; title: string; image: string; content_name: string | null } | null;
  isOwnProfile: boolean;
  onClickItem: () => void;
  onClickEmpty: () => void;
}) {
  const rankColor =
    rank === 1
      ? "bg-yellow-400 text-yellow-950"
      : rank === 2
      ? "bg-gray-300 text-gray-800"
      : rank === 3
      ? "bg-amber-600 text-amber-50"
      : "bg-muted text-muted-foreground";

  if (!item) {
    return (
      <button
        onClick={onClickEmpty}
        disabled={!isOwnProfile}
        className={cn(
          "w-28 shrink-0 rounded-xl border-2 border-dashed border-border bg-muted/40 flex flex-col items-center justify-center gap-1 aspect-[3/4] transition-colors",
          isOwnProfile && "hover:border-primary hover:bg-primary/5 cursor-pointer",
          !isOwnProfile && "opacity-50"
        )}
      >
        <Plus className="w-5 h-5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">追加</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClickItem}
      className="w-28 shrink-0 group text-left"
    >
      <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border">
        <img
          src={item.image}
          alt={item.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {/* 順位バッジ */}
        <div
          className={cn(
            "absolute top-1.5 left-1.5 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-md",
            rankColor
          )}
        >
          {rank}
        </div>
      </div>
      <p className="mt-1.5 text-[11px] font-medium leading-tight line-clamp-2">
        {item.title}
      </p>
      {item.content_name && (
        <p className="text-[10px] text-muted-foreground truncate mt-0.5">
          {item.content_name}
        </p>
      )}
    </button>
  );
}
