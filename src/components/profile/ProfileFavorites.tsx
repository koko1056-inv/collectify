import { Button } from "@/components/ui/button";
import { CollectionGoodsCard } from "@/components/CollectionGoodsCard";

interface ProfileFavoritesProps {
  favoriteItems: any[];
  userId?: string;
  onCollectionEdit: () => void;
}

export function ProfileFavorites({
  favoriteItems,
  userId,
  onCollectionEdit,
}: ProfileFavoritesProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">お気に入りコレクション</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onCollectionEdit}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          編集
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {favoriteItems.map((item) => (
          <CollectionGoodsCard
            key={item.id}
            id={item.id}
            title={item.title}
            image={item.image}
            isShared={item.is_shared}
            userId={userId}
          />
        ))}
      </div>
    </div>
  );
}