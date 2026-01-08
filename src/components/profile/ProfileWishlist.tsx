import { WishlistGrid } from "../collection/WishlistGrid";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ProfileWishlistProps {
  userId: string;
}

export function ProfileWishlist({ userId }: ProfileWishlistProps) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const isOwner = user?.id === userId;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">{t("wishlist.title")}</h2>
        {isOwner && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/collection")}
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            追加する
          </Button>
        )}
      </div>
      <WishlistGrid userId={userId} enableActions={isOwner} />
    </div>
  );
}
