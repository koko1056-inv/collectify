import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Heart, Users } from "lucide-react";
import { TagButton } from "./buttons/TagButton";
import { useState } from "react";
import { ItemOwnersModal } from "@/components/ItemOwnersModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface OfficialGoodsCardFooterProps {
  isInCollection: boolean;
  wishlistCount: number;
  onAddToCollection: (e: React.MouseEvent) => void;
  onTagManageClick: (e: React.MouseEvent) => void;
  onWishlistClick: (e: React.MouseEvent) => void;
  itemId: string;
  itemTitle: string;
}

export function OfficialGoodsCardFooter({
  isInCollection,
  wishlistCount,
  onAddToCollection,
  onTagManageClick,
  onWishlistClick,
  itemId,
  itemTitle,
}: OfficialGoodsCardFooterProps) {
  const [isOwnersModalOpen, setIsOwnersModalOpen] = useState(false);

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemTitle],
    queryFn: async () => {
      const { count } = await supabase
        .from("user_items")
        .select("*", { count: 'exact', head: true })
        .eq("title", itemTitle)
        .eq("is_shared", true);
      
      return count || 0;
    },
  });

  return (
    <>
      <CardFooter className="p-2 sm:p-4 pt-0 flex flex-col gap-2">
        <div className="flex justify-end gap-2">
          <TagButton onClick={onTagManageClick} />
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                setIsOwnersModalOpen(true);
              }}
              className="border-gray-200 hover:bg-gray-50"
            >
              <Users className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 mt-1">{ownersCount}</span>
          </div>
          <div className="flex flex-col items-center">
            <Button 
              variant="outline" 
              size="icon"
              onClick={onWishlistClick}
              className="border-gray-200 hover:bg-gray-50"
            >
              <Heart className="h-4 w-4" />
            </Button>
            <span className="text-xs text-gray-500 mt-1">{wishlistCount}</span>
          </div>
        </div>
        <Button 
          variant={isInCollection ? "secondary" : "default"}
          className={`w-full ${isInCollection ? 'bg-gray-100 text-gray-500 hover:bg-gray-200' : 'bg-gray-900 hover:bg-gray-800'}`}
          onClick={onAddToCollection}
          disabled={isInCollection}
        >
          {isInCollection ? "追加済み" : "コレクションに追加"}
        </Button>
      </CardFooter>

      <ItemOwnersModal
        isOpen={isOwnersModalOpen}
        onClose={() => setIsOwnersModalOpen(false)}
        itemId={itemId}
        itemTitle={itemTitle}
      />
    </>
  );
}