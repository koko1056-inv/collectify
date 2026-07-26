import { memo } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileEditButtonProps {
  onClick: () => void;
}

export const ProfileEditButton = memo(function ProfileEditButton({
  onClick,
}: ProfileEditButtonProps) {
  const { t } = useLanguage();

  return (
    <div className="flex justify-center mb-4">
      <button
        onClick={onClick}
        className="text-center py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 text-sm font-bold"
      >
        {t("profileScreen.editSheet.title")}
      </button>
    </div>
  );
});
