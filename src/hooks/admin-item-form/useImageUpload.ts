import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useImageUpload() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const uploadImage = async () => {
    if (!imageFile) return "";
    
    try {
      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('kuji_images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('kuji_images')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "エラー",
        description: "画像のアップロードに失敗しました。",
        variant: "destructive",
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