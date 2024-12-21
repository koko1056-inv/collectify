import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { TagInputField } from "./TagInputField";
import { MediaSelectionFields } from "@/components/MediaSelectionFields";
import { useState } from "react";

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
  const [formData, setFormData] = useState({
    artist: "",
    anime: "",
  });
  const [customArtist, setCustomArtist] = useState("");
  const [customAnime, setCustomAnime] = useState("");

  const handleFormDataChange = (key: "artist" | "anime", value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {isCategory ? "アーティスト/アニメの管理" : "タグの管理"}: {itemTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
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