import { memo } from "react";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { ProfileHeader } from "./ProfileHeader";
import { LazyImage } from "@/components/ui/lazy-image";

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
          />
        ) : (
          <LazyImage
            src={avatarUrl || "/placeholder.svg"}
            alt={username}
            className="w-24 h-24 rounded-full object-cover"
            skeletonClassName="w-24 h-24 rounded-full"
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
