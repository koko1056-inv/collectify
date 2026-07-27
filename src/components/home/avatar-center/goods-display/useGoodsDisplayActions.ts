import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface SaveGalleryParams {
  userId: string;
  imageUrl: string;
  itemIds: string[];
  backgroundPresetId: string | null;
  title: string;
  description: string;
}

export function useSaveDisplayGallery() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({
      userId,
      imageUrl,
      itemIds,
      backgroundPresetId,
      title,
      description,
    }: SaveGalleryParams) => {
      const { error } = await supabase.from("display_gallery").insert({
        user_id: userId,
        image_url: imageUrl,
        item_ids: itemIds,
        background_preset_id: backgroundPresetId,
        title,
        description,
        is_public: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(t("homeScreen.actions.gallerySaved"));
      queryClient.invalidateQueries({ queryKey: ["display-gallery-all"] });
    },
    onError: (error) => {
      console.error("Error saving gallery:", error);
      toast.error(t("homeScreen.actions.gallerySaveFailed"));
    },
  });
}

interface UploadPresetParams {
  userId: string;
  file: File;
  name: string;
  category: string;
}

export function useUploadBackgroundPreset() {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  return useMutation({
    mutationFn: async ({ userId, file, name, category }: UploadPresetParams) => {
      const fileExt = file.name.split(".").pop();
      const filePath = `${userId}/${crypto.randomUUID()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("kuji_images")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("kuji_images").getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("background_presets").insert({
        user_id: userId,
        name,
        image_url: publicUrl,
        category,
        is_public: true,
      });
      if (dbError) throw dbError;
      return publicUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["background-presets"] });
      toast.success(t("homeScreen.actions.presetAdded"));
    },
    onError: (error) => {
      console.error("Error uploading preset:", error);
      toast.error(t("homeScreen.actions.presetAddFailed"));
    },
  });
}

export async function shareDisplayToTwitter(
  userId: string,
  generatedImage: string,
  galleryTitle: string
) {
  try {
    const tweetText = galleryTitle
      ? `${galleryTitle}\n\n#グッズ展示場 #コレクション`
      : "グッズ展示場を作成しました！ #グッズ展示場 #コレクション";

    const response = await fetch(generatedImage);
    const blob = await response.blob();
    const file = new File([blob], `display-${Date.now()}.png`, {
      type: "image/png",
    });

    const filePath = `${userId}/share/${crypto.randomUUID()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("kuji_images")
      .upload(filePath, file);
    if (uploadError) throw uploadError;

    const {
      data: { publicUrl },
    } = supabase.storage.from("kuji_images").getPublicUrl(filePath);

    const { error: tweetError } = await supabase.functions.invoke(
      "post-to-twitter",
      { body: { text: tweetText, imageUrl: publicUrl } }
    );
    if (tweetError) throw tweetError;

    toast.success("Xに投稿しました！");
  } catch (error) {
    console.error("Error sharing to Twitter:", error);
    toast.error("Xへの投稿に失敗しました");
  }
}
