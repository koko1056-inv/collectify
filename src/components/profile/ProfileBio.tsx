import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileBioProps {
  bio: string;
  xUsername: string;
  isEditing: boolean;
  saving: boolean;
  onBioChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onXUsernameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEdit: () => void;
  onCancel: () => void;
  onSubmit: (e: React.FormEvent) => void;
  isOwnProfile?: boolean;
}

export function ProfileBio({
  bio,
  xUsername,
  isEditing,
  saving,
  onBioChange,
  onXUsernameChange,
  onEdit,
  onCancel,
  onSubmit,
  isOwnProfile = false,
}: ProfileBioProps) {
  const { t } = useLanguage();

  if (!isOwnProfile && !bio && !xUsername) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-sm space-y-4">
      {isEditing ? (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bio">{t("profile.bio")}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={onBioChange}
              placeholder={t("profile.bioPlaceholder")}
              className="min-h-[120px]"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="xUsername">{t("profile.xAccount")}</Label>
            <Input
              id="xUsername"
              type="text"
              value={xUsername}
              onChange={onXUsernameChange}
              placeholder={t("profile.xPlaceholder")}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onCancel}
              className="gap-2"
            >
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
            <Button type="submit" size="sm" disabled={saving} className="gap-2">
              <Check className="h-4 w-4" />
              {saving ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </form>
      ) : (
        <div className="prose prose-sm max-w-none text-center space-y-2">
          {bio && <p className="whitespace-pre-wrap">{bio}</p>}
          {xUsername && (
            <div className="flex items-center justify-center gap-2">
              <span className="text-sm text-muted-foreground">X:</span>
              <a 
                href={`https://x.com/${xUsername}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-500 hover:text-blue-600 text-sm font-medium"
              >
                @{xUsername}
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
