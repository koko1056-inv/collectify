import { memo } from "react";
import { ProfileInterests } from "./ProfileInterests";

interface ProfileInterestsSectionProps {
  currentInterests: string[];
  onUpdate: () => void;
}

export const ProfileInterestsSection = memo(function ProfileInterestsSection({
  currentInterests,
  onUpdate,
}: ProfileInterestsSectionProps) {
  return (
    <div className="mt-6">
      <ProfileInterests
        currentInterests={currentInterests}
        onUpdate={onUpdate}
      />
    </div>
  );
});
