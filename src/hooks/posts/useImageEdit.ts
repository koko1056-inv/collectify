import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export function useImageEdit() {
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const editImage = async (imageUrl: string, prompt: string): Promise<string> => {
    setIsEditing(true);
    try {
      const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY;
      
      if (!LOVABLE_API_KEY) {
        throw new Error("LOVABLE_API_KEY is not configured");
      }

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl
                  }
                }
              ]
            }
          ],
          modalities: ["image", "text"]
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const editedImageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

      if (!editedImageUrl) {
        throw new Error("編集された画像が取得できませんでした");
      }

      toast({
        title: "画像編集完了",
        description: "画像の編集が完了しました",
      });

      return editedImageUrl;
    } catch (error) {
      console.error("画像編集エラー:", error);
      toast({
        title: "エラー",
        description: error instanceof Error ? error.message : "画像の編集に失敗しました",
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
