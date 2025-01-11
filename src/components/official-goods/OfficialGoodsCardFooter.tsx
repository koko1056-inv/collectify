import { CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Tag, Users } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: React.MouseEvent) => void;
  onTagManageClick: (e: React.MouseEvent) => void;
  onWishlistClick: (e: React.MouseEvent) => void;
  itemId: string;
  itemTitle: string;
  itemImage: string;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
}: OfficialGoodsCardFooterProps) {
  const { t } = useLanguage();

  const { data: ownersCount = 0, isError: isOwnersError } = useQuery({
    queryKey: ["owners-count", itemId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("user_items")
          .select("*", { count: "exact", head: true })
          .eq("title", itemId);

        if (error) {
          console.error("Error getting owners count:", error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }
    },
  });

  const { data: tagCount = 0, isError: isTagError } = useQuery({
    queryKey: ["tag-count", itemId],
    queryFn: async () => {
      try {
        const { count, error } = await supabase
          .from("item_tags")
          .select("*", { count: "exact", head: true })
          .eq("official_item_id", itemId);

        if (error) {
          console.error("Error getting tag count:", error);
          return 0;
        }

        return count || 0;
      } catch (error) {
        console.error("Error getting tag count:", error);
        return 0;
      }
    },
  });

  return (
    <CardFooter className="p-2">
      <div className="flex justify-between items-center w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onWishlistClick}
          >
            <Heart className="h-4 w-4" />
            <span className="ml-1 text-xs">{wishlistCount}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onTagManageClick}
          >
            <Tag className="h-4 w-4" />
            <span className="ml-1 text-xs">{tagCount}</span>
          </Button>
          <div className="flex items-center text-gray-500">
            <Users className="h-4 w-4 mr-1" />
            <span className="text-xs">{ownersCount}</span>
          </div>
        </div>
        <Button
          variant={isInCollection ? "secondary" : "default"}
          size="sm"
          onClick={onAddToCollection}
          disabled={isInCollection}
        >
          {isInCollection ? t("collection.added") : t("collection.add")}
        </Button>
      </div>
    </CardFooter>
  );
}