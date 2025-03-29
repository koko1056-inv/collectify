
import { Button } from "@/components/ui/button";
import { Users } from "lucide-react";
import { TagButton } from "../buttons/TagButton";
import { useState } from "react";
import { ItemOwnersModal } from "@/components/ItemOwnersModal";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface TagsAndSocialButtonsProps {
  itemId: string;
  itemTitle: string;
  itemImage: string;
  onTagManageClick: (e: React.MouseEvent) => void;
}

export function TagsAndSocialButtons({
  itemId,
  itemTitle,
  itemImage,
  onTagManageClick,
}: TagsAndSocialButtonsProps) {
  const [isOwnersModalOpen, setIsOwnersModalOpen] = useState(false);

  const { data: ownersCount = 0 } = useQuery({
    queryKey: ["item-owners-count", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_items")
        .select("user_id")
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting owners count:", error);
        return 0;
      }

      // ユニークなユーザーIDの数を計算
      const uniqueUserIds = new Set(data.map(item => item.user_id));
      return uniqueUserIds.size;
    },
  });

  const { data: tagCount = 0 } = useQuery({
    queryKey: ["item-tags-count", itemId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("item_tags")
        .select("*", { count: 'exact', head: true })
        .eq("official_item_id", itemId);
      
      if (error) {
        console.error("Error getting tag count:", error);
        return 0;
      }
      
      return count || 0;
    },
  });

  return (
    <>
      <div className="flex justify-end gap-1 sm:gap-2">
        <TagButton onClick={onTagManageClick} tagCount={tagCount} itemId={itemId} />
        <div className="flex flex-col items-center">
          <Button 
            variant="outline" 
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsOwnersModalOpen(true);
            }}
            className="border-gray-200 hover:bg-gray-50 h-7 w-7 sm:h-9 sm:w-9"
          >
            <Users className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
          <span className="text-[10px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1">{ownersCount}</span>
        </div>
      </div>

      {isOwnersModalOpen && (
        <ItemOwnersModal
          isOpen={isOwnersModalOpen}
          onClose={() => setIsOwnersModalOpen(false)}
          itemTitle={itemTitle}
          itemImage={itemImage}
        />
      )}
    </>
  );
}
