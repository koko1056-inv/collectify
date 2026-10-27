
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useItemCreatorProfile } from "@/hooks/useItemCreatorProfile";

interface CreatorSectionProps {
  isEditing: boolean;
  createdBy: string | null | undefined;
}

export function CreatorSection({
  isEditing,
  createdBy,
}: CreatorSectionProps) {
  const { t } = useLanguage();
  // 登録者が空・退会済みのときは、カタログのアカウント（koko）が返ってくる
  const { data: creatorProfile, isLoading: isProfileLoading, error: profileError } =
    useItemCreatorProfile(createdBy);

  if (isEditing) return null;

  const creatorName = isProfileLoading
    ? t("itemDetails.common.loading")
    : creatorProfile
      ? creatorProfile.display_name || creatorProfile.username
      : profileError
        ? t("itemDetails.creator.registeredUserError")
        : t("itemDetails.creator.registeredUser");

  return (
    <div className="space-y-4">
      <div className="text-sm space-y-2">
        <div className="flex items-center gap-2">
          {creatorProfile && (
            <>
              <Avatar className="h-8 w-8">
                <AvatarImage src={creatorProfile.avatar_url || ""} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{t("itemDetails.creator.registeredBy")}</div>
                <div className="flex items-center gap-1">
                  <span>{creatorProfile.display_name || creatorProfile.username}</span>
                </div>
              </div>
            </>
          )}
        </div>
        {creatorProfile && (
          <Button
            variant="outline"
            size="sm"
            asChild
            className="w-full"
          >
            <Link to={`/user/${creatorProfile.id}`}>
              {t("itemDetails.creator.viewProfile")}
            </Link>
          </Button>
        )}
      </div>

      <div className="text-sm space-y-2">
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <div>
            <div className="font-medium">{t("itemDetails.creator.itemInfo")}</div>
            <div className="text-muted-foreground">
              {t("itemDetails.creator.addedBy", { name: creatorName })}
            </div>
            {creatorProfile && (
              <div className="text-success font-medium mt-1">
                {t("itemDetails.creator.thanks")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
