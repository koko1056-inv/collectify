import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Tag } from "@/types";
import { TagInputField } from "./TagInput/TagInputField";
import { TagList } from "./TagInput/TagList";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  isOfficialItem?: boolean;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  isOfficialItem = false,
}: TagManageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing tags
  const { data: existingTags = [] } = useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tags")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Tag[];
    },
  });

  // Fetch item's current tags
  const { data: itemTags = [] } = useQuery({
    queryKey: [isOfficialItem ? "official-item-tags" : "user-item-tags", itemId],
    queryFn: async () => {
      if (isOfficialItem) {
        const { data, error } = await supabase
          .from("item_tags")
          .select(`
            tag_id,
            tags (
              id,
              name,
              created_at
            )
          `)
          .eq("official_item_id", itemId);
        if (error) throw error;
        return data.map(tag => ({
          id: tag.tags.id,
          name: tag.tags.name,
          created_at: tag.tags.created_at,
        }));
      } else {
        const { data, error } = await supabase
          .from("user_item_tags")
          .select(`
            tag_id,
            tags (
              id,
              name,
              created_at
            )
          `)
          .eq("user_item_id", itemId);
        if (error) throw error;
        return data.map(tag => ({
          id: tag.tags.id,
          name: tag.tags.name,
          created_at: tag.tags.created_at,
        }));
      }
    },
  });

  const handleAddTag = async (newTagName: string) => {
    try {
      // Check if tag exists
      let tagId;
      const { data: existingTag } = await supabase
        .from("tags")
        .select("id")
        .eq("name", newTagName)
        .maybeSingle();

      if (existingTag) {
        tagId = existingTag.id;
      } else {
        // Create new tag
        const { data: newTag, error: createTagError } = await supabase
          .from("tags")
          .insert([{ name: newTagName }])
          .select()
          .single();

        if (createTagError) throw createTagError;
        tagId = newTag.id;
      }

      // Add tag to item
      const { error: relationError } = await supabase
        .from(isOfficialItem ? "item_tags" : "user_item_tags")
        .insert([
          isOfficialItem
            ? {
                official_item_id: itemId,
                tag_id: tagId,
              }
            : {
                user_item_id: itemId,
                tag_id: tagId,
              },
        ]);

      if (relationError) throw relationError;

      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-item-tags" : "user-item-tags", itemId],
      });
      queryClient.invalidateQueries({ queryKey: ["tags"] });
      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-items" : "user-items"],
      });

      toast({
        title: "タグを追加しました",
        description: `${newTagName}をアイテムに追加しました。`,
      });
    } catch (error) {
      console.error("Error adding tag:", error);
      throw error;
    }
  };

  const handleRemoveTag = async (tagId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from(isOfficialItem ? "item_tags" : "user_item_tags")
        .delete()
        .eq(isOfficialItem ? "official_item_id" : "user_item_id", itemId)
        .eq("tag_id", tagId);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-item-tags" : "user-item-tags", itemId],
      });
      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-items" : "user-items"],
      });

      toast({
        title: "タグを削除しました",
        description: `${tagName}をアイテムから削除しました。`,
      });
    } catch (error) {
      console.error("Error removing tag:", error);
      toast({
        title: "エラー",
        description: "タグの削除に失敗しました。",
        variant: "destructive",
      });
    }
  };

  const handleSelectExistingTag = async (tagId: string, tagName: string) => {
    if (itemTags.some(tag => tag.id === tagId)) {
      toast({
        title: "タグは既に追加されています",
        description: `${tagName}は既にこのアイテムに追加されています。`,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from(isOfficialItem ? "item_tags" : "user_item_tags")
        .insert([
          isOfficialItem
            ? {
                official_item_id: itemId,
                tag_id: tagId,
              }
            : {
                user_item_id: itemId,
                tag_id: tagId,
              },
        ]);

      if (error) throw error;

      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-item-tags" : "user-item-tags", itemId],
      });
      queryClient.invalidateQueries({
        queryKey: [isOfficialItem ? "official-items" : "user-items"],
      });

      toast({
        title: "タグを追加しました",
        description: `${tagName}をアイテムに追加しました。`,
      });
    } catch (error) {
      console.error("Error adding existing tag:", error);
      toast({
        title: "エラー",
        description: "タグの追加に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>タグの管理 - {itemTitle}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <TagInputField onAddTag={handleAddTag} />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">現在のタグ</h4>
            <TagList
              tags={itemTags}
              onRemoveTag={handleRemoveTag}
              isRemovable={true}
            />
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">既存のタグ</h4>
            <TagList
              tags={existingTags}
              onSelectTag={handleSelectExistingTag}
              variant="outline"
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}