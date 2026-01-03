import { memo } from "react";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { ProfileHeader } from "./ProfileHeader";

interface ProfileImageSectionProps {
  isOwnProfile: boolean;
  userId: string;
  avatarUrl: string | null;
  username: string;
  previewUrl: string | null;
  onImageChange: (file: File | null) => Promise<void>;
  onShare: () => void;
  setPreviewUrl: (url: string | null) => void;
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
}: ProfileImageSectionProps) {
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
