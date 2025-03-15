import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "../ui/button";
import { TagInput } from "../TagInput";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface TagDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialTags: string[];
  itemIds: string[];
  title?: string;
}

interface SimpleTag {
  id: string;
  name: string;
  category?: string;
}

export function TagDialog({
  isOpen,
  onClose,
  initialTags,
  itemIds,
  title = "タグの編集",
}: TagDialogProps) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: allTags = [] } = useQuery<SimpleTag[]>({
    queryKey: ["all-tags"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tags").select("*");
      if (error) throw error;
      return data;
    },
  });

  const handleSave = async () => {
    try {
      // Save logic here...
      
      // Invalidate queries
      await queryClient.invalidateQueries({ queryKey: ["item-tags"] });
      
      toast({
        title: "タグを保存しました",
        description: "タグの設定が完了しました。",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving tags:", error);
      toast({
        title: "エラー",
        description: "タグの保存中にエラーが発生しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <TagInput
            selectedTags={tags}
            onTagsChange={setTags}
            itemIds={itemIds}
            onClose={onClose}
          />
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            キャンセル
          </Button>
          <Button onClick={handleSave}>保存</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
