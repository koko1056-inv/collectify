import { WishlistGrid } from "../collection/WishlistGrid";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">{t("wishlist.title")}</h2>
      <WishlistGrid userId={userId} enableActions={user?.id === userId} />
    </div>
  );
}
