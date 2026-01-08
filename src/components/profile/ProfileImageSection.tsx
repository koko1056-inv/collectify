import { memo } from "react";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { ProfileHeader } from "./ProfileHeader";
import { supabase } from "@/integrations/supabase/client";

interface ProfileImageSectionProps {
  isOwnProfile: boolean;
  userId: string;
  avatarUrl: string | null;
  username: string;
  previewUrl: string | null;
  onImageChange: (file: File | null) => Promise<void>;
  onShare: () => void;
  setPreviewUrl: (url: string | null) => void;
  isUploading?: boolean;
  onAvatarChange?: () => void;
}

export const ProfileImageSection = memo(function ProfileImageSection({
  isOwnProfile,
  userId,
  avatarUrl,
  username,
  previewUrl,
  onImageChange,
  onShare,
  setPreviewUrl,
  isUploading,
  onAvatarChange,
}: ProfileImageSectionProps) {

  const handleAvatarSelect = async (selectedUrl: string) => {
    // 楽観的UI更新: 先にpreviewUrlを設定してすぐに反映
    setPreviewUrl(selectedUrl);
    
    // DB更新を並列実行
    const updatePromises = [
      // プロフィールのavatar_urlを更新
      supabase
        .from("profiles")
        .update({ avatar_url: selectedUrl })
        .eq("id", userId),
      // avatar_galleryのis_currentをリセット
      supabase
        .from("avatar_gallery")
        .update({ is_current: false })
        .eq("user_id", userId),
    ];

    const [profileResult] = await Promise.all(updatePromises);

    if (profileResult.error) {
      console.error("Failed to update avatar:", profileResult.error);
      return;
    }

    // 選択したアバターをcurrentに設定（これは順序が必要なので後で実行）
    await supabase
      .from("avatar_gallery")
      .update({ is_current: true })
      .eq("user_id", userId)
      .eq("image_url", selectedUrl);

    // バックグラウンドでrefetch（UIはすでに更新済み）
    onAvatarChange?.();
  };

  return (
    <div className="flex flex-col items-center mb-4">
      <div className="w-24 h-24 mb-2">
        {isOwnProfile ? (
          <ProfileImageUpload
            onImageChange={onImageChange}
            previewUrl={previewUrl}
            setPreviewUrl={setPreviewUrl}
            userId={userId}
            avatarUrl={avatarUrl}
            isUploading={isUploading}
            onAvatarSelect={handleAvatarSelect}
          />
        ) : (
          <img
            src={avatarUrl || "/placeholder.svg"}
            alt={username}
            className="w-24 h-24 object-cover rounded-full"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              if (!target.src.includes("placeholder.svg")) {
                target.src = "/placeholder.svg";
              }
            }}
          />
        )}
      </div>
      <ProfileHeader
        username={username}
        onShare={onShare}
        isOwnProfile={isOwnProfile}
        userId={isOwnProfile ? undefined : userId}
      />
    </div>
  );
});
