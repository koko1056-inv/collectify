import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function useImageEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const editImage = async (imageUrl: string, prompt: string, avatarUrl?: string): Promise<string> => {
    setIsEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke('edit-image', {
        body: { imageUrl, prompt, avatarUrl }
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || '画像の編集に失敗しました');
      }

      if (!data?.editedImageUrl) {
        throw new Error('編集された画像が取得できませんでした');
      }

      toast({
        title: "画像編集完了",
        description: "画像の編集が完了しました",
      });

      return data.editedImageUrl;
    } catch (error) {
      console.error("画像編集エラー:", error);
      
      const errorMessage = error instanceof Error ? error.message : "画像の編集に失敗しました";
      
      toast({
        title: "エラー",
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
