
import { WishlistGrid } from "./WishlistGrid";
import { useAuth } from "@/contexts/AuthContext";

interface CollectionWishlistProps {
  userId: string;
}

// コレクションページ側はボタンを表示（自分自身の場合のみ）する仕様
export function CollectionWishlist({ userId }: CollectionWishlistProps) {
  const { user } = useAuth();
  return <WishlistGrid userId={userId} enableActions={user?.id === userId} />;
}
