
import { WishlistGrid } from "../collection/WishlistGrid";
import { useAuth } from "@/contexts/AuthContext";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">ウィッシュリスト</h2>
      <WishlistGrid userId={userId} enableActions={user?.id === userId} />
    </div>
  );
}
