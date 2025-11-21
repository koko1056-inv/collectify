import { memo } from "react";
import { ProfileWishlist } from "./ProfileWishlist";

interface ProfileWishlistSectionProps {
  userId: string;
}

export const ProfileWishlistSection = memo(function ProfileWishlistSection({
  userId,
}: ProfileWishlistSectionProps) {
  return (
    <div className="mt-8">
      <ProfileWishlist userId={userId} />
    </div>
  );
});
