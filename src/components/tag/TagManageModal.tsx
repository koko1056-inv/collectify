import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { MediaSelectionFields } from "@/components/MediaSelectionFields";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface TagManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemId: string;
  itemTitle: string;
  isUserItem?: boolean;
  isCategory?: boolean;
}

export function TagManageModal({
  isOpen,
  onClose,
  itemId,
  itemTitle,
  isUserItem = false,
  isCategory = false,
}: TagManageModalProps) {
  const [formData, setFormData] = useState({
    artist: "",
    anime: "",
  });
  const [customArtist, setCustomArtist] = useState("");
  const [customAnime, setCustomAnime] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleFormDataChange = async (key: "artist" | "anime", value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from(isUserItem ? "user_items" : "official_items")
        .update({ [key]: value })
        .eq("id", itemId);

      if (error) throw error;

      queryClient.invalidateQueries({ 
        queryKey: isUserItem ? ["user-items"] : ["official-items"] 
      });

      toast({
        title: "更新完了",
        description: `${key === "artist" ? "アーティスト" : "アニメ"}を更新しました。`,
      });
    } catch (error) {
      console.error("Error updating item:", error);
      toast({
        title: "エラー",
        description: "更新に失敗しました。",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isCategory ? "カテゴリを管理" : "タグを管理"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {isCategory ? (
            <MediaSelectionFields
              formData={formData}
              customArtist={customArtist}
              customAnime={customAnime}
              onFormDataChange={handleFormDataChange}
              onCustomArtistChange={setCustomArtist}
              onCustomAnimeChange={setCustomAnime}
            />
          ) : (
            <TagInputField itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}