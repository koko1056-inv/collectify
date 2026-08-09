
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ItemImageUpload } from "@/components/item/ItemImageUpload";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { SUPABASE_URL, supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";

interface ItemImageEditorProps {
  image: string;
  title: string;
  isEditing: boolean;
  onImageUpdate: (newImageUrl: string) => void;
}

export function ItemImageEditor({ image, title, isEditing, onImageUpdate }: ItemImageEditorProps) {
  const [isImageEditModalOpen, setIsImageEditModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { t } = useLanguage();

  const handleImageChange = async (file: File | null) => {
    if (!file) return;

    try {
      const compressed = await compressImageFile(file, ITEM_IMAGE_OPTIONS);
      const fileExt = compressed.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, compressed, { cacheControl: UPLOAD_CACHE_CONTROL });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      onImageUpdate(publicUrl);
      setIsImageEditModalOpen(false);
      
      toast.success(t("itemDetails.image.updated"), {
        description: t("itemDetails.image.updatedDescription"),
      });
    } catch (error) {
      console.error('Error updating image:', error);
      toast.error(t("itemDetails.common.error"), {
        description: t("itemDetails.image.updateFailed"),
      });
    }
  };

  const displayImageUrl =
    image && image.startsWith("http") && !image.includes("supabase.co/storage")
      ? `${SUPABASE_URL}/functions/v1/proxy-image?url=${encodeURIComponent(image)}`
      : image;

  return (
    <div className="w-full h-full relative group">
      <div className="w-full h-full flex items-center justify-center bg-muted">
        <img
          src={displayImageUrl}
          alt={title}
          className="w-full h-full object-contain"
        />
      </div>
      {isEditing && (
        <Button
          variant="secondary"
          size="icon"
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => setIsImageEditModalOpen(true)}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      )}

      <Dialog open={isImageEditModalOpen} onOpenChange={setIsImageEditModalOpen}>
        <DialogContent>
          <h3 className="text-lg font-semibold mb-4">{t("itemDetails.image.editTitle")}</h3>
          <ItemImageUpload
            onImageChange={handleImageChange}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
