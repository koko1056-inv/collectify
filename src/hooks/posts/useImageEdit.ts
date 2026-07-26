import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

export function useImageEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const editImage = async (imageUrl: string, prompt: string, avatarUrl?: string): Promise<string> => {
    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { imageUrl, prompt, avatarUrl }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || t('notices.imageEdit.failed'));
      }

      if (!data?.editedImageUrl) {
        throw new Error(t('notices.imageEdit.noResult'));
      }

      toast({
        title: t("notices.imageEdit.doneTitle"),
        description: t("notices.imageEdit.doneDesc"),
      });

      return data.editedImageUrl;
    } catch (error) {
      console.error("画像編集エラー:", error);
      
      const errorMessage = error instanceof Error ? error.message : t("notices.imageEdit.failed");
      
      toast({
        title: t("notices.common.errorTitle"),
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsEditing(false);
    }
  };

  return {
    editImage,
    isEditing,
  };
}
