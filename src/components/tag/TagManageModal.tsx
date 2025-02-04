import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { TagWithRelation } from "@/types/tag";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemIds: string[];
  itemTitle?: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({ 
  isOpen, 
  onClose, 
  itemIds = [],
  itemTitle,
  isUserItem = false,
  isCategory = false 
}: TagManageModalProps) {
  const { user } = useAuth();
  const title = itemIds.length === 1 
    ? `${isCategory ? "カテゴリの管理" : "タグの管理"}${itemTitle ? `: ${itemTitle}` : ''}`
    : `${itemIds.length}個のアイテムのタグを管理`;

  const { data: currentTags = [] } = useQuery<TagWithRelation[]>({
    queryKey: ["current-tags", itemIds, isUserItem],
    queryFn: async () => {
      if (!itemIds.length) return [];

      const table = isUserItem ? 'user_item_tags' : 'item_tags';
      const idColumn = isUserItem ? 'user_item_id' : 'official_item_id';

      const { data, error } = await supabase
        .from(table)
        .select(`
          tag_id,
          tags (
            id,
            name,
            is_category
          )
        `)
        .in(idColumn, itemIds)
        .eq('tags.is_category', isCategory);

      if (error) throw error;
      return data || [];
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <TagInputField itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
          <CurrentTags tags={currentTags} />
          <ExistingTags itemIds={itemIds} isUserItem={isUserItem} isCategory={isCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}