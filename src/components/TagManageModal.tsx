import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tag } from "@/types";
import { X } from "lucide-react";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
}

export function TagManageModal({ isOpen, onClose, itemId, itemTitle }: TagManageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tagInput, setTagInput] = useState("");

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
    queryKey: ["item-tags", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("item_tags")
        .select(`
          tag_id,
          tags (
            id,
            name
          )
        `)
        .eq("official_item_id", itemId);
      if (error) throw error;
      return data.map(tag => ({
        id: tag.tags.id,
        name: tag.tags.name,
      }));
    },
  });

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && tagInput.trim()) {
      e.preventDefault();
      const newTagName = tagInput.trim().toLowerCase();

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
          .from("item_tags")
          .insert([{
            official_item_id: itemId,
            tag_id: tagId,
          }]);

        if (relationError) throw relationError;

        queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });
        queryClient.invalidateQueries({ queryKey: ["tags"] });

        setTagInput("");
        toast({
          title: "タグを追加しました",
          description: `${newTagName}をアイテムに追加しました。`,
        });
      } catch (error) {
        console.error("Error adding tag:", error);
        toast({
          title: "エラー",
          description: "タグの追加に失敗しました。",
          variant: "destructive",
        });
      }
    }
  };

  const handleRemoveTag = async (tagId: string, tagName: string) => {
    try {
      const { error } = await supabase
        .from("item_tags")
        .delete()
        .eq("official_item_id", itemId)
        .eq("tag_id", tagId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });

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
    // Check if tag is already added
    if (itemTags.some(tag => tag.id === tagId)) {
      toast({
        title: "タグは既に追加されています",
        description: `${tagName}は既にこのアイテムに追加されています。`,
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("item_tags")
        .insert([{
          official_item_id: itemId,
          tag_id: tagId,
        }]);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ["item-tags", itemId] });

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
          <Input
            placeholder="新しいタグを入力してEnterを押してください"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
          <div className="space-y-2">
            <h4 className="text-sm font-medium">現在のタグ</h4>
            <div className="flex flex-wrap gap-2">
              {itemTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="flex items-center gap-1"
                >
                  {tag.name}
                  <button
                    onClick={() => handleRemoveTag(tag.id, tag.name)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
              {itemTags.length === 0 && (
                <p className="text-sm text-muted-foreground">タグはまだ追加されていません</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium">既存のタグ</h4>
            <div className="flex flex-wrap gap-2">
              {existingTags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleSelectExistingTag(tag.id, tag.name)}
                >
                  {tag.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}