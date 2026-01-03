import { memo, useState, useEffect } from "react";
import { ProfileImageUpload } from "./ProfileImageUpload";
import { ProfileHeader } from "./ProfileHeader";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
          <Avatar className="w-24 h-24">
            <AvatarImage 
              src={avatarUrl || undefined} 
              alt={username}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl">
              {username?.charAt(0)?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
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
