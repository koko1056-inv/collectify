
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImageFile, ITEM_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";

export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { t } = useLanguage();

  const uploadImage = async () => {
    if (!imageFile) return "";
    
    try {
      // 端末の写真は数MBあるので、保存前に縮める
      const compressed = await compressImageFile(imageFile, ITEM_IMAGE_OPTIONS);
      const fileExt = compressed.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, compressed, { cacheControl: UPLOAD_CACHE_CONTROL });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.adminItem.imageUploadFailedDesc"),
      });
      throw error;
    }
  };

  return {
    imageFile,
    setImageFile,
    previewUrl,
    setPreviewUrl,
    uploadImage,
  };
}
