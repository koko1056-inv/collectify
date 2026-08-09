import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useLanguage } from "@/contexts/LanguageContext";
import { compressImageFile, AVATAR_IMAGE_OPTIONS, UPLOAD_CACHE_CONTROL } from "@/utils/compress-image";

const PROFILE_IMAGES_BUCKET = "profile_images";

interface UseProfileImageUploadOptions {
  userId: string;
  onSuccess?: (publicUrl: string) => void;
}

export function useProfileImageUpload({ userId, onSuccess }: UseProfileImageUploadOptions) {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const uploadImage = useCallback(async (file: File): Promise<string | null> => {
    if (!file || !userId) {
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.upload.missingFileOrUser"),
      });
      return null;
    }

    // ファイルサイズチェック (5MB以下)
    const MAX_FILE_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.upload.tooLarge"),
      });
      return null;
    }

    // ファイル形式チェック
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error(t("notices.common.errorTitle"), {
        description: t("notices.upload.unsupportedFormat"),
      });
      return null;
    }

    setIsUploading(true);

    try {
      // 1. ファイルをストレージにアップロード
      const compressed = await compressImageFile(file, AVATAR_IMAGE_OPTIONS);
      const fileExt = compressed.name.split(".").pop()?.toLowerCase() || "png";
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(PROFILE_IMAGES_BUCKET)
        .upload(filePath, compressed, {
          contentType: compressed.type,
          cacheControl: UPLOAD_CACHE_CONTROL,
          upsert: false,
        });

      if (uploadError) {
        throw new Error(t("notices.upload.uploadFailedPrefix", { message: uploadError.message }));
      }

      // 2. 公開URLを取得
      const { data: urlData } = supabase.storage
        .from(PROFILE_IMAGES_BUCKET)
        .getPublicUrl(filePath);

      const publicUrl = urlData.publicUrl;

      if (!publicUrl) {
        throw new Error(t("notices.upload.publicUrlFailed"));
      }

      // 3. プロフィールのavatar_urlを更新
      const { error: profileUpdateError } = await supabase
        .from("profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (profileUpdateError) {
        throw new Error(t("notices.upload.profileUpdateFailedPrefix", { message: profileUpdateError.message }));
      }

      // 4. avatar_galleryの同期（トランザクション的に処理）
      await syncAvatarGallery(userId, publicUrl);

      // 5. キャッシュを無効化して最新データを取得
      await queryClient.invalidateQueries({ queryKey: ["profile", userId] });

      // 6. プレビューURLを更新
      setPreviewUrl(publicUrl);

      toast.success(t("notices.upload.doneTitle"), {
        description: t("notices.upload.profileImageUpdated"),
      });

      onSuccess?.(publicUrl);
      return publicUrl;

    } catch (error) {
      const message = error instanceof Error ? error.message : t("notices.upload.imageUploadFailed");
      toast.error(t("notices.common.errorTitle"), {
        description: message,
      });
      console.error("Profile image upload error:", error);
      return null;

    } finally {
      setIsUploading(false);
    }
  }, [userId, queryClient, onSuccess, t]);

  const initializePreview = useCallback((url: string | null) => {
    setPreviewUrl(url);
  }, []);

  return {
    uploadImage,
    isUploading,
    previewUrl,
    setPreviewUrl,
    initializePreview,
  };
}

// avatar_galleryとの同期処理
async function syncAvatarGallery(userId: string, imageUrl: string): Promise<void> {
  try {
    // すべてのアバターをis_current=falseに
    await supabase
      .from("avatar_gallery")
      .update({ is_current: false })
      .eq("user_id", userId);

    // プロフィール画像用のエントリを検索
    const { data: existingEntry } = await supabase
      .from("avatar_gallery")
      .select("id")
      .eq("user_id", userId)
      .eq("prompt", "プロフィール画像")
      .maybeSingle();

    if (existingEntry) {
      // 既存エントリを更新
      await supabase
        .from("avatar_gallery")
        .update({
          image_url: imageUrl,
          is_current: true,
        })
        .eq("id", existingEntry.id);
    } else {
      // 新規エントリを作成
      await supabase.from("avatar_gallery").insert({
        user_id: userId,
        image_url: imageUrl,
        is_current: true,
        prompt: "プロフィール画像",
        item_ids: null,
        name: null,
      });
    }
  } catch (error) {
    // ギャラリー同期の失敗はログのみ（プロフィール更新は成功している）
    console.warn("Avatar gallery sync warning:", error);
  }
}
