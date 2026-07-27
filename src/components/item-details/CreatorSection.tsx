
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";

interface CreatorSectionProps {
  isEditing: boolean;
  createdBy: string | null | undefined;
}

export function CreatorSection({
  isEditing,
  createdBy,
}: CreatorSectionProps) {
  const { t } = useLanguage();
  const { data: creatorProfile, isLoading: isProfileLoading, error: profileError } = useQuery({
    queryKey: ["creator-profile", createdBy],
    queryFn: async () => {
      if (!createdBy) return null;
      
      console.log("Fetching creator profile for:", createdBy);
      
      const { data, error } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("id", createdBy)
        .maybeSingle();
      
      console.log("Creator profile result:", { data, error });
      
      if (error) {
        console.error("Error fetching creator profile:", error);
        throw error;
      }
      return data;
    },
    enabled: !!createdBy,
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5分間キャッシュ
  });

  if (isEditing) return null;

  const creatorName = !createdBy
    ? t("itemDetails.creator.admin")
    : isProfileLoading
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
          {createdBy && creatorProfile && (
            <>
              <Avatar className="h-8 w-8">
                <AvatarImage src={creatorProfile.avatar_url || ""} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{t("itemDetails.creator.registeredBy")}</div>
                <div>{creatorProfile.display_name || creatorProfile.username}</div>
              </div>
            </>
          )}
        </div>
        {createdBy && creatorProfile && (
          <Button 
            variant="outline" 
            size="sm"
            asChild
            className="w-full"
          >
            <Link to={`/user/${createdBy}`}>
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
            {createdBy && creatorProfile && (
              <div className="text-green-600 font-medium mt-1">
                {t("itemDetails.creator.thanks")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
