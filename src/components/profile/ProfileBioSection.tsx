import { memo } from "react";
import { ProfileBio } from "./ProfileBio";

interface ProfileBioSectionProps {
  bio: string;
  xUsername: string;
  isEditing: boolean;
  isOwnProfile: boolean;
  saving: boolean;
  onBioChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onXUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ProfileBioSection = memo(function ProfileBioSection({
  bio,
  xUsername,
  isEditing,
  isOwnProfile,
  saving,
  onBioChange,
  onXUsernameChange,
  onEdit,
  onCancel,
  onSubmit,
}: ProfileBioSectionProps) {
  return (
    <div className="mt-4">
      <ProfileBio
        bio={bio}
        xUsername={xUsername}
        isEditing={isEditing}
        onBioChange={onBioChange}
        onXUsernameChange={onXUsernameChange}
        onEdit={onEdit}
        onCancel={onCancel}
        onSubmit={onSubmit}
        saving={saving}
        isOwnProfile={isOwnProfile}
      />
    </div>
  );
});
