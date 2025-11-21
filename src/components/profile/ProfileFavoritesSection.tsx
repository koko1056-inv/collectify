import { memo } from "react";
import { ProfileFavorites } from "./ProfileFavorites";

interface ProfileFavoritesSectionProps {
  userId: string;
  isEditing: boolean;
  onEditComplete: () => void;
}

export const ProfileFavoritesSection = memo(function ProfileFavoritesSection({
  userId,
  isEditing,
  onEditComplete,
}: ProfileFavoritesSectionProps) {
  return (
    <div className="mt-6">
      <ProfileFavorites
        userId={userId}
        isEditing={isEditing}
        onEditComplete={onEditComplete}
      />
    </div>
  );
});
