import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Profile } from "@/types";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileEditSheetProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile;
  onSaved?: () => void;
}

export function ProfileEditSheet({ open, onOpenChange, profile, onSaved }: ProfileEditSheetProps) {
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [xUsername, setXUsername] = useState("");
  const [saving, setSaving] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    if (open) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setXUsername(profile.x_username ?? "");
    }
  }, [open, profile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName.trim() || null,
          bio: bio.trim() || null,
          x_username: xUsername.replace(/^@/, "").trim() || null,
        })
        .eq("id", profile.id);
      if (error) throw error;
      toast.success(t("profileScreen.editSheet.updated"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      toast.error(t("profileScreen.editSheet.updateFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-left">{t("profileScreen.editSheet.title")}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="displayName">{t("profileScreen.editSheet.displayName")}</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder={t("profileScreen.editSheet.displayNamePlaceholder")}
              maxLength={30}
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {displayName.length}/30
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">{t("profileScreen.editSheet.bio")}</Label>
            <Textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={t("profileScreen.editSheet.bioPlaceholder")}
              rows={4}
              maxLength={200}
              className="resize-none"
            />
            <p className="text-[10px] text-muted-foreground text-right">
              {bio.length}/200
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="xUsername">X (Twitter)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
              <Input
                id="xUsername"
                value={xUsername.replace(/^@/, "")}
                onChange={(e) => setXUsername(e.target.value.replace(/^@/, ""))}
                placeholder="username"
                className="pl-8"
                maxLength={15}
              />
            </div>
          </div>
        </div>

        <div className="border-t px-5 py-3 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="flex-1 rounded-xl"
          >
            {t("profileScreen.common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 rounded-xl gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("profileScreen.common.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
