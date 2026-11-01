import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProfilePrivate, useSaveProfilePrivate } from "@/hooks/useProfilePrivate";
import { EMPTY_PROFILE_EXTRAS, type ProfileExtras } from "@/lib/profileExtras";
import { AboutYouFields } from "./AboutYouFields";

/**
 * 「あなたのこと」を答える・直すシート（下から）。設定と、すでに使っている人への案内から開く。
 * 保存先は本人だけが読める profile_private。
 */
export function AboutYouSheet({
  open,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}) {
  const { t } = useLanguage();
  const { data, isLoading, isError } = useProfilePrivate({ enabled: open });
  const { save } = useSaveProfilePrivate();
  const [draft, setDraft] = useState<ProfileExtras>(EMPTY_PROFILE_EXTRAS);
  const [saving, setSaving] = useState(false);

  // 開いたときに、保存してある答えを下書きに写す
  useEffect(() => {
    if (open && data) setDraft(data.extras);
  }, [open, data]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await save(draft);
      toast.success(t("aboutYou.sheet.saved"));
      onSaved?.();
      onOpenChange(false);
    } catch (e) {
      console.error("[AboutYouSheet] save failed", e);
      toast.error(t("aboutYou.sheet.saveFailed"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex max-h-[90vh] flex-col gap-0 rounded-t-3xl p-0 sm:mx-auto sm:max-w-lg"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="shrink-0 border-b px-5 pb-3 pt-5 text-left">
          <SheetTitle>{t("aboutYou.sheet.title")}</SheetTitle>
          <SheetDescription>{t("aboutYou.sheet.desc")}</SheetDescription>
        </SheetHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-56 rounded-2xl" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t("aboutYou.sheet.loadFailed")}</p>
          ) : (
            <AboutYouFields value={draft} onChange={setDraft} basicsTitle={t("aboutYou.sheet.sectionBasics")} />
          )}
        </div>
        <div className="shrink-0 border-t px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <Button className="h-12 w-full text-base font-bold" onClick={handleSave} disabled={saving || isLoading || isError}>
            {saving ? t("misc.common.saving") : t("aboutYou.sheet.save")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
