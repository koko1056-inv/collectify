import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { ExistingTags } from "./ExistingTags";
import { CurrentTags } from "./CurrentTags";
import { MediaSelectionFields } from "../MediaSelectionFields";
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
  isCategory = false 
}: TagManageModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    artist: "",
    anime: "",
  });
  const [customArtist, setCustomArtist] = useState("");
  const [customAnime, setCustomAnime] = useState("");

  const handleFormDataChange = async (key: "artist" | "anime", value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));

    try {
      const { error } = await supabase
        .from(isUserItem ? "user_items" : "official_items")
        .update({ [key]: value === "custom" ? (key === "artist" ? customArtist : customAnime) : value })
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
      console.error(`Error updating ${key}:`, error);
      toast({
        title: "エラー",
        description: `${key === "artist" ? "アーティスト" : "アニメ"}の更新に失敗しました。`,
        variant: "destructive",
      });
    }
  };

  const handleCustomValueChange = async (key: "artist" | "anime", value: string) => {
    if (key === "artist") {
      setCustomArtist(value);
    } else {
      setCustomAnime(value);
    }

    if (formData[key] === "custom") {
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
        console.error(`Error updating custom ${key}:`, error);
        toast({
          title: "エラー",
          description: `${key === "artist" ? "アーティスト" : "アニメ"}の更新に失敗しました。`,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isCategory ? "カテゴリの管理" : "タグの管理"}: {itemTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <MediaSelectionFields
            formData={formData}
            customArtist={customArtist}
            customAnime={customAnime}
            onFormDataChange={handleFormDataChange}
            onCustomArtistChange={(value) => handleCustomValueChange("artist", value)}
            onCustomAnimeChange={(value) => handleCustomValueChange("anime", value)}
          />
          <TagInputField itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
          <CurrentTags itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
          <ExistingTags itemId={itemId} isUserItem={isUserItem} isCategory={isCategory} />
        </div>
      </DialogContent>
    </Dialog>
  );
}